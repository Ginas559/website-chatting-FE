import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="w-full border-t border-border-color bg-brand-bg py-12 text-brand-dark transition-all">
            <div className="mx-auto max-w-7xl px-6">
                
                {/* Upper grid */}
                <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
                    
                    {/* Column 1: Brand Info */}
                    <div className="flex flex-col items-start text-left">
                        <Link to="/" className="text-xl font-black text-brand-red mb-4">
                            SmartZone
                        </Link>
                        <p className="text-sm leading-6 text-brand-gray">
                            Hệ thống bán lẻ các sản phẩm công nghệ chính hãng hàng đầu Việt Nam. Chất lượng và dịch vụ tận tâm.
                        </p>
                    </div>

                    {/* Column 2: Customer Support */}
                    <div className="flex flex-col items-start text-left">
                        <h4 className="text-xs font-black uppercase tracking-wider text-brand-dark mb-4">
                            HỖ TRỢ KHÁCH HÀNG
                        </h4>
                        <ul className="space-y-2 text-sm">
                            {['Hệ thống cửa hàng', 'Trung tâm bảo hành', 'Mua hàng trả góp', 'Giao hàng & Thanh toán'].map((link) => (
                                <li key={link}>
                                    <a href="#" className="text-brand-gray transition duration-150 hover:text-brand-red">
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Policies */}
                    <div className="flex flex-col items-start text-left">
                        <h4 className="text-xs font-black uppercase tracking-wider text-brand-dark mb-4">
                            CHÍNH SÁCH
                        </h4>
                        <ul className="space-y-2 text-sm">
                            {['Chính sách bảo mật', 'Điều khoản dịch vụ', 'Chính sách đổi trả', 'Giải quyết khiếu nại'].map((link) => (
                                <li key={link}>
                                    <a href="#" className="text-brand-gray transition duration-150 hover:text-brand-red">
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Newsletter */}
                    <div className="flex flex-col items-start text-left">
                        <h4 className="text-xs font-black uppercase tracking-wider text-brand-dark mb-4">
                            BẢN TIN CÔNG NGHỆ
                        </h4>
                        <p className="text-sm leading-6 text-brand-gray mb-4">
                            Đăng ký nhận ưu đãi và thông tin mới nhất.
                        </p>
                        <form onSubmit={(e) => e.preventDefault()} className="flex w-full flex-col gap-2 sm:flex-row">
                            <input
                                type="email"
                                placeholder="Email của bạn"
                                className="w-full rounded-lg border border-border-color bg-white px-3 py-2 text-sm outline-none placeholder:text-brand-gray focus:border-brand-red"
                            />
                            <button
                                type="submit"
                                className="whitespace-nowrap rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-red-hover"
                            >
                                Đăng ký
                            </button>
                        </form>
                    </div>

                </div>

                {/* Separator */}
                <div className="my-8 w-full border-t border-border-color"></div>

                {/* Bottom section */}
                <div className="flex flex-col items-center justify-between gap-4 text-xs text-brand-gray sm:flex-row">
                    <p>© 2026 SmartZone Store. Tất cả quyền được bảo lưu.</p>
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Đối tác chính hãng
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Miễn phí giao hàng
                        </span>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default Footer;
