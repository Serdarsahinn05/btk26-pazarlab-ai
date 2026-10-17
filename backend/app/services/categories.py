"""Category catalog (Faz 13a): 12 families + "diger", each with subtypes, all from data/category_rules.json.

A category id is either a family id ("giyim", "ayakkabi") or a subtype id ("tisort", "airfryer").
A subtype inherits its family's rule and overrides only what it lists (at least label, keywords, price).
The 13 ids of the old flat list are still valid and keep their old values.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from app.utils.text_utils import fold_text

DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "category_rules.json"

OTHER = "diger"
BASE_QUALITY = 0.45


@lru_cache(maxsize=1)
def load_category_rules() -> dict[str, Any]:
    with DATA_FILE.open(encoding="utf-8") as file:
        return json.load(file)


@lru_cache(maxsize=1)
def _catalog() -> dict[str, dict[str, Any]]:
    data = load_category_rules()
    rules: dict[str, dict[str, Any]] = {}
    for fid, fam in data["families"].items():
        rules[fid] = {**fam, "id": fid, "family": fid, "familyLabel": fam["label"], "subtype": None}
    for cid, cat in data["categories"].items():
        fam = data["families"][cat["family"]]
        rules[cid] = {**fam, **cat, "id": cid, "familyLabel": fam["label"], "subtype": cid}
    for rule in rules.values():
        rule["terms"] = sorted({fold_text(t) for t in rule.get("terms", [])})
    return rules


def is_known(category: str) -> bool:
    return category in _catalog()


def validate_category(value: Any) -> str:
    """Pydantic validator: any family or subtype id."""
    category = str(value or "").strip()
    if not is_known(category):
        raise ValueError(f"Bilinmeyen kategori: {category!r}")
    return category


def rule_for(category: str) -> dict[str, Any]:
    """Merged rule of a category; unknown ids get the "diger" rule."""
    catalog = _catalog()
    return catalog.get(category) or catalog[OTHER]


def all_ids() -> list[str]:
    return list(_catalog())


def family_of(category: str) -> str:
    return rule_for(category)["family"]


def has_trait(category: str, trait: str) -> bool:
    return trait in rule_for(category).get("traits", [])


def is_seasonal(category: str) -> bool:
    rule = rule_for(category)
    return "seasonal" in rule.get("traits", []) or bool(rule.get("seasonPeak"))


def label(category: str) -> str:
    """'Giyim / Tişört' for subtypes, 'Giyim' for a family."""
    rule = rule_for(category)
    return rule["familyLabel"] if rule["subtype"] is None else f"{rule['familyLabel']} / {rule['label']}"


def reference_price(category: str, market_price: Optional[float], price: float) -> float:
    """What a typical product of this kind costs: seller's own market price, else the category average, else the price itself."""
    if market_price:
        return float(market_price)
    average = rule_for(category).get("averagePrice")
    return float(average) if average else float(price)


def anchored(request: Any, base: Any = None) -> Any:
    """Fix the reference price before trying other prices of the same product (price sweep, -10 %, A/B).

    Without this, a "diger" product with no market price would compare every tried price with itself."""
    if request.market_price:
        return request
    source = base or request
    return request.model_copy(update={"market_price": reference_price(source.category, source.market_price, source.price)})


def quality_score(category: str, features: dict[str, Any]) -> float:
    """Base 0.45 + the weight of every filled quality field group (camelCase keys), in data order."""
    score = BASE_QUALITY
    for fields, weight in rule_for(category).get("qualityFields", []):
        score += weight if any(features.get(name) for name in fields) else 0
    return score


# ------------------------------------------------------------------ detection

@lru_cache(maxsize=1)
def _keyword_index() -> list[tuple[str, str]]:
    """(folded keyword, category id), subtypes and families together."""
    return [(fold_text(keyword), cid) for cid, rule in _catalog().items() for keyword in rule.get("keywords", [])]


def _matches(text: str) -> list[tuple[int, int, str]]:
    """(end of the word the keyword sits in, keyword length, category) for every keyword found in text."""
    found = []
    for keyword, cid in _keyword_index():
        # Short keywords need word boundaries ("bot" must not match "robot"); longer ones may sit inside a word ("çantası").
        pattern = rf"\b{re.escape(keyword)}\b" if len(keyword) <= 4 else re.escape(keyword)
        for match in re.finditer(pattern, text):
            word_end = re.search(r"\W|$", text[match.end():])
            found.append((match.end() + (word_end.start() if word_end else 0), len(keyword), cid))
    return found


def detect_from_text(text: Optional[str]) -> Optional[str]:
    """Category named in a free text. Turkish compounds put the head noun last ("laptop çantası", "iPhone kılıfı"),
    so the match that ends last wins; at the same place the longer keyword wins ("akıllı bileklik" over "bileklik")."""
    matches = _matches(fold_text(text or ""))
    return max(matches)[2] if matches else None


def detect(breadcrumb: Optional[list[str]] = None, raw_category: Optional[str] = None, title: Optional[str] = None) -> dict[str, str]:
    """Best category for a scraped product, with how sure we are.

    Order: the page's own category path (most specific crumb first) → its category text → the title → "diger".
    """
    crumbs = [c for c in (breadcrumb or []) if c]
    if raw_category:
        crumbs += [part for part in re.split(r"\s*[>/|›»]\s*", raw_category) if part]
    from_title = detect_from_text(title)
    for crumb in reversed(crumbs):
        found = detect_from_text(crumb)
        if found:
            # The path often stops at the family ("Giyim"); the title may name the subtype ("… Gömlek").
            if rule_for(found)["subtype"] is None and from_title and family_of(from_title) == found:
                found = from_title
            return {"category": found, "confidence": "high", "source": "breadcrumb"}
    found = from_title
    if found:
        return {"category": found, "confidence": "medium", "source": "title"}
    return {"category": OTHER, "confidence": "low", "source": "none"}
