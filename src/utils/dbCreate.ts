import { Env } from "@/env";
import { DataSourceOptions } from "typeorm";
import { createDatabase } from "typeorm-extension";
export const dbCreate = async (): Promise<void> => {
  await createDatabase({
    ifNotExist: true,
    options: {
      type: "mysql",
      host: Env.host,
      username: Env.username,
      password: Env.password,
      port: Env.dbPort,
      database: Env.dbName,
    },
  });
};
