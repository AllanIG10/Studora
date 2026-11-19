import "dotenv/config";
import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "./db.js";
import { createAuthToken, requireAuth, requireRole, serializeUser } from "./auth.js";
import CollegeEvent from "./models/CollegeEvent.js";
import Department from "./models/Department.js";
import Student from "./models/Student.js";
import SystemSettings from "./models/SystemSettings.js";
import User from "./models/User.js";

const app = express();
app.use(helmet());
app.use(express.json({ limit: "20kb" }));

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "production" ? 10 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 10, fieldSize: 10000 },
  fileFilter: (_request, file, callback) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return callback(null, true);
    }
    const error = new Error("Upload a JPEG, PNG, or WebP image.");
    error.status = 400;
    callback(error);
  },
});

const parseImageFile = (fieldName) => (request, response, next) => {
  imageUpload.single(fieldName)(request, response, (error) => {
    if (error) return next(error);
    next();
  });
};
const parseTimetableImage = parseImageFile("timetableImage");
const parseEventPoster = parseImageFile("eventPoster");

const getRequestBody = (request) => {
  const body = request.body;
  return body && typeof body === "object" && !Array.isArray(body) ? body : {};
};

const studentServiceFields = {
  attendance: {
    date: { type: "date", maxLength: 10 },
    subject: { type: "string", maxLength: 100 },
    presentCount: { type: "integer", min: 0 },
    totalCount: { type: "integer", min: 1 },
  },
  campusMap: {
    name: { type: "string", maxLength: 100 },
    description: { type: "string", maxLength: 300 },
  },
  fees: {
    title: { type: "string", maxLength: 100 },
    amount: { type: "number", min: 0 },
    dueDate: { type: "date", maxLength: 10 },
    details: { type: "string", maxLength: 300 },
  },
  homework: {
    title: { type: "string", maxLength: 100 },
    subject: { type: "string", maxLength: 100 },
    dueDate: { type: "date", maxLength: 10 },
    details: { type: "string", maxLength: 300 },
  },
  transport: {
    route: { type: "string", maxLength: 100 },
    pickupTime: { type: "string", maxLength: 30 },
    stops: { type: "string", maxLength: 500 },
  },
};

const normalizeStudentServices = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Student portal content must be an object." };
  }

  const normalized = {};
  const mapLocationValue = value.campusMapLocation === undefined
    ? "Adithya Institute of Technology, Coimbatore"
    : value.campusMapLocation;
  if (typeof mapLocationValue !== "string") {
    return { error: "Google Maps location must be text." };
  }
  const mapLocation = mapLocationValue.trim();
  if (!mapLocation || mapLocation.length > 200) {
    return { error: "Enter a valid Google Maps location (up to 200 characters)." };
  }

  for (const [section, fields] of Object.entries(studentServiceFields)) {
    const entries = value[section];
    if (!Array.isArray(entries) || entries.length > 200) {
      return { error: `Provide up to 200 ${section} entries.` };
    }

    normalized[section] = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return { error: `Each ${section} entry must be an object.` };
      }

      const cleanEntry = {};
      for (const [field, rules] of Object.entries(fields)) {
        const rawValue = entry[field];
        if (rules.type === "string" || rules.type === "date") {
          if (typeof rawValue !== "string" || !rawValue.trim() || rawValue.length > rules.maxLength) {
            return { error: `Enter a valid ${field} for each ${section} entry.` };
          }
          const cleanValue = rawValue.trim();
          if (
            rules.type === "date" &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(cleanValue) ||
              Number.isNaN(Date.parse(`${cleanValue}T00:00:00Z`)) ||
              new Date(`${cleanValue}T00:00:00Z`).toISOString().slice(0, 10) !== cleanValue)
          ) {
            return { error: `Enter a valid date for each ${section} entry.` };
          }
          cleanEntry[field] = cleanValue;
          continue;
        }

        const number = Number(rawValue);
        if (!Number.isFinite(number) ||
          (rules.type === "integer" && !Number.isInteger(number)) ||
          number < (rules.min ?? 0)) {
          return { error: `Enter a valid ${field} for each ${section} entry.` };
        }
        cleanEntry[field] = number;
      }

      if (section === "attendance" && cleanEntry.presentCount > cleanEntry.totalCount) {
        return { error: "Present count cannot exceed total count." };
      }
      normalized[section].push(cleanEntry);
    }
  }

  return {
    studentServices: {
      ...normalized,
      campusMapLocation: mapLocation,
    },
  };
};

