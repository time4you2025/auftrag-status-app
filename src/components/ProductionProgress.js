import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import Checkbox from "../components/ui/checkbox";
import { Progress } from "../components/ui/progress";
import Button from "../components/ui/button";
import Input from "../components/ui/input";
import { X } from "lucide-react";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

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
  const [deletePassword, setDeletePassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(null);

  // 🔥 Daten aus Firestore abrufen und nach Auftragsnummer sortieren
  useEffect(() => {
    async function fetchOrders() {
      const snapshot = await getDocs(collection(db, "orders"));
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sortiere die Aufträge nach Auftragsnummer (id) in aufsteigender Reihenfolge
      const sortedOrders = ordersData.sort((a, b) => a.id.localeCompare(b.id));
      setOrders(sortedOrders);
    }
    fetchOrders();
  }, []);

  // 🔥 Neue Bestellung hinzufügen
  const addOrder = async () => {
    if (newOrder.trim() !== "" && newWeek.trim() !== "") {
      const newOrderData = {
        id: newOrder,
        week: parseInt(newWeek, 10),
        progress: Array(steps.length).fill(false),
        remark: ""
      };

      try {
        // Hinzufügen der neuen Bestellung
        await addDoc(collection(db, "orders"), newOrderData);
        
        // Nach dem Hinzufügen die Bestellungen neu abrufen und sortieren
        fetchOrders(); // Aufträge neu laden und sortieren
        setNewOrder("");
        setNewWeek("");
      } catch (error) {
        console.error("Fehler beim Speichern in Firestore:", error);
      }
    }
  };

  // 🔥 Status-Schritt aktualisieren
  const toggleStep = async (orderId, index) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          if (index === 0 || order.progress[index - 1]) {
            const updatedProgress = order.progress.map((step, i) => (i === index ? !step : step));
            updateDoc(doc(db, "orders", orderId), { progress: updatedProgress });
            return { ...order, progress: updatedProgress };
          }
        }
        return order;
      })
    );
  };

  // 🔥 Bemerkungen aktualisieren
  const updateRemark = async (orderId, remark) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, remark } : order))
    );
    await updateDoc(doc(db, "orders", orderId), { remark });
  };

  // 🔥 Auftrag löschen
  const deleteOrder = async (orderId) => {
    if (deletePassword === "t4y") {
      setOrders(orders.filter(order => order.id !== orderId));
      await deleteDoc(doc(db, "orders", orderId));
      setDeletePassword("");
      setShowPasswordInput(null);
    } else {
      alert("Falsches Passwort!");
    }
  };

  // 🔍 Filter für Suche
  const filteredOrders = orders.filter(order => order.id.includes(searchQuery));

  return (
    <div className="p-4 grid gap-2" style={{ backgroundColor: "#009933", minHeight: "100vh" }}>
      <h1 className="text-xl font-bold text-white">TIME4YOU - Produktionsstatus</h1>
      <h2 className="text-lg font-bold text-white">Aktuelle Kalenderwoche: KW {getCurrentCalendarWeek()}</h2>
      <div className="flex gap-1 mb-2">
        <Input value={newOrder} onChange={(e) => setNewOrder(e.target.value)} placeholder="Neue Auftragsnummer eingeben" />
        <Input value={newWeek} onChange={(e) => setNewWeek(e.target.value)} placeholder="Kalenderwoche eingeben" />
        <Button onClick={addOrder}>Hinzufügen</Button>
      </div>
      <div className="flex gap-1 mb-2">
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Nach Auftragsnummer suchen" />
      </div>
      {filteredOrders.map((order) => {
        const completedSteps = order.progress.filter(Boolean).length;
        return (
          <Card key={order.id} className="p-2 relative">
            <div className="absolute top-1 right-1">
              {showPasswordInput === order.id ? (
                <div className="flex gap-1">
                  <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Passwort" className="w-20 text-xs" />
                  <Button onClick={() => deleteOrder(order.id)} className="text-xs px-1">✔</Button>
                </div>
              ) : (
                <Button onClick={() => setShowPasswordInput(order.id)} variant="ghost" size="icon" className="text-xs p-1">
                  <X size={12} />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-3 h-3 rounded-full ${getStatusColor(order)}`} />
              <h2 className="text-sm font-bold">Auftrag: {order.id} (KW {order.week}) {order.progress.every(step => step) ? "✅ Erledigt" : ""}</h2>
            </div>
            <Progress value={(completedSteps / steps.length) * 100} className="mb-2" />
            <div className="flex gap-2">
              {steps.map((step, index) => (
                <label key={index} className="flex items-center gap-1 text-xs">
                  <Checkbox checked={order.progress[index]} onChange={() => toggleStep(order.id, index)} />
                  {step}
                </label>
              ))}
            </div>
            <Input
              value={order.remark}
              onChange={(e) => updateRemark(order.id, e.target.value)}
              placeholder="Bemerkungen hinzufügen"
              className="mt-2 text-xs"
            />
          </Card>
        );
      })}
    </div>
  );
}

