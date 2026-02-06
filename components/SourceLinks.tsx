import React from 'react';
import { Source } from '../types';
import { ExternalLink } from 'lucide-react';

interface SourceLinksProps {
  sources: Source[];
}

export const SourceLinks: React.FC<SourceLinksProps> = ({ sources }) => {
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
        Verified Sources
      </h4>
      <div className="flex flex-wrap gap-2">
        {sources.slice(0, 3).map((source, idx) => (
          <a
            key={idx}
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200 transition-colors truncate max-w-[200px]"
            title={source.title}
          >
            <span className="truncate">{source.title}</span>
            <ExternalLink size={10} />
          </a>
        ))}
      </div>
    </div>
  );
};