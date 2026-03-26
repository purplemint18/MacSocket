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

export interface DriveInfo {
  name: string;
  path: string;
  total_bytes?: number;
  used_bytes?: number;
  free_bytes?: number;
}
