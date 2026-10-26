"""jev_calls telemetry table for Mode 3 TypeSafe Jev System One

Revision ID: 0011_jev_calls
Revises: 0010_reasoning_trajectory
Create Date: 2026-10-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0011_jev_calls"
down_revision: Union[str, Sequence[str], None] = "0010_reasoning_trajectory"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS jev_calls (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            run_id UUID,
            candidate_id TEXT,
            criterion_id TEXT NOT NULL,
            primitive_type TEXT NOT NULL CHECK (primitive_type IN ('NOUL', 'SCORE', 'CHOICE')),
            model TEXT NOT NULL DEFAULT 'jev-latest',
            latency_ms DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            input_tokens INT NOT NULL DEFAULT 0,
            output_tokens INT NOT NULL DEFAULT 0,
            decision_value TEXT,
            confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
            grounding_valid BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_jev_calls_run_id ON jev_calls(run_id);
        CREATE INDEX IF NOT EXISTS idx_jev_calls_candidate_id ON jev_calls(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_jev_calls_criterion_id ON jev_calls(criterion_id);
        CREATE INDEX IF NOT EXISTS idx_jev_calls_created_at ON jev_calls(created_at);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS jev_calls CASCADE;
        """
    )
