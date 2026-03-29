"""add profile fields and ai call limits to users

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('avatar_url', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('bio', sa.String(300), nullable=True))
    op.add_column('users', sa.Column('skills', sa.Text, nullable=True))
    op.add_column('users', sa.Column('github_url', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('linkedin_url', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('resume_url', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('ai_calls_today', sa.Integer, server_default='0', nullable=False))
    op.add_column('users', sa.Column('ai_calls_reset_at', sa.Date, nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'skills')
    op.drop_column('users', 'github_url')
    op.drop_column('users', 'linkedin_url')
    op.drop_column('users', 'resume_url')
    op.drop_column('users', 'ai_calls_today')
    op.drop_column('users', 'ai_calls_reset_at')