const toClientDocument = (document) => {
  const value = document.toObject ? document.toObject() : document;
  return { ...value, id: value._id.toString(), _id: undefined, __v: undefined };
};

const PROFILE_EDIT_SEMESTERS = 8;
const PROFILE_EDITS_PER_SEMESTER = 2;
const PROFILE_EDIT_LIMIT = PROFILE_EDIT_SEMESTERS * PROFILE_EDITS_PER_SEMESTER;

const addCalendarMonths = (date, months) => {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0
  )).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
};

const getProfileEditStatus = (student, now = new Date()) => {
  const startedAt = student.profileEditStartedAt;
  let completedSemesters = 0;
  while (
    startedAt &&
    completedSemesters < PROFILE_EDIT_SEMESTERS &&
    now >= addCalendarMonths(startedAt, (completedSemesters + 1) * 6)
  ) {
    completedSemesters += 1;
  }

  const semester = Math.min(completedSemesters + 1, PROFILE_EDIT_SEMESTERS);
  const currentSemesterCount = student.profileEditCounts?.[semester - 1] || 0;
  const totalChangesUsed = student.profileEditTotalCount || 0;
  const isComplete = !startedAt ||
    completedSemesters >= PROFILE_EDIT_SEMESTERS ||
    totalChangesUsed >= PROFILE_EDIT_LIMIT;

  return {
    semester,
    semestersTotal: PROFILE_EDIT_SEMESTERS,
    semestersRemaining: isComplete ? 0 : PROFILE_EDIT_SEMESTERS - semester,
    changesPerSemesterLimit: PROFILE_EDITS_PER_SEMESTER,
    changesUsedThisSemester: currentSemesterCount,
    changesRemainingThisSemester: isComplete
      ? 0
      : Math.max(PROFILE_EDITS_PER_SEMESTER - currentSemesterCount, 0),
    totalChangesUsed,
    totalChangesLimit: PROFILE_EDIT_LIMIT,
    totalChangesRemaining: Math.max(PROFILE_EDIT_LIMIT - totalChangesUsed, 0),
    isComplete,
  };
};

