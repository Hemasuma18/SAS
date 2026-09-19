import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardCards from '../components/DashboardCards';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#22c55e', '#ef4444'];

const PERIODS = [
  { hour: 1, label: '09:00' }, { hour: 2, label: '09:55' },
  { hour: 3, label: '11:00' }, { hour: 4, label: '11:55' },
  { hour: 5, label: '12:50' }, { hour: 6, label: '13:45' },
  { hour: 7, label: '14:40' }, { hour: 8, label: '15:35' },
];

const TYPE_COLORS = {
  theory:   'border-l-blue-500 bg-blue-50',
  lab:      'border-l-green-500 bg-green-50',
  activity: 'border-l-amber-500 bg-amber-50',
  free:     'border-l-gray-300 bg-gray-50',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [todaySlots, setTodaySlots] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState(user?.department || '');
  const [sections, setSections] = useState([]);
  const [selection, setSelection] = useState({ department: user?.department || '', section: '' });
  const [loading, setLoading] = useState(true);

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    api.get('/students/departments')
      .then(({ data }) => {
        setDepartments(data);
      })
      .catch(() => toast.error('Failed to load departments'));
  }, [department]);

  useEffect(() => {
    const init = async () => {
      try {
        const [statsRes, sectionsRes] = await Promise.all([
          api.get('/attendance/dashboard', { params: department ? { department } : {} }),
          api.get('/timetable/sections', { params: department ? { department } : {} }),
        ]);
        setStats(statsRes.data);
        const secs = sectionsRes.data.filter((item) => !department || item.department === department);
        setSections(secs);
        const first = secs[0] || { department: '', section: '' };
        setSelection(first);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [department]);

  useEffect(() => {
    if (!selection.section) { setTodaySlots([]); return; }
    api.get('/timetable/grouped', { params: selection })
      .then(({ data }) => setTodaySlots(data[todayName] || []))
      .catch(() => {});
  }, [selection, todayName]);

  const pieData = stats ? [
    { name: 'Present', value: stats.presentToday },
    { name: 'Absent',  value: stats.absentToday },
  ] : [];

  const lineData = stats?.monthlyData?.map((d) => ({
    month:   MONTHS[d._id.month - 1],
    Present: d.present,
    Absent:  d.total - d.present,
  })) || [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {user?.role === 'admin' && (
        <div className="card max-w-sm">
          <label className="label">Department</label>
          <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      )}

      <DashboardCards stats={stats} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Pie Chart */}
        <div className="card">
          <h3 className="section-title mb-4">Today's Attendance</h3>
          {pieData[0]?.value === 0 && pieData[1]?.value === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No attendance marked today</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line Chart */}
        <div className="card">
          <h3 className="section-title mb-4">Monthly Attendance Trend</h3>
          {lineData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No monthly data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Present" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Absent"  stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="section-title">
            Today&apos;s Schedule — {todayName}{user?.department ? ` · ${user.department}` : ''}
          </h3>
          {sections.length > 1 && (
            <select
              className="input max-w-xs text-sm"
              value={`${selection.department}|${selection.section}`}
              onChange={(e) => {
                const [selectedDepartment, selectedSection] = e.target.value.split('|');
                setSelection({ department: selectedDepartment, section: selectedSection });
              }}
            >
              {sections.map((item) => (
                <option key={`${item.department}|${item.section}`} value={`${item.department}|${item.section}`}>
                  {item.department} — {item.section}
                </option>
              ))}
            </select>
          )}
          {sections.length === 1 && (
            <span className="text-xs text-gray-400">{sections[0].department} — {sections[0].section}</span>
          )}
        </div>

        {todaySlots.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            {todayName === 'Sunday' ? 'No classes on Sunday' : selection.section ? 'No timetable data for today' : 'No timetable data available'}
          </p>
        ) : (
          <div className="space-y-2">
            {PERIODS.map((p) => {
              const slot = todaySlots.find((s) => s.hour === p.hour);
              if (!slot) return null;
              const colorClass = TYPE_COLORS[slot.type] || TYPE_COLORS.free;
              return (
                <div key={p.hour} className={`flex items-center gap-4 p-3 rounded-lg border-l-4 ${colorClass}`}>
                  <div className="text-center w-14 flex-shrink-0">
                    <p className="text-xs font-bold text-purple-700">P{p.hour}</p>
                    <p className="text-xs text-gray-500">{p.label}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    {slot.type === 'free' ? (
                      <p className="text-sm text-gray-400">{slot.note || 'Free Period'}</p>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {slot.subjectId?.subjectName || slot.note || slot.subjectCode}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{slot.facultyName}</p>
                      </>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize
                    ${slot.type === 'theory' ? 'bg-blue-100 text-blue-700' :
                      slot.type === 'lab' ? 'bg-green-100 text-green-700' :
                      slot.type === 'activity' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'}`}>
                    {slot.type}
                  </span>
                  {slot.room && (
                    <span className="text-xs text-gray-400 flex-shrink-0">#{slot.room}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
