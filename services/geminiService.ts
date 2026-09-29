import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Macros } from "../types";

// Helper to check if the environment has a key pre-configured
// This prevents the app from crashing if no key is found immediately
export const hasEnvApiKey = (): boolean => {
    try {
        getAiClient();
        return true;
    } catch (e) {
        return false;
    }
};

const getAiClient = (explicitKey?: string) => {
  // Priority: 1. Key passed from UI, 2. Key from env vars
  let apiKey = explicitKey;

  if (!apiKey) {
      // 1. Try process.env (injected via vite.config.ts define)
      try {
        // @ts-ignore
        apiKey = process.env.API_KEY;
      } catch (e) {}

      // 2. Try import.meta.env (Vite native support for VITE_ prefixed vars)
      if (!apiKey || apiKey === "undefined") {
        try {
          // @ts-ignore
          apiKey = import.meta.env.VITE_API_KEY;
        } catch (e) {}
      }

      // 3. Last ditch effort
      if (!apiKey || apiKey === "undefined") {
        try {
          // @ts-ignore
          apiKey = import.meta.env.API_KEY;
        } catch (e) {}
      }
  }

  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key is missing.");
  }

  return new GoogleGenAI({ apiKey });
};

const foodAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    foodName: {
      type: Type.STRING,
      description: "A short, display-friendly name of the food identified.",
    },
    calories: {
      type: Type.INTEGER,
      description: "Estimated total calories for the described portion.",
    },
    protein: {
      type: Type.INTEGER,
      description: "Estimated protein in grams.",
    },
    carbs: {
      type: Type.INTEGER,
      description: "Estimated carbohydrates in grams.",
    },
    fat: {
      type: Type.INTEGER,
      description: "Estimated fat in grams.",
    },
    fiber: {
      type: Type.INTEGER,
      description: "Estimated fiber in grams. Return 0 if negligible.",
    },
    sugar: {
      type: Type.INTEGER,
      description: "Estimated sugar in grams. Return 0 if negligible.",
    },
    healthScore: {
      type: Type.INTEGER,
      description: "A score from 1 to 10 rating the healthiness of this meal based on nutrient density.",
    },
    smartInsights: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2 short, distinct bullet points providing nutritional advice or facts about this specific food.",
    }
  },
  required: ["foodName", "calories", "protein", "carbs", "fat", "fiber", "sugar", "healthScore", "smartInsights"],
};

export interface FoodAnalysis {
  name: string;
  calories: number;
  macros: Macros;
  fiber: number;
  sugar: number;
  healthScore: number;
  smartInsights: string[];
  model: string; // which Gemini model produced the result
}

const UNKNOWN_ITEM_INSTRUCTIONS = `IMPORTANT: If the input is not a food item or cannot be analyzed, you MUST return a valid JSON object matching the schema with:
      - foodName: "Unknown Item"
      - calories: 0
      - protein: 0
      - carbs: 0
      - fat: 0
      - fiber: 0
      - sugar: 0
      - healthScore: 0
      - smartInsights: ["Could not identify food", "Please try a different description"]

      Do not return markdown code blocks, just the JSON.`;

// Tried in order; the stable model is a fallback when the preview one is overloaded
export const PRIMARY_MODEL = "gemini-3-flash-preview";
const MODELS = [PRIMARY_MODEL, "gemini-3.8-flash"];
const RETRIES_PER_MODEL = 2;

const getStatusCode = (error: any): number | undefined => {
  if (typeof error?.status === 'number') return error.status;
  const match = String(error?.message ?? '').match(/"code"\s*:\s*(\d{3})/);
  return match ? Number(match[1]) : undefined;
};

// Overloaded / rate limited / transient server errors are worth retrying
const isRetryable = (error: any) => {
  const code = getStatusCode(error);
  return code === 429 || code === 500 || code === 503 || code === 504;
};

