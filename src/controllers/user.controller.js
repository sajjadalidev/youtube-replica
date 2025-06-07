import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "./../models/user.models.js";
import { uploadOnCloudniany } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { mongoose } from "mongoose";

// Utils function to get access & Referesh token
const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generaterefreshToken();
    user.refreshToken = refreshToken;
    // as we don't have password and other required fields that why we are using validateBefore SAVE as false
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("🚀 ~ generateAccessAndRefreshTokens ~ error:", error);
    throw new ApiError(
      500,
      "Something went wrong while generating refersh and access token"
    );
  }
};

const userRegister = asyncHandler(async (req, res) => {
  //Step #01 : Get uer details from user(from FE)
  const { username, email, password, fullName } = req.body;
  // Step #02: Validation - non-empty
  if (
    [fullName, email, username, password].some((field) => field?.trim === "")
  ) {
    throw new ApiError(400, `All fields are required!`);
  }
  // Step #03 check user already exist or not
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "Username or email Already exist!");
  }

  // const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  // we need to check avatar & cover image with custom check either user give these imput or not

  let avatarLocalPath;
  let coverImageLocalPath;

  if (req.files && Array.isArray(req.files.avatar)) {
    avatarLocalPath = req.files.avatar[0].path;
  }
  if (req.files && Array.isArray(req.files.coverImage)) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  //STEP #04 Check required avatar path
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // STEP #05: Upload Images to cloudinary
  const avatar = await uploadOnCloudniany(avatarLocalPath);
  const coverImage = await uploadOnCloudniany(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required!");
  }

  const newUser = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Select helps us to remove fields from object
  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered successfully!"));
});

const userLogin = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  //Step #01 check email/username
  if (!(username || email)) {
    throw new ApiError(400, "Username or email is required!");
  }

  //Step #02 check existing user in the db
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });

  if (!existingUser) {
    throw new ApiError(400, "User doest not exist");
  }

  // Step #03 Check password valid or not
  const isPasswordValid = await existingUser.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Password does not match!");
  }

  //Step #04 generate access & refresh token

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    existingUser._id
  );

  // Optional Step to hit DB operation again
  const loggedInUser = await User.findById(existingUser._id).select(
    "-password -refreshToken"
  );

  // Set Data in cookies

  const options = {
    httpOnly: true,
    secure: true,
  };

  let userData = { user: loggedInUser, accessToken, refreshToken };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, userData, "User loggedin Successfully"));
});

const userLogout = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined, // if with undefined not work : use 1
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Step #01: Check if current password is provided
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current and new passwords are required!");
  }

  // Step #02: Check if user exists
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  // Step #03: Validate current password
  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(400, "Current password is incorrect!");
  }

  // Step #04: Update password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  // Step #01: Get user from the request
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully!"));
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  // Step #01: Validate input
  if ([fullName, email].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required!");
  }
  // Step #02: Check if user exists
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email: email.toLowerCase(),
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile updated successfully!"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  // Step #01: Check if avatar file is provided
  if (!req.file) {
    throw new ApiError(400, "Avatar file is required!");
  }
  const avatarLocalPath = req.file.path;
  // Step #02: Upload avatar to Cloudinary
  const avatar = await uploadOnCloudniany(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Failed to upload avatar!");
  }
  // Step #03: Update user avatar in the database
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // Step #01: Check if avatar file is provided
  if (!req.file) {
    throw new ApiError(400, "Avatar file is required!");
  }
  const coverImageLocalPath = req.file.path;
  // Step #02: Upload avatar to Cloudinary
  const coverImage = await uploadOnCloudniany(coverImageLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Failed to upload coverImage!");
  }
  // Step #03: Update user avatar in the database
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  // Step #01: Validate username
  if (!username) {
    throw new ApiError(400, "Username is required!");
  }
  // Step #02: Fetch user channel profile
  const channel = await User.aggregate([
    { $match: { username: username?.toLowerCase() } },
    {
      $lookup: {
        from: "subscriptions ", // collection name in MongoDB
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions", // collection name in MongoDB
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedToChannels",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        subscribedToChannelsCount: { $size: "$subscribedToChannels" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        password: 0,
        refreshToken: 0, // 0 mean exclude this field & 1 mean to include this field
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "User channel does not exist!");
  }
  // Step #03: Return user channel profile
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channel[0],
        "User channel profile fetched successfully!"
      )
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const username = req.params.username;
  // write code to get user
  const user = await User.find({ username }).select("-password -refreshToken");
  // Step #01: Fetch user watch history
  const watchHistory = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(user?._id) } },
    {
      $lookup: {
        from: "videos", // collection name in MongoDB
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users", // collection name in MongoDB
              localField: "user",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $arrayElemAt: ["$owner", 0] }, // Get the first element of the owner array
            },
          },
        ],
      },
    },
  ]);
  if (!watchHistory?.length) {
    throw new ApiError(404, "Watch history not found!");
  }
  // Step #02: Return user watch history
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "User watch history fetched successfully!"
      )
    );
});

export {
  userRegister,
  userLogin,
  userLogout,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserProfile,
  updateAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
};
