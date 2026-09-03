import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { createNemesis, ventToNemesis } from "@/lib/nemesis.functions";
import { detectPii, piiWarning } from "@/lib/pii";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "പറയാതെ വയ്യ (Parayathe Vayya) — Vent At A Cartoon Nemesis" },
      {
        name: "description",
        content:
          "Describe a fictional nemesis, get a comedic cartoon caricature, and vent at it. Nothing is saved — everything vanishes when the session ends.",
      },
      { property: "og:title", content: "പറയാതെ വയ്യ (Parayathe Vayya) — Vent At A Cartoon Nemesis" },
      {
        property: "og:description",
        content:
          "A useless, lighthearted stress-relief gag: rant at a cartoon caricature that forgets everything.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DearNoBody,
});

type Msg = { role: "user" | "assistant"; content: string };
type NemesisMode = "pushover" | "villain";

function DearNoBody() {
  const create = useServerFn(createNemesis);
  const vent = useServerFn(ventToNemesis);

  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<NemesisMode>("pushover");
  const [nemesis, setNemesis] = useState<{
    avatarUrl: string | null;
    nickname: string;
    traits: string[];
  } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [poof, setPoof] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function summon() {
    const found = detectPii(description);
    if (found.length) {
      setWarning(piiWarning(found));
      return;
    }
    setWarning(null);
    setError(null);
    setBusy(true);
    try {
      const result = await create({ data: { description } });
      setNemesis(result);
      setMessages([
        {
          role: "assistant",
          content:
            mode === "villain"
              ? "Mwahaha! You dare summon ME?! Prepare to face my unbridled genius! ...Wait, why are you glaring at me? What did I do now?"
              : "Oh good, you're here. Let me guess — this is somehow my fault.",
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something broke. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!draft.trim() || !nemesis) return;
    const found = detectPii(draft);
    if (found.length) {
      setWarning(piiWarning(found));
      return;
    }
    setWarning(null);
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: draft.trim() }];
    setMessages(next);
    setDraft("");
    setThinking(true);
    try {
      const { reply } = await vent({
        data: {
          nickname: nemesis.nickname,
          description,
          mode,
          messages: next,
        },
      });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The nemesis is buffering.");
    } finally {
      setThinking(false);
    }
  }

  function endSession() {
    setPoof(true);
    window.setTimeout(() => {
      setDescription("");
      setDraft("");
      setNemesis(null);
      setMessages([]);
      setWarning(null);
      setError(null);
      setPoof(false);
    }, 450);
  }

  const [poofNote, setPoofNote] = useState(false);
  useEffect(() => {
    if (!poof) return;
    setPoofNote(true);
    const t = window.setTimeout(() => setPoofNote(false), 4000);
    return () => window.clearTimeout(t);
  }, [poof]);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-paper text-ink font-body select-none relative">
      {/* Main View Area */}
      {!nemesis ? (
        <main className="flex-1 grid lg:grid-cols-12 bg-paper relative">
          {/* Top-Right Controls for Setup Screen */}
          <div className="absolute top-3 right-4 md:top-4 md:right-8 z-20 flex items-center gap-3">
            <nav className="hidden sm:flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] bg-surface/90 backdrop-blur border border-ink/20 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="text-brand">01 Describe & Mode</span>
              <span className="text-ink/30">/</span>
              <span className="text-ink/40">02 Vent</span>
              <span className="text-ink/30">/</span>
              <span className="text-ink/40">03 Wipe</span>
            </nav>
            <ThemeToggle />
          </div>
          {/* Left Column: Hero & Poster */}
          <section className="lg:col-span-5 border-b-2 lg:border-b-0 lg:border-r-2 border-ink p-6 md:p-10 flex flex-col justify-between relative overflow-hidden bg-paper">
            <div className="diagonal absolute inset-0 opacity-[0.05] pointer-events-none" />
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand">
                No session yet
              </p>

              {/* Prominent Project Name */}
              <div className="mt-3">
                <span className="slant inline-block bg-ink px-3 py-1 font-display text-2xl sm:text-3xl lg:text-4xl tracking-wide text-paper shadow-[3px_3px_0px_0px_var(--color-brand)]">
                  പറയാതെ വയ്യ
                </span>
                <h1 className="mt-2 font-display text-4xl sm:text-5xl lg:text-6xl uppercase leading-[0.88] tracking-tight">
                  Parayathe <span className="text-brand">Vayya</span>
                </h1>
              </div>

              {/* Appropriately Sized Tagline */}
              <p className="mt-3 font-display text-lg sm:text-xl uppercase tracking-wide text-brand flex items-center gap-2">
                <span className="h-1.5 w-5 bg-brand inline-block" />
                Take it out on nobody.
              </p>

              <p className="mt-3 max-w-md text-sm font-medium text-ink/70 leading-relaxed md:text-base">
                Describe your fictional nemesis, pick their personality, blow off steam, and watch them comically collapse. Everything vanishes when the session ends.
              </p>
              {poofNote && (
                <div className="mt-4">
                  <p className="slant inline-block bg-accent-yellow px-3 py-1 font-display text-base uppercase text-ink shadow-[2px_2px_0px_0px_var(--color-ink)]">
                    Poof. Gone. Feel better?
                  </p>
                </div>
              )}
            </div>

            <div className="relative z-10 mt-6 pt-6 border-t-2 border-ink/10 hidden sm:block">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/50">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                Ephemeral session • Zero data stored • 100% fictional
              </div>
            </div>
          </section>

          {/* Right Column: Setup Form & Mode Selector */}
          <section className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center overflow-y-auto">
            <div className="max-w-xl mx-auto w-full space-y-5">
              {/* Step 01: Description */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="slant bg-brand px-2 py-0.5 font-display text-xs text-ink">
                    STEP 01
                  </span>
                  <label htmlFor="nemesis-description" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50">
                    Describe your nemesis
                  </label>
                </div>
                <textarea
                  id="nemesis-description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setWarning(null);
                  }}
                  rows={3}
                  placeholder="Traits, annoying habits, vibe. Hijacks meetings, microwaves fish, replies-all with 'Thanks!'…"
                  className="mt-2 w-full resize-none rounded-lg border-2 border-ink bg-surface px-4 py-2.5 text-sm font-medium placeholder:text-ink/30 focus:border-brand focus:outline-none transition-colors"
                />
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40">
                  No real names or photos — this stays strictly fictional and silly.
                </p>
              </div>

              {/* Step 02: Mode Selector */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="slant bg-accent-yellow px-2 py-0.5 font-display text-xs text-ink">
                    STEP 02
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50">
                    Select Nemesis Personality
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pushover Option */}
                  <button
                    type="button"
                    onClick={() => setMode("pushover")}
                    className={`group relative flex flex-col items-start rounded-lg border-2 p-3.5 text-left transition-all cursor-pointer ${
                      mode === "pushover"
                        ? "border-brand bg-brand/10 shadow-[3px_3px_0px_0px_var(--color-ink)]"
                        : "border-ink/20 bg-surface/50 hover:border-ink/60"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={`slant px-2 py-0.5 font-display text-xs uppercase tracking-wide ${
                          mode === "pushover"
                            ? "bg-brand text-ink"
                            : "bg-ink/10 text-ink/70"
                        }`}
                      >
                        Pushover
                      </span>
                      <span
                        className={`h-3 w-3 rounded-full border-2 border-ink transition-colors ${
                          mode === "pushover" ? "bg-brand" : "bg-transparent"
                        }`}
                      />
                    </div>
                    <p className="mt-2.5 text-xs font-bold text-ink uppercase tracking-wide">
                      Agrees & Concedes
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink/70">
                      Quickly and warmly admits defeat with comedic, self-aware surrender.
                    </p>
                  </button>

                  {/* Villain Option */}
                  <button
                    type="button"
                    onClick={() => setMode("villain")}
                    className={`group relative flex flex-col items-start rounded-lg border-2 p-3.5 text-left transition-all cursor-pointer ${
                      mode === "villain"
                        ? "border-brand bg-brand/10 shadow-[3px_3px_0px_0px_var(--color-ink)]"
                        : "border-ink/20 bg-surface/50 hover:border-ink/60"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={`slant px-2 py-0.5 font-display text-xs uppercase tracking-wide ${
                          mode === "villain"
                            ? "bg-brand text-ink"
                            : "bg-ink/10 text-ink/70"
                        }`}
                      >
                        Villain
                      </span>
                      <span
                        className={`h-3 w-3 rounded-full border-2 border-ink transition-colors ${
                          mode === "villain" ? "bg-brand" : "bg-transparent"
                        }`}
                      />
                    </div>
                    <p className="mt-2.5 text-xs font-bold text-ink uppercase tracking-wide">
                      Dramatic Antagonist
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink/70">
                      Boastful comic supervillain monologue whose confidence instantly crumbles.
                    </p>
                  </button>
                </div>
              </div>

              {/* Warnings / Errors */}
              {warning && (
                <p className="border-2 border-brand bg-surface px-4 py-2.5 text-xs font-semibold text-brand">
                  {warning}
                </p>
              )}
              {error && (
                <p className="border-2 border-ink bg-surface px-4 py-2.5 text-xs font-semibold">
                  {error}
                </p>
              )}

              {/* Submit CTA */}
              <button
                onClick={summon}
                disabled={busy || description.trim().length < 3}
                className="slant w-full bg-ink px-4 py-3 font-display text-lg uppercase tracking-wide text-paper transition-all hover:bg-brand hover:text-ink disabled:opacity-40 shadow-[3px_3px_0px_0px_var(--color-brand)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              >
                {busy ? "Sketching your caricature…" : `Summon ${mode === "villain" ? "The Villain" : "The Pushover"}`}
              </button>
            </div>
          </section>
        </main>
      ) : (
        /* Chat State - Covers full screen, with page scrolling enabled on small proportions */
        <main
          className={`flex-1 grid lg:grid-cols-12 bg-paper transition-opacity duration-300 lg:min-h-0 lg:h-full lg:overflow-hidden ${
            poof ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Left Column: Nemesis Profile Panel */}
          <section className="lg:col-span-4 xl:col-span-3 border-b-2 lg:border-b-0 lg:border-r-2 border-ink flex flex-col justify-between p-4 md:p-6 lg:overflow-y-auto bg-surface/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="slant bg-brand px-2 py-0.5 font-display text-xs text-ink">
                    NEMESIS
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/40">
                    Your rival
                  </span>
                </div>
                <span className="slant bg-accent-yellow px-2 py-0.5 font-display text-[11px] uppercase tracking-wide text-ink">
                  {mode === "villain" ? "Mode: Villain" : "Mode: Pushover"}
                </span>
              </div>

              {/* Avatar Box */}
              <div className="relative mx-auto w-full max-w-[200px] aspect-square rounded-xl overflow-hidden bg-ink/5 border-2 border-ink shadow-[3px_3px_0px_0px_var(--color-ink)]">
                {nemesis.avatarUrl ? (
                  <img
                    src={nemesis.avatarUrl}
                    alt={`Cartoon caricature of ${nemesis.nickname}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/30">
                    Caricature unavailable
                  </div>
                )}
                <span className="slant absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-accent-yellow px-2.5 py-0.5 font-display text-xs text-ink border border-ink">
                  {nemesis.nickname}
                </span>
              </div>

              {/* Traits List */}
              <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                {nemesis.traits.map((trait, i) => (
                  <div key={i} className="flex items-start gap-2 bg-surface/60 border border-ink/15 rounded-md p-2 shadow-xs">
                    <span className="slant shrink-0 bg-ink px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-paper mt-0.5">
                      Trait
                    </span>
                    <span className="text-xs font-semibold text-ink leading-snug break-words">
                      {trait}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Redraw CTA */}
            <div className="pt-3">
              <button
                onClick={summon}
                disabled={busy}
                className="slant w-full bg-surface border-2 border-ink px-3 py-2 font-display text-sm uppercase tracking-wide text-ink transition-colors hover:bg-brand hover:text-ink disabled:opacity-40 cursor-pointer shadow-[2px_2px_0px_0px_var(--color-ink)]"
              >
                {busy ? "Redrawing…" : "Redraw caricature"}
              </button>
            </div>
          </section>

          {/* Right Column: Chat Console */}
          <section className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-[480px] lg:min-h-0 lg:h-full lg:overflow-hidden bg-paper">
            {/* Chat Sub-Header */}
            <div className="shrink-0 flex items-center justify-between border-b-2 border-ink px-4 py-3 md:px-6 bg-surface/40 gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg uppercase tracking-wide truncate">The Vent</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50 truncate">
                  {mode === "villain" ? "Cartoon Villain Monologue" : "Instant Concession"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="slant bg-accent-yellow px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink border border-ink whitespace-nowrap">
                  Rant level: {messages.length > 8 ? "Nuclear" : messages.length > 4 ? "High" : "Warming up"}
                </span>
                <ThemeToggle />
              </div>
            </div>

            {/* Scrollable Message Bubbles Area */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 p-4 md:p-6 select-text">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-paper shadow-[2px_2px_0px_0px_var(--color-brand)]">
                      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-paper/50">
                        You
                      </p>
                      <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-sm border-2 border-ink bg-surface px-4 py-2.5 shadow-[2px_2px_0px_0px_var(--color-ink)]">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand">
                          {nemesis.nickname}
                        </p>
                        <span className="text-[8px] font-bold uppercase px-1 py-0.2 bg-ink/10 rounded text-ink/60">
                          {mode}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border-2 border-ink bg-surface px-4 py-2.5 text-xs font-medium text-ink/50 animate-pulse">
                    {mode === "villain" ? "plotting theatrical monologue…" : "preparing swift concession…"}
                  </div>
                </div>
              )}
              <div ref={chatEnd} />
            </div>

            {/* Bottom Controls Area */}
            <div className="shrink-0 border-t-2 border-ink p-3 md:p-4 space-y-2.5 bg-paper">
              {warning && (
                <p className="border-2 border-brand bg-surface px-3 py-2 text-xs font-semibold text-brand">
                  {warning}
                </p>
              )}
              {error && (
                <p className="border-2 border-ink bg-surface px-3 py-2 text-xs font-semibold">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setWarning(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={`Vent something at ${nemesis.nickname}…`}
                  className="grow rounded-lg border-2 border-ink bg-surface px-3.5 py-2.5 text-sm font-medium placeholder:text-ink/30 focus:border-brand focus:outline-none transition-colors"
                />
                <button
                  onClick={send}
                  disabled={thinking || !draft.trim()}
                  className="slant whitespace-nowrap bg-brand px-5 py-2.5 font-display text-sm uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-40 cursor-pointer shadow-[2px_2px_0px_0px_var(--color-ink)]"
                >
                  Send
                </button>
              </div>
              <button
                onClick={endSession}
                className="slant flex w-full items-center justify-center gap-2 bg-ink px-3 py-2.5 font-display text-base uppercase tracking-wide text-paper transition-colors hover:bg-brand hover:text-ink cursor-pointer shadow-[2px_2px_0px_0px_var(--color-brand)] active:translate-x-0.5 active:translate-y-0.5"
              >
                <span className="bg-brand px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wide text-ink">
                  Final
                </span>
                End session — wipe everything
              </button>
            </div>
          </section>
        </main>
      )}

      {/* Pinned Bottom Footer */}
      <footer className="shrink-0 flex items-center justify-between border-t-2 border-ink px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/40 md:px-8 bg-paper">
        <span>Nothing here is saved. Nothing here is real.</span>
        <span className="hidden sm:inline">Please don't actually be mean to people.</span>
      </footer>
    </div>
  );
}
