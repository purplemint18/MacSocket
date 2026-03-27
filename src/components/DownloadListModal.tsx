import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { FiDownload, FiTrash2, FiX } from "react-icons/fi";

export interface DownloadListItem {
  path: string;
  name: string;
  isDir: boolean;
  s3Url: string;
}

interface DownloadListModalProps {
  open: boolean;
  clientName: string;
  items: DownloadListItem[];
  onClose: () => void;
  onDownload: (s3Url: string) => void;
  onRemove: (path: string, isDir: boolean) => void;
}

export const DownloadListModal = ({
  open,
  clientName,
  items,
  onClose,
  onDownload,
  onRemove,
}: DownloadListModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close download list"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
      />
      <div
        ref={panelRef}
        className="absolute left-1/2 top-1/2 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface-800 border border-surface-500/30 shadow-2xl shadow-black/50 overflow-hidden animate-fade-in"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-500/20">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">
              Download list
            </h3>
            <p className="text-xs text-surface-300/60 truncate">
              {clientName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto w-9 h-9 rounded-xl bg-surface-700/60 hover:bg-surface-700 flex items-center justify-center text-surface-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          {sorted.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-surface-300/60 font-medium">
                No downloads yet
              </p>
              <p className="text-xs text-surface-300/30 mt-1">
                Upload a file to cloud, then it will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-500/10">
              {sorted.map((item) => (
                <div
                  key={item.path}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-700/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-surface-300/50 font-mono truncate">
                      {item.path}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDownload(item.s3Url)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-400/15 hover:bg-accent-400/25 text-accent-400 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FiDownload size={14} />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item.path, item.isDir)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/15 text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FiTrash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

