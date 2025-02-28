import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const steps = ["AB versendet", "im Druck", "Druck abgeschlossen", "fertig produziert", "Fakturiert"];
const GOOGLE_SHEETS_API = "https://script.google.com/macros/s/AKfycbxr5rTt1OnW82hZq0alBuhPnor62tuxFSoTwoeSpbwffaVuRZ5MLNegPv6yQp4IBBLvRQ/exec";

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
    fetch(GOOGLE_SHEETS_API)
      .then(response => response.json())
      .then(data => setOrders(data))
      .catch(error => console.error("Fehler beim Laden der Daten", error));
  }, []);

  const addOrder = async () => {
    if (newOrder.trim() && newWeek.trim()) {
      const newEntry = { id: newOrder, week: parseInt(newWeek, 10), progress: Array(steps.length).fill(false) };
      setOrders(prev => [...prev, newEntry]);
      setNewOrder("");
      setNewWeek("");
      await fetch(GOOGLE_SHEETS_API, { method: "POST", body: JSON.stringify(newEntry) });
    }
  };

  return (
    <div className="p-4">
      <h1>TIME4YOU - Produktionsstatus</h1>
      <div>
        <Input value={newOrder} onChange={(e) => setNewOrder(e.target.value)} placeholder="Auftragsnummer" />
        <Input value={newWeek} onChange={(e) => setNewWeek(e.target.value)} placeholder="KW" />
        <Button onClick={addOrder}>Hinzufügen</Button>
      </div>
      <div>
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Suche" />
      </div>
      {orders.map(order => (
        <Card key={order.id}>
          <CardContent>
            <h2>{order.id} (KW {order.week})</h2>
            <Progress value={(order.progress.filter(Boolean).length / steps.length) * 100} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
