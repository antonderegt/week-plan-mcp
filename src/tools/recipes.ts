import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { slugify } from "../slugify.js";

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
    "Add or update a recipe with its ingredients list and cooking steps. Each ingredient references a name and quantity/unit. Missing ingredients are created automatically.",
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
      const existing = await client.getIngredients();
      const existingByName = new Map(
        existing.map((i) => [i.name.toLowerCase(), i])
      );

      const createdIds: string[] = [];

      for (const ing of ingredients) {
        if (!existingByName.has(ing.ingredientName.toLowerCase())) {
          const id = slugify(ing.ingredientName);
          await client.upsertIngredient(id, ing.ingredientName, ing.unit);
          existingByName.set(ing.ingredientName.toLowerCase(), {
            id,
            name: ing.ingredientName,
            unit: ing.unit,
          });
          createdIds.push(id);
        }
      }

      const recipeIngredients = ingredients.map((ing) => {
        const found = existingByName.get(ing.ingredientName.toLowerCase())!;
        return {
          ingredientId: found.id,
          quantity: ing.quantity,
          unit: ing.unit,
        };
      });

      const recipeId = slugify(name);
      await client.upsertRecipe(recipeId, name, recipeIngredients, steps);

      const lines = [`Recipe saved: id="${recipeId}", name="${name}"`];
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
    "Edit an existing recipe by its id. All fields are optional — only the fields you provide will be updated. Use this to rename a recipe, translate it, change steps, or replace ingredients.",
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

      const mergedName = name ?? current.name;
      const mergedSteps = steps ?? current.steps;

      let mergedIngredients = current.ingredients;
      const createdIds: string[] = [];

      if (ingredients !== undefined) {
        const existing = await client.getIngredients();
        const existingByName = new Map(
          existing.map((i) => [i.name.toLowerCase(), i])
        );

        for (const ing of ingredients) {
          if (!existingByName.has(ing.ingredientName.toLowerCase())) {
            const newId = slugify(ing.ingredientName);
            await client.upsertIngredient(newId, ing.ingredientName, ing.unit);
            existingByName.set(ing.ingredientName.toLowerCase(), {
              id: newId,
              name: ing.ingredientName,
              unit: ing.unit,
            });
            createdIds.push(newId);
          }
        }

        mergedIngredients = ingredients.map((ing) => {
          const found = existingByName.get(ing.ingredientName.toLowerCase())!;
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
