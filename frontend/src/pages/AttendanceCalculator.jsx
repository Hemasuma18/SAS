import { useEffect, useState } from 'react';
import { CalculatorIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';

function PctBadge({ pct, target }) {
  const color = pct >= target ? 'text-green-600' : pct >= target * 0.8 ? 'text-amber-600' : 'text-red-600';
  const bg    = pct >= target ? 'bg-green-50'   : pct >= target * 0.8 ? 'bg-amber-50'   : 'bg-red-50';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-bold ${color} ${bg}`}>
      {pct}%
    </span>
  );
}

function ProgressBar({ pct, target }) {
  const color = pct >= target ? '#22c55e' : pct >= target * 0.8 ? '#f59e0b' : '#ef4444';
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function SubjectCard({ row, target }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{row.subjectName}</p>
          <p className="text-xs text-gray-400">{row.subjectCode}</p>
        </div>
        <PctBadge pct={row.currentPct} target={target} />
      </div>

      <ProgressBar pct={row.currentPct} target={target} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }} className="text-center text-xs">
        <div>
          <p className="font-bold text-gray-800">{row.attended}</p>
          <p className="text-gray-400">Present</p>
        </div>
        <div>
          <p className="font-bold text-gray-800">{row.total - row.attended}</p>
          <p className="text-gray-400">Absent</p>
        </div>
        <div>
          <p className="font-bold text-gray-800">{row.total}</p>
          <p className="text-gray-400">Total</p>
        </div>
      </div>

      {row.isAboveTarget ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
          ✅ Above target — can miss <strong>{row.canMiss}</strong> more class{row.canMiss !== 1 ? 'es' : ''} and stay ≥ {target}%
        </div>
      ) : row.classesNeeded === null ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          ❌ Cannot reach {target}% — mathematically impossible with current absences
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          ⚠️ Need to attend next <strong>{row.classesNeeded}</strong> consecutive class{row.classesNeeded !== 1 ? 'es' : ''} to reach {target}%
        </div>
      )}

      {/* Projections */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Projections (if you attend all upcoming)</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem' }}>
          {row.projections.map((p) => (
            <div key={p.classes} className="text-center bg-gray-50 rounded p-1">
              <p className="text-xs font-bold text-purple-700">+{p.classes}</p>
              <p className={`text-xs font-semibold ${p.ifAttendAll >= target ? 'text-green-600' : 'text-red-500'}`}>
                {p.ifAttendAll}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AttendanceCalculator() {
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [target, setTarget] = useState(75);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    api.get('/students/departments').then(({ data }) => setDepartments(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!department) { setStudents([]); setStudentId(''); return; }
    setStudentsLoading(true);
    setStudentId('');
    setResult(null);
    const fetchStudents = async () => {
      try {
        const first = await api.get('/students', { params: { department, limit: 100, page: 1 } });
        const { students: firstPage, pages } = first.data;
        if (pages <= 1) { setStudents(firstPage); return; }
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            api.get('/students', { params: { department, limit: 100, page: i + 2 } })
          )
        );
        setStudents([...firstPage, ...rest.flatMap((r) => r.data.students)]);
      } catch {
        toast.error('Failed to load students');
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, [department]);

  const calculate = async () => {
    if (!studentId) return toast.error('Please select a student');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.get('/attendance/calculator', { params: { studentId, target } });
      setResult(data);
      if (data.bySubject.length === 0) toast('No attendance records found for this student', { icon: 'ℹ️' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const overall = result?.overall;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <CalculatorIcon className="w-7 h-7 text-purple-600" />
        <div>
          <h1 className="page-title">Attendance Calculator</h1>
          <p className="text-gray-500 text-sm mt-0.5">Calculate attendance status and projections per student</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="label">Department</label>
            <select
              className="input"
              value={department}
              onChange={(e) => { setDepartment(e.target.value); setResult(null); }}
            >
              <option value="">Select Department</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Student</label>
            <select
              className="input"
              value={studentId}
              onChange={(e) => { setStudentId(e.target.value); setResult(null); }}
              disabled={!department || studentsLoading}
            >
              <option value="">
                {!department ? 'Select department first' : studentsLoading ? 'Loading students…' : 'Select a student'}
              </option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.rollNumber} — {s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Target % (default 75)</label>
            <input
              type="number"
              className="input"
              min={1}
              max={100}
              value={target}
              onChange={(e) => { setTarget(Number(e.target.value)); setResult(null); }}
            />
          </div>
          <button className="btn-primary" onClick={calculate} disabled={loading || !studentId}>
            <MagnifyingGlassIcon className="w-4 h-4" />
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
      </div>

      {/* Overall summary */}
      {overall && (
        <div className="card">
          <h3 className="section-title mb-4">Overall Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }} className="text-center">
            <div>
              <p className="text-2xl font-bold text-gray-800">{overall.total}</p>
              <p className="text-sm text-gray-500">Total Classes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{overall.attended}</p>
              <p className="text-sm text-gray-500">Attended</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{overall.total - overall.attended}</p>
              <p className="text-sm text-gray-500">Absent</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${overall.currentPct >= target ? 'text-green-600' : 'text-red-500'}`}>
                {overall.currentPct}%
              </p>
              <p className="text-sm text-gray-500">Current %</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{target}%</p>
              <p className="text-sm text-gray-500">Target</p>
            </div>
          </div>

          <ProgressBar pct={overall.currentPct} target={target} />

          <div className="mt-4">
            {overall.total === 0 ? (
              <p className="text-sm text-gray-400 text-center">No attendance data available</p>
            ) : overall.isAboveTarget ? (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                ✅ <strong>Above target overall.</strong> Can miss <strong>{overall.canMiss}</strong> more class{overall.canMiss !== 1 ? 'es' : ''} across all subjects and stay ≥ {target}%
              </div>
            ) : overall.classesNeeded === null ? (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                ❌ <strong>Cannot reach {target}% overall</strong> — mathematically impossible with current absences
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                ⚠️ Need to attend next <strong>{overall.classesNeeded}</strong> consecutive class{overall.classesNeeded !== 1 ? 'es' : ''} overall to reach {target}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-subject breakdown */}
      {result?.bySubject?.length > 0 && (
        <div>
          <h3 className="section-title mb-3">By Subject</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {result.bySubject.map((row) => (
              <SubjectCard key={row.subjectId} row={row} target={target} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
