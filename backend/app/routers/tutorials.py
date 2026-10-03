"""Rotas de tutoriais e seus passos (tutorial_steps).

Um tutorial pertence a uma tab e pode ser do tipo "simple" (texto corrido
em `content`) ou "structured" (uma sequência de TutorialStep, cada um
podendo ser marcado como crítico).
"""

import os

from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tutorial import Tutorial
from app.models.tutorial_step import TutorialStep
from app.models.tutorial_image import TutorialImage
from app.models.membership import Membership
from app.schemas.tutorial import (
    TutorialCreate, TutorialUpdate, TutorialResponse, TutorialDetailResponse,
    TutorialStepCreate, TutorialStepResponse, TutorialStepInput,
)
from app.core.dependencies import get_current_user, get_workspace_membership, require_admin
from app.routers.tabs import get_tab_or_404

router = APIRouter(prefix="/workspaces/{workspace_id}/tabs/{tab_id}/tutorials", tags=["tutorials"])


def _bad_request(detail: str):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _check_body_for_type(content_type: str, content: str | None, steps: list | None):
    """Confere se o corpo combina com o tipo do tutorial: texto corrido usa
    só `content`; passo a passo usa só `steps` (pelo menos um)."""
    if content_type == "simple":
        if steps:
            _bad_request("Tutorial de texto corrido não tem passos")
        if not content or not content.strip():
            _bad_request("Conteúdo: campo obrigatório.")
    else:
        if not steps:
            _bad_request("Tutorial passo a passo precisa de pelo menos um passo")


def _image_paths(db: Session, *filters) -> list[str]:
    """Caminhos no disco das imagens que casam com os filtros. Usado para
    apagar os arquivos DEPOIS do commit (se o commit falhar, nada some)."""
    return [img.image_url.lstrip("/") for img in db.query(TutorialImage).filter(*filters).all()]


def _remove_files(paths: list[str]):
    for path in paths:
        if os.path.exists(path):
            os.remove(path)


def _sync_steps(db: Session, tutorial_id: int, items: list[TutorialStepInput]) -> list[str]:
    """Deixa os passos do tutorial exatamente como a lista recebida.

    - item com id  → atualiza o passo existente;
    - item sem id  → cria um passo novo;
    - passo que existe no banco mas não veio na lista → é apagado (o
      CASCADE do banco apaga as linhas de imagem dele).
    A ordem da lista vira o step_number (1, 2, 3...). Não faz commit: quem
    chama decide, para tudo acontecer na mesma transação. Retorna os
    arquivos de imagem dos passos apagados, para remover após o commit.
    """
    existing = {
        s.id: s for s in db.query(TutorialStep).filter(TutorialStep.tutorial_id == tutorial_id).all()
    }

    sent_ids = [item.id for item in items if item.id is not None]
    if len(sent_ids) != len(set(sent_ids)):
        _bad_request("O mesmo passo foi enviado mais de uma vez")
    for step_id in sent_ids:
        if step_id not in existing:
            # Impede "puxar" um passo de outro tutorial pelo id.
            _bad_request(f"O passo {step_id} não pertence a este tutorial")

    removed_ids = [step_id for step_id in existing if step_id not in sent_ids]
    removed_files = []
    if removed_ids:
        removed_files = _image_paths(db, TutorialImage.step_id.in_(removed_ids))
        db.query(TutorialStep).filter(TutorialStep.id.in_(removed_ids)).delete(synchronize_session=False)

    for number, item in enumerate(items, start=1):
        step = existing.get(item.id) if item.id is not None else None
        if step is None:
            step = TutorialStep(tutorial_id=tutorial_id)
            db.add(step)
        step.step_number = number
        step.title = item.title
        step.content = item.content
        step.is_critical = item.is_critical

    return removed_files


def _detail_response(db: Session, tutorial: Tutorial) -> TutorialDetailResponse:
    """Tutorial + passos em ordem, no formato TutorialDetailResponse."""
    steps = (
        db.query(TutorialStep)
        .filter(TutorialStep.tutorial_id == tutorial.id)
        .order_by(TutorialStep.step_number)
        .all()
    )
    response = TutorialDetailResponse.model_validate(tutorial)
    response.steps = [TutorialStepResponse.model_validate(s) for s in steps]
    return response


