from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.api import data_router, conversation_router, chat_router
from app.firebase import initialize_firebase


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 실행
    try:
        initialize_firebase()
        print("Firebase 초기화 완료")
    except Exception as e:
        print(f"Firebase 초기화 실패: {e}")
    yield
    # 종료 시 실행 (필요시 정리)


app = FastAPI(
    title=settings.APP_NAME,
    description="노지 농작물 작기 데이터 기반 AI 비서 API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(data_router)
app.include_router(conversation_router)
app.include_router(chat_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Crop Season AI Assistant API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "ok"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}