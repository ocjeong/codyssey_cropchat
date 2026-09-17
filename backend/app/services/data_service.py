from typing import List, Optional, Dict, Any
from datetime import datetime
from google.cloud.firestore import Client, Query
from app.firebase import get_firestore_client, DATA_COLLECTION
from app.models import CropDataCreate, CropDataUpdate, CropDataResponse, CropDataSummary, CropType


class DataService:
    """작물 데이터 서비스"""
    
    def __init__(self):
        self.db: Client = get_firestore_client()
        self.collection = self.db.collection(DATA_COLLECTION)
    
    def create(self, data: CropDataCreate) -> CropDataResponse:
        """데이터 생성"""
        now = datetime.now()
        doc_data = data.model_dump()
        doc_data["created_at"] = now
        doc_data["updated_at"] = now
        
        doc_ref = self.collection.add(doc_data)[1]
        doc_data["id"] = doc_ref.id
        
        return CropDataResponse(**doc_data)
    
    def get_all(self, limit: int = 100, offset: int = 0) -> List[CropDataResponse]:
        """데이터 목록 조회"""
        query = self.collection.order_by("date", direction=Query.DESCENDING).limit(limit).offset(offset)
        docs = query.stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            results.append(CropDataResponse(**data))
        
        return results
    
    def get_by_id(self, doc_id: str) -> Optional[CropDataResponse]:
        """ID로 데이터 조회"""
        doc = self.collection.document(doc_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return CropDataResponse(**data)
    
    def update(self, doc_id: str, data: CropDataUpdate) -> Optional[CropDataResponse]:
        """데이터 수정"""
        doc_ref = self.collection.document(doc_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now()
        
        doc_ref.update(update_data)
        
        updated_doc = doc_ref.get()
        result = updated_doc.to_dict()
        result["id"] = updated_doc.id
        return CropDataResponse(**result)
    
    def delete(self, doc_id: str) -> bool:
        """데이터 삭제"""
        doc_ref = self.collection.document(doc_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        doc_ref.delete()
        return True
    
    def get_summary(self) -> CropDataSummary:
        """데이터 요약 통계 생성"""
        docs = list(self.collection.stream())
        
        if not docs:
            return CropDataSummary(
                period="데이터 없음",
                count=0,
                total_area=0,
                total_yield=0,
                avg_yield_per_ha=0,
                max_yield_per_ha=0,
                min_yield_per_ha=0,
                crop_types={},
                regions={},
                trend="데이터 없음"
            )
        
        # 데이터 파싱
        records = []
        for doc in docs:
            data = doc.to_dict()
            records.append(data)
        
        count = len(records)
        
        # 기간 계산
        dates = [r["date"] for r in records]
        min_date = min(dates)
        max_date = max(dates)
        period = f"{min_date} ~ {max_date}"
        
        # 기본 통계
        total_area = sum(r["area"] for r in records)
        total_yield = sum(r["yield_amount"] for r in records)
        yield_per_ha_values = [r["yield_per_ha"] for r in records]
        avg_yield_per_ha = sum(yield_per_ha_values) / count
        max_yield_per_ha = max(yield_per_ha_values)
        min_yield_per_ha = min(yield_per_ha_values)
        
        # 작물별 통계
        crop_types = {}
        for r in records:
            crop = r["crop_type"]
            crop_types[crop] = crop_types.get(crop, 0) + 1
        
        # 지역별 통계
        regions = {}
        for r in records:
            region = r["region"]
            regions[region] = regions.get(region, 0) + 1
        
        # 추세 분석 (최근 10개 vs 이전 10개 비교)
        trend = "데이터 부족"
        trend_details = {}
        
        if count >= 20:
            sorted_records = sorted(records, key=lambda x: x["date"])
            recent_10 = sorted_records[-10:]
            previous_10 = sorted_records[-20:-10]
            
            recent_avg = sum(r["yield_per_ha"] for r in recent_10) / 10
            previous_avg = sum(r["yield_per_ha"] for r in previous_10) / 10
            
            change_pct = ((recent_avg - previous_avg) / previous_avg) * 100
            
            if change_pct > 5:
                trend = f"상승 (최근 10건 평균 {change_pct:.1f}% 증가)"
            elif change_pct < -5:
                trend = f"하락 (최근 10건 평균 {abs(change_pct):.1f}% 감소)"
            else:
                trend = f"유지 (변화율 {change_pct:.1f}%)"
            
            trend_details = {
                "recent_avg_yield_per_ha": round(recent_avg, 2),
                "previous_avg_yield_per_ha": round(previous_avg, 2),
                "change_percentage": round(change_pct, 1)
            }
        elif count >= 2:
            sorted_records = sorted(records, key=lambda x: x["date"])
            first = sorted_records[0]["yield_per_ha"]
            last = sorted_records[-1]["yield_per_ha"]
            change_pct = ((last - first) / first) * 100
            
            if change_pct > 5:
                trend = f"상승 ({change_pct:.1f}% 증가)"
            elif change_pct < -5:
                trend = f"하락 ({abs(change_pct):.1f}% 감소)"
            else:
                trend = f"유지 ({change_pct:.1f}% 변화)"
            
            trend_details = {
                "first_yield_per_ha": round(first, 2),
                "last_yield_per_ha": round(last, 2),
                "change_percentage": round(change_pct, 1)
            }
        
        return CropDataSummary(
            period=period,
            count=count,
            total_area=round(total_area, 2),
            total_yield=round(total_yield, 2),
            avg_yield_per_ha=round(avg_yield_per_ha, 2),
            max_yield_per_ha=round(max_yield_per_ha, 2),
            min_yield_per_ha=round(min_yield_per_ha, 2),
            crop_types=crop_types,
            regions=regions,
            trend=trend,
            trend_details=trend_details
        )
    
    def count(self) -> int:
        """전체 데이터 개수 조회"""
        return len(list(self.collection.stream()))
    
    def seed_sample_data(self) -> int:
        """샘플 데이터 초기화 (개발용)"""
        import random
        
        # 기존 데이터 삭제
        for doc in self.collection.stream():
            doc.reference.delete()
        
        # 노지 농작물 작기 샘플 데이터 생성 (2023-01 ~ 2024-12, 약 200개)
        sample_data = []
        crops = list(CropType)
        regions = ["전국", "서울", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"]
        
        # 작물별 기본 단위면적당 생산량 (톤/ha)
        base_yields = {
            CropType.RICE: 5.2,
            CropType.BARLEY: 3.8,
            CropType.WHEAT: 4.1,
            CropType.POTATO: 18.5,
            CropType.SWEET_POTATO: 15.2,
            CropType.CORN: 4.8,
            CropType.SOYBEAN: 1.9,
            CropType.RED_PEPPER: 2.8,
            CropType.GARLIC: 7.5,
            CropType.ONION: 25.0,
            CropType.CABBAGE: 35.0,
            CropType.RADISH: 28.0,
            CropType.OTHER: 10.0,
        }
        
        for year in [2023, 2024]:
            for month in range(1, 13):
                for _ in range(random.randint(5, 10)):  # 월별 5-10개 데이터
                    crop = random.choice(crops)
                    region = random.choice(regions)
                    
                    # 날짜 생성 (해당 월 내 랜덤)
                    day = random.randint(1, 28)
                    date = f"{year}-{month:02d}-{day:02d}"
                    
                    # 면적: 0.5 ~ 50 ha
                    area = round(random.uniform(0.5, 50.0), 1)
                    
                    # 단위면적당 생산량: 기본값 ±20% 변동
                    base_yield = base_yields.get(crop, 10.0)
                    yield_per_ha = round(base_yield * random.uniform(0.8, 1.2), 2)
                    
                    # 총 생산량
                    yield_amount = round(area * yield_per_ha, 2)
                    
                    sample_data.append({
                        "date": date,
                        "crop_type": crop.value,
                        "area": area,
                        "yield_amount": yield_amount,
                        "yield_per_ha": yield_per_ha,
                        "region": region,
                        "memo": f"{year}년 {month}월 {crop.value} 작기 데이터",
                        "created_at": datetime.now(),
                        "updated_at": datetime.now()
                    })
        
        # 배치 삽입
        batch = self.db.batch()
        for data in sample_data:
            doc_ref = self.collection.document()
            batch.set(doc_ref, data)
        batch.commit()
        
        return len(sample_data)