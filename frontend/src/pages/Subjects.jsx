import { useEffect, useState, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../services/api';
import toast from 'react-hot-toast';

const YEARS = [1, 2, 3, 4];

function SubjectForm({ defaultValues, onSubmit, loading, teachers, departments }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: defaultValues ? { ...defaultValues, teacherId: defaultValues.teacherId?._id || defaultValues.teacherId } : {},
  });
  const selectedDepartment = useWatch({ control, name: 'department', defaultValue: defaultValues?.department || '' });
  const departmentTeachers = teachers.filter((teacher) => !selectedDepartment || teacher.department === selectedDepartment);
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2">
          <label className="label">Subject Name</label>
          <input className="input" {...register('subjectName', { required: 'Required' })} />
          {errors.subjectName && <p className="error-text">{errors.subjectName.message}</p>}
        </div>
        <div className="form-group">
          <label className="label">Subject Code</label>
          <input className="input" placeholder="e.g. CS301" {...register('subjectCode', { required: 'Required' })} />
          {errors.subjectCode && <p className="error-text">{errors.subjectCode.message}</p>}
        </div>
        <div className="form-group">
          <label className="label">Semester</label>
          <input type="number" className="input" min={1} max={8} {...register('semester', { valueAsNumber: true })} />
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
        <div className="form-group col-span-2">
          <label className="label">Assigned Teacher</label>
          <select className="input" {...register('teacherId', { required: 'Required' })}>
            <option value="">Select Teacher</option>
            {departmentTeachers.map((teacher) => <option key={teacher._id} value={teacher._id}>{teacher.name}</option>)}
          </select>
          {errors.teacherId && <p className="error-text">{errors.teacherId.message}</p>}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Subject'}
        </button>
      </div>
    </form>
  );
}

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [modal, setModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [subRes, teachRes, deptRes] = await Promise.all([
        api.get('/subjects', { params: departmentFilter ? { department: departmentFilter } : {} }),
        api.get('/auth/users', { params: { role: 'teacher' } }),
        api.get('/students/departments'),
      ]);
      setSubjects(subRes.data);
      setTeachers(teachRes.data);
      setDepartments(deptRes.data);
    } catch { toast.error('Failed to load data'); }
  }, [departmentFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (data) => {
    setLoading(true);
    try {
      await api.post('/subjects', data);
      toast.success('Subject created');
      setModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create subject');
    } finally { setLoading(false); }
  };

  const handleEdit = async (data) => {
    setLoading(true);
    try {
      await api.put(`/subjects/${editTarget._id}`, data);
      toast.success('Subject updated');
      setModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/subjects/${deleteTarget._id}`);
      toast.success('Subject deleted');
      setDeleteTarget(null);
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="text-gray-500 text-sm mt-1">{subjects.length} subjects total</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>
          <PlusIcon className="w-4 h-4" /> Add Subject
        </button>
      </div>

      <div className="card py-3 max-w-sm">
        <label className="label">Department</label>
        <select className="input" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((department) => <option key={department} value={department}>{department}</option>)}
        </select>
      </div>

      <div className="card p-0">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Code</th>
                <th>Department</th>
                <th>Year</th>
                <th>Teacher</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No subjects found</td></tr>
              ) : Object.entries(subjects.reduce((groups, subject) => {
                (groups[subject.department] ||= []).push(subject);
                return groups;
              }, {})).map(([department, departmentSubjects]) => (
                [
                  <tr key={`department-${department}`}><th colSpan={6} className="text-left bg-gray-50 text-gray-700">{department}</th></tr>,
                  ...departmentSubjects.map((s) => (
                    <tr key={s._id}>
                      <td className="font-medium text-gray-800">{s.subjectName}</td>
                      <td><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{s.subjectCode}</span></td>
                      <td>{s.department}</td>
                      <td>Year {s.year}</td>
                      <td>{s.teacherId?.name || '—'}</td>
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
                  )),
                ]
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'add' && (
        <Modal title="Add Subject" onClose={() => setModal(null)}>
          <SubjectForm onSubmit={handleAdd} loading={loading} teachers={teachers} departments={departments} />
        </Modal>
      )}
      {modal === 'edit' && editTarget && (
        <Modal title="Edit Subject" onClose={() => setModal(null)}>
          <SubjectForm defaultValues={editTarget} onSubmit={handleEdit} loading={loading} teachers={teachers} departments={departments} />
        </Modal>
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete subject "${deleteTarget.subjectName}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
