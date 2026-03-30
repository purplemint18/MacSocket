import { useCallback, useState } from "react";
import { FiDownloadCloud, FiFolderPlus, FiGlobe, FiSearch, FiUploadCloud, FiUsers } from "react-icons/fi";
import { FaApple, FaLinux, FaWindows } from "react-icons/fa";
import type { Client } from "../types/client";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

interface SidebarProps {
  clients: Client[];
  selectedDeviceId: string | null;
  onSelectClient: (client: Client) => void;
  onOpenDownloadList: (client: Client) => void;
  onInjectFile: (client: Client) => void;
  connected: boolean;
}

const getOsKind = (osType: string) => {
  const v = (osType || "").toLowerCase();
  if (v.includes("darwin") || v.includes("mac") || v.includes("os x")) return "mac";
  // NOTE: "darwin" includes "win" — keep Windows checks strict.
  if (v.includes("windows") || v.includes("win32") || v.includes("winnt")) return "windows";
  if (v.includes("linux") || v.includes("ubuntu") || v.includes("debian") || v.includes("fedora")) return "linux";
  return "other";
};

const Avatar = ({
  osType,
  isOnline,
}: {
  osType: string;
  isOnline: boolean;
}) => {
  const kind = getOsKind(osType);

  return (
    <div className="relative shrink-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
          kind === "windows"
            ? "bg-sky-500/15 text-sky-300"
            : kind === "mac"
              ? "bg-surface-600/50 text-surface-100"
              : kind === "linux"
                ? "bg-amber-500/15 text-amber-300"
                : "bg-accent-400/15 text-accent-300"
        }`}
      >
        {kind === "windows" ? (
          <FaWindows size={18} />
        ) : kind === "mac" ? (
          <FaApple size={18} />
        ) : kind === "linux" ? (
          <FaLinux size={18} />
        ) : (
          <FiGlobe size={18} />
        )}
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
  onOpenDownloadList,
  onInjectFile,
  connected,
}: SidebarProps) => {
  const [search, setSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    client: Client;
  } | null>(null);
  const onlineCount = clients.filter((c) => c.isOnline).length;

  const filtered = clients.filter(
    (c) =>
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.deviceId.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort(
    (a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openClientMenu = useCallback((e: React.MouseEvent, client: Client) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, client });
  }, []);

  const getClientMenuItems = useCallback(
    (client: Client): ContextMenuItem[] => [
      {
        label: "Open",
        icon: <FiFolderPlus size={14} />,
        onClick: () => onSelectClient(client),
      },
      {
        label: "Download list",
        icon: <FiDownloadCloud size={14} />,
        onClick: () => onOpenDownloadList(client),
      },
      {
        label: "Inject File",
        icon: <FiUploadCloud size={14} />,
        onClick: () => onInjectFile(client),
      },
    ],
    [onOpenDownloadList, onSelectClient, onInjectFile]
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
                onContextMenu={(e) => openClientMenu(e, client)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all animate-slide-in group ${
                  selectedDeviceId === client.deviceId
                    ? "bg-accent-400/12 border border-accent-400/20"
                    : "border border-transparent hover:bg-surface-600/50"
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <Avatar osType={client.osType} isOnline={client.isOnline} />
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

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getClientMenuItems(contextMenu.client)}
          onClose={closeContextMenu}
        />
      )}
    </aside>
  );
};
