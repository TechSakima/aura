import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col justify-end overflow-hidden bg-ink text-surface">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(120% 80% at 20% 10%, #3d3428 0%, transparent 55%), radial-gradient(90% 70% at 90% 80%, #8a6a2f55 0%, transparent 50%), linear-gradient(160deg, #1c1915 0%, #2a241c 100%)",
        }}
      />
      <div className="shell-pad relative z-10 mx-auto w-full max-w-[var(--shell-max)] pb-16 pt-24 animate-enter">
        <p className="font-display text-5xl tracking-tight md:text-7xl">Aura</p>
        <p className="mt-4 max-w-md text-lg text-surface/80">
          Quotes, cinematic delivery, and a 60-day gallery window — built for a
          solo studio.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/admin/login">
            <Button tone="accent" size="lg">
              Open studio admin
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
