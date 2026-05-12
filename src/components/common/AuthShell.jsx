import { Link } from 'react-router-dom';

const AuthShell = ({ title, subtitle, icon, children, footer }) => {
    return (
        <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center relative overflow-hidden font-[Inter,sans-serif]">
            <div className="fixed w-[600px] h-[600px] rounded-full blur-[80px] opacity-60 pointer-events-none -top-50 -right-38 bg-[radial-gradient(circle,#e0e7ff_0%,transparent_70%)] animate-[float1_15s_ease-in-out_infinite]" />
            <div className="fixed w-[500px] h-[500px] rounded-full blur-[80px] opacity-60 pointer-events-none -bottom-38 -left-25 bg-[radial-gradient(circle,#dbeafe_0%,transparent_70%)] animate-[float2_12s_ease-in-out_infinite]" />

            <div className="relative z-10 w-full max-w-[420px] px-4">
                <Link to="/" className="mb-4 inline-flex text-sm font-medium text-slate-500 hover:text-indigo-500 hover:underline">
                    ← Trang chủ
                </Link>
                <div className="bg-white rounded-3xl p-11 shadow-[0_20px_40px_rgba(148,163,184,0.15),0_1px_3px_rgba(0,0,0,0.05)] border border-slate-100 animate-[cardIn_0.5s_ease-out]">
                    <div className="text-center mb-9">
                        <div className="w-17 h-17 rounded-[20px] bg-gradient-to-br from-indigo-500 to-blue-500 inline-flex items-center justify-center mb-4 shadow-[0_10px_25px_rgba(99,102,241,0.3)]">
                            {icon}
                        </div>
                        <h2 className="text-slate-900 font-bold text-2xl mb-1.5">{title}</h2>
                        <p className="text-slate-500 text-sm">{subtitle}</p>
                    </div>

                    {children}
                    {footer}
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