"use client";

import React, { useEffect, useState } from "react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
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

export default function SearchResults({ query, onNavigate }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setResults([]);

    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    fetch(url)
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (cancelled) return;

        const out: SearchResult[] = [];

        if (data.Redirect) {
          out.push({
            title: (data.Heading as string) || query,
            url: data.Redirect as string,
            snippet: (data.AbstractText as string) || "",
          });
        }

        if (data.AbstractURL && data.AbstractText) {
          out.push({
            title: (data.Heading as string) || query,
            url: data.AbstractURL as string,
            snippet: data.AbstractText as string,
          });
        }

        const results = data.Results as { Text: string; FirstURL: string }[] | undefined;
        if (results) {
          for (const r of results) {
            if (r.Text && r.FirstURL) {
              out.unshift({ title: r.Text, url: r.FirstURL, snippet: "" });
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
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [query]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="spinner mx-auto mb-3" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p className="text-sm text-chrome-text">Searching for &quot;{query}&quot;...</p>
        </div>
      </div>
    );
  }

  if (error && results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <p className="text-sm text-red-500 mb-3">Search failed: {error}</p>
          <p className="text-xs text-chrome-text">Try searching directly on a search engine.</p>
          <button
            className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            onClick={() => onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)}
          >
            Search on DuckDuckGo
          </button>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <p className="text-sm text-chrome-text mb-3">No results found for &quot;{query}&quot;</p>
          <button
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            onClick={() => onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)}
          >
            Search on DuckDuckGo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-[700px] mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-6 h-6 text-chrome-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
          </svg>
          <span className="text-[14px] text-chrome-textDark">{query}</span>
        </div>

        {results.map((r, i) => {
          const domain = extractDomain(r.url);
          return (
            <div
              key={i}
              className="mb-5 cursor-pointer group"
              onClick={() => onNavigate(r.url)}
            >
              <div className="text-[12px] text-chrome-text mb-0.5 truncate">
                {domain}
              </div>
              <h3 className="text-[18px] text-blue-700 group-hover:underline leading-snug mb-1">
                {r.title}
              </h3>
              {r.snippet && (
                <p className="text-[13px] text-chrome-text leading-relaxed">
                  {r.snippet}
                </p>
              )}
            </div>
          );
        })}

        <div className="mt-8 pt-4 border-t border-gray-200">
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`)}
          >
            See more results on DuckDuckGo →
          </button>
        </div>
      </div>
    </div>
  );
}
