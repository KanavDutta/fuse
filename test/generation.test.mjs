import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {request as httpRequest} from 'node:http';
import {createApp} from '../server.mjs';
import {createGenerationService,validateGeneration} from '../generation.mjs';
import {generationPrompt} from '../public/generation-client.js';

async function fixture(t,fetchImpl,apiKey='test-key-not-a-real-credential'){
  const directory=await mkdtemp(path.join(os.tmpdir(),'fuse-generation-'));
  const server=createApp({directory,fetchImpl,apiKey});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    if(!path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unexpected cleanup path');
    await rm(directory,{recursive:true,force:true});});
  return {base:'http://127.0.0.1:'+server.address().port,directory};
}
const input={prompt:'Original atmospheric synth groove',duration:10,instrumental:true};
async function waitFor(base,id,status){
  for(let i=0;i<100;i++){const job=await (await fetch(base+'/api/jobs/'+id)).json();if(job.status===status)return job;await new Promise(resolve=>setTimeout(resolve,10));}
  throw Error('Job did not reach '+status);
}
const start=base=>fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});

test('generation validates provider limits without truncating prompts',()=>{
  assert.throws(()=>validateGeneration({...input,prompt:'a'.repeat(4101)}),/4,100/);
  assert.throws(()=>validateGeneration({...input,duration:2}),/duration/);
  assert.throws(()=>validateGeneration({...input,duration:10.5}),/duration/);
  assert.deepEqual(validateGeneration(input),input);
  const prompt=generationPrompt({references:[{track:'PRIVATE TITLE',artist:'PRIVATE ARTIST',qualities:'warm guitar'}],genre:'Soul',section3Lyrics:'An original hook'});
  assert.ok(prompt.includes('warm guitar'));assert.ok(prompt.includes('An original hook'));assert.ok(!prompt.includes('PRIVATE'));
});

test('successful provider request persists job and audio; playback ranges and download work',async t=>{
  const audio=Buffer.from('ID3-test-audio');let calls=0;
  const {base,directory}=await fixture(t,async(url,options)=>{
    calls++;assert.match(url,/^https:\/\/api.elevenlabs.io\/v1\/music\?/);
    assert.equal(options.headers['xi-api-key'],'test-key-not-a-real-credential');
    assert.deepEqual(JSON.parse(options.body),{prompt:input.prompt,music_length_ms:10000,force_instrumental:true,model_id:'music_v2_5'});
    return new Response(audio,{headers:{'Content-Type':'audio/mpeg'}});
  });
  const response=await start(base);assert.equal(response.status,202);const job=await response.json();
  const completed=await waitFor(base,job.id,'completed');assert.equal(calls,1);
  const metadata=await readFile(path.join(directory,job.id+'.json'),'utf8');assert.ok(!metadata.includes('test-key'));assert.ok(!metadata.includes(input.prompt));
  const range=await fetch(base+completed.audioUrl,{headers:{Range:'bytes=0-2'}});assert.equal(range.status,206);assert.equal(await range.text(),'ID3');
  assert.equal((await fetch(base+completed.audioUrl,{headers:{Range:'bytes=999-'}})).status,416);
  const download=await fetch(base+completed.audioUrl+'?download=1');assert.match(download.headers.get('content-disposition'),/attachment/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()),audio);
  const restarted=createGenerationService({directory,apiKey:'different-key'});await restarted.ready;assert.equal((await restarted.get(job.id)).status,'completed');
});

test('missing key and cross-origin or non-local hosts never call provider',async t=>{
  let calls=0;const {base}=await fixture(t,async()=>{calls++;throw Error('must not call');},'');
  assert.equal((await start(base)).status,503);
  assert.equal((await fetch(base+'/api/generate',{method:'POST',headers:{Origin:'https://untrusted.example'},body:JSON.stringify(input)})).status,403);
  const blockedHost=await new Promise((resolve,reject)=>{
    const req=httpRequest(base+'/api/generate',{method:'POST',headers:{Host:'untrusted.example'}},res=>{res.resume();resolve(res.statusCode);});
    req.on('error',reject);req.end(JSON.stringify(input));
  });
  assert.equal(blockedHost,403);
  assert.equal(calls,0);
});

test('provider rejection has actionable error without exposing provider body or key',async t=>{
  const {base}=await fixture(t,async()=>new Response('SENSITIVE PROVIDER BODY',{status:401}));
  const job=await (await start(base)).json(),failed=await waitFor(base,job.id,'failed');
  assert.match(failed.error,/API key/);assert.ok(!JSON.stringify(failed).includes('SENSITIVE'));
});

test('configured server validates input and refuses cross-origin requests before provider use',async t=>{
  let calls=0;const {base}=await fixture(t,async()=>{calls++;throw Error('must not call');});
  const status=await (await fetch(base+'/api/status')).json();assert.equal(status.connected,true);assert.equal(status.verified,false);
  assert.ok(!JSON.stringify(status).includes('test-key'));
  assert.equal((await fetch(base+'/api/generate',{method:'POST',body:JSON.stringify({...input,prompt:'a'.repeat(4101)})})).status,400);
  assert.equal((await fetch(base+'/api/generate',{method:'POST',headers:{Origin:'https://untrusted.example'},body:JSON.stringify(input)})).status,403);
  assert.equal(calls,0);
});

test('cancellation aborts provider request and prevents duplicate running requests',async t=>{
  const {base}=await fixture(t,async(_,options)=>new Promise((resolve,reject)=>{
    if(options.signal.aborted)return reject(Error('aborted'));
    options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});
  }));
  const job=await (await start(base)).json();assert.equal((await start(base)).status,409);
  const cancel=await fetch(base+'/api/jobs/'+job.id,{method:'DELETE'});assert.equal((await cancel.json()).status,'cancelled');
  assert.equal((await fetch(base+'/api/audio/'+job.id)).status,404);
});

test('server restart marks interrupted jobs failed instead of pretending to resume',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'fuse-generation-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const id='11111111-1111-1111-1111-111111111111';await writeFile(path.join(directory,id+'.json'),JSON.stringify({id,status:'running'}));
  const service=createGenerationService({directory});await service.ready;
  assert.equal((await service.get(id)).status,'failed');assert.match((await service.get(id)).error,/restarted/);
});
