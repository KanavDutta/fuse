export const dbGain = db => 10 ** (db / 20);
export function equalPower(position) {
  return [Math.cos(position * Math.PI / 2), Math.sin(position * Math.PI / 2)];
}

// Energy-onset autocorrelation: an estimate, not a verified beat/downbeat grid.
export function estimateTempo(samples, sampleRate) {
  const hop = Math.max(1, Math.round(sampleRate / 100));
  const count = Math.min(Math.floor(samples.length / hop), 9000);
  if(count < 400) return null;
  const onset = new Float32Array(count);
  let previous = 0, power = 0;
  for(let frame=0; frame<count; frame++) {
    let energy=0;
    for(let j=0; j<hop; j++) energy+=samples[frame*hop+j] ** 2;
    energy=Math.sqrt(energy/hop);
    onset[frame]=Math.max(0,energy-previous);previous=energy;power+=onset[frame] ** 2;
  }
  if(power<1e-8) return null;
  const fps=sampleRate/hop;
  let best=0, bestLag=0;
  for(let lag=Math.ceil(fps*60/180); lag<=Math.floor(fps*60/60); lag++) {
    let score=0,left=0,right=0;
    for(let i=lag;i<count;i++){score+=onset[i]*onset[i-lag];left+=onset[i]**2;right+=onset[i-lag]**2;}
    score/=Math.sqrt(left*right)||1;
    if(score>best){best=score;bestLag=lag;}
  }
  return best>0.08 ? {bpm:Math.round(60*fps/bestLag),confidence:best} : null;
}

export function rmsGain(channels) {
  // Measure contiguous blocks instead of strided samples (which can alias tones).
  // Gate silence so long intros/outros do not cause excessive gain boosts.
  const energies=[];
  for(const data of channels){
    const block=Math.min(1024,data.length);if(!block)continue;
    const blocks=Math.min(512,Math.ceil(data.length/block));
    for(let n=0;n<blocks;n++){
      const start=blocks===1?0:Math.floor(n*(data.length-block)/(blocks-1));
      let sum=0;for(let i=start;i<start+block;i++)sum+=data[i]**2;
      energies.push(sum/block);
    }
  }
  const threshold=Math.max(1e-8,Math.max(0,...energies)*.001);
  const active=energies.filter(energy=>energy>=threshold);
  const rms=Math.sqrt(active.reduce((sum,energy)=>sum+energy,0)/(active.length||1));
  return rms>1e-6 ? Math.min(4,0.12/rms) : 1;
}

export function bassSwapCurve(index, points=256) {
  // Combine with the crossfade so low-frequency weights approach cos²/sin².
  // A straight ramp in dB would cut BOTH bass lines by 12 dB at midpoint.
  return Float32Array.from({length:points},(_,i)=>20*Math.log10(Math.max(dbGain(-24),equalPower(i/(points-1))[index])));
}

export function encodeWav(channels, sampleRate, {normalize=false}={}) {
  if(!channels.length||channels.length>2||!channels[0].length||channels.some(ch=>ch.length!==channels[0].length))throw Error('Invalid audio channel lengths.');
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid audio sample rate.');
  const frames=channels[0].length, count=channels.length;
  const bytes=new ArrayBuffer(44+frames*count*2),view=new DataView(bytes);
  const text=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,count,true);view.setUint32(24,sampleRate,true);
  view.setUint32(28,sampleRate*count*2,true);view.setUint16(32,count*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*count*2,true);
  let peak=0;for(const channel of channels)for(const sample of channel){if(!Number.isFinite(sample))throw Error('Audio contains invalid samples. Try different settings.');peak=Math.max(peak,Math.abs(sample));}
  const gain=peak>0?Math.min(normalize?dbGain(6):1,dbGain(-1)/peak):1;
  let offset=44;
  for(let i=0;i<frames;i++)for(let ch=0;ch<count;ch++){
    const sample=Math.max(-1,Math.min(1,channels[ch][i]*gain));
    view.setInt16(offset,Math.round(sample*(sample<0?32768:32767)),true);offset+=2;
  }
  return {bytes,attenuationDb:Math.min(0,20*Math.log10(gain)),gainDb:20*Math.log10(gain),peakDb:peak>0?20*Math.log10(peak*gain):-Infinity};
}
