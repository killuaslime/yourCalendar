"""Create cycle period storage.

Revision ID: 20261002_02
Revises: 20261002_01
Create Date: 2026-10-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20261002_02"
down_revision: str | None = "20261002_01"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cycle_periods",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "start_date", name="uq_cycle_periods_user_start"),
    )
    op.create_index("ix_cycle_periods_user_id", "cycle_periods", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_cycle_periods_user_id", table_name="cycle_periods")
    op.drop_table("cycle_periods")
