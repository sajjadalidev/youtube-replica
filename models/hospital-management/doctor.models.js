import { Schema, model } from "mongoose";

const doctorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    salary: {
      type: Number,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    qualification: {
      type: String,
      required: true,
    },
    expereinceInYears: [{ type: Schema.Types.ObjectId, ref: "Hospital" }],
  },
  { timestamps: true }
);

export const Doctor = model("Doctor", doctorSchema);
