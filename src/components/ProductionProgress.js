import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import Checkbox from "../components/ui/checkbox";
import Input from "../components/ui/input";
import Button from "../components/ui/button";
import { X } from "lucide-react";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const steps = [
  "AB erhalten",
  "In Produktion",
  "Qualitätskontrolle",
  "Fertig produziert",
  "Fakturiert",
];

function getCurrentCalendarWeek() {
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getStatusColor(order) {
  const currentWeek = getCurrentCalendarWeek();
  const diff = currentWeek - order.week;
  if (order.progress.every((step) => step)) return "bg-green-500";
  if (diff < -1) return "bg-green-500";
  if (diff === -1) return "bg-yellow-500";
  return "bg-red-500";
}

export default function ProductionProgress() {
  const [orders, setOrders] = useState([]);
  const [newOrder, setNewOrder] = useState("");
  const [newWeek, setNewWeek] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(null);

  // Fetch orders from Firestore
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);
      } catch (error) {
        console.error("Fehler beim Laden der Aufträge:", error);
      }
    };
    fetchOrders();
  }, []);

  // Auftrag hinzufügen
  const addOrderHandler = async () => {
    if (!newOrder || !newWeek) return;

    try {
      const docRef = await addDoc(collection(db, "orders"), {
        id: newOrder,
        week: parseInt(newWeek, 10),
        progress: Array(steps.length).fill(false),
        remark: ""
      });

      setOrders(prev => [...prev, { id: docRef.id, week: parseInt(newWeek, 10), progress: Array(steps.length).fill(false) }]);
      setNewOrder("");
      setNewWeek("");
  };

  // Status-Schritt aktualisieren
  const toggleStep = async (orderId, index) => {
    try {
      setOrders((prev) =>
        prev.map(order => {
          if (order.id === orderId) {
            const updatedProgress = order.progress.map((step, i) => i === index ? !step : step);
            updateDoc(doc(db, "orders", orderId), { progress: updatedProgress });
            return { ...order, progress: updatedProgress };
          })
      );
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Schrittes:", error);
    }
  };

  // Auftrag löschen
  const deleteOrder = async (orderId) => {
    if (deletePassword !== "secret") return;
    try {
      await deleteDoc(doc(db, "orders", orderId));
      setOrders((prev) => prev.filter(order => order.id !== orderId));
      setDeletePassword("");
      setShowPasswordInput(null);
    } catch (error) {
      console.error("Fehler beim Löschen des Auftrags:", error);
    }
  };

  return (
    <div className="p-4 grid gap-4" style={{ backgroundColor: "#009933", minHeight: "100vh" }}>
      <h2 className="text-lg font-bold text-white">Kalenderwoche: KW {getCurrentCalendarWeek()}</h2>
      <div className="flex gap-2">
        <Input value={newOrder} onChange={(e) => setNewOrder(e.target.value)} placeholder="Neue Auftragsnummer" />
        <Input value={newWeek} onChange={(e) => setNewWeek(e.target.value)} placeholder="KW" />
        <Button onClick={addOrderHandler}>Hinzufügen</Button>
      </div>
      <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Suche Auftrag" />
      {orders.filter(order => order.id.includes(searchQuery)).map((order) => (
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
            <h2 className="text-sm font-bold">{order.id} (KW {order.week}) {order.progress.every(step => step) ? "✅ Erledigt" : ""}</h2>
          </div>
          <Progress value={(order.progress.filter(Boolean).length / steps.length) * 100} className="mb-2" />
          <div className="flex gap-2">
            {steps.map((step, index) => (
              <label key={index} className="flex items-center gap-1 text-xs">
                <Checkbox checked={order.progress[index]} onChange={() => toggleStep(order.id, index)} />
                {step}
              </label>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

