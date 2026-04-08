// ═══════════════════════════════════════════════════════════════════
// BarPlanning Pro v2 — Phase C
// Dashboard · Calendrier · Prestations CRUD
// Personnel (CSV + manuel) · Indisponibilités · Assignation équipe
// Planning matrice · Export vers BarmanFinance
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY    = 'barplanning_pro_v2';
const BF_STORAGE_KEY = 'barmanfinance_data';
const PRINCIPAL_ID   = 'principal';  // ID réservé au barman principal (utilisateur)

// ── ÉTAT ──────────────────────────────────────────────────────────
let state = {
  prestations:      [],
  personnel:        [],
  indisponibilites: [],
  meta: { version: '2.1', created: new Date().toISOString(), lastSave: null }
};

let calCurrentDate      = new Date();
let planningCurrentDate = new Date();
let editingId           = null;   // prestation en édition
let editingPersoId      = null;   // personnel en édition
let indispoPersoId      = null;   // personnel dont on gère les indispos

// ── CONSTANTES ────────────────────────────────────────────────────
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
      state.prestations      = saved.prestations      || [];
      state.personnel        = saved.personnel        || [];
      state.indisponibilites = saved.indisponibilites || [];
      state.meta             = Object.assign(state.meta, saved.meta || {});
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

function getBarmanFinanceEvents() {
  try {
    const raw = localStorage.getItem(BF_STORAGE_KEY);
    if (!raw) return [];
    const data   = JSON.parse(raw);
    const revenus = data.revenus || [];
    return revenus
      .filter(r => r.date)
      .map(r => ({
        id:      'bf_' + r.id,
        date:    r.date,
        client:  r.client  || '—',
        lieu:    r.lieu    || '',
        formule: r.formule || '',
        montant: r.montant || 0,
        statut:  'barmanfinance',
        source:  'barmanfinance'
      }));
  } catch(e) { return []; }
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════

function switchTab(tab) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab:not(.nav-tab-soon)').forEach(t => t.classList.remove('active'));
  document.getElementById('section-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');

  if (tab === 'dashboard')   renderDashboard();
  if (tab === 'calendar')    renderCalendar();
  if (tab === 'prestations') { renderPrestations(); populateMonthFilter(); }
  if (tab === 'personnel')   renderPersonnel();
  if (tab === 'planning')    renderPlanning();
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

  const total   = thisMonth.length;
  const pending = thisMonth.filter(p => p.statut === 'en_attente').length;
  const ca      = thisMonth
    .filter(p => p.statut === 'confirme' || p.statut === 'realise')
    .reduce((s, p) => s + (parseFloat(p.montant) || 0), 0);
  const nbPerso = state.personnel.filter(p => p.actif).length;

  document.getElementById('kpi-total').textContent     = total;
  document.getElementById('kpi-total-sub').textContent = MOIS_FR[month] + ' ' + year;
  document.getElementById('kpi-ca').textContent        = fmtMoney(ca);
  document.getElementById('kpi-pending').textContent   = pending;
  document.getElementById('kpi-personnel').textContent = nbPerso;

  // Alertes conflits
  renderDashAlerts();

  // Prochaines prestations
  const today    = now.toISOString().split('T')[0];
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
    const d      = new Date(p.date + 'T12:00:00');
    const day    = d.getDate();
    const mon    = MOIS_FR[d.getMonth()].substring(0, 3).toUpperCase();
    const heures = p.heureDebut && p.heureFin ? p.heureDebut + ' – ' + p.heureFin : p.heureDebut || '—';
    const equipeHtml = buildEquipeBadges(p);
    return `
      <div class="upcoming-item" onclick="openModal('${p.id}')" style="cursor:pointer;">
        <div class="upcoming-date-badge">
          <div class="upcoming-day">${day}</div>
          <div class="upcoming-month">${mon}</div>
        </div>
        <div class="upcoming-info">
          <div class="upcoming-client">${esc(p.client)}</div>
          <div class="upcoming-lieu">${esc(p.lieu || '—')}</div>
          ${equipeHtml ? `<div class="upcoming-equipe">${equipeHtml}</div>` : ''}
        </div>
        <div class="upcoming-right">
          <div class="upcoming-amount">${p.montant ? fmtMoney(parseFloat(p.montant)) : '—'}</div>
          <div class="upcoming-hours">${heures}</div>
          <div style="margin-top:6px;">${statusPill(p.statut)}</div>
        </div>
      </div>`;
  }).join('');
}

