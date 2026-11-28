import type { RecipeIngredient, RecipeUnitSystem, StructuredRecipe } from './types';

const recipeId = () => `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const createRecipeId = recipeId;
export const emptyRecipe = (): StructuredRecipe => ({ version: 1, portions: 2, source: '', categories: ['Other'], ingredients: [], steps: [{ id: recipeId(), instructions: '' }] });

export function parseRecipe(value?: string) {
  if (!value?.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(value) as StructuredRecipe;
    if (parsed.version !== 1 || !Array.isArray(parsed.ingredients) || !Array.isArray(parsed.steps)) return null;
    return parsed;
  } catch { return null; }
}

const conversions: Record<string, { metric: [string, number]; imperial: [string, number] }> = {
  g: { metric: ['g', 1], imperial: ['oz', 0.03527396] }, gram: { metric: ['g', 1], imperial: ['oz', 0.03527396] }, grams: { metric: ['g', 1], imperial: ['oz', 0.03527396] },
  kg: { metric: ['kg', 1], imperial: ['lb', 2.204623] }, kilogram: { metric: ['kg', 1], imperial: ['lb', 2.204623] },
  ml: { metric: ['ml', 1], imperial: ['fl oz', 0.033814] }, milliliter: { metric: ['ml', 1], imperial: ['fl oz', 0.033814] }, millilitre: { metric: ['ml', 1], imperial: ['fl oz', 0.033814] },
  l: { metric: ['l', 1], imperial: ['cups', 4.22675] }, liter: { metric: ['l', 1], imperial: ['cups', 4.22675] }, litre: { metric: ['l', 1], imperial: ['cups', 4.22675] },
  tsp: { metric: ['tsp', 1], imperial: ['tsp', 1] }, teaspoon: { metric: ['tsp', 1], imperial: ['tsp', 1] }, teaspoons: { metric: ['tsp', 1], imperial: ['tsp', 1] }, tl: { metric: ['tsp', 1], imperial: ['tsp', 1] }, teelöffel: { metric: ['tsp', 1], imperial: ['tsp', 1] },
  tbsp: { metric: ['tbsp', 1], imperial: ['tbsp', 1] }, tablespoon: { metric: ['tbsp', 1], imperial: ['tbsp', 1] }, tablespoons: { metric: ['tbsp', 1], imperial: ['tbsp', 1] }, el: { metric: ['tbsp', 1], imperial: ['tbsp', 1] }, esslöffel: { metric: ['tbsp', 1], imperial: ['tbsp', 1] },
  cup: { metric: ['ml', 240], imperial: ['cups', 1] }, cups: { metric: ['ml', 240], imperial: ['cups', 1] }, tasse: { metric: ['ml', 240], imperial: ['cups', 1] }, tassen: { metric: ['ml', 240], imperial: ['cups', 1] },
  oz: { metric: ['g', 28.3495], imperial: ['oz', 1] }, 'fl oz': { metric: ['ml', 29.5735], imperial: ['fl oz', 1] },
  lb: { metric: ['g', 453.592], imperial: ['lb', 1] }, lbs: { metric: ['g', 453.592], imperial: ['lb', 1] }, pound: { metric: ['g', 453.592], imperial: ['lb', 1] },
};

export function formatIngredient(ingredient: RecipeIngredient, basePortions: number, portions: number, system: RecipeUnitSystem) {
  const scaled = ingredient.amount * portions / Math.max(1, basePortions);
  const unit = ingredient.unit.trim();
  const conversion = conversions[unit.toLowerCase()];
  const [displayUnit, factor] = conversion?.[system] ?? [unit, 1];
  const amount = scaled * factor;
  const rounded = Number(amount.toFixed(amount < 10 && amount % 1 !== 0 ? 1 : 0));
  return `${rounded} ${displayUnit}${ingredient.name ? ` ${ingredient.name}` : ''}`.trim();
}

export function formatStep(instructions: string, recipe: StructuredRecipe, portions: number, system: RecipeUnitSystem) {
  return instructions.replace(/\{\{([^}]+)\}\}/g, (token, id: string) => {
    const ingredient = recipe.ingredients.find((item) => item.id === id);
    return ingredient ? formatIngredient(ingredient, recipe.portions, portions, system) : token;
  });
}
