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
    ne.style.color = d.nextEvent ? 'var(--creme2)' : 'var(--gris)';
  }

  // Barres de progression objectifs
  updateObjectifBar('obj-ig', d.ig, d.objIg, 'var(--or)');
  updateObjectifBar('obj-tt', d.tt, d.objTt, 'var(--bleu)');
  updateObjectifBar('obj-li', d.li, d.objLi, 'var(--vert)');
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
    ? 'linear-gradient(90deg,#15803d,var(--vert))'
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
  if (diff === 0) { el.textContent = '→ stable'; el.style.color = 'var(--gris)'; return; }
  el.textContent = (diff > 0 ? '▲ +' : '▼ ') + diff + ' vs sem. préc.';
  el.style.color = diff > 0 ? 'var(--vert)' : 'var(--rouge)';
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
    el.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--gris);font-size:12px;">Aucun historique enregistré — cliquez sur le bouton ci-dessus pour commencer.</div>';
    return;
  }
  const rows = [...snaps].reverse().map(s => {
    return `<div style="display:grid;grid-template-columns:80px 1fr 1fr 1fr;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;align-items:center;">
      <span style="color:var(--or);font-weight:500;">Sem. ${s.label}</span>
      <span style="color:var(--gris);">📸 ${(s.ig||0).toLocaleString('fr-FR')}</span>
      <span style="color:var(--gris);">🎵 ${(s.tt||0).toLocaleString('fr-FR')}</span>
      <span style="color:var(--gris);">💼 ${(s.li||0).toLocaleString('fr-FR')}</span>
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
        s.style.color = 'var(--vert)';
        s.textContent = '✅ Données importées ! Dashboard mis à jour.';
        setTimeout(() => s.style.display = 'none', 5000);
      }
    } catch(err) {
      const s = document.getElementById('import-status');
      if (s) {
        s.style.display = 'block';
        s.style.color = 'var(--rouge)';
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
    document.getElementById('journal-list').innerHTML = '<div data-empty style="text-align:center;padding:2rem;color:var(--gris);font-size:13px;font-weight:300;">Ton journal est vide pour l\'instant.<br>Commence à tracer ton parcours ! 🚀</div>';
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
  loadChecks();
  loadCustomActions();
  loadJournal();
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
// EXPOSITION GLOBALE — requis pour type="module"
// Les onclick="" du HTML ne voient pas les fonctions
// de module. On les expose explicitement sur window.
// ═══════════════════════════════════════
window.nav             = nav;
window.toggle          = toggle;
window.autoSave        = autoSave;
window.saveSituation   = saveSituation;
window.saveSnapshot    = saveSnapshot;
window.switchChart     = switchChart;
window.exportData      = exportData;
window.exportDrive     = exportDrive;
window.importDrive     = importDrive;
window.resetData       = resetData;
window.copyJSON        = copyJSON;
window.pasteJSON       = pasteJSON;
window.loadFromPaste   = loadFromPaste;
window.toggleCheck     = toggleCheck;
window.addCustomAction = addCustomAction;
window.addJournalEntry = addJournalEntry;
window.setVeille       = setVeille;
window.launchVeille    = launchVeille;
window.qlaunch         = qlaunch;
