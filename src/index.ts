#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { SkillEntry, SkillPack } from "./types.js";
import { loadRegistryFromDir, loadRegistryFromGitHub, getSkillContent } from "./registry.js";
import { searchSkills } from "./search.js";
import { loadPacks, resolvePackContent } from "./packs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let registry: Map<string, SkillEntry> = new Map();
let packs: Map<string, SkillPack> = new Map();

/**
 * Initialize: load registry from local dir or GitHub, load packs.
 */
async function init(): Promise<void> {
  // Try local skills directory first (for development / plugin mode)
  const localSkillsDir = join(__dirname, "..", "skills");
  registry = await loadRegistryFromDir(localSkillsDir);

  // If no local skills found, fetch from GitHub
  if (registry.size === 0) {
    registry = await loadRegistryFromGitHub();
  }

  // Load packs
  const packsDir = join(__dirname, "..", "packs");
  packs = await loadPacks(packsDir);
}

/**
 * Format a skill entry as a concise summary line.
 */
function formatSkillSummary(skill: SkillEntry, score?: number): string {
  const scoreStr = score !== undefined ? ` (relevance: ${Math.round(score * 10) / 10})` : "";
  const tags = skill.tags.length > 0 ? ` [${skill.tags.join(", ")}]` : "";
  return `**${skill.name}** (\`${skill.id}\`)${scoreStr}\n${skill.description}${tags}\n`;
}

// --- MCP Server ---

const server = new McpServer({
  name: "getskill",
  version: "0.1.0",
});

// Tool: search_skills
server.tool(
  "search_skills",
  "Search for AI agent skills by keyword, tags, or author. Returns ranked results.",
  {
    query: z.string().describe("Search query (e.g. 'frontend security', 'code review')"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Filter by tags (e.g. ['engineering', 'agent-persona'])"),
    author: z.string().optional().describe("Filter by author (e.g. 'agency-agents')"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Max results to return (default 10)"),
  },
  async ({ query, tags, author, limit }) => {
    const results = searchSkills(query, registry, { tags, author, limit: limit ?? 10 });

    if (results.length === 0) {
      return {
        content: [{ type: "text" as const, text: `No skills found for "${query}".` }],
      };
    }

    const text = results.map((r) => formatSkillSummary(r.skill, r.score)).join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${results.length} skills:\n\n${text}`,
        },
      ],
    };
  }
);

// Tool: get_skill
server.tool(
  "get_skill",
  "Load the full SKILL.md content for a specific skill by ID. Use after search_skills to get the complete instructions.",
  {
    id: z.string().describe("Skill ID (e.g. 'code-review', 'agency-frontend-developer')"),
  },
  async ({ id }) => {
    const content = await getSkillContent(id, registry);

    if (!content) {
      // Suggest close matches
      const suggestions = searchSkills(id, registry, { limit: 3 });
      const hint =
        suggestions.length > 0
          ? `\n\nDid you mean: ${suggestions.map((r) => `\`${r.skill.id}\``).join(", ")}?`
          : "";
      return {
        content: [{ type: "text" as const, text: `Skill "${id}" not found.${hint}` }],
      };
    }

    return {
      content: [{ type: "text" as const, text: content }],
    };
  }
);

// Tool: list_packs
server.tool(
  "list_packs",
  "List available skill packs — curated combinations of skills for common workflows.",
  {},
  async () => {
    if (packs.size === 0) {
      return {
        content: [{ type: "text" as const, text: "No skill packs available." }],
      };
    }

    const lines = Array.from(packs.values()).map(
      (p) =>
        `**${p.name}** (\`${p.id}\`)\n${p.description}\nSkills: ${p.skills.map((s) => `\`${s}\``).join(", ")}\n`
    );

    return {
      content: [
        {
          type: "text" as const,
          text: `Available skill packs:\n\n${lines.join("\n")}`,
        },
      ],
    };
  }
);

// Tool: get_pack
server.tool(
  "get_pack",
  "Load a skill pack — returns combined content of all skills in the pack plus the recommended workflow.",
  {
    id: z.string().describe("Pack ID (e.g. 'security-review', 'fullstack-dev')"),
  },
  async ({ id }) => {
    const pack = packs.get(id);
    if (!pack) {
      const available = Array.from(packs.keys())
        .map((k) => `\`${k}\``)
        .join(", ");
      return {
        content: [
          {
            type: "text" as const,
            text: `Pack "${id}" not found. Available packs: ${available || "none"}`,
          },
        ],
      };
    }

    const content = await resolvePackContent(pack, registry);
    return {
      content: [{ type: "text" as const, text: content }],
    };
  }
);

// --- Start ---

async function main(): Promise<void> {
  await init();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[getskill] MCP server running (${registry.size} skills, ${packs.size} packs)`);
}

main().catch((err) => {
  console.error("[getskill] Fatal error:", err);
  process.exit(1);
});
