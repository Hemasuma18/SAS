import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon, UserGroupIcon, BookOpenIcon,
  ClipboardDocumentCheckIcon, ChartBarIcon,
  DocumentChartBarIcon, UsersIcon, TableCellsIcon, CalculatorIcon, ArrowUpTrayIcon, AcademicCapIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/my-attendance',    label: 'My Attendance',   icon: AcademicCapIcon,                roles: ['student'] },
  { to: '/',                label: 'Dashboard',      icon: HomeIcon,                      roles: ['admin', 'teacher', 'hod', 'student_cr'] },
  { to: '/timetable',       label: 'Timetable',      icon: TableCellsIcon,                roles: ['admin', 'teacher', 'hod', 'student_cr'] },
  { to: '/students',        label: 'Students',       icon: UserGroupIcon,                 roles: ['admin', 'hod'] },
  { to: '/subjects',        label: 'Subjects',       icon: BookOpenIcon,                  roles: ['admin', 'hod'] },
  { to: '/teachers',        label: 'Teachers',       icon: UsersIcon,                     roles: ['admin'] },
  { to: '/attendance/take', label: 'Take Attendance',icon: ClipboardDocumentCheckIcon,    roles: ['teacher', 'admin', 'student_cr'] },
  { to: '/attendance/view',       label: 'View Attendance',    icon: ChartBarIcon,                  roles: ['admin', 'teacher', 'hod', 'student_cr'] },
  { to: '/attendance/calculator', label: 'Att. Calculator',    icon: CalculatorIcon,                roles: ['admin', 'teacher', 'hod', 'student_cr'] },
  { to: '/reports',         label: 'Reports',        icon: DocumentChartBarIcon,          roles: ['admin', 'teacher', 'hod'] },
  { to: '/import',          label: 'Data Import',    icon: ArrowUpTrayIcon,               roles: ['admin'] },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 z-50 lg:static lg:z-auto
        bg-gradient-to-b from-purple-900 to-purple-800
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-purple-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">AttendEase</h1>
              <p className="text-purple-300 text-xs">Smart Attendance</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.roles.includes(user?.role))
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-purple-700">
          <p className="text-purple-300 text-xs">Logged in as</p>
          <p className="text-white text-sm font-medium truncate">{user?.name}</p>
          <span className="inline-block mt-1 text-xs bg-purple-700 text-purple-200 px-2 py-0.5 rounded-full capitalize">
            {user?.role === 'student_cr' ? 'Class Representative' : user?.role}
          </span>
        </div>
      </aside>
    </>
  );
}
