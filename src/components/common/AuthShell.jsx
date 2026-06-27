import { Link } from 'react-router-dom';

const AuthShell = ({ title, subtitle, icon, children, footer }) => {
    return (
        <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(183,20,35,0.06),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(26,28,28,0.08),_transparent_30%),linear-gradient(135deg,#fcfcfc_0%,#f5f5f5_50%,#fcfcfc_100%)] px-4 py-10 text-slate-900">
            <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-red/5 blur-3xl animate-[float1_15s_ease-in-out_infinite]" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-brand-dark/5 blur-3xl animate-[float2_12s_ease-in-out_infinite]" />

            <div className="relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-[460px] flex-col justify-center">
                <Link to="/" className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-brand-red/30 hover:text-brand-red hover:shadow-md">
                    <span aria-hidden="true">←</span>
                    Trang chủ
                </Link>

                <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-10">
                    <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-red to-red-500 shadow-[0_20px_40px_rgba(183,20,35,0.18)]">
                            {icon}
                        </div>
                        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">{title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
                    </div>

                    <div className="mt-8 space-y-4">
                        {children}
                    </div>

                    {footer ? <div className="mt-8">{footer}</div> : null}
                </div>
            </div>

            <style>{`
                @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-50px,50px)} }
                @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(50px,-50px)} }
                @keyframes cardIn { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
            `}</style>
        </div>
    );
};

export default AuthShell;