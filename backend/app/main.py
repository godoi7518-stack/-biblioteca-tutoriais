from fastapi import FastAPI

from app.routers import auth, workspace, tabs, tutorials

app = FastAPI(title="Biblioteca de Tutoriais")

app.include_router(auth.router)
app.include_router(workspace.router)
app.include_router(tabs.router)
app.include_router(tutorials.router)


@app.get("/")
def root():
    return {"message": "API da Biblioteca de Tutoriais rodando"}