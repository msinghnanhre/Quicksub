import { LogoMark, LogoWordmark } from "@/components/brand/logo";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="flex flex-col items-center gap-5 text-center">
        <LogoMark size={48} />
        <LogoWordmark className="text-2xl" />
        <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
          Design system foundations installed. Pages are built next — see
          <code className="ml-1 rounded-xs bg-canvas-2 px-1.5 py-0.5 font-mono text-xs text-ink-2">
            PRD.md §5 Build Order
          </code>
          .
        </p>
      </div>
    </main>
  );
}
