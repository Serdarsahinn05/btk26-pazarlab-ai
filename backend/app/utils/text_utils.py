"""Turkish-aware text folding for keyword matching."""

# Keyword lists are ASCII ("kumas", "guzel"); user text is Turkish ("kumaş", "güzel").
_FOLD = str.maketrans("çğıöşüÇĞİÖŞÜâîû", "cgiosucgiosuaiu")


def fold_text(text: str) -> str:
    """Lowercase and map Turkish letters to ASCII, so 'Tişört KUMAŞ' matches 'tisort kumas'."""
    # Translate before lower(): Python lowercases 'İ' to 'i̇' (with a combining dot).
    return (text or "").translate(_FOLD).lower()
