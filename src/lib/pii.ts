// Lightweight, purely client-side heuristics to nudge users away from
// sharing real identifying details. Nothing is stored or sent anywhere.

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const EMPLOYER =
  /\b(?:works? at|working at|employed (?:at|by)|my (?:boss|manager|colleague|coworker) at|from)\s+[A-Z][\w&.-]+/;
const FULL_NAME = /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/;

const NAME_ALLOWLIST = new Set([
  "Dear NoBody",
  "Meeting Hijacker",
  "Samosa Thief",
]);

export type PiiFinding = "email" | "phone" | "employer" | "name";

export function detectPii(text: string): PiiFinding[] {
  const found: PiiFinding[] = [];
  if (EMAIL.test(text)) found.push("email");
  if (PHONE.test(text)) found.push("phone");
  if (EMPLOYER.test(text)) found.push("employer");
  const nameMatch = text.match(FULL_NAME);
  if (nameMatch && !NAME_ALLOWLIST.has(nameMatch[0])) found.push("name");
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
