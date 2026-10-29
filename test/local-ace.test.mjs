import test from 'node:test';
import assert from 'node:assert/strict';
import {aceBase,aceReady,composeLocal} from '../local-ace.mjs';

test('local backend refuses external URLs and reports engine readiness',async()=>{
  assert.throws(()=>aceBase('https://remote.example'),/loopback/);
  assert.throws(()=>aceBase('http://localhost:8001/other'),/loopback/);
  assert.equal(await aceReady({fetchImpl:async()=>new Response(JSON.stringify({code:200,data:{models_initialized:true}}))}),true);
  assert.equal(await aceReady({fetchImpl:async()=>{throw Error('offline');}}),false);
});

test('local requests enforce low-memory settings and never use paid API credentials',async()=>{
  const calls=[];
  const response=await composeLocal({input:{prompt:'Original chill groove',duration:10,instrumental:true},signal:new AbortController().signal,pollMs:0,fetchImpl:async(url,options)=>{
    calls.push(url);assert.ok(url.startsWith('http://127.0.0.1:8001/'));
    assert.equal(options.headers?.['xi-api-key'],undefined);
    if(url.endsWith('/release_task')){const body=JSON.parse(options.body);assert.equal(body.batch_size,1);assert.equal(body.thinking,false);assert.equal(body.audio_duration,10);return Response.json({code:200,data:{task_id:'test'}});}
    if(url.endsWith('/query_result'))return Response.json({code:200,data:[{task_id:'test',status:1,result:JSON.stringify([{file:'/v1/audio?path=test.wav'}])}]});
    return new Response('test-wav',{headers:{'Content-Type':'audio/wav'}});
  }});
  assert.equal(await response.text(),'test-wav');assert.equal(calls.length,3);
});

test('local mode rejects long/vocal requests and unsafe audio result URLs',async()=>{
  const signal=new AbortController().signal;
  await assert.rejects(()=>composeLocal({input:{duration:60,instrumental:true},signal}),/30 seconds/);
  await assert.rejects(()=>composeLocal({input:{duration:10,instrumental:false},signal}),/instrumentals/);
  await assert.rejects(()=>composeLocal({input:{duration:10,instrumental:true,prompt:'test'},signal,fetchImpl:async url=>Response.json({code:200,data:url.endsWith('/release_task')?{task_id:'test'}:[{task_id:'test',status:1,result:'[{"file":"https://remote.example/audio"}]'}]})}),/unexpected audio URL/);
});
