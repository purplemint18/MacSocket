import { MESSAGE } from "@/consts";
import { ArgumentValidationError } from "@/errors";
import { CommonRequest } from "@/types/authReq.type";
import { NextFunction, Response } from "express";
import { ValidationError, validationResult } from "express-validator";

export const errorHandlerWrapper = (
  func: (req: CommonRequest, res: Response, next: NextFunction) => void
) => {
  return async (req: CommonRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ArgumentValidationError(
          MESSAGE.ERROR.LOGIN_VALUES_ARE_INVALID,
          errors.array().map((error: ValidationError) => error.msg)
        );
      }
      await func(req, res, next);
    } catch (err: unknown) {
      next(err);
    }
  };
};
