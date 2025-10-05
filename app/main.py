from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from .api import create_app

app = create_app()

@app.get("/")
async def read_root():
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    elif os.path.exists("app/index.html"):
        return FileResponse("app/index.html")
    else:
        return {"error": "index.html not found"}

if os.path.exists("."):
    app.mount("/static", StaticFiles(directory="."), name="static")