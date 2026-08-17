import React, { useState, useRef, useEffect } from 'react';
import { analyzeVideoForensics } from '../services/geminiService';
import { VideoForensicResult } from '../types';

interface VideoLabProps {
  onSendToStream?: (claim: string) => void;
  onOpenResearch?: () => void;
}

interface VideoPreset {
  id: string;
  title: string;
  category: string;
  duration: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  tags: string[];
  thumbnailIcon: string;
  videoSrc?: string;
  prompt: string;
}

const PRESETS: VideoPreset[] = [
  {
    id: 'deepfake_ceo',
    title: 'AI Voice Clone: Tech CEO Emergency Cloud Shutdown',
    category: 'Synthetic Media / Voice Cloning',
    duration: '0:28',
    riskLevel: 'CRITICAL',
    description: 'A viral video combining real keynote footage with a synthetic voice clone claiming free cloud services terminate tonight.',
    tags: ['ElevenLabs AI Clone', 'Facial Boundary Desync', 'High Virality'],
    thumbnailIcon: '🎙️',
    prompt: 'Evaluate this video for synthetic speech cloning and factual veracity regarding cloud services shutdown.',
  },
  {
    id: 'eclipse_gravity',
    title: 'Astrophysics Hoax: 5-Second Zero Gravity Solar Eclipse',
    category: 'Physics & Space Pseudoscience',
    duration: '0:42',
    riskLevel: 'HIGH',
    description: 'Reverse-motion video of floating objects claiming planetary gravitational pull ceases during totality.',
    tags: ['Reverse FX', 'Physics Misinformation', 'Fabricated NASA Citation'],
    thumbnailIcon: '🌑',
    prompt: 'Check claims of zero gravity and levitation during solar eclipses.',
  },
  {
    id: 'saltwater_trend',
    title: 'TikTok Health Myth: Raw Ocean Water Cellular Detox',
    category: 'Biomedical & Wellness',
    duration: '1:15',
    riskLevel: 'CRITICAL',
    description: 'Influencer video claiming drinking 1 cup of seawater daily purges heavy metals and hydrates faster than freshwater.',
    tags: ['Dangerous Health Trend', 'Renal Failure Risk', 'False Medical Claims'],
    thumbnailIcon: '🌊',
    prompt: 'Fact-check health claims about drinking raw ocean seawater for hydration and detoxification.',
  },
];

