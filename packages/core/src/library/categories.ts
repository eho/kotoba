export const CATEGORY_VALUES = [
  "daily_life",
  "travel",
  "literature",
  "culture",
  "general",
] as const;

export type Category = (typeof CATEGORY_VALUES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  daily_life: "Daily Life",
  travel: "Travel",
  literature: "Literature",
  culture: "Culture",
  general: "General",
};

export const CATEGORY_MENU_LABELS: Record<Category, string> = {
  daily_life: "Daily Life",
  travel: "Travel",
  literature: "Literature",
  culture: "Culture",
  general: "General",
};

const CATEGORY_SET = new Set<string>(CATEGORY_VALUES);

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && CATEGORY_SET.has(value);
}

export function normalizePhraseCategories(input: unknown): Category[] {
  const seen = new Set<Category>();

  if (Array.isArray(input)) {
    for (const value of input) {
      if (isCategory(value)) {
        seen.add(value);
      }
    }
  } else if (isCategory(input)) {
    seen.add(input);
  }

  if (seen.size === 0) {
    return ["general"];
  }

  if (seen.size > 1 && seen.has("general")) {
    seen.delete("general");
  }

  return CATEGORY_VALUES.filter((category) => seen.has(category));
}

export function togglePhraseCategory(
  categories: readonly Category[],
  category: Category
): Category[] {
  const current = new Set(normalizePhraseCategories(categories));

  if (category === "general") {
    return ["general"];
  }

  current.delete("general");
  if (current.has(category)) {
    current.delete(category);
  } else {
    current.add(category);
  }

  return normalizePhraseCategories(Array.from(current));
}

export function primaryCategory(categories: readonly Category[]): Category {
  return normalizePhraseCategories(categories)[0] ?? "general";
}
