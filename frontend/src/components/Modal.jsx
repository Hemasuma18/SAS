import { XMarkIcon } from '@heroicons/react/24/outline';

export default function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
