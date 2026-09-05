import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Spinner } from "@/components/ui/spinner";

function LoginArtwork() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden md:relative md:inset-auto md:h-full md:min-h-[28rem] md:overflow-visible"
      aria-hidden
    >
      {/* Atmospheric haze */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_55%)]" />
      <div className="absolute -bottom-8 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse,color-mix(in_oklab,#000_70%,transparent),transparent_70%)] blur-2xl md:h-56" />

      {/* Silhouette figure — decorative, scales with viewport */}
      <svg
        className="absolute bottom-0 right-[-8%] h-[70%] w-auto max-w-none opacity-[0.18] md:right-0 md:h-[85%] md:opacity-35 lg:opacity-40"
        viewBox="0 0 320 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          className="text-[var(--ink)]"
          d="M168 52c18 2 34 18 34 38 0 14-6 26-16 34l8 14c22 8 38 28 42 52l6 38c2 14-2 28-12 38l-4 48c-2 18 2 36 12 52l18 28c8 12 6 28-4 38l-22 18c-10 8-24 8-34-2l-20-22-8 64c-2 14-12 26-26 30l-18 4c-16 2-30-8-34-24l-12-52-28 18c-12 8-28 4-36-8l-10-16c-6-12-2-26 8-34l36-28-6-44c-4-20 2-40 16-54l10-42c4-16 16-28 32-32l12-22c8-14 24-22 40-20Z"
        />
        <circle
          cx="176"
          cy="78"
          r="28"
          className="fill-[var(--surface-raised)] stroke-[var(--accent)]"
          strokeWidth="2"
          opacity="0.9"
        />
      </svg>

      {/* Ember particles */}
      <span className="absolute top-[28%] left-[18%] size-1.5 rounded-full bg-[var(--accent)] blur-[1px] animate-[emberPulse_3.2s_ease-in-out_infinite]" />
      <span className="absolute top-[42%] left-[36%] size-1 rounded-full bg-[var(--accent-strong)] blur-[0.5px] animate-[emberPulse_2.6s_ease-in-out_infinite_0.4s]" />
      <span className="absolute top-[58%] left-[22%] size-2 rounded-full bg-[var(--warning)]/70 blur-[1px] animate-[emberPulse_4s_ease-in-out_infinite_1s]" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Mobile / tablet ambient artwork as background */}
      <div className="pointer-events-none absolute inset-0 md:hidden">
        <LoginArtwork />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--canvas)_55%,transparent)_0%,var(--canvas)_72%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] items-center px-4 py-10 md:px-8">
        <div className="grid w-full items-center gap-8 md:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] md:gap-10 lg:gap-14">
          {/* Left: brand / story */}
          <section className="relative hidden min-h-[28rem] md:block lg:min-h-[32rem]">
            <LoginArtwork />
            <div className="relative z-10 flex h-full max-w-xl flex-col justify-center py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                WarZTH
              </p>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight tracking-tight text-[var(--ink)] lg:text-5xl">
                Member
                <span className="text-[var(--accent-strong)]"> G2WP</span>
              </h1>
            </div>
          </section>

          {/* Right: login panel */}
          <section className="flex w-full justify-center md:justify-end">
            <div className="w-full max-w-[420px]">
              {/* Mobile brand (compact) */}
              <div className="mb-6 text-center md:hidden">
                <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-[var(--accent)] font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
                  W
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  WarZTH Portal
                </p>
                <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
                  เข้าสู่ระบบ
                </h1>
              </div>

              <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]/95 shadow-[var(--shadow-panel)] backdrop-blur-sm">
                <div className="h-1 bg-[linear-gradient(90deg,var(--accent),var(--warning))]" />
                <div className="px-5 py-7 sm:px-7 sm:py-8">
                  <div className="mb-6 hidden md:block">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] font-[family-name:var(--font-display)] text-base font-bold text-[var(--ink)]">
                        G2
                      </div>
                      <div>
                        <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
                          เข้าสู่ระบบ
                        </p>
                      </div>
                    </div>
                  </div>

                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--ink-muted)]">
                        <Spinner />
                        กำลังโหลด...
                      </div>
                    }
                  >
                    <LoginForm />
                  </Suspense>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
