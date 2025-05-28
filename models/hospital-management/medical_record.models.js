import { Schema, model } from "mongoose";

const medicalReportSchema = new Schema({}, { timestamps: true });

export const MedicalRecord = model("MedicalRecord", medicalReportSchema);
