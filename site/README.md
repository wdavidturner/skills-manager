# Skills Library Site

An Astro site for browsing and downloading Claude Skills.

## Development

```bash
cd site
npm install
npm run dev
```

This will:
1. Build `.skill` files from `../skills/`
2. Generate `src/skills-data.json`
3. Start the dev server at http://localhost:4321

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build skills + start dev server |
| `npm run build` | Build skills + production build |
| `npm run build:skills` | Only regenerate skills data |
| `npm run preview` | Preview production build |