const hasValidImageSignature = (file) => {
  const { buffer, mimetype } = file;
  if (mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  return mimetype === "image/webp" &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";
};

const toImageResponse = (image) => {
  if (!image?.data || !image.contentType) return null;
  return {
    fileName: image.fileName,
    contentType: image.contentType,
    dataUrl: `data:${image.contentType};base64,${image.data.toString("base64")}`,
  };
};

const toCollegeEventResponse = (event) => {
  const value = event.toObject ? event.toObject() : event;
  return {
    ...toClientDocument(value),
    poster: value.poster?.contentType
      ? { contentType: value.poster.contentType, fileName: value.poster.fileName }
      : null,
  };
};

const sanitizeImageFileName = (originalName, fallback) =>
  Array.from(originalName.replace(/[\\/]/g, "_"))
    .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join("")
    .slice(0, 120) || fallback;

const uploadedImage = (file, fallbackName) => ({
  data: file.buffer,
  contentType: file.mimetype,
  fileName: sanitizeImageFileName(file.originalname, fallbackName),
});
const normalizeTimetableEntries = (entries) => {
  if (!Array.isArray(entries) || entries.length > 60) {
    return { error: "Provide up to 60 timetable entries." };
  }
  if (entries.some((entry) => !entry || typeof entry !== "object" || Array.isArray(entry))) {
    return { error: "Timetable entries must be objects." };
  }

  const days = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const timetable = entries.map((entry) => ({
    dayOfWeek: typeof entry.dayOfWeek === "string" ? entry.dayOfWeek.trim() : "",
    subject: typeof entry.subject === "string" ? entry.subject.trim() : "",
    startTime: typeof entry.startTime === "string" ? entry.startTime.trim() : "",
    endTime: typeof entry.endTime === "string" ? entry.endTime.trim() : "",
    room: typeof entry.room === "string" ? entry.room.trim() : "",
    instructor: typeof entry.instructor === "string" ? entry.instructor.trim() : "",
  }));
  if (timetable.some((entry) =>
    !days.has(entry.dayOfWeek) ||
    !entry.subject ||
    !timePattern.test(entry.startTime) ||
    !timePattern.test(entry.endTime) ||
    entry.startTime >= entry.endTime
  )) {
    return { error: "Each timetable entry needs a valid day, subject, and start/end times." };
  }
  return { entries: timetable };
};

const normalizeExamResults = (results) => {
  if (!Array.isArray(results) || results.length > 500) {
    return { error: "Provide up to 500 exam results." };
  }
  if (results.some((result) => !result || typeof result !== "object" || Array.isArray(result))) {
    return { error: "Exam result entries must be objects." };
  }

  const examResults = results.map((result) => ({
    academicYear: typeof result.academicYear === "string" ? result.academicYear.trim() : "",
    examName: typeof result.examName === "string" ? result.examName.trim() : "",
    subject: typeof result.subject === "string" ? result.subject.trim() : "",
    marksObtained: result.marksObtained,
    maximumMarks: result.maximumMarks,
    grade: typeof result.grade === "string" ? result.grade.trim() : "",
  }));
  if (examResults.some((result) =>
    !result.academicYear ||
    !result.examName ||
    !result.subject ||
    typeof result.marksObtained !== "number" ||
    !Number.isFinite(result.marksObtained) ||
    typeof result.maximumMarks !== "number" ||
    !Number.isFinite(result.maximumMarks) ||
    result.marksObtained < 0 ||
    result.maximumMarks <= 0 ||
    result.marksObtained > result.maximumMarks
  )) {
    return { error: "Each exam result needs an academic year, exam, subject, and valid marks." };
  }
  return { entries: examResults };
};

const normalizeCollegeEvent = (body) => {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const startsAt = typeof body.startsAt === "string" ? new Date(body.startsAt) : null;
  const endsAt = typeof body.endsAt === "string" ? new Date(body.endsAt) : null;

  if (!title || title.length > 100) {
    return { error: "Enter an event title (up to 100 characters)." };
  }
  if (description.length > 2000) {
    return { error: "Event description cannot exceed 2000 characters." };
  }
  if (location.length > 150) {
    return { error: "Event location cannot exceed 150 characters." };
  }
  if (!startsAt || Number.isNaN(startsAt.getTime()) || !endsAt || Number.isNaN(endsAt.getTime())) {
    return { error: "Enter valid event start and end dates." };
  }
  if (endsAt <= startsAt) {
    return { error: "Event end date and time must be after the start." };
  }
  return { event: { title, description, location, startsAt, endsAt } };
};

const validateDepartmentExists = async (name) => {
  const exists = await Department.exists({ name });
  if (!exists) {
    const error = new Error("Choose an existing department.");
    error.status = 400;
    throw error;
  }
};

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.get("/api/auth/registration-options", async (_request, response) => {
  const departments = await Department.find().select("name").sort({ name: 1 }).lean();
  response.json(departments);
});

app.post("/api/auth/register", authRateLimit, async (request, response) => {
  const body = getRequestBody(request);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const department = typeof body.department === "string" ? body.department.trim() : "";

  if (!name || name.length > 100) {
    return response.status(400).json({ message: "Enter your name (up to 100 characters)." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ message: "Enter a valid email address." });
  }
  if (password.length < 8 || password.length > 72) {
    return response.status(400).json({ message: "Password must be between 8 and 72 characters." });
  }
  if (!department || !(await Department.exists({ name: department }))) {
    return response.status(400).json({ message: "Choose an available department." });
  }
  if (await User.exists({ email })) {
    return response.status(409).json({ message: "This account is already registered. Please sign in." });
  }

  const existingStudent = await Student.findOne({ email });
  if (
    existingStudent &&
    (existingStudent.name.toLowerCase() !== name.toLowerCase() ||
      existingStudent.department !== department)
  ) {
    return response.status(409).json({
      message: "A student profile with this email already exists. Check your details or contact the administrator.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await User.create({
      name,
      email,
      passwordHash,
      role: "student",
      status: "pending",
      department,
      studentId: existingStudent?._id || null,
    });
  } catch (error) {
    if (error.code === 11000 && (error.keyPattern?.email || error.keyValue?.email)) {
      return response.status(409).json({
        message: "This account is already registered. Please sign in.",
      });
    }
    throw error;
  }

  response.status(202).json({
    message: "Registration request sent. You can sign in after staff approval.",
  });
});

app.post("/api/auth/login", authRateLimit, async (request, response) => {
  const body = getRequestBody(request);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role;
  if (!email || !password) {
    return response.status(400).json({ message: "Enter your email and password." });
  }
  if (role !== "admin" && role !== "student") {
    return response.status(400).json({ message: "Choose Student or Staff sign-in." });
  }

  const user = await User.findOne({ email, role })
    .select("+passwordHash")
    .populate("studentId", "name email department");
  if (!user) {
    return response.status(404).json({
      message: role === "student"
        ? "This email is not registered. Please register as a student."
        : "Staff account not found. Contact the administrator.",
    });
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return response.status(401).json({ message: "Incorrect email or password." });
  }
  if (user.status !== "active") {
    return response.status(403).json({
      message: "Your student registration is pending staff approval. Please try again after it is approved.",
    });
  }

  response.json({
    token: createAuthToken(user),
    user: serializeUser(user),
  });
});

app.get("/api/auth/me", requireAuth, async (request, response) => {
  await request.authUser.populate("studentId", "name email department");
  response.json(serializeUser(request.authUser));
});

app.get("/api/student/portal", requireAuth, requireRole("student"), async (request, response) => {
  const student = await Student.findById(request.authUser.studentId)
    .select("name email department profileEditStartedAt profileEditCounts profileEditTotalCount timetable examResults timetableImage.fileName timetableImage.contentType +timetableImage.data");
  if (!student) {
    return response.status(404).json({ message: "Student profile not found." });
  }
  const [department, availableDepartments, settings] = await Promise.all([
    Department.findOne({ name: student.department })
      .select("timetableConfigured timetable timetableImage.fileName timetableImage.contentType +timetableImage.data"),
    Department.find().select("name").sort({ name: 1 }).lean(),
    SystemSettings.findOne({ key: "global" }).select("studentServices").lean(),
  ]);
  const departmentHasSchedule = department && (
    department.timetableConfigured ||
    department.timetable.length > 0 ||
    department.timetableImage?.data
  );
  response.json({
    ...toClientDocument(student),
    timetable: departmentHasSchedule ? department.timetable : student.timetable,
    timetableImage: toImageResponse(
      departmentHasSchedule ? department.timetableImage : student.timetableImage
    ),
    profileEditing: getProfileEditStatus(student),
    availableDepartments: availableDepartments.map(({ name }) => name),
    studentServices: {
      campusMapLocation: settings?.studentServices?.campusMapLocation ||
        "Adithya Institute of Technology, Coimbatore",
      attendance: settings?.studentServices?.attendance || [],
      campusMap: settings?.studentServices?.campusMap || [],
      fees: settings?.studentServices?.fees || [],
      homework: settings?.studentServices?.homework || [],
      transport: settings?.studentServices?.transport || [],
    },
  });
});

app.put("/api/student/profile", requireAuth, requireRole("student"), async (request, response) => {
  const body = getRequestBody(request);
  const profile = {
    name: typeof body.name === "string" ? body.name.trim() : "",
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    department: typeof body.department === "string" ? body.department.trim() : "",
  };
  if (!profile.name || !profile.email || !profile.department) {
    return response.status(400).json({ message: "Name, email, and department are required." });
  }
  await validateDepartmentExists(profile.department);

  const [student, user] = await Promise.all([
    Student.findById(request.authUser.studentId)
      .select("name email department profileEditStartedAt profileEditCounts profileEditTotalCount"),
    User.findById(request.authUser._id).select("name email department role studentId"),
  ]);
  if (!student || !user || user.role !== "student" || !user.studentId?.equals(student._id)) {
    return response.status(404).json({ message: "Student profile not found." });
  }
  if (
    user.name !== student.name ||
    user.email !== student.email ||
    user.department !== student.department
  ) {
    return response.status(409).json({
      message: "Your account and student profile are out of sync. Contact staff before editing.",
    });
  }

  const profileEditing = getProfileEditStatus(student);
  const hasChanges = profile.name !== student.name ||
    profile.email !== student.email ||
    profile.department !== student.department;
  if (!hasChanges) {
    return response.json({
      profile: toClientDocument(student),
      profileEditing,
    });
  }
  if (profileEditing.isComplete || profileEditing.changesRemainingThisSemester === 0) {
    return response.status(403).json({
      message: profileEditing.isComplete
        ? "Your profile edit allowance has ended."
        : "You have used both profile changes for this semester.",
      profileEditing,
    });
  }

  const [studentEmailInUse, accountEmailInUse] = await Promise.all([
    Student.exists({ email: profile.email, _id: { $ne: student._id } }),
    User.exists({ email: profile.email, _id: { $ne: user._id } }),
  ]);
  if (studentEmailInUse || accountEmailInUse) {
    return response.status(409).json({ message: "This email address is already in use." });
  }

  const previousStudentProfile = {
    name: student.name,
    email: student.email,
    department: student.department,
  };
  const previousUserProfile = {
    name: user.name,
    email: user.email,
    department: user.department,
  };
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      department: user.department,
    },
    { $set: profile },
    { new: true, runValidators: true }
  );
  if (!updatedUser) {
    return response.status(409).json({
      message: "Your account changed while saving. Refresh the page and try again.",
    });
  }

  const restoreUserProfile = async () => {
    const rollback = await User.updateOne(
      {
        _id: user._id,
        name: profile.name,
        email: profile.email,
        department: profile.department,
      },
      { $set: previousUserProfile }
    );
    if (rollback.matchedCount !== 1) {
      throw new Error("Unable to restore the account after a failed profile update.");
    }
  };

  const semesterIndex = profileEditing.semester - 1;
  const semesterCountPath = `profileEditCounts.${semesterIndex}`;
  let updatedStudent;
  try {
    updatedStudent = await Student.findOneAndUpdate(
      {
        _id: student._id,
        ...previousStudentProfile,
        profileEditTotalCount: { $lt: PROFILE_EDIT_LIMIT },
        [semesterCountPath]: { $lt: PROFILE_EDITS_PER_SEMESTER },
      },
      {
        $set: profile,
        $inc: {
          [semesterCountPath]: 1,
          profileEditTotalCount: 1,
        },
      },
      { new: true, runValidators: true }
    );
  } catch (error) {
    await restoreUserProfile();
    throw error;
  }

  if (!updatedStudent) {
    await restoreUserProfile();
    const latestStudent = await Student.findById(student._id)
      .select("profileEditStartedAt profileEditCounts profileEditTotalCount");
    if (latestStudent) {
      const latestStatus = getProfileEditStatus(latestStudent);
      if (latestStatus.isComplete || latestStatus.changesRemainingThisSemester === 0) {
        return response.status(403).json({
          message: latestStatus.isComplete
            ? "Your profile edit allowance has ended."
            : "You have used both profile changes for this semester.",
          profileEditing: latestStatus,
        });
      }
    }
    return response.status(409).json({
      message: "Your profile changed while saving. Refresh the page and try again.",
    });
  }

  response.json({
    profile: toClientDocument(updatedStudent),
    profileEditing: getProfileEditStatus(updatedStudent),
  });
});

