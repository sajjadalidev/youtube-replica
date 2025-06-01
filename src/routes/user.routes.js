import { Router } from "express";

import {
  userLogin,
  userRegister,
  userLogout,
} from "../controllers/user.controller.js";
import { upload } from "./../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  //middleware to upload files
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 2 },
  ]),
  userRegister
);

router.route("/login").post(userLogin);

//secured routes

router.route("/logout").post(verifyJWT, userLogout);
export default router;
