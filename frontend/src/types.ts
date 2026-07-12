export interface Student {
  rollNumber: string;
  name: string;
  heightCm: number;
  needsFrontRow: boolean; // vision/hearing impairment accommodation
  isKuddus?: boolean;
  pin: string; // mock secret credential for roll-number auth
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
