import re
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.tutorial import TutorialSearchResult
from app.core.dependencies import get_current_user

router = APIRouter(tags=["search"])


def build_boolean_query(q: str) -> str:
    # remove caracteres especiais do modo boolean do MySQL (+ - < > ( ) ~ * " @)
    words = re.findall(r"\w+", q)
    cleaned = [re.sub(r"[+\-<>()~*\"@]", "", w) for w in words]
    return " ".join(f"+{w}*" for w in cleaned if w)


@router.get("/search", response_model=list[TutorialSearchResult])
def search_tutorials(
    q: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    boolean_query = build_boolean_query(q)
    if not boolean_query:
        return []

    rows = db.execute(
        text("""
            SELECT
                t.id, t.title, t.summary, t.content_type,
                tab.id AS tab_id, tab.name AS tab_name,
                w.id AS workspace_id, w.name AS workspace_name
            FROM tutorials t
            JOIN tabs tab ON tab.id = t.tab_id
            JOIN workspaces w ON w.id = tab.workspace_id
            JOIN memberships m ON m.workspace_id = w.id
            WHERE m.user_id = :user_id
              AND MATCH(t.title, t.summary, t.content) AGAINST (:q IN BOOLEAN MODE)
            ORDER BY MATCH(t.title, t.summary, t.content) AGAINST (:q IN BOOLEAN MODE) DESC
            LIMIT 20
        """),
        {"user_id": current_user.id, "q": boolean_query},
    ).mappings().all()

    return list(rows)