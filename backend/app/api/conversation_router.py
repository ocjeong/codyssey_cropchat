from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.services.conversation_service import ConversationService
from app.models import (
    ConversationCreate, ConversationResponse, 
    ConversationListItem, Message
)

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])
conversation_service = ConversationService()


@router.post("", response_model=ConversationResponse, summary="대화 생성")
async def create_conversation(conversation: ConversationCreate):
    """새로운 대화를 생성합니다."""
    return conversation_service.create(conversation)


@router.get("", response_model=List[ConversationListItem], summary="대화 목록 조회")
async def list_conversations(
    limit: int = Query(50, ge=1, le=100, description="조회 개수"),
    offset: int = Query(0, ge=0, description="건너뛸 개수")
):
    """대화 목록을 조회합니다. (메시지 제외)"""
    return conversation_service.get_all(limit=limit, offset=offset)


@router.get("/{conversation_id}", response_model=ConversationResponse, summary="대화 상세 조회")
async def get_conversation(conversation_id: str):
    """특정 대화의 전체 메시지를 조회합니다."""
    conversation = conversation_service.get_by_id(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="대화를 찾을 수 없습니다")
    return conversation


@router.delete("/{conversation_id}", summary="대화 삭제")
async def delete_conversation(conversation_id: str):
    """대화를 삭제합니다."""
    success = conversation_service.delete(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="대화를 찾을 수 없습니다")
    return {"message": "삭제되었습니다", "id": conversation_id}