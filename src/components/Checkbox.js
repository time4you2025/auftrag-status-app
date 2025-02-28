import React from "react";

const Checkbox = ({ checked, onChange, label }) => {
    return (
        <label className="flex items-center space-x-2">
            <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4" />
            <span>{label}</span>
        </label>
    );
};

export default Checkbox;
