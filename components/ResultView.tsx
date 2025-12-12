import React, { useState, useRef, useEffect } from 'react';
import { SatyaReport, GroundingSource } from '../types';
import Markdown from 'react-markdown';
import { generateSpeech } from '../services/geminiService';
import { jsPDF } from "jspdf";

interface ResultViewProps {
  report: SatyaReport;
  onReset: () => void;
}

// Helpers for PCM Audio Decoding
function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const ResultView: React.FC<ResultViewProps> = ({ report, onReset }) => {
  // Parse verdict and confidence from raw text using Regex
  // Matches "VERDICT: [TRUE|FALSE|MISLEADING|COMPLEX] (Confidence: [0-100]%)"
  const verdictMatch = report.verification.rawText.match(/VERDICT:\s*(TRUE|FALSE|MISLEADING|COMPLEX)(?:\s*\(Confidence:\s*(\d+)%\))?/i);
  
  const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : "UNCERTAIN";
  const confidence = verdictMatch && verdictMatch[2] ? parseInt(verdictMatch[2]) : 0;
  
  const isTrue = verdict === 'TRUE';
  const isFalse = verdict === 'FALSE';
  const isHighConfidence = confidence >= 80;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Cleanup audio context on unmount
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  let verdictColor = "text-yellow-600 border-yellow-400/30 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-400/10";
  if (isTrue) verdictColor = "text-emerald-600 border-emerald-400/30 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-400/10";
  if (isFalse) verdictColor = "text-red-600 border-red-400/30 bg-red-50 dark:text-red-400 dark:bg-red-400/10";

  const handleDownload = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;
    
    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("SATYA 1.0 VERIFICATION REPORT", margin, 20);
    
    // Metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date(report.timestamp || Date.now()).toLocaleString()}`, margin, 30);
    doc.setTextColor(0); // Reset color
    
    let currentY = 45;

    // Helper to check page break
    const checkPageBreak = (heightNeeded: number) => {
        if (currentY + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            currentY = margin;
        }
    };

    // Claim
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DETECTED CLAIM:", margin, currentY);
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    const claimLines = doc.splitTextToSize(`"${report.claim}"`, maxLineWidth);
    doc.text(claimLines, margin, currentY);
    currentY += (claimLines.length * 6) + 10;
    
    // Verdict
    checkPageBreak(20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("VERDICT:", margin, currentY);
    
    const verdictText = `${verdict} ${confidence ? `(${confidence}% Confidence)` : ''}`;
    // Colorize verdict in PDF (approximate colors)
    if (isTrue) doc.setTextColor(0, 150, 0);
    else if (isFalse) doc.setTextColor(200, 0, 0);
    else doc.setTextColor(200, 150, 0);
    
    doc.text(verdictText, margin + 25, currentY);
    doc.setTextColor(0); // Reset
    currentY += 15;
    
    // Analysis
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ANALYSIS & EXPLANATION:", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    // Simple markdown strip (bold removal for PDF simplicity)
    const cleanExplanation = report.explanation.replace(/\*\*/g, "").replace(/\*/g, "");
    const explLines = doc.splitTextToSize(cleanExplanation, maxLineWidth);
    
    // Check if big block fits, otherwise split
    if (currentY + (explLines.length * 5) > doc.internal.pageSize.getHeight() - margin) {
       // Just print line by line checking page break
       explLines.forEach((line: string) => {
           checkPageBreak(5);
           doc.text(line, margin, currentY);
           currentY += 5;
       });
    } else {
        doc.text(explLines, margin, currentY);
        currentY += (explLines.length * 5);
    }
    currentY += 10;
    
    // Counter Message
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SUGGESTED COUNTER-MESSAGE:", margin, currentY);
    currentY += 7;
    
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    const counterMsgClean = report.counterMessage.replace(/"/g, "");
    const counterLines = doc.splitTextToSize(counterMsgClean, maxLineWidth - 10);
    const boxHeight = (counterLines.length * 6) + 10;
    
    checkPageBreak(boxHeight);
    doc.rect(margin, currentY, maxLineWidth, boxHeight, 'FD');
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text(counterLines, margin + 5, currentY + 8);
    
    currentY += boxHeight + 15;

    // Sources
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.font = "helvetica"; 
    doc.text("EVIDENCE & SOURCES:", margin, currentY);
    currentY += 8;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    if (report.verification.sources.length > 0) {
        report.verification.sources.forEach(s => {
            const sourceText = `- ${s.title} (${s.uri})`;
            const sourceLines = doc.splitTextToSize(sourceText, maxLineWidth);
            
            checkPageBreak(sourceLines.length * 5 + 3);
            doc.text(sourceLines, margin, currentY);
            currentY += (sourceLines.length * 5) + 3;
        });
    } else {
        doc.text("No specific web sources linked.", margin, currentY);
    }
    
    // Save
    doc.save(`satya-report-${Date.now()}.pdf`);
  };

  const handlePlayAudio = async () => {
    if (isAudioLoading) return;

    // If currently playing, stop it
    if (isPlaying) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        setIsPlaying(false);
      }
      return;
    }
    
    setIsAudioLoading(true);
    try {
      // 1. Generate speech via Gemini
      const base64Audio = await generateSpeech(report.explanation);
      
      // 2. Setup Audio Context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const ctx = audioContextRef.current;
      const pcmData = base64ToUint8Array(base64Audio);
      
      // Gemini 2.5 TTS returns raw PCM (24kHz, 16-bit, mono)
      const dataInt16 = new Int16Array(pcmData.buffer);
      const frameCount = dataInt16.length; 
      const buffer = ctx.createBuffer(1, frameCount, 24000);
      const channelData = buffer.getChannelData(0);
      
      for (let i = 0; i < frameCount; i++) {
        // Normalize 16-bit integer to -1.0 to 1.0 float
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

    } catch (err) {
      console.error("Audio playback failed", err);
      alert("Failed to generate or play audio.");
    } finally {
      setIsAudioLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* High Confidence Success Animation Banner */}
      {isTrue && isHighConfidence && (
         <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-[1px] shadow-lg shadow-emerald-500/20 animate-in zoom-in-95 duration-500">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 animate-pulse"></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-4 flex items-center justify-center gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full blur animate-ping opacity-50"></div>
                    <div className="relative w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white shadow-xl">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none">High Confidence Verification</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">This claim has been verified as TRUE with strong evidence.</p>
                </div>
            </div>
         </div>
      )}

      {/* Header Verdict */}
      <div className={`p-6 rounded-2xl border ${verdictColor} flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden transition-colors`}>
        {/* Glow effect */}
        <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[80px] opacity-20 ${isTrue ? 'bg-emerald-500' : isFalse ? 'bg-red-500' : 'bg-yellow-500'}`} />
        
        <div className="flex-1 relative z-10">
          <h2 className="text-sm uppercase tracking-widest font-bold opacity-70 mb-1 dark:text-slate-200">Detected Claim</h2>
          <p className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">"{report.claim}"</p>
        </div>
        <div className="flex flex-col items-end gap-2 relative z-10">
            <div className="px-6 py-2 rounded-full border border-current font-bold whitespace-nowrap text-lg bg-white/50 dark:bg-black/20 backdrop-blur-sm">
            {verdict}
            </div>
            {confidence > 0 && (
                <div className="flex items-center gap-2 text-sm opacity-90 dark:text-slate-200">
                    <span>Confidence Score:</span>
                    <div className="w-24 h-2 bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden backdrop-blur-sm border border-slate-300 dark:border-white/10">
                        <div 
                            className="h-full bg-current transition-all duration-1000 ease-out" 
                            style={{ width: `${confidence}%` }}
                        />
                    </div>
                    <span className="font-mono font-bold">{confidence}%</span>
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Verification & Explanation */}
        <div className="space-y-6">
          <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 hover:border-brand-blue/30 dark:hover:border-slate-600/50 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-300 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Analysis & Explanation
                </h3>
                
                <button 
                  onClick={handlePlayAudio}
                  disabled={isAudioLoading}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isPlaying 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-500/30' 
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Read Aloud"
                >
                  {isAudioLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : isPlaying ? (
                    <>
                       <div className="flex gap-0.5 items-end h-4">
                         <div className="w-1 bg-current h-2 animate-[pulse_0.6s_infinite]" />
                         <div className="w-1 bg-current h-4 animate-[pulse_0.8s_infinite]" />
                         <div className="w-1 bg-current h-3 animate-[pulse_0.5s_infinite]" />
                       </div>
                       <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                      <span>Listen</span>
                    </>
                  )}
                </button>
            </div>
            
            <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 leading-relaxed dark:prose-invert">
              <div className="markdown-content">
                <Markdown>{report.explanation}</Markdown>
              </div>
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-700/50 my-6" />
            <details className="group">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors list-none flex items-center gap-2 font-medium">
                <span className="group-open:rotate-90 transition-transform duration-200">▶</span>
                Show Full Verification Logic
              </summary>
              <div className="mt-4 text-slate-600 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800/50 overflow-x-auto">
                 <div className="prose prose-xs max-w-none font-mono dark:prose-invert">
                    <Markdown>{report.verification.rawText}</Markdown>
                 </div>
              </div>
            </details>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 hover:border-purple-300 dark:hover:border-slate-600/50 transition-colors shadow-sm dark:shadow-none">
            <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-300 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Suggested Counter-Message
            </h3>
            <div className="bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner relative group/copy">
              <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white shrink-0 shadow-lg shadow-indigo-500/20">
                    S
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">Satya 1.0</span>
                      <span className="text-slate-500 text-xs">@SatyaVerifier • Just now</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">{report.counterMessage}</p>
                 </div>
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(report.counterMessage)}
                className="absolute bottom-3 right-3 p-2 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all opacity-0 group-hover/copy:opacity-100"
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
             </button>
            </div>
          </div>
        </div>

        {/* Sources */}
        <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 h-fit hover:border-emerald-300 dark:hover:border-slate-600/50 transition-colors shadow-sm dark:shadow-none">
           <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-300 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Evidence & Grounding (Google Search)
            </h3>
            {report.verification.sources.length > 0 ? (
              <ul className="space-y-3">
                {report.verification.sources.map((source, idx) => (
                  <li key={idx}>
                    <a 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-slate-800 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <div className="text-emerald-600 dark:text-emerald-400 text-xs font-mono mb-1 truncate flex items-center gap-1">
                          <img src={`https://www.google.com/s2/favicons?domain=${new URL(source.uri!).hostname}`} alt="" className="w-3 h-3 opacity-70" />
                          {new URL(source.uri!).hostname}
                        </div>
                        <div className="text-slate-800 dark:text-slate-200 text-sm font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors line-clamp-2">
                          {source.title}
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                <p className="text-slate-500 text-sm italic">No specific external links returned by grounding, but internal knowledge was used.</p>
              </div>
            )}
        </div>

      </div>
      
      <div className="flex flex-col md:flex-row justify-center items-center gap-4 pt-8 pb-4">
        <button 
          onClick={handleDownload}
          className="px-6 py-3 rounded-full bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors border border-slate-300 dark:border-slate-600/50 hover:border-slate-400 dark:hover:border-slate-500 flex items-center gap-2 backdrop-blur-sm shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download PDF Report
        </button>
        <button 
          onClick={onReset}
          className="px-8 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all border border-emerald-500 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5"
        >
          Verify Another Claim
        </button>
      </div>
    </div>
  );
};

export default ResultView;