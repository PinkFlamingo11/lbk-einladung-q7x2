(() => {
'use strict';

const C = window.LBK_CONFIG || {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- Speicher ---------- */
const DEMO = !C.SUPABASE_URL;
const KEY = 'lbk_state_v1';
const DEMO_KEY = 'lbk_demo_rows_v1';

const loadState = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const saveState = (s) => localStorage.setItem(KEY, JSON.stringify(s));

async function rpc(fn, args) {
  if (DEMO) {
    const rows = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
    if (fn === 'submit_rsvp') {
      rows.push({ id: args.p_id, created_at: new Date().toISOString(), name: args.p_name, status: args.p_status,
        guests: args.p_guests, arrival: args.p_arrival, note: args.p_note, score: null, glasses: null });
    } else if (fn === 'submit_score') {
      const r = rows.find(x => x.id === args.p_id);
      if (r && r.score == null) { r.score = args.p_score; r.glasses = args.p_glasses; }
    }
    localStorage.setItem(DEMO_KEY, JSON.stringify(rows));
    return;
  }
  const res = await fetch(`${C.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: C.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  if (!res.ok) throw new Error(await res.text());
}

const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

/* ---------- Screens ---------- */
const stage = $('#stage');
const kobes = $('#kobes');
const photoBox = $('#stage-photo');
const photoImg = $('#photo-img');

function show(name) {
  $$('.screen').forEach(s => { s.hidden = s.id !== 's-' + name; });
  const compact = ['form', 'rules', 'done'].includes(name);
  stage.classList.toggle('compact', compact);
  stage.classList.remove('has-photo', 'shock');
  stage.hidden = name === 'game';
  if (name !== 'story') showKobes();
  window.scrollTo(0, 0);
  history.replaceState(null, '', '#' + name);
}
function showKobes() { $('#stage-kobes').hidden = false; photoBox.hidden = true; }
function showPhoto(src) { photoImg.src = src; $('#stage-kobes').hidden = true; photoBox.hidden = false; }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (b) go(b.dataset.go);
});
function go(n) {
  if (n === 'story') startStory();
  else show(n);
}

/* ---------- Geschichte ---------- */
const PHOTOS = [];
let beats = [];
let beatIndex = 0;
let typing = null;

function buildBeats() {
  const b = [];
  b.push({ t: 'Na, du! Ich bin der Köbes. Bei mir gibt es Kölsch, bis du den Deckel aufs Glas legst. Aber erst hörst du zu.' });
  b.push({ t: 'Ich erzähl dir von Carolin. Du kennst sie als Caro.' });
  b.push({ t: 'Alles fing am 5. Dezember 1999 im Saarland an. Ein Sonntag, einen Tag vor Nikolaus. Seitdem hat sie zwei Tage hintereinander Bescherung. Behauptet sie.' });
  PHOTOS.forEach((p, i) => b.push({ t: p.caption, photo: p.src }));
  b.push({ t: 'Hauptsach gudd gess, hat man ihr im Saarland beigebracht. Das hat sie nie vergessen.' });
  b.push({ t: 'Für den Master kam sie dann nach Köln. Und ich sag dir: So schnell kommt man hier nicht mehr weg.' });
  b.push({ t: 'Zwischendurch war sie in München und in Frankfurt. Aber Köln hat sie immer wieder zurückgeholt. Wie ein Kölsch, das man nicht stehen lassen kann.' });
  b.push({ t: 'Jetzt kommt der Teil, bei dem ich das Tablett absetzen muss. Halt dich fest.' });
  b.push({ t: 'Caro zieht weiter. Nach Zürich!', shock: true });
  b.push({ t: 'Für die Doktorarbeit. Neue Stadt, neues Leben, neue Preise.' });
  b.push({ t: 'Weißt du, was ein Bier in Zürich kostet? Ich auch nicht. Ich hab aufgehört zu googeln. Mir wurde schlecht.' });
  b.push({ t: 'Darum: Sie wird 27, und das ist ihr letzter Geburtstag in Köln. Danach heißt es nicht mehr Prost, sondern Grüezi.' });
  b.push({ t: 'Samstag, 5. Dezember, 20 Uhr. Bring gute Laune und Durst.', info: true });
  return b;
}

function startStory() {
  beats = buildBeats();
  beatIndex = 0;
  show('story');
  renderBeat();
}

function typeText(el, text) {
  clearInterval(typing);
  el.textContent = '';
  let i = 0;
  stage.classList.add('talking');
  typing = setInterval(() => {
    i += 1;
    el.textContent = text.slice(0, i);
    if (i >= text.length) finishTyping(el, text);
  }, 17);
}
function finishTyping(el, text) {
  clearInterval(typing); typing = null;
  el.textContent = text;
  stage.classList.remove('talking');
}

function renderBeat() {
  const beat = beats[beatIndex];
  const el = $('#bubble-text');
  $('#progress').style.width = ((beatIndex + 1) / beats.length * 100) + '%';
  if (beat.photo) showPhoto(beat.photo); else showKobes();
  stage.classList.toggle('has-photo', !!beat.photo);
  stage.classList.remove('shock');
  if (beat.shock) { void stage.offsetWidth; stage.classList.add('shock'); }
  $('#infocard').hidden = !beat.info;
  const last = beatIndex === beats.length - 1;
  $('#next').textContent = last ? 'Ich sag Bescheid' : 'Weiter';
  typeText(el, beat.t);
}

$('#next').addEventListener('click', () => {
  const el = $('#bubble-text');
  if (typing) { finishTyping(el, beats[beatIndex].t); return; }
  if (beatIndex < beats.length - 1) { beatIndex += 1; renderBeat(); }
  else show('form');
});

/* ---------- Formular ---------- */
const ARRIVALS = [
  ['20:00', 'Um 20:00 Uhr, pünktlich'],
  ['20:15', 'Um 20:15 Uhr, akademisches Viertel'],
  ['21:00', 'Um 21:00 Uhr, nach dem Abendessen'],
  ['22:00', 'Um 22:00 Uhr, zur zweiten Runde'],
  ['23:00', 'Um 23:00 Uhr, zur letzten Runde'],
  ['spaeter', 'Später, ich melde mich']
];
const arrivalLabel = v => (ARRIVALS.find(a => a[0] === v) || [, v])[1];

(function buildArrivals() {
  const box = $('#arrival');
  ARRIVALS.forEach(([v, l], i) => {
    const lab = document.createElement('label');
    lab.className = 'choice';
    lab.innerHTML = `<input type="radio" name="arrival" value="${v}"${i === 0 ? ' checked' : ''}><span>${l}</span>`;
    box.appendChild(lab);
  });
})();

let guests = 1;
function renderGuests() {
  $('#g-out').textContent = guests;
  $('#g-hint').textContent = guests === 1 ? 'nur du' : `du und ${guests - 1} ${guests === 2 ? 'weitere Person' : 'weitere Personen'}`;
}
$('#g-minus').addEventListener('click', () => { guests = Math.max(1, guests - 1); renderGuests(); });
$('#g-plus').addEventListener('click', () => { guests = Math.min(6, guests + 1); renderGuests(); });

function statusValue() { return $('input[name=status]:checked').value; }
$$('input[name=status]').forEach(r => r.addEventListener('change', () => {
  $('#form-more').hidden = statusValue() === 'no';
}));

let current = null; // { id, name, status, guests, arrival, note, score }

$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#form-error');
  err.hidden = true;
  const name = $('#f-name').value.trim();
  if (name.length < 2) { err.textContent = 'Der Köbes braucht einen Namen für die Liste.'; err.hidden = false; $('#f-name').focus(); return; }
  const status = statusValue();
  const arrival = status === 'no' ? null : $('input[name=arrival]:checked').value;
  const note = $('#f-note').value.trim() || null;
  const g = status === 'no' ? 1 : guests;

  const btn = $('#form-submit');
  btn.disabled = true; btn.textContent = 'Wird eingetragen...';
  current = { id: uuid(), name, status, guests: g, arrival, note, score: null };
  try {
    await rpc('submit_rsvp', { p_id: current.id, p_name: name, p_status: status, p_guests: g, p_arrival: arrival, p_note: note });
  } catch (ex) {
    console.error(ex);
    err.textContent = 'Das hat nicht geklappt. Prüf kurz dein Netz und versuch es nochmal.';
    err.hidden = false;
    btn.disabled = false; btn.textContent = 'Abschicken';
    return;
  }
  saveState(current);
  btn.disabled = false; btn.textContent = 'Abschicken';
  if (status === 'no') finish();
  else showRules();
});

/* ---------- Regeln ---------- */
function showRules() {
  show('rules');
  const el = $('#rules-text');
  const firstName = current.name.split(' ')[0];
  typeText(el, `Eingetragen, ${firstName}. Aber so einfach kommst du hier nicht rein. Wer zu Carolins Party will, muss zapfen können. Am Samstag verkündet Caro, wer am besten war.`);
}
$('#rules-go').addEventListener('click', () => {
  if (typing) { /* Text überspringen */ }
  clearInterval(typing); typing = null; stage.classList.remove('talking');
  startGame();
});

/* ---------- Spiel: Kölsch zapfen ---------- */
const GLASSES = [
  { label: 'Übungsglas', target: .80, k: 5,  hide: null,    practice: true },
  { label: 'Glas 1 von 6', target: .80, k: 6,  hide: null },
  { label: 'Glas 2 von 6', target: .74, k: 8,  hide: null },
  { label: 'Glas 3 von 6', target: .86, k: 10, hide: null },
  { label: 'Glas 4 von 6', target: .70, k: 12, hide: .55 },
  { label: 'Glas 5 von 6', target: .82, k: 14, hide: 'start' },
  { label: 'Glas 6 von 6', target: .76, k: 16, hide: 'start' }
];
const NOTES = [
  'Zum Warmwerden. Das zählt nicht.',
  'Jetzt zählt es. Halten, bis es am Strich ist.',
  'Der Hahn ist launisch. Bleib wachsam.',
  'Etwas höher diesmal.',
  'Ab hier verschwindet die Linie, sobald das Kölsch hoch steht. Merk sie dir.',
  'Die Linie ist weg, sobald du anfängst. Merk sie dir vorher.',
  'Letztes Glas. Atme aus.'
];

const Y0 = 330, H = 320;
const g = { i: 0, level: 0, foam: 0, pouring: false, started: false, over: false, settling: false,
  t: 0, p1: 0, p2: 0, rate: 0, drip: 0, last: 0, raf: 0, scores: [], total: 0, locked: false };

const els = {
  liq: $('#liq'), foam: $('#foam'), stream: $('#stream'), mark: $('#mark'),
  markLine: $('#mark-line'), markText: $('#mark-text'), hit: $('#hit'),
  result: $('#result'), pour: $('#pour'), note: $('#game-note'),
  label: $('#g-label'), total: $('#g-total'), wrap: $('#glass-wrap')
};
const yOf = lvl => Y0 - lvl * H;

function startGame() {
  g.i = 0; g.scores = []; g.total = 0;
  show('game');
  setupGlass();
}

function setupGlass() {
  const cfg = GLASSES[g.i];
  Object.assign(g, { level: 0, foam: 0, pouring: false, started: false, over: false, settling: false,
    t: 0, p1: Math.random() * 6.28, p2: Math.random() * 6.28, rate: 0, drip: 0, locked: false });
  els.label.textContent = cfg.label;
  els.total.textContent = g.total + ' Punkte';
  els.note.textContent = NOTES[g.i];
  els.result.hidden = true;
  els.pour.hidden = false;
  els.pour.disabled = false;
  els.pour.classList.remove('on');
  $('#glass').classList.remove('spill');
  els.hit.setAttribute('opacity', 0);
  const y = yOf(cfg.target);
  els.markLine.setAttribute('y1', y); els.markLine.setAttribute('y2', y);
  els.markText.setAttribute('y', y - 6);
  els.mark.style.opacity = 1;
  draw();
}

function draw() {
  const cfg = GLASSES[g.i];
  const yl = yOf(Math.min(g.level, 1));
  els.liq.setAttribute('y', yl); els.liq.setAttribute('height', Math.max(0, Y0 - yl));
  const fh = Math.max(0, g.foam) * H * Math.min(1, g.level * 25);
  els.foam.setAttribute('y', yl - fh); els.foam.setAttribute('height', fh + (g.level > 0 ? 1 : 0));
  if (g.pouring && !g.over) {
    els.stream.setAttribute('height', Math.max(0, yl - fh - -14));
    els.stream.setAttribute('opacity', 1);
  } else {
    els.stream.setAttribute('opacity', 0);
  }
  // Eichstrich ausblenden
  let vis = 1;
  if (cfg.hide === 'start' && g.started) vis = 0;
  else if (typeof cfg.hide === 'number' && g.level > cfg.hide) vis = 0;
  if (g.locked) vis = 1;
  els.mark.style.opacity = vis;
}

const BASE = 0.30;
function tick(ts) {
  const dt = Math.min(0.05, (ts - g.last) / 1000 || 0);
  g.last = ts;
  if (g.pouring && !g.over) {
    g.t += dt;
    const m = 1 + .5 * Math.sin(2.1 * g.t + g.p1) + .35 * Math.sin(5.3 * g.t + g.p2);
    g.rate = BASE * (1 + g.i * .03) * Math.max(.18, m);
    g.level += g.rate * dt;
    const ft = .02 + .035 * Math.min(1.6, Math.max(.2, m));
    g.foam += (ft - g.foam) * Math.min(1, dt * 7);
    if (g.level >= 1) { overflow(); }
  } else if (g.settling && g.drip > 0) {
    const step = Math.min(g.drip, g.dripRate * dt);
    g.level += step; g.drip -= step;
    g.foam += (.025 - g.foam) * Math.min(1, dt * 3);
    if (g.level >= 1) overflow();
    else if (g.drip <= 0.00001) { g.settling = false; settle(); }
  } else {
    g.foam += (.025 - g.foam) * Math.min(1, dt * 3);
  }
  draw();
  g.raf = requestAnimationFrame(tick);
}

function pourStart() {
  if (g.locked || g.over || g.settling) return;
  g.pouring = true; g.started = true;
  els.pour.classList.add('on');
}
function pourStop() {
  if (!g.pouring) return;
  g.pouring = false;
  els.pour.classList.remove('on');
  if (g.over) return;
  g.dripRate = 0.02 + g.rate * .22 / .25;
  g.drip = g.rate * .14; // Nachlauf nach dem Loslassen
  g.dripRate = g.drip / .25;
  g.settling = true;
  g.locked = true;
  els.pour.disabled = true;
}

function overflow() {
  g.over = true; g.pouring = false; g.settling = false; g.locked = true;
  els.pour.classList.remove('on'); els.pour.disabled = true;
  $('#glass').classList.add('spill');
  g.level = 1.0;
  draw();
  setTimeout(() => finishGlass(0, true), 500);
}

function settle() { finishGlass(scoreFor(), false); }

function scoreFor() {
  const cfg = GLASSES[g.i];
  const diff = Math.abs(g.level - cfg.target) * 100; // Prozentpunkte
  return Math.max(0, Math.round(100 - diff * cfg.k));
}

function comment(points, over) {
  if (over) return 'Übergelaufen. Das zahlst du.';
  if (points >= 95) return 'Auf den Strich. Das war Handwerk.';
  if (points >= 80) return 'Sauber. Da sagt kein Gast was.';
  if (points >= 60) return 'Geht. Ein bisschen Schaum, ein bisschen Hoffnung.';
  if (points >= 30) return 'Das ist mehr Schaum als Kölsch.';
  if (points > 0) return 'So was trinken nur Touristen.';
  return 'Null. Der Eichstrich war nicht zu übersehen.';
}

function finishGlass(points, over) {
  const cfg = GLASSES[g.i];
  cancelAnimationFrame(g.raf);
  draw();
  // Treffer markieren
  const hy = yOf(Math.min(g.level, 1));
  els.hit.setAttribute('y1', hy); els.hit.setAttribute('y2', hy); els.hit.setAttribute('opacity', 1);
  els.mark.style.opacity = 1;
  if (!cfg.practice) { g.scores.push(points); g.total += points; els.total.textContent = g.total + ' Punkte'; }
  const pts = $('#res-points');
  pts.textContent = cfg.practice ? 'Übung' : '+' + points;
  pts.classList.toggle('zero', !cfg.practice && points === 0);
  if (cfg.practice) pts.textContent = points + '';
  $('#res-text').textContent = (cfg.practice ? 'Übungsglas, zählt nicht. ' : '') + comment(points, over);
  const last = g.i === GLASSES.length - 1;
  $('#res-next').textContent = last ? 'Ergebnis ansehen' : (g.i === 0 ? 'Jetzt zählt es' : 'Nächstes Glas');
  setTimeout(() => { els.result.hidden = false; els.pour.hidden = true; }, 350);
}

$('#res-next').addEventListener('click', () => {
  if (g.i >= GLASSES.length - 1) { endGame(); return; }
  g.i += 1;
  setupGlass();
  g.last = performance.now();
  g.raf = requestAnimationFrame(tick);
});

// Eingabe
const pour = els.pour;
pour.addEventListener('pointerdown', e => { e.preventDefault(); pour.setPointerCapture?.(e.pointerId); pourStart(); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => pour.addEventListener(ev, pourStop));
pour.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => { if (e.code === 'Space' && !$('#s-game').hidden && !e.repeat) { e.preventDefault(); pourStart(); } });
window.addEventListener('keyup', e => { if (e.code === 'Space' && !$('#s-game').hidden) pourStop(); });

const _setup = setupGlass;
const _start = startGame;
function startGameLoop() {
  g.last = performance.now();
  cancelAnimationFrame(g.raf);
  g.raf = requestAnimationFrame(tick);
}
$('#rules-go').addEventListener('click', startGameLoop);

async function endGame() {
  cancelAnimationFrame(g.raf);
  current.score = g.total;
  current.glasses = g.scores;
  saveState(current);
  try { await rpc('submit_score', { p_id: current.id, p_score: g.total, p_glasses: g.scores }); }
  catch (ex) { console.error(ex); current.pending = true; saveState(current); }
  finish();
}

/* ---------- Fertig ---------- */
function statusText(s) { return s === 'yes' ? 'Ich komme' : s === 'maybe' ? 'Vielleicht' : 'Ich kann nicht'; }

function finish() {
  show('done');
  const s = current;
  const first = s.name.split(' ')[0];
  const hasScore = s.score != null;
  $('#scorebox').hidden = !hasScore;
  if (hasScore) $('#score-big').textContent = s.score;
  let msg;
  if (s.status === 'no') msg = `Schade, ${first}. Ich schenk dir in Gedanken eins ein. Caro hat deine Absage.`;
  else if (!hasScore) msg = `Du bist eingetragen, ${first}.`;
  else if (s.score >= 500) msg = 'Das war kein Zapfen, das war Handwerk. Ich überleg, ob ich dich einstelle. Am Samstag sehen wir, ob jemand besser war.';
  else if (s.score >= 400) msg = 'Ordentlich. Mit dir kann man arbeiten. Am Samstag verkündet Caro, wer vorne liegt.';
  else if (s.score >= 300) msg = 'Geht so. Du trinkst besser, als du zapfst. Am Samstag verkündet Caro, wer vorne liegt.';
  else if (s.score >= 200) msg = 'Viel Schaum, wenig Kölsch. Aber Hauptsache dabei. Am Samstag verkündet Caro, wer vorne liegt.';
  else msg = 'Das war ein Versuch. Komm trotzdem, wir lassen einfach andere zapfen. Am Samstag verkündet Caro, wer vorne liegt.';
  typeText($('#done-text'), msg);
  let ans = statusText(s.status);
  if (s.status !== 'no') ans += `, ${s.guests === 1 ? 'allein' : s.guests + ' Personen'}, ${arrivalLabel(s.arrival).replace(/^Um /, 'um ').replace(/^Später/, 'später')}`;
  $('#done-answer').textContent = ans;
  $('#done-card').hidden = s.status === 'no';
  $('#ics').hidden = s.status === 'no';
}

$('#again').addEventListener('click', () => {
  localStorage.removeItem(KEY);
  current = null; guests = 1; renderGuests();
  $('#f-name').value = '';
  show('form');
});

$('#ics').addEventListener('click', () => {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Last Birthday in Koeln//DE', 'BEGIN:VEVENT',
    'UID:last-birthday-koeln-2026@invite', 'DTSTAMP:20261109T120000Z',
    'DTSTART;TZID=Europe/Berlin:20261205T200000', 'DTEND;TZID=Europe/Berlin:20261205T235900',
    'SUMMARY:Last Birthday in Köln', 'LOCATION:die wohngemeinschaft\\, Richard-Wagner-Str. 39\\, 50674 Köln',
    'DESCRIPTION:Carolins letzter Geburtstag in Köln. Podest im Wohnzimmer.', 'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'last-birthday-koeln.ics';
  a.click();
});

/* ---------- Start ---------- */
function probe(src) {
  return new Promise(res => { const im = new Image(); im.onload = () => res(true); im.onerror = () => res(false); im.src = src; });
}

(async function init() {
  renderGuests();
  const list = C.PHOTOS || [];
  const ok = await Promise.all(list.map(p => probe(p.src)));
  list.forEach((p, i) => { if (ok[i]) PHOTOS.push(p); });

  const saved = loadState();
  const h = location.hash.replace('#', '');
  if (saved && saved.id && !h) { current = saved; finish(); return; }
  // Testsprünge nur im Testmodus
  if (DEMO && h === 'form') { show('form'); return; }
  if (DEMO && h === 'game') { current = { id: uuid(), name: 'Test', status: 'yes', guests: 1, arrival: '20:00' }; show('game'); setupGlass(); startGameLoop(); return; }
  show('intro');
})();
})();
