'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TopicDTO } from '@acta/shared';

interface FeaturedTopicsCarouselProps {
  topics: TopicDTO[];
}

const CARD_COLORS = ['#F3F0EB', '#DDE7F2', '#E4ECE4', '#E7E7EA', '#E6DEEE', '#EFE9DF'];

function chunkTopics(topics: TopicDTO[], chunkSize: number): TopicDTO[][] {
  const chunks: TopicDTO[][] = [];
  for (let i = 0; i < topics.length; i += chunkSize) {
    chunks.push(topics.slice(i, i + chunkSize));
  }
  return chunks;
}

export default function FeaturedTopicsCarousel({ topics }: FeaturedTopicsCarouselProps) {
  const slides = useMemo(() => chunkTopics(topics, 3), [topics]);
  const [page, setPage] = useState(0);

  if (!topics.length) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted">No featured topics yet.</p>
      </div>
    );
  }

  const maxPage = Math.max(0, slides.length - 1);
  const currentSlide = slides[Math.min(page, maxPage)] || [];

  const goTo = (nextPage: number) => {
    if (!slides.length) return;
    if (nextPage < 0) {
      setPage(maxPage);
      return;
    }
    if (nextPage > maxPage) {
      setPage(0);
      return;
    }
    setPage(nextPage);
  };

  return (
    <div className="w-full">
      <div className="md:hidden">
        <div className="grid grid-cols-1 gap-4">
          {currentSlide.map((topic, idx) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.id}`}
              className="group relative flex min-h-[4.5rem] flex-col justify-end rounded-3xl p-4 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden"
              style={{ backgroundColor: CARD_COLORS[(page * 3 + idx) % CARD_COLORS.length] }}
            >
              <h3 className="text-base font-bold text-[#111621] tracking-tighter leading-tight line-clamp-2">
                {topic.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>

      <div className="hidden md:block">
        <div className="relative">
          {slides.length > 1 && (
            <button
              type="button"
              onClick={() => goTo(page - 1)}
              aria-label="Previous topics slide"
              className="absolute top-1/2 z-10 -translate-y-1/2 md:-left-10 lg:-left-14 size-11 rounded-full bg-white border border-border-light shadow-sm hover:shadow-md transition-shadow flex items-center justify-center"
            >
              <ChevronLeft className="size-5 text-text-main" />
            </button>
          )}

          <div className="grid grid-cols-3 gap-6">
            {currentSlide.map((topic, idx) => (
              <Link
                key={topic.id}
                href={`/topics/${topic.id}`}
                className="group relative flex min-h-52 flex-col justify-end rounded-3xl p-8 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                style={{ backgroundColor: CARD_COLORS[(page * 3 + idx) % CARD_COLORS.length] }}
              >
                <h3 className="text-2xl font-bold text-[#111621] tracking-tighter leading-tight line-clamp-2">
                  {topic.name}
                </h3>
                {topic.description && (
                  <p className="text-sm text-[#111621]/60 font-medium line-clamp-3">
                    {topic.description}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {slides.length > 1 && (
            <button
              type="button"
              onClick={() => goTo(page + 1)}
              aria-label="Next topics slide"
              className="absolute top-1/2 z-10 -translate-y-1/2 md:-right-10 lg:-right-14 size-11 rounded-full bg-white border border-border-light shadow-sm hover:shadow-md transition-shadow flex items-center justify-center"
            >
              <ChevronRight className="size-5 text-text-main" />
            </button>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPage(idx)}
              aria-label={`Go to topics slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                idx === page ? 'w-8 bg-text-muted' : 'w-4 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
