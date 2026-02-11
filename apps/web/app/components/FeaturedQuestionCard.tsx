'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { TopicDTO } from '@acta/shared';
import { getOutletLogoUrl } from '../../lib/utils/outletLogos';
import VerdictSlider from './VerdictSlider';

interface FeaturedQuestionCardProps {
  topic: TopicDTO;
  questionId: string;
}

export default function FeaturedQuestionCard({ topic, questionId }: FeaturedQuestionCardProps) {
  // Get the main / first question summary for display
  const firstQuestion = topic.firstQuestion;
  const verdictLabel = firstQuestion?.verdict?.verdictLabel;
  
  // Get outlets for the first question (if available)
  const topicWithOutlets = topic as any;
  const outlets = topicWithOutlets.firstQuestionOutlets || [];
  const displayedOutlets = outlets.slice(0, 4);
  const remainingCount = Math.max(0, outlets.length - 4);

  return (
    <Link 
      href={`/questions/${questionId}`} 
      className="flex flex-col rounded-xl bg-white p-8 md:p-10 shadow-sm transition-all hover:shadow-md border border-border-light hover:border-border-light group h-full"
    >
      {/* Category / Theme as Eyebrow */}
      <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
        {topic.name}
      </p>
      
      {/* Title / Question Highlighted - Larger for featured */}
      <h3 className="text-3xl md:text-4xl font-extrabold text-text-main leading-tight mb-3 group-hover:text-primary-blue transition-colors">
        {firstQuestion?.questionText || 'No questions yet'}
      </h3>

      {verdictLabel && (
        <div className="mb-3">
          <VerdictSlider verdictLabel={verdictLabel} size="sm" />
        </div>
      )}

      {/* Excerpt of Content - Larger for featured */}
      <p className="text-base md:text-lg text-text-muted leading-relaxed line-clamp-3 mb-6">
        {firstQuestion?.contextBlurb ||
          topic.description ||
          'Explore this topic to understand the debate.'}
      </p>
      
      {/* Metadata & Footer */}
      <div className="mt-auto pt-4 border-t border-border-light/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center -space-x-2 overflow-hidden py-1">
            {displayedOutlets.length > 0 ? (
              <>
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
              </>
            ) : (
              <div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-gray-400 text-[10px] font-semibold text-white">
                -
              </div>
            )}
          </div>

          <div className="inline-flex items-center text-sm font-semibold text-primary-blue group-hover:translate-x-1 transition-transform">
            {firstQuestion?.verdict ? 'View Answer' : 'Read More'}
            <ArrowRight className="ml-1 size-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

