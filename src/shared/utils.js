/**
 * @file utils.js
 * @description Utilitaires partagés entre les widgets Cocktail Privé
 * @version 1.0.0
 * @author @cocktail_prive60
 */

// ═══════════════════════════════════════════════════════════════════
// FORMATAGE
// ═══════════════════════════════════════════════════════════════════

/**
 * Formate un nombre en devise Euro (fr-FR)
 * @param {number} n - Le montant à formater
 * @returns {string} Le montant formaté (ex: "1 250 €")
 *
 * @example
 * formatCurrency(1250.5); // "1 251 €"
 * formatCurrency(null);   // "—"
 */
function formatCurrency(n) {
  if (isNaN(n) || n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(n);
}

/**
 * Formate une date ISO en date lisible française
 * @param {string} d - Date au format ISO (ex: "2026-04-15")
 * @returns {string} Date formatée (ex: "15 avr. 2026")
 *
 * @example
 * formatDate('2026-04-15'); // "15 avr. 2026"
 * formatDate(null);         // "—"
 */
function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return d;
  }
}

/**
 * Formate un grand nombre avec abréviation (K, M)
 * @param {number} n - Le nombre à formater
 * @returns {string} Le nombre abrégé (ex: "5.2K", "1.3M")
 *
 * @example
 * formatNumber(5200); // "5.2K"
 * formatNumber(1300000); // "1.3M"
 */
function formatNumber(n) {
  if (!n || isNaN(n)) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// ═══════════════════════════════════════════════════════════════════
// DATES
// ═══════════════════════════════════════════════════════════════════

/**
 * Retourne la date actuelle au format YYYY-MM-DD
 * @returns {string} Date au format ISO (ex: "2026-04-04")
 */
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Retourne l'année courante
 * @returns {number} L'année (ex: 2026)
 */
function currentYear() {
  return new Date().getFullYear();
}

// ═══════════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Affiche une notification toast temporaire
 * @param {string} msg - Message à afficher
 * @param {string} [type=''] - Type de notification : 'success', 'error', '' (neutre)
 * @param {number} [duration=3000] - Durée d'affichage en millisecondes
 *
 * @example
 * showToast('Données sauvegardées', 'success');
 * showToast('Erreur de lecture', 'error');
 */
function showToast(msg, type = '', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all 0.3s';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ═══════════════════════════════════════════════════════════════════
// LOCAL STORAGE — HELPERS GÉNÉRIQUES
// ═══════════════════════════════════════════════════════════════════

/**
 * Lit une valeur depuis le localStorage
 * @param {string} key - Clé de stockage
 * @param {*} [defaultValue={}] - Valeur par défaut si clé absente
 * @returns {*} L'objet JSON parsé ou la valeur par défaut
 *
 * @example
 * const data = storageGet('barcomm_pro_v3', {});
 */
function storageGet(key, defaultValue = {}) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('[utils] storageGet error:', e);
    return defaultValue;
  }
}

/**
 * Sauvegarde une valeur dans le localStorage
 * @param {string} key - Clé de stockage
 * @param {*} value - Valeur à sauvegarder (sera convertie en JSON)
 *
 * @example
 * storageSet('barcomm_pro_v3', { ig: 5000 });
 */
function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[utils] storageSet error:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT JSON
// ═══════════════════════════════════════════════════════════════════

/**
 * Télécharge un objet JavaScript en fichier JSON
 * @param {Object} data - Les données à exporter
 * @param {string} filename - Nom du fichier téléchargé (sans .json)
 *
 * @example
 * downloadJSON({ ig: 5000 }, 'barcomm_backup_2026-04-04');
 */
function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Lit un fichier JSON uploadé par l'utilisateur
 * @param {File} file - L'objet File issu d'un <input type="file">
 * @returns {Promise<Object>} Promise résolue avec les données parsées
 *
 * @example
 * readJSONFile(inputEl.files[0]).then(data => console.log(data));
 */
function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target.result));
      } catch (err) {
        reject(new Error('Fichier JSON invalide'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file);
  });
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS (si utilisation en module Node.js futur)
// ═══════════════════════════════════════════════════════════════════
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCurrency,
    formatDate,
    formatNumber,
    todayISO,
    currentYear,
    showToast,
    storageGet,
    storageSet,
    downloadJSON,
    readJSONFile
  };
}
