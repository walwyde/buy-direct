
import { GoogleGenAI } from "@google/genai";

// Use process.env.API_KEY directly for initialization as per coding guidelines
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export const getDirectPurchaseInsight = async (productName: string, manufacturerPrice: number, estimatedRetail: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explain the savings benefits of buying "${productName}" directly from the manufacturer for $${manufacturerPrice} compared to the estimated retail price of $${estimatedRetail}. Focus on quality control, transparency, and elimination of middlemen. Keep it punchy and persuasive for a consumer. Use bullet points.`,
      config: {
        temperature: 0.7,
        topP: 0.9,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Direct-to-consumer models ensure you get the freshest inventory directly from the source, eliminating up to 60% of traditional retail markups caused by logistics and wholesale margins.";
  }
};

export const getManufacturerAssistant = async (query: string, manufacturerContext: string) => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are an AI assistant for a Direct-to-Consumer platform. Help the user understand this manufacturer: ${manufacturerContext}. Question: ${query}`,
        config: {
          systemInstruction: "Be helpful, professional, and emphasize the value of manufacturer-direct relationships."
        }
      });
      return response.text;
    } catch (error) {
      return "I'm sorry, I'm having trouble connecting to the factory database. How else can I help?";
    }
}
