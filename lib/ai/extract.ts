/**
 * /lib/ai/extract.ts
 * Menu extraction using Anthropic Claude API (claude-sonnet-4-6).
 * Accepts PDF (base64), image (base64), or raw CSV/text content.
 * Returns structured menu data ready for Step 3 review.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedMenuItem {
  name: string;
  nameAr?: string;
  description?: string;
  category: string;
  variants: ExtractedVariant[];
}

export interface ExtractedVariant {
  label: string; // e.g. "Regular", "Large", "Half", "Full"
  price: number; // AED
}

export interface ExtractedMenu {
  categories: string[];
  items: ExtractedMenuItem[];
  confidence: "high" | "medium" | "low";
  notes?: string;
}

const EXTRACTION_PROMPT = `You are a menu extraction specialist. Extract all food items from the provided menu content.

Return a JSON object with this exact structure:
{
  "categories": ["Category 1", "Category 2"],
  "items": [
    {
      "name": "Item Name in English",
      "nameAr": "Item Name in Arabic (if present, otherwise omit)",
      "description": "Description if present",
      "category": "Category Name",
      "variants": [
        { "label": "Regular", "price": 25.00 }
      ]
    }
  ],
  "confidence": "high|medium|low",
  "notes": "Any issues or assumptions made"
}

Rules:
- Prices must be in AED as decimal numbers (e.g., 25.50)
- If no size/variant is specified, create one variant with label "Regular"
- If multiple sizes are listed (Small/Medium/Large, Half/Full), create a variant for each
- Categories should match what's on the menu (Starters, Mains, Desserts, Drinks, etc.)
- Remove currency symbols, keep only numeric values
- If Arabic names are present, include them
- If a price seems missing, set it to 0 and note in the notes field
- Return ONLY valid JSON, no markdown code blocks`;

export async function extractMenuFromFile(
  fileBase64: string,
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp",
  restaurantContext?: string
): Promise<ExtractedMenu> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const contextNote = restaurantContext
    ? `\n\nRestaurant context: ${restaurantContext}`
    : "";

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          // @anthropic-ai/sdk@0.27.x predates document/PDF support, so it has no
          // DocumentBlockParam type. Cast through `unknown` to a real content-block
          // type so this compiles; the runtime payload is unchanged. TODO: upgrade
          // the SDK for first-class PDF support (and send images as `type: "image"`).
          {
            type: "document" as const,
            source: {
              type: "base64",
              media_type: mediaType,
              data: fileBase64,
            },
          } as unknown as Anthropic.ImageBlockParam,
          {
            type: "text",
            text: EXTRACTION_PROMPT + contextNote,
          },
        ],
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Strip markdown code fences if present
  const cleanJson = responseText
    .replace(/^```json\s*/m, "")
    .replace(/^```\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  const parsed = JSON.parse(cleanJson) as ExtractedMenu;

  // Ensure required fields
  if (!parsed.categories) parsed.categories = [];
  if (!parsed.items) parsed.items = [];
  if (!parsed.confidence) parsed.confidence = "medium";

  return parsed;
}

export async function extractMenuFromText(
  csvOrText: string,
  restaurantContext?: string
): Promise<ExtractedMenu> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const contextNote = restaurantContext
    ? `\n\nRestaurant context: ${restaurantContext}`
    : "";

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content:
          EXTRACTION_PROMPT +
          contextNote +
          "\n\nMenu content:\n\n" +
          csvOrText,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  const cleanJson = responseText
    .replace(/^```json\s*/m, "")
    .replace(/^```\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  const parsed = JSON.parse(cleanJson) as ExtractedMenu;
  if (!parsed.categories) parsed.categories = [];
  if (!parsed.items) parsed.items = [];
  if (!parsed.confidence) parsed.confidence = "medium";

  return parsed;
}
