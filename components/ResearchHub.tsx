import React, { useEffect, useState } from 'react';
import { getResearchBlog } from '../services/geminiService';

interface ResearchItem {
  headline: string;
  correction: string;
}

interface ResearchCategory {
  name: string;
  items: ResearchItem[];
}

interface ResearchData {
  week_of: string;
  intro: string;
  categories: ResearchCategory[];
}

const ResearchHub: React.FC = () => {
  const [data, setData] = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const jsonStr = await getResearchBlog();
        const parsed = JSON.parse(jsonStr);
        setData(parsed);
      } catch (err) {
        setError("Failed to load the weekly report. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-16 h-16 border-4 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Generating Weekly Misinformation Report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Could not load report</h3>
        <p className="text-slate-500 dark:text-slate-400">{error || "No data received."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="text-center mb-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-orange/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="inline-block px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-navy-900/50 backdrop-blur-sm mb-6">
          <span className="text-sm font-bold text-brand-orange uppercase tracking-wider">Weekly Intelligence Briefing</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 relative z-10">
          Misinformation Watch
        </h1>
        <p className="text-xl font-mono text-slate-500 dark:text-slate-400 mb-6">{data.week_of}</p>
        <div className="max-w-2xl mx-auto prose dark:prose-invert">
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">{data.intro}</p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {data.categories.map((category, idx) => (
          <div 
            key={idx} 
            className="break-inside-avoid bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            {/* Category Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-navy-900/30 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-brand-orange transition-colors">
                {category.name}
              </h3>
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-navy-700 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-brand-orange/10 group-hover:text-brand-orange transition-colors">
                 <span className="text-xs font-bold">{idx + 1}</span>
              </div>
            </div>

            {/* Items */}
            <div className="p-5 space-y-6">
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700 hover:border-brand-orange/50 transition-colors">
                  <h4 className="font-semibold text-red-600 dark:text-red-400 text-sm mb-2 flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>"{item.headline}"</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed bg-slate-50 dark:bg-navy-900/50 p-3 rounded-lg">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs uppercase mb-1">Correction</span>
                    {item.correction}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResearchHub;