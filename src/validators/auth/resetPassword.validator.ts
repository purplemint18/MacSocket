import { MESSAGE } from "@/consts";
import { body } from "express-validator";

export const resetPasswordValidator = () => {
  return [
    body("passsword").notEmpty().withMessage(MESSAGE.VALIDATION.PASSWORD_IS_REQUIRED),
  ];
};
