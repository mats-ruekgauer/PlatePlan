from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str | None = None
    DEEPSEEK_API_KEY: str
    APP_SCHEME: str = "plateplan"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
