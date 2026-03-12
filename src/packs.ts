import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import YAML from "yaml";
import type { SkillEntry, SkillPack } from "./types.js";
import { getSkillContent } from "./registry.js";

/**
 * Load skill packs from a directory of YAML files.
 */
export async function loadPacks(packsDir: string): Promise<Map<string, SkillPack>> {
  const packs = new Map<string, SkillPack>();

  let entries: string[];
  try {
    entries = await readdir(packsDir);
  } catch {
    console.error(`[getskill] Packs directory not found: ${packsDir}`);
    return packs;
  }

  for (const entry of entries) {
    if (!entry.endsWith(".yaml") && !entry.endsWith(".yml")) continue;

    try {
      const content = await readFile(join(packsDir, entry), "utf-8");
      const data = YAML.parse(content) as {
        name?: string;
        description?: string;
        skills?: string[];
        workflow?: string;
      };

      if (!data.name || !data.skills?.length) continue;

      const id = basename(entry, entry.endsWith(".yaml") ? ".yaml" : ".yml");
      packs.set(id, {
        id,
        name: data.name,
        description: data.description || "",
        skills: data.skills,
        workflow: data.workflow || "",
      });
    } catch {
      console.error(`[getskill] Failed to parse pack: ${entry}`);
    }
  }

  console.error(`[getskill] Loaded ${packs.size} skill packs`);
  return packs;
}

/**
 * Resolve a skill pack: fetch all skill contents and combine with workflow.
 */
export async function resolvePackContent(
  pack: SkillPack,
  registry: Map<string, SkillEntry>
): Promise<string> {
  const sections: string[] = [];

  sections.push(`# Skill Pack: ${pack.name}\n`);
  sections.push(`> ${pack.description}\n`);

  if (pack.workflow) {
    sections.push(`## Workflow\n\n${pack.workflow}\n`);
  }

  sections.push(`## Skills (${pack.skills.length})\n`);

  for (const skillId of pack.skills) {
    const content = await getSkillContent(skillId, registry);
    if (content) {
      sections.push(`---\n\n<!-- skill: ${skillId} -->\n\n${content}\n`);
    } else {
      sections.push(`---\n\n<!-- skill: ${skillId} (not found) -->\n`);
    }
  }

  return sections.join("\n");
}
