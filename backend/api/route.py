import hashlib
import hmac
import json
import os
import time
from datetime import date, datetime, timedelta, timezone
from urllib.parse import parse_qsl

import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import and_, or_, select

from database.database import SessionLocal
from database.models import CyclePeriod, User


load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)
TELEGRAM_AUTH_MAX_AGE_SECONDS = int(
    os.getenv("TELEGRAM_AUTH_MAX_AGE_SECONDS", "86400")
)
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuthRequest(BaseModel):
    init_data: str = Field(min_length=1, max_length=4096)


class UserResponse(BaseModel):
    id: int
    telegram_id: int
    username: str | None
    first_name: str | None


class TelegramAuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


class CyclePeriodCreate(BaseModel):
    start_date: date
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date > date.today():
            raise ValueError("The period start date cannot be in the future")

        if self.end_date and self.end_date < self.start_date:
            raise ValueError("The period end date cannot precede the start date")

        if self.end_date and (self.end_date - self.start_date).days >= 10:
            raise ValueError("A period cannot be 10 days or longer")

        return self


class CyclePeriodUpdate(BaseModel):
    end_date: date | None = None


class CyclePeriodResponse(BaseModel):
    id: int
    start_date: date
    end_date: date | None


class CycleResponse(BaseModel):
    periods: list[CyclePeriodResponse]


def user_response(user: User) -> dict:
    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
    }


def cycle_period_response(period: CyclePeriod) -> dict:
    return {
        "id": period.id,
        "start_date": period.start_date,
        "end_date": period.end_date,
    }


def validate_period_dates(start_date: date, end_date: date | None) -> None:
    if end_date and end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The period end date cannot precede the start date",
        )

    if end_date and (end_date - start_date).days >= 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A period cannot be 10 days or longer",
        )


async def period_overlaps(
    session,
    user_id: int,
    start_date: date,
    end_date: date | None,
    excluded_period_id: int | None = None,
) -> bool:
    comparison_end = end_date or start_date
    filters = [
        CyclePeriod.user_id == user_id,
        CyclePeriod.start_date <= comparison_end,
        or_(CyclePeriod.end_date.is_(None), CyclePeriod.end_date >= start_date),
    ]

    if excluded_period_id is not None:
        filters.append(CyclePeriod.id != excluded_period_id)

    result = await session.execute(
        select(CyclePeriod.id).where(and_(*filters)).limit(1)
    )
    return result.scalar_one_or_none() is not None


def create_access_token(user: User) -> str:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET is not configured")

    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "iat": now,
        "exp": now + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> User:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET is not configured")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def validate_telegram_init_data(init_data: str) -> dict:
    """Validate the signed initData string received from Telegram Mini Apps."""
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN is not configured")

    pairs = parse_qsl(init_data, keep_blank_values=True)
    keys = [key for key, _ in pairs]

    if len(keys) != len(set(keys)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram authorization data",
        )

    data = dict(pairs)
    received_hash = data.pop("hash", None)
    auth_date = data.get("auth_date")

    if not received_hash or not auth_date:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram authorization data",
        )

    try:
        auth_timestamp = int(auth_date)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram authorization data",
        ) from error

    if auth_timestamp > time.time() or time.time() - auth_timestamp > TELEGRAM_AUTH_MAX_AGE_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram authorization data has expired",
        )

    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(data.items())
    )
    secret_key = hmac.new(
        b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256
    ).digest()
    expected_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram authorization data",
        )

    try:
        telegram_user = json.loads(data["user"])
        telegram_id = telegram_user["id"]
    except (KeyError, TypeError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram user data is missing",
        ) from error

    if not isinstance(telegram_id, int) or isinstance(telegram_id, bool):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram user data is invalid",
        )

    return telegram_user


@app.post("/api/auth/telegram", response_model=TelegramAuthResponse)
async def post_auth(auth_request: AuthRequest):
    telegram_user = validate_telegram_init_data(auth_request.init_data)

    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(User.telegram_id == telegram_user["id"])
        )
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                telegram_id=telegram_user["id"],
                username=telegram_user.get("username"),
                first_name=telegram_user.get("first_name"),
            )
            session.add(user)
        else:
            user.username = telegram_user.get("username")
            user.first_name = telegram_user.get("first_name")

        await session.commit()
        await session.refresh(user)

    return {
        "user": user_response(user),
        "access_token": create_access_token(user),
        "token_type": "bearer",
    }


@app.get("/api/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"user": user_response(current_user)}


@app.get("/api/cycle")
async def get_cycle(
    current_user: User = Depends(get_current_user),
) -> CycleResponse:
    async with SessionLocal() as session:
        result = await session.execute(
            select(CyclePeriod)
            .where(CyclePeriod.user_id == current_user.id)
            .order_by(CyclePeriod.start_date)
        )
        periods = result.scalars().all()

    return {"periods": [cycle_period_response(period) for period in periods]}


@app.post("/api/cycle/periods")
async def post_periods(
    payload: CyclePeriodCreate,
    current_user: User = Depends(get_current_user),
) -> CyclePeriodResponse:
    async with SessionLocal() as session:
        if await period_overlaps(
            session,
            current_user.id,
            payload.start_date,
            payload.end_date,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This period overlaps an existing period",
            )

        period = CyclePeriod(
            user_id=current_user.id,
            start_date=payload.start_date,
            end_date=payload.end_date,
        )
        session.add(period)
        await session.commit()
        await session.refresh(period)

    return cycle_period_response(period)


@app.patch("/api/cycle/periods/{period_id}")
async def patch_period(
    period_id: int,
    payload: CyclePeriodUpdate,
    current_user: User = Depends(get_current_user),
) -> CyclePeriodResponse:
    async with SessionLocal() as session:
        result = await session.execute(
            select(CyclePeriod).where(
                CyclePeriod.id == period_id,
                CyclePeriod.user_id == current_user.id,
            )
        )
        period = result.scalar_one_or_none()

        if period is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Period not found",
            )

        validate_period_dates(period.start_date, payload.end_date)

        if await period_overlaps(
            session,
            current_user.id,
            period.start_date,
            payload.end_date,
            excluded_period_id=period.id,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This period overlaps an existing period",
            )

        period.end_date = payload.end_date
        await session.commit()
        await session.refresh(period)

    return cycle_period_response(period)


@app.delete("/api/cycle/periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_period(
    period_id: int,
    current_user: User = Depends(get_current_user),
) -> None:
    async with SessionLocal() as session:
        result = await session.execute(
            select(CyclePeriod).where(
                CyclePeriod.id == period_id,
                CyclePeriod.user_id == current_user.id,
            )
        )
        period = result.scalar_one_or_none()

        if period is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Period not found",
            )

        await session.delete(period)
        await session.commit()


@app.get("/api/symptoms")
async def get_symptoms(current_user: User = Depends(get_current_user)):
    return "Get entries"


@app.post("/api/symptoms")
async def post_symptoms(current_user: User = Depends(get_current_user)):
    return "Save an entry"


@app.get("/api/chat/{character}")
async def get_chat(
    character: str,
    current_user: User = Depends(get_current_user),
):
    return {"character": character, "message": "Chat history"}


@app.post("/api/chat/{character}")
async def post_chat(
    character: str,
    current_user: User = Depends(get_current_user),
):
    return {"character": character, "message": "Send a message to AI"}


@app.get("/api/settings")
async def get_settings(current_user: User = Depends(get_current_user)):
    return "Get settings"


@app.patch("/api/settings")
async def patch_settings(current_user: User = Depends(get_current_user)):
    return "Update settings"
