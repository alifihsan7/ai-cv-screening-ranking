"""Domain models and enum types for CV Screening."""

from __future__ import annotations

from datetime import UTC, date, datetime
from enum import Enum
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator, model_validator

# ---------------------------------------------------------------------------
# Authentication & User Management Models
# ---------------------------------------------------------------------------


class UserRole(str, Enum):
    ADMIN = "admin"
    RECRUITER = "recruiter"
    HIRING_MANAGER = "hiring_manager"


class User(BaseModel):
    id: UUID
    tenant_id: UUID
    email: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class UserInDB(User):
    password_hash: str


class TokenData(BaseModel):
    user_id: str
    tenant_id: str
    email: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


class HealthResponse(BaseModel):
    status: str
    app_env: str
    database: str
    pgvector_version: str | None
    active_services: list[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ---------------------------------------------------------------------------
# Job Management Models
# ---------------------------------------------------------------------------


class JobCreate(BaseModel):
    title: str
    jd_text: str
    location: str | None = None
    employment_type: str | None = None
    external_ref: str | None = None


class JobUpdate(BaseModel):
    title: str | None = None
    location: str | None = None
    employment_type: str | None = None
    status: str | None = None


class JobResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    title: str
    status: str
    location: str | None = None
    employment_type: str | None = None
    external_ref: str | None = None
    jd_text: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    cv_count: int = 0


# ---------------------------------------------------------------------------
# Core Evaluation Enums & Domain Types
# ---------------------------------------------------------------------------


class EvaluationStatus(str, Enum):
    """Closed qualification state. Must include UNKNOWN for non-penalizing missing data."""

    STRONG = "STRONG"
    PARTIAL = "PARTIAL"
    NOT_DEMONSTRATED = "NOT_DEMONSTRATED"
    UNKNOWN = "UNKNOWN"


class EvaluationMethod(str, Enum):
    """Provenance tracking for how a criterion was evaluated."""

    DETERMINISTIC_RULE = "DETERMINISTIC_RULE"
    HYBRID_SEMANTIC = "HYBRID_SEMANTIC"
    JEV_TYPESAFE = "JEV_TYPESAFE"
    LLM_VERIFIED = "LLM_VERIFIED"
    HUMAN_OVERRIDE = "HUMAN_OVERRIDE"


class CriterionKind(str, Enum):
    """Taxonomy category for requirement kind."""

    EXPERIENCE_DURATION = "EXPERIENCE_DURATION"
    RESPONSIBILITY = "RESPONSIBILITY"
    SKILL = "SKILL"
    EDUCATION = "EDUCATION"
    CERTIFICATION = "CERTIFICATION"
    ACHIEVEMENT = "ACHIEVEMENT"


class CriterionImportance(str, Enum):
    """Scoring weight classification."""

    MUST_HAVE = "MUST_HAVE"
    STRONG_PREFERENCE = "STRONG_PREFERENCE"
    NICE_TO_HAVE = "NICE_TO_HAVE"


class CriterionCategory(str, Enum):
    """Scoring rubric category partition."""

    EXPERIENCE = "EXPERIENCE"
    HARD_SKILLS = "HARD_SKILLS"
    EDUCATION_CERT = "EDUCATION_CERT"
    ACHIEVEMENT = "ACHIEVEMENT"


class AgentPhase(str, Enum):
    """Autonomous screening state machine phase."""

    INIT = "INIT"
    PARSING = "PARSING"
    EVALUATING = "EVALUATING"
    CRITIQUE_REFLECT = "CRITIQUE_REFLECT"
    SCORING = "SCORING"
    COMPLETED = "COMPLETED"


class ContextSectionType(str, Enum):
    """Semantic section source within CV for quote provenance."""

    WORK_EXPERIENCE = "WORK_EXPERIENCE"
    PROJECT = "PROJECT"
    EDUCATION = "EDUCATION"
    SKILL_LIST = "SKILL_LIST"
    UNKNOWN = "UNKNOWN"


# ---------------------------------------------------------------------------
# Temporal Date Interval & Arithmetic
# ---------------------------------------------------------------------------


def compute_calendar_duration_months(
    start_str: str,
    end_str: str | None = None,
    is_current: bool = False,
    as_of: date | None = None,
) -> int:
    """Calculates inclusive duration in full calendar months between two dates.

    Supports 'YYYY' or 'YYYY-MM' (with real calendar months 01-12).
    If is_current is True or end_str is None, duration extends to as_of (default today UTC).
    Aritmatika: (end_year - start_year) * 12 + (end_month - start_month) + 1.
    """
    if as_of is None:
        as_of = datetime.now(UTC).date()

    # Parse start year and month
    if "-" in start_str:
        sy_str, sm_str = start_str.split("-", 1)
        start_year, start_month = int(sy_str), int(sm_str)
    else:
        start_year, start_month = int(start_str), 1

    # Parse end year and month
    if is_current or end_str is None:
        end_year, end_month = as_of.year, as_of.month
    elif "-" in end_str:
        ey_str, em_str = end_str.split("-", 1)
        end_year, end_month = int(ey_str), int(em_str)
    else:
        end_year, end_month = int(end_str), 12

    months = (end_year - start_year) * 12 + (end_month - start_month) + 1
    return max(0, months)


class DateInterval(BaseModel):
    """Validated calendar date interval with real calendar month arithmetic (01-12)."""

    start_date: str = Field(
        pattern=r"^\d{4}(?:-(0[1-9]|1[0-2]))?$",
        description="Normalized YYYY or YYYY-MM with real calendar month (01-12)",
    )
    end_date: str | None = Field(
        default=None,
        pattern=r"^\d{4}(?:-(0[1-9]|1[0-2]))?$",
        description="Normalized YYYY or YYYY-MM with real calendar month, or None for current/present",
    )
    duration_months: int = Field(default=0, ge=0)
    is_current: bool = False

    @model_validator(mode="after")
    def validate_and_compute_duration(self) -> Self:
        # Check start vs end chronologic order when end_date is present
        if self.end_date is not None and not self.is_current:
            sy = int(self.start_date.split("-")[0])
            sm = int(self.start_date.split("-")[1]) if "-" in self.start_date else 1
            ey = int(self.end_date.split("-")[0])
            em = int(self.end_date.split("-")[1]) if "-" in self.end_date else 12

            if (ey < sy) or (ey == sy and em < sm):
                raise ValueError(
                    f"end_date ({self.end_date}) must be greater than or equal to start_date ({self.start_date})"
                )

        computed = compute_calendar_duration_months(
            self.start_date,
            self.end_date,
            is_current=self.is_current,
        )
        if self.duration_months == 0:
            self.duration_months = computed
        return self


# ---------------------------------------------------------------------------
# Verbatim Grounding & Evidence Citations
# ---------------------------------------------------------------------------


class EvidenceCitation(BaseModel):
    """Verbatim quote citation grounded in raw text with explicit character bounds."""

    criterion_id: str
    verbatim_quote: str = Field(min_length=5, description="Exact verbatim substring from CV raw text")
    char_start: int = Field(ge=0, description="0-indexed canonical text start offset")
    char_end: int = Field(ge=0, description="0-indexed canonical text end offset")
    source_section: str = Field(default="UNKNOWN", description="e.g., Work Experience, Education, Projects")
    context_type: ContextSectionType = Field(default=ContextSectionType.UNKNOWN)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    is_grounded: bool = True

    @field_validator("char_end")
    @classmethod
    def validate_bounds(cls, v: int, info: ValidationInfo) -> int:
        if info.data and "char_start" in info.data:
            char_start = info.data["char_start"]
            if char_start is not None and v <= char_start:
                raise ValueError("char_end must be strictly greater than char_start")
        return v

    @model_validator(mode="after")
    def validate_quote_substance(self) -> Self:
        clean = " ".join(self.verbatim_quote.split())
        if len(clean) < 5:
            raise ValueError("verbatim_quote must contain at least 5 non-whitespace characters")
        return self


# ---------------------------------------------------------------------------
# Strongly-Typed Metrics & Criterion Parameters (Eliminating dict[str, Any])
# ---------------------------------------------------------------------------


class EvaluationMetrics(BaseModel):
    """Concrete strongly-typed metrics record eliminating unstructured dicts."""

    model_config = ConfigDict(extra="forbid")

    backend_months: float | None = None
    total_months: float | None = None
    years_experience: float | None = None
    matched_count: int | None = None
    total_required: int | None = None
    similarity_score: float | None = None
    coverage_ratio: float | None = None
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    degree_level: str | None = None
    field_of_study: str | None = None
    achievement_count: int | None = None
    extra_metric: float | None = None


class CriterionParams(BaseModel):
    """Strongly-typed parameters for criterion validation, replacing unstructured dicts."""

    model_config = ConfigDict(extra="forbid")

    min_months: int | None = None
    min_years: float | None = None
    required_degree: str | None = None
    required_fields: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    min_match_count: int | None = None
    target_role: str | None = None


# ---------------------------------------------------------------------------
# Strongly-Typed Agent Action Inputs (Discriminated Union)
# ---------------------------------------------------------------------------


class RetrievalActionInput(BaseModel):
    action_type: Literal["HYBRID_RETRIEVAL"] = "HYBRID_RETRIEVAL"
    query: str
    top_k: int = 5
    candidate_id: str | None = None
    criterion_id: str | None = None


class TaxonomyActionInput(BaseModel):
    action_type: Literal["TAXONOMY_REFLECTOR"] = "TAXONOMY_REFLECTOR"
    concept_id: str
    expansion_depth: int = 1


class VerifierActionInput(BaseModel):
    action_type: Literal["GROUNDED_VERIFIER"] = "GROUNDED_VERIFIER"
    criterion_id: str
    context_snippets: list[str] = Field(default_factory=list)
    provider: Literal["JEV_TYPESAFE", "LLM_VERIFIED"] = "JEV_TYPESAFE"


class ParserActionInput(BaseModel):
    action_type: Literal["DOCLING_PARSER"] = "DOCLING_PARSER"
    document_id: str


class GeneralActionInput(BaseModel):
    action_type: Literal["GENERAL"] = "GENERAL"
    criterion_id: str | None = None
    note: str | None = None
    parameters: list[str] = Field(default_factory=list)


ActionInput = Annotated[
    RetrievalActionInput | TaxonomyActionInput | VerifierActionInput | ParserActionInput | GeneralActionInput,
    Field(discriminator="action_type"),
]


# ---------------------------------------------------------------------------
# Evaluation Results & Autonomous Agent State
# ---------------------------------------------------------------------------


class EvaluationResult(BaseModel):
    """Complete evaluation outcome for a single criterion with provenance and citations."""

    criterion_id: str
    state: EvaluationStatus
    confidence: float = Field(ge=0.0, le=1.0)
    metrics: EvaluationMetrics = Field(default_factory=EvaluationMetrics)
    evidences: list[EvidenceCitation] = Field(default_factory=list)
    flags: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    evaluation_method: EvaluationMethod = EvaluationMethod.DETERMINISTIC_RULE


class ReasoningStep(BaseModel):
    """Immutable audit trail step for autonomous agent reasoning."""

    step_number: int
    timestamp_utc: datetime = Field(default_factory=lambda: datetime.now(UTC))
    thought: str = Field(description="Agent internal hypothesis and gap analysis")
    action: str = Field(description="Invoked tool name or state branch")
    action_input: ActionInput = Field(default_factory=GeneralActionInput)
    observation: str = Field(description="Sanitized tool execution observation")
    state_mutation: str = Field(description="Criterion ID or profile field mutated")


class ScreeningAgentState(BaseModel):
    """Stateful runtime representation of autonomous candidate screening trajectory."""

    session_id: str
    job_id: str
    candidate_id: str
    current_phase: AgentPhase = AgentPhase.INIT
    evaluation_results: dict[str, EvaluationResult] = Field(default_factory=dict)
    reasoning_trajectory: list[ReasoningStep] = Field(default_factory=list)
    reflection_budget_spent: int = 0
    max_reflection_budget: int = 3
    is_terminal: bool = False


# ---------------------------------------------------------------------------
# Candidate Profile Domain Models
# ---------------------------------------------------------------------------


class WorkExperience(BaseModel):
    company: str
    role: str
    date_interval: DateInterval | None = None
    start_date: str | None = None
    end_date: str | None = None
    duration_months: int = 0
    is_current: bool = False
    responsibilities: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)


class Education(BaseModel):
    institution: str
    degree: str
    field_of_study: str | None = None
    graduation_year: int | None = None
    start_date: str | None = None
    end_date: str | None = None


class Certification(BaseModel):
    name: str
    issuer: str | None = None
    issue_year: int | None = None
    credential_id: str | None = None


class CandidateProfileDomain(BaseModel):
    candidate_id: str
    headline: str | None = None
    summary: str | None = None
    experiences: list[WorkExperience] = Field(default_factory=list)
    educations: list[Education] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    skills_demonstrated: list[str] = Field(default_factory=list)
    raw_redacted_text: str = ""
    canonical_text: str = ""
