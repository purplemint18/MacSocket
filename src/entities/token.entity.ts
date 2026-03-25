// src/entities/Token.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("token")
export class TokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "token" })
  token: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
