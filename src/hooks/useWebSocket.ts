import { useCallback, useEffect, useRef, useState } from "react";
import type { Client, DriveInfo, FileEntry } from "../types/client";

export const useWebSocket = (url: string) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [connected, setConnected] = useState(false);
  const [clientDetail, setClientDetail] = useState<Client | null>(null);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [directoryEntries, setDirectoryEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [browsingLoading, setBrowsingLoading] = useState(false);
  const [browsingError, setBrowsingError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let stopped = false;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "frontend_connect" }));
        setConnected(true);
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
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
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

  return {
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
  };
};
