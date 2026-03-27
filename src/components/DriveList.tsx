import { FiHardDrive } from "react-icons/fi";
import type { DriveInfo } from "../types/client";

interface DriveListProps {
  drives: DriveInfo[];
  loading?: boolean;
  onDriveClick?: (path: string) => void;
  onVolumesClick?: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
};

const usageColor = (percent: number) => {
  if (percent >= 90) return { bar: "bg-red-500", text: "text-red-400", glow: "shadow-red-500/20" };
  if (percent >= 75) return { bar: "bg-amber-500", text: "text-amber-400", glow: "shadow-amber-500/20" };
  return { bar: "bg-accent-400", text: "text-accent-400", glow: "shadow-accent-400/20" };
};

export const DriveList = ({
  drives,
  loading,
  onDriveClick,
  onVolumesClick,
}: DriveListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent-400/30 border-t-accent-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (drives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-surface-700/50 border border-surface-500/20 flex items-center justify-center mb-4">
          <FiHardDrive size={28} strokeWidth={1.2} className="text-surface-300/40" />
        </div>
        <p className="text-surface-300/50 text-sm font-medium mb-1">
          No drives available
        </p>
        <p className="text-surface-300/30 text-xs">
          Drive information is only available for online clients
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <FiHardDrive size={18} className="text-surface-300/70" />
        {onVolumesClick ? (
          <button
            type="button"
            onClick={onVolumesClick}
            className="text-sm font-semibold text-surface-300/90 uppercase tracking-wider hover:text-accent-400 transition-colors cursor-pointer"
          >
            Volumes
          </button>
        ) : (
          <h3 className="text-sm font-semibold text-surface-300/90 uppercase tracking-wider">
            Volumes
          </h3>
        )}
        <span className="text-xs text-surface-300/40 ml-1">{drives.length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {drives.map((drive, i) => (
          <DriveCard
            key={drive.path || i}
            drive={drive}
            index={i}
            onClick={onDriveClick ? () => onDriveClick(drive.path) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

const DriveCard = ({ drive, index, onClick }: { drive: DriveInfo; index: number; onClick?: () => void }) => {
  const hasUsage =
    drive.total_bytes != null &&
    drive.used_bytes != null &&
    drive.total_bytes > 0;

  const percent = hasUsage
    ? Math.round((drive.used_bytes! / drive.total_bytes!) * 100)
    : 0;

  const colors = usageColor(percent);

  return (
    <div
      onClick={onClick}
      className={`glass-card p-4 animate-slide-in ${onClick ? "cursor-pointer hover:border-accent-400/40" : ""}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-surface-600/60 flex items-center justify-center shrink-0 ${colors.text}`}>
          <FiHardDrive size={20} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{drive.name}</p>
          <p className="text-[11px] text-surface-300/50 font-mono truncate">{drive.path}</p>
        </div>
      </div>

      {hasUsage ? (
        <>
          <div className="w-full h-2 rounded-full bg-surface-600/80 overflow-hidden mb-2.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colors.bar} ${colors.glow} shadow-sm`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-surface-300/60">
              <span className="text-white font-medium">{formatBytes(drive.used_bytes!)}</span>
              {" / "}
              {formatBytes(drive.total_bytes!)}
            </span>
            <span className={`font-semibold ${colors.text}`}>{percent}%</span>
          </div>

          {drive.free_bytes != null && (
            <p className="text-[10px] text-surface-300/40 mt-1">
              {formatBytes(drive.free_bytes)} available
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-surface-300/40 italic">Size info unavailable</p>
      )}
    </div>
  );
};
