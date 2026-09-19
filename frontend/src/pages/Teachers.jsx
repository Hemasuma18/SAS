import { useEffect, useState, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROLE_COLORS = {
  admin:      'bg-purple-100 text-purple-700',
  teacher:    'bg-blue-100 text-blue-700',
  hod:        'bg-amber-100 text-amber-700',
  student_cr: 'bg-green-100 text-green-700',
};

const ROLE_LABELS = {
  admin: 'Admin', teacher: 'Teacher', hod: 'HOD', student_cr: 'Class Rep',
};

function UserForm({ defaultValues, onSubmit, loading, isEdit, departments = [] }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm({ defaultValues });
  const selectedRole = useWatch({ control, name: 'role', defaultValue: defaultValues?.role || 'teacher' });
  const isCR = selectedRole === 'student_cr';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2">
          <label className="label">Full Name</label>
          <input className="input" {...register('name', { required: 'Required' })} />
          {errors.name && <p className="error-text">{errors.name.message}</p>}
        </div>

        {/* Email — required for non-CR, optional for CR */}
        {!isCR && (
          <div className="form-group col-span-2">
            <label className="label">Email</label>
            <input type="email" className="input" {...register('email', { required: isCR ? false : 'Required' })} />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>
        )}

        {/* Roll number — only for CR */}
        {isCR && (
          <div className="form-group col-span-2">
            <label className="label">Roll Number</label>
            <input className="input" placeholder="e.g. 23K61A0606" {...register('rollNumber', { required: 'Required for CR' })} />
            {errors.rollNumber && <p className="error-text">{errors.rollNumber.message}</p>}
          </div>
        )}

        {!isEdit && (
          <div className="form-group col-span-2">
            <label className="label">Password</label>
            <input
              type="password" className="input"
              placeholder={isCR ? 'e.g. CR@0606' : 'Min 6 characters'}
              {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })}
            />
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>
        )}

        <div className="form-group">
          <label className="label">Role</label>
          <select className="input" {...register('role', { required: 'Required' })}>
            <option value="teacher">Teacher</option>
            <option value="hod">HOD</option>
            <option value="admin">Admin</option>
            <option value="student_cr">Class Representative</option>
          </select>
        </div>

        <div className="form-group">
          <label className="label">Department</label>
          <select className="input" {...register('department')}>
            <option value="">Select</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update' : 'Add User'}
        </button>
      </div>
    </form>
  );
}

export default function Teachers() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/students/departments').then(({ data }) => setDepartments(data)).catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (deptFilter) params.department = deptFilter;
      const { data } = await api.get('/auth/users', { params });
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
  }, [roleFilter, deptFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAdd = async (data) => {
    setLoading(true);
    try {
      await api.post('/auth/register', data);
      toast.success('User added');
      setModal(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add user');
    } finally { setLoading(false); }
  };

  const handleEdit = async (data) => {
    setLoading(true);
    try {
      await api.put(`/auth/users/${editTarget._id}`, data);
      toast.success('User updated');
      setModal(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/auth/users/${deleteTarget._id}`);
      toast.success('User deleted');
      setDeleteTarget(null);
      fetchUsers();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Teachers & Staff</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} users</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>
          <PlusIcon className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card py-3 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[['', 'All'], ['teacher', 'Teachers'], ['hod', 'HOD'], ['admin', 'Admin'], ['student_cr', 'Class Reps']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRoleFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${roleFilter === val ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {departments.length > 1 && (
          <select className="input max-w-xs" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      <div className="card p-0">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email / Roll No.</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No users found</td></tr>
              ) : Object.entries(users.reduce((groups, user) => {
                const department = user.department || 'Unassigned';
                (groups[department] ||= []).push(user);
                return groups;
              }, {})).map(([department, departmentUsers]) => (
                [
                  <tr key={`department-${department}`}><th colSpan={6} className="text-left bg-gray-50 text-gray-700">{department}</th></tr>,
                  ...departmentUsers.map((u) => (
                    <tr key={u._id}>
                      <td className="font-medium text-gray-800">{u.name}</td>
                      <td className="text-gray-500 text-xs">
                        {u.email || '—'}
                        {u.rollNumber && <span className="ml-1 font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{u.rollNumber}</span>}
                      </td>
                      <td><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                      <td>{u.department || '—'}</td>
                      <td><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="p-1.5 rounded hover:bg-purple-50 text-purple-600" onClick={() => { setEditTarget(u); setModal('edit'); }}><PencilIcon className="w-4 h-4" /></button>
                          <button className="p-1.5 rounded hover:bg-red-50 text-red-500" onClick={() => setDeleteTarget(u)}><TrashIcon className="w-4 h-4" /></button>
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
        <Modal title="Add User" onClose={() => setModal(null)}>
          <UserForm onSubmit={handleAdd} loading={loading} isEdit={false} departments={departments} />
        </Modal>
      )}
      {modal === 'edit' && editTarget && (
        <Modal title="Edit User" onClose={() => setModal(null)}>
          <UserForm defaultValues={editTarget} onSubmit={handleEdit} loading={loading} isEdit={true} departments={departments} />
        </Modal>
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete user "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
