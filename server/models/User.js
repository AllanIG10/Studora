import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters."],
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: [254, "Email address cannot exceed 254 characters."],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."],
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "student"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active"],
      default: "pending",
      required: true,
    },
    department: {
      type: String,
      trim: true,
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
