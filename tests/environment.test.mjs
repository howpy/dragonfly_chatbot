import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectEnvironment, parseRegistry } from '../src/environment.mjs';
import { LocalSourceSearch } from '../src/local-source.mjs';
import { createKnowledge, createTools } from '../src/index.mjs';
const fixture = () => mkdtempSync(join(tmpdir(),'dragonfly-detect-'));
function install(root,version) {
  const path=join(root,'Dragonfly'+version);
  mkdirSync(join(path,'bin'),{recursive:true});
  mkdirSync(join(path,'python','ORSModel'),{recursive:true});
  writeFileSync(join(path,'bin','Dragonfly.exe'),'synthetic executable fixture; never execute');
  writeFileSync(join(path,'python','ORSModel','Channel.py'),'# Synthetic fixture authored for these tests\nclass FixtureChannel:\n    def voxel_spacing(self): pass\n');
  return path;
}
const options = {env:{}, registryEntries:[], platform:'win32'};
test('absent or unrelated directories produce help-only mode', () => {
  const root=fixture();
  try {
    mkdirSync(join(root,'DragonflyUnrelated'),{recursive:true});
    const status=detectEnvironment({...options,scanRoots:[root]});
    assert.equal(status.dragonfly_found,false);
    assert.equal(status.mode,'help_only');
    assert.match(status.notice,/not found/);
  } finally {rmSync(root,{recursive:true,force:true});}
});
test('portable roots, explicit executable, registry hints and two versions deduplicate', () => {
  const root=fixture();
  try {
    const old=install(root,'2025.1'), current=install(root,'2027.1');
    const entries=parseRegistry('HKEY_LOCAL_MACHINE\\fixture\n    DisplayName    REG_SZ    Dragonfly 2027.1\n    InstallLocation    REG_SZ    '+current+'\n');
    assert.equal(entries.length,1);
    const status=detectEnvironment({...options,scanRoots:[root],dragonflyPath:join(old,'bin','Dragonfly.exe'),registryEntries:entries});
    assert.equal(status.mode,'help_and_local_source');
    assert.equal(status.installations.length,2);
    assert.equal(status.default_version,'2027.1');
    const custom=detectEnvironment({...options,scanRoots:[],env:{DRAGONFLY_ROOT:old}});
    assert.equal(custom.installations[0].version,'2025.1');
  } finally {rmSync(root,{recursive:true,force:true});}
});
test('local source is scoped, versioned, read by returned ID, and budgeted', async () => {
  const root=fixture();
  try {
    const old=install(root,'2025.1'), current=install(root,'2027.1');
    mkdirSync(join(current,'pythonUserExtensions'),{recursive:true});
    writeFileSync(join(current,'pythonUserExtensions','private.py'),'outside_marker');
    writeFileSync(join(current,'python','ORSModel','settings.py'),'secret_marker');
    writeFileSync(join(current,'python','ORSModel','binary.pyd'),'binary_marker');
    const outside=join(root,'outside'); mkdirSync(outside);
    writeFileSync(join(outside,'escaped.py'),'escaped_marker');
    symlinkSync(outside,join(current,'python','ORSModel','linked'),process.platform==='win32'?'junction':'dir');
    const environment=detectEnvironment({...options,scanRoots:[root]});
    const source=new LocalSourceSearch(environment.installations);
    const result=source.search({query:'voxel_spacing',version:'2025.1'});
    assert.equal(result.hits.length,1);
    assert.equal(result.hits[0].version,'2025.1');
    assert.match(source.read(result.hits[0].id).text,/FixtureChannel/);
    for (const query of ['outside_marker','secret_marker','binary_marker','escaped_marker']) assert.deepEqual(source.search({query}).hits,[]);
    assert.equal(new LocalSourceSearch(environment.installations,{maxFiles:1}).search({query:'voxel_spacing'}).truncated,true);
    const tools=createTools(createKnowledge({},environment));
    const found=await tools[1].execute({query:'voxel_spacing',version:'2027.1'});
    assert.equal(found.mode,'help_and_local_source');
    assert.equal((await tools[2].execute({id:found.hits[0].id})).kind,'source_code');
    assert.equal(source.read('../arbitrary'),undefined);
    assert.throws(()=>source.search({query:'x',version:{}}),/version/);
  } finally {rmSync(root,{recursive:true,force:true});}
});
