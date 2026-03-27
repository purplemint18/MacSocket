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

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number | null;
  modified: string | null;
  uploaded?: boolean;
  s3_url?: string | null;
}
