# @getskill/mcp

MCP server that gives AI agents runtime access to 159+ community-tested skills.

Agents search for what they need, load it on demand, and combine skills into workflows — no manual `~/.claude/skills/` management required.

## Quick Start

```bash
# Claude Code
claude mcp add getskill -- npx @getskill/mcp

# Any MCP-compatible client
npx @getskill/mcp
```

## What It Does

Your agent gets 4 tools:

```
search_skills  →  "frontend security"  →  ranked results with relevance scores
get_skill      →  "agency-security-engineer"  →  full SKILL.md loaded into context
list_packs     →  (no args)  →  curated skill combinations
get_pack       →  "security-review"  →  3 skills + workflow, combined
```

### Example Conversation

```
You:   Review this PR for security issues
Agent: (search_skills → finds security-engineer, code-review, compliance-auditor)
Agent: (get_skill → loads agency-security-engineer into context)
Agent: (now reviews code with full security expertise — OWASP, threat modeling, etc.)
```

The agent decides what skills it needs based on your request. You don't pre-configure anything.

## Skill Packs

Curated multi-skill combos with a recommended workflow:

| Pack | What's inside | When to use |
|------|---------------|-------------|
| `security-review` | code-review + security-engineer + compliance-auditor | PR review with security focus |
| `fullstack-dev` | frontend + backend + clean-code + jest + review | Building features end-to-end |
| `content-marketing` | content-creator + SEO + social-media + copywriting | Content campaigns |

## Skills Registry

All skills are sourced from [getskill-skills](https://github.com/GetSkill-Agent/getskill-skills) (MIT):

| Category | Count | Examples |
|----------|-------|---------|
| Engineering | 16 | Frontend Developer, Backend Architect, Security Engineer |
| Marketing | 18 | SEO Specialist, TikTok Strategist, Content Creator |
| Game Dev | 18 | Unity, Unreal, Godot, Roblox agents |
| Design | 8 | UI Designer, UX Researcher, Brand Guardian |
| Sales | 8 | Sales Coach, Deal Strategist, Pipeline Analyst |
| Testing | 8 | API Tester, Accessibility Auditor, Performance Benchmarker |
| Core | 39 | code-review, brainstorming, clean-code, nextjs-landing-page |
| + 6 more categories | 44 | Paid Media, Product, PM, Spatial, Specialized, Support |

## How It Works

```
Agent calls tool  →  MCP Server  →  GitHub API
                         ↓
                   In-memory index (frontmatter only, ~50KB)
                         ↓
                   Keyword + tag scoring (no vector DB needed at this scale)
                         ↓
                   Full SKILL.md fetched on demand per skill
```

- **Startup**: Fetches skill metadata from GitHub, builds search index
- **Search**: Weighted scoring — exact tag match (3x) > ID match (2.5x) > name (2x) > description (1x)
- **Load**: Full SKILL.md content fetched only when `get_skill` is called
- **Packs**: YAML definitions in `packs/`, resolved by combining skill contents

## Development

```bash
git clone https://github.com/GetSkill-Agent/getskill-mcp.git
cd getskill-mcp
npm install && npm run build
node build/index.js  # starts MCP server on stdio
```

### Add a Skill Pack

Create `packs/my-pack.yaml`:

```yaml
name: My Custom Pack
description: What this combination does
skills:
  - skill-id-1
  - skill-id-2
  - skill-id-3
workflow: |
  1. First do X with skill-1
  2. Then Y with skill-2
  3. Finish with Z
```

## License

MIT
