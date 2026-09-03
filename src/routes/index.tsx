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
          "Describe a fictional nemesis, get a comedic cartoon caricature, and vent at it in Manglish, Malayalam, or English. Nothing is saved — everything vanishes when the session ends.",
      },
      { property: "og:title", content: "പറയാതെ വയ്യ (Parayathe Vayya) — Vent At A Cartoon Nemesis" },
      {
        property: "og:description",
        content:
          "A useless, lighthearted stress-relief gag: rant at a cartoon caricature in Manglish that forgets everything.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DearNoBody,
});

type Msg = { role: "user" | "assistant"; content: string };
type NemesisMode = "pushover" | "villain";

const VENT_SPARKS = [
  "🐟 9 AM-ന് മീൻ വറുത്തവൻ",
  "☕ ചായ ഫ്ലാസ്ക് കാലിയാക്കിവെച്ചവൻ",
  "📧 വെറുതെ 'Thanks!' എന്ന് Reply-All ഇടുന്നവൻ",
  "⏰ വെള്ളിയാഴ്ച 4:59-ന് Meeting വെച്ചവൻ",
  "🍗 ബിരിയാണിയിലെ Leg Piece തട്ടിയെടുത്തവൻ",
  "👀 'Per my last email' സ്മൈലി അയക്കുന്നവൻ",
];

