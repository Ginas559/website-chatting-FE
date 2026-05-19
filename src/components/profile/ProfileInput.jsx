const ProfileInput = ({ label, error, multiline = false, className = '', ...props }) => {
    const baseClassName = `w-full rounded-2xl border bg-white px-4 py-3 text-left text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
        error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
    } ${className}`;

    return (
        <label className="block text-left">
            {label ? <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span> : null}
            {multiline ? (
                <textarea className={baseClassName} rows={props.rows || 4} {...props} />
            ) : (
                <input className={baseClassName} {...props} />
            )}
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </label>
    );
};

export default ProfileInput;