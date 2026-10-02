from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    telegram_id: Mapped[int] = mapped_column(
        BigInteger,
        unique=True,
        nullable=False
    )

    username: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    first_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    cycle_length: Mapped[int | None] = mapped_column(
        nullable=True
    )

    last_period_date: Mapped[datetime | None] = mapped_column(
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )

    subscriptions: Mapped[list["Subscription"]] = relationship(
        back_populates="user"
    )

    cycle_periods: Mapped[list["CyclePeriod"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class CyclePeriod(Base):
    __tablename__ = "cycle_periods"
    __table_args__ = (
        UniqueConstraint("user_id", "start_date", name="uq_cycle_periods_user_start"),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    end_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship(
        back_populates="cycle_periods",
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    plan: Mapped[str] = mapped_column(
        String(50),
        default="free",
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        nullable=False
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )

    user: Mapped["User"] = relationship(
        back_populates="subscriptions"
    )
