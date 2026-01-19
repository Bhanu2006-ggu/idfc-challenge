
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { InvoiceData } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractInvoiceData = async (imageBase64: string): Promise<InvoiceData> => {
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          text: `You are an expert Document AI assistant. Analyze this document image, classify its type, and extract the following fields in strict JSON format.
          Handle multilingual content (English, Hindi, Gujarati).
          Return confidence scores (0-1) for each field.
          For Dealer Signature and Dealer Stamp, check for their presence and provide bounding boxes if present in normalized coordinates [0, 1000].
          
          Document Classification Rules:
          - "Invoice": Must contain terms like "Tax Invoice", "Bill", "Sales Invoice", or clear payment due details.
          - "Quotation": Must contain terms like "Estimate", "Quotation", "Pro-forma", or "Offer". Usually lacks a bill number or date.
          - "Other": Use if the document is neither a clear invoice nor a quotation (e.g., delivery notes, purchase orders).

          Fields to extract:
          1. Document Type: Classify as "Invoice", "Quotation", or "Other".
          2. Dealer Name (fuzzy match)
          3. Model Name (exact match)
          4. Horse Power (numeric value, e.g., "50 HP" -> 50)
          5. Asset Cost (numeric digits only)
          6. Dealer Signature (presence + bounding box)
          7. Dealer Stamp (presence + bounding box)
          `
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64.split(",")[1] || imageBase64
          }
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          documentType: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.STRING, description: "Classified type: Invoice, Quotation, or Other" },
              confidence: { type: Type.NUMBER }
            },
            required: ["value", "confidence"]
          },
          dealerName: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            }
          },
          modelName: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            }
          },
          horsePower: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.NUMBER },
              confidence: { type: Type.NUMBER }
            }
          },
          assetCost: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.NUMBER },
              confidence: { type: Type.NUMBER }
            }
          },
          dealerSignature: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              boundingBox: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.NUMBER },
                  xmin: { type: Type.NUMBER },
                  ymax: { type: Type.NUMBER },
                  xmax: { type: Type.NUMBER }
                }
              }
            }
          },
          dealerStamp: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              boundingBox: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.NUMBER },
                  xmin: { type: Type.NUMBER },
                  ymax: { type: Type.NUMBER },
                  xmax: { type: Type.NUMBER }
                }
              }
            }
          }
        },
        required: ["documentType", "dealerName", "modelName", "horsePower", "assetCost", "dealerSignature", "dealerStamp"]
      }
    }
  });

  if (!response.text) throw new Error("Empty response from AI");
  return JSON.parse(response.text.trim());
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
  const model = 'gemini-2.5-flash-image';
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image was returned by the generator.");
};

export const sendMultimodalChatMessage = async (
  history: { role: string; parts: any[] }[],
  newMessage: string,
  image?: string
): Promise<string> => {
  const model = 'gemini-3-pro-preview';
  
  const userParts: any[] = [{ text: newMessage }];
  if (image) {
    userParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: image.split(',')[1] || image,
      },
    });
  }

  const contents = [
    ...history,
    { role: 'user', parts: userParts }
  ];

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: 'You are an AI assistant for DocuExtract AI. You help users process documents, explain extraction results, and analyze document images they upload. You have full vision capabilities and can see details in invoices, stamps, and signatures. Be professional and technical.',
    },
  });

  return response.text || "I couldn't process that request.";
};
