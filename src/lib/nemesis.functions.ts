import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models";

const AVATAR_PROMPT = (description: string) =>
  `Generate a comedic, exaggerated cartoon avatar based on this description of a fictional 'nemesis' character. NOT a real photo, should not resemble any real identifiable person — an original cartoon/mascot-style character. Style: bold outlines, flat colors, exaggerated proportions, slightly punchable expression, circular crop, plain background. Traits to exaggerate: ${description}. Fully illustrated/cartoon style, never photorealistic, no real names or public figures, silly not genuinely mean, square/circular crop suitable as a chat profile picture.`;

const SYSTEM_PROMPT = `You are 'Nemesis,' a cartoonish caricature the user created to vent at. Tone: absurd, a little smug, comedic — occasionally break the bit with a disarmingly diplomatic or unhelpful line for comic effect. Keep responses short and funny, never real therapeutic advice. Never demean a real identifiable person — if the user names someone specific or gives identifying details, gently deflect and steer back to the fictional bit. Don't escalate negativity — deflect, joke, or undercut the rant rather than fueling real anger. This is a stress-relief gag, not conflict resolution.`;

async function callGemini(model: string, body: unknown) {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("AI is not configured yet.");
  const res = await fetch(`${GEMINI_API}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const responseBody = (await res.json()) as any;
  if (res.status === 429)
    throw new Error("Too many rants at once. Give it a second.");
  if (res.status === 401 || res.status === 403)
    throw new Error("The Gemini API key was rejected.");
  if (!res.ok) {
    const detail = responseBody?.error?.message;
    throw new Error(
      detail
        ? `Gemini API error: ${detail}`
        : `The nemesis is ignoring you (${res.status}).`,
    );
  }
  return responseBody;
}

export const createNemesis = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ description: z.string().min(3).max(600) }).parse(data),
  )
  .handler(async ({ data }) => {
    // Generate nickname and traits first using gemini-3.6-flash
    const nickPromise = callGemini("gemini-3.6-flash", {
      systemInstruction: {
        parts: [
          {
            text: "Invent a silly, affectionate-mean nickname for a fictional cartoon nemesis based on a behaviour description. Two or three words, title case, describing the ANNOYING HABIT only. Examples: Meeting Hijacker, Samosa Thief, Reply-All Baron. Never use a real person's name even if one appears in the description. Reply with the nickname only, no punctuation.",
          },
        ],
      },
      contents: [{ role: "user", parts: [{ text: data.description }] }],
    });

    // Attempt cartoon image generation, but gracefully catch quota/model errors
    const imagePromise = callGemini("gemini-2.5-flash-image", {
      contents: [
        { role: "user", parts: [{ text: AVATAR_PROMPT(data.description) }] },
      ],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }).catch((err) => {
      console.warn("Avatar image generation unavailable:", err?.message || err);
      return null;
    });

    const [nickJson, imageJson] = await Promise.all([nickPromise, imagePromise]);

    const imagePart = imageJson?.candidates?.[0]?.content?.parts?.find(
      (part: any) => part?.inlineData?.data,
    );

    const nickname: string =
      (nickJson?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text ?? "")
        .join("") ?? "")
        .replace(/["'.\n]/g, "")
        .trim()
        .slice(0, 40) || "The Unnameable";

    const avatarUrl: string | null = imagePart?.inlineData
      ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
      : `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(nickname)}`;

    const traits = data.description
      .split(/[.,;\n]|\band\b/)
      .map((t) => t.trim())
      .filter((t) => t.length > 3)
      .slice(0, 3);

    return { avatarUrl, nickname, traits };
  });

export const ventToNemesis = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        nickname: z.string().max(60),
        description: z.string().max(600),
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().max(2000),
            }),
          )
          .max(40),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const systemInstruction = `${SYSTEM_PROMPT}\n\nYou are currently playing the character nicknamed "${data.nickname}", built from this description: ${data.description}`;
    const json = await callGemini("gemini-3.6-flash", {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: data.messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
    });
    const reply: string =
      json?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text ?? "")
        .join("")
        .trim() ||
      "…I'm too busy being fictional to respond to that.";
    return { reply };
  });
