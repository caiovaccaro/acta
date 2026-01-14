'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  _count?: {
    questions: number;
    topicArticles: number;
  };
  moderationStatus: string;
}

interface TopicConvergenceModalProps {
  topics: Topic[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConvergenceResult {
  targetTopic: Topic;
  migratedQuestions: number;
  migratedTopicArticles: number;
  migratedTimelineEvents: number;
  deletedTopics: number;
}

export default function TopicConvergenceModal({
  topics,
  isOpen,
  onClose,
  onSuccess,
}: TopicConvergenceModalProps) {
  const [targetTopicId, setTargetTopicId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ConvergenceResult | null>(null);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  // Initialize target topic (default to first topic or topic with most questions)
  useEffect(() => {
    if (topics.length > 0 && !targetTopicId) {
      const topicWithMostQuestions = topics.reduce((prev, current) => {
        const prevCount = prev._count?.questions || 0;
        const currentCount = current._count?.questions || 0;
        return currentCount > prevCount ? current : prev;
      });
      setTargetTopicId(topicWithMostQuestions.id);
      setNewName(topicWithMostQuestions.name);
    }
  }, [topics, targetTopicId]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setError(null);
      setSuccess(null);
      setNewName('');
      setNewDescription('');
    }
  }, [isOpen]);

  const targetTopic = topics.find(t => t.id === targetTopicId);
  const sourceTopics = topics.filter(t => t.id !== targetTopicId);

  const totalQuestions = sourceTopics.reduce(
    (sum, t) => sum + (t._count?.questions || 0),
    0
  );
  const totalArticles = sourceTopics.reduce(
    (sum, t) => sum + (t._count?.topicArticles || 0),
    0
  );

  const handleSubmit = async () => {
    if (!targetTopicId) {
      setError('Please select a target topic');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/admin/api/topics/converge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTopicId,
          sourceTopicIds: sourceTopics.map(t => t.id),
          newName: newName.trim() || undefined,
          newDescription: newDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to converge topics');
      }

      const result: ConvergenceResult = await response.json();
      setSuccess(result);
      setStep('confirm');

      // Call onSuccess after a brief delay to show success message
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light">
          <h2 className="text-2xl font-black text-text-main">Converge Topics</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background-lighter rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="size-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {success ? (
            // Success State
            <div className="text-center py-8">
              <CheckCircle2 className="size-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-text-main mb-2">
                Topics Converged Successfully!
              </h3>
              <div className="text-text-muted space-y-1">
                <p>{success.migratedQuestions} questions migrated</p>
                <p>{success.migratedTopicArticles} articles migrated</p>
                <p>{success.migratedTimelineEvents} timeline events migrated</p>
                <p>{success.deletedTopics} topics deleted</p>
              </div>
            </div>
          ) : (
            <>
              {/* Selected Topics Summary */}
              <div>
                <h3 className="text-lg font-semibold text-text-main mb-3">
                  Selected Topics ({topics.length})
                </h3>
                <div className="space-y-2">
                  {topics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`p-3 rounded-lg border ${
                        topic.id === targetTopicId
                          ? 'border-primary-blue bg-primary-blue/5'
                          : 'border-border-light bg-background-lighter'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id={`topic-${topic.id}`}
                            name="targetTopic"
                            value={topic.id}
                            checked={targetTopicId === topic.id}
                            onChange={(e) => {
                              setTargetTopicId(e.target.value);
                              const selectedTopic = topics.find(t => t.id === e.target.value);
                              if (selectedTopic) {
                                setNewName(selectedTopic.name);
                              }
                            }}
                            className="size-4 text-primary-blue"
                            disabled={isSubmitting}
                          />
                          <label
                            htmlFor={`topic-${topic.id}`}
                            className="font-medium text-text-main cursor-pointer"
                          >
                            {topic.name}
                          </label>
                          {topic.id === targetTopicId && (
                            <span className="px-2 py-1 text-xs font-semibold bg-primary-blue text-white rounded">
                              Target
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-text-muted">
                          {topic._count?.questions || 0} questions,{' '}
                          {topic._count?.topicArticles || 0} articles
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Topic Customization */}
              {targetTopic && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-text-main">
                    Target Topic Customization
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Topic Name (optional)
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={targetTopic.name}
                      className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                      disabled={isSubmitting}
                    />
                    <p className="mt-1 text-xs text-text-muted">
                      Leave empty to keep current name: {targetTopic.name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Enter new description..."
                      rows={3}
                      className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {/* Migration Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="size-5" />
                  Migration Preview
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>
                    <strong>{totalQuestions}</strong> questions will be migrated to{' '}
                    <strong>{targetTopic?.name || 'target topic'}</strong>
                  </p>
                  <p>
                    <strong>{totalArticles}</strong> articles will be migrated (duplicates will be
                    handled automatically)
                  </p>
                  <p className="font-semibold text-red-700">
                    {sourceTopics.length} source topic(s) will be deleted
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border-light">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border-light rounded-lg hover:bg-background-lighter transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !targetTopicId}
              className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Converging...' : 'Converge Topics'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

