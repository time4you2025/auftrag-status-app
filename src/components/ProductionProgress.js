import { useState, useEffect } from "react";
import { Checkbox } from "../components/ui/checkbox";
import { Card, CardContent } from "../components/ui/Card";
import { Progress } from "../components/ui/progress";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { X } from "lucide-react";

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
    fetch("/.netlify/functions/getOrders")
      .then((res) => res.json())
      .then((data) => setOrders(data));
  }, []);

  const addOrder = () => {
    if (newOrder.trim() !== "" && newWeek.trim() !== "") {
      fetch("/.netlify/functions/addOrder", {
        method: "POST",
        body: JSON.stringify({ id: newOrder, week: newWeek }),
      }).then(() => {
        setOrders([...orders, { id: newOrder, week: newWeek, progress: [] }]);
        setNewOrder("");
        setNewWeek("");
      });
    }
  };

  return (
    <div className="p-4 grid gap-2">
      <h1 className="text-xl font-bold">Produktionsstatus</h1>
      <div className="flex gap-1 mb-2">
        <Input value={newOrder} onChange={(e) => setNewOrder(e.target.value)} placeholder="Auftragsnummer" />
        <Input value={newWeek} onChange={(e) => setNewWeek(e.target.value)} placeholder="KW" />
        <Button onClick={addOrder}>Hinzufügen</Button>
      </div>
    </div>
  );
}
