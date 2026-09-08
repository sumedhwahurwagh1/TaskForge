import os


class Settings:
    PROJECT_NAME: str = "TaskForge API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    PORT: int = int(os.getenv("PORT", "8000"))

    # Backend-only Supabase secret. Prefer the current Supabase "secret" key;
    # the legacy service_role name remains supported for existing environments.
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Explicit demo mode is used when no Supabase credentials are configured.
    # Do not silently downgrade a production deployment to demo mode.
    DEMO_MODE: bool = bool(os.getenv("TASKFORGE_DEMO_MODE", "true").lower() == "true")

    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ]


settings = Settings()
