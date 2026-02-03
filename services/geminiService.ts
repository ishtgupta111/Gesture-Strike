
import { GoogleGenAI, Type } from "@google/genai";
import { GameRule } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGameRule = async (): Promise<GameRule> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: 'Generate a creative "Catch vs Avoid" game theme. Provide a target to catch and an obstacle to avoid with corresponding emojis.',
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          target: { type: Type.STRING, description: 'The item the player MUST hit' },
          avoid: { type: Type.STRING, description: 'The item the player MUST NOT hit' },
          category: { type: Type.STRING, description: 'A title for this game round' },
          targetEmoji: { type: Type.STRING, description: 'Single emoji for the target' },
          avoidEmoji: { type: Type.STRING, description: 'Single emoji for the obstacle' },
        },
        required: ['target', 'avoid', 'category', 'targetEmoji', 'avoidEmoji'],
      },
    },
  });

  try {
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return {
      target: "Humans",
      avoid: "Birds",
      category: "Sky High",
      targetEmoji: "🏃",
      avoidEmoji: "🐦"
    };
  }
};
