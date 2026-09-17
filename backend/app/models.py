from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class CropType(str, Enum):
    """작물 종류"""
    RICE = "rice"           # 벼
    BARLEY = "barley"       # 보리
    WHEAT = "wheat"         # 밀
    POTATO = "potato"       # 감자
    SWEET_POTATO = "sweet_potato"  # 고구마
    CORN = "corn"           # 옥수수
    SOYBEAN = "soybean"     # 콩
    RED_PEPPER = "red_pepper"  # 고추
    GARLIC = "garlic"       # 마늘
    ONION = "onion"         # 양파
    CABBAGE = "cabbage"     # 배추
    RADISH = "radish"       # 무
    OTHER = "other"         # 기타


class CropDataBase(BaseModel):
    """작물 데이터 기본 모델"""
    date: str = Field(..., description="날짜 (YYYY-MM-DD)")
    crop_type: CropType = Field(..., description="작물 종류")
    area: float = Field(..., ge=0, description="재배 면적 (ha)")
    yield_amount: float = Field(..., ge=0, description="생산량 (톤)")
    yield_per_ha: float = Field(..., ge=0, description="단위 면적당 생산량 (톤/ha)")
    region: str = Field(..., description="지역")
    memo: Optional[str] = Field(None, description="메모")


class CropDataCreate(CropDataBase):
    """작물 데이터 생성 요청"""
    pass


class CropDataUpdate(BaseModel):
    """작물 데이터 수정 요청"""
    date: Optional[str] = Field(None, description="날짜 (YYYY-MM-DD)")
    crop_type: Optional[CropType] = Field(None, description="작물 종류")
    area: Optional[float] = Field(None, ge=0, description="재배 면적 (ha)")
    yield_amount: Optional[float] = Field(None, ge=0, description="생산량 (톤)")
    yield_per_ha: Optional[float] = Field(None, ge=0, description="단위 면적당 생산량 (톤/ha)")
    region: Optional[str] = Field(None, description="지역")
    memo: Optional[str] = Field(None, description="메모")


class CropDataResponse(CropDataBase):
    """작물 데이터 응답"""
    id: str = Field(..., description="문서 ID")
    created_at: datetime = Field(..., description="생성 일시")
    updated_at: datetime = Field(..., description="수정 일시")


class CropDataSummary(BaseModel):
    """작물 데이터 요약"""
    period: str = Field(..., description="데이터 기간")
    count: int = Field(..., description="총 레코드 수")
    total_area: float = Field(..., description="총 재배 면적 (ha)")
    total_yield: float = Field(..., description="총 생산량 (톤)")
    avg_yield_per_ha: float = Field(..., description="평균 단위 면적당 생산량 (톤/ha)")
    max_yield_per_ha: float = Field(..., description="최대 단위 면적당 생산량 (톤/ha)")
    min_yield_per_ha: float = Field(..., description="최소 단위 면적당 생산량 (톤/ha)")
    crop_types: Dict[str, int] = Field(..., description="작물별 레코드 수")
    regions: Dict[str, int] = Field(..., description="지역별 레코드 수")
    trend: str = Field(..., description="최근 추세")
    trend_details: Dict[str, Any] = Field(default_factory=dict, description="추세 상세 정보")


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    """대화 메시지"""
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class ConversationBase(BaseModel):
    """대화 기본 모델"""
    title: str = Field(..., description="대화 제목")


class ConversationCreate(ConversationBase):
    """대화 생성 요청"""
    messages: List[Message] = Field(default_factory=list, description="메시지 리스트")


class ConversationResponse(ConversationBase):
    """대화 응답"""
    id: str
    messages: List[Message] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ConversationListItem(BaseModel):
    """대화 목록 아이템"""
    id: str
    title: str
    message_count: int
    last_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ChatRequest(BaseModel):
    """채팅 요청"""
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    """채팅 응답"""
    message: str
    conversation_id: str