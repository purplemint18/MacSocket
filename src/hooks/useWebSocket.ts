import { useCallback, useEffect, useRef, useState } from "react";
import type { Client, DriveInfo, FileEntry } from "../types/client";

export const useWebSocket = (url: string) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [connected, setConnected] = useState(false);
  const [clientDetail, setClientDetail] = useState<Client | null>(null);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [directoryEntries, setDirectoryEntries] = useState<FileEntry[]>([]);
  const [uploadListByDeviceId, setUploadListByDeviceId] = useState<
    Record<string, { path: string; s3_url: string; file_size: number; created_at: string }[]>
  >({});
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [browsingLoading, setBrowsingLoading] = useState(false);
  const [browsingError, setBrowsingError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [lastInjectResult, setLastInjectResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const baseUrl = url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let stopped = false;

    const connect = () => {
      let socketHeartbeat: ReturnType<typeof setInterval> | undefined;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "frontend_connect" }));
        setConnected(true);

        socketHeartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "frontend" }));
          }
        }, 15_000);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "client_list":
            setClients(msg.data);
            break;
          case "client_details":
            setClientDetail(msg.data);
            setDrives(msg.drives || []);
            setDetailLoading(false);
            break;
          case "directory_listing":
            setDirectoryEntries(msg.data.entries || []);
            setCurrentPath(msg.data.path || null);
            setBrowsingError(msg.data.error || null);
            setBrowsingLoading(false);
            break;
          case "upload_complete":
            setUploading(false);
            if (msg.data.success) {
              setDirectoryEntries((prev) =>
                prev.map((e) =>
                  e.path === msg.data.path
                    ? { ...e, uploaded: true, s3_url: msg.data.s3_url }
                    : e
                )
              );
              // keep the device upload list in sync (best-effort)
              if (msg.data.device_id) {
                setUploadListByDeviceId((prev) => {
                  const deviceId = msg.data.device_id as string;
                  const existing = prev[deviceId] || [];
                  const already = existing.some((i) => i.path === msg.data.path);
                  if (already) {
                    return {
                      ...prev,
                      [deviceId]: existing.map((i) =>
                        i.path === msg.data.path ? { ...i, s3_url: msg.data.s3_url } : i
                      ),
                    };
                  }
                  return {
                    ...prev,
                    [deviceId]: [
                      { path: msg.data.path, s3_url: msg.data.s3_url, file_size: msg.data.file_size || 0, created_at: new Date().toISOString() },
                      ...existing,
                    ],
                  };
                });
              }
            } else {
              console.error("Upload failed:", msg.data.error);
            }
            break;
          case "delete_complete":
            setDeleting(false);
            if (msg.data.success) {
              setDirectoryEntries((prev) =>
                prev.filter((e) => e.path !== msg.data.path)
              );
              if (msg.data.device_id) {
                setUploadListByDeviceId((prev) => {
                  const deviceId = msg.data.device_id as string;
                  const existing = prev[deviceId] || [];
                  return { ...prev, [deviceId]: existing.filter((i) => i.path !== msg.data.path) };
                });
              }
            } else {
              console.error("Delete failed:", msg.data.error);
            }
            break;
          case "inject_complete":
            setInjecting(false);
            setLastInjectResult({
              success: msg.data.success,
              error: msg.data.error,
            });
            if (!msg.data.success) {
              console.error("Inject failed:", msg.data.error);
            }
            break;
          case "upload_list": {
            const deviceId = msg.data?.device_id as string | undefined;
            if (deviceId) {
              setUploadListByDeviceId((prev) => ({
                ...prev,
                [deviceId]: msg.data.items || [],
              }));
            }
            break;
          }
        }
      };

      ws.onclose = () => {
        if (socketHeartbeat) clearInterval(socketHeartbeat);
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        setConnected(false);
        if (!stopped) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [url]);

  const requestClientDetails = useCallback((deviceId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      setDetailLoading(true);
      setCurrentPath(null);
      setDirectoryEntries([]);
      setBrowsingError(null);
      ws.send(
        JSON.stringify({
          type: "get_client_details",
          data: { device_id: deviceId },
        })
      );
    }
  }, []);

  const browseDirectory = useCallback((deviceId: string, path: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      setBrowsingLoading(true);
      setBrowsingError(null);
      ws.send(
        JSON.stringify({
          type: "browse_directory",
          data: { device_id: deviceId, path },
        })
      );
    }
  }, []);

  const uploadFile = useCallback((deviceId: string, path: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      setUploading(true);
      ws.send(
        JSON.stringify({
          type: "upload_file",
          data: { device_id: deviceId, path },
        })
      );
    }
  }, []);

  const requestUploadList = useCallback((deviceId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "get_upload_list",
          data: { device_id: deviceId },
        })
      );
    }
  }, []);

  const injectFile = useCallback(
    (deviceId: string, path: string, fileName: string, fileData: string) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        setInjecting(true);
        setLastInjectResult(null);
        ws.send(
          JSON.stringify({
            type: "inject_file",
            data: { device_id: deviceId, path, file_name: fileName, file_data: fileData },
          })
        );
      }
    },
    []
  );

  const deleteFile = useCallback(
    (deviceId: string, path: string, isDir: boolean) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        setDeleting(true);
        ws.send(
          JSON.stringify({
            type: "delete_file",
            data: { device_id: deviceId, path, is_dir: isDir },
          })
        );
      }
    },
    []
  );

  const getDownloadUrl = useCallback(
    (s3Url: string) => `${baseUrl}${s3Url}`,
    [baseUrl]
  );

  return {
    clients,
    connected,
    clientDetail,
    drives,
    detailLoading,
    requestClientDetails,
    directoryEntries,
    uploadListByDeviceId,
    currentPath,
    browsingLoading,
    browsingError,
    browseDirectory,
    uploadFile,
    requestUploadList,
    injectFile,
    deleteFile,
    getDownloadUrl,
    uploading,
    deleting,
    injecting,
    lastInjectResult,
  };
};
