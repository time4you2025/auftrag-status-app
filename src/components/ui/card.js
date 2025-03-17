import React from "react";

export function Card({ children, className, statusColor }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className} relative`}
    style={{height: '150px'}}
    >
      {/* Status Punkt */}
      <div
        className={`w-4 h-4 rounded-full absolute top-2 left-2 ${statusColor} z-10`}
      ></div>
      {children}
    </div> 
  );
}

export function CardContent({ children }) {
  return <div className="p-2">{children}</div>;
}
