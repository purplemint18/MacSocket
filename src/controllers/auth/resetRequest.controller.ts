import { MESSAGE } from "@/consts";
import { CommonRequest } from "@/types/authReq.type";
import { errorHandlerWrapper, sendResetEmail } from "@/utils";
import { generateResetToken } from "@/utils/generateToken";
import { Response } from "express";
import httpStatus from "http-status";

const resetRequestHandler = async (
  req: CommonRequest,
  res: Response
): Promise<void> => {
  const { email } = req.body;
  const token = generateResetToken(email);
  sendResetEmail(email, token);

  res
    .json({ message: MESSAGE.RESPONSE.RESET_REQUEST_SUBMITTED })
    .status(httpStatus.OK);
};

export const resetRequestController = errorHandlerWrapper(resetRequestHandler);
