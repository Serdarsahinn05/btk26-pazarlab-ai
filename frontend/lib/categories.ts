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
