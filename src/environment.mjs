import { existsSync, lstatSync, readdirSync, realpathSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

export const SOURCE_FOLDERS = ['OrsPythonPlugins', 'ORSServiceClass', 'OrsHelpers', 'OrsLibraries', 'ORSModel'];
const INSTALL_NAME = /^(?:dragonfly(?:3dworld)?|comet|object.?research.?systems|ors)(?:[\s_\-.\d]|$)/i;
const versionOf = value => String(value).match(/20\d{2}\.\d+/)?.[0] || null;
const isDirectory = path => { try { return lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink(); } catch { return false; } };

export function parseRegistry(text) {
  const results = [];
  for (const block of text.split(/\r?\n(?=HKEY_)/)) {
    const fields = {};
    for (const line of block.split(/\r?\n/)) {
      const match = line.match(/^\s+(DisplayName|DisplayVersion|InstallLocation|DisplayIcon)\s+REG_(?:EXPAND_)?SZ\s+(.+)$/i);
      if (match) fields[match[1].toLowerCase()] = match[2].trim();
    }
    if (!/dragonfly/i.test(fields.displayname || '')) continue;
    const location = fields.installlocation || fields.displayicon?.replace(/,\s*-?\d+$/, '').replace(/^"|"$/g, '');
    if (location) results.push({path: location, version: versionOf(fields.displayversion || fields.displayname)});
  }
  return results;
}

function registryCandidates(platform) {
  if (platform !== 'win32') return [];
  const out = [];
  for (const key of [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ]) {
    const result = spawnSync('reg.exe', ['query', key, '/s'], {encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: 8 * 1024 * 1024});
    if (!result.error && result.status === 0) out.push(...parseRegistry(result.stdout));
  }
  return out;
}

function discoverChildren(root, depth = 2) {
  if (!isDirectory(root)) return [];
  const out = [];
  let entries;
  try { entries = readdirSync(root, {withFileTypes: true}); } catch { return out; }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || !INSTALL_NAME.test(entry.name)) continue;
    const path = join(root, entry.name);
    out.push({path, version: versionOf(entry.name)});
    if (depth > 0) out.push(...discoverChildren(path, depth - 1));
  }
  return out;
}

function normalizeCandidate(path) {
  let root = resolve(path);
  if (/\.exe$/i.test(root)) root = dirname(root);
  if (basename(root).toLowerCase() === 'bin') root = dirname(root);
  if (/\.app$/i.test(root) && existsSync(join(root, 'Contents', 'Resources', 'python'))) root = join(root, 'Contents', 'Resources');
  return root;
}

export function detectEnvironment({dragonflyPath = '', env = process.env, platform = process.platform,
  scanRoots, registryEntries, candidates = []} = {}) {
  const roots = scanRoots ?? (platform === 'win32'
    ? [...new Set([env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs'),
      ...'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => `${letter}:\\`)].filter(Boolean))]
    : ['/opt', '/usr/local', '/Applications', env.HOME && join(env.HOME, 'Applications')].filter(Boolean));
  const hints = [dragonflyPath, env.DRAGONFLY_ROOT, env.DRAGONFLY_HOME].filter(Boolean).map(path => ({path}));
  const all = [...hints, ...candidates, ...(registryEntries ?? registryCandidates(platform)), ...roots.flatMap(root => discoverChildren(root))];
  // PATH probes look only for the named program; they do not execute it.
  for (const path of (env.PATH || '').split(platform === 'win32' ? ';' : ':')) {
    if (path && existsSync(join(path, platform === 'win32' ? 'Dragonfly.exe' : 'Dragonfly'))) all.push({path});
  }
  const installations = [];
  const seen = new Set();
  for (const hint of all) {
    let root;
    try { root = normalizeCandidate(hint.path.replace(/%([^%]+)%/g, (full, key) => env[key] || full)); } catch { continue; }
    if (!isDirectory(root) || !isDirectory(join(root, 'python'))) continue;
    const executables = [join(root, 'bin', 'Dragonfly.exe'), join(root, 'Dragonfly.exe'), join(root, 'bin', 'Dragonfly'), join(root, 'Dragonfly')];
    const executable = executables.find(path => { try { return lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(); } catch { return false; } });
    if (!executable) continue;
    const sourceRoots = SOURCE_FOLDERS.map(name => join(root, 'python', name)).filter(isDirectory);
    // A product executable + the official Python layout distinguish this product from unrelated namesakes.
    if (!sourceRoots.length && !isDirectory(join(root, 'Help', 'Content'))) continue;
    root = realpathSync(root);
    const key = platform === 'win32' ? root.toLowerCase() : root;
    if (seen.has(key)) continue;
    seen.add(key);
    const helpRoot = [join(root, 'Help', 'Content'), join(root, 'help', 'Content')].find(isDirectory) || null;
    installations.push({root, version: hint.version || versionOf(root), executable, helpRoot, sourceRoots});
  }
  installations.sort((a, b) => (b.version || '').localeCompare(a.version || '', undefined, {numeric: true}) || a.root.localeCompare(b.root));
  const found = installations.length > 0;
  const hasSource = installations.some(x => x.sourceRoots.length);
  return {dragonfly_found: found, mode: hasSource ? 'help_and_local_source' : 'help_only',
    installations, default_version: installations.find(x => x.version)?.version || null,
    notice: found
      ? `Dragonfly 3D World was found (${installations.map(x => x.version || 'version unconfirmed').join(', ')}). ${hasSource ? 'Official local Python source is available for read-only searches.' : 'No readable official Python source directories were found; answers will use help documents only.'}`
      : 'Dragonfly 3D World was not found on this computer. Answers will use the bundled help documents only; local Dragonfly source is unavailable. Configure dragonflyPath if your installation is in a custom location.'};
}
