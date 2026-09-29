from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.rag_service import RAGService


# --------------------------------------------------
# App Configuration
# --------------------------------------------------

app = FastAPI(
    title="Groq + ChromaDB RAG API",
    version="1.0.0",
)


# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


# --------------------------------------------------
# Serve Frontend
# --------------------------------------------------

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)


@app.get("/")
def home():
    return FileResponse(
        STATIC_DIR / "index.html"
    )


# --------------------------------------------------
# RAG Service
# --------------------------------------------------

rag_service: Optional[RAGService] = None


# --------------------------------------------------
# Request Model
# --------------------------------------------------

class QuestionRequest(BaseModel):
    question: str = Field(
        min_length=1
    )

    top_k: Optional[int] = Field(
        default=None,
        ge=1,
        le=50,
    )

    source: Optional[str] = None


# --------------------------------------------------
# Startup
# --------------------------------------------------

@app.on_event("startup")
def startup() -> None:
    global rag_service

    try:
        rag_service = RAGService()

        print("RAG service started successfully.")

        print(
            f"Indexed chunks: "
            f"{rag_service.store.count()}"
        )

    except Exception as exc:
        print(
            f"RAG startup failed: {exc}"
        )
        raise


# --------------------------------------------------
# Health Check
# --------------------------------------------------

@app.get("/health")
def health():

    if rag_service is None:
        return {
            "status": "starting",
            "indexed_chunks": 0,
        }

    return {
        "status": "ok",
        "indexed_chunks": (
            rag_service.store.count()
        ),
    }


# --------------------------------------------------
# RAG Query
# --------------------------------------------------

@app.post("/rag/query")
def query_rag(
    payload: QuestionRequest
):

    if rag_service is None:
        raise HTTPException(
            status_code=503,
            detail="RAG service is not ready.",
        )

    try:

        result = rag_service.ask(
            question=payload.question,
            top_k=payload.top_k,
            source=payload.source,
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:

        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc