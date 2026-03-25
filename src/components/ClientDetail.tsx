import { FiGlobe, FiMonitor, FiUser, FiClock, FiCalendar } from "react-icons/fi";
import { LuFingerprint } from "react-icons/lu";
import type { Client } from "../types/client";

interface ClientDetailProps {
  client: Client;
  loading?: boolean;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

const IconGlobe = () => <FiGlobe size={18} strokeWidth={1.5} />;
const IconMonitor = () => <FiMonitor size={18} strokeWidth={1.5} />;
const IconUser = () => <FiUser size={18} strokeWidth={1.5} />;
const IconFingerprint = () => <LuFingerprint size={18} strokeWidth={1.5} />;
const IconClock = () => <FiClock size={16} strokeWidth={1.5} />;
const IconCalendar = () => <FiCalendar size={16} strokeWidth={1.5} />;

export const ClientDetail = ({ client, loading }: ClientDetailProps) => {
  const initial = client.username?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {loading && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-400/10 border border-accent-400/20">
          <div className="w-4 h-4 border-2 border-accent-400/30 border-t-accent-400 rounded-full animate-spin" />
          <span className="text-xs font-medium text-accent-400/80">
            Fetching latest data from client…
          </span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-accent-400/15 flex items-center justify-center text-2xl font-bold text-accent-400 shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white truncate">
                {client.username}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
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
            <p className="text-xs text-surface-300/70 font-mono truncate">
              {client.deviceId}
            </p>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <InfoCard
          icon={<IconMonitor />}
          label="Operating System"
          value={client.osType}
          accent="text-blue-400"
        />
        <InfoCard
          icon={<IconGlobe />}
          label="Public IP"
          value={client.publicIp}
          accent="text-emerald-400"
        />
        <InfoCard
          icon={<IconUser />}
          label="Username"
          value={client.username}
          accent="text-violet-400"
        />
        <InfoCard
          icon={<IconFingerprint />}
          label="Device ID"
          value={client.deviceId.slice(0, 18) + "..."}
          accent="text-amber-400"
          mono
        />
      </div>

      {/* Timestamps */}
      <div className="glass-card p-5">
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-600/60 flex items-center justify-center text-surface-300/80 shrink-0 mt-0.5">
              <IconClock />
            </div>
            <div>
              <p className="text-[11px] font-medium text-surface-300/60 uppercase tracking-wider mb-1">
                Last Seen
              </p>
              <p className="text-sm font-semibold text-white">
                {formatDate(client.lastSeen)}
              </p>
              <p className="text-xs text-surface-300/50 mt-0.5">
                {timeSince(client.lastSeen)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-600/60 flex items-center justify-center text-surface-300/80 shrink-0 mt-0.5">
              <IconCalendar />
            </div>
            <div>
              <p className="text-[11px] font-medium text-surface-300/60 uppercase tracking-wider mb-1">
                First Connected
              </p>
              <p className="text-sm font-semibold text-white">
                {formatDate(client.createdAt)}
              </p>
              <p className="text-xs text-surface-300/50 mt-0.5">
                {timeSince(client.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({
  icon,
  label,
  value,
  accent,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  mono?: boolean;
}) => (
  <div className="glass-card p-4 flex items-start gap-3">
    <div
      className={`w-9 h-9 rounded-xl bg-surface-600/60 flex items-center justify-center shrink-0 ${accent}`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-surface-300/60 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={`text-sm font-semibold text-white truncate ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || "N/A"}
      </p>
    </div>
  </div>
);
