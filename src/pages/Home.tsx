import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuthData } from "@neondatabase/neon-js/auth/react";
import { UserButton } from "@neondatabase/neon-js/auth/react/ui";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Goal,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import FeedbackForm from "../components/FeedbackForm";
import Seo from "../components/Seo";
import { authClient } from "../lib/auth";
import heroImage from "../assets/kano-pillars-enyimba-hero.jpeg";
import logoImage from "../assets/logo.jpeg";

export function Home() {
  const { data: session } = useAuthData({
    queryFn: () => authClient.getSession(),
  });
  const isSignedIn = Boolean((session as any)?.user);
  const [searchParams] = useSearchParams();
  const sharableId = searchParams.get("ref");
  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackStep, setFeedbackStep] = useState<1 | 2>(1);
  const autoOpenedCampaignRef = useRef<string | null>(null);

  useEffect(() => {
    if (sharableId) {
      fetch(`/api/matches/${sharableId}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to fetch match info");
          }
          setMatchInfo(data);
        })
        .catch((err) => {
          setMatchInfo(null);
          console.error("Failed to fetch match info", err);
        });
    } else {
      setMatchInfo(null);
    }
  }, [sharableId]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setFeedbackModalOpen(false);
    setFeedbackStep(1);
  }, [sharableId]);

  useEffect(() => {
    if (
      !sharableId ||
      !matchInfo?.id ||
      autoOpenedCampaignRef.current === matchInfo.id
    ) {
      return;
    }

    autoOpenedCampaignRef.current = matchInfo.id;
    setFeedbackStep(1);
    setFeedbackModalOpen(true);
  }, [matchInfo, sharableId]);

  return (
    <div className="min-h-screen bg-[#f6fbf7] text-gray-900">
      <Seo
        title={
          matchInfo
            ? `${matchInfo.opponent} Fan Feedback | Feedback Analyzer`
            : "Feedback Analyzer | Ginger the game"
        }
        description={
          matchInfo
            ? `Share fan feedback for ${matchInfo.opponent} and turn supporter opinion into actionable insight.`
            : "Feedback Analyzer turns fan opinion and football feedback into actionable insight for Nigerian clubs, teams, and players."
        }
        keywords={[
          "feedback analyzer",
          "nigerian football feedback",
          "fan insight",
          "nigerian clubs",
          "super eagles fan feedback",
          "actionable football insight",
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Feedback Analyzer",
          alternateName: "Feedback Fan Analyzer",
          url: typeof window !== "undefined" ? window.location.origin : "",
          description:
            "Feedback Analyzer turns fan opinion and football feedback into actionable insight for Nigerian clubs, teams, and players.",
        }}
      />

      <header className="sticky top-0 z-50 border-b border-green-100 bg-white/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <div className="flex shrink-0 items-center gap-3">
              <img
                src={logoImage}
                alt="Feedback Analyzer logo"
                className="h-11 w-11 rounded-2xl border border-green-100 bg-white object-cover shadow-lg shadow-green-100"
              />
              <div>
                <div className="text-base sm:text-lg font-black tracking-tight text-gray-900">
                  Feedback Analyzer
                </div>
                <div className="text-[10px] uppercase tracking-[0.32em] text-green-700">
                  Ginger the game
                </div>
              </div>
            </div>

            <nav className="ml-auto flex flex-1 items-center justify-end gap-3 max-md:hidden">
              <Link
                to="/admin"
                className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-black text-green-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-green-50"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="whitespace-nowrap">
                  Administrator Dashboard
                </span>
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              {!isSignedIn ? (
                <Link
                  to="/auth/signup"
                  className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-black text-white transition-all hover:bg-green-800"
                >
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </Link>
              ) : null}
              {!isSignedIn ? (
                <Link
                  to="/auth/signin"
                  className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2 text-sm font-bold text-green-700 transition-all hover:bg-green-50"
                >
                  <MessageSquareText className="h-4 w-4" />
                  Sign In
                </Link>
              ) : null}
              {isSignedIn ? (
                <button
                  onClick={() =>
                    authClient.signOut().then(() => {
                      window.location.href = "/";
                    })
                  }
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 transition-all hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              ) : null}
              {isSignedIn ? <UserButton /> : null}
            </nav>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="ml-auto inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-2.5 text-gray-700 transition-all hover:bg-gray-100 md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 animate-fade-up">
              <div className="rounded-[28px] border border-gray-100 bg-gray-50 p-3 shadow-sm">
                <div className="grid gap-2">
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-white"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Administrator Dashboard
                  </Link>
                  {!isSignedIn ? (
                    <Link
                      to="/auth/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-black text-white"
                    >
                      <UserPlus className="h-4 w-4" />
                      Sign Up
                    </Link>
                  ) : null}
                  {!isSignedIn ? (
                    <Link
                      to="/auth/signin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm font-bold text-green-700"
                    >
                      <MessageSquareText className="h-4 w-4" />
                      Sign In
                    </Link>
                  ) : null}
                  {isSignedIn ? (
                    <button
                      onClick={() =>
                        authClient.signOut().then(() => {
                          setMobileMenuOpen(false);
                          window.location.href = "/";
                        })
                      }
                      className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  ) : null}
                  {isSignedIn ? (
                    <div className="flex justify-center pt-2">
                      <UserButton />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="py-8 sm:py-12">
        <section className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="overflow-hidden rounded-[28px] border border-green-100 bg-white shadow-xl shadow-green-900/5 sm:rounded-[34px]">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.03fr)_minmax(380px,0.97fr)]">
                <div className="min-w-0 p-5 sm:p-8 lg:p-10">
                  <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-green-700">
                      <BarChart3 className="h-4 w-4" />
                      Actionable insight
                    </div>

                    <h1 className="max-w-4xl break-words text-4xl font-black leading-[0.98] text-gray-900 sm:text-5xl lg:text-6xl">
                      Turn fan opinion into{" "}
                      <span className="text-green-700">actionable insight</span>
                      .
                    </h1>

                    <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600">
                      Feedback Analyzer helps Nigerian clubs, teams, and
                      football stakeholders understand what fans are saying and
                      where fan intensity shows what needs attention.
                    </p>
                  </div>

                  <div className="relative z-10 mt-8 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                    {matchInfo ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackStep(1);
                          setFeedbackModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-green-900/15 transition-all hover:-translate-y-0.5 hover:bg-green-800 sm:px-7 sm:text-base"
                      >
                        Submit Feedback
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <a
                        href="#feedback-form"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-green-900/15 transition-all hover:-translate-y-0.5 hover:bg-green-800 sm:px-7 sm:text-base"
                      >
                        Share Match Voice
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    )}
                    <Link
                      to="/admin"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-green-200 bg-white px-6 py-4 text-sm font-black text-green-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50 sm:px-7 sm:text-base"
                    >
                      Administrator Dashboard
                      <LayoutDashboard className="h-4 w-4" />
                    </Link>
                  </div>

                  <p className="mt-7 max-w-xl text-xs font-semibold uppercase leading-relaxed tracking-[0.16em] text-green-700 sm:text-sm sm:tracking-[0.18em]">
                    Nigerian clubs, national teams, players, and fan feedback in
                    one place.
                  </p>
                </div>

                <div className="relative min-h-[320px] overflow-hidden bg-green-900 sm:min-h-[420px] lg:min-h-full">
                  <img
                    src={heroImage}
                    alt="Kano Pillars and Enyimba football match"
                    className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(6,78,59,0.08),_rgba(6,78,59,0.72)),radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_30%)]" />
                  <div className="relative flex h-full min-h-[320px] flex-col justify-between p-6 text-white sm:min-h-[420px] sm:p-8 lg:p-10">
                    <div className="flex items-center justify-between gap-4">
                      <div className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] backdrop-blur-sm">
                        Nigerian Football
                      </div>
                      <Goal className="h-10 w-10" />
                    </div>

                    <div className="max-w-md space-y-4 rounded-[24px] border border-white/20 bg-green-950/45 p-5 shadow-2xl shadow-green-950/30 backdrop-blur-sm">
                      <div className="space-y-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-green-100">
                          Fan Intensity
                        </div>
                        <p className="text-3xl font-black leading-tight sm:text-4xl">
                          Spot what needs attention before it becomes noise.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.16em]">
                        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-2">
                          Clubs
                        </span>
                        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-2">
                          Teams
                        </span>
                        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-2">
                          Players
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!matchInfo && (
              <div id="feedback-form" className="mt-8">
                <FeedbackForm matchContext={matchInfo} />
              </div>
            )}
          </div>
        </section>
      </main>

      {matchInfo && feedbackModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-green-950/70 p-3 backdrop-blur-md animate-modal-fade sm:p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-green-100 bg-white shadow-2xl animate-modal-rise">
            <div className="flex items-start justify-between gap-4 border-b border-green-100 bg-green-50/70 p-5 sm:p-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-green-700">
                  <Sparkles className="h-4 w-4" />
                  Feedback campaign
                </div>
                <h2 className="mt-2 break-words text-2xl font-black leading-tight text-gray-950 sm:text-3xl">
                  {feedbackStep === 1
                    ? "Review the campaign brief"
                    : "Submit feedback"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFeedbackModalOpen(false);
                  setFeedbackStep(1);
                }}
                className="shrink-0 rounded-full p-2 text-gray-500 transition-all hover:bg-white hover:text-gray-900"
                aria-label="Close feedback modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`h-2 rounded-full transition-all ${feedbackStep >= 1 ? "bg-green-700" : "bg-gray-200"}`}
                />
                <div
                  className={`h-2 rounded-full transition-all ${feedbackStep >= 2 ? "bg-green-700" : "bg-gray-200"}`}
                />
              </div>
            </div>

            {feedbackStep === 1 ? (
              <div className="space-y-5 p-5 sm:p-6">
                <div className="rounded-3xl border border-green-100 bg-green-50 p-5">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-green-700">
                    Subject
                  </div>
                  <p className="mt-2 break-words text-xl font-black leading-snug text-gray-950">
                    {matchInfo.opponent}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-green-800">
                    Created by {matchInfo.club_name}
                  </p>
                </div>

                <div className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-green-700">
                      Campaign Subtitle
                    </div>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-green-700">
                      Read first
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-base font-medium leading-relaxed text-gray-900">
                    {matchInfo.subtitle ||
                      matchInfo.subheading ||
                      "Share what happened, why it mattered, and what needs attention."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {["Read the brief", "Write clearly", "Send feedback"].map(
                    (item, index) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold text-gray-700"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-700" />
                        {index + 1}. {item}
                      </div>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setFeedbackStep(2)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-6 py-4 font-black text-white shadow-xl shadow-green-900/15 transition-all hover:-translate-y-0.5 hover:bg-green-800"
                >
                  Continue to Feedback
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="max-h-[72vh] overflow-y-auto p-4 sm:p-6">
                <FeedbackForm matchContext={matchInfo} />
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-green-100 bg-white py-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 md:flex-row">
          <p>(c) 2026 Fan Feedback Analyzer.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-green-700">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-green-700">
              Policies
            </a>
            <a href="#" className="transition-colors hover:text-green-700">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
