import crypto from "node:crypto";
import { config } from "../config.js";

/**
 * One-way anonymity pipeline: roll numbers are salted + SHA-256 hashed so the
 * raw roll number never enters the complaints table. Mirrors the frontend
 * digest (salt:roll, first 16 hex chars) so hashes line up across tiers.
 */
export function hashRollNumber(rollNumber) {
  return crypto
    .createHash("sha256")
    .update(`${config.rollHashSalt}:${rollNumber}`)
    .digest("hex")
    .slice(0, 16);
}
