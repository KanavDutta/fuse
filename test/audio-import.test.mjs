import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAudioFile,validateDecodedAudio,audioImportError} from '../public/audio-import.js';

test('empty and oversized imports are rejected without relying on filename or MIME',()=>{
  assert.throws(()=>validateAudioFile({size:0}),/empty/);
  assert.throws(()=>validateAudioFile({size:50*1024*1024+1}),/50 MB/);
  assert.doesNotThrow(()=>validateAudioFile({size:123,name:'recording.mp3',type:''}));
});

test('valid mono and stereo MP3 decode results accept fractional sample durations',()=>{
  for(const numberOfChannels of [1,2]) assert.doesNotThrow(()=>validateDecodedAudio({duration:19.99997732426304,length:881999,numberOfChannels}));
  assert.doesNotThrow(()=>validateDecodedAudio({duration:600,length:26460000,numberOfChannels:2}));
  assert.throws(()=>validateDecodedAudio({duration:600.01,length:26460441,numberOfChannels:2}),/10 minutes/);
});

test('empty or invalid decoded audio is never marked ready to mix',()=>{
  for(const values of [{duration:0},{duration:NaN},{length:0},{numberOfChannels:0}]) assert.throws(()=>validateDecodedAudio({duration:20,length:882000,numberOfChannels:2,...values}),/no decodable audio/);
});

test('codec errors have actionable messages; other useful errors are preserved',()=>{
  assert.match(audioImportError({name:'EncodingError',message:'Unable to decode audio data'}),/damaged.*unsupported/);
  assert.match(audioImportError({name:'NotSupportedError'}),/MP3 or WAV/);
  assert.equal(audioImportError(Error('File cannot be read')), 'File cannot be read');
});
