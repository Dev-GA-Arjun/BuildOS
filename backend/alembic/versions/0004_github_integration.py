"""add github integration columns

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-29
"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users — store GitHub access token for repo operations
    op.add_column('users', sa.Column('github_access_token', sa.String(255), nullable=True))

    # Projects — store linked repo + webhook info
    op.add_column('projects', sa.Column('github_repo', sa.String(255), nullable=True))
    op.add_column('projects', sa.Column('github_webhook_id', sa.Integer, nullable=True))
    op.add_column('projects', sa.Column('github_branch', sa.String(100), nullable=True, server_default='main'))

    # Tasks — store which commit completed it
    op.add_column('tasks', sa.Column('completed_via', sa.String(50), nullable=True))
    op.add_column('tasks', sa.Column('completion_proof', sa.Text, nullable=True))
    op.add_column('tasks', sa.Column('github_commit_sha', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'github_access_token')
    op.drop_column('projects', 'github_repo')
    op.drop_column('projects', 'github_webhook_id')
    op.drop_column('projects', 'github_branch')
    op.drop_column('tasks', 'completed_via')
    op.drop_column('tasks', 'completion_proof')
    op.drop_column('tasks', 'github_commit_sha')