app.get("/api/student/events", requireAuth, requireRole("student"), async (_request, response) => {
  const events = await CollegeEvent.find({ endsAt: { $gte: new Date() } })
    .select("-poster.data")
    .sort({ startsAt: 1 })
    .limit(100)
    .lean();
  response.json(events.map(toCollegeEventResponse));
});

const getEventPoster = async (request, response, upcomingOnly = false) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: "Invalid event ID." });
  }
  const filter = { _id: request.params.id };
  if (upcomingOnly) filter.endsAt = { $gte: new Date() };
  const event = await CollegeEvent.findOne(filter).select("+poster.data");
  if (!event) {
    return response.status(404).json({ message: "Event not found." });
  }
  const image = toImageResponse(event.poster);
  if (!image) {
    return response.status(404).json({ message: "Event poster not found." });
  }
  response.json(image);
};

const getStudentEventPoster = (request, response) =>
  getEventPoster(request, response, true);

app.get(
  "/api/student/events/:id/poster",
  requireAuth,
  requireRole("student"),
  getStudentEventPoster
);

app.use("/api", requireAuth, requireRole("admin"));

app.get("/api/events", async (_request, response) => {
  const events = await CollegeEvent.find()
    .select("-poster.data")
    .sort({ startsAt: 1 })
    .lean();
  response.json(events.map(toCollegeEventResponse));
});

