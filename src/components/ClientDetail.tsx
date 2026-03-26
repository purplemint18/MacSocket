import { FiGlobe, FiMonitor, FiUser, FiClock } from "react-icons/fi";
import { LuFingerprint } from "react-icons/lu";
import type { Client } from "../types/client";

interface ClientDetailProps {
  client: Client;
  loading?: boolean;
}

const timeSince = (dateStr: string) => {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const ClientDetail = ({ client, loading }: ClientDetailProps) => {
  const initial = client.username?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="glass-card px-5 py-3 animate-fade-in">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-accent-400/15 flex items-center justify-center text-base font-bold text-accent-400">
            {initial}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{client.username}</h2>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                client.isOnline
                  ? "bg-online/10 text-online"
                  : "bg-surface-500/30 text-surface-300/60"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  client.isOnline ? "bg-online pulse-online" : "bg-surface-300/40"
                }`}
              />
              {client.isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        <div className="w-px h-6 bg-surface-500/30 hidden sm:block" />

        {/* Info pills */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <InfoPill icon={<FiMonitor size={13} />} value={client.osType} />
          <InfoPill icon={<FiGlobe size={13} />} value={client.publicIp} />
          <InfoPill icon={<FiUser size={13} />} value={client.username} />
          <InfoPill
            icon={<LuFingerprint size={13} />}
            value={client.deviceId.slice(0, 14) + "..."}
            mono
          />
          <InfoPill
            icon={<FiClock size={13} />}
            value={client.lastSeen ? timeSince(client.lastSeen) : "N/A"}
          />
        </div>

        {loading && (
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <div className="w-3.5 h-3.5 border-2 border-accent-400/30 border-t-accent-400 rounded-full animate-spin" />
            <span className="text-[10px] font-medium text-accent-400/80">
              Fetching…
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoPill = ({
  icon,
  value,
  mono,
}: {
  icon: React.ReactNode;
  value: string;
  mono?: boolean;
}) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-600/50 text-surface-300/90">
    <span className="text-surface-300/60">{icon}</span>
    <span className={`${mono ? "font-mono text-[11px]" : ""} truncate max-w-[140px]`}>
      {value || "N/A"}
    </span>
  </span>
);
