from fastapi import FastAPI

from app.routers import auth

app = FastAPI(title="Biblioteca de Tutoriais")

app.include_router(auth.router)


@app.get("/")
def root():
    return {"message": "API da Biblioteca de Tutoriais rodando"}