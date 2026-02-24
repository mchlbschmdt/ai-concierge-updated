import React from 'react';
import { Download } from 'lucide-react';

export default function VersionHistory({ versions, currentVersionId, onSelectVersion }) {
  if (!versions || versions.length <= 1) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-foreground">Version History</p>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {versions.map((v, i) => (
          <div
            key={v.id}
            onClick={() => onSelectVersion(v)}
            className={`relative shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
              currentVersionId === v.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
            }`}
            style={{ width: 72, height: 54 }}
          >
            <img
              src={v.optimized_url || v.original_url}
              alt={`v${i + 1}`}
              className="w-full h-full object-cover"
            />
            {currentVersionId === v.id && (
              <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-primary" />
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-0.5">
              <p className="text-[8px] text-white font-medium truncate">v{v.version_number || i + 1}</p>
              {v.version_label && <p className="text-[7px] text-white/80 truncate">{v.version_label}</p>}
            </div>
            <a
              href={v.optimized_url || v.original_url}
              download
              onClick={(e) => e.stopPropagation()}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            >
              <Download className="w-3 h-3 text-white drop-shadow" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
