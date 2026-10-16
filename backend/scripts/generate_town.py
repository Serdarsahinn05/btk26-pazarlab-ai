"""Generate backend/app/data/town.json: the 500 residents of the synthetic town (Faz 12a).

    cd backend && python scripts/generate_town.py          # writes the file
    cd backend && python scripts/generate_town.py --check  # exits 1 if the committed file is out of date

Deterministic (fixed seed), no AI: stories are assembled from templates so the town is free to rebuild
and every line can be reviewed. Demographic tendencies per persona come from the `personaTemplates`
block of personas.json (the original authors' assumptions); gender is independent of persona, hobbies
and job so the town does not encode stereotypes; age only nudges hobbies (e.g. skateboarding skews young).
All residents are adults (18+) and fictional.
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.normalization_service import load_persona_data  # noqa: E402
from app.services.town import TRAITS, derive_traits  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "app" / "data" / "town.json"
SEED = 20261017
VERSION = 1

# Persona → (income weights low/middle/high, age range). From personaTemplates; the last two were missing there.
DEMOGRAPHICS = {
    "Fiyat Hassas Alici": ((0.65, 0.30, 0.05), (18, 55)),
    "Trend Takipcisi": ((0.25, 0.55, 0.20), (18, 40)),
    "Kalite Odakli Alici": ((0.05, 0.35, 0.60), (22, 60)),
    "Detayci Arastirmaci": ((0.15, 0.65, 0.20), (20, 60)),
    "Durtusel Alici": ((0.20, 0.55, 0.25), (18, 45)),
    "Marka Sadigi": ((0.05, 0.35, 0.60), (22, 65)),
    "Sosyal Onay Arayan": ((0.30, 0.55, 0.15), (18, 45)),
    "Pratik Cozum Arayan": ((0.20, 0.65, 0.15), (18, 60)),
    "Premium Alici": ((0.02, 0.18, 0.80), (20, 60)),
    "Kararsiz Sepet Bekletici": ((0.20, 0.65, 0.15), (18, 60)),
    "Problem Cozum Odakli Kullanici": ((0.20, 0.60, 0.20), (22, 65)),
    "Detayci Uyum Kontrolcusu": ((0.15, 0.60, 0.25), (25, 65)),
}

# Big Five means per persona (O, C, E, A, N); individual values ~ N(mean, 0.12). Assumptions, see town.py.
BIG_FIVE_MEANS = {
    "Fiyat Hassas Alici": (0.45, 0.65, 0.45, 0.55, 0.55),
    "Trend Takipcisi": (0.70, 0.40, 0.70, 0.55, 0.50),
    "Kalite Odakli Alici": (0.55, 0.70, 0.45, 0.50, 0.45),
    "Detayci Arastirmaci": (0.60, 0.78, 0.35, 0.50, 0.45),
    "Durtusel Alici": (0.60, 0.30, 0.65, 0.50, 0.60),
    "Marka Sadigi": (0.35, 0.60, 0.45, 0.65, 0.55),
    "Sosyal Onay Arayan": (0.45, 0.45, 0.62, 0.65, 0.58),
    "Pratik Cozum Arayan": (0.40, 0.60, 0.45, 0.50, 0.40),
    "Premium Alici": (0.60, 0.55, 0.60, 0.45, 0.40),
    "Kararsiz Sepet Bekletici": (0.45, 0.50, 0.40, 0.55, 0.70),
    "Problem Cozum Odakli Kullanici": (0.50, 0.65, 0.40, 0.50, 0.45),
    "Detayci Uyum Kontrolcusu": (0.45, 0.82, 0.30, 0.45, 0.50),
}

NAMES = {
    "kadin": ["Elif", "Zeynep", "Ayşe", "Fatma", "Merve", "Büşra", "Esra", "Selin", "Ece", "Defne", "İrem", "Gizem",
              "Burcu", "Ceren", "Derya", "Hande", "Melis", "Nazlı", "Pelin", "Sevgi", "Tuğba", "Yasemin", "Zehra",
              "Gamze", "Özge", "Şule", "Aslı", "Beril", "Cansu", "Damla", "Ebru", "Hatice", "Emine", "Sibel",
              "Serap", "Leyla", "Nur", "Sude", "Ela", "Duygu", "Kübra", "Rabia", "Aylin", "Gül", "Hülya"],
    "erkek": ["Mehmet", "Ahmet", "Mustafa", "Emre", "Burak", "Can", "Cem", "Murat", "Oğuz", "Kerem", "Mert", "Arda",
              "Barış", "Berk", "Serkan", "Tolga", "Uğur", "Volkan", "Yusuf", "Hakan", "İbrahim", "Halil", "Onur",
              "Ozan", "Selim", "Sinan", "Tarık", "Kaan", "Furkan", "Enes", "Ömer", "Ali", "Hasan", "Hüseyin",
              "Batuhan", "Doruk", "Eren", "Görkem", "Levent", "Kemal", "Orhan", "Recep", "Taner", "Yiğit", "Umut"],
}
SURNAME_INITIALS = "ABCÇDEFGHIİKLMNOÖPRSŞTUÜVYZ"

# (name, type). Names whose locative is irregular (compounds such as Kocaeli → Kocaeli'nde) are left out.
CITIES = {
    "buyuksehir": ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep", "Mersin"],
    "sehir": ["Eskişehir", "Samsun", "Trabzon", "Kayseri", "Denizli", "Sakarya", "Malatya", "Erzurum",
              "Diyarbakır", "Manisa", "Balıkesir", "Tekirdağ", "Muğla", "Aydın", "Van"],
    "ilce": ["Bodrum", "Fethiye", "Ödemiş", "Nazilli", "Ünye", "Akçaabat", "Çeşme", "Ayvalık", "Safranbolu",
             "Polatlı", "Ereğli", "Bandırma", "Gebze", "İnegöl"],
}
CITY_TYPE_WEIGHTS = {"buyuksehir": 0.45, "sehir": 0.35, "ilce": 0.20}

JOBS = {
    "low": ["kurye", "garson", "kasiyer", "fabrika işçisi", "çağrı merkezi temsilcisi", "temizlik görevlisi",
            "inşaat işçisi", "depo görevlisi", "berber kalfası"],
    "middle": ["öğretmen", "hemşire", "muhasebeci", "teknisyen", "satış temsilcisi", "grafik tasarımcı", "memur",
               "bankacı", "eczacı kalfası", "aşçı", "elektrik teknisyeni", "sosyal medya uzmanı", "fizyoterapist",
               "otobüs şoförü", "kuaför"],
    "high": ["yazılım mühendisi", "doktor", "avukat", "mimar", "şirket yöneticisi", "girişimci", "diş hekimi",
             "veri bilimci", "pilot", "makine mühendisi", "finans müdürü"],
}
DEPARTMENTS = ["bilgisayar mühendisliği", "işletme", "psikoloji", "hemşirelik", "grafik tasarım", "hukuk",
               "iktisat", "endüstri mühendisliği", "öğretmenlik", "mimarlık", "turizm", "gastronomi"]
OWN_BUSINESS = {"low": "küçük bir büfe işletiyor", "middle": "kendi kafesini işletiyor", "high": "kendi şirketini yönetiyor"}

HOBBIES_ANY = ["koşu", "yoga", "kitap okuma", "dizi izleme", "fotoğrafçılık", "yemek yapma", "kamp", "bisiklet",
               "futbol", "basketbol", "gitar", "seyahat", "kahve demleme", "sinema", "dans", "tiyatro", "gönüllülük",
               "masa oyunları", "resim", "fitness", "yüzme", "doğa yürüyüşü", "podcast dinleme", "satranç",
               "el işleri", "moda", "makyaj", "teknoloji haberleri", "araba", "müzik dinleme"]
HOBBIES_YOUNG = ["kaykay", "bilgisayar oyunları", "konser", "e-spor", "sokak fotoğrafçılığı", "tırmanış"]
HOBBIES_OLDER = ["bahçecilik", "balık tutma", "örgü", "ağaç işleri", "yürüyüş", "bulmaca çözme"]

HOUSEHOLD_TEXT = {
    "ailesiyle": "Ailesiyle yaşıyor.",
    "ev_arkadasi": "Ev arkadaşlarıyla aynı evi paylaşıyor.",
    "yurt": "Öğrenci yurdunda kalıyor.",
    "yalniz": "Yalnız yaşıyor.",
    "esiyle": "Eşiyle yaşıyor.",
    "esi_ve_cocuklari": "Eşi ve {kids} çocuğuyla yaşıyor.",
    "tek_ebeveyn": "{kids} çocuğunu tek başına büyütüyor.",
}

# Shopping phrases keyed by (trait, direction); two of the strongest traits make the last sentence.
SHOPPING = {
    ("priceSensitivity", 1): "Alışverişte önce fiyatları karşılaştırır, kampanya beklemeyi sever.",
    ("priceSensitivity", -1): "Fiyattan çok ürünün kendisine bakar.",
    ("trendSensitivity", 1): "Sosyal medyada gördüğü yeni ürünleri denemeye heveslidir.",
    ("trendSensitivity", -1): "Trendlerle pek ilgilenmez, işini gören ürünü seçer.",
    ("detailNeed", 1): "Satın almadan önce açıklamayı ve yorumları satır satır okur.",
    ("detailNeed", -1): "Uzun açıklamalarla uğraşmaz, görsele ve fiyata bakıp karar verir.",
    ("impulsiveness", 1): "Beğendiği bir şeyi uzun düşünmeden sepete atabilir.",
    ("impulsiveness", -1): "Alışverişi aceleye getirmez, birkaç gün düşünür.",
    ("brandTrustNeed", 1): "Tanımadığı markalara kolay kolay güvenmez.",
    ("brandTrustNeed", -1): "Yeni ve az bilinen markaları denemekten çekinmez.",
    ("shippingSensitivity", 1): "Kargonun hızlı gelmesi ve kolay iade onun için şart.",
    ("qualityExpectation", 1): "Ucuz ama çabuk bozulan ürünlerden uzak durur.",
    ("noveltySeeking", 1): "Farklı ve az bilinen ürünleri keşfetmeyi sever.",
    ("noveltySeeking", -1): "Bildiği ürünlerden şaşmaz.",
}


def locative(word: str) -> str:
    """Turkish locative with apostrophe: İstanbul'da, İzmir'de, Gaziantep'te, Akçaabat'ta."""
    vowels = [ch for ch in word.lower() if ch in "aıoueiöü"]
    back = vowels[-1] in "aıou" if vowels else True
    hard = word[-1].lower() in "çfhkpsşt"
    return f"{word}'{'t' if hard else 'd'}{'a' if back else 'e'}"


def pick_weighted(rng: random.Random, weights: dict[str, float]) -> str:
    return rng.choices(list(weights), weights=list(weights.values()))[0]


def household_for(rng: random.Random, age: int, occupation: str) -> str:
    if age < 25:
        options = {"ailesiyle": 0.55, "ev_arkadasi": 0.25, "yurt": 0.12 if occupation == "ogrenci" else 0.0, "yalniz": 0.08}
    elif age < 35:
        options = {"yalniz": 0.30, "ev_arkadasi": 0.15, "esiyle": 0.25, "ailesiyle": 0.15, "esi_ve_cocuklari": 0.15}
    elif age < 55:
        options = {"esi_ve_cocuklari": 0.50, "esiyle": 0.15, "yalniz": 0.15, "ailesiyle": 0.10, "tek_ebeveyn": 0.10}
    else:
        options = {"esiyle": 0.45, "yalniz": 0.20, "esi_ve_cocuklari": 0.15, "ailesiyle": 0.20}
    return pick_weighted(rng, {k: v for k, v in options.items() if v > 0})


def occupation_for(rng: random.Random, age: int, income: str) -> tuple[str, str]:
    """(kind, phrase) — kind is ogrenci | emekli | is | kendi_isi."""
    if age <= 24 and rng.random() < 0.6:
        return "ogrenci", f"üniversitede {rng.choice(DEPARTMENTS)} okuyor"
    if age >= 60 and rng.random() < 0.7:
        return "emekli", "emekli"
    if rng.random() < 0.12:
        return "kendi_isi", OWN_BUSINESS[income]
    return "is", f"{rng.choice(JOBS[income])} olarak çalışıyor"


def hobbies_for(rng: random.Random, age: int) -> list[str]:
    pool = HOBBIES_ANY + (HOBBIES_YOUNG * 2 if age < 30 else HOBBIES_YOUNG if age < 40 else [])
    pool += HOBBIES_OLDER * 2 if age >= 50 else HOBBIES_OLDER if age >= 35 else []
    first = rng.choice(pool)
    # Different last words, so the story never reads "podcast dinleme ve müzik dinleme".
    second = rng.choice([h for h in pool if h.split()[-1] != first.split()[-1]])
    return [first, second]


def story_for(rng: random.Random, r: dict, kids: int) -> str:
    # "oturuyor" here, because the household sentence that follows usually says "yaşıyor".
    first = f"{r['age']} yaşında, {locative(r['city'])} oturuyor"
    occupation = r["occupationText"]
    lead = f"{first}; {occupation}." if r["occupation"] != "emekli" else f"{first}; emekli."
    household = HOUSEHOLD_TEXT[r["household"]].format(kids=kids)
    h1, h2 = r["hobbies"]
    hobby = rng.choice([
        f"Boş zamanlarında {h1} ve {h2} ile ilgileniyor.",
        f"En sevdiği uğraşlar {h1} ve {h2}.",
        f"Hafta sonlarını genelde {h1} ve {h2} ile geçiriyor.",
    ])
    traits = derive_traits(r)
    ranked = sorted(TRAITS, key=lambda k: abs(traits[k] - 0.5), reverse=True)
    phrases = []
    for key in ranked:
        phrase = SHOPPING.get((key, 1 if traits[key] >= 0.5 else -1))
        if phrase and phrase not in phrases:
            phrases.append(phrase)
        if len(phrases) == 2:
            break
    return " ".join([lead, household, hobby, *phrases])


def generate() -> dict:
    rng = random.Random(SEED)
    personas = load_persona_data()["personaTypes"]
    residents = []
    used_names: set[str] = set()
    for persona in personas:
        name = persona["name"]
        income_weights, (age_low, age_high) = DEMOGRAPHICS[name]
        means = BIG_FIVE_MEANS[name]
        ranges = persona["ranges"]
        for _ in range(persona["count"]):
            gender = rng.choice(["kadin", "erkek"])  # independent of persona on purpose
            for _attempt in range(20):
                full_name = f"{rng.choice(NAMES[gender])} {rng.choice(SURNAME_INITIALS)}."
                if full_name not in used_names:
                    break
            used_names.add(full_name)
            age = rng.randint(age_low, age_high)
            income = rng.choices(["low", "middle", "high"], weights=income_weights)[0]
            occupation, occupation_text = occupation_for(rng, age, income)
            if occupation == "ogrenci":
                income = "low" if rng.random() < 0.8 else income
            city_type = pick_weighted(rng, CITY_TYPE_WEIGHTS)
            household = household_for(rng, age, occupation)
            kids = rng.choice([1, 1, 2, 2, 3]) if household in {"esi_ve_cocuklari", "tek_ebeveyn"} else 0
            big_five = {
                key: round(min(0.98, max(0.02, rng.gauss(mean, 0.12))), 3)
                for key, mean in zip(("openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"), means)
            }
            # Individual variation inside the persona's range, so two residents with similar profiles still differ.
            offsets = {k: round(rng.uniform(-0.35, 0.35) * (ranges[k][1] - ranges[k][0]), 4) for k in TRAITS}
            resident = {
                "id": f"r{len(residents) + 1:03d}",
                "name": full_name,
                "gender": gender,
                "age": age,
                "city": rng.choice(CITIES[city_type]),
                "cityType": city_type,
                "household": household,
                "children": kids,
                "occupation": occupation,
                "occupationText": occupation_text,
                "incomeLevel": income,
                "hobbies": hobbies_for(rng, age),
                "persona": name,
                "bigFive": big_five,
                "offsets": offsets,
            }
            resident["story"] = story_for(rng, resident, kids)
            residents.append(resident)
    return {"version": VERSION, "seed": SEED, "note": "Kurgusal sakinler; gerçek kişiler değildir.", "residents": residents}


def main() -> int:
    text = json.dumps(generate(), ensure_ascii=False, indent=1) + "\n"
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != text:
            print("town.json is out of date: run python scripts/generate_town.py")
            return 1
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT} ({len(text) // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
