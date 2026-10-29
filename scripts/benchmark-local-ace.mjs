// Deliberate live local benchmark; never included in the ordinary test suite.
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const base='http://127.0.0.1:8001';
const output=new URL('../data/local-ai/test-output.wav',import.meta.url);
const request=async(route,body)=>{
  const response=await fetch(base+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  const result=await response.json();if(!response.ok||result.code!==200)throw Error('ACE-Step request failed: '+JSON.stringify(result));return result.data;
};
let health;
for(let attempt=0;attempt<120;attempt++){
  try{health=await request('/health');if(health.models_initialized)break;}catch{}
  if(attempt%3===0)console.log('Waiting for local model initialization…');
  await new Promise(resolve=>setTimeout(resolve,5000));
}
if(!health?.models_initialized||health.llm_initialized)throw Error('Expected initialized DiT-only server with LM disabled.');
const input={prompt:'Instrumental chill synthwave with warm analog pads, crisp drums, gentle electric piano, and a relaxed original melody.',lyrics:'[Instrumental]',audio_duration:10,bpm:110,key_scale:'C major',time_signature:'4',vocal_language:'unknown',batch_size:1,thinking:false,use_format:false,use_cot_caption:false,use_cot_language:false,allow_lm_batch:false,audio_format:'wav',use_tiled_decode:true,inference_steps:8,use_random_seed:false,seed:12345};
const started=performance.now(),task=await request('/release_task',input);
if(!task.task_id)throw Error('Missing local task ID');
console.log('Local 10-second test submitted: '+task.task_id);
for(let attempt=0;attempt<180;attempt++){
  const results=await request('/query_result',{task_id_list:[task.task_id]}),job=results.find(item=>item.task_id===task.task_id);
  if(job?.status===2)throw Error('Local generation failed: '+job.result);
  if(job?.status===1){
    const result=typeof job.result==='string'?JSON.parse(job.result):job.result;
    const url=new URL(result[0].file,base);
    if(url.origin!==base||url.pathname!=='/v1/audio')throw Error('Unexpected local audio URL');
    const response=await fetch(url);if(!response.ok)throw Error('Local audio download failed');
    const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<44)throw Error('Empty local audio result');
    await mkdir(new URL('../data/local-ai/',import.meta.url),{recursive:true});await writeFile(output,bytes);
    const report={taskId:task.task_id,requestedSeconds:10,elapsedSeconds:Number(((performance.now()-started)/1000).toFixed(2)),bytes:bytes.length,output:fileURLToPath(output),settings:input};
    await writeFile(new URL('../data/local-ai/benchmark.json',import.meta.url),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));process.exit(0);
  }
  if(attempt%3===0)console.log('Waiting for local inference, elapsed '+Math.round((performance.now()-started)/1000)+' seconds');
  await new Promise(resolve=>setTimeout(resolve,5000));
}
throw Error('Local test exceeded 15 minutes. No automatic retry was submitted.');