app.get("/api/events/:id/poster", getEventPoster);

app.post("/api/events", parseEventPoster, async (request, response) => {
  const { event, error } = normalizeCollegeEvent(getRequestBody(request));
  if (error) return response.status(400).json({ message: error });
  if (request.file && !hasValidImageSignature(request.file)) {
    return response.status(400).json({ message: "The uploaded file is not a valid JPEG, PNG, or WebP image." });
  }
  const createdEvent = new CollegeEvent(event);
  if (request.file) {
    createdEvent.poster = uploadedImage(request.file, "event-poster");
  }
  await createdEvent.save();
  response.status(201).json(toCollegeEventResponse(createdEvent));
});

app.put("/api/events/:id", parseEventPoster, async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: "Invalid event ID." });
  }
  const { event: eventData, error } = normalizeCollegeEvent(getRequestBody(request));
  if (error) return response.status(400).json({ message: error });
  if (request.file && !hasValidImageSignature(request.file)) {
    return response.status(400).json({ message: "The uploaded file is not a valid JPEG, PNG, or WebP image." });
  }
  const event = await CollegeEvent.findById(request.params.id);
  if (!event) {
    return response.status(404).json({ message: "Event not found." });
  }
  event.set(eventData);
  if (request.file) {
    event.poster = uploadedImage(request.file, "event-poster");
  }
  await event.save();
  response.json(toCollegeEventResponse(event));
});

