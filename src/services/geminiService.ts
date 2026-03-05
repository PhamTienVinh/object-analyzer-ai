import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface DetectedObject {
  label: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
}

export interface DetectionResult {
  objects: DetectedObject[];
  summary: Record<string, number>;
}

export async function detectObjects(base64Image: string, mimeType: string): Promise<DetectionResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Detect all distinct objects, people, and text elements in this image. 
  For each element, provide a concise label and its bounding box coordinates in normalized format [ymin, xmin, ymax, xmax] where values are 0-1000.
  Return the results as a JSON object with an 'objects' array and a 'summary' object mapping labels to their total counts.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          objects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                box_2d: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                  description: "[ymin, xmin, ymax, xmax] normalized 0-1000",
                },
              },
              required: ["label", "box_2d"],
            },
          },
          summary: {
            type: Type.OBJECT,
            additionalProperties: { type: Type.NUMBER },
          },
        },
        required: ["objects", "summary"],
      },
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as DetectionResult;
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    throw new Error("Failed to process image detection results.");
  }
}
