export function SocialProof() {
  return (
    <section className="px-6 py-16 text-center">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Counter */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {["🟣", "🔴", "🟢", "🔵", "🟠"].map((dot, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-surface border-2 border-background flex items-center justify-center text-sm"
              >
                {dot}
              </div>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            +<span className="text-foreground font-semibold">200</span> developers
          </span>
        </div>

        <p className="text-lg text-muted-foreground">
          Join developers who&apos;ve set up{" "}
          <span className="text-foreground font-semibold">OpenClaw</span> with
          Clawhatch — from solo builders to teams running multi-channel AI assistants.
        </p>

        {/* Trust logos placeholder */}
        <div className="flex items-center justify-center gap-8 pt-4 opacity-40">
          <span className="font-mono text-xs tracking-wider uppercase">Discord</span>
          <span className="font-mono text-xs tracking-wider uppercase">Telegram</span>
          <span className="font-mono text-xs tracking-wider uppercase">WhatsApp</span>
          <span className="font-mono text-xs tracking-wider uppercase">Slack</span>
        </div>
      </div>
    </section>
  );
}
