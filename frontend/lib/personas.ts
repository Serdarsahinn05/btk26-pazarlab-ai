import personasData from "@/data/personas.json";

// Colour identity follows the order in personas.json (same order as the backend),
// so all 12 personas get a distinct --persona-N token and renames don't break it.
// Keyed by both id and Turkish label: town residents arrive with the label only.
const order = new Map(
  personasData.personaTypes.flatMap((p, index) => [[p.name, index] as const, [p.displayName, index] as const])
);

/** CSS colour for a persona id or label; neutral for unknown speakers such as "Sistem". */
export function personaColor(name: string): string {
  const index = order.get(name);
  return index === undefined ? "hsl(var(--muted-foreground))" : `hsl(var(--persona-${(index % 12) + 1}))`;
}

// `name` is the stable ASCII id (chat keys, URLs, API); `displayName` is the Turkish label.
const DISPLAY = new Map(personasData.personaTypes.map((p) => [p.name, p.displayName]));

export function personaLabel(name: string): string {
  return DISPLAY.get(name) ?? name;
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
