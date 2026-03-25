import { Env } from "@/env";
import { Request, Response, NextFunction } from "express";

import { Logger } from "@/utils";

export const routeMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.path !== "/health") {
    Logger.group({
      title: "New Request",
      descriptions: [
        {
          description: "URL",
          info: `${req.protocol}://${req.hostname}:${Env.port}${req.url}`,
        },
        {
          description: "PARAMS",
          info: req.params,
        },
        {
          description: "QUERY",
          info: req.query,
        },
        {
          description: "BODY",
          info: JSON.stringify(req.body),
        },
      ],
    });
  }
  next();
};
