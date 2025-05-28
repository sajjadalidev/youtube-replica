import { Schema, model } from "mongoose";

const hospitalSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine1: {
      type: String,
    },
    city: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    specialisedIn: [{ type: String }],
  },
  { timestamps: true }
);

export const Hospital = model("Hospital", hospitalSchema);
