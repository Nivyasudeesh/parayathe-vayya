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

function DearNoBody() {
  const create = useServerFn(createNemesis);
  const vent = useServerFn(ventToNemesis);

  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState("");
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
            "Oh good, you're here. Let me guess — this is somehow my fault.",
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
    <div className="min-h-screen bg-paper text-ink font-body">
      <header className="flex items-center justify-between border-b-2 border-ink px-6 py-5 md:px-12">
        <div className="flex items-center gap-3">
          <span className="slant bg-ink px-3 py-1 font-display text-lg tracking-wide text-paper">
            പറയാതെ വയ്യ
          </span>
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50 sm:inline">
            Parayathe Vayya • Stress-relief vent
          </span>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] sm:flex">
            <span className={nemesis ? "text-ink/50" : "text-brand"}>01 Describe</span>
            <span className="text-ink/30">/</span>
            <span className={nemesis ? "text-brand" : "text-ink/50"}>02 Vent</span>
            <span className="text-ink/30">/</span>
            <span className="text-ink/50">03 Wipe</span>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative overflow-hidden border-b-2 border-ink">
        <div className="diagonal absolute inset-0 opacity-[0.06]" />
        <div className="relative px-6 py-10 md:px-12 md:py-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand">
            {nemesis ? "Session in progress" : "No session yet"}
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase leading-[0.86] sm:text-6xl md:text-7xl">
            Take it out on <span className="text-brand">nobody</span>.
          </h1>
          <p className="mt-4 max-w-md text-sm font-medium text-ink/70 md:text-base">
            Describe your fictional nemesis, get a caricature with a mean grin, blow
            off steam, then hit the big wipe.
          </p>
          {poofNote && (
            <p className="mt-4 slant inline-block bg-accent-yellow px-3 py-1 font-display text-lg uppercase text-ink">
              Poof. Gone. Feel better?
            </p>
          )}
        </div>
      </div>

      {!nemesis ? (
        <main className="px-6 py-10 md:px-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="slant bg-brand px-2 py-0.5 font-display text-sm text-ink">
                STEP 01
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/40">
                Describe your nemesis
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setWarning(null);
              }}
              rows={5}
              placeholder="Traits, habits, vibe. Hijacks every meeting, microwaves fish, replies-all with a thumbs up…"
              className="mt-5 w-full resize-none rounded-lg border-2 border-ink bg-surface px-4 py-3 text-sm font-medium placeholder:text-ink/30 focus:border-brand focus:outline-none"
            />
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink/40">
              No real names or photos — this stays fictional and silly.
            </p>
            {warning && (
              <p className="mt-4 border-2 border-brand bg-surface px-4 py-3 text-sm font-semibold text-brand">
                {warning}
              </p>
            )}
            {error && (
              <p className="mt-4 border-2 border-ink bg-surface px-4 py-3 text-sm font-semibold">
                {error}
              </p>
            )}
            <button
              onClick={summon}
              disabled={busy || description.trim().length < 3}
              className="slant mt-6 w-full bg-ink px-4 py-3 font-display text-lg uppercase tracking-wide text-paper transition-colors hover:bg-brand hover:text-ink disabled:opacity-40"
            >
              {busy ? "Sketching your nemesis…" : "Summon the caricature"}
            </button>
          </div>
        </main>
      ) : (
        <main
          className={`grid gap-0 transition-opacity duration-300 lg:grid-cols-12 ${poof ? "opacity-0" : "opacity-100"}`}
        >
          <section className="border-b-2 border-ink lg:col-span-5 lg:border-b-0 lg:border-r-2">
            <div className="px-6 py-8 md:px-8">
              <div className="flex items-center gap-2">
                <span className="slant bg-brand px-2 py-0.5 font-display text-sm text-ink">
                  NEMESIS
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/40">
                  Your rival
                </span>
              </div>

              <div className="relative mt-6">
                <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-ink/5 outline outline-1 -outline-offset-1 outline-ink/10">
                  {nemesis.avatarUrl ? (
                    <img
                      src={nemesis.avatarUrl}
                      alt={`Cartoon caricature of ${nemesis.nickname}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/30">
                      Caricature unavailable
                    </span>
                  )}
                  <span className="slant absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-accent-yellow px-3 py-1 font-display text-sm text-ink">
                    {nemesis.nickname}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {nemesis.traits.map((trait, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="slant w-20 bg-ink px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-paper">
                      Trait
                    </span>
                    <span className="text-sm font-semibold">{trait}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={summon}
                disabled={busy}
                className="slant mt-7 w-full bg-ink px-4 py-3 font-display text-lg uppercase tracking-wide text-paper transition-colors hover:bg-brand hover:text-ink disabled:opacity-40"
              >
                {busy ? "Redrawing…" : "Redraw caricature"}
              </button>
            </div>
          </section>

          <section className="flex flex-col lg:col-span-7">
            <div className="flex items-center justify-between border-b-2 border-ink px-6 py-6 md:px-8">
              <div>
                <p className="font-display text-xl uppercase">The Vent</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/40">
                  Say the unsayable
                </p>
              </div>
              <span className="slant bg-accent-yellow px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                Rant level: {messages.length > 8 ? "Nuclear" : messages.length > 4 ? "High" : "Warming up"}
              </span>
            </div>

            <div className="grow space-y-4 px-6 py-6 md:px-8">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-ink px-4 py-3 text-paper">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-paper/50">
                        You
                      </p>
                      <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start">
                    <div className="max-w-[78%] rounded-2xl rounded-bl-sm border-2 border-ink bg-surface px-4 py-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
                        {nemesis.nickname}
                      </p>
                      <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border-2 border-ink bg-surface px-4 py-3 text-sm font-medium text-ink/50">
                    typing something smug…
                  </div>
                </div>
              )}
              <div ref={chatEnd} />
            </div>

            <div className="space-y-4 border-t-2 border-ink px-6 py-6 md:px-8">
              {warning && (
                <p className="border-2 border-brand bg-surface px-4 py-3 text-sm font-semibold text-brand">
                  {warning}
                </p>
              )}
              {error && (
                <p className="border-2 border-ink bg-surface px-4 py-3 text-sm font-semibold">
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
                  className="grow rounded-lg border-2 border-ink bg-surface px-4 py-3 text-sm font-medium placeholder:text-ink/30 focus:border-brand focus:outline-none"
                />
                <button
                  onClick={send}
                  disabled={thinking}
                  className="slant whitespace-nowrap bg-brand px-5 py-3 font-display text-base uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
                >
                  Send
                </button>
              </div>
              <button
                onClick={endSession}
                className="slant flex w-full items-center justify-center gap-2 bg-ink px-4 py-3 font-display text-lg uppercase tracking-wide text-paper transition-colors hover:bg-brand hover:text-ink"
              >
                <span className="bg-brand px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wide text-ink">
                  Final
                </span>
                End session — wipe everything
              </button>
            </div>
          </section>
        </main>
      )}

      <footer className="flex items-center justify-between border-t-2 border-ink px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/40 md:px-12">
        <span>Nothing here is saved. Nothing here is real.</span>
        <span>Please don't actually be mean to people.</span>
      </footer>
    </div>
  );
}
