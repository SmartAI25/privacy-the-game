// "Which of these did you file?" on a broker mission's debrief. Local only:
// the ticks light the field map and never go to track(), the mission record
// or the URL. File mode here; the re-check panel is added with Task 5.
import { checklistFor, LEGACY_ALL_ANSWERS } from '../data/broker-checklists.js';

const ROW = 'display: flex; align-items: flex-start; gap: 12px; background: rgba(26,31,43,0.4); border: 1px solid rgba(255,255,255,0.05); padding: 12px 16px;';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// What a first-question answer means for the boxes: tick every one, clear
// every one, or leave them to the player.
export function checklistTicksFor(questionId, value) {
  if (Object.hasOwn(LEGACY_ALL_ANSWERS, questionId) && LEGACY_ALL_ANSWERS[questionId].includes(value)) return 'all';
  if (value === 'skip') return 'none';
  return null;
}

function lineRow(line) {
  return `
    <label class="debrief-opt" style="${ROW}">
      <input type="checkbox" name="filed" value="${esc(line.id)}" style="width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px;">
      <span style="flex: 1; min-width: 0;">
        <span style="display: block; font-size: 14px; color: var(--offwhite); line-height: 1.5;">${esc(line.label)}</span>
        ${line.hint ? `<span style="display: block; font-size: 12px; color: rgba(237,239,243,0.5); line-height: 1.5; margin-top: 2px;">${esc(line.hint)}</span>` : ''}
      </span>
    </label>`;
}

export function renderBrokerChecklist(mission, state, mode = 'file') {
  const list = checklistFor(mission?.id);
  if (!list || mode !== 'file') return '';
  return `
  <div class="broker-checklist" data-broker-checklist="${esc(mission.id)}" style="margin-bottom: 28px;">
    <div class="section-label" style="color: rgba(0,229,255,0.5); margin-bottom: 14px;">WHICH OF THESE DID YOU FILE?</div>
    <div style="font-size: 12px; color: rgba(237,239,243,0.5); line-height: 1.5; margin: -6px 0 12px;">Only this browser keeps this. It lights your field map and is never sent anywhere.</div>
    <div style="display: flex; flex-direction: column; gap: 6px;">${list.map(lineRow).join('')}
    </div>
  </div>`;
}
