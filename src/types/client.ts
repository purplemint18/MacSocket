export interface Client {
  id: number;
  deviceId: string;
  osType: string;
  publicIp: string;
  username: string;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeen: string;
}
