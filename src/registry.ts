import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SkillEntry } from "./types.js";

const SKILLS_REPO =
  "https://raw.githubusercontent.com/GetSkill-Agent/getskill-skills/main/skills";

/**
 * Parse YAML frontmatter from a SKILL.md string.
 * Avoids pulling in a full YAML parser for simple key-value frontmatter.
 */
function parseFrontmatter(content: string): Record<string, string | string[]> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const meta: Record<string, string | string[]> = {};
  const lines = match[1].split("\n");
  let currentKey = "";

  for (const line of lines) {
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      if (value === "" || value === ">") {
        // Multi-line value or list — will be populated by subsequent lines
        meta[currentKey] = "";
      } else {
        meta[currentKey] = value;
      }
    } else if (currentKey && line.match(/^\s+-\s+(.+)/)) {
      // List item
      const item = line.match(/^\s+-\s+(.+)/)![1].trim();
      const existing = meta[currentKey];
      if (Array.isArray(existing)) {
        existing.push(item);
      } else {
        meta[currentKey] = [item];
      }
    } else if (currentKey && line.match(/^\s+\S/)) {
      // Continuation of multi-line value
      const existing = meta[currentKey];
      if (typeof existing === "string") {
        meta[currentKey] = (existing + " " + line.trim()).trim();
      }
    }
  }

  return meta;
}

function toEntry(id: string, meta: Record<string, string | string[]>, filePath: string): SkillEntry {
  const tags = meta["tags"];
  return {
    id,
    name: (typeof meta["name"] === "string" ? meta["name"] : id) || id,
    description: (typeof meta["description"] === "string" ? meta["description"] : "") || "",
    tags: Array.isArray(tags) ? tags : [],
    author: (typeof meta["author"] === "string" ? meta["author"] : "") || "",
    version: (typeof meta["version"] === "string" ? meta["version"] : "1.0.0") || "1.0.0",
    allowedTools: typeof meta["allowed-tools"] === "string" ? meta["allowed-tools"] : undefined,
    filePath,
  };
}

/**
 * Load skill registry from a local skills directory.
 */
export async function loadRegistryFromDir(skillsDir: string): Promise<Map<string, SkillEntry>> {
  const registry = new Map<string, SkillEntry>();

  let entries: string[];
  try {
    entries = await readdir(skillsDir);
  } catch {
    console.error(`[getskill] Skills directory not found: ${skillsDir}`);
    return registry;
  }

  for (const entry of entries) {
    const mdPath = join(skillsDir, entry, "SKILL.md");
    try {
      const content = await readFile(mdPath, "utf-8");
      const meta = parseFrontmatter(content);
      registry.set(entry, toEntry(entry, meta, mdPath));
    } catch {
      // Skip directories without SKILL.md
    }
  }

  console.error(`[getskill] Loaded ${registry.size} skills from ${skillsDir}`);
  return registry;
}

/**
 * Fetch a single skill's index entry from GitHub.
 */
async function fetchSkillYaml(skillId: string): Promise<Record<string, string | string[]> | null> {
  const url = `${SKILLS_REPO}/${skillId}/SKILL.md`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const content = await res.text();
    return parseFrontmatter(content);
  } catch {
    return null;
  }
}

/**
 * Fetch the skill directory listing from GitHub API, then fetch each skill's frontmatter.
 */
export async function loadRegistryFromGitHub(): Promise<Map<string, SkillEntry>> {
  const registry = new Map<string, SkillEntry>();

  console.error("[getskill] Fetching skill index from GitHub...");

  try {
    const res = await fetch(
      "https://api.github.com/repos/GetSkill-Agent/getskill-skills/contents/skills"
    );
    if (!res.ok) {
      console.error(`[getskill] GitHub API error: ${res.status}`);
      return registry;
    }

    const items = (await res.json()) as Array<{ name: string; type: string }>;
    const dirs = items.filter((i) => i.type === "dir").map((i) => i.name);

    console.error(`[getskill] Found ${dirs.length} skills, fetching metadata...`);

    // Fetch in batches of 20 to avoid overwhelming GitHub
    const BATCH_SIZE = 20;
    for (let i = 0; i < dirs.length; i += BATCH_SIZE) {
      const batch = dirs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (id) => {
          const meta = await fetchSkillYaml(id);
          return { id, meta };
        })
      );

      for (const { id, meta } of results) {
        if (meta) {
          const url = `${SKILLS_REPO}/${id}/SKILL.md`;
          registry.set(id, toEntry(id, meta, url));
        }
      }
    }

    console.error(`[getskill] Indexed ${registry.size} skills from GitHub`);
  } catch (err) {
    console.error(`[getskill] Failed to fetch from GitHub: ${err}`);
  }

  return registry;
}

/**
 * Get full SKILL.md content for a skill by ID.
 */
export async function getSkillContent(
  id: string,
  registry: Map<string, SkillEntry>
): Promise<string | null> {
  const entry = registry.get(id);
  if (!entry) return null;

  // Local file path
  if (!entry.filePath.startsWith("http")) {
    try {
      return await readFile(entry.filePath, "utf-8");
    } catch {
      return null;
    }
  }

  // Remote URL
  try {
    const res = await fetch(entry.filePath);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