app.delete("/api/events/:id/poster", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: "Invalid event ID." });
  }
  const event = await CollegeEvent.findById(request.params.id);
  if (!event) {
    return response.status(404).json({ message: "Event not found." });
  }
  event.poster = null;
  await event.save();
  response.status(204).end();
});

app.delete("/api/events/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: "Invalid event ID." });
  }
  const event = await CollegeEvent.findByIdAndDelete(request.params.id);
  if (!event) {
    return response.status(404).json({ message: "Event not found." });
  }
  response.status(204).end();
});

app.get("/api/departments/:id/academic-records", async (request, response) => {
  const department = await Department.findById(request.params.id)
    .select("timetableConfigured timetable timetableImage.fileName timetableImage.contentType +timetableImage.data");
  if (!department) {
    return response.status(404).json({ message: "Department not found." });
  }
  response.json({
    timetable: department.timetable,
    timetableConfigured: department.timetableConfigured,
    timetableImage: toImageResponse(department.timetableImage),
  });
});

app.put("/api/departments/:id/academic-records", async (request, response) => {
  const { entries, error } = normalizeTimetableEntries(getRequestBody(request).timetable);
  if (error) return response.status(400).json({ message: error });

  const department = await Department.findById(request.params.id);
  if (!department) {
    return response.status(404).json({ message: "Department not found." });
  }
  department.timetable = entries;
  department.timetableConfigured = true;
  await department.save();
  response.json({
    timetable: department.timetable,
    timetableConfigured: department.timetableConfigured,
  });
});

app.get("/api/students/:id/academic-records", async (request, response) => {
  const student = await Student.findById(request.params.id);
  if (!student) {
    return response.status(404).json({ message: "Student not found." });
  }
  response.json({ examResults: student.examResults });
});

app.put("/api/students/:id/academic-records", async (request, response) => {
  const { entries, error } = normalizeExamResults(getRequestBody(request).examResults);
  if (error) return response.status(400).json({ message: error });

  const student = await Student.findById(request.params.id);
  if (!student) {
    return response.status(404).json({ message: "Student not found." });
  }
  student.examResults = entries;
  await student.save();
  response.json({ examResults: student.examResults });
});

app.put("/api/departments/:id/timetable-image", parseTimetableImage, async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ message: "Choose an image to upload." });
  }
  if (!hasValidImageSignature(request.file)) {
    return response.status(400).json({ message: "The uploaded file is not a valid JPEG, PNG, or WebP image." });
  }

  const department = await Department.findById(request.params.id).select("+timetableImage.data");
  if (!department) {
    return response.status(404).json({ message: "Department not found." });
  }
  department.timetableImage = {
    ...uploadedImage(request.file, "weekly-timetable"),
  };
  department.timetableConfigured = true;
  await department.save();
  response.json({
    timetableImage: toImageResponse(department.timetableImage),
  });
});

app.delete("/api/departments/:id/timetable-image", async (request, response) => {
  const department = await Department.findById(request.params.id);
  if (!department) {
    return response.status(404).json({ message: "Department not found." });
  }
  department.timetableImage = null;
  department.timetableConfigured = true;
  await department.save();
  response.status(204).end();
});

app.get("/api/registrations/pending", async (_request, response) => {
  const pendingUsers = await User.find({ role: "student", status: "pending" })
    .sort({ createdAt: 1 })
    .select("name email department createdAt");
  response.json(
    pendingUsers.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      department: user.department,
      createdAt: user.createdAt,
    }))
  );
});

