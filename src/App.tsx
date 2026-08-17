import React, { useState, useRef, useEffect } from 'react';
import AgentCard from './components/AgentCard';
import ResultView from './components/ResultView';
import CameraCapture from './components/CameraCapture';
import ResearchHub from './components/ResearchHub';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import HistoryDrawer from './components/HistoryDrawer';
import VideoModal from './components/VideoModal';
import VideoLab from './components/VideoLab';
import LandingPage from './components/LandingPage';
import { scoutAgent, verifierAgent, explainabilityAgent, counterMessageAgent, verifyFullSwarm } from './services/geminiService';
import { AgentState, PipelineStatus, SatyaReport, HistoryItem } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useHistory } from './hooks/useHistory';

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

const agentMessages = {
  scout: {
    description: 'Scrapes trusted sources & extracts raw assertions from text, images, or video clips.',
    loading: ['Extracting text layers...', 'Scanning multimodal frames...', 'Filtering noise...', 'Extracting core claim...'],
    completed: 'Core claim isolated.',
  },
  verifier: {
    description: 'Cross-references claims against live Google Search Grounding with Chain-of-Thought logic.',
    loading: ['Querying Google Search Grounding...', 'Cross-referencing trusted consensus...', 'Detecting logical fallacies...', 'Computing truth probability...'],
    completed: 'Evidence verification complete.',
  },
  explainer: {
    description: 'Distills complex technical evidence into an authoritative verdict and breakdown.',
    loading: ['Synthesizing findings...', 'Structuring fact-check report...', 'Verifying source citations...', 'Generating summary...'],
    completed: 'Verdict dossier generated.',
  },
  counter: {
    description: 'Drafts empathetic, fact-based social corrections to halt viral misinformation.',
    loading: ['Analyzing tone & sentiment...', 'Drafting constructive counter-response...', 'Formatting social hashtags...', 'Finalizing counter-message...'],
    completed: 'Social counter-message ready.',
  },
};

interface MainAppProps {
  onBack: () => void;
  initialTab?: 'stream' | 'video' | 'research';
  prefilledClaim?: string;
}

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
};

