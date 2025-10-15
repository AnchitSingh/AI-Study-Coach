import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GlobalHeader from '../components/ui/GlobalHeader';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import Button from '../components/ui/Button';

const StoryPage = ({ storyContent, initialConfig, isStreaming, onNavigate }) => {
  const [currentStoryContent, setCurrentStoryContent] = useState(
    storyContent || { title: initialConfig?.topic, content: '', style: initialConfig?.storyStyle }
  );
  const contentEndRef = useRef(null);

  // Update content when storyContent prop changes
  useEffect(() => {
    if (storyContent) {
      setCurrentStoryContent(storyContent);
    }
  }, [storyContent]);

  const { title, content, style } = currentStoryContent;

  // Scroll to bottom when content updates during streaming
  useEffect(() => {
    if (isStreaming && contentEndRef.current) {
      contentEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content, isStreaming]);

  if (!currentStoryContent.content && isStreaming) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Generating your story in real-time...</p>
          <p className="text-slate-500 text-sm mt-2">
            Sit back and watch as we craft your personalized explanation!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen flex flex-col">
      <BackgroundEffects />
      <GlobalHeader currentPage="story" onNavigate={onNavigate} />

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto pt-24 pb-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Story Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-amber-200 shadow-sm mb-4">
              <span className="text-2xl">📖</span>
              <span className="text-sm font-medium text-amber-800">{style || 'Story Mode'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mt-4 mb-2">
              {title || 'Your Story'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Just now</span>
            </div>
          </div>

          {/* Story Content - Direct Display */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40 shadow-lg p-6 sm:p-8">
            <div className="prose prose-slate max-w-none story-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom styling for markdown elements
                  h1: ({ node, ...props }) => (
                    <h1
                      className="text-3xl font-bold text-slate-900 mt-8 mb-4 first:mt-0"
                      {...props}
                    />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2
                      className="text-2xl font-bold text-slate-800 mt-6 mb-3 first:mt-0"
                      {...props}
                    />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3
                      className="text-xl font-semibold text-slate-800 mt-5 mb-2 first:mt-0"
                      {...props}
                    />
                  ),
                  p: ({ node, ...props }) => (
                    <p
                      className="text-base text-slate-700 leading-relaxed mb-4 last:mb-0"
                      {...props}
                    />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul
                      className="list-disc list-inside space-y-2 text-base text-slate-700 my-4"
                      {...props}
                    />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol
                      className="list-decimal list-inside space-y-2 text-base text-slate-700 my-4"
                      {...props}
                    />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="text-base text-slate-700 leading-relaxed" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 border-amber-400 pl-4 py-2 my-4 italic text-slate-600 bg-amber-50/50 rounded-r-lg"
                      {...props}
                    />
                  ),
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <code
                        className="px-2 py-1 bg-slate-100 text-amber-700 rounded text-sm font-mono"
                        {...props}
                      />
                    ) : (
                      <code
                        className="block p-4 bg-slate-900 text-slate-100 rounded-lg text-sm font-mono overflow-x-auto my-4"
                        {...props}
                      />
                    ),
                  pre: ({ node, ...props }) => (
                    <pre className="bg-slate-900 rounded-lg overflow-hidden my-4" {...props} />
                  ),
                  a: ({ node, ...props }) => (
                    <a
                      className="text-amber-600 hover:text-amber-700 underline font-medium"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-bold text-slate-900" {...props} />
                  ),
                  em: ({ node, ...props }) => <em className="italic text-slate-700" {...props} />,
                  hr: ({ node, ...props }) => (
                    <hr className="my-8 border-t-2 border-slate-200" {...props} />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table
                        className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg"
                        {...props}
                      />
                    </div>
                  ),
                  thead: ({ node, ...props }) => <thead className="bg-slate-50" {...props} />,
                  th: ({ node, ...props }) => (
                    <th
                      className="px-4 py-2 text-left text-sm font-semibold text-slate-900"
                      {...props}
                    />
                  ),
                  td: ({ node, ...props }) => (
                    <td
                      className="px-4 py-2 text-sm text-slate-700 border-t border-slate-200"
                      {...props}
                    />
                  ),
                }}
              >
                {content || 'No content generated.'}
              </ReactMarkdown>
            </div>
          </div>

          {/* Scroll anchor */}
          <div ref={contentEndRef} />
        </div>
      </main>
      <style>{`
      .story-content p,
      .story-content li {
        font-size: 1rem !important;
      }
      
      .story-content ul,
      .story-content ol {
        font-size: 1rem !important;
      }
      
      .story-content blockquote {
        font-size: 1rem !important;
      }
      
      .story-content h4,
      .story-content h5,
      .story-content h6 {
        font-size: 1rem !important;
      }
    `}</style>
    </div>
  );
};

export default StoryPage;
