import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../components/ui/card";
import Checkbox from "../components/ui/checkbox";
import { Progress } from "../components/ui/progress";
import Button from "../components/ui/button";
import Input from "../components/ui/input";
import { X, CheckCircle, Camera } from "lucide-react";
import { collection, onSnapshot, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Html5QrcodeScanner } from "html5-qrcode"; // Importiere den QR-Reader 

const steps = ["AB versendet", "im Druck", "Druck abgeschlossen", "fertig produziert", "Fakturiert"];

function getCurrentCalendarWeek() {
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDays = (now - firstDayOfYear) / 86400000;
  return Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
}

function getStatusColor(order) {
  if (order.progress.every(step => step)) return "bg-green-500";
  const currentWeek = getCurrentCalendarWeek();
  const diff = currentWeek - order.week;

  if (diff < -1) return "bg-green-500";
  if (diff === -1) return "bg-yellow-500";
  if (diff === 0) return "bg-orange-500";
  return "bg-red-500";
}

export default function ProductionProgress() {
  const [orders, setOrders] = useState([]);
  const [newOrder, setNewOrder] = useState("");
  const [newWeek, setNewWeek] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [scannedOrder, setScannedOrder] = useState(null); // Zustand für gescannten Auftrag
  const scannerRef = useRef(null);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const lastScannedOrderRef = useRef(null); // Speichert letzte Auftragsnummer für doppelten Scan-Schutz
  const [showOrders, setShowOrders] = useState(searchQuery !== ""); 

  useEffect(() => {
    // Verwende onSnapshot, um Echtzeit-Updates zu erhalten
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
    if (JSON.stringify(ordersData) !== JSON.stringify(prevOrders)) {
        return ordersData;
      }
      return prevOrders; // Verhindert unnötige State-Änderungen
    });
 
    // Aufräumen: unsubscribe bei Unmount der Komponente
    return () => unsubscribe();
  }, []);

  const toggleOrdersVisibility = () => {
    setShowOrders(prev => !prev);
  };

