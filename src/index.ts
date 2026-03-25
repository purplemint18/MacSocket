import { MESSAGE } from "./consts";
import { AppDataSource, backendSetup } from "./setup";
import { Logger, dbCreate } from "./utils";

const setupServer = async () => {
  try {
    await dbCreate();
    Logger.info(MESSAGE.DATABASE.MIGARATION_SUCCESS);
    await AppDataSource.initialize();
    Logger.info(MESSAGE.DATABASE.CONNECTION_SUCCESS);
  } catch (error) {
    Logger.info(MESSAGE.DATABASE.CONNECTION_FAILURE);
    Logger.error(error);

    process.exit(0);
  }

  try {
    await backendSetup();
  } catch (error) {
    Logger.info(MESSAGE.SERVER.STARTING_FAILURE);
    Logger.error(error);
  }
};

setupServer();
