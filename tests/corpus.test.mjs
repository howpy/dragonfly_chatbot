import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBundledHelp, validateDocuments } from '../src/corpus.mjs';
import { KnowledgeIndex } from '../src/retrieve.mjs';
const documents = loadBundledHelp();
const index = new KnowledgeIndex(documents);
test('manifest integrity, help-only content, exact versions and legal notices', () => {
  assert.equal(documents.length, 525);
  assert.equal(documents.filter(d => d.version === '2025.1').length, 0);
  assert.equal(documents.filter(d => d.version === '2027.1').length, 525);
  assert.ok(documents.every(d => d.kind === 'help' && /\.html?$/i.test(d.path)));
  for (const version of ['2027.1']) assert.ok(documents.some(d => d.version === version && d.path === 'Notices.htm' && /Comet Technologies Canada Inc/.test(d.text)));
  assert.throws(() => validateDocuments([{source_id:'x', path:'x.py', title:'x', text:'synthetic', kind:'source_code', version:'2027.1'}]), /kind/);
});
for (const query of ['threshold segmentation', 'voxel spacing', '图像分割', 'registration', 'deep learning']) {
  test(`official help retrieves ${query} with strict versions`, () => {
    const hits = index.search({query, version:'2027.1'});
    assert.ok(hits.length);
    assert.ok(hits.every(h => h.version === '2027.1'));
    assert.ok(index.read(hits[0].id).text.length);
  });
}
