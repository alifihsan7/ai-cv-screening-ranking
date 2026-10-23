"""candidate_scores_reasoning_trajectory

Revision ID: 0010_candidate_scores_reasoning_trajectory
Revises: 0009_requirements_embedding
Create Date: 2026-10-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0010_reasoning_trajectory"
down_revision: Union[str, Sequence[str], None] = "0009_requirements_embedding"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE candidate_scores
        ADD COLUMN IF NOT EXISTS reasoning_trajectory JSONB NOT NULL DEFAULT '[]'::jsonb;

        ALTER TABLE requirement_scores DROP CONSTRAINT IF EXISTS requirement_scores_method_check;
        ALTER TABLE requirement_scores ADD CONSTRAINT requirement_scores_method_check CHECK (method IN ('rule', 'verifier', 'manual', 'react_agent'));
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE requirement_scores DROP CONSTRAINT IF EXISTS requirement_scores_method_check;
        ALTER TABLE requirement_scores ADD CONSTRAINT requirement_scores_method_check CHECK (method IN ('rule', 'verifier', 'manual'));

        ALTER TABLE candidate_scores DROP COLUMN IF EXISTS reasoning_trajectory;
        """
    )
