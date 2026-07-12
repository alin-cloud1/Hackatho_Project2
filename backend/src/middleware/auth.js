import jwt from "jsonwebtoken";
import { config } from "../config.js";

/** Sign a session token for an authenticated roster member. */
export function signToken(student) {
  return jwt.sign(
    { rollNumber: student.rollNumber, role: student.role, name: student.name, isTeacher: student.isTeacher },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/** Require a valid JWT; attaches req.user. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

/** Require one of the given roles (use after requireAuth). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission for this action." });
    }
    next();
  };
}
