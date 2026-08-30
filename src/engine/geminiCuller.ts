/**
 * Gemini Vision AI Photo Culler & Quality Inspector
 * Powered by Google Gemini Multimodal Vision API (gemini-1.5-flash / gemini-2.5-flash)
 */

import { ProcessedItem } from './types';

export interface GeminiCullingResult {
  eyesState: 'WIDE_OPEN' | 'PARTIALLY_SQUINTING' | 'CLOSED_BLINKING' | 'NO_FACE';
  eyeOpennessScore: number; // 0.0 - 1.0
  subjectFocus: 'CRISP_SHARP' | 'SOFT_FOCUS' | 'SEVERELY_BLURRED';
  isBokehBackground: boolean;
  isMotionSmear: boolean;
  recommendation: 'KEEP_WINNER' | 'MOVE_TO_ARCHIVE';
  qualityScore: number; // 0 - 100
  reason: string;
}

/**
 * Converts a thumbnail / image URL to a clean base64 data payload for Gemini.
 */
async function getBase64FromUrl(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const parts = base64String.split(',');
      const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const data = parts[1];
      resolve({ data, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Inspects an image with Google Gemini Vision API to detect blinks, soft focus, and camera shake.
 */
export async function analyzeImageWithGeminiVision(
  apiKey: string,
  item: ProcessedItem
): Promise<GeminiCullingResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Please enter a Google Gemini API Key in Settings or the API Key bar.');
  }

  const { data: base64Data, mimeType } = await getBase64FromUrl(
    item.transformedThumbnailUrl || item.thumbnailUrl
  );

  const prompt = `You are an expert professional photo editor and culling assistant.
Inspect this photo carefully and evaluate:
1. Eyes State: Are subjects' eyes wide open, partially squinting/closed/drowsy, or fully closed/blinking?
2. Subject Focus: Is the main subject (person/face) in sharp focus? Note: An artistic blurry background with a sharp person (bokeh) is GREAT and must be marked as crisp focus.
3. Motion Shake: Is there accidental camera handshake smear?
4. Final Culling Recommendation:
   - If eyes are fully closed/blinking OR if eyes are partially squinted with soft/bad focus OR severe camera shake -> "MOVE_TO_ARCHIVE".
   - If eyes are open and subject is in focus -> "KEEP_WINNER".

Respond ONLY with valid JSON in this exact structure:
{
  "eyesState": "WIDE_OPEN" | "PARTIALLY_SQUINTING" | "CLOSED_BLINKING" | "NO_FACE",
  "eyeOpennessScore": 0.95,
  "subjectFocus": "CRISP_SHARP" | "SOFT_FOCUS" | "SEVERELY_BLURRED",
  "isBokehBackground": true,
  "isMotionSmear": false,
  "recommendation": "KEEP_WINNER" | "MOVE_TO_ARCHIVE",
  "qualityScore": 88,
  "reason": "Clear concise explanation"
}`;

  // Use Gemini 1.5 Flash (free, fast, highly accurate multimodal vision)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const textOutput = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('No response returned from Gemini Vision API.');
  }

  const result: GeminiCullingResult = JSON.parse(textOutput);
  return result;
}
