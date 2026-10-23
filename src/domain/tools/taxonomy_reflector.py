"""Taxonomy graph reflection and concept expansion tool."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from src.domain.models import ActionInput, TaxonomyActionInput
from src.domain.taxonomy import get_taxonomy
from src.domain.tools.base import BaseTool, agent_tool


class TaxonomyReflectorOutput(BaseModel):
    concept_id: str
    canonical_name: str
    synonyms: list[str] = Field(default_factory=list)
    parents: list[str] = Field(default_factory=list)
    children: list[str] = Field(default_factory=list)
    related: list[str] = Field(default_factory=list)
    category: str | None = None


@agent_tool(action_type="TAXONOMY_REFLECTOR")
class TaxonomyReflectorTool(BaseTool):
    """Tool that queries the taxonomy ontology to expand concepts and discover synonyms."""

    name: str = "taxonomy_reflector"
    action_type: str = "TAXONOMY_REFLECTOR"

    async def run(
        self,
        action_input: ActionInput,
        context: dict[str, Any] | None = None,
    ) -> TaxonomyReflectorOutput:
        if not isinstance(action_input, TaxonomyActionInput):
            raise TypeError(f"Expected TaxonomyActionInput, got {type(action_input)}")

        concept_id = action_input.concept_id.strip()

        tax = get_taxonomy()
        cid_lower = concept_id.lower()

        # 1. Direct match on skills dictionary
        if cid_lower in tax.skills:
            sk = tax.skills[cid_lower]
            children = [k for k, v in tax.skills.items() if (v.broader or "").lower() == cid_lower]
            parents = [sk.broader] if sk.broader else []
            return TaxonomyReflectorOutput(
                concept_id=concept_id,
                canonical_name=sk.label,
                synonyms=list(sk.aliases),
                parents=parents,
                children=children,
                related=list(sk.related),
                category=sk.category,
            )

        # 2. Check skill labels and aliases
        for k, v in tax.skills.items():
            if v.label.lower() == cid_lower or any(a.lower() == cid_lower for a in v.aliases):
                children = [c for c, child_v in tax.skills.items() if (child_v.broader or "").lower() == k]
                parents = [v.broader] if v.broader else []
                return TaxonomyReflectorOutput(
                    concept_id=k,
                    canonical_name=v.label,
                    synonyms=list(v.aliases),
                    parents=parents,
                    children=children,
                    related=list(v.related),
                    category=v.category,
                )

        # 3. Check role families
        if cid_lower in tax.role_families:
            rf = tax.role_families[cid_lower]
            return TaxonomyReflectorOutput(
                concept_id=concept_id,
                canonical_name=concept_id,
                synonyms=list(rf.titles),
                parents=[],
                children=[],
                related=list(rf.related),
                category="ROLE_FAMILY",
            )

        for rf_name, rf_entry in tax.role_families.items():
            if any(t.lower() == cid_lower for t in rf_entry.titles):
                return TaxonomyReflectorOutput(
                    concept_id=rf_name,
                    canonical_name=rf_name,
                    synonyms=list(rf_entry.titles),
                    parents=[],
                    children=[],
                    related=list(rf_entry.related),
                    category="ROLE_FAMILY",
                )

        # 4. Check certifications
        for cert_name, terms in tax.certifications.items():
            if cert_name.lower() == cid_lower or any(t.lower() == cid_lower for t in terms):
                return TaxonomyReflectorOutput(
                    concept_id=cert_name,
                    canonical_name=cert_name,
                    synonyms=list(terms),
                    parents=[],
                    children=[],
                    related=[],
                    category="CERTIFICATION",
                )

        # 5. Fallback for concepts not explicitly mapped
        return TaxonomyReflectorOutput(
            concept_id=concept_id,
            canonical_name=concept_id,
            synonyms=[concept_id],
            parents=[],
            children=[],
            related=[],
            category=None,
        )
