import {dbGain,equalPower,estimateTempo,rmsGain,encodeWav,bassSwapCurve} from './mixer-dsp.js';
import {validateAudioFile,validateDecodedAudio,audioImportError} from './audio-import.js';

const $=selector=>document.querySelector(selector);
const tracks=[null,null];
let context,outputUrl,busy=false;
const status=message=>{$('#mixStatus').textContent=message;};
function audioContext(){
  if(!window.AudioContext||!window.OfflineAudioContext)throw Error('This browser does not support local audio mixing. Try a current Chrome, Edge, or Firefox browser.');
  return context??=new AudioContext({sampleRate:44100});
}
function invalidate(){
  $('#mixResult').hidden=true;$('#mixAudio').pause();$('#mixAudio').removeAttribute('src');$('#mixAudio').load();
  if(outputUrl){URL.revokeObjectURL(outputUrl);outputUrl=null;}
}
function controls(){
  $('#renderMix').disabled=busy||tracks.some(track=>!track);
  $('#mixControls').disabled=busy;
  for(const field of $('#mixerForm').querySelectorAll('input,select'))field.disabled=busy;
  const transition=$('#mixMode').value==='transition';
  for(const field of $('#transitionSettings').querySelectorAll('input'))field.disabled=busy||!transition;
  $('#mixBalance').disabled=busy||transition;
  $('#mixTarget').disabled=busy||!$('#mixSync').checked;
}
for(const [index,id] of ['a','b'].entries()){
  $('#mixFile'+id).onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    busy=true;controls();invalidate();tracks[index]=null;$('#trackInfo'+id).textContent='Reading '+file.name+'…';status('Decoding track '+id.toUpperCase()+' locally…');
    try{
      validateAudioFile(file);
      const ctx=audioContext();const buffer=await ctx.decodeAudioData(await file.arrayBuffer());
      validateDecodedAudio(buffer);
      const estimate=estimateTempo(buffer.getChannelData(0),buffer.sampleRate);
      tracks[index]={buffer,name:file.name};
      $('#mixBpm'+id).value=estimate?.bpm||'';
      $('#mixCue'+id).value='0';$('#mixCue'+id).max=Math.max(0,buffer.duration-.01).toFixed(2);
      $('#trackInfo'+id).textContent=file.name+' · '+buffer.duration.toFixed(1)+' seconds · '+(estimate?'estimated '+estimate.bpm+' BPM; verify by ear':'tempo not detected; enter BPM if known');
      status('Track '+id.toUpperCase()+' loaded locally. Import both tracks, set cues, then render.');
    }catch(error){
      $('#trackInfo'+id).textContent='Track not loaded';$('#mixBpm'+id).value='';$('#mixCue'+id).value='0';$('#mixCue'+id).removeAttribute('max');
      // Allow choosing the same filename again after repairing/replacing it.
      event.target.value='';
      status('Could not load track '+id.toUpperCase()+': '+audioImportError(error));
    }
    finally{busy=false;controls();}
  };
}
$('#mixerForm').addEventListener('input',event=>{if(!busy&&event.target.type!=='file'){invalidate();status('Settings changed. Render again to hear the new mix.');}});
$('#mixMode').onchange=()=>{$('#transitionSettings').hidden=$('#mixMode').value!=='transition';$('#layerSettings').hidden=$('#mixMode').value!=='layer';controls();};
$('#mixSync').onchange=controls;
$('#mixerForm').onsubmit=async event=>{
  event.preventDefault();if(busy||tracks.some(track=>!track))return;
  busy=true;controls();invalidate();status('Rendering your mix locally…');
  try{
    const ctx=audioContext();let duration=Number($('#mixDuration').value);const mode=$('#mixMode').value;
    const start=mode==='transition'?Number($('#mixStart').value):0;
    const fade=Number($('#mixFade').value);
    if(mode==='transition'&&start+fade>duration)throw Error('The transition must end before the mix ends. Increase the length or shorten the transition.');
    const projectBpm=Number($('#mixTarget').value), sync=$('#mixSync').checked;
    const cues=['a','b'].map(id=>Number($('#mixCue'+id).value));
    const rates=['a','b'].map(id=>{
      const bpm=Number($('#mixBpm'+id).value);
      if(sync&&(!bpm||bpm<40||bpm>240))throw Error('Enter a BPM between 40 and 240 for both tracks to use speed matching.');
      const rate=sync?projectBpm/bpm:1;
      if(rate<.5||rate>2)throw Error('Speed matching is limited to 0.5×–2×. Check each BPM or disable speed matching.');
      return rate;
    });
    tracks.forEach((track,i)=>{
      if(cues[i]>=track.buffer.duration)throw Error('Track '+(i?'B':'A')+' cue must be inside the audio file.');
      if(mode==='transition'){
        const needed=i?fade:start+fade;
        if((track.buffer.duration-cues[i])/rates[i]<needed)throw Error('Track '+(i?'B':'A')+' is too short at this cue/speed to complete the transition.');
      }
    });
    const remaining=tracks.map((track,i)=>(track.buffer.duration-cues[i])/rates[i]);
    duration=Math.min(duration,mode==='transition'?start+remaining[1]:Math.max(...remaining));
    const offline=new OfflineAudioContext(2,Math.ceil(duration*44100),44100);
    const weights=equalPower(Number($('#mixBalance').value)/100);
    for(const [index,track] of tracks.entries()){
      const id=index?'b':'a',source=offline.createBufferSource();source.buffer=track.buffer;source.playbackRate.value=rates[index];
      const bass=offline.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=180;
      const bassDb=Number($('#mixBass'+id).value);bass.gain.value=bassDb;
      const gain=offline.createGain();
      const segmentEnd=Math.min(track.buffer.length,Math.ceil((cues[index]+(duration-(index?start:0))*rates[index])*track.buffer.sampleRate));
      const channels=Array.from({length:track.buffer.numberOfChannels},(_,ch)=>track.buffer.getChannelData(ch).subarray(Math.floor(cues[index]*track.buffer.sampleRate),segmentEnd));
      const level=dbGain(Number($('#mixGain'+id).value))*($('#mixLevel').checked?rmsGain(channels):1)*dbGain(-6);
      if(mode==='layer')gain.gain.value=level*weights[index];
      else{
        const curve=new Float32Array(256);
        for(let i=0;i<curve.length;i++)curve[i]=level*equalPower(i/(curve.length-1))[index];
        gain.gain.setValueAtTime(index?0:level,0);gain.gain.setValueCurveAtTime(curve,start,fade);
        gain.gain.setValueAtTime(index?level:0,start+fade);
        if($('#mixSwap').checked){const curve=bassSwapCurve(index);for(let i=0;i<curve.length;i++)curve[i]+=bassDb;bass.gain.setValueAtTime(curve[0],0);bass.gain.setValueCurveAtTime(curve,start,fade);bass.gain.setValueAtTime(curve.at(-1),start+fade);}
      }
      // Short edge fades avoid clicks at source start and at the exported boundary.
      const edge=offline.createGain();const when=index?start:0;
      const end=Math.min(duration,when+(track.buffer.duration-cues[index])/rates[index]);
      const ramp=Math.min(.01,(end-when)/3);
      edge.gain.setValueAtTime(0,when);edge.gain.linearRampToValueAtTime(1,when+ramp);
      edge.gain.setValueAtTime(1,end-ramp);edge.gain.linearRampToValueAtTime(0,end);
      const rumble=offline.createBiquadFilter();rumble.type='highpass';rumble.frequency.value=25;rumble.Q.value=Math.SQRT1_2;
      source.connect(rumble).connect(bass).connect(gain).connect(edge).connect(offline.destination);
      source.start(when,cues[index]);source.stop(end);
    }
    const rendered=await offline.startRendering();
    const encoded=encodeWav([rendered.getChannelData(0),rendered.getChannelData(1)],44100,{normalize:$('#mixNormalize').checked});
    outputUrl=URL.createObjectURL(new Blob([encoded.bytes],{type:'audio/wav'}));
    $('#mixAudio').src=outputUrl;$('#mixDownload').href=outputUrl;$('#mixResult').hidden=false;
    status('Mix ready · '+duration.toFixed(1)+' seconds · stereo WAV'+(encoded.attenuationDb<0?' · peak reduced '+(-encoded.attenuationDb).toFixed(1)+' dB to avoid clipping':'')+(encoded.gainDb>0?' · output raised '+encoded.gainDb.toFixed(1)+' dB':'')+' · sample peak '+(Number.isFinite(encoded.peakDb)?encoded.peakDb.toFixed(1)+' dBFS':'silent')+'. Listen before downloading.');
  }catch(error){status(error.message||'Mix failed. Try shorter audio or a shorter mix length.');}
  finally{busy=false;controls();}
};
window.addEventListener('beforeunload',()=>{if(outputUrl)URL.revokeObjectURL(outputUrl);context?.close();});
controls();
