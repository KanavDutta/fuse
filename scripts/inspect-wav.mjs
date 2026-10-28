import {readFile} from 'node:fs/promises';
const filename=process.argv[2];
if(!filename)throw Error('Usage: node scripts/inspect-wav.mjs <export.wav>');
const bytes=await readFile(filename),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Not a WAV');
let channels,sampleRate,offset,size;
for(let pos=12;pos+8<=bytes.length;){
  const chunk=bytes.toString('ascii',pos,pos+4),length=view.getUint32(pos+4,true);
  if(chunk==='fmt '){if(view.getUint16(pos+8,true)!==1||view.getUint16(pos+22,true)!==16)throw Error('Expected PCM16');channels=view.getUint16(pos+10,true);sampleRate=view.getUint32(pos+12,true);}
  if(chunk==='data'){offset=pos+8;size=length;break;}
  pos+=8+length+(length%2);
}
if(!channels||offset===undefined||offset+size>bytes.length)throw Error('Invalid WAV chunks');
const frames=size/(2*channels);let peak=0,sum=0,maxStep=0,previous=Array(channels).fill(0),first=0,last=0;
for(let frame=0;frame<frames;frame++)for(let ch=0;ch<channels;ch++){
  const value=view.getInt16(offset+(frame*channels+ch)*2,true)/32768;
  peak=Math.max(peak,Math.abs(value));sum+=value*value;
  maxStep=Math.max(maxStep,Math.abs(value-previous[ch]));previous[ch]=value;
  if(frame===0)first=Math.max(first,Math.abs(value));if(frame===frames-1)last=Math.max(last,Math.abs(value));
}
const db=value=>value?Number((20*Math.log10(value)).toFixed(3)):null;
const windows={};for(const second of [2,10,14,18,25]){
  if(second+1>frames/sampleRate)continue;
  let energy=0;for(let i=second*sampleRate;i<(second+1)*sampleRate;i++)energy+=(view.getInt16(offset+i*channels*2,true)/32768)**2;
  windows[second]=db(Math.sqrt(energy/sampleRate));
}
console.log(JSON.stringify({channels,sampleRate,duration:frames/sampleRate,peakDbfs:db(peak),rmsDbfs:db(Math.sqrt(sum/(frames*channels))),firstSample:first,lastSample:last,maxSampleStep:maxStep,leftChannelOneSecondRmsDbfs:windows},null,2));
