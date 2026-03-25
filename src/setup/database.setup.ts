import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { UserEntity, TokenEntity, ClientEntity } from "@/entities";
import "dotenv/config";
import { Env } from "@/env";

export const AppDataSource = new DataSource({
  type: "mysql",
  database: Env.dbName,
  host: Env.host,
  username: Env.username,
  password: Env.password,
  port: Env.dbPort,
  logging: false,
  synchronize: true,
  entities: [UserEntity, TokenEntity, ClientEntity],
  entitySkipConstructor: true,
  namingStrategy: new SnakeNamingStrategy(),
});
