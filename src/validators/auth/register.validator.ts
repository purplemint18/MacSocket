import { MESSAGE } from "@/consts";
import { body } from "express-validator";

export const registerValidator = () => {
  return [
    body("username")
      .notEmpty()
      .withMessage(MESSAGE.VALIDATION.NAME_IS_REQUIRED),
    body("email")
      .notEmpty()
      .withMessage(MESSAGE.VALIDATION.EMAIL_IS_REQUIRED)
      .isEmail()
      .withMessage(MESSAGE.VALIDATION.INVALID_EMAIL),
    body("password")
      .notEmpty()
      .withMessage(MESSAGE.VALIDATION.PASSWORD_IS_REQUIRED),
  ];
};
