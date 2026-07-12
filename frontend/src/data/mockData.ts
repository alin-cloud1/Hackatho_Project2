import type { RulebookEntry, Student } from "../types";

export const ROSTER: Student[] = [
  { rollNumber: "01", name: "Kodu Kuddus", heightCm: 158, needsFrontRow: false, isKuddus: true, pin: "1111" },
  { rollNumber: "02", name: "Biltu Rahman", heightCm: 149, needsFrontRow: false, pin: "2222" },
  { rollNumber: "03", name: "Miltu Hasan", heightCm: 151, needsFrontRow: false, pin: "3333" },
  { rollNumber: "04", name: "Farhan Kabir", heightCm: 172, needsFrontRow: false, pin: "1004" },
  { rollNumber: "05", name: "Ayesha Noor", heightCm: 144, needsFrontRow: true, pin: "1005" },
  { rollNumber: "06", name: "Rakib Islam", heightCm: 168, needsFrontRow: false, pin: "1006" },
  { rollNumber: "07", name: "Tania Afrin", heightCm: 139, needsFrontRow: false, pin: "1007" },
  { rollNumber: "08", name: "Shanto Dey", heightCm: 175, needsFrontRow: false, pin: "1008" },
  { rollNumber: "09", name: "Nusrat Jahan", heightCm: 142, needsFrontRow: false, pin: "1009" },
  { rollNumber: "10", name: "Imran Chowdhury", heightCm: 165, needsFrontRow: true, pin: "1010" },
  { rollNumber: "11", name: "Priya Sarkar", heightCm: 147, needsFrontRow: false, pin: "1011" },
  { rollNumber: "12", name: "Zubair Ahmed", heightCm: 178, needsFrontRow: false, pin: "1012" },
  { rollNumber: "13", name: "Mim Akter", heightCm: 140, needsFrontRow: false, pin: "1013" },
  { rollNumber: "14", name: "Sabbir Hossain", heightCm: 170, needsFrontRow: false, pin: "1014" },
  { rollNumber: "15", name: "Ruma Begum", heightCm: 145, needsFrontRow: false, pin: "1015" },
  { rollNumber: "16", name: "Arif Khan", heightCm: 180, needsFrontRow: false, pin: "1016" },
  { rollNumber: "17", name: "Lamia Sultana", heightCm: 143, needsFrontRow: false, pin: "1017" },
  { rollNumber: "18", name: "Nayeem Uddin", heightCm: 173, needsFrontRow: false, pin: "1018" },
];

export const RULEBOOK: RulebookEntry[] = [
  {
    id: "r1",
    section: "Article 3.2 — Captaincy Structure",
    text: "The 1st Captain must consult the 2nd and 3rd Captains before enacting any decision affecting the general student body. Unilateral decrees are void.",
    keywords: ["captain", "consult", "decision", "unilateral", "democracy", "vote"],
  },
  {
    id: "r2",
    section: "Article 5.1 — Academic Obligations",
    text: "All elected captains, including the 1st Captain, remain fully subject to homework, attendance, and examination requirements. No office confers academic exemption.",
    keywords: ["homework", "exemption", "captain", "headmaster", "excuse", "assignment"],
  },
  {
    id: "r3",
    section: "Article 7.4 — Tiffin & Canteen Conduct",
    text: "No student, including class officers, may levy taxes, tolls, or 'quality control' charges on another student's food or personal property.",
    keywords: ["tiffin", "tax", "food", "toll", "extort", "quality control", "sandwich"],
  },
  {
    id: "r4",
    section: "Article 7.6 — Washroom & Free Period Access",
    text: "Washroom access during free periods is a guaranteed right and may not be conditioned on any payment, fee, or 'welfare fund' contribution.",
    keywords: ["washroom", "bribe", "toll", "welfare fund", "free period", "bathroom"],
  },
  {
    id: "r5",
    section: "Article 9.1 — Seating Assignment",
    text: "Seating must be determined by an impartial height-and-visibility standard set by the class teacher, not by personal preference of any officer.",
    keywords: ["seating", "seat", "front row", "height", "visibility", "assign"],
  },
  {
    id: "r6",
    section: "Article 11.3 — Complaint & Impeachment Procedure",
    text: "Three legitimate anonymous complaints filed with the class teacher regarding the 1st Captain shall result in two formal warnings, with a third confirmed violation triggering immediate impeachment.",
    keywords: ["complaint", "impeach", "warning", "strike", "anonymous", "teacher"],
  },
  {
    id: "r7",
    section: "Article 4.5 — Sports Period Authority",
    text: "PT period activities are decided by class-wide majority vote, not unilateral veto by the 1st Captain, regardless of personal stamina preferences.",
    keywords: ["pt period", "sports", "veto", "ludu", "cricket", "vote"],
  },
];

export const CRICKET_BAT_PRICE_TAKA = 1200;
export const JHALMURI_PACKET_PRICE_TAKA = 15;

export const CALORIE_TABLE: Record<string, number> = {
  "Fried Rice": 650,
  Sandwich: 350,
  Samosa: 250,
  Jhalmuri: 300,
  Paratha: 300,
  Biscuits: 150,
  "Chocolate Bar": 220,
};

export const CURRICULUM_TOPICS: string[] = [
  "photosynthesis",
  "cell structure",
  "newton's laws of motion",
  "fractions and decimals",
  "algebraic expressions",
  "the mughal empire",
  "climate and weather",
  "parts of speech",
  "the water cycle",
  "periodic table basics",
  "simple machines",
  "bangladesh liberation war",
  "geometry: angles and triangles",
  "ecosystems and food chains",
  "acids and bases",
];
