
import { GoogleGenAI, Type } from "@google/genai";
import { RecognitionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function recognizeProductFromImage(base64Image: string): Promise<RecognitionResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            {
              text: `Analyze this product image. 
              1. Extract the barcode numeric ID if visible. 
              2. Identify the Brand, Product Name, and Size (e.g., 500ml, 1kg). 
              3. Categorize it into one of: 'Cooking', 'Home Cleaning', 'Personal Care', or 'Botiquín'.
              
              Return the result in JSON format.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            barcode: { type: Type.STRING, description: "The numeric barcode ID found on the product." },
            brand: { type: Type.STRING, description: "The brand of the product." },
            name: { type: Type.STRING, description: "The specific name of the product." },
            size: { type: Type.STRING, description: "The size or weight of the product." },
            category: { type: Type.STRING, description: "One of the four specified categories." }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
