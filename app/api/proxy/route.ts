import { NextRequest } from "next/server";

export const runtime = "edge";

function isSearchEngine(url: string): boolean {
  return /google\.com\/search|duckduckgo\.com|bing\.com\/search|yahoo\.com\/search/i.test(url);
}

function rewriteResourceUrls(html: string, origin: string): string {
  const proxyPrefix = "/api/proxy?url=";

  function resolveRelative(href: string): string {
    try {
      return new URL(href, origin + "/").href;
    } catch {
      return href;
    }
  }

  function rewriteAttr(match: string, attr: string, quote: string, value: string): string {
    if (value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("javascript:") || value.startsWith("#") || value === "") {
      return match;
    }
    let absUrl = value;
    if (!value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("//") && !value.startsWith("/")) {
      absUrl = resolveRelative(value);
    } else if (value.startsWith("//")) {
      absUrl = "https:" + value;
    } else if (value.startsWith("/")) {
      absUrl = origin + value;
    }
    if (absUrl.startsWith("http://") || absUrl.startsWith("https://")) {
      return `${attr}=${quote}${proxyPrefix}${encodeURIComponent(absUrl)}${quote}`;
    }
    return match;
  }

  html = html.replace(/((?:src|poster|data-src|data-original|data-lazy-src))=(["'])([^"']*?)\2/gi, (m, attr, q, val) => rewriteAttr(m, attr, q, val));

  html = html.replace(/((?:href|src|action))=(["'])([^"']*?)\2/gi, (m, attr, q, val) => {
    if (/\.css(\?[^"']*)?$/i.test(val) || val.includes("/css/") || val.includes("stylesheet")) {
      return rewriteAttr(m, attr, q, val);
    }
    if (/\.js(\?[^"']*)?$/i.test(val) || val.includes("/js/") || val.includes("script")) {
      return rewriteAttr(m, attr, q, val);
    }
    if (/\.(png|jpe?g|gif|svg|webp|ico|bmp|tiff?|avif|mp4|webm|ogg|mp3|wav|flac|avi|mov|mkv)(\?[^"']*)?$/i.test(val)) {
      return rewriteAttr(m, attr, q, val);
    }
    if (/\.(woff2?|ttf|eot|otf)(\?[^"']*)?$/i.test(val)) {
      return rewriteAttr(m, attr, q, val);
    }
    return m;
  });

  return html;
}

const NAVIGATOR_SCRIPT = `
<script>
(function(){
  var fakeOrigin = '__ORIGIN__';
  var fakeLocation = {
    href: fakeOrigin + location.pathname + location.search + location.hash,
    origin: fakeOrigin,
    protocol: 'https:',
    host: fakeOrigin.replace('https://',''),
    hostname: fakeOrigin.replace('https://',''),
    port: '',
    pathname: location.pathname.replace(/^\\/api\\/proxy\\?url=[^&]*&?/,'') || '/',
    search: '',
    hash: '',
    ancestorOrigins: { length: 0 },
    assign: function(u){ window.parent.postMessage({__nav:true,url:u},'*'); },
    replace: function(u){ window.parent.postMessage({__nav:true,url:u},'*'); },
    reload: function(){ window.parent.postMessage({__nav:true,url:fakeOrigin + location.pathname},'*'); },
    toString: function(){ return this.href; }
  };
  try {
    Object.defineProperty(window, 'location', {
      get: function(){ return fakeLocation; },
      set: function(u){ window.parent.postMessage({__nav:true,url:u},'*'); },
      configurable: false
    });
  } catch(e){}

  function proxyUrl(href) {
    try {
      var u = new URL(href, fakeOrigin);
      return '/api/proxy?url=' + encodeURIComponent(u.href);
    } catch(e) { return null; }
  }

  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a || !a.href) return;
    if (a.target === '_blank') {
      e.preventDefault();
      window.parent.postMessage({__nav:true, url: a.href}, '*');
      return;
    }
    var href = a.href;
    if (href.startsWith('javascript:')) return;
    e.preventDefault();
    window.parent.postMessage({__nav:true, url: href}, '*');
  }, true);

  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form.action) return;
    e.preventDefault();
    var u;
    try { u = new URL(form.action, fakeOrigin); } catch(err) { return; }
    var method = (form.method || 'GET').toUpperCase();
    if (method === 'GET') {
      var fd = new FormData(form);
      var params = new URLSearchParams(fd).toString();
      u.search = params;
    }
    window.parent.postMessage({__nav:true, url: u.href}, '*');
  }, true);
})();
</script>`;

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const decodedUrl = decodeURIComponent(targetUrl);

  try {
    const upstream = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
      },
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      const headers = new Headers();
      for (const h of ["content-type", "cache-control", "etag", "content-length"]) {
        const val = upstream.headers.get(h);
        if (val) headers.set(h, val);
      }
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    let html = await upstream.text();
    const urlObj = new URL(decodedUrl);
    const origin = urlObj.origin;
    const isSearch = isSearchEngine(decodedUrl);

    if (isSearch) {
      html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
      html = html.replace(/<script\b[^>]*\/?>/gi, "");
      html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, "");
      html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
    }

    html = rewriteResourceUrls(html, origin);

    const metaCsp = '<meta http-equiv="Content-Security-Policy" content="frame-ancestors *;">';
    if (html.includes("<head")) {
      html = html.replace(/(<head[^>]*>)/i, `$1${metaCsp}`);
    } else {
      html = metaCsp + html;
    }

    if (!html.includes("<base ")) {
      const baseTag = `<base href="${origin}/" target="_self">`;
      if (html.includes("<head")) {
        html = html.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
      } else {
        html = baseTag + html;
      }
    }

    const scriptTag = NAVIGATOR_SCRIPT.replace("__ORIGIN__", origin);
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${scriptTag}</body>`);
    } else if (html.includes("</html>")) {
      html = html.replace("</html>", `${scriptTag}</html>`);
    } else {
      html += scriptTag;
    }

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: `Failed to fetch: ${msg}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
