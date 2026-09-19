import { useState, useRef } from 'react';
import {
  ArrowUpTrayIcon, CheckCircleIcon, DocumentArrowDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';

const STEPS = ['Upload', 'Preview', 'Done'];

const ENTITY_LABELS = {
  faculty:   { label: 'Faculty',          color: 'text-blue-600',   bg: 'bg-blue-50' },
  subjects:  { label: 'Subjects',         color: 'text-purple-600', bg: 'bg-purple-50' },
  timetable: { label: 'Timetable Entries',color: 'text-amber-600',  bg: 'bg-amber-50' },
  students:  { label: 'Students',         color: 'text-green-600',  bg: 'bg-green-50' },
};

function EntityTab({ entity, data, active, onClick }) {
  const meta = ENTITY_LABELS[entity];
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap
        ${active ? `border-purple-600 ${meta.color}` : 'border-transparent text-gray-500 hover:text-gray-700'}`}
    >
      {meta.label} ({data.validCount})
    </button>
  );
}

function EntityPreviewTable({ entity, rows, type }) {
  if (rows.length === 0)
    return <p className="text-gray-400 text-sm text-center py-6">No {type} records</p>;

  const cols = {
    faculty:   ['name', 'email', 'role', 'department'],
    subjects:  ['subjectName', 'subjectCode', 'department', 'year', 'semester', 'teacherEmail'],
    timetable: ['day', 'hour', 'startTime', 'endTime', 'subjectCode', 'department', 'section', 'type', 'room'],
    students:  ['name', 'rollNumber', 'department', 'year', 'section', 'email'],
  }[entity];

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            {cols.map((c) => <th key={c}>{c}</th>)}
            {(type === 'duplicate' || type === 'invalid') && <th>Issue</th>}
            {type === 'valid' && entity === 'students' && <th>Status</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="text-gray-400">{i + 1}</td>
              {cols.map((c) => (
                <td key={c} className="text-xs">{r[c] ?? '—'}</td>
              ))}
              {(type === 'duplicate' || type === 'invalid') && (
                <td className="text-xs text-red-500">{(r._errors || []).join('; ')}</td>
              )}
              {type === 'valid' && entity === 'students' && (
                <td className="text-xs">
                  {r._alreadyExists ? <span className="text-blue-500 font-medium">Already Exists</span> : ''}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntitySection({ entity, data }) {
  const [tab, setTab] = useState('valid');
  const meta = ENTITY_LABELS[entity];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className={`px-4 py-3 flex items-center justify-between ${meta.bg}`}>
        <span className={`font-semibold text-sm ${meta.color}`}>{meta.label}</span>
        <div className="flex gap-4 text-xs">
          <span className="text-green-700 font-medium">{data.validCount} valid</span>
          {data.duplicateCount > 0 && <span className="text-amber-600 font-medium">{data.duplicateCount} duplicate</span>}
          {data.invalidCount > 0 && <span className="text-red-500 font-medium">{data.invalidCount} invalid</span>}
        </div>
      </div>
      <div className="flex border-b border-gray-200 bg-white">
        {[
          { key: 'valid',     label: `Valid (${data.validCount})` },
          { key: 'duplicate', label: `Duplicates (${data.duplicateCount})` },
          { key: 'invalid',   label: `Invalid (${data.invalidCount})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-all
              ${tab === key ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-3 bg-white">
        {tab === 'valid'     && <EntityPreviewTable entity={entity} rows={data.valid}      type="valid" />}
        {tab === 'duplicate' && <EntityPreviewTable entity={entity} rows={data.duplicates} type="duplicate" />}
        {tab === 'invalid'   && <EntityPreviewTable entity={entity} rows={data.invalid}    type="invalid" />}
      </div>
    </div>
  );
}

function downloadTemplate() {
  const XLSX = window._XLSX; // not available in browser — use CSV fallback
  // Provide a multi-sheet CSV hint instead
  const csv = [
    '=== Sheet: Faculty ===',
    'name,email,password,role,department',
    'Dr. John Smith,john.smith@college.edu,Pass@123,teacher,Mechanical Engineering',
    '',
    '=== Sheet: Subjects ===',
    'subjectName,subjectCode,department,year,semester,teacherEmail',
    'Engineering Mechanics,ME301,Mechanical Engineering,3,5,john.smith@college.edu',
    '',
    '=== Sheet: Timetable ===',
    'day,hour,startTime,endTime,subjectCode,department,section,type,room',
    'Monday,1,09:00,09:55,ME301,Mechanical Engineering,A,theory,101',
    '',
    '=== Sheet: Students ===',
    'name,rollNumber,department,year,section,email,phone',
    'Alice Kumar,23K65A0301,Mechanical Engineering,3,A,alice@college.edu,9876543210',
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'academic_import_template.txt';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AcademicImport() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setPreview(null); setResult(null); setStep(0); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setPreview(null); setResult(null); setStep(0); }
  };

  const handleParse = async () => {
    if (!file) return toast.error('Please select a file first');
    setParsing(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/import/academic/parse', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    const totalValid = ['faculty', 'subjects', 'timetable', 'students']
      .reduce((s, k) => s + (preview[k]?.validCount || 0), 0);
    if (totalValid === 0) return toast.error('No valid records to import');

    setConfirming(true);
    try {
      const { data } = await api.post('/import/academic/confirm', {
        faculty:   preview.faculty?.valid   || [],
        subjects:  preview.subjects?.valid  || [],
        timetable: preview.timetable?.valid || [],
        students:  preview.students?.valid  || [],
      });
      setResult(data);
      setStep(2);
      toast.success('Academic data imported successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setStep(0); setFile(null); setPreview(null); setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalValid = preview
    ? ['faculty', 'subjects', 'timetable', 'students'].reduce((s, k) => {
        if (k === 'students') {
          return s + (preview[k]?.valid?.filter((r) => !r._alreadyExists).length || 0);
        }
        return s + (preview[k]?.validCount || 0);
      }, 0)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Academic Data Import</h1>
          <p className="text-gray-500 text-sm mt-1">
            Import faculty, subjects, timetable and students for any department in one upload
          </p>
        </div>
        <button className="btn-secondary" onClick={downloadTemplate}>
          <DocumentArrowDownIcon className="w-4 h-4" /> Download Template
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step > i ? 'bg-green-500 text-white' : step === i ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > i ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium ${step === i ? 'text-purple-700' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* Format info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p className="font-semibold text-blue-800">Supported formats</p>
        <p><strong>Multi-sheet Excel (.xlsx):</strong> Name sheets "Faculty", "Subjects", "Timetable", "Students" — all 4 are optional.</p>
        <p><strong>Single-sheet CSV/Excel:</strong> Detected automatically from column headers.</p>
        <p><strong>PDF:</strong> Best-effort extraction — works when data is in a clear tabular layout.</p>
        <p className="text-blue-600 mt-1">Department is auto-detected from the data. Faculty passwords are required for new accounts.</p>
      </div>

      {/* ── STEP 0: Upload ── */}
      {step === 0 && (
        <div className="card space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-purple-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <ArrowUpTrayIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              {file ? file.name : 'Click or drag & drop a file here'}
            </p>
            <p className="text-gray-400 text-sm mt-1">Supports CSV, Excel (.xlsx/.xls), PDF — max 10 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <div className="flex items-center justify-between bg-purple-50 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium text-purple-800">{file.name}</p>
                <p className="text-xs text-purple-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button className="btn-primary" onClick={handleParse} disabled={parsing}>
                {parsing ? 'Parsing…' : 'Parse & Validate'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 1: Preview ── */}
      {step === 1 && preview && (
        <div className="space-y-4">
          {/* Department banner */}
          <div className="card flex items-center gap-3 py-3">
            {preview.department ? (
              <>
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Detected Department: <span className="text-purple-700">{preview.department}</span>
                  </p>
                  <p className="text-xs text-gray-500">All imported records will be associated with this department</p>
                </div>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700">Could not auto-detect department — ensure your data includes a "department" column</p>
              </>
            )}
          </div>

          {/* Summary counts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            {Object.entries(ENTITY_LABELS).map(([key, meta]) => (
              <div key={key} className="card text-center">
                <p className={`text-2xl font-bold ${meta.color}`}>{preview[key]?.validCount ?? 0}</p>
                <p className="text-sm text-gray-500">{meta.label}</p>
                {preview.missing?.[key] && (
                  <p className="text-xs text-gray-400 mt-1">Not in file</p>
                )}
              </div>
            ))}
          </div>

          {/* Missing data warnings */}
          {Object.entries(preview.missing || {}).some(([, v]) => v) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
              <p className="font-semibold">Missing data (not in uploaded file — will be skipped):</p>
              {preview.missing.faculty   && <p>• Faculty — teachers will not be created; subjects without a teacher cannot be imported</p>}
              {preview.missing.subjects  && <p>• Subjects — attendance marking requires subjects to be set up</p>}
              {preview.missing.timetable && <p>• Timetable — teachers will need to select subjects manually when marking attendance</p>}
              {preview.missing.students  && <p>• Students — no students will be imported</p>}
            </div>
          )}

          {/* Per-entity detail */}
          {Object.keys(ENTITY_LABELS).map((key) => (
            preview[key] && (preview[key].validCount + preview[key].duplicateCount + preview[key].invalidCount) > 0 && (
              <EntitySection key={key} entity={key} data={preview[key]} />
            )
          ))}

          {/* Action bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button className="btn-secondary" onClick={reset}>← Start Over</button>
            <div className="flex items-center gap-3">
              {totalValid === 0 ? (
                <p className="text-sm text-red-500 font-medium">No valid records to import</p>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    Will import <strong className="text-green-600">{totalValid}</strong> record{totalValid !== 1 ? 's' : ''} across all categories.
                  </p>
                  <button className="btn-primary" onClick={handleConfirm} disabled={confirming}>
                    <CheckCircleIcon className="w-4 h-4" />
                    {confirming ? 'Importing…' : `Confirm Import`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Done ── */}
      {step === 2 && result && (
        <div className="card text-center space-y-4 py-10">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800">{result.message}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', maxWidth: '480px', margin: '0 auto' }}>
            {Object.entries(ENTITY_LABELS).map(([key, meta]) => (
              <div key={key}>
                <p className={`text-2xl font-bold ${meta.color}`}>{result[key] ?? 0}</p>
                <p className="text-xs text-gray-500">{meta.label}</p>
              </div>
            ))}
          </div>
          {result.errors?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 text-left max-w-lg mx-auto">
              <p className="font-semibold mb-1">Warnings:</p>
              {result.errors.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}
          <button className="btn-primary mx-auto" onClick={reset}>Import Another File</button>
        </div>
      )}
    </div>
  );
}
