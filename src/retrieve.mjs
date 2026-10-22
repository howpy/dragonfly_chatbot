import { createHash } from 'node:crypto';

const aliases = [
  ['阈值', 'threshold'], ['分割', 'segmentation'], ['体素', 'voxel'], ['间距', 'spacing'],
  ['网格', 'mesh'], ['表面积', 'surface area'], ['体积', 'volume'], ['孔隙', 'porosity'],
  ['配准', 'registration'], ['深度学习', 'deep learning'], ['训练', 'training'],
  ['推理', 'inference'], ['环境', 'environment'], ['安装', 'install setup'],
  ['菜单', 'menu'], ['插件', 'plugin'], ['源码', 'source python'], ['报错', 'error'],
  ['通道', 'channel'], ['对象列表', 'representable object'], ['裁剪', 'crop'],
];

export function tokenize(text) {
  const lower = text.toLowerCase();
  const tokens = lower.match(/[a-z_][a-z_0-9]*|\d+(?:\.\d+)+/g) || [];
  for (const run of lower.match(/[\u3400-\u9fff]+/gu) || []) {
    if (run.length === 1) tokens.push(run);
    for (let i = 0; i < run.length - 1; i++) tokens.push(run.slice(i, i + 2));
  }
  return tokens;
}

export function expandQuery(query) {
  return query + ' ' + aliases.filter(([zh]) => query.includes(zh)).map(([, en]) => en).join(' ');
}

export function makeChunks(documents) {
  const result = [];
  for (const doc of documents) {
    const lines = doc.text.replace(/\r\n?/g, '\n').split('\n').flatMap((text, i) => {
      const parts = [];
      for (let offset = 0; offset < Math.max(text.length, 1); offset += 400) parts.push({text: text.slice(offset, offset + 400), number: i + 1});
      return parts;
    });
    // Long lines split into bounded parts while retaining original line coordinates.
    for (let start = 0; start < lines.length; start += 32) {
      const section = lines.slice(start, start + 40);
      const text = section.map(line => line.text).join('\n');
      if (!text.trim()) continue;
      const fingerprint = createHash('sha256').update(`${doc.source_id}\0${doc.path}\0${doc.version}\0${start}\0${text}`).digest('hex').slice(0, 24);
      result.push({id: fingerprint, source_id: doc.source_id, path: doc.path,
        title: doc.title, version: doc.version, kind: doc.kind,
        line_start: section[0].number, line_end: section.at(-1).number, text,
        coordinate_system: doc.coordinate_system || 'source_lines',
        citation: `${doc.source_id}/${doc.path}:${section[0].number} (${doc.version || 'version unspecified'})`});
      if (start + 40 >= lines.length) break;
    }
  }
  return result;
}

export class KnowledgeIndex {
  constructor(documents) {
    this.chunks = makeChunks(documents);
    this.byId = new Map(this.chunks.map(c => [c.id, c]));
    this.df = new Map();
    this.rows = this.chunks.map(chunk => {
      const tokens = tokenize(`${chunk.title}\n${chunk.path}\n${chunk.text}`);
      const counts = new Map();
      for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
      for (const token of counts.keys()) this.df.set(token, (this.df.get(token) || 0) + 1);
      return {chunk, counts, length: tokens.length};
    });
    this.averageLength = this.rows.reduce((n, r) => n + r.length, 0) / (this.rows.length || 1) || 1;
  }

  search({query, version, kind, limit = 8}) {
    if (typeof query !== 'string' || !query.trim() || query.length > 1000) throw new Error('query must contain 1–1000 characters');
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('limit must be an integer from 1 to 20');
    if (version !== undefined && (typeof version !== 'string' || version.length > 40)) throw new Error('Invalid version');
    if (kind !== undefined && !['help', 'source_code', 'plugin_manual', 'technical_note'].includes(kind)) throw new Error('Invalid kind');
    const terms = [...new Set(tokenize(expandQuery(query)))];
    const exactTerms = [...new Set(tokenize(query).filter(x => /^[a-z_]/.test(x)))];
    const hits = [];
    for (const row of this.rows) {
      const c = row.chunk;
      // Unspecified and other-version sources must never enter a strict version query.
      if (version && c.version !== version) continue;
      if (kind && c.kind !== kind) continue;
      let score = 0;
      for (const term of terms) {
        const tf = row.counts.get(term) || 0;
        if (!tf) continue;
        const idf = Math.log(1 + (this.rows.length - this.df.get(term) + 0.5) / (this.df.get(term) + 0.5));
        score += idf * tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * row.length / this.averageLength));
      }
      if (score <= 0) continue;
      const titleTerms = new Set(tokenize(`${c.path} ${c.title}`));
      score += exactTerms.filter(term => titleTerms.has(term)).length * 1.5;
      hits.push({...c, score: Math.round(score * 1000) / 1000, excerpt: c.text.slice(0, 1200)});
    }
    hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    // Limit adjacent duplicates so long manuals cannot occupy the whole evidence budget.
    const perDocument = new Map();
    return hits.filter(hit => {
      const key = `${hit.source_id}/${hit.path}`;
      const count = perDocument.get(key) || 0;
      perDocument.set(key, count + 1);
      return count < 2;
    }).slice(0, limit).map(({text, ...hit}) => hit);
  }

  read(id) {
    if (typeof id !== 'string' || !this.byId.has(id)) throw new Error('Unknown evidence ID; use search_dragonfly_knowledge first');
    return this.byId.get(id);
  }
}
