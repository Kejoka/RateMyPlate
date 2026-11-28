import type { RecipeIngredient, RecipeUnitSystem, StructuredRecipe } from './types';
import { translateIngredientUnit, type Language } from './i18n';

const recipeId = () => `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const defaultRecipeCategory = 'other';
export const createRecipeId = recipeId;
export const emptyRecipe = (): StructuredRecipe => ({ version: 1, portions: 2, source: '', categories: [defaultRecipeCategory], ingredients: [], steps: [{ id: recipeId(), instructions: '' }] });

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
  tsp: { metric: ['teaspoon', 1], imperial: ['teaspoon', 1] }, teaspoon: { metric: ['teaspoon', 1], imperial: ['teaspoon', 1] }, teaspoons: { metric: ['teaspoon', 1], imperial: ['teaspoon', 1] }, tl: { metric: ['teaspoon', 1], imperial: ['teaspoon', 1] }, teelöffel: { metric: ['teaspoon', 1], imperial: ['teaspoon', 1] },
  tbsp: { metric: ['tablespoon', 1], imperial: ['tablespoon', 1] }, tablespoon: { metric: ['tablespoon', 1], imperial: ['tablespoon', 1] }, tablespoons: { metric: ['tablespoon', 1], imperial: ['tablespoon', 1] }, el: { metric: ['tablespoon', 1], imperial: ['tablespoon', 1] }, esslöffel: { metric: ['tablespoon', 1], imperial: ['tablespoon', 1] },
  cup: { metric: ['ml', 240], imperial: ['cup', 1] }, cups: { metric: ['ml', 240], imperial: ['cup', 1] }, tasse: { metric: ['ml', 240], imperial: ['cup', 1] }, tassen: { metric: ['ml', 240], imperial: ['cup', 1] },
  pinch: { metric: ['pinch', 1], imperial: ['pinch', 1] }, pinches: { metric: ['pinch', 1], imperial: ['pinch', 1] }, prise: { metric: ['pinch', 1], imperial: ['pinch', 1] }, prisen: { metric: ['pinch', 1], imperial: ['pinch', 1] },
  handful: { metric: ['handful', 1], imperial: ['handful', 1] }, handfuls: { metric: ['handful', 1], imperial: ['handful', 1] }, handvoll: { metric: ['handful', 1], imperial: ['handful', 1] },
  package: { metric: ['package', 1], imperial: ['package', 1] }, packages: { metric: ['package', 1], imperial: ['package', 1] }, packung: { metric: ['package', 1], imperial: ['package', 1] }, packungen: { metric: ['package', 1], imperial: ['package', 1] },
  piece: { metric: ['piece', 1], imperial: ['piece', 1] }, pieces: { metric: ['piece', 1], imperial: ['piece', 1] }, stück: { metric: ['piece', 1], imperial: ['piece', 1] }, stuck: { metric: ['piece', 1], imperial: ['piece', 1] },
  oz: { metric: ['g', 28.3495], imperial: ['oz', 1] }, 'fl oz': { metric: ['ml', 29.5735], imperial: ['fl oz', 1] },
  lb: { metric: ['g', 453.592], imperial: ['lb', 1] }, lbs: { metric: ['g', 453.592], imperial: ['lb', 1] }, pound: { metric: ['g', 453.592], imperial: ['lb', 1] },
};

export function formatIngredient(ingredient: RecipeIngredient, basePortions: number, portions: number, system: RecipeUnitSystem, language: Language = 'en') {
  const scaled = ingredient.amount * portions / Math.max(1, basePortions);
  const unit = ingredient.unit.trim();
  const conversion = conversions[unit.toLowerCase()];
  const [unitKey, factor] = conversion?.[system] ?? [unit, 1];
  const amount = scaled * factor;
  const rounded = Number(amount.toFixed(amount < 10 && amount % 1 !== 0 ? 1 : 0));
  const displayAmount = new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', { maximumFractionDigits: 1 }).format(rounded);
  const displayUnit = translateIngredientUnit(language, unitKey, rounded);
  return `${displayAmount} ${displayUnit}${ingredient.name ? ` ${ingredient.name}` : ''}`.trim();
}

export function formatStep(instructions: string, recipe: StructuredRecipe, portions: number, system: RecipeUnitSystem, language: Language = 'en') {
  return instructions.replace(/\{\{([^}]+)\}\}/g, (token, id: string) => {
    const ingredient = recipe.ingredients.find((item) => item.id === id);
    return ingredient ? formatIngredient(ingredient, recipe.portions, portions, system, language) : token;
  });
}
