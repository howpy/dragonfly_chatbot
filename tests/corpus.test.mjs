import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadCorpus } from '../src/corpus.mjs';
import { KnowledgeIndex } from '../src/retrieve.mjs';
const documents = loadCorpus(new URL('../knowledge/manuals.json', import.meta.url));
const index = new KnowledgeIndex(documents);

test('manual corpus provenance matches shipped content and has no declared version guesses', () => {
  const provenance = JSON.parse(readFileSync(new URL('../knowledge/provenance.json', import.meta.url), 'utf8'));
  assert.equal(documents.length, 162);
  assert.equal(new Set(documents.map(d => d.path.split('/')[0])).size, 112);
  const hashes = new Map(provenance.documents.map(d => [d.path, d.sha256]));
  for (const doc of documents) {
    assert.equal(doc.version, null);
    assert.equal(createHash('sha256').update(doc.text).digest('hex'), hashes.get(`DragonflyPlugins/${doc.path}`));
  }
});

for (const [query, expected] of [
  ['mesh surface area watertight volume', 'OverallMeasurements-Plugin/manual.json'],
  ['网格 表面积 体积 水密', 'OverallMeasurements-Plugin/manual.json'],
  ['LocateAnything 安装 environment', 'LocateAnything-Plugin/manual.json'],
  ['Elastix registration', 'Elastix-Plugin/manual.json'],
  ['BioFormatsLoader CZI', 'BioFormatsLoader-Plugin/manual.json'],
  ['Cellpose segmentation', 'Cellpose-Plugin/manual.json'],
]) {
  test(`manual regression: ${query}`, () => {
    assert.ok(index.search({query, limit: 5}).some(hit => hit.path === expected));
  });
}
