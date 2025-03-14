import React from "react";

export function Card({ children, className, order, steps }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h2 className="text-sm font-bold">{order.id} (KW {order.week})</h2>
      <div className={`progress-bar ${className}`}>
        <div
          className="progress"
          style={{ width: `${(order.progress.filter(Boolean).length / steps.length) * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <div className={`status-indicator ${className}`}></div>
        <div className="text-xs mt-2">Aktueller Status:</div>
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            {order.progress[index] && (
              <div className="text-green-500">{step}</div>
            )}
            {!order.progress[index] && (
              <div className="text-gray-400">{step}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardContent({ children }) {
  return <div className="p-2">{children}</div>;
}
