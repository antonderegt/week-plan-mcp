# WeekPlan MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI assistants like Claude the ability to manage recipes and ingredients in your WeekPlan app via its REST API.

## What It Does

Once connected, Claude can:

- List, add, and delete **ingredients** (name + unit)
- List, add, and delete **recipes** (name, ingredients with quantities, and step-by-step instructions)
- Automatically create missing ingredients when adding a recipe

---

## Prerequisites

- **Node.js 18+** — [Download here](https://nodejs.org)
- A running **WeekPlan API** server (defaults to `http://localhost:3000`)

---

## Installation

### Option 1 — Clone and build (recommended for local development)

```bash
git clone <your-repo-url> weekplan-mcp-server
cd weekplan-mcp-server
npm install
npm run build
```

The compiled server will be at `dist/index.js`.

### Option 2 — Install globally from npm (once published)

```bash
npm install -g weekplan-mcp-server
```

This makes the `weekplan-mcp-server` command available system-wide.

---

## Configuration

The server is configured via a single environment variable:

| Variable | Default | Description |
|---|---|---|
| `WEEKPLAN_URL` | `http://localhost:3000` | Base URL of your WeekPlan REST API |

---

## Adding to Claude Code

Run the following command to register the server with Claude Code:

```bash
claude mcp add weekplan-mcp-server -e WEEKPLAN_URL=http://localhost:3000 -- node /absolute/path/to/weekplan-mcp-server/dist/index.js
```

Replace `/absolute/path/to/weekplan-mcp-server` with the actual path where you cloned the repo.

Or edit `~/.claude.json` to add it to a specific project.

Or edit `claude_desktop_config.json` directly (see the Claude Desktop section below — the format is the same).

---

## Adding to Claude Desktop

Edit your Claude Desktop config file:

- **macOS:** `~/Library/'Application Support'/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

Add the server under `mcpServers`:

```json
{
  "mcpServers": {
    "weekplan": {
      "command": "node",
      "args": ["/absolute/path/to/weekplan-mcp-server/dist/index.js"],
      "env": {
        "WEEKPLAN_URL": "http://localhost:3000"
      }
    }
  }
}
```

Restart Claude Desktop after saving the file.

---

## Adding to Cursor

Open Cursor settings and navigate to **Features → MCP Servers**, then add:

```json
{
  "weekplan": {
    "command": "node",
    "args": ["/absolute/path/to/weekplan-mcp-server/dist/index.js"],
    "env": {
      "WEEKPLAN_URL": "http://localhost:3000"
    }
  }
}
```

---

## Adding to VS Code (Copilot / MCP extension)

In your `.vscode/mcp.json` or user settings:

```json
{
  "servers": {
    "weekplan": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/weekplan-mcp-server/dist/index.js"],
      "env": {
        "WEEKPLAN_URL": "http://localhost:3000"
      }
    }
  }
}
```

---

## Available Tools

### Ingredients

| Tool | Description | Parameters |
|---|---|---|
| `weekplan_list_ingredients` | List all ingredients | _(none)_ |
| `weekplan_add_ingredient` | Add or update an ingredient | `name` (string), `unit` (string) |
| `weekplan_delete_ingredient` | Delete an ingredient | `id` (string) |

### Recipes

| Tool | Description | Parameters |
|---|---|---|
| `weekplan_list_recipes` | List all recipes | _(none)_ |
| `weekplan_add_recipe` | Add or update a recipe | `name` (string), `ingredients` (array), `steps` (array of strings) |
| `weekplan_delete_recipe` | Delete a recipe | `id` (string) |

The `ingredients` array in `weekplan_add_recipe` accepts objects with:
- `ingredientName` — name of the ingredient (created automatically if missing)
- `quantity` — numeric amount
- `unit` — unit of measurement (e.g. `"g"`, `"ml"`, `"tbsp"`)

IDs are generated automatically from names (e.g. `"Olive Oil"` → `"olive-oil"`), so add operations are idempotent — running them twice won't create duplicates.

---

## Example Prompts

Once the server is connected, try asking Claude:

```
Add a recipe for spaghetti bolognese with ingredients and steps.
```

```
List all my ingredients.
```

```
Add 500g of chicken breast as an ingredient.
```

```
Delete the recipe for lasagne.
```

---

## Development

```bash
# Run directly from TypeScript (no build step needed)
npm run dev

# Build to dist/
npm run build

# Run the compiled server
npm start
```

The server communicates over **stdio**, so it has no open ports and is safe to run as a subprocess managed by your AI client.

---

## Project Structure

```
src/
├── index.ts          # Entry point — connects stdio transport
├── server.ts         # Registers all tools with the MCP server
├── api-client.ts     # HTTP client for the WeekPlan REST API
├── slugify.ts        # Converts names to stable IDs
└── tools/
    ├── ingredients.ts # Ingredient tool handlers
    └── recipes.ts     # Recipe tool handlers
```

---

## Troubleshooting

**"Cannot connect to WeekPlan API"**
Make sure your WeekPlan server is running and `WEEKPLAN_URL` points to the correct address.

**"command not found: node"**
Node.js is not installed or not on your PATH. Install it from [nodejs.org](https://nodejs.org).

**Tools don't appear in Claude**
- Confirm the path in your config points to `dist/index.js` (not `src/index.ts`)
- Make sure you ran `npm run build` after cloning
- Restart your AI client after changing the config

**Build errors**
Run `npm install` first to ensure all dependencies are present, then `npm run build`.
