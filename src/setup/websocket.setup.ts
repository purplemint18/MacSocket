import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { clientService, s3Service, uploadService } from "@/services";
import { Logger } from "@/utils";

interface ExtWebSocket extends WebSocket {
  deviceId?: string;
  clientType?: "client" | "frontend";
  isAlive?: boolean;
}

interface PendingRequest {
  frontendWs: ExtWebSocket;
  deviceId: string;
  timer: ReturnType<typeof setTimeout>;
}

let requestCounter = 0;

export const websocketSetup = (server: Server) => {
  const wss = new WebSocketServer({ server });

  const frontendSockets = new Set<ExtWebSocket>();
  const clientSockets = new Map<string, ExtWebSocket>();
  const pendingRequests = new Map<string, PendingRequest>();

  const broadcastToFrontends = async () => {
    const clients = await clientService.getAllClients();
    const message = JSON.stringify({ type: "client_list", data: clients });
    frontendSockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    });
  };

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((raw) => {
      const ws = raw as ExtWebSocket;
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(heartbeatInterval));

  wss.on("connection", (raw: WebSocket) => {
    const ws = raw as ExtWebSocket;
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());

        switch (msg.type) {
          case "client_connect": {
            const { device_id, os_type, public_ip, username } = msg.data;
            ws.deviceId = device_id;
            ws.clientType = "client";
            clientSockets.set(device_id, ws);

            await clientService.upsertClient({
              deviceId: device_id,
              osType: os_type,
              publicIp: public_ip,
              username,
            });

            ws.send(
              JSON.stringify({
                type: "connected",
                data: { message: "Registered successfully" },
              }),
            );
            await broadcastToFrontends();
            Logger.info(`Client connected: ${device_id}`);
            break;
          }

          case "frontend_connect": {
            ws.clientType = "frontend";
            frontendSockets.add(ws);
            const clients = await clientService.getAllClients();
            ws.send(JSON.stringify({ type: "client_list", data: clients }));
            Logger.info("Frontend dashboard connected");
            break;
          }

          case "get_client_details": {
            const { device_id } = msg.data;
            const clientWs = clientSockets.get(device_id);

            if (clientWs && clientWs.readyState === WebSocket.OPEN) {
              const requestId = `req_${++requestCounter}`;

              const timer = setTimeout(async () => {
                pendingRequests.delete(requestId);
                const fallback =
                  await clientService.getClientByDeviceId(device_id);
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: "client_details",
                      data: fallback,
                      drives: [],
                    }),
                  );
                }
                Logger.warn(`Request ${requestId} timed out, sent DB fallback`);
              }, 10000);

              pendingRequests.set(requestId, {
                frontendWs: ws,
                deviceId: device_id,
                timer,
              });

              clientWs.send(
                JSON.stringify({ type: "request_info", request_id: requestId }),
              );
              Logger.info(
                `Forwarded info request to client ${device_id} (${requestId})`,
              );
            } else {
              const client = await clientService.getClientByDeviceId(device_id);
              ws.send(
                JSON.stringify({
                  type: "client_details",
                  data: client,
                  drives: [],
                }),
              );
            }
            break;
          }

          case "client_info_response": {
            const {
              device_id,
              os_type,
              public_ip,
              username,
              request_id,
              drives,
            } = msg.data;

            const pending = pendingRequests.get(request_id);
            if (pending) {
              clearTimeout(pending.timer);
              pendingRequests.delete(request_id);

              const updated = await clientService.upsertClient({
                deviceId: device_id,
                osType: os_type,
                publicIp: public_ip,
                username,
              });

              if (pending.frontendWs.readyState === WebSocket.OPEN) {
                pending.frontendWs.send(
                  JSON.stringify({
                    type: "client_details",
                    data: updated,
                    drives: drives || [],
                  }),
                );
              }

              await broadcastToFrontends();
              Logger.info(
                `Fresh data stored and sent for ${device_id} (${request_id})`,
              );
            }
            break;
          }

          case "browse_directory": {
            const { device_id: browseDeviceId, path: browsePath } = msg.data;
            const browseClientWs = clientSockets.get(browseDeviceId);

            if (browseClientWs && browseClientWs.readyState === WebSocket.OPEN) {
              const requestId = `dir_${++requestCounter}`;

              const timer = setTimeout(() => {
                pendingRequests.delete(requestId);
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: "directory_listing",
                      data: { path: browsePath, entries: [], error: "Request timed out" },
                    }),
                  );
                }
                Logger.warn(`Directory request ${requestId} timed out`);
              }, 60000);

              pendingRequests.set(requestId, {
                frontendWs: ws,
                deviceId: browseDeviceId,
                timer,
              });

              browseClientWs.send(
                JSON.stringify({
                  type: "request_directory",
                  request_id: requestId,
                  path: browsePath,
                }),
              );
              Logger.info(
                `Forwarded directory request to ${browseDeviceId}: ${browsePath} (${requestId})`,
              );
            } else {
              ws.send(
                JSON.stringify({
                  type: "directory_listing",
                  data: { path: browsePath, entries: [], error: "Client is offline" },
                }),
              );
            }
            break;
          }

          case "directory_response": {
            const { request_id: dirReqId, path: dirPath, entries, error: dirError } = msg.data;
            const dirPending = pendingRequests.get(dirReqId);
            if (dirPending) {
              clearTimeout(dirPending.timer);
              pendingRequests.delete(dirReqId);

              let enrichedEntries = entries || [];
              try {
                const filePaths = enrichedEntries
                  .filter((e: { is_dir: boolean }) => !e.is_dir)
                  .map((e: { path: string }) => e.path);
                const uploads = await uploadService.getUploadsByDeviceAndPaths(
                  dirPending.deviceId,
                  filePaths,
                );
                const uploadMap = new Map(uploads.map((u) => [u.url, u.s3Url]));
                enrichedEntries = enrichedEntries.map(
                  (e: { is_dir: boolean; path: string }) => {
                    if (e.is_dir || !uploadMap.has(e.path)) {
                      return { ...e, uploaded: false, s3_url: null };
                    }
                    const s3Key = uploadMap.get(e.path) as string;
                    return {
                      ...e,
                      uploaded: true,
                      s3_url: s3Service.buildS3DownloadPath(s3Key),
                    };
                  },
                );
              } catch (err) {
                Logger.error("Failed to enrich entries with upload status:", err);
              }

              if (dirPending.frontendWs.readyState === WebSocket.OPEN) {
                dirPending.frontendWs.send(
                  JSON.stringify({
                    type: "directory_listing",
                    data: { path: dirPath, entries: enrichedEntries, error: dirError },
                  }),
                );
              }
              Logger.info(
                `Directory listing sent for ${dirPath} (${dirReqId})`,
              );
            }
            break;
          }

          case "upload_file": {
            const { device_id: uploadDeviceId, path: uploadPath } = msg.data;
            const uploadClientWs = clientSockets.get(uploadDeviceId);

            if (uploadClientWs && uploadClientWs.readyState === WebSocket.OPEN) {
              const requestId = `upl_${++requestCounter}`;

              const timer = setTimeout(() => {
                pendingRequests.delete(requestId);
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: "upload_complete",
                      data: { path: uploadPath, success: false, error: "Request timed out" },
                    }),
                  );
                }
                Logger.warn(`Upload request ${requestId} timed out`);
              }, 120000);

              pendingRequests.set(requestId, {
                frontendWs: ws,
                deviceId: uploadDeviceId,
                timer,
              });

              uploadClientWs.send(
                JSON.stringify({
                  type: "request_upload",
                  request_id: requestId,
                  path: uploadPath,
                }),
              );
              Logger.info(
                `Forwarded upload request to ${uploadDeviceId}: ${uploadPath} (${requestId})`,
              );
            } else {
              ws.send(
                JSON.stringify({
                  type: "upload_complete",
                  data: { path: uploadPath, success: false, error: "Client is offline" },
                }),
              );
            }
            break;
          }

          case "upload_response": {
            const {
              request_id: uplReqId,
              path: uplPath,
              file_data,
              file_size: uplFileSize,
              error: uplError,
            } = msg.data;
            const uplPending = pendingRequests.get(uplReqId);
            if (uplPending) {
              clearTimeout(uplPending.timer);
              pendingRequests.delete(uplReqId);

              if (uplError || !file_data) {
                if (uplPending.frontendWs.readyState === WebSocket.OPEN) {
                  uplPending.frontendWs.send(
                    JSON.stringify({
                      type: "upload_complete",
                      data: { path: uplPath, success: false, error: uplError || "No file data" },
                    }),
                  );
                }
              } else {
                try {
                  const fileBuffer = Buffer.from(file_data, "base64");
                  const s3Key = s3Service.buildS3ObjectKey(
                    uplPending.deviceId,
                    uplPath,
                  );
                  await s3Service.uploadBufferToS3(s3Key, fileBuffer, uplPath);
                  const downloadPath = s3Service.buildS3DownloadPath(s3Key);

                  const clientEntity = await clientService.getClientByDeviceId(
                    uplPending.deviceId,
                  );
                  const existingUpload = await uploadService.getUploadByDeviceAndPath(
                    uplPending.deviceId,
                    uplPath,
                  );
                  if (existingUpload?.s3Url) {
                    await s3Service.deleteObjectFromS3(existingUpload.s3Url);
                  }

                  await uploadService.createUpload({
                    os: clientEntity?.osType || "unknown",
                    deviceId: uplPending.deviceId,
                    url: uplPath,
                    s3Url: s3Key,
                    fileSize: uplFileSize || fileBuffer.length,
                  });

                  if (uplPending.frontendWs.readyState === WebSocket.OPEN) {
                    uplPending.frontendWs.send(
                      JSON.stringify({
                        type: "upload_complete",
                        data: {
                          path: uplPath,
                          success: true,
                          s3_url: downloadPath,
                          file_size: uplFileSize || fileBuffer.length,
                        },
                      }),
                    );
                  }
                  Logger.info(
                    `File uploaded to S3: ${uplPath} → ${s3Key} (${uplReqId})`,
                  );
                } catch (err) {
                  Logger.error("Failed to upload file to S3:", err);
                  if (uplPending.frontendWs.readyState === WebSocket.OPEN) {
                    uplPending.frontendWs.send(
                      JSON.stringify({
                        type: "upload_complete",
                        data: { path: uplPath, success: false, error: "S3 upload failed" },
                      }),
                    );
                  }
                }
              }
            }
            break;
          }

          case "delete_file": {
            const { device_id: delDeviceId, path: delPath, is_dir: delIsDir } = msg.data;
            const delClientWs = clientSockets.get(delDeviceId);

            if (delClientWs && delClientWs.readyState === WebSocket.OPEN) {
              const requestId = `del_${++requestCounter}`;

              const timer = setTimeout(() => {
                pendingRequests.delete(requestId);
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: "delete_complete",
                      data: { path: delPath, success: false, error: "Request timed out" },
                    }),
                  );
                }
                Logger.warn(`Delete request ${requestId} timed out`);
              }, 60000);

              pendingRequests.set(requestId, {
                frontendWs: ws,
                deviceId: delDeviceId,
                timer,
              });

              delClientWs.send(
                JSON.stringify({
                  type: "request_delete",
                  request_id: requestId,
                  path: delPath,
                  is_dir: delIsDir,
                }),
              );
              Logger.info(
                `Forwarded delete request to ${delDeviceId}: ${delPath} (${requestId})`,
              );
            } else {
              ws.send(
                JSON.stringify({
                  type: "delete_complete",
                  data: { path: delPath, success: false, error: "Client is offline" },
                }),
              );
            }
            break;
          }

          case "delete_response": {
            const {
              request_id: delReqId,
              path: deletedPath,
              success: delSuccess,
              error: delError,
            } = msg.data;
            const delPending = pendingRequests.get(delReqId);
            if (delPending) {
              clearTimeout(delPending.timer);
              pendingRequests.delete(delReqId);

              if (delSuccess) {
                try {
                  const existingUpload = await uploadService.getUploadByDeviceAndPath(
                    delPending.deviceId,
                    deletedPath,
                  );
                  if (existingUpload?.s3Url) {
                    await s3Service.deleteObjectFromS3(existingUpload.s3Url);
                  }
                  await uploadService.deleteUploadByPath(
                    delPending.deviceId,
                    deletedPath,
                  );
                } catch (err) {
                  Logger.warn("Failed to clean up S3 object after delete", err);
                }
              }

              if (delPending.frontendWs.readyState === WebSocket.OPEN) {
                delPending.frontendWs.send(
                  JSON.stringify({
                    type: "delete_complete",
                    data: { path: deletedPath, success: delSuccess, error: delError },
                  }),
                );
              }
              Logger.info(
                `Delete ${delSuccess ? "succeeded" : "failed"} for ${deletedPath} (${delReqId})`,
              );
            }
            break;
          }

          case "heartbeat": {
            ws.isAlive = true;
            if (ws.deviceId) {
              await clientService.updateLastSeen(ws.deviceId);
            }
            break;
          }
        }
      } catch (err) {
        Logger.error("WebSocket message error:", err);
      }
    });

    ws.on("close", async () => {
      if (ws.clientType === "frontend") {
        frontendSockets.delete(ws);
        Logger.info("Frontend dashboard disconnected");
      } else if (ws.clientType === "client" && ws.deviceId) {
        clientSockets.delete(ws.deviceId);
        await clientService.setClientOffline(ws.deviceId);
        await broadcastToFrontends();
        Logger.info(`Client disconnected: ${ws.deviceId}`);
      }
    });
  });

  Logger.info("WebSocket server initialized");
};
