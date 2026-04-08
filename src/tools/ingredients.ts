import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { slugify } from "../slugify.js";

export function registerIngredientTools(
  server: McpServer,
  client: ApiClient
): void {
  server.tool(
    "weekplan_list_ingredients",
    "List all ingredients in the week plan.",
    {},
    { readOnlyHint: true },
    async () => {
      const ingredients = await client.getIngredients();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(ingredients, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "weekplan_add_ingredient",
    "Add or update an ingredient. Creates a stable slug ID from the name.",
    {
      name: z.string().min(1).describe("Ingredient name"),
      unit: z.string().min(1).describe("Unit of measurement (e.g. g, ml, pcs)"),
    },
    { idempotentHint: true },
    async ({ name, unit }) => {
      const id = slugify(name);
      await client.upsertIngredient(id, name, unit);
      return {
        content: [
          {
            type: "text",
            text: `Ingredient saved: id="${id}", name="${name}", unit="${unit}"`,
          },
        ],
      };
    }
  );

  server.tool(
    "weekplan_delete_ingredient",
    "Delete an ingredient by id.",
    {
      id: z.string().min(1).describe("Ingredient id to delete"),
    },
    { destructiveHint: true },
    async ({ id }) => {
      await client.deleteIngredient(id);
      return {
        content: [{ type: "text", text: `Ingredient "${id}" deleted.` }],
      };
    }
  );

  server.tool(
    "weekplan_edit_ingredient",
    "Edit an existing ingredient by id. Supply only the fields you want to change; omitted fields keep their current values. The ingredient id never changes, so recipe references stay intact.",
    {
      id: z.string().min(1).describe("Ingredient id to edit"),
      name: z.string().min(1).optional().describe("New display name"),
      unit: z.string().min(1).optional().describe("New unit of measurement"),
    },
    { idempotentHint: true },
    async ({ id, name, unit }) => {
      const ingredients = await client.getIngredients();
      const current = ingredients.find((i) => i.id === id);
      if (!current) {
        return {
          isError: true,
          content: [{ type: "text", text: `Ingredient "${id}" not found.` }],
        };
      }
      const mergedName = name ?? current.name;
      const mergedUnit = unit ?? current.unit;
      await client.upsertIngredient(id, mergedName, mergedUnit);
      const changes: string[] = [];
      if (mergedName !== current.name) changes.push(`name "${current.name}" → "${mergedName}"`);
      if (mergedUnit !== current.unit) changes.push(`unit "${current.unit}" → "${mergedUnit}"`);
      const summary = changes.length > 0 ? changes.join(", ") : "no changes";
      return {
        content: [{ type: "text", text: `Ingredient "${id}" updated: ${summary}.` }],
      };
    }
  );
}
