import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const uploadOnCloudniany = async (localFilePath) => {
  if (!localFilePath) return null;

  // Configuration
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
  });

  try {
    // Upload an image
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // console.log("File is uploaded on Cloudinary", uploadResult.url);
    // console.log("uploadResult", uploadResult);
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return uploadResult;
  } catch (error) {
    console.error("Upload Error:", error);
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    throw error; // rethrow error for further handling
    return null;
  }
};

export { uploadOnCloudniany };
