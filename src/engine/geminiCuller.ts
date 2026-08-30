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
 * Supports auto-fallback across Gemini 1.5 Flash, 1.5 Flash Latest, 2.0 Flash, and 1.5 Pro.
 */
export async function analyzeImageWithGeminiVision(
  apiKey: string,
  item: ProcessedItem
): Promise<GeminiCullingResult> {
  const cleanKey = apiKey?.trim();
  if (!cleanKey || cleanKey.length === 0) {
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

  // Candidate models and API versions in order of preference
  const candidateEndpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${cleanKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${cleanKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${cleanKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${cleanKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${cleanKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${cleanKey}`,
  ];

  let lastError = '';

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
        },
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

      if (response.ok) {
        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const result: GeminiCullingResult = JSON.parse(cleanText);
          return result;
        }
      } else {
        const errorText = await response.text();
        lastError = `Gemini API Error (${response.status}): ${errorText}`;
        // If 404 (model not found on this version/tier), try next candidate model
        if (response.status === 404) {
          continue;
        } else {
          // If other error, also attempt next endpoint
          continue;
        }
      }
    } catch (err: any) {
      lastError = err.message || 'Network error connecting to Gemini API';
    }
  }

  throw new Error(lastError || 'Failed to analyze image with Gemini Vision AI.');
}
