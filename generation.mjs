import {mkdir,readFile,writeFile,readdir,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export function validateGeneration(input){
  if(!input||typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>4100)throw Error('Enter a prompt of 1–4,100 characters.');
  if(!Number.isInteger(input.duration)||input.duration<3||input.duration>240)throw Error('Choose a whole-number duration between 3 and 240 seconds.');
  if(typeof input.instrumental!=='boolean')throw Error('Choose whether this track is instrumental.');
  return {prompt:input.prompt.trim(),duration:input.duration,instrumental:input.instrumental};
}
const validId=id=>/^[0-9a-f-]{36}$/.test(id);
export function createGenerationService({directory,apiKey='',fetchImpl=fetch,timeoutMs=300000}){
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
      const response=await fetchImpl('https://api.elevenlabs.io/v1/music?output_format=auto',{
        method:'POST',headers:{'Content-Type':'application/json','xi-api-key':apiKey},signal:controller.signal,
        body:JSON.stringify({prompt:input.prompt,music_length_ms:input.duration*1000,force_instrumental:input.instrumental,model_id:'music_v2_5'}),
      });
      if(!response.ok){
        const messages={401:'ElevenLabs rejected the API key or its Music permissions. Check the key and Music API access, then restart.',403:'Your ElevenLabs account or key cannot access Music. Check your plan and permissions.',429:'ElevenLabs rate limit or credits limit reached. Check your account before retrying.',422:'ElevenLabs rejected the prompt or duration. Review the request before retrying.'};
        throw Error(messages[response.status]||'ElevenLabs could not complete this request. Check provider status before retrying.');
      }
      const type=response.headers.get('content-type')||'';
      if(!type.startsWith('audio/')&&!type.startsWith('application/octet-stream'))throw Error('ElevenLabs returned an unexpected audio format.');
      const chunks=[];let size=0;
      for await(const chunk of response.body){size+=chunk.length;if(size>40*1024*1024){controller.abort();throw Error('Generated audio exceeded the 40 MB storage limit.');}chunks.push(chunk);}
      if(!size)throw Error('ElevenLabs returned an empty audio file.');
      if(controller.signal.aborted||job.status==='cancelled')return;
      await writeFile(path.join(directory,job.id+'.mp3'),Buffer.concat(chunks));
      if(job.status==='cancelled'){await rm(path.join(directory,job.id+'.mp3'),{force:true});return;}
      job.status='completed';job.audioUrl='/api/audio/'+job.id;job.completed=new Date().toISOString();await save(job);
    }catch(error){
      if(job.status!=='cancelled'){
        job.status='failed';
        job.error=error.message?.startsWith('ElevenLabs')||error.message?.startsWith('Generated audio')?error.message:controller.signal.aborted?'Generation timed out. The provider may still charge; check your account before retrying.':'Generation failed due to a network or local storage error. Check your account before retrying.';
        try{await save(job);}catch{}
      }
    }finally{clearTimeout(timeout);controllers.delete(job.id);pending=false;}
  }
  void ready.catch(()=>{});
  return {
    ready,
    async start(input){
      await ready;if(!apiKey)throw Object.assign(Error('Audio generation is not connected. Configure ELEVENLABS_API_KEY in a local .env file and restart.'),{status:503});
      let validated;try{validated=validateGeneration(input);}catch(error){error.status=400;throw error;}
      if(pending)throw Object.assign(Error('A generation request is already running. Wait or cancel it first.'),{status:409});
      pending=true;
      const job={id:randomUUID(),status:'queued',created:new Date().toISOString(),duration:validated.duration};
      try{await save(job);jobs.set(job.id,job);}catch(error){pending=false;throw error;}
      void run(job,validated);
      return {...job};
    },
    async get(id){await ready;return validId(id)?jobs.get(id):null;},
    async cancel(id){
      await ready;const job=validId(id)?jobs.get(id):null;
      if(!job)return null;
      if(['queued','running'].includes(job.status)){job.status='cancelled';job.error='Cancelled locally. Provider work or charges may continue.';controllers.get(id)?.abort();await save(job);}
      return {...job};
    },
    async audio(id){await ready;if(!validId(id)||jobs.get(id)?.status!=='completed')return null;return readFile(path.join(directory,id+'.mp3'));},
  };
}