function getRantBadge(count: number) {
  if (count > 8) return { emoji: "🌋", label: "ആകെ കിളി പോയി!", color: "bg-brand text-ink" };
  if (count > 5) return { emoji: "🔥", label: "ചൂട് കയറി!", color: "bg-brand/80 text-ink" };
  if (count > 2) return { emoji: "😤", label: "സീൻ കോൺട്രാ!", color: "bg-accent-yellow text-ink" };
  return { emoji: "😊", label: "ചെറിയ ദേഷ്യം", color: "bg-surface text-ink" };
}

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStats, setReportStats] = useState<{
    rantCount: number;
    rivalName: string;
    mode: NemesisMode;
  } | null>(null);

  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function addSpark(spark: string) {
    const clean = spark.replace(/^[\p{Emoji}\s]+/u, "").trim();
    setDescription((prev) => {
      if (!prev.trim()) return clean;
      if (prev.includes(clean)) return prev;
      return `${prev.trim()}, ${clean}`;
    });
    setWarning(null);
  }

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
              ? "Aahaa! MWAHAHA! Nee enne aano vilichu വരുത്തിയേ?! Ente power ninakkariyilla! ...Wait, entha angane nokkunne? Njan ipo entha cheythe?"
              : "Oh pinne, nee vannallo. Let me guess — ithum ente thettaanu le? Ayyoo sorry bro!",
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The nemesis got scared and ran away. Try again!");
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
      setError(e instanceof Error ? e.message : "The nemesis choked on their words. Try again!");
    } finally {
      setThinking(false);
    }
  }

  function requestErase() {
    setShowConfirmModal(true);
  }

  function handleConfirmErase() {
    const userRants = messages.filter((m) => m.role === "user").length;
    setReportStats({
      rantCount: userRants,
      rivalName: nemesis?.nickname || "Your Nemesis",
      mode,
    });
    setShowConfirmModal(false);
    setShowReportModal(true);
  }

  function handleFinishReport() {
    setShowReportModal(false);
    setReportStats(null);
    endSession();
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
    const t = window.setTimeout(() => setPoofNote(false), 4500);
    return () => window.clearTimeout(t);
  }, [poof]);

  const rantBadge = getRantBadge(messages.length);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-paper text-ink font-body select-none relative">
      {/* Main View Area */}
      {!nemesis ? (
        <main className="flex-1 grid lg:grid-cols-12 bg-paper relative">
          {/* Top-Right Controls for Setup Screen */}
          <div className="absolute top-3 right-4 md:top-4 md:right-8 z-20 flex items-center gap-3">
            <nav className="hidden sm:flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] bg-surface/90 backdrop-blur border-2 border-ink px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px_var(--color-ink)]">
              <span className="text-brand flex items-center gap-1">
                <span>🎨</span> 01 Setup
              </span>
              <span className="text-ink/30">/</span>
              <span className="text-ink/40">02 Vent</span>
              <span className="text-ink/30">/</span>
              <span className="text-ink/40">03 Wipe</span>
            </nav>
            <ThemeToggle />
          </div>

          {/* Left Column: Comic Hero & Mascot Poster */}
          <section className="lg:col-span-5 border-b-2 lg:border-b-0 lg:border-r-2 border-ink p-6 md:p-10 flex flex-col justify-between relative overflow-hidden bg-paper">
            <div className="comic-dots absolute inset-0 opacity-[0.07] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="slant bg-accent-yellow px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink border-2 border-ink shadow-[2px_2px_0px_0px_var(--color-ink)]">
                  🥊 തഗ്ഗ് തെറാപ്പി
                </span>
                <span className="slant bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink border-2 border-ink shadow-[2px_2px_0px_0px_var(--color-ink)]">
                  🗯️ 100% കോമഡി
                </span>
              </div>

              {/* Prominent Project Name */}
              <div className="mt-3">
                <span className="slant inline-block bg-ink px-3 py-1 font-display text-2xl sm:text-3xl lg:text-4xl tracking-wide text-paper shadow-[3px_3px_0px_0px_var(--color-brand)]">
                  പറയാതെ വയ്യ
                </span>
                <h1 className="mt-2 font-display text-4xl sm:text-5xl lg:text-6xl uppercase leading-[0.88] tracking-tight flex items-center gap-2">
                  Parayathe <span className="text-brand">Vayya</span>
                  <span className="text-3xl animate-bounce">💢</span>
                </h1>
              </div>

              {/* Playful Tagline */}
              <div className="mt-3 inline-flex items-center gap-2 bg-surface border-2 border-ink px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_var(--color-ink)]">
                <span className="text-sm">💬</span>
                <p className="font-display text-base sm:text-lg uppercase tracking-wide text-brand">
                  Take it out on nobody!
                </p>
              </div>

              <p className="mt-3 max-w-md text-sm font-medium text-ink/75 leading-relaxed md:text-base">
                ഓഫീസിലോ ലൈഫിലോ കലിപ്പായ ആൾക്കാരുണ്ടോ? മനസ്സിൽ തോന്നിയതൊക്കെ പറയാം — ആരും അറിയാതെ, ഒരു തെളിവും ഇല്ലാതെ! Type in Manglish, Malayalam, or English and watch them comically collapse!
              </p>

              {poofNote && (
                <div className="mt-4 animate-bounce">
                  <p className="slant inline-flex items-center gap-2 bg-accent-yellow px-3.5 py-1.5 font-display text-base uppercase text-ink border-2 border-ink shadow-[3px_3px_0px_0px_var(--color-ink)]">
                    <span>✨</span> Poof! Vanished forever into the void! Feel lighter?
                  </p>
                </div>
              )}
            </div>

            <div className="relative z-10 mt-6 pt-6 border-t-2 border-ink/10 hidden sm:block">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/60">
                <span className="h-2 w-2 rounded-full bg-brand animate-ping" />
                🪄 ഒരു ഡാറ്റയും സേവ് ചെയ്യില്ല • 100% Private • Everything poofs
              </div>
            </div>
          </section>

          {/* Right Column: Setup Form & Comedy Mode Selector */}
          <section className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center overflow-y-auto">
            <div className="max-w-xl mx-auto w-full space-y-5 pt-8 sm:pt-0">
              {/* Step 01: Description */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="slant bg-brand px-2 py-0.5 font-display text-xs text-ink border border-ink shadow-[2px_2px_0px_0px_var(--color-ink)]">
                      STEP 01
                    </span>
                    <label htmlFor="nemesis-description" className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink/60">
                      ആരാണ് നിങ്ങളുടെ വില്ലൻ?
                    </label>
                  </div>
                  <span className="text-[10px] font-semibold text-ink/40">Manglish / Malayalam / English</span>
                </div>

                <textarea
                  id="nemesis-description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setWarning(null);
                  }}
                  rows={3}
                  placeholder="Traits & annoying habits. e.g. Ee meeting muzhuvan hijack cheyyum, 9 AM-nu fish microwave cheyyum, chumma 'Thanks!' ennu reply-all idum…"
                  className="mt-2 w-full resize-none rounded-xl border-2 border-ink bg-surface px-4 py-3 text-sm font-medium placeholder:text-ink/35 focus:border-brand focus:outline-none transition-colors shadow-[3px_3px_0px_0px_var(--color-ink)]"
                />

                {/* Quick Vent Sparks */}
                <div className="mt-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink/50 mb-1.5 flex items-center gap-1">
                    <span>💡</span> Click an annoying habit spark:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {VENT_SPARKS.map((spark, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => addSpark(spark)}
                        className="text-[11px] font-semibold bg-surface hover:bg-accent-yellow border border-ink/40 hover:border-ink px-2.5 py-1 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                      >
                        {spark}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40 flex items-center gap-1">
                  <span>🔒</span> Strictly fictional — no real names or public figures.
                </p>
              </div>

              {/* Step 02: Mode Selector */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="slant bg-accent-yellow px-2 py-0.5 font-display text-xs text-ink border border-ink shadow-[2px_2px_0px_0px_var(--color-ink)]">
                    STEP 02
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink/60">
                    Pick Personality Style
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pushover Option */}
                  <button
                    type="button"
                    onClick={() => setMode("pushover")}
                    className={`group relative flex flex-col items-start rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer ${
                      mode === "pushover"
                        ? "border-ink bg-surface shadow-[4px_4px_0px_0px_var(--color-brand)] scale-[1.01]"
                        : "border-ink/30 bg-surface/50 hover:border-ink hover:bg-surface/80"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={`slant px-2.5 py-0.5 font-display text-xs uppercase tracking-wide border border-ink shadow-[1px_1px_0px_0px_var(--color-ink)] ${
                          mode === "pushover"
                            ? "bg-brand text-ink"
                            : "bg-ink/10 text-ink/70"
                        }`}
                      >
                        🥺 പാവം തോൽവി
                      </span>
                      <span className="text-lg">👉👈</span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-ink uppercase tracking-wide">
                      Instant Apology & Surrender
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink/70 italic">
                      “Ayyoo ente thettaanu bro, please enne thallalle!”
                    </p>
                  </button>

                  {/* Villain Option */}
                  <button
                    type="button"
                    onClick={() => setMode("villain")}
                    className={`group relative flex flex-col items-start rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer ${
                      mode === "villain"
                        ? "border-ink bg-surface shadow-[4px_4px_0px_0px_var(--color-brand)] scale-[1.01]"
                        : "border-ink/30 bg-surface/50 hover:border-ink hover:bg-surface/80"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={`slant px-2.5 py-0.5 font-display text-xs uppercase tracking-wide border border-ink shadow-[1px_1px_0px_0px_var(--color-ink)] ${
                          mode === "villain"
                            ? "bg-accent-yellow text-ink"
                            : "bg-ink/10 text-ink/70"
                        }`}
                      >
                        🦹‍♂️ സീൻ വില്ലൻ
                      </span>
                      <span className="text-lg">⚡</span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-ink uppercase tracking-wide">
                      Theatrical Monologue & Collapse
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink/70 italic">
                      “MWAHAHA! Njan aara mon! ...Wait, sherikkum athu thettaanu, sorry!”
                    </p>
                  </button>
                </div>
              </div>

              {/* Warnings / Errors */}
              {warning && (
                <p className="border-2 border-brand bg-surface px-4 py-2.5 text-xs font-semibold text-brand rounded-lg shadow-sm">
                  ⚠️ {warning}
                </p>
              )}
              {error && (
                <p className="border-2 border-ink bg-surface px-4 py-2.5 text-xs font-semibold rounded-lg shadow-sm">
                  🛑 {error}
                </p>
              )}

              {/* Submit CTA */}
              <button
                onClick={summon}
                disabled={busy || description.trim().length < 3}
                className="slant w-full bg-ink px-4 py-3.5 font-display text-lg uppercase tracking-wide text-paper transition-all hover:bg-brand hover:text-ink disabled:opacity-40 shadow-[4px_4px_0px_0px_var(--color-brand)] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{busy ? "🎨 വരച്ചുണ്ടാക്കുന്നു…" : mode === "villain" ? "⚡ സീൻ വില്ലനെ വിളിക്ക്!" : "🥺 പാവം തോൽവിയെ വിളിക്ക്!"}</span>
              </button>
            </div>
          </section>
        </main>
      ) : (
        /* Chat State - Covers full screen with internal scroll on desktop and page scroll on small viewports */
        <main
          className={`flex-1 grid lg:grid-cols-12 bg-paper transition-opacity duration-300 lg:min-h-0 lg:h-full lg:overflow-hidden ${
            poof ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Left Column: Nemesis Profile Panel */}
          <section className="lg:col-span-4 xl:col-span-3 border-b-2 lg:border-b-0 lg:border-r-2 border-ink flex flex-col justify-between p-4 md:p-6 lg:overflow-y-auto bg-surface/30 relative">
            <div className="comic-dots absolute inset-0 opacity-[0.05] pointer-events-none" />
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="slant bg-brand px-2 py-0.5 font-display text-xs text-ink border border-ink shadow-[2px_2px_0px_0px_var(--color-ink)]">
                    NEMESIS
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">
                    Your rival
                  </span>
                </div>
                <span className="slant bg-accent-yellow px-2.5 py-0.5 font-display text-[11px] uppercase tracking-wide text-ink border border-ink shadow-[1px_1px_0px_0px_var(--color-ink)] whitespace-nowrap">
                  {mode === "villain" ? "🦹‍♂️ സീൻ വില്ലൻ" : "🥺 പാവം തോൽവി"}
                </span>
              </div>

              {/* Avatar Box with Comic Accents */}
              <div className="relative mx-auto w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden bg-ink/5 border-2 border-ink shadow-[4px_4px_0px_0px_var(--color-ink)]">
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
                <span className="slant absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-accent-yellow px-3 py-1 font-display text-xs text-ink border-2 border-ink shadow-[2px_2px_0px_0px_var(--color-ink)]">
                  {nemesis.nickname}
                </span>
              </div>

              {/* Traits List */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50 mb-1.5 flex items-center gap-1">
                  <span>🏷️</span> Annoying Quirks:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {nemesis.traits.map((trait, i) => (
                    <div key={i} className="flex items-start gap-2 bg-surface border-2 border-ink/20 rounded-xl p-2 shadow-[2px_2px_0px_0px_var(--color-ink)]">
                      <span className="slant shrink-0 bg-ink px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-paper mt-0.5">
                        Quirk
                      </span>
                      <span className="text-xs font-semibold text-ink leading-snug break-words">
                        {trait}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Redraw CTA */}
            <div className="pt-3 relative z-10">
              <button
                onClick={summon}
                disabled={busy}
                className="slant w-full bg-surface border-2 border-ink px-3 py-2 font-display text-xs uppercase tracking-wide text-ink transition-all hover:bg-brand hover:text-ink disabled:opacity-40 cursor-pointer shadow-[2px_2px_0px_0px_var(--color-ink)] flex items-center justify-center gap-1.5"
              >
                <span>🎨</span> {busy ? "വരച്ചുണ്ടാക്കുന്നു…" : "Redraw caricature"}
              </button>
            </div>
          </section>

          {/* Right Column: Comic Chat Console */}
          <section className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-[480px] lg:min-h-0 lg:h-full lg:overflow-hidden bg-paper">
            {/* Chat Sub-Header: Chat Room with Nemesis Nickname */}
            <div className="shrink-0 flex items-center justify-between border-b-2 border-ink px-4 py-3 md:px-6 bg-surface/40 gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg uppercase tracking-wide truncate flex items-center gap-1.5">
                  <span>💬</span> Chat with {nemesis.nickname}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50 truncate">
                  {mode === "villain" ? "മാസ്സ് ഡയലോഗ് അടിക്കും, ഒടുവിൽ ചീറ്റും!" : "പെട്ടെന്ന് തന്നെ കൈകൂപ്പി തോറ്റു തരും!"}
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Comedy Rant-O-Meter in Manglish/Malayalam */}
                <div
                  className={`slant px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border-2 border-ink shadow-[2px_2px_0px_0px_var(--color-ink)] flex items-center gap-1 ${rantBadge.color}`}
                >
                  <span>{rantBadge.emoji}</span>
                  <span>{rantBadge.label}</span>
                </div>
                <ThemeToggle />
              </div>
            </div>

            {/* Scrollable Message Bubbles Area */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 p-4 md:p-6 select-text">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-3xl rounded-br-xs bg-ink px-4 py-3 text-paper shadow-[3px_3px_0px_0px_var(--color-brand)]">
                      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-paper/60">
                        You
                      </p>
                      <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start">
                    <div className="max-w-[80%] rounded-3xl rounded-bl-xs border-2 border-ink bg-surface px-4 py-3 shadow-[3px_3px_0px_0px_var(--color-ink)]">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand flex items-center gap-1">
                          <span>{mode === "villain" ? "🦹‍♂️" : "🥺"}</span> {nemesis.nickname}
                        </p>
                        <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 bg-ink/10 rounded-full text-ink/60">
                          {mode === "villain" ? "സീൻ വില്ലൻ" : "പാവം തോൽവി"}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className="flex justify-start">
                  <div className="rounded-3xl rounded-bl-xs border-2 border-ink bg-surface px-4 py-2.5 text-xs font-semibold text-ink/60 shadow-[2px_2px_0px_0px_var(--color-ink)] animate-pulse flex items-center gap-2">
                    <span className="text-base">💭</span>
                    <span>{mode === "villain" ? "ഡയലോഗ് ആലോചിക്കുന്നു…" : "മാപ്പ് പറയാൻ റെഡിയാവുന്നു…"}</span>
                  </div>
                </div>
              )}
              <div ref={chatEnd} />
            </div>

            {/* Bottom Controls Area */}
            <div className="shrink-0 border-t-2 border-ink p-3 md:p-4 space-y-2.5 bg-paper">
              {warning && (
                <p className="border-2 border-brand bg-surface px-3 py-2 text-xs font-semibold text-brand rounded-lg">
                  ⚠️ {warning}
                </p>
              )}
              {error && (
                <p className="border-2 border-ink bg-surface px-3 py-2 text-xs font-semibold rounded-lg">
                  🛑 {error}
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
                  placeholder={
                    mode === "villain"
                      ? `${nemesis.nickname}-ഓട് എന്താ പറയാനുള്ളത്?…`
                      : `${nemesis.nickname}-ഇട്ട് താങ്ങ്…`
                  }
                  className="grow rounded-xl border-2 border-ink bg-surface px-4 py-2.5 text-sm font-medium placeholder:text-ink/30 focus:border-brand focus:outline-none transition-colors shadow-[2px_2px_0px_0px_var(--color-ink)]"
                />
                <button
                  onClick={send}
                  disabled={thinking || !draft.trim()}
                  className="slant whitespace-nowrap bg-brand px-5 py-2.5 font-display text-sm uppercase tracking-wide text-ink transition-all hover:bg-ink hover:text-paper disabled:opacity-40 cursor-pointer shadow-[2px_2px_0px_0px_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5"
                >
                  💥 Vent!
                </button>
              </div>

              {/* Erase button triggers confirmation modal */}
              <button
                type="button"
                onClick={requestErase}
                className="slant flex w-full items-center justify-center gap-2 bg-ink px-3 py-2.5 font-display text-base uppercase tracking-wide text-paper transition-all hover:bg-brand hover:text-ink cursor-pointer shadow-[3px_3px_0px_0px_var(--color-brand)] active:translate-x-0.5 active:translate-y-0.5"
              >
                <span className="bg-brand px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wide text-ink rounded">
                  POOF
                </span>
                <span>💥 എല്ലാം തൂത്തു തുടച്ച് കളയ് 💨</span>
              </button>
            </div>
          </section>
        </main>
      )}

      {/* Wipe Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper border-3 border-ink rounded-3xl p-6 max-w-md w-full shadow-[6px_6px_0px_0px_var(--color-ink)] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2">
              <span className="slant bg-brand px-2.5 py-0.5 font-display text-xs text-ink border border-ink shadow-[2px_2px_0px_0px_var(--color-ink)]">
                CONFIRM WIPE
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
                എല്ലാം ഡിലീറ്റ് ചെയ്യട്ടെ?
              </span>
            </div>

            <h3 className="font-display text-2xl uppercase tracking-tight text-ink">
              എല്ലാം മായ്ച്ച് കളയട്ടെ? 💥
            </h3>

            <p className="text-sm text-ink/75 leading-relaxed font-medium">
              Are you sure? ഇതോടെ ഈ ചാറ്റും <span className="font-bold text-ink">{nemesis?.nickname}</span>-ഉം ആരും കാണാതെ മാഞ്ഞുപോകും. ഒരു തെളിവും ഉണ്ടാവില്ല!
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="slant flex-1 bg-surface border-2 border-ink px-4 py-2.5 font-display text-sm uppercase tracking-wide text-ink hover:bg-ink/10 cursor-pointer transition-colors shadow-[2px_2px_0px_0px_var(--color-ink)]"
              >
                ഇറങ്ങിപ്പോകല്ലേ
              </button>
              <button
                type="button"
                onClick={handleConfirmErase}
                className="slant flex-1 bg-brand border-2 border-ink px-4 py-2.5 font-display text-sm uppercase tracking-wide text-ink hover:bg-ink hover:text-paper cursor-pointer transition-all shadow-[2px_2px_0px_0px_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5"
              >
                യെസ്, തൂത്ത് കളയ്! 💨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rant Relief Report Modal */}
      {showReportModal && reportStats && (
        <div className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper border-3 border-ink rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-[8px_8px_0px_0px_var(--color-brand)] space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Stamp */}
            <div className="flex items-center justify-between">
              <span className="slant bg-accent-yellow px-3 py-1 font-display text-xs uppercase tracking-wider text-ink border-2 border-ink shadow-[2px_2px_0px_0px_var(--color-ink)]">
                📜 ഔദ്യോഗിക റിപ്പോർട്ട്
              </span>
              <span className="text-2xl animate-bounce">✨</span>
            </div>

            <div>
              <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-tight text-ink leading-none">
                മനസ്സിലെ ഭാരം <span className="text-brand">ഇറക്കി വെച്ചു!</span>
              </h2>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                You said your heart out • 100% ephemeral relief
              </p>
            </div>

            {/* Fun Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-surface border-2 border-ink p-3 rounded-2xl shadow-[2px_2px_0px_0px_var(--color-ink)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink/50">💬 പറഞ്ഞ ഡയലോഗുകൾ</p>
                <p className="font-display text-2xl text-ink mt-0.5">{reportStats.rantCount}</p>
                <p className="text-[10px] text-ink/60 font-medium">Unfiltered rants spoken</p>
              </div>

              <div className="bg-surface border-2 border-ink p-3 rounded-2xl shadow-[2px_2px_0px_0px_var(--color-ink)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink/50">🥊 വില്ലന്റെ അവസ്ഥ</p>
                <p className="font-display text-lg text-brand mt-1 truncate">{reportStats.rivalName}</p>
                <p className="text-[10px] text-ink/60 font-medium">{reportStats.mode === "villain" ? "സീൻ ഡൗൺ ആയി" : "പൂർണ്ണമായി തോറ്റു തന്നു"}</p>
              </div>

              <div className="bg-surface border-2 border-ink p-3 rounded-2xl shadow-[2px_2px_0px_0px_var(--color-ink)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink/50">❤️ മനസ്സിന്റെ അവസ്ഥ</p>
                <p className="font-display text-xl text-ink mt-0.5">ഫ്രീ & ലൈറ്റ്</p>
                <p className="text-[10px] text-ink/60 font-medium">No lingering weight</p>
              </div>

              <div className="bg-surface border-2 border-ink p-3 rounded-2xl shadow-[2px_2px_0px_0px_var(--color-ink)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink/50">🔒 പ്രൈവസി</p>
                <p className="font-display text-xl text-brand mt-0.5">ആരും അറിഞ്ഞില്ല</p>
                <p className="text-[10px] text-ink/60 font-medium">100% Vanished</p>
              </div>
            </div>

            {/* Uplifting Catharsis Message */}
            <div className="bg-accent-yellow/30 border-2 border-ink/30 rounded-2xl p-3.5 flex items-start gap-3">
              <span className="text-2xl">🌱</span>
              <p className="text-xs font-medium text-ink/80 leading-relaxed">
                മനസ്സിൽ ഉള്ളതൊക്കെ പറഞ്ഞു തീർത്തു, ഭാരമൊക്കെ പോയി! No awkward real-life fight, no regrets. Take a deep breath, smile, and go rock your day! ✨
              </p>
            </div>

            {/* Action CTA */}
            <button
              type="button"
              onClick={handleFinishReport}
              className="slant w-full bg-ink px-4 py-3 font-display text-base uppercase tracking-wide text-paper transition-all hover:bg-brand hover:text-ink cursor-pointer shadow-[4px_4px_0px_0px_var(--color-brand)] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>✨ ഫ്രഷ് ആയി വീണ്ടും തുടങ്ങാം ✨</span>
            </button>
          </div>
        </div>
      )}

      {/* Pinned Bottom Footer */}
      <footer className="shrink-0 flex items-center justify-between border-t-2 border-ink px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/40 md:px-8 bg-paper">
        <span className="flex items-center gap-1.5">
          <span>🪄</span> Nothing here is saved. Nothing here is real.
        </span>
        <span className="hidden sm:inline">
          🤗 Pure comedic stress-relief • Please be nice in real life!
        </span>
      </footer>
    </div>
  );
}
