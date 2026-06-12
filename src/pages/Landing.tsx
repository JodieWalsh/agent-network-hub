import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Star,
  ArrowRight,
  MapPin,
  Shield,
  Users,
  FileSearch,
  ClipboardList,
  ChevronDown,
  Building2,
  Search,
  Layers,
} from "lucide-react";
import heroHouseImg from "@/assets/images/landing/hero-house.jpg";
import propertyProfImg from "@/assets/images/landing/property-professional-australia.jpg";
import buildingInspectorImg from "@/assets/images/landing/building-inspector-house.avif";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

function StarRow({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={14} className="fill-[#B76E79] text-[#B76E79]" />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── 1. STICKY NAV ──────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white shadow-sm" : "bg-white/95"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#2D6350] flex items-center justify-center">
                <Building2 size={16} className="text-[#B76E79]" />
              </div>
              <span
                className="text-[#2D6350] font-semibold tracking-wide hidden sm:block"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}
              >
                BUYERS AGENT HUB
              </span>
            </button>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-8">
              {[
                { label: "HOW IT WORKS", id: "how-it-works" },
                { label: "PRICING", id: "pricing" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="text-xs tracking-[0.15em] font-semibold text-[#2D6350]/70 hover:text-[#2D6350] transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => navigate("/auth")}
                className="text-xs tracking-[0.15em] font-semibold text-[#2D6350] border border-[#2D6350]/30 rounded-full px-5 py-2 hover:border-[#2D6350] transition-colors cursor-pointer"
              >
                LOG IN
              </button>
              <button
                onClick={() => navigate("/auth?mode=signup")}
                className="text-xs tracking-[0.15em] font-semibold bg-[#2D6350] text-white rounded-full px-5 py-2 hover:bg-[#24513F] transition-colors cursor-pointer"
              >
                JOIN FREE
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-[#2D6350] cursor-pointer"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <div className="w-5 space-y-1">
                <span className={`block h-0.5 bg-[#2D6350] transition-all ${mobileOpen ? "rotate-45 translate-y-1.5" : ""}`} />
                <span className={`block h-0.5 bg-[#2D6350] transition-all ${mobileOpen ? "opacity-0" : ""}`} />
                <span className={`block h-0.5 bg-[#2D6350] transition-all ${mobileOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
              </div>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden pb-4 border-t border-[#2D6350]/10 pt-4 space-y-3">
              {["HOW IT WORKS", "PRICING"].map((label) => (
                <button
                  key={label}
                  onClick={() => { scrollTo(label.toLowerCase().replace(/ /g, "-")); setMobileOpen(false); }}
                  className="block w-full text-left text-xs tracking-[0.15em] font-semibold text-[#2D6350]/70 py-2 cursor-pointer"
                >
                  {label}
                </button>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => navigate("/auth")}
                  className="flex-1 text-xs tracking-[0.12em] font-semibold text-[#2D6350] border border-[#2D6350]/40 rounded-full py-2.5 cursor-pointer"
                >
                  LOG IN
                </button>
                <button
                  onClick={() => navigate("/auth?mode=signup")}
                  className="flex-1 text-xs tracking-[0.12em] font-semibold bg-[#2D6350] text-white rounded-full py-2.5 cursor-pointer"
                >
                  JOIN FREE
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── 2. HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(4,40,30,0.72) 0%, rgba(6,60,44,0.55) 60%, rgba(4,30,22,0.80) 100%), url(${heroHouseImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 border border-[#B76E79]/50 rounded-full px-5 py-2 text-[#D8C3B8] text-xs tracking-[0.2em] font-semibold">
            BUILT FOR BUYERS AGENTS · AUSTRALIA
          </div>

          {/* Heading */}
          <h1
            className="text-white leading-tight"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            The Professional Network
            <br />
            <span className="text-[#B76E79]">Built for Buyers Agents</span>
          </h1>

          {/* Subheadline */}
          <p className="text-white/80 max-w-xl mx-auto leading-relaxed" style={{ fontSize: "1.1rem" }}>
            Find trusted inspectors, manage due diligence, and protect your clients — all in one place.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <button
              onClick={() => navigate("/auth?mode=signup")}
              className="text-xs tracking-[0.18em] font-semibold bg-[#2D6350] text-white rounded-full px-8 py-4 hover:bg-[#24513F] transition-all duration-200 shadow-lg cursor-pointer"
            >
              JOIN FREE
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="text-xs tracking-[0.18em] font-semibold text-[#D8C3B8] border border-[#B76E79]/60 rounded-full px-8 py-4 hover:border-[#B76E79] hover:bg-[#B76E79]/10 transition-all duration-200 cursor-pointer"
            >
              SEE HOW IT WORKS
            </button>
          </div>
        </div>

        {/* Scroll cue */}
        <button
          onClick={() => scrollTo("social-proof")}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          aria-label="Scroll down"
        >
          <ChevronDown size={28} className="animate-bounce" />
        </button>
      </section>

      {/* ── 3. SOCIAL PROOF BAR ─────────────────────────────────────────────── */}
      <section id="social-proof" className="bg-[#F0F7F3] py-8 border-y border-[#2D6350]/8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
            {[
              { stat: "500+", label: "Buyers Agents" },
              { stat: "2,400+", label: "Inspections Coordinated" },
              { stat: "All States", label: "Across Australia" },
              { stat: "4.9★", label: "Average Rating" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-center">
                <div>
                  <p
                    className="text-[#2D6350] font-bold"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem" }}
                  >
                    {item.stat}
                  </p>
                  <p className="text-[#2D6350]/60 text-xs tracking-[0.12em] font-medium uppercase">{item.label}</p>
                </div>
                <div className="hidden sm:block w-px h-8 bg-[#2D6350]/15 last:hidden" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FULL WIDTH IMAGE BANNER ──────────────────────────────────────── */}
      <div
        className="w-full h-64 md:h-80 lg:h-96"
        style={{
          backgroundImage: `url(${propertyProfImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
        }}
        role="img"
        aria-label="Professional buyers agent at work"
      />

      {/* ── 5. PROBLEM STATEMENT ────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <p className="text-[#8F4E58] text-xs tracking-[0.25em] font-semibold uppercase">The Old Way</p>
          <blockquote
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              fontWeight: 500,
              lineHeight: 1.3,
              color: "#0A0A0A",
              letterSpacing: "-0.01em",
            }}
          >
            "Coordinating inspections used to mean chasing emails, guessing on inspectors, and hoping nothing got missed."
          </blockquote>
          <p
            className="text-[#2D6350] font-semibold tracking-wide"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem" }}
          >
            There's a better way.
          </p>
        </div>
      </section>

      {/* ── 6. THREE FEATURES ───────────────────────────────────────────────── */}
      <section className="py-8 pb-24 lg:pb-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-[#8F4E58] text-xs tracking-[0.25em] font-semibold uppercase">What You Get</p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 600,
                color: "#0A0A0A",
                letterSpacing: "-0.02em",
              }}
            >
              Everything a Buyers Agent Needs
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1 — Inspection Marketplace */}
            <div className="rounded-2xl overflow-hidden bg-[#F0F7F3] border border-[#2D6350]/8 group hover:shadow-md transition-shadow duration-300">
              <div
                className="h-52 w-full"
                style={{
                  backgroundImage: `url(${buildingInspectorImg})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                role="img"
                aria-label="Building inspector examining a property"
              />
              <div className="p-7">
                <div className="w-10 h-10 rounded-xl bg-[#2D6350]/10 flex items-center justify-center mb-4">
                  <Search size={18} className="text-[#2D6350]" />
                </div>
                <h3
                  className="text-[#2D6350] mb-2"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 600 }}
                >
                  Inspection Marketplace
                </h3>
                <p className="text-[#4A5568] text-sm leading-relaxed">
                  Post inspection jobs and receive competitive bids from vetted building inspectors across Australia. Escrow payments protect everyone.
                </p>
              </div>
            </div>

            {/* Card 2 — Property Intelligence */}
            <div className="rounded-2xl overflow-hidden bg-[#F0F7F3] border border-[#2D6350]/8 group hover:shadow-md transition-shadow duration-300">
              <div className="h-52 w-full bg-gradient-to-br from-[#2D6350] to-[#3D7A64] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute border border-white rounded-lg"
                      style={{
                        width: `${60 + i * 20}px`,
                        height: `${40 + i * 14}px`,
                        top: `${20 + i * 8}%`,
                        left: `${10 + i * 12}%`,
                        transform: "rotate(-5deg)",
                      }}
                    />
                  ))}
                </div>
                <Layers size={48} className="text-[#B76E79] relative z-10" />
              </div>
              <div className="p-7">
                <div className="w-10 h-10 rounded-xl bg-[#2D6350]/10 flex items-center justify-center mb-4">
                  <Layers size={18} className="text-[#2D6350]" />
                </div>
                <h3
                  className="text-[#2D6350] mb-2"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 600 }}
                >
                  Property Intelligence
                </h3>
                <p className="text-[#4A5568] text-sm leading-relaxed">
                  Layer risk overlays, flood maps, and planning data over any Australian property address before you bid for your client.
                </p>
              </div>
            </div>

            {/* Card 3 — Professional Community */}
            <div className="rounded-2xl overflow-hidden bg-[#F0F7F3] border border-[#2D6350]/8 group hover:shadow-md transition-shadow duration-300">
              <div className="h-52 w-full bg-gradient-to-br from-[#2D6350] to-[#173A31] flex items-center justify-center relative overflow-hidden">
                <div className="grid grid-cols-3 gap-3 opacity-40">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-[#B76E79]/60" />
                  ))}
                </div>
                <Users size={44} className="text-white absolute" />
              </div>
              <div className="p-7">
                <div className="w-10 h-10 rounded-xl bg-[#2D6350]/10 flex items-center justify-center mb-4">
                  <Users size={18} className="text-[#2D6350]" />
                </div>
                <h3
                  className="text-[#2D6350] mb-2"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 600 }}
                >
                  Professional Community
                </h3>
                <p className="text-[#4A5568] text-sm leading-relaxed">
                  Connect with verified buyers agents, conveyancers, and mortgage brokers. Share market intelligence in moderated forums.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. PROPERTY OVERLAYS SPOTLIGHT ──────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-[#F8FDFB] px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: map placeholder */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[4/3] bg-[#E0EDE7]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#C8E6D8] to-[#A8D4BE] flex items-center justify-center">
                <div className="relative w-full h-full">
                  {/* Mock map grid */}
                  <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 300">
                    {[0, 60, 120, 180, 240, 300].map((x) => (
                      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={300} stroke="#2D6350" strokeWidth="1" />
                    ))}
                    {[0, 50, 100, 150, 200, 250, 300].map((y) => (
                      <line key={`h${y}`} x1={0} y1={y} x2={400} y2={y} stroke="#2D6350" strokeWidth="1" />
                    ))}
                    <circle cx="200" cy="150" r="40" fill="#B76E79" opacity="0.3" />
                    <circle cx="200" cy="150" r="25" fill="#B76E79" opacity="0.4" />
                    <circle cx="200" cy="150" r="8" fill="#2D6350" />
                  </svg>
                  {/* Overlay chips */}
                  {[
                    { label: "Flood Risk", color: "bg-blue-100 text-blue-700", x: "10%", y: "20%" },
                    { label: "Fire Hazard", color: "bg-red-100 text-red-700", x: "60%", y: "15%" },
                    { label: "Heritage", color: "bg-amber-100 text-amber-700", x: "15%", y: "65%" },
                    { label: "DA Approved", color: "bg-green-100 text-green-700", x: "58%", y: "68%" },
                  ].map((chip) => (
                    <div
                      key={chip.label}
                      className={`absolute text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm ${chip.color}`}
                      style={{ left: chip.x, top: chip.y }}
                    >
                      {chip.label}
                    </div>
                  ))}
                  <MapPin size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-[#2D6350]" />
                </div>
              </div>
            </div>

            {/* Right: text */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-[#B76E79]/15 border border-[#B76E79]/40 text-[#8F4E58] text-xs tracking-[0.15em] font-semibold px-4 py-2 rounded-full">
                COMING SOON
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                  fontWeight: 600,
                  color: "#0A0A0A",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                }}
              >
                Know Every Risk
                <br />
                Before You Bid
              </h2>
              <p className="text-[#4A5568] leading-relaxed">
                Layer critical data over any property address — flood zones, bushfire risk, heritage overlays, stormwater, and more — so you can advise your client with total confidence.
              </p>
              <ul className="space-y-3">
                {[
                  "Flood & stormwater risk mapping",
                  "Bushfire attack level (BAL) ratings",
                  "Heritage & planning overlays",
                  "Development approval history",
                  "Infrastructure & easements",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#2D6350] mt-0.5 flex-shrink-0" />
                    <span className="text-[#374151] text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 lg:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20 space-y-3">
            <p className="text-[#8F4E58] text-xs tracking-[0.25em] font-semibold uppercase">Simple by Design</p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 600,
                color: "#0A0A0A",
                letterSpacing: "-0.02em",
              }}
            >
              Up and Running in Minutes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                icon: <Shield size={22} className="text-[#2D6350]" />,
                title: "Create Your Free Profile",
                desc: "Sign up, verify your professional credentials, and set your service areas. Your profile is your trusted identity on the network.",
              },
              {
                step: "02",
                icon: <FileSearch size={22} className="text-[#2D6350]" />,
                title: "Find or Post Inspections",
                desc: "Browse qualified building inspectors, post inspection jobs with your requirements, or receive and review competing bids — all in one place.",
              },
              {
                step: "03",
                icon: <ClipboardList size={22} className="text-[#2D6350]" />,
                title: "Protect Your Clients",
                desc: "Receive detailed inspection reports, layer risk overlays, and share findings directly. Funds held in escrow until you approve the work.",
              },
            ].map((item, i) => (
              <div key={i} className="relative text-center space-y-5">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] right-[-40%] h-px bg-[#2D6350]/15" />
                )}
                <div className="w-16 h-16 rounded-full bg-[#F0F7F3] border-2 border-[#2D6350]/15 flex items-center justify-center mx-auto relative z-10">
                  {item.icon}
                </div>
                <p
                  className="text-[#B76E79] font-bold"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem" }}
                >
                  {item.step}
                </p>
                <h3
                  className="text-[#0A0A0A]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 600 }}
                >
                  {item.title}
                </h3>
                <p className="text-[#4A5568] text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section
        className="py-24 lg:py-32 px-6 relative"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(4,40,30,0.88) 0%, rgba(6,55,40,0.84) 100%), url(${heroHouseImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 60%",
          backgroundColor: "#2D6350",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-[#F6F1EA] text-xs tracking-[0.25em] font-semibold uppercase">What Agents Say</p>
            <h2
              className="text-white"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              Trusted by Professionals Across Australia
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "I used to spend hours coordinating building inspectors by email. Now I post a job and get three competitive quotes within the day. It's completely changed how I manage due diligence.",
                name: "Sarah Mitchell",
                role: "Buyers Agent · Sydney, NSW",
                rating: 5,
              },
              {
                quote: "The professional directory alone is worth it. I've built relationships with conveyancers and mortgage brokers I never would have found otherwise. My clients notice the difference.",
                name: "James Thornton",
                role: "Buyers Agent · Melbourne, VIC",
                rating: 5,
              },
              {
                quote: "Having inspection reports and escrow payments in one platform gives me and my clients complete peace of mind. The transparency is exactly what this industry needed.",
                name: "Priya Sharma",
                role: "Buyers Agent · Brisbane, QLD",
                rating: 5,
              },
            ].map((t, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-8 space-y-5 hover:bg-white/15 transition-colors duration-300"
              >
                <StarRow count={t.rating} />
                <p className="text-white/90 leading-relaxed text-sm italic">"{t.quote}"</p>
                <div className="pt-2 border-t border-white/15">
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-white/50 text-xs mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. PRICING ─────────────────────────────────────────────────────── */}
      {/* DANI_APPROVAL_REQUIRED: Pricing amounts and plan names below need stakeholder sign-off before going live */}
      <section id="pricing" className="py-24 lg:py-32 px-6 bg-[#FAFAF8]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-[#8F4E58] text-xs tracking-[0.25em] font-semibold uppercase">Simple Pricing</p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 600,
                color: "#0A0A0A",
                letterSpacing: "-0.02em",
              }}
            >
              Start Free. Scale When Ready.
            </h2>
            <p className="text-[#4A5568] max-w-md mx-auto text-sm">
              No lock-in contracts. Upgrade or downgrade any time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-3xl mx-auto">
            {/* Basic */}
            <div className="bg-white rounded-2xl border border-[#E8E5DC] p-8 space-y-6">
              <div>
                <p className="text-xs tracking-[0.15em] font-semibold text-[#2D6350]/60 uppercase mb-2">Basic</p>
                <div className="flex items-end gap-1">
                  <span
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "3rem", fontWeight: 700, color: "#0A0A0A", lineHeight: 1 }}
                  >
                    $29
                  </span>
                  <span className="text-[#4A5568] text-sm mb-1">/month</span>
                </div>
                <p className="text-[#4A5568] text-sm mt-2">Everything you need to get started</p>
              </div>
              <ul className="space-y-3">
                {[
                  "Professional profile listing",
                  "Browse & search directory",
                  "Post inspection jobs",
                  "Community forum access",
                  "Secure messaging",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckCircle size={15} className="text-[#2D6350] mt-0.5 flex-shrink-0" />
                    <span className="text-[#374151] text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/auth?mode=signup&plan=basic")}
                className="w-full text-xs tracking-[0.15em] font-semibold border border-[#2D6350] text-[#2D6350] rounded-full py-3.5 hover:bg-[#2D6350]/5 transition-colors cursor-pointer"
              >
                GET STARTED
              </button>
            </div>

            {/* Premium */}
            <div className="bg-[#2D6350] rounded-2xl p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-5 right-5 bg-[#8F4E58] text-white text-xs tracking-[0.1em] font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
              <div>
                <p className="text-xs tracking-[0.15em] font-semibold text-white/50 uppercase mb-2">Premium</p>
                <div className="flex items-end gap-1">
                  <span
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "3rem", fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}
                  >
                    $79
                  </span>
                  <span className="text-white/60 text-sm mb-1">/month</span>
                </div>
                <p className="text-white/60 text-sm mt-2">For serious buyers agents</p>
              </div>
              <ul className="space-y-3">
                {[
                  "Everything in Basic",
                  "Featured profile placement",
                  "Property overlay tools",
                  "Priority inspection matching",
                  "Advanced analytics",
                  "Client brief management",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckCircle size={15} className="text-[#B76E79] mt-0.5 flex-shrink-0" />
                    <span className="text-white/90 text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/auth?mode=signup&plan=premium")}
                className="w-full text-xs tracking-[0.15em] font-semibold bg-[#8F4E58] text-white rounded-full py-3.5 hover:bg-[#B76E79] transition-colors cursor-pointer"
              >
                START FREE TRIAL
              </button>
            </div>
          </div>

          <p className="text-center text-[#4A5568] text-xs mt-8">
            All plans include a 14-day free trial · No credit card required
          </p>
        </div>
      </section>

      {/* ── 11. FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#2D6350] py-24 lg:py-32 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <p className="text-[#F6F1EA] text-xs tracking-[0.25em] font-semibold uppercase">Ready to Begin</p>
          <h2
            className="text-white"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            Join the Network Buyers Agents Are Choosing
          </h2>
          <p className="text-white/70 leading-relaxed max-w-md mx-auto">
            500+ buyers agents are already protecting their clients and growing their businesses on Buyers Agent Hub.
          </p>
          <button
            onClick={() => navigate("/auth?mode=signup")}
            className="inline-flex items-center gap-3 text-xs tracking-[0.2em] font-semibold bg-white text-[#2D6350] rounded-full px-10 py-5 hover:bg-[#F0F7F3] transition-colors shadow-lg cursor-pointer"
          >
            CREATE YOUR FREE ACCOUNT
            <ArrowRight size={14} />
          </button>
          <p className="text-white/40 text-xs">No credit card required · Set up in 5 minutes</p>
        </div>
      </section>

      {/* ── 12. FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#173A31] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#2D6350] border border-[#B76E79]/30 flex items-center justify-center">
                <Building2 size={13} className="text-[#B76E79]" />
              </div>
              <span
                className="text-white/70 font-medium"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem" }}
              >
                BUYERS AGENT HUB
              </span>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { label: "DIRECTORY", path: "/directory" },
                { label: "MARKETPLACE", path: "/marketplace" },
                { label: "PRICING", path: "/pricing" },
                { label: "FORUMS", path: "/forums" },
                { label: "SIGN IN", path: "/auth" },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="text-white/40 hover:text-white/70 text-xs tracking-[0.12em] transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Legal */}
            <p className="text-white/30 text-xs text-center">
              © 2026 Buyers Agent Hub · Built in Australia 🇦🇺
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
