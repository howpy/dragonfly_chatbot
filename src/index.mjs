import Schema from '@deepseek-ai/schemastery';
import { readFileSync } from 'node:fs';
import { KnowledgeIndex } from './retrieve.mjs';
import { loadCorpus, loadBundledHelp, validateDocuments } from './corpus.mjs';
import { detectEnvironment } from './environment.mjs';
import { LocalSourceSearch } from './local-source.mjs';

export const name = 'dragonfly-chatbot';
export const inject = ['tools', 'systemPrompt'];
export const Config = Schema.object({
  dragonflyPath: Schema.string().default('').description('Optional Dragonfly installation directory or executable for a custom installation. Detection runs on plugin activation.'),
  helpCorpusFile: Schema.string().default('').description('Optional additional Dragonfly 2027.1 help-only corpus JSON. Product Python source is never imported or bundled.'),
  maxResults: Schema.number().min(1).max(20).step(1).default(8),
});
const output = {schema: {type: 'object', additionalProperties: true},
  render: (_args, value) => [{type: 'text', text: JSON.stringify(value)}]};

export function createKnowledge(config = {}, environment = detectEnvironment(config)) {
  const documents = loadBundledHelp();
  if (config.helpCorpusFile) documents.push(...loadCorpus(config.helpCorpusFile));
  const index = new KnowledgeIndex(validateDocuments(documents));
  const versions = [...new Set(documents.map(d => d.version).filter(Boolean))].sort((a, b) => b.localeCompare(a, undefined, {numeric: true}));
  return {index, environment, local: new LocalSourceSearch(environment.installations), versions,
    defaultVersion: environment.default_version || versions[0]};
}

export function createTools(knowledge, maxResults = 8) {
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 20) throw new Error('maxResults must be 1–20');
  const {index, environment, local, versions, defaultVersion} = knowledge;
  const contextual = value => ({...value, mode: environment.mode, notice: environment.notice});
  const searchParameters = {type: 'object', additionalProperties: false, properties: {
    query: {type: 'string', minLength: 1, maxLength: 1000}, version: {type: 'string', maxLength: 40},
    limit: {type: 'integer', minimum: 1, maximum: maxResults},
  }, required: ['query']};
  const argumentsFor = args => {
    if (!args || typeof args !== 'object') throw new Error('Search arguments required');
    if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > maxResults)) throw new Error('Requested limit exceeds configured bounds');
    return {...args, version: args.version || defaultVersion, limit: args.limit ?? maxResults};
  };
  return [{
    name: 'search_dragonfly_knowledge',
    description: 'Search official Dragonfly 3D World help with English/Chinese terms. Defaults to the detected version, otherwise newest bundled help. Version filtering is strict; never infer compatibility.',
    parameters: searchParameters, output,
    async execute(args) {
      const query = argumentsFor(args);
      const hits = index.search({...query, kind: 'help'});
      return contextual({hits, effective_version: query.version, available_help_versions: versions,
        note: hits.length ? 'Read evidence IDs before answering. Citations refer to extracted help text lines.' : 'No matching help evidence for this version. Ask before using another version; do not invent an answer.'});
    },
  }, {
    name: 'search_dragonfly_source',
    description: 'Read-only search of official Python directories in a detected local Dragonfly installation. No product source is bundled, copied into a corpus, or executed. Returned snippets enter the configured model context. Compiled implementations are unavailable.',
    parameters: searchParameters, output,
    async execute(args) {
      const query = argumentsFor(args);
      if (environment.mode === 'help_only') return contextual({hits: [], effective_version: query.version, note: 'Local source is unavailable. Use search_dragonfly_knowledge for help documents.'});
      return contextual({...local.search(query), effective_version: query.version});
    },
  }, {
    name: 'read_dragonfly_evidence',
    description: 'Read an evidence ID from either Dragonfly search tool. Arbitrary filesystem paths are never accepted. Local-source evidence expires on plugin reload.',
    parameters: {type: 'object', additionalProperties: false, properties: {id: {type: 'string', maxLength: 24}}, required: ['id']}, output,
    async execute(args) {
      const id = args?.id;
      return contextual({...(local.read(id) || index.read(id))});
    },
  }, {
    name: 'get_dragonfly_corpus_status',
    description: 'Report local Dragonfly detection, help-only fallback, detected paths and versions, and bundled help coverage. Use before answering installation or compatibility questions.',
    parameters: {type: 'object', additionalProperties: false, properties: {}}, output,
    async execute() {
      const sources = new Map();
      for (const chunk of index.chunks) {
        const key = JSON.stringify([chunk.source_id, chunk.version]);
        if (!sources.has(key)) sources.set(key, {source_id: chunk.source_id, version: chunk.version, kind: 'help', paths: new Set(), chunks: 0});
        const item = sources.get(key); item.paths.add(chunk.path); item.chunks++;
      }
      return contextual({dragonfly_found: environment.dragonfly_found, installations: environment.installations,
        default_version: defaultVersion, available_help_versions: versions,
        sources: [...sources.values()].map(({paths, ...item}) => ({...item, documents: paths.size})),
        chunks: index.chunks.length, retrieval: 'BM25, bilingual term aliases, exact title terms; bounded local-source text search'});
    },
  }];
}

export function apply(ctx, config = {}) {
  const knowledge = createKnowledge(config);
  for (const tool of createTools(knowledge, config.maxResults ?? 8)) ctx.tools.register(tool);
  const guidance = readFileSync(new URL('../prompts/agent.md', import.meta.url), 'utf8');
  ctx.systemPrompt.section({name: 'dragonfly-chatbot:guidance', order: 5000, interpolate: false,
    text: 'Apply this domain guidance only to Dragonfly-related questions. Preserve host instructions and other tasks.\n'
      + knowledge.environment.notice + '\nDefault evidence version: ' + knowledge.defaultVersion + '\n' + guidance});
}
