"""create daily executions table

Revision ID: 0002_create_daily_executions_table
Revises: 0001_create_tasks_table
Create Date: 2026-03-01 00:30:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002_create_daily_executions_table"
down_revision: str | None = "0001_create_tasks_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "daily_executions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("execution_date", sa.Date(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("execution_date"),
    )
    op.create_index(op.f("ix_daily_executions_id"), "daily_executions", ["id"], unique=False)
    op.create_index(
        op.f("ix_daily_executions_execution_date"),
        "daily_executions",
        ["execution_date"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_daily_executions_execution_date"), table_name="daily_executions")
    op.drop_index(op.f("ix_daily_executions_id"), table_name="daily_executions")
    op.drop_table("daily_executions")
