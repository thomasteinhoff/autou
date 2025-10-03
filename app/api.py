from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import uuid

from .models import EmailIn, EmailPendingOut
from . import services


def create_app() -> FastAPI:
    app = FastAPI(title="Mail Triage Backend", version="0.3.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post("/emails", response_model=EmailPendingOut)
    async def create_email(payload: EmailIn, background_tasks: BackgroundTasks):
        email_id = str(uuid.uuid4())
        services.results[email_id] = {"status": "pending"}
        background_tasks.add_task(_process_email_task, email_id, payload.title, payload.content)
        return {"id": email_id, "status": "pending"}

    @app.get("/emails/{email_id}")
    async def get_email_status(email_id: str):
        data: Dict[str, Any] | None = services.results.get(email_id)
        if not data:
            raise HTTPException(status_code=404, detail="Email not found")
        if data.get("status") == "pending":
            return {"id": email_id, "status": "pending"}
        return {
            "id": email_id,
            "status": "done",
            "classification": data.get("classification", "Unknown"),
            "suggested_reply": data.get("suggested_reply", ""),
        }

    return app


async def _process_email_task(email_id: str, title: str, content: str) -> None:
    try:
        output = await services.process_email(email_id, title, content)
        services.results[email_id] = {
            "status": "done",
            "classification": output["classification"],
            "suggested_reply": output["suggested_reply"],
        }
    except Exception:
        services.results[email_id] = {
            "status": "done",
            "classification": "Error",
            "suggested_reply": "Processing failed. Please retry.",
        }