function renderDashAlerts() {
  const today = new Date().toISOString().split('T')[0];
  const alerts = [];

  // Cherche les prestations à venir avec des conflits d'indispo
  state.prestations
    .filter(p => p.date >= today && p.statut !== 'annule' && Array.isArray(p.equipe))
    .forEach(p => {
      p.equipe.forEach(pid => {
        if (pid === PRINCIPAL_ID) return;
        if (!isDisponible(pid, p.date)) {
          const perso  = state.personnel.find(x => x.id === pid);
          const name   = perso ? perso.prenom + ' ' + perso.nom : 'Inconnu';
          alerts.push(`<strong>${name}</strong> est indisponible le ${fmtDate(p.date)} (${esc(p.client)})`);
        }
      });
    });

  const container = document.getElementById('dash-alerts');
  if (!alerts.length) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <div class="alert-block" style="margin-bottom:20px;">
      <div class="alert-title">⚠ Conflits d'équipe détectés</div>
      ${alerts.map(a => `<div class="alert-item">${a}</div>`).join('')}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// CALENDRIER
// ═══════════════════════════════════════════════════════════════════

function renderCalendar() {
  const year  = calCurrentDate.getFullYear();
  const month = calCurrentDate.getMonth();
  document.getElementById('cal-title').textContent = MOIS_FR[month] + ' ' + year;

  const ownEvents = state.prestations.map(p => ({ ...p, source: 'own' }));
  const bfEvents  = getBarmanFinanceEvents();
  const allEvents = [...ownEvents, ...bfEvents];

  const byDate = {};
  allEvents.forEach(ev => {
    if (!ev.date) return;
    const key = ev.date.substring(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(ev);
  });

  const firstDay      = new Date(year, month, 1);
  const lastDay       = new Date(year, month + 1, 0);
  let   startOffset   = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const today          = new Date().toISOString().split('T')[0];
  const prevMonthDays  = new Date(year, month, 0).getDate();
  let   html           = '';

  for (let i = startOffset - 1; i >= 0; i--) {
    const d   = prevMonthDays - i;
    const key = formatDateKey(year, month - 1, d);
    html += buildCell(d, key, byDate[key] || [], true, false);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const key = formatDateKey(year, month, d);
    html += buildCell(d, key, byDate[key] || [], false, key === today);
  }
  const totalCells = startOffset + lastDay.getDate();
  const remainder  = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= remainder; d++) {
    const key = formatDateKey(year, month + 1, d);
    html += buildCell(d, key, byDate[key] || [], true, false);
  }

  document.getElementById('cal-grid').innerHTML = html;
  closeDayDetail();
}

function buildCell(dayNum, dateKey, events, otherMonth, isToday) {
  const classes  = ['cal-cell'];
  if (otherMonth)    classes.push('other-month');
  if (isToday)       classes.push('today');
  if (events.length) classes.push('has-events');

  const MAX_SHOWN = 3;
  const shown  = events.slice(0, MAX_SHOWN);
  const hidden = events.length - MAX_SHOWN;
  const clickCb = otherMonth ? '' : `onclick="showDayDetail('${dateKey}')"`;

  const evHtml  = shown.map(ev => {
    const cls = ev.source === 'barmanfinance' ? 'ev-barmanfinance' : `ev-${ev.statut}`;
    return `<div class="cal-event ${cls}">${esc(ev.client)}</div>`;
  }).join('');

  const moreHtml = hidden > 0
    ? `<div class="cal-more">+${hidden} autre${hidden > 1 ? 's' : ''}</div>` : '';

  return `
    <div class="${classes.join(' ')}" ${clickCb}>
      <div class="cal-day-num">${dayNum}</div>
      ${evHtml}${moreHtml}
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
    const isBf    = ev.source === 'barmanfinance';
    const heures  = ev.heureDebut && ev.heureFin ? ev.heureDebut + ' – ' + ev.heureFin : '—';
    const montantStr = ev.montant ? fmtMoney(parseFloat(ev.montant)) : '';
    const click   = isBf ? '' : `onclick="openModal('${ev.id}')"`;
    const badge   = isBf ? '<span class="day-detail-readonly">BarmanFinance</span>' : statusPill(ev.statut);
    const sub     = [ev.lieu, ev.formule, heures].filter(Boolean).join(' · ');
    const equipeHtml = (!isBf && ev.equipe) ? buildEquipeBadges(ev) : '';
    return `
      <div class="day-detail-item" ${click} ${isBf ? 'style="cursor:default;"' : ''}>
        <div class="day-detail-info">
          <div class="day-detail-client">${esc(ev.client)}</div>
          <div class="day-detail-sub">${esc(sub)}</div>
          ${equipeHtml ? `<div style="margin-top:6px;">${equipeHtml}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
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

  let list = [...state.prestations].sort((a, b) => b.date.localeCompare(a.date));
  if (statut) list = list.filter(p => p.statut === statut);
  if (month)  list = list.filter(p => p.date && p.date.substring(0, 7) === month);

  const container = document.getElementById('prestations-list');
  if (!list.length) {
    container.innerHTML = '<p class="empty-msg">Aucune prestation</p>';
    return;
  }

  container.innerHTML = list.map(p => {
    const d       = new Date(p.date + 'T12:00:00');
    const dateStr = d.getDate() + ' ' + MOIS_FR[d.getMonth()] + ' ' + d.getFullYear();
    const heures  = p.heureDebut && p.heureFin ? p.heureDebut + ' – ' + p.heureFin : '';
    const equipeHtml = buildEquipeBadges(p);
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
        ${equipeHtml ? `<div class="prest-equipe">${equipeHtml}</div>` : ''}
        <div class="prest-card-footer">
          <span class="prest-amount">${p.montant ? fmtMoney(parseFloat(p.montant)) : '—'}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            ${heures ? `<span class="prest-hours">${heures}</span>` : ''}
            ${p.exportedToBF ? `<span class="bf-badge" title="Facture ${esc(p.bfFacture || '?')}">BF ✓</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function populateMonthFilter() {
  const months = new Set();
  state.prestations.forEach(p => { if (p.date) months.add(p.date.substring(0, 7)); });
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
  document.getElementById('prestation-form').reset();

  const exportBtn = document.getElementById('btn-export-bf');

  if (editingId) {
    const p = state.prestations.find(x => x.id === editingId);
    if (!p) return;
    title.textContent        = 'Modifier la prestation';
    delBtn.style.display     = 'inline-flex';
    // Bouton export BF : visible si confirmé ou réalisé, et pas encore exporté
    const canExport = (p.statut === 'confirme' || p.statut === 'realise') && !p.exportedToBF;
    exportBtn.style.display  = canExport ? 'inline-flex' : 'none';
    if (p.exportedToBF) exportBtn.title = 'Déjà exporté (facture ' + (p.bfFacture || '?') + ')';
    document.getElementById('f-client').value      = p.client     || '';
    document.getElementById('f-date').value        = p.date       || '';
    document.getElementById('f-heure-debut').value = p.heureDebut || '';
    document.getElementById('f-heure-fin').value   = p.heureFin   || '';
    document.getElementById('f-lieu').value        = p.lieu       || '';
    document.getElementById('f-formule').value     = p.formule    || '';
    document.getElementById('f-personnes').value   = p.personnes  || '';
    document.getElementById('f-montant').value     = p.montant    || '';
    document.getElementById('f-notes').value       = p.notes      || '';
    document.getElementById('f-statut').value      = p.statut     || 'en_attente';
    renderEquipeSelection(p.date, p.equipe || [PRINCIPAL_ID]);
  } else {
    title.textContent        = 'Nouvelle prestation';
    delBtn.style.display     = 'none';
    exportBtn.style.display  = 'none';
    document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
    renderEquipeSelection(document.getElementById('f-date').value, [PRINCIPAL_ID]);
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

function refreshEquipeSection() {
  const date = document.getElementById('f-date').value;
  const checked = getCheckedEquipe();
  renderEquipeSelection(date, checked);
}

function renderEquipeSelection(date, selectedIds) {
  const container = document.getElementById('equipe-list');
  if (!container) return;

  // Barman principal toujours en premier
  const principalDispo = !date || isDisponible(PRINCIPAL_ID, date);
  const principalChecked = selectedIds.includes(PRINCIPAL_ID);

  let html = `
    <div class="equipe-item ${!principalDispo ? 'equipe-conflict' : ''}">
      <label class="equipe-check-label">
        <input type="checkbox" class="equipe-cb" value="${PRINCIPAL_ID}"
          ${principalChecked ? 'checked' : ''}>
        <div class="equipe-avatar equipe-avatar-principal">CP</div>
        <div class="equipe-info">
          <div class="equipe-name">Barman principal <span class="equipe-you">(Vous)</span></div>
          <div class="equipe-role">Responsable prestation</div>
        </div>
        ${!principalDispo ? '<span class="conflict-badge">⚠ Indisponible</span>' : ''}
      </label>
    </div>`;

  const actifs = state.personnel.filter(p => p.actif);
  actifs.forEach(p => {
    const dispo   = !date || isDisponible(p.id, date);
    const checked = selectedIds.includes(p.id);
    const initials = initiales(p.prenom, p.nom);
    html += `
      <div class="equipe-item ${!dispo ? 'equipe-conflict' : ''}">
        <label class="equipe-check-label">
          <input type="checkbox" class="equipe-cb" value="${p.id}"
            ${checked ? 'checked' : ''} ${!dispo ? '' : ''}>
          <div class="equipe-avatar">${initials}</div>
          <div class="equipe-info">
            <div class="equipe-name">${esc(p.prenom)} ${esc(p.nom)}</div>
            <div class="equipe-role">${esc(p.role || '—')}</div>
          </div>
          ${!dispo ? '<span class="conflict-badge">⚠ Indisponible</span>' : ''}
        </label>
      </div>`;
  });

  if (!actifs.length) {
    html += `<p style="color:rgba(244,241,235,0.35);font-size:12px;margin-top:8px;">
      Aucun personnel dans l'annuaire — <a href="#" onclick="switchTab('personnel');closeModal();return false;"
      style="color:var(--gold);">Ajouter du personnel</a></p>`;
  }

  container.innerHTML = html;
}

function getCheckedEquipe() {
  return [...document.querySelectorAll('.equipe-cb:checked')].map(cb => cb.value);
}

function savePrestation(e) {
  e.preventDefault();

  const equipe = getCheckedEquipe();

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
    equipe:     equipe,
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
// PERSONNEL — ANNUAIRE
// ═══════════════════════════════════════════════════════════════════

function renderPersonnel() {
  const grid = document.getElementById('personnel-grid');
  const actifs  = state.personnel.filter(p => p.actif);
  const inactifs = state.personnel.filter(p => !p.actif);

  if (!state.personnel.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;"><p class="empty-msg">
      Aucun membre dans l'annuaire.<br>
      Importez un fichier CSV ou ajoutez manuellement.
    </p></div>`;
    return;
  }

  const renderCard = (p) => {
    const initials     = initiales(p.prenom, p.nom);
    const waLink       = p.telephone ? `https://wa.me/${toWA(p.telephone)}` : null;
    const mailLink     = p.email     ? `mailto:${p.email}` : null;
    const today        = new Date().toISOString().split('T')[0];
    const nbPrestations = state.prestations.filter(pr =>
      pr.date >= today && Array.isArray(pr.equipe) && pr.equipe.includes(p.id)
    ).length;
    const nbIndispos   = state.indisponibilites.filter(i => i.personnelId === p.id).length;
    const dispo        = isDisponible(p.id, today);

    return `
      <div class="perso-card ${!p.actif ? 'perso-inactive' : ''}">
        <div class="perso-card-top">
          <div class="perso-avatar-lg">${initials}</div>
          <div class="perso-card-info">
            <div class="perso-name-lg">${esc(p.prenom)} ${esc(p.nom)}</div>
            <div class="perso-role-lg">${esc(p.role || '—')}</div>
            ${p.tarifForfait ? `<div class="perso-tarif">${fmtMoney(p.tarifForfait)} / prestation</div>` : ''}
          </div>
          <div class="perso-status-dot ${dispo ? 'dot-dispo' : 'dot-indispo'}"
               title="${dispo ? 'Disponible' : 'Indisponible aujourd\'hui'}"></div>
        </div>

        <div class="perso-contacts">
          ${waLink  ? `<a href="${waLink}" target="_blank" class="btn-contact btn-wa">📱 WhatsApp</a>` : ''}
          ${mailLink? `<a href="${mailLink}" class="btn-contact btn-mail">✉ Email</a>` : ''}
        </div>

        <div class="perso-stats">
          <span>${nbPrestations} prestation${nbPrestations > 1 ? 's' : ''} à venir</span>
          <span>${nbIndispos} indispo${nbIndispos > 1 ? 's' : ''}</span>
        </div>

        <div class="perso-actions">
          <button class="btn btn-ghost btn-sm" onclick="openIndispoModal('${p.id}')">
            Indisponibilités${nbIndispos ? ' (' + nbIndispos + ')' : ''}
          </button>
          <button class="btn btn-outline btn-sm" onclick="openPersonnelModal('${p.id}')">Modifier</button>
        </div>
      </div>`;
  };

  let html = actifs.map(renderCard).join('');
  if (inactifs.length) {
    html += `<div style="grid-column:1/-1;margin-top:12px;">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(244,241,235,0.3);margin-bottom:12px;">
        Membres inactifs (${inactifs.length})
      </div>
      <div class="personnel-grid" style="margin:0;">${inactifs.map(renderCard).join('')}</div>
    </div>`;
  }

  grid.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════
// MODAL PERSONNEL — CRUD
// ═══════════════════════════════════════════════════════════════════

function openPersonnelModal(id) {
  editingPersoId = id || null;
  const title  = document.getElementById('modal-personnel-title');
  const delBtn = document.getElementById('btn-delete-personnel');
  document.getElementById('personnel-form').reset();

  if (editingPersoId) {
    const p = state.personnel.find(x => x.id === editingPersoId);
    if (!p) return;
    title.textContent        = 'Modifier le membre';
    delBtn.style.display     = 'inline-flex';
    document.getElementById('pf-prenom').value    = p.prenom      || '';
    document.getElementById('pf-nom').value       = p.nom         || '';
    document.getElementById('pf-telephone').value = p.telephone   || '';
    document.getElementById('pf-email').value     = p.email       || '';
    document.getElementById('pf-role').value      = p.role        || '';
    document.getElementById('pf-tarif').value     = p.tarifForfait|| '';
    document.getElementById('pf-actif').value     = p.actif ? '1' : '0';
  } else {
    title.textContent    = 'Nouveau membre';
    delBtn.style.display = 'none';
  }

  document.getElementById('modal-personnel').classList.add('open');
}

function closePersonnelModal() {
  document.getElementById('modal-personnel').classList.remove('open');
  editingPersoId = null;
}

function onOverlayClickPerso(e) {
  if (e.target.id === 'modal-personnel') closePersonnelModal();
}

function savePersonnel(e) {
  e.preventDefault();
  const membre = {
    id:           editingPersoId || Date.now().toString() + Math.random().toString(36).substr(2, 4),
    prenom:       document.getElementById('pf-prenom').value.trim(),
    nom:          document.getElementById('pf-nom').value.trim(),
    telephone:    document.getElementById('pf-telephone').value.trim(),
    email:        document.getElementById('pf-email').value.trim(),
    role:         document.getElementById('pf-role').value.trim(),
    tarifForfait: parseFloat(document.getElementById('pf-tarif').value) || null,
    actif:        document.getElementById('pf-actif').value === '1',
    updatedAt:    new Date().toISOString()
  };

  if (editingPersoId) {
    const idx = state.personnel.findIndex(p => p.id === editingPersoId);
    if (idx !== -1) state.personnel[idx] = membre;
  } else {
    membre.createdAt = new Date().toISOString();
    state.personnel.push(membre);
  }

  saveState();
  closePersonnelModal();
  renderPersonnel();
  showToast(editingPersoId ? 'Membre mis à jour' : 'Membre ajouté', 'success');
}

function deletePersonnel() {
  if (!editingPersoId) return;
  const p = state.personnel.find(x => x.id === editingPersoId);
  if (!p) return;
  if (!confirm(`Supprimer ${p.prenom} ${p.nom} de l'annuaire ?`)) return;
  state.personnel        = state.personnel.filter(x => x.id !== editingPersoId);
  state.indisponibilites = state.indisponibilites.filter(i => i.personnelId !== editingPersoId);
  // Nettoyer les affectations
  state.prestations.forEach(pr => {
    if (Array.isArray(pr.equipe)) pr.equipe = pr.equipe.filter(id => id !== editingPersoId);
  });
  saveState();
  closePersonnelModal();
  renderPersonnel();
  showToast('Membre supprimé');
}

// ═══════════════════════════════════════════════════════════════════
// INDISPONIBILITÉS
// ═══════════════════════════════════════════════════════════════════

function openIndispoModal(personnelId) {
  indispoPersoId = personnelId;
  const p = state.personnel.find(x => x.id === personnelId);
  document.getElementById('modal-indispo-title').textContent =
    'Indisponibilités — ' + (p ? p.prenom + ' ' + p.nom : '');

  // Reset form
  document.getElementById('ind-debut').value = '';
  document.getElementById('ind-fin').value   = '';
  document.getElementById('ind-motif').value = '';

  renderIndispoList();
  document.getElementById('modal-indispo').classList.add('open');
}

function closeIndispoModal() {
  document.getElementById('modal-indispo').classList.remove('open');
  indispoPersoId = null;
}

function onOverlayClickIndispo(e) {
  if (e.target.id === 'modal-indispo') closeIndispoModal();
}

function renderIndispoList() {
  const list = state.indisponibilites
    .filter(i => i.personnelId === indispoPersoId)
    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  const container = document.getElementById('indispo-list');
  if (!list.length) {
    container.innerHTML = '<p class="empty-msg" style="padding:12px 0;">Aucune indisponibilité enregistrée</p>';
    return;
  }

  container.innerHTML = list.map(i => `
    <div class="indispo-item">
      <div class="indispo-info">
        <div class="indispo-dates">${fmtDate(i.dateDebut)} → ${fmtDate(i.dateFin)}</div>
        ${i.motif ? `<div class="indispo-motif">${esc(i.motif)}</div>` : ''}
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteIndispo('${i.id}')">×</button>
    </div>`).join('');
}

function addIndispo() {
  const debut = document.getElementById('ind-debut').value;
  const fin   = document.getElementById('ind-fin').value;
  const motif = document.getElementById('ind-motif').value.trim();

  if (!debut || !fin) { showToast('Dates obligatoires', 'error'); return; }
  if (fin < debut)    { showToast('La date de fin doit être après le début', 'error'); return; }

  state.indisponibilites.push({
    id:          Date.now().toString(),
    personnelId: indispoPersoId,
    dateDebut:   debut,
    dateFin:     fin,
    motif:       motif,
    createdAt:   new Date().toISOString()
  });

  saveState();
  renderIndispoList();
  renderPersonnel();
  document.getElementById('ind-debut').value = '';
  document.getElementById('ind-fin').value   = '';
  document.getElementById('ind-motif').value = '';
  showToast('Indisponibilité ajoutée', 'success');
}

function deleteIndispo(id) {
  state.indisponibilites = state.indisponibilites.filter(i => i.id !== id);
  saveState();
  renderIndispoList();
  renderPersonnel();
  showToast('Indisponibilité supprimée');
}

// Vérifie si un membre est disponible à une date donnée
function isDisponible(personnelId, date) {
  if (personnelId === PRINCIPAL_ID) {
    // Vérifie les indispos marquées sous l'id principal
    return !state.indisponibilites.some(i =>
      i.personnelId === PRINCIPAL_ID && date >= i.dateDebut && date <= i.dateFin
    );
  }
  return !state.indisponibilites.some(i =>
    i.personnelId === personnelId && date >= i.dateDebut && date <= i.dateFin
  );
}

// ═══════════════════════════════════════════════════════════════════
// IMPORT CSV PERSONNEL
// ═══════════════════════════════════════════════════════════════════

function importCSV() {
  document.getElementById('csv-hint').style.display = 'block';
  document.getElementById('import-csv-input').click();
}

function onImportCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const membres = parseCSV(ev.target.result);
    if (!membres.length) { showToast('Fichier CSV vide ou invalide', 'error'); return; }

    const doublons = membres.filter(m =>
      state.personnel.some(p =>
        p.prenom.toLowerCase() === m.prenom.toLowerCase() &&
        p.nom.toLowerCase()    === m.nom.toLowerCase()
      )
    );

    let msg = `Importer ${membres.length} membre(s) ?`;
    if (doublons.length) msg += `\n⚠ ${doublons.length} doublon(s) détecté(s) — ils seront ignorés.`;
    if (!confirm(msg)) return;

    const nouveaux = membres.filter(m =>
      !state.personnel.some(p =>
        p.prenom.toLowerCase() === m.prenom.toLowerCase() &&
        p.nom.toLowerCase()    === m.nom.toLowerCase()
      )
    );

    state.personnel.push(...nouveaux);
    saveState();
    renderPersonnel();
    showToast(`${nouveaux.length} membre(s) importé(s)`, 'success');
  };
  reader.readAsText(file);
  e.target.value = '';
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h =>
    h.trim().toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/\s+/g, '_')
  );

  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      // Gestion des guillemets dans CSV
      const values = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      values.push(cur.trim());

      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });

      return {
        id:           Date.now().toString() + Math.random().toString(36).substr(2, 5),
        prenom:       obj.prenom       || '',
        nom:          obj.nom          || '',
        telephone:    obj.telephone    || '',
        email:        obj.email        || '',
        role:         obj.role         || '',
        tarifForfait: parseFloat(obj.tarif_forfait) || null,
        actif:        true,
        createdAt:    new Date().toISOString()
      };
    })
    .filter(p => p.prenom || p.nom);
}

