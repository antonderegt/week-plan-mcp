export interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  steps: string[];
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  getIngredients(): Promise<Ingredient[]> {
    return this.request<Ingredient[]>("GET", "/api/ingredients");
  }

  upsertIngredient(id: string, name: string, unit: string): Promise<void> {
    return this.request<void>("PUT", `/api/ingredients/${id}`, { id, name, unit });
  }

  deleteIngredient(id: string): Promise<void> {
    return this.request<void>("DELETE", `/api/ingredients/${id}`);
  }

  getRecipes(): Promise<Recipe[]> {
    return this.request<Recipe[]>("GET", "/api/recipes");
  }

  upsertRecipe(
    id: string,
    name: string,
    ingredients: RecipeIngredient[],
    steps: string[]
  ): Promise<void> {
    return this.request<void>("PUT", `/api/recipes/${id}`, {
      id,
      name,
      ingredients,
      steps,
    });
  }

  deleteRecipe(id: string): Promise<void> {
    return this.request<void>("DELETE", `/api/recipes/${id}`);
  }
}
