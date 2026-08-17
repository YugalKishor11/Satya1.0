import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import VideoModal from './VideoModal';

interface LandingPageProps {
  onStartDemo: () => void;
  onOpenResearch: () => void;
  onOpenVideoLab?: () => void;
  onSelectSample?: (text: string) => void;
}

interface AgentInfo {
  name: string;
  layer: string;
  desc: string;
  accentColor: string;
  iconBg: string;
  hoverGradient: string;
  icon: string;
}

const AgentCard3D: React.FC<{ agent: AgentInfo }> = ({ agent }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (mouseY / (rect.height / 2)) * -8;
    const rotateY = (mouseX / (rect.width / 2)) * 8;

    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      className="h-[360px] w-full group/card"
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovering(true)}
    >
      <div
        ref={cardRef}
        className="relative w-full h-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 transition-all duration-200 ease-out shadow-md dark:shadow-none overflow-hidden flex flex-col p-6 justify-between"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${isHovering ? 1.02 : 1})`,
        }}
      >
        <div
          className={`absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${agent.hoverGradient} pointer-events-none`}
        />

        <div className="relative z-10 space-y-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border border-white/20 shadow-md ${agent.iconBg}`}
            style={{ transform: 'translateZ(20px)' }}
          >
            {agent.icon}
          </div>

          <div>
            <div
              className={`text-[10px] font-extrabold uppercase tracking-widest ${agent.accentColor}`}
              style={{ transform: 'translateZ(15px)' }}
            >
              {agent.layer}
            </div>
            <h3
              className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5"
              style={{ transform: 'translateZ(25px)' }}
            >
              {agent.name}
            </h3>
          </div>

          <p
            className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed"
            style={{ transform: 'translateZ(15px)' }}
          >
            {agent.desc}
          </p>
        </div>

        <div className="relative z-10 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span>SWARM AGENT</span>
          <span className="text-emerald-500 font-bold">READY</span>
        </div>
      </div>
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onStartDemo, onOpenResearch, onOpenVideoLab, onSelectSample }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Typewriter / Dynamic Title
  const words = ['Digital Information', 'Social Media Feeds', 'AI-Generated Content', 'Breaking News'];
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [text, setText] = useState('');
  const [delta, setDelta] = useState(130);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleCardMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  useEffect(() => {
    const ticker = setInterval(() => {
      tick();
    }, delta);
    return () => clearInterval(ticker);
  }, [text, delta]);

  const tick = () => {
    const i = wordIndex % words.length;
    const fullText = words[i];
    const updatedText = isDeleting ? fullText.substring(0, text.length - 1) : fullText.substring(0, text.length + 1);

    setText(updatedText);

    if (isDeleting) {
      setDelta((prev) => prev / 2);
    }

    if (!isDeleting && updatedText === fullText) {
      setIsDeleting(true);
      setDelta(2000);
    } else if (isDeleting && updatedText === '') {
      setIsDeleting(false);
      setWordIndex((prev) => prev + 1);
      setDelta(130);
    } else {
      if (isDeleting) setDelta(40);
      else setDelta(130);
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const agents: AgentInfo[] = [
    {
      name: 'Scout',
      layer: 'RETRIEVAL LAYER',
      desc: 'Isolates claims, scans OCR on images/videos, and parses core factual assertions without noise.',
      accentColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10 text-blue-500',
      hoverGradient: 'from-blue-500/10 via-blue-900/10 to-transparent',
      icon: '🔍',
    },
    {
      name: 'Verifier',
      layer: 'LOGIC & GROUNDING',
      desc: 'Cross-references real-time Google Search grounding using Chain-of-Thought logic to spot fallacies.',
      accentColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10 text-purple-500',
      hoverGradient: 'from-purple-500/10 via-purple-900/10 to-transparent',
      icon: '⚖️',
    },
    {
      name: 'Synthesis',
      layer: 'EXPLAINABILITY',
      desc: 'Converts complex forensic data into clear, cited verdicts with confidence scores and accessible breakdowns.',
      accentColor: 'text-orange-500',
      iconBg: 'bg-orange-500/10 text-orange-500',
      hoverGradient: 'from-orange-500/10 via-orange-900/10 to-transparent',
      icon: '💡',
    },
    {
      name: 'ReplyBot',
      layer: 'ACTION & COUNTER',
      desc: 'Drafts polite, viral-stopping corrections optimized for social feeds without shaming the poster.',
      accentColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10 text-emerald-500',
      hoverGradient: 'from-emerald-500/10 via-emerald-900/10 to-transparent',
      icon: '💬',
    },
  ];

  return (
    <div id="home" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden selection:bg-blue-500/30 transition-colors duration-300 relative">
      {/* Dynamic Cursor Spotlight */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, ${
            theme === 'dark' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.05)'
          }, transparent 40%)`,
        }}
      />

      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-xl shadow-sm">
              🛡️
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight">
                Satya<span className="text-orange-500">1.0</span>
              </span>
              <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold">
                AI SWARM
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <a href="#home" onClick={(e) => handleNavClick(e, 'home')} className="hover:text-blue-500 transition-colors">
              Home
            </a>
            <a href="#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')} className="hover:text-blue-500 transition-colors">
              Pipeline
            </a>
            <a href="#agents" onClick={(e) => handleNavClick(e, 'agents')} className="hover:text-blue-500 transition-colors">
              Agents
            </a>
            <button
              onClick={() => {
                if (onOpenVideoLab) onOpenVideoLab();
                else setShowVideoModal(true);
              }}
              className="hover:text-orange-500 transition-colors flex items-center gap-1"
            >
              <span>🎬</span> Video Lab
            </button>
            <button onClick={onOpenResearch} className="hover:text-blue-500 transition-colors flex items-center gap-1">
              <span>📊</span> Research Hub
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <button
              onClick={onStartDemo}
              className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold rounded-full hover:scale-105 transition-transform shadow-md"
            >
              Launch Verification
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Hero Text */}
          <div className="space-y-6 relative z-10 animate-in slide-in-from-bottom-6 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-bold text-orange-500 tracking-wide uppercase">
                Autonomous Multi-Agent Fact-Checking Engine
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
              Restoring Truth in <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-purple-500 to-blue-500">
                {text}
                <span className="text-slate-900 dark:text-white animate-pulse">|</span>
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Satya 1.0 coordinates Scout, Verifier, Synthesis, and ReplyBot agents to verify viral claims, debunk deepfakes, and generate polite counter-messages using live Google Search Grounding.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={onStartDemo}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-1"
              >
                Start Verifying Now →
              </button>

              <button
                onClick={() => {
                  if (onOpenVideoLab) onOpenVideoLab();
                  else setShowVideoModal(true);
                }}
                className="px-6 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-2xl border border-slate-200 dark:border-white/10 transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>🎬</span> Video Forensics Lab
              </button>
            </div>

            {/* Quick Test Claim Pills */}
            <div className="pt-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                ⚡ Try Sample Claims (1-Click Test):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onSelectSample && onSelectSample('Drinking sea water purifies cellular toxins faster than fresh water.')}
                  className="text-xs px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-all font-medium flex items-center gap-1 hover:scale-105"
                >
                  <span>❌</span> Debunk: Saltwater Detox
                </button>
                <button
                  onClick={() => onSelectSample && onSelectSample('NASA confirms Earth will experience 5 seconds of zero gravity during total solar eclipse.')}
                  className="text-xs px-3 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 transition-all font-medium flex items-center gap-1 hover:scale-105"
                >
                  <span>🌑</span> Debunk: Eclipse Zero-G Hoax
                </button>
                <button
                  onClick={() => onSelectSample && onSelectSample('Earth orbits the Sun and completes one revolution in approximately 365.25 days.')}
                  className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all font-medium flex items-center gap-1 hover:scale-105"
                >
                  <span>✓</span> Verify: Earth Orbit Fact
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Zero Hallucination Pipeline</span>
              </div>
              <div>⚡ Multi-Modal (Text, Img, Video, PDF)</div>
            </div>
          </div>

          {/* Right Interactive 3D Card */}
          <div
            className="relative animate-in zoom-in-95 duration-700"
            style={{ perspective: 1000 }}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div
              ref={cardRef}
              className="relative z-10 transition-transform duration-150 ease-out bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-6"
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Header Box */}
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="ml-2 text-xs font-mono text-slate-400">live_verification_stream.ts</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                  REAL-TIME GROUNDING
                </span>
              </div>

              {/* Sample Floating Live Cards (Clickable) */}
              <div className="space-y-3">
                <div
                  onClick={() => onSelectSample && onSelectSample('Drinking sea water purifies cellular toxins faster than fresh water.')}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-red-500/20 shadow-sm cursor-pointer hover:border-red-500/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all group"
                  style={{ transform: 'translateZ(30px)' }}
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-red-500 flex items-center gap-1">
                      <span>❌</span> DETECTED MISINFORMATION
                    </span>
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 group-hover:underline">Click to Verify →</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                    "Drinking sea water purifies cellular toxins faster than fresh water."
                  </p>
                </div>

                <div
                  onClick={() => onSelectSample && onSelectSample('Drinking sea water purifies cellular toxins faster than fresh water.')}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-emerald-500/30 shadow-sm cursor-pointer hover:border-emerald-500/60 transition-all"
                  style={{ transform: 'translateZ(45px)' }}
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-emerald-500">✓ VERIFIED SCIENTIFIC CONSENSUS</span>
                    <span className="font-mono text-slate-400">Confidence: 99%</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    Ingesting saltwater accelerates cellular dehydration and strains kidneys. Verdict: FALSE.
                  </p>
                </div>

                <div
                  className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-500/30"
                  style={{ transform: 'translateZ(60px)' }}
                >
                  <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">ReplyBot Auto-Generated Correction</div>
                  <p className="text-xs text-blue-900 dark:text-blue-200 italic">
                    "Heads up! Drinking seawater actually dehydrates cells and can cause severe health risks. Stay safe with fresh water! #FactCheck #SatyaAI"
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs text-slate-400 font-mono">
                <span>Latency: 1.4s</span>
                <span>Agents in Swarm: 4</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Section */}
      <section id="how-it-works" className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-white/5 transition-colors">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              The Swarm Pipeline of <span className="text-orange-500">Truth</span>
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
              Our autonomous multi-agent architecture executes a four-step verification sequence with live web citations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'User Input Stream',
                desc: 'Accepts raw text, URLs, images, PDFs, camera photos, or video files.',
                icon: '📥',
                color: 'text-blue-500',
              },
              {
                step: '02',
                title: 'Scout Agent',
                desc: 'Extracts core assertions, performs OCR, and strips noise from commentary.',
                icon: '🔍',
                color: 'text-indigo-500',
              },
              {
                step: '03',
                title: 'Verifier Agent',
                desc: 'Cross-checks live Google Search grounding & performs fallacy reasoning.',
                icon: '⚖️',
                color: 'text-purple-500',
              },
              {
                step: '04',
                title: 'Synthesis & ReplyBot',
                desc: 'Delivers transparent verdict dossiers & drafts polite social corrections.',
                icon: '💡',
                color: 'text-orange-500',
              },
            ].map((p, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-blue-500/40 transition-all hover:-translate-y-1 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl">{p.icon}</span>
                    <span className="text-xs font-mono font-bold text-slate-400">{p.step}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{p.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents Section */}
      <section id="agents" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Meet the <span className="text-emerald-500">Autonomous Agents</span>
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
              Each agent is specialized for a distinct stage of forensic media verification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map((agent, idx) => (
              <AgentCard3D key={idx} agent={agent} />
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-24 px-6 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-white/5">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Ready to Verify Any <span className="text-orange-500">Claim</span>?
          </h2>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Experience real-time AI fact-checking powered by Gemini 2.5 and live Google Search grounding.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={onStartDemo}
              className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-sm font-bold rounded-full hover:scale-105 transition-transform shadow-xl"
            >
              Launch Satya 1.0 Studio
            </button>
            <button
              onClick={onOpenResearch}
              className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Explore Research Hub
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950 text-center">
        <div className="max-w-7xl mx-auto px-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <span>🛡️</span> Satya 1.0 AI Verification Suite
          </div>
          <p className="text-xs text-slate-500">
            Powered by Google Gemini 2.5, Google Search Grounding & Autonomous Agent Swarm Architecture.
          </p>
        </div>
      </footer>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <VideoModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onSelectSampleVideo={(item) => {
          if (onSelectSample) onSelectSample(item.prompt);
          onStartDemo();
        }}
      />
    </div>
  );
};

export default LandingPage;
