"""Background jobs. Each runs the LangGraph indexing workflow (agents/indexing_graph.py) in one mode."""


def run_index_job(job_id: int, channel_input: str, max_videos: int | None = None) -> None:
    from agents.indexing_graph import run

    run(job_id, {"mode": "index", "channel_input": channel_input, "max_videos": max_videos}, max_videos or 0)


def run_upload_job(job_id: int, video_id: str, filename: str, data: bytes) -> None:
    """Transcript uploaded by the creator: subtitles are parsed, audio goes through Groq Whisper."""
    from agents.indexing_graph import run

    run(job_id, {"mode": "upload", "video_id": video_id, "upload_name": filename, "upload_data": data}, 1)


def run_promise_job(job_id: int, channel_id: str) -> None:
    from agents.indexing_graph import run

    run(job_id, {"mode": "promises", "channel_id": channel_id})
