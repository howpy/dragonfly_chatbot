import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { importDirectory, validateDocuments, loadCorpus } from '../src/corpus.mjs';

test('imports explicit source types, excludes config/hidden files and records versions', () => {
  const root = mkdtempSync(join(tmpdir(), 'dragonfly-import-'));
  try {
    writeFileSync(join(root, 'channel.py'), 'def threshold():\n    return 1\n');
    writeFileSync(join(root, 'secret_config.py'), 'TOKEN = "do not import"');
    writeFileSync(join(root, '.env'), 'SECRET');
    writeFileSync(join(root, 'volume.tif'), 'binary');
    mkdirSync(join(root, '__pycache__'));
    writeFileSync(join(root, '__pycache__/hidden.py'), 'hidden');
    const corpus = importDirectory({root, sourceId: 'source', version: '2027.1', kind: 'source_code'});
    assert.deepEqual(corpus.documents.map(d => d.path), ['channel.py']);
    assert.equal(corpus.documents[0].version, '2027.1');
    assert.throws(() => importDirectory({root, sourceId: '../bad', version: '2027.1', kind: 'source_code'}));
    assert.throws(() => importDirectory({root, sourceId: 'ok', version: '', kind: 'source_code'}));
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('directory junctions do not expose sources outside configured root', () => {
  const root = mkdtempSync(join(tmpdir(), 'dragonfly-junction-'));
  const outside = mkdtempSync(join(tmpdir(), 'dragonfly-outside-'));
  try {
    writeFileSync(join(outside, 'private.py'), 'private');
    symlinkSync(outside, join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(importDirectory({root, sourceId: 'src', version: '2025.1', kind: 'source_code'}).documents.length, 0);
    assert.throws(() => importDirectory({root: join(root, 'escape'), sourceId: 'src', version: '2025.1', kind: 'source_code'}));
  } finally { rmSync(root, {recursive: true, force: true}); rmSync(outside, {recursive: true, force: true}); }
});

test('HTML is text only and citations identify extracted text lines', () => {
  const root = mkdtempSync(join(tmpdir(), 'dragonfly-html-'));
  try {
    writeFileSync(join(root, 'help.html'), '<h1>Voxel &amp; image</h1><script>secretScript()</script><p>Spacing &#x3bc;m</p>');
    const doc = importDirectory({root, sourceId: 'help', version: '2025.1', kind: 'help'}).documents[0];
    assert.match(doc.text, /Voxel & image/);
    assert.match(doc.text, /Spacing μm/);
    assert.ok(!doc.text.includes('secretScript'));
    assert.equal(doc.coordinate_system, 'extracted_text_lines');
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('invalid payloads and duplicate identities are rejected', () => {
  const doc = {source_id: 'ok', path: 'x.py', title: 'x', text: 'hello', kind: 'source_code', version: '2025.1'};
  assert.throws(() => validateDocuments([doc, doc]), /Duplicate/);
  for (const path of ['../secret', '/etc/passwd', 'C:\\secret', '\\server\\share']) assert.throws(() => validateDocuments([{...doc, path}]));
  assert.equal(loadCorpus(new URL('../knowledge/starter.json', import.meta.url)).length, 3);
});

test('CLI imports, searches and refuses accidental overwrite', () => {
  const root = mkdtempSync(join(tmpdir(), 'dragonfly-cli-'));
  const cli = fileURLToPath(new URL('../bin/dragonfly-chatbot.mjs', import.meta.url));
  try {
    const source = join(root, 'source'); mkdirSync(source);
    writeFileSync(join(source, 'channel.py'), 'def getAllRepresentableInstances(): pass');
    const out = join(root, 'corpus.json');
    const args = [cli, 'import', '--root', source, '--source-id', 'local', '--version', '2027.1', '--kind', 'source_code', '--out', out];
    assert.equal(spawnSync(process.execPath, args).status, 0);
    const result = spawnSync(process.execPath, [cli, 'search', '--corpus', out, '--query', 'getAllRepresentableInstances'], {encoding: 'utf8'});
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout)[0].version, '2027.1');
    assert.equal(spawnSync(process.execPath, args).status, 1);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
