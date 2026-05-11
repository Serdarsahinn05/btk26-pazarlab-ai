import hashlib
import json
from typing import Mapping


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def clamp_score(value: float) -> int:
    return int(round(clamp(value, 0, 100)))


def normalize_weights(weights: Mapping[str, float]) -> dict[str, float]:
    total = sum(max(value, 0.0) for value in weights.values())
    if total <= 0:
        return dict(weights)
    return {key: max(value, 0.0) / total for key, value in weights.items()}


def stable_seed(payload: object, salt: str) -> int:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=True, default=str)
    digest = hashlib.sha256(f"{salt}:{raw}".encode("utf-8")).hexdigest()
    return int(digest[:16], 16)
