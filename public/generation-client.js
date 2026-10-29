export function generationPrompt(data){
  const lines=[data.vocals==='Instrumental only'?'Compose an original instrumental. No vocals. Use original melodies.':'Compose an original song. Use original melodies and lyrics. Do not imitate a particular singer.',
    `Genre: ${data.genre||''}`,`Mood: ${data.mood||''}`,`Tempo: ${data.bpm||110} BPM`,
    `Vocals: ${data.vocals||''}`,`Rhythm: ${data.drums||''}`,`Instruments: ${data.instruments||''}`,
    `Creative direction: ${data.direction||''}`,`Key and meter: ${data.songKey||'choose a suitable key'}, ${data.meter||'4/4'}`,
    `Vocal direction: ${data.vocalNotes||''}`,`Mix notes: ${data.mixNotes||''}`,`Style tags: ${data.styleTags||''}`,
    'Musical qualities to combine (context notes, no audio analysis):',...(data.references||[]).map(r=>r.qualities||''),
    'Structure: Intro, Verse 1, Pre-Chorus, Chorus, Verse 2, Chorus, Bridge, Guitar/Synth Solo, Final Chorus, Outro. Adapt section lengths to the requested duration.'];
  for(let i=0;i<10;i++)for(const key of ['Lyrics','Chords','Notes'])if(data[`section${i}${key}`])lines.push(`Section ${i+1} ${key}: ${data[`section${i}${key}`]}`);
  return lines.join('\n');
}

