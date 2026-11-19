import mongoose from "mongoose";
import { imageFileSchema, timetableEntrySchema } from "./AcademicSchemas.js";

const examResultSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true,
      maxlength: [20, "Academic year cannot exceed 20 characters."],
    },
    examName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [80, "Exam name cannot exceed 80 characters."],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Subject cannot exceed 100 characters."],
    },
    marksObtained: { type: Number, required: true, min: 0 },
    maximumMarks: { type: Number, required: true, min: 0.01 },
    grade: { type: String, trim: true, maxlength: [10, "Grade cannot exceed 10 characters."] },
  },
  { _id: true }
);

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name is required."],
      trim: true,
      maxlength: [100, "Student name cannot exceed 100 characters."],
    },
    email: {
      type: String,
      required: [true, "Email address is required."],
      trim: true,
      lowercase: true,
      maxlength: [254, "Email address cannot exceed 254 characters."],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."],
      unique: true,
    },
    department: {
      type: String,
      required: [true, "Department is required."],
      trim: true,
    },
    profileEditStartedAt: {
      type: Date,
      default: Date.now,
    },
    profileEditCounts: {
      type: [{ type: Number, min: 0, max: 2 }],
      default: () => Array(8).fill(0),
      validate: {
        validator: (counts) =>
          counts.length === 8 &&
          counts.every((count) => Number.isInteger(count) && count >= 0 && count <= 2),
        message: "Student profile edit limits are invalid.",
      },
    },
    profileEditTotalCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 16,
    },
    timetable: {
      type: [timetableEntrySchema],
      default: [],
      validate: {
        validator: (entries) => entries.length <= 60,
        message: "A timetable cannot contain more than 60 entries.",
      },
    },
    timetableImage: {
      type: imageFileSchema,
      default: null,
    },
    examResults: {
      type: [examResultSchema],
      default: [],
      validate: {
        validator: (results) => results.length <= 500,
        message: "A student cannot have more than 500 exam results.",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Student", studentSchema);
