const SubmitButton = ({
    loading,
    children,
    onClick,
    htmlType = 'button',
    disabled = false,
    className = '',
}) => (
    <button
        type={htmlType}
        onClick={onClick}
        disabled={loading || disabled}
        className={`inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand-red to-red-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${className}`}
    >
        {loading ? (
            <span className="inline-flex items-center gap-2">
                <span className="h-[18px] w-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Đang xử lý...
            </span>
        ) : (
            children
        )}
    </button>
);

export default SubmitButton;