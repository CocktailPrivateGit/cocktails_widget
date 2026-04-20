// ═══════════════════════════════════════
// FIREBASE SYNC
// ═══════════════════════════════════════
import { loginWithGoogle, logout, initAuth, saveToCloud } from '../shared/firebase-sync.js';

const COLLECTION = 'barcomm';

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
function nav(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');
  const navEl = document.querySelector('[data-p="' + name + '"]');
  if (navEl) navEl.classList.add('active');
}

// ═══════════════════════════════════════
// STORAGE KEY
// ═══════════════════════════════════════
const KEY = 'barcomm_pro_v3';

function getData() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function setData(d) {
  localStorage.setItem(KEY, JSON.stringify(d));
  updateSaveTime();
  // Sync cloud en parallèle (silencieux si non connecté)
  saveToCloud(d, COLLECTION);
}
function updateSaveTime() {
  const el = document.getElementById('save-time');
  if (el) el.textContent = 'Sauvegardé ' + new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
}

// ═══════════════════════════════════════
// SITUATION — SAVE / LOAD
// ═══════════════════════════════════════
let autoSaveTimer;
function autoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveSituation, 800);
}

function saveSituation() {
  const d = getData();
  d.ig        = document.getElementById('s-ig').value;
  d.tt        = document.getElementById('s-tt').value;
  d.li        = document.getElementById('s-li').value;
  d.posts     = document.getElementById('s-posts').value;
  d.devis     = document.getElementById('s-devis').value;
  d.contrats  = document.getElementById('s-contrats').value;
  d.events    = document.getElementById('s-events').value;
  d.nextEvent = document.getElementById('s-next-event').value;
  d.bestpost  = document.getElementById('s-bestpost').value;
  d.objectif  = document.getElementById('s-objectif').value;
  d.note      = document.getElementById('s-note').value;
  // Objectifs réseaux
  d.objIg = document.getElementById('s-obj-ig').value;
  d.objTt = document.getElementById('s-obj-tt').value;
  d.objLi = document.getElementById('s-obj-li').value;
  setData(d);
  updateDashboard(d);
}

function loadSituation() {
  const d = getData();
  const set = (id, val) => { const el = document.getElementById(id); if(el && val !== undefined) el.value = val; };
  set('s-ig', d.ig); set('s-tt', d.tt); set('s-li', d.li);
  set('s-posts', d.posts); set('s-devis', d.devis);
  set('s-contrats', d.contrats); set('s-events', d.events);
  set('s-next-event', d.nextEvent);
  set('s-bestpost', d.bestpost);
  set('s-objectif', d.objectif);
  set('s-note', d.note);
  set('s-obj-ig', d.objIg);
  set('s-obj-tt', d.objTt);
  set('s-obj-li', d.objLi);
  updateDashboard(d);
  renderSnapshotList(d.snapshots || []);
  renderGrowthChart(d.snapshots || [], 'ig');
  loadEvinChecks();
}

function updateDashboard(d) {
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val || '—'; };
  set('kpi-ig', d.ig || '—');
  set('kpi-tt', d.tt || '—');
  set('kpi-li', d.li || '—');
  set('kpi-devis', d.devis || '—');
  set('kpi-contrats', d.contrats || '—');
  set('kpi-posts', d.posts || '—');

  // Deltas semaine/semaine
  const snaps = d.snapshots || [];
  updateDelta('d-ig', snaps, 'ig');
  updateDelta('d-tt', snaps, 'tt');
  updateDelta('d-li', snaps, 'li');

  // Prochain événement
  const ne = document.getElementById('next-event');
  if (ne) {
    ne.textContent = d.nextEvent || 'Aucun événement renseigné — va dans "Ma Situation" pour l\'ajouter';
    ne.style.color = d.nextEvent ? 'var(--alabaster2)' : 'var(--grey)';
  }

  // Barres de progression objectifs
  updateObjectifBar('obj-ig', d.ig, d.objIg, 'var(--gold)');
  updateObjectifBar('obj-tt', d.tt, d.objTt, 'var(--blue)');
  updateObjectifBar('obj-li', d.li, d.objLi, 'var(--green)');
}

// ═══════════════════════════════════════
// OBJECTIFS — BARRES DE PROGRESSION
// ═══════════════════════════════════════
function updateObjectifBar(prefix, current, target, color) {
  const txt = document.getElementById(prefix + '-txt');
  const bar = document.getElementById(prefix + '-bar');
  if (!txt || !bar) return;
  const c = parseInt(current) || 0;
  const t = parseInt(target) || 0;
  if (t === 0) {
    txt.textContent = c + ' / — (pas d\'objectif)';
    bar.style.width = '0%';
    return;
  }
  const pct = Math.min(Math.round((c / t) * 100), 100);
  txt.textContent = c.toLocaleString('fr-FR') + ' / ' + t.toLocaleString('fr-FR') + ' (' + pct + '%)';
  bar.style.width = pct + '%';
  bar.style.background = pct >= 100
    ? 'linear-gradient(90deg,#15803d,var(--green))'
    : bar.style.background;
}

// ═══════════════════════════════════════
// DELTA SEMAINE / SEMAINE
// ═══════════════════════════════════════
function updateDelta(elId, snaps, field) {
  const el = document.getElementById(elId);
  if (!el || snaps.length < 2) { if(el) el.textContent = ''; return; }
  const last = parseInt(snaps[snaps.length - 1][field]) || 0;
  const prev = parseInt(snaps[snaps.length - 2][field]) || 0;
  const diff = last - prev;
  if (diff === 0) { el.textContent = '→ stable'; el.style.color = 'var(--grey)'; return; }
  el.textContent = (diff > 0 ? '▲ +' : '▼ ') + diff + ' vs sem. préc.';
  el.style.color = diff > 0 ? 'var(--green)' : 'var(--red)';
}

// ═══════════════════════════════════════
// SNAPSHOTS HEBDOMADAIRES
// ═══════════════════════════════════════
function saveSnapshot() {
  const d = getData();
  if (!d.ig && !d.tt && !d.li) {
    alert('Renseignez au moins une métrique réseau avant d\'enregistrer.');
    return;
  }
  if (!d.snapshots) d.snapshots = [];

  // Vérifier si un snapshot existe déjà cette semaine
  const now     = new Date();
  const weekKey = getWeekKey(now);
  const exists  = d.snapshots.find(s => s.week === weekKey);
  if (exists) {
    if (!confirm('Un snapshot existe déjà pour cette semaine. Écraser ?')) return;
    d.snapshots = d.snapshots.filter(s => s.week !== weekKey);
  }

  const snap = {
    week:  weekKey,
    label: formatWeekLabel(now),
    ig:    parseInt(d.ig)  || 0,
    tt:    parseInt(d.tt)  || 0,
    li:    parseInt(d.li)  || 0,
    posts: parseInt(d.posts) || 0,
    date:  now.toISOString()
  };

  d.snapshots.push(snap);
  // Garder uniquement les 12 dernières semaines
  if (d.snapshots.length > 12) d.snapshots = d.snapshots.slice(-12);

  setData(d);
  renderSnapshotList(d.snapshots);
  renderGrowthChart(d.snapshots, currentChartField);
  updateDashboard(d);
  alert('✅ Snapshot semaine ' + snap.label + ' enregistré !');
}

function getWeekKey(date) {
  const d    = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // Lundi
  return d.toISOString().split('T')[0];
}

function formatWeekLabel(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
}

function renderSnapshotList(snaps) {
  const el = document.getElementById('snapshot-list');
  if (!el) return;
  if (!snaps || snaps.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--grey);font-size:12px;">Aucun historique enregistré — cliquez sur le bouton ci-dessus pour commencer.</div>';
    return;
  }
  const rows = [...snaps].reverse().map(s => {
    return `<div style="display:grid;grid-template-columns:80px 1fr 1fr 1fr;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;align-items:center;">
      <span style="color:var(--gold);font-weight:500;">Sem. ${s.label}</span>
      <span style="color:var(--grey);">📸 ${(s.ig||0).toLocaleString('fr-FR')}</span>
      <span style="color:var(--grey);">🎵 ${(s.tt||0).toLocaleString('fr-FR')}</span>
      <span style="color:var(--grey);">💼 ${(s.li||0).toLocaleString('fr-FR')}</span>
    </div>`;
  }).join('');
  el.innerHTML = rows;
}

