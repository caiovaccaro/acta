'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ActionPicker() {
  const params = useParams();
  const router = useRouter();
  const questionId = params?.id as string;
  const [selectedOption, setSelectedOption] = useState<string>('open');

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const options = [
    { id: 'donate', label: 'Donate money to organizations' },
    { id: 'volunteer', label: 'Volunteer time and skills' },
    { id: 'advocate', label: 'Advocate and raise awareness' },
    { id: 'learn', label: 'Learn and educate myself' },
    { id: 'open', label: 'Open to any type' },
  ];

  const handleNext = () => {
    // For this demo, we'll just return to the question page or stay here.
    // In a real app, this would navigate to the specific action flow.
    router.push(`/questions/${questionId}`);
  };

  return (
    <main className="flex w-full flex-1 items-center justify-center py-10 px-4 bg-background-lighter min-h-screen">
      <div className="w-full max-w-xl rounded-xl border border-border-light bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-text-main mb-2">
          What type of action interests you most?
        </h1>
        <p className="text-text-muted mb-8 text-base">
          Choose the way you would prefer to contribute
        </p>

        <div className="space-y-4 mb-8">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="radio"
                name="action-type"
                value={option.id}
                checked={selectedOption === option.id}
                onChange={() => setSelectedOption(option.id)}
                className="h-5 w-5 border-gray-300 text-primary focus:ring-primary focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out"
              />
              <span className="text-base text-text-main group-hover:text-primary transition-colors">
                {option.label}
              </span>
            </label>
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full rounded-lg bg-background-dark text-white py-3.5 font-bold text-base hover:opacity-90 transition-opacity"
        >
          Next
        </button>
        
        <button 
          onClick={() => router.back()}
          className="w-full mt-4 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
        >
          Cancel
        </button>
      </div>
    </main>
  );
}




