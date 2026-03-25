import { MESSAGE } from "@/consts";
import { body } from "express-validator";

export const resetRequestValidator = () => {
  return [
    body("email").notEmpty().withMessage(MESSAGE.VALIDATION.EMAIL_IS_REQUIRED),
  ];
};
