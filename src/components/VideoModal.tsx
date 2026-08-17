import React, { useState } from 'react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSampleVideo?: (fileOrPrompt: { prompt: string; filename: string }) => void;
}

const SAMPLE_VIDEOS = [
  {
    title: 'Solar Eclipse Gravity Phenomenon',
    filename: 'eclipse_gravity_claim.mp4',
    prompt: 'Viral video asserts that Earth loses gravity for 5 seconds during total solar eclipse.',
    duration: '0:42',
    category: 'Science Myth',
  },
  {
    title: 'AI CEO Cloned Speech Announcement',
    filename: 'synthetic_voice_clone.mp4',
    prompt: 'Leaked video claiming tech CEO announced immediate shutdown of free web services.',
    duration: '0:28',
    category: 'Deepfake Check',
  },
  {
    title: 'Saltwater Hydration Challenge',
    filename: 'seawater_health_trend.mp4',
    prompt: 'TikTok challenge claiming drinking ocean water cleanses toxins and improves athletic endurance.',
    duration: '1:15',
    category: 'Health Misinformation',
  },
];

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, onSelectSampleVideo }) => {
  const [activeTab, setActiveTab] = useState<'demo' | 'samples' | 'guide'>('demo');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-lg">
              🎬
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Video Verification & Media Center</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Analyze clips, test sample videos, and learn deepfake detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-white/5 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('demo')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'demo'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            How Video Analysis Works
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'samples'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sample Test Clips (Instant Demo)
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'guide'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Supported Formats & Tips
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'demo' && (
            <div className="space-y-6">
              {/* Simulated Interactive Video Player */}
              <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col justify-between p-6 shadow-inner group">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-orange-900/20 pointer-events-none" />

                <div className="flex justify-between items-center z-10">
                  <span className="px-3 py-1 rounded-full bg-red-600/80 text-white text-xs font-bold font-mono animate-pulse">
                    ● SATYA FORENSIC ENGINE
                  </span>
                  <span className="text-xs font-mono text-slate-400">Gemini 2.5 Multimodal</span>
                </div>

                <div className="text-center py-8 z-10 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-orange-500/30 group-hover:scale-110 transition-transform cursor-pointer">
                    <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Full-Spectrum Video & Audio Verification</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Satya breaks videos into keyframes, transcribes spoken speech, and uses real-time search grounding to verify claims made in video clips.
                  </p>
                </div>

                <div className="flex justify-between items-center z-10 text-xs font-mono text-slate-400 border-t border-white/10 pt-3">
                  <span>OCR Text Scanning: ACTIVE</span>
                  <span>Audio Sync Analysis: OK</span>
                  <span>Consensus Match: 98%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
                  <div className="text-xl mb-1">🖼️</div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Keyframe Extraction</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Identifies visual overlays, graphs, and banners.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
                  <div className="text-xl mb-1">🎙️</div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Speech Transcription</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Parses spoken claims and context verbatim.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
                  <div className="text-xl mb-1">⚡</div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Search Grounding</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Cross-references live web consensus.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any sample claim below to instantly load and test it in the Satya 1.0 Agent Pipeline:
              </p>
              <div className="space-y-3">
                {SAMPLE_VIDEOS.map((video, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSelectSampleVideo) {
                        onSelectSampleVideo({ prompt: video.prompt, filename: video.filename });
                        onClose();
                      }
                    }}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-orange-500/40 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                        ▶
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
                            {video.title}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {video.duration}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{video.prompt}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-orange-500 group-hover:translate-x-1 transition-transform">
                      Verify →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-200 space-y-2">
                <h4 className="font-bold text-sm">💡 How to upload your own video for verification:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Click the <strong>+ (Attach)</strong> button or drag & drop any video file directly onto the input stream box.</li>
                  <li>Supported formats: <strong>MP4 (.mp4), WebM (.webm), QuickTime (.mov)</strong>.</li>
                  <li>You can add custom text alongside the video (e.g. "Did this actually happen yesterday?").</li>
                  <li>Satya's Scout agent extracts the central assertions and passes them to Verifier with live web grounding.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:scale-105 transition-transform"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
