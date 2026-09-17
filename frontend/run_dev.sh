#!/bin/bash
# 프론트엔드 개발 서버 실행 스크립트

set -e

echo "🌱 프론트엔드 개발 서버 시작..."

# 환경 변수 파일 확인
if [ ! -f ".env" ]; then
    echo "📝 .env 파일 생성 (env.example 복사)..."
    cp env.example .env
fi

# Python 내장 서버로 정적 파일 서빙 (포트 3000)
echo "🚀 서버 시작: http://localhost:3000"
python3 -m http.server 3000