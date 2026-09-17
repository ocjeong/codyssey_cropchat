# 🌱 노지 농작물 작기 데이터 AI 비서

시계열 농작물 데이터를 분석하고, 이를 기반으로 맞춤형 답변을 제공하는 AI 챗봇 서비스입니다.

## 📋 서비스 소개

이 서비스는 노지 농작물 작기 데이터(재배 면적, 생산량, 단위면적당 생산량 등)를 저장하고 분석하여, 사용자의 자연어 질문에 대해 데이터 기반의 맞춤형 답변을 제공합니다.

**주요 해결 과제:**
- 일반적인 LLM은 사용자의 비공개 데이터를 모름
- 시계열 농업 데이터의 트렌드 파악 어려움
- 데이터 분석 전문 지식 없이도 인사이트 획득 필요

## 🛠 기술 스택

### 백엔드
- **FastAPI** - 고성능 비동기 웹 프레임워크
- **Firebase Firestore** - NoSQL 문서 데이터베이스
- **OpenAI GPT-4o-mini** - 대화형 AI 모델
- **Pydantic** - 데이터 검증 및 직렬화
- **Uvicorn** - ASGI 서버

### 프론트엔드
- **Vanilla HTML/CSS/JavaScript** - 프레임워크 없는 순수 구현
- **Chart.js** - 데이터 시각화 (CDN)
- **CSS Variables** - 다크모드 지원

### 배포
- **Backend**: Render (Web Service)
- **Frontend**: Vercel (Static Site)

## 🚀 배포 URL

| 구분 | URL |
|------|-----|
| 프론트엔드 | https://crop-season-ai.vercel.app |
| 백엔드 API | https://crop-season-ai-backend.onrender.com |
| API 문서 (Swagger) | https://crop-season-ai-backend.onrender.com/docs |

> ⚠️ Render 무료 티어는 비활성 상태 시 콜드 스타트로 첫 요청에 30-60초 소요될 수 있습니다.

## 💻 로컬 실행 방법

### 사전 요구사항
- Python 3.10+
- Node.js 18+ (프론트엔드 개발 서버용, 선택사항)
- Firebase 프로젝트 및 서비스 계정 키
- OpenAI API 키

### 1. 백엔드 설정

```bash
# 백엔드 디렉토리 이동
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp env.example .env
# .env 파일 편집하여 API 키 입력
```

`.env` 필수 환경 변수:
```env
OPENAI_API_KEY=sk-your-openai-api-key
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
```

### 2. 백엔드 실행

```bash
# 개발 서버 실행
uvicorn app.main:app --reload --port 8000

# 샘플 데이터 생성 (첫 실행 시)
# Swagger UI(http://localhost:8000/docs)에서 POST /api/data/seed 호출
```

### 3. 프론트엔드 실행

```bash
# 프론트엔드 디렉토리 이동
cd frontend

# 정적 파일 서버 실행 (Python)
python -m http.server 3000

# 또는 VS Code Live Server 확장 사용 (포트 5500)
# 또는 npx serve
npx serve -p 3000
```

브라우저에서 `http://localhost:3000` 또는 `http://127.0.0.1:5500` 접속

## 🔧 환경 변수 목록

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI API 키 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ✅ | Firebase 서비스 계정 JSON (한 줄로) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | ❌ | 서비스 계정 키 파일 경로 (JSON 대신 사용) |
| `ALLOWED_ORIGINS` | ✅ | CORS 허용 도메인 (콤마 구분) |
| `FRONTEND_URL` | ❌ | 프론트엔드 배포 URL (참고용) |
| `APP_NAME` | ❌ | 애플리케이션 이름 |
| `DEBUG` | ❌ | 디버그 모드 (true/false) |

## 📁 프로젝트 구조

