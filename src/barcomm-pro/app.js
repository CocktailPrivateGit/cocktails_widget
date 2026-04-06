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
  d.ig = document.getElementById('s-ig').value;
  d.tt = document.getElementById('s-tt').value;
  d.li = document.getElementById('s-li').value;
  d.posts = document.getElementById('s-posts').value;
  d.devis = document.getElementById('s-devis').value;
  d.contrats = document.getElementById('s-contrats').value;
  d.events = document.getElementById('s-events').value;
  d.nextEvent = document.getElementById('s-next-event').value;
  d.bestpost = document.getElementById('s-bestpost').value;
  d.objectif = document.getElementById('s-objectif').value;
  d.note = document.getElementById('s-note').value;
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
  updateDashboard(d);
}

function updateDashboard(d) {
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val || '—'; };
  set('kpi-ig', d.ig || '—'); set('kpi-tt', d.tt || '—');
  set('kpi-li', d.li || '—'); set('kpi-devis', d.devis || '—');
  set('kpi-contrats', d.contrats || '—'); set('kpi-posts', d.posts || '—');
  const ne = document.getElementById('next-event');
  if (ne) ne.textContent = d.nextEvent || 'Aucun événement renseigné — va dans "Ma Situation" pour l\'ajouter';
  ne && ne.style && (ne.style.color = d.nextEvent ? 'var(--creme2)' : 'var(--gris)');
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
});

