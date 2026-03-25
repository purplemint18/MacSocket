import { ClientEntity } from "@/entities";
import { AppDataSource } from "@/setup";
import { Repository } from "typeorm";

export const upsertClient = async (data: {
  deviceId: string;
  osType: string;
  publicIp: string;
  username: string;
}): Promise<ClientEntity> => {
  const repo: Repository<ClientEntity> =
    AppDataSource.getRepository(ClientEntity);
  let client = await repo.findOne({ where: { deviceId: data.deviceId } });

  if (client) {
    client.osType = data.osType;
    client.publicIp = data.publicIp;
    client.username = data.username;
    client.isOnline = true;
    client.lastSeen = new Date();
  } else {
    client = repo.create({
      ...data,
      isOnline: true,
      lastSeen: new Date(),
    });
  }

  return await repo.save(client);
};

export const setClientOffline = async (deviceId: string): Promise<void> => {
  const repo: Repository<ClientEntity> =
    AppDataSource.getRepository(ClientEntity);
  await repo.update({ deviceId }, { isOnline: false, lastSeen: new Date() });
};

export const getAllClients = async (): Promise<ClientEntity[]> => {
  const repo: Repository<ClientEntity> =
    AppDataSource.getRepository(ClientEntity);
  return await repo.find({ order: { isOnline: "DESC", lastSeen: "DESC" } });
};

export const getClientByDeviceId = async (
  deviceId: string
): Promise<ClientEntity | null> => {
  const repo: Repository<ClientEntity> =
    AppDataSource.getRepository(ClientEntity);
  return await repo.findOne({ where: { deviceId } });
};

export const updateLastSeen = async (deviceId: string): Promise<void> => {
  const repo: Repository<ClientEntity> =
    AppDataSource.getRepository(ClientEntity);
  await repo.update({ deviceId }, { lastSeen: new Date() });
};
