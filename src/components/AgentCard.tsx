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
  loadingMessages = ['Processing...', 'Analyzing data...', 'Thinking...'],
  completionMessage,
}) => {
  const [displayedText, setDisplayedText] = useState('');

  // Typing effect logic for loading messages
  useEffect(() => {
    if (state !== AgentState.WORKING) {
      setDisplayedText('');
      return;
    }

    let messageIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const loop = () => {
      const currentMessage = loadingMessages[messageIndex] || 'Analyzing...';

      if (isDeleting) {
        setDisplayedText((prev) => prev.slice(0, -1));
        charIndex--;

        if (charIndex <= 0) {
          isDeleting = false;
          messageIndex = (messageIndex + 1) % loadingMessages.length;
          timer = setTimeout(loop, 250);
        } else {
          timer = setTimeout(loop, 30);
        }
      } else {
        setDisplayedText(currentMessage.slice(0, charIndex + 1));
        charIndex++;

        if (charIndex >= currentMessage.length) {
          isDeleting = true;
          timer = setTimeout(loop, 2000);
        } else {
          timer = setTimeout(loop, 50 + Math.random() * 25);
        }
      }
    };

    loop();

    return () => clearTimeout(timer);
  }, [state, loadingMessages]);

  const isActive = state === AgentState.WORKING;
  const isCompleted = state === AgentState.COMPLETED;
  const isError = state === AgentState.ERROR;

  const getTheme = () => {
    switch (name) {
      case 'Scout':
        return {
          primary: '#3B82F6',
          secondary: '#60A5FA',
          activeBorder: 'border-blue-500/60',
          gradient: 'from-blue-500/20 to-blue-600/5',
          hex: '#3B82F6',
          icon: '🔍',
        };
      case 'Verifier':
        return {
          primary: '#A855F7',
          secondary: '#C084FC',
          activeBorder: 'border-purple-500/60',
          gradient: 'from-purple-500/20 to-purple-600/5',
          hex: '#A855F7',
          icon: '⚖️',
        };
      case 'Synthesis':
        return {
          primary: '#F97316',
          secondary: '#FB923C',
          activeBorder: 'border-orange-500/60',
          gradient: 'from-orange-500/20 to-orange-600/5',
          hex: '#F97316',
          icon: '💡',
        };
      case 'ReplyBot':
        return {
          primary: '#10B981',
          secondary: '#34D399',
          activeBorder: 'border-emerald-500/60',
          gradient: 'from-emerald-500/20 to-emerald-600/5',
          hex: '#10B981',
          icon: '💬',
        };
      default:
        return {
          primary: '#94A3B8',
          secondary: '#CBD5E1',
          activeBorder: 'border-slate-500/60',
          gradient: 'from-slate-500/20 to-slate-600/5',
          hex: '#94A3B8',
          icon: '🤖',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`relative overflow-hidden rounded-2xl flex flex-col h-full min-h-[230px] transition-all duration-500 ease-out isolate ${
        isActive
          ? 'scale-[1.02] -translate-y-2 z-10'
          : isCompleted
          ? 'opacity-90 hover:opacity-100 hover:-translate-y-1'
          : 'opacity-65 grayscale-[0.3]'
      } bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm`}
      style={{
        boxShadow: isActive
          ? `0 20px 40px -15px rgba(0,0,0,0.3), 0 0 25px -5px ${theme.primary}50`
          : undefined,
        borderColor: isActive ? theme.primary : undefined,
      }}
    >
      {/* Visual Header */}
      <div className={`h-24 w-full relative overflow-hidden bg-gradient-to-br ${theme.gradient}`}>
        {isActive && (
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(${theme.hex} 1px, transparent 1px), linear-gradient(90deg, ${theme.hex} 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          {isActive && (
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 dark:bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-widest text-white shadow-lg animate-pulse"
              style={{ borderColor: theme.primary }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" style={{ color: theme.secondary }} />
              ACTIVE
            </div>
          )}
          {isCompleted && (
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 ring-2 ring-white dark:ring-slate-900">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {isError && (
            <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white shadow-md shadow-red-500/30 ring-2 ring-white dark:ring-slate-900">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Role Tag */}
        <div className="absolute bottom-2.5 left-4 z-10">
          <div
            className="text-[10px] font-bold tracking-widest uppercase py-0.5 px-2.5 rounded bg-slate-100/90 dark:bg-black/50 backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
          >
            {theme.icon} {role}
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 pt-1 flex-1 flex flex-col relative z-10">
        <div className="mb-auto">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 tracking-tight flex items-center gap-2">
            {name}
          </h3>

          <div className="relative min-h-[55px]">
            {/* Active Loading Text */}
            <div
              className={`transition-all duration-300 absolute inset-0 ${
                isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
            >
              <p className="font-mono text-xs leading-relaxed text-blue-600 dark:text-blue-400">
                <span className="opacity-70 mr-1.5">{'>'}</span>
                {displayedText}
                <span className="animate-pulse ml-1 inline-block w-1.5 h-3 align-middle bg-current" />
              </p>
            </div>

            {/* Static Description */}
            <div
              className={`transition-all duration-300 ${
                isActive ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
              }`}
            >
              <p
                className={`text-xs leading-relaxed ${
                  isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {isCompleted && completionMessage ? completionMessage : description}
              </p>
            </div>
          </div>
        </div>

        {/* Active Bottom Glow */}
        {isActive && (
          <div
            className="absolute bottom-0 left-0 h-[2px] w-full animate-pulse"
            style={{ backgroundColor: theme.primary }}
          />
        )}
      </div>
    </div>
  );
};

export default AgentCard;
