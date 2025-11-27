import { GoogleGenAI, Type } from "@google/genai";
import { TransitionRule } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTuringRules = async (prompt: string): Promise<{ rules: TransitionRule[], initialTape: string, initialState: string, description: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create a standard deterministic Turing Machine configuration for the following task: "${prompt}". 
      
      Requirements:
      1. Use '_' as the empty symbol/blank character.
      2. The 'moveDirection' must be one of 'L' (Left), 'R' (Right), or 'N' (No Move).
      3. Keep state names descriptive but concise (e.g., 'start', 'scan_right', 'carry').
      4. Provide a sample 'initialTape' string that demonstrates the functionality.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  currentState: { type: Type.STRING },
                  readSymbol: { type: Type.STRING },
                  writeSymbol: { type: Type.STRING },
                  moveDirection: { type: Type.STRING, enum: ["L", "R", "N"] },
                  nextState: { type: Type.STRING },
                },
                required: ["currentState", "readSymbol", "writeSymbol", "moveDirection", "nextState"],
              },
            },
            initialTape: { type: Type.STRING, description: "A sample input string for the tape" },
            initialState: { type: Type.STRING, description: "The starting state name" },
            description: { type: Type.STRING, description: "A brief explanation of how the algorithm works" }
          },
          required: ["rules", "initialTape", "initialState", "description"],
        },
      },
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("Error generating rules:", error);
    throw error;
  }
};