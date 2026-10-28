import {setupGeneration} from './generation-client.js';
import {saveRecipe} from './recipes.js';
import {sections, songText, songFilename} from './song.js';
const $=s=>document.querySelector(s),form=$('#recipe');
let refs=2,recipes=[],audioUrl=null,timer,editedBrief=null,activeRecipeId=null;
const draftKey='fuse-working-draft';
function renderSong(){
  sections.forEach((name,index)=>{
    const details=document.createElement('details');details.className='song-section';details.id='song-section-'+index;details.open=index===0;
    const summary=document.createElement('summary');summary.textContent=String(index+1).padStart(2,'0')+' / '+name;
    details.append(summary);
    const fields=document.createElement('div');fields.className='fields';
    for(const [key,label,placeholder] of [['Chords','Chord progression','e.g. Am - F - C - G'],['Lyrics','Lyrics','Write original lyrics, or leave blank for an instrumental section.'],['Notes','Arrangement & transition','Instruments, dynamics, and how this section leads into the next.']]){
      const wrapper=document.createElement('label');wrapper.className='wide';wrapper.textContent=label;
      const input=document.createElement(key==='Chords'?'input':'textarea');input.name='section'+index+key;input.maxLength=key==='Lyrics'?10000:2000;input.placeholder=placeholder;input.setAttribute('aria-label',String(index+1)+' / '+name+': '+label);if(key!=='Chords')input.rows=key==='Lyrics'?4:2;
      wrapper.append(input);fields.append(wrapper);
    }
    details.append(fields);$('#songSections').append(details);
    const link=document.createElement('a');link.href='#'+details.id;link.textContent=String(index+1).padStart(2,'0')+' '+name;link.onclick=()=>{details.open=true;summary.focus();};$('#sectionNav').append(link);
  });
}
renderSong();

