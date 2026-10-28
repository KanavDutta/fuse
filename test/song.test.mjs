import test from 'node:test';
import assert from 'node:assert/strict';
import {sections, songText, songFilename} from '../public/song.js';

test('older recipes export a complete ten-section workspace without invented lyrics', () => {
  const result = songText({title:'Old recipe', bpm:'125'});
  assert.equal(sections.length, 10);
  let previous = -1;
  sections.forEach((name, index) => {
    const position = result.indexOf(`${String(index + 1).padStart(2, '0')} / ${name}`);
    assert.ok(position > previous);
    previous = position;
  });
  assert.equal((result.match(/Lyrics:\n\(not written \/ instrumental\)/g) || []).length, 10);
  assert.ok(result.includes('125 BPM | METER: 4/4'));
  assert.ok(!result.includes('undefined'));
});

test('export preserves independent choruses, multiline lyrics, and production notes', () => {
  const result = songText({
    title:'Night drive', songKey:'A minor', meter:'6/8', styleTags:'dream pop',
    section3Lyrics:'First hook\nSecond line', section5Lyrics:'Changed hook',
    section8Lyrics:'Final hook', section6Chords:'Am - F',
    section6Notes:'Drop drums; transition with a swell.',
    vocalNotes:'Soft lead', mixNotes:'Wide pads',
  });
  assert.match(result, /04 \/ Chorus\nChords:.*\nLyrics:\nFirst hook\nSecond line/);
  assert.match(result, /06 \/ Chorus\nChords:.*\nLyrics:\nChanged hook/);
  assert.match(result, /09 \/ Final Chorus\nChords:.*\nLyrics:\nFinal hook/);
  for(const text of ['A minor', '6/8', 'dream pop', 'Am - F', 'Drop drums; transition with a swell.', 'Soft lead', 'Wide pads']) assert.ok(result.includes(text));
});

test('download names handle empty titles, Unicode, and path characters', () => {
  assert.equal(songFilename(''), 'untitled-fusion');
  assert.equal(songFilename('///'), 'untitled-fusion');
  assert.equal(songFilename('../Night: drive?'), 'Night-drive');
  assert.equal(songFilename('Été'), 'Été');
  assert.equal(songFilename('a'.repeat(120)).length, 80);
});
