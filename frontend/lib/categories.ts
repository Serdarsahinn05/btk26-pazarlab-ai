import data from "@/data/category_rules.json";
import {
  Baby, Dumbbell, Footprints, Headphones, Lamp, Laptop, Package, Plug, PlugZap, Shirt, ShoppingBag, Smartphone, Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { PurchaseMotivation } from "@/types";

/* Category catalog (Faz 13a). Copy of backend/app/data/category_rules.json: edit there, then run backend/scripts/sync_frontend_data.py.
   An id is a family ("giyim") or a subtype ("tisort"); a subtype inherits its family and overrides what it lists. */

export type FieldType = "text" | "select" | "checkbox" | "number";

export interface FormField {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface CategoryForm {
  exampleName: string;
  descriptionPlaceholder: string;
  fields: FormField[];
}

export interface CategoryInfo {
  id: string;
  family: string;
  /** Subtype label, or the family label for a family id. */
  label: string;
  familyLabel: string;
  defaultMotivation: PurchaseMotivation;
  averagePrice: number | null;
  audienceFields: Array<"ageRange" | "gender" | "incomeLevel">;
  form: CategoryForm;
}

type RawRule = {
  label: string;
  family?: string;
  icon?: string;
  defaultMotivation?: string;
  averagePrice?: number | null;
  applicableAudienceFields?: string[];
  form?: CategoryForm;
};

const families = data.families as unknown as Record<string, RawRule>;
const subtypes = data.categories as unknown as Record<string, RawRule & { family: string }>;

const ICONS: Record<string, LucideIcon> = {
  shirt: Shirt, footprints: Footprints, "shopping-bag": ShoppingBag, sparkles: Sparkles, smartphone: Smartphone, laptop: Laptop,
  headphones: Headphones, plug: Plug, "plug-zap": PlugZap, lamp: Lamp, baby: Baby, dumbbell: Dumbbell, package: Package,
};

export const OTHER = "diger";

export const FAMILIES = Object.entries(families).map(([id, fam]) => ({
  id,
  label: fam.label,
  icon: ICONS[fam.icon ?? ""] ?? Package,
  subtypes: Object.entries(subtypes)
    .filter(([, sub]) => sub.family === id)
    .map(([subId, sub]) => ({ id: subId, label: sub.label })),
}));

/** Families shown as "kategori" counts (without "Diğer"). */
export const FAMILY_COUNT = FAMILIES.filter((f) => f.id !== OTHER).length;

export function isKnownCategory(id: string | null | undefined): id is string {
  return !!id && (id in families || id in subtypes);
}

export function categoryInfo(id: string): CategoryInfo {
  const sub = subtypes[id];
  const familyId = sub ? sub.family : id in families ? id : OTHER;
  const fam = families[familyId];
  const rule = { ...fam, ...sub };
  return {
    id: sub || id in families ? id : OTHER,
    family: familyId,
    label: sub ? sub.label : fam.label,
    familyLabel: fam.label,
    defaultMotivation: rule.defaultMotivation as PurchaseMotivation,
    averagePrice: rule.averagePrice ?? null,
    audienceFields: (rule.applicableAudienceFields ?? []) as CategoryInfo["audienceFields"],
    form: rule.form as CategoryForm,
  };
}

/** "Giyim / Tişört", or just "Giyim" for a family id. */
export function categoryLabel(id: string): string {
  const info = categoryInfo(id);
  return info.id === info.family ? info.familyLabel : `${info.familyLabel} / ${info.label}`;
}

/* ------------------------------------------------------------------ detection (same rule as backend services/categories.py) */

const FOLD: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u", â: "a", î: "i", û: "u" };

/** Lowercase with Turkish letters as ASCII, like backend fold_text ("Tişört KUMAŞ" → "tisort kumas"). */
export const foldText = (text: string) => text.replace(/[çğıöşüÇĞİÖŞÜâîû]/g, (c) => FOLD[c]).toLowerCase();

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const KEYWORDS = [...Object.entries(families), ...Object.entries(subtypes)].flatMap(([id, rule]) =>
  ((rule as RawRule & { keywords?: string[] }).keywords ?? []).map((keyword) => {
    const folded = foldText(keyword);
    // Short keywords need word boundaries ("bot" is not "robot"); longer ones may sit inside a word ("çantası").
    return { id, length: folded.length, re: new RegExp(folded.length <= 4 ? `\\b${escape(folded)}\\b` : escape(folded), "g") };
  }),
);

/** Category named in a text such as a product name. Turkish compounds put the head noun last ("laptop çantası"),
    so the match that ends last wins; at the same place the longer keyword wins ("akıllı bileklik" over "bileklik"). */
export function detectCategory(text: string): string | null {
  const folded = foldText(text);
  let best: [number, number, string] | null = null;
  for (const { id, length, re } of KEYWORDS) {
    for (const match of folded.matchAll(re)) {
      const after = folded.slice(match.index + length);
      const wordEnd = after.search(/\W/);
      const candidate: [number, number, string] = [match.index + length + (wordEnd === -1 ? after.length : wordEnd), length, id];
      if (!best || candidate[0] > best[0] || (candidate[0] === best[0] && (candidate[1] > best[1] || (candidate[1] === best[1] && candidate[2] > best[2])))) {
        best = candidate;
      }
    }
  }
  return best ? best[2] : null;
}
