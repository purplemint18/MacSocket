import { authController } from "@/controllers";
import { Env } from "@/env";
import { checkAuth } from "@/utils/checkAuth";
import { authValidator } from "@/validators";
import { Router } from "express";

const authRouter = Router();
/**
 * @swagger
 * /api/auth/he
 */
authRouter.post(
  "/login",
  authValidator.loginValidator(),
  authController.loginController
);

authRouter.post(
  "/register",
  authValidator.registerValidator(),
  authController.registerController
);

authRouter.get(
  "/logout",
  checkAuth,
  authController.logoutController
);

authRouter.post(
  "/reset_request",
  authValidator.resetRequestValidator(),
  authController.resetRequestController
);

authRouter.post(
  `${Env.resetUrl}/:token`,
  authValidator.resetPasswordValidator(),
  authController.resetPasswordController
);

export default authRouter;
