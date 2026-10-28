// Commit storage before changing the in-memory library.
export function saveRecipe(storage, recipes, data, activeId, id, now) {
  const previous = recipes.find(recipe => recipe.id === activeId);
  const recipe = {id: previous?.id || id, created: previous?.created || now, updated: now, data};
  const next = [recipe, ...recipes.filter(item => item.id !== recipe.id)];
  storage.setItem('fuse-recipes', JSON.stringify(next));
  return {recipes: next, id: recipe.id};
}
