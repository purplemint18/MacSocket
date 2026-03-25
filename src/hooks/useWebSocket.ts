import { useCallback, useEffect, useRef, useState } from "react";
import type { Client } from "../types/client";

export const useWebSocket = (url: string) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [connected, setConnected] = useState(false);
  const [clientDetail, setClientDetail] = useState<Client | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
            setDetailLoading(false);
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
      ws.send(
        JSON.stringify({
          type: "get_client_details",
          data: { device_id: deviceId },
        })
      );
    }
  }, []);

  return { clients, connected, clientDetail, detailLoading, requestClientDetails };
};
