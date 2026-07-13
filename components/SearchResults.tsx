"use client";

import React, { useEffect, useState } from "react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchData {
  results: SearchResult[];
  abstract: { heading: string; text: string; url: string; source: string } | null;
  suggestions: string[];
  query: string;
  error?: string;
}

interface SearchResultsProps {
  query: string;
  onNavigate: (url: string) => void;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function faviconProxy(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `/api/proxy?url=${encodeURIComponent(`https://www.google.com/s2/favicons?domain=${domain}&sz=16`)}`;
  } catch {
    return "";
  }
}

export default function SearchResults({ query, onNavigate }: SearchResultsProps) {
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);

    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((result: SearchData) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [query]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="w-full max-w-[700px] mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="spinner" />
            <span className="text-sm text-gray-500">Searching...</span>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="mb-6 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const results = data?.results || [];
  const abstract = data?.abstract;
  const suggestions = data?.suggestions || [];

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="w-full max-w-[700px] mx-auto px-4 py-4">
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onNavigate(s)}
                className="text-[13px] text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {abstract && (
          <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-[16px] font-medium text-gray-900 mb-1">{abstract.heading}</h3>
            <p className="text-[13px] text-gray-600 leading-relaxed mb-2">{abstract.text}</p>
            {abstract.source && (
              <button
                onClick={() => onNavigate(abstract.url)}
                className="text-[12px] text-blue-600 hover:underline"
              >
                Read more on {abstract.source}
              </button>
            )}
          </div>
        )}

        {results.length === 0 ? (
          <div className="text-center py-12">
            {data?.error ? (
              <p className="text-sm text-red-500 mb-3">Search failed: {data.error}</p>
            ) : (
              <p className="text-sm text-gray-500 mb-4">No results found for &quot;{query}&quot;</p>
            )}
            <button
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)}
            >
              Search on DuckDuckGo
            </button>
          </div>
        ) : (
          <>
            {results.map((r, i) => {
              const domain = extractDomain(r.url);
              const favicon = faviconProxy(r.url);
              return (
                <div
                  key={i}
                  className="mb-4 cursor-pointer group p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => onNavigate(r.url)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {favicon && (
                      <img
                        src={favicon}
                        alt=""
                        className="w-4 h-4 rounded-sm"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <span className="text-[12px] text-gray-500 truncate">{domain}</span>
                    <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <h3 className="text-[16px] text-blue-700 group-hover:underline leading-snug mb-1">
                    {r.title}
                  </h3>
                  {r.snippet && (
                    <p className="text-[13px] text-gray-600 leading-relaxed line-clamp-2">
                      {r.snippet}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <button
                className="text-[13px] text-blue-600 hover:underline"
                onClick={() => onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)}
              >
                See more results on DuckDuckGo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
