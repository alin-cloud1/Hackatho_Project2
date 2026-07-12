// End-to-end API smoke test against a running server (node scripts/smoke-api.mjs).
const B = process.env.API || "http://localhost:4000/api";
let pass = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); pass++; };
const fail = (m) => { console.error(`  ✗ ${m}`); process.exitCode = 1; };

async function call(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${B}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

// 1. Kuddus denied
let r = await call("/auth/login", { method: "POST", body: { rollNumber: "01", pin: "1111" } });
r.status === 403 ? ok("Kuddus (01) login denied") : fail(`Kuddus login not denied (${r.status})`);

// 2. Student + admin login
const stu = (await call("/auth/login", { method: "POST", body: { rollNumber: "07", pin: "1007" } })).data;
const stu2 = (await call("/auth/login", { method: "POST", body: { rollNumber: "06", pin: "1006" } })).data;
const adm = (await call("/auth/login", { method: "POST", body: { rollNumber: "02", pin: "2222" } })).data;
stu?.token && stu.student.role === "student" ? ok("student 07 login") : fail("student login");
adm?.token && adm.student.role === "admin" ? ok("admin 02 login") : fail("admin login");

// 3. Wrong PIN
r = await call("/auth/login", { method: "POST", body: { rollNumber: "07", pin: "0000" } });
r.status === 401 ? ok("wrong PIN rejected") : fail("wrong PIN");

// 4. M1: student files complaint
r = await call("/complaints", { method: "POST", token: stu.token, body: { category: "Washroom Bribe", description: "Charged 2 Tk for washroom during free period." } });
r.status === 201 ? ok("student files complaint") : fail(`file complaint (${r.status})`);

// 5. M1: admin cannot file
r = await call("/complaints", { method: "POST", token: adm.token, body: { category: "Other", description: "no" } });
r.status === 403 ? ok("admin blocked from filing") : fail(`admin file blocked (${r.status})`);

// 6. M1: student sees only own; admin sees all + strikeCount
const stuView = (await call("/complaints", { token: stu.token })).data;
const stu2View = (await call("/complaints", { token: stu2.token })).data;
const admView = (await call("/complaints", { token: adm.token })).data;
stuView.complaints.length === 1 && stuView.strikeCount === undefined ? ok("student sees only own, no strike total") : fail("student complaint visibility");
stu2View.complaints.length === 0 ? ok("other student sees none of it") : fail("cross-student isolation");
admView.strikeCount === 1 && admView.complaints.length === 1 ? ok("admin sees all + strikeCount=1") : fail(`admin view (strikes=${admView.strikeCount})`);

// 7. M4: ledger with amount
r = await call("/ledger", { method: "POST", token: stu.token, body: { kind: "toll", amountTaka: 50 } });
r.data?.totals?.totalCash === 50 ? ok(`ledger cash=50, jhalmuri=${r.data.totals.jhalmuriPackets}`) : fail("ledger toll");
r = await call("/ledger", { method: "POST", token: adm.token, body: { kind: "toll", amountTaka: 5 } });
r.status === 403 ? ok("admin blocked from ledger") : fail("admin ledger block");

// 8. M2: seat plan + profile
const plan = (await call("/seating/plan?rows=5&cols=5&aisle=2", { token: stu.token })).data;
plan.lineOfSightClear && plan.kuddusSeat ? ok("seat plan: line of sight clear") : fail("seat plan");
r = await call("/seating/profile", { method: "PUT", token: stu.token, body: { heightCm: 200, visionImpaired: true, hearingImpaired: false } });
r.status === 200 ? ok("student saved own seat profile") : fail("seat profile save");
const plan2 = (await call("/seating/plan?rows=5&cols=5&aisle=2", { token: stu.token })).data;
// roll 07 (now impaired) must NOT be in Kuddus's column
let inKuddusCol = false;
for (let rr = 0; rr < 5; rr++) { const s = plan2.grid[rr][plan2.kuddusCol].student; if (s?.rollNumber === "07") inKuddusCol = true; }
!inKuddusCol ? ok("impaired student kept out of Kuddus's column") : fail("impaired in Kuddus col");

// 9. M3: syllabus summarize (student only)
r = await call("/syllabus/summarize", { method: "POST", token: stu.token, body: { text: "Chapter 1 photosynthesis and the water cycle, plus the barcode on the back cover and the writer's biography.", testDate: "" } });
r.data?.keptTopics?.length > 0 && r.data.filteredOut.some((f) => /barcode|biography/i.test(f)) ? ok(`syllabus RAG kept ${r.data.keptTopics.length}, dropped junk (mode=${r.data.mode})`) : fail("syllabus summarize");
r = await call("/syllabus/summarize", { method: "POST", token: adm.token, body: { text: "x" } });
r.status === 403 ? ok("admin blocked from syllabus tool") : fail("admin syllabus block");

// 10. M5: SOS student create, admin ack
r = await call("/sos", { method: "POST", token: stu.token, body: { location: "Canteen", status: "sent" } });
const alertId = r.data?.alert?.id;
r.status === 201 && alertId ? ok("student raised SOS") : fail("sos create");
r = await call("/sos", { method: "POST", token: adm.token, body: { location: "Library" } });
r.status === 403 ? ok("admin blocked from raising SOS") : fail("admin sos block");
r = await call(`/sos/${alertId}/ack`, { method: "POST", token: adm.token });
r.data?.alert?.status === "acknowledged" ? ok("admin acknowledged SOS") : fail("sos ack");

// 11. M6: fact-check (student only)
r = await call("/factcheck", { method: "POST", token: stu.token, body: { claim: "The Headmaster said 1st Captains don't have to do homework." } });
r.data?.status && r.data?.quote ? ok(`fact-check => [${r.data.status}] conf=${r.data.confidence} (${r.data.mode})`) : fail("fact-check");

console.log(`\n${pass} API checks passed ${process.exitCode ? "— WITH FAILURES ❌" : "✅"}`);
