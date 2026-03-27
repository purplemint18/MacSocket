export type EnvType = {
  dbPort: number;
  dbName: string;
  host: string;
  username: string;
  password: string;
  port: number;
  secretKey: string;
  expiresIn: number;
  emailAddress: string;
  emailPassword: string;
  serverAddress: string;
  resetUrl: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsS3Bucket: string;
  awsPresignedUrlTtlSeconds: number;
}