app.post("/api/registrations/:id/approve", async (request, response) => {
  const user = await User.findOne({
    _id: request.params.id,
    role: "student",
    status: "pending",
  });
  if (!user) {
    return response.status(404).json({ message: "Pending student registration not found." });
  }

  const selectedDepartment = getRequestBody(request).department?.trim();
  if (selectedDepartment) {
    const departmentExists = await Department.findOne({ name: selectedDepartment }).select("_id");
    if (!departmentExists) {
      return response.status(400).json({ message: "Selected department not found." });
    }
  }
  const approvedDepartment = selectedDepartment || user.department;

  let student = user.studentId ? await Student.findById(user.studentId) : null;
  if (!student) {
    student = await Student.findOne({ email: user.email });
  }
  if (student && (
    student.name.toLowerCase() !== user.name.toLowerCase() ||
    (student.department !== approvedDepartment && !selectedDepartment)
  )) {
    return response.status(409).json({
      message: "A student profile with this email has different details. Resolve the profile before approving.",
    });
  }

  let createdStudent = false;
  let previousProfileEditState;
  try {
    if (!student) {
      student = await Student.create({
        name: user.name,
        email: user.email,
        department: approvedDepartment,
      });
      createdStudent = true;
    } else {
      student.department = approvedDepartment;
      previousProfileEditState = {
        profileEditStartedAt: student.profileEditStartedAt,
        profileEditCounts: [...student.profileEditCounts],
        profileEditTotalCount: student.profileEditTotalCount,
      };
    }
    student.profileEditStartedAt = new Date();
    student.profileEditCounts = Array(PROFILE_EDIT_SEMESTERS).fill(0);
    student.profileEditTotalCount = 0;
    await student.save();
    user.studentId = student._id;
    user.department = approvedDepartment;
    user.status = "active";
    await user.save();
  } catch (error) {
    if (createdStudent) await Student.deleteOne({ _id: student._id });
    else if (student && previousProfileEditState) {
      student.set(previousProfileEditState);
      await student.save();
    }
    throw error;
  }

  response.json({ student: toClientDocument(student) });
});

app.delete("/api/registrations/:id", async (request, response) => {
  const user = await User.findOneAndDelete({
    _id: request.params.id,
    role: "student",
    status: "pending",
  });
  if (!user) {
    return response.status(404).json({ message: "Pending student registration not found." });
  }
  response.status(204).end();
});

app.get("/api/students", async (_request, response) => {
  const students = await Student.find()
    .select("name email department createdAt updatedAt")
    .sort({ createdAt: 1 });
  response.json(students.map(toClientDocument));
});

app.post("/api/students", async (request, response) => {
  const body = getRequestBody(request);
  const studentData = {
    name: body.name,
    email: body.email,
    department: body.department,
  };
  await validateDepartmentExists(studentData.department);
  if (await User.exists({ email: String(studentData.email || "").trim().toLowerCase() })) {
    return response.status(409).json({ message: "This email is already used by an account." });
  }
  const student = await Student.create(studentData);
  response.status(201).json(toClientDocument(student));
});

app.put("/api/students/:id", async (request, response) => {
  const body = getRequestBody(request);
  const studentData = {
    name: body.name,
    email: body.email,
    department: body.department,
  };
  await validateDepartmentExists(studentData.department);
  const student = await Student.findById(request.params.id);
  if (!student) {
    return response.status(404).json({ message: "Student not found." });
  }

  student.set(studentData);
  await student.validate();
  if (await Student.exists({ email: student.email, _id: { $ne: student._id } })) {
    return response.status(409).json({ message: "A student with this email already exists." });
  }

  const linkedUser = await User.findOne({ studentId: student._id });
  if (linkedUser) {
    if (await User.exists({ email: student.email, _id: { $ne: linkedUser._id } })) {
      return response.status(409).json({ message: "An account with this email already exists." });
    }
    linkedUser.name = student.name;
    linkedUser.email = student.email;
    linkedUser.department = student.department;
    await linkedUser.save();
  }
  await student.save();
  response.json(toClientDocument(student));
});

app.delete("/api/students/:id", async (request, response) => {
  const student = await Student.findById(request.params.id);
  if (!student) {
    return response.status(404).json({ message: "Student not found." });
  }
  await User.deleteOne({ studentId: student._id });
  await student.deleteOne();
  response.status(204).end();
});

app.get("/api/departments", async (_request, response) => {
  const [departments, counts] = await Promise.all([
    Department.find().select("name head createdAt updatedAt").sort({ name: 1 }).lean(),
    Student.aggregate([{ $group: { _id: "$department", students: { $sum: 1 } } }]),
  ]);
  const countByName = new Map(counts.map((entry) => [entry._id, entry.students]));
  response.json(
    departments.map((department) => ({
      ...toClientDocument(department),
      students: countByName.get(department.name) || 0,
    }))
  );
});

app.post("/api/departments", async (request, response) => {
  const body = getRequestBody(request);
  const department = await Department.create({
    name: body.name,
    head: body.head,
  });
  response.status(201).json({ ...toClientDocument(department), students: 0 });
});

