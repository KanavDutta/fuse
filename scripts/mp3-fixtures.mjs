// Requires an external FFmpeg with libmp3lame. This is a test tool, not an app dependency.
// First run: node scripts/mixer-fixtures.mjs
// Then: node scripts/mp3-fixtures.mjs <path-to-ffmpeg>
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const encoder=process.argv[2]||'ffmpeg';
const fixture=name=>fileURLToPath(new URL('../test/fixtures/'+name,import.meta.url));
for(const [source,destination,options] of [
  ['track-a.wav','track-a-cbr.mp3',['-b:a','192k','-ar','44100','-ac','2']],
  ['track-b.wav','track-b-vbr.mp3',['-q:a','3','-ar','48000','-ac','1','-metadata','title=FUSE test fixture - mono VBR']],
]) execFileSync(encoder,['-hide_banner','-loglevel','error','-y','-i',fixture(source),'-codec:a','libmp3lame',...options,fixture(destination)],{stdio:'inherit'});
await writeFile(fixture('damaged.mp3'),(await readFile(fixture('track-a-cbr.mp3'))).subarray(0,128));
await writeFile(fixture('empty.mp3'),new Uint8Array(0));
console.log('Created CBR stereo, VBR mono (48 kHz), damaged, and empty MP3 fixtures.');
