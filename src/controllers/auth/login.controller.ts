import { MESSAGE } from "@/consts";
import { UnauthorizedError } from "@/errors";
import { userService } from "@/services";
import { CommonRequest } from "@/types/authReq.type";
import { comparePassword, errorHandlerWrapper } from "@/utils";
import { generateToken } from "@/utils";
import { Response } from "express";
import httpStatus from "http-status";

export const loginHandler = async (
  req: CommonRequest,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  const findUser = await userService.getOneUser({ email });
  if (!findUser)
    throw new UnauthorizedError(MESSAGE.ERROR.EMAIL_OR_PASSWORD_IS_INCORRECT);
  if (findUser.deletedAt)
    throw new UnauthorizedError(MESSAGE.ERROR.ACCOUNT_HAS_BEEN_DISABLED);
  const compare = await comparePassword(password, findUser.password);
  if (!compare)
    throw new UnauthorizedError(MESSAGE.ERROR.EMAIL_OR_PASSWORD_IS_INCORRECT);
  const token = generateToken(findUser.uuid);

  res.json({ token }).status(httpStatus.ACCEPTED);
};

export const loginController = errorHandlerWrapper(loginHandler);
