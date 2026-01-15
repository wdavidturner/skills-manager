# Claude Skills Template

A starter template for organizing, documenting, and distributing your Claude Skills. Includes a pre-commit validation hook and an optional website for browsing and downloading skills.

## Quick Start

1. **Fork or clone** this repository
2. **Add skills** to the `skills/` directory (each skill needs a `SKILL.md`)
3. **Document** your skills in this README under "Your Skills"
4. **Set up the pre-commit hook**: `git config core.hooksPath .githooks`
5. *(Optional)* **Deploy the website** to browse and download skills

## Repository Structure

```
skills/           # Your distributable skills (zip and upload to claude.ai)
site/             # Optional: Astro website for browsing/downloading skills
docs/             # Additional documentation
.claude/skills/   # Internal skills used by this repo
.githooks/        # Git hooks (pre-commit validation)
```

## Adding a Skill

1. Create a directory under `skills/` with your skill name
2. Add a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: my-skill-name        # Max 64 chars, lowercase, hyphens only
description: What it does  # Max 1024 chars
---

Your skill instructions go here...
```

3. *(Optional)* Add additional files your skill needs (reference docs, assets, etc.)
4. Document the skill in this README under "Your Skills"
5. Commit — the pre-commit hook validates your documentation

## Packaging Skills for Upload

```bash
cd skills
zip -r my-skill.zip my-skill/
```

Upload the `.zip` to [claude.ai](https://claude.ai) via **Settings → Features → Skills**.

## Installing Skills

You can install skills directly from GitHub using [add-skill](https://github.com/vercel-labs/add-skill):

```
https://github.com/vercel-labs/add-skill?url=https://github.com/YOUR_USERNAME/YOUR_REPO/tree/main/skills/SKILL_NAME
```

This opens a page that lets users install the skill to their Claude account with one click.

**To create an install link for your skill:**

1. Push your skills repository to GitHub
2. Construct the URL: `https://github.com/vercel-labs/add-skill?url=` + your skill's GitHub path
3. Share the link or add an "Install" badge to your README

**Example:**
```markdown
[Install my-skill](https://github.com/vercel-labs/add-skill?url=https://github.com/username/skills-repo/tree/main/skills/my-skill)
```

## Your Skills

<!-- Add your skills here. Example format:

### my-skill-name
Brief description of what this skill does and when to use it.

-->

*No skills added yet. Add your first skill to `skills/` and document it here.*

---

## Skills Website (Optional)

The `site/` directory contains an Astro-based website for browsing and downloading your skills. Skills are automatically packaged as `.skill` files.

**To run locally:**
```bash
cd site
npm install
npm run dev
```

**To deploy:** The site is configured for Vercel (`vercel.json`), but works with any static host.

---

## Pre-commit Validation

The hook at `.githooks/pre-commit` uses Claude CLI (`claude -p`) to validate that README descriptions accurately reflect skill functionality.

**Setup after cloning:**
```bash
git config core.hooksPath .githooks
```

**Behavior:**
- README changed → validates all skills
- Skill files changed → validates only those skills
- No relevant changes → skips validation
- Claude CLI unavailable → falls back to basic name check

---

## Creating Skills in Claude

You can also create skills directly in Claude conversations. See [docs/creating-skills.md](docs/creating-skills.md) for instructions.

---

## Security

Use skills only from trusted sources. Review all bundled files before installing — skills can direct Claude to perform unintended actions.

---

## References

- [Official Skills Documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Anthropic Official Skills](https://github.com/anthropics/skills)
