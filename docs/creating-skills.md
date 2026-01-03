# Creating Skills in a Chat

You can create custom skills directly within a Claude conversation:

1. **Start a new conversation** on claude.ai
2. **Describe your skill** to Claude. For example:
   > "Help me create a skill that formats code review feedback in a consistent structure with sections for summary, issues found, and suggestions."
3. **Claude will generate** a `SKILL.md` file with proper YAML frontmatter
4. **Download the skill** when Claude offers it as a file
5. **Upload the skill** via Settings > Features > Skills

## Skill Structure

Every skill requires a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: your-skill-name
description: Brief description of what this Skill does and when to use it
---

# Your Skill Name

## Instructions
[Clear, step-by-step guidance for Claude to follow]

## Examples
[Concrete examples of using this Skill]
```

**Field requirements:**
- `name`: Maximum 64 characters, lowercase letters, numbers, and hyphens only
- `description`: Maximum 1024 characters, should explain both what the skill does and when to use it

## Adding Resources

Skills can include additional files:

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── REFERENCE.md       # Additional documentation
├── templates/
│   └── report.md      # Template files
└── scripts/
    └── process.py     # Utility scripts
```

Claude accesses these files only when needed, keeping context usage efficient.
