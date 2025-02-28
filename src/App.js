import React, { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const statuses = ["Start", "In Bearbeitung", "Produziert", "Verpackt", "Abgeschlossen"];

export default function App() {
  const [qrResult, setQrResult] = useState("");
  const [status, setStatus] = useState(statuses[0]);
  const [scanning, setScanning] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch("https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec")
      .then((res) => res.json())
      .then((data) => setHistory(data));
  }, []);

  const startScanner = () => {
    setScanning(true);
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });
    scanner.render(
      (decodedText) => {
        setQrResult(decodedText);
        scanner.clear();
        setScanning(false);
      },
      (error) => console.log(error)
    );
  };

  const submitData = async () => {
    if (!qrResult) return alert("Bitte zuerst einen QR-Code scannen");
    const response = await fetch("https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auftrag: qrResult, status }),
    });
    const result = await response.json();
    alert(result.message);
    setHistory([...history, { auftrag: qrResult, status }]);
  };

  return (
    <div className="app">
      <h2>Auftragsstatus erfassen</h2>
      {scanning ? (
        <div id="qr-reader"></div>
      ) : (
        <button onClick={startScanner}>QR-Code scannen</button>
      )}
      {qrResult && <p>Gescannt: {qrResult}</p>}
      <select onChange={(e) => setStatus(e.target.value)} value={status}>
        {statuses.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button onClick={submitData}>Speichern</button>
      <h3>Letzte Aufträge</h3>
      <ul>
        {history.slice(-5).map((entry, index) => (
          <li key={index}>{entry.auftrag} - {entry.status}</li>
        ))}
      </ul>
    </div>
  );
}