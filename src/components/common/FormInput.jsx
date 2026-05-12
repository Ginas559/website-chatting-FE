import React from 'react';
import { Input } from 'antd';

const FormInput = ({ label, error, type = "text", ...props }) => {
    const InputComponent = type === "password" ? Input.Password : Input;

    return (
        <div className="flex flex-col gap-1 w-full text-left">
            {label && <label className="text-sm font-semibold text-gray-600">{label}</label>}
            <InputComponent 
                type={type}
                {...props}
                status={error ? "error" : ""}
                className={`w-full px-4 py-2 rounded-lg border outline-none transition-all duration-300
                ${error ? "border-red-500 bg-red-50" : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"}`}
            />
            {error && <span className="text-xs text-red-500 italic mt-1">{error}</span>}
        </div>
    );
};

export default FormInput;