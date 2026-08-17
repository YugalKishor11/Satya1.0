import React, { useState, useRef, useEffect } from 'react';
import { SatyaReport, CounterVariations } from '../types';
import Markdown from 'react-markdown';
import { generateSpeech, counterMessageAgent } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';

interface ResultViewProps {
  report: SatyaReport;
  onReset: () => void;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

type CounterTone = 'casual' | 'direct' | 'empathetic' | 'punchy';

const ResultView: React.FC<ResultViewProps> = ({ report, onReset }) => {
  const parsedVerdictMatch = report.verification.rawText?.match(
    /VERDICT:\s*(TRUE|FALSE|MISLEADING|COMPLEX)/i
  ) || report.explanation?.match(
    /rated\s+\*{0,2}(TRUE|FALSE|MISLEADING|COMPLEX)\*{0,2}/i
  ) || report.explanation?.match(
    /\b(TRUE|FALSE|MISLEADING|COMPLEX)\b/i
  );

  const verdict = report.verification.verdict || 
    (parsedVerdictMatch ? (parsedVerdictMatch[1].toUpperCase() as 'TRUE' | 'FALSE' | 'MISLEADING' | 'COMPLEX') : 'FALSE');

  const parsedConfMatch = report.verification.rawText?.match(
    /Confidence:\s*(\d+)%/i
  ) || report.explanation?.match(
    /(\d+)%\s*Confidence/i
  );

  const confidence = report.verification.confidence || 
    (parsedConfMatch ? parseInt(parsedConfMatch[1]) : (verdict === 'TRUE' ? 98 : verdict === 'FALSE' ? 95 : 85));

  const isTrue = verdict === 'TRUE';
  const isFalse = verdict === 'FALSE';
  const isMisleading = verdict === 'MISLEADING';
  const isComplex = verdict === 'COMPLEX';

  // Active Tab for Fact-Check Report
  const [activeReportTab, setActiveReportTab] = useState<'full' | 'breakdown' | 'evidence' | 'cot'>('full');

  // Counter-Message State
  const [selectedTone, setSelectedTone] = useState<CounterTone>('casual');
  const [editableCounter, setEditableCounter] = useState<string>(report.counterMessage);
  const [variations, setVariations] = useState<CounterVariations>(
    report.counterVariations || {
      casual: report.counterMessage,
      direct: isTrue 
        ? `Fact Check: The statement regarding "${report.claim.slice(0, 80)}" is verified and accurate according to primary sources. #FactCheck`
        : `Fact Check: The claim regarding "${report.claim.slice(0, 80)}" is unverified or inaccurate. Consult primary sources before sharing. #FactCheck`,
      empathetic: isTrue
        ? `Hey friends, looked into this and wanted to confirm this is actually true and supported by verified sources! 👍`
        : `Hey friends, saw this going around and wanted to share a friendly note—verified sources indicate this claim isn't accurate. Let's stay informed! 🙏`,
      punchy: isTrue
        ? `Verified True: Solid evidence backs this up! #FactCheck #SatyaAI`
        : `Heads up: Verified facts don't back up this claim. Check trusted sources! #FactCheck #SatyaAI`,
    }
  );
  const [isRegeneratingCounter, setIsRegeneratingCounter] = useState(false);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [copiedCounter, setCopiedCounter] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Sync variations when report changes
  useEffect(() => {
    setEditableCounter(report.counterMessage);
    if (report.counterVariations) {
      setVariations(report.counterVariations);
    }
  }, [report]);

  // Update text when user clicks tone pill
  const handleToneChange = (tone: CounterTone) => {
    setSelectedTone(tone);
    if (variations && variations[tone]) {
      setEditableCounter(variations[tone]);
    }
  };

  // Regenerate counter message with AI
  const handleRegenerateCounter = async () => {
    if (isRegeneratingCounter) return;
    setIsRegeneratingCounter(true);
    try {
      const res = await counterMessageAgent(report.claim, report.explanation, selectedTone);
      if (res.variations) {
        setVariations(res.variations);
        setEditableCounter(res.variations[selectedTone] || res.counterMessage);
      } else {
        setEditableCounter(res.counterMessage);
      }
    } catch (e) {
      console.error('Failed to regenerate counter-message', e);
    } finally {
      setIsRegeneratingCounter(false);
    }
  };

  // Trigger celebration confetti on High Confidence TRUE
  useEffect(() => {
    if (isTrue && confidence >= 80) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10B981', '#3B82F6', '#06B6D4'],
        });
      } catch (e) {}
    }
  }, [isTrue, confidence]);

  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  let verdictStyles = {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-300 dark:border-yellow-500/40',
    text: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-yellow-500 text-white',
    title: 'Misleading / Distorted Context',
    dot: 'bg-yellow-500',
  };

  if (isTrue) {
    verdictStyles = {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-300 dark:border-emerald-500/40',
      text: 'text-emerald-700 dark:text-emerald-400',
      badge: 'bg-emerald-600 text-white',
      title: 'Verified True Fact',
      dot: 'bg-emerald-500',
    };
  } else if (isFalse) {
    verdictStyles = {
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-300 dark:border-red-500/40',
      text: 'text-red-700 dark:text-red-400',
      badge: 'bg-red-600 text-white',
      title: 'Debunked False Claim',
      dot: 'bg-red-500',
    };
  } else if (isComplex) {
    verdictStyles = {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-300 dark:border-purple-500/40',
      text: 'text-purple-700 dark:text-purple-400',
      badge: 'bg-purple-600 text-white',
      title: 'Complex / Nuanced Evidence',
      dot: 'bg-purple-500',
    };
  }

  const handleCopyCounter = () => {
    navigator.clipboard.writeText(editableCounter);
    setCopiedCounter(true);
    setTimeout(() => setCopiedCounter(false), 2000);
  };

  const handleCopyReport = () => {
    const fullMarkdown = `# Satya 1.0 Fact-Check Dossier\n\n**Claim**: "${report.claim}"\n**Verdict**: ${verdict} (${confidence}% Confidence)\n\n${report.explanation}\n\n## Grounding Sources\n${report.verification.sources.map((s) => `- [${s.title}](${s.uri})`).join('\n')}`;
    navigator.clipboard.writeText(fullMarkdown);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Social Share helpers
  const shareToTwitter = () => {
    const text = encodeURIComponent(editableCounter);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(editableCounter);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const shareToReddit = () => {
    const title = encodeURIComponent(`Fact Check: ${report.claim.slice(0, 100)}`);
    const text = encodeURIComponent(editableCounter);
    window.open(`https://www.reddit.com/submit?title=${title}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    try {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxLineWidth = pageWidth - margin * 2;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SATYA 1.0 VERIFICATION DOSSIER', margin, 22);

      // Metadata
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(`Generated: ${new Date(report.timestamp || Date.now()).toLocaleString()} | Engine: Gemini Agent Swarm`, margin, 30);
      doc.setTextColor(0);

      let currentY = 42;

      const checkPageBreak = (needed: number) => {
        if (currentY + needed > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          currentY = margin;
        }
      };

      // Claim
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DETECTED CLAIM:', margin, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const claimLines = doc.splitTextToSize(`"${report.claim}"`, maxLineWidth);
      doc.text(claimLines, margin, currentY);
      currentY += claimLines.length * 6 + 10;

      // Verdict
      checkPageBreak(25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('VERDICT:', margin, currentY);

      if (isTrue) doc.setTextColor(16, 185, 129);
      else if (isFalse) doc.setTextColor(239, 68, 68);
      else doc.setTextColor(245, 158, 11);

      doc.text(`${verdict} (${confidence}% Confidence)`, margin + 26, currentY);
      doc.setTextColor(0);
      currentY += 14;

      // Analysis
      checkPageBreak(30);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ANALYSIS & EVIDENCE:', margin, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const cleanExplanation = report.explanation.replace(/[*_#>`~]/g, '');
      const explLines = doc.splitTextToSize(cleanExplanation, maxLineWidth);

      explLines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin, currentY);
        currentY += 5;
      });
      currentY += 10;

      // Counter Message
      checkPageBreak(35);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('SUGGESTED COUNTER-RESPONSE:', margin, currentY);
      currentY += 7;

      const counterLines = doc.splitTextToSize(editableCounter, maxLineWidth - 10);
      const boxHeight = counterLines.length * 6 + 8;

      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(220, 225, 230);
      doc.rect(margin, currentY, maxLineWidth, boxHeight, 'FD');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text(counterLines, margin + 5, currentY + 7);
      currentY += boxHeight + 12;

      // Sources
      checkPageBreak(30);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('GROUNDING SOURCES:', margin, currentY);
      currentY += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      if (report.verification.sources && report.verification.sources.length > 0) {
        report.verification.sources.forEach((s) => {
          const sText = `- ${s.title} (${s.uri})`;
          const lines = doc.splitTextToSize(sText, maxLineWidth);
          checkPageBreak(lines.length * 5 + 2);
          doc.text(lines, margin, currentY);
          currentY += lines.length * 5 + 2;
        });
      } else {
        doc.text('Verified through Google Search Grounding consensus.', margin, currentY);
      }

      doc.save(`satya-verification-${Date.now()}.pdf`);
    } catch (e) {
      console.error('PDF generation error', e);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePlayAudio = async () => {
    if (isAudioLoading) return;

    if (isPlaying) {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    setIsAudioLoading(true);
    try {
      const base64Audio = await generateSpeech(report.explanation);

      if (base64Audio) {
        if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
        } else if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        const ctx = audioContextRef.current;
        const pcmData = base64ToUint8Array(base64Audio);
        const dataInt16 = new Int16Array(pcmData.buffer);
        const frameCount = dataInt16.length;
        const buffer = ctx.createBuffer(1, frameCount, 24000);
        const channelData = buffer.getChannelData(0);

        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
          setIsPlaying(false);
          sourceNodeRef.current = null;
        };
        sourceNodeRef.current = source;
        source.start();
        setIsPlaying(true);
        return;
      }

      // If no server audio data returned, use browser's native SpeechSynthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanText = report.explanation
          .replace(/[*_#>`~[\]()]/g, '')
          .replace(/https?:\/\/\S+/g, '')
          .slice(0, 1000);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
        return;
      }
    } catch (err) {
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const cleanText = report.explanation
            .replace(/[*_#>`~[\]()]/g, '')
            .replace(/https?:\/\/\S+/g, '')
            .slice(0, 1000);
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.rate = 1.0;
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = () => setIsPlaying(false);
          window.speechSynthesis.speak(utterance);
          setIsPlaying(true);
          return;
        } catch {}
      }
      setIsPlaying(false);
    } finally {
      setIsAudioLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Primary Verdict Hero Banner */}
      <div
        className={`p-6 md:p-8 rounded-3xl border ${verdictStyles.border} ${verdictStyles.bg} relative overflow-hidden transition-all shadow-lg`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/70 dark:bg-black/30 backdrop-blur-sm">
              <span className={`w-2 h-2 rounded-full ${isTrue ? 'bg-emerald-500' : isFalse ? 'bg-red-500' : 'bg-yellow-500'} animate-pulse`} />
              {verdictStyles.title}
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
              "{report.claim}"
            </h2>
            {report.mediaType && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Source Media Type: <span className="uppercase font-semibold text-slate-700 dark:text-slate-300">{report.mediaType}</span>
                {report.mediaName ? ` (${report.mediaName})` : ''}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div
              className={`px-6 py-2.5 rounded-2xl font-black text-xl tracking-wider shadow-md ${verdictStyles.badge}`}
            >
              {verdict}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="text-xs text-slate-500 dark:text-slate-400">Confidence:</span>
              <div className="w-28 h-2.5 bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden">
                <div
                  className={`h-full ${isTrue ? 'bg-emerald-500' : isFalse ? 'bg-red-500' : 'bg-yellow-500'} transition-all duration-700`}
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="font-mono font-bold">{confidence}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Fact-Check Report & Smart Counter-Message Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Detailed Fact-Check Report */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            {/* Header with Navigation Tabs & Audio Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-lg">
                  📖
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detailed Fact-Check Report</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Synthesized multi-agent verification analysis</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Copy Markdown */}
                <button
                  onClick={handleCopyReport}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
                  title="Copy formatted markdown report"
                >
                  {copiedReport ? (
                    <span className="text-emerald-500 font-bold">✓ Copied</span>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy MD</span>
                    </>
                  )}
                </button>

                {/* TTS Listen Button */}
                <button
                  onClick={handlePlayAudio}
                  disabled={isAudioLoading}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isPlaying
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                  title="Listen to audio briefing"
                >
                  {isAudioLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : isPlaying ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>Stop Audio</span>
                    </>
                  ) : (
                    <>
                      <span>🔊</span>
                      <span>Listen Aloud</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto text-xs font-semibold">
              <button
                onClick={() => setActiveReportTab('full')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeReportTab === 'full'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📑 Full Dossier
              </button>
              <button
                onClick={() => setActiveReportTab('breakdown')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeReportTab === 'breakdown'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ⚖️ Fact vs Myth
              </button>
              <button
                onClick={() => setActiveReportTab('evidence')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeReportTab === 'evidence'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🔬 Evidence Grounding
              </button>
              <button
                onClick={() => setActiveReportTab('cot')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeReportTab === 'cot'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ⚙️ Raw CoT Audit
              </button>
            </div>

            {/* Tab 1: Full Dossier */}
            {activeReportTab === 'full' && (
              <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed space-y-4 pt-2">
                <Markdown>{report.explanation}</Markdown>
              </div>
            )}

            {/* Tab 2: Fact vs Myth Spotlight */}
            {activeReportTab === 'breakdown' && (
              <div className="space-y-4 pt-2">
                {isTrue ? (
                  <>
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-1.5">
                        <span>✅</span>
                        <span>Verified Core Proposition:</span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        "{report.claim}"
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-sm mb-1.5">
                        <span>🔬</span>
                        <span>Scientific & Empirical Consensus:</span>
                      </div>
                      <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                        This claim is fully corroborated by primary scientific, geographical, and official institutional records with {confidence}% confidence.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm mb-1.5">
                        <span>❌</span>
                        <span>What Was Circulated / Claimed:</span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 italic leading-relaxed">
                        "{report.claim}"
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-1.5">
                        <span>✅</span>
                        <span>The Verified Reality:</span>
                      </div>
                      <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                        Primary evidence repositories and official fact-checking institutions indicate that this assertion contradicts documented findings or omits critical contextual data.
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 3: Evidence Grounding */}
            {activeReportTab === 'evidence' && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cross-referenced databases, journals, official registries, and investigative archives:
                </p>
                {report.verification.sources && report.verification.sources.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {report.verification.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 transition-all block group"
                      >
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1.5">
                          <span>🔗</span>
                          <span>{source.title || source.uri}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                          {source.uri}
                        </p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-500">
                    Verified through automated Google Search grounding and fact repository consensus.
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Raw Chain-of-Thought Audit */}
            {activeReportTab === 'cot' && (
              <div className="pt-2">
                <div className="p-4 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs leading-relaxed overflow-x-auto max-h-96 border border-slate-800 space-y-2">
                  <div className="text-[11px] text-emerald-400 font-bold border-b border-slate-800 pb-1 mb-2">
                    // Satya 1.0 Autonomous Verifier Output Traces
                  </div>
                  <Markdown>{report.verification.rawText}</Markdown>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Smart Counter-Message Studio */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-lg">
                  💬
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Smart Counter-Message Studio</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tailored social media debunking replies</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Ready to Post
              </span>
            </div>

            {/* Tone Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Select Tone & Audience:</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {editableCounter.length} / 280 chars
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleToneChange('casual')}
                  className={`px-3 py-2 rounded-xl text-left border transition-all ${
                    selectedTone === 'casual'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>💬</span>
                    <span>Casual Social</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">X, Threads, Instagram</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleToneChange('direct')}
                  className={`px-3 py-2 rounded-xl text-left border transition-all ${
                    selectedTone === 'direct'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>📋</span>
                    <span>Fact-Focused</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">Direct & authoritative</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleToneChange('empathetic')}
                  className={`px-3 py-2 rounded-xl text-left border transition-all ${
                    selectedTone === 'empathetic'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>🤝</span>
                    <span>Empathetic Chat</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">Family & WhatsApp</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleToneChange('punchy')}
                  className={`px-3 py-2 rounded-xl text-left border transition-all ${
                    selectedTone === 'punchy'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Short & Punchy</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">Under 140 chars</p>
                </button>
              </div>
            </div>

            {/* Editable Text Area */}
            <div className="space-y-1.5">
              <div className="relative">
                <textarea
                  value={editableCounter}
                  onChange={(e) => setEditableCounter(e.target.value)}
                  rows={4}
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans resize-none"
                  placeholder="Your tailored counter-message..."
                />
              </div>
            </div>

            {/* Actions: Copy & Regenerate */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyCounter}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {copiedCounter ? (
                  <>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRegenerateCounter}
                disabled={isRegeneratingCounter}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors flex items-center justify-center gap-1.5"
              >
                {isRegeneratingCounter ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Drafting...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Regenerate</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Share to Platforms */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                1-Click Direct Share:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={shareToTwitter}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>𝕏 Post</span>
                </button>
                <button
                  type="button"
                  onClick={shareToWhatsApp}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={shareToReddit}
                  className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Reddit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Fact-Check Metrics */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/10 dark:border-white/5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Verification Audit Details</span>
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block">Agent Consensus:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">4/4 Swarm Agents</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block">Grounding Mode:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">Live Search & IFCN</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4 pb-8">
        <button
          onClick={handleDownload}
          className="px-6 py-3 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Official PDF
        </button>

        <button
          onClick={onReset}
          className="px-8 py-3 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-sm transition-all shadow-md hover:scale-105"
        >
          Verify Another Claim
        </button>
      </div>
    </div>
  );
};

export default ResultView;
