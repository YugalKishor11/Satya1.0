import React, { useState, useEffect } from 'react';
import { AgentState } from '../types';

interface AgentCardProps {
  name: string;
  role: string;
  state: AgentState;
  description: string;
  loadingMessages?: string[];
  completionMessage?: string;
}

const AgentCard: React.FC<AgentCardProps> = ({ 
  name, 
  role, 
  state, 
  description,
  loadingMessages = ["Processing...", "Analyzing data...", "Thinking..."],
  completionMessage
}) => {
  const [displayedText, setDisplayedText] = useState("");

  // Typing effect logic for loading messages
  useEffect(() => {
    if (state !== AgentState.WORKING) {
        setDisplayedText(""); 
        return;
    }

    let messageIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const loop = () => {
        const currentMessage = loadingMessages[messageIndex];
        
        if (isDeleting) {
            // Deleting text
            setDisplayedText(prev => prev.slice(0, -1));
            charIndex--;
            
            if (charIndex === 0) {
                isDeleting = false;
                messageIndex = (messageIndex + 1) % loadingMessages.length;
                timer = setTimeout(loop, 200); // Pause before typing next
            } else {
                timer = setTimeout(loop, 30); // Deleting speed
            }
        } else {
            // Typing text
            setDisplayedText(currentMessage.slice(0, charIndex + 1));
            charIndex++;

            if (charIndex === currentMessage.length) {
                isDeleting = true;
                timer = setTimeout(loop, 2000); // Pause at full text
            } else {
                timer = setTimeout(loop, 50 + Math.random() * 30); // Typing speed with slight randomness
            }
        }
    };

    loop();

    return () => clearTimeout(timer);
  }, [state, loadingMessages]);

  const isActive = state === AgentState.WORKING;
  const isCompleted = state === AgentState.COMPLETED;
  const isError = state === AgentState.ERROR;

  // Theme configuration - Gradient based, no images
  const getTheme = () => {
    switch (name) {
      case 'Scout': return {
        primary: '#3B82F6', // Blue
        secondary: '#60A5FA',
        shadow: 'shadow-blue-500/40',
        activeBorder: 'border-blue-500/60',
        gradient: 'from-blue-500/20 to-blue-600/5',
        hex: '#3B82F6'
      };
      case 'Verifier': return {
        primary: '#A855F7', // Purple
        secondary: '#C084FC',
        shadow: 'shadow-purple-500/40',
        activeBorder: 'border-purple-500/60',
        gradient: 'from-purple-500/20 to-purple-600/5',
        hex: '#A855F7'
      };
      case 'Synthesis': return {
        primary: '#F97316', // Orange
        secondary: '#FB923C',
        shadow: 'shadow-orange-500/40',
        activeBorder: 'border-orange-500/60',
        gradient: 'from-orange-500/20 to-orange-600/5',
        hex: '#F97316'
      };
      case 'ReplyBot': return {
        primary: '#10B981', // Green
        secondary: '#34D399',
        shadow: 'shadow-emerald-500/40',
        activeBorder: 'border-emerald-500/60',
        gradient: 'from-emerald-500/20 to-emerald-600/5',
        hex: '#10B981'
      };
      default: return {
        primary: '#94A3B8',
        secondary: '#CBD5E1',
        shadow: 'shadow-slate-500/40',
        activeBorder: 'border-slate-500/60',
        gradient: 'from-slate-500/20 to-slate-600/5',
        hex: '#94A3B8'
      };
    }
  };

  const theme = getTheme();

  return (
    <div 
      className={`
        relative overflow-hidden rounded-[24px] flex flex-col h-full min-h-[220px]
        transition-all duration-500 ease-out group isolate
        ${isActive ? 'scale-[1.02] -translate-y-3 z-10' : isCompleted ? 'opacity-80 hover:opacity-100 hover:-translate-y-1' : 'opacity-60 grayscale-[0.5]'}
        bg-[#0f172a] dark:bg-[#020617]
      `}
      style={{
        boxShadow: isActive 
          ? `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 30px -5px ${theme.primary}40` // Active Aura
          : '0 10px 30px -10px rgba(0, 0, 0, 0.5)', // Resting Float
        border: isActive ? `1px solid ${theme.primary}80` : '1px solid rgba(255,255,255,0.08)'
      }}
    >
      
      {/* 1. Visual Header (Top) */}
      <div className={`h-28 w-full relative overflow-hidden bg-gradient-to-br ${theme.gradient}`}>
         
         {/* Grid Background Effect when Active */}
         {isActive && (
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none" 
              style={{ 
                  backgroundImage: `linear-gradient(${theme.hex} 1px, transparent 1px), linear-gradient(90deg, ${theme.hex} 1px, transparent 1px)`,
                  backgroundSize: '24px 24px',
                  maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
              }}
            ></div>
         )}

         {/* Abstract Blob Shape */}
         <div className={`absolute top-[-20%] right-[-20%] w-[80%] h-[150%] rounded-full bg-white/5 blur-3xl pointer-events-none transition-transform duration-[8s] ${isActive ? 'animate-blob opacity-60' : 'opacity-30'}`}></div>
         
         {/* Scan Line Effect */}
         {isActive && (
             <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-loading-bar pointer-events-none"></div>
         )}
         
         <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"></div>

         {/* Status Badge (Top Right) */}
         <div className="absolute top-4 right-4 z-10">
            {isActive && (
                <div 
                  className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-widest text-white shadow-lg animate-pulse"
                  style={{ borderColor: theme.primary }}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping absolute opacity-75" style={{ color: theme.secondary }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-current relative" style={{ color: theme.secondary }}></span>
                    WORKING
                </div>
            )}
            {isCompleted && (
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 ring-2 ring-black">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
            )}
             {isError && (
                <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 ring-2 ring-black">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
            )}
         </div>

         {/* Role Tag (Bottom Left) */}
         <div className="absolute bottom-3 left-5 z-10">
             <div 
               className="text-[10px] font-black tracking-widest uppercase py-1 px-3 rounded bg-black/50 backdrop-blur-md border border-white/10 shadow-lg"
               style={{ color: theme.secondary }}
             >
                Role: {role}
             </div>
         </div>
      </div>

      {/* 2. Content Body (Bottom) */}
      <div className="p-6 pt-2 flex-1 flex flex-col relative z-10">
         
         <div className="mb-auto">
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight flex items-center gap-2 drop-shadow-sm">
                {name}
            </h3>
            
            <div className="relative min-h-[60px]">
                {/* Animated Loading Text with Typewriter Effect */}
                <div className={`transition-all duration-300 absolute inset-0 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                     <p className="font-mono text-xs leading-relaxed" style={{ color: theme.secondary }}>
                       <span className="opacity-70 mr-2 text-[10px]">{'>'}</span>
                       {displayedText}
                       <span className="animate-pulse ml-1 inline-block w-1.5 h-3 align-middle bg-current opacity-70"></span>
                     </p>
                </div>

                {/* Static Description Text (Shows when IDLE, COMPLETED, or ERROR) */}
                <div className={`transition-all duration-300 ${isActive ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                    <p className={`text-xs leading-relaxed font-normal ${isCompleted ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                        {isCompleted && completionMessage ? completionMessage : description}
                    </p>
                </div>
            </div>
         </div>
         
         {/* Bottom Accent Glow Line */}
         <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30"></div>
         {isActive && (
            <div 
              className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-current to-transparent opacity-100 animate-pulse" 
              style={{ color: theme.primary }}
            ></div>
         )}
      </div>
    </div>
  );
};

export default AgentCard;