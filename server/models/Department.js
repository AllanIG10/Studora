import mongoose from "mongoose";
import { imageFileSchema, timetableEntrySchema } from "./AcademicSchemas.js";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required."],
      trim: true,
      maxlength: [100, "Department name cannot exceed 100 characters."],
      unique: true,
    },
    head: {
      type: String,
      required: [true, "Department head is required."],
      trim: true,
      maxlength: [100, "Department head cannot exceed 100 characters."],
    },
    timetable: {
      type: [timetableEntrySchema],
      default: [],
      validate: {
        validator: (entries) => entries.length <= 60,
        message: "A timetable cannot contain more than 60 entries.",
      },
    },
    timetableConfigured: { type: Boolean, default: false },
    timetableImage: {
      type: imageFileSchema,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
