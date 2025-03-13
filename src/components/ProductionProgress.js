import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore"; 
import { db } from "../firebaseConfig";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

const steps = ["AB versendet", "im Druck", "Druck abgeschlossen", "fertig produziert", "Fakturiert"];

const getCurrentCalendarWeek = () => {
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now - new Date(now.getFullYear(), 0, 1)) / 86400000;
  return Math.ceil((past the dayOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const getStatusColor = (order) => {
  const currentWeek = getCurrentCalendarWeek();
  const diff = currentWeek - order.week;
  if (diff < -1) return "bg-green-500";
  if (diff === 0 || diff === -1) return "bg-green-500";
  return "bg-red-500";
};

export default function ProductionProgress() {
  const [orders, setOrders] = useState([]);
  const [newOrder, setNewOrder] = useState("");
  const [newWeek, setNewWeek] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const snapshot = await getDocs(collection(db, "orders"));
        const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);
      } catch (error) {
        console.error("Fehler beim Abrufen der Bestellungen:", error);
      }
    };
    fetchOrders();
  }, []);

  const addOrder = async () => {
    if (!newOrder || !newWeek) return;

    const newOrderData = {
      id: newOrder,
      week: Number(newWeek),
      progress: new Array(steps.length).fill(false),
      remark: ""
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), newOrderData);
      setOrders((prev) => [...prev, { ...newOrderData, id: docRef.id }]);
      setNewOrder("");
      setNewWeek("");
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Bestellung:", error);
    }
  };

  const toggleStep = async (orderId, index) => {
    try {
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          const newProgress = [...order.progress];
          if (index === 0 || newProgress[index - 1]) {
            newProgress[index] = !newProgress[index];
            const orderRef = doc(db, "orders", orderId);
            updateDoc(orderRef, { progress: newProgress })
              .then(() => console.log("Status aktualisiert!"))
              .catch(error => console.error("Fehler beim Aktualisieren des Status:", error));
          }
          return { ...order, progress: newProgress };
        }
        return order;
      })
    );
  };

  const deleteOrder = async (orderId) => {
    if (deletePassword !== "t4y") return;

    try {
      await deleteDoc(doc(db, "orders", orderId));
      setOrders(orders.filter(order => order.id !== orderId));
    } catch (error) {
      console.error("Fehler beim Löschen der Bestellung:", error);
    }
  };

  const updateRemark = async (orderId, remark) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { remark });
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, remark } : order))
      );
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Bemerkung:", error);
    }
  };

  const filteredOrders = orders.filter(order => order.id.includes(searchQuery));

  return (
    <div className="p-4 grid gap-4">
      <h1 className="text-2xl font-bold">TIME4YOU - Produktionsstatus</h1>
      <div className="flex gap-2">
        <Input value={newOrder} onChange={(e) => setNewOrder(e.target.value)} placeholder="Neue Auftragsnummer" />
        <Input type="number" value={newWeek} onChange={(e) => setNewWeek(e.target.value)} placeholder="Kalenderwoche" />
        <Button onClick={addOrder}>Hinzufügen</Button>
      </div>
      <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Suche Auftragsnummer" />
      {filteredOrders.map(order => (
        <Card key={order.id}>
          <div className="flex justify-between">
            <span>{order.id} - KW {order.week} {order.progress.every(Boolean) && "✅ Erledigt"}</span>
            <button onClick={() => deleteOrder(order.id)}><X /></button>
          </div>
          <Progress value={(order.progress.filter(Boolean).length / steps.length) * 100} />
          {steps.map((step, index) => (
            <label key={index}>
              <input
                type="checkbox"
                checked={order.progress[index]}
                onChange={() => toggleStep(order.id, index)}
              />
              {step}
            </label>
          ))}
          <Input value={order.remark} onChange={(e) => updateRemark(order.id, e.target.value)} placeholder="Bemerkungen hinzufügen" />
        </Card>
      );
    })}
  </div>
  );
}