```
M1-2/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── api/            # API 라우터
│   │   │   ├── data_router.py       # 데이터 CRUD + 요약
│   │   │   ├── conversation_router.py # 대화 기록 CRUD
│   │   │   └── chat_router.py       # AI 채팅
│   │   ├── config.py       # 설정 관리
│   │   ├── firebase.py     # Firebase 초기화
│   │   ├── main.py         # FastAPI 앱 엔트리포인트
│   │   ├── models.py       # Pydantic 모델
│   │   └── services/       # 비즈니스 로직
│   │       ├── data_service.py
│   │       ├── conversation_service.py
│   │       └── chat_service.py
│   ├── requirements.txt
│   ├── render.yaml         # Render 배포 설정
│   └── env.example         # 환경 변수 예시
│
├── frontend/               # 바닐라 프론트엔드
│   ├── index.html          # 메인 HTML
│   ├── styles.css          # 스타일시트
│   ├── app.js              # 애플리케이션 로직
│   └── env.example         # 환경 변수 예시
│
└── README.md
```

## 🔌 API 엔드포인트

### 데이터 관리 (`/api/data`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/` | 데이터 추가 |
| GET | `/` | 데이터 목록 조회 (페이지네이션) |
| GET | `/{id}` | 단건 조회 |
| PUT | `/{id}` | 데이터 수정 |
| DELETE | `/{id}` | 데이터 삭제 |
| GET | `/summary` | 데이터 요약 통계 |
| POST | `/seed` | 샘플 데이터 생성 (개발용) |

### 대화 기록 (`/api/conversations`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/` | 대화 생성 |
| GET | `/` | 대화 목록 조회 |
| GET | `/{id}` | 대화 상세 조회 (메시지 포함) |
| DELETE | `/{id}` | 대화 삭제 |

### AI 채팅 (`/api/chat`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/` | AI 대화 (컨텍스트 주입) |

## 💡 주요 기능

### 1. 데이터 기반 AI 채팅
- 사용자 질문 → 데이터 요약 조회 → 시스템 프롬프트 주입 → GPT 호출 → 답변 생성 → 대화 자동 저장
- 예시 질문:
  - "최근 벼 생산량 추세가 어때?"
  - "가장 생산량이 높은 작물은?"
  - "2024년 경기 지역 데이터 알려줘"

### 2. 데이터 관리 (CRUD)
- 날짜, 작물 종류, 지역, 면적, 생산량, 단위면적당 생산량, 메모 관리
- 페이지네이션, 검색, 정렬 지원
- 모달 기반 추가/수정 폼

### 3. 대화 기록
- 대화 목록 조회 (제목, 마지막 메시지, 메시지 수, 시간)
- 대화 선택 시 전체 메시지 히스토리 표시
- 대화 삭제 기능

### 4. 데이터 요약 대시보드
- 기간, 레코드 수, 총 면적/생산량, 평균/최대/최소 단위면적당 생산량
- 최근 추세 분석 (상승/하락/유지, 변화율)
- 작물별/지역별 분포 태그
- Chart.js 기반 막대 차트 시각화

### 5. 다크 모드
- 시스템 설정 또는 수동 토글로 라이트/다크 모드 전환
- localStorage에 설정 저장

## 📸 스크린샷

### 채팅 화면 (데이터 요약 반영 답변)
![채팅 화면](docs/chat-screen.png)

### 데이터 관리 화면 (CRUD)
![데이터 관리](docs/data-management.png)

### 대화 기록 화면 (불러오기)
![대화 기록](docs/history.png)

### 데이터 요약 대시보드
![데이터 요약](docs/summary.png)

## 🔒 보안 및 운영

- API 키/서비스 계정 키는 환경 변수로 관리 (코드에 하드코딩 금지)
- Pydantic을 통한 요청 데이터 검증
- CORS 설정으로 허용된 도메인만 접근 가능
- 입력값 검증 및 예외 처리 적용

## 💰 비용 주의사항

- OpenAI API 사용 시 토큰당 과금 발생
- 개발/테스트 시 `max_tokens` 제한 권장
- Render/Vercel 무료 티어 한도 확인 필요

## 📝 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request