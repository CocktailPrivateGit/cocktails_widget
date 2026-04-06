// ═══════════════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION — Cocktail Privé Widgets
// ═══════════════════════════════════════════════════════════════════
// Ce fichier est partagé entre BarComm Pro et BarMan Finance.
// Les clés ci-dessous sont publiques par nature (côté client),
// la sécurité est assurée par les règles Firestore configurées.
// ═══════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Configuration du projet Firebase ──
const firebaseConfig = {
  apiKey:            "AIzaSyCFK0fSAEJMPzQtw2kCjq11iFzXcaEg5ts",
  authDomain:        "cocktail-privet-widgets.firebaseapp.com",
  projectId:         "cocktail-privet-widgets",
  storageBucket:     "cocktail-privet-widgets.firebasestorage.app",
  messagingSenderId: "335179066053",
  appId:             "1:335179066053:web:3850ba368a06ed8c05deac"
};

// ── Initialisation ──
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

export { db, auth, doc, setDoc, getDoc, onSnapshot, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged };
