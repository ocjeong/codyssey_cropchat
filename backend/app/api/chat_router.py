from fastapi import APIRouter, HTTPException
from app.services.chat_service import ChatService
from app.models import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["Chat"])
chat_service = ChatService()


@router.post("", response_model=ChatResponse, summary="AI 채팅")
async def chat(request: ChatRequest):
    """AI와 대화합니다. 데이터 요약이 시스템 프롬프트에 주입됩니다."""
    try:
        return await chat_service.chat(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 처리 중 오류 발생: {str(e)}")