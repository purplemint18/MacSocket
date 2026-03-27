import { EnvType } from "@/types";
import "dotenv/config";

const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const Env: EnvType = {
  host: required(process.env.DB_HOST, "DB_HOST"),
  username: required(process.env.DB_USERNAME, "DB_USERNAME"),
  password: required(process.env.DB_PASSWORD, "DB_PASSWORD"),
  port: Number(process.env.PORT) || 8000,
  dbPort: Number(process.env.DB_PORT) || 3306,
  dbName: required(process.env.DB_NAME, "DB_NAME"),
  secretKey: required(process.env.SECRET_KEY, "SECRET_KEY"),
  expiresIn: Number(process.env.EXPIRE_TIME) || 3600,
  emailAddress: required(process.env.EMAIL_ADDRESS, "EMAIL_ADDRESS"),
  emailPassword: required(process.env.EMAIL_PASSWORD, "EMAIL_PASSWORD"),
  serverAddress: process.env.SERVER_ADDRESS || "localhost",
  resetUrl: required(process.env.RESET_URL, "RESET_URL"),
  awsRegion: required(process.env.AWS_REGION, "AWS_REGION"),
  awsAccessKeyId: required(process.env.AWS_ACCESS_KEY_ID, "AWS_ACCESS_KEY_ID"),
  awsSecretAccessKey: required(
    process.env.AWS_SECRET_ACCESS_KEY,
    "AWS_SECRET_ACCESS_KEY",
  ),
  awsS3Bucket: required(process.env.AWS_S3_BUCKET, "AWS_S3_BUCKET"),
  awsPresignedUrlTtlSeconds: Number(process.env.AWS_PRESIGNED_URL_TTL_SECONDS) || 900,
};
