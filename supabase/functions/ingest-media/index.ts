import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VISION_WORKER_URL = 'https://ceka-vision-extract.saemscodes.workers.dev';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { images, title, source_url, auto_publish = false } = await req.json() as {
    images: { url: string; slide_number: number }[];
    title: string;
    source_url?: string;
    auto_publish?: boolean;
  };

  if (!images || images.length === 0 || !title) {
    return Response.json({ error: 'images and title required' }, { status: 400 });
  }

  // 1. Create batch
  const { data: batch, error: batchError } = await supabase
    .from('carousel_batches')
    .insert({ title, source_url: source_url || null, status: 'processing' })
    .select()
    .single();

  if (batchError || !batch) {
    return Response.json({ error: 'Failed to create batch', detail: batchError }, { status: 500 });
  }

  const results = [];
  const extractedUnits = [];

  // 2. Process each image
  for (const img of images) {
    const isFinal = img.slide_number === images.length;

    // Store image record
    const { data: imageRecord, error: imgError } = await supabase
      .from('carousel_images')
      .insert({
        batch_id: batch.id,
        image_url: img.url,
        slide_number: img.slide_number,
        status: 'pending'
      })
      .select()
      .single();

    if (imgError || !imageRecord) continue;

    // 3. Call Cloudflare Vision Worker with NARRATIVE CONTEXT
    let extracted = { headline: '', body: '', cta: '', metadata: '' };
    let confidence = 0.5;

    try {
      const visionRes = await fetch(VISION_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image_url: img.url,
          slide_number: img.slide_number,
          total_slides: images.length,
          is_final: isFinal
        })
      });

      if (visionRes.ok) {
        const visionData = await visionRes.json();
        extracted = visionData.extracted || extracted;
        // Basic heuristic for confidence
        confidence = extracted.headline ? 0.9 : 0.4;
      }
    } catch (err) {
      console.error('Vision extraction failed for slide', img.slide_number, err);
    }

    // Update image record
    await supabase
      .from('carousel_images')
      .update({
        extracted_json: extracted,
        extraction_confidence: confidence,
        status: 'extracted'
      })
      .eq('id', imageRecord.id);

    results.push({ slide_number: img.slide_number, extracted, confidence });

    // 4. Staging -> Units (if auto_publish)
    if (auto_publish) {
      const types: Array<{ key: keyof typeof extracted; type: string }> = [
        { key: 'headline', type: 'headline' },
        { key: 'body', type: 'body' },
        { key: 'cta', type: 'cta' }
      ];

      for (const { key, type } of types) {
        const text = (extracted as any)[key]?.trim();
        if (!text || text.length < 3) continue;

        const { data: unit } = await supabase
          .from('translation_units')
          .insert({
            batch_id: batch.id,
            image_id: imageRecord.id,
            carousel_id: batch.title,
            slide_number: img.slide_number,
            type,
            source_text: text,
            context_note: `Slide ${img.slide_number}/${images.length}. Auto-ingested.`,
            extraction_confidence: confidence,
            active: true
          })
          .select()
          .single();

        if (unit) extractedUnits.push(unit);
      }
    }
  }

  // 5. Update batch status
  await supabase
    .from('carousel_batches')
    .update({ status: auto_publish ? 'published' : 'extracted' })
    .eq('id', batch.id);

  return Response.json({
    batch_id: batch.id,
    slides_processed: results.length,
    units_created: extractedUnits.length,
    extractions: results
  });
});
