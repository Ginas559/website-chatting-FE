import { Button } from 'antd';

const SubmitButton = ({ loading, children, onClick, type = "primary", htmlType = 'button', disabled = false, className = "" }) => (
    <Button
        type={type}
        htmlType={htmlType}
        loading={loading}
        onClick={onClick}
        disabled={loading || disabled}
        className={`w-full h-11 text-base font-semibold rounded-lg shadow-md transition-all active:scale-95 ${className}`}
    >
        {children}
    </Button>
);

export default SubmitButton;