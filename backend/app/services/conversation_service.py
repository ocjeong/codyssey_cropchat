from typing import List, Optional
from datetime import datetime
from google.cloud.firestore import Client, Query
from app.firebase import get_firestore_client, CONVERSATIONS_COLLECTION
from app.models import ConversationCreate, ConversationResponse, ConversationListItem, Message, MessageRole


class ConversationService:
    """대화 기록 서비스"""
    
    def __init__(self):
        self.db: Client = get_firestore_client()
        self.collection = self.db.collection(CONVERSATIONS_COLLECTION)
    
    def create(self, conversation: ConversationCreate) -> ConversationResponse:
        """대화 생성"""
        now = datetime.now()
        doc_data = conversation.model_dump()
        doc_data["created_at"] = now
        doc_data["updated_at"] = now
        
        # 메시지 직렬화
        doc_data["messages"] = [msg.model_dump() for msg in conversation.messages]
        
        doc_ref = self.collection.add(doc_data)[1]
        doc_data["id"] = doc_ref.id
        
        return ConversationResponse(**doc_data)
    
    def get_all(self, limit: int = 50, offset: int = 0) -> List[ConversationListItem]:
        """대화 목록 조회 (메시지 제외)"""
        query = self.collection.order_by("updated_at", direction=Query.DESCENDING).limit(limit).offset(offset)
        docs = query.stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            messages = data.get("messages", [])
            last_msg = messages[-1]["content"] if messages else None
            
            results.append(ConversationListItem(
                id=doc.id,
                title=data.get("title", "제목 없음"),
                message_count=len(messages),
                last_message=last_msg[:50] + "..." if last_msg and len(last_msg) > 50 else last_msg,
                created_at=data.get("created_at", now),
                updated_at=data.get("updated_at", now)
            ))
        
        return results
    
    def get_by_id(self, conversation_id: str) -> Optional[ConversationResponse]:
        """특정 대화 조회 (메시지 포함)"""
        doc = self.collection.document(conversation_id).get()
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        data["id"] = doc.id
        
        # 메시지 역직렬화
        messages = []
        for msg in data.get("messages", []):
            msg["timestamp"] = msg.get("timestamp", datetime.now())
            messages.append(Message(**msg))
        data["messages"] = messages
        
        return ConversationResponse(**data)
    
    def update_messages(self, conversation_id: str, messages: List[Message]) -> Optional[ConversationResponse]:
        """대화 메시지 업데이트"""
        doc_ref = self.collection.document(conversation_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        messages_data = [msg.model_dump() for msg in messages]
        doc_ref.update({
            "messages": messages_data,
            "updated_at": datetime.now()
        })
        
        return self.get_by_id(conversation_id)
    
    def delete(self, conversation_id: str) -> bool:
        """대화 삭제"""
        doc_ref = self.collection.document(conversation_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        doc_ref.delete()
        return True
    
    def add_message(self, conversation_id: str, message: Message) -> Optional[ConversationResponse]:
        """대화에 메시지 추가"""
        conversation = self.get_by_id(conversation_id)
        if not conversation:
            return None
        
        conversation.messages.append(message)
        return self.update_messages(conversation_id, conversation.messages)