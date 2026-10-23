// "Which of these did you file?" on a broker mission's debrief. Local only:
// the ticks light the field map and never go to track(), the mission record
// or the URL. File mode on the open debrief; recheck mode on the re-check
// form, where each line shows when it was last filed.
import { checklistFor, LEGACY_ALL_ANSWERS } from '../data/broker-checklists.js';
import { lineDates, isChecklistPending } from '../utils/broker-lighting.js';

const ROW = 'display: flex; align-items: flex-start; gap: 12px; background: rgba(26,31,43,0.4); border: 1px solid rgba(255,255,255,0.05); padding: 12px 16px;';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// What a first-question answer means for the boxes: tick every one, clear
// every one, or leave them to the player.
export function checklistTicksFor(questionId, value) {
  if (Object.hasOwn(LEGACY_ALL_ANSWERS, questionId) && LEGACY_ALL_ANSWERS[questionId].includes(value)) return 'all';
  if (value === 'skip') return 'none';
  return null;
}

const BOX = '<input type="checkbox" name="filed" value="%ID%" style="width: 24px; height: 24px; flex-shrink: 0; margin: 0; accent-color: var(--cyan);">';

function lineText(line) {
  return `
      <span style="flex: 1; min-width: 0;">
        <span style="display: block; font-size: 14px; color: var(--offwhite); line-height: 1.5;">${esc(line.label)}</span>
        ${line.hint ? `<span style="display: block; font-size: 12px; color: rgba(237,239,243,0.5); line-height: 1.5; margin-top: 2px;">${esc(line.hint)}</span>` : ''}
      </span>`;
}

function lineRow(line) {
  return `
    <label class="debrief-opt" style="${ROW}">
      ${BOX.replace('%ID%', esc(line.id))}${lineText(line)}
    </label>`;
}

// Recheck mode: the line's last date sits above its box, so a phone row
// keeps the box and the name side by side.
function recheckRow(line, day) {
  const when = day
    ? `<span style="display: block; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; color: var(--lime); margin-bottom: 6px;">Last filed ${esc(day)}</span>`
    : '<span style="display: block; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; color: rgba(237,239,243,0.4); margin-bottom: 6px;">Not recorded yet</span>';
  return `
    <label class="debrief-opt" style="${ROW} flex-direction: column; gap: 0;">
      ${when}
      <span style="display: flex; align-items: flex-start; gap: 12px; width: 100%;">
        ${BOX.replace('%ID%', esc(line.id))}${lineText(line)}
      </span>
    </label>`;
}

const SUB = '<div style="font-size: 12px; color: rgba(237,239,243,0.5); line-height: 1.5; margin: -6px 0 12px;">Only this browser keeps this. It lights your field map and is never sent anywhere.</div>';

export function renderBrokerChecklist(mission, state, mode = 'file') {
  const list = checklistFor(mission?.id);
  if (!list) return '';
  if (mode === 'recheck') {
    const dates = lineDates(state, mission.id);
    const label = isChecklistPending(state, mission.id) ? 'TELL SCOUT WHICH ONES YOU FILED' : 'FILED AGAIN?';
    return `
  <div class="broker-checklist" data-broker-checklist="${esc(mission.id)}" data-mode="recheck" style="margin-bottom: 28px;">
    <div class="section-label" style="color: rgba(0,229,255,0.5); margin-bottom: 14px;">${label}</div>
    ${SUB}
    <div style="display: flex; flex-direction: column; gap: 6px;">${list.map((l) => recheckRow(l, dates[l.id])).join('')}
    </div>
  </div>`;
  }
  if (mode !== 'file') return '';
  return `
  <div class="broker-checklist" data-broker-checklist="${esc(mission.id)}" style="margin-bottom: 28px;">
    <div class="section-label" style="color: rgba(0,229,255,0.5); margin-bottom: 14px;">WHICH OF THESE DID YOU FILE?</div>
    ${SUB}
    <div style="display: flex; flex-direction: column; gap: 6px;">${list.map(lineRow).join('')}
    </div>
  </div>`;
}
