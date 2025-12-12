import React, { useState, useRef, useEffect } from 'react';
import AgentCard from './components/AgentCard';
import ResultView from './components/ResultView';
import CameraCapture from './components/CameraCapture';
import ResearchHub from './components/ResearchHub';
import { scoutAgent, verifierAgent, explainabilityAgent, counterMessageAgent } from './services/geminiService';
import { AgentState, PipelineStatus, SatyaReport, HistoryItem } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import HistoryDrawer from './components/HistoryDrawer';
import { useHistory } from './hooks/useHistory';
import LandingPage from './components/LandingPage';

const initialStatus: PipelineStatus = {
  scout: AgentState.IDLE,
  verifier: AgentState.IDLE,
  explainer: AgentState.IDLE,
  counter: AgentState.IDLE,
};

interface AppContentState {
  file: File | null;
  inputText: string;
  status: PipelineStatus;
  report: SatyaReport | null;
  error: string | null;
}

const initialContentState: AppContentState = {
  file: null,
  inputText: '',
  status: initialStatus,
  report: null,
  error: null,
};

interface MainAppProps {
  onBack: () => void;
  initialTab?: 'stream' | 'research';
}

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
      )}
    </button>
  );
};

const MainApp: React.FC<MainAppProps> = ({ onBack, initialTab = 'stream' }) => {
  const { user, logout, addToHistory } = useAuth();
  
  // Undo/Redo State Management
  const { state, set, undo, redo, canUndo, canRedo } = useHistory<AppContentState>(initialContentState);
  const { file, inputText, status, report, error } = state;

  // UI States (Transient, not part of Undo History)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'stream' | 'research'>(initialTab);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessing = Object.values(status).some(s => s === AgentState.WORKING);

  // Manage Preview URL to prevent memory leaks
  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo && !isProcessing) redo();
        } else {
          if (canUndo && !isProcessing) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo && !isProcessing) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, isProcessing]);


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFile = e.target.files[0];
      set(prev => ({ ...prev, file: newFile, error: null }), true);
    }
  };

  const handleCameraCapture = (file: File) => {
    set(prev => ({ ...prev, file: file, error: null }), true);
    setShowCamera(false);
  };

  // Improved Drag and Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Necessary to allow dropping
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent flickering when dragging over child elements
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFile = e.dataTransfer.files[0];
      if (newFile.type.startsWith('image/') || newFile.type === 'application/pdf') {
        set(prev => ({ ...prev, file: newFile, error: null }), true);
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    set(prev => ({ ...prev, inputText: e.target.value }), false); 
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        set(prev => ({ ...prev, inputText: prev.inputText ? `${prev.inputText} ${transcript}` : transcript }), true);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      alert("Speech recognition is not supported in this browser.");
    }
  };

  const startVerification = async () => {
    if (!file && !inputText.trim()) return;

    set(prev => ({
      ...prev,
      report: null,
      error: null,
      status: {
        scout: AgentState.WORKING,
        verifier: AgentState.IDLE,
        explainer: AgentState.IDLE,
        counter: AgentState.IDLE,
      }
    }), false);

    try {
      // Pass both file and text to Scout Agent
      const claim = await scoutAgent({ file, text: inputText });
      
      set(prev => ({
        ...prev,
        status: { ...prev.status, scout: AgentState.COMPLETED, verifier: AgentState.WORKING }
      }), false);

      const verificationResult = await verifierAgent(claim);
      set(prev => ({
        ...prev,
        status: { ...prev.status, verifier: AgentState.COMPLETED, explainer: AgentState.WORKING }
      }), false);

      const explanation = await explainabilityAgent(verificationResult.rawText);
      set(prev => ({
        ...prev,
        status: { ...prev.status, explainer: AgentState.COMPLETED, counter: AgentState.WORKING }
      }), false);

      const counterMessage = await counterMessageAgent(claim, explanation);
      set(prev => ({
        ...prev,
        status: { ...prev.status, counter: AgentState.COMPLETED }
      }), false);

      const finalReport: SatyaReport = {
        claim,
        verification: verificationResult,
        explanation,
        counterMessage,
        timestamp: Date.now()
      };

      set(prev => ({
        ...prev,
        report: finalReport
      }), true);

      if (user) {
        addToHistory(finalReport).catch(console.error);
      }

    } catch (err: any) {
      console.error(err);
      set(prev => {
        const newStatus = { ...prev.status };
        if (prev.status.scout === AgentState.WORKING) newStatus.scout = AgentState.ERROR;
        else if (prev.status.verifier === AgentState.WORKING) newStatus.verifier = AgentState.ERROR;
        else if (prev.status.explainer === AgentState.WORKING) newStatus.explainer = AgentState.ERROR;
        else if (prev.status.counter === AgentState.WORKING) newStatus.counter = AgentState.ERROR;
        
        return {
          ...prev,
          error: err.message || "An unexpected error occurred during the verification process.",
          status: newStatus
        };
      }, true);
    }
  };

  const reset = () => {
    set(() => initialContentState, true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    set(prev => ({ ...prev, file: null }), true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleHistorySelect = (item: HistoryItem) => {
    if (!item.report) return;

    set(prev => ({
      ...prev,
      report: item.report || null,
      inputText: item.claim,
      file: null, // History doesn't store the file blob usually
      error: null,
      status: {
        scout: AgentState.COMPLETED,
        verifier: AgentState.COMPLETED,
        explainer: AgentState.COMPLETED,
        counter: AgentState.COMPLETED,
      }
    }), true);
    
    setShowHistory(false);
    setActiveTab('stream');
  };

  const hasStarted = status.scout !== AgentState.IDLE;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-slate-50 relative overflow-hidden transition-colors duration-300">
      
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-50 dark:opacity-100">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-navy-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
          
          {/* Left: Branding */}
          <div className="flex items-center gap-4 z-10">
             <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 text-sm font-medium pr-4 border-r border-slate-200 dark:border-white/10">
                ← Home
             </button>
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
                <div className="w-8 h-8 text-brand-orange">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Satya<span className="text-slate-400">1.0</span></span>
                <span className="text-xs bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded border border-brand-orange/20">DEMO</span>
            </div>
          </div>
          
          {/* Center: Main Navigation Tabs */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 hidden md:flex items-center p-1 bg-slate-100 dark:bg-navy-900/50 rounded-full border border-slate-200 dark:border-white/5 z-10">
            <button 
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                } else {
                  setActiveTab('stream');
                }
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'stream' 
                  ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-white/10' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              Stream
              {!user && <svg className="w-3 h-3 ml-0.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
            </button>
            <button 
              onClick={() => setActiveTab('research')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'research' 
                  ? 'bg-white dark:bg-navy-800 text-brand-orange shadow-sm ring-1 ring-slate-200 dark:ring-white/10' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={activeTab === 'research' ? 'text-brand-orange' : 'opacity-70'}>
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                <circle cx="18" cy="18" r="3" className={`${activeTab === 'research' ? 'fill-white dark:fill-navy-800' : 'fill-slate-100 dark:fill-navy-900'} transition-colors`} stroke="none" /> 
                <path d="M18 16v2" stroke={activeTab === 'research' ? '#f97316' : 'currentColor'} strokeWidth="2"/> 
                <path d="M18 20h.01" stroke={activeTab === 'research' ? '#f97316' : 'currentColor'} strokeWidth="2"/>
              </svg>
              Research Hub
            </button>
          </div>

          {/* Right: User Controls */}
          <div className="flex items-center gap-4 z-10">
            <ThemeToggle />
            
            {/* Undo/Redo */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-navy-900 rounded-lg p-1 border border-slate-200 dark:border-white/10 transition-colors">
              <button 
                onClick={undo}
                disabled={!canUndo || isProcessing}
                className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 transition-all"
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              </button>
              <button 
                onClick={redo}
                disabled={!canRedo || isProcessing}
                className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 transition-all"
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-3 relative">
                 <button onClick={() => setShowHistory(true)} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">History</button>
                  
                 <div className="relative">
                    <button 
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-lg focus:outline-none ring-2 ring-transparent hover:ring-brand-blue/50 transition-all"
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </button>
                    
                    {showProfileMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-navy-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 animate-in fade-in zoom-in-95 duration-200 z-50 origin-top-right">
                           <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-1">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                              <p className="text-xs text-slate-500 truncate font-mono">{user.email}</p>
                           </div>
                           
                           <button 
                             onClick={() => { setShowProfileModal(true); setShowProfileMenu(false); }}
                             className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                             Update Profile
                           </button>
                           
                           <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                           
                           <button 
                             onClick={() => { logout(); setShowProfileMenu(false); }}
                             className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                             Log Out
                           </button>
                        </div>
                      </>
                    )}
                  </div>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="text-sm font-bold text-brand-blue hover:text-blue-600 dark:hover:text-blue-300">Login</button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10 flex flex-col items-center">
        
        {activeTab === 'stream' ? (
          <>
            {/* Input Stream Section */}
            {!report && (
              <div className={`w-full max-w-3xl transition-all duration-700 ease-out ${hasStarted ? 'mb-12 opacity-50 pointer-events-none' : 'mt-12'}`}>
                {!hasStarted && (
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900 dark:text-white tracking-tight">Input Stream</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">Verify rumors, analyze images, or check facts.</p>
                    </div>
                )}

                {/* Unified Input Container */}
                <div 
                  className={`relative bg-white dark:bg-navy-900 rounded-[2rem] shadow-xl dark:shadow-2xl border transition-all duration-300 group overflow-hidden isolation-isolate
                    ${isProcessing ? 'border-slate-200 dark:border-slate-700' : 
                      isDragging ? 'border-brand-blue ring-4 ring-brand-blue/20 bg-blue-50 dark:bg-blue-900/20' : 
                      'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus-within:ring-4 focus-within:ring-brand-blue/10 focus-within:border-brand-blue/50'}`}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  
                  {isDragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-navy-900/80 backdrop-blur-sm border-2 border-dashed border-brand-blue rounded-[2rem]">
                      <div className="text-center animate-bounce">
                         <svg className="w-12 h-12 text-brand-blue mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                         <p className="text-xl font-bold text-brand-blue">Drop file to upload</p>
                      </div>
                    </div>
                  )}

                  {/* Preview Area (Above input if file exists) */}
                  {file && (
                    <div className="px-4 pt-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="relative inline-flex items-center gap-3 p-2 pr-4 bg-slate-50 dark:bg-navy-800 rounded-xl border border-slate-100 dark:border-slate-700 group/file">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-navy-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                               {file.type.startsWith('image/') && previewUrl ? (
                                 <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                               ) : (
                                 <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                               )}
                            </div>
                            <div className="flex flex-col">
                               <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{file.name}</span>
                               <span className="text-[10px] text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <button 
                              onClick={removeFile}
                              className="absolute -top-2 -right-2 p-1 bg-white dark:bg-navy-700 rounded-full border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-red-500 shadow-sm opacity-0 group-hover/file:opacity-100 transition-all"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                  )}

                  <div className="flex items-end gap-2 p-3">
                     {/* Text Area */}
                     <textarea
                        value={inputText}
                        onChange={handleTextChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if ((inputText.trim() || file) && !isProcessing) startVerification();
                            }
                        }}
                        autoComplete="off"
                        placeholder="Ask anything, verify rumors, upload image or PDF..."
                        className="w-full bg-transparent border-none outline-none ring-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 resize-none text-lg py-3 px-4 max-h-40"
                        style={{ height: '56px', minHeight: '56px' }}
                     />

                     {/* Right Actions Toolbar */}
                     <div className="flex items-center gap-2 pb-1.5 pr-2">
                        
                        {/* Attach Button (Plus) */}
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            style={{ display: 'none' }} 
                            accept="image/png, image/jpeg, image/jpg, application/pdf"
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800 transition-all tooltip"
                            title="Attach Image or PDF"
                        >
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>

                        {/* Camera Button */}
                        <button 
                            onClick={() => setShowCamera(true)}
                            className="md:hidden p-2.5 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800 transition-all tooltip"
                            title="Take Photo"
                        >
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>

                         {/* Voice Button (Microphone) */}
                         <button 
                            onClick={startListening}
                            className={`p-2.5 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800'}`}
                            title="Voice Input"
                        >
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>

                        {/* Submit Button (Up Arrow) */}
                        <button 
                            onClick={startVerification}
                            disabled={(!inputText.trim() && !file) || isProcessing}
                            className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                                (!inputText.trim() && !file) 
                                    ? 'bg-slate-100 dark:bg-navy-800 text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                                    : 'bg-slate-900 dark:bg-white text-white dark:text-navy-950 hover:scale-105 shadow-md'
                            }`}
                        >
                            {isProcessing ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            )}
                        </button>
                     </div>
                  </div>
                </div>
                
                {/* Quick Start Chips */}
                {!hasStarted && !file && !inputText && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={() => { set(prev => ({ ...prev, inputText: "NASA confirms gravity will reverse for 5 seconds during the eclipse." }), true); }}
                            className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/50 hover:border-brand-orange/30 shadow-sm dark:shadow-none transition-all hover:-translate-y-1 cursor-pointer group text-left"
                        >
                            <p className="text-xs text-brand-orange font-bold font-mono mb-2 uppercase tracking-wide">Social Media Claim #1</p>
                            <p className="text-slate-600 dark:text-slate-300 text-sm group-hover:text-slate-900 dark:group-hover:text-white leading-relaxed">"NASA confirms gravity will reverse for 5 seconds during the eclipse."</p>
                        </button>
                        <button 
                             onClick={() => { set(prev => ({ ...prev, inputText: "New study claims drinking saltwater hydrates you faster than fresh water." }), true); }}
                            className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/50 hover:border-brand-green/30 shadow-sm dark:shadow-none transition-all hover:-translate-y-1 cursor-pointer group text-left"
                        >
                            <p className="text-xs text-brand-green font-bold font-mono mb-2 uppercase tracking-wide">News Headline #2</p>
                            <p className="text-slate-600 dark:text-slate-300 text-sm group-hover:text-slate-900 dark:group-hover:text-white leading-relaxed">"New study claims drinking saltwater hydrates you faster than fresh water."</p>
                        </button>
                    </div>
                )}
              </div>
            )}

            {/* Final Report */}
            {report && (
              <div className="w-full max-w-6xl">
                 <ResultView report={report} onReset={reset} />
              </div>
            )}
          </>
        ) : (
          <div className="w-full max-w-7xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <ResearchHub />
          </div>
        )}

      </main>

      {/* Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <HistoryDrawer isOpen={showHistory} onClose={() => setShowHistory(false)} onSelect={handleHistorySelect} />
      
      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture 
          onCapture={handleCameraCapture} 
          onClose={() => setShowCamera(false)} 
        />
      )}

    </div>
  );
};

const App: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [initialTab, setInitialTab] = useState<'stream' | 'research'>('stream');

  const handleStartDemo = () => {
    setInitialTab('stream');
    setShowDemo(true);
  };

  const handleOpenResearch = () => {
    setInitialTab('research');
    setShowDemo(true);
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        {showDemo ? (
          <MainApp onBack={() => setShowDemo(false)} initialTab={initialTab} />
        ) : (
          <LandingPage onStartDemo={handleStartDemo} onOpenResearch={handleOpenResearch} />
        )}
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;