// ═══════════════════════════════════════════════════════════════════
// PLANNING — MATRICE
// ═══════════════════════════════════════════════════════════════════

function renderPlanning() {
  const year        = planningCurrentDate.getFullYear();
  const month       = planningCurrentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = new Date().toISOString().split('T')[0];

  document.getElementById('planning-title').textContent = MOIS_FR[month] + ' ' + year;

  // Index prestations par date
  const byDate = {};
  state.prestations.forEach(p => {
    if (!p.date || !Array.isArray(p.equipe)) return;
    const key = p.date.substring(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(p);
  });

  // Personnes : barman principal + membres actifs
  const allPeople = [
    { id: PRINCIPAL_ID, prenom: 'Barman', nom: 'Principal', role: 'Vous' },
    ...state.personnel.filter(p => p.actif)
  ];

  const JOURS = ['D','L','M','M','J','V','S'];

  // ── En-tête ──
  let headHtml = '<tr><th class="plan-name-col">Membre</th>';
  for (let d = 1; d <= daysInMonth; d++) {
    const key     = formatDateKey(year, month, d);
    const dow     = new Date(key + 'T12:00:00').getDay();
    const isToday = key === today;
    const isWE    = dow === 0 || dow === 6;
    headHtml += `<th class="plan-day-col${isToday ? ' plan-today-col' : ''}${isWE ? ' plan-we-col' : ''}">
      <div class="plan-dow">${JOURS[dow]}</div>
      <div class="plan-dnum">${d}</div>
    </th>`;
  }
  headHtml += '</tr>';

  // ── Corps ──
  let bodyHtml = '';
  allPeople.forEach(person => {
    const initials = person.id === PRINCIPAL_ID ? 'CP' : initiales(person.prenom, person.nom);
    bodyHtml += '<tr>';

    // Cellule nom
    bodyHtml += `<td class="plan-name-cell">
      <div class="plan-person">
        <div class="plan-avatar${person.id === PRINCIPAL_ID ? ' plan-avatar-principal' : ''}">${initials}</div>
        <div class="plan-person-info">
          <div class="plan-person-name">${esc(person.prenom)} ${person.id === PRINCIPAL_ID ? '' : esc(person.nom)}</div>
          <div class="plan-person-role">${esc(person.role || '')}</div>
        </div>
      </div>
    </td>`;

    // Cellules jours
    for (let d = 1; d <= daysInMonth; d++) {
      const key        = formatDateKey(year, month, d);
      const isToday    = key === today;
      const isIndispo  = !isDisponible(person.id, key);
      const prests     = (byDate[key] || []).filter(p => p.equipe.includes(person.id));
      const dow        = new Date(key + 'T12:00:00').getDay();
      const isWE       = dow === 0 || dow === 6;
      const hasConflict = isIndispo && prests.length > 0;

      let cls     = 'plan-cell';
      if (isToday)    cls += ' plan-today';
      if (isWE)       cls += ' plan-we';
      if (isIndispo && !prests.length) cls += ' plan-indispo';
      if (prests.length) cls += ` plan-prest plan-prest-${prests[0].statut}`;
      if (hasConflict)   cls += ' plan-conflict';

      let content = '';
      if (hasConflict) {
        content = `<div class="plan-cell-label" title="⚠ Conflit : ${esc(prests[0].client)}">⚠</div>`;
      } else if (prests.length) {
        const label = prests[0].client.substring(0, 6);
        content = `<div class="plan-cell-label" title="${esc(prests[0].client)}">${esc(label)}</div>`;
      } else if (isIndispo) {
        content = `<div class="plan-cell-x">✕</div>`;
      }

      const click = prests.length ? `onclick="openModal('${prests[0].id}')" style="cursor:pointer;"` : '';
      bodyHtml += `<td class="${cls}" ${click}>${content}</td>`;
    }

    bodyHtml += '</tr>';
  });

  document.getElementById('planning-table-head').innerHTML = headHtml;
  document.getElementById('planning-table-body').innerHTML = bodyHtml;

  // Message si aucune personne
  if (!allPeople.length) {
    document.getElementById('planning-table-body').innerHTML =
      '<tr><td colspan="33" class="empty-msg" style="padding:32px;">Aucun personnel configuré</td></tr>';
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT VERS BARMANFINANCE
// ═══════════════════════════════════════════════════════════════════

function exportToBarmanFinance() {
  if (!editingId) return;
  const p = state.prestations.find(x => x.id === editingId);
  if (!p) return;

  // Lire les données BarmanFinance actuelles
  let bfData = { revenus: [], depenses: [], equipements: [], achats: [] };
  try {
    const raw = localStorage.getItem(BF_STORAGE_KEY);
    if (raw) bfData = JSON.parse(raw);
    if (!Array.isArray(bfData.revenus)) bfData.revenus = [];
  } catch(e) {
    showToast('Impossible de lire BarmanFinance', 'error');
    return;
  }

  // Vérification doublon (même date + même client)
  const doublon = bfData.revenus.find(r =>
    r.date === p.date && r.client && r.client.toLowerCase() === p.client.toLowerCase()
  );
  if (doublon) {
    if (!confirm(`Une prestation pour "${p.client}" le ${fmtDate(p.date)} existe déjà dans BarmanFinance (facture ${doublon.facture || '?'}).\n\nExporter quand même en doublon ?`)) return;
  }

  // Générer numéro de facture
  const year    = new Date(p.date + 'T12:00:00').getFullYear();
  const count   = bfData.revenus.filter(r => r.date && new Date(r.date + 'T12:00:00').getFullYear() === year).length + 1;
  const facture = 'F-' + year + '-' + String(count).padStart(3, '0');

  const revenu = {
    id:        Date.now(),
    date:      p.date,
    facture:   facture,
    client:    p.client,
    type:      'Prestation',
    formule:   p.formule    || '',
    personnes: p.personnes  || null,
    lieu:      p.lieu       || '',
    montant:   parseFloat(p.montant) || 0,
    notes:     (p.notes ? p.notes + '\n' : '') + '[Importé depuis BarPlanning Pro]',
    paiement:  'en_attente'
  };

  bfData.revenus.unshift(revenu);

  try {
    localStorage.setItem(BF_STORAGE_KEY, JSON.stringify(bfData));
  } catch(e) {
    showToast('Erreur écriture BarmanFinance', 'error');
    return;
  }

  // Marquer la prestation comme exportée
  const idx = state.prestations.findIndex(x => x.id === editingId);
  if (idx !== -1) {
    state.prestations[idx].exportedToBF = true;
    state.prestations[idx].bfFacture    = facture;
    state.prestations[idx].bfExportedAt = new Date().toISOString();
  }

  saveState();
  closeModal();
  refreshCurrentSection();
  showToast('Exporté vers BarmanFinance — Facture ' + facture, 'success');
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT / IMPORT JSON
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
  document.getElementById('import-json-input').click();
}

function onImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!Array.isArray(parsed.prestations)) { showToast('Fichier invalide', 'error'); return; }
      if (!confirm(`Importer ${parsed.prestations.length} prestation(s) et ${(parsed.personnel || []).length} membre(s) ? Les données actuelles seront remplacées.`)) return;
      state.prestations      = parsed.prestations      || [];
      state.personnel        = parsed.personnel        || [];
      state.indisponibilites = parsed.indisponibilites || [];
      saveState();
      refreshCurrentSection();
      showToast('Import réussi', 'success');
    } catch(err) { showToast('Erreur lecture fichier', 'error'); }
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
  if (id === 'personnel')   renderPersonnel();
}