useEffect(() => {
    // Wenn es eine Suchabfrage gibt, setze showOrders auf true
    if (searchQuery) {
      setShowOrders(true);
    } else {
      setShowOrders(false);
    }
  }, [searchQuery]);

  
 useEffect(() => {
    // HTML5-QR-Scanner initialisieren
  if (isScannerVisible) {
   const scanner = new Html5QrcodeScanner("qr-code-scanner", {
      fps: 10,
      qrbox: 250,
    });

    scanner.render(handleScan, handleError);
    scannerRef.current = scanner;

    return () => {
        scanner.clear(); // Scanner nach dem Verlassen der Komponente stoppen
      };
    }
  }, [isScannerVisible]); // Nur ausführen, wenn isScannerVisible auf true gesetzt ist

 const handleScan = async (data) => {
  // Die orderId wird sofort nach dem Erhalten des Scans gesetzt
  const orderId = data.trim();

  if (!orderId) {
    alert("Ungültiges QR-Code-Format.");
    return;
  }

  // Verhindern, dass der gleiche Auftrag doppelt gescannt wird
  if (lastScannedOrderRef.current === orderId) {
    return; // Ignoriere den Scan, wenn der Auftrag bereits gescannt wurde
  }

  // Speichere die letzte gescannte ID
  lastScannedOrderRef.current = orderId;

   
  try {
    const orderRef = doc(db, "orders", orderId);
    const orderSnapshot = await getDoc(orderRef);

    if (orderSnapshot.exists()) {
      setSearchQuery(orderId);
      const order = orderSnapshot.data();
      console.log("Vorheriger Fortschritt:", order.progress); // Debugging

            // Finde den nächsten offenen Schritt
      const progressIndex = order.progress.findIndex(step => !step);
      if (progressIndex !== -1) {
        const updatedProgress = [...order.progress];
        updatedProgress[progressIndex] = true;  // Nur einen Schritt auf "erledigt" setzen

        // Auftrag in der Datenbank aktualisieren
        await updateDoc(orderRef, { progress: updatedProgress });

       
        // Update im UI
        setOrders(prev => {
          const updatedOrders = prev.map(o => o.id === orderId ? { ...o, progress: updatedProgress } : o);
          return JSON.stringify(updatedOrders) !== JSON.stringify(prev) ? updatedOrders : prev;
        });

        console.log("Neuer Fortschritt:", updatedProgress); // Debugging
        alert(`Erfolgreich gescannt: Auftrag ${orderId} (KW ${order.week})`);
      } else {
            alert("Alle Schritte sind bereits abgeschlossen.");
      }
    } else {
       const week = prompt(`Auftrag ${orderId} nicht gefunden. Bitte Kalenderwoche eingeben:`);

      if (!week || isNaN(parseInt(week, 10))) {
        alert("Ungültige Eingabe. Auftrag wurde nicht angelegt.");
        return;
      }

      const newOrderData = {
        id: orderId,
        week: parseInt(week, 10),
        progress: Array(steps.length).fill(false),
        remark: ""
      };

      await setDoc(orderRef, newOrderData);
  
      // Direkt in die Suchleiste übernehmen, damit er sofort sichtbar ist
      setSearchQuery(orderId);
      
      alert(`Neuer Auftrag ${orderId} (KW ${week}) wurde angelegt.`);
    }
  } catch (error) {
    console.error("Fehler beim Scannen:", error);
    alert("Fehler beim Abrufen oder Anlegen des Auftrags.");
  }

  // Setze eine Verzögerung, bevor wieder gescannt werden kann
  setTimeout(() => {
    lastScannedOrderRef.current = null;
  }, 3000); // 3 Sekunden Sperrzeit für den nächsten Scan
};
const handleError = (err) => {
  console.error("Fehler beim Scannen des QR-Codes:", err);
  // Optional: Zeige eine Fehlermeldung im UI an
};

 const toggleScannerVisibility = () => {
    setIsScannerVisible(prevState => !prevState);  // Scanner umschalten
  };
  
  const addOrder = async () => {
    if (newOrder.trim() !== "" && newWeek.trim() !== "") {
      const newOrderData = {
        id: newOrder.trim(),
        week: parseInt(newWeek, 10),
        progress: Array(steps.length).fill(false),
        remark: ""
      };

      try {
        const docRef = doc(db, "orders", newOrderData.id);
        await setDoc(docRef, newOrderData);
        setOrders((prev) => [...prev, { ...newOrderData, id: docRef.id }]);
        setNewOrder("");
        setNewWeek("");
      } catch (error) {
        console.error("Fehler beim Speichern in Firestore:", error);
      }
    } else {
      alert("Bitte alle Felder ausfüllen.");
    }
  };

const clearSearch = () => {
    setSearchQuery(""); // Löscht den Suchbegriff
  };
  
  const toggleStep = async (orderId, index) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || (index > 0 && !order.progress[index - 1])) return;

    const updatedProgress = [...order.progress];
    updatedProgress[index] = !updatedProgress[index];

    try {
      await updateDoc(doc(db, "orders", orderId), { progress: updatedProgress });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, progress: updatedProgress } : o));
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
    }
  };

  const updateRemark = async (orderId, remark) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { remark });
      setOrders(prev => prev.map(order => (order.id === orderId ? { ...order, remark } : order)));
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Bemerkung:", error);
    }
  };

  const deleteOrder = async () => {
    if (password === "t4y") {
      try {
        await deleteDoc(doc(db, "orders", orderToDelete.id));
        setOrders(prevOrders => prevOrders.filter(order => order.id !== orderToDelete.id));
        setShowPasswordPrompt(false);
        setPassword("");
        setOrderToDelete(null);
      } catch (error) {
        console.error("Fehler beim Löschen des Auftrags:", error);
      }
    } else {
      alert("Falsches Passwort");
    }
  };

  const handleDeleteClick = (orderId) => {
    setOrderToDelete(orders.find(order => order.id === orderId));
    setShowPasswordPrompt(true);
  };

  const filteredOrders = orders.filter(order => order.id === searchQuery);
  const SORTED_ORDERS = [...filteredOrders].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return (
    <div className="p-2 bg-green-600 min-h-screen flex flex-col">
      <h1 className="text-xl font-bold text-white">TIME4YOU - Auftragsüberwachung -Testversion-</h1>
      <h2 className="text-lg font-bold text-white">Aktuelle KW: {getCurrentCalendarWeek()}</h2>
      <div className="mt-2 mb-2 flex flex-row gap-2">
        <Input value={newOrder} onChange={(e) => setNewOrder(e.target.value)} placeholder="Neue Auftragsnummer"
        style={{ height: '14px'}} />
        <Input value={newWeek} onChange={(e) => setNewWeek(e.target.value)} placeholder="Kalenderwoche" 
          style={{ height: '14px'}}/>
        <Button onClick={addOrder}>Hinzufügen</Button>
      </div>
      {/* Deine Suchleiste mit dem "X" zum Löschen */}
      <div className="search-container" style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Auftragsnummer suchen ..."
          style={{ height: "14px", width: "200px" }}
        />
        {/* Das "X", um die Suchzeile zu leeren */}
        {searchQuery && (
          <span
            onClick={clearSearch}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              fontSize: "18px",
              color: "#999",
            }}
          >
            ✖
          </span>
        )}
      </div>
      
         {/* QR-Code-Scanner als Symbol anzeigen */}
      <div className="my-2">
        <Button
  className="bg-blue-500 p-2 rounded-full"
  onClick={toggleScannerVisibility}  // Nutze die toggleScannerVisibility Funktion
