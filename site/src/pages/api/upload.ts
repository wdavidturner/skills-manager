import type { APIRoute } from 'astro';
import JSZip from 'jszip';
import matter from 'gray-matter';

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const GITHUB_REPO = import.meta.env.GITHUB_REPO || 'wdavidturner/skills-manager';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface SkillFile {
  path: string;
  content: string;
  isBinary: boolean;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  skillName?: string;
  description?: string;
  files?: SkillFile[];
}

async function validateSkillZip(buffer: ArrayBuffer): Promise<ValidationResult> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const files: SkillFile[] = [];
    let skillMdContent: string | null = null;
    let skillMdPath: string | null = null;

    // Find SKILL.md - could be at root or in a subdirectory
    for (const [path, file] of Object.entries(zip.files)) {
      if (file.dir) continue;

      const fileName = path.split('/').pop();
      if (fileName === 'SKILL.md') {
        skillMdContent = await file.async('string');
        skillMdPath = path;
        break;
      }
    }

    if (!skillMdContent || !skillMdPath) {
      return { valid: false, error: 'No SKILL.md found in the uploaded file' };
    }

    // Parse frontmatter
    let parsed;
    try {
      parsed = matter(skillMdContent);
    } catch {
      return { valid: false, error: 'Invalid SKILL.md format - could not parse frontmatter' };
    }

    const { name, description } = parsed.data;

    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'SKILL.md missing required "name" field in frontmatter' };
    }

    if (!description || typeof description !== 'string') {
      return { valid: false, error: 'SKILL.md missing required "description" field in frontmatter' };
    }

    // Validate name format
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      return { valid: false, error: 'Skill name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens' };
    }

    if (name.length > 64) {
      return { valid: false, error: 'Skill name must be 64 characters or less' };
    }

    if (description.length > 1024) {
      return { valid: false, error: 'Description must be 1024 characters or less' };
    }

    // Determine the base path (if SKILL.md is in a subdirectory)
    const basePath = skillMdPath.includes('/')
      ? skillMdPath.substring(0, skillMdPath.lastIndexOf('/') + 1)
      : '';

    // Extract all files, rebasing paths relative to SKILL.md location
    for (const [path, file] of Object.entries(zip.files)) {
      if (file.dir) continue;

      // Skip files not under the base path
      if (basePath && !path.startsWith(basePath)) continue;

      // Rebase path relative to SKILL.md
      const relativePath = basePath ? path.substring(basePath.length) : path;

      // Check if file is binary (images, fonts, etc.)
      const ext = path.split('.').pop()?.toLowerCase() || '';
      const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'ttf', 'otf', 'woff', 'woff2', 'eot', 'pdf', 'zip'];
      const isBinary = binaryExts.includes(ext);

      let content: string;
      if (isBinary) {
        // Store as base64 for binary files
        const uint8 = await file.async('uint8array');
        content = btoa(String.fromCharCode(...uint8));
      } else {
        content = await file.async('string');
      }

      files.push({
        path: `skills/${name}/${relativePath}`,
        content,
        isBinary,
      });
    }

    return {
      valid: true,
      skillName: name,
      description,
      files,
    };
  } catch {
    return { valid: false, error: 'Failed to read zip file - is this a valid .skill file?' };
  }
}

async function createPullRequest(
  skillName: string,
  description: string,
  files: SkillFile[]
): Promise<{ prUrl: string }> {
  const [owner, repo] = GITHUB_REPO.split('/');
  const branchName = `add-skill/${skillName}-${Date.now()}`;

  // Get default branch SHA
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!repoRes.ok) {
    throw new Error('Failed to fetch repository info');
  }

  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  // Get the SHA of the default branch
  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  if (!refRes.ok) {
    throw new Error('Failed to fetch branch reference');
  }

  const refData = await refRes.json();
  const baseSha = refData.object.sha;

  // Create blobs for each file
  const blobPromises = files.map(async (file) => {
    const blobRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: file.content,
          encoding: file.isBinary ? 'base64' : 'utf-8',
        }),
      }
    );

    if (!blobRes.ok) {
      throw new Error(`Failed to create blob for ${file.path}`);
    }

    const blobData = await blobRes.json();
    return {
      path: file.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: blobData.sha,
    };
  });

  const treeItems = await Promise.all(blobPromises);

  // Create tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_tree: baseSha,
        tree: treeItems,
      }),
    }
  );

  if (!treeRes.ok) {
    throw new Error('Failed to create tree');
  }

  const treeData = await treeRes.json();

  // Create commit
  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add skill: ${skillName}`,
        tree: treeData.sha,
        parents: [baseSha],
      }),
    }
  );

  if (!commitRes.ok) {
    throw new Error('Failed to create commit');
  }

  const commitData = await commitRes.json();

  // Create branch
  const branchRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: commitData.sha,
      }),
    }
  );

  if (!branchRes.ok) {
    throw new Error('Failed to create branch');
  }

  // Create PR
  const fileList = files.map((f) => `- \`${f.path}\``).join('\n');
  const prBody = `## New Skill: \`${skillName}\`

${description}

---

### Files Added
${fileList}

---

*Uploaded via [Skills Library](${repoData.homepage || `https://github.com/${GITHUB_REPO}`})*`;

  const prRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Add skill: ${skillName}`,
        body: prBody,
        head: branchName,
        base: defaultBranch,
      }),
    }
  );

  if (!prRes.ok) {
    const errorData = await prRes.json();
    throw new Error(errorData.message || 'Failed to create pull request');
  }

  const prData = await prRes.json();
  return { prUrl: prData.html_url };
}

export const POST: APIRoute = async ({ request }) => {
  // Check for GitHub token
  if (!GITHUB_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Server not configured: missing GITHUB_TOKEN' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large (max 10MB)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file extension
    if (!file.name.endsWith('.skill') && !file.name.endsWith('.zip')) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Please upload a .skill file' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const buffer = await file.arrayBuffer();
    const validation = await validateSkillZip(buffer);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if skill already exists
    const [owner, repo] = GITHUB_REPO.split('/');
    const existsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/skills/${validation.skillName}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (existsRes.ok) {
      return new Response(
        JSON.stringify({ error: `A skill named "${validation.skillName}" already exists` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create the PR
    const { prUrl } = await createPullRequest(
      validation.skillName!,
      validation.description!,
      validation.files!
    );

    return new Response(
      JSON.stringify({ success: true, prUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Upload failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
