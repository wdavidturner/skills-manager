#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import archiver from 'archiver';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILLS_DIR = path.resolve(__dirname, '../../skills');
const OUTPUT_DIR = path.resolve(__dirname, '../public/skills');
const DATA_FILE = path.resolve(__dirname, '../src/skills-data.json');

async function getGitLastModified(filePath) {
  try {
    const result = execSync(
      `git log -1 --format=%cI -- "${filePath}"`,
      { encoding: 'utf-8', cwd: path.dirname(filePath) }
    ).trim();
    return result || null;
  } catch {
    return null;
  }
}

async function getLastModified(dirPath) {
  // Try git first
  const gitDate = await getGitLastModified(dirPath);
  if (gitDate) return gitDate;

  // Fallback to file stat
  const stats = fs.statSync(dirPath);
  return stats.mtime.toISOString();
}

function createZip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, path.basename(sourceDir));
    archive.finalize();
  });
}

async function buildSkills() {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Clean existing .skill files
  const existingFiles = fs.readdirSync(OUTPUT_DIR);
  for (const file of existingFiles) {
    if (file.endsWith('.skill')) {
      fs.unlinkSync(path.join(OUTPUT_DIR, file));
    }
  }

  // Read all skill directories
  const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const skills = [];

  for (const skillName of skillDirs) {
    const skillDir = path.join(SKILLS_DIR, skillName);
    const skillFile = path.join(skillDir, 'SKILL.md');

    if (!fs.existsSync(skillFile)) {
      console.warn(`Skipping ${skillName}: no SKILL.md found`);
      continue;
    }

    // Parse SKILL.md frontmatter
    const content = fs.readFileSync(skillFile, 'utf-8');
    const { data: frontmatter } = matter(content);

    if (!frontmatter.name || !frontmatter.description) {
      console.warn(`Skipping ${skillName}: missing name or description in frontmatter`);
      continue;
    }

    // Get last modified date
    const lastModified = await getLastModified(skillDir);

    // Create .skill file (zip)
    const outputPath = path.join(OUTPUT_DIR, `${frontmatter.name}.skill`);
    const size = await createZip(skillDir, outputPath);

    skills.push({
      name: frontmatter.name,
      description: frontmatter.description,
      filename: `${frontmatter.name}.skill`,
      lastModified,
      sizeBytes: size
    });

    console.log(`Built: ${frontmatter.name}.skill (${size} bytes)`);
  }

  // Sort by name
  skills.sort((a, b) => a.name.localeCompare(b.name));

  // Write skills data
  fs.writeFileSync(DATA_FILE, JSON.stringify(skills, null, 2));
  console.log(`\nGenerated ${DATA_FILE} with ${skills.length} skills`);
}

buildSkills().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
