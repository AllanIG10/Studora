import mongoose from "mongoose";

const studentServicesSchema = new mongoose.Schema(
  {
    attendance: [{
      date: { type: String, required: true, trim: true, maxlength: 10 },
      subject: { type: String, required: true, trim: true, maxlength: 100 },
      presentCount: { type: Number, required: true, min: 0 },
      totalCount: { type: Number, required: true, min: 1 },
    }],
    campusMap: [{
      name: { type: String, required: true, trim: true, maxlength: 100 },
      description: { type: String, required: true, trim: true, maxlength: 300 },
    }],
    campusMapLocation: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "Adithya Institute of Technology, Coimbatore",
    },
    fees: [{
      title: { type: String, required: true, trim: true, maxlength: 100 },
      amount: { type: Number, required: true, min: 0 },
      dueDate: { type: String, required: true, trim: true, maxlength: 10 },
      details: { type: String, required: true, trim: true, maxlength: 300 },
    }],
    homework: [{
      title: { type: String, required: true, trim: true, maxlength: 100 },
      subject: { type: String, required: true, trim: true, maxlength: 100 },
      dueDate: { type: String, required: true, trim: true, maxlength: 10 },
      details: { type: String, required: true, trim: true, maxlength: 300 },
    }],
    transport: [{
      route: { type: String, required: true, trim: true, maxlength: 100 },
      pickupTime: { type: String, required: true, trim: true, maxlength: 30 },
      stops: { type: String, required: true, trim: true, maxlength: 500 },
    }],
  },
  { _id: false }
);

const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    institution: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: "Studora",
    },
    emailNotifications: { type: Boolean, default: true },
    weeklyReports: { type: Boolean, default: false },
    studentServices: {
      type: studentServicesSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export default mongoose.model("SystemSettings", systemSettingsSchema);
