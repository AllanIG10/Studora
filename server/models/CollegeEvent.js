import mongoose from "mongoose";
import { imageFileSchema } from "./AcademicSchemas.js";

const collegeEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required."],
      trim: true,
      maxlength: [100, "Event title cannot exceed 100 characters."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Event description cannot exceed 2000 characters."],
      default: "",
    },
    location: {
      type: String,
      trim: true,
      maxlength: [150, "Event location cannot exceed 150 characters."],
      default: "",
    },
    poster: { type: imageFileSchema, default: null },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("CollegeEvent", collegeEventSchema);
