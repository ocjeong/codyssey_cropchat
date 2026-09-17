// ========================================
// 앱 설정 - 빌드 시 환경 변수가 주입됩니다
// 로컬 개발 시: http://localhost:8000
// 배포 환경: Vercel 환경 변수 API_BASE_URL 값
// ========================================
window.APP_CONFIG = {
    API_BASE_URL: '%%API_BASE_URL%%',
    PAGE_SIZE: 20,
    TOAST_DURATION: 3000
};