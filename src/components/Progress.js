import React from "react";

const Progress = ({ value, max = 100 }) => {
    return (
        <div className="w-full bg-gray-300 rounded h-4">
            <div
                className="bg-green-500 h-4 rounded"
                style={{ width: `${(value / max) * 100}%` }}
            ></div>
        </div>
    );
};

export default Progress;
