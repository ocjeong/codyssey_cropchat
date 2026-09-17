import firebase_admin
from firebase_admin import credentials, firestore
from app.config import get_firebase_credentials


def initialize_firebase():
    """Firebase 앱을 초기화합니다."""
    if not firebase_admin._apps:
        cred_dict = get_firebase_credentials()
        if cred_dict:
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
        else:
            raise ValueError("Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH in .env")


def get_firestore_client():
    """Firestore 클라이언트를 반환합니다."""
    initialize_firebase()
    return firestore.client()


# 컬렉션 이름 상수
DATA_COLLECTION = "crop_data"
CONVERSATIONS_COLLECTION = "conversations"