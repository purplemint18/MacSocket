import express, { Express, Request, Response } from "express";
import { createServer } from "http";
import cors from "cors";
import { json as bodyParser } from "body-parser";
import { Env } from "@/env";
import { Logger } from "@/utils";
import { MESSAGE } from "@/consts";
import appRouter from "@/routers";
import { errorHandlerMiddleware, routeMiddleware } from "@/middlewares";
import swaggerUi from "swagger-ui-express";
import swaggerConfig from "@/swaggerConfig";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { websocketSetup } from "./websocket.setup";

export const backendSetup = () => {
  const app: Express = express();
  const limiter: RateLimitRequestHandler = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: MESSAGE.SERVER.TOO_MANY_REQUEST,
  });

  app.use(limiter);

  app.use(cors());
  app.use(bodyParser());

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerConfig));

  app.use(routeMiddleware);

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health Check
   *     description: Checks the health of the server.
   *     responses:
   *       200:
   *         description: Server is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Hello World!
   */
  app.use("/health", (_req: Request, res: Response) =>
    res.send(MESSAGE.SERVER.HELLO_WORLD)
  );

  app.use("/api", appRouter);

  app.use(errorHandlerMiddleware);

  const { port } = Env;

  const server = createServer(app);

  websocketSetup(server);

  server.listen(port, () => {
    Logger.info(MESSAGE.SERVER.STARTING_SUCCESS);
  });
};
