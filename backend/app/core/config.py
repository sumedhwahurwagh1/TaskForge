import os

class Settings:
    PROJECT_NAME: str = "TaskForge API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Supabase (Backend only: never expose service role key to frontend!)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "taskforge-secret-key")
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://taskforge.vercel.app",
    ]

settings = Settings()
