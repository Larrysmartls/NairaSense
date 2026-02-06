import React, { useState } from 'react';
import { CurrencyCode, ExchangeData, SUPPORTED_CURRENCIES } from '../types';
import { ArrowRightLeft, RefreshCw, ChevronDown } from 'lucide-react';
import { SourceLinks } from './SourceLinks';

interface ConverterProps {
  data: ExchangeData | null;
  loading: boolean;
  onRefresh: () => void;
  lastUpdated: string | null;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  onFromChange: (code: CurrencyCode) => void;
  onToChange: (code: CurrencyCode) => void;
  onSwap: () => void;
}

export const Converter: React.FC<ConverterProps> = ({ 
  data, 
  loading, 
  onRefresh, 
  lastUpdated,
  fromCurrency,
  toCurrency,
  onFromChange,
  onToChange,
  onSwap
}) => {
  const [amount, setAmount] = useState<string>('1');

  const rate = data?.rate || 0;
  const parallelRate = data?.parallelRate;

  // Helper for consistent formatting
  const formatNumber = (num: number, minDecimals = 2, maxDecimals = 2) => {
    // If number is very small (like inverted rates), show more precision
    if (num > 0 && num < 1) {
       return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: minDecimals, maximumFractionDigits: maxDecimals });
  };

  const getConvertedAmount = () => {
    const val = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(val) || !rate) return '---';
    return formatNumber(val * rate);
  };

  const formattedRate = formatNumber(rate, 2, 4);
  const formattedParallelRate = parallelRate ? formatNumber(parallelRate, 2, 2) : '';

  const renderCurrencySelector = (selected: CurrencyCode, onChange: (c: CurrencyCode) => void) => (
    <div className="relative group">
      <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg shadow-sm border border-slate-200 hover:border-green-300 transition-colors cursor-pointer">
        <img 
          src={SUPPORTED_CURRENCIES[selected].flag} 
          alt={selected} 
          className="w-5 h-5 rounded-full object-cover shadow-sm" 
        />
        <span className="font-semibold text-slate-700">{selected}</span>
        <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
      </div>
      <select 
        value={selected}
        onChange={(e) => onChange(e.target.value as CurrencyCode)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      >
        {Object.entries(SUPPORTED_CURRENCIES).map(([code, details]) => (
          <option key={code} value={code}>
            {code} - {details.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-8 w-full max-w-lg mx-auto relative overflow-visible">
      
      {/* Header Info */}
      <div className="flex justify-between items-start mb-8">
        <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Rate</h2>
            <div className="flex items-baseline gap-2 flex-wrap">
                {loading ? (
                    <div className="h-8 w-32 bg-slate-100 animate-pulse rounded"></div>
                ) : (
                    <span className="text-3xl font-bold text-slate-800">
                        {SUPPORTED_CURRENCIES[toCurrency].symbol}{formattedRate} 
                        <span className="text-lg text-slate-400 font-normal ml-1">
                          / {SUPPORTED_CURRENCIES[fromCurrency].symbol}1
                        </span>
                    </span>
                )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
               {lastUpdated ? `Updated: ${lastUpdated}` : 'Waiting for update...'}
            </p>

            {/* Parallel Rate Display */}
            {!loading && parallelRate && parallelRate !== rate && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-slate-50 rounded-lg shadow-sm transform transition-all hover:scale-[1.02]">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs font-medium tracking-wide">
                  Parallel: {SUPPORTED_CURRENCIES[toCurrency].symbol}{formattedParallelRate}
                </span>
              </div>
            )}
        </div>
        <button 
            onClick={onRefresh}
            disabled={loading}
            className={`p-2.5 rounded-xl transition-all ${loading ? 'bg-slate-100 text-slate-300' : 'bg-green-50 text-green-600 hover:bg-green-100 active:scale-95'}`}
            title="Refresh Rates"
        >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Calculator Inputs */}
      <div className="space-y-4">
        
        {/* Input Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 transition-all">
          <label className="text-xs text-slate-500 font-medium ml-1">Amount</label>
          <div className="flex items-center mt-1">
            <span className="text-xl text-slate-400 font-medium mr-2 w-4 text-center">
                {SUPPORTED_CURRENCIES[fromCurrency].symbol}
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-3xl font-bold text-slate-800 w-full focus:outline-none placeholder-slate-300"
              placeholder="0.00"
            />
            <div className="ml-2 shrink-0">
              {renderCurrencySelector(fromCurrency, onFromChange)}
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="relative h-4 flex items-center justify-center z-10">
            <button 
                onClick={onSwap}
                className="absolute bg-white border border-slate-200 shadow-md p-2 rounded-full text-slate-500 hover:text-green-600 hover:border-green-200 hover:shadow-lg transition-all active:scale-90"
            >
                <ArrowRightLeft size={18} />
            </button>
            <div className="w-full border-t border-slate-200 border-dashed"></div>
        </div>

        {/* Output Card */}
        <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
          <label className="text-xs text-green-700 font-medium ml-1">Converted Amount</label>
          <div className="flex items-center mt-1 justify-between">
            <div className="flex items-center w-full">
                <span className="text-xl text-green-600/60 font-medium mr-2 w-4 text-center">
                    {SUPPORTED_CURRENCIES[toCurrency].symbol}
                </span>
                <span className="text-3xl font-bold text-green-800 break-all">
                    {getConvertedAmount()}
                </span>
            </div>
            <div className="ml-2 shrink-0">
               {renderCurrencySelector(toCurrency, onToChange)}
            </div>
          </div>
        </div>
      </div>

      {/* Grounding Sources */}
      {data?.sources && <SourceLinks sources={data.sources} />}
    </div>
  );
};