function saveDraft(){try{localStorage.setItem(draftKey,JSON.stringify({...collect(),activeRecipeId}));$('#draftStatus').textContent='Draft saved in this browser';}catch{$('#draftStatus').textContent='Draft could not be saved. Export your brief to keep it.';}}
try{const data=JSON.parse(localStorage.getItem('fuse-recipes')||'[]');if(Array.isArray(data))recipes=data.filter(r=>r&&typeof r.id==='string'&&r.data&&Array.isArray(r.data.references));}catch{}
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('#toast').style.display='none',5000);}
function reference(index,data={}){const card=document.createElement('div');card.className='reference';const heading=document.createElement('p');heading.textContent=`INFLUENCE 0${index+1}`;card.append(heading);if(index===2){const remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='Remove';remove.onclick=()=>{card.remove();refs=2;$('#addRef').hidden=false;saveDraft();};heading.append(remove);}
for(const [key,placeholder] of [['track','Track title'],['artist','Artist'],['qualities','What to borrow: groove, mood, texture…']]){const input=document.createElement('input');input.name=`ref${index}_${key}`;input.placeholder=placeholder;input.setAttribute('aria-label',`Influence ${index+1}: ${key}`);input.maxLength=key==='qualities'?300:100;input.required=true;input.value=data[key]||'';card.append(input);}return card;}
function renderRefs(data=[{},{}]){$('#references').replaceChildren(...data.map((r,i)=>reference(i,r)));refs=data.length;$('#addRef').hidden=refs>=3;}
function collect(){const d=Object.fromEntries(new FormData(form));return {...d,editedBrief,references:Array.from({length:refs},(_,i)=>({track:d[`ref${i}_track`]?.trim(),artist:d[`ref${i}_artist`]?.trim(),qualities:d[`ref${i}_qualities`]?.trim()}))};}
function update(){const editing=recipes.some(r=>r.id===activeRecipeId);$('#saveRecipe').textContent=editing?'Update saved recipe':'Save fusion recipe';$('#saveCopy').hidden=!editing;const d=collect();const started=sections.filter((_,i)=>['Chords','Lyrics','Notes'].some(key=>(d['section'+i+key]||'').trim())).length;$('#sectionProgress').textContent=started+' of 10 sections started';$('#previewTitle').textContent=d.title||'Your sound starts here';$('#previewGenre').textContent=d.genre||'Two influences. Endless possibilities.';$('#bpmOut').textContent=$('#previewBpm').textContent=`${d.bpm} BPM`;$('#previewMood').textContent=d.mood;$('#previewLength').textContent=`${Number(d.duration)/60}:00`;}
function library(){ $('#count').textContent=recipes.length;$('#recipes').replaceChildren();if(!recipes.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Your next track starts with a recipe. Create a fusion and save it here.';$('#recipes').append(empty);}
for(const r of recipes){const row=document.createElement('article');row.className='saved';const info=document.createElement('div'),title=document.createElement('h3'),meta=document.createElement('p');title.textContent=r.data.title||'Untitled fusion';meta.className='muted';meta.textContent=`${r.data.genre||'Fusion'} · ${r.data.bpm} BPM · ${new Date(r.created).toLocaleDateString()}`;info.append(title,meta);const actions=document.createElement('div');actions.className='saved-actions';for(const [name,fn] of [['Open',()=>{load(r.data,r.id);tab(false);toast('Recipe opened. Update it or save a separate copy.');}],['Delete',()=>{const next=recipes.filter(x=>x.id!==r.id);try{localStorage.setItem('fuse-recipes',JSON.stringify(next));recipes=next;if(activeRecipeId===r.id){activeRecipeId=null;update();saveDraft();}library();toast('Recipe deleted.');}catch{toast('Recipe could not be deleted. Browser storage is unavailable.');}}]]){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=name;b.onclick=fn;actions.append(b);}row.append(info,actions);$('#recipes').append(row);}}
function load(data,id=null){activeRecipeId=recipes.some(r=>r.id===id)?id:null;editedBrief=typeof data.editedBrief==='string'?data.editedBrief:null;HTMLFormElement.prototype.reset.call(form);renderRefs(data.references);for(const [key,value]of Object.entries(data)){const field=form.elements.namedItem(key);if(field&&typeof value==='string')field.value=value;}update();saveDraft();}
function tab(showLibrary){$('#mixer').hidden=true;$('#mixerTab').classList.remove('active');$('#mixerTab').setAttribute('aria-selected','false');$('#studio').hidden=showLibrary;$('#library').hidden=!showLibrary;$('#studioTab').classList.toggle('active',!showLibrary);$('#libraryTab').classList.toggle('active',showLibrary);$('#studioTab').setAttribute('aria-selected',String(!showLibrary));$('#libraryTab').setAttribute('aria-selected',String(showLibrary));if(showLibrary)library();}
function brief(){const d=collect();return `TITLE: ${d.title}\n\nCreate a brand-new original song.\n\nCREATIVE REFERENCES (context only; no audio analysis performed):\n${d.references.map((r,i)=>`${i+1}. ${r.track} — ${r.artist}\n   Musical qualities: ${r.qualities}`).join('\n')}\n\nTranslate only the described musical qualities into a new composition. Do not copy lyrics or recognizable melodies, or imitate a particular singer's voice.\n\nGENRE: ${d.genre}\nTEMPO: ${d.bpm} BPM\nMOOD: ${d.mood}\nDURATION: ${d.duration} seconds\nVOCALS: ${d.vocals}\nRHYTHM: ${d.drums||'Choose a cohesive rhythm for the genre.'}\nINSTRUMENTS: ${d.instruments||'Choose complementary instrumentation.'}\nCREATIVE DIRECTION: ${d.direction||'Develop an original story and hook.'}\n\nSTRUCTURE:\nIntro → Verse 1 → Pre-Chorus → Chorus → Verse 2 → Chorus → Bridge → Guitar/Synth Solo → Final Chorus → Outro\n\nUse smooth transitions, a distinct original hook, clear instrument separation, and a balanced modern mix. Adapt section lengths to the requested duration.\n\nSTYLE TAGS: ${d.genre}, ${d.mood.toLowerCase()}, ${d.bpm} BPM, ${d.vocals.toLowerCase()}\n\nUse the following manually written song notes where provided. Blank fields are open creative decisions.\n\n${songText(d)}`;}
renderRefs();library();update();form.addEventListener('input',()=>{update();saveDraft();});
try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');if(draft&&Array.isArray(draft.references)&&draft.references.length>=2&&draft.references.length<=3){load(draft,draft.activeRecipeId);$('#draftStatus').textContent='Previous draft restored';}}catch{}$('#addRef').onclick=()=>{if(refs<3){$('#references').append(reference(refs++));$('#addRef').hidden=true;saveDraft();}};
function saveCurrent(asCopy=false){
  if(!form.reportValidity())return;
  try{
    const result=saveRecipe(localStorage,recipes,collect(),asCopy?null:activeRecipeId,crypto.randomUUID(),new Date().toISOString());
    recipes=result.recipes;activeRecipeId=result.id;update();saveDraft();library();toast(asCopy?'Copy saved as a separate recipe.':'Recipe saved to this browser.');
  }catch{toast('Recipe could not be saved. Download your song notes or brief to keep your work.');}
}
form.onsubmit=e=>{e.preventDefault();saveCurrent();};
$('#saveCopy').onclick=()=>saveCurrent(true);
function clearDraft(){activeRecipeId=null;editedBrief=null;HTMLFormElement.prototype.reset.call(form);renderRefs();update();saveDraft();}
$('#reset').onclick=clearDraft;$('#example').onclick=()=>load({title:'After the city sleeps',genre:'Synthwave × alternative R&B',mood:'Nostalgic',vocals:'Smooth, intimate vocals',bpm:'110',duration:'180',drums:'Punchy electronic drums, syncopated hi-hats, warm rounded bass',instruments:'Analog synth pads, electric piano, clean guitar',direction:'A night drive away from a familiar city. Intimate verses open into a hopeful, expansive chorus.',references:[{track:'Midnight City',artist:'M83',qualities:'Glowing synth textures and a sweeping build in energy'},{track:'Get Lucky',artist:'Daft Punk',qualities:'A buoyant disco pulse and crisp rhythmic guitar'}]});
$('#studioTab').onclick=()=>tab(false);$('#libraryTab').onclick=()=>tab(true);$('#newRecipe').onclick=()=>{clearDraft();tab(false);};
$('#brief').onclick=()=>{if(form.reportValidity()){$('#briefText').value=editedBrief??brief();$('#briefDialog').showModal();}};$('#closeDialog').onclick=()=>$('#briefDialog').close();$('#copyBrief').onclick=async()=>{try{await navigator.clipboard.writeText($('#briefText').value);toast('Generation brief copied.');}catch{$('#briefText').select();toast('Select and copy the brief manually.');}};
$('#exportBrief').onclick=()=>{const url=URL.createObjectURL(new Blob([$('#briefText').value],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='fusion-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#audioFile').onchange=e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('audio/')){toast('Please choose an audio file.');return;}if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=URL.createObjectURL(file);$('#audio').src=audioUrl;$('#filename').textContent=file.name;$('#download').href=audioUrl;$('#download').download=file.name;$('#player').hidden=false;};$('#audio').addEventListener('error',()=>toast('This audio format could not be played. Try an MP3 or WAV file.'));window.addEventListener('beforeunload',()=>{if(audioUrl)URL.revokeObjectURL(audioUrl);});

$('#briefText').addEventListener('input',()=>{editedBrief=$('#briefText').value;saveDraft();});
$('#rebuildBrief').onclick=()=>{editedBrief=null;$('#briefText').value=brief();saveDraft();toast('Brief rebuilt from the current recipe.');};

function downloadText(text,filename){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#copySong').onclick=async()=>{try{await navigator.clipboard.writeText(songText(collect()));toast('Song notes copied.');}catch{toast('Clipboard unavailable. Download your song notes instead.');}};
$('#exportSong').onclick=()=>downloadText(songText(collect()),songFilename(collect().title)+'-song.txt');

$('#mixerTab').onclick=()=>{$('#mixer').hidden=false;$('#studio').hidden=true;$('#library').hidden=true;for(const id of ['studioTab','libraryTab']){$('#'+id).classList.remove('active');$('#'+id).setAttribute('aria-selected','false');}$('#mixerTab').classList.add('active');$('#mixerTab').setAttribute('aria-selected','true');};

setupGeneration({collect,form});
