import { HistoryItem, SatyaReport } from "../types";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, writeBatch } from "firebase/firestore";

export const storageService = {
  // --- History ---

  async saveHistory(userId: string, report: SatyaReport): Promise<void> {
    // Determine verdict for summary
    const isTrue = /VERDICT:\s*TRUE/i.test(report.verification.rawText);
    const isFalse = /VERDICT:\s*FALSE/i.test(report.verification.rawText);
    const verdict = isTrue ? 'TRUE' : isFalse ? 'FALSE' : 'MIXED';

    const item = {
      userId,
      claim: report.claim,
      verdict,
      timestamp: Date.now(),
      snippet: report.explanation.slice(0, 100) + '...',
      report // Store the full report object
    };

    try {
      await addDoc(collection(db, "history"), item);
    } catch (error) {
      console.error("Error saving history to Firestore:", error);
      throw error;
    }
  },

  async getHistory(userId: string): Promise<HistoryItem[]> {
    try {
      const q = query(collection(db, "history"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      
      const history: HistoryItem[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          claim: data.claim,
          verdict: data.verdict,
          timestamp: data.timestamp,
          snippet: data.snippet,
          report: data.report // Retrieve the full report object
        });
      });

      // Sort in memory to avoid needing a composite index immediately in Firestore Console
      return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Error fetching history from Firestore:", error);
      return [];
    }
  },

  async clearHistory(userId: string): Promise<void> {
    try {
      const q = query(collection(db, "history"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Error clearing history in Firestore:", error);
      throw error;
    }
  }
};