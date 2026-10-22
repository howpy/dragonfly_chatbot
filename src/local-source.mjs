import { readFileSync, readdirSync, lstatSync, realpathSync } from 'node:fs';
import { relative, resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { expandQuery, tokenize } from './retrieve.mjs';

const OMIT = /^(?:\.|__pycache__$|tests?$|pythonuserextensions$)/i;
const OMIT_FILE = /(?:config|settings|credentials?|secrets?|tokens?|private)/i;
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'in', 'of', 'for', 'is', 'how', 'can', 'i', 'python', 'source']);
const inside = (root, path) => { const rel = relative(root, path); return rel !== '..' && !rel.startsWith('..\\') && !rel.startsWith('../') && !/^[a-z]:/i.test(rel); };

export class LocalSourceSearch {
  constructor(installations, {maxFiles = 1200, maxBytes = 16 * 1024 * 1024} = {}) {
    this.installations = installations;
    this.maxFiles = maxFiles;
    this.maxBytes = maxBytes;
    this.catalog = null;
    this.evidence = new Map();
  }

  files() {
    if (this.catalog) return this.catalog;
    const files = [];
    for (const installation of this.installations) {
      for (const sourceRoot of installation.sourceRoots) {
        let base;
        try {
          if (lstatSync(sourceRoot).isSymbolicLink()) continue;
          base = realpathSync(sourceRoot);
          if (!inside(installation.root, base)) continue;
        } catch { continue; }
        const walk = (directory, depth) => {
          if (depth > 20 || files.length >= 20000) return;
          let entries;
          try { entries = readdirSync(directory, {withFileTypes: true}); } catch { return; }
          for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
            if (files.length >= 20000) return;
            if (entry.isSymbolicLink() || OMIT.test(entry.name)) continue;
            const path = resolve(directory, entry.name);
            if (entry.isDirectory()) { walk(path, depth + 1); continue; }
            if (entry.isFile() && entry.name.endsWith('.py') && !OMIT_FILE.test(entry.name)) files.push({path, base, installation});
          }
        };
        walk(base, 0);
      }
    }
    this.catalog = files;
    return files;
  }

  search({query, version, limit = 8}) {
    if (typeof query !== 'string' || !query.trim() || query.length > 1000) throw new Error('query must contain 1–1000 characters');
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('limit must be 1–20');
    if (version !== undefined && (typeof version !== 'string' || version.length > 40)) throw new Error('Invalid version');
    const terms = [...new Set(tokenize(expandQuery(query)))].filter(term => !STOP.has(term));
    let scannedFiles = 0, scannedBytes = 0, truncated = false;
    const results = [];
    const candidates = this.files().filter(file => !version || file.installation.version === version)
      .map(file => ({...file, priority: terms.reduce((n, term) => n + (basename(file.path).toLowerCase().includes(term) ? 1 : 0), 0)}))
      .sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path));
    if (!terms.length) return {hits: [], scanned_files: 0, truncated: false};
    for (const file of candidates) {
      if (scannedFiles >= this.maxFiles || scannedBytes >= this.maxBytes) { truncated = true; break; }
      let raw;
      try {
        if (lstatSync(file.path).isSymbolicLink() || !inside(file.base, realpathSync(file.path))) continue;
        const size = lstatSync(file.path).size;
        if (size > 2 * 1024 * 1024) continue;
        if (scannedBytes + size > this.maxBytes) { truncated = true; break; }
        raw = readFileSync(file.path, 'utf8'); scannedBytes += size; scannedFiles++;
      } catch { continue; }
      if (raw.includes('\0')) continue;
      const lines = raw.replace(/\r\n?/g, '\n').split('\n');
      let best = -1, bestScore = 0;
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        const score = terms.reduce((n, term) => n + (lower.includes(term) ? 1 : 0), 0);
        if (score > bestScore) { bestScore = score; best = i; }
      }
      if (best < 0) continue;
      const start = Math.max(0, best - 5), end = Math.min(lines.length, best + 16);
      const text = lines.slice(start, end).join('\n').slice(0, 16000);
      const path = relative(file.installation.root, file.path).replaceAll('\\', '/');
      const id = createHash('sha256').update(`${file.installation.root}\0${path}\0${start}\0${text}`).digest('hex').slice(0, 24);
      results.push({id, source_id: 'local_dragonfly_source', path, title: basename(path),
        version: file.installation.version, kind: 'source_code', line_start: start + 1, line_end: start + text.split('\n').length,
        coordinate_system: 'source_lines', text, excerpt: text.slice(0, 1200), score: bestScore + file.priority * 2,
        citation: `${path}:${start + 1} (${file.installation.version || 'version unconfirmed'}, local installation)`});
    }
    results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const hits = results.slice(0, limit);
    for (const hit of hits) this.evidence.set(hit.id, hit);
    while (this.evidence.size > 400) this.evidence.delete(this.evidence.keys().next().value);
    return {hits: hits.map(({text, ...hit}) => hit), scanned_files: scannedFiles, scanned_bytes: scannedBytes,
      truncated, note: truncated ? 'Local-source search reached its scan budget. Refine the query with an exact class or function name.' : 'Only official local Python directories were searched. Native compiled implementations are not readable.'};
  }

  read(id) { return this.evidence.get(id); }
}