const friendlyErrorMessage = (error: any): string => {
  const code = getStatusCode(error);
  if (code === 503 || code === 500 || code === 504) return "Gemini is busy right now. Please try again in a minute.";
  if (code === 404) return "The AI model is unavailable for your API key. Please try again later.";
  if (code === 429) return "Your API key's free quota is used up. Try again later, or enable billing for the key in Google AI Studio.";
  if (code === 400 || code === 401 || code === 403) return "Your API key was rejected. Check it in API Key Settings.";
  if (error?.message === "API Key is missing.") return "Add your Gemini API key in API Key Settings.";
  // Unrecognized: include the underlying reason so it can be diagnosed
  const detail = String(error?.message ?? '').slice(0, 150);
  return `Could not analyze food${detail ? ` (${detail})` : ''}. Please try again.`;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Model found via the API when every configured model is unavailable (cached for the session)
let discoveredModel: string | null = null;

// Ask the API which models this key can use and pick the newest non-lite Flash model
const discoverFlashModel = async (ai: GoogleGenAI, exclude: string[]): Promise<string | null> => {
  try {
    const names: string[] = [];
    for await (const m of await ai.models.list()) {
      const name = (m.name ?? '').replace(/^models\//, '');
      const canGenerate = !m.supportedActions || m.supportedActions.includes('generateContent');
      if (canGenerate && /^gemini-.*flash/.test(name) && !name.includes('lite') && !exclude.includes(name)) {
        names.push(name);
      }
    }
    names.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    return names[0] ?? null;
  } catch (e) {
    console.error("Model discovery failed", e);
    return null;
  }
};

const generateWithFallback = async (ai: GoogleGenAI, request: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>) => {
  let lastError: any;
  let allUnavailable = true;
  const tryModel = async (model: string) => {
    for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
      try {
        return { response: await ai.models.generateContent({ ...request, model }), model };
      } catch (error: any) {
        lastError = error;
        // Retired model (404) or used-up quota (429, quotas are per model): retrying the
        // same model won't help, so move straight on to the next one
        const code = getStatusCode(error);
        if (code !== 404) allUnavailable = false;
        if (code === 404 || code === 429) return null;
        if (!isRetryable(error)) throw error;
        if (attempt < RETRIES_PER_MODEL - 1) await sleep(1000 * (attempt + 1));
      }
    }
    return null;
  };

  const models = discoveredModel ? [...MODELS, discoveredModel] : MODELS;
  for (const model of models) {
    const result = await tryModel(model);
    if (result) return result;
  }

  // Every model name we know is gone for this key: look one up
  if (allUnavailable && !discoveredModel) {
    discoveredModel = await discoverFlashModel(ai, MODELS);
    if (discoveredModel) {
      const result = await tryModel(discoveredModel);
      if (result) return result;
    }
  }
  throw lastError;
};

const runAnalysis = async (contents: any, userApiKey?: string): Promise<FoodAnalysis> => {
  try {
    const ai = getAiClient(userApiKey);
    const { response, model } = await generateWithFallback(ai, {
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: foodAnalysisSchema,
        systemInstruction: "You are a professional nutritionist API. Your goal is to accurately estimate nutrition from natural language text or food photos. You always respond with valid JSON matching the schema."
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);

    return {
      name: data.foodName,
      calories: data.calories,
      macros: {
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
      },
      fiber: data.fiber || 0,
      sugar: data.sugar || 0,
      healthScore: data.healthScore || 5,
      smartInsights: data.smartInsights || ["Enjoy your meal!"],
      model,
    };
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(friendlyErrorMessage(error));
  }
};

// Text results are cached so repeated entries (e.g. "1 glass milk") don't use API quota
const CACHE_KEY = 'smartcal_analysis_cache';
const CACHE_LIMIT = 200;

const normalizeInput = (input: string) => input.trim().toLowerCase().replace(/\s+/g, ' ');

const readCache = (): Record<string, FoodAnalysis> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeCache = (key: string, analysis: FoodAnalysis) => {
  try {
    const cache = readCache();
    delete cache[key];
    cache[key] = analysis;
    // Drop the oldest entries (insertion order) beyond the limit
    const keys = Object.keys(cache);
    for (const k of keys.slice(0, Math.max(0, keys.length - CACHE_LIMIT))) delete cache[k];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("Failed to cache analysis", e);
  }
};

export const analyzeFoodInput = async (input: string, userApiKey?: string): Promise<FoodAnalysis> => {
  const key = normalizeInput(input);
  const cached = readCache()[key];
  if (cached) return cached;

  const analysis = await analyzeFoodText(input, userApiKey);
  if (analysis.name !== "Unknown Item") writeCache(key, analysis);
  return analysis;
};

const analyzeFoodText = (input: string, userApiKey?: string): Promise<FoodAnalysis> =>
  runAnalysis(`Analyze the following food input: "${input}".
      Estimate calories, macros, fiber, sugar, a health score (1-10), and provide 2 smart insights.
      Be realistic with portion sizes if not specified.

      ${UNKNOWN_ITEM_INSTRUCTIONS}`, userApiKey);

// base64Data is raw base64 (no data: prefix). note is optional extra context from the user.
export const analyzeFoodImage = (base64Data: string, mimeType: string, note: string, userApiKey?: string): Promise<FoodAnalysis> =>
  runAnalysis([
    { inlineData: { mimeType, data: base64Data } },
    { text: `Identify the food in this photo and estimate the portion visible.
      ${note ? `Additional context from the user: "${note}".` : ''}
      Estimate calories, macros, fiber, sugar, a health score (1-10), and provide 2 smart insights.

      ${UNKNOWN_ITEM_INSTRUCTIONS}` },
  ], userApiKey);
