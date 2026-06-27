import { Link } from 'react-router-dom';

const AuthShell = ({ title, subtitle, icon, children, footer }) => {
    return (
        <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(183,20,35,0.06),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(26,28,28,0.08),_transparent_30%),linear-gradient(135deg,#fcfcfc_0%,#f5f5f5_50%,#fcfcfc_100%)] px-4 py-10 text-slate-900 flex flex-col justify-center items-center">
            <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-red/5 blur-3xl animate-[float1_15s_ease-in-out_infinite]" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-brand-dark/5 blur-3xl animate-[float2_12s_ease-in-out_infinite]" />

            <div className="relative z-10 w-full max-w-[460px] animate-[cardIn_0.6s_cubic-bezier(0.16,1,0.3,1)]">
                <Link to="/" className="mb-5 inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-500 shadow-sm transition hover:border-brand-red/30 hover:text-brand-red hover:shadow-md">
                    <span>&larr;</span>
                    Trang chủ
                </Link>

                <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
                    {/* Top gradient highlight strip */}
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-red via-rose-500 to-amber-500" />
                    
                    <div className="text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-red to-red-600 shadow-md">
                            {icon}
                        </div>
                        <h2 className="mt-5 text-xl font-black tracking-tight text-slate-900 font-sans">{title}</h2>
                        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">{subtitle}</p>
                    </div>

                    <div className="mt-6 space-y-4">
                        {children}
                    </div>

                    {footer ? <div className="mt-6">{footer}</div> : null}
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