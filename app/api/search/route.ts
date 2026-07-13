import { NextRequest } from "next/server";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchResponse {
  results: SearchResult[];
  abstract: { heading: string; text: string; url: string; source: string } | null;
  suggestions: string[];
  query: string;
  error?: string;
}

async function scrapeDDGHtml(q: string): Promise<SearchResult[]> {
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `q=${encodeURIComponent(q)}`,
    method: "POST",
  });
  const html = await res.text();
  const results: SearchResult[] = [];

  const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  const urls: string[] = [];
  const titles: string[] = [];
  const snippets: string[] = [];

  while ((match = resultRegex.exec(html)) !== null) {
    let url = match[1];
    const uddg = url.match(/uddg=([^&]+)/);
    if (uddg) url = decodeURIComponent(uddg[1]);
    urls.push(url);
    titles.push(match[2].replace(/<[^>]+>/g, "").trim());
  }

  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
  }

  for (let i = 0; i < urls.length; i++) {
    if (urls[i] && titles[i]) {
      results.push({
        title: titles[i],
        url: urls[i],
        snippet: snippets[i] || "",
      });
    }
  }

  return results;
}

async function fetchDDGSuggestions(q: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].slice(0, 8);
    }
  } catch {}
  return [];
}

async function fetchDDGInstantAnswer(q: string): Promise<{
  abstract: { heading: string; text: string; url: string; source: string } | null;
}> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
    );
    const data = await res.json();
    if (data.AbstractURL && data.AbstractText && data.AbstractText.length > 30) {
      return {
        abstract: {
          heading: data.Heading || q,
          text: data.AbstractText,
          url: data.AbstractURL,
          source: data.AbstractSource || "",
        },
      };
    }
  } catch {}
  return { abstract: null };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return Response.json({ results: [], abstract: null, suggestions: [], query: "" });
  }

  const response: SearchResponse = {
    results: [],
    abstract: null,
    suggestions: [],
    query: q,
  };

  const [results, suggestionsData, instantData] = await Promise.allSettled([
    scrapeDDGHtml(q),
    fetchDDGSuggestions(q),
    fetchDDGInstantAnswer(q),
  ]);

  if (results.status === "fulfilled") {
    response.results = results.value;
  }

  if (suggestionsData.status === "fulfilled") {
    response.suggestions = suggestionsData.value;
  }

  if (instantData.status === "fulfilled") {
    response.abstract = instantData.value.abstract;
  }

  if (results.status === "rejected" && (!response.results || response.results.length === 0)) {
    response.error = results.reason?.message || "Search failed";
  }

  return Response.json(response);
}
