// Lightweight, purely client-side heuristics to nudge users away from
// sharing real identifying details. Nothing is stored or sent anywhere.

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const EMPLOYER =
  /\b(?:works? at|working at|employed (?:at|by)|my (?:boss|manager|colleague|coworker) at|from)\s+[A-Z][\w&.-]+/;
const FULL_NAME = /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/;

const COMMON_NON_NAMES = new Set([
  // Days, times, months
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
  "morning", "evening", "afternoon", "night", "today", "tomorrow", "yesterday",
  // Office, daily habits & everyday objects
  "meeting", "meetings", "email", "emails", "call", "calls", "reply", "all",
  "thanks", "thank", "coffee", "tea", "pot", "flask", "food", "fish", "microwave",
  "microwaves", "fridge", "biriyani", "leg", "piece", "quick", "question", "sync",
  "zoom", "slack", "teams", "office", "desk", "boss", "manager", "lead", "team",
  "colleague", "coworker", "friend", "room", "door", "shared", "labeled", "smiley",
  "faces", "loud", "headphones", "headphone", "water", "bottle", "snack", "snacks",
  "project", "work", "task", "tasks", "code", "review", "client", "customer",
  "first", "last", "good", "bad", "super", "great", "big", "small", "hot", "cold",
  "hello", "sorry", "please", "fictional", "cartoon", "nemesis", "villain",
  "pushover", "pavathan", "tholvi", "scene", "contra", "chaya", "samosa", "thief",
  "hijacker", "parayathe", "vayya", "nobody", "dear", "every", "always", "never",
  "someone", "person", "people", "guy", "dude", "bro", "man", "woman", "girl", "boy"
]);

const NAME_ALLOWLIST = new Set([
  "Dear NoBody",
  "Parayathe Vayya",
  "പറയാതെ വയ്യ",
  "Meeting Hijacker",
  "Samosa Thief",
  "Microwaves fish at 9 AM",
  "Empties shared coffee pot",
  "Replies-all with just 'Thanks!'",
  "Books 4:59 PM Friday meetings",
  "Steals labeled food from fridge",
  "'Per my last email' with smiley faces",
  "Takes loud calls with no headphones",
  "'Quick 5-minute call' that takes 2 hours",
]);

export type PiiFinding = "email" | "phone" | "employer" | "name";

export function detectPii(text: string): PiiFinding[] {
  const found: PiiFinding[] = [];
  if (EMAIL.test(text)) found.push("email");
  if (PHONE.test(text)) found.push("phone");
  if (EMPLOYER.test(text)) found.push("employer");
  
  const matches = text.matchAll(/\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g);
  for (const match of matches) {
    const full = match[0];
    const w1 = match[1]?.toLowerCase() ?? "";
    const w2 = match[2]?.toLowerCase() ?? "";
    if (NAME_ALLOWLIST.has(full)) continue;
    if (COMMON_NON_NAMES.has(w1) || COMMON_NON_NAMES.has(w2)) continue;
    found.push("name");
    break;
  }
  return found;
}

export function piiWarning(findings: PiiFinding[]): string {
  const labels: Record<PiiFinding, string> = {
    email: "an email address",
    phone: "a phone number",
    employer: "a workplace",
    name: "a real full name",
  };
  const list = findings.map((f) => labels[f]).join(" and ");
  return `That looks like it includes ${list}. Keep it general and fictional — no real people in here.`;
}
