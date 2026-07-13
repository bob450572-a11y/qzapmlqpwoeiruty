import { NextRequest } from "next/server";

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

  function makeProxyUrl(absUrl: string): string {
    return `${proxyPrefix}${encodeURIComponent(absUrl)}`;
  }

  function rewriteAttr(match: string, attr: string, quote: string, value: string): string {
    if (value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("javascript:") || value.startsWith("#") || value === "" || value.startsWith("mailto:") || value.startsWith("tel:")) {
      return match;
    }
    let absUrl = value;
    if (value.startsWith("//")) {
      absUrl = "https:" + value;
    } else if (value.startsWith("/")) {
      absUrl = origin + value;
    } else if (!value.startsWith("http://") && !value.startsWith("https://")) {
      absUrl = resolveRelative(value);
    }
    if (absUrl.startsWith("http://") || absUrl.startsWith("https://")) {
      return `${attr}=${quote}${makeProxyUrl(absUrl)}${quote}`;
    }
    return match;
  }

  html = html.replace(/((?:src|poster|data-src|data-original|data-lazy-src|data-bg|data-background|background))=(["'])([^"']*?)\2/gi, (m, attr, q, val) => rewriteAttr(m, attr, q, val));

  html = html.replace(/((?:href|src|action|cite|longdesc|profile|usemap|classid|codebase|data))=(["'])([^"']*?)\2/gi, (m, attr, q, val) => {
    if (/\.css(\?[^"']*)?$/i.test(val) || val.includes("/css/") || val.includes("stylesheet")) {
      return rewriteAttr(m, attr, q, val);
    }
    if (/\.js(\?[^"']*)?$/i.test(val) || val.includes("/js/") || val.includes("/scripts/")) {
      return rewriteAttr(m, attr, q, val);
    }
    if (/\.(png|jpe?g|gif|svg|webp|ico|bmp|tiff?|avif|mp4|webm|ogg|mp3|wav|flac|avi|mov|mkv|m3u8|ts|f4v|flv|3gp)(\?[^"']*)?$/i.test(val)) {
      return rewriteAttr(m, attr, q, val);
    }
    if (/\.(woff2?|ttf|eot|otf|collection)(\?[^"']*)?$/i.test(val)) {
      return rewriteAttr(m, attr, q, val);
    }
    if (/\.(json|xml|rss|atom|txt)(\?[^"']*)?$/i.test(val)) {
      return rewriteAttr(m, attr, q, val);
    }
    return m;
  });

  html = html.replace(/((?:srcset))=(["'])([^"']*?)\2/gi, (m, attr, q, val) => {
    const rewritten = val.split(",").map((part: string) => {
      const trimmed = part.trim();
      const pieces = trimmed.split(/\s+/);
      if (pieces.length === 0) return part;
      let imgUrl = pieces[0];
      if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
      else if (imgUrl.startsWith("/")) imgUrl = origin + imgUrl;
      else if (!imgUrl.startsWith("http://") && !imgUrl.startsWith("https://")) imgUrl = resolveRelative(imgUrl);
      if (imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) {
        pieces[0] = makeProxyUrl(imgUrl);
      }
      return pieces.join(" ");
    }).join(", ");
    return `${attr}=${q}${rewritten}${q}`;
  });

  html = html.replace(/url\((["']?)([^"')]+?)\1\)/gi, (m, q, url) => {
    if (url.startsWith("data:") || url.startsWith("#") || url.startsWith("about:")) return m;
    let absUrl = url;
    if (url.startsWith("//")) absUrl = "https:" + url;
    else if (url.startsWith("/")) absUrl = origin + url;
    else if (!url.startsWith("http://") && !url.startsWith("https://")) absUrl = resolveRelative(url);
    if (absUrl.startsWith("http://") || absUrl.startsWith("https://")) {
      return `url(${q || "'"}${makeProxyUrl(absUrl)}${q || "'"})`;
    }
    return m;
  });

  return html;
}

const NAVIGATOR_SCRIPT = `
<script>
(function(){
  var fakeOrigin = '__ORIGIN__';
  var proxyBase = '/api/proxy?url=';
  var fakeHref = fakeOrigin + location.pathname.replace(/^\\/api\\/proxy\\?url=[^&]*&?/,'') + location.search.replace(/^\\?url=[^&]*&?/,'') + location.hash;
  var fakeLocation = {
    href: fakeHref,
    origin: fakeOrigin,
    protocol: 'https:',
    host: fakeOrigin.replace('https://',''),
    hostname: fakeOrigin.replace('https://',''),
    port: '',
    pathname: location.pathname.replace(/^\\/api\\/proxy\\?url=[^&]*&?/,'') || '/',
    search: location.search.replace(/^\\?url=[^&]*&?/,''),
    hash: location.hash,
    ancestorOrigins: { length: 0 },
    assign: function(u){ window.parent.postMessage({__nav:true,url:u},'*'); },
    replace: function(u){ window.parent.postMessage({__nav:true,url:u},'*'); },
    reload: function(){ window.parent.postMessage({__nav:true,url:fakeOrigin + fakeLocation.pathname},'*'); },
    toString: function(){ return this.href; }
  };

  function rewriteGetters(obj, props) {
    props.forEach(function(p) {
      Object.defineProperty(obj, p, {
        get: function() {
          if (p === 'href') return fakeLocation.href;
          if (p === 'origin') return fakeOrigin;
          if (p === 'protocol') return 'https:';
          if (p === 'host' || p === 'hostname') return fakeOrigin.replace('https://','');
          if (p === 'port') return '';
          if (p === 'pathname') return fakeLocation.pathname;
          if (p === 'search') return fakeLocation.search;
          if (p === 'hash') return fakeLocation.hash;
          return '';
        },
        configurable: false
      });
    });
  }

  try {
    Object.defineProperty(window, 'location', {
      get: function(){ return fakeLocation; },
      set: function(u){ window.parent.postMessage({__nav:true,url:u},'*'); },
      configurable: false
    });
  } catch(e){}

  try {
    var proto = Location.prototype;
    Object.defineProperty(proto, 'href', {
      get: function(){ return fakeLocation.href; },
      set: function(u){ window.parent.postMessage({__nav:true,url:u},'*'); },
    });
    Object.defineProperty(proto, 'pathname', {
      get: function(){ return fakeLocation.pathname; },
      set: function(){},
    });
    Object.defineProperty(proto, 'search', {
      get: function(){ return fakeLocation.search; },
      set: function(){},
    });
    Object.defineProperty(proto, 'hash', {
      get: function(){ return fakeLocation.hash; },
      set: function(){},
    });
    Object.defineProperty(proto, 'origin', {
      get: function(){ return fakeOrigin; },
      set: function(){},
    });
  } catch(e){}

  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a || !a.href) return;
    var href = a.href;
    if (href.startsWith('javascript:')) return;
    e.preventDefault();
    if (a.target === '_blank') {
      window.parent.postMessage({__nav:true, url: href, newTab: true}, '*');
    } else {
      window.parent.postMessage({__nav:true, url: href}, '*');
    }
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

  try {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/api/')) {
        try { url = new URL(url, fakeOrigin).href; } catch(e) {}
      }
      return origOpen.apply(this, arguments);
    };
  } catch(e){}

  try {
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string' && !input.startsWith('http') && !input.startsWith('/api/')) {
        try { input = new URL(input, fakeOrigin).href; } catch(e) {}
      }
      return origFetch.call(this, input, init);
    };
  } catch(e){}
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      const headers = new Headers();
      for (const h of ["content-type", "cache-control", "etag", "content-length", "content-encoding"]) {
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

    const scriptTag = NAVIGATOR_SCRIPT.replace(/__ORIGIN__/g, origin);
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
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const errorHtml = `<!DOCTYPE html>
<html><head><title>Site can't be reached</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8f9fa;color:#202124}
.error-box{text-align:center;max-width:500px;padding:20px}
.error-icon{font-size:48px;margin-bottom:16px}
h1{font-size:24px;font-weight:400;margin-bottom:8px}
p{color:#5f6368;font-size:14px;line-height:1.6}
code{background:#f1f3f4;padding:2px 6px;border-radius:4px;font-size:12px;word-break:break-all}
</style></head><body>
<div class="error-box">
<div class="error-icon">&#x1F50C;</div>
<h1>This site can't be reached</h1>
<p><code>${decodedUrl}</code> took too long to respond or blocked the connection.</p>
<p style="margin-top:16px;color:#9aa0a6;font-size:12px">${msg}</p>
</div></body></html>`;
    return new Response(errorHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
