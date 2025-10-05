from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from .api import create_app

app = create_app()

app.mount("/static", StaticFiles(directory=".."), name="static")

@app.get("/")
async def read_root():
    return FileResponse("../index.html")