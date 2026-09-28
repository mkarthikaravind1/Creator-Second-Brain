from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    youtube_api_key: str = ""
    groq_api_key: str = ""

    database_url: str = "postgresql+psycopg://brain:brain@localhost:5433/brain"

    # Groq models — check console.groq.com/docs/models and override in .env if these change.
    llm_model: str = "llama-3.3-70b-versatile"  # reasoning: answers, drift, composer
    llm_fast_model: str = "llama-3.1-8b-instant"  # bulk: promise verification

    whisper_model: str = "whisper-large-v3-turbo"  # for uploaded audio files

    # Optional http(s) proxy for transcript fetching if YouTube blocks your IP,
    # e.g. http://user:pass@proxy-host:port
    transcript_proxy: str = ""

    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384

    max_videos: int = 50  # per channel index run
    chunk_seconds: int = 45
    analysis_segment_chars: int = 18000  # transcript slice sent per analysis call

    frontend_origin: str = "http://localhost:3000"


settings = Settings()
