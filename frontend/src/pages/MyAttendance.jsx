import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const statCards = [
  { key: 'present', label: 'Present', color: 'text-green-600' },
  { key: 'absent', label: 'Absent', color: 'text-red-500' },
  { key: 'totalClasses', label: 'Total Classes', color: 'text-gray-800' },
  { key: 'attendancePercentage', label: 'Attendance Percentage', color: 'text-purple-700', suffix: '%' },
];

export default function MyAttendance() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attendance/my')
      .then(({ data }) => setSummary(data))
      .catch((error) => toast.error(error.response?.data?.message || 'Failed to load attendance'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">
          {summary.student.name} <span className="text-gray-400">· {summary.student.rollNumber}</span>
        </p>
      </div>

      {summary.belowThreshold && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Attendance is below 75%.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        {statCards.map((card) => (
          <div className="card" key={card.key}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>
              {summary[card.key]}{card.suffix || ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}