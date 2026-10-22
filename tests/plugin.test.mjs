import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, Config, createTools } from '../src/index.mjs';
import { KnowledgeIndex } from '../src/retrieve.mjs';

test('plugin registers three bounded read-only tools and non-exclusive domain guidance', async () => {
  const tools = [];
  const sections = [];
  apply({tools: {register: tool => tools.push(tool)}, systemPrompt: {section: section => sections.push(section)}}, Config({}));
  assert.deepEqual(tools.map(t => t.name), ['search_dragonfly_knowledge', 'read_dragonfly_evidence', 'get_dragonfly_corpus_status']);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].interpolate, false);
  assert.ok(!sections[0].complete);
  const status = await tools[2].execute({});
  assert.ok(status.chunks > 50);
  assert.ok(status.sources.every(x => !('root' in x)));
  const result = await tools[0].execute({query: 'getAllRepresentableInstances'});
  assert.ok(result.hits.length > 0);
  assert.ok(!('text' in result.hits[0]));
  const evidence = await tools[1].execute({id: result.hits[0].id});
  assert.match(evidence.text, /getAllRepresentableInstances/);
  await assert.rejects(tools[1].execute({id: '../.credentials.yaml'}));
  await assert.rejects(tools[0].execute({query: 'mesh', limit: 200}));
});

test('missing configured corpus fails instead of silently answering from a different corpus', () => {
  assert.throws(() => apply({tools: {register() {}}, systemPrompt: {section() {}}}, Config({corpusFile: '/does-not-exist/dragonfly.json'})));
  assert.throws(() => createTools(new KnowledgeIndex([]), 0));
});
