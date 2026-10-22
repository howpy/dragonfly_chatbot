// Release-source maintenance utility. Copies only first-party manuals allowed by
// the existing Chatbot-Plugin/build_bundled_corpus.py distribution policy.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const repo = resolve(process.argv[2] || '../..');
const project = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(repo, 'tools/full_package_sources.json'), 'utf8'));
const documents = [];
const sources = [];
for (const plugin of manifest.plugins.filter(p => p.packaged !== false).sort((a, b) => a.repo.localeCompare(b.repo))) {
  for (const name of ['manual.json', 'manual_content.json']) {
    const rel = `DragonflyPlugins/${plugin.repo}/${name}`;
    const path = resolve(repo, rel);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    const title = `${parsed.title || plugin.repo} — Prototype Apps extension`;
    documents.push({source_id: 'prototype_apps_manuals', path: `${plugin.repo}/${name}`,
      title, version: null, kind: 'plugin_manual', text: raw});
    sources.push({path: rel, sha256: createHash('sha256').update(raw).digest('hex')});
  }
}
mkdirSync(resolve(project, 'knowledge'), {recursive: true});
writeFileSync(resolve(project, 'knowledge/manuals.json'), JSON.stringify({schema_version: 1, documents}, null, 2) + '\n');
writeFileSync(resolve(project, 'knowledge/provenance.json'), JSON.stringify({
  origin: 'DragonflyPrototypeLabs first-party Prototype Apps manuals',
  policy_reference: 'DragonflyPlugins/Chatbot-Plugin/build_bundled_corpus.py',
  version_policy: 'Unspecified per-manual Dragonfly version; never assign a guessed version.',
  documents: sources,
}, null, 2) + '\n');
console.log(JSON.stringify({documents: documents.length, plugins: new Set(documents.map(d => d.path.split('/')[0])).size}));
