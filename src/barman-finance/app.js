// ═══════════════════════════════════════════════════════════════════
// FIREBASE SYNC
// ═══════════════════════════════════════════════════════════════════
import { loginWithGoogle, logout, initAuth, saveToCloud } from '../shared/firebase-sync.js';

const COLLECTION = 'barmanfinance';

// ═══════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════
let state = {
  revenus: [],
  depenses: [],
  equipements: [],
  achats: [],
  chargesRecurrentes: [],
  meta: { version: '1.0', lastSave: null, created: new Date().toISOString() }
};

const PLAFOND_MICROBIC = 77700;
const PLAFOND_TVA = 37500;
const URSSAF_RATE = 0.211;

// Statuts de paiement
const PAYMENT_STATUSES = {
  'en_attente': '⏳ En attente',
  'paye': '✅ Payé',
  'impaye': '❌ Impayé'
};
const PAYMENT_COLORS = {
  'en_attente': 'var(--gold)',
  'paye': 'var(--green)',
  'impaye': 'var(--red)'
};

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
function init() {
  loadFromStorage();
  initDefaultAchats();
  setDefaultDates();
  populateYearFilters();
  renderAll();
}

function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  ['rev-date','dep-date','am-date','cr-dateDebut'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = today;
  });
}

function populateYearFilters() {
  const years = new Set();
  const currentYear = new Date().getFullYear();
  years.add(currentYear);
  [...state.revenus, ...state.depenses].forEach(r => {
    if(r.date) years.add(new Date(r.date).getFullYear());
  });
  const sorted = [...years].sort((a,b) => b-a);
  ['dash-year','rev-filter-year','dep-filter-year'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    const prev = el.value;
    el.innerHTML = sorted.map(y => `<option value="${y}" ${y==currentYear?'selected':''}>${y}</option>`).join('');
    if(prev && sorted.includes(+prev)) el.value = prev;
  });
}

// ═══════════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('section-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if(tab === 'dashboard') renderDashboard();
  if(tab === 'revenus') { populateYearFilters(); renderRevenus(); renderRevSummary(); }
  if(tab === 'depenses') { populateYearFilters(); renderDepenses(); renderDepSummary(); }
  if(tab === 'amortissement') renderAmortissement();
  if(tab === 'lancement') { renderAchats(); renderLaunchSummary(); }
  if(tab === 'charges') renderChargesRecurrentes();
}

// ═══════════════════════════════════════════════════════════════════
// REVENUS
// ═══════════════════════════════════════════════════════════════════
function updateFormulaPrice() {
  const formule = document.getElementById('rev-formule').value;
  const nb = parseFloat(document.getElementById('rev-personnes').value) || 0;
  if(formule && formule !== '0' && nb > 0) {
    document.getElementById('rev-montant').value = (parseFloat(formule) * nb).toFixed(2);
  }
}

function saveRevenu() {
  const date = document.getElementById('rev-date').value;
  const client = document.getElementById('rev-client').value.trim();
  const montant = parseFloat(document.getElementById('rev-montant').value);
  if(!date || !client || isNaN(montant) || montant <= 0) {
    toast('Veuillez remplir les champs obligatoires (Date, Client, Montant)', 'error'); return;
  }
  const formuleSel = document.getElementById('rev-formule');
  const formuleLabel = formuleSel.options[formuleSel.selectedIndex]?.text || '';
  const rev = {
    id: Date.now(),
    date,
    facture: document.getElementById('rev-facture').value.trim() || autoFactureNum(),
    client,
    type: document.getElementById('rev-type').value,
    formule: formuleLabel,
    personnes: parseInt(document.getElementById('rev-personnes').value) || null,
    lieu: document.getElementById('rev-lieu').value.trim(),
    montant,
    notes: document.getElementById('rev-notes').value.trim(),
    paiement: document.getElementById('rev-paiement')?.value || 'en_attente'
  };
  state.revenus.unshift(rev);
  saveToStorage();
  populateYearFilters();
  renderRevenus();
  renderRevSummary();
  clearRevForm();
  toast(`Revenu de ${fmt(montant)} enregistré`, 'success');
}

function autoFactureNum() {
  const y = new Date().getFullYear();
  const count = state.revenus.filter(r => r.date && new Date(r.date).getFullYear() === y).length + 1;
  return `F-${y}-${String(count).padStart(3,'0')}`;
}

function deleteRevenu(id) {
  if(!confirm('Supprimer ce revenu ?')) return;
  state.revenus = state.revenus.filter(r => r.id !== id);
  saveToStorage();
  populateYearFilters();
  renderRevenus();
  renderRevSummary();
  toast('Revenu supprimé');
}

function updatePaymentStatus(id, status) {
  const rev = state.revenus.find(r => r.id === id);
  if(rev) {
    rev.paiement = status;
    saveToStorage();
    renderRevenus();
    renderRevSummary();
    toast(`Statut changé en ${PAYMENT_STATUSES[status]}`, 'success');
  }
}

