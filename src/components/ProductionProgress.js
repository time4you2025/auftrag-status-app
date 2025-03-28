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
  const [filter, setFilter] = useState("all"); // Filterzustand
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const lastScannedOrderRef = useRef(null); // Speichert letzte Auftragsnummer für doppelten Scan-Schutz
  const [showOrders, setShowOrders] = useState(searchQuery !== ""); 

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, []);

  const toggleOrdersVisibility = () => {
    setShowOrders(prev => !prev);
  };

  useEffect(() => {
    if (searchQuery) {
      setShowOrders(true);
    } else {
      setShowOrders(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isScannerVisible) {
      const scanner = new Html5QrcodeScanner("qr-code-scanner", {
        fps: 10,
        qrbox: 250,
      });
      scanner.render(handleScan, handleError);
      lastScannedOrderRef.current = scanner;

      return () => {
        scanner.clear(); 
      };
    }
  }, [isScannerVisible]);

  const handleScan = async (data) => {
    const orderId = data.trim();

    if (!orderId) {
      alert("Ungültiges QR-Code-Format.");
      return;
    }

    if (lastScannedOrderRef.current === orderId) {
      return;
    }

    lastScannedOrderRef.current = orderId;

    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnapshot = await getDoc(orderRef);

      if (orderSnapshot.exists()) {
        setSearchQuery(orderId);
        const order = orderSnapshot.data();
        const progressIndex = order.progress.findIndex(step => !step);
        if (progressIndex !== -1) {
          const updatedProgress = [...order.progress];
          updatedProgress[progressIndex] = true;
          await updateDoc(orderRef, { progress: updatedProgress });
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, progress: updatedProgress } : o));
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
        const newOrderData = { id: orderId, week: parseInt(week, 10), progress: Array(steps.length).fill(false), remark: "" };
        await setDoc(orderRef, newOrderData);
        setSearchQuery(orderId);
        alert(`Neuer Auftrag ${orderId} (KW ${week}) wurde angelegt.`);
      }
    } catch (error) {
      console.error("Fehler beim Scannen:", error);
      alert("Fehler beim Abrufen oder Anlegen des Auftrags.");
    }

    setTimeout(() => {
      lastScannedOrderRef.current = null;
    }, 3000);
  };

  const handleError = (err) => {
    console.error("Fehler beim Scannen des QR-Codes:", err);
  };

  const toggleScannerVisibility = () => {
    setIsScannerVisible(prevState => !prevState);
  };

  const addOrder = async () => {
    if (newOrder.trim() !== "" && newWeek.trim() !== "") {
      const newOrderData = { id: newOrder.trim(), week: parseInt(newWeek, 10), progress: Array(steps.length).fill(false), remark: "" };
      try {
        const docRef = doc(db, "orders", newOrderData.id);
        await setDoc(docRef, newOrderData);
        setSearchQuery(newOrderData.id);
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
    setSearchQuery(""); 
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

  const filteredOrders = orders.filter(order => {
    if (filter === "all") return true;
    if (filter === "completed" && order.progress.every(step => step)) return true;
    if (filter === "overdue" && order.week < getCurrentCalendarWeek()) return true;
    if (filter === "urgent" && order.week === getCurrentCalendarWeek()) return true;
    return false;
  });

  const SORTED_ORDERS = [...filteredOrders].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return (
    <div className="p-2 bg-green-600 min-h-screen flex flex-col">
      <h1 className="text-xl font-bold text-white">TIME4YOU - Auftragsüberwachung -Testversion-</h1>
      <h2 className="text-lg font-bold text-white">Aktuelle KW: {getCurrentCalendarWeek()}</h2>
      
      {/* Filter Dropdown */}
      <div className="mb-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="p-2">
          <option value="all">Alle Aufträge</option>
          <option value="completed">Erledigte Aufträge</option>
          <option value="overdue">Überfällige Aufträge</option>
          <option value="urgent">Eilige Aufträge</option>
        </select>
      </div>

      <div className="mt-2 mb-2 flex flex-row gap-2">
        <Input value={newOrder} onChange={(e) => setNewOrder(e.target.value)} placeholder="Neue Auftragsnummer" style={{ height: '14px' }} />
        <Input value={newWeek} onChange={(e) => setNewWeek(e.target.value)} placeholder="Kalenderwoche" style={{ height: '14px' }} />
        <Button onClick={addOrder}>Hinzufügen</Button>
      </div>

      <div className="search-container" style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Auftragsnummer suchen ..." style={{ height: "14px", width: "200px" }} />
        {searchQuery && (
          <span onClick={clearSearch} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "18px", color: "#999" }}>
            ✖
          </span>
        )}
      </div>

      <div className="my-2">
        <Button className="bg-blue-500 p-2 rounded-full" onClick={toggleScannerVisibility}>
          <Camera size={24} color="white" />
        </Button>
      </div>

      {isScannerVisible && (
        <div id="qr-code-scanner" className="my-4"></div>
      )}

      <Button onClick={toggleOrdersVisibility} className="mb-4">
        {showOrders ? "Aufträge verbergen" : "Aufträge anzeigen"}
      </Button>

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
          <Progress value={(order.progress.filter(Boolean).length / steps.length) * 100} className={`${(order.progress.filter(Boolean).length / steps.length) * 100 === 100 ? "bg-green-500" : "bg-blue-500"} transition-all duration-300`} />
          <div className="flex flex-wrap gap-2 mt-2">
            {steps.map((step, index) => (
              <label key={index} className="flex items-center space-x-2">
                <Checkbox
                  checked={order.progress[index]}
                  onChange={() => toggleStep(order.id, index)}
                />
                <span className="text-xs">{step}</span>
              </label>
            ))}
          </div>

          <div className="my-2 flex justify-between">
            <Button onClick={() => updateRemark(order.id, prompt("Bemerkung eingeben:", order.remark) || "")}>Bemerkung</Button>
            <Button onClick={() => handleDeleteClick(order.id)} className="bg-red-500">
              Löschen
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
