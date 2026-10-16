import personasData from "@/data/personas.json";

// Colour identity follows the order in personas.json (same order as the backend),
// so all 12 personas get a distinct --persona-N token and renames don't break it.
const order = new Map(personasData.personaTypes.map((p, index) => [p.name, index]));

/** CSS colour for a persona name; neutral for unknown speakers such as "Sistem". */
export function personaColor(name: string): string {
  const index = order.get(name);
  return index === undefined ? "hsl(var(--muted-foreground))" : `hsl(var(--persona-${(index % 12) + 1}))`;
}

/** Human-friendly Turkish label for the ASCII persona names used in data files. */
const DISPLAY: Record<string, string> = {
  "Fiyat Hassas Alici": "Fiyat Hassas Alıcı",
  "Trend Takipcisi": "Trend Takipçisi",
  "Kalite Odakli Alici": "Kalite Odaklı Alıcı",
  "Detayci Arastirmaci": "Detaycı Araştırmacı",
  "Durtusel Alici": "Dürtüsel Alıcı",
  "Marka Sadigi": "Marka Sadığı",
  "Sosyal Onay Arayan": "Sosyal Onay Arayan",
  "Pratik Cozum Arayan": "Pratik Çözüm Arayan",
  "Premium Alici": "Premium Alıcı",
  "Kararsiz Sepet Bekletici": "Kararsız Sepet Bekletici",
  "Problem Cozum Odakli Kullanici": "Problem Çözüm Odaklı Kullanıcı",
  "Detayci Uyum Kontrolcusu": "Detaycı Uyum Kontrolcüsü",
};

export function personaLabel(name: string): string {
  return DISPLAY[name] ?? name;
}

export function personaSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export type Decision = "buy" | "watch" | "skip";

export function decisionOf(value?: string, probability = 0): Decision {
  if (value === "buy" || value === "watch" || value === "skip") return value;
  return probability >= 0.55 ? "buy" : probability >= 0.42 ? "watch" : "skip";
}

export const DECISION_LABEL: Record<Decision, string> = { buy: "Aldı", watch: "Kararsız", skip: "Almadı" };
export const DECISION_TEXT_CLASS: Record<Decision, string> = {
  buy: "text-buy-text",
  watch: "text-watch-text",
  skip: "text-skip-text",
};
