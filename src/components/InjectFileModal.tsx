import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiUploadCloud, FiX, FiFile, FiLoader } from "react-icons/fi";

interface InjectFileModalProps {
  open: boolean;
  clientName: string;
  currentPath: string | null;
  injecting: boolean;
  lastResult: { success: boolean; error?: string } | null;
  onClose: () => void;
  onInject: (fileName: string, fileData: string) => void;
}

export const InjectFileModal = ({
  open,
  clientName,
  currentPath,
  injecting,
  lastResult,
  onClose,
  onInject,
}: InjectFileModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setDragOver(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setSelectedFile(file);
    },
    [],
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleInject = useCallback(() => {
    if (!selectedFile || injecting) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      onInject(selectedFile.name, base64);
    };
    reader.readAsDataURL(selectedFile);
  }, [selectedFile, injecting, onInject]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close inject file modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
      />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface-800 border border-surface-500/30 shadow-2xl shadow-black/50 overflow-hidden animate-fade-in">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-500/20">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">
              Inject File
            </h3>
            <p className="text-xs text-surface-300/60 truncate">
              {clientName}
              {currentPath && (
                <span className="ml-1 font-mono">— {currentPath}</span>
              )}
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

        <div className="p-5 space-y-4">
          {!currentPath && (
            <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              No directory is currently open. Please browse into a directory
              first, then inject.
            </div>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              dragOver
                ? "border-accent-400/60 bg-accent-400/5"
                : selectedFile
                  ? "border-accent-400/30 bg-accent-400/5"
                  : "border-surface-500/30 hover:border-surface-400/40 bg-surface-700/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <>
                <FiFile size={28} className="text-accent-400" />
                <div className="text-center">
                  <p className="text-sm text-white font-medium truncate max-w-xs">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-surface-300/60 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <p className="text-xs text-surface-300/40">
                  Click or drop to change
                </p>
              </>
            ) : (
              <>
                <FiUploadCloud size={28} className="text-surface-300/40" />
                <div className="text-center">
                  <p className="text-sm text-surface-200 font-medium">
                    Choose a file or drag & drop
                  </p>
                  <p className="text-xs text-surface-300/40 mt-0.5">
                    File will be written to the client's current path
                  </p>
                </div>
              </>
            )}
          </div>

          {lastResult && !lastResult.success && lastResult.error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              Inject failed: {lastResult.error}
            </div>
          )}

          <button
            type="button"
            onClick={handleInject}
            disabled={!selectedFile || !currentPath || injecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-400/20 hover:bg-accent-400/30 disabled:opacity-40 disabled:cursor-not-allowed text-accent-400 text-sm font-semibold transition-colors cursor-pointer"
          >
            {injecting ? (
              <>
                <FiLoader size={16} className="animate-spin" />
                Injecting…
              </>
            ) : (
              <>
                <FiUploadCloud size={16} />
                Inject File
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
