import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔥 Firebase Konfiguration HIER EINTRAGEN (ersetze mit deinen eigenen Firebase-Daten)
const firebaseConfig = {
  apiKey: "AIzaSyDoUdRr-C9S5hF3-MarKNGnJrr2p_XkQrk",
  authDomain: "time4you-3a43a.firebaseapp.com",
  projectId: "time4you-3a43a",
  storageBucket: "time4you-3a43a.firebasestorage.app",
  messagingSenderId: "691415936917",
  appId: "1:691415936917:web:97950e8ef1deb33a35d09c"

};

// 🔥 Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
