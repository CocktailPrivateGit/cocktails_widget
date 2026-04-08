// ═══════════════════════════════════════════════════════════════════
// BarPlanning Pro v2 — Phase A
// Dashboard · Calendrier (sync BarmanFinance) · Prestations CRUD
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY    = 'barplanning_pro_v2';
const BF_STORAGE_KEY = 'barmanfinance_data';

// ── ÉTAT ──────────────────────────────────────────────────────────
let state = {
  prestations: [],
  meta: { version: '2.0', created: new Date().toISOString(), lastSave: null }
};

let calCurrentDate = new Date();   // mois affiché dans le calendrier
let editingId      = null;         // id de la prestation en édition (null = nouveau)

// ── STATUTS ───────────────────────────────────────────────────────
const STATUTS = {
  en_attente: 'En attente',
  confirme:   'Confirmé',
  realise:    'Réalisé',
  annule:     'Annulé'
};

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

// ═══════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.prestations = saved.prestations || [];
      state.meta        = Object.assign(state.meta, saved.meta || {});
    }
  } catch(e) {
    console.error('BarPlanning: erreur lecture localStorage', e);
  }
}

function saveState() {
  state.meta.lastSave = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch(e) {
    console.error('BarPlanning: erreur écriture localStorage', e);
    showToast('Erreur de sauvegarde', 'error');
  }
}

