export type GlossaryCategory =
  | "Character"
  | "Skill"
  | "Weapon"
  | "Item"
  | "UI"
  | "Lore"
  | "System";

export type GlossaryPriority = "Preferred" | "Required" | "Forbidden";

export type GlossaryEntry = {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  category: GlossaryCategory;
  notes: string;
  priority: GlossaryPriority;
};

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  "Character",
  "Skill",
  "Weapon",
  "Item",
  "UI",
  "Lore",
  "System"
];

export const GLOSSARY_PRIORITIES: GlossaryPriority[] = ["Preferred", "Required", "Forbidden"];

export const PRIORITY_SORT_ORDER: Record<GlossaryPriority, number> = {
  Required: 0,
  Preferred: 1,
  Forbidden: 2
};
