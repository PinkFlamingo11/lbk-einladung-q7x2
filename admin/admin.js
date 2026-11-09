(() => {
'use strict';
const C = window.LBK_CONFIG || {};
const $ = (s, el = document) => el.querySelector(s);
const DEMO = !C.SUPABASE_URL;
const TOK = 'lbk_admin_token';

const SLOTS = [['20:00', '20:00 pünktlich'], ['20:15', '20:15 akad. Viertel'], ['21:00', '21:00 nach dem Essen'],
  ['22:00', '22:00 zweite Runde'], ['23:00', '23:00 letzte Runde'], ['spaeter', 'Später']];
const CAP = 20;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stat = s => s === 'yes' ? 'Kommt' : s === 'maybe' ? 'Vielleicht' : 'Absage';
const slotLabel = v => (SLOTS.find(s => s[0] === v) || [, v || ''])[1];
const fmt = iso => new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

async function login(mail, pass) {
  const r = await fetch(`${C.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: C.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: mail, password: pass })
  });
  if (!r.ok) throw new Error('Login fehlgeschlagen');
  const j = await r.json();
  sessionStorage.setItem(TOK, j.access_token);
}

async function fetchRows() {
  if (DEMO) return JSON.parse(localStorage.getItem('lbk_demo_rows_v1') || '[]');
  const r = await fetch(`${C.SUPABASE_URL}/rest/v1/rsvps?select=*&order=created_at.asc`, {
    headers: { apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + sessionStorage.getItem(TOK) }
  });
  if (r.status === 401 || r.status === 403) { sessionStorage.removeItem(TOK); throw new Error('auth'); }
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Letzte Antwort pro Name zählt für Anwesenheit, erster gewerteter Versuch zählt für die Wertung.
function latestPerName(rows) {
  const m = new Map();
  rows.forEach(r => m.set(r.name.trim().toLowerCase(), r));
  return [...m.values()];
}

function render(rows) {
  const cur = latestPerName(rows);
  const yes = cur.filter(r => r.status === 'yes');
  const maybe = cur.filter(r => r.status === 'maybe');
  const no = cur.filter(r => r.status === 'no');
  const sum = a => a.reduce((n, r) => n + (r.guests || 1), 0);
  const scored = rows.filter(r => r.score != null);
  const best = scored.length ? Math.max(...scored.map(r => r.score)) : '–';

  $('#sums').innerHTML = `
    <div><strong>${sum(yes)}</strong><span>Personen kommen</span></div>
    <div><strong>${sum(maybe)}</strong><span>Personen vielleicht</span></div>
    <div><strong>${no.length}</strong><span>Absagen</span></div>
    <div><strong>${best}</strong><span>Höchster Wert (von 600)</span></div>`;

  // Ankunft
  let cumYes = 0, cumMaybe = 0;
  const maxScale = Math.max(CAP + 6, sum(yes) + sum(maybe));
  $('#bars').innerHTML = SLOTS.map(([v, l]) => {
    const ys = yes.filter(r => r.arrival === v), ms = maybe.filter(r => r.arrival === v);
    cumYes += sum(ys); cumMaybe += sum(ms);
    const wy = cumYes / maxScale * 100, wm = cumMaybe / maxScale * 100;
    const names = [...ys, ...ms].map(r => esc(r.name.split(' ')[0]) + ((r.guests || 1) > 1 ? ` +${r.guests - 1}` : '')).join(', ');
    return `<div class="bar" title="${esc(names)}">
      <span>${esc(l)}</span>
      <div class="track"><div class="fill-yes" style="width:${wy}%"></div><div class="fill-maybe" style="left:${wy}%;width:${wm}%"></div><div class="cap" style="left:${CAP / maxScale * 100}%"></div></div>
      <span><b>${cumYes}</b>${cumMaybe ? ` (+${cumMaybe})` : ''} <small class="hide-s">${esc(names).slice(0, 40)}</small></span>
    </div>`;
  }).join('');

  // Wertung: erster gewerteter Versuch pro Name
  const first = new Map();
  rows.filter(r => r.score != null).sort((a, b) => new Date(a.scored_at || a.created_at) - new Date(b.scored_at || b.created_at))
    .forEach(r => { const k = r.name.trim().toLowerCase(); if (!first.has(k)) first.set(k, r); });
  const rank = [...first.values()].sort((a, b) => b.score - a.score);
  $('#rank').innerHTML = rank.length ? rank.map((r, i) =>
    `<div class="rank"><span>${i + 1}.</span><span>${esc(r.name)}${i === 0 ? ' &#9733;' : ''}<br><small>${(r.glasses || []).join(' / ')}</small></span><strong>${r.score}</strong></div>`).join('')
    : '<p class="sub">Noch niemand hat gezapft.</p>';

  // Tabelle
  $('#tbl').innerHTML = `<thead><tr><th>Name</th><th>Status</th><th class="num">Pers.</th><th>Ankunft</th><th class="num">Wert</th><th>Nachricht</th><th>Eingang</th></tr></thead><tbody>` +
    rows.slice().reverse().map(r => `<tr>
      <td>${esc(r.name)}</td><td class="tag-${r.status}">${stat(r.status)}</td><td class="num">${r.status === 'no' ? '' : r.guests}</td>
      <td>${esc(slotLabel(r.arrival))}</td><td class="num">${r.score ?? ''}</td><td>${esc(r.note || '')}</td><td>${fmt(r.created_at)}</td></tr>`).join('') + '</tbody>';
  window.__rows = rows;
}

async function load() {
  try {
    const rows = await fetchRows();
    $('#login').hidden = true; $('#board').hidden = false;
    $('#demo-note').hidden = !DEMO;
    render(rows);
  } catch (e) {
    $('#board').hidden = true; $('#login').hidden = false;
    if (e.message !== 'auth') { $('#l-err').textContent = e.message; $('#l-err').hidden = false; }
  }
}

$('#login').addEventListener('submit', async e => {
  e.preventDefault(); $('#l-err').hidden = true;
  try { await login($('#l-mail').value.trim(), $('#l-pass').value); await load(); }
  catch (ex) { $('#l-err').textContent = 'Login hat nicht geklappt.'; $('#l-err').hidden = false; }
});
$('#reload').addEventListener('click', load);
$('#logout').addEventListener('click', () => { sessionStorage.removeItem(TOK); location.reload(); });
$('#csv').addEventListener('click', () => {
  const rows = window.__rows || [];
  const head = ['Name', 'Status', 'Personen', 'Ankunft', 'Wert', 'Glaeser', 'Nachricht', 'Eingang'];
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = [head.map(q).join(';')].concat(rows.map(r => [r.name, stat(r.status), r.guests, slotLabel(r.arrival), r.score, (r.glasses || []).join('/'), r.note, r.created_at].map(q).join(';'))).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
  a.download = 'zusagen.csv'; a.click();
});

if (DEMO) load(); else if (sessionStorage.getItem(TOK)) load(); else { $('#login').hidden = false; }
})();