// Lecture des revenus BarmanFinance (lecture seule, source externe)
function getBarmanFinanceEvents() {
  try {
    const raw = localStorage.getItem(BF_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const revenus = data.revenus || [];
    return revenus
      .filter(r => r.date)
      .map(r => ({
        id:     'bf_' + r.id,
        date:   r.date,
        client: r.client || '—',
        lieu:   r.lieu   || '',
        formule: r.formule || '',
        montant: r.montant || 0,
        statut: 'barmanfinance',
        source: 'barmanfinance'
      }));
  } catch(e) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION / TABS
// ═══════════════════════════════════════════════════════════════════

function switchTab(tab) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab:not(.nav-tab-soon)').forEach(t => t.classList.remove('active'));
  document.getElementById('section-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');

  if (tab === 'calendar')    renderCalendar();
  if (tab === 'prestations') { renderPrestations(); populateMonthFilter(); }
  if (tab === 'dashboard')   renderDashboard();
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

function renderDashboard() {
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  const thisMonth = state.prestations.filter(p => {
    if (!p.date) return false;
    const d = new Date(p.date);
    return d.getMonth() === month && d.getFullYear() === year && p.statut !== 'annule';
  });

  const total     = thisMonth.length;
  const pending   = thisMonth.filter(p => p.statut === 'en_attente').length;
  const confirmed = thisMonth.filter(p => p.statut === 'confirme').length;
  const ca        = thisMonth
    .filter(p => p.statut === 'confirme' || p.statut === 'realise')
    .reduce((s, p) => s + (parseFloat(p.montant) || 0), 0);

  document.getElementById('kpi-total').textContent     = total;
  document.getElementById('kpi-total-sub').textContent = MOIS_FR[month] + ' ' + year;
  document.getElementById('kpi-ca').textContent        = formatCurrency ? formatCurrency(ca) : ca.toFixed(2) + ' €';
  document.getElementById('kpi-pending').textContent   = pending;
  document.getElementById('kpi-confirmed').textContent = confirmed;

  // Prochaines prestations (à venir, triées par date)
  const today  = now.toISOString().split('T')[0];
  const upcoming = state.prestations
    .filter(p => p.date >= today && p.statut !== 'annule')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const container = document.getElementById('upcoming-list');
  if (!upcoming.length) {
    container.innerHTML = '<p class="empty-msg">Aucune prestation à venir</p>';
    return;
  }

  container.innerHTML = upcoming.map(p => {
    const d   = new Date(p.date + 'T12:00:00');
    const day = d.getDate();
    const mon = MOIS_FR[d.getMonth()].substring(0,3).toUpperCase();
    const heures = p.heureDebut && p.heureFin
      ? p.heureDebut + ' – ' + p.heureFin
      : p.heureDebut || '—';
    const montantStr = p.montant
      ? (formatCurrency ? formatCurrency(parseFloat(p.montant)) : parseFloat(p.montant).toFixed(2) + ' €')
      : '—';
    return `
      <div class="upcoming-item" onclick="openModal('${p.id}')" style="cursor:pointer;">
        <div class="upcoming-date-badge">
          <div class="upcoming-day">${day}</div>
          <div class="upcoming-month">${mon}</div>
        </div>
        <div class="upcoming-info">
          <div class="upcoming-client">${esc(p.client)}</div>
          <div class="upcoming-lieu">${esc(p.lieu || '—')}</div>
        </div>
        <div class="upcoming-right">
          <div class="upcoming-amount">${montantStr}</div>
          <div class="upcoming-hours">${heures}</div>
          <div style="margin-top:6px;">${statusPill(p.statut)}</div>
        </div>
      </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// CALENDRIER
// ═══════════════════════════════════════════════════════════════════

function renderCalendar() {
  const year  = calCurrentDate.getFullYear();
  const month = calCurrentDate.getMonth();

  document.getElementById('cal-title').textContent =
    MOIS_FR[month] + ' ' + year;

  // Toutes les events : propres + BarmanFinance
  const ownEvents = state.prestations.map(p => ({ ...p, source: 'own' }));
  const bfEvents  = getBarmanFinanceEvents();
  const allEvents = [...ownEvents, ...bfEvents];

  // Index par date YYYY-MM-DD
  const byDate = {};
  allEvents.forEach(ev => {
    if (!ev.date) return;
    const key = ev.date.substring(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(ev);
  });

  // Calcul du premier jour (lundi = 0 en FR)
  const firstDay  = new Date(year, month, 1);
  const lastDay   = new Date(year, month + 1, 0);
  let startOffset = firstDay.getDay() - 1; // 0=lundi
  if (startOffset < 0) startOffset = 6;    // dimanche → 6

  const today = new Date().toISOString().split('T')[0];

  let html = '';

  // Cellules du mois précédent (remplissage)
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d   = prevMonthDays - i;
    const key = formatDateKey(year, month - 1, d);
    html += buildCell(d, key, byDate[key] || [], true, key === today);
  }

  // Cellules du mois courant
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const key = formatDateKey(year, month, d);
    html += buildCell(d, key, byDate[key] || [], false, key === today);
  }

  // Complétion fin de grille
  const totalCells = startOffset + lastDay.getDate();
  const remainder  = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= remainder; d++) {
    const key = formatDateKey(year, month + 1, d);
    html += buildCell(d, key, byDate[key] || [], true, false);
  }

  document.getElementById('cal-grid').innerHTML = html;

  // Fermer détail si ouvert sur un autre mois
  closeDayDetail();
}

function buildCell(dayNum, dateKey, events, otherMonth, isToday) {
  const classes = ['cal-cell'];
  if (otherMonth) classes.push('other-month');
  if (isToday)    classes.push('today');
  if (events.length) classes.push('has-events');

  const MAX_SHOWN = 3;
  const shown   = events.slice(0, MAX_SHOWN);
  const hidden  = events.length - MAX_SHOWN;
  const clickCb = otherMonth ? '' : `onclick="showDayDetail('${dateKey}')"`;

  const evHtml = shown.map(ev => {
    const cls = ev.source === 'barmanfinance' ? 'ev-barmanfinance' : `ev-${ev.statut}`;
    return `<div class="cal-event ${cls}">${esc(ev.client)}</div>`;
  }).join('');

  const moreHtml = hidden > 0
    ? `<div class="cal-more">+${hidden} autre${hidden > 1 ? 's' : ''}</div>`
    : '';

  return `
    <div class="${classes.join(' ')}" ${clickCb}>
      <div class="cal-day-num">${dayNum}</div>
      ${evHtml}
      ${moreHtml}
    </div>`;
}

function showDayDetail(dateKey) {
  const ownEvents = state.prestations.filter(p => p.date && p.date.substring(0,10) === dateKey);
  const bfEvents  = getBarmanFinanceEvents().filter(ev => ev.date && ev.date.substring(0,10) === dateKey);
  const allEvents = [...ownEvents.map(p => ({...p, source:'own'})), ...bfEvents];

  if (!allEvents.length) return;

  const d = new Date(dateKey + 'T12:00:00');
  document.getElementById('day-detail-title').textContent =
    'Prestations du ' + d.getDate() + ' ' + MOIS_FR[d.getMonth()] + ' ' + d.getFullYear();

  document.getElementById('day-detail-list').innerHTML = allEvents.map(ev => {
    const isBf   = ev.source === 'barmanfinance';
    const heures = ev.heureDebut && ev.heureFin
      ? ev.heureDebut + ' – ' + ev.heureFin
      : '—';
    const montantStr = ev.montant
      ? (formatCurrency ? formatCurrency(parseFloat(ev.montant)) : parseFloat(ev.montant).toFixed(2) + ' €')
      : '';
    const click   = isBf ? '' : `onclick="openModal('${ev.id}')"`;
    const badge   = isBf
      ? '<span class="day-detail-readonly">BarmanFinance</span>'
      : statusPill(ev.statut);
    const sub = [ev.lieu, ev.formule, heures].filter(Boolean).join(' · ');

    return `
      <div class="day-detail-item" ${click} ${isBf ? 'style="cursor:default;"' : ''}>
        <div class="day-detail-info">
          <div class="day-detail-client">${esc(ev.client)}</div>
          <div class="day-detail-sub">${esc(sub)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          ${montantStr ? `<span style="color:var(--gold);font-size:15px;">${montantStr}</span>` : ''}
          ${badge}
        </div>
      </div>`;
  }).join('');

  const panel = document.getElementById('day-detail');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeDayDetail() {
  const panel = document.getElementById('day-detail');
  if (panel) panel.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════════
// PRESTATIONS — LIST
// ═══════════════════════════════════════════════════════════════════

function renderPrestations() {
  const statut = document.getElementById('filter-statut').value;
  const month  = document.getElementById('filter-month').value;

  let list = [...state.prestations].sort((a, b) => {
    // Tri : à venir d'abord (desc date), puis passées
    return b.date.localeCompare(a.date);
  });

  if (statut) list = list.filter(p => p.statut === statut);
  if (month)  list = list.filter(p => p.date && p.date.substring(0, 7) === month);

  const container = document.getElementById('prestations-list');
  if (!list.length) {
    container.innerHTML = '<p class="empty-msg">Aucune prestation</p>';
    return;
  }

  container.innerHTML = list.map(p => {
    const d      = new Date(p.date + 'T12:00:00');
    const dateStr = d.getDate() + ' ' + MOIS_FR[d.getMonth()] + ' ' + d.getFullYear();
    const heures = p.heureDebut && p.heureFin ? p.heureDebut + ' – ' + p.heureFin : '';
    const montantStr = p.montant
      ? (formatCurrency ? formatCurrency(parseFloat(p.montant)) : parseFloat(p.montant).toFixed(2) + ' €')
      : '—';

    return `
      <div class="prest-card" onclick="openModal('${p.id}')">
        <div class="prest-card-header">
          <div>
            <div class="prest-client">${esc(p.client)}</div>
            <div class="prest-date">${dateStr}</div>
          </div>
          ${statusPill(p.statut)}
        </div>
        <div class="prest-meta">
          ${p.lieu     ? `<div class="prest-meta-item"><div class="prest-meta-label">Lieu</div><div class="prest-meta-value">${esc(p.lieu)}</div></div>` : ''}
          ${p.formule  ? `<div class="prest-meta-item"><div class="prest-meta-label">Formule</div><div class="prest-meta-value">${esc(p.formule)}</div></div>` : ''}
          ${p.personnes? `<div class="prest-meta-item"><div class="prest-meta-label">Personnes</div><div class="prest-meta-value">${p.personnes}</div></div>` : ''}
        </div>
        <div class="prest-card-footer">
          <span class="prest-amount">${montantStr}</span>
          ${heures ? `<span class="prest-hours">${heures}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

function populateMonthFilter() {
  const months = new Set();
  state.prestations.forEach(p => {
    if (p.date) months.add(p.date.substring(0, 7));
  });

  const sorted = [...months].sort().reverse();
  const sel    = document.getElementById('filter-month');
  const prev   = sel.value;

  sel.innerHTML = '<option value="">Tous les mois</option>' +
    sorted.map(m => {
      const [y, mo] = m.split('-');
      const label   = MOIS_FR[parseInt(mo) - 1] + ' ' + y;
      return `<option value="${m}" ${m === prev ? 'selected' : ''}>${label}</option>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// MODAL PRESTATION — CRUD
// ═══════════════════════════════════════════════════════════════════

function openModal(id) {
  editingId = id || null;

  const title  = document.getElementById('modal-title');
  const delBtn = document.getElementById('btn-delete-prestation');
  const form   = document.getElementById('prestation-form');

  form.reset();

  if (editingId) {
    const p = state.prestations.find(x => x.id === editingId);
    if (!p) return;
    title.textContent = 'Modifier la prestation';
    delBtn.style.display = 'inline-flex';
    document.getElementById('f-client').value    = p.client     || '';
    document.getElementById('f-date').value      = p.date       || '';
    document.getElementById('f-heure-debut').value = p.heureDebut || '';
    document.getElementById('f-heure-fin').value   = p.heureFin   || '';
    document.getElementById('f-lieu').value      = p.lieu       || '';
    document.getElementById('f-formule').value   = p.formule    || '';
    document.getElementById('f-personnes').value = p.personnes  || '';
    document.getElementById('f-montant').value   = p.montant    || '';
    document.getElementById('f-notes').value     = p.notes      || '';
    document.getElementById('f-statut').value    = p.statut     || 'en_attente';
  } else {
    title.textContent = 'Nouvelle prestation';
    delBtn.style.display = 'none';
    // Date du jour par défaut
    document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
  }

  document.getElementById('modal-prestation').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-prestation').classList.remove('open');
  editingId = null;
}

function onOverlayClick(e) {
  if (e.target.id === 'modal-prestation') closeModal();
}

function savePrestation(e) {
  e.preventDefault();

  const prestation = {
    id:         editingId || Date.now().toString(),
    client:     document.getElementById('f-client').value.trim(),
    date:       document.getElementById('f-date').value,
    heureDebut: document.getElementById('f-heure-debut').value,
    heureFin:   document.getElementById('f-heure-fin').value,
    lieu:       document.getElementById('f-lieu').value.trim(),
    formule:    document.getElementById('f-formule').value,
    personnes:  parseInt(document.getElementById('f-personnes').value) || null,
    montant:    parseFloat(document.getElementById('f-montant').value) || null,
    notes:      document.getElementById('f-notes').value.trim(),
    statut:     document.getElementById('f-statut').value,
    updatedAt:  new Date().toISOString()
  };

  if (editingId) {
    const idx = state.prestations.findIndex(p => p.id === editingId);
    if (idx !== -1) state.prestations[idx] = prestation;
  } else {
    prestation.createdAt = new Date().toISOString();
    state.prestations.push(prestation);
  }

  saveState();
  closeModal();
  refreshCurrentSection();
  showToast(editingId ? 'Prestation mise à jour' : 'Prestation créée', 'success');
}

function deletePrestation() {
  if (!editingId) return;
  const p = state.prestations.find(x => x.id === editingId);
  if (!p) return;
  if (!confirm(`Supprimer la prestation de "${p.client}" du ${p.date} ?`)) return;
  state.prestations = state.prestations.filter(x => x.id !== editingId);
  saveState();
  closeModal();
  refreshCurrentSection();
  showToast('Prestation supprimée');
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════════════════════════════

function exportData() {
  const data = { ...state, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'barplanning_export_' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Export téléchargé', 'success');
}

function importData() {
  document.getElementById('import-input').click();
}

function onImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!Array.isArray(parsed.prestations)) {
        showToast('Fichier invalide', 'error');
        return;
      }
      if (!confirm(`Importer ${parsed.prestations.length} prestation(s) ? Les données actuelles seront remplacées.`)) return;
      state.prestations = parsed.prestations;
      saveState();
      refreshCurrentSection();
      showToast(`${parsed.prestations.length} prestations importées`, 'success');
    } catch(err) {
      showToast('Erreur lecture fichier', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ═══════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════

function refreshCurrentSection() {
  const active = document.querySelector('.section.active');
  if (!active) return;
  const id = active.id.replace('section-', '');
  if (id === 'dashboard')   renderDashboard();
  if (id === 'calendar')    renderCalendar();
  if (id === 'prestations') { renderPrestations(); populateMonthFilter(); }
}

function statusPill(statut) {
  const label = STATUTS[statut] || statut;
  return `<span class="status-pill status-${statut}">${label}</span>`;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateKey(year, month, day) {
  const m = ((month % 12) + 12) % 12;
  const y = year + Math.floor(month / 12);
  return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════

function init() {
  loadState();

  // Navigation calendrier
  document.getElementById('btn-prev-month').addEventListener('click', () => {
    calCurrentDate = new Date(calCurrentDate.getFullYear(), calCurrentDate.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('btn-next-month').addEventListener('click', () => {
    calCurrentDate = new Date(calCurrentDate.getFullYear(), calCurrentDate.getMonth() + 1, 1);
    renderCalendar();
  });

  // Fermeture modal via Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  renderDashboard();
}

// Expose les fonctions appelées depuis le HTML
window.switchTab       = switchTab;
window.openModal       = openModal;
window.closeModal      = closeModal;
window.onOverlayClick  = onOverlayClick;
window.savePrestation  = savePrestation;
window.deletePrestation= deletePrestation;
window.showDayDetail   = showDayDetail;
window.closeDayDetail  = closeDayDetail;
window.exportData      = exportData;
window.importData      = importData;
window.onImportFile    = onImportFile;

init();
