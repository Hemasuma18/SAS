import { UserGroupIcon, CheckCircleIcon, XCircleIcon, ChartPieIcon } from '@heroicons/react/24/outline';

const cards = [
  { key: 'totalStudents', label: 'Total Students', icon: UserGroupIcon, color: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600' },
  { key: 'presentToday', label: 'Present Today', icon: CheckCircleIcon, color: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600' },
  { key: 'absentToday', label: 'Absent Today', icon: XCircleIcon, color: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600' },
  { key: 'overallPercentage', label: 'Attendance %', icon: ChartPieIcon, color: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', suffix: '%' },
];

export default function DashboardCards({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      {cards.map(({ key, label, icon: Icon, light, text, suffix }) => (
        <div key={key} className="card flex items-center gap-4">
          <div className={`${light} p-3 rounded-xl`}>
            <Icon className={`w-7 h-7 ${text}`} />
          </div>
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-800">
              {stats ? `${stats[key] ?? 0}${suffix || ''}` : '—'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
