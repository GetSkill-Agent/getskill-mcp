# @getskill/mcp

MCP server for dynamic skill discovery — search, load, and compose AI agent skills at runtime.

Instead of manually installing skills to `~/.claude/skills/`, let your agent find and load the right skills on demand from 159+ community-tested skills.

## Install

### Claude Code (quick)

```bash
claude mcp add getskill -- npx @getskill/mcp
```

### Claude Code (plugin)

```bash
claude plugin add github:GetSkill-Agent/getskill-mcp
```

### Manual (any MCP client)

```bash
npx @getskill/mcp
```

## Tools

| Tool | Description |
|------|-------------|
| `search_skills` | Search skills by keyword, tags, or author |
| `get_skill` | Load full SKILL.md content by ID |
| `list_packs` | List curated skill combination packs |
| `get_pack` | Load a skill pack (combined skills + workflow) |

## Example

```
You: "Help me review this code for security issues"
Agent: (calls search_skills with "security code review")
Agent: (calls get_skill with "agency-security-engineer")
Agent: (now has full security review expertise loaded)
```

## Skill Packs

Pre-built combinations for common workflows:

| Pack | Skills |
|------|--------|
| `security-review` | code-review + security-engineer + compliance-auditor |
| `fullstack-dev` | frontend + backend + clean-code + testing + review |
| `content-marketing` | content-creator + SEO + social-media + copywriting |

## How It Works

1. On startup, fetches skill metadata from [getskill-skills](https://github.com/GetSkill-Agent/getskill-skills) on GitHub
2. Builds an in-memory index of all 159+ skills (name, description, tags)
3. Agents search via MCP tools — keyword matching with tag/name/description scoring
4. Full SKILL.md content fetched on demand when `get_skill` is called

## Development

```bash
git clone https://github.com/GetSkill-Agent/getskill-mcp.git
cd getskill-mcp
npm install
npm run build
npm run dev  # or: node build/index.js
```

## License

MIT
