export interface SkillEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
  author: string;
  version: string;
  allowedTools?: string;
  filePath: string;
}

export interface SearchResult {
  skill: SkillEntry;
  score: number;
}

export interface SkillPack {
  id: string;
  name: string;
  description: string;
  skills: string[];
  workflow: string;
}
