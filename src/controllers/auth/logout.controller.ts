import { MESSAGE } from "@/consts";
import { UnauthorizedError } from "@/errors";
import { tokenService } from "@/services";
import { CommonRequest } from "@/types/authReq.type";
import { errorHandlerWrapper } from "@/utils";
import { Response } from "express";
import httpStatus from "http-status";

const logoutHandler = async (
  req: CommonRequest,
  res: Response
): Promise<void> => {
  const bearerToken = req.headers.authorization;
  if (!bearerToken)
    throw new UnauthorizedError(MESSAGE.ERROR.TOKEN_DOES_NOT_EXIST);
  const token = bearerToken.replace("Bearer ", "");
  await tokenService.invalidateToken(token);

  res.status(httpStatus.OK).json({ message: MESSAGE.RESPONSE.LOGOUT_SUCCESS });
};

export const logoutController = errorHandlerWrapper(logoutHandler);
