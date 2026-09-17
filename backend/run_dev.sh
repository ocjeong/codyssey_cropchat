#!/bin/bash
# 백엔드 개발 서버 실행 스크립트

set -e

echo "🌱 백엔드 개발 서버 시작..."

# 가상환경 확인
if [ ! -d "venv" ]; then
    echo "📦 가상환경 생성 중..."
    python3 -m venv venv
fi

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치
echo "📦 의존성 설치 중..."
pip install -r requirements.txt

# 환경 변수 파일 확인
if [ ! -f ".env" ]; then
    echo "⚠️  .env 파일이 없습니다. env.example을 복사하여 설정하세요."
    cp env.example .env
    echo "📝 .env 파일을 편집한 후 다시 실행하세요."
    exit 1
fi

# 개발 서버 실행
echo "🚀 서버 시작: http://localhost:8000"
echo "📚 API 문서: http://localhost:8000/docs"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000