>
  <Camera size={24} color="white" />
</Button>

      </div>

       {/* QR-Code-Scanner anzeigen, wenn sichtbar */}
      {isScannerVisible && (
        <div id="qr-code-scanner" className="my-4"></div> // Hier das id-Attribut hinzufügen
      )}

      {/* Button zum Auf- und Zuklappen der gesamten Auftragsliste */}
      <Button onClick={toggleOrdersVisibility} className="mb-4">
        {showOrders ? "Aufträge verbergen" : "Aufträge anzeigen"}
      </Button>

     {/* Anzeige des gescannten Auftrags */}
      {scannedOrder && (
        <Card className="p-2 mt-4">
          <h2 className="text-sm font-bold">{scannedOrder.id} (KW {scannedOrder.week})</h2>
          <Progress value={(scannedOrder.progress.filter(Boolean).length / steps.length) * 100} />
          <div className="flex flex-wrap gap-2 mt-2">
            {steps.map((step, index) => (
              <label key={index} className="flex items-center gap-1 text-xs">
                <Checkbox checked={scannedOrder.progress[index]} onChange={() => toggleStep(scannedOrder.id, index)} />
                {step}
              </label>
            ))}
          </div>
          <Input value={scannedOrder.remark} onChange={(e) => updateRemark(scannedOrder.id, e.target.value)} placeholder="Bemerkung" className="mt-2 text-xs" />
        </Card>
      )}
      {showOrders && SORTED_ORDERS.map((order) => (
        <Card key={order.id} className="p-2 my-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">{order.id} (KW {order.week})</h2>
            {order.progress.every(step => step) ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <div className={`w-4 h-4 rounded-full ${getStatusColor(order)}`} />
            )}
          </div>
          <Progress value={(order.progress.filter(Boolean).length / steps.length) * 100}
  className={`
    ${((order.progress.filter(Boolean).length / steps.length) * 100) === 100 ? "bg-green-500" : "bg-blue-500"}
    transition-all duration-300
  `}
/>
          <div className="flex flex-wrap gap-2 mt-2">
            {steps.map((step, index) => (
              <label key={index} className="flex items-center gap-1 text-xs">
                <Checkbox checked={order.progress[index]} onChange={() => toggleStep(order.id, index)} />
                {step}
              </label>
            ))}
          </div>
          <Input value={order.remark} onChange={(e) => updateRemark(order.id, e.target.value)} placeholder="Bemerkung" className="mt-2 text-xs" />
          <Button onClick={() => handleDeleteClick(order.id)} className="absolute bottom-1 right-2 p-0 h-auto w-auto m-0">
            <X size={6} />
          </Button>
        </Card>
      ))}

      {showPasswordPrompt && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md shadow-lg">
            <h3 className="font-bold">Passwort zum Löschen eingeben</h3>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Passwort" 
            />
            <Button onClick={deleteOrder}>Löschen</Button>
            <Button onClick={() => setShowPasswordPrompt(false)} variant="secondary">Abbrechen</Button>
          </div>
        </div>
      )}
    </div>
  );
}
