import React from 'react';
import { Button } from 'antd';

const SubmitButton = ({ loading, children, onClick, type = "primary", className = "" }) => (
    <Button
        type={type}
        loading={loading}
        onClick={onClick}
        disabled={loading}
        className={`w-full h-11 text-base font-semibold rounded-lg shadow-md transition-all active:scale-95 ${className}`}
    >
        {children}
    </Button>
);

export default SubmitButton;