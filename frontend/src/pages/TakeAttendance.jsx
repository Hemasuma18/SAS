import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

// Safely extract string ID from either a populated object or a plain string
const toId = (val) => (val && typeof val === 'object' ? val._id : val);

function getCurrentHour() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const slots = [
    { hour: 1, start: 9*60,     end: 9*60+55  },
    { hour: 2, start: 9*60+55,  end: 10*60+50 },
    { hour: 3, start: 11*60,    end: 11*60+55 },
    { hour: 4, start: 11*60+55, end: 12*60+50 },
    { hour: 5, start: 12*60+50, end: 13*60+45 },
    { hour: 6, start: 13*60+45, end: 14*60+40 },
    { hour: 7, start: 14*60+40, end: 15*60+35 },
    { hour: 8, start: 15*60+35, end: 16*60+30 },
  ];
  return slots.find((s) => mins >= s.start && mins < s.end)?.hour || null;
}

export default function TakeAttendance() {
  const { user } = useAuth();
  const isCR = user?.role === 'student_cr';

  const [subjects, setSubjects]           = useState([]);
  const [todaySlots, setTodaySlots]       = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [date, setDate]                   = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents]           = useState([]);
  const [attendance, setAttendance]       = useState({});
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [step, setStep]                   = useState(1);

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [subRes, ttRes] = await Promise.all([
          api.get('/subjects'),
          api.get('/timetable/grouped'),
        ]);

        const allSubjects = subRes.data;
        setSubjects(allSubjects);

        // Today's theory/lab slots from timetable (all sections returned)
        const slots = (ttRes.data[todayName] || []).filter(
          (s) => s.type === 'theory' || s.type === 'lab'
        );

        // For teacher/CR: only show slots whose subject is in their subject list
        const visibleSlots = slots.filter((slot) => {
          const slotSubjectId = toId(slot.subjectId);
          return allSubjects.some((s) => s._id === slotSubjectId);
        });

        setTodaySlots(visibleSlots);

        // Auto-select current period's subject
        const currentHour = getCurrentHour();
        if (currentHour) {
          const currentSlot = visibleSlots.find((s) => s.hour === currentHour);
          if (currentSlot?.subjectId) {
            const slotSubjectId = toId(currentSlot.subjectId);
            const match = allSubjects.find((s) => s._id === slotSubjectId);
            if (match) setSelectedSubject(match._id);
          }
        }
      } catch (err) {
        console.error('TakeAttendance init error:', err);
        toast.error('Failed to load data');
      }
    };
    fetchInit();
  }, []);

  const loadStudents = async () => {
    if (!selectedSubject || !date) return toast.error('Select subject and date');
    setLoadingStudents(true);
    try {
      const { data: check } = await api.get('/attendance/check', {
        params: { subjectId: selectedSubject, date },
      });
      if (check.marked) {
        setAlreadyMarked(true);
        setStep(2);
        return;
      }
      setAlreadyMarked(false);

      const subject = subjects.find((s) => s._id === selectedSubject);
      if (!subject) return toast.error('Subject not found');

      const { data } = await api.get('/students', {
        params: { department: subject.department, year: subject.year, limit: 200 },
      });
      setStudents(data.students);
      const init = {};
      data.students.forEach((s) => { init[s._id] = 'Present'; });
      setAttendance(init);
      setStep(2);
    } catch (err) {
      console.error('Load students error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStatus = (id) =>
    setAttendance((prev) => ({ ...prev, [id]: prev[id] === 'Present' ? 'Absent' : 'Present' }));

  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => { updated[s._id] = status; });
    setAttendance(updated);
  };

  const saveAttendance = async () => {
    if (students.length === 0) return toast.error('No students to mark');
    setSaving(true);
    try {
      const records = students.map((s) => ({
        studentId: s._id,
        status: attendance[s._id] || 'Absent',
      }));
      await api.post('/attendance/mark', { subjectId: selectedSubject, date, records });
      toast.success('Attendance saved successfully!');
      setStep(1);
      setStudents([]);
      setAttendance({});
      setSelectedSubject('');
    } catch (err) {
      console.error('Save attendance error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter((v) => v === 'Present').length;
  const absentCount  = Object.values(attendance).filter((v) => v === 'Absent').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Take Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isCR ? 'Marking as Class Representative' : `Marking as ${user?.name}`}
        </p>
      </div>

      {/* Today's quick-select */}
      {todaySlots.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDaysIcon className="w-4 h-4 text-purple-600" />
            <p className="text-sm font-medium text-gray-700">
              Today's Classes — {todayName}
              {isCR && <span className="ml-2 text-xs text-purple-500">(Full timetable)</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {todaySlots.map((slot) => {
              const slotSubjectId = toId(slot.subjectId);
              const subjectObj = subjects.find((s) => s._id === slotSubjectId);
              if (!subjectObj) return null;
              const isSelected = selectedSubject === subjectObj._id;
              return (
                <button
                  key={slot._id}
                  onClick={() => { setSelectedSubject(subjectObj._id); setStep(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-400 hover:text-purple-600'
                  }`}
                >
                  P{slot.hour} · {subjectObj.subjectName}
                  {slot.type === 'lab' && <span className="ml-1 opacity-60">(Lab)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1 */}
      <div className="card">
        <h3 className="section-title mb-4">Step 1: Select Subject & Date</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="label">Subject</label>
            <select
              className="input"
              value={selectedSubject}
              onChange={(e) => { setSelectedSubject(e.target.value); setStep(1); }}
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.subjectName} ({s.subjectCode})
                  {isCR && s.teacherId?.name ? ` — ${s.teacherId.name}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Date</label>
            <input
              type="date" className="input" value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => { setDate(e.target.value); setStep(1); }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="btn-primary w-full"
              onClick={loadStudents}
              disabled={loadingStudents || !selectedSubject}
            >
              {loadingStudents ? 'Loading...' : 'Load Students'}
            </button>
          </div>
        </div>
      </div>

      {/* Already marked */}
      {step === 2 && alreadyMarked && (
        <div className="card border border-amber-200 bg-amber-50">
          <p className="text-amber-700 font-medium">⚠️ Attendance already marked for this subject on this date.</p>
          <p className="text-amber-600 text-sm mt-1">View it in the View Attendance section.</p>
        </div>
      )}

      {/* Step 2: Mark */}
      {step === 2 && !alreadyMarked && students.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="section-title">Step 2: Mark Attendance</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {students.length} students &nbsp;·&nbsp;
                <span className="text-green-600 font-medium">{presentCount} Present</span> &nbsp;·&nbsp;
                <span className="text-red-500 font-medium">{absentCount} Absent</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-sm" onClick={() => markAll('Present')}>
                <CheckCircleIcon className="w-4 h-4 text-green-500" /> Mark All Present
              </button>
              <button className="btn-secondary text-sm" onClick={() => markAll('Absent')}>
                <XCircleIcon className="w-4 h-4 text-red-500" /> Mark All Absent
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Status</th>
                  <th>Toggle</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const isPresent = attendance[s._id] === 'Present';
                  return (
                    <tr key={s._id}>
                      <td className="text-gray-400">{i + 1}</td>
                      <td className="font-medium text-gray-800">{s.name}</td>
                      <td>{s.rollNumber}</td>
                      <td>
                        <span className={isPresent ? 'badge-present' : 'badge-absent'}>
                          {attendance[s._id]}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => toggleStatus(s._id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isPresent ? 'bg-green-500' : 'bg-red-400'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isPresent ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button className="btn-primary px-8" onClick={saveAttendance} disabled={saving}>
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
