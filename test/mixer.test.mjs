import test from 'node:test';
import assert from 'node:assert/strict';
import {dbGain,equalPower,estimateTempo,rmsGain,encodeWav,bassSwapCurve} from '../public/mixer-dsp.js';

test('crossfade has correct endpoints and constant sum of squared gains',()=>{
  assert.deepEqual(equalPower(0),[1,0]);
  assert.ok(Math.abs(equalPower(1)[0])<1e-10);
  assert.equal(equalPower(1)[1],1);
  for(let i=0;i<=100;i++){const [a,b]=equalPower(i/100);assert.ok(Math.abs(a*a+b*b-1)<1e-10);}
});

test('tempo estimator detects a regular pulse and rejects silence or too-short audio',()=>{
  const sr=8000, pulses=new Float32Array(sr*20);
  for(let i=0;i<pulses.length;i+=sr/2)for(let j=0;j<80;j++)pulses[i+j]=Math.exp(-j/20);
  assert.ok(Math.abs(estimateTempo(pulses,sr).bpm-120)<=1);
  assert.equal(estimateTempo(new Float32Array(sr*10),sr),null);
  assert.equal(estimateTempo(new Float32Array(100),sr),null);
});

test('RMS leveling caps boosts and handles silence without infinite gain',()=>{
  assert.equal(rmsGain([new Float32Array(100)]),1);
  assert.equal(rmsGain([new Float32Array(100).fill(.001)]),4);
  assert.ok(Math.abs(rmsGain([new Float32Array(100).fill(.24)])-.5)<1e-6);
});

test('WAV encodes stereo interleaved PCM and attenuates peaks below clipping',()=>{
  const input=[new Float32Array([2,-2,0]),new Float32Array([1,-1,.25])];
  const {bytes,attenuationDb}=encodeWav(input,44100),view=new DataView(bytes);
  assert.equal(new TextDecoder().decode(new Uint8Array(bytes,0,4)),'RIFF');
  assert.equal(new TextDecoder().decode(new Uint8Array(bytes,8,4)),'WAVE');
  assert.equal(view.getUint16(22,true),2);
  assert.equal(view.getUint32(24,true),44100);
  assert.equal(view.getUint32(40,true),12);
  assert.ok(view.getInt16(44,true)>view.getInt16(46,true));
  assert.ok(view.getInt16(48,true)<0);
  assert.ok(Math.abs(view.getInt16(44,true)/32767-dbGain(-1))<1e-4);
  assert.ok(attenuationDb<0);
  assert.equal(input[0][0],2);
  assert.equal(encodeWav([new Float32Array([0,.1])],44100).attenuationDb,0);
});

test('silence around an active passage does not inflate the level-balancing gain',()=>{
  const active=new Float32Array(100000).fill(.24);
  const padded=new Float32Array(1000000);padded.set(active,400000);
  assert.ok(Math.abs(rmsGain([active])-rmsGain([padded]))<.01);
});

test('level analysis does not alias a periodic waveform into silence',()=>{
  const samples=Float32Array.from({length:1000000},(_,i)=>.1*Math.sin(2*Math.PI*i/5));
  assert.ok(Math.abs(rmsGain([samples])-.12/(.1/Math.sqrt(2)))<.01);
});

test('bass swap avoids the old double -12 dB midpoint cut',()=>{
  const a=bassSwapCurve(0,257),b=bassSwapCurve(1,257);
  assert.equal(a[0],0);assert.equal(b[256],0);
  assert.equal(a[256],-24);assert.equal(b[0],-24);
  const fade=equalPower(.5);
  const sum=fade[0]*dbGain(a[128])+fade[1]*dbGain(b[128]);
  assert.ok(Math.abs(sum-1)<1e-6);
});

test('optional output recovery is capped, leaves silence alone, and never exceeds the sample ceiling',()=>{
  const quiet=encodeWav([new Float32Array([.01,-.01])],44100,{normalize:true});
  assert.ok(Math.abs(quiet.gainDb-6)<1e-8);
  const loud=encodeWav([new Float32Array([2,-2])],44100,{normalize:true});
  assert.ok(loud.gainDb<0);assert.ok(Math.abs(loud.peakDb+1)<1e-8);
  assert.equal(encodeWav([new Float32Array(10)],44100,{normalize:true}).gainDb,0);
});

test('invalid audio is rejected before exporting a misleading WAV',()=>{
  assert.throws(()=>encodeWav([new Float32Array([NaN])],44100),/invalid samples/);
  assert.throws(()=>encodeWav([new Float32Array(1),new Float32Array(2)],44100),/channel lengths/);
});
