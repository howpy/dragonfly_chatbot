import Schema from '@deepseek-ai/schemastery';
import { readFileSync } from 'node:fs';
import { KnowledgeIndex } from './retrieve.mjs';
import { loadCorpus, validateDocuments } from './corpus.mjs';

export const name = 'dragonfly-chatbot';
export const inject = ['tools', 'systemPrompt'];
export const Config = Schema.object({
  corpusFile: Schema.string().default('').description('Optional absolute path to a locally imported Dragonfly corpus JSON. Restart/reload this plugin after updating it.'),
  includeManuals: Schema.boolean().default(true).description('Include bundled Prototype Apps manuals. These describe extensions, not Dragonfly built-in features.'),
  maxResults: Schema.number().min(1).max(20).step(1).default(8).description('Maximum evidence results per search.'),
});

const output = {schema: {type: 'object', additionalProperties: true},
  render: (_args, value) => [{type: 'text', text: JSON.stringify(value)}]};

export function createTools(index, maxResults = 8) {
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 20) throw new Error('maxResults must be 1–20');
  return [{
    name: 'search_dragonfly_knowledge',
    description: 'Search Dragonfly technical evidence and Prototype Apps manuals with Chinese/English terms or exact Python symbols. Version filters are strict: unspecified-version sources are excluded. Use without a version to discover available sources; do not infer compatibility.',
    parameters: {type: 'object', additionalProperties: false, properties: {
      query: {type: 'string', minLength: 1, maxLength: 1000},
      version: {type: 'string', maxLength: 40},
      kind: {type: 'string', enum: ['help', 'source_code', 'plugin_manual', 'technical_note']},
      limit: {type: 'integer', minimum: 1, maximum: maxResults},
    }, required: ['query']}, output,
    async execute(args) {
      if (!args || typeof args !== 'object') throw new Error('Search arguments required');
      if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > maxResults)) throw new Error('Requested limit exceeds configured bounds');
      const hits = index.search({...args, limit: args.limit ?? maxResults});
      return {hits, note: hits.length ? 'Read evidence IDs before answering. Unspecified version is not a compatibility claim.' : 'No matching evidence. Try fewer terms or inspect corpus status; do not invent an answer.'};
    },
  }, {
    name: 'read_dragonfly_evidence',
    description: 'Read an evidence ID returned by search_dragonfly_knowledge. Paths are not accepted. Citations identify source version and line coordinates.',
    parameters: {type: 'object', additionalProperties: false, properties: {id: {type: 'string', maxLength: 24}}, required: ['id']}, output,
    async execute(args) { return {...index.read(args?.id)}; },
  }, {
    name: 'get_dragonfly_corpus_status',
    description: 'List indexed Dragonfly source kinds, versions and document/chunk counts. Missing Help/source data means those questions may not be answerable.',
    parameters: {type: 'object', additionalProperties: false, properties: {}}, output,
    async execute() {
      const sources = new Map();
      for (const chunk of index.chunks) {
        const key = JSON.stringify([chunk.source_id, chunk.version, chunk.kind]);
        if (!sources.has(key)) sources.set(key, {source_id: chunk.source_id, version: chunk.version, kind: chunk.kind, paths: new Set(), chunks: 0});
        const item = sources.get(key); item.paths.add(chunk.path); item.chunks++;
      }
      return {sources: [...sources.values()].map(({paths, ...item}) => ({...item, documents: paths.size})),
        chunks: index.chunks.length, retrieval: 'BM25 + bilingual term aliases + exact title terms',
        note: 'Bundled manuals cover Prototype Apps extensions. Official Help and installed Python source require an explicit local import. No embedding or LLM quality claim.'};
    },
  }];
}

export function apply(ctx, config) {
  let documents = loadCorpus(new URL('../knowledge/starter.json', import.meta.url));
  if (config.includeManuals !== false) documents = documents.concat(loadCorpus(new URL('../knowledge/manuals.json', import.meta.url)));
  if (config.corpusFile) documents = documents.concat(loadCorpus(config.corpusFile));
  // A combined corpus is validated to catch source ID collisions before registration.
  const index = new KnowledgeIndex(validateDocuments(documents));
  for (const tool of createTools(index, config.maxResults ?? 8)) ctx.tools.register(tool);
  const guidance = readFileSync(new URL('../prompts/agent.md', import.meta.url), 'utf8');
  ctx.systemPrompt.section({name: 'dragonfly-chatbot:guidance', order: 5000,
    interpolate: false, text: 'Apply the following domain guidance only to Dragonfly-related questions. Preserve other tasks and host instructions.\n' + guidance});
}
