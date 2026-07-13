// Canonical seed data for the Anti-Kuddus Protocol backend.
// Mirrors the frontend roster/rulebook/curriculum so both tiers agree.

// Kuddus (roll 01): role null + pin null => can never log in; kept only as the
// seat-planner target.
export const ROSTER = [
  { rollNumber: "01", name: "Kodu Kuddus", heightCm: 158, visionImpaired: false, hearingImpaired: false, role: null, isKuddus: true, isTeacher: false, pin: null },
  { rollNumber: "00", name: "Rashid Sir", heightCm: 175, visionImpaired: false, hearingImpaired: false, role: "admin", isKuddus: false, isTeacher: true, pin: "0000" },
  { rollNumber: "02", name: "Biltu Rahman", heightCm: 149, visionImpaired: false, hearingImpaired: false, role: "admin", isKuddus: false, isTeacher: false, pin: "2222" },
  { rollNumber: "03", name: "Miltu Hasan", heightCm: 151, visionImpaired: false, hearingImpaired: false, role: "admin", isKuddus: false, isTeacher: false, pin: "3333" },
  { rollNumber: "04", name: "Farhan Kabir", heightCm: 172, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1004" },
  { rollNumber: "05", name: "Ayesha Noor", heightCm: 144, visionImpaired: true, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1005" },
  { rollNumber: "06", name: "Rakib Islam", heightCm: 168, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1006" },
  { rollNumber: "07", name: "Tania Afrin", heightCm: 139, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1007" },
  { rollNumber: "08", name: "Shanto Dey", heightCm: 175, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1008" },
  { rollNumber: "09", name: "Nusrat Jahan", heightCm: 142, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1009" },
  { rollNumber: "10", name: "Imran Chowdhury", heightCm: 165, visionImpaired: false, hearingImpaired: true, role: "student", isKuddus: false, isTeacher: false, pin: "1010" },
  { rollNumber: "11", name: "Priya Sarkar", heightCm: 147, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1011" },
  { rollNumber: "12", name: "Zubair Ahmed", heightCm: 178, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1012" },
  { rollNumber: "13", name: "Mim Akter", heightCm: 140, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1013" },
  { rollNumber: "14", name: "Sabbir Hossain", heightCm: 170, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1014" },
  { rollNumber: "15", name: "Ruma Begum", heightCm: 145, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1015" },
  { rollNumber: "16", name: "Arif Khan", heightCm: 180, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1016" },
  { rollNumber: "17", name: "Lamia Sultana", heightCm: 143, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1017" },
  { rollNumber: "18", name: "Nayeem Uddin", heightCm: 173, visionImpaired: false, hearingImpaired: false, role: "student", isKuddus: false, isTeacher: false, pin: "1018" },
];

export const RULEBOOK = [
  { id: "r1", section: "Article 3.2 — Captaincy Structure", body: "The 1st Captain must consult the 2nd and 3rd Captains before enacting any decision affecting the general student body. Unilateral decrees are void.", keywords: ["captain", "consult", "decision", "unilateral", "democracy", "vote"] },
  { id: "r2", section: "Article 5.1 — Academic Obligations", body: "All elected captains, including the 1st Captain, remain fully subject to homework, attendance, and examination requirements. No office confers academic exemption.", keywords: ["homework", "exemption", "captain", "headmaster", "excuse", "assignment"] },
  { id: "r3", section: "Article 7.4 — Tiffin & Canteen Conduct", body: "No student, including class officers, may levy taxes, tolls, or 'quality control' charges on another student's food or personal property.", keywords: ["tiffin", "tax", "food", "toll", "extort", "quality control", "sandwich"] },
  { id: "r4", section: "Article 7.6 — Washroom & Free Period Access", body: "Washroom access during free periods is a guaranteed right and may not be conditioned on any payment, fee, or 'welfare fund' contribution.", keywords: ["washroom", "bribe", "toll", "welfare fund", "free period", "bathroom"] },
  { id: "r5", section: "Article 9.1 — Seating Assignment", body: "Seating must be determined by an impartial height-and-visibility standard set by the class teacher, not by personal preference of any officer.", keywords: ["seating", "seat", "front row", "height", "visibility", "assign"] },
  { id: "r6", section: "Article 11.3 — Complaint & Impeachment Procedure", body: "Three legitimate anonymous complaints filed with the class teacher regarding the 1st Captain shall result in two formal warnings, with a third confirmed violation triggering immediate impeachment.", keywords: ["complaint", "impeach", "warning", "strike", "anonymous", "teacher"] },
  { id: "r7", section: "Article 4.5 — Sports Period Authority", body: "PT period activities are decided by class-wide majority vote, not unilateral veto by the 1st Captain, regardless of personal stamina preferences.", keywords: ["pt period", "sports", "veto", "ludu", "cricket", "vote"] },
];

export const CURRICULUM_TOPICS = [
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

export const CALORIE_TABLE = {
  "Fried Rice": 650,
  Sandwich: 350,
  Samosa: 250,
  Jhalmuri: 300,
  Paratha: 300,
  Biscuits: 150,
  "Chocolate Bar": 220,
};

export const CRICKET_BAT_PRICE_TAKA = 1200;
export const JHALMURI_PACKET_PRICE_TAKA = 15;
