"""Initial schema

Revision ID: 8f9438b1d005
Revises: 
Create Date: 2026-05-08 10:51:43.140031

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8f9438b1d005'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # --- Users ---
    op.create_table('users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('sub', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_sub'), 'users', ['sub'], unique=True)

    # --- Documents ---
    op.create_table('documents',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('file_type', sa.String(), nullable=False),
        sa.Column('total_pages', sa.Integer(), nullable=False),
        sa.Column('upload_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('tags', sa.JSON(), nullable=False),
        sa.Column('chunk_counts', sa.JSON(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.sub'], name='fk_document_user_sub')
    )
    op.create_index(op.f('ix_documents_user_id'), 'documents', ['user_id'], unique=False)

    # --- Queries ---
    op.create_table('queries',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('original_query', sa.Text(), nullable=False),
        sa.Column('query_type', sa.String(), nullable=True),
        sa.Column('routing_confidence', sa.Float(), nullable=True),
        sa.Column('strategy_used', sa.String(), nullable=True),
        sa.Column('final_answer', sa.Text(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('confidence_level', sa.String(), nullable=True),
        sa.Column('source_label', sa.String(), nullable=True),
        sa.Column('fallback_level', sa.Integer(), nullable=False),
        sa.Column('hallucination_score', sa.Float(), nullable=True),
        sa.Column('iterations_count', sa.Integer(), nullable=False),
        sa.Column('total_latency_ms', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.sub'], name='fk_query_user_sub')
    )
    op.create_index(op.f('ix_queries_user_id'), 'queries', ['user_id'], unique=False)

    # --- Claims ---
    op.create_table('claims',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('query_id', sa.String(), nullable=False),
        sa.Column('claim_text', sa.Text(), nullable=False),
        sa.Column('verification_status', sa.String(), nullable=False),
        sa.Column('supporting_chunk_id', sa.String(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['query_id'], ['queries.id'], ondelete='CASCADE')
    )

    # --- Decision Trace ---
    op.create_table('decision_trace',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('query_id', sa.String(), nullable=False),
        sa.Column('step_name', sa.String(), nullable=False),
        sa.Column('decision', sa.String(), nullable=False),
        sa.Column('reasoning', sa.Text(), nullable=False),
        sa.Column('input_summary', sa.JSON(), nullable=True),
        sa.Column('output_summary', sa.JSON(), nullable=True),
        sa.Column('time_taken_ms', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('alternatives_considered', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['query_id'], ['queries.id'], ondelete='CASCADE')
    )

    # --- Iterations ---
    op.create_table('iterations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('query_id', sa.String(), nullable=False),
        sa.Column('iteration_number', sa.Integer(), nullable=False),
        sa.Column('query_used', sa.Text(), nullable=False),
        sa.Column('answer_generated', sa.Text(), nullable=False),
        sa.Column('hallucination_score', sa.Float(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('changes_made', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['query_id'], ['queries.id'], ondelete='CASCADE')
    )

    # --- Evaluation Results ---
    op.create_table('evaluation_results',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('job_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('dataset_path', sa.String(), nullable=False),
        sa.Column('total_questions', sa.Integer(), nullable=False),
        sa.Column('pass_rate', sa.Float(), nullable=False),
        sa.Column('agentic_faithfulness', sa.Float(), nullable=False),
        sa.Column('agentic_relevancy', sa.Float(), nullable=False),
        sa.Column('agentic_accuracy', sa.Float(), nullable=False),
        sa.Column('agentic_hallucination', sa.Float(), nullable=False),
        sa.Column('simple_faithfulness', sa.Float(), nullable=False),
        sa.Column('simple_relevancy', sa.Float(), nullable=False),
        sa.Column('simple_accuracy', sa.Float(), nullable=False),
        sa.Column('simple_hallucination', sa.Float(), nullable=False),
        sa.Column('overall_improvement', sa.Float(), nullable=False),
        sa.Column('hallucination_reduction', sa.Float(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('per_question_results', sa.JSON(), nullable=False),
        sa.Column('evaluated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id')
    )
    op.create_index(op.f('ix_evaluation_results_user_id'), 'evaluation_results', ['user_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_evaluation_results_user_id'), table_name='evaluation_results')
    op.drop_table('evaluation_results')
    op.drop_table('iterations')
    op.drop_table('decision_trace')
    op.drop_table('claims')
    op.drop_index(op.f('ix_queries_user_id'), table_name='queries')
    op.drop_table('queries')
    op.drop_index(op.f('ix_documents_user_id'), table_name='documents')
    op.drop_table('documents')
    op.drop_index(op.f('ix_users_sub'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
