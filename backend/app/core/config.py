import os


class Settings:
    PROJECT_NAME: str = "TaskForge API"
    VERSION: str = "1.1.0"
    API_PREFIX: str = "/api"
    PORT: int = int(os.getenv("PORT", "8000"))

    # Server-only Supabase credentials. Never expose the service-role key to React.
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")

    # Override in deployment with a comma-separated list when needed.
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ]


settings = Settings()
