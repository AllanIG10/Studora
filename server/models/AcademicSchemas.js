import mongoose from "mongoose";

export const timetableEntrySchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Subject cannot exceed 100 characters."],
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid start time."],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid end time."],
    },
    room: { type: String, trim: true, maxlength: [80, "Room cannot exceed 80 characters."] },
    instructor: { type: String, trim: true, maxlength: [100, "Instructor cannot exceed 100 characters."] },
  },
  { _id: true }
);

export const imageFileSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true, select: false },
    contentType: {
      type: String,
      enum: ["image/jpeg", "image/png", "image/webp"],
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      maxlength: [120, "Image filename cannot exceed 120 characters."],
    },
  },
  { _id: false }
);
