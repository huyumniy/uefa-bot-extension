
/**
 * Finds all seat chains matching area, category, row and adjacency.
 */
function findNearbyChains(features, minLen, category, blacklist) {
  const groups = new Map();

  features.forEach(f => {
    if (blacklist.includes(f.id)) return;
    const p = f.properties;
    if (p.seatCategory.toLowerCase() !== category.toLowerCase()) return;
    const key = `${p.areaName}||${p.seatCategory}||${p.row}`;
    const num = Number(p.number);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ num, feat: f });
  });

  const chains = [];
  groups.forEach(items => {
    items.sort((a, b) => a.num - b.num);
    let run = [items[0]];
    for (let i = 1; i < items.length; i++) {
      if (items[i].num - items[i-1].num <= 2) run.push(items[i]);
      else {
        if (run.length >= minLen) chains.push(run.map(x => x.feat));
        run = [items[i]];
      }
    }
    if (run.length >= minLen) chains.push(run.map(x => x.feat));
  });
  return chains;
}

/**
 * Returns a random contiguous slice of the chain of length qty.
 */
function getRandomChainSlice(chains, qty) {
  if (!chains.length) return [];
  const chain = chains[Math.floor(Math.random() * chains.length)];
  if (chain.length <= qty) return chain;
  const start = Math.floor(Math.random() * (chain.length - qty + 1));
  return chain.slice(start, start + qty);
}

function getAllCategories(data) {
  if (!data || !Array.isArray(data.features)) {
    return false;
  }

  const categoriesSet = new Set(
    data.features
      .map(f => f.properties?.seatCategory)
      .filter(cat => typeof cat === 'string')
  );

  return Array.from(categoriesSet);
}

export { findNearbyChains, getRandomChainSlice, getAllCategories }