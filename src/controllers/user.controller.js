import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "./../models/user.models.js";
import { uploadOnCloudniany } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// Utils function to get access & Referesh token
const generateAccessAndRefreshTokens = async (userId) => {
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

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
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
        refreshToken: undefined,
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
  const { incomingRefreshToken } = req.cookies || req.body;
  // Step #00: Check if refresh token is present
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request, login first!");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    // Step #01: Check if refresh token is valid
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token!");
    }
    // Step #01.1: Check if refresh token is valid
    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, " Refresh token is invalid!");
    }

    // Step #02: Generate new access token
    const { accessToken, refreshToken } =
      await user.generateAccessAndRefreshTokens();
    if (!accessToken) {
      throw new ApiError(
        500,
        "Something went wrong while generating access token"
      );
    }
    // Step #03: Send response with new access token
    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
      })
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "Something went wrong while refreshing token");
  }
});
export { userRegister, userLogin, userLogout, refreshAccessToken };
