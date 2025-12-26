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

export const analyzeFoodInput = async (input: string, userApiKey?: string): Promise<{
  name: string;
  calories: number;
  macros: Macros;
  fiber: number;
  sugar: number;
  healthScore: number;
  smartInsights: string[];
}> => {
  try {
    const ai = getAiClient(userApiKey);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following food input: "${input}". 
      Estimate calories, macros, fiber, sugar, a health score (1-10), and provide 2 smart insights.
      Be realistic with portion sizes if not specified.
      
      IMPORTANT: If the input is not a food item or cannot be analyzed, you MUST return a valid JSON object matching the schema with:
      - foodName: "Unknown Item"
      - calories: 0
      - protein: 0
      - carbs: 0
      - fat: 0
      - fiber: 0
      - sugar: 0
      - healthScore: 0
      - smartInsights: ["Could not identify food", "Please try a different description"]
      
      Do not return markdown code blocks, just the JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: foodAnalysisSchema,
        systemInstruction: "You are a professional nutritionist API. Your goal is to accurately estimate nutrition from natural language text. You always respond with valid JSON matching the schema."
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
    };
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    // Extract meaningful error message
    const msg = error.message || "Failed to analyze food";
    throw new Error(msg);
  }
};