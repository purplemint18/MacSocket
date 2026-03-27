import { useState, useCallback } from "react";
import {
  FiFolder,
  FiFile,
  FiChevronRight,
  FiArrowLeft,
  FiAlertCircle,
  FiUploadCloud,
  FiDownload,
  FiTrash2,
  FiFolderPlus,
} from "react-icons/fi";
import type { FileEntry } from "../types/client";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

interface FileBrowserProps {
  entries: FileEntry[];
  currentPath: string;
  loading?: boolean;
  error?: string | null;
  uploading?: boolean;
  deleting?: boolean;
  onNavigate: (path: string) => void;
  onBack: () => void;
  onUpload?: (path: string) => void;
  onDelete?: (path: string, isDir: boolean) => void;
  onDownload?: (s3Url: string) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + " " + d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const pathSegments = (path: string) => {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const segments: { name: string; path: string }[] = [];
  const isUnix = normalized.startsWith("/");

  for (let i = 0; i < parts.length; i++) {
    let segPath: string;
    if (isUnix) {
      segPath = "/" + parts.slice(0, i + 1).join("/");
    } else {
      segPath = parts.slice(0, i + 1).join("/");
      if (i === 0 && parts[0].endsWith(":")) segPath += "/";
    }
    segments.push({ name: parts[i], path: segPath });
  }

  return segments;
};

interface ContextState {
  x: number;
  y: number;
  entry: FileEntry;
}

export const FileBrowser = ({
  entries,
  currentPath,
  loading,
  error,
  uploading,
  deleting,
  onNavigate,
  onBack,
  onUpload,
  onDelete,
  onDownload,
}: FileBrowserProps) => {
  const segments = pathSegments(currentPath);
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, entry: FileEntry) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, entry });
    },
    []
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const getContextMenuItems = (entry: FileEntry): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (entry.is_dir) {
      items.push({
        label: "Open",
        icon: <FiFolderPlus size={14} />,
        onClick: () => onNavigate(entry.path),
      });
    } else {
      if (entry.uploaded && entry.s3_url && onDownload) {
        items.push({
          label: "Download",
          icon: <FiDownload size={14} />,
          onClick: () => onDownload(entry.s3_url!),
        });
      }
      if (onUpload) {
        items.push({
          label: "Upload to cloud",
          icon: <FiUploadCloud size={14} />,
          onClick: () => onUpload(entry.path),
        });
      }
    }

    if (onDelete) {
      items.push({
        label: "Delete",
        icon: <FiTrash2 size={14} />,
        onClick: () => onDelete(entry.path, entry.is_dir),
        danger: true,
      });
    }

    return items;
  };

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-600/50 hover:bg-surface-600/80 text-surface-300/90 text-xs font-medium transition-colors shrink-0 cursor-pointer"
        >
          <FiArrowLeft size={13} />
          Drives
        </button>

        <FiChevronRight size={12} className="text-surface-300/30 shrink-0" />

        {segments.map((seg, i) => (
          <span key={seg.path} className="flex items-center gap-1.5 shrink-0">
            {i > 0 && <FiChevronRight size={12} className="text-surface-300/30" />}
            {i < segments.length - 1 ? (
              <button
                onClick={() => onNavigate(seg.path)}
                className="text-xs text-accent-400 hover:text-accent-400/80 font-medium transition-colors cursor-pointer"
              >
                {seg.name}
              </button>
            ) : (
              <span className="text-xs text-white font-semibold">{seg.name}</span>
            )}
          </span>
        ))}
      </div>

      {/* Status indicators */}
      {(uploading || deleting) && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-400/10 border border-accent-400/20 mb-4">
          <div className="w-4 h-4 border-2 border-accent-400/30 border-t-accent-400 rounded-full animate-spin" />
          <span className="text-xs text-accent-400">
            {uploading ? "Uploading file to cloud..." : "Deleting..."}
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-accent-400/30 border-t-accent-400 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
          <FiAlertCircle size={16} className="text-red-400 shrink-0" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="glass-card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_180px_100px] px-4 py-2.5 border-b border-surface-500/20 text-[11px] font-semibold text-surface-300/50 uppercase tracking-wider">
            <span>Name</span>
            <span>Date Modified</span>
            <span className="text-right">Size</span>
          </div>

          {/* Rows */}
          {entries.length === 0 ? (
            <div className="px-4 py-12 text-center text-xs text-surface-300/40">
              This folder is empty
            </div>
          ) : (
            <div className="divide-y divide-surface-500/10">
              {entries.map((entry, i) => (
                <div
                  key={entry.path || i}
                  onClick={entry.is_dir ? () => onNavigate(entry.path) : undefined}
                  onContextMenu={(e) => handleContextMenu(e, entry)}
                  className={`grid grid-cols-[1fr_180px_100px] px-4 py-2.5 items-center text-sm transition-colors animate-slide-in ${
                    entry.is_dir
                      ? "cursor-pointer hover:bg-surface-600/40"
                      : "cursor-default hover:bg-surface-600/25"
                  }`}
                  style={{ animationDelay: `${Math.min(i, 20) * 15}ms` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {entry.is_dir ? (
                      <FiFolder size={16} className="text-amber-400 shrink-0" />
                    ) : (
                      <FiFile
                        size={16}
                        className={`shrink-0 ${
                          entry.uploaded ? "text-emerald-400" : "text-surface-100"
                        }`}
                      />
                    )}
                    <span
                      className={`truncate ${
                        entry.is_dir
                          ? "text-white font-medium"
                          : entry.uploaded
                            ? "text-emerald-400 font-medium"
                            : "text-surface-100"
                      }`}
                    >
                      {entry.name}
                    </span>
                    {entry.uploaded && (
                      <FiUploadCloud
                        size={13}
                        className="text-emerald-400/60 shrink-0"
                      />
                    )}
                  </div>
                  <span className="text-xs text-surface-300/50">
                    {formatDate(entry.modified)}
                  </span>
                  <span className="text-xs text-surface-300/50 text-right font-mono">
                    {entry.is_dir ? "—" : entry.size != null ? formatBytes(entry.size) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.entry)}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};
