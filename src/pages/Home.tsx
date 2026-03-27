import { useState } from "react";
import { FiUsers } from "react-icons/fi";
import { useWebSocket } from "../hooks/useWebSocket";
import { Sidebar } from "../components/Sidebar";
import { ClientDetail } from "../components/ClientDetail";
import { DriveList } from "../components/DriveList";
import { FileBrowser } from "../components/FileBrowser";

const WS_URL = "wss://mac.cryptdocker.com";

export const Home = () => {
  const {
    clients,
    connected,
    clientDetail,
    drives,
    detailLoading,
    requestClientDetails,
    directoryEntries,
    currentPath,
    browsingLoading,
    browsingError,
    browseDirectory,
  } = useWebSocket(WS_URL);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);

  const listClient =
    clients.find((c) => c.deviceId === selectedDeviceId) ?? null;

  const displayClient =
    clientDetail?.deviceId === selectedDeviceId ? clientDetail : listClient;

  const displayDrives =
    clientDetail?.deviceId === selectedDeviceId ? drives : [];

  const handleSelectClient = (deviceId: string) => {
    console.log("clicked");
    setSelectedDeviceId(deviceId);
    setBrowsing(false);
    requestClientDetails(deviceId);
  };

  const handleDriveClick = (path: string) => {
    if (!selectedDeviceId) return;
    setBrowsing(true);
    browseDirectory(selectedDeviceId, path);
  };

  const handleNavigate = (path: string) => {
    if (!selectedDeviceId) return;
    browseDirectory(selectedDeviceId, path);
  };

  const handleBackToDrives = () => {
    setBrowsing(false);
  };

  const handleVolumesClick = () => {
    if (!selectedDeviceId || !displayClient) return;
    const isMacClient =
      displayClient.osType.toLowerCase().includes("darwin") ||
      displayClient.osType.toLowerCase().includes("mac");
    if (isMacClient) {
      requestClientDetails(selectedDeviceId);
    }
  };

  return (
    <div className="flex h-screen bg-surface-900">
      <Sidebar
        clients={clients}
        selectedDeviceId={selectedDeviceId}
        onSelectClient={(client) => handleSelectClient(client.deviceId)}
        connected={connected}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {displayClient ? (
          <>
            <div className="shrink-0 p-4 pb-0">
              <ClientDetail client={displayClient} loading={detailLoading} />
            </div>
            <div className="flex-1 overflow-auto p-4">
              {browsing ? (
                <FileBrowser
                  entries={directoryEntries}
                  currentPath={currentPath || ""}
                  loading={browsingLoading}
                  error={browsingError}
                  onNavigate={handleNavigate}
                  onBack={handleBackToDrives}
                />
              ) : (
                <DriveList
                  drives={displayDrives}
                  loading={detailLoading}
                  onDriveClick={handleDriveClick}
                  onVolumesClick={handleVolumesClick}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-surface-700/50 border border-surface-500/20 flex items-center justify-center mb-6">
              <FiUsers size={36} strokeWidth={1.2} className="text-surface-300/40" />
            </div>
            <p className="text-surface-300/50 text-base font-medium mb-1">
              No client selected
            </p>
            <p className="text-surface-300/30 text-sm">
              Pick a client from the sidebar to view details
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