@router.post("", response_model=TutorialDetailResponse)
def create_tutorial(
    workspace_id: int,
    tab_id: int,
    data: TutorialCreate,
    admin: Membership = Depends(require_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cria um tutorial dentro da tab informada. Exige ser admin do workspace.

    Para "structured", os passos vêm no mesmo corpo e são salvos na mesma
    transação: ou o tutorial é criado com todos os passos, ou nada é
    criado. Registra current_user.id em created_by. A tab é confirmada com
    get_tab_or_404 antes, para não criar tutorial numa tab de outro
    workspace. Devolve o tutorial com os passos (e seus ids).
    """
    get_tab_or_404(workspace_id, tab_id, db)
    _check_body_for_type(data.content_type, data.content, data.steps)

    tutorial = Tutorial(
        tab_id=tab_id,
        title=data.title,
        summary=data.summary or None,
        content_type=data.content_type,
        content=data.content if data.content_type == "simple" else None,
        created_by=current_user.id,
    )
    db.add(tutorial)
    if data.content_type == "structured":
        db.flush()  # gera tutorial.id sem fazer commit, para ligar os passos
        new_steps = [item.model_copy(update={"id": None}) for item in data.steps]
        _sync_steps(db, tutorial.id, new_steps)
    db.commit()
    db.refresh(tutorial)
    return _detail_response(db, tutorial)


@router.get("", response_model=list[TutorialResponse])
def list_tutorials(
    workspace_id: int,
    tab_id: int,
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    """Lista os tutoriais de uma tab. Exige ser membro do workspace."""
    get_tab_or_404(workspace_id, tab_id, db)
    return db.query(Tutorial).filter(Tutorial.tab_id == tab_id).all()


def get_tutorial_or_404(tab_id: int, tutorial_id: int, db: Session) -> Tutorial:
    """Busca um tutorial garantindo que ele pertence à tab informada.

    Função auxiliar reaproveitada pelo router de tutorial_images (não é
    uma rota). Mesma lógica de get_tab_or_404: filtra pelos dois IDs juntos
    para impedir vazamento entre tabs diferentes. Levanta 404 se não achar.
    """
    tutorial = db.query(Tutorial).filter(Tutorial.id == tutorial_id, Tutorial.tab_id == tab_id).first()
    if tutorial is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutorial não encontrado")
    return tutorial


@router.get("/{tutorial_id}", response_model=TutorialResponse)
def get_tutorial(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    """Retorna um tutorial específico (sem os steps — ver /steps). Exige ser membro do workspace."""
    get_tab_or_404(workspace_id, tab_id, db)
    return get_tutorial_or_404(tab_id, tutorial_id, db)


@router.put("/{tutorial_id}", response_model=TutorialDetailResponse)
def update_tutorial(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    data: TutorialUpdate,
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Edita um tutorial inteiro de uma vez. Exige ser admin do workspace.

    Recebe título, resumo e o conteúdo (texto corrido) ou a lista COMPLETA
    de passos na ordem desejada (passo a passo) — ver _sync_steps. Tudo é
    salvo numa transação só: se algo falhar, nada muda. O tipo do tutorial
    não pode ser alterado. As imagens dos passos removidos são apagadas do
    disco só depois do commit.
    """
    get_tab_or_404(workspace_id, tab_id, db)
    tutorial = get_tutorial_or_404(tab_id, tutorial_id, db)
    _check_body_for_type(tutorial.content_type, data.content, data.steps)

    tutorial.title = data.title
    tutorial.summary = data.summary or None
    removed_files = []
    if tutorial.content_type == "simple":
        tutorial.content = data.content
    else:
        removed_files = _sync_steps(db, tutorial.id, data.steps)

    db.commit()
    _remove_files(removed_files)
    db.refresh(tutorial)
    return _detail_response(db, tutorial)


@router.delete("/{tutorial_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tutorial(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Apaga um tutorial e, em cascata via FK, seus steps e imagens. Exige ser admin do workspace.

    O CASCADE do banco apaga só as LINHAS de imagem; os arquivos no disco
    são coletados antes e removidos depois do commit (mesma lógica de
    delete_tab e delete_workspace).
    """
    get_tab_or_404(workspace_id, tab_id, db)
    tutorial = get_tutorial_or_404(tab_id, tutorial_id, db)
    files = _image_paths(db, TutorialImage.tutorial_id == tutorial.id)
    db.delete(tutorial)
    db.commit()
    _remove_files(files)


@router.post("/{tutorial_id}/steps", response_model=TutorialStepResponse)
def add_step(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    data: TutorialStepCreate,
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Adiciona um passo a um tutorial "structured". Exige ser admin do workspace.

    Levanta 400 se o tutorial for do tipo "simple" — passos só fazem
    sentido em tutoriais estruturados; essa é uma regra de negócio que o
    schema do banco não garante sozinho.
    """
    get_tab_or_404(workspace_id, tab_id, db)
    tutorial = get_tutorial_or_404(tab_id, tutorial_id, db)

    if tutorial.content_type != "structured":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Só é possível adicionar passos a tutoriais do tipo 'structured'",
        )

    step = TutorialStep(
        tutorial_id=tutorial_id,
        step_number=data.step_number,
        title=data.title,
        content=data.content,
        is_critical=data.is_critical,
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


@router.get("/{tutorial_id}/steps", response_model=list[TutorialStepResponse])
def list_steps(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    """Lista os passos de um tutorial, ordenados por step_number. Exige ser membro do workspace."""
    get_tab_or_404(workspace_id, tab_id, db)
    get_tutorial_or_404(tab_id, tutorial_id, db)
    return (
        db.query(TutorialStep)
        .filter(TutorialStep.tutorial_id == tutorial_id)
        .order_by(TutorialStep.step_number)
        .all()
    )