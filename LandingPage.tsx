import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

interface LandingPageProps {
  onStartDemo: () => void;
  onOpenResearch: () => void;
}

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
              {user ? 'Launch Demo' : 'Try Demo'}
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
              <button className="px-8 py-4 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-900 dark:text-white font-semibold rounded-lg border border-slate-200 dark:border-white/5 transition-colors shadow-sm dark:shadow-none backdrop-blur-sm">
                Read Documentation
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

         <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { name: "Scout", role: "Retrieval", desc: "The information gatherer. Scout connects to the live web to find facts.", color: "from-blue-500/20 to-cyan-500/5", border: "border-blue-500/20" },
                { name: "Verifier", role: "Logic", desc: "The judge. Uses Chain-of-Thought prompting to assess contradictions.", color: "from-purple-500/20 to-pink-500/5", border: "border-purple-500/20" },
                { name: "Synthesis", role: "Synthesis", desc: "The translator. Converts complex verification logs into plain English.", color: "from-orange-500/20 to-yellow-500/5", border: "border-orange-500/20" },
                { name: "ReplyBot", role: "Response", desc: "The communicator. Drafts polite, fact-based replies for social media.", color: "from-green-500/20 to-emerald-500/5", border: "border-green-500/20" },
            ].map((agent, idx) => (
                <div key={idx} className={`rounded-2xl border ${agent.border} bg-white dark:bg-navy-900 overflow-hidden hover:scale-105 transition-transform duration-300 group shadow-sm dark:shadow-none`}>
                    <div className={`h-32 bg-gradient-to-br ${agent.color} relative p-6 flex flex-col justify-end`}>
                        <div className="absolute top-4 right-4 opacity-70 dark:opacity-50 font-mono text-xs border border-current px-2 py-1 rounded text-slate-700 dark:text-white">Role: {agent.role}</div>
                        {/* Abstract Icon */}
                        <div className="absolute inset-0 opacity-10 dark:opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    </div>
                    <div className="p-6">
                        <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{agent.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{agent.desc}</p>
                    </div>
                </div>
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
                {user ? 'Launch Demo' : 'Sign In & Demo Research'}
            </button>
        </div>
      </section>

      <footer className="py-12 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-navy-950 text-center transition-colors duration-300 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4 text-xl font-bold text-slate-900 dark:text-white">
            <span className="text-brand-orange">🛡️</span> Satya 1.0
        </div>
        <p className="text-slate-500 text-sm">© 2025 Satya AI Project. Built with Truth.</p>
        <div className="flex justify-center gap-6 mt-6 text-slate-500 dark:text-slate-400 text-sm">
            <a href="#" className="hover:text-brand-blue dark:hover:text-white">GitHub</a>
            <a href="#" className="hover:text-brand-blue dark:hover:text-white">Documentation</a>
            <a href="#" className="hover:text-brand-blue dark:hover:text-white">Twitter</a>
        </div>
      </footer>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default LandingPage;