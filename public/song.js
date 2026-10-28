export const sections = ['Intro', 'Verse 1', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Chorus', 'Bridge', 'Guitar/Synth Solo', 'Final Chorus', 'Outro'];

export function songText(data) {
  const value = key => typeof data[key] === 'string' ? data[key].trim() : '';
  return [
    `SONG WORKSPACE: ${value('title') || 'Untitled fusion'}`,
    'Manually written song notes. No AI text or audio has been generated.',
    `CONCEPT: ${value('direction') || '(not written)'}`,
    `KEY: ${value('songKey') || '(not chosen)'} | TEMPO: ${value('bpm') || '110'} BPM | METER: ${value('meter') || '4/4'}`,
    `STYLE TAGS: ${value('styleTags') || [value('genre'), value('mood')].filter(Boolean).join(', ') || '(not written)'}`,
    `VOCAL DIRECTION: ${value('vocalNotes') || value('vocals') || '(not written)'}`,
    `INSTRUMENTATION: ${value('instruments') || '(not written)'}`,
    `RHYTHM: ${value('drums') || '(not written)'}`,
    `MIX NOTES: ${value('mixNotes') || '(not written)'}`,
    ...sections.map((name, index) => [
      `${String(index + 1).padStart(2, '0')} / ${name}`,
      `Chords: ${value(`section${index}Chords`) || '(not written)'}`,
      `Lyrics:\n${value(`section${index}Lyrics`) || '(not written / instrumental)'}`,
      `Arrangement & transition:\n${value(`section${index}Notes`) || '(not written)'}`,
    ].join('\n')),
  ].join('\n\n');
}

export function songFilename(title) {
  return (title || 'untitled-fusion').normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'untitled-fusion';
}
