import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importDirectory, validateDocuments } from '../src/corpus.mjs';
test('only help files can be imported, never product Python or binaries', () => {
  const root=mkdtempSync(join(tmpdir(),'dragonfly-help-'));
  try {
    writeFileSync(join(root,'help.htm'),'<h1>Threshold</h1><p>Segment image</p><script>forbidden_script()</script>');
    writeFileSync(join(root,'synthetic.py'),'synthetic_source');
    writeFileSync(join(root,'native.pyd'),'binary');
    writeFileSync(join(root,'credentials.txt'),'private');
    const args={root,sourceId:'help_fixture',version:'2027.1',kind:'help'};
    const result=importDirectory(args);
    assert.equal(result.documents.length,1);
    assert.match(result.documents[0].text,/Segment image/);
    assert.ok(!result.documents[0].text.includes('forbidden_script'));
    assert.throws(() => importDirectory({...args,kind:'source_code'}),/Only help/);
    assert.throws(() => importDirectory({...args,version:'2025.1'}),/2027.1 only/);
    assert.throws(() => validateDocuments([...result.documents,...result.documents]),/Duplicate/);
    assert.throws(() => validateDocuments([{...result.documents[0],path:'../escape'}]),/relative/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
