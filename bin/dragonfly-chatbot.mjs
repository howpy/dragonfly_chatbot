#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { writeFileSync, renameSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { importDirectory, loadCorpus, validateDocuments, MAX_INDEX_BYTES } from '../src/corpus.mjs';
import { KnowledgeIndex } from '../src/retrieve.mjs';

const usage = `dragonfly-chatbot import --root PATH --source-id ID --version VERSION --kind help|source_code|plugin_manual|technical_note --out FILE [--force]
dragonfly-chatbot search --corpus FILE --query TEXT [--version VERSION]
dragonfly-chatbot status --corpus FILE
dragonfly-chatbot merge --corpus FILE --with FILE --out FILE [--force]

Import only a documentation or Python source directory. Credentials/settings filenames,
hidden folders, symlinks, datasets and build output are excluded. Review your source directory
before import. HTML citations use extracted-text lines. Data stays local until evidence is
provided to the model service configured in Harness. No Dragonfly process is started.`;

function save(path, data, force) {
  const target = resolve(path);
  if (existsSync(target) && !force) throw new Error('Output exists; use --force to replace it');
  mkdirSync(dirname(target), {recursive: true});
  const temp = `${target}.${randomUUID()}.tmp`;
  const serialized = JSON.stringify(data, null, 2) + '\n';
  if (Buffer.byteLength(serialized, 'utf8') > MAX_INDEX_BYTES) throw new Error('Output exceeds 64 MiB; split the corpus');
  try {
    writeFileSync(temp, serialized, {encoding: 'utf8', flag: 'wx'});
    renameSync(temp, target);
  } finally { if (existsSync(temp)) unlinkSync(temp); }
  return target;
}

try {
  const command = process.argv[2];
  if (!command || ['--help', '-h', 'help'].includes(command)) { console.log(usage); }
  else {
    const {values} = parseArgs({args: process.argv.slice(3), options: {
      root: {type: 'string'}, 'source-id': {type: 'string'}, version: {type: 'string'},
      kind: {type: 'string'}, out: {type: 'string'}, force: {type: 'boolean'},
      corpus: {type: 'string'}, query: {type: 'string'}, with: {type: 'string'},
    }});
    const need = (...keys) => { for (const key of keys) if (!values[key]) throw new Error(`Missing --${key}`); };
    if (command === 'import') {
      need('root', 'source-id', 'version', 'kind', 'out');
      const corpus = importDirectory({root: values.root, sourceId: values['source-id'], version: values.version, kind: values.kind});
      if (!corpus.documents.length) throw new Error('No readable documents found; no output written');
      const out = save(values.out, corpus, values.force);
      console.log(JSON.stringify({documents: corpus.documents.length, skipped: corpus.skipped, output: out}));
    } else if (command === 'merge') {
      need('corpus', 'with', 'out');
      const documents = validateDocuments([...loadCorpus(values.corpus), ...loadCorpus(values.with)]);
      console.log(JSON.stringify({documents: documents.length, output: save(values.out, {schema_version: 1, documents}, values.force)}));
    } else if (command === 'search' || command === 'status') {
      need('corpus');
      const documents = loadCorpus(values.corpus);
      const index = new KnowledgeIndex(documents);
      if (command === 'search') { need('query'); console.log(JSON.stringify(index.search({query: values.query, version: values.version}), null, 2)); }
      else console.log(JSON.stringify({documents: documents.length, chunks: index.chunks.length, versions: [...new Set(documents.map(d => d.version))]}, null, 2));
    } else throw new Error('Unknown command');
  }
} catch (error) { console.error(`dragonfly-chatbot: ${error.message}\nRun dragonfly-chatbot --help for usage.`); process.exitCode = 1; }
