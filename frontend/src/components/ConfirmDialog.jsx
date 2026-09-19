import Modal from './Modal';

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirm Action" onClose={onCancel}>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </Modal>
  );
}
