import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { app, auth, db } from "./firebaseConfig"; // Importiere Firebase korrekt

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

// Teste, ob Firebase erfolgreich initialisiert wurde
console.log("Firebase App:", app);
console.log("Firebase Auth:", auth);
console.log("Firebase Firestore:", db);
