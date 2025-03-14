import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import Checkbox from "../components/ui/checkbox";
import { Progress } from "../components/ui/progress";
import Button from "../components/ui/button";
import Input from "../components/ui/input";
import { X, CheckCircle } from "lucide-react";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import QrReader from "react-qr-reader"; // Importiere den QR-Reader

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

  useEffect(() => {
    async function fetchOrders() {
      try {
        const snapshot = await getDocs(collection(db, "orders"));
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);
      } catch (error) {
        console.error("Fehler beim Abrufen der Daten:", error);
      }
    }
    fetchOrders();
  }, []);

  const handleScan = async (data) => {
    if (data) {
      const orderId = data; // Angenommen, der QR-Code enthält die Auftrags-ID
      const orderDoc = doc(db, "orders", orderId);
      const orderSnapshot = await getDoc(orderDoc);

      if (orderSnapshot.exists()) {
        setScannedOrder({ id: orderSnapshot.id, ...orderSnapshot.data() });
      } else {
        console.log("Auftrag nicht gefunden");
      }
    }
  };

  const handleError = (err) => {
    console.error("Fehler beim Scannen des QR-Codes:", err);
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

  const filteredOrders = orders.filter(order => order.id.includes(searchQuery));
  const SORTED_ORDERS = [...filteredOrders].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return (
    <div className="p-4 grid gap-2 bg-green-600 min-h-screen">
      <h1 className="text-xl font-bold text-white">TIME4YOU - Produktionsstatus</h1>
      <h2 className="text-lg font-bold text-white">Aktuelle KW: {getCurrentCalendarWeek()}</h2>
      <div className="flex gap-1 mb-2">
        <Input value={newOrder} onChange={(e) => setNewOrder(e.target.value)} placeholder="Neue Auftragsnummer" />
        <Input value={newWeek} onChange={(e) => setNewWeek(e.target.value)} placeholder="Kalenderwoche" />
        <Button onClick={addOrder}>Hinzufügen</Button>
      </div>
      <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Auftragsnummer suchen" />
      
      {/* QR Code Scanner */}
      <div className="my-4">
        <QrReader delay={300} onScan={handleScan} onError={handleError} style={{ width: "100%" }} />
      </div>

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

      {SORTED_ORDERS.map((order) => (
        <Card key={order.id} className="p-2 relative">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">{order.id} (KW {order.week})</h2>
            {order.progress.every(step => step) ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <div className={`w-4 h-4 rounded-full ${getStatusColor(order)}`} />
            )}
          </div>
          <Progress value={(order.progress.filter(Boolean).length / steps.length) * 100} />
          <div className="flex flex-wrap gap-2 mt-2">
            {steps.map((step, index) => (
              <label key={index} className="flex items-center gap-1 text-xs">
                <Checkbox checked={order.progress[index]} onChange={() => toggleStep(order.id, index)} />
                {step}
              </label>
            ))}
          </div>
          <Input value={order.remark} onChange={(e) => updateRemark(order.id, e.target.value)} placeholder="Bemerkung" className="mt-2 text-xs" />
          <Button onClick={() => handleDeleteClick(order.id)} className="absolute bottom-2 right-2">
            <X size={16} />
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
