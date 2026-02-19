"use client";

export default function ConfirmClearModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onCancel}
      data-testid="clear-confirm-overlay"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[400px] p-6"
        onClick={(e) => e.stopPropagation()}
        data-testid="clear-confirm-modal"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="#dc2626"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 7v4M10 14h.01" />
              <circle cx="10" cy="10" r="8" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Clear document?
          </h2>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          This will permanently delete your document and conversation history.
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            data-testid="clear-cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
            data-testid="clear-confirm-button"
          >
            Clear everything
          </button>
        </div>
      </div>
    </div>
  );
}
