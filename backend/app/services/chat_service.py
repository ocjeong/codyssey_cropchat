from typing import Optional
from openai import AsyncOpenAI
from app.config import settings
from app.services.data_service import DataService
from app.services.conversation_service import ConversationService
from app.models import Message, MessageRole, ChatRequest, ChatResponse


class ChatService:
    """AI 챗봇 서비스"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.data_service = DataService()
        self.conversation_service = ConversationService()
        self.model = "gpt-4o-mini"
    
    def _build_system_prompt(self, summary) -> str:
        """시스템 프롬프트 구성 (데이터 요약 주입)"""
        crop_types_str = ", ".join([f"{k}: {v}건" for k, v in summary.crop_types.items()])
        regions_str = ", ".join([f"{k}: {v}건" for k, v in summary.regions.items()])
        
        trend_detail = ""
        if summary.trend_details:
            if "change_percentage" in summary.trend_details:
                trend_detail = f" (변화율: {summary.trend_details['change_percentage']}%)"
        
        return f"""당신은 노지 농작물 작기 데이터 분석 전문 비서입니다.

[사용자 데이터 요약]
- 데이터 기간: {summary.period}
- 총 레코드: {summary.count}개
- 총 재배 면적: {summary.total_area:,.1f} ha
- 총 생산량: {summary.total_yield:,.1f} 톤
- 평균 단위면적당 생산량: {summary.avg_yield_per_ha:.2f} 톤/ha
- 최대 단위면적당 생산량: {summary.max_yield_per_ha:.2f} 톤/ha
- 최소 단위면적당 생산량: {summary.min_yield_per_ha:.2f} 톤/ha
- 작물별 분포: {crop_types_str}
- 지역별 분포: {regions_str}
- 최근 추세: {summary.trend}{trend_detail}

위 데이터를 기반으로 사용자의 질문에 맞춤형 답변을 제공하세요.
데이터에 없는 내용은 추측하지 말고 "데이터에 해당 정보가 없습니다"라고 답하세요.
친절하고 전문적인 톤으로 답변하세요."""
    
    async def chat(self, request: ChatRequest) -> ChatResponse:
        """채팅 처리"""
        # 1. 데이터 요약 조회
        summary = self.data_service.get_summary()
        
        # 2. 시스템 프롬프트 구성
        system_prompt = self._build_system_prompt(summary)
        
        # 3. 대화 기록 조회 또는 생성
        conversation_id = request.conversation_id
        messages = []
        
        if conversation_id:
            conversation = self.conversation_service.get_by_id(conversation_id)
            if conversation:
                messages = conversation.messages
        
        # 4. 사용자 메시지 추가
        user_message = Message(role=MessageRole.USER, content=request.message)
        messages.append(user_message)
        
        # 5. OpenAI API 호출을 위한 메시지 구성
        api_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            api_messages.append({"role": msg.role.value, "content": msg.content})
        
        # 6. GPT API 호출
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=api_messages,
                max_tokens=1000,
                temperature=0.7
            )
            assistant_content = response.choices[0].message.content
        except Exception as e:
            assistant_content = f"죄송합니다. 오류가 발생했습니다: {str(e)}"
        
        # 7. 어시스턴트 메시지 추가
        assistant_message = Message(role=MessageRole.ASSISTANT, content=assistant_content)
        messages.append(assistant_message)
        
        # 8. 대화 저장
        if conversation_id:
            self.conversation_service.update_messages(conversation_id, messages)
        else:
            # 새 대화 생성 (첫 사용자 메시지로 제목 생성)
            title = request.message[:30] + "..." if len(request.message) > 30 else request.message
            from app.models import ConversationCreate
            new_conversation = ConversationCreate(title=title, messages=messages)
            created = self.conversation_service.create(new_conversation)
            conversation_id = created.id
        
        return ChatResponse(
            message=assistant_content,
            conversation_id=conversation_id
        )