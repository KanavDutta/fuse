export function validateAudioFile(file) {
  if(file.size===0)throw Error('This audio file is empty. Choose a file containing audio.');
  if(file.size>50*1024*1024)throw Error('Choose a file smaller than 50 MB.');
}

export function validateDecodedAudio(buffer) {
  if(!Number.isFinite(buffer.duration)||buffer.duration<=0||buffer.length<1||buffer.numberOfChannels<1)throw Error('This file contains no decodable audio.');
  if(buffer.duration>600)throw Error('Choose a track no longer than 10 minutes.');
}

export function audioImportError(error) {
  if(['EncodingError','NotSupportedError'].includes(error?.name))return 'This file could not be decoded. It may be damaged or use an unsupported encoding. Try another MP3 or WAV file.';
  return error?.message||'Cannot decode this file. Try another MP3 or WAV file.';
}
