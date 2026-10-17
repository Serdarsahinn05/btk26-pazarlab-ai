"""Category catalog (Faz 13a): 12 families + "diger", subtypes, data-driven rules and detection."""

import copy
import json

import pytest

from app.models.product import ProductFeatures, SimulationRequest
from app.services import categories
from app.services.input_analysis_service import deterministic_analysis
from app.services.normalization_service import get_normalized_weights, normalize_product
from app.services.product_link_service import JSONLDExtractor, ProductLinkReader
from app.utils.text_utils import fold_text

DATA = categories.load_category_rules()
FEATURE_KEYS = {f.alias or name for name, f in ProductFeatures.model_fields.items()}
LEGACY = ["tisort", "pantolon", "mont", "elbise", "etek", "telefon", "laptop", "kulaklik", "tablet", "akilli_saat",
          "ayakkabi", "canta", "kozmetik"]

PRODUCTS = {
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
    "airfryer": {
        "productName": "5,5 L Yağsız Airfryer",
        "description": "1700 watt güçlü motor, 5,5 litre hazne, yapışmaz kaplama ve 8 hazır program; sıcak hava fritözü ile yağsız pişirme.",
        "features": {"brand": "Kiwi", "power": "1700 W", "volume": "5,5 L", "material": "yapışmaz kaplama"},
        "price": 3200,
    },
    "kilif": {
        "productName": "iPhone 15 Uyumlu Şeffaf Kılıf",
        "description": "iPhone 15 ile tam uyumlu şeffaf silikon kılıf; kamera korumalı, darbe emici köşeler, kablosuz şarj ile çalışır.",
        "features": {"compatibleModel": "iPhone 15", "material": "silikon"},
        "price": 220,
    },
    "mobilya": {
        "productName": "Masif Ahşap Yemek Masası",
        "description": "Masif meşe ahşap 4 kişilik yemek masası; 120 x 80 cm, salon ve mutfak için, kolay kurulum, 100 kg taşıma kapasitesi.",
        "features": {"material": "masif meşe", "dimensions": "120 x 80 x 75 cm", "loadCapacity": "100 kg"},
        "price": 6500,
    },
    "oyuncak": {
        "productName": "Ahşap Yapboz Seti 3+ Yaş",
        "description": "Çocuk gelişimine uygun ahşap yapboz oyuncak seti; 3 yaş ve üzeri, boyalar suya dayanıklı ve CE sertifikalı.",
        "features": {"ageGroup": "3+ yaş", "material": "ahşap", "certifications": "CE"},
        "price": 450,
    },
    "fitness": {
        "productName": "Kaymaz 6 mm Yoga Matı",
        "description": "Fitness, pilates ve egzersiz için 6 mm kalın kaymaz yoga matı; 183 x 61 cm, taşıma askılı, spor salonu ve ev için.",
        "features": {"material": "TPE", "dimensions": "183 x 61 cm", "useCase": "yoga, pilates"},
        "price": 650,
    },
}


def _request(payload, **overrides):
    data = copy.deepcopy(payload)
    data.update(overrides)
    return SimulationRequest.model_validate(data)


# ------------------------------------------------------------------ data file

def test_catalog_shape():
    families, subtypes = DATA["families"], DATA["categories"]
    assert len(families) == 13 and "diger" in families  # 12 families + "diger"
    assert not set(families) & set(subtypes), "family and subtype ids share one namespace"
    assert all(cat["family"] in families for cat in subtypes.values())
    assert set(LEGACY) <= set(categories.all_ids()), "the old flat ids stay valid"
    for fid, fam in families.items():
        assert fam["label"] and fam["icon"] and fam["copy"]["descriptionAdvice"], fid
    for cid, cat in subtypes.items():
        assert cat["label"] and cat["keywords"], cid


