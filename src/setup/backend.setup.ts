import express, { Express, Request, Response } from "express";
import { createServer } from "http";
import cors from "cors";
import { json as bodyParser } from "body-parser";
import { Env } from "@/env";
import { Logger } from "@/utils";
import { MESSAGE } from "@/consts";
import appRouter from "@/routers";
import { errorHandlerMiddleware, routeMiddleware } from "@/middlewares";
import { s3Service } from "@/services";
import swaggerUi from "swagger-ui-express";
import swaggerConfig from "@/swaggerConfig";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { websocketSetup } from "./websocket.setup";

export const backendSetup = () => {
  const app: Express = express();
  app.set('trust proxy', 1);
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

  app.get("/api/s3-download", async (req: Request, res: Response) => {
    try {
      const key = typeof req.query.key === "string" ? req.query.key : "";
      if (!key) {
        return res.status(400).json({ message: "Missing key query parameter" });
      }
      const signedUrl = await s3Service.getPresignedDownloadUrl(key);
      return res.redirect(signedUrl);
    } catch (error) {
      Logger.error("Failed to create S3 download URL", error);
      return res.status(500).json({ message: "Failed to generate download URL" });
    }
  });

  app.use("/api", appRouter);

  app.use(errorHandlerMiddleware);

  const { port } = Env;

  const server = createServer(app);

  websocketSetup(server);

  server.listen(port, () => {
    Logger.info(MESSAGE.SERVER.STARTING_SUCCESS);
  });
};
