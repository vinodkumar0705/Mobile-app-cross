import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { AuthValidators } from "../validators/auth.validators";
import { authenticate } from "../middlewares/auth.middleware";

export const AuthRouter = Router();
AuthRouter.post("/signup", AuthValidators.signupValidator, AuthController.signup);
AuthRouter.post("/signin", AuthValidators.signinValidator, AuthController.signin);
AuthRouter.post("/logout", AuthController.logout);
AuthRouter.get("/me", authenticate, AuthController.me);
