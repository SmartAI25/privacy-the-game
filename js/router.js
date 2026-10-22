let currentRoute = null;
let routeHandler = null;

export function onRoute(handler) {
  routeHandler = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

function handleHash() {
  const hash = window.location.hash.slice(1) || '/';
  if (hash === currentRoute) return;
  currentRoute = hash;
  if (routeHandler) routeHandler(parseRoute(hash));
}

function parseRoute(hash) {
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { screen: 'city' };
  if (parts[0] === 'district' && parts[1]) return { screen: 'district', id: parts[1] };
  if (parts[0] === 'survey' && parts[1]) return { screen: 'survey', districtId: parts[1] };
  if (parts[0] === 'mission' && parts[1]) return { screen: 'briefing', missionId: parts[1] };
  if (parts[0] === 'debrief' && parts[1]) return { screen: 'debrief', missionId: parts[1] };
  if (parts[0] === 'complete' && parts[1]) return { screen: 'complete', districtId: parts[1] };
  if (parts[0] === 'stats') return { screen: 'stats' };
  return { screen: 'city' };
}

export function initRouter() {
  window.addEventListener('hashchange', handleHash);
  handleHash();
}
