from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # Firebase
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""
    FIREBASE_SERVICE_ACCOUNT_PATH: str = ""
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:5500"]
    
    # App
    APP_NAME: str = "Crop Season AI Assistant"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()


def get_firebase_credentials():
    """Firebase 서비스 계정 자격증명을 반환합니다."""
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        return json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
    elif settings.FIREBASE_SERVICE_ACCOUNT_PATH:
        with open(settings.FIREBASE_SERVICE_ACCOUNT_PATH, 'r') as f:
            return json.load(f)
    return None