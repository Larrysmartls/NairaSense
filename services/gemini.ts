import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabase";
import { ExchangeData, Source, CurrencyCode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Internal: Direct AI Call
const fetchFromAI = async (from: CurrencyCode, to: CurrencyCode): Promise<ExchangeData> => {
    const model = 'gemini-3-flash-preview';
    const isNairaSearch = from === 'NGN' || to === 'NGN';
    
    const prompt = `
      Search for the latest real-time exchange rate from ${from} to ${to}.
      ${isNairaSearch ? "Look for both the Official CBN rate and the Parallel Market (Black Market) rate." : ""}
      
      I need you to extract the effective calculation rate.
      ${isNairaSearch ? "If a parallel market rate exists and is widely used (e.g. black market rate), use that as the primary 'rate'. Provide the official rate separately if found." : ""}
      
      Return the response in a structured text format, and END your response with a JSON block strictly adhering to this schema:
      
      \`\`\`json
      {
        "rate": 1234.56,
        "parallelRate": 1250.00, 
        "summary": "Brief 1-sentence summary of market status."
      }
      \`\`\`
      
      (Note: 'parallelRate' is optional, set to null if not applicable. 'rate' must be a number).
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Extract sources
    const sources: Source[] = groundingChunks
      .map((chunk: any) => {
        if (chunk.web) {
          return { title: chunk.web.title, uri: chunk.web.uri };
        }
        return null;
      })
      .filter((source: Source | null): source is Source => source !== null);

    // Parsing logic
    let detectedRate = 0;
    let parallelRate: number | undefined = undefined;
    let summaryText = text;

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*"rate"[\s\S]*}/);
    
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.rate) detectedRate = parseFloat(parsed.rate);
        if (parsed.parallelRate) parallelRate = parseFloat(parsed.parallelRate);
        if (parsed.summary) summaryText = parsed.summary;
      } catch (e) {
        console.warn("JSON parsing failed, falling back to regex", e);
      }
    }

    if (!detectedRate) {
      const cleanText = text.replace(/202[0-9]/g, '');
      const rateMatches = cleanText.match(/(\d{1,3}(,\d{3})*(\.\d+)?)/g);
      
      if (rateMatches) {
        const candidates = rateMatches.map(m => parseFloat(m.replace(/,/g, '')));
        const valid = candidates.find(n => n > 0 && n < 10000 && !Number.isInteger(n) && n !== 2024 && n !== 2025);
        if (valid) detectedRate = valid;
      }
    }
    
    // Safety Fallback for USD/NGN
    if (detectedRate === 0 && from === 'USD' && to === 'NGN') {
        detectedRate = 1600; 
    }

    return {
      rate: detectedRate,
      parallelRate: parallelRate,
      summary: summaryText.replace(/```json[\s\S]*```/, '').trim(),
      lastUpdated: new Date().toLocaleTimeString(),
      sources
    };
};

// Internal: Retry Logic for API Quotas
const attemptAIFetchWithRetry = async (from: CurrencyCode, to: CurrencyCode, retries = 2): Promise<ExchangeData> => {
    try {
        return await fetchFromAI(from, to);
    } catch (err: any) {
        // Check for 429 in various formats (code, status, or message)
        const isQuota = err?.status === 429 || err?.code === 429 || (err?.message && (err.message.includes('429') || err.message.includes('quota')));
        
        if (retries > 0 && isQuota) {
            console.warn(`Rate limit hit (429). Retrying in 2s... (${retries} retries left)`);
            await sleep(2000); 
            return attemptAIFetchWithRetry(from, to, retries - 1);
        }
        throw err;
    }
}

// Helpers for Data processing
const mapDbToExchangeData = (dbData: any): ExchangeData => ({
    rate: dbData.rate,
    parallelRate: dbData.parallel_rate || undefined,
    summary: dbData.summary,
    lastUpdated: new Date(dbData.updated_at).toLocaleTimeString(),
    sources: dbData.sources || []
});

const invertExchangeData = (data: ExchangeData): ExchangeData => {
    if (data.rate <= 0) return data;
    return {
        ...data,
        rate: 1 / data.rate,
        parallelRate: data.parallelRate ? 1 / data.parallelRate : undefined
    };
};

export const fetchRealTimeRate = async (from: CurrencyCode, to: CurrencyCode): Promise<ExchangeData> => {
  try {
    // 1. Determine Canonical Pair (Always fetch/store as Foreign -> NGN if possible)
    let searchFrom = from;
    let searchTo = to;
    let shouldInvert = false;

    if (from === 'NGN' && to !== 'NGN') {
      searchFrom = to;
      searchTo = from;
      shouldInvert = true;
    }

    const pairId = `${searchFrom}-${searchTo}`;
    let staleRecord: any = null;

    // 2. CHECK SUPABASE (Fetch regardless of freshness to use as fallback)
    try {
      const { data, error } = await supabase
        .from('currency_rates')
        .select('*')
        .eq('pair', pairId)
        .single();

      if (!error && data) {
        staleRecord = data;
        const updatedAt = new Date(data.updated_at).getTime();
        const now = new Date().getTime();
        
        // If fresh, return immediately
        if (now - updatedAt < CACHE_DURATION_MS) {
          console.log(`Using fresh cached rate for ${pairId}`);
          const result = mapDbToExchangeData(data);
          return shouldInvert ? invertExchangeData(result) : result;
        }
      }
    } catch (dbError) {
      console.warn("Supabase cache check failed", dbError);
    }

    // 3. FETCH FROM AI (with Retry for 429)
    console.log(`Cache stale or missing for ${pairId}. Fetching from AI...`);
    
    try {
        const aiResult = await attemptAIFetchWithRetry(searchFrom, searchTo);

        // 4. SAVE TO SUPABASE
        if (aiResult.rate > 0) {
            supabase.from('currency_rates').upsert({
                pair: pairId,
                rate: aiResult.rate,
                parallel_rate: aiResult.parallelRate || null,
                summary: aiResult.summary,
                sources: aiResult.sources,
                updated_at: new Date().toISOString()
            }).then(({ error }) => {
                if (error) console.warn("Background cache update failed", error);
            });
        }

        // 5. RETURN FRESH RESULT
        return shouldInvert ? invertExchangeData(aiResult) : aiResult;

    } catch (aiError: any) {
        console.error("AI Fetch failed:", aiError);

        // 6. FALLBACK TO STALE DATA
        if (staleRecord) {
            console.warn(`Falling back to stale data for ${pairId} due to error`);
            const result = mapDbToExchangeData(staleRecord);
            // Mark as cached/offline visually
            result.lastUpdated = `${result.lastUpdated} (Cached)`;
            return shouldInvert ? invertExchangeData(result) : result;
        }

        // If no stale data and AI fails, throw the error
        throw aiError;
    }

  } catch (error) {
    console.error("Failed to fetch rates:", error);
    throw error;
  }
};