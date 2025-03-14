import { useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import Checkbox from "../components/ui/checkbox";
import { Progress } from "../components/ui/progress";
import Button from "../components/ui/button";
import Input from "../components/ui/input";
import { db } from "../firebaseConfig"; // Import für Firebase Firestore
import { collection, getDocs, doc, setDoc, updateDoc } from "firebase/firestore"; // Import der Firebase-Funktionen im modularen Ansatz

const steps = ["AB versendet", "im Druck", "Druck abgeschlossen", "fertig produziert", "Fakturiert"];

function getCurrentCalendarWeek() {
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDays = (now - firstDayOfYear) / 86400000;
  return Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
}

export default function ProductionProgress() {
  const [orders, setOrders] = useState([]);
  const [newOrder, setNewOrder] = useState("");
  const [newWeek, setNewWeek] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
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
        await setDoc(docRef, newOrderData); // Hier wird setDoc verwendet
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

  const filteredOrders = orders.filter(order => order.id.includes(searchQuery));

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
      {filteredOrders.map((order) => (
        <Card key={order.id} className="p-2 relative">
          <h2 className="text-sm font-bold">{order.id} (KW {order.week})</h2>
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
        </Card>
      ))}
    </div>
  );
}
