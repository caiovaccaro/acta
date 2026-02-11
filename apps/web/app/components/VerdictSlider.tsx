'use client';

import type { VerdictLabel } from '@acta/shared';
import { verdictLabelToPosition } from '../../lib/utils/verdictUi';

interface VerdictSliderProps {
  verdictLabel?: VerdictLabel;
  size?: 'sm' | 'lg';
  showPointer?: boolean;
  className?: string;
}

export default function VerdictSlider({
  verdictLabel,
  size = 'sm',
  showPointer = true,
  className = '',
}: VerdictSliderProps) {
  const isSmall = size === 'sm';
  const position = verdictLabelToPosition(verdictLabel);
  const pointerOffset = isSmall ? 6 : 8;

  return (
    <div className={`w-full ${className}`}>
      <div className={`relative ${isSmall ? 'pt-4' : 'pt-6'}`}>
        {showPointer && (
          <div
            className={`absolute top-0 z-20 h-0 w-0 border-l-transparent border-r-transparent border-t-text-main ${
              isSmall
                ? 'border-l-[6px] border-r-[6px] border-t-[8px]'
                : 'border-l-[8px] border-r-[8px] border-t-[12px]'
            }`}
            style={{
              left: `calc(${position}% - ${pointerOffset}px)`,
              transition: 'left 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        )}

        <div
          className={`relative flex w-full overflow-hidden rounded-full border border-border-light/40 ${
            isSmall ? 'h-4' : 'h-8'
          }`}
        >
          <div
            className="absolute inset-0 h-full w-full"
            style={{
              background: 'linear-gradient(to right, #C62828 0%, #F9A825 50%, #2E7D32 100%)',
            }}
          />

          <div className="pointer-events-none absolute inset-0 flex">
            <div className="h-full w-1/3 border-r border-white/20" />
            <div className="h-full w-1/3 border-r border-white/20" />
            <div className="h-full w-1/3" />
          </div>

          <div
            className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-between ${
              isSmall ? 'px-3' : 'px-5'
            }`}
          >
            <span className={`font-black uppercase tracking-wider text-white ${isSmall ? 'text-[8px]' : 'text-[10px]'}`}>
              No
            </span>
            <span className={`font-black uppercase tracking-wider text-white ${isSmall ? 'text-[8px]' : 'text-[10px]'}`}>
              Yes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
