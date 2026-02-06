import React from 'react';
import { TrendingUp, Info } from 'lucide-react';

interface MarketInsightProps {
  summary: string;
  loading: boolean;
}

export const MarketInsight: React.FC<MarketInsightProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2 mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
        <div className="h-4 bg-blue-100 rounded w-1/4 mb-4"></div>
        <div className="h-3 bg-blue-100 rounded w-full"></div>
        <div className="h-3 bg-blue-100 rounded w-5/6"></div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-blue-100 rounded-full opacity-20 pointer-events-none"></div>
      
      <div className="flex items-start gap-3 relative z-10">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
          <TrendingUp size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
            Market Insight
            <span className="text-[10px] font-normal px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded-full">AI Analysis</span>
          </h3>
          <p className="text-sm text-blue-800/80 leading-relaxed">
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
};