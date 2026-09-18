import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routers import auth, workspace, tabs, tutorials, tutorial_images

os.makedirs("static/uploads", exist_ok=True)

app = FastAPI(title="Biblioteca de Tutoriais")

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth.router)
app.include_router(workspace.router)
app.include_router(tabs.router)
app.include_router(tutorials.router)
app.include_router(tutorial_images.router)


@app.get("/")
def root():
    return {"message": "API da Biblioteca de Tutoriais rodando"}