// ═══════════════════════════════════════
// GRAPHIQUE DE CROISSANCE (Canvas)
// ═══════════════════════════════════════
let currentChartField = 'ig';
let chartInstance     = null;

function switchChart(field) {
  currentChartField = field;
  ['ig','tt','li'].forEach(f => {
    const btn = document.getElementById('chart-btn-' + f);
    if (btn) btn.classList.toggle('active', f === field);
  });
  const d = getData();
  renderGrowthChart(d.snapshots || [], field);
}

function renderGrowthChart(snaps, field) {
  const canvas = document.getElementById('growth-chart');
  const empty  = document.getElementById('chart-empty');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (!snaps || snaps.length < 2) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (empty) { canvas.style.display = 'none'; empty.style.display = 'block'; }
    return;
  }
  if (empty) { canvas.style.display = 'block'; empty.style.display = 'none'; }

  const colors = { ig: '#c8a96e', tt: '#60a5fa', li: '#4ade80' };
  const color  = colors[field] || '#c8a96e';
  const values = snaps.map(s => parseInt(s[field]) || 0);
  const labels = snaps.map(s => s.label);

  const W    = canvas.offsetWidth || 600;
  const H    = 140;
  canvas.width  = W;
  canvas.height = H;

  const pad   = { top: 16, right: 16, bottom: 28, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range  = maxVal - minVal || 1;

  ctx.clearRect(0, 0, W, H);

  // Grille horizontale
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = pad.top + chartH * (1 - t);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
    const val = Math.round(minVal + range * t);
    ctx.fillStyle = 'rgba(136,136,136,0.7)';
    ctx.font      = '10px Montserrat, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val.toLocaleString('fr-FR'), pad.left - 4, y + 3);
  });

  // Points calculés
  const pts = values.map((v, i) => ({
    x: pad.left + (i / (values.length - 1)) * chartW,
    y: pad.top  + chartH * (1 - (v - minVal) / range)
  }));

  // Remplissage dégradé
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0,   color + '40');
  grad.addColorStop(1,   color + '05');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.top + chartH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length-1].x, pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Ligne principale
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Points + labels X
  pts.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle   = color;
    ctx.fill();
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(136,136,136,0.8)';
    ctx.font      = '9px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], p.x, H - 4);
  });
}

