// The Broker Constellation. Shell: loading and error panels; the loaded view arrives in Task 4.
import { renderHud } from '../components/hud.js';

const BACK = '<a class="back-link" href="#/district/reclamation">← THE RECLAMATION</a>';

export function renderBrokerMap(state, { status = 'idle', data = null } = {}) {
  let body;
  if (status === 'error') {
    body = `<div class="constellation constellation--error" role="alert"><p>COULDN'T LOAD THE MAP</p><button type="button" class="btn" data-action="retry-broker-data">TRY AGAIN</button></div>`;
  } else if (status === 'ready' && data) {
    body = '<div class="constellation" aria-label="Broker constellation"></div>';
  } else {
    body = '<div class="constellation constellation--loading" role="status"><p>LOADING THE FIELD…</p></div>';
  }
  return `${renderHud(state)}<div class="screen" style="padding: 0 16px 24px;">${BACK}${body}</div>`;
}
