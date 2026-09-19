import { useEffect, useState, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import api from '../services/api';
import toast from 'react-hot-toast';

const YEARS = [1, 2, 3, 4];

function StudentForm({ defaultValues, onSubmit, loading, departments }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm({ defaultValues });
  const selectedDepartment = useWatch({ control, name: 'department', defaultValue: defaultValues?.department || '' });
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (!selectedDepartment) return undefined;
    api.get('/students/sections', { params: { department: selectedDepartment } })
      .then(({ data }) => setSections(data))
      .catch(() => setSections([]));
    return undefined;
  }, [selectedDepartment]);
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2">
          <label className="label">Full Name</label>
          <input className="input" {...register('name', { required: 'Required' })} />
          {errors.name && <p className="error-text">{errors.name.message}</p>}
        </div>
        <div className="form-group">
          <label className="label">Roll Number</label>
          <input className="input" {...register('rollNumber', { required: 'Required' })} />
          {errors.rollNumber && <p className="error-text">{errors.rollNumber.message}</p>}
        </div>
        <div className="form-group">
          <label className="label">Email</label>
          <input type="email" className="input" {...register('email')} />
        </div>
        <div className="form-group">
          <label className="label">Department</label>
          <select className="input" {...register('department', { required: 'Required' })}>
            <option value="">Select</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
          {errors.department && <p className="error-text">{errors.department.message}</p>}
        </div>
        <div className="form-group">
          <label className="label">Year</label>
          <select className="input" {...register('year', { required: 'Required', valueAsNumber: true })}>
            <option value="">Select</option>
            {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>
          {errors.year && <p className="error-text">{errors.year.message}</p>}
        </div>
        <div className="form-group">
          <label className="label">Section</label>
          <select className="input" {...register('section', { required: 'Required' })}>
            <option value="">Select</option>
            {(selectedDepartment ? sections : []).map((section) => <option key={section}>{section}</option>)}
          </select>
          {errors.section && <p className="error-text">{errors.section.message}</p>}
        </div>
        <div className="form-group">
          <label className="label">Phone</label>
          <input className="input" {...register('phone')} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Student'}
        </button>
      </div>
    </form>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ department: '', year: '', section: '' });
  const [modal, setModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);

  useEffect(() => {
    api.get('/students/departments').then(({ data }) => setDepartments(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.department) { setSectionOptions([]); return; }
    api.get('/students/sections', { params: { department: filters.department } })
      .then(({ data }) => setSectionOptions(data))
      .catch(() => setSectionOptions([]));
  }, [filters.department]);

  const fetchStudents = useCallback(async () => {
    try {
      const params = { page, limit: 15, search, ...filters };
      const { data } = await api.get('/students', { params });
      setStudents(data.students);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error('Failed to load students');
    }
  }, [page, search, filters]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleAdd = async (data) => {
    setLoading(true);
    try {
      await api.post('/students', data);
      toast.success('Student added');
      setModal(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally { setLoading(false); }
  };

  const handleEdit = async (data) => {
    setLoading(true);
    try {
      await api.put(`/students/${editTarget._id}`, data);
      toast.success('Student updated');
      setModal(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/students/${deleteTarget._id}`);
      toast.success('Student deleted');
      setDeleteTarget(null);
      fetchStudents();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{total} students total</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>
          <PlusIcon className="w-4 h-4" /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search name or roll..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="input" value={filters.department} onChange={(e) => { setFilters(f => ({ ...f, department: e.target.value, section: '' })); setPage(1); }}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className="input" value={filters.year} onChange={(e) => { setFilters(f => ({ ...f, year: e.target.value })); setPage(1); }}>
            <option value="">All Years</option>
            {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select className="input" value={filters.section} disabled={!filters.department} onChange={(e) => { setFilters(f => ({ ...f, section: e.target.value })); setPage(1); }}>
            <option value="">All Sections</option>
            {sectionOptions.map((section) => <option key={section}>{section}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Roll No.</th>
                <th>Department</th>
                <th>Year</th>
                <th>Section</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No students found</td></tr>
              ) : students.map((s) => (
                <tr key={s._id}>
                  <td className="font-medium text-gray-800">{s.name}</td>
                  <td>{s.rollNumber}</td>
                  <td>{s.department}</td>
                  <td>Year {s.year}</td>
                  <td>{s.section}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-purple-50 text-purple-600" onClick={() => { setEditTarget(s); setModal('edit'); }}>
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-500" onClick={() => setDeleteTarget(s)}>
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4">
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      </div>

      {modal === 'add' && (
        <Modal title="Add Student" onClose={() => setModal(null)}>
          <StudentForm onSubmit={handleAdd} loading={loading} departments={departments} />
        </Modal>
      )}
      {modal === 'edit' && editTarget && (
        <Modal title="Edit Student" onClose={() => setModal(null)}>
          <StudentForm defaultValues={editTarget} onSubmit={handleEdit} loading={loading} departments={departments} />
        </Modal>
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete student "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
