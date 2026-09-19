import { useState, useEffect } from 'react';
import { DocumentArrowDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const YEARS = [1, 2, 3, 4];

function getPercentageColor(pct) {
  if (pct >= 75) return 'text-green-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default function Reports() {
  const { user } = useAuth();
  const [report, setReport] = useState([]);
  const [filters, setFilters] = useState({ department: user?.department || '', year: '', month: new Date().toISOString().slice(0, 7) });
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/students/departments').then(({ data }) => setDepartments(data)).catch(() => {});
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/report', { params: filters });
      setReport(data);
      if (data.length === 0) toast('No data found for selected filters', { icon: 'ℹ️' });
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (report.length === 0) return toast.error('No data to export');
    const headers = ['Name', 'Roll Number', 'Department', 'Year', 'Section', 'Total Classes', 'Present', 'Absent', 'Attendance %'];
    const rows = report.map((r) => [
      r.studentName, r.rollNumber, r.department, r.year, r.section,
      r.totalClasses, r.presentCount, r.totalClasses - r.presentCount, r.attendancePercentage,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${filters.month || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const avgPercentage = report.length > 0
    ? Math.round(report.reduce((sum, r) => sum + r.attendancePercentage, 0) / report.length)
    : 0;

  const below75 = report.filter((r) => r.attendancePercentage < 75).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Attendance Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Generate and export attendance reports</p>
        </div>
        <button className="btn-secondary" onClick={exportCSV}>
          <DocumentArrowDownIcon className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="label">Month</label>
            <input type="month" className="input" value={filters.month} onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Department</label>
            <select className="input" value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}>
              <option value="">{user?.department ? user.department : 'All Departments'}</option>
              {departments.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Year</label>
            <select className="input" value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}>
              <option value="">All Years</option>
              {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={fetchReport} disabled={loading}>
            <MagnifyingGlassIcon className="w-4 h-4" /> {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {report.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div className="card text-center">
            <p className="text-2xl font-bold text-gray-800">{report.length}</p>
            <p className="text-sm text-gray-500">Total Students</p>
          </div>
          <div className="card text-center">
            <p className={`text-2xl font-bold ${getPercentageColor(avgPercentage)}`}>{avgPercentage}%</p>
            <p className="text-sm text-gray-500">Avg Attendance</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-red-600">{below75}</p>
            <p className="text-sm text-gray-500">Below 75%</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Roll No.</th>
                <th>Dept</th>
                <th>Year</th>
                <th>Section</th>
                <th>Total</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Generating report...</td></tr>
              ) : report.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Generate a report using the filters above</td></tr>
              ) : report.map((r) => (
                <tr key={r._id}>
                  <td className="font-medium text-gray-800">{r.studentName}</td>
                  <td>{r.rollNumber}</td>
                  <td className="text-xs">{r.department}</td>
                  <td>Y{r.year}</td>
                  <td>{r.section}</td>
                  <td>{r.totalClasses}</td>
                  <td className="text-green-600 font-medium">{r.presentCount}</td>
                  <td className="text-red-500 font-medium">{r.totalClasses - r.presentCount}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-12">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${r.attendancePercentage}%`,
                            backgroundColor: r.attendancePercentage >= 75 ? '#22c55e' : r.attendancePercentage >= 50 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${getPercentageColor(r.attendancePercentage)}`}>
                        {r.attendancePercentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
