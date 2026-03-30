# @rulesgen/rulesgen

Analyze any codebase and auto-generate optimized AI coding assistant rules files.

Supports **CLAUDE.md**, **.cursorrules**, **copilot-instructions.md**, and **.windsurfrules** — all from a single command.

## Install

```bash
npm install -g @rulesgen/rulesgen
```

Or run directly:

```bash
npx @rulesgen/rulesgen
```

## Quick Start

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Generate rules for all tools
rulesgen generate

# Generate for specific tools only
rulesgen generate --tools claude,cursor

# Preview without writing files
rulesgen preview

# Update existing rules (merge mode)
rulesgen update
```

## What It Does

1. **Analyzes your codebase** — detects frameworks, languages, dependencies, code patterns, project structure, and git history
2. **Builds a tailored prompt** — sends the analysis to Claude to generate project-specific rules
3. **Writes optimized rules files** — outputs files tuned for each AI coding tool

```
$ rulesgen generate --tools claude,cursor

  Analyzing project...

  Detected:
    Language    TypeScript (strict)
    Framework   Next.js 14, React 18, Tailwind CSS
    Database    PostgreSQL (Prisma)
    Testing     Vitest, React Testing Library
    Package Mgr pnpm

  Generating rules...

  ✓ CLAUDE.md          (1,247 tokens)
  ✓ .cursorrules       (892 tokens)

  Done in 8.2s
```

## Commands

### `rulesgen generate [path]`

Analyze a project and generate rules files. This is the default command.

| Flag | Description | Default |
|------|-------------|---------|
| `--tools <list>` | Comma-separated: `claude`, `cursor`, `copilot`, `windsurf`, `all` | `all` |
| `--output <dir>` | Output directory | `.` |
| `--api-key <key>` | Anthropic API key | `$ANTHROPIC_API_KEY` |
| `--model <model>` | Claude model | `claude-sonnet-4-5` |
| `--depth <level>` | Analysis depth: `quick`, `standard`, `deep` | `standard` |
| `--focus <text>` | Extra context to guide generation | — |
| `--force` | Overwrite existing files without prompting | `false` |
| `--merge` | Merge with existing rules files | `false` |
| `--preview` | Print to stdout, don't write files | `false` |
| `--quiet` | Suppress output except errors | `false` |

### `rulesgen update [path]`

Re-analyze and merge updates into existing rules files. Same as `generate --merge`.

### `rulesgen preview [path]`

Dry run — prints generated rules to stdout without writing any files.

### `rulesgen init`

Create a `.rulesgenrc.json` config file in the current directory.

## Configuration

Create a `.rulesgenrc.json` in your project root:

```json
{
  "tools": ["claude", "cursor"],
  "depth": "standard",
  "focus": "This is a monorepo with shared packages",
  "ignore": ["node_modules", "dist", ".next"],
  "model": "claude-sonnet-4-5"
}
```

Also supports `rulesgen.config.js`, `.rulesgenrc.yaml`, and `package.json` `"rulesgen"` field via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig).

## Supported Languages & Frameworks

| Language | Detected From |
|----------|---------------|
| **JavaScript/TypeScript** | `package.json` — React, Next.js, Vue, Nuxt, Angular, Svelte, NestJS, Express, Fastify, Vite, Tailwind, Prisma, and 50+ more |
| **Go** | `go.mod` — Gin, Echo, Fiber, GORM, sqlx, and more |
| **Python** | `requirements.txt`, `pyproject.toml` — Django, FastAPI, Flask, SQLAlchemy, pytest, and more |

Also detects: Docker, Terraform, CDK, GitHub Actions, monorepo tools (Nx, Turborepo, Lerna).

## Analysis Depth

| Level | What it analyzes |
|-------|-----------------|
| `quick` | Project structure, dependencies, frameworks |
| `standard` | + code patterns (naming, imports, async style, tests) |
| `deep` | + git history (recent commits, contributors, recently modified files) |

## API Key

The API key is resolved in order:

1. `--api-key` flag
2. `ANTHROPIC_API_KEY` environment variable
3. `~/.rulesgen/config.json`

## Output Files

| Tool | File | Location |
|------|------|----------|
| Claude Code | `CLAUDE.md` | Project root |
| Cursor | `.cursorrules` | Project root |
| GitHub Copilot | `copilot-instructions.md` | `.github/` |
| Windsurf | `.windsurfrules` | Project root |

## License

MIT
