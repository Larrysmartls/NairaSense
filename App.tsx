import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Converter } from './components/Converter';
import { MarketInsight } from './components/MarketInsight';
import { fetchRealTimeRate } from './services/gemini';
import { ExchangeData, CurrencyCode } from './types';
import { Coins, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<ExchangeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Currency State
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('USD');
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('NGN');

  // Cache to store rates: "FROM-TO" -> ExchangeData
  const ratesCache = useRef<Record<string, ExchangeData>>({});

  const loadData = useCallback(async (forceRefresh = false) => {
    setError(null);

    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const inverseKey = `${toCurrency}-${fromCurrency}`;

    // 1. Try to use Cache if not forcing refresh
    if (!forceRefresh) {
      // Direct cache hit
      if (ratesCache.current[cacheKey]) {
        setData(ratesCache.current[cacheKey]);
        setLoading(false);
        return;
      }

      // Inverse cache hit (Smart Inversion)
      // If we have USD->NGN, we can calculate NGN->USD instantly
      if (ratesCache.current[inverseKey]) {
        const invData = ratesCache.current[inverseKey];
        // Calculate inverted rates
        const invertedData: ExchangeData = {
          ...invData,
          rate: invData.rate ? 1 / invData.rate : 0,
          parallelRate: invData.parallelRate ? 1 / invData.parallelRate : undefined,
          // We keep the original timestamp and sources
        };
        
        // Store the computed inverse in cache so we don't recalculate next time
        ratesCache.current[cacheKey] = invertedData;
        
        setData(invertedData);
        setLoading(false);
        return;
      }
    }

    // 2. Fetch from API if not in cache
    setLoading(true);
    try {
      const result = await fetchRealTimeRate(fromCurrency, toCurrency);
      
      // Update Cache
      ratesCache.current[cacheKey] = result;
      
      // Also cache the inverse immediately so swapping is instant later
      if (result.rate > 0) {
        ratesCache.current[inverseKey] = {
           ...result,
           rate: 1 / result.rate,
           parallelRate: result.parallelRate ? 1 / result.parallelRate : undefined
        };
      }

      setData(result);
    } catch (err) {
      console.error(err);
      setError("Unable to retrieve real-time data. Please check your connection or try again later.");
    } finally {
      setLoading(false);
    }
  }, [fromCurrency, toCurrency]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleManualRefresh = () => {
    loadData(true);
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-green-100 selection:text-green-900 flex flex-col">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-600 p-2 rounded-lg text-white">
                <Coins size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-emerald-500">
              NairaSense
            </h1>
          </div>
          <div className="text-xs font-medium text-slate-500 hidden sm:block">
            AI-Powered Real-Time Rates
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl">
          
          <div className="mb-8 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-3 tracking-tight">
              Currency Converter
            </h2>
            <p className="text-slate-500 text-lg">
              Get the most accurate parallel and official market rates instantly.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5" size={20} />
              <p>{error}</p>
              <button 
                onClick={handleManualRefresh}
                className="ml-auto text-sm font-semibold underline hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}

          <Converter 
            data={data} 
            loading={loading} 
            onRefresh={handleManualRefresh}
            lastUpdated={data?.lastUpdated || null}
            fromCurrency={fromCurrency}
            toCurrency={toCurrency}
            onFromChange={setFromCurrency}
            onToChange={setToCurrency}
            onSwap={handleSwap}
          />

          <MarketInsight 
            summary={data?.summary || ""}
            loading={loading}
          />
          
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-400 text-sm border-t border-slate-200 bg-white">
        <p>© {new Date().getFullYear()} NairaSense. Rates provided via Google Search Grounding.</p>
        <p className="mt-1 text-xs text-slate-300">Disclaimer: For informational purposes only. Verify before trading.</p>
      </footer>
    </div>
  );
};

export default App;