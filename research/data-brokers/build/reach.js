// Reach = 1 + distinct brokers reachable downstream along published edges.
// supplies/owns/matches-identity follow from -> to; buys is reversed
// (a buys from b, so a is downstream of b). Cycles count once.
const FORWARD = new Set(['supplies', 'owns', 'matches-identity']);

export function computeReach(brokers, links) {
  const adj = new Map(brokers.map((b) => [b.id, new Set()]));
  for (const l of links) {
    if (!l.published) continue;
    let src, dst;
    if (FORWARD.has(l.type)) [src, dst] = [l.from, l.to];
    else if (l.type === 'buys') [src, dst] = [l.to, l.from];
    else continue;
    if (!adj.has(src) || !adj.has(dst)) continue;
    adj.get(src).add(dst);
  }
  const reach = new Map();
  for (const { id } of brokers) {
    const seen = new Set([id]);
    const stack = [id];
    while (stack.length) {
      for (const next of adj.get(stack.pop())) {
        if (!seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    reach.set(id, seen.size);
  }
  return reach;
}

export function pickHubs(reach, n = 12) {
  return [...reach.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, n)
    .map(([id]) => id);
}
