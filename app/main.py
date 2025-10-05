from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os
from .api import create_app

app = create_app()

@app.get("/")
async def read_root():
    try:
        files = os.listdir(".")
        return JSONResponse({
            "message": "Debug - listing files",
            "files": files,
            "current_dir": os.getcwd()
        })
    except Exception as e:
        return JSONResponse({
            "error": str(e),
            "current_dir": os.getcwd()
        })