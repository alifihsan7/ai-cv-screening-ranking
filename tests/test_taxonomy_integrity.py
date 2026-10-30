"""The taxonomy must not point at things that do not exist (a dangling reference silently does nothing)."""

from src.domain.taxonomy import get_taxonomy


def test_every_related_role_family_exists():
    tax = get_taxonomy()
    families = set(tax.role_families)
    dangling = {name: [r for r in entry.related if r not in families] for name, entry in tax.role_families.items()}
    assert {k: v for k, v in dangling.items() if v} == {}


def test_every_role_family_has_at_least_one_title():
    tax = get_taxonomy()
    assert [name for name, entry in tax.role_families.items() if not entry.titles] == []
