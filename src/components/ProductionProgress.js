import { useState, useEffect } from "react";
import {Card, CardContent } from "../components/ui/card";
import Checkbox from "../components/ui/checkbox";
import {Progress } from "../components/ui/progress";
import Button from "../components/ui/button";
import Input from "../components/ui/input";
import { X } from "lucide-react";

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
  const [orders, setOrders] = useState(() => {
    const savedOrders = localStorage.getItem("orders");
    return savedOrders ? JSON.parse(savedOrders) : [];
  });
  const [newOrder, setNewOrder] = useState("");
  const [newWeek, setNewWeek] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(null);

  useEffect(() => {
    localStorage.setItem("orders", JSON.stringify(orders));
  }, [orders]);

  const addOrder = () => {
    if (newOrder.trim() !== "" && newWeek.trim() !== "") {
      setOrders((prev) => [...prev, { id: newOrder, week: parseInt(newWeek, 10), progress: Array(steps.length).fill(false), remark: "" }]);
      setNewOrder("");
      setNewWeek("");
    }
  };

  const updateRemark = (orderId, remark) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, remark } : order))
    );
  };

  const deleteOrder = (orderId) => {
    if (deletePassword === "t4y") {
      setOrders(orders.filter(order => order.id !== orderId));
      setDeletePassword("");
      setShowPasswordInput(null);
    } else {
      alert("Falsches Passwort!");
    }
  };

  const toggleStep = (orderId, index) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          if (index === 0 || order.progress[index - 1]) {
            return {
              ...order,
              progress: order.progress.map((step, i) => (i === index ? !step : step))
            };
          }
        }
        return order;
      })
    );
  };

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
                  <Checkbox
                    checked={order.progress[index]}
                    onCheckedChange={() => toggleStep(order.id, index)}
                    disabled={index > 0 && !order.progress[index - 1]}
                  />
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
