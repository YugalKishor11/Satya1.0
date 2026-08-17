import { HistoryItem, SatyaReport } from '../types';

const STORAGE_KEY_PREFIX = 'satya_history_';

export const storageService = {
  async getHistory(userId: string): Promise<HistoryItem[]> {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Could not read history from localStorage:', e);
      return [];
    }
  },

  async saveHistory(userId: string, report: SatyaReport): Promise<HistoryItem> {
    const verdictMatch = report.verification.rawText.match(/VERDICT:\s*(TRUE|FALSE|MISLEADING|COMPLEX)(?:\s*\(Confidence:\s*(\d+)%\))?/i);
    const verdict = (verdictMatch ? verdictMatch[1].toUpperCase() : 'UNCERTAIN') as HistoryItem['verdict'];
    const confidence = verdictMatch && verdictMatch[2] ? parseInt(verdictMatch[2]) : undefined;

    const newItem: HistoryItem = {
      id: report.id || `satya_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      claim: report.claim,
      verdict,
      confidence,
      snippet: report.explanation.slice(0, 140) + '...',
      timestamp: report.timestamp || Date.now(),
      mediaType: report.mediaType || 'text',
      report,
    };

    try {
      const current = await this.getHistory(userId);
      const updated = [newItem, ...current.filter((item) => item.id !== newItem.id)].slice(0, 100);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save history to localStorage:', e);
    }

    return newItem;
  },

  async clearHistory(userId: string): Promise<void> {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
    } catch (e) {
      console.warn('Could not clear history from localStorage:', e);
    }
  },
};
