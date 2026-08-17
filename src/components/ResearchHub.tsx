import React, { useEffect, useState } from 'react';
import { getResearchBlog, searchResearchTopic, generateSpeech } from '../services/geminiService';
import { ResearchData } from '../types';

interface ResearchHubProps {
  onSendToStream?: (claim: string) => void;
}

interface DeepDiveResult {
  query: string;
  overview: string;
  threatLevel: string;
  topClaims: Array<{
    claim: string;
    verdict: string;
    confidence: number;
    reality: string;
    sources?: string[];
  }>;
  commonTactics: string[];
  recommendations: string;
}

export const ResearchHub: React.FC<ResearchHubProps> = ({ onSendToStream }) => {
  const [data, setData] = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [playingItem, setPlayingItem] = useState<string | null>(null);

  // Deep dive search state
  const [deepDiveQuery, setDeepDiveQuery] = useState('');
  const [isDeepDiving, setIsDeepDiving] = useState(false);
  const [deepDiveResult, setDeepDiveResult] = useState<DeepDiveResult | null>(null);

  const fetchBlog = async () => {
    setLoading(true);
    setError(null);
    try {
      const jsonStr = await getResearchBlog();
      const parsed = JSON.parse(jsonStr);
      setData(parsed);
    } catch (err: any) {
      setError(err.message || 'Failed to load the weekly report. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlog();
  }, []);

  const handleDeepDiveSearch = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) return;
    setIsDeepDiving(true);
    try {
      const res = await searchResearchTopic(q);
      setDeepDiveResult(res);
    } catch (err) {
      console.error('Deep dive error:', err);
    } finally {
      setIsDeepDiving(false);
    }
  };

  const copyDebunk = (headline: string, correction: string) => {
    const text = `🔍 FACT CHECK DEBUNK:\nClaim: "${headline}"\nReality: ${correction}\nVerified by Satya 1.0 AI Swarm`;
    navigator.clipboard.writeText(text);
    setCopiedItem(headline);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const playAudioDebunk = async (textToRead: string, keyId: string) => {
    if (playingItem === keyId) {
      window.speechSynthesis.cancel();
      setPlayingItem(null);
      return;
    }

    setPlayingItem(keyId);

    try {
      const base64Audio = await generateSpeech(textToRead);
      if (base64Audio) {
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audio.onended = () => setPlayingItem(null);
        audio.play().catch(() => {
          fallbackSpeech(textToRead);
        });
        return;
      }
    } catch {
      // Fallback
    }

    fallbackSpeech(textToRead);
  };

  const fallbackSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend = () => setPlayingItem(null);
      utterance.onerror = () => setPlayingItem(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingItem(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center">
        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">
          Synthesizing Real-Time Misinformation Intelligence Briefing...
        </p>
        <p className="text-slate-400 text-xs font-mono">Aggregating live web signals & Google Search Grounding</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto text-2xl text-red-500">
          ⚠️
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Could not generate intelligence briefing</h3>
        <p className="text-slate-500 text-xs max-w-md mx-auto">{error || 'No data received.'}</p>
        <button
          onClick={fetchBlog}
          className="px-6 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:scale-105 transition-transform"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  const categories = ['All', ...(data.categories?.map((c) => c.name) || [])];

  const filteredCategories = data.categories
    ?.filter((cat) => (selectedCategory === 'All' ? true : cat.name === selectedCategory))
    ?.map((cat) => ({
      ...cat,
      items: cat.items?.filter(
        (item) =>
          !searchFilter.trim() ||
          item.headline.toLowerCase().includes(searchFilter.toLowerCase()) ||
          item.correction.toLowerCase().includes(searchFilter.toLowerCase())
      ),
    }))
    ?.filter((cat) => cat.items && cat.items.length > 0);

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="text-center mb-10 relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 backdrop-blur-sm mb-4">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">
            Live Global Intelligence Radar
          </span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
          Misinformation Intelligence Radar
        </h1>

        <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mb-4">{data.week_of}</p>

        <p className="max-w-2xl mx-auto text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          {data.intro}
        </p>

        {/* Global Misinformation Trends Bar */}
        {data.trends && data.trends.length > 0 && (
          <div className="mt-6 max-w-4xl mx-auto p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-around gap-4">
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Weekly Threat Radar</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">Active Misinformation Vectors</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {data.trends.map((trend, tIdx) => (
                <div
                  key={tIdx}
                  onClick={() => {
                    setDeepDiveQuery(trend.topic);
                    handleDeepDiveSearch(trend.topic);
                  }}
                  className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-xs flex items-center gap-2 cursor-pointer hover:border-orange-500 transition-all shadow-xs"
                  title="Click to deep dive"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">{trend.topic}</span>
                  <span className="text-[10px] font-mono font-bold text-red-500">{trend.change}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      trend.threat === 'HIGH' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {trend.threat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deep Dive Custom AI Search Bar */}
        <div className="mt-8 max-w-2xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDeepDiveSearch(deepDiveQuery);
            }}
            className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-full shadow-md"
          >
            <div className="pl-3.5 text-slate-400 text-sm">🔍</div>
            <input
              type="text"
              placeholder="Deep Dive: Search any rumor or topic (e.g., '5G Health', 'AI Voice Clones', 'Mars Missions')..."
              value={deepDiveQuery}
              onChange={(e) => setDeepDiveQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none px-2"
            />
            <button
              type="submit"
              disabled={isDeepDiving || !deepDiveQuery.trim()}
              className="px-5 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:scale-105 transition-transform disabled:opacity-40 flex items-center gap-1.5"
            >
              {isDeepDiving ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <span>AI Deep Dive</span>
              )}
            </button>
          </form>
        </div>

        {/* Filter Controls for Weekly Stories */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              placeholder="Filter weekly stories..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-slate-400"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-white/5">
            {categories.map((catName) => (
              <button
                key={catName}
                onClick={() => setSelectedCategory(catName)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === catName
                    ? 'bg-white dark:bg-slate-800 text-orange-500 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {catName}
              </button>
            ))}
          </div>

          <button
            onClick={fetchBlog}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-300 transition-colors"
            title="Refresh Briefing"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* On-Demand Deep Dive AI Intelligence Card (if active) */}
      {deepDiveResult && (
        <div className="mb-12 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white border border-orange-500/30 shadow-2xl space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold block">
                  AI Deep-Dive Intelligence Briefing
                </span>
                <h3 className="text-lg md:text-xl font-black text-white">
                  Analysis: "{deepDiveResult.query}"
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                Threat Level: {deepDiveResult.threatLevel}
              </span>
              <button
                onClick={() => setDeepDiveResult(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>
          </div>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            {deepDiveResult.overview}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deepDiveResult.topClaims?.map((claim, cIdx) => (
              <div
                key={cIdx}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400">❌ Viral Assertion</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                    {claim.verdict} ({claim.confidence}%)
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white leading-snug">"{claim.claim}"</h4>
                <p className="text-xs text-slate-300 bg-black/40 p-3 rounded-xl border border-white/5">
                  <strong className="text-emerald-400 block mb-0.5">Verified Reality:</strong>
                  {claim.reality}
                </p>
                {onSendToStream && (
                  <button
                    onClick={() => onSendToStream(claim.claim)}
                    className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 mt-1 transition-colors"
                  >
                    <span>Verify in Swarm Stream</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 border-t border-white/10">
            <div>
              <strong className="text-white">Common Manipulation Tactics: </strong>
              {deepDiveResult.commonTactics?.join(', ')}
            </div>
            <button
              onClick={() => {
                if (deepDiveResult.topClaims?.[0]?.claim && onSendToStream) {
                  onSendToStream(deepDiveResult.topClaims[0].claim);
                }
              }}
              className="px-4 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors"
            >
              Examine in Studio
            </button>
          </div>
        </div>
      )}

      {/* Categories Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories && filteredCategories.length > 0 ? (
          filteredCategories.map((category, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              {/* Category Card Header */}
              <div className="p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white tracking-tight">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {category.description}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 flex-shrink-0">
                  {category.items?.length || 0} claims
                </span>
              </div>

              {/* Items in Category */}
              <div className="p-5 space-y-6 flex-1">
                {category.items?.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="relative pl-3.5 border-l-2 border-slate-200 dark:border-slate-800 hover:border-orange-500 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {item.viralityIndex && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 uppercase">
                          {item.viralityIndex} Virality
                        </span>
                      )}
                      {item.source && (
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          Ref: {item.source}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5 leading-snug">
                      <span className="text-sm">❌</span>
                      <span>"{item.headline}"</span>
                    </h4>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase tracking-wider mb-1">
                        Verified Correction
                      </span>
                      {item.correction}
                    </div>

                    {/* Interactive Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyDebunk(item.headline, item.correction)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors"
                          title="Copy Debunk Text"
                        >
                          {copiedItem === item.headline ? '✓ Copied' : '📋 Copy'}
                        </button>

                        <button
                          onClick={() => playAudioDebunk(item.correction, `${idx}-${itemIdx}`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors flex items-center gap-1"
                          title="Listen with TTS"
                        >
                          <span>{playingItem === `${idx}-${itemIdx}` ? '🔊 Playing' : '🔈 Listen'}</span>
                        </button>
                      </div>

                      {onSendToStream && (
                        <button
                          onClick={() => onSendToStream(item.headline)}
                          className="text-[11px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
                        >
                          <span>Verify</span>
                          <span>→</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-slate-500 text-sm">
            No misinformation stories matching your search filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchHub;
