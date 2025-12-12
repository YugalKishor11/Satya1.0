import { GoogleGenAI, Modality, Type } from "@google/genai";
import { VerificationResult, GroundingSource } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert File to Base64 string for Gemini
const fileToGenerativePart = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Scout Agent: Extracts the core claim from an image, text, or both.
 * Uses gemini-2.5-flash for speed and multimodal capabilities.
 */
export const scoutAgent = async (input: { file?: File | null, text?: string }): Promise<string> => {
  const parts: any[] = [];
  let promptText = "";

  if (input.file) {
    const base64Data = await fileToGenerativePart(input.file);
    parts.push({
      inlineData: {
        mimeType: input.file.type,
        data: base64Data
      }
    });
    
    const isPdf = input.file.type === 'application/pdf';
    const mediaType = isPdf ? "document (PDF)" : "image";

    if (input.text) {
      promptText = `You are the Scout Agent. The user has provided a ${mediaType} and the following text input: "${input.text}". 
      
      TASK:
      Analyze the ${mediaType} and the text together. 
      - If the text is a claim, verify if the ${mediaType} supports or relates to it.
      - If the text is a question about the ${mediaType}, formulate a claim that answers it based on evidence (e.g. "User asks X, ${mediaType} shows Y").
      - If the text is unrelated, prioritize the evidence in the ${mediaType} but mention the text context.
      
      OUTPUT:
      Return ONLY the formulated core claim or assertion to be fact-checked. Do not add intro, "Here is the claim", or markdown. Just the raw claim string.`;
    } else {
      promptText = `You are the Scout Agent. Your task is to analyze this ${mediaType} (which may be a research paper, news article, screenshot, or meme) and extract the core claim, primary assertion, or key finding being made. Return ONLY the claim text. Do not add intro or preamble.`;
    }
  } else if (input.text) {
    promptText = `You are the Scout Agent. Analyze the following text and extract the core claim or primary assertion being made. 
    
    - If it is already a clear claim, return it as is. 
    - If it is vague, clarify it based on the context. 
    - If it is a question, rephrase it as a declarative claim to be verified (e.g. "Is the sky blue?" -> "The sky is blue").
    
    Return ONLY the claim text. Do not add intro or preamble.
          
    Input Text: "${input.text}"`;
  } else {
    throw new Error("No input provided to Scout Agent.");
  }

  parts.push({ text: promptText });
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      thinkingConfig: { thinkingBudget: 2048 }
    }
  });

  if (!response.text) {
    throw new Error("Scout Agent failed to extract text.");
  }
  return response.text;
};

/**
 * Verifier Agent: Uses Google Search Grounding to verify the claim.
 */
export const verifierAgent = async (claim: string): Promise<VerificationResult> => {
  const prompt = `You are the Verifier Agent.
  CLAIM: "${claim}"

  TASK:
  Use Google Search to verify this claim. 
  1. Determine if it is TRUE, FALSE, MISLEADING, or COMPLEX.
  2. Provide a confidence percentage (0-100%).
  3. List key evidence found.

  OUTPUT FORMAT:
  VERDICT: [TRUE|FALSE|MISLEADING|COMPLEX] (Confidence: [0-100]%)
  
  [Detailed verification analysis with citations]
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const rawText = response.text || "No response generated.";
  const sources: GroundingSource[] = [];

  // Extract grounding metadata if available
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({
          title: chunk.web.title,
          uri: chunk.web.uri,
        });
      }
    });
  }

  return { rawText, sources };
};

/**
 * Explainability Agent: Synthesizes the verification result into a clear explanation.
 */
export const explainabilityAgent = async (verificationText: string): Promise<string> => {
  const prompt = `You are the Synthesis Agent. 
  The Verifier Agent has provided the following raw verification log:
  
  """
  ${verificationText}
  """
  
  TASK:
  Synthesize this into a clear, easy-to-read explanation for a general audience.
  - Start with the verdict.
  - Explain *why* it is true/false/misleading.
  - Mention key sources or evidence found.
  - Be objective and neutral.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Could not generate explanation.";
};

/**
 * Counter-Message Agent: Drafts a polite correction.
 */
export const counterMessageAgent = async (claim: string, explanation: string): Promise<string> => {
  const prompt = `You are the ReplyBot.
  CLAIM: "${claim}"
  EXPLANATION: "${explanation}"
  
  TASK:
  Draft a polite, empathetic, and fact-based counter-message that could be posted on social media to correct this misinformation (or confirm the truth).
  - Keep it under 280 characters if possible, or short paragraph.
  - Do not be aggressive or condescending.
  - Focus on the facts.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Could not generate counter-message.";
};

/**
 * Generate Speech: Uses Gemini TTS.
 */
export const generateSpeech = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("Failed to generate speech.");
  }
  return base64Audio;
};

/**
 * Research Blog: Generates a weekly report in JSON.
 */
export const getResearchBlog = async (): Promise<string> => {
  const prompt = `Generate a "Weekly Misinformation Watch" report for the current week.
  Focus on 3 main categories: "Health Rumors", "Political Deepfakes", and "Tech Scams".
  For each category, invent 1 realistic trending item (since I cannot access real-time news in this mode perfectly, simulate realistic examples based on common tropes).

  Output JSON format conforming to this schema:
  {
    "week_of": "Month Day, Year",
    "intro": "Short summary of the week's trends.",
    "categories": [
      {
        "name": "Category Name",
        "items": [
          {
            "headline": "The claim headline",
            "correction": "The factual correction"
          }
        ]
      }
    ]
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          week_of: { type: Type.STRING },
          intro: { type: Type.STRING },
          categories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      headline: { type: Type.STRING },
                      correction: { type: Type.STRING }
                    },
                    required: ["headline", "correction"]
                  }
                }
              },
              required: ["name", "items"]
            }
          }
        },
        required: ["week_of", "intro", "categories"]
      }
    },
  });

  return response.text || "{}";
};