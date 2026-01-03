# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Template repository for managing Claude Skills. Skills are modular capabilities that extend Claude's functionality, packaged as directories with `SKILL.md` files.

## Repository Structure

```
skills/           # Distributable skills (zip and upload to claude.ai)
site/             # Optional Astro website for browsing/downloading skills
docs/             # Additional documentation
.claude/skills/   # Internal skills used by this repo (e.g., readme-validator)
.githooks/        # Git hooks (pre-commit validation)
```

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: skill-name          # Max 64 chars, lowercase, hyphens only
   description: What it does  # Max 1024 chars
   ---
   ```
2. Document in README.md under "Your Skills" section
3. Commit—the pre-commit hook validates documentation accuracy

## Pre-commit Hook

The hook at `.githooks/pre-commit` uses `claude -p` to validate that README descriptions accurately reflect skill functionality.

**Behavior:**
- README.md changed → validates all skills
- Skill files changed → validates only those skills
- No relevant changes → skips validation

**Setup after cloning:**
```bash
git config core.hooksPath .githooks
```

## Packaging Skills for Upload

```bash
cd skills
zip -r <skill-name>.zip <skill-name>/
```

Upload the zip to claude.ai via Settings > Features > Skills.

## References

- [Official Skills Documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Anthropic Official Skills](https://github.com/anthropics/skills)
