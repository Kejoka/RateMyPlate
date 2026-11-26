export type Rating = {
  id: string;
  name: string;
  initials: string;
  value: number;
  review?: string;
  color: string;
  isCurrentUser?: boolean;
  ownerId?: string;
};

export type Circle = {
  id: string;
  name: string;
  color: string;
  ownerId?: string;
  mealCount?: number;
  privacy?: 'private' | 'invited';
  invitedEmails?: string[];
  memberIds?: string[];
};

export type CircleMember = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  isPending?: boolean;
};

export type DietaryTag = 'vegetarian' | 'vegan';

export type RecipeUnitSystem = 'metric' | 'imperial';
export type RecipeIngredient = { id: string; name: string; amount: number; unit: string; category: string };
export type StructuredRecipe = { version: 1; portions: number; source?: string; categories: string[]; ingredients: RecipeIngredient[]; steps: { id: string; instructions: string }[] };

export type UserProfile = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
};

export type AppNotification = {
  id: string;
  recipientId: string;
  type: 'group-invite';
  senderId: string;
  senderName: string;
  circleId: string;
  circleName: string;
  membershipId?: string;
  read: boolean;
  createdAt?: string;
};

export type Meal = {
  id: string;
  name: string;
  date: string;
  image: string;
  recipe?: string;
  recipeData?: StructuredRecipe;
  note: string;
  circle: string;
  addedBy: string;
  ratings: Rating[];
  accent: string;
  ownerId?: string;
  dietaryTags?: DietaryTag[];
};

export type NewMeal = {
  name: string;
  date: string;
  recipe: string;
  recipeData: StructuredRecipe;
  note: string;
  circle: string;
  image: string;
  dietaryTags: DietaryTag[];
};
