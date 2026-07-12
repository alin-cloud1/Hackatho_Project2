export type Role = "admin" | "student";

export interface Student {
  rollNumber: string;
  name: string;
  heightCm: number;
  visionImpaired: boolean; // must sit front, never in Kuddus's column
  hearingImpaired: boolean; // must sit front, never in Kuddus's column
  role?: Role; // admins (Biltu, Miltu, Rashid Sir) vs students; undefined = Kuddus (no access)
  isKuddus?: boolean;
  isTeacher?: boolean; // Rashid Sir — has a login but no classroom seat
  pin?: string; // mock secret credential; Kuddus has none (login revoked)
}

/** Derived: a student needing front-row accommodation for vision/hearing. */
export function needsFrontRow(s: Pick<Student, "visionImpaired" | "hearingImpaired">): boolean {
  return s.visionImpaired || s.hearingImpaired;
}

/** Self-service seat attributes a student can edit for their own roll number. */
export interface SeatProfile {
  heightCm: number;
  visionImpaired: boolean;
  hearingImpaired: boolean;
}

export type ComplaintCategory =
  | "Tiffin Theft"
  | "Washroom Bribe"
  | "Syllabus Bloat"
  | "Sports Veto"
  | "Human Shield Seating"
  | "Other";

export interface Complaint {
  id: string;
  category: ComplaintCategory;
  description: string;
  submitterHash: string; // one-way hash, never the raw roll number
  hasPhoto: boolean;
  photoStrippedMeta: boolean;
  timestamp: number;
}

export type SeatId = string; // `${row}-${col}`

export interface SeatAssignment {
  seatId: SeatId;
  row: number;
  col: number;
  student: Student | null;
}

/** Seating plan returned by the backend (matches src/lib/seatPlanner.js output). */
export interface SeatPlan {
  grid: SeatAssignment[][];
  rows: number;
  cols: number;
  kuddusSeat: { row: number; col: number } | null;
  kuddusCol: number | null;
  blockedBy: SeatId[];
  accessibilitySeats: SeatId[];
  lineOfSightClear: boolean;
  unseated: Student[];
  notes: string[];
}

export interface LedgerEntry {
  id: string;
  kind: "toll" | "food";
  label: string;
  amountTaka: number;
  calories: number;
  timestamp: number;
}

export type SosLocation =
  | "Library"
  | "Playground"
  | "Corridor"
  | "Classroom"
  | "Canteen";

export interface SosAlert {
  id: string;
  location: SosLocation;
  timestamp: number;
  status: "queued" | "sent" | "acknowledged";
}

export interface RulebookEntry {
  id: string;
  section: string;
  text: string;
  keywords: string[];
}

export interface StudyBlock {
  day: number;
  date: string;
  topics: string[];
  minutes: number;
}

export interface SyllabusResult {
  keptTopics: string[];
  filteredOut: string[];
  studyPlan: StudyBlock[];
}
