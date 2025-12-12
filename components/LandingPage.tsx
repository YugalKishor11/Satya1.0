import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

interface LandingPageProps {
  onStartDemo: () => void;
  onOpenResearch: () => void;
}

interface Agent {
  name: string;
  layer: string;
  desc: string;
  accentColor: string;
  iconBorder: string;
  iconBg: string;
  hoverGradient: string;
  icon: React.ReactNode;
}

// --- 3D Card Component ---
const AgentCard3D: React.FC<{ agent: Agent }> = ({ agent }) => {
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

    const rotateX = (mouseY / (rect.height / 2)) * -10; // Subtle tilt
    const rotateY = (mouseX / (rect.width / 2)) * 10;

    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div 
        className="h-[420px] w-full group/card perspective-1000"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setIsHovering(true)}
    >
        <div 
            ref={cardRef}
            className={`relative w-full h-full rounded-3xl bg-white dark:bg-[#0f1420] border border-slate-200 dark:border-white/5 transition-all duration-200 ease-out shadow-lg dark:shadow-none overflow-hidden`}
            style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${isHovering ? 1.02 : 1})`,
            }}
        >
            {/* Hover Gradient Glow */}
            <div 
                className={`absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${agent.hoverGradient} pointer-events-none`}
                style={{ transform: 'translateZ(-1px)' }}
            />

            <div className="relative h-full flex flex-col p-8 z-10">
                {/* Icon Circle */}
                <div 
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-8 border ${agent.iconBorder} ${agent.iconBg} text-white transition-transform duration-300 group-hover/card:scale-110`}
                  style={{ transform: 'translateZ(20px)' }}
                >
                    {agent.icon}
                </div>

                {/* Name */}
                <h3 
                  className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight"
                  style={{ transform: 'translateZ(30px)' }}
                >
                  {agent.name}
                </h3>

                {/* Layer Label */}
                <div 
                  className={`text-xs font-extrabold uppercase tracking-widest mb-6 ${agent.accentColor}`}
                  style={{ transform: 'translateZ(25px)' }}
                >
                  {agent.layer}
                </div>

                {/* Description */}
                <p 
                  className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium"
                  style={{ transform: 'translateZ(20px)' }}
                >
                    {agent.desc}
                </p>
            </div>
            
            {/* Shine Effect */}
             <div 
                className="absolute inset-0 rounded-3xl opacity-0 group-hover/card:opacity-20 transition-opacity duration-500 pointer-events-none"
                style={{
                    background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, transparent 60%)`,
                    transform: 'translateZ(1px)'
                }}
             ></div>
        </div>
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onStartDemo, onOpenResearch }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // --- Interactive State ---
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // --- Dynamic Text State ---
  const words = ["Information Age", "Social Feed", "Digital Future"];
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [text, setText] = useState('');
  const [delta, setDelta] = useState(150);

  // Mouse Follow Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 3D Tilt Logic for Hero Card
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10; // Max -10 to 10 deg
    const rotateY = ((x - centerX) / centerX) * 10;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleCardMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Typewriter / Word Cycler Effect
  useEffect(() => {
    let ticker = setInterval(() => {
      tick();
    }, delta);

    return () => clearInterval(ticker);
  }, [text, delta]);

  const tick = () => {
    let i = wordIndex % words.length;
    let fullText = words[i];
    let updatedText = isDeleting ? fullText.substring(0, text.length - 1) : fullText.substring(0, text.length + 1);

    setText(updatedText);

    if (isDeleting) {
      setDelta(prev => prev / 2);
    }

    if (!isDeleting && updatedText === fullText) {
      setIsDeleting(true);
      setDelta(2000); // Pause at end
    } else if (isDeleting && updatedText === '') {
      setIsDeleting(false);
      setWordIndex(prev => prev + 1);
      setDelta(150);
    } else {
       // Normal typing speed
       if(isDeleting) setDelta(50);
       else setDelta(150);
    }
  };

  const handleStartClick = () => {
    if (user) {
      onStartDemo();
    } else {
      setShowAuthModal(true);
    }
  };

  // Smooth scroll handler to prevent default anchor behavior causing navigation errors
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      // scrollIntoView with block: 'start' aligns it to the top. 
      // The CSS scroll-padding-top in index.html handles the navbar offset.
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const agents: Agent[] = [
    { 
      name: "Scout", 
      layer: "RETRIEVAL LAYER", 
      desc: "Scrapes trusted real-time web sources. Filters noise to fetch raw context for verification.", 
      accentColor: "text-blue-500",
      iconBorder: "border-blue-500/30",
      iconBg: "bg-blue-500/10",
      hoverGradient: "from-blue-500/10 via-blue-900/10 to-transparent",
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    { 
      name: "Verifier", 
      layer: "LOGIC LAYER", 
      desc: "Cross-references claims against evidence using Chain-of-Thought reasoning to detect fallacies.", 
      accentColor: "text-purple-500",
      iconBorder: "border-purple-500/30",
      iconBg: "bg-purple-500/10",
      hoverGradient: "from-purple-500/10 via-purple-900/10 to-transparent",
      icon: (
        <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      )
    },
    { 
      name: "Synthesis", 
      layer: "VERDICT LAYER", 
      desc: "Distills complex data into a clear \"True/False\" verdict with cited sources and confidence scores.", 
      accentColor: "text-orange-500",
      iconBorder: "border-orange-500/30",
      iconBg: "bg-orange-500/10",
      hoverGradient: "from-orange-500/10 via-orange-900/10 to-transparent",
      icon: (
        <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    { 
      name: "ReplyBot", 
      layer: "ACTION LAYER", 
      desc: "Drafts empathetic, fact-based corrections optimized for social platforms to stop spread.", 
      accentColor: "text-emerald-500",
      iconBorder: "border-emerald-500/30",
      iconBg: "bg-emerald-500/10",
      hoverGradient: "from-emerald-500/10 via-emerald-900/10 to-transparent",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
  ];

  return (
    <div id="home" className="min-h-screen bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-white overflow-x-hidden selection:bg-brand-blue/30 transition-colors duration-300 relative">
      
      {/* Mouse Follow Spotlight */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, ${theme === 'dark' ? 'rgba(29, 78, 216, 0.15)' : 'rgba(59, 130, 246, 0.05)'}, transparent 40%)`
        }}
      />

      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 dark:bg-navy-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 text-brand-orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">Satya<span className="text-slate-400">1.0</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#home" onClick={(e) => handleNavClick(e, 'home')} className="hover:text-brand-blue dark:hover:text-white transition-colors">Home</a>
            <a href="#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')} className="hover:text-brand-blue dark:hover:text-white transition-colors">How it Works</a>
            <a href="#agents" onClick={(e) => handleNavClick(e, 'agents')} className="hover:text-brand-blue dark:hover:text-white transition-colors">Agents</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onOpenResearch(); }} className="hover:text-brand-blue dark:hover:text-white transition-colors">Research Hub</a>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
               {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button 
              onClick={handleStartClick}
              className="px-6 py-2.5 bg-navy-950 dark:bg-white text-white dark:text-navy-950 font-semibold rounded-full hover:bg-navy-800 dark:hover:bg-slate-200 transition-colors"
            >
              {user ? 'Launch Demo' : 'Demo Research'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <div className="space-y-8 relative z-10 animate-in slide-in-from-bottom-8 duration-700 fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-orange/30 bg-brand-orange/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
              <span className="text-xs font-semibold text-brand-orange tracking-wide uppercase">Agentic AI Framework v1.0 Live</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
              Restoring <br/>
              Trust in the <br/>
              <span className="inline-block min-w-[300px] text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-brand-purple">
                {text}
                <span className="text-slate-900 dark:text-white animate-pulse">|</span>
              </span>
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Satya 1.0 is an autonomous agentic AI system designed to fight misinformation. Powered by Scout, Verifier, and ReplyBot agents to ensure the truth always prevails.
            </p>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleStartClick}
                className="px-8 py-4 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-1 hover:shadow-blue-500/40"
              >
                {user ? 'Launch Demo' : 'Start Free Trial'}
              </button>
            </div>

            <div className="flex items-center gap-3 pt-8 text-sm font-mono text-brand-green">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               System Active & Monitoring
            </div>
          </div>

          {/* Right Visual (Interactive 3D Tilt) */}
          <div 
            className="relative perspective-1000 animate-in zoom-in-95 duration-1000 delay-200 fade-in"
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
             <div className="absolute inset-0 bg-brand-blue/10 dark:bg-brand-blue/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none transform translate-z-0"></div>
             
             {/* 3D Container */}
             <div 
               ref={cardRef}
               className="relative z-10 transition-transform duration-100 ease-out preserve-3d"
               style={{ 
                 transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                 transformStyle: 'preserve-3d'
               }}
             >
                <div className="relative bg-white/50 dark:bg-navy-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl">
                    <div className="rounded-xl overflow-hidden relative aspect-square border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-navy-950 flex items-center justify-center group">
                        {/* Abstract Visualization */}
                        <div className="absolute inset-0 opacity-30 pointer-events-none">
                            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-brand-orange rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob"></div>
                            <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-brand-purple rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
                            <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-brand-blue rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
                        </div>
                        
                        {/* Floating Cards Graphic with Parallax */}
                        <div className="relative z-10 w-full h-full p-8 flex flex-col justify-between transform-style-3d">
                             <div className="flex justify-between items-start translate-z-10">
                                 <div 
                                   className="bg-white/80 dark:bg-navy-800/80 p-4 rounded-lg border border-brand-orange/30 backdrop-blur-md shadow-lg transition-transform duration-500"
                                   style={{ transform: `translateZ(40px) translateX(${tilt.y * 1.5}px) translateY(${tilt.x * 1.5}px)` }}
                                 >
                                     <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center mb-2">
                                         <span className="text-brand-orange text-xs font-bold">❌</span>
                                     </div>
                                     <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Misinformation<br/>Filtered</p>
                                 </div>
                                 <div 
                                    className="bg-white/80 dark:bg-navy-800/80 p-4 rounded-lg border border-brand-green/30 backdrop-blur-md shadow-lg transition-transform duration-500"
                                    style={{ transform: `translateZ(60px) translateX(${tilt.y * -1.5}px) translateY(${tilt.x * 1.5}px)` }}
                                 >
                                     <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center mb-2">
                                         <span className="text-brand-green text-xs font-bold">✓</span>
                                     </div>
                                     <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Verified<br/>Truth</p>
                                 </div>
                             </div>
                             
                             <div 
                               className="self-center bg-white/90 dark:bg-navy-800/90 p-6 rounded-full border border-brand-blue/50 shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] z-20 transition-transform duration-300"
                               style={{ transform: `translateZ(80px) rotateX(${tilt.x * -0.5}deg) rotateY(${tilt.y * -0.5}deg)` }}
                             >
                                 <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-blue to-cyan-400 animate-pulse flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                 </div>
                             </div>
                        </div>
                        
                        {/* Grid Overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Pipeline Section */}
      <section id="how-it-works" className="py-24 bg-white dark:bg-navy-900/50 border-y border-slate-200 dark:border-white/5 transition-colors duration-300 relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-slate-900 dark:text-white">The Pipeline of <span className="text-brand-purple">Truth</span></h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Our architecture follows a rigorous 4-step verification process to ensure zero hallucinations.</p>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
            {[
                { title: "User Claim", icon: "⇥", desc: "Input text, URL, or image is received via the dashboard.", color: "bg-indigo-500" },
                { title: "Scout Agent", icon: "🔍", desc: "Scrapes trusted web sources in real-time for context.", color: "bg-blue-500" },
                { title: "Verifier Agent", icon: "✅", desc: "LLM analyzes contradictions and weighs evidence credibility.", color: "bg-purple-500" },
                { title: "Explainability", icon: "💡", desc: "Generates a clear verdict and a polite counter-message.", color: "bg-orange-500" },
            ].map((step, idx) => (
                <div key={idx} className="relative group perspective-500">
                    <div className="p-8 rounded-2xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/5 h-full relative z-10 hover:border-brand-blue/20 dark:hover:border-white/20 transition-all hover:-translate-y-2 hover:rotate-x-2 shadow-sm dark:shadow-none transform-style-3d">
                        <div className={`w-14 h-14 ${step.color} bg-opacity-10 dark:bg-opacity-10 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:bg-opacity-20 transition-all shadow-sm`}>
                            <span className="text-2xl">{step.icon}</span>
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-center text-slate-900 dark:text-white">{step.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm text-center leading-relaxed">{step.desc}</p>
                    </div>
                    {/* Connector Line (Desktop) */}
                    {idx < 3 && (
                        <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent z-0"></div>
                    )}
                </div>
            ))}
        </div>
      </section>

      {/* Agents Section */}
      <section id="agents" className="py-24 px-6 relative overflow-hidden z-10">
         <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-green/5 blur-[120px]"></div>
         
         <div className="max-w-7xl mx-auto mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-slate-900 dark:text-white">Meet the <span className="text-brand-green">Agents</span></h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">A collaborative swarm of specialized AI models working in harmony.</p>
         </div>

         <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {agents.map((agent, idx) => (
                <AgentCard3D key={idx} agent={agent} />
            ))}
         </div>
      </section>

      {/* CTA */}
      <section id="tech-stack" className="py-32 px-6 bg-slate-100 dark:bg-navy-950 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-100/90 to-slate-50 dark:from-navy-950 dark:via-navy-900/90 dark:to-navy-950"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white">Ready to find the <span className="text-brand-orange">Truth</span>?</h2>
            <p className="text-xl text-slate-600 dark:text-slate-300">Join the beta program and help us build a misinformation-free internet.</p>
            <button 
                onClick={handleStartClick}
                className="px-10 py-5 bg-navy-950 dark:bg-white text-white dark:text-navy-950 text-lg font-bold rounded-full hover:scale-105 transition-transform shadow-xl hover:shadow-2xl"
            >
                {user ? 'Launch Demo' : 'Start Free Trial'}
            </button>
        </div>
      </section>

      <footer className="py-12 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-navy-950 text-center transition-colors duration-300 relative z-10">
          <div className="flex flex-col items-center justify-center">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 text-brand-orange">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Satya 1.0</span>
              </div>

              {/* Copyright */}
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">© 2025 Satya AI Project. Built with Truth.</p>

              {/* Social Icons */}
              <div className="flex items-center gap-8">
                  <a href="#" className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors">
                      <span className="sr-only">GitHub</span>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                  </a>
                  <a href="#" className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors">
                      <span className="sr-only">LinkedIn</span>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                      </svg>
                  </a>
                  <a href="#" className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors">
                      <span className="sr-only">Twitter</span>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                  </a>
              </div>
          </div>
      </footer>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default LandingPage;