app.get("/api/settings", async (_request, response) => {
  const settings = await SystemSettings.findOne({ key: "global" });
  response.json(
    settings
      ? toClientDocument(settings)
      : {
          id: null,
          institution: "Studora",
          emailNotifications: true,
          weeklyReports: false,
          studentServices: {
            campusMapLocation: "Adithya Institute of Technology, Coimbatore",
            attendance: [],
            campusMap: [],
            fees: [],
            homework: [],
            transport: [],
          },
        }
  );
});

app.put("/api/settings", async (request, response) => {
  const body = getRequestBody(request);
  const institution = typeof body.institution === "string"
    ? body.institution.trim()
    : "";
  if (!institution) {
    return response.status(400).json({ message: "Institution name is required." });
  }
  if (
    typeof body.emailNotifications !== "boolean" ||
    typeof body.weeklyReports !== "boolean"
  ) {
    return response.status(400).json({ message: "Notification settings must be true or false." });
  }
  const { studentServices, error } = normalizeStudentServices(body.studentServices);
  if (error) return response.status(400).json({ message: error });

  const settings = await SystemSettings.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        institution,
        emailNotifications: body.emailNotifications,
        weeklyReports: body.weeklyReports,
        studentServices,
      },
      $setOnInsert: { key: "global" },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  response.json(toClientDocument(settings));
});

app.use("/api", (_request, response) => {
  response.status(404).json({ message: "API endpoint not found." });
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return response.status(status).json({
      message: status === 413
        ? "Image must be 2 MB or smaller."
        : "Invalid image upload.",
    });
  }
  if (error.status === 400) {
    return response.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    const duplicateFields = error.keyPattern || error.keyValue || {};
    const field = Object.keys(duplicateFields)[0];
    return response.status(409).json({
      message: field === "email"
        ? "A student with this email already exists."
        : field === "name"
          ? "A department with this name already exists."
          : "A record with these values already exists.",
    });
  }
  if (error.type === "entity.parse.failed") {
    return response.status(400).json({ message: "Request body must contain valid JSON." });
  }
  if (error.type === "entity.too.large") {
    return response.status(413).json({ message: "Request body is too large." });
  }
  if (error.name === "ValidationError") {
    const message = Object.values(error.errors).map((item) => item.message).join(" ");
    return response.status(400).json({ message });
  }
  if (error.name === "CastError") {
    return response.status(400).json({ message: "Invalid record ID." });
  }

  console.error(error);
  response.status(error.status || 500).json({
    message: error.status ? error.message : "An unexpected server error occurred.",
  });
});

const port = Number(process.env.PORT) || 5000;

async function ensureAdminAccount() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || /replace-with/i.test(jwtSecret)) {
    throw new Error("JWT_SECRET must be set to at least 32 characters in .env.");
  }
  if (!email || !password || password.length < 12 || /replace-with/i.test(password)) {
    throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters in .env.");
  }

  await Promise.all([User.init(), Student.init()]);
  await User.updateMany(
    { role: "student", status: { $exists: false } },
    { $set: { status: "active" } }
  );
  await Student.updateMany(
    { profileEditStartedAt: { $exists: false } },
    {
      $set: {
        profileEditStartedAt: new Date(),
        profileEditCounts: Array(PROFILE_EDIT_SEMESTERS).fill(0),
        profileEditTotalCount: 0,
      },
    }
  );
  const linkedStudentUsers = await User.find({
    role: "student",
    studentId: { $ne: null },
  }).select("department studentId").populate("studentId", "department");
  for (const user of linkedStudentUsers) {
    if (user.studentId && user.department !== user.studentId.department) {
      user.department = user.studentId.department;
      await user.save();
    }
  }
  const existingUser = await User.findOne({ email });
  if (existingUser && existingUser.role !== "admin") {
    throw new Error("ADMIN_EMAIL is already assigned to a student account.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  if (existingUser) {
    existingUser.name = "Administrator";
    existingUser.passwordHash = passwordHash;
    existingUser.status = "active";
    await existingUser.save();
  } else {
    await User.create({
      name: "Administrator",
      email,
      passwordHash,
      role: "admin",
      status: "active",
    });
  }
}

connectToDatabase()
  .then(ensureAdminAccount)
  .then(() => {
    console.log("Administrator account configured.");
    app.listen(port, () => {
      console.log(`API server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(`Unable to start API server: ${error.message}`);
    process.exitCode = 1;
  });
