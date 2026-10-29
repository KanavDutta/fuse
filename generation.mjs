import {mkdir,readFile,writeFile,readdir,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {aceBase,aceReady,composeLocal} from './local-ace.mjs';

export function validateGeneration(input){
  if(!input||typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>4100)throw Error('Enter a prompt of 1–4,100 characters.');
  if(!Number.isInteger(input.duration)||input.duration<3||input.duration>240)throw Error('Choose a whole-number duration between 3 and 240 seconds.');
  if(typeof input.instrumental!=='boolean')throw Error('Choose whether this track is instrumental.');
  return {prompt:input.prompt.trim(),duration:input.duration,instrumental:input.instrumental};
}
const validId=id=>/^[0-9a-f-]{36}$/.test(id);
export async function providerFailure(response){
  const messages={401:'ElevenLabs rejected the API key or its Music permissions. Check the key and Music API access, then restart.',402:'ElevenLabs requires payment or eligible Music API credits. Check your paid plan, Music API access, and available credits before retrying.',403:'Your ElevenLabs account or key cannot access Music. Check your plan and permissions.',429:'ElevenLabs rate limit or credits limit reached. Check your account before retrying.',422:'ElevenLabs rejected the prompt or duration. Review the request before retrying.'};
  // Retain only recognized machine codes, never provider text or credential echoes.
  let code;
  try{
    const chunks=[];let size=0;
    for await(const chunk of response.body){size+=chunk.length;if(size>8192)break;chunks.push(chunk);}
    if(size<=8192){const detail=JSON.parse(Buffer.concat(chunks).toString()).detail;
      if(['missing_permissions','invalid_api_key','quota_exceeded','subscription_required','model_not_found'].includes(detail?.status))code=detail.status;
    }
  }catch{}
  const specific={missing_permissions:'ElevenLabs denied a required key permission. In API key settings, check Music Generation access. Then retry deliberately.',invalid_api_key:'ElevenLabs reports an invalid API key. Replace the local .env key and restart before retrying.',quota_exceeded:'ElevenLabs reports insufficient credits or quota. Check account limits before retrying.',subscription_required:'ElevenLabs requires an eligible Music API subscription. Check your account plan before retrying.'};
  return Object.assign(Error(specific[code]||messages[response.status]||'ElevenLabs could not complete this request. Check provider status before retrying.'),{providerStatus:response.status,providerCode:code});
}
export function createGenerationService({directory,apiKey='',fetchImpl=fetch,timeoutMs=300000,provider='elevenlabs',localBaseUrl='http://127.0.0.1:8001'}){
  if(!['elevenlabs','ace-step'].includes(provider))throw Error('Choose elevenlabs or ace-step as the generation provider.');
  if(provider==='ace-step')aceBase(localBaseUrl);
  const jobs=new Map(),controllers=new Map(),writes=new Map();let pending=false;
  async function save(job){
    const file=path.join(directory,job.id+'.json');
    const snapshot=JSON.stringify(job);
    const next=(writes.get(job.id)||Promise.resolve()).catch(()=>{}).then(async()=>{await writeFile(file+'.tmp',snapshot);await rename(file+'.tmp',file);});
    writes.set(job.id,next);await next;
  }
  const ready=(async()=>{
    await mkdir(directory,{recursive:true});
    for(const name of await readdir(directory)){
      if(!name.endsWith('.json')||!validId(name.slice(0,-5)))continue;
      try{const job=JSON.parse(await readFile(path.join(directory,name),'utf8'));
        if(job.id!==name.slice(0,-5))continue;
        if(['queued','running'].includes(job.status)){job.status='failed';job.error='Server restarted before generation completed. Review before retrying; the provider may have charged for the interrupted request.';await save(job);}
        jobs.set(job.id,job);
      }catch{}
    }
  })();
  async function run(job,input){
    const controller=new AbortController();controllers.set(job.id,controller);
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      job.status='running';await save(job);
      const response=provider==='ace-step'?await composeLocal({input,baseUrl:localBaseUrl,signal:controller.signal,fetchImpl}):await fetchImpl('https://api.elevenlabs.io/v1/music?output_format=auto',{
        method:'POST',headers:{'Content-Type':'application/json','xi-api-key':apiKey},signal:controller.signal,
        body:JSON.stringify({prompt:input.prompt,music_length_ms:input.duration*1000,force_instrumental:input.instrumental,model_id:'music_v2_5'}),
      });
      if(!response.ok){if(provider==='ace-step')throw Error('ACE-Step could not return the generated audio. Check the local engine log.');throw await providerFailure(response);}
      const type=response.headers.get('content-type')||'';
      if(!type.startsWith('audio/')&&!type.startsWith('application/octet-stream'))throw Error('Generated audio has an unexpected format.');
      job.format=type.includes('wav')?'wav':'mp3';
      const chunks=[];let size=0;
      for await(const chunk of response.body){size+=chunk.length;if(size>40*1024*1024){controller.abort();throw Error('Generated audio exceeded the 40 MB storage limit.');}chunks.push(chunk);}
      if(!size)throw Error('Generated audio file is empty.');
      if(controller.signal.aborted||job.status==='cancelled')return;
      await writeFile(path.join(directory,job.id+'.'+job.format),Buffer.concat(chunks));
      if(job.status==='cancelled'){await rm(path.join(directory,job.id+'.'+job.format),{force:true});return;}
      job.status='completed';job.audioUrl='/api/audio/'+job.id;job.completed=new Date().toISOString();await save(job);
    }catch(error){
      if(job.status!=='cancelled'){
        job.status='failed';
        if(error.providerStatus)job.providerStatus=error.providerStatus;
        if(error.providerCode)job.providerCode=error.providerCode;
        job.error=error.message?.startsWith('ElevenLabs')||error.message?.startsWith('ACE-Step')||error.message?.startsWith('Generated audio')?error.message:provider==='ace-step'?'ACE-Step local generation failed or timed out. Check the local engine log.':controller.signal.aborted?'Generation timed out. The provider may still charge; check your account before retrying.':'Generation failed due to a network or local storage error. Check your account before retrying.';
        try{await save(job);}catch{}
      }
    }finally{clearTimeout(timeout);controllers.delete(job.id);pending=false;}
  }
  void ready.catch(()=>{});
  return {
    ready,
    async start(input){
      await ready;if(provider==='elevenlabs'&&!apiKey)throw Object.assign(Error('Audio generation is not connected. Configure ELEVENLABS_API_KEY in a local .env file and restart.'),{status:503});
      let validated;try{validated=validateGeneration(input);}catch(error){error.status=400;throw error;}
      if(provider==='ace-step'){
        if(validated.duration>30||!validated.instrumental)throw Object.assign(Error('Local mode supports instrumental clips up to 30 seconds.'),{status:400});
        if(!await aceReady({baseUrl:localBaseUrl,fetchImpl}))throw Object.assign(Error('ACE-Step local engine is not ready. Run node scripts/start-local-ace.mjs and wait for model loading.'),{status:503});
      }
      if(pending)throw Object.assign(Error('A generation request is already running. Wait or cancel it first.'),{status:409});
      pending=true;
      const job={id:randomUUID(),status:'queued',created:new Date().toISOString(),duration:validated.duration,provider};
      try{await save(job);jobs.set(job.id,job);}catch(error){pending=false;throw error;}
      void run(job,validated);
      return {...job};
    },
    async get(id){await ready;if(!validId(id))return null;await writes.get(id);const job=jobs.get(id);return job?{...job}:null;},
    async cancel(id){
      await ready;const job=validId(id)?jobs.get(id):null;
      if(!job)return null;
      if(['queued','running'].includes(job.status)){job.status='cancelled';job.error=job.provider==='ace-step'?'Stopped waiting locally. The GPU task may continue.':'Cancelled locally. Provider work or charges may continue.';controllers.get(id)?.abort();await save(job);}
      return {...job};
    },
    async audio(id){await ready;if(!validId(id)||jobs.get(id)?.status!=='completed')return null;return readFile(path.join(directory,id+'.'+(jobs.get(id).format||'mp3')));},
  };
}
