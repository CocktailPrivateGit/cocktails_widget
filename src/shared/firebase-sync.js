// ═══════════════════════════════════════════════════════════════════
// FIREBASE SYNC MODULE — Cocktail Privé Widgets
// Gère l'authentification Google et la sync Firestore
// Utilisé par BarComm Pro et BarMan Finance
// ═══════════════════════════════════════════════════════════════════

import {
  db, auth,
  doc, setDoc, getDoc, onSnapshot,
  signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged
} from './firebase-config.js';

// ── État global de la sync ──
let currentUser    = null;
let unsubscribeDB  = null;
let onDataCallback = null;

// ═══════════════════════════════════════════════════════════════════
// AUTHENTIFICATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Connexion via popup Google
 */
async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error('[Firebase] Erreur connexion Google :', e);
    showSyncStatus('Erreur de connexion', 'error');
  }
}

/**
 * Déconnexion
 */
async function logout() {
  if (unsubscribeDB) { unsubscribeDB(); unsubscribeDB = null; }
  await signOut(auth);
  currentUser = null;
  updateAuthUI(false);
  showSyncStatus('Déconnecté — données locales uniquement', '');
}

/**
 * Écouter les changements d'état de connexion
 * @param {string}   localStorageKey  Clé localStorage du widget
 * @param {Function} onData           Callback appelé quand les données Firestore arrivent
 * @param {string}   collectionName   Nom de la collection Firestore (ex: 'barcomm', 'barmanfinance')
 */
function initAuth(localStorageKey, onData, collectionName) {
  onDataCallback = onData;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      updateAuthUI(true, user.displayName, user.photoURL);
      showSyncStatus('Connexion cloud...', 'syncing');
      await migrateLocalToCloud(localStorageKey, collectionName);
      startRealtimeSync(collectionName, onData);
    } else {
      currentUser = null;
      updateAuthUI(false);
      if (unsubscribeDB) { unsubscribeDB(); unsubscribeDB = null; }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// SYNCHRONISATION FIRESTORE
// ═══════════════════════════════════════════════════════════════════

/**
 * Sauvegarder les données dans Firestore
 * @param {Object} data           Données à sauvegarder
 * @param {string} collectionName Nom de la collection
 */
async function saveToCloud(data, collectionName) {
  if (!currentUser) return;
  try {
    const ref = doc(db, 'users', currentUser.uid, collectionName, 'data');
    await setDoc(ref, { payload: JSON.stringify(data), updatedAt: new Date().toISOString() });
    showSyncStatus('Synchronisé ✓', 'ok');
  } catch (e) {
    console.error('[Firebase] Erreur sauvegarde :', e);
    showSyncStatus('Hors ligne — sauvegarde locale', 'offline');
  }
}

/**
 * Écouter les changements en temps réel
 * @param {string}   collectionName Nom de la collection
 * @param {Function} onData         Callback avec les données reçues
 */
function startRealtimeSync(collectionName, onData) {
  if (!currentUser) return;
  if (unsubscribeDB) unsubscribeDB();

  const ref = doc(db, 'users', currentUser.uid, collectionName, 'data');
  unsubscribeDB = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      try {
        const data = JSON.parse(snap.data().payload);
        onData(data);
        showSyncStatus('Synchronisé ✓', 'ok');
      } catch (e) {
        console.error('[Firebase] Erreur lecture snapshot :', e);
      }
    } else {
      showSyncStatus('Cloud prêt — en attente de données', 'ok');
    }
  }, (e) => {
    console.error('[Firebase] Erreur snapshot :', e);
    showSyncStatus('Hors ligne — données locales', 'offline');
  });
}

/**
 * Migrer les données localStorage vers Firestore à la première connexion
 * @param {string} localStorageKey  Clé localStorage
 * @param {string} collectionName   Nom de la collection Firestore
 */
async function migrateLocalToCloud(localStorageKey, collectionName) {
  if (!currentUser) return;
  try {
    const ref      = doc(db, 'users', currentUser.uid, collectionName, 'data');
    const cloudDoc = await getDoc(ref);
    // Si pas encore de données cloud, on migre le localStorage
    if (!cloudDoc.exists()) {
      const local = localStorage.getItem(localStorageKey);
      if (local) {
        await setDoc(ref, { payload: local, updatedAt: new Date().toISOString() });
        showSyncStatus('Données locales migrées vers le cloud ✓', 'ok');
      }
    }
  } catch (e) {
    console.error('[Firebase] Erreur migration :', e);
  }
}

// ═══════════════════════════════════════════════════════════════════
// UI — INDICATEURS VISUELS
// ═══════════════════════════════════════════════════════════════════

/**
 * Mettre à jour le bouton et l'avatar de connexion
 */
function updateAuthUI(isLoggedIn, name, photoURL) {
  const btnLogin  = document.getElementById('btn-firebase-login');
  const btnLogout = document.getElementById('btn-firebase-logout');
  const avatar    = document.getElementById('firebase-avatar');
  const userName  = document.getElementById('firebase-username');

  if (btnLogin)  btnLogin.style.display  = isLoggedIn ? 'none' : 'flex';
  if (btnLogout) btnLogout.style.display = isLoggedIn ? 'flex' : 'none';
  if (avatar && photoURL) { avatar.src = photoURL; avatar.style.display = 'block'; }
  if (avatar && !isLoggedIn) avatar.style.display = 'none';
  if (userName) userName.textContent = isLoggedIn ? (name || '') : '';
}

/**
 * Afficher le statut de synchronisation dans le header
 * @param {string} message  Message à afficher
 * @param {string} type     'ok' | 'error' | 'offline' | 'syncing' | ''
 */
function showSyncStatus(message, type) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.textContent = message;
  el.className   = 'sync-status sync-' + type;
}

/**
 * Lire les données d'une autre collection (cross-widget)
 * @param {string} collectionName  Nom de la collection à lire (ex: 'barcomm')
 * @returns {Object|null}
 */
async function readFromCollection(collectionName) {
  if (!currentUser) return null;
  try {
    const ref  = doc(db, 'users', currentUser.uid, collectionName, 'data');
    const snap = await getDoc(ref);
    if (snap.exists()) return JSON.parse(snap.data().payload);
    return null;
  } catch (e) {
    console.error('[Firebase] Erreur lecture cross-widget :', e);
    return null;
  }
}

// ── Exports ──
export { loginWithGoogle, logout, initAuth, saveToCloud, showSyncStatus, readFromCollection };
