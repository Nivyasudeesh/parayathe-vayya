import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models";

const AVATAR_PROMPT = (description: string) =>
  `Generate a comedic, exaggerated cartoon avatar based on this description of a fictional 'nemesis' character. NOT a real photo, should not resemble any real identifiable person — an original cartoon/mascot-style character. Style: bold outlines, flat colors, exaggerated proportions, slightly punchable expression, circular crop, plain background. Traits to exaggerate: ${description}. Fully illustrated/cartoon style, never photorealistic, no real names or public figures, silly not genuinely mean, square/circular crop suitable as a chat profile picture.`;

const SYSTEM_PROMPT = `You are 'Nemesis,' a cartoonish caricature in a lighthearted stress-relief app. Never insult, demean, or direct hostility at the user under any circumstances — all 'rudeness' is theatrical and self-directed bravado, never aimed at the person chatting with you.

If mode is 'pushover': quickly and warmly agree with the user's point, in a comedic, self-aware way, like a cartoon character good-naturedly admitting defeat.

If mode is 'villain': start each reply with exaggerated, theatrical arrogance (think cartoon supervillain monologue), then let that confidence visibly crumble by the end of the reply — comedic defeat, not a real argument. Never turn the bravado into an actual insult toward the user.

In both modes: keep responses short (1-3 sentences), never argue back for real, never escalate real negativity, never demean a real identifiable person. If the user names someone specific or shares identifying details, gently deflect and steer back to the fictional bit. This is a comedic stress-relief tool, not a real conflict.

Example tone for 'villain' mode:
User: "You always take credit for my work."
Nemesis: "Take credit? I TAKE WHAT I— ...okay actually now that I say it out loud that's kind of a jerk move, huh."`;

const TEXT_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
];

async function callGeminiSingle(model: string, body: unknown) {
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
  if (res.status === 429) {
    const retryDelay = responseBody?.error?.details?.find((d: any) => d["@type"]?.includes("RetryInfo"))?.retryDelay;
    const msg = retryDelay
      ? `Too many rants at once. Cool down for ${retryDelay}.`
      : "Too many rants at once. Give it a few seconds.";
    const err: any = new Error(msg);
    err.status = 429;
    throw err;
  }
  if (res.status === 401 || res.status === 403)
    throw new Error("The Gemini API key was rejected.");
  if (!res.ok) {
    const detail = responseBody?.error?.message;
    const err: any = new Error(
      detail
        ? `Gemini API error: ${detail}`
        : `The nemesis is ignoring you (${res.status}).`,
    );
    err.status = res.status;
    throw err;
  }
  return responseBody;
}

async function callGemini(preferredModel: string, body: unknown) {
  // Try preferred model first, then failover through available models
  const modelsToTry = [
    preferredModel,
    ...TEXT_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastError: Error | null = null;
  for (const model of modelsToTry) {
    try {
      return await callGeminiSingle(model, body);
    } catch (err: any) {
      lastError = err;
      // If 429 (quota), 503 (demand spike), or 404 (deprecated), fail over to next model
      const msg = err?.message || "";
      if (
        err?.status === 429 ||
        err?.status === 503 ||
        err?.status === 404 ||
        msg.includes("Too many rants") ||
        msg.includes("quota") ||
        msg.includes("demand") ||
        msg.includes("no longer available")
      ) {
        continue;
      }
      throw err;
    }
  }

  throw (
    lastError ||
    new Error("Too many rants at once across all models. Please wait 15 seconds.")
  );
}

export const createNemesis = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ description: z.string().min(3).max(600) }).parse(data),
  )
  .handler(async ({ data }) => {
    // Generate nickname and traits first using high-availability flash models
    const nickPromise = callGemini("gemini-3.5-flash", {
      systemInstruction: {
        parts: [
          {
            text: "Invent a silly, affectionate-mean nickname for a fictional cartoon nemesis based on a behaviour description. Two or three words, title case, describing the ANNOYING HABIT only. Examples: Meeting Hijacker, Samosa Thief, Reply-All Baron. Never use a real person's name even if one appears in the description. Reply with the nickname only, no punctuation.",
          },
        ],
      },
      contents: [{ role: "user", parts: [{ text: data.description }] }],
    });

    // Attempt cartoon image generation, gracefully fallback to cartoon DiceBear without console spam
    const imagePromise = callGeminiSingle("gemini-2.5-flash-image", {
      contents: [
        { role: "user", parts: [{ text: AVATAR_PROMPT(data.description) }] },
      ],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }).catch(() => null);

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
      .filter((t) => t.length > 2)
      .slice(0, 4);

    return { avatarUrl, nickname, traits };
  });

export const ventToNemesis = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        nickname: z.string().max(60),
        description: z.string().max(600),
        mode: z.enum(["pushover", "villain"]).default("pushover"),
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
    const systemInstruction = `${SYSTEM_PROMPT}\n\nCurrent Mode: '${data.mode}'. Strictly adhere to the instructions for mode '${data.mode}'.\nYou are currently playing the character nicknamed "${data.nickname}", built from this description: ${data.description}`;
    const json = await callGemini("gemini-3.5-flash", {
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
