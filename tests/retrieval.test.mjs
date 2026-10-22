import test from 'node:test';
import assert from 'node:assert/strict';
import { KnowledgeIndex, makeChunks, tokenize } from '../src/retrieve.mjs';
const doc = (path, text, version = '2025.1') => ({source_id: 'fixture', path, title: path, version, kind: 'source_code', text});

test('exact API symbols, Chinese bigrams and aliases retrieve English evidence', () => {
  const index = new KnowledgeIndex([doc('objects.py', 'Use getAllRepresentableInstances for object pickers.'),
    doc('spacing.py', 'The voxel spacing controls image geometry.'), doc('other.py', 'Unrelated mesh topology.')]);
  assert.equal(index.search({query: 'getAllRepresentableInstances'})[0].path, 'objects.py');
  assert.equal(index.search({query: '体素间距'})[0].path, 'spacing.py');
  assert.ok(tokenize('图像分割').includes('分割'));
});

test('strict versions never leak other or unspecified-version evidence', () => {
  const index = new KnowledgeIndex([doc('old.py', 'threshold', '2025.1'), doc('new.py', 'threshold', '2027.1'), doc('unknown.py', 'threshold', null)]);
  assert.deepEqual(index.search({query: 'threshold', version: '2025.1'}).map(x => x.path), ['old.py']);
  assert.equal(index.search({query: 'threshold', version: 'not-installed'}).length, 0);
  assert.equal(index.search({query: 'threshold'}).length, 3);
});

test('bounded reads preserve real line numbers and make long-line tails searchable', () => {
  const text = 'a'.repeat(30000) + ' find_this_unique_symbol';
  const index = new KnowledgeIndex([doc('long.py', text)]);
  const hit = index.search({query: 'find_this_unique_symbol'})[0];
  const evidence = index.read(hit.id);
  assert.equal(evidence.line_start, 1);
  assert.equal(evidence.line_end, 1);
  assert.ok(evidence.text.includes('find_this_unique_symbol'));
  assert.ok(evidence.text.length < 17000);
  assert.throws(() => index.read('../private.txt'), /Unknown evidence/);
  assert.throws(() => index.search({query: ' ', limit: 8}));
  assert.throws(() => index.search({query: 'term', limit: 100}));
  const rows = makeChunks([doc('numbered.py', Array.from({length: 100}, (_, n) => `line ${n + 1}`).join('\n'))]);
  assert.equal(rows[1].line_start, 33);
  assert.equal(rows[1].line_end, 72);
});

test('evidence IDs are deterministic and change when content changes', () => {
  assert.equal(makeChunks([doc('x.py', 'first')])[0].id, makeChunks([doc('x.py', 'first')])[0].id);
  assert.notEqual(makeChunks([doc('x.py', 'first')])[0].id, makeChunks([doc('x.py', 'second')])[0].id);
});

test('a long document cannot crowd all other evidence out of results', () => {
  const index = new KnowledgeIndex([doc('long.py', Array.from({length: 300}, () => 'threshold').join('\n')), doc('short.py', 'threshold')]);
  assert.ok(index.search({query: 'threshold'}).some(x => x.path === 'short.py'));
  assert.ok(index.search({query: 'threshold'}).filter(x => x.path === 'long.py').length <= 2);
});
