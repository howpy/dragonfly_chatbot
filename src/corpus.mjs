import { readFileSync, lstatSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_INDEX_BYTES = 64 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const KINDS = new Set(['help']);
const OMIT = /^(?:\.|__pycache__$|node_modules$|\.git$|logs?$|cache$|dist$|build$|backup$|settings$|input\d*$|output\d*$)/i;
const PRIVATE = /(?:config|settings|credentials?|secrets?|tokens?|private|published_reports)/i;

export function validateDocuments(value) {
  if (!Array.isArray(value) || value.length > 20000) throw new Error('Corpus must be an array of at most 20000 documents');
  const ids = new Set();
  for (const doc of value) {
    if (!doc || typeof doc !== 'object') throw new Error('Invalid document');
    for (const field of ['source_id', 'path', 'title', 'text']) {
      if (typeof doc[field] !== 'string' || !doc[field] || doc[field].length > (field === 'text' ? MAX_FILE_BYTES : 1000)) throw new Error(`Invalid document ${field}`);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(doc.source_id)) throw new Error('Invalid source_id');
    if (isAbsolute(doc.path) || /^[a-z]:|^[/\\]/i.test(doc.path) || doc.path.split(/[/\\]/).includes('..')) throw new Error('Document path must be relative');
    if (doc.version !== null && (typeof doc.version !== 'string' || !doc.version.trim() || doc.version.length > 40)) throw new Error('Invalid document version');
    if (!KINDS.has(doc.kind)) throw new Error('Invalid document kind');
    if (doc.version !== '2027.1') throw new Error('The help library accepts Dragonfly 2027.1 only');
    const key = JSON.stringify([doc.source_id, doc.path, doc.version]);
    if (ids.has(key)) throw new Error('Duplicate source/path/version');
    ids.add(key);
  }
  return value;
}

export function loadCorpus(path) {
  const target = resolve(path instanceof URL ? fileURLToPath(path) : path);
  const stat = statSync(target);
  if (!stat.isFile() || stat.size > MAX_INDEX_BYTES) throw new Error('Corpus file is missing, not a file, or exceeds 64 MiB');
  const payload = JSON.parse(readFileSync(target, 'utf8').replace(/^\uFEFF/, ''));
  if (payload.schema_version !== 1) throw new Error('Unsupported corpus schema');
  return validateDocuments(payload.documents);
}

export function loadBundledHelp() {
  const base = new URL('../knowledge/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', base), 'utf8'));
  if (manifest.schema_version !== 1 || !Array.isArray(manifest.shards)) throw new Error('Invalid help manifest');
  const documents = [];
  for (const shard of manifest.shards) {
    if (!/^help-[\d.]+-\d+\.json$/.test(shard.file)) throw new Error('Invalid help shard path');
    const url = new URL(shard.file, base);
    const bytes = readFileSync(url);
    if (createHash('sha256').update(bytes).digest('hex') !== shard.sha256) throw new Error('Help integrity check failed');
    const docs = loadCorpus(url);
    if (docs.length !== shard.documents || docs.some(doc => doc.version !== shard.version)) throw new Error('Help manifest mismatch');
    documents.push(...docs);
  }
  return validateDocuments(documents);
}

function htmlText(value) {
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(?:br|\/p|\/div|\/h[1-6]|\/li|\/tr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/&#(x[\da-f]+|\d+);/gi, (match, code) => {
      const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, entity => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[entity]);
}

export function importDirectory({root, sourceId, version, kind, maxFiles = 10000}) {
  if (!/^[a-zA-Z0-9_-]+$/.test(sourceId || '')) throw new Error('sourceId must contain letters, numbers, underscores or hyphens');
  if (typeof version !== 'string' || !version.trim() || version.length > 40) throw new Error('Explicit version is required');
  if (version !== '2027.1') throw new Error('The help library accepts Dragonfly 2027.1 only');
  if (kind !== 'help') throw new Error('Only help documents may be imported. Product source must remain in the local installation.');
  const original = resolve(root);
  if (lstatSync(original).isSymbolicLink() || !statSync(original).isDirectory()) throw new Error('Root must be a real directory');
  const base = realpathSync(original);
  const documents = [];
  const skipped = [];
  let totalBytes = 0;
  let visitedFiles = 0;
  const allowed = new Set(['.md', '.txt', '.html', '.htm']);
  function walk(directory, depth) {
    if (depth > 25) throw new Error('Source directory depth exceeds 25');
    for (const entry of readdirSync(directory, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink() || OMIT.test(entry.name)) continue;
      const path = resolve(directory, entry.name);
      const rel = relative(base, path).replaceAll('\\', '/');
      if (relative(base, realpathSync(path)).split(/[/\\]/).includes('..')) throw new Error('Source escapes root');
      if (entry.isDirectory()) { walk(path, depth + 1); continue; }
      if (!entry.isFile() || !allowed.has(extname(entry.name).toLowerCase()) || PRIVATE.test(entry.name)) continue;
      if (++visitedFiles > maxFiles) throw new Error('Source file count exceeds limit; choose a narrower directory');
      const size = statSync(path).size;
      if (size > MAX_FILE_BYTES) { skipped.push({path: rel, reason: 'exceeds 2 MiB'}); continue; }
      totalBytes += size;
      if (totalBytes > 32 * 1024 * 1024) throw new Error('Import exceeds 32 MiB; choose a narrower directory');
      const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
      if (raw.includes('\0')) { skipped.push({path: rel, reason: 'binary content'}); continue; }
      let text = raw;
      const extension = extname(path).toLowerCase();
      // JSON retains actual source line numbers; HTML citations refer to extracted text lines.
      if (['.html', '.htm'].includes(extension)) text = htmlText(raw);
      if (!text.trim()) continue;
      documents.push({source_id: sourceId, path: rel, title: rel, version, kind, text,
        coordinate_system: ['.html', '.htm'].includes(extension) ? 'extracted_text_lines' : 'source_lines'});
    }
  }
  walk(base, 0);
  validateDocuments(documents);
  return {schema_version: 1, documents, skipped};
}
