import React from 'react';
import { Input } from 'antd';

const CustomInput = ({ label, name, type = "text", placeholder, value, onChange, error }) => {
  return (
    <div className="flex flex-col gap-1 mb-4 text-left w-full">
      {label && <label className="text-sm font-semibold text-gray-600">{label}</label>}

      {type === "password" ? (
        <Input.Password 
          name={name}
          placeholder={placeholder}
          status={error ? "error" : ""}
          value={value}
          onChange={onChange}
          className="py-2"
        />
      ) : (
        <Input 
          type={type}
          name={name}
          placeholder={placeholder}
          status={error ? "error" : ""}
          value={value}
          onChange={onChange}
          className="py-2"
        />
      )}

      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};

export default CustomInput;