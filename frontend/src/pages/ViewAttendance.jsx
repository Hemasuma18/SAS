import { Fragment, useCallback, useEffect, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ViewAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    department: user?.department || '',
    subjectId: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/subjects'),
      api.get('/students/departments'),
    ]).then(([subRes, deptRes]) => {
      setAllSubjects(subRes.data);
      setDepartments(deptRes.data);
    }).catch(() => {});
  }, []);

  // When department changes, clear subject selection
  const setFilter = (key, value) => {
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === 'department' ? { subjectId: '' } : {}),
    }));
  };

  // Subjects scoped to selected department
  const visibleSubjects = filters.department
    ? allSubjects.filter((s) => s.department === filters.department)
    : allSubjects;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.department) params.department = filters.department;
      if (filters.subjectId) params.subjectId = filters.subjectId;
      const { data } = await api.get(`/attendance/date/${filters.date}`, { params });

      // Client-side department filter when no specific subject chosen
      const filtered = filters.department && !filters.subjectId
        ? data.filter((r) => {
            const subj = allSubjects.find((s) => s._id === (r.subjectId?._id || r.subjectId));
            return subj?.department === filters.department;
          })
        : data;

      setRecords(filtered);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [allSubjects, filters]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const presentCount = records.filter((r) => r.status === 'Present').length;
  const absentCount  = records.filter((r) => r.status === 'Absent').length;
  const groupBySubject = Boolean(filters.department) && !filters.subjectId;
  const subjectGroups = groupBySubject
    ? [...records.reduce((groups, record) => {
        const subjectId = record.subjectId?._id || record.subjectId;
        const subject = allSubjects.find((item) => item._id === subjectId) || record.subjectId;
        const group = groups.get(subjectId) || { subject, records: [], total: 0, present: 0, absent: 0 };
        group.records.push(record);
        group.total += 1;
        group[record.status === 'Present' ? 'present' : 'absent'] += 1;
        groups.set(subjectId, group);
        return groups;
      }, new Map()).values()]
    : [{ records }];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">View Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Browse attendance records by date, department and subject</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="label">Date</label>
            <input type="date" className="input" value={filters.date}
              onChange={(e) => setFilter('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Department</label>
            <select className="input" value={filters.department}
              onChange={(e) => setFilter('department', e.target.value)}>
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Subject</label>
            <select className="input" value={filters.subjectId}
              onChange={(e) => setFilter('subjectId', e.target.value)}>
              <option value="">All Subjects</option>
              {visibleSubjects.map((s) => (
                <option key={s._id} value={s._id}>{s.subjectName}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={fetchRecords} disabled={loading}>
            <MagnifyingGlassIcon className="w-4 h-4" /> {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {records.length > 0 && (
        groupBySubject ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {subjectGroups.map((group) => (
              <div className="card" key={`summary-${group.subject?._id}`}>
                <p className="font-semibold text-gray-800 mb-3">
                  {group.subject?.subjectName || 'Unknown Subject'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{group.total}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{group.present}</p>
                    <p className="text-sm text-gray-500">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{group.absent}</p>
                    <p className="text-sm text-gray-500">Absent</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="card text-center">
              <p className="text-2xl font-bold text-gray-800">{records.length}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              <p className="text-sm text-gray-500">Present</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-500">{absentCount}</p>
              <p className="text-sm text-gray-500">Absent</p>
            </div>
          </div>
        )
      )}

      {/* Table */}
      <div className="card p-0">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Roll Number</th>
                <th>Subject</th>
                <th>Department</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No records found for selected filters</td></tr>
              ) : subjectGroups.map((group) => (
                <Fragment key={groupBySubject ? `subject-${group.subject?._id}` : 'attendance-records'}>
                  {groupBySubject && (
                    <>
                      <tr>
                        <th colSpan={6} className="text-left bg-gray-50 text-gray-700">
                          {group.subject?.subjectName || 'Unknown Subject'}
                          {group.subject?.subjectCode && <span className="text-xs text-gray-400 ml-2">({group.subject.subjectCode})</span>}
                        </th>
                      </tr>
                      <tr className="bg-gray-50 text-sm">
                        <td colSpan={2}><strong>Total:</strong> {group.total}</td>
                        <td colSpan={2} className="text-green-600"><strong>Present:</strong> {group.present}</td>
                        <td colSpan={2} className="text-red-500"><strong>Absent:</strong> {group.absent}</td>
                      </tr>
                    </>
                  )}
                  {group.records.map((r) => {
                    const subj = allSubjects.find((s) => s._id === (r.subjectId?._id || r.subjectId));
                    return (
                      <tr key={r._id}>
                        <td className="font-medium text-gray-800">{r.studentId?.name}</td>
                        <td>{r.studentId?.rollNumber}</td>
                        <td>{r.subjectId?.subjectName} <span className="text-xs text-gray-400">({r.subjectId?.subjectCode})</span></td>
                        <td className="text-xs text-gray-500">{r.studentId?.department || subj?.department || '—'}</td>
                        <td>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td><span className={r.status === 'Present' ? 'badge-present' : 'badge-absent'}>{r.status}</span></td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
