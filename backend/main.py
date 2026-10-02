import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.agent import router as agent_router
from api.creatoros import router as creatoros_router
from api.routes import router
from config import settings
from db import fail_interrupted_jobs, init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        fail_interrupted_jobs()
        logging.info("Connected to PostgreSQL database on localhost:5433 successfully.")
    except Exception as e:
        logging.warning("PostgreSQL on localhost:5433 is not running (%s). CreatorOS will start in localhost studio mode.", e)
    yield


app = FastAPI(title="CreatorOS Platform", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://127.0.0.1:3001",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(agent_router)
app.include_router(creatoros_router)


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "youtube_key": bool(settings.youtube_api_key),
        "gemini_key": bool(settings.gemini_api_key),
        "groq_key": bool(settings.groq_api_key),
        "llm_model": settings.llm_model,
        "langsmith_tracing": settings.langsmith_tracing and bool(settings.langsmith_api_key),
    }