@pytest.mark.parametrize("category", categories.all_ids())
def test_every_category_is_complete(category):
    rule = categories.rule_for(category)
    assert rule["averagePrice"] or category == "diger"
    assert set(rule["defaultWeights"]) == set(DATA["commonParameters"])
    fields = [f["name"] for f in rule["form"]["fields"]]
    assert fields and set(fields) <= FEATURE_KEYS | {"colorsText"}, category
    assert set(rule["importantFields"]) <= FEATURE_KEYS, category
    assert {name for group, _ in rule["qualityFields"] for name in group} <= FEATURE_KEYS, category
    assert set(rule["applicableAudienceFields"]) <= {"ageRange", "gender", "incomeLevel"}
    for motivation in DATA["meta"]["motivations"]:
        assert abs(sum(get_normalized_weights(category, motivation).values()) - 1) < 1e-6


def test_legacy_ids_keep_their_values():
    # Full outputs were compared before/after the refactor; these anchor the prices the town depends on.
    assert [categories.rule_for(c)["averagePrice"] for c in ("tisort", "telefon", "laptop", "ayakkabi", "kozmetik")] == [450, 16000, 28000, 1500, 450]
    assert categories.label("tisort") == "Giyim / Tişört" and categories.label("ayakkabi") == "Ayakkabı"


def test_frontend_copy_is_identical():
    frontend = categories.DATA_FILE.parents[3] / "frontend" / "data" / "category_rules.json"
    assert json.loads(frontend.read_text(encoding="utf-8")) == DATA


# ------------------------------------------------------------------ simulation

@pytest.mark.parametrize("category", sorted(PRODUCTS))
def test_categories_simulate_end_to_end(client, payload, category):
    body = {**payload, "category": category, "targetAudience": {"ageRange": "genel", "gender": "unisex", "incomeLevel": "middle"},
            **PRODUCTS[category]}
    res = client.post("/api/simulate", json=body)
    assert res.status_code == 200, res.text
    data = res.json()
    assert 0 <= data["overallScore"] <= 100 and data["simulatedConsumers"] == 500
    # The product matches its category, so no mismatch warning.
    assert data["inputAnalysis"]["signals"]["categoryFit"] >= 0.6, data["inputAnalysis"]
    assert data["inputAnalysis"]["suspectedCategory"] is None


def test_unknown_category_is_rejected(client, payload):
    assert client.post("/api/simulate", json={**payload, "category": "televizyon"}).status_code == 422


def test_family_id_works_without_subtype(client, payload):
    res = client.post("/api/simulate", json={**payload, "category": "giyim"})
    assert res.status_code == 200, res.text


def _buyers(client, body):
    res = client.post("/api/price-sweep", json=body)
    assert res.status_code == 200, res.text
    return [p["estimatedBuyers"] for p in res.json()["points"]]


def test_other_uses_market_price_and_keeps_it_fixed_in_sweeps(client, payload):
    body = {**payload, "category": "diger", "price": 500}
    # No market price: the town compares tried prices with the original one, so cheaper still sells more.
    curve = _buyers(client, body)
    assert curve[0] > curve[-1]
    cheap_market = SimulationRequest.model_validate({**body, "marketPrice": 250})
    dear_market = SimulationRequest.model_validate({**body, "marketPrice": 1000})
    assert normalize_product(dear_market).price_fit != normalize_product(cheap_market).price_fit
    res_cheap = client.post("/api/simulate", json={**body, "marketPrice": 250}).json()
    res_dear = client.post("/api/simulate", json={**body, "marketPrice": 1000}).json()
    assert res_dear["estimatedBuyers"] > res_cheap["estimatedBuyers"]


def test_new_fields_raise_quality(payload):
    base = {**payload, "category": "airfryer", **PRODUCTS["airfryer"]}
    bare = {**base, "features": {"brand": "Kiwi"}}
    assert normalize_product(_request(base)).quality_score > normalize_product(_request(bare)).quality_score


def test_subtype_season_peak(payload):
    winter = _request(payload, category="bot", features={"season": "winter"})
    summer = _request(payload, category="bot", features={"season": "summer"})
    assert normalize_product(winter).season_fit > normalize_product(summer).season_fit


