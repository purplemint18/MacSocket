import { UploadEntity } from "@/entities";
import { AppDataSource } from "@/setup";
import { Repository } from "typeorm";

export const createUpload = async (data: {
  os: string;
  deviceId: string;
  url: string;
  s3Url: string;
  fileSize: number;
}): Promise<UploadEntity> => {
  const repo: Repository<UploadEntity> =
    AppDataSource.getRepository(UploadEntity);

  const existing = await repo.findOne({
    where: { deviceId: data.deviceId, url: data.url },
  });

  if (existing) {
    existing.s3Url = data.s3Url;
    existing.fileSize = data.fileSize;
    existing.os = data.os;
    return await repo.save(existing);
  }

  const upload = repo.create(data);
  return await repo.save(upload);
};

export const getUploadsByDeviceAndPaths = async (
  deviceId: string,
  paths: string[],
): Promise<UploadEntity[]> => {
  if (paths.length === 0) return [];

  const repo: Repository<UploadEntity> =
    AppDataSource.getRepository(UploadEntity);

  return await repo
    .createQueryBuilder("upload")
    .where("upload.device_id = :deviceId", { deviceId })
    .andWhere("upload.url IN (:...paths)", { paths })
    .getMany();
};

export const getUploadByDeviceAndPath = async (
  deviceId: string,
  url: string,
): Promise<UploadEntity | null> => {
  const repo: Repository<UploadEntity> =
    AppDataSource.getRepository(UploadEntity);
  return await repo.findOne({ where: { deviceId, url } });
};

export const deleteUploadByPath = async (
  deviceId: string,
  url: string,
): Promise<void> => {
  const repo: Repository<UploadEntity> =
    AppDataSource.getRepository(UploadEntity);
  await repo.delete({ deviceId, url });
};
