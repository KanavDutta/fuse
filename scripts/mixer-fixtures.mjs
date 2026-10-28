// Controlled signals for browser verification; no external music or AI service.
import {mkdir,writeFile} from 'node:fs/promises';
import {encodeWav} from '../public/mixer-dsp.js';
const root=new URL('../test/fixtures/',import.meta.url);
await mkdir(root,{recursive:true});
const sampleRate=44100,frames=sampleRate*20;
for(const [name,hz,amplitude] of [['a',220,.4],['b',330,.12]]){
  const channels=Array.from({length:2},()=>new Float32Array(frames));
  for(let i=0;i<frames;i++){
    const t=i/sampleRate,beat=t%.5;
    const kick=.2*Math.exp(-beat*35)*Math.sin(2*Math.PI*65*beat);
    channels[0][i]=amplitude*Math.sin(2*Math.PI*hz*t)+kick;
    channels[1][i]=channels[0][i]*.8;
  }
  await writeFile(new URL(`track-${name}.wav`,root),new Uint8Array(encodeWav(channels,sampleRate).bytes));
}
await writeFile(new URL('invalid.wav',root),'This is not an audio file');
console.log('Created 20-second stereo fixtures with a 120 BPM pulse in test/fixtures.');
