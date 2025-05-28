import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    username: {
      required: true,
      type: String,
      unique: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "password is required!"],
    },
  },
  { timestamps: true }
);

export const User = model("User", userSchema);
