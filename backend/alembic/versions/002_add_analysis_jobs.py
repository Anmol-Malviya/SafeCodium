"""002_add_analysis_jobs — Migration for Autonomous Analysis Jobs

Revision ID: 002_add_analysis_jobs
Revises: 001_initial_schema
Create Date: 2026-11-01 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_add_analysis_jobs'
down_revision: Union[str, Sequence[str], None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'analysis_jobs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('current_stage', sa.String(length=64), nullable=False, server_default='queued'),
        sa.Column('progress_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stages_data', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('summary_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name='fk_analysis_jobs_project_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_analysis_jobs'),
    )
    op.create_index('ix_analysis_jobs_project_id', 'analysis_jobs', ['project_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_analysis_jobs_project_id', table_name='analysis_jobs')
    op.drop_table('analysis_jobs')