function exportData() {
  const d = getData();
  const blob = new Blob([JSON.stringify(d, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'barcomm_pro_data.json';
  a.click();
}

function exportDrive() {
  const d = getData();
  const blob = new Blob([JSON.stringify(d, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'barcomm_data.json';
  a.click();
  const s = document.getElementById('export-status');
  if (s) { s.style.display = 'block'; setTimeout(() => s.style.display = 'none', 5000); }
  refreshJSONPreview();
}

function importDrive(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== 'object' || data === null) throw new Error('Format invalide');
      setData(data);
      loadSituation();
      loadChecks();
      loadCustomActions();
      loadJournal();
      refreshJSONPreview();
      const s = document.getElementById('import-status');
      if (s) {
        s.style.display = 'block';
        s.style.color = 'var(--green)';
        s.textContent = '✅ Données importées ! Dashboard mis à jour.';
        setTimeout(() => s.style.display = 'none', 5000);
      }
    } catch(err) {
      const s = document.getElementById('import-status');
      if (s) {
        s.style.display = 'block';
        s.style.color = 'var(--red)';
        s.textContent = '❌ Fichier invalide. Sélectionne un barcomm_data.json valide.';
      }
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function copyJSON() {
  const json = JSON.stringify(getData(), null, 2);
  navigator.clipboard.writeText(json).then(() => alert('JSON copié !')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = json; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    alert('JSON copié !');
  });
}

function pasteJSON() {
  const area = document.getElementById('paste-area');
  if (area) area.style.display = area.style.display === 'none' ? 'block' : 'none';
}

function loadFromPaste() {
  const input = document.getElementById('paste-input');
  if (!input || !input.value.trim()) return;
  try {
    const data = JSON.parse(input.value.trim());
    setData(data);
    loadSituation(); loadChecks(); loadCustomActions(); loadJournal();
    refreshJSONPreview();
    document.getElementById('paste-area').style.display = 'none';
    input.value = '';
    alert('✅ Données chargées avec succès !');
  } catch(err) { alert('❌ JSON invalide.'); }
}

function refreshJSONPreview() {
  const pre = document.getElementById('json-preview');
  if (!pre) return;
  const d = getData();
  if (!Object.keys(d).length) { pre.textContent = '// Aucune donnée sauvegardée.'; return; }
  const summary = {
    _info: 'barcomm_data.json — @cocktail_prive60',
    _date_export: new Date().toLocaleDateString('fr-FR'),
    métriques: { ig: d.ig||'—', tt: d.tt||'—', li: d.li||'—', devis: d.devis||'—', contrats: d.contrats||'—', posts: d.posts||'—' },
    prochain_event: d.nextEvent || '—',
    objectif: d.objectif || '—',
    journal_entries: d.journal ? d.journal.length : 0,
    actions_cochees: d.checks ? Object.values(d.checks).filter(Boolean).length : 0,
    actions_custom: d.customActions ? d.customActions.length : 0,
  };
  pre.textContent = JSON.stringify(summary, null, 2);
}

function resetData() {
  if (confirm('Supprimer toutes les données sauvegardées ?')) {
    localStorage.removeItem(KEY);
    location.reload();
  }
}

// ═══════════════════════════════════════
// CHECKLIST
// ═══════════════════════════════════════
function toggleCheck(item) {
  const key = item.getAttribute('data-key');
  item.classList.toggle('done');
  const d = getData();
  if (!d.checks) d.checks = {};
  d.checks[key] = item.classList.contains('done');
  setData(d);
}

function loadChecks() {
  const d = getData();
  if (!d.checks) return;
  document.querySelectorAll('.check-item[data-key]').forEach(item => {
    const key = item.getAttribute('data-key');
    if (d.checks[key]) item.classList.add('done');
  });
}

// ═══════════════════════════════════════
// LOI ÉVIN — CHECKLIST
// ═══════════════════════════════════════
function toggleEvinCheck(el) {
  el.classList.toggle('done');
  const key = el.getAttribute('data-evin-key');
  const d = getData();
  if (!d.evinChecks) d.evinChecks = {};
  d.evinChecks[key] = el.classList.contains('done');
  setData(d);
  updateEvinScore();
}

function loadEvinChecks() {
  const d = getData();
  const checks = d.evinChecks || {};
  document.querySelectorAll('[data-evin-key]').forEach(el => {
    if (checks[el.getAttribute('data-evin-key')]) el.classList.add('done');
    else el.classList.remove('done');
  });
  updateEvinScore();
}

function resetEvinChecks() {
  document.querySelectorAll('[data-evin-key]').forEach(el => el.classList.remove('done'));
  const d = getData();
  d.evinChecks = {};
  setData(d);
  updateEvinScore();
}

function updateEvinScore() {
  const items   = document.querySelectorAll('[data-evin-key]');
  const done    = document.querySelectorAll('[data-evin-key].done');
  const scoreEl = document.getElementById('evin-score');
  const barEl   = document.getElementById('evin-score-bar');
  const msgEl   = document.getElementById('evin-score-msg');
  if (!scoreEl || !items.length) return;
  const pct = Math.round((done.length / items.length) * 100);
  scoreEl.textContent = done.length + '/' + items.length + ' critères validés (' + pct + '%)';
  barEl.style.width   = pct + '%';
  barEl.style.background = pct === 100 ? 'var(--green)' : pct >= 60 ? 'var(--gold)' : 'var(--red)';
  msgEl.textContent   = pct === 100 ? '✅ Conforme — publie en confiance !' : pct >= 60 ? '⚠️ Vérification incomplète' : '❌ Non conforme — ne pas publier';
  msgEl.style.color   = pct === 100 ? 'var(--green)' : pct >= 60 ? 'var(--gold)' : 'var(--red)';
}

function copyEvinTemplate(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.innerText || el.textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text.trim()).then(() => alert('Template copié dans le presse-papier ✅'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text.trim();
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('Template copié dans le presse-papier ✅');
  }
}

function addCustomAction() {
  const input = document.getElementById('new-action-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;
  const d = getData();
  if (!d.customActions) d.customActions = [];
  const idx = d.customActions.length;
  d.customActions.push({text, done: false});
  setData(d);
  renderCustomAction({text, done: false}, idx);
  if (input) input.value = '';
}

function renderCustomAction(action, idx) {
  const container = document.getElementById('custom-actions');
  if (!container) return;
  const item = document.createElement('div');
  item.className = 'check-item' + (action.done ? ' done' : '');
  item.setAttribute('data-key', 'custom_' + idx);
  item.innerHTML = `<div class="check-box">✓</div><div class="check-text">${action.text}</div>`;
  item.onclick = function() {
    this.classList.toggle('done');
    const d = getData();
    if (d.customActions && d.customActions[idx]) d.customActions[idx].done = this.classList.contains('done');
    setData(d);
  };
  container.appendChild(item);
}

function loadCustomActions() {
  const d = getData();
  if (!d.customActions) return;
  d.customActions.forEach((a, i) => renderCustomAction(a, i));
}

// ═══════════════════════════════════════
// JOURNAL
// ═══════════════════════════════════════
function addJournalEntry() {
  const input = document.getElementById('journal-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;
  const entry = { text, date: new Date().toISOString() };
  const d = getData();
  if (!d.journal) d.journal = [];
  d.journal.unshift(entry);
  setData(d);
  renderJournalEntry(entry);
  if (input) input.value = '';
}

function renderJournalEntry(entry) {
  const list = document.getElementById('journal-list');
  if (!list) return;
  if (list.querySelector('[data-empty]')) list.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'journal-entry';
  const d = new Date(entry.date);
  const dateStr = d.toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'}) + ' · ' + d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  el.innerHTML = `<div class="journal-date">${dateStr}</div><div class="journal-text">${entry.text}</div>`;
  list.insertBefore(el, list.firstChild);
}

function loadJournal() {
  const d = getData();
  if (!d.journal || d.journal.length === 0) {
    document.getElementById('journal-list').innerHTML = '<div data-empty style="text-align:center;padding:2rem;color:var(--grey);font-size:13px;font-weight:300;">Ton journal est vide pour l\'instant.<br>Commence à tracer ton parcours ! 🚀</div>';
    return;
  }
  document.getElementById('journal-list').innerHTML = '';
  d.journal.forEach(e => renderJournalEntry(e));
}

// ═══════════════════════════════════════
// VEILLE ACTIONS
// ═══════════════════════════════════════
function setVeille(query) {
  const input = document.getElementById('veille-input');
  if (input) { input.value = query; input.focus(); }
  document.querySelectorAll('#panel-veille .pill').forEach(p => p.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');
}

function launchVeille() {
  const q = document.getElementById('veille-input').value.trim();
  if (!q) return;
  sendPrompt(`Tu es l'agent BarComm Pro de @cocktail_prive60 (barman à domicile dans l'Oise et l'Île-de-France). Lance une analyse de veille concurrentielle en temps réel sur : "${q}". Utilise ta recherche web pour trouver des informations actualisées. Présente les résultats avec : acteurs identifiés, forces/faiblesses, et opportunités concrètes pour @cocktail_prive60.`);
}

function qlaunch(prompt) {
  if (typeof sendPrompt === 'function') {
    sendPrompt(prompt);
  } else {
    // Standalone mode : copier le prompt dans le presse-papier
    navigator.clipboard.writeText(prompt).then(() => {
      alert('Prompt copié ! Colle-le dans Claude pour lancer l\'analyse.');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('Prompt copié ! Colle-le dans Claude pour lancer l\'analyse.');
    });
  }
}

// ═══════════════════════════════════════
// UTILITAIRE — TOAST NOTIFICATION
// ═══════════════════════════════════════
function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(74, 222, 128, 0.9);
    color: #0a0a0a;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ═══════════════════════════════════════
// BANQUE DE POSTS — GÉNÉRATEUR (PostsRS Skill)
// ═══════════════════════════════════════
function generatePostsWithRS() {
  const modal = document.getElementById('modal-generate-posts');
  if (modal) modal.style.display = 'flex';
}

function closePostModal() {
  const modal = document.getElementById('modal-generate-posts');
  if (modal) modal.style.display = 'none';
}

function launchPostGeneration() {
  const subject = document.getElementById('post-subject-input').value.trim();
  const style = document.getElementById('post-style-select').value;
  const platforms = Array.from(document.querySelectorAll('input[name="post-platforms"]:checked'))
    .map(el => el.value);

  if (!subject) {
    alert('Saisis un sujet ou une idée de post');
    return;
  }
  if (platforms.length === 0) {
    alert('Sélectionne au moins une plateforme');
    return;
  }

  // Construire le prompt PostsRS
  const prompt = buildPostsRSPrompt(subject, style, platforms);

  // Lancer via qlaunch (copie le prompt)
  qlaunch(prompt);

  // Fermer la modale
  closePostModal();
}

function buildPostsRSPrompt(subject, style, platforms) {
  const platformsText = {
    'threads': 'Threads',
    'x': 'X (Twitter)',
    'linkedin': 'LinkedIn'
  };

  const platformsList = platforms.map(p => platformsText[p] || p).join(', ');

  const styleGuide = {
    'short': '**Court & Punchy** — sous 280 caractères, directement engageant, style option 5 (emojis, CTAs clairs)',
    'medium': '**Moyen** — 300-500 caractères, contexte + value propositions, conversation starter',
    'long': '**Long-form** — 800-1500 caractères, histoire complète, sections structurées, story-telling'
  };

  const guide = styleGuide[style] || styleGuide['medium'];

  return `Tu es un expert en Social Media Post Generation basé sur le skill PostsRS.

Je veux créer des posts optimisés pour ${platformsList} pour @cocktail_prive60 (barman à domicile, Oise + Île-de-France).

**Sujet / Idée du post:**
"${subject}"

**Style demandé:** ${guide}

**Instructions PostsRS:**

Pour chaque plateforme, génère 3 variantes (court, moyen, long) en suivant ces règles précises :

### Threads
- Max 500 caractères (post standard)
- ✅ Conversationnel, authentique, pas corporate
- ✅ Questions ouvertes pour lancer discussions
- ✅ Emojis, bullet points, line breaks
- ❌ PAS de hashtags (algorithme les ignore)
- 🎯 Priorités algo : engagement (40%), recency (30%), relevance (20%), profile visits (10%)
- 💡 Best practices : demande l'avis, mentionne les utilisateurs, partage des coulisses, posts 1-3x/jour

### X (Twitter)
- Max 280 caractères (ou 25k pour Premium)
- ✅ Front-load l'info importante (premiers 100 chars)
- ✅ 1-2 hashtags MAX (plus = spam)
- ✅ Emojis, line breaks intentionnels
- ✅ Ajoute visuels (images/videos = +150% engagement)
- 🎯 Priorités algo : engagement rate, recency, media, authenticity
- 💡 Best practices : tweets threads pour le détail, visuels obligatoires, mentions stratégiques

### LinkedIn
- Max 3000 caractères (show more après ~140 chars en feed)
- ✅ Hook dans les 2 premières lignes
- ✅ Tone professionnel mais authentique
- ✅ Stories, data, statistics
- ✅ Bullet points, numbered lists, line breaks
- ❌ Évite promotionnel agressif
- 🎯 Priorités algo : dwell time (combien de temps on lit), engagement, relevance, 1st-degree connections
- 💡 Best practices : appelle à l'opinion, tags companies/people, poste 2-5x/semaine

**Format de sortie (pour chaque plateforme):**

\`\`\`
**Platform: [Plateforme]**
**Variant: [Court/Moyen/Long]**
**Character Count: [X]/[limite]**
**Engagement Score: [1-10]**

[TEXTE DU POST]

**Tags/Keywords:** [tags pertinents pour filtrage]
**Hashtags (si applicables):** [max 2-3 pour X, aucun pour Threads]
**Media Suggestion:** [description courte du visuel suggéré]
**CTA (Call-to-Action):** [action suggérée]
**Best Time to Post:** [créneau optimal]
\`\`\`

**Contexte @cocktail_prive60:**
- Service : barman privé à domicile
- Zones : Oise (60) + Île-de-France
- Segments : couples, mariages, afterworks, events corporates, team buildings
- USP : déplacement chez le client, cocktails personnalisés, professionnel

Génère maintenant les posts optimisés. Chaque plateforme avec ses 3 variantes. Suis strictement les specs PostsRS et respecte les limites de caractères.`;
}

function addPostToBank(postData) {
  // Cette fonction sera appelée une fois que l'utilisateur génère les posts
  // Elle permettra d'ajouter les posts générés à la banque
  const d = getData();
  if (!d.posts) d.posts = [];

  d.posts.push({
    id: Date.now(),
    platform: postData.platform,
    content: postData.content,
    tags: postData.tags || [],
    evin: postData.evin || 'service',
    variant: postData.variant || 'medium',
    status: 'nouveau',
    dateAdded: new Date().toISOString()
  });

  setData(d);
  renderPostsBank(d.posts);
  showToast('✅ Post ajouté à la banque');
}

function renderPostsBank(posts) {
  const container = document.getElementById('contenu-cards');
  if (!container || !posts || posts.length === 0) return;

  // Les posts statiques restent, on ajoute les nouveaux dynamiquement
  const dynamicPosts = posts.filter(p => p.id); // Posts avec ID = dynamiques

  dynamicPosts.forEach(post => {
    const existingCard = container.querySelector(`[data-post-id="${post.id}"]`);
    if (!existingCard) {
      const card = createPostCard(post);
      container.appendChild(card);
    }
  });
}

function createPostCard(post) {
  const card = document.createElement('div');
  card.className = 'content-card';
  card.setAttribute('data-tags', (post.tags || []).join(' '));
  card.setAttribute('data-evin', post.evin || 'service');
  card.setAttribute('data-post-id', post.id);

  const platformEmojis = {
    'threads': '🔵',
    'x': '𝕏',
    'linkedin': '💼',
    'instagram': '📸',
    'tiktok': '🎵',
    'facebook': '👍'
  };

  const platformName = post.platform.charAt(0).toUpperCase() + post.platform.slice(1);
  const emoji = platformEmojis[post.platform] || '📱';
  const variantBadge = post.variant === 'short' ? '(Punchy)' : post.variant === 'long' ? '(Long-form)' : '(Medium)';

  card.innerHTML = `
    <div class="content-head">
      <div style="display:flex;align-items:center;gap:8px;">
        <span>${emoji}</span>
        <span style="font-size:12px;font-weight:400;">${platformName} · ${variantBadge}</span>
        <span class="badge badge-gold">PostsRS</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="evin-badge ${post.evin}">${post.evin === 'service' ? '🟢 Service' : post.evin === 'alcool' ? '🔴 Alcool' : '📋'}</span>
        <span class="badge badge-grey">${post.status || 'nouveau'}</span>
      </div>
    </div>
    <div class="content-body">${post.content}</div>
    <div class="content-footer">
      <div class="hashtag-text">${(post.tags || []).map(t => '#' + t).join(' ')}</div>
      <button class="btn btn-dark btn-sm" onclick="qlaunch('Améliore et décline ce post PostsRS pour @cocktail_prive60 en variantes supplémentaires.')">Décliner ↗</button>
    </div>
  `;

  return card;
}

// ═══════════════════════════════════════
// CONTENT ENGINE — ADAPTER TOUS RÉSEAUX
// ═══════════════════════════════════════
function adaptMultiPlatform() {
  const modal = document.getElementById('modal-adapt-multi');
  if (modal) modal.style.display = 'flex';
}

function closeAdaptModal() {
  const modal = document.getElementById('modal-adapt-multi');
  if (modal) modal.style.display = 'none';
}

function launchMultiPlatformAdapt() {
  const content = document.getElementById('adapt-content-input').value.trim();
  const goal = document.getElementById('adapt-goal-select').value;
  const platforms = Array.from(document.querySelectorAll('input[name="adapt-platforms"]:checked'))
    .map(el => el.value);

  if (!content) {
    alert('Saisis le contenu à adapter');
    return;
  }
  if (platforms.length === 0) {
    alert('Sélectionne au moins une plateforme');
    return;
  }

  const prompt = buildContentEnginePrompt(content, goal, platforms);
  qlaunch(prompt);
  closeAdaptModal();
}

function buildContentEnginePrompt(content, goal, platforms) {
  const platformsText = {
    'x': 'X (Twitter)',
    'linkedin': 'LinkedIn',
    'tiktok': 'TikTok',
    'youtube': 'YouTube',
    'threads': 'Threads',
    'newsletter': 'Newsletter'
  };

  const platformsList = platforms.map(p => platformsText[p] || p).join(', ');

  const goalGuide = {
    'awareness': 'Objectif: Sensibiliser à la marque @cocktail_prive60',
    'conversion': 'Objectif: Convertir en clients, inclure CTA clair',
    'engagement': 'Objectif: Générer discussions et interactions',
    'authority': 'Objectif: Établir expertise en bartending',
    'recruitment': 'Objectif: Attirer nouveaux partenaires/clients'
  };

  const guide = goalGuide[goal] || goalGuide['engagement'];

  return `Tu es un expert en Content Engine - adapter du contenu nativement pour chaque plateforme.

**Contenu source:**
"${content}"

**Plateformes cibles:** ${platformsList}
${guide}

**Instructions Content Engine:**

Adapte ce contenu NATIVEMENT pour chaque plateforme (PAS du cross-posting). Chaque version doit:
✅ Suivre les best practices de sa plateforme
✅ Avoir un "hook" spécifique adapté à l'audience
✅ Respecter les limites techniques (caractères, format, durée)
✅ Porter le même message core mais reformulé nativement

**Spécifications par plateforme:**

### X (Twitter)
- Max 280 caractères
- Front-load l'info importante
- 1-2 hashtags MAX
- Visuel fortement recommandé
- Tone: Direct, conversationnel

### LinkedIn
- Max 3000 caractères
- Hook puissant (2 premières lignes)
- Story/data/statistiques
- Tone: Professionnel mais authentique
- CTA clair si conversion

### Threads
- Max 500 caractères
- Conversationnel, authentique
- PAS de hashtags
- Questions pour engagement
- Emojis & line breaks

### TikTok/YouTube
- Format vidéo: donne un script court (15-60s)
- Hook immédiat (3 premières secondes)
- Visuals + narration synchronisée
- Trending sounds/musiques si applicable
- CTA au final

### Newsletter
- Format article court
- Section titrée claire
- Tone: Informatif + personnel
- Lien si applicable
- Signature @cocktail_prive60

**Context @cocktail_prive60:**
Barman privé à domicile, Oise + Île-de-France, cocktails personnalisés, professionnel.

**Format de sortie:**

Pour chaque plateforme:

## [Plateforme]
[VERSION NATIVE DU CONTENU]

**Character/Word Count:** [X/limite]
**Hook:** [la première phrase clé]
**Best Time to Post:** [créneau optimal]
**Media Suggestion:** [description visuel suggéré si applicable]
**CTA:** [action suggérée]

---

Génère maintenant les adaptations pour chaque plateforme. Suis strictement les specs et assure-toi que chaque version est NATIVE à sa plateforme.`;
}

// ═══════════════════════════════════════
// VEO 3.1 VIDEO PROMPTER — GÉNÉRATION VIDÉO IA
// ═══════════════════════════════════════
function generateVideoPrompt() {
  const modal = document.getElementById('modal-generate-video');
  if (modal) modal.style.display = 'flex';
}

function closeVideoModal() {
  const modal = document.getElementById('modal-generate-video');
  if (modal) modal.style.display = 'none';
}

function launchVideoPrompt() {
  const idea = document.getElementById('video-idea-input').value.trim();
  const type = document.getElementById('video-type-select').value;
  const duration = document.getElementById('video-duration-select').value;
  const style = document.getElementById('video-style-select').value;

  if (!idea) {
    alert('Décris l\'idée vidéo');
    return;
  }

  const prompt = buildVeo3Prompt(idea, type, duration, style);
  qlaunch(prompt);
  closeVideoModal();
}

function buildVeo3Prompt(idea, type, duration, style) {
  const typeGuide = {
    'promo': 'Vidéo promotionnelle courte pour réseaux sociaux',
    'tutorial': 'Tutoriel / How-to vidéo pour apprendre une technique',
    'event': 'Teaser ou aperçu d\'événement/party',
    'behind-scenes': 'Behind-the-scenes / coulisses du service',
    'testimonial': 'Témoignage client ou présentation service',
    'showcase': 'Showcase de cocktails ou ambiance'
  };

  const styleGuide = {
    'cinematic': 'Cinéma professionnel avec transitions fluides',
    'tiktok': 'Style TikTok rapide, énergique, trending',
    'documentary': 'Documentaire naturel, authentique',
    'luxury': 'Haut de gamme, élégant, sophistiqué',
    'fun': 'Amusant, playful, ludique'
  };

  const durationInfo = duration === '4' ? '4 secondes' : duration === '6' ? '6 secondes' : '8 secondes';
  const typeDesc = typeGuide[type] || typeGuide['promo'];
  const styleDesc = styleGuide[style] || styleGuide['cinematic'];

  return `Tu es un expert Veo 3.1 Video Prompter - générateur de prompts vidéo pour Google Veo 3.1.

**Idée vidéo:**
"${idea}"

**Type:** ${typeDesc}
**Durée:** ${durationInfo}
**Style:** ${styleDesc}

**Instructions Veo 3.1 Prompter:**

Génère un prompt professionnel pour Veo 3.1 qui:

1. **Tier 1 — MUST INCLUDE:**
   - Shot size (wide/medium/close-up)
   - Subject identity (quoi/qui est en frame)
   - Primary action (ce qui se passe)
   - Mood/style dominant (1 mot clé)

2. **Tier 2 — SHOULD INCLUDE:**
   - Camera movement OU angle (un seul, pas les deux)
   - Lighting quality (naturel/dramatique/soft)
   - 1 couche audio (dialogue OU SFX OU ambient)
   - Setting/environnement

3. **Tier 3 — NICE TO HAVE:**
   - Secondary audio
   - Lens type
   - Couleurs/palette
   - Film grain/texture
   - Background action

**Audio Direction (Veo génère du son synchro):**
- Dialogue: "Person says, 'text here'"
- SFX: "SFX: description"
- Ambient: "Ambient: description"
- Music: "A [style] music plays"

**Pour multi-shots (8s max), utilise timestamps:**
[00:00-00:02] First shot description
[00:02-00:04] Second shot
etc.

**Contexte @cocktail_prive60:**
- Service: Barman privé à domicile
- Zones: Oise + Île-de-France
- Segments: Couples, mariages, afterworks, events corporates
- USP: Déplacement client, cocktails perso, professionnel

**Format de sortie:**

## Veo 3.1 Prompt

[PROMPT COMPLET - format optimisé Veo 3.1]

**Duration:** ${durationInfo}
**Shot Type:** [wide/medium/close-up/multi-shot]
**Key Elements:** [principales composantes]
**Audio Sync:** [description du son]
**Visual Style:** [cinématographie]
**Recommended Aspect Ratio:** [16:9 landscape / 9:16 portrait]

---

Crée maintenant un prompt Veo 3.1 professionnel prêt à être utilisé. Trouve l'équilibre parfait entre contrôle créatif et flexibilité du modèle.`;
}

// ═══════════════════════════════════════
// BANQUE DE POSTS — FILTRES
// ═══════════════════════════════════════
function filterPosts(tag) {
  // Mettre à jour l'état actif des pills
  document.querySelectorAll('#contenu-pills .pill').forEach(p => {
    p.classList.toggle('active', p.textContent.trim().toLowerCase() === tag || (tag === 'tous' && p.textContent.trim() === 'Tous'));
  });

  // Afficher/masquer les cartes selon le tag
  const cards = document.querySelectorAll('#contenu-cards .content-card');
  let visible = 0;
  cards.forEach(card => {
    const tags = (card.getAttribute('data-tags') || '').toLowerCase();
    const show = tag === 'tous' || tags.includes(tag.toLowerCase());
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  // Message si aucun résultat
  const container = document.getElementById('contenu-cards');
  const existing = container.querySelector('.contenu-empty');
  if (existing) existing.remove();
  if (visible === 0) {
    const msg = document.createElement('div');
    msg.className = 'contenu-empty';
    msg.style.cssText = 'text-align:center;padding:2rem;color:var(--grey);font-size:13px;font-weight:300;';
    msg.textContent = 'Aucun post pour ce filtre. Génère-en via le bouton "Générer banque IA" ci-dessus.';
    container.appendChild(msg);
  }
}

// ═══════════════════════════════════════
// COLLAPSIBLES
// ═══════════════════════════════════════
function toggle(header) {
  const body = header.nextElementSibling;
  const arrow = header.querySelector('.collapsible-arrow');
  if (!body) return;
  body.classList.toggle('open');
  if (arrow) arrow.classList.toggle('open');
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadSituation();
  loadMetaConfig();
  loadChecks();
  loadCustomActions();
  loadJournal();
  renderCampagnes();
  refreshJSONPreview();
  const d = getData();
  if (d.ig || d.tt) updateSaveTime();

  // Démarrer l'authentification Firebase
  // Quand les données cloud arrivent, on recharge tout
  initAuth(KEY, (cloudData) => {
    localStorage.setItem(KEY, JSON.stringify(cloudData));
    loadSituation();
    loadChecks();
    loadCustomActions();
    loadJournal();
    loadEvinChecks();
    renderCampagnes();
    refreshJSONPreview();
    updateSaveTime();
  }, COLLECTION);

  // Boutons connexion / déconnexion
  const btnLogin  = document.getElementById('btn-firebase-login');
  const btnLogout = document.getElementById('btn-firebase-logout');
  if (btnLogin)  btnLogin.addEventListener('click', loginWithGoogle);
  if (btnLogout) btnLogout.addEventListener('click', logout);
});

// ═══════════════════════════════════════
// SKILL TIER 2: COMPETITIVE ADS EXTRACTOR
// ═══════════════════════════════════════
function openCompetitiveAnalyzer() {
  const modal = document.getElementById('modal-competitive-analysis');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('competitors-input').focus();
  }
}

function closeCompetitiveModal() {
  const modal = document.getElementById('modal-competitive-analysis');
  if (modal) {
    modal.classList.remove('active');
    document.getElementById('competitors-input').value = '';
    document.getElementById('competitive-focus').value = 'all';
  }
}

function launchCompetitiveAnalysis() {
  const competitorsList = document.getElementById('competitors-input').value.trim();
  const focus = document.getElementById('competitive-focus').value;

  if (!competitorsList) {
    showToast('Veuillez entrer au moins un concurrent', 'error');
    return;
  }

  const prompt = buildCompetitivePrompt(competitorsList, focus);
  qlaunch(prompt);
  closeCompetitiveModal();
}

function buildCompetitivePrompt(competitorsList, focus) {
  const focusGuide = {
    'all': 'analyse complète',
    'messaging': 'analyse des messages et positionnement',
    'creative': 'analyse des patterns créatifs et visuels',
    'pain_points': 'analyse des problèmes et pain points soulevés',
    'cta': 'analyse des call-to-action et stratégie d\'engagement'
  };

  const focusDesc = focusGuide[focus] || focusGuide['all'];

  return `Tu es un expert Competitive Ads Extractor - spécialiste en analyse d'annonces concurrentes et stratégies marketing.

**Concurrents à analyser:**
${competitorsList}

**Contexte:** Bars et événements dans la région Oise/Île-de-France (@cocktail_prive60)
**Focus d'analyse:** ${focusDesc}

**Instructions Competitive Ads Extractor:**

1. **Extraction d'annonces:**
   - Accède aux ad libraries publiques (Facebook, LinkedIn, Instagram, etc.)
   - Extrait les annonces actuelles de chaque concurrent
   - Identifie le type d'annonce (statique, vidéo, carousel, etc.)

2. **Analyse des messages:**
   - Quels problèmes soulevés? (solitaire, ambiance, expérience unique, etc.)
   - Value propositions utilisées? (exclusivité, qualité, ambiance, événements, etc.)
   - Target audience apparent? (jeunes adultes, professionnels, étudiants, etc.)
   - CTAs utilisées? (Réserver, Découvrir, Rejoindre, etc.)

3. **Patterns créatifs qui fonctionnent:**
   - Visuels prédominants? (cocktails, ambiance, foule, faces, DJ, etc.)
   - Palettes de couleurs utilisées?
   - Styles de texte et ton? (fun, luxe, casual, professionnel, etc.)
   - Longueur des copys? (short, medium, long)
   - Éléments qui reviennent? (logos, hashtags, emojis, testimonials)

4. **Insights stratégiques:**
   - Qu'est-ce qui semble performer? (basé sur fréquence, placement, A/B variations)
   - Angles non exploités dans le marché local?
   - Gaps dans le messaging? (ce que personne ne dit)
   - Positionnement de chaque concurrent?

5. **Recommandations pour @cocktail_prive60:**
   - Patterns à tester pour vos annonces
   - Messaging à éviter (déjà saturé)
   - Opportunités uniques de différenciation
   - Audience segments à cibler différemment

**Format de sortie:**
- Tableau comparatif des 3 meilleurs ads par concurrent
- Analyse des pain points soulevés
- Top 3 patterns créatifs qui semblent marcher
- Messaging à tester
- Recommendations spécifiques pour @cocktail_prive60`;
}

// ═══════════════════════════════════════
// SKILL TIER 3: BRAND DESIGNER
// ═══════════════════════════════════════
function openBrandDesigner() {
  const modal = document.getElementById('modal-brand-designer');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('brand-request-input').focus();
  }
}

function closeBrandModal() {
  const modal = document.getElementById('modal-brand-designer');
  if (modal) {
    modal.classList.remove('active');
    document.getElementById('brand-request-input').value = '';
    document.getElementById('brand-type').value = 'complete';
  }
}

function launchBrandDesign() {
  const brandRequest = document.getElementById('brand-request-input').value.trim();
  const brandType = document.getElementById('brand-type').value;

  if (!brandRequest) {
    showToast('Décrivez votre besoin en design/marque', 'error');
    return;
  }

  const prompt = buildBrandDesignPrompt(brandRequest, brandType);
  qlaunch(prompt);
  closeBrandModal();
}

function buildBrandDesignPrompt(brandRequest, brandType) {
  const typeGuide = {
    'complete': 'Identité visuelle complète',
    'logo': 'Design de logo et variations',
    'palette': 'Palette de couleurs et typographie',
    'templates': 'Templates réseaux sociaux',
    'guidelines': 'Charte graphique et brand guidelines'
  };

  const typeDesc = typeGuide[brandType] || typeGuide['complete'];

  return `Tu es un expert Brand Designer - spécialiste en identité visuelle et design de marque.

**Contexte marque:** Cocktail Privé (@cocktail_prive60) — bar à événements dans Oise/Île-de-France
**Couleurs marque existantes:** Noir (#080808), Or (#c8a96e), Crème (#f5f0e8), Vert (#4ade80), Rouge (#f87171), Bleu (#60a5fa)

**Besoin:** ${brandRequest}
**Type de design:** ${typeDesc}

**Instructions Brand Designer:**

1. **Brand Discovery:**
   - Contexte: Bar à événements (mariages, corporate, soirées privées)
   - Audience: Adults 25-55, événementiel, corporate
   - Valeurs: Luxe, intimité, qualité, expérience unique
   - Personnalité: Sophistiqué, accueillant, professionnel, memorable

2. **Deliverables (selon le type demandé):**

   **Si Logo:**
   - 3 concepts de logo (wordmark, icon, full)
   - Description détaillée de chaque variation
   - Usage rules (scaling, monochrome, inversé)
   - Couleurs primaires et alternatives

   **Si Palette:**
   - Palette de 7-10 couleurs cohérentes
   - Hex codes et usages
   - Combinaisons de contraste pour accessibilité
   - Psychological impact de chaque couleur

   **Si Templates Social:**
   - Instagram post templates
   - TikTok video templates
   - LinkedIn post layouts
   - Story/Reels formats
   - Copy guidelines pour chaque plateforme

   **Si Guidelines:**
   - Logo usage rules
   - Typography hierarchy
   - Color applications
   - Photography style
   - Brand voice guidelines
   - Tone & language
   - Do's & Don'ts

   **Si Complet:**
   - Tous les éléments ci-dessus

3. **Design Principles:**
   - Luxe sophistiqué (pas flashy)
   - Scalable (favicon à billboard)
   - Modern mais intemporel
   - Cohérent avec Cocktail Privé identity
   - Respecte couleurs existantes

4. **Output Format:**
   - Descriptions visuelles détaillées
   - Code couleur (hex)
   - Instructions d'usage
   - Exemples d'application
   - Recommandations de déploiement

5. **Bonnes pratiques:**
   - Respect des WCAG contrast ratios
   - Lisibilité sur mobile et desktop
   - Compatibilité avec social media specs
   - Professional, cohérent, memorable`;
}

// ═══════════════════════════════════════
// API META — INSTAGRAM GRAPH API
// ═══════════════════════════════════════
const META_GRAPH = 'https://graph.facebook.com/v19.0';

let metaConfigTimer;
function autoSaveMetaConfig() {
  clearTimeout(metaConfigTimer);
  metaConfigTimer = setTimeout(saveMetaConfig, 600);
}

function saveMetaConfig() {
  const d = getData();
  const tokenEl = document.getElementById('meta-token-input');
  const igIdEl  = document.getElementById('meta-ig-id-input');
  if (tokenEl) d.metaToken = tokenEl.value.trim();
  if (igIdEl)  d.metaIgId  = igIdEl.value.trim();
  setData(d);
}

function loadMetaConfig() {
  const d = getData();
  const tokenEl = document.getElementById('meta-token-input');
  const igIdEl  = document.getElementById('meta-ig-id-input');
  const lastEl  = document.getElementById('meta-last-sync');
  if (tokenEl && d.metaToken) tokenEl.value = d.metaToken;
  if (igIdEl  && d.metaIgId)  igIdEl.value  = d.metaIgId;
  if (lastEl  && d.metaLastSync) {
    const dt = new Date(d.metaLastSync);
    lastEl.textContent = dt.toLocaleString('fr-FR', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  if (d.metaFollowers !== undefined) renderMetaKpis(d);
  // Show sync button on dashboard if configured
  const dashBtn = document.getElementById('btn-ig-sync');
  if (dashBtn && d.metaToken && d.metaIgId) dashBtn.style.display = 'block';
}

function renderMetaKpis(d) {
  const fmt = v => (v !== null && v !== undefined) ? Number(v).toLocaleString('fr-FR') : '—';
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmt(val); };
  set('meta-followers', d.metaFollowers);
  set('meta-posts', d.metaMediaCount);
  set('meta-reach', d.metaReach);
  set('meta-impressions', d.metaImpressions);
}

function setMetaStatus(msg, type) {
  const el = document.getElementById('meta-status-bar');
  if (!el) return;
  el.style.display = 'block';
  const styles = {
    ok:    { bg: 'rgba(74,222,128,0.08)',  border: '1px solid rgba(74,222,128,0.25)',   color: 'var(--vert)' },
    error: { bg: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--rouge)' },
    info:  { bg: 'rgba(200,169,110,0.07)', border: '1px solid rgba(200,169,110,0.2)',  color: 'var(--or)' }
  };
  const s = styles[type] || styles.info;
  el.style.background = s.bg;
  el.style.border = s.border;
  el.style.color = s.color;
  el.textContent = msg;
}

async function detectIgAccount() {
  const token = document.getElementById('meta-token-input')?.value.trim();
  if (!token) { showToast('Entre ton Access Token d\'abord.'); return; }
  setMetaStatus('🔍 Recherche du compte Instagram associé…', 'info');
  try {
    const resp = await fetch(`${META_GRAPH}/me/accounts?fields=name,instagram_business_account&access_token=${encodeURIComponent(token)}`);
    const json = await resp.json();
    if (json.error) { setMetaStatus('❌ ' + json.error.message, 'error'); return; }
    const page = (json.data || []).find(p => p.instagram_business_account);
    if (!page) {
      setMetaStatus('⚠️ Aucun compte Instagram Pro trouvé. Assure-toi que ton compte IG est lié à une Page Facebook professionnelle.', 'error');
      return;
    }
    const igId = page.instagram_business_account.id;
    const idInput = document.getElementById('meta-ig-id-input');
    if (idInput) idInput.value = igId;
    saveMetaConfig();
    setMetaStatus(`✅ Compte trouvé — Page : ${page.name} · ID Instagram : ${igId}`, 'ok');
    showToast('Compte Instagram détecté !');
  } catch(e) {
    setMetaStatus('❌ Erreur réseau : ' + e.message, 'error');
  }
}

async function syncMetaIG() {
  const d = getData();
  const token = d.metaToken || document.getElementById('meta-token-input')?.value.trim();
  const igId  = d.metaIgId  || document.getElementById('meta-ig-id-input')?.value.trim();
  if (!token || !igId) {
    showToast('Configure ton token Meta d\'abord.');
    nav('meta');
    return;
  }
  setMetaStatus('⟳ Synchronisation en cours…', 'info');
  ['btn-meta-sync','btn-meta-sync2','btn-ig-sync'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  });
  try {
    const infoResp = await fetch(
      `${META_GRAPH}/${igId}?fields=followers_count,media_count,name&access_token=${encodeURIComponent(token)}`
    );
    const info = await infoResp.json();
    if (info.error) {
      setMetaStatus('❌ ' + info.error.message, 'error');
      showToast('Erreur Meta : ' + info.error.message);
      return;
    }
    // Insights optionnels (nécessite instagram_manage_insights)
    let reach = null, impressions = null;
    try {
      const insResp = await fetch(
        `${META_GRAPH}/${igId}/insights?metric=reach,impressions&period=week&access_token=${encodeURIComponent(token)}`
      );
      const ins = await insResp.json();
      if (!ins.error && ins.data) {
        const rData = ins.data.find(m => m.name === 'reach');
        const iData = ins.data.find(m => m.name === 'impressions');
        if (rData?.values?.length) reach = rData.values[rData.values.length - 1].value;
        if (iData?.values?.length) impressions = iData.values[iData.values.length - 1].value;
      }
    } catch(_) { /* insights non disponibles */ }

    const now = new Date().toISOString();
    d.ig              = String(info.followers_count);
    d.posts           = String(info.media_count);
    d.metaFollowers   = info.followers_count;
    d.metaMediaCount  = info.media_count;
    d.metaReach       = reach;
    d.metaImpressions = impressions;
    d.metaLastSync    = now;
    setData(d);

    // Mettre à jour les champs de "Ma Situation"
    const igInput    = document.getElementById('s-ig');
    const postsInput = document.getElementById('s-posts');
    if (igInput)    igInput.value    = info.followers_count;
    if (postsInput) postsInput.value = info.media_count;

    updateDashboard(d);
    renderMetaKpis(d);

    const lastEl = document.getElementById('meta-last-sync');
    if (lastEl) {
      const dt = new Date(now);
      lastEl.textContent = dt.toLocaleString('fr-FR', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    }

    const reachTxt = reach !== null ? ` · Reach : ${reach.toLocaleString('fr-FR')}` : '';
    setMetaStatus(`✅ Synchronisé — ${info.followers_count.toLocaleString('fr-FR')} abonnés · ${info.media_count} posts${reachTxt}`, 'ok');
    showToast(`✅ Instagram sync — ${info.followers_count.toLocaleString('fr-FR')} abonnés`);

    const dashBtn = document.getElementById('btn-ig-sync');
    if (dashBtn) dashBtn.style.display = 'block';
  } catch(e) {
    setMetaStatus('❌ Erreur réseau : ' + e.message, 'error');
    showToast('Erreur connexion Meta');
  } finally {
    ['btn-meta-sync','btn-meta-sync2','btn-ig-sync'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    });
  }
}

// ═══════════════════════════════════════
// CAMPAGNES PUBLICITAIRES
// ═══════════════════════════════════════

let editingCampagneId = null;

function getCampagnes() {
  return getData().campagnes || [];
}

function saveCampagne() {
  const nom        = document.getElementById('camp-nom').value.trim();
  const type       = document.getElementById('camp-type').value;
  const statut     = document.getElementById('camp-statut').value;
  const dateDebut  = document.getElementById('camp-date-debut').value;
  const dateFin    = document.getElementById('camp-date-fin').value;
  const budget     = parseFloat(document.getElementById('camp-budget').value) || 0;
  const depense    = parseFloat(document.getElementById('camp-depense').value) || 0;
  const impressions= parseInt(document.getElementById('camp-impressions').value) || 0;
  const reach      = parseInt(document.getElementById('camp-reach').value) || 0;
  const clics      = parseInt(document.getElementById('camp-clics').value) || 0;
  const devis      = parseInt(document.getElementById('camp-devis').value) || 0;
  const valDevis   = parseFloat(document.getElementById('camp-valeur-devis').value) || 0;
  const contrats   = parseInt(document.getElementById('camp-contrats').value) || 0;
  const ca         = parseFloat(document.getElementById('camp-ca').value) || 0;
  const notes      = document.getElementById('camp-notes').value.trim();

  if (!nom) { showToast('Le nom de la campagne est requis', 'error'); return; }

  const d = getData();
  if (!d.campagnes) d.campagnes = [];

  if (editingCampagneId) {
    const idx = d.campagnes.findIndex(c => c.id === editingCampagneId);
    if (idx !== -1) {
      d.campagnes[idx] = { ...d.campagnes[idx], nom, type, statut, dateDebut, dateFin, budget, depense, impressions, reach, clics, devisGeneres: devis, valeurDevis: valDevis, contratsSignes: contrats, caGenere: ca, notes };
    }
    editingCampagneId = null;
  } else {
    d.campagnes.push({ id: Date.now(), nom, type, statut, dateDebut, dateFin, budget, depense, impressions, reach, clics, devisGeneres: devis, valeurDevis: valDevis, contratsSignes: contrats, caGenere: ca, notes });
  }

  setData(d);
  clearCampagneForm();
  renderCampagnes();
  showToast('Campagne enregistrée', 'success');
}

function editCampagne(id) {
  const c = getCampagnes().find(x => x.id === id);
  if (!c) return;
  editingCampagneId = id;
  document.getElementById('camp-nom').value            = c.nom || '';
  document.getElementById('camp-type').value           = c.type || 'boost_post';
  document.getElementById('camp-statut').value         = c.statut || 'active';
  document.getElementById('camp-date-debut').value     = c.dateDebut || '';
  document.getElementById('camp-date-fin').value       = c.dateFin || '';
  document.getElementById('camp-budget').value         = c.budget || '';
  document.getElementById('camp-depense').value        = c.depense || '';
  document.getElementById('camp-impressions').value    = c.impressions || '';
  document.getElementById('camp-reach').value          = c.reach || '';
  document.getElementById('camp-clics').value          = c.clics || '';
  document.getElementById('camp-devis').value          = c.devisGeneres || '';
  document.getElementById('camp-valeur-devis').value   = c.valeurDevis || '';
  document.getElementById('camp-contrats').value       = c.contratsSignes || '';
  document.getElementById('camp-ca').value             = c.caGenere || '';
  document.getElementById('camp-notes').value          = c.notes || '';
  document.getElementById('camp-form-title').textContent = 'Modifier la campagne';
  document.getElementById('camp-submit-btn').textContent = 'Mettre à jour';
  document.getElementById('camp-cancel-edit').style.display = 'inline-block';
  document.getElementById('camp-nom').focus();
}

function deleteCampagne(id) {
  if (!confirm('Supprimer cette campagne ?')) return;
  const d = getData();
  d.campagnes = (d.campagnes || []).filter(c => c.id !== id);
  setData(d);
  renderCampagnes();
  showToast('Campagne supprimée', 'success');
}

function clearCampagneForm() {
  ['camp-nom','camp-budget','camp-depense','camp-impressions','camp-reach','camp-clics',
   'camp-devis','camp-valeur-devis','camp-contrats','camp-ca','camp-notes',
   'camp-date-debut','camp-date-fin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const typeEl = document.getElementById('camp-type');
  if (typeEl) typeEl.value = 'boost_post';
  const statutEl = document.getElementById('camp-statut');
  if (statutEl) statutEl.value = 'active';
  const title = document.getElementById('camp-form-title');
  if (title) title.textContent = 'Nouvelle campagne Instagram';
  const btn = document.getElementById('camp-submit-btn');
  if (btn) btn.textContent = 'Enregistrer';
  const cancel = document.getElementById('camp-cancel-edit');
  if (cancel) cancel.style.display = 'none';
  editingCampagneId = null;
}

function renderCampagnes() {
  const campagnes = getCampagnes();
  const list = document.getElementById('camp-list');
  if (!list) return;

  // Résumé global
  const totalBudget  = campagnes.reduce((s, c) => s + (c.budget || 0), 0);
  const totalDepense = campagnes.reduce((s, c) => s + (c.depense || 0), 0);
  const totalDevis   = campagnes.reduce((s, c) => s + (c.devisGeneres || 0), 0);
  const totalCA      = campagnes.reduce((s, c) => s + (c.caGenere || 0), 0);
  const roi          = totalDepense > 0 ? ((totalCA - totalDepense) / totalDepense * 100).toFixed(0) : '—';

  const sumEl = document.getElementById('camp-summary');
  if (sumEl) {
    sumEl.innerHTML = `
      <div class="kpi-card"><div class="kpi-val">${formatCurrency(totalDepense)}</div><div class="kpi-label">Dépensé</div></div>
      <div class="kpi-card"><div class="kpi-val">${formatCurrency(totalBudget)}</div><div class="kpi-label">Budget total</div></div>
      <div class="kpi-card"><div class="kpi-val">${totalDevis}</div><div class="kpi-label">Devis générés</div></div>
      <div class="kpi-card"><div class="kpi-val">${formatCurrency(totalCA)}</div><div class="kpi-label">CA généré</div></div>
      <div class="kpi-card"><div class="kpi-val" style="color:${roi !== '—' && Number(roi) >= 0 ? 'var(--vert)' : 'var(--rouge)'}">${roi !== '—' ? roi + '%' : '—'}</div><div class="kpi-label">ROI global</div></div>
    `;
  }

  if (!campagnes.length) {
    list.innerHTML = '<p style="color:rgba(245,240,232,0.4);text-align:center;padding:32px 0;">Aucune campagne — créez votre première campagne ci-dessus.</p>';
    return;
  }

  const STATUT_LABEL = { active: '🟢 Active', terminee: '⚫ Terminée', pause: '🟡 Pause' };
  const TYPE_LABEL   = { boost_post: 'Boost Post', story: 'Story Ad', reel: 'Reel Ad', carousel: 'Carousel Ad', autre: 'Autre' };

  list.innerHTML = campagnes.slice().reverse().map(c => {
    const depenseAff  = c.depense || c.budget || 0;
    const roiC        = depenseAff > 0 && c.caGenere > 0 ? ((c.caGenere - depenseAff) / depenseAff * 100).toFixed(0) + '%' : '—';
    const coutDevis   = c.devisGeneres > 0 ? formatCurrency(depenseAff / c.devisGeneres) + '/devis' : '—';
    const dateRange   = c.dateDebut ? `${c.dateDebut}${c.dateFin ? ' → ' + c.dateFin : ''}` : '—';
    return `
      <div class="camp-card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--creme);margin-bottom:4px;">${c.nom}</div>
            <div style="font-size:11px;color:rgba(245,240,232,0.5);">${TYPE_LABEL[c.type]||c.type} · ${dateRange}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,0.06);">${STATUT_LABEL[c.statut]||c.statut}</span>
            <button onclick="editCampagne(${c.id})" style="background:rgba(200,169,110,0.12);border:1px solid rgba(200,169,110,0.3);color:var(--or);border-radius:4px;padding:3px 10px;font-size:11px;cursor:pointer;">Modifier</button>
            <button onclick="deleteCampagne(${c.id})" style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:var(--rouge);border-radius:4px;padding:3px 10px;font-size:11px;cursor:pointer;">✕</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin-top:12px;">
          <div style="text-align:center;"><div style="font-size:13px;font-weight:600;color:var(--or);">${formatCurrency(depenseAff)}</div><div style="font-size:10px;color:rgba(245,240,232,0.4);">Dépensé</div></div>
          <div style="text-align:center;"><div style="font-size:13px;font-weight:600;">${(c.impressions||0).toLocaleString('fr-FR')}</div><div style="font-size:10px;color:rgba(245,240,232,0.4);">Impressions</div></div>
          <div style="text-align:center;"><div style="font-size:13px;font-weight:600;">${(c.reach||0).toLocaleString('fr-FR')}</div><div style="font-size:10px;color:rgba(245,240,232,0.4);">Reach</div></div>
          <div style="text-align:center;"><div style="font-size:13px;font-weight:600;">${c.clics||0}</div><div style="font-size:10px;color:rgba(245,240,232,0.4);">Clics</div></div>
          <div style="text-align:center;"><div style="font-size:13px;font-weight:600;color:var(--bleu);">${c.devisGeneres||0}</div><div style="font-size:10px;color:rgba(245,240,232,0.4);">Devis</div></div>
          <div style="text-align:center;"><div style="font-size:13px;font-weight:600;color:var(--vert);">${formatCurrency(c.caGenere||0)}</div><div style="font-size:10px;color:rgba(245,240,232,0.4);">CA généré</div></div>
          <div style="text-align:center;"><div style="font-size:13px;font-weight:600;color:${roiC !== '—' && Number(roiC) >= 0 ? 'var(--vert)' : 'var(--rouge)'}">${roiC}</div><div style="font-size:10px;color:rgba(245,240,232,0.4);">ROI</div></div>
          <div style="text-align:center;"><div style="font-size:13px;font-weight:600;">${coutDevis}</div><div style="font-size:10px;color:rgba(245,240,232,0.4);">Coût/devis</div></div>
        </div>
        ${c.notes ? `<div style="margin-top:10px;font-size:11px;color:rgba(245,240,232,0.5);font-style:italic;">${c.notes}</div>` : ''}
      </div>`;
  }).join('');
}

// ═══════════════════════════════════════
// EXPOSITION GLOBALE — requis pour type="module"
// Les onclick="" du HTML ne voient pas les fonctions
// de module. On les expose explicitement sur window.
// ═══════════════════════════════════════
window.showToast           = showToast;
window.nav                 = nav;
window.toggle              = toggle;
window.autoSave            = autoSave;
window.saveSituation       = saveSituation;
window.saveSnapshot        = saveSnapshot;
window.switchChart         = switchChart;
window.exportData          = exportData;
window.exportDrive         = exportDrive;
window.importDrive         = importDrive;
window.resetData           = resetData;
window.copyJSON            = copyJSON;
window.pasteJSON           = pasteJSON;
window.loadFromPaste       = loadFromPaste;
window.toggleCheck         = toggleCheck;
window.addCustomAction     = addCustomAction;
window.addJournalEntry     = addJournalEntry;
window.setVeille           = setVeille;
window.launchVeille        = launchVeille;
window.qlaunch             = qlaunch;
window.toggleEvinCheck     = toggleEvinCheck;
window.resetEvinChecks     = resetEvinChecks;
window.copyEvinTemplate    = copyEvinTemplate;
window.filterPosts            = filterPosts;
window.generatePostsWithRS    = generatePostsWithRS;
window.closePostModal         = closePostModal;
window.launchPostGeneration   = launchPostGeneration;
window.addPostToBank          = addPostToBank;
window.adaptMultiPlatform     = adaptMultiPlatform;
window.closeAdaptModal        = closeAdaptModal;
window.launchMultiPlatformAdapt = launchMultiPlatformAdapt;
window.generateVideoPrompt    = generateVideoPrompt;
window.closeVideoModal        = closeVideoModal;
window.launchVideoPrompt      = launchVideoPrompt;
window.openCompetitiveAnalyzer = openCompetitiveAnalyzer;
window.closeCompetitiveModal  = closeCompetitiveModal;
window.launchCompetitiveAnalysis = launchCompetitiveAnalysis;
window.openBrandDesigner      = openBrandDesigner;
window.closeBrandModal        = closeBrandModal;
window.launchBrandDesign      = launchBrandDesign;
window.syncMetaIG             = syncMetaIG;
window.detectIgAccount        = detectIgAccount;
window.autoSaveMetaConfig     = autoSaveMetaConfig;

// ── Campagnes ──
window.saveCampagne           = saveCampagne;
window.deleteCampagne         = deleteCampagne;
window.editCampagne           = editCampagne;
window.clearCampagneForm      = clearCampagneForm;
