from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas import IpoResponse, RecentIpo, UpcomingIpo
from app.services.ipo_service import get_recent_ipos, get_upcoming_ipos

router = APIRouter(prefix="/api", tags=["ipo"])


@router.get("/ipo", response_model=IpoResponse)
def get_ipos(market: str = Query("IN")) -> IpoResponse:
    return IpoResponse(
        upcoming=[UpcomingIpo(**i) for i in get_upcoming_ipos()],
        recent=[RecentIpo(**i) for i in get_recent_ipos()],
    )
