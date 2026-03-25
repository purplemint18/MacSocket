import { MESSAGE } from "@/consts";
import { UserEntity } from "@/entities";
import { Env } from "@/env";
import { NotFoundError, UnauthorizedError } from "@/errors";
import { userService } from "@/services";
import { CommonRequest, ResetTokenType } from "@/types/authReq.type";
import { encryptPassword, errorHandlerWrapper } from "@/utils";
import { Response } from "express";
import httpStatus from "http-status";
import jwt from "jsonwebtoken";

const resetPasswordHandler = async (
  req: CommonRequest,
  res: Response
): Promise<void> => {
  const { password } = req.body;
  const { token } = req.params;
  const { secretKey } = Env;
  const { email } = jwt.verify(token, secretKey) as ResetTokenType;
  const user: UserEntity = await userService.getOneUser({ email });
  if (!user) throw new NotFoundError(MESSAGE.ERROR.USER_DOES_NOT_EXIST);
  if (user.deletedAt)
    throw new UnauthorizedError(MESSAGE.ERROR.ACCOUNT_HAS_BEEN_DISABLED);
  const hashPassword = await encryptPassword(password);
  await userService.resetPassword({ email, password: hashPassword });

  res
    .json({ message: MESSAGE.RESPONSE.RESET_PASSWORD_SUCCESS })
    .status(httpStatus.OK);
};

export const resetPasswordController =
  errorHandlerWrapper(resetPasswordHandler);
