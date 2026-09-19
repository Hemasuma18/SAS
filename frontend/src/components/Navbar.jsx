import { useAuth } from '../context/AuthContext';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <button onClick={onMenuToggle} className="lg:hidden p-1 rounded-md hover:bg-gray-100">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="hidden lg:block">
        <p className="text-sm text-gray-500">
          Welcome back, <span className="font-semibold text-gray-800">{user?.name}</span>
        </p>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="w-8 h-8" />
        <div className="flex items-center gap-2">
          <UserCircleIcon className="w-8 h-8 text-purple-600" />
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role === 'student_cr' ? 'Class Representative' : user?.role}
            </p>
          </div>
        </div>
        <button onClick={logout} className="btn-secondary text-xs px-3 py-1.5">
          Logout
        </button>
      </div>
    </header>
  );
}
