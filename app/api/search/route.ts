import { NextRequest } from "next/server";

interface DDGResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchDDGInstantAnswer(q: string): Promise<{ results: DDGResult[]; abstract: { heading: string; text: string; url: string; source: string } | null; suggestions: string[] }> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
  });
  const text = await res.text();
  if (!text || text.length === 0) throw new Error("Empty response from DDG API");
  const data = JSON.parse(text);

  const results: DDGResult[] = [];
  let abstract: { heading: string; text: string; url: string; source: string } | null = null;

  if (data.AbstractURL && data.AbstractText) {
    abstract = {
      heading: data.Heading || q,
      text: data.AbstractText,
      url: data.AbstractURL,
      source: data.AbstractSource || "",
    };
  }

  if (data.Redirect) {
    results.push({
      title: data.Heading || q,
      url: data.Redirect,
      snippet: data.AbstractText || "",
    });
  }

  if (data.Results) {
    for (const r of data.Results) {
      if (r.Text && r.FirstURL) {
        results.push({ title: r.Text, url: r.FirstURL, snippet: "" });
      }
    }
  }

  if (data.RelatedTopics) {
    for (const t of data.RelatedTopics) {
      if (t.Topics) {
        for (const sub of t.Topics) {
          if (sub.Text && sub.FirstURL) {
            results.push({
              title: sub.Text.split(" - ")[0] || sub.Text.substring(0, 80),
              url: sub.FirstURL,
              snippet: sub.Text,
            });
          }
        }
      } else if (t.Text && t.FirstURL) {
        results.push({
          title: t.Text.split(" - ")[0] || t.Text.substring(0, 80),
          url: t.FirstURL,
          snippet: t.Text,
        });
      }
    }
  }

  const suggestions: string[] = [];
  if (data.RelatedQueries) {
    for (const r of data.RelatedQueries) {
      if (r.Text) suggestions.push(r.Text);
    }
  }

  return { results, abstract, suggestions: suggestions.slice(0, 8) };
}

async function searchViaProxy(q: string): Promise<{ results: DDGResult[]; abstract: null; suggestions: string[] }> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await res.text();
  const results: DDGResult[] = [];

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
    results.push({
      title: titles[i] || "",
      url: urls[i],
      snippet: snippets[i] || "",
    });
  }

  return { results, abstract: null, suggestions: [] };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return Response.json({ results: [], abstract: null, suggestions: [], query: "" });
  }

  try {
    const data = await searchDDGInstantAnswer(q);
    if (data.results.length === 0 && !data.abstract) {
      try {
        const fallback = await searchViaProxy(q);
        return Response.json({ ...fallback, query: q });
      } catch {
        return Response.json({ ...data, query: q });
      }
    }
    return Response.json({ ...data, query: q });
  } catch {
    try {
      const fallback = await searchViaProxy(q);
      return Response.json({ ...fallback, query: q });
    } catch (fallbackError) {
      const msg = fallbackError instanceof Error ? fallbackError.message : "Unknown error";
      return Response.json({ results: [], abstract: null, suggestions: [], query: q, error: msg });
    }
  }
}
