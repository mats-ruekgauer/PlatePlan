// supabase/functions/process-receipt/index.ts
// Async receipt OCR via Claude Vision — called after image is uploaded to Storage.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

import {
  buildReceiptOcrUserPrompt,
  RECEIPT_OCR_SYSTEM_PROMPT,
} from '../_shared/prompts.ts';

// ─── Zod schema for Claude receipt response ───────────────────────────────────

const ReceiptItemSchema = z.object({
  itemName: z.string().min(1),
  priceEur: z.number().positive().nullable(),
  supermarket: z.string().nullable(),
});

const ReceiptResponseSchema = z.array(ReceiptItemSchema);

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return cors(new Response('ok'));

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing Authorization header', 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return errorResponse('Unauthorized', 401);
    const userId = user.id;

    // ── Input ─────────────────────────────────────────────────────────────────
    const body = await req.json() as { receiptImageUrl: string; purchasedAt?: string };
    if (!body.receiptImageUrl) return errorResponse('receiptImageUrl is required', 400);

    // ── Download image bytes from Supabase Storage ────────────────────────────
    // Extract the storage path from the public URL
    const url = new URL(body.receiptImageUrl);
    const pathParts = url.pathname.split('/object/public/receipts/');
    if (pathParts.length < 2) return errorResponse('Invalid receipt image URL', 400);
    const storagePath = pathParts[1];

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: fileData, error: downloadError } = await serviceClient
      .storage
      .from('receipts')
      .download(storagePath);

    if (downloadError || !fileData) {
      return errorResponse('Failed to download receipt image', 500);
    }

    // Convert Blob to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // ── Call Claude Vision ────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: RECEIPT_OCR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64,
              },
            },
            { type: 'text', text: buildReceiptOcrUserPrompt() },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let items: z.infer<typeof ReceiptItemSchema>[] = [];
    let parseSuccess = true;

    try {
      const parsed: unknown = JSON.parse(cleaned);
      items = ReceiptResponseSchema.parse(parsed);
    } catch {
      parseSuccess = false;
      console.warn('[process-receipt] Failed to parse Claude response');
    }

    // ── Persist parsed items ──────────────────────────────────────────────────
    if (items.length > 0) {
      const rows = items.map((item) => ({
        user_id: userId,
        receipt_image_url: body.receiptImageUrl,
        item_name: item.itemName,
        price_eur: item.priceEur,
        supermarket: item.supermarket,
        purchased_at: body.purchasedAt ?? null,
      }));

      const { error: insertError } = await serviceClient
        .from('receipt_items')
        .insert(rows);

      if (insertError) {
        console.warn('[process-receipt] insert warning:', insertError.message);
      }
    }

    return cors(
      Response.json({
        success: parseSuccess,
        itemCount: items.length,
        items,
      }),
    );
  } catch (err) {
    console.error('[process-receipt]', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});

// ─── Utilities ────────────────────────────────────────────────────────────────

function cors(res: Response): Response {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  return res;
}

function errorResponse(message: string, status: number): Response {
  return cors(Response.json({ error: message }, { status }));
}
