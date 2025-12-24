'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { QuestionCardDTO } from '@acta/shared';
import { getOutletLogoUrl } from '../../lib/utils/outletLogos';

interface QuestionCardProps {
  question: QuestionCardDTO;
}

function getVerdictColor(verdict: string | undefined) {
  if (!verdict) return 'text-verdict-unclear';
  switch (verdict) {
    case 'YesItSeemsSo':
    case 'ProbablyYes':
      return 'text-verdict-yes';
    case 'NoItDoesntSeemSo':
    case 'ProbablyNot':
      return 'text-verdict-no';
    case 'Unclear':
      return 'text-verdict-unclear';
    default:
      return 'text-text-main';
  }
}

export default function QuestionCard({ question }: QuestionCardProps) {
  const verdictLabel = question.verdict?.verdictLabel;
  const getVerdictTextFromLabel = (label: string | undefined) => {
    if (!label) return 'Unclear.';
    switch (label) {
      case 'YesItSeemsSo': return 'Yes, it seems so.';
      case 'ProbablyYes': return 'Probably yes.';
      case 'NoItDoesntSeemSo': return "No, it doesn't seem so.";
      case 'ProbablyNot': return 'Probably not.';
      case 'Unclear': return 'Unclear.';
      default: return 'Unclear.';
    }
  };
  const verdictText = getVerdictTextFromLabel(verdictLabel);

  const outlets = question.outlets || [];
  const displayedOutlets = outlets.slice(0, 4);
  const remainingCount = Math.max(0, outlets.length - 4);

  // Link to question detail page using question ID
  return (
    <Link 
      href={`/questions/${question.id}`} 
      className="flex flex-col rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-md border border-transparent hover:border-border-light group h-full"
    >
      {/* Topic as Eyebrow */}
      <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
        {question.topicName}
      </p>
      
      {/* Question Text as Title */}
      <h3 className="text-2xl font-extrabold text-text-main leading-tight mb-3 group-hover:text-primary-blue transition-colors">
        {question.questionText}
      </h3>
      
      {/* Verdict / Stance */}
      <p className={`text-base font-bold ${getVerdictColor(verdictLabel || 'UNCLEAR')} mb-3`}>
        {verdictText}
      </p>

      {/* Metadata & Footer */}
      <div className="mt-auto pt-4 border-t border-border-light/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center -space-x-2 overflow-hidden py-1">
            {displayedOutlets.map((outlet) => {
              const logoUrl = getOutletLogoUrl(outlet.name);
              return (
                <img
                  key={outlet.id}
                  alt={`${outlet.name} logo`}
                  className="size-8 rounded-full border-2 border-white object-cover bg-white"
                  src={logoUrl}
                  title={outlet.name}
                />
              );
            })}
            {remainingCount > 0 && (
              <div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-gray-400 text-[10px] font-semibold text-white">
                +{remainingCount}
              </div>
            )}
            {outlets.length === 0 && (
              <div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[10px] font-semibold text-text-muted">
                -
              </div>
            )}
          </div>

          <div className="inline-flex items-center text-sm font-semibold text-primary-blue group-hover:translate-x-1 transition-transform">
            Read
            <ArrowRight className="ml-1 size-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