function buildEquipeBadges(p) {
  if (!Array.isArray(p.equipe) || !p.equipe.length) return '';
  return p.equipe.map(pid => {
    if (pid === PRINCIPAL_ID) return `<span class="equipe-badge equipe-badge-principal">CP</span>`;
    const m = state.personnel.find(x => x.id === pid);
    if (!m) return '';
    return `<span class="equipe-badge" title="${esc(m.prenom + ' ' + m.nom)}">${initiales(m.prenom, m.nom)}</span>`;
  }).join('');
}

function initiales(prenom, nom) {
  return ((prenom || '').charAt(0) + (nom || '').charAt(0)).toUpperCase() || '?';
}

function toWA(tel) {
  const clean = tel.replace(/\D/g, '');
  return clean.startsWith('0') ? '33' + clean.substring(1) : clean;
}

function fmtMoney(val) {
  if (typeof formatCurrency === 'function') return formatCurrency(val);
  return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDate() + ' ' + MOIS_FR[d.getMonth()] + ' ' + d.getFullYear();
}

function statusPill(statut) {
  const label = STATUTS[statut] || statut;
  return `<span class="status-pill status-${statut}">${label}</span>`;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  document.getElementById('btn-prev-month').addEventListener('click', () => {
    calCurrentDate = new Date(calCurrentDate.getFullYear(), calCurrentDate.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('btn-next-month').addEventListener('click', () => {
    calCurrentDate = new Date(calCurrentDate.getFullYear(), calCurrentDate.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById('btn-plan-prev').addEventListener('click', () => {
    planningCurrentDate = new Date(planningCurrentDate.getFullYear(), planningCurrentDate.getMonth() - 1, 1);
    renderPlanning();
  });
  document.getElementById('btn-plan-next').addEventListener('click', () => {
    planningCurrentDate = new Date(planningCurrentDate.getFullYear(), planningCurrentDate.getMonth() + 1, 1);
    renderPlanning();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closePersonnelModal();
      closeIndispoModal();
    }
  });

  renderDashboard();
}

// Expose au HTML
window.switchTab          = switchTab;
window.openModal          = openModal;
window.closeModal         = closeModal;
window.onOverlayClick     = onOverlayClick;
window.savePrestation     = savePrestation;
window.deletePrestation   = deletePrestation;
window.refreshEquipeSection = refreshEquipeSection;
window.showDayDetail      = showDayDetail;
window.closeDayDetail     = closeDayDetail;
window.openPersonnelModal = openPersonnelModal;
window.closePersonnelModal= closePersonnelModal;
window.onOverlayClickPerso= onOverlayClickPerso;
window.savePersonnel      = savePersonnel;
window.deletePersonnel    = deletePersonnel;
window.openIndispoModal   = openIndispoModal;
window.closeIndispoModal  = closeIndispoModal;
window.onOverlayClickIndispo = onOverlayClickIndispo;
window.addIndispo         = addIndispo;
window.deleteIndispo      = deleteIndispo;
window.importCSV             = importCSV;
window.onImportCSV           = onImportCSV;
window.exportData            = exportData;
window.importData            = importData;
window.onImportFile          = onImportFile;
window.exportToBarmanFinance = exportToBarmanFinance;

init();
