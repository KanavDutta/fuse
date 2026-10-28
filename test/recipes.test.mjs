import test from 'node:test';
import assert from 'node:assert/strict';
import {saveRecipe} from '../public/recipes.js';

test('updating preserves identity and creation date without duplicating the recipe', () => {
  const original=[{id:'original',created:'yesterday',data:{title:'First'}}];
  let stored;
  const result=saveRecipe({setItem:(key,value)=>{stored=JSON.parse(value);}},original,{title:'Revised',section3Lyrics:'Hook'},'original','unused','today');
  assert.equal(result.id,'original');
  assert.equal(stored.length,1);
  assert.equal(stored[0].created,'yesterday');
  assert.equal(stored[0].updated,'today');
  assert.equal(stored[0].data.section3Lyrics,'Hook');
  assert.equal(original[0].data.title,'First');
});

test('save as copy keeps the original; a missing active recipe creates a new entry', () => {
  const original=[{id:'original',created:'yesterday',data:{title:'First'}}];
  for(const activeId of [null,'deleted']) {
    const result=saveRecipe({setItem(){}},original,{title:'Alternate'},activeId,'new','today');
    assert.equal(result.id,'new');
    assert.equal(result.recipes.length,2);
    assert.equal(result.recipes[1],original[0]);
  }
});

test('failed storage leaves the existing library intact', () => {
  const original=[{id:'original',created:'yesterday',data:{title:'First'}}];
  assert.throws(()=>saveRecipe({setItem(){throw Error('Storage full');}},original,{title:'Revised'},'original','unused','today'),/Storage full/);
  assert.equal(original.length,1);
  assert.equal(original[0].data.title,'First');
});
