#!/bin/bash
# Vercel 빌드 스크립트
# 환경 변수 API_BASE_URL을 config.js에 주입합니다

set -e

# 기본값 설정 (로컬 개발용)
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"

echo "🔧 환경 변수 주입 중..."
echo "   API_BASE_URL = $API_BASE_URL"

# config.js 템플릿에서 %%API_BASE_URL%% 치환
sed "s|%%API_BASE_URL%%|$API_BASE_URL|g" config.js > config.generated.js
mv config.generated.js config.js

echo "✅ config.js 생성 완료"
cat config.js