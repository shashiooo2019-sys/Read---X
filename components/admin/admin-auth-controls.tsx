import React from 'react';

export function ApprovedUsersManager({ onClose, onRefreshRoster }: { onClose?: () => void; onRefreshRoster?: () => void }) {
  return <div>Approved Users Manager</div>;
}

export function AuditLogModal({ isOpen = true, onClose }: { isOpen?: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-lg font-bold mb-4">Audit Log</h2>
        <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Close</button>
      </div>
    </div>
  );
}
