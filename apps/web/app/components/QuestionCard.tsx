'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { QuestionCardDTO } from '@acta/shared';
import { getOutletLogoUrl } from '../../lib/utils/outletLogos';
import VerdictSlider from './VerdictSlider';

interface QuestionCardProps {
  question: QuestionCardDTO;
}

export default function QuestionCard({ question }: QuestionCardProps) {
  const verdictLabel = question.verdict?.verdictLabel;

  const outlets = question.outlets || [];
  const displayedOutlets = outlets.slice(0, 4);
  const remainingCount = Math.max(0, outlets.length - 4);

  // Topic eyebrow should link to topic page, rest of card links to question page
  return (
    <div className="flex flex-col rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-md border border-transparent hover:border-border-light group h-full">
      {/* Topic as Eyebrow - separate link to topic page */}
      <Link 
        href={`/topics/${question.topicId}`}
        onClick={(e) => e.stopPropagation()}
        className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 hover:text-primary-blue transition-colors"
      >
        {question.topicName}
      </Link>
      
      {/* Main card content - links to question page */}
      <Link 
        href={`/questions/${question.id}`} 
        className="flex flex-col flex-1"
      >
      
        {/* Question Text as Title */}
        <h3 className="text-2xl font-extrabold text-text-main leading-tight mb-3 group-hover:text-primary-blue transition-colors">
          {question.questionText}
        </h3>

        {/* Verdict Slider */}
        {verdictLabel && (
          <div className="mb-3">
            <VerdictSlider verdictLabel={verdictLabel} size="sm" />
          </div>
        )}
        
        {/* Context Blurb if available */}
        {question.contextBlurb && (
          <p className="text-sm text-text-muted leading-relaxed line-clamp-3 mb-4">
            {question.contextBlurb}
          </p>
        )}

        {/* Metadata: Journalist and Publication counts */}
        {(question.journalistCount !== undefined || question.publicationCount !== undefined) && (
          <div className="text-xs text-text-muted mb-4">
            {question.journalistCount !== undefined && (
              <span>
                <span className="font-bold text-text-main">{question.journalistCount.toLocaleString()}</span> journalists
              </span>
            )}
            {question.journalistCount !== undefined && question.publicationCount !== undefined && (
              <span className="mx-1">•</span>
            )}
            {question.publicationCount !== undefined && (
              <span>
                <span className="font-bold text-text-main">{question.publicationCount}</span> {question.publicationCount === 1 ? 'publication' : 'publications'}
              </span>
            )}
          </div>
        )}

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
              {question.verdict ? 'View Answer' : 'Read More'}
              <ArrowRight className="ml-1 size-4" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