const MainApp: React.FC<MainAppProps> = ({ onBack, initialTab = 'stream', prefilledClaim }) => {
  const { user, logout, addToHistory } = useAuth();

  const { state, set, undo, redo, canUndo, canRedo } = useHistory<AppContentState>({
    ...initialContentState,
    inputText: prefilledClaim || '',
  });

  const { file, inputText, status, report, error } = state;

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [activeTab, setActiveTab] = useState<'stream' | 'video' | 'research'>(initialTab);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessing = Object.values(status).some((s) => s === AgentState.WORKING);

  const handleSendToStream = (claim: string, autoRun = false) => {
    set(
      (prev) => ({
        ...prev,
        inputText: claim,
        file: null,
        report: null,
        error: null,
      }),
      true
    );
    setActiveTab('stream');
  };

  useEffect(() => {
    if (prefilledClaim && prefilledClaim.trim()) {
      set(
        (prev) => ({
          ...prev,
          inputText: prefilledClaim,
          file: null,
          report: null,
          error: null,
        }),
        true
      );
      setActiveTab('stream');
    }
  }, [prefilledClaim]);

  useEffect(() => {
    if (file) {
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
      set((prev) => ({ ...prev, file: newFile, error: null }), true);
    }
  };

  const handleCameraCapture = (capturedFile: File) => {
    set((prev) => ({ ...prev, file: capturedFile, error: null }), true);
    setShowCamera(false);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFile = e.dataTransfer.files[0];
      set((prev) => ({ ...prev, file: newFile, error: null }), true);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    set((prev) => ({ ...prev, inputText: e.target.value }), false);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        set(
          (prev) => ({
            ...prev,
            inputText: prev.inputText ? `${prev.inputText} ${transcript}` : transcript,
          }),
          true
        );
        setIsListening(false);
      };
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      alert('Speech recognition is not supported in this browser environment.');
    }
  };

  const startVerification = async () => {
    if (!file && !inputText.trim()) return;

    set(
      (prev) => ({
        ...prev,
        report: null,
        error: null,
        status: {
          scout: AgentState.WORKING,
          verifier: AgentState.IDLE,
          explainer: AgentState.IDLE,
          counter: AgentState.IDLE,
        },
      }),
      false
    );

    try {
      // Launch full swarm verification in single quota-efficient request
      const verificationPromise = verifyFullSwarm({ file, text: inputText });

      // Smooth multi-agent visual progression
      await new Promise((r) => setTimeout(r, 600));
      set(
        (prev) => ({
          ...prev,
          status: { ...prev.status, scout: AgentState.COMPLETED, verifier: AgentState.WORKING },
        }),
        false
      );

      await new Promise((r) => setTimeout(r, 800));
      set(
        (prev) => ({
          ...prev,
          status: { ...prev.status, verifier: AgentState.COMPLETED, explainer: AgentState.WORKING },
        }),
        false
      );

      const swarmData = await verificationPromise;

      await new Promise((r) => setTimeout(r, 400));
      set(
        (prev) => ({
          ...prev,
          status: { ...prev.status, explainer: AgentState.COMPLETED, counter: AgentState.WORKING },
        }),
        false
      );

      await new Promise((r) => setTimeout(r, 400));
      set(
        (prev) => ({
          ...prev,
          status: { ...prev.status, counter: AgentState.COMPLETED },
        }),
        false
      );

      let mediaType: SatyaReport['mediaType'] = 'text';
      if (file) {
        if (file.type.startsWith('video/')) mediaType = 'video';
        else if (file.type.startsWith('image/')) mediaType = 'image';
        else if (file.type === 'application/pdf') mediaType = 'pdf';
      }

      const finalReport: SatyaReport = {
        claim: swarmData.claim,
        verification: {
          rawText: swarmData.rawText,
          sources: swarmData.sources || [],
          verdict: swarmData.verdict,
          confidence: swarmData.confidence,
        },
        explanation: swarmData.explanation,
        counterMessage: swarmData.counterMessage,
        counterVariations: swarmData.variations,
        timestamp: Date.now(),
        mediaType,
        mediaName: file?.name,
      };

      set(
        (prev) => ({
          ...prev,
          report: finalReport,
        }),
        true
      );

      if (user) {
        addToHistory(finalReport).catch(console.error);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      set((prev) => {
        const newStatus = { ...prev.status };
        if (prev.status.scout === AgentState.WORKING) newStatus.scout = AgentState.ERROR;
        else if (prev.status.verifier === AgentState.WORKING) newStatus.verifier = AgentState.ERROR;
        else if (prev.status.explainer === AgentState.WORKING) newStatus.explainer = AgentState.ERROR;
        else if (prev.status.counter === AgentState.WORKING) newStatus.counter = AgentState.ERROR;

        return {
          ...prev,
          error: err.message || 'An unexpected error occurred during the verification sequence.',
          status: newStatus,
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
    set((prev) => ({ ...prev, file: null }), true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleHistorySelect = (item: HistoryItem) => {
    if (!item.report) return;

    set(
      (prev) => ({
        ...prev,
        report: item.report || null,
        inputText: item.claim,
        file: null,
        error: null,
        status: {
          scout: AgentState.COMPLETED,
          verifier: AgentState.COMPLETED,
          explainer: AgentState.COMPLETED,
          counter: AgentState.COMPLETED,
        },
      }),
      true
    );

    setShowHistory(false);
    setActiveTab('stream');
  };

  const getProgress = () => {
    if (report) return 100;
    if (status.counter === AgentState.WORKING) return 85;
    if (status.explainer === AgentState.WORKING) return 60;
    if (status.verifier === AgentState.WORKING) return 35;
    if (status.scout === AgentState.WORKING) return 10;
    return 0;
  };

  const hasStarted = status.scout !== AgentState.IDLE;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-50 dark:opacity-75">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/10 dark:bg-purple-600/10 blur-[130px]" />
      </div>

      {/* Navigation Header */}
      <nav className="border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
          {/* Left: Branding & Back Button */}
          <div className="flex items-center gap-3 z-10">
            <button
              onClick={onBack}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold pr-3 border-r border-slate-200 dark:border-white/10"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('stream')}>
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-sm">
                🛡️
              </div>
              <span className="text-base font-extrabold tracking-tight">
                Satya<span className="text-orange-500">1.0</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">
                STUDIO
              </span>
            </div>
          </div>

          {/* Center Tabs */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 hidden md:flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-white/5 z-10">
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'stream'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>📡</span> Verification Stream
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'video'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🔬</span> Video Lab
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'research'
                  ? 'bg-white dark:bg-slate-800 text-orange-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>📊</span> Research Hub
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3 z-10">
            <ThemeToggle />

            {/* Undo/Redo Buttons */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-white/5">
              <button
                onClick={undo}
                disabled={!canUndo || isProcessing}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-25 transition-all text-xs"
                title="Undo (Ctrl+Z)"
              >
                ↩
              </button>
              <button
                onClick={redo}
                disabled={!canRedo || isProcessing}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-25 transition-all text-xs"
                title="Redo (Ctrl+Y)"
              >
                ↪
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-3 relative">
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors flex items-center gap-1"
                >
                  <span>📁</span> History
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md focus:outline-none ring-2 ring-transparent hover:ring-blue-500/50 transition-all"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </button>

                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/5 mb-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-500 truncate font-mono">{user.email}</p>
                        </div>

                        <button
                          onClick={() => {
                            setShowProfileModal(true);
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                          <span>👤</span> Update Profile
                        </button>

                        <button
                          onClick={() => {
                            setShowVideoModal(true);
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                          <span>🎬</span> Video Lab & Samples
                        </button>

                        <div className="h-px bg-slate-100 dark:border-white/5 my-1" />

                        <button
                          onClick={() => {
                            logout();
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2"
                        >
                          <span>🚪</span> Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10 flex flex-col items-center">
        {activeTab === 'stream' ? (
          <>
            {/* Input Stream Box */}
            {!report && (
              <div
                className={`w-full max-w-3xl transition-all duration-500 ease-out ${
                  hasStarted ? 'mb-8 opacity-40 pointer-events-none' : 'mt-4'
                }`}
              >
                {!hasStarted && (
                  <div className="text-center mb-8 space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      Input Verification Stream
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                      Verify rumors, analyze images/videos, test claims against live web grounding.
                    </p>
                  </div>
                )}

                {/* Unified Input Card */}
                <div
                  className={`relative bg-white dark:bg-slate-900 rounded-3xl shadow-xl border transition-all duration-300 overflow-hidden ${
                    isDragging
                      ? 'border-blue-500 ring-4 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Drag-and-Drop Overlay */}
                  {isDragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-3xl">
                      <div className="text-center animate-bounce">
                        <div className="text-3xl mb-1">📂</div>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Drop media file to analyze</p>
                      </div>
                    </div>
                  )}

                  {/* Attached Media Preview */}
                  {file && (
                    <div className="px-5 pt-4">
                      <div className="relative inline-flex items-center gap-3 p-2 pr-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-white/10 group/file">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg">
                          {file.type.startsWith('image/') && previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : file.type.startsWith('video/') ? (
                            <span>🎬</span>
                          ) : (
                            <span>📄</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Media file'}
                          </span>
                        </div>
                        <button
                          onClick={removeFile}
                          className="absolute -top-2 -right-2 p-1 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-white/10 text-slate-400 hover:text-red-500 shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Main Textarea & Actions */}
                  <div className="flex items-end gap-2 p-4">
                    <textarea
                      value={inputText}
                      onChange={handleTextChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if ((inputText.trim() || file) && !isProcessing) startVerification();
                        }
                      }}
                      placeholder="Paste rumors, claims, or attach image/video to verify..."
                      className="w-full bg-transparent border-none outline-none ring-0 text-slate-900 dark:text-white placeholder-slate-400 text-base py-2 px-2 resize-none max-h-36 min-h-[52px]"
                      rows={2}
                    />

                    {/* Toolbar Actions */}
                    <div className="flex items-center gap-1.5 pb-1">
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*, video/mp4, video/webm, video/quicktime, application/pdf"
                      />

                      {/* Attach Button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Attach Media (Image, Video, PDF)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>

                      {/* Camera Button */}
                      <button
                        onClick={() => setShowCamera(true)}
                        className="p-2.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Take Photo with Camera"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                        </svg>
                      </button>

                      {/* Voice Microphone */}
                      <button
                        onClick={startListening}
                        className={`p-2.5 rounded-full transition-all ${
                          isListening
                            ? 'bg-red-500 text-white animate-pulse shadow-md'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Voice Input"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </button>

                      {/* Submit / Launch Button */}
                      <button
                        onClick={startVerification}
                        disabled={(!inputText.trim() && !file) || isProcessing}
                        className={`p-2.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                          !inputText.trim() && !file
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:scale-105'
                        }`}
                        title="Verify Claim"
                      >
                        {isProcessing ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-xs text-red-600 dark:text-red-300 flex items-center justify-between">
                    <span>⚠️ {error}</span>
                    <button onClick={() => set((p) => ({ ...p, error: null }))} className="font-bold underline ml-2">
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Quick Start Interactive Chips */}
                {!hasStarted && !file && !inputText && (
                  <div className="mt-8 space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                        ⚡ Quick Test Prompts
                      </span>
                      <button
                        onClick={() => setShowVideoModal(true)}
                        className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1"
                      >
                        <span>🎬</span> Test Video Claims
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          set(
                            (prev) => ({
                              ...prev,
                              inputText: 'NASA confirms Earth will experience 5 seconds of zero gravity during total solar eclipse.',
                            }),
                            true
                          );
                        }}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 hover:border-orange-500/40 transition-all text-left shadow-sm hover:-translate-y-0.5 group"
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide text-orange-500 mb-1">
                          <span>🌑 Astronomy Hoax (Debunk)</span>
                          <span className="text-blue-500 font-mono">Test →</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-relaxed">
                          "NASA confirms Earth will experience 5 seconds of zero gravity during total solar eclipse."
                        </p>
                      </button>

                      <button
                        onClick={() => {
                          set(
                            (prev) => ({
                              ...prev,
                              inputText: 'Drinking sea water purifies cellular toxins faster than fresh water.',
                            }),
                            true
                          );
                        }}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 hover:border-red-500/40 transition-all text-left shadow-sm hover:-translate-y-0.5 group"
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide text-red-500 mb-1">
                          <span>🌊 Health Myth (Debunk)</span>
                          <span className="text-blue-500 font-mono">Test →</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-relaxed">
                          "Drinking sea water purifies cellular toxins faster than fresh water."
                        </p>
                      </button>

                      <button
                        onClick={() => {
                          set(
                            (prev) => ({
                              ...prev,
                              inputText: 'Earth orbits the Sun and completes one revolution in approximately 365.25 days.',
                            }),
                            true
                          );
                        }}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 hover:border-emerald-500/40 transition-all text-left shadow-sm hover:-translate-y-0.5 group"
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide text-emerald-500 mb-1">
                          <span>✓ Verified Fact (True)</span>
                          <span className="text-emerald-500 font-mono">Test →</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-relaxed">
                          "Earth orbits the Sun and completes one revolution in approximately 365.25 days."
                        </p>
                      </button>

                      <button
                        onClick={() => {
                          set(
                            (prev) => ({
                              ...prev,
                              inputText: 'Elon Musk is hosting an official live stream giving away double the Bitcoin sent to promotional address.',
                            }),
                            true
                          );
                        }}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 hover:border-purple-500/40 transition-all text-left shadow-sm hover:-translate-y-0.5 group"
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide text-purple-500 mb-1">
                          <span>🪙 Financial Scam (Debunk)</span>
                          <span className="text-purple-500 font-mono">Test →</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-relaxed">
                          "Elon Musk is hosting an official live stream giving away double the Bitcoin sent to promotional address."
                        </p>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active Pipeline Swarm Display */}
            {hasStarted && !report && (
              <div className="w-full max-w-6xl mt-4 animate-in fade-in duration-500 space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      Autonomous Swarm Pipeline in Progress
                    </span>
                    <span>{getProgress()}% Completed</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 transition-all duration-700 ease-out"
                      style={{ width: `${getProgress()}%` }}
                    />
                  </div>
                </div>

                {/* 4 Agent Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <AgentCard
                    name="Scout"
                    role="Extraction"
                    state={status.scout}
                    description={agentMessages.scout.description}
                    loadingMessages={agentMessages.scout.loading}
                    completionMessage={agentMessages.scout.completed}
                  />
                  <AgentCard
                    name="Verifier"
                    role="Grounding"
                    state={status.verifier}
                    description={agentMessages.verifier.description}
                    loadingMessages={agentMessages.verifier.loading}
                    completionMessage={agentMessages.verifier.completed}
                  />
                  <AgentCard
                    name="Synthesis"
                    role="Verdict"
                    state={status.explainer}
                    description={agentMessages.explainer.description}
                    loadingMessages={agentMessages.explainer.loading}
                    completionMessage={agentMessages.explainer.completed}
                  />
                  <AgentCard
                    name="ReplyBot"
                    role="Counter"
                    state={status.counter}
                    description={agentMessages.counter.description}
                    loadingMessages={agentMessages.counter.loading}
                    completionMessage={agentMessages.counter.completed}
                  />
                </div>
              </div>
            )}

            {/* Final Verification Result */}
            {report && (
              <div className="w-full max-w-6xl mt-4">
                <ResultView report={report} onReset={reset} />
              </div>
            )}
          </>
        ) : activeTab === 'video' ? (
          <div className="w-full max-w-7xl animate-in fade-in duration-300">
            <VideoLab
              onSendToStream={handleSendToStream}
              onOpenResearch={() => setActiveTab('research')}
            />
          </div>
        ) : (
          <div className="w-full max-w-7xl animate-in fade-in duration-300">
            <ResearchHub onSendToStream={handleSendToStream} />
          </div>
        )}
      </main>

      {/* Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <HistoryDrawer isOpen={showHistory} onClose={() => setShowHistory(false)} onSelect={handleHistorySelect} />
      <VideoModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onSelectSampleVideo={(item) => {
          set(
            (prev) => ({
              ...prev,
              inputText: item.prompt,
              file: null,
            }),
            true
          );
          setActiveTab('stream');
        }}
      />

      {showCamera && (
        <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [initialTab, setInitialTab] = useState<'stream' | 'video' | 'research'>('stream');
  const [prefilledClaim, setPrefilledClaim] = useState<string>('');

  const handleStartDemo = () => {
    setInitialTab('stream');
    setShowDemo(true);
  };

  const handleOpenVideoLab = () => {
    setInitialTab('video');
    setShowDemo(true);
  };

  const handleOpenResearch = () => {
    setInitialTab('research');
    setShowDemo(true);
  };

  const handleSelectSample = (sample: string) => {
    setPrefilledClaim(sample);
    setInitialTab('stream');
    setShowDemo(true);
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        {showDemo ? (
          <MainApp
            onBack={() => setShowDemo(false)}
            initialTab={initialTab}
            prefilledClaim={prefilledClaim}
          />
        ) : (
          <LandingPage
            onStartDemo={handleStartDemo}
            onOpenVideoLab={handleOpenVideoLab}
            onOpenResearch={handleOpenResearch}
            onSelectSample={handleSelectSample}
          />
        )}
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