export const VideoLab: React.FC<VideoLabProps> = ({ onSendToStream }) => {
  const [selectedPreset, setSelectedPreset] = useState<VideoPreset | null>(PRESETS[0]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'upload'>('presets');
  const [result, setResult] = useState<VideoForensicResult | null>(null);
  const [copiedCounter, setCopiedCounter] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scanSteps = [
    'Demuxing video frames & extracting audio stream...',
    'Running keyframe OCR and on-screen graphic scan...',
    'Performing vocal harmonic spectral & viseme sync analysis...',
    'Querying Google Search Grounding & checking IFCN databases...',
    'Synthesizing multimodal forensic dossier...',
  ];

  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [uploadedFile]);

  // Run analysis for current selected preset or file
  const runAnalysis = async (presetOverride?: VideoPreset, fileOverride?: File) => {
    setIsAnalyzing(true);
    setResult(null);
    setScanStep(0);

    const stepInterval = setInterval(() => {
      setScanStep((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
      const targetPreset = presetOverride !== undefined ? presetOverride : selectedPreset;
      const targetFile = fileOverride !== undefined ? fileOverride : uploadedFile;

      const data = await analyzeVideoForensics({
        sampleId: targetPreset ? targetPreset.id : undefined,
        videoName: targetFile ? targetFile.name : (targetPreset ? targetPreset.title : 'Sample Video'),
        duration: targetPreset ? targetPreset.duration : '0:30',
        prompt: customPrompt || (targetPreset ? targetPreset.prompt : undefined),
        file: targetFile,
      });

      setResult(data);
    } catch (err) {
      console.error('Video forensic analysis error:', err);
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  // Run default analysis on first mount
  useEffect(() => {
    runAnalysis(PRESETS[0]);
  }, []);

  const handleSelectPreset = (preset: VideoPreset) => {
    setSelectedPreset(preset);
    setUploadedFile(null);
    setActiveTab('presets');
    runAnalysis(preset, undefined);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setSelectedPreset(null);
      setActiveTab('upload');
      runAnalysis(undefined, file);
    }
  };

  const handleSeek = (second: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = second;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    setCurrentVideoTime(second);
  };

  const copyCounterMessage = () => {
    if (!result?.suggestedCounterMessage) return;
    navigator.clipboard.writeText(result.suggestedCounterMessage);
    setCopiedCounter(true);
    setTimeout(() => setCopiedCounter(false), 2500);
  };

  const downloadReport = () => {
    if (!result) return;
    const content = `# SATYA 1.0 MULTIMEDIA FORENSICS REPORT
Video: ${result.videoName} (Duration: ${result.duration})
Verdict: ${result.overallVerdict}
Synthetic Confidence: ${result.syntheticConfidence}%
Audio-Visual Sync Status: ${result.audioVisualSyncStatus}

## Executive Summary
${result.executiveSummary}

## Keyframe OCR & Extraction
${result.keyframes.map((k) => `- [${k.timestamp}] ${k.label}: ${k.ocrText || 'N/A'}${k.anomalyFlag ? ' [ANOMALY DETECTED]' : ''}`).join('\n')}

## Transcribed Claims Verification
${result.transcribedClaims.map((c) => `### Claim at ${c.timestamp}: "${c.statement}"
- Verdict: ${c.verdict} (Confidence: ${c.confidence}%)
- Corroborating Evidence: ${c.evidence}`).join('\n\n')}

## Suggested Social Counter-Message
${result.suggestedCounterMessage}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Satya_Forensic_Report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 animate-in fade-in duration-300">
      {/* Studio Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm mb-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Multimodal Forensics & Deepfake Studio
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Video & Synthetic Media Lab
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Detect AI voice cloning, facial boundary warping, synthetic lip-sync misalignment, and cross-reference on-screen claims with live Google Search grounding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => runAnalysis()}
            disabled={isAnalyzing}
            className="px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Scanning Video Stream...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Re-Analyze Video</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Source Selector / Player on Left, Forensics Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Video Controls & Presets (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Source Tabs */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 flex gap-1">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'presets'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🧪 Curated Test Cases</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                fileInputRef.current?.click();
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>📤 Upload Video</span>
            </button>
          </div>

          {/* Video Preview Player */}
          <div className="relative rounded-3xl bg-black border border-slate-800 overflow-hidden aspect-video flex items-center justify-center shadow-xl group">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
                onTimeUpdate={(e) => setCurrentVideoTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              /* Simulated Interactive Video Screen for Presets */
              <div className="w-full h-full relative flex flex-col justify-between p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
                {/* Video Top Bar */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-mono">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>FORENSIC PLAYBACK // {selectedPreset?.duration || '0:30'}</span>
                  </div>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/40 font-mono font-bold">
                    {selectedPreset?.riskLevel} RISK
                  </span>
                </div>

                {/* Video Center Animation / Graphic */}
                <div className="text-center my-auto space-y-3 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mx-auto flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform">
                    {selectedPreset?.thumbnailIcon || '🎬'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-white max-w-xs mx-auto">
                      {selectedPreset?.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      {selectedPreset?.category}
                    </p>
                  </div>
                </div>

                {/* Video Bottom Waveform Simulator */}
                <div className="space-y-2 z-10">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{`00:${currentVideoTime < 10 ? '0' : ''}${Math.floor(currentVideoTime)}`}</span>
                    <span>{selectedPreset?.duration}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative cursor-pointer">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${(currentVideoTime / 30) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Scan Overlay while analyzing */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                      <span className="absolute inset-0 flex items-center justify-center text-xl">🔬</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Satya Forensics Engine Active</p>
                      <p className="text-xs text-orange-400 font-mono animate-pulse">
                        {scanSteps[scanStep]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Preset Cases Selector */}
          {activeTab === 'presets' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                <span>Select Test Case</span>
                <span>{PRESETS.length} Available</span>
              </div>
              <div className="space-y-2.5">
                {PRESETS.map((preset) => {
                  const isSelected = selectedPreset?.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-orange-500/10 border-orange-500 dark:bg-orange-500/15 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                        {preset.thumbnailIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {preset.title}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex-shrink-0">
                            {preset.duration}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {preset.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Upload Custom Video Card */
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto text-2xl">
                📂
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {uploadedFile ? uploadedFile.name : 'Upload Any Video Clip'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Supports .mp4, .webm, .mov (Max 50MB)
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-colors"
              >
                Choose Video File
              </button>

              <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                <input
                  type="text"
                  placeholder="Optional: Enter context or claim in video..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Forensic Analysis & Breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <>
              {/* Verdict Header Banner */}
              <div
                className={`p-6 rounded-3xl border shadow-sm transition-all ${
                  result.overallVerdict === 'SYNTHETIC_DEEPFAKE'
                    ? 'bg-red-500/10 border-red-500/40 text-red-950 dark:text-red-200'
                    : result.overallVerdict === 'FALSE'
                    ? 'bg-orange-500/10 border-orange-500/40 text-orange-950 dark:text-orange-200'
                    : result.overallVerdict === 'TRUE'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {result.overallVerdict === 'SYNTHETIC_DEEPFAKE' ? '🚨' : result.overallVerdict === 'FALSE' ? '❌' : result.overallVerdict === 'TRUE' ? '✅' : '⚠️'}
                    </span>
                    <span className="font-mono font-black text-sm uppercase tracking-wider">
                      {result.overallVerdict === 'SYNTHETIC_DEEPFAKE'
                        ? 'Synthetic Deepfake Detected'
                        : `Forensic Verdict: ${result.overallVerdict}`}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-sm border border-current">
                    Confidence: {result.syntheticConfidence}%
                  </span>
                </div>

                <p className="text-xs md:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  {result.executiveSummary}
                </p>
              </div>

              {/* Forensic Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Synthetic Likelihood
                  </div>
                  <div className={`text-xl font-black mt-1 ${result.isSynthetic ? 'text-red-500' : 'text-emerald-500'}`}>
                    {result.syntheticConfidence}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {result.isSynthetic ? 'High AI Probability' : 'Organic Video'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    A/V Sync Status
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 truncate">
                    {result.audioVisualSyncStatus}
                  </div>
                  <div className="text-[10px] text-purple-500 mt-0.5">Viseme Alignment</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Lighting Consistency
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {result.lightingConsistencyScore}/100
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Ray-traced Physics</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Face Warping
                  </div>
                  <div className={`text-xs font-bold mt-1.5 ${result.facialWarpingDetected ? 'text-red-500' : 'text-emerald-500'}`}>
                    {result.facialWarpingDetected ? 'Warp Detected' : 'Clean Edges'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Boundary Scan</div>
                </div>
              </div>

              {/* Keyframes & OCR Overlays */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🎞️</span>
                    <span>Extracted Keyframes & On-Screen OCR</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">Click timestamp to jump</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {result.keyframes.map((kf, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSeek(kf.second)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                        kf.anomalyFlag
                          ? 'bg-red-500/5 border-red-500/30 hover:border-red-500'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          ⏱️ {kf.timestamp}
                        </span>
                        {kf.anomalyFlag && (
                          <span className="text-[9px] font-mono font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                            ANOMALY
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                        {kf.label}
                      </div>
                      {kf.ocrText && (
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-white/5">
                          "{kf.ocrText}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Transcribed Claims & Real-Time Verification */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>⚖️</span>
                    <span>Transcribed Assertions & Grounded Fact-Check</span>
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-500 font-bold">Google Grounding Active</span>
                </div>

                <div className="space-y-3">
                  {result.transcribedClaims.map((claim, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-mono text-slate-400">Timestamp {claim.timestamp}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                            claim.verdict === 'FALSE'
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : claim.verdict === 'TRUE'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {claim.verdict} ({claim.confidence}%)
                        </span>
                      </div>

                      <h4 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        "{claim.statement}"
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                        <strong className="text-slate-900 dark:text-white block mb-0.5">Corroborating Evidence:</strong>
                        {claim.evidence}
                      </p>

                      {onSendToStream && (
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => onSendToStream(claim.statement)}
                            className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
                          >
                            <span>Verify in Full Swarm Stream</span>
                            <span>→</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Counter-Message & Export */}
              <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                    <span>💬</span>
                    <span>Smart Social Counter-Message</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Ready to reply</span>
                </div>

                <p className="text-xs md:text-sm text-slate-200 italic leading-relaxed bg-white/10 p-3.5 rounded-2xl border border-white/10">
                  "{result.suggestedCounterMessage}"
                </p>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    onClick={copyCounterMessage}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <span>{copiedCounter ? '✓ Copied Counter-Message!' : '📋 Copy Social Reply'}</span>
                  </button>
                  <button
                    onClick={downloadReport}
                    className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-white/10"
                  >
                    <span>📥 Export Dossier (.md)</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
                🎬
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Ready for Video Verification</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Select a curated test case on the left or upload your own video file to run multimodal deepfake and claim forensic checks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoLab;
