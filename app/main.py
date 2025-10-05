from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates
import os

app = FastAPI()

app.mount("/", StaticFiles(directory=".", html=True), name="root")

@app.get("/")
async def serve_index():
    return FileResponse("index.html")