import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity("upload")
export class UploadEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  os: string;

  @Column({ type: "varchar" })
  deviceId: string;

  @Column({ type: "varchar", length: 1024 })
  url: string;

  @Column({ type: "varchar", length: 1024, nullable: true })
  s3Url: string;

  @Column({ type: "bigint" })
  fileSize: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
