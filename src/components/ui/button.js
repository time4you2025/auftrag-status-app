import React from "react";

const Button = ({ children, onClick, className = "" }) => {
    return (
        <button onClick={onClick} className={`px-3 py-1 bg-blue-500 text-white rounded text-sm h-10 ${className}`}>
            {children}
        </button>
    );
};

export default Button;