function generateQuotePDF(id) {
  const rev = state.revenus.find(r => r.id === id);
  if(!rev) return;

  const businessName = 'Cocktail Privé';
  const businessInfo = 'Barman & Mixologue';
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis ${rev.facture}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; background: #fff; padding: 20px; }
    .page { max-width: 900px; margin: 0 auto; background: #fff; padding: 40px; border: 1px solid #ddd; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #c8a96e; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #c8a96e; }
    .logo-sub { font-size: 12px; color: #999; }
    .title { text-align: right; }
    .title h1 { font-size: 32px; color: #080808; margin-bottom: 5px; }
    .title .ref { font-size: 12px; color: #999; }

    section { margin-bottom: 30px; }
    .section-title { font-size: 14px; font-weight: bold; color: #080808; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #c8a96e; padding-bottom: 8px; margin-bottom: 15px; }

    .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .info-block { font-size: 13px; line-height: 1.8; }
    .info-block strong { color: #080808; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f5f0e8; color: #080808; padding: 12px; text-align: left; font-size: 12px; font-weight: bold; border-bottom: 2px solid #c8a96e; }
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    tr:last-child td { border-bottom: 2px solid #c8a96e; }

    .totals { display: flex; justify-content: flex-end; margin-top: 20px; }
    .totals-table { width: 300px; }
    .totals-table tr td:first-child { text-align: right; padding-right: 30px; color: #999; }
    .totals-table tr td:last-child { text-align: right; font-weight: bold; color: #080808; }
    .totals-table tr.total td { border-top: 2px solid #c8a96e; padding-top: 15px; font-size: 16px; color: #c8a96e; }

    .notes { background: #f5f0e8; padding: 15px; border-radius: 4px; font-size: 12px; color: #666; line-height: 1.6; }

    footer { text-align: center; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px; font-size: 11px; color: #999; }

    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; margin: 0 0 15px 0; }
    .status-pending { background: #FEF3C7; color: #92400E; }
    .status-paid { background: #D1FAE5; color: #065F46; }
    .status-unpaid { background: #FEE2E2; color: #991B1B; }

    @media print {
      body { padding: 0; }
      .page { border: none; padding: 0; }
      a { color: #c8a96e; text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div>
        <div class="logo">${businessName}</div>
        <div class="logo-sub">${businessInfo}</div>
      </div>
      <div class="title">
        <h1>DEVIS</h1>
        <div class="ref">Ref. ${rev.facture} • ${fmtDate(rev.date)}</div>
      </div>
    </header>

    <div class="status-badge status-${rev.paiement || 'en_attente'}">${PAYMENT_STATUSES[rev.paiement] || '⏳ En attente'}</div>

    <div class="two-cols">
      <div class="info-block">
        <strong>CLIENT</strong><br>
        ${rev.client}<br>
        ${rev.lieu ? rev.lieu + '<br>' : ''}
      </div>
      <div class="info-block" style="text-align:right;">
        <strong>COORDONNÉES</strong><br>
        www.cocktail-prive.com<br>
        contact@cocktail-prive.com
      </div>
    </div>

    <section>
      <div class="section-title">Détails de la Prestation</div>
      <table>
        <thead>
          <tr>
            <th style="width:50%">Description</th>
            <th style="width:15%">Quantité</th>
            <th style="width:15%">Prix Unit.</th>
            <th style="width:20%;text-align:right;">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${rev.type || 'Prestation'}</strong><br><span style="color:#999;font-size:12px">${rev.formule ? rev.formule : 'Prestation personnalisée'}</span></td>
            <td>${rev.personnes || '—'}</td>
            <td>${rev.personnes ? fmt(rev.montant / rev.personnes) : '—'}</td>
            <td style="text-align:right;"><strong>${fmt(rev.montant)}</strong></td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Montant HT</td>
          <td>${fmt(rev.montant)}</td>
        </tr>
        <tr>
          <td>TVA (franchise)</td>
          <td>—</td>
        </tr>
        <tr class="total">
          <td>TOTAL</td>
          <td>${fmt(rev.montant)}</td>
        </tr>
      </table>
    </div>

    ${rev.notes ? `<section><div class="section-title">Notes</div><div class="notes">${rev.notes.replace(/\n/g, '<br>')}</div></section>` : ''}

    <footer>
      Document généré le ${fmtDate(new Date().toISOString().split('T')[0])} via BarMan Finance Pro<br>
      Validité du devis : 30 jours • Pour toute question, contactez-nous directement
    </footer>
  </div>

  <script>
    window.onload = () => { window.print(); };
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function clearRevForm() {
  ['rev-client','rev-facture','rev-personnes','rev-lieu','rev-notes'].forEach(id => document.getElementById(id).value = '');
  ['rev-type','rev-formule','rev-paiement'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('rev-montant').value = '';
  setDefaultDates();
}

function renderRevenus() {
  const year = parseInt(document.getElementById('rev-filter-year')?.value || new Date().getFullYear());
  const filtered = state.revenus.filter(r => r.date && new Date(r.date).getFullYear() === year);
  const tbody = document.getElementById('tbody-revenus');
  if(!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="empty-icon">◇</div>Aucun revenu pour ${year}</div></td></tr>`;
    renderRevSummary();
    return;
  }
  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td>${fmtDate(r.date)}</td>
      <td class="td-muted">${r.facture||'—'}</td>
      <td>${r.client}</td>
      <td>${r.type ? `<span class="badge badge-blue">${r.type}</span>` : '—'}</td>
      <td class="td-muted" style="font-size:11px">${r.formule||'—'}</td>
      <td class="td-muted">${r.personnes||'—'}</td>
      <td class="td-muted">${r.lieu||'—'}</td>
      <td class="td-gold">${fmt(r.montant)}</td>
      <td><span class="badge" style="background:${PAYMENT_COLORS[r.paiement]||PAYMENT_COLORS['en_attente']};color:var(--black);font-size:10px;padding:4px 8px">${PAYMENT_STATUSES[r.paiement]||'⏳ En attente'}</span></td>
      <td style="display:flex;gap:4px;align-items:center"><button class="btn btn-ghost btn-sm" title="Générer devis/facture PDF" onclick="generateQuotePDF(${r.id})" style="font-size:10px;padding:4px 8px">📄</button><button class="btn btn-danger" onclick="deleteRevenu(${r.id})">✕</button></td>
    </tr>`).join('');
  renderRevSummary();
}

function renderRevSummary() {
  const year = parseInt(document.getElementById('rev-filter-year')?.value || new Date().getFullYear());
  const revYear = state.revenus.filter(r => r.date && new Date(r.date).getFullYear() === year);
  const total = revYear.reduce((s,r) => s+r.montant, 0);
  const nb = revYear.length;
  const panier = nb ? total/nb : 0;

  const el = document.getElementById('rev-summary-year');
  if(el) el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:11px;color:rgba(244,241,235,0.5)">CA ${year}</span>
        <span style="font-size:20px;color:var(--gold)">${fmt(total)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:rgba(244,241,235,0.5)">Prestations</span><span>${nb}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:rgba(244,241,235,0.5)">Panier moyen</span><span>${fmt(panier)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:rgba(244,241,235,0.5)">URSSAF estimé (21,1%)</span>
        <span style="color:var(--red)">${fmt(total*URSSAF_RATE)}</span>
      </div>
    </div>`;

  // by formule
  const byFormule = {};
  revYear.forEach(r => { const k = r.formule||'Non renseigné'; byFormule[k]=(byFormule[k]||0)+r.montant; });
  const el2 = document.getElementById('rev-by-formule');
  if(el2) el2.innerHTML = Object.entries(byFormule).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(218,171,45,0.06);font-size:12px">
      <span style="color:rgba(244,241,235,0.6);max-width:65%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${k}</span>
      <span style="color:var(--gold)">${fmt(v)}</span>
    </div>`).join('') || '<div class="empty-state" style="padding:20px">Aucune donnée</div>';
}

// ═══════════════════════════════════════════════════════════════════
// DEPENSES
// ═══════════════════════════════════════════════════════════════════
function saveDepense() {
  const date = document.getElementById('dep-date').value;
  const montant = parseFloat(document.getElementById('dep-montant').value);
  const description = document.getElementById('dep-description').value.trim();
  const categorie = document.getElementById('dep-categorie').value;
  if(!date || isNaN(montant) || montant <= 0 || !description || !categorie) {
    toast('Veuillez remplir les champs obligatoires', 'error'); return;
  }
  const dep = {
    id: Date.now(),
    date,
    montant,
    description,
    categorie,
    fournisseur: document.getElementById('dep-fournisseur').value.trim(),
    justificatif: document.getElementById('dep-justificatif').value.trim(),
    deductible: document.getElementById('dep-deductible').value,
    notes: document.getElementById('dep-notes').value.trim()
  };
  state.depenses.unshift(dep);
  saveToStorage();
  populateYearFilters();
  renderDepenses();
  renderDepSummary();
  clearDepForm();
  toast(`Dépense de ${fmt(montant)} enregistrée`, 'success');
}

function deleteDepense(id) {
  if(!confirm('Supprimer cette dépense ?')) return;
  state.depenses = state.depenses.filter(d => d.id !== id);
  saveToStorage();
  renderDepenses();
  renderDepSummary();
  toast('Dépense supprimée');
}

function clearDepForm() {
  ['dep-description','dep-fournisseur','dep-justificatif','dep-notes'].forEach(id => document.getElementById(id).value = '');
  ['dep-categorie'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('dep-montant').value = '';
  document.getElementById('dep-deductible').value = 'oui';
  setDefaultDates();
}

function renderDepenses() {
  const year = parseInt(document.getElementById('dep-filter-year')?.value || new Date().getFullYear());
  const filtered = state.depenses.filter(d => d.date && new Date(d.date).getFullYear() === year);
  const tbody = document.getElementById('tbody-depenses');
  if(!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">◇</div>Aucune dépense pour ${year}</div></td></tr>`;
    renderDepSummary();
    return;
  }
  const deductBadge = { oui:'badge-green', non:'badge-red', partiel:'badge-gold' };
  tbody.innerHTML = filtered.map(d => `
    <tr>
      <td>${fmtDate(d.date)}</td>
      <td><span class="badge badge-blue" style="font-size:9px">${d.categorie}</span></td>
      <td>${d.description}</td>
      <td class="td-muted">${d.fournisseur||'—'}</td>
      <td><span class="badge ${deductBadge[d.deductible]||'badge-gold'}">${d.deductible}</span></td>
      <td class="td-red">${fmt(d.montant)}</td>
      <td><button class="btn btn-danger" onclick="deleteDepense(${d.id})">✕</button></td>
    </tr>`).join('');
  renderDepSummary();
}

function renderDepSummary() {
  const year = parseInt(document.getElementById('dep-filter-year')?.value || new Date().getFullYear());
  const depYear = state.depenses.filter(d => d.date && new Date(d.date).getFullYear() === year);
  const total = depYear.reduce((s,d) => s+d.montant, 0);
  const deductible = depYear.filter(d => d.deductible==='oui').reduce((s,d) => s+d.montant, 0);

  const el = document.getElementById('dep-summary-year');
  if(el) el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:11px;color:rgba(244,241,235,0.5)">Total ${year}</span>
        <span style="font-size:20px;color:var(--red)">${fmt(total)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:rgba(244,241,235,0.5)">Déductibles</span>
        <span style="color:var(--green)">${fmt(deductible)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:rgba(244,241,235,0.5)">Nb opérations</span><span>${depYear.length}</span>
      </div>
    </div>`;

  // by cat
  const byCat = {};
  depYear.forEach(d => { byCat[d.categorie]=(byCat[d.categorie]||0)+d.montant; });
  const el2 = document.getElementById('dep-by-cat');
  if(el2) el2.innerHTML = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(218,171,45,0.06);font-size:12px">
      <span style="color:rgba(244,241,235,0.6);max-width:65%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${k}</span>
      <span style="color:var(--red)">${fmt(v)}</span>
    </div>`).join('') || '<div class="empty-state" style="padding:20px">Aucune donnée</div>';
}

// ═══════════════════════════════════════════════════════════════════
// AMORTISSEMENT
// ═══════════════════════════════════════════════════════════════════
const COEFF_DEGRESSIF = { 1: 1.25, 2: 1.25, 3: 1.25, 4: 1.75, 5: 1.75, 6: 1.75 };
function getCoeffDegressif(duree) {
  if(duree <= 3) return 1.25;
  if(duree <= 6) return 1.75;
  return 2.25;
}

function calcAmortSchedule(valeur, residuel, duree, mode, dateAchat) {
  const base = valeur - residuel;
  const schedule = [];
  const startYear = new Date(dateAchat).getFullYear();

  if(mode === 'lineaire') {
    const dotation = base / duree;
    let cumul = 0;
    for(let i=0; i<duree; i++) {
      cumul += dotation;
      schedule.push({ year: startYear+i, dotation, cumul, vnc: valeur - cumul });
    }
  } else {
    // Dégressif
    const coeff = getCoeffDegressif(duree);
    let vnc = base;
    let cumul = 0;
    for(let i=0; i<duree; i++) {
      const tauxDegressif = (1/duree)*coeff;
      const tauxLineaire = 1/(duree-i);
      const taux = Math.max(tauxDegressif, tauxLineaire);
      const dotation = Math.min(vnc, vnc * taux);
      vnc -= dotation;
      cumul += dotation;
      schedule.push({ year: startYear+i, dotation, cumul, vnc: residuel + vnc });
    }
  }
  return schedule;
}

function previewAmort() {
  const valeur = parseFloat(document.getElementById('am-valeur').value);
  const residuel = parseFloat(document.getElementById('am-residuel').value)||0;
  const duree = parseInt(document.getElementById('am-duree').value);
  const date = document.getElementById('am-date').value;
  const mode = document.getElementById('am-mode').value;

  const preview = document.getElementById('amort-preview');
  if(!valeur || !duree || !date) { preview.style.display='none'; return; }

  const schedule = calcAmortSchedule(valeur, residuel, duree, mode, date);
  const dotationLabel = mode==='lineaire'?'Linéaire':'Dégressif';
  preview.style.display = 'block';

  document.getElementById('amort-preview-content').innerHTML = `
    <div style="font-size:11px;color:rgba(218,171,45,0.7);margin-bottom:8px">${dotationLabel} · Coeff: ${mode==='degressif'?getCoeffDegressif(duree):'1'} · Dotation annuelle: ${fmt(schedule[0]?.dotation||0)}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${schedule.map(s=>`<div style="background:rgba(218,171,45,0.07);border:1px solid rgba(218,171,45,0.15);border-radius:3px;padding:6px 10px;text-align:center;min-width:76px">
        <div style="font-size:9px;color:rgba(244,241,235,0.4)">${s.year}</div>
        <div style="font-size:12px;color:var(--gold);margin-top:2px">${fmt(s.dotation)}</div>
        <div style="font-size:9px;color:rgba(244,241,235,0.35);margin-top:1px">VNC: ${fmt(s.vnc)}</div>
      </div>`).join('')}
    </div>`;
}

function saveEquipement() {
  const nom = document.getElementById('am-nom').value.trim();
  const valeur = parseFloat(document.getElementById('am-valeur').value);
  const residuel = parseFloat(document.getElementById('am-residuel').value)||0;
  const date = document.getElementById('am-date').value;
  const duree = parseInt(document.getElementById('am-duree').value);
  const mode = document.getElementById('am-mode').value;
  if(!nom || !valeur || !date || !duree) {
    toast('Veuillez remplir les champs obligatoires', 'error'); return;
  }
  const eq = {
    id: Date.now(),
    nom,
    valeur,
    residuel,
    date,
    duree,
    mode,
    categorie: document.getElementById('am-categorie').value,
    schedule: calcAmortSchedule(valeur, residuel, duree, mode, date)
  };
  state.equipements.push(eq);
  saveToStorage();
  renderAmortissement();
  clearAmortForm();
  toast(`Équipement "${nom}" ajouté`, 'success');
}

function deleteEquipement(id) {
  if(!confirm('Supprimer cet équipement ?')) return;
  state.equipements = state.equipements.filter(e => e.id !== id);
  saveToStorage();
  renderAmortissement();
  toast('Équipement supprimé');
}

function clearAmortForm() {
  ['am-nom','am-valeur','am-duree'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('am-residuel').value = '0';
  document.getElementById('am-mode').value = 'lineaire';
  document.getElementById('amort-preview').style.display = 'none';
  setDefaultDates();
}

function renderAmortissement() {
  // Annual summary
  const currentYear = new Date().getFullYear();
  let totalDotationYear = 0;
  let totalVNC = 0;
  state.equipements.forEach(eq => {
    const yearEntry = eq.schedule.find(s => s.year === currentYear);
    if(yearEntry) totalDotationYear += yearEntry.dotation;
    const lastEntry = eq.schedule[eq.schedule.length-1];
    if(lastEntry) totalVNC += lastEntry.vnc;
  });

  const sumEl = document.getElementById('amort-annual-summary');
  if(sumEl) sumEl.innerHTML = state.equipements.length === 0
    ? `<div class="empty-state" style="padding:20px">Aucun équipement enregistré</div>`
    : `<div style="display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:11px;color:rgba(244,241,235,0.5)">Dotation ${currentYear}</span>
          <span style="font-size:20px;color:var(--gold)">${fmt(totalDotationYear)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <span style="color:rgba(244,241,235,0.5)">Équipements actifs</span><span>${state.equipements.length}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <span style="color:rgba(244,241,235,0.5)">VNC totale (fin amort.)</span>
          <span style="color:rgba(244,241,235,0.6)">${fmt(totalVNC)}</span>
        </div>
        ${state.equipements.map(eq => {
          const yearEntry = eq.schedule.find(s => s.year === currentYear);
          return `<div style="display:flex;justify-content:space-between;font-size:11px;padding:6px 0;border-top:1px solid var(--border)">
            <span style="color:rgba(244,241,235,0.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65%">${eq.nom}</span>
            <span style="color:var(--gold)">${yearEntry?fmt(yearEntry.dotation):'—'}</span>
          </div>`;
        }).join('')}
      </div>`;

  // Equipment list
  const listEl = document.getElementById('amort-list');
  if(!state.equipements.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">◉</div>Ajoutez votre premier équipement via le formulaire</div>`;
    return;
  }
  listEl.innerHTML = state.equipements.map(eq => {
    const lastYear = eq.schedule[eq.schedule.length-1]?.year || '—';
    const totalDot = eq.schedule.reduce((s,y) => s+y.dotation, 0);
    return `<div class="amort-item">
      <div class="amort-header">
        <div>
          <div class="amort-name">${eq.nom}</div>
          <div style="font-size:10px;color:rgba(244,241,235,0.35);margin-top:3px">
            ${eq.categorie} · Achat: ${fmtDate(eq.date)} · Valeur: ${fmt(eq.valeur)} · ${eq.duree} ans · ${eq.mode==='lineaire'?'Linéaire':'Dégressif'}
          </div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteEquipement(${eq.id})">Supprimer</button>
      </div>
      <div class="amort-schedule">
        ${eq.schedule.map(s => `<div class="amort-year">
          <div class="ay-year">${s.year}${s.year===currentYear?` ←`:''}</div>
          <div class="ay-val">${fmt(s.dotation)}</div>
          <div style="font-size:9px;color:rgba(244,241,235,0.3)">VNC ${fmt(s.vnc)}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// PROJECTION FIN D'ANNÉE
// ═══════════════════════════════════════════════════════════════════
function calculateYearEndProjection(year) {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11
  const currentDay = today.getDate();
  const currentYear = today.getFullYear();

  // Données jusqu'à aujourd'hui
  const revToday = state.revenus.filter(r => {
    if(!r.date) return false;
    const d = new Date(r.date);
    if(d.getFullYear() !== year) return false;
    return d < today;
  });
  const depListToday = state.depenses.filter(d => {
    if(!d.date) return false;
    const dt = new Date(d.date);
    if(dt.getFullYear() !== year) return false;
    return dt < today;
  });

  const caToday = revToday.reduce((s,r) => s+r.montant, 0);
  const depToday = depListToday.reduce((s,d) => s+d.montant, 0);

  // Moyenne mensuelle réalisée
  const monthsElapsed = currentMonth + (currentDay > 0 ? 0.5 : 0); // approximation
  const monthsRemaining = 12 - monthsElapsed;
  const avgMonthlyRev = monthsElapsed > 0 ? caToday / monthsElapsed : 0;
  const avgMonthlyDep = monthsElapsed > 0 ? depToday / monthsElapsed : 0;

  // Projection fin d'année
  const caProjected = caToday + (avgMonthlyRev * monthsRemaining);
  const depProjected = depToday + (avgMonthlyDep * monthsRemaining);
  const urssafProjected = caProjected * URSSAF_RATE;
  const beneficeProjected = caProjected - depProjected - urssafProjected;

  // Position vis-à-vis des seuils
  const pctMicrobic = Math.min((caProjected/PLAFOND_MICROBIC)*100, 100);
  const pctTVA = Math.min((caProjected/PLAFOND_TVA)*100, 100);
  const microWarning = caProjected > PLAFOND_MICROBIC * 0.85;
  const tvaWarning = caProjected > PLAFOND_TVA * 0.85;

  return {
    caToday,
    caProjected,
    depToday,
    depProjected,
    urssafProjected,
    beneficeProjected,
    pctMicrobic,
    pctTVA,
    monthsElapsed: Math.round(monthsElapsed*10)/10,
    monthsRemaining: Math.round(monthsRemaining*10)/10,
    avgMonthlyRev,
    microWarning,
    tvaWarning
  };
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function renderDashboard() {
  const year = parseInt(document.getElementById('dash-year')?.value || new Date().getFullYear());
  const month = document.getElementById('dash-month')?.value || 'all';

  let revFiltered = state.revenus.filter(r => r.date && new Date(r.date).getFullYear()===year);
  let depFiltered = state.depenses.filter(d => d.date && new Date(d.date).getFullYear()===year);
  if(month !== 'all') {
    const m = parseInt(month);
    revFiltered = revFiltered.filter(r => new Date(r.date).getMonth()+1 === m);
    depFiltered = depFiltered.filter(d => new Date(d.date).getMonth()+1 === m);
  }

  const caTotal = revFiltered.reduce((s,r) => s+r.montant, 0);
  const depTotal = depFiltered.reduce((s,d) => s+d.montant, 0);
  const urssaf = caTotal * URSSAF_RATE;
  const chargesFixesMensuel = getChargesRecurrentesMonthly();
  const chargesFixesPeriode = month === 'all' ? chargesFixesMensuel * 12 : chargesFixesMensuel;
  const benefice = caTotal - depTotal - urssaf - chargesFixesPeriode;
  const nbPrestations = revFiltered.length;
  const panier = nbPrestations ? caTotal/nbPrestations : 0;

  // Full year for seuils
  const caAnnuel = state.revenus.filter(r => r.date && new Date(r.date).getFullYear()===year).reduce((s,r)=>s+r.montant, 0);
  const pctMicrobic = Math.min((caAnnuel/PLAFOND_MICROBIC)*100, 100);
  const pctTVA = Math.min((caAnnuel/PLAFOND_TVA)*100, 100);

  // KPIs
  const kpiGrid = document.getElementById('kpi-grid');
  kpiGrid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Chiffre d'Affaires</div>
      <div class="kpi-value">${fmt(caTotal)}</div>
      <div class="kpi-sub">${nbPrestations} prestation${nbPrestations>1?'s':''}</div>
      <div class="kpi-bar-wrap"><div class="kpi-bar gold" style="width:${Math.min(pctMicrobic,100)}%"></div></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Bénéfice Net Est.</div>
      <div class="kpi-value" style="color:${benefice>=0?'var(--green)':'var(--red)'}">${fmt(benefice)}</div>
      <div class="kpi-sub">charges, fixes & URSSAF</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">URSSAF Estimé (21,1%)</div>
      <div class="kpi-value" style="color:var(--red)">${fmt(urssaf)}</div>
      <div class="kpi-sub">à provisionner</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Charges Fixes / Mois</div>
      <div class="kpi-value" style="color:var(--red)">${fmt(chargesFixesMensuel)}</div>
      <div class="kpi-sub">${state.chargesRecurrentes.filter(c=>c.actif).length} abonnement${state.chargesRecurrentes.filter(c=>c.actif).length>1?'s':''} actif${state.chargesRecurrentes.filter(c=>c.actif).length>1?'s':''}</div>
    </div>`;

  // Seuils
  document.getElementById('pct-microbic').textContent = pctMicrobic.toFixed(1) + ' %';
  document.getElementById('pct-tva').textContent = pctTVA.toFixed(1) + ' %';
  document.getElementById('bar-microbic').style.width = pctMicrobic + '%';
  document.getElementById('bar-tva').style.width = pctTVA + '%';
  document.getElementById('bar-microbic').className = 'progress-bar ' + (pctMicrobic>85?'red':pctMicrobic>60?'gold':'green');
  document.getElementById('bar-tva').className = 'progress-bar ' + (pctTVA>85?'red':pctTVA>60?'gold':'blue');

  // Monthly chart
  renderMonthlyChart(year);

  // Type chart
  renderTypeChart(revFiltered);

  // Year-end projection
  renderYearEndProjection(year);

  // Recent ops
  renderRecent(year);
}

function renderMonthlyChart(year) {
  const monthNames = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const monthly = Array(12).fill(0);
  state.revenus.filter(r => r.date && new Date(r.date).getFullYear()===year)
    .forEach(r => { monthly[new Date(r.date).getMonth()] += r.montant; });

  const max = Math.max(...monthly, 1);
  const chartEl = document.getElementById('chart-revenus');
  chartEl.innerHTML = monthNames.map((m,i) => {
    const h = Math.round((monthly[i]/max)*80);
    const isCurrentMonth = new Date().getMonth()===i && new Date().getFullYear()===year;
    return `<div class="chart-bar-wrap">
      <div class="chart-bar-inner" style="height:${h}px; background:${isCurrentMonth?'var(--gold)':'rgba(218,171,45,0.35)'}; width:100%;"></div>
      <div class="chart-label">${m}</div>
    </div>`;
  }).join('');
}

function renderTypeChart(revs) {
  const byType = {};
  revs.forEach(r => { const k = r.type||'Non renseigné'; byType[k]=(byType[k]||0)+r.montant; });
  const total = Object.values(byType).reduce((s,v)=>s+v,0);
  const el = document.getElementById('chart-types');
  if(!total) { el.innerHTML = '<div class="empty-state" style="padding:16px">Aucune donnée</div>'; return; }
  const colors = ['var(--gold)','var(--blue)','var(--green)','#C47CBC','#E0A05A','#7CB4C4','rgba(244,241,235,0.5)'];
  let ci = 0;
  el.innerHTML = Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([k,v]) => {
    const pct = (v/total*100).toFixed(1);
    const color = colors[ci++ % colors.length];
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
        <span style="color:rgba(244,241,235,0.7)">${k}</span>
        <span style="color:${color}">${pct}%  ${fmt(v)}</span>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width 0.5s"></div>
      </div>
    </div>`;
  }).join('');
}

function renderYearEndProjection(year) {
  const proj = calculateYearEndProjection(year);
  const el = document.getElementById('projection-year-end');
  if(!el) return;

  const statusMicro = proj.caProjected > PLAFOND_MICROBIC ? '⚠️ Dépassement' : '✓ OK';
  const statusTVA = proj.caProjected > PLAFOND_TVA ? '⚠️ TVA requise' : '✓ OK';
  const benefColor = proj.beneficeProjected >= 0 ? 'var(--green)' : 'var(--red)';

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <div style="font-size:11px;color:rgba(244,241,235,0.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Projection</div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:12px;border-bottom:1px solid rgba(218,171,45,0.1)">
            <span style="font-size:12px;color:rgba(244,241,235,0.7)">CA Fin ${year}</span>
            <span style="font-size:20px;color:var(--gold);font-weight:bold">${fmt(proj.caProjected)}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:11px;color:rgba(244,241,235,0.6)">Réalisé</span>
            <span style="font-size:13px;color:var(--gold)">${fmt(proj.caToday)}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:11px;color:rgba(244,241,235,0.6)">Moy. mensuelle</span>
            <span style="font-size:13px;color:var(--blue)">${fmt(proj.avgMonthlyRev)}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:11px;color:rgba(244,241,235,0.6)">Mois</span>
            <span style="font-size:13px">${proj.monthsElapsed.toFixed(1)} / 12</span>
          </div>
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:rgba(244,241,235,0.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Charges & Bénéfice</div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:12px;border-bottom:1px solid rgba(218,171,45,0.1)">
            <span style="font-size:12px;color:rgba(244,241,235,0.7)">Bénéfice Net</span>
            <span style="font-size:20px;color:${benefColor};font-weight:bold">${fmt(proj.beneficeProjected)}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:11px;color:rgba(244,241,235,0.6)">Dépenses</span>
            <span style="font-size:13px;color:var(--red)">−${fmt(proj.depProjected)}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:11px;color:rgba(244,241,235,0.6)">URSSAF (21,1%)</span>
            <span style="font-size:13px;color:var(--red)">−${fmt(proj.urssafProjected)}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:11px;color:rgba(244,241,235,0.6)">Marge nette</span>
            <span style="font-size:13px;color:${benefColor}">${proj.beneficeProjected>0?'+':''}${((proj.beneficeProjected/proj.caProjected)*100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(218,171,45,0.1);display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:rgba(244,241,235,0.7)">Plafond Micro-BIC (77 700 €)</span>
        <span style="color:${proj.microWarning?'var(--red)':'var(--green)'};font-weight:bold">${statusMicro}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:rgba(244,241,235,0.7)">Franchise TVA (37 500 €)</span>
        <span style="color:${proj.tvaWarning?'var(--red)':'var(--green)'};font-weight:bold">${statusTVA}</span>
      </div>
    </div>`;
}

function renderRecent(year) {
  const combined = [
    ...state.revenus.filter(r => r.date && new Date(r.date).getFullYear()===year).map(r => ({...r, _type:'revenu'})),
    ...state.depenses.filter(d => d.date && new Date(d.date).getFullYear()===year).map(d => ({...d, _type:'depense'}))
  ].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,10);

  const tbody = document.getElementById('tbody-recent');
  if(!combined.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">Aucune opération</div></td></tr>`;
    return;
  }
  tbody.innerHTML = combined.map(op => op._type === 'revenu' ? `
    <tr>
      <td>${fmtDate(op.date)}</td>
      <td><span class="badge badge-green">Revenu</span></td>
      <td>${op.client}</td>
      <td class="td-muted">${op.type||'—'}</td>
      <td class="td-green">+${fmt(op.montant)}</td>
      <td class="td-muted" style="font-size:11px">${op.formule||'—'}</td>
    </tr>` : `
    <tr>
      <td>${fmtDate(op.date)}</td>
      <td><span class="badge badge-red">Dépense</span></td>
      <td>${op.description}</td>
      <td class="td-muted">${op.categorie||'—'}</td>
      <td class="td-red">-${fmt(op.montant)}</td>
      <td class="td-muted" style="font-size:11px">${op.fournisseur||'—'}</td>
    </tr>`).join('');
}

// ═══════════════════════════════════════════════════════════════════
// CHARGES RÉCURRENTES
// ═══════════════════════════════════════════════════════════════════
function getChargesRecurrentesMonthly() {
  return (state.chargesRecurrentes || []).filter(c => c.actif).reduce((sum, c) => {
    const mult = c.periodicite === 'mensuel' ? 1 : c.periodicite === 'trimestriel' ? 1/3 : 1/12;
    return sum + c.montant * mult;
  }, 0);
}

function saveChargeRecurrente() {
  const nom = document.getElementById('cr-nom').value.trim();
  const montant = parseFloat(document.getElementById('cr-montant').value);
  if(!nom || isNaN(montant) || montant <= 0) {
    toast('Veuillez remplir le nom et le montant', 'error'); return;
  }
  const charge = {
    id: Date.now(),
    nom,
    categorie: document.getElementById('cr-categorie').value,
    fournisseur: document.getElementById('cr-fournisseur').value.trim(),
    montant,
    periodicite: document.getElementById('cr-periodicite').value,
    dateDebut: document.getElementById('cr-dateDebut').value || new Date().toISOString().split('T')[0],
    actif: true,
    notes: document.getElementById('cr-notes').value.trim()
  };
  state.chargesRecurrentes.push(charge);
  saveToStorage();
  renderChargesRecurrentes();
  clearCrForm();
  toast(`Charge "${nom}" ajoutée`, 'success');
}

function deleteChargeRecurrente(id) {
  if(!confirm('Supprimer cette charge récurrente ?')) return;
  state.chargesRecurrentes = state.chargesRecurrentes.filter(c => c.id !== id);
  saveToStorage();
  renderChargesRecurrentes();
  toast('Charge supprimée');
}

function toggleChargeRecurrente(id) {
  const c = state.chargesRecurrentes.find(c => c.id === id);
  if(c) {
    c.actif = !c.actif;
    saveToStorage();
    renderChargesRecurrentes();
    toast(c.actif ? 'Charge activée' : 'Charge suspendue');
  }
}

function clearCrForm() {
  ['cr-nom','cr-fournisseur','cr-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cr-montant').value = '';
  document.getElementById('cr-periodicite').value = 'mensuel';
  document.getElementById('cr-categorie').value = 'Abonnement numérique';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('cr-dateDebut').value = today;
}

function renderChargesRecurrentes() {
  if(!state.chargesRecurrentes) state.chargesRecurrentes = [];
  const charges = state.chargesRecurrentes;
  const actives = charges.filter(c => c.actif);
  const mensuel = getChargesRecurrentesMonthly();
  const annuel = mensuel * 12;

  const sumEl = document.getElementById('cr-summary');
  if(sumEl) sumEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:11px;color:rgba(244,241,235,0.5)">Coût mensuel</span>
        <span style="font-size:20px;color:var(--red)">${fmt(mensuel)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:rgba(244,241,235,0.5)">Coût annuel estimé</span>
        <span style="color:var(--red)">${fmt(annuel)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:rgba(244,241,235,0.5)">Charges actives</span>
        <span>${actives.length} / ${charges.length}</span>
      </div>
    </div>`;

  const byCat = {};
  actives.forEach(c => {
    const mult = c.periodicite === 'mensuel' ? 1 : c.periodicite === 'trimestriel' ? 1/3 : 1/12;
    byCat[c.categorie] = (byCat[c.categorie] || 0) + c.montant * mult;
  });
  const catEl = document.getElementById('cr-by-cat');
  if(catEl) catEl.innerHTML = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(218,171,45,0.06);font-size:12px">
      <span style="color:rgba(244,241,235,0.6)">${k}</span>
      <span style="color:var(--red)">${fmt(v)}/mois</span>
    </div>`).join('') || '<div class="empty-state" style="padding:20px">Aucune charge active</div>';

  const listEl = document.getElementById('cr-list');
  if(!listEl) return;
  if(!charges.length) {
    listEl.innerHTML = `<div class="empty-state" style="padding:30px"><div class="empty-icon">◇</div>Aucune charge récurrente enregistrée</div>`;
    return;
  }

  const grouped = {};
  charges.forEach(c => { (grouped[c.categorie] = grouped[c.categorie] || []).push(c); });
  const periodLabel = { mensuel:'Mensuel', trimestriel:'Trimestriel', annuel:'Annuel' };

  listEl.innerHTML = Object.entries(grouped).map(([cat, items]) => `
    <div class="card" style="margin-bottom:0">
      <div class="card-title" style="font-size:11px;text-transform:uppercase;letter-spacing:1px">${cat}</div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Désignation</th><th>Fournisseur</th>
            <th>Montant</th><th>Périodicité</th><th>Équiv. mois</th><th>Statut</th><th></th>
          </tr></thead>
          <tbody>
            ${items.map(c => {
              const mult = c.periodicite === 'mensuel' ? 1 : c.periodicite === 'trimestriel' ? 1/3 : 1/12;
              const mensuelEq = c.montant * mult;
              return `<tr style="${c.actif ? '' : 'opacity:0.45'}">
                <td>
                  <div style="font-weight:500">${c.nom}</div>
                  ${c.notes ? `<div style="font-size:10px;color:rgba(244,241,235,0.4)">${c.notes}</div>` : ''}
                </td>
                <td class="td-muted">${c.fournisseur || '—'}</td>
                <td class="td-red">${fmt(c.montant)}</td>
                <td><span class="badge badge-blue" style="font-size:9px">${periodLabel[c.periodicite] || c.periodicite}</span></td>
                <td class="td-muted" style="font-size:11px">${fmt(mensuelEq)}</td>
                <td>
                  <button class="btn btn-sm" style="font-size:10px;padding:3px 8px;background:${c.actif ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)'};border:1px solid ${c.actif ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'};color:${c.actif ? 'var(--green)' : 'rgba(244,241,235,0.4)'}" onclick="toggleChargeRecurrente(${c.id})">${c.actif ? '✓ Actif' : '⏸ Inactif'}</button>
                </td>
                <td><button class="btn btn-danger" onclick="deleteChargeRecurrente(${c.id})">✕</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`).join('');
}

// ═══════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════
function saveToStorage() {
  try {
    state.meta.lastSave = new Date().toISOString();
    localStorage.setItem('barman_finance_data', JSON.stringify(state));
    // Sync cloud en parallèle (silencieux si non connecté)
    saveToCloud(state, COLLECTION);
  } catch(e) { console.warn('LocalStorage error:', e); }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem('barman_finance_data');
    if(raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
      if(!state.chargesRecurrentes) state.chargesRecurrentes = [];
      // Recalculate amort schedules on load
      state.equipements = state.equipements.map(eq => ({
        ...eq,
        schedule: calcAmortSchedule(eq.valeur, eq.residuel||0, eq.duree, eq.mode||'lineaire', eq.date)
      }));
    }
  } catch(e) { console.warn('Load error:', e); }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════════════════════════════
function exportData() {
  state.meta.lastSave = new Date().toISOString();
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `barman_finance_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Données exportées — sauvegardez sur Google Drive', 'success');
}

function importData() {
  document.getElementById('import-input').click();
}

function handleImport(event) {
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if(!parsed.revenus && !parsed.depenses && !parsed.equipements) {
        toast('Fichier JSON invalide', 'error'); return;
      }
      if(!confirm(`Importer ${parsed.revenus?.length||0} revenus, ${parsed.depenses?.length||0} dépenses, ${parsed.equipements?.length||0} équipements ?\nCela remplacera les données actuelles.`)) return;
      state = { ...state, ...parsed };
      state.equipements = state.equipements.map(eq => ({
        ...eq,
        schedule: calcAmortSchedule(eq.valeur, eq.residuel||0, eq.duree, eq.mode||'lineaire', eq.date)
      }));
      saveToStorage();
      populateYearFilters();
      renderAll();
      toast('Données importées avec succès', 'success');
    } catch(err) {
      toast('Erreur lors de l\'import : ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ═══════════════════════════════════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════════════════════════════════
function renderAll() {
  renderDashboard();
  renderRevenus();
  renderRevSummary();
  renderDepenses();
  renderDepSummary();
  renderAmortissement();
  renderAchats();
  renderLaunchSummary();
  renderChargesRecurrentes();
}

// ═══════════════════════════════════════════════════════════════════
// PLAN DE LANCEMENT — ACHATS
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_ACHATS = [
  // Matériel de Bar
  { cat:'Matériel de Bar', nom:'Shakers Boston (×4)', prixEstime:80,  priorite:'essentiel', fournisseur:'Lacor / Amazon',    amortissable:false },
  { cat:'Matériel de Bar', nom:'Shakers Cobbler (×4)', prixEstime:60, priorite:'essentiel', fournisseur:'Lacor / Amazon',    amortissable:false },
  { cat:'Matériel de Bar', nom:'Bar spoons (×6)',      prixEstime:30,  priorite:'essentiel', fournisseur:'Lacor',             amortissable:false },
  { cat:'Matériel de Bar', nom:'Muddlers (×4)',        prixEstime:25,  priorite:'essentiel', fournisseur:'Amazon',            amortissable:false },
  { cat:'Matériel de Bar', nom:'Jiggers doubles (×8)', prixEstime:40,  priorite:'essentiel', fournisseur:'Lacor',             amortissable:false },
  { cat:'Matériel de Bar', nom:'Strainers Hawthorne (×4)', prixEstime:35, priorite:'essentiel', fournisseur:'Lacor',         amortissable:false },
  { cat:'Matériel de Bar', nom:'Fine strainers (×4)', prixEstime:20,  priorite:'essentiel', fournisseur:'Amazon',            amortissable:false },
  { cat:'Matériel de Bar', nom:'Couteaux de bar + planche', prixEstime:55, priorite:'essentiel', fournisseur:'Metro / Amazon', amortissable:false },
  { cat:'Matériel de Bar', nom:'Peelers zeste (×4)',  prixEstime:20,  priorite:'essentiel', fournisseur:'Amazon',            amortissable:false },
  { cat:'Matériel de Bar', nom:'Pichets doseurs (×4)', prixEstime:30, priorite:'essentiel', fournisseur:'Lacor',             amortissable:false },
  { cat:'Matériel de Bar', nom:'Blender professionnel', prixEstime:280, priorite:'important', fournisseur:'Vitamix / Hamilton Beach', amortissable:true },
  { cat:'Matériel de Bar', nom:'Presse-agrumes manuel (×2)', prixEstime:40, priorite:'essentiel', fournisseur:'Amazon',      amortissable:false },
  // Verrerie
  { cat:'Verrerie', nom:'Verres à cocktail (×24)',   prixEstime:120, priorite:'essentiel', fournisseur:'Arcoroc / Libbey', amortissable:false },
  { cat:'Verrerie', nom:'Verres Highball (×24)',      prixEstime:80,  priorite:'essentiel', fournisseur:'Arcoroc',          amortissable:false },
  { cat:'Verrerie', nom:'Verres Old Fashioned (×12)', prixEstime:60, priorite:'essentiel', fournisseur:'Arcoroc',          amortissable:false },
  { cat:'Verrerie', nom:'Flûtes à Champagne (×12)',  prixEstime:50,  priorite:'important', fournisseur:'Arcoroc',          amortissable:false },
  { cat:'Verrerie', nom:'Mugs Copper Moscow Mule (×8)', prixEstime:80, priorite:'important', fournisseur:'Amazon',         amortissable:false },
  { cat:'Verrerie', nom:'Carafes de service (×4)',   prixEstime:40,  priorite:'important', fournisseur:'Amazon',           amortissable:false },
  // Mobilier & Bar Mobile
  { cat:'Mobilier & Bar Mobile', nom:'Bar mobile (comptoir)',     prixEstime:900, priorite:'essentiel', fournisseur:'Fabrication DIY / Leboncoin', amortissable:true },
  { cat:'Mobilier & Bar Mobile', nom:'Tapis de bar (×4)',         prixEstime:60,  priorite:'important', fournisseur:'Amazon', amortissable:false },
  { cat:'Mobilier & Bar Mobile', nom:'Range-bouteilles / étagère', prixEstime:120, priorite:'important', fournisseur:'Ikea / Amazon', amortissable:true },
  // Réfrigération & Glaçons
  { cat:'Réfrigération & Glaçons', nom:'Machine à glaçons professionnelle', prixEstime:450, priorite:'essentiel', fournisseur:'Hoshizaki / Amazon Pro', amortissable:true },
  { cat:'Réfrigération & Glaçons', nom:'Seaux à glaçons (×2)',   prixEstime:30,  priorite:'essentiel', fournisseur:'Amazon',  amortissable:false },
  { cat:'Réfrigération & Glaçons', nom:'Pinces à glaçons (×4)',  prixEstime:20,  priorite:'essentiel', fournisseur:'Amazon',  amortissable:false },
  { cat:'Réfrigération & Glaçons', nom:'Glacière professionnelle', prixEstime:150, priorite:'essentiel', fournisseur:'Igloo / Amazon', amortissable:true },
  // Consommables & Stocks
  { cat:'Consommables & Stocks', nom:'Alcools de base (stock initial)', prixEstime:600, priorite:'essentiel', fournisseur:'Nicolas Pro / Métro', amortissable:false },
  { cat:'Consommables & Stocks', nom:'Sirops maison + bouteilles', prixEstime:80, priorite:'essentiel', fournisseur:'Metro / Azuké', amortissable:false },
  { cat:'Consommables & Stocks', nom:'Garnitures & déco (herbes, agrumes)', prixEstime:60, priorite:'essentiel', fournisseur:'Metro / Marché', amortissable:false },
  { cat:'Consommables & Stocks', nom:'Pailles & accessoires jetables', prixEstime:40, priorite:'important', fournisseur:'Amazon',  amortissable:false },
  { cat:'Consommables & Stocks', nom:'Serviettes cocktail (×200)', prixEstime:25, priorite:'important', fournisseur:'Amazon',     amortissable:false },
  // Communication & Marketing
  { cat:'Communication & Marketing', nom:'Cartes de visite (500 ex.)', prixEstime:50, priorite:'important', fournisseur:'Vistaprint / Canva Print', amortissable:false },
  { cat:'Communication & Marketing', nom:'Flyers A5 (500 ex.)',  prixEstime:80,  priorite:'important', fournisseur:'Vistaprint', amortissable:false },
  { cat:'Communication & Marketing', nom:'Kakémono / bannière roll-up', prixEstime:120, priorite:'optionnel', fournisseur:'Vistaprint / Affiche24', amortissable:true },
  // Tenue Professionnelle
  { cat:'Tenue Professionnelle', nom:'Tablier de barman (×2)',   prixEstime:80,  priorite:'essentiel', fournisseur:'Amazon / Gastronoble', amortissable:false },
  { cat:'Tenue Professionnelle', nom:'Chemise/tenue pro (×2)',   prixEstime:120, priorite:'important', fournisseur:'Zara / Next', amortissable:false },
  // Administratif & Légal
  { cat:'Administratif & Légal', nom:'Assurance RC Pro (annuelle)', prixEstime:300, priorite:'essentiel', fournisseur:'Hiscox / AXA Pro', amortissable:false },
  { cat:'Administratif & Légal', nom:'Inscription auto-entrepreneur (URSSAF)', prixEstime:0, priorite:'essentiel', fournisseur:'autoentrepreneur.urssaf.fr', amortissable:false },
  // Numérique & Logiciels
  { cat:'Numérique & Logiciels', nom:'Domaine web + hébergement (1 an)', prixEstime:60, priorite:'important', fournisseur:'OVH / Ionos', amortissable:false },
  { cat:'Numérique & Logiciels', nom:'Abonnement Canva Pro (1 an)',       prixEstime:130, priorite:'optionnel', fournisseur:'canva.com', amortissable:false },
];

function initDefaultAchats() {
  if(state.achats.length === 0) {
    state.achats = DEFAULT_ACHATS.map((a, i) => ({
      id: Date.now() + i,
      nom: a.nom,
      categorie: a.cat,
      priorite: a.priorite,
      prixEstime: a.prixEstime,
      prixReel: null,
      fournisseur: a.fournisseur,
      statut: 'a_acheter',
      amortissable: a.amortissable,
      notes: ''
    }));
    saveToStorage();
  }
}

function resetDefaultAchats() {
  if(!confirm('Réinitialiser la liste avec les articles par défaut ? Les articles personnalisés seront perdus.')) return;
  state.achats = [];
  initDefaultAchats();
  renderAchats();
  renderLaunchSummary();
  toast('Liste réinitialisée avec les articles par défaut', 'success');
}

function saveAchat() {
  const nom = document.getElementById('lc-nom').value.trim();
  if(!nom) { toast('Veuillez saisir une désignation', 'error'); return; }
  const prixEstime = parseFloat(document.getElementById('lc-prix-estime').value) || 0;
  const prixReel = parseFloat(document.getElementById('lc-prix-reel').value) || null;
  const achat = {
    id: Date.now(),
    nom,
    categorie: document.getElementById('lc-categorie').value,
    priorite: document.getElementById('lc-priorite').value,
    prixEstime,
    prixReel: prixReel > 0 ? prixReel : null,
    fournisseur: document.getElementById('lc-fournisseur').value.trim(),
    statut: document.getElementById('lc-statut').value,
    amortissable: document.getElementById('lc-amortissable').checked,
    notes: document.getElementById('lc-notes').value.trim()
  };
  state.achats.push(achat);
  saveToStorage();
  renderAchats();
  renderLaunchSummary();
  clearLcForm();
  toast(`"${nom}" ajouté au plan de lancement`, 'success');
}

function deleteAchat(id) {
  if(!confirm('Supprimer cet article ?')) return;
  state.achats = state.achats.filter(a => a.id !== id);
  saveToStorage();
  renderAchats();
  renderLaunchSummary();
}

function updateAchatStatut(id, statut) {
  const a = state.achats.find(a => a.id === id);
  if(a) { a.statut = statut; saveToStorage(); renderAchats(); renderLaunchSummary(); }
}

function transferToDepense(id) {
  const a = state.achats.find(a => a.id === id);
  if(!a) return;
  const montant = a.prixReel || a.prixEstime;
  if(!montant) { toast('Prix non renseigné', 'error'); return; }
  const dep = {
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    montant,
    description: a.nom,
    categorie: a.amortissable ? 'Matériel & Équipement' : 'Consommables & Produits',
    fournisseur: a.fournisseur,
    justificatif: '',
    deductible: 'oui',
    notes: 'Issu du Plan de Lancement'
  };
  state.depenses.unshift(dep);
  a.statut = 'achete';
  saveToStorage();
  renderAchats();
  renderLaunchSummary();
  toast(`"${a.nom}" transféré dans les Dépenses et marqué Acheté`, 'success');
}

function clearLcForm() {
  ['lc-nom','lc-fournisseur','lc-notes'].forEach(id => document.getElementById(id).value = '');
  ['lc-prix-estime','lc-prix-reel'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('lc-categorie').value = document.getElementById('lc-categorie').options[0].value;
  document.getElementById('lc-priorite').value = 'essentiel';
  document.getElementById('lc-statut').value = 'a_acheter';
  document.getElementById('lc-amortissable').checked = false;
}

const STATUT_LABELS = { a_acheter:'⬜ À acheter', commande:'🔵 Commandé', achete:'✅ Acheté' };
const PRIORITE_LABELS = { essentiel:'🔴 Essentiel', important:'🟡 Important', optionnel:'🟢 Optionnel' };
const PRIORITE_ORDER = { essentiel:0, important:1, optionnel:2 };

function renderAchats() {
  // Populate category filter
  const cats = [...new Set(state.achats.map(a => a.categorie))].sort();
  const catFilter = document.getElementById('lc-filter-cat');
  if(catFilter) {
    const prev = catFilter.value;
    catFilter.innerHTML = '<option value="all">Toutes</option>' + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
    if(prev && cats.includes(prev)) catFilter.value = prev;
  }

  const filterStatut = document.getElementById('lc-filter-statut')?.value || 'all';
  const filterPriorite = document.getElementById('lc-filter-priorite')?.value || 'all';
  const filterCat = document.getElementById('lc-filter-cat')?.value || 'all';

  let filtered = state.achats;
  if(filterStatut !== 'all') filtered = filtered.filter(a => a.statut === filterStatut);
  if(filterPriorite !== 'all') filtered = filtered.filter(a => a.priorite === filterPriorite);
  if(filterCat !== 'all') filtered = filtered.filter(a => a.categorie === filterCat);

  const listEl = document.getElementById('launch-list');
  if(!filtered.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">✦</div>Aucun article${filterStatut!=='all'||filterPriorite!=='all'||filterCat!=='all'?' pour ces filtres':' — ajoutez votre premier achat'}</div>`;
    return;
  }

  // Group by category
  const byCat = {};
  filtered.forEach(a => { if(!byCat[a.categorie]) byCat[a.categorie]=[]; byCat[a.categorie].push(a); });

  listEl.innerHTML = Object.entries(byCat).map(([cat, items]) => {
    const total = items.reduce((s,a) => s + (a.prixReel||a.prixEstime||0), 0);
    const achetes = items.filter(a => a.statut==='achete').length;
    return `<div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title" style="margin-bottom:0;flex:1">${cat}</div>
        <span style="font-size:11px;color:rgba(244,241,235,0.4);margin-right:16px">${achetes}/${items.length} achetés</span>
        <span style="font-size:13px;color:var(--gold)">${fmt(total)}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${items.sort((a,b)=>PRIORITE_ORDER[a.priorite]-PRIORITE_ORDER[b.priorite]).map(a => {
          const prix = a.prixReel ? fmt(a.prixReel) : (a.prixEstime ? `~${fmt(a.prixEstime)}` : '—');
          const isDone = a.statut === 'achete';
          return `<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:${isDone?'rgba(76,175,130,0.05)':'rgba(218,171,45,0.03)'};border:1px solid ${isDone?'rgba(76,175,130,0.15)':'rgba(218,171,45,0.08)'};border-radius:4px">
            <select onchange="updateAchatStatut(${a.id}, this.value)" style="background:var(--black3);border:1px solid var(--border);color:var(--alabaster);padding:4px 8px;border-radius:3px;font-size:11px;cursor:pointer;outline:none;min-width:120px">
              <option value="a_acheter" ${a.statut==='a_acheter'?'selected':''}>⬜ À acheter</option>
              <option value="commande"  ${a.statut==='commande' ?'selected':''}>🔵 Commandé</option>
              <option value="achete"    ${a.statut==='achete'   ?'selected':''}>✅ Acheté</option>
            </select>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:${isDone?'rgba(244,241,235,0.45)':'var(--alabaster)'};${isDone?'text-decoration:line-through;':''};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.nom}</div>
              <div style="font-size:10px;color:rgba(244,241,235,0.35);margin-top:2px">${PRIORITE_LABELS[a.priorite]||''}${a.fournisseur?' · '+a.fournisseur:''}${a.amortissable?' · <span style="color:var(--blue)">Amortissable</span>':''}${a.notes?' · '+a.notes:''}</div>
            </div>
            <span style="font-size:13px;color:${a.prixReel?'var(--green)':'var(--gold)'};white-space:nowrap;min-width:70px;text-align:right">${prix}</span>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-ghost btn-sm" title="Transférer en Dépense" onclick="transferToDepense(${a.id})" style="font-size:10px;padding:4px 8px">→ Dép.</button>
              <button class="btn btn-danger" onclick="deleteAchat(${a.id})" style="padding:4px 8px;font-size:10px">✕</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

function renderLaunchSummary() {
  const all = state.achats;
  const budgetTotal = all.reduce((s,a) => s+(a.prixEstime||0), 0);
  const realTotal   = all.reduce((s,a) => s+(a.prixReel||a.prixEstime||0), 0);
  const achetes     = all.filter(a => a.statut==='achete');
  const commandes   = all.filter(a => a.statut==='commande');
  const depenseAchete = achetes.reduce((s,a) => s+(a.prixReel||a.prixEstime||0), 0);
  const reste       = realTotal - depenseAchete;
  const pct         = all.length ? Math.round(achetes.length/all.length*100) : 0;

  // KPI grid
  const grid = document.getElementById('launch-kpi-grid');
  if(grid) grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Budget Estimé Total</div>
      <div class="kpi-value">${fmt(budgetTotal)}</div>
      <div class="kpi-sub">${all.length} articles</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Déjà Acheté</div>
      <div class="kpi-value" style="color:var(--green)">${fmt(depenseAchete)}</div>
      <div class="kpi-sub">${achetes.length} articles · ${pct}% complété</div>
      <div class="kpi-bar-wrap"><div class="kpi-bar green" style="width:${pct}%"></div></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Commandé</div>
      <div class="kpi-value" style="color:var(--blue)">${fmt(commandes.reduce((s,a)=>s+(a.prixReel||a.prixEstime||0),0))}</div>
      <div class="kpi-sub">${commandes.length} articles en attente</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Reste à Financer</div>
      <div class="kpi-value" style="color:${reste>0?'var(--red)':'var(--green)'}">${fmt(Math.max(reste,0))}</div>
      <div class="kpi-sub">Essentiels: ${fmt(all.filter(a=>a.priorite==='essentiel'&&a.statut==='a_acheter').reduce((s,a)=>s+(a.prixEstime||0),0))}</div>
    </div>`;

  // By category summary
  const byCat = {};
  all.forEach(a => {
    if(!byCat[a.categorie]) byCat[a.categorie] = { total:0, achete:0, count:0 };
    byCat[a.categorie].total += a.prixEstime||0;
    byCat[a.categorie].count++;
    if(a.statut==='achete') byCat[a.categorie].achete++;
  });
  const sumEl = document.getElementById('launch-by-cat');
  if(sumEl) sumEl.innerHTML = Object.entries(byCat).sort((a,b)=>b[1].total-a[1].total).map(([cat,d]) => {
    const pctCat = d.count ? Math.round(d.achete/d.count*100) : 0;
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
        <span style="color:rgba(244,241,235,0.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65%">${cat}</span>
        <span style="color:var(--gold)">${fmt(d.total)} <span style="color:rgba(244,241,235,0.35)">(${pctCat}%)</span></span>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px">
        <div style="height:100%;width:${pctCat}%;background:linear-gradient(90deg,#2E7D5B,var(--green));border-radius:2px;transition:width 0.5s"></div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state" style="padding:16px">Aucune donnée</div>';

  // Budget chart by priorité
  const byPrio = { essentiel:0, important:0, optionnel:0 };
  all.forEach(a => { byPrio[a.priorite] = (byPrio[a.priorite]||0) + (a.prixEstime||0); });
  const totalPrio = Object.values(byPrio).reduce((s,v)=>s+v,0);
  const prioColors = { essentiel:'var(--red)', important:'var(--gold)', optionnel:'var(--green)' };
  const chartEl = document.getElementById('launch-budget-chart');
  if(chartEl) chartEl.innerHTML = Object.entries(byPrio).map(([p,v]) => {
    const pctP = totalPrio ? (v/totalPrio*100).toFixed(1) : 0;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
        <span style="color:rgba(244,241,235,0.7)">${PRIORITE_LABELS[p]}</span>
        <span style="color:${prioColors[p]}">${pctP}%  ${fmt(v)}</span>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px">
        <div style="height:100%;width:${pctP}%;background:${prioColors[p]};border-radius:2px;transition:width 0.5s"></div>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function fmt(n) {
  if(isNaN(n)||n===null||n===undefined) return '—';
  return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(n);
}

function fmtDate(d) {
  if(!d) return '—';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }); }
  catch(e) { return d; }
}

function toast(msg, type='') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(20px)'; el.style.transition='all 0.3s'; setTimeout(()=>el.remove(), 300); }, 3000);
}

// ═══════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  init();

  // Démarrer l'authentification Firebase
  // Quand les données cloud arrivent, on recharge l'état complet
  initAuth('barman_finance_data', (cloudData) => {
    state = { ...state, ...cloudData };
    state.equipements = state.equipements.map(eq => ({
      ...eq,
      schedule: calcAmortSchedule(eq.valeur, eq.residuel||0, eq.duree, eq.mode||'lineaire', eq.date)
    }));
    localStorage.setItem('barman_finance_data', JSON.stringify(state));
    populateYearFilters();
    renderAll();
  }, COLLECTION);

  // Boutons connexion / déconnexion
  const btnLogin  = document.getElementById('btn-firebase-login');
  const btnLogout = document.getElementById('btn-firebase-logout');
  if (btnLogin)  btnLogin.addEventListener('click', loginWithGoogle);
  if (btnLogout) btnLogout.addEventListener('click', logout);
});


// ═══════════════════════════════════════════════════════════════════
// EXPOSITION GLOBALE — requis pour type="module"
// Les onclick="" et onchange="" du HTML ne voient pas
// les fonctions de module. On les expose sur window.
// ═══════════════════════════════════════════════════════════════════
window.switchTab          = switchTab;
window.saveRevenu         = saveRevenu;
window.clearRevForm       = clearRevForm;
window.saveDepense        = saveDepense;
window.clearDepForm       = clearDepForm;
window.saveEquipement     = saveEquipement;
window.clearAmortForm     = clearAmortForm;
window.previewAmort       = previewAmort;
window.deleteEquipement   = deleteEquipement;
window.saveAchat          = saveAchat;
window.deleteAchat        = deleteAchat;
window.updateAchatStatut  = updateAchatStatut;
window.transferToDepense  = transferToDepense;
window.clearLcForm        = clearLcForm;
window.resetDefaultAchats = resetDefaultAchats;
window.exportData         = exportData;
window.importData         = importData;
window.handleImport       = handleImport;
window.renderDashboard    = renderDashboard;
window.renderRevenus      = renderRevenus;
window.renderDepenses     = renderDepenses;
window.renderAchats       = renderAchats;
window.updateFormulaPrice = updateFormulaPrice;
window.deleteRevenu       = deleteRevenu;
window.deleteDepense      = deleteDepense;
window.updatePaymentStatus = updatePaymentStatus;
window.generateQuotePDF   = generateQuotePDF;
