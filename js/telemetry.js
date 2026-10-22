const track = (name, data) => {
  if (typeof umami !== 'undefined') {
    umami.track(name, data);
  }
};

export const telemetry = {
  gameStart()            { track('game_start'); },
  gameReturn(pct)        { track('game_return', { liberation_pct: pct }); },

  missionStart(d, p)     { track('mission_start', { district: d, phase: p }); },
  missionGo(d, p)        { track('mission_go',    { district: d, phase: p }); },
  missionDebrief(d, p, f){ track('mission_debrief', { district: d, phase: p, finding: f }); },
  missionSkip(d, p)      { track('mission_skip',  { district: d, phase: p }); },

  districtEnter(d)       { track('district_enter',    { district: d }); },
  districtComplete(d)    { track('district_complete',  { district: d }); },

  jsError(msg, screen)   { track('js_error',      { message: String(msg).slice(0, 200), screen }); },
  storageError(op)       { track('storage_error',  { operation: op }); },
};
