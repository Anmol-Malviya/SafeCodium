"""001_initial_schema — Complete SafeCodium Schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-31 23:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('username', sa.String(length=128), nullable=False),
        sa.Column('hashed_password', sa.String(length=256), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False, server_default='analyst'),
        sa.Column('api_key', sa.String(length=128), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id', name='pk_users'),
    )
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_api_key', 'users', ['api_key'], unique=True)

    # 2. projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('framework_type', sa.String(length=64), nullable=False, server_default='generic_c'),
        sa.Column('source_type', sa.String(length=32), nullable=False, server_default='zip'),
        sa.Column('original_path', sa.String(length=512), nullable=False),
        sa.Column('shadow_path', sa.String(length=512), nullable=True),
        sa.Column('file_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('owner_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name='fk_projects_owner_id_users', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name='pk_projects'),
    )
    op.create_index('ix_projects_owner_id', 'projects', ['owner_id'], unique=False)

    # 3. scans table
    op.create_table(
        'scans',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('scanner_type', sa.String(length=64), nullable=False, server_default='composite'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('findings_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('raw_output', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name='fk_scans_project_id_projects', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_scans'),
    )
    op.create_index('ix_scans_project_id', 'scans', ['project_id'], unique=False)

    # 4. vulnerabilities table
    op.create_table(
        'vulnerabilities',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('scan_id', sa.String(length=36), nullable=True),
        sa.Column('cwe_id', sa.String(length=32), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('severity', sa.String(length=32), nullable=False, server_default='HIGH'),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('line_start', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('line_end', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('function_name', sa.String(length=128), nullable=True),
        sa.Column('vulnerable_code', sa.Text(), nullable=False),
        sa.Column('scanner_source', sa.String(length=64), nullable=False, server_default='semgrep'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='detected'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name='fk_vulnerabilities_project_id_projects', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], name='fk_vulnerabilities_scan_id_scans', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_vulnerabilities'),
    )
    op.create_index('ix_vulnerabilities_project_id', 'vulnerabilities', ['project_id'], unique=False)
    op.create_index('ix_vulnerabilities_scan_id', 'vulnerabilities', ['scan_id'], unique=False)

    # 5. patches table
    op.create_table(
        'patches',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('vulnerability_id', sa.String(length=36), nullable=False),
        sa.Column('ai_provider', sa.String(length=64), nullable=False, server_default='gemini'),
        sa.Column('model_name', sa.String(length=64), nullable=False, server_default='gemini-2.5-flash'),
        sa.Column('unified_diff', sa.Text(), nullable=False),
        sa.Column('root_cause_explanation', sa.Text(), nullable=False),
        sa.Column('repair_strategy', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='proposed'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['vulnerability_id'], ['vulnerabilities.id'], name='fk_patches_vulnerability_id_vulnerabilities', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_patches'),
    )
    op.create_index('ix_patches_vulnerability_id', 'patches', ['vulnerability_id'], unique=False)

    # 6. verifications table
    op.create_table(
        'verifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('patch_id', sa.String(length=36), nullable=False),
        sa.Column('pre_patch_compiler_exit', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('post_patch_compiler_exit', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('asan_exit_code', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('asan_output', sa.Text(), nullable=True),
        sa.Column('ubsan_exit_code', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ubsan_output', sa.Text(), nullable=True),
        sa.Column('test_suite_passed', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('test_results_json', sa.JSON(), nullable=True),
        sa.Column('binary_size_delta_bytes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('final_status', sa.String(length=32), nullable=False, server_default='INCONCLUSIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['patch_id'], ['patches.id'], name='fk_verifications_patch_id_patches', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_verifications'),
    )
    op.create_index('ix_verifications_patch_id', 'verifications', ['patch_id'], unique=False)


def downgrade() -> None:
    op.drop_table('verifications')
    op.drop_table('patches')
    op.drop_table('vulnerabilities')
    op.drop_table('scans')
    op.drop_table('projects')
    op.drop_table('users')

