"""Category ids and the groups that share scoring and copy rules.

Rules live in data/category_rules.json; these sets only say which code path a category takes.
"""

from typing import Literal

Category = Literal[
    "tisort", "pantolon", "mont", "elbise", "etek",
    "telefon", "laptop", "kulaklik", "tablet", "akilli_saat",
    "ayakkabi", "canta", "kozmetik",
]

CLOTHING = frozenset({"tisort", "pantolon", "mont", "elbise", "etek"})
TECH = frozenset({"telefon", "laptop", "kulaklik", "tablet", "akilli_saat"})
# Shoes and bags: sold on style and fit like clothing, but no fabric/collar/sleeve fields.
FASHION_ACCESSORIES = frozenset({"ayakkabi", "canta"})
FASHION = CLOTHING | FASHION_ACCESSORIES
BEAUTY = frozenset({"kozmetik"})
# Demand moves with the season (shoes: boots vs sandals). Bags and cosmetics are scored as season-neutral.
SEASONAL = CLOTHING | {"ayakkabi"}
