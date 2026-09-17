from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.services.data_service import DataService
from app.models import (
    CropDataCreate, CropDataUpdate, CropDataResponse, 
    CropDataSummary
)

router = APIRouter(prefix="/api/data", tags=["Data"])
data_service = DataService()


@router.post("", response_model=CropDataResponse, summary="데이터 추가")
async def create_data(data: CropDataCreate):
    """새로운 작물 데이터를 추가합니다."""
    return data_service.create(data)


@router.get("", response_model=List[CropDataResponse], summary="데이터 목록 조회")
async def list_data(
    limit: int = Query(100, ge=1, le=500, description="조회 개수"),
    offset: int = Query(0, ge=0, description="건너뛸 개수")
):
    """작물 데이터 목록을 조회합니다."""
    return data_service.get_all(limit=limit, offset=offset)


@router.get("/summary", response_model=CropDataSummary, summary="데이터 요약 조회")
async def get_summary():
    """작물 데이터의 요약 통계를 조회합니다."""
    return data_service.get_summary()


@router.get("/{data_id}", response_model=CropDataResponse, summary="데이터 단건 조회")
async def get_data(data_id: str):
    """특정 ID의 작물 데이터를 조회합니다."""
    data = data_service.get_by_id(data_id)
    if not data:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다")
    return data


@router.put("/{data_id}", response_model=CropDataResponse, summary="데이터 수정")
async def update_data(data_id: str, data: CropDataUpdate):
    """작물 데이터를 수정합니다."""
    updated = data_service.update(data_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다")
    return updated


@router.delete("/{data_id}", summary="데이터 삭제")
async def delete_data(data_id: str):
    """작물 데이터를 삭제합니다."""
    success = data_service.delete(data_id)
    if not success:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다")
    return {"message": "삭제되었습니다", "id": data_id}


@router.post("/seed", summary="샘플 데이터 초기화 (개발용)")
async def seed_data():
    """개발용 샘플 데이터를 생성합니다."""
    count = data_service.seed_sample_data()
    return {"message": f"{count}개의 샘플 데이터가 생성되었습니다", "count": count}