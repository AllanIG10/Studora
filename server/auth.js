import jwt from "jsonwebtoken";
import User from "./models/User.js";

export function createAuthToken(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

export function serializeUser(user) {
  const student = user.studentId?.name ? user.studentId : null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    student: student
      ? {
          id: student._id.toString(),
          name: student.name,
          email: student.email,
          department: student.department,
        }
      : null,
  };
}

export async function requireAuth(request, response, next) {
  const authorization = request.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return response.status(401).json({ message: "Please sign in to continue." });
  }

  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch {
    return response.status(401).json({ message: "Your session has expired. Please sign in again." });
  }

  if (!payload || typeof payload === "string" || typeof payload.sub !== "string") {
    return response.status(401).json({ message: "Invalid authentication token." });
  }

  const user = await User.findById(payload.sub).select("name email role department studentId");
  if (!user) {
    return response.status(401).json({ message: "This account is no longer available." });
  }

  request.authUser = user;
  next();
}

export function requireRole(role) {
  return (request, response, next) => {
    if (request.authUser?.role !== role) {
      return response.status(403).json({ message: "You don't have permission to access this resource." });
    }
    next();
  };
}
