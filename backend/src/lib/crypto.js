import crypto from "node:crypto";
import { config } from "../config.js";

export function hashRollNumber(rollNumber) {
  return crypto
    .createHash("sha256")
    .update(`${config.rollHashSalt}:${rollNumber}`)
    .digest("hex")
    .slice(0, 16);
}
