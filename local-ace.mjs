import {setTimeout as delay} from 'node:timers/promises';

export function aceBase(value='http://127.0.0.1:8001'){
  const url=new URL(value);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('ACE-Step must use a loopback HTTP server URL.');
  return url.origin;
}
export async function aceReady({baseUrl,fetchImpl=fetch}){
  try{
    const response=await fetchImpl(aceBase(baseUrl)+'/health',{signal:AbortSignal.timeout(3000)});
    const result=await response.json();return response.ok&&result.code===200&&result.data?.models_initialized===true;
  }catch{return false;}
}
export async function composeLocal({input,baseUrl,signal,fetchImpl=fetch,pollMs=2000}){
  const base=aceBase(baseUrl);
  if(input.duration>30)throw Error('ACE-Step local mode currently supports clips up to 30 seconds.');
  if(!input.instrumental)throw Error('ACE-Step local mode currently supports instrumentals. Enable Instrumental only.');
  const json=async(route,body)=>{
    const response=await fetchImpl(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
    const result=await response.json();if(!response.ok||result.code!==200)throw Error('ACE-Step rejected the local request. Check the local engine log.');return result.data;
  };
  const tempo=Number(input.prompt.match(/Tempo:\s*(\d+)\s*BPM/i)?.[1]||110);
  const key=input.prompt.match(/Key and meter:\s*([A-G](?:#|b)?\s+(?:major|minor))/i)?.[1]||'C major';
  const task=await json('/release_task',{prompt:'Instrumental music, no vocals. '+input.prompt,lyrics:'[Instrumental]',audio_duration:input.duration,batch_size:1,thinking:false,use_format:false,use_cot_caption:false,use_cot_language:false,allow_lm_batch:false,audio_format:'wav',use_tiled_decode:true,inference_steps:8,bpm:tempo>=40&&tempo<=240?tempo:110,key_scale:key,time_signature:'4',vocal_language:'unknown'});
  if(!task.task_id)throw Error('ACE-Step returned no local task ID.');
  while(!signal.aborted){
    const jobs=await json('/query_result',{task_id_list:[task.task_id]}),job=jobs.find(item=>item.task_id===task.task_id);
    if(job?.status===2)throw Error('ACE-Step could not generate this clip. Check the local engine log.');
    if(job?.status===1){
      const files=typeof job.result==='string'?JSON.parse(job.result):job.result;
      const url=new URL(files[0].file,base);
      if(url.origin!==base||url.pathname!=='/v1/audio')throw Error('ACE-Step returned an unexpected audio URL.');
      return fetchImpl(url.href,{signal});
    }
    await delay(pollMs,undefined,{signal});
  }
  throw Error('ACE-Step local request cancelled. The GPU task may continue.');
}
