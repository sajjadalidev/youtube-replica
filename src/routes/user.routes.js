import { Router } from "express";

import {
  userLogin,
  userRegister,
  userLogout,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserProfile,
  updateAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
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
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-user-profile").patch(verifyJWT, updateUserProfile);
router
  .route("/user-avatar/update")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
  .route("/user-cover-image/update")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router
  .route("/user-channel-profile/:username")
  .get(verifyJWT, getUserChannelProfile);
router.route("/user-watch-history").get(verifyJWT, getUserWatchHistory);

export default router;
