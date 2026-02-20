import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiClient } from "./api-client.js";
import { registerIngredientTools } from "./tools/ingredients.js";
import { registerRecipeTools } from "./tools/recipes.js";

export function createServer(): McpServer {
  const baseUrl = process.env.WEEKPLAN_URL ?? "http://localhost:3000";
  const client = new ApiClient(baseUrl);

  const server = new McpServer({
    name: "weekplan-mcp-server",
    version: "1.0.0",
  });

  registerIngredientTools(server, client);
  registerRecipeTools(server, client);

  return server;
}
