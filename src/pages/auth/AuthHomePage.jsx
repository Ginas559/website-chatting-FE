import { Link } from "react-router-dom";

const AuthHomePage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Website Chatting
        </h1>

        <div className="mt-8 flex flex-col gap-4">
          <Link
            to="/login"
            className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
          >
            Đăng nhập
          </Link>
          <Link
            to="/register"
            className="block w-full rounded-lg border border-blue-600 bg-white px-4 py-3 text-center text-base font-semibold text-blue-600 shadow-sm transition-all hover:bg-blue-50 active:scale-95"
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthHomePage;
