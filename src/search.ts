import type { SkillEntry, SearchResult } from "./types.js";

/**
 * Tokenize a string into lowercase words for matching.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Search skills by query string and optional filters.
 * Scoring: exact tag match (3) > word in name (2) > word in description (1)
 */
export function searchSkills(
  query: string,
  registry: Map<string, SkillEntry>,
  options: { tags?: string[]; author?: string; limit?: number } = {}
): SearchResult[] {
  const { tags: filterTags, author: filterAuthor, limit = 10 } = options;
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0 && !filterTags?.length && !filterAuthor) {
    // No query — return all, sorted by name
    return Array.from(registry.values())
      .slice(0, limit)
      .map((skill) => ({ skill, score: 1 }));
  }

  const results: SearchResult[] = [];

  for (const skill of registry.values()) {
    // Apply filters
    if (filterAuthor && skill.author.toLowerCase() !== filterAuthor.toLowerCase()) {
      continue;
    }
    if (filterTags?.length) {
      const hasAllTags = filterTags.every((t) =>
        skill.tags.some((st) => st.toLowerCase() === t.toLowerCase())
      );
      if (!hasAllTags) continue;
    }

    if (queryTokens.length === 0) {
      // Filters only, no text query
      results.push({ skill, score: 1 });
      continue;
    }

    let score = 0;
    const skillTagsLower = skill.tags.map((t) => t.toLowerCase());
    const nameTokens = tokenize(skill.name);
    const descTokens = tokenize(skill.description);
    const idTokens = tokenize(skill.id);

    for (const token of queryTokens) {
      // Exact tag match: highest weight
      if (skillTagsLower.some((t) => t === token || t.includes(token))) {
        score += 3;
      }
      // Word in skill ID
      if (idTokens.some((w) => w === token || w.includes(token))) {
        score += 2.5;
      }
      // Word in name
      if (nameTokens.some((w) => w === token || w.includes(token))) {
        score += 2;
      }
      // Word in description
      if (descTokens.some((w) => w === token || w.includes(token))) {
        score += 1;
      }
    }

    if (score > 0) {
      results.push({ skill, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
