from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    attendance_hmac_secret: str = "super_secret_attendance_master_key_99824"
    secret_key: str = "dev-secret-key-change-in-production"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173"
    node_env: str = "development"
    security_mode: str = "on"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.node_env == "production"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
