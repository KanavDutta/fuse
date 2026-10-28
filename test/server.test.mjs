import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('app assets load and audio generation stays disconnected', {timeout:10000}, async () => {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('../', import.meta.url), env:{...process.env, HOST:'127.0.0.1', PORT:'3197', ELEVENLABS_API_KEY:''}, stdio:['ignore','pipe','pipe'],
  });
  try {
    await Promise.race([
      once(child.stdout, 'data'),
      once(child, 'exit').then(([code]) => {throw new Error(`Server exited: ${code}`);}),
    ]);
    const base='http://127.0.0.1:3197';
    for(const asset of ['/', '/app.js', '/song.js', '/style.css', '/mixer.js', '/mixer-dsp.js', '/audio-import.js']) {
      const response=await fetch(base+asset);
      assert.equal(response.status,200,asset);
      if(asset==='/') assert.ok((await response.text()).includes('id="songSections"'));
    }
    const status=await (await fetch(base+'/api/status')).json();assert.equal(status.connected,false);assert.equal(status.provider,null);
    const generation=await fetch(base+'/api/generate', {method:'POST'});
    assert.equal(generation.status,503);
    assert.match((await generation.json()).error,/not connected/);
  } finally {
    const stopped=once(child,'exit');
    child.kill();
    await stopped;
  }
});
