"use client";

import React, { useEffect, useState, useRef } from "react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface AbstractResult {
  heading: string;
  text: string;
  url: string;
  source: string;
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

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return "";
  }
}

export default function SearchResults({ query, onNavigate }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [abstract, setAbstract] = useState<AbstractResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setResults([]);
    setAbstract(null);
    setSuggestions([]);

    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    fetch(url)
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (cancelled) return;

        if (data.AbstractURL && data.AbstractText) {
          setAbstract({
            heading: (data.Heading as string) || query,
            text: data.AbstractText as string,
            url: data.AbstractURL as string,
            source: (data.AbstractSource as string) || "",
          });
        }

        const out: SearchResult[] = [];

        if (data.Redirect) {
          out.push({
            title: (data.Heading as string) || query,
            url: data.Redirect as string,
            snippet: (data.AbstractText as string) || "",
          });
        }

        const ddgResults = data.Results as { Text: string; FirstURL: string }[] | undefined;
        if (ddgResults) {
          for (const r of ddgResults) {
            if (r.Text && r.FirstURL) {
              out.push({ title: r.Text, url: r.FirstURL, snippet: "" });
            }
          }
        }

        const topics = data.RelatedTopics as { Text?: string; FirstURL?: string; Topics?: { Text: string; FirstURL: string }[] }[] | undefined;
        if (topics) {
          for (const t of topics) {
            if (t.Topics) {
              for (const sub of t.Topics) {
                if (sub.Text && sub.FirstURL) {
                  out.push({
                    title: sub.Text.split(" - ")[0] || sub.Text.substring(0, 80),
                    url: sub.FirstURL,
                    snippet: sub.Text,
                  });
                }
              }
            } else if (t.Text && t.FirstURL) {
              out.push({
                title: t.Text.split(" - ")[0] || t.Text.substring(0, 80),
                url: t.FirstURL,
                snippet: t.Text,
              });
            }
          }
        }

        setResults(out);
        setLoading(false);

        const related = data.RelatedQueries as { Text: string; FirstURL: string }[] | undefined;
        if (related && related.length > 0) {
          setSuggestions(related.slice(0, 8).map((r) => r.Text));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const val = inputRef.current?.value?.trim();
      if (val) onNavigate(val);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center bg-white">
        <div className="w-full max-w-[700px] px-4 pt-8">
          <div className="flex items-center gap-3 mb-6">
            <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
            </svg>
            <span className="text-[14px] text-gray-600">{query}</span>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="mb-6 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="w-full max-w-[700px] mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
          <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            defaultValue={query}
            onKeyDown={handleKeyDown}
            className="flex-1 text-[15px] text-gray-800 bg-transparent outline-none"
          />
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
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
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="flex-1">
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
            </div>
          </div>
        )}

        {error && results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-red-500 mb-3">Search failed: {error}</p>
            <button
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)}
            >
              Search on DuckDuckGo
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 mb-3">No results found for &quot;{query}&quot;</p>
            <button
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)}
            >
              Search on DuckDuckGo
            </button>
          </div>
        ) : (
          <div>
            {results.map((r, i) => {
              const domain = extractDomain(r.url);
              const favicon = getFaviconUrl(r.url);
              return (
                <div
                  key={i}
                  className="mb-5 cursor-pointer group p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => onNavigate(r.url)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {favicon && (
                      <img src={favicon} alt="" className="w-4 h-4 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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

            <div className="mt-8 pt-4 border-t border-gray-100 text-center">
              <button
                className="text-[13px] text-blue-600 hover:underline"
                onClick={() => onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)}
              >
                See more results on DuckDuckGo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
