import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { slugify } from "../slugify.js";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function registerRecipeTools(
  server: McpServer,
  client: ApiClient
): void {
  server.tool(
    "weekplan_list_recipes",
    "List all recipes (with ingredients and steps).",
    {},
    { readOnlyHint: true },
    async () => {
      const recipes = await client.getRecipes();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(recipes, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "weekplan_add_recipe",
    "Add or update a recipe with its ingredients list and cooking steps. Each ingredient references a name and quantity/unit. Missing ingredients are created automatically. Always use Dutch for the name, ingredient names, and steps.",
    {
      name: z.string().min(1).describe("Recipe name"),
      ingredients: z
        .array(
          z.object({
            ingredientName: z.string().min(1).describe("Ingredient name"),
            quantity: z.number().positive().describe("Quantity required"),
            unit: z.string().min(1).describe("Unit for this recipe usage"),
          })
        )
        .describe("Ingredients with quantities"),
      steps: z.array(z.string().min(1)).describe("Ordered cooking steps"),
    },
    { idempotentHint: true },
    async ({ name, ingredients, steps }) => {
      const capitalizedName = cap(name);
      const existing = await client.getIngredients();
      const existingByName = new Map(
        existing.map((i) => [i.name.toLowerCase(), i])
      );

      const createdIds: string[] = [];

      for (const ing of ingredients) {
        const ingName = cap(ing.ingredientName);
        if (!existingByName.has(ingName.toLowerCase())) {
          const id = slugify(ingName);
          await client.upsertIngredient(id, ingName, ing.unit);
          existingByName.set(ingName.toLowerCase(), {
            id,
            name: ingName,
            unit: ing.unit,
          });
          createdIds.push(id);
        }
      }

      const recipeIngredients = ingredients.map((ing) => {
        const ingName = cap(ing.ingredientName);
        const found = existingByName.get(ingName.toLowerCase())!;
        return {
          ingredientId: found.id,
          quantity: ing.quantity,
          unit: ing.unit,
        };
      });

      const recipeId = slugify(capitalizedName);
      await client.upsertRecipe(recipeId, capitalizedName, recipeIngredients, steps);

      const lines = [`Recipe saved: id="${recipeId}", name="${capitalizedName}"`];
      if (createdIds.length > 0) {
        lines.push(`Auto-created ingredients: ${createdIds.join(", ")}`);
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
  );

  server.tool(
    "weekplan_edit_recipe",
    "Edit an existing recipe by its id. All fields are optional — only the fields you provide will be updated. Use this to rename a recipe, translate it, change steps, or replace ingredients. Always use Dutch for the name, ingredient names, and steps.",
    {
      id: z.string().min(1).describe("Recipe id to edit (slug, e.g. 'chicken-soup')"),
      name: z.string().min(1).optional().describe("New recipe name"),
      ingredients: z
        .array(
          z.object({
            ingredientName: z.string().min(1).describe("Ingredient name"),
            quantity: z.number().positive().describe("Quantity required"),
            unit: z.string().min(1).describe("Unit for this recipe usage"),
          })
        )
        .optional()
        .describe("Replacement ingredients list (replaces all existing ingredients)"),
      steps: z.array(z.string().min(1)).optional().describe("Replacement cooking steps (replaces all existing steps)"),
    },
    { idempotentHint: true },
    async ({ id, name, ingredients, steps }) => {
      const recipes = await client.getRecipes();
      const current = recipes.find((r) => r.id === id);
      if (!current) {
        return {
          content: [{ type: "text", text: `Recipe "${id}" not found.` }],
          isError: true,
        };
      }

      const mergedName = cap(name ?? current.name);
      const mergedSteps = steps ?? current.steps;

      let mergedIngredients = current.ingredients;
      const createdIds: string[] = [];

      if (ingredients !== undefined) {
        const existing = await client.getIngredients();
        const existingByName = new Map(
          existing.map((i) => [i.name.toLowerCase(), i])
        );

        for (const ing of ingredients) {
          const ingName = cap(ing.ingredientName);
          if (!existingByName.has(ingName.toLowerCase())) {
            const newId = slugify(ingName);
            await client.upsertIngredient(newId, ingName, ing.unit);
            existingByName.set(ingName.toLowerCase(), {
              id: newId,
              name: ingName,
              unit: ing.unit,
            });
            createdIds.push(newId);
          }
        }

        mergedIngredients = ingredients.map((ing) => {
          const ingName = cap(ing.ingredientName);
          const found = existingByName.get(ingName.toLowerCase())!;
          return {
            ingredientId: found.id,
            quantity: ing.quantity,
            unit: ing.unit,
          };
        });
      }

      await client.upsertRecipe(id, mergedName, mergedIngredients, mergedSteps);

      const changed: string[] = [];
      if (name !== undefined) changed.push(`name → "${mergedName}"`);
      if (ingredients !== undefined) changed.push("ingredients replaced");
      if (steps !== undefined) changed.push("steps replaced");
      if (createdIds.length > 0) changed.push(`auto-created ingredients: ${createdIds.join(", ")}`);

      return {
        content: [
          {
            type: "text",
            text: `Recipe "${id}" updated.\n${changed.join("\n")}`,
          },
        ],
      };
    }
  );

  server.tool(
    "weekplan_delete_recipe",
    "Delete a recipe by id.",
    {
      id: z.string().min(1).describe("Recipe id to delete"),
    },
    { destructiveHint: true },
    async ({ id }) => {
      await client.deleteRecipe(id);
      return {
        content: [{ type: "text", text: `Recipe "${id}" deleted.` }],
      };
    }
  );
}
