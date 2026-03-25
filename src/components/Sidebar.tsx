import { useState } from "react";
import { FiGlobe, FiSearch, FiUsers } from "react-icons/fi";
import type { Client } from "../types/client";

interface SidebarProps {
  clients: Client[];
  selectedDeviceId: string | null;
  onSelectClient: (client: Client) => void;
  connected: boolean;
}

const Avatar = ({ name, isOnline }: { name: string; isOnline: boolean }) => {
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  const hues = [260, 210, 340, 160, 30, 190, 290, 10];
  const hue = hues[name.charCodeAt(0) % hues.length];

  return (
    <div className="relative shrink-0">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold text-white"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 30}, 50%, 35%))`,
        }}
      >
        {initial}
      </div>
      <span
        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-800 ${
          isOnline ? "bg-online pulse-online" : "bg-offline"
        }`}
      />
    </div>
  );
};

export const Sidebar = ({
  clients,
  selectedDeviceId,
  onSelectClient,
  connected,
}: SidebarProps) => {
  const [search, setSearch] = useState("");
  const onlineCount = clients.filter((c) => c.isOnline).length;

  const filtered = clients.filter(
    (c) =>
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.deviceId.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort(
    (a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)
  );

  return (
    <aside className="w-72 bg-surface-800 flex flex-col h-full shrink-0 border-r border-surface-500/30">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent-400/15 flex items-center justify-center text-accent-400">
            <FiGlobe size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              MacSocket
            </h1>
          </div>
          <span
            className={`ml-auto w-2 h-2 rounded-full shrink-0 ${
              connected ? "bg-online pulse-online" : "bg-red-400"
            }`}
          />
        </div>
        <p className="text-xs text-surface-300 mt-2 pl-0.5">
          <span className="text-online font-medium">{onlineCount}</span> online
          <span className="mx-1.5 text-surface-500">/</span>
          {clients.length} total
        </p>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <FiSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-300 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-700 border border-surface-500/40 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-surface-300/60 outline-none focus:border-accent-400/50 focus:ring-1 focus:ring-accent-400/20 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-surface-300/60">
            <FiUsers size={32} strokeWidth={1.5} className="mb-3 opacity-40" />
            <p className="text-xs">
              {search ? "No matches found" : "No clients yet"}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sorted.map((client, i) => (
              <li
                key={client.deviceId}
                onClick={() => onSelectClient(client)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all animate-slide-in group ${
                  selectedDeviceId === client.deviceId
                    ? "bg-accent-400/12 border border-accent-400/20"
                    : "border border-transparent hover:bg-surface-600/50"
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <Avatar name={client.username} isOnline={client.isOnline} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium truncate ${
                      selectedDeviceId === client.deviceId
                        ? "text-white"
                        : "text-gray-200 group-hover:text-white"
                    } transition-colors`}
                  >
                    {client.username}
                  </p>
                  <p className="text-[11px] text-surface-300/70 truncate font-mono">
                    {client.deviceId.slice(0, 14)}...
                  </p>
                </div>
                <div
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    client.isOnline
                      ? "bg-online/10 text-online"
                      : "bg-surface-500/30 text-surface-300/60"
                  }`}
                >
                  {client.isOnline ? "ON" : "OFF"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};
