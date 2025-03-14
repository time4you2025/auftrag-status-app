import React from "react";

export function Card({ children, className, statusColor }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      {/* Status Punkt */}
      <div
        className={`w-3 h-3 rounded-full absolute top-2 right-2 ${statusColor}`}
      ></div>
      {children}
    </div>
  );
}

export function CardContent({ children }) {
  return <div className="p-2">{children}</div>;
}
