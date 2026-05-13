const ProfileForm = ({ title, description, onSubmit, children, footer }) => {
    return (
        <form
            onSubmit={onSubmit}
            className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
        >
            <div className="mb-6">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
                {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
            </div>

            {children}

            {footer ? <div className="mt-6">{footer}</div> : null}
        </form>
    );
};

export default ProfileForm;