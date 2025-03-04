import React from "react";

export function Progress({ value, max = 100, className = "" }) {
  const percentage = (value / max) * 100;
  console.log("Progress-Balken Wert:", value, "=>", percentage, "%"); // Debugging

  return (
    <div className={`w-full bg-gray-200 rounded-full h-4 ${className}`}>
      <div
        className="bg-blue-500 h-4 rounded-full transition-all duration-300"
        style={{ width: `${Math.max(1, percentage)}%` }} // Mindestens 1%, damit sichtbar
      ></div>
    </div>
  );
}
