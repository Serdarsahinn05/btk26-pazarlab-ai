import copy
import typing

import pytest

from app.models.category import CLOTHING, FASHION, SEASONAL, TECH, BEAUTY, Category
from app.models.product import SimulationRequest
from app.services.input_analysis_service import CATEGORY_TERMS, IMPORTANT_FIELDS, deterministic_analysis
from app.services.normalization_service import get_normalized_weights, load_category_rules, normalize_product
from app.services.product_link_service import ProductLinkReader
from app.utils.text_utils import fold_text

ALL = set(typing.get_args(Category))

NEW_PRODUCTS = {
    "ayakkabi": {
        "productName": "Deri Günlük Sneaker",
        "description": "Hakiki deri saya, kauçuk taban, ortopedik iç taban; 36-45 numara, günlük kullanım için hafif sneaker.",
        "features": {"material": "hakiki deri", "soleMaterial": "kauçuk", "sizeRange": "36-45", "season": "all"},
        "price": 1600,
    },
    "canta": {
        "productName": "Su Geçirmez Laptop Sırt Çantası",
        "description": "15.6 inç laptop bölmesi, su geçirmez kumaş, üç bölme ve yastıklı omuz askısı olan günlük sırt çantası.",
        "features": {"material": "polyester", "dimensions": "45x30x15 cm", "compartments": "3", "strapType": "sirt", "waterproof": True},
        "price": 850,
    },
    "kozmetik": {
        "productName": "Hyaluronik Asitli Nemlendirici Krem",
        "description": "Hyaluronik asit ve seramid içeren, kuru ve karma cilt için 50 ml nemlendirici; dermatolojik olarak test edildi.",
        "features": {"brand": "Derma", "skinType": "kuru", "ingredients": "hyaluronik asit, seramid", "volume": "50 ml",
                     "certifications": "dermatolojik test, vegan"},
        "price": 420,
    },
}


def _request(payload, **overrides):
    data = copy.deepcopy(payload)
    data.update(overrides)
    return SimulationRequest.model_validate(data)


def test_every_category_has_rules_terms_and_fields():
    rules = load_category_rules()
    assert set(rules["categories"]) == ALL
    assert set(rules["meta"]["categories"]) == ALL
    assert set(CATEGORY_TERMS) == ALL and set(IMPORTANT_FIELDS) == ALL
    assert CLOTHING | TECH | FASHION | BEAUTY == ALL and SEASONAL <= ALL


@pytest.mark.parametrize("category", sorted(ALL))
def test_weights_are_normalized_for_every_motivation(category):
    for motivation in load_category_rules()["meta"]["motivations"]:
        weights = get_normalized_weights(category, motivation)
        assert abs(sum(weights.values()) - 1) < 1e-6


@pytest.mark.parametrize("category", sorted(NEW_PRODUCTS))
def test_new_categories_simulate_end_to_end(client, payload, category):
    body = {**payload, "category": category, **NEW_PRODUCTS[category]}
    res = client.post("/api/simulate", json=body)
    assert res.status_code == 200, res.text
    data = res.json()
    assert 0 <= data["overallScore"] <= 100 and data["simulatedConsumers"] == 500
    # The product matches its category, so no mismatch warning.
    assert data["inputAnalysis"]["signals"]["categoryFit"] >= 0.6
    assert data["inputAnalysis"]["suspectedCategory"] is None


def test_new_fields_raise_quality(payload):
    base = {**payload, "category": "kozmetik", **NEW_PRODUCTS["kozmetik"]}
    bare = {**base, "features": {"brand": "Derma"}}
    assert normalize_product(_request(base)).quality_score > normalize_product(_request(bare)).quality_score


def test_turkish_characters_score_like_ascii(payload):
    """B17: keyword lists are ASCII, user text is Turkish; both must give the same category fit."""
    turkish = {**payload, "productName": "Basic Pamuklu Tişört",
               "description": "Yüzde yüz pamuk, nefes alan kumaş, regular kesim, günlük kullanım için basic tişört."}
    ascii_fit = deterministic_analysis(_request(payload)).signals.category_fit
    turkish_fit = deterministic_analysis(_request(turkish)).signals.category_fit
    assert turkish_fit == pytest.approx(ascii_fit)


def test_fold_text():
    assert fold_text("TİŞÖRT Kumaş ÇANTA ığüşöç") == "tisort kumas canta igusoc"


@pytest.mark.parametrize(("title", "expected"), [
    ("Laptop Çantası 15.6 inç", "canta"),
    ("24 Saat Kalıcı Mat Ruj", "kozmetik"),
    ("ERKEK DERİ BOT", "ayakkabi"),
    ("Krem Rengi Oversize Tişört", "tisort"),
    ("Güneş Kremi SPF50", "kozmetik"),
    ("Deri Cüzdan", "canta"),
    ("Robot Süpürge", "tisort"),  # unknown → fallback, and "bot" must not match "robot"
    ("Apple Watch Series 10", "akilli_saat"),
    ("Kablosuz Kulaklık", "kulaklik"),
])
def test_link_category_mapping(title, expected):
    assert ProductLinkReader._map_category("", title) == expected


def test_link_feature_keys_fold_turkish():
    mapped = ProductLinkReader._map_features({"Kumaş": "Pamuk", "Bölme Sayısı": "3", "Cilt Tipi": "Karma"})
    assert mapped == {"fabric": "Pamuk", "compartments": "3", "skinType": "Karma"}