export function setupGeneration({collect,form}){
  const $=s=>document.querySelector(s),storeKey='fuse-generation-job';
  let active=null,timer,configured=false,local=false;
  const message=text=>{$('#generationStatus').textContent=text;};
  const remember=id=>{try{if(id)localStorage.setItem(storeKey,id);else localStorage.removeItem(storeKey);}catch{}};
  async function request(url,options){
    const response=await fetch(url,options);const data=await response.json();if(!response.ok)throw Error(data.error||'The server could not complete this request.');return data;
  }
  function show(job){
    active=job;remember(job.id);$('#cancelGeneration').hidden=!['queued','running'].includes(job.status);
    $('#startGeneration').disabled=!configured||['queued','running'].includes(job.status);
    if(job.status==='completed'){
      message('Generation complete. Your audio is saved on this computer.');
      $('#generatedProvider').textContent=job.provider==='ace-step'?'AI GENERATED · ACE-STEP LOCAL':'AI GENERATED · ELEVENLABS MUSIC';$('#generatedDownload').textContent=job.format==='wav'?'Download generated WAV':'Download generated MP3';$('#generatedDownload').download='fuse-generated.'+(job.format||'mp3');$('#generatedPanel').hidden=false;$('#generatedAudio').src=job.audioUrl;$('#generatedDownload').href=job.audioUrl+'?download=1';
    }else if(['failed','cancelled'].includes(job.status)){
      message(job.error||'Generation stopped.');
      if([401,403].includes(job.providerStatus))$('#providerStatus').textContent='ElevenLabs key or access needs attention';
      remember(null);
    }
    else{message('Waiting for '+(local?'the local model':'ElevenLabs')+' to return audio. No percentage estimate is available.');remember(job.id);}
  }
  async function poll(){
    clearTimeout(timer);
    if(!active||!['queued','running'].includes(active.status))return;
    try{show(await request('/api/jobs/'+active.id));}catch(error){message('Could not refresh job status: '+error.message+' Open this dialog again to retry.');return;}
    if(['queued','running'].includes(active.status))timer=setTimeout(poll,2000);
  }
  async function status(){
    try{
      const state=await request('/api/status');configured=state.connected;local=state.provider==='ace-step';
      $('#generationHeading').textContent=local?'Generate locally with ACE-Step':'Generate with ElevenLabs';
      $('#startGeneration').textContent=local?'Generate locally (no API credits)':'Generate with my ElevenLabs credits';
      $('#generationCost').textContent=local?'Uses this computer’s GPU. No paid API is contacted. Local mode currently supports instrumental clips up to 30 seconds.':'This sends the reviewed prompt to ElevenLabs and uses your account credits. Imported audio is not uploaded. Music API access requires an eligible paid account. No automatic retries.';
      $('#generationCancelNotice').textContent=local?'Cancellation stops waiting locally; the GPU task may continue.':'Cancellation stops local work; provider processing or charges may continue.';
      for(const option of $('#generationDuration').options)option.disabled=local&&Number(option.value)>30;
      if(local&&Number($('#generationDuration').value)>30)$('#generationDuration').value='10';
      $('#generationInstrumental').disabled=local;if(local)$('#generationInstrumental').checked=true;
      $('#generationSetup').textContent=local?'Start the local engine with node scripts/start-local-ace.mjs and wait for model loading.':'Add ELEVENLABS_API_KEY to the local .env file and restart.';

      $('#providerStatus').textContent=local?(configured?'ACE-Step local engine ready':'ACE-Step local engine offline'):configured?'ElevenLabs configured · not yet verified':'Audio generation needs setup';
      $('#providerHeading').textContent=local?'ACE-Step local generation':configured?'ElevenLabs Music configured':'Set up ElevenLabs Music';
      $('#providerDescription').textContent=local?'Generate an instrumental using this computer, without API credits.':configured?'Review a prompt to start a paid generation request.':'Add your API key to the local .env file and restart. Generation is localhost-only.';
      $('#generationSetup').hidden=configured;
    }catch{configured=false;$('#providerStatus').textContent='Provider status unavailable';}
    $('#startGeneration').disabled=!configured||['queued','running'].includes(active?.status);
  }
  $('#generate').onclick=async()=>{
    if(!form.reportValidity())return;
    await status();
    if(!active||!['queued','running'].includes(active.status)){
      const data=collect();if(local){data.vocals='Instrumental only';data.vocalNotes='';for(let i=0;i<10;i++)data['section'+i+'Lyrics']='';}
      $('#generationPrompt').value=generationPrompt(data);$('#generationInstrumental').checked=local||data.vocals==='Instrumental only';
    }
    $('#generationDialog').showModal();await status();if(!active||!['queued','running'].includes(active.status))message(local?'Review the prompt before generating locally.':'Review the prompt before generating. Provider credentials have not been verified.');
    if(active&&['queued','running'].includes(active.status))await poll();
    countPrompt();
  };
  $('#closeGeneration').onclick=()=>$('#generationDialog').close();
  function countPrompt(){
    const length=$('#generationPrompt').value.length;
    $('#promptCount').textContent=length+' / 4,100 characters';
    $('#generationPrompt').setCustomValidity(length>4100?'Shorten the prompt to 4,100 characters before generating.':'');
  }
  $('#generationPrompt').oninput=countPrompt;
  $('#generationForm').onsubmit=async event=>{
    event.preventDefault();if(!configured)return;
    $('#startGeneration').disabled=true;message('Submitting one generation request…');
    try{
      const job=await request('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:$('#generationPrompt').value,duration:Number($('#generationDuration').value),instrumental:$('#generationInstrumental').checked})});
      show(job);await poll();
    }catch(error){message(error.message+(local?' Check the local engine before retrying.':' If the connection failed after submission, check your provider account before retrying.'));$('#startGeneration').disabled=false;}
  };
  $('#cancelGeneration').onclick=async()=>{if(!active)return;try{show(await request('/api/jobs/'+active.id,{method:'DELETE'}));}catch(error){message(error.message);}};
  $('#generatedAudio').addEventListener('error',()=>message('Generated audio could not be played. Try the download or check the server is running.'));
  void status();
  try{const id=localStorage.getItem(storeKey);if(id&&/^[0-9a-f-]{36}$/.test(id)){active={id,status:'running'};void poll();}}catch{}
}
