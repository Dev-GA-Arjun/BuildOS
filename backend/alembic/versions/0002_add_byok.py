"""add openrouter_api_key to users

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('openrouter_api_key', sa.String(255), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('users', 'openrouter_api_key')