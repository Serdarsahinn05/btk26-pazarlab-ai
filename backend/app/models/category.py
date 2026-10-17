"""Category id type: any family or subtype id in data/category_rules.json (see services/categories.py)."""

from typing import Annotated

from pydantic import AfterValidator

from app.services.categories import validate_category

Category = Annotated[str, AfterValidator(validate_category)]
