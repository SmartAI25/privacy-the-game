// Minimal RFC 4180 parser: quoted fields, "" escapes, embedded newlines, CRLF.
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let dirty = false; // anything seen on the current row

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') {
      quoted = true; dirty = true;
    } else if (c === ',') {
      row.push(field); field = ''; dirty = true;
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      if (dirty) { row.push(field); rows.push(row); }
      row = []; field = ''; dirty = false;
    } else {
      field += c; dirty = true;
    }
  }
  if (dirty) { row.push(field); rows.push(row); }
  return rows;
}
