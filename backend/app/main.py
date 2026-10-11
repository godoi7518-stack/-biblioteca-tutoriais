import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, workspace, tabs, tutorials, tutorial_images, search

# Pasta das imagens no modo STORAGE_BACKEND=local. No modo "r2" ela fica
# vazia, mas continua montada: imagens antigas salvas localmente seguem
# abrindo enquanto existirem no disco.
os.makedirs("static/uploads", exist_ok=True)

app = FastAPI(title="Biblioteca de Tutoriais")

app.add_middleware(
    CORSMiddleware,
    # Vem do .env (CORS_ORIGINS): local é o Vite, no deploy é o endereço
    # público do frontend. Origem fora da lista = navegador bloqueia.
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth.router)
app.include_router(workspace.router)
app.include_router(tabs.router)
app.include_router(tutorials.router)
app.include_router(tutorial_images.router)
app.include_router(search.router)


@app.get("/")
def root():
    return {"message": "API da Biblioteca de Tutoriais rodando"}