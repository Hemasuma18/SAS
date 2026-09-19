import { useState, useRef } from 'react';
import {
  ArrowUpTrayIcon, CheckCircleIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';
import AcademicImport from './AcademicImport';

const STEPS = ['Upload', 'Preview', 'Done'];

function PreviewTable({ rows, type }) {
  if (rows.length === 0) return null;
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Roll Number</th>
            <th>Department</th>
            <th>Year</th>
            <th>Section</th>
            <th>Email</th>
            <th>Phone</th>
            {(type === 'duplicate' || type === 'invalid') && <th>Issue</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="text-gray-400">{i + 1}</td>
              <td className="font-medium text-gray-800">{r.name || '—'}</td>
              <td>{r.rollNumber || '—'}</td>
              <td className="text-xs">{r.department || '—'}</td>
              <td>{r.year || '—'}</td>
              <td>{r.section || '—'}</td>
              <td className="text-xs text-gray-500">{r.email || '—'}</td>
              <td className="text-xs text-gray-500">{r.phone || '—'}</td>
              {(type === 'duplicate' || type === 'invalid') && (
                <td className="text-xs text-red-500">{(r._errors || []).join('; ')}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentImportTab() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('valid');
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
      const { data } = await api.post('/import/parse', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
      setActiveTab(data.validCount > 0 ? 'valid' : data.duplicateCount > 0 ? 'duplicate' : 'invalid');
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview?.valid?.length) return toast.error('No valid records to import');
    setConfirming(true);
    try {
      const { data } = await api.post('/import/confirm', { records: preview.valid });
      setResult(data);
      setStep(2);
      toast.success(data.message);
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

  const downloadTemplate = () => {
    const csv = 'name,rollNumber,department,year,section,email,phone\nJohn Doe,23K61A0601,Computer Science,3,A,john@college.edu,9876543210';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'student_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Student Data Import</h2>
          <p className="text-gray-500 text-sm mt-1">Upload CSV, Excel, or PDF to bulk-import students</p>
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

      {/* STEP 0: Upload */}
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

          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-600">Required columns (any order, case-insensitive):</p>
            <p>name, rollNumber (or "roll number" / "roll no"), department, year, section</p>
            <p className="font-medium text-gray-600 mt-2">Optional columns:</p>
            <p>email, phone</p>
          </div>
        </div>
      )}

      {/* STEP 1: Preview */}
      {step === 1 && preview && (
        <div className="space-y-4">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <div className="card text-center">
              <p className="text-2xl font-bold text-gray-800">{preview.total}</p>
              <p className="text-sm text-gray-500">Total Rows</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-600">{preview.validCount}</p>
              <p className="text-sm text-gray-500">Ready to Import</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-amber-500">{preview.duplicateCount}</p>
              <p className="text-sm text-gray-500">Duplicates</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-500">{preview.invalidCount}</p>
              <p className="text-sm text-gray-500">Invalid</p>
            </div>
          </div>

          <div className="card p-0">
            <div className="flex border-b border-gray-200">
              {[
                { key: 'valid',     label: `Valid (${preview.validCount})`,          color: 'text-green-600' },
                { key: 'duplicate', label: `Duplicates (${preview.duplicateCount})`, color: 'text-amber-600' },
                { key: 'invalid',   label: `Invalid (${preview.invalidCount})`,      color: 'text-red-500' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-all
                    ${activeTab === key ? `border-purple-600 ${color}` : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {activeTab === 'valid'     && (preview.valid.length     > 0 ? <PreviewTable rows={preview.valid}      type="valid"      /> : <p className="text-gray-400 text-sm text-center py-6">No valid records</p>)}
              {activeTab === 'duplicate' && (preview.duplicates.length > 0 ? <PreviewTable rows={preview.duplicates} type="duplicate"  /> : <p className="text-gray-400 text-sm text-center py-6">No duplicates</p>)}
              {activeTab === 'invalid'   && (preview.invalid.length    > 0 ? <PreviewTable rows={preview.invalid}    type="invalid"    /> : <p className="text-gray-400 text-sm text-center py-6">No invalid records</p>)}
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <button className="btn-secondary" onClick={reset}>← Start Over</button>
            <div className="flex items-center gap-3">
              {preview.validCount === 0 ? (
                <p className="text-sm text-red-500 font-medium">No valid records to import</p>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    Will import <strong className="text-green-600">{preview.validCount}</strong> student{preview.validCount !== 1 ? 's' : ''}.
                    {preview.duplicateCount > 0 && ` ${preview.duplicateCount} duplicate${preview.duplicateCount !== 1 ? 's' : ''} will be skipped.`}
                    {preview.invalidCount > 0 && ` ${preview.invalidCount} invalid row${preview.invalidCount !== 1 ? 's' : ''} will be skipped.`}
                  </p>
                  <button className="btn-primary" onClick={handleConfirm} disabled={confirming}>
                    <CheckCircleIcon className="w-4 h-4" />
                    {confirming ? 'Importing…' : `Confirm Import (${preview.validCount})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Done */}
      {step === 2 && result && (
        <div className="card text-center space-y-4 py-10">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800">{result.message}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
            <div>
              <p className="text-2xl font-bold text-green-600">{result.inserted}</p>
              <p className="text-xs text-gray-500">Inserted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{result.skippedDuplicates ?? 0}</p>
              <p className="text-xs text-gray-500">Duplicates Skipped</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{result.skippedInvalid ?? 0}</p>
              <p className="text-xs text-gray-500">Invalid Skipped</p>
            </div>
          </div>
          <button className="btn-primary mx-auto" onClick={reset}>Import Another File</button>
        </div>
      )}
    </div>
  );
}

export default function StudentImport() {
  const [importMode, setImportMode] = useState('students');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Data Import</h1>
        <p className="text-gray-500 text-sm mt-1">Bulk-import students or full academic department data</p>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setImportMode('students')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all
            ${importMode === 'students' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Student Import
        </button>
        <button
          onClick={() => setImportMode('academic')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all
            ${importMode === 'academic' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Academic Data Import
        </button>
      </div>

      {importMode === 'students' && <StudentImportTab />}
      {importMode === 'academic' && <AcademicImport />}
    </div>
  );
}
