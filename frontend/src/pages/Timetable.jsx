import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PERIODS = [
  { hour: 1, label: '09:00–09:55' },
  { hour: 2, label: '09:55–10:50' },
  { hour: 3, label: '11:00–11:55' },
  { hour: 4, label: '11:55–12:50' },
  { hour: 5, label: '12:50–13:45' },
  { hour: 6, label: '13:45–14:40' },
  { hour: 7, label: '14:40–15:35' },
  { hour: 8, label: '15:35–16:30' },
];

const TYPE_STYLES = {
  theory:   'bg-blue-50 border-blue-200 text-blue-800',
  lab:      'bg-green-50 border-green-200 text-green-800',
  activity: 'bg-amber-50 border-amber-200 text-amber-800',
  free:     'bg-gray-50 border-gray-200 text-gray-400',
  break:    'bg-gray-50 border-gray-200 text-gray-400',
};

const TYPE_BADGE = {
  theory:   'bg-blue-100 text-blue-700',
  lab:      'bg-green-100 text-green-700',
  activity: 'bg-amber-100 text-amber-700',
  free:     'bg-gray-100 text-gray-500',
};

function SlotCell({ slot }) {
  if (!slot) return <td className="border border-gray-100 p-1"><div className="h-16" /></td>;
  const style = TYPE_STYLES[slot.type] || TYPE_STYLES.free;
  const badge = TYPE_BADGE[slot.type] || TYPE_BADGE.free;
  return (
    <td className="border border-gray-100 p-1 align-top">
      <div className={`rounded-lg border p-2 h-full min-h-16 ${style}`}>
        {slot.type === 'free' ? (
          <p className="text-xs text-center mt-3">{slot.note || '—'}</p>
        ) : (
          <>
            <p className="text-xs font-bold leading-tight truncate">
              {slot.subjectId?.subjectName || slot.note || slot.subjectCode}
            </p>
            <p className="text-xs opacity-70 truncate mt-0.5">
              {slot.facultyName?.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, '') || ''}
            </p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge}`}>{slot.type}</span>
              {slot.room && <span className="text-xs text-gray-500">#{slot.room}</span>}
            </div>
          </>
        )}
      </div>
    </td>
  );
}

export default function Timetable() {
  const [sections, setSections] = useState([]);
  const [selection, setSelection] = useState({ department: '', section: '' });
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS.includes(today) ? today : 'Monday';
  });
  const [view, setView] = useState('grid');

  // Load available sections on mount
  useEffect(() => {
    api.get('/timetable/sections')
      .then(({ data }) => {
        setSections(data);
        const first = data[0] || { department: '', section: '' };
        setSelection(first);
      })
      .catch(() => toast.error('Failed to load sections'))
      .finally(() => setLoading(false));
  }, []);

  // Load timetable whenever section changes
  useEffect(() => {
    if (!selection.section) return;
    api.get('/timetable/grouped', { params: selection })
      .then(({ data }) => setGrouped(data))
      .catch(() => toast.error('Failed to load timetable'));
  }, [selection]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Timetable</h1>
          <p className="text-gray-500 text-sm mt-1">
            {selection.department ? `${selection.department} · ` : ''}{selection.section || 'Select a section'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {sections.length > 1 && (
            <select
              className="input text-sm"
              value={`${selection.department}|${selection.section}`}
              onChange={(e) => {
                const [department, section] = e.target.value.split('|');
                setSelection({ department, section });
              }}
            >
              {sections.map((item) => (
                <option key={`${item.department}|${item.section}`} value={`${item.department}|${item.section}`}>
                  {item.department} — {item.section}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'grid' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}
            >
              Weekly Grid
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'day' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}
            >
              Day View
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_BADGE).map(([type, cls]) => (
          <span key={type} className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${cls}`}>{type}</span>
        ))}
      </div>

      {sections.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">No timetable data available. Import timetable data first.</div>
      ) : view === 'grid' ? (
        /* ── WEEKLY GRID ── */
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ minWidth: '700px' }}>
            <thead>
              <tr className="bg-purple-50">
                <th className="border border-gray-200 p-2 text-left text-xs font-semibold text-purple-700 w-24">Day / Period</th>
                {PERIODS.map((p) => (
                  <th key={p.hour} className="border border-gray-200 p-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap">
                    <div className="font-bold text-purple-700">P{p.hour}</div>
                    <div className="font-normal text-gray-500">{p.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day}>
                  <td className="border border-gray-200 p-2 font-semibold text-gray-700 bg-purple-50 text-xs whitespace-nowrap">
                    {day}
                  </td>
                  {PERIODS.map((p) => {
                    const slot = (grouped[day] || []).find((s) => s.hour === p.hour);
                    return <SlotCell key={p.hour} slot={slot} />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── DAY VIEW ── */
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeDay === day ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-purple-50'}`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {PERIODS.map((p) => {
              const slot = (grouped[activeDay] || []).find((s) => s.hour === p.hour);
              const style = slot ? (TYPE_STYLES[slot.type] || TYPE_STYLES.free) : 'bg-gray-50 border-gray-100 text-gray-400';
              const badge = slot ? (TYPE_BADGE[slot.type] || TYPE_BADGE.free) : '';
              return (
                <div key={p.hour} className={`card border flex items-start gap-4 py-3 px-4 ${style}`}>
                  <div className="text-center min-w-12">
                    <p className="text-lg font-bold text-purple-700">P{p.hour}</p>
                    <p className="text-xs text-gray-500 whitespace-nowrap">{p.label}</p>
                  </div>
                  <div className="flex-1">
                    {!slot || slot.type === 'free' ? (
                      <p className="text-sm text-gray-400">{slot?.note || 'No class'}</p>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-800">
                          {slot.subjectId?.subjectName || slot.note || slot.subjectCode}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">{slot.facultyName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${badge}`}>{slot.type}</span>
                          {slot.room && <span className="text-xs text-gray-400">Room: {slot.room}</span>}
                          {slot.note && <span className="text-xs text-gray-400">· {slot.note}</span>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
