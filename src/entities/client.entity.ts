import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("client")
export class ClientEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", unique: true })
  deviceId: string;

  @Column({ type: "varchar" })
  osType: string;

  @Column({ type: "varchar" })
  publicIp: string;

  @Column({ type: "varchar" })
  username: string;

  @Column({ type: "boolean", default: false })
  isOnline: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  lastSeen: Date;
}
