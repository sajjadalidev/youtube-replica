import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "./../models/user.models.js";
import { uploadOnCloudniany } from "../utils/cloudinary.js";

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

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

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
    coverImage: coverImage.url || "",
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
  res.status(200).json({
    message: "User login successfully!",
  });
});

export { userRegister, userLogin };
