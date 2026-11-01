// Scans content/**/*.md and writes dist/ (site files + content + posts.json).
// Run by the GitHub Actions workflow on every push. No dependencies.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const CONTENT = 'content';
const OUT = 'dist';

if (!existsSync(CONTENT)) {
  console.error(`No "${CONTENT}" folder found. Create it and add .md files.`);
  process.exit(1);
}

// Files and folders starting with "_" or "." are ignored and never published (use "_" for drafts).
const hidden = (name) => name.startsWith('_') || name.startsWith('.');

function walk(rel = []) {
  const out = [];
  for (const e of readdirSync(join(CONTENT, ...rel), { withFileTypes: true })) {
    if (hidden(e.name)) continue;
    if (e.isDirectory()) out.push(...walk([...rel, e.name]));
    else if (e.isFile() && extname(e.name).toLowerCase() === '.md') out.push([...rel, e.name]);
  }
  return out;
}

// "01-Pods.md" -> "Pods" (the number only controls order). Folder underscores become spaces.
const stripPrefix = (s) => s.replace(/^\d+[-_. ]+/, '');
const folderName = (s) => stripPrefix(s).replace(/_/g, ' ').trim();
const fileTitle = (s) => stripPrefix(s.replace(/\.md$/i, '')).replace(/[-_]+/g, ' ').trim();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function parseFrontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) data[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { data, body: text.slice(m[0].length) };
}

function firstCommitDate(file) {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%cs', '--', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .trim().split('\n').filter(Boolean);
    return out.length ? out[out.length - 1] : '';
  } catch { return ''; }
}

const excerptOf = (body) => body
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[#>*_`|\-]+/g, ' ')
  .replace(/\s+/g, ' ').trim().slice(0, 600);

const col = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const files = walk().sort((a, b) => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const c = col.compare(a[i], b[i]);
    if (c) return c;
  }
  return a.length - b.length;
});

const today = new Date().toISOString().slice(0, 10);
const used = new Set();
const posts = [];

for (const parts of files) {
  const file = parts.join('/');
  const { data, body } = parseFrontMatter(readFileSync(join(CONTENT, ...parts), 'utf8'));
  if (/^(true|yes)$/i.test(data.draft || '')) continue;

  let id = slug(file.replace(/\.md$/i, '')) || 'note';
  for (let n = 2; used.has(id); n++) id = `${slug(file.replace(/\.md$/i, ''))}-${n}`;
  used.add(id);

  const date = /^\d{4}-\d{2}-\d{2}/.test(data.date || '') ? data.date.slice(0, 10) : (firstCommitDate(join(CONTENT, file)) || today);
  const tags = (data.tags || '').replace(/^\[|\]$/g, '').split(',').map((t) => t.trim()).filter(Boolean);
  const words = body.split(/\s+/).filter(Boolean).length;

  posts.push({
    id,
    file,
    dir: parts.slice(0, -1).join('/'),
    folders: parts.slice(0, -1).map(folderName),
    title: data.title || fileTitle(parts[parts.length - 1]),
    date,
    tags,
    mins: Math.max(1, Math.ceil(words / 200)),
    excerpt: excerptOf(body),
  });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const f of ['index.html', 'style.css', 'app.js', 'CNAME']) {
  if (existsSync(f)) cpSync(f, join(OUT, f));
}
cpSync(CONTENT, join(OUT, 'content'), { recursive: true, filter: (src) => src === CONTENT || !hidden(basename(src)) });
writeFileSync(join(OUT, 'posts.json'), JSON.stringify(posts));
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`Built ${posts.length} note${posts.length === 1 ? '' : 's'} into ${OUT}/`);
