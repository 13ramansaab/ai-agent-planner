import { useState } from 'react';
import { Sparkles, Plus, X } from 'lucide-react';

type ProjectFormProps = {
  onSubmit: (name: string, description: string, competitorLinks: string[], competitorReviews: string[]) => void;
  isLoading?: boolean;
};

export function ProjectForm({ onSubmit, isLoading }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [competitorLinks, setCompetitorLinks] = useState<string[]>(['']);
  const [competitorReviews, setCompetitorReviews] = useState<string[]>(['']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && description.trim()) {
      const filteredLinks = competitorLinks.filter(l => l.trim());
      const filteredReviews = competitorReviews.filter(r => r.trim());
      onSubmit(name.trim(), description.trim(), filteredLinks, filteredReviews);
    }
  };

  const addCompetitorLink = () => {
    setCompetitorLinks([...competitorLinks, '']);
  };

  const removeCompetitorLink = (index: number) => {
    setCompetitorLinks(competitorLinks.filter((_, i) => i !== index));
  };

  const updateCompetitorLink = (index: number, value: string) => {
    const updated = [...competitorLinks];
    updated[index] = value;
    setCompetitorLinks(updated);
  };

  const addCompetitorReview = () => {
    setCompetitorReviews([...competitorReviews, '']);
  };

  const removeCompetitorReview = (index: number) => {
    setCompetitorReviews(competitorReviews.filter((_, i) => i !== index));
  };

  const updateCompetitorReview = (index: number, value: string) => {
    const updated = [...competitorReviews];
    updated[index] = value;
    setCompetitorReviews(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900">AI Agent Planning System</h1>
        <p className="text-lg text-gray-600">
          Transform your idea into a complete implementation plan
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
            Project Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Task Management App"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
            Project Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your project idea in detail. Include the problem you're solving, target users, key features, and any technical preferences..."
            rows={8}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
            disabled={isLoading}
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            The more detail you provide, the better the AI agents can plan your project
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Optional: Competitor Research</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Competitor Links
              </label>
              {competitorLinks.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => updateCompetitorLink(index, e.target.value)}
                    placeholder="https://competitor.com"
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                    disabled={isLoading}
                  />
                  {competitorLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCompetitorLink(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      disabled={isLoading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCompetitorLink}
                className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4" />
                Add another link
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Reviews / Feedback
              </label>
              {competitorReviews.map((review, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <textarea
                    value={review}
                    onChange={(e) => updateCompetitorReview(index, e.target.value)}
                    placeholder="Paste user reviews, feedback, or pain points..."
                    rows={3}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none text-sm"
                    disabled={isLoading}
                  />
                  {competitorReviews.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCompetitorReview(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      disabled={isLoading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCompetitorReview}
                className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4" />
                Add another review
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Adding competitor research helps our AI identify opportunities and gaps in the market
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !name.trim() || !description.trim()}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Planning in progress...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Plan
            </>
          )}
        </button>
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>Planning includes: Research Analysis, Strategy, UX, System Architecture, Data Model, API, UI Design, Implementation Prompts, QA Manager, Technical Docs, Critic Review, and Final Composition</p>
      </div>
    </form>
  );
}
