import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Macros } from "../types";

// Move initialization inside the function to prevent top-level crashes
// if process.env.API_KEY is missing or causes issues at startup.
const getAiClient = () => {
  // @ts-ignore
  const apiKey = process.env.API_KEY; 
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key is missing. Please add VITE_API_KEY to your environment variables.");
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

export const analyzeFoodInput = async (input: string): Promise<{
  name: string;
  calories: number;
  macros: Macros;
  fiber: number;
  sugar: number;
  healthScore: number;
  smartInsights: string[];
}> => {
  try {
    const ai = getAiClient();
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