def test_turkish_characters_score_like_ascii(payload):
    """B17: keyword lists are ASCII, user text is Turkish; both must give the same category fit."""
    turkish = {**payload, "productName": "Basic Pamuklu Tişört",
               "description": "Yüzde yüz pamuk, nefes alan kumaş, regular kesim, günlük kullanım için basic tişört."}
    ascii_fit = deterministic_analysis(_request(payload)).signals.category_fit
    turkish_fit = deterministic_analysis(_request(turkish)).signals.category_fit
    assert turkish_fit == pytest.approx(ascii_fit)


def test_fold_text():
    assert fold_text("TİŞÖRT Kumaş ÇANTA ığüşöç") == "tisort kumas canta igusoc"


# ------------------------------------------------------------------ detection

@pytest.mark.parametrize(("title", "expected"), [
    ("Laptop Çantası 15.6 inç", "canta"),          # the head noun comes last
    ("iPhone 15 Pro Şeffaf Kılıf", "kilif"),
    ("24 Saat Kalıcı Mat Ruj", "makyaj"),
    ("ERKEK DERİ BOT", "bot"),
    ("Krem Rengi Oversize Tişört", "tisort"),
    ("Güneş Kremi SPF50", "cilt_bakim"),
    ("Deri Cüzdan", "cuzdan"),
    ("Xiaomi Robot Süpürge", "supurge"),            # "bot" must not match "robot"
    ("Apple Watch Series 10", "akilli_saat"),
    ("Kablosuz Kulaklık", "kulaklik"),
    ("Xiaomi Mi Band 8 Akıllı Bileklik", "akilli_bileklik"),  # longer keyword wins at the same place
    ("Gümüş Zincir Bileklik", "taki"),
    ("Casio Erkek Kol Saati", "kol_saati"),
    ("Dekoratif Duvar Saati", "dekorasyon"),
    ("Philips Airfryer XXL", "airfryer"),
    ("Kamp Çadırı 4 Kişilik", "kamp"),
    ("Kinder Bebek Arabası", "bebek_arabasi"),
    ("Samsung Galaxy S24 128 GB", "telefon"),
    ("Samsung 55 inç QLED TV", "diger"),           # brands alone say nothing
])
def test_title_detection(title, expected):
    assert ProductLinkReader._map_category("", title) == expected


@pytest.mark.parametrize(("crumbs", "raw", "title", "expected"), [
    (["Ana Sayfa", "Kadın", "Giyim", "Elbise"], None, "Saten Midi", ("elbise", "high", "breadcrumb")),
    (["Giyim"], None, "Keten Oversize Gömlek", ("gomlek", "high", "breadcrumb")),       # path stops at the family
    (["Elektronik", "Bilgisayar"], None, "Lenovo IdeaPad 15", ("bilgisayar", "high", "breadcrumb")),
    (None, "Ev & Yaşam > Mutfak > Tencere Seti", "Granit 7 Parça", ("mutfak", "high", "breadcrumb")),
    (None, None, "Pamuklu Basic Tişört", ("tisort", "medium", "title")),
    (None, None, "Hediye Kutusu Model X", ("diger", "low", "none")),
])
def test_detect_prefers_the_category_path(crumbs, raw, title, expected):
    found = categories.detect(crumbs, raw, title)
    assert (found["category"], found["confidence"], found["source"]) == expected


def test_jsonld_breadcrumb():
    script = json.dumps({"@context": "https://schema.org", "@graph": [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 2, "item": {"@id": "/kadin-giyim", "name": "Giyim"}},
            {"@type": "ListItem", "position": "1", "name": "Kadın"},
            {"@type": "ListItem", "position": 3, "name": "Elbise"},
        ]},
        {"@type": "Product", "name": "Saten Midi Elbise"},
    ]})
    assert JSONLDExtractor.breadcrumb([script]) == ["Kadın", "Giyim", "Elbise"]


def test_link_feature_keys_fold_turkish():
    mapped = ProductLinkReader._map_features({"Kumaş": "Pamuk", "Bölme Sayısı": "3", "Cilt Tipi": "Karma", "Güç": "1700 W", "Yaş Grubu": "3+"})
    assert mapped == {"fabric": "Pamuk", "compartments": "3", "skinType": "Karma", "power": "1700 W", "ageGroup": "3+"}
