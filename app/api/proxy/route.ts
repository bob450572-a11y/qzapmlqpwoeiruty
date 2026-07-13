import { NextRequest } from "next/server";

function rewriteResourceUrls(html: string, origin: string): string {
  const proxyPrefix = "/api/proxy?url=";

  function resolveRelative(href: string, base: string): string {
    try {
      return new URL(href, base).href;
    } catch {
      return href;
    }
  }

  function makeProxyUrl(absUrl: string): string {
    return `${proxyPrefix}${encodeURIComponent(absUrl)}`;
  }

  function shouldSkip(value: string): boolean {
    return (
      value.startsWith("data:") ||
      value.startsWith("blob:") ||
      value.startsWith("javascript:") ||
      value.startsWith("#") ||
      value === "" ||
      value.startsWith("mailto:") ||
      value.startsWith("tel:") ||
      value.startsWith("about:")
    );
  }

  function rewriteSrcLike(match: string, attr: string, quote: string, value: string): string {
    if (shouldSkip(value)) return match;
    let absUrl = value;
    if (value.startsWith("//")) {
      absUrl = "https:" + value;
    } else if (value.startsWith("/")) {
      absUrl = origin + value;
    } else if (!value.startsWith("http://") && !value.startsWith("https://")) {
      absUrl = resolveRelative(value, origin + "/");
    }
    if (absUrl.startsWith("http://") || absUrl.startsWith("https://")) {
      return `${attr}=${quote}${makeProxyUrl(absUrl)}${quote}`;
    }
    return match;
  }

  html = html.replace(
    /\b(src|poster|data-src|data-original|data-lazy-src|data-bg|data-background|background)=(["'])([^"']*?)\2/gi,
    (m, attr, q, val) => rewriteSrcLike(m, attr, q, val)
  );

  html = html.replace(
    /\b(href|action|cite|longdesc|classid|codebase)=(["'])([^"']*?)\2/gi,
    (m, attr, q, val) => {
      if (shouldSkip(val)) return m;
      let absUrl = val;
      if (val.startsWith("//")) {
        absUrl = "https:" + val;
      } else if (val.startsWith("/")) {
        absUrl = origin + val;
      } else if (!val.startsWith("http://") && !val.startsWith("https://")) {
        absUrl = resolveRelative(val, origin + "/");
      }
      if (absUrl.startsWith("http://") || absUrl.startsWith("https://")) {
        return `${attr}=${q}${makeProxyUrl(absUrl)}${q}`;
      }
      return m;
    }
  );

  html = html.replace(
    /\b(srcset)=(["'])([^"']*?)\2/gi,
    (m, attr, q, val) => {
      const rewritten = val
        .split(",")
        .map((part: string) => {
          const trimmed = part.trim();
          const pieces = trimmed.split(/\s+/);
          if (pieces.length === 0) return part;
          let imgUrl = pieces[0];
          if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
          else if (imgUrl.startsWith("/")) imgUrl = origin + imgUrl;
          else if (!imgUrl.startsWith("http://") && !imgUrl.startsWith("https://"))
            imgUrl = resolveRelative(imgUrl, origin + "/");
          if (imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) {
            pieces[0] = makeProxyUrl(imgUrl);
          }
          return pieces.join(" ");
        })
        .join(", ");
      return `${attr}=${q}${rewritten}${q}`;
    }
  );

  html = html.replace(
    /url\((["']?)([^"')]+?)\1\)/gi,
    (m, q, url) => {
      if (url.startsWith("data:") || url.startsWith("#") || url.startsWith("about:")) return m;
      let absUrl = url;
      if (url.startsWith("//")) absUrl = "https:" + url;
      else if (url.startsWith("/")) absUrl = origin + url;
      else if (!url.startsWith("http://") && !url.startsWith("https://"))
        absUrl = resolveRelative(url, origin + "/");
      if (absUrl.startsWith("http://") || absUrl.startsWith("https://")) {
        return `url(${q || "'"}${makeProxyUrl(absUrl)}${q || "'"})`;
      }
      return m;
    }
  );

  return html;
}

const NAVIGATOR_SCRIPT = `
<script>
(function(){
  var fakeOrigin = '__ORIGIN__';
  var proxyBase = '/api/proxy?url=';

  function getQueryUrl() {
    var q = location.search;
    var m = q.match(/[?&]url=([^&]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  var realTargetUrl = getQueryUrl();
  if (!realTargetUrl) return;

  try {
    var parsed = new URL(realTargetUrl);
    var fakeHost = parsed.host;
    var fakePathname = parsed.pathname || '/';
    var fakeSearch = parsed.search || '';
    var fakeHash = location.hash || '';
    var fakeHref = parsed.origin + fakePathname + fakeSearch + fakeHash;
  } catch(e) {
    var fakeHost = location.host;
    var fakePathname = location.pathname;
    var fakeSearch = location.search;
    var fakeHash = location.hash;
    var fakeHref = realTargetUrl;
  }

  var fakeLocation = {
    href: fakeHref,
    origin: fakeOrigin,
    protocol: 'https:',
    host: fakeHost,
    hostname: fakeHost.split(':')[0],
    port: fakeHost.includes(':') ? fakeHost.split(':')[1] : '',
    pathname: fakePathname,
    search: fakeSearch,
    hash: fakeHash,
    ancestorOrigins: { length: 0 },
    assign: function(u){ window.parent.postMessage({__nav:true,url:u},'*'); },
    replace: function(u){ window.parent.postMessage({__nav:true,url:u},'*'); },
    reload: function(){ window.parent.postMessage({__nav:true,url:fakeOrigin + fakeLocation.pathname + fakeLocation.search},'*'); },
    toString: function(){ return this.href; }
  };

  try {
    var desc = {get:function(k){
      return fakeLocation[k];
    }};
    window.location = new Proxy({__proto__:null},{
      get:function(t,k){
        if(k==='assign')return fakeLocation.assign;
        if(k==='replace')return fakeLocation.replace;
        if(k==='reload')return fakeLocation.reload;
        if(k==='toString')return fakeLocation.toString;
        if(k==='href')return fakeLocation.href;
        if(k==='origin')return fakeLocation.origin;
        if(k==='protocol')return fakeLocation.protocol;
        if(k==='host')return fakeLocation.host;
        if(k==='hostname')return fakeLocation.hostname;
        if(k==='port')return fakeLocation.port;
        if(k==='pathname')return fakeLocation.pathname;
        if(k==='search')return fakeLocation.search;
        if(k==='hash')return fakeLocation.hash;
        if(k==='ancestorOrigins')return fakeLocation.ancestorOrigins;
        if(k==='toJSON')return function(){return fakeLocation.href;};
        return undefined;
      },
      set:function(t,k,v){
        if(k==='href'){window.parent.postMessage({__nav:true,url:v},'*');return true;}
        return false;
      }
    });
  } catch(e) {
    try {
      Object.defineProperty(window, 'location', {
        get: function(){ return fakeLocation; },
        set: function(u){ window.parent.postMessage({__nav:true,url:u},'*'); },
        configurable: true
      });
    } catch(e2){}
  }

  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.startsWith('javascript:') || href === '#' || href.startsWith('#')) return;
    e.preventDefault();
    e.stopPropagation();
    var fullUrl;
    try {
      fullUrl = new URL(a.href, fakeOrigin).href;
    } catch(err) {
      fullUrl = a.href;
    }
    if (a.target === '_blank' || e.ctrlKey || e.metaKey) {
      window.parent.postMessage({__nav:true, url: fullUrl, newTab: true}, '*');
    } else {
      window.parent.postMessage({__nav:true, url: fullUrl}, '*');
    }
  }, true);

  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form.action && !form.getAttribute('action')) return;
    e.preventDefault();
    var actionUrl = form.getAttribute('action') || form.action || '';
    var u;
    try { u = new URL(actionUrl, fakeOrigin); } catch(err) { return; }
    var method = (form.method || form.getAttribute('method') || 'GET').toUpperCase();
    if (method === 'GET') {
      var fd = new FormData(form);
      var params = new URLSearchParams();
      fd.forEach(function(val, key) {
        if (val instanceof File) {
          params.append(key, val.name);
        } else {
          params.append(key, val);
        }
      });
      var qs = params.toString();
      if (qs) u.search = (u.search ? u.search + '&' : '?') + qs;
    }
    window.parent.postMessage({__nav:true, url: u.href}, '*');
  }, true);

  try {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      if (typeof url === 'string') {
        try {
          if (!url.startsWith('http') && !url.startsWith('/api/proxy')) {
            url = new URL(url, fakeOrigin).href;
          }
        } catch(e) {}
      }
      return origOpen.apply(this, arguments);
    };
  } catch(e){}

  try {
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        try {
          if (!input.startsWith('http') && !input.startsWith('/api/proxy')) {
            input = new URL(input, fakeOrigin).href;
          }
        } catch(e) {}
      }
      return origFetch.call(this, input, init);
    };
  } catch(e){}

  try {
    var origAssign = history.pushState;
    history.pushState = function() {
      window.parent.postMessage({__nav:true, url: arguments[2] || fakeLocation.href}, '*');
      return origAssign.apply(this, arguments);
    };
    var origReplace = history.replaceState;
    history.replaceState = function() {
      window.parent.postMessage({__nav:true, url: arguments[2] || fakeLocation.href}, '*');
      return origReplace.apply(this, arguments);
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
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
      for (const h of [
        "content-type",
        "cache-control",
        "etag",
        "content-length",
        "content-encoding",
        "content-disposition",
      ]) {
        const val = upstream.headers.get(h);
        if (val) headers.set(h, val);
      }
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    let html = await upstream.text();
    const urlObj = new URL(decodedUrl);
    const origin = urlObj.origin;

    html = rewriteResourceUrls(html, origin);

    const metaCsp =
      '<meta http-equiv="Content-Security-Policy" content="frame-ancestors *;">';
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
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    let host = "";
    try {
      host = new URL(decodedUrl).hostname;
    } catch {
      host = decodedUrl;
    }

    const errorHtml = `<!DOCTYPE html>
<html><head><title>Site can't be reached</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Segoe UI",system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8f9fa;color:#202124}
.box{text-align:center;max-width:480px;padding:20px}
.icon{width:64px;height:64px;margin:0 auto 20px;border-radius:50%;background:#f1f3f4;display:flex;align-items:center;justify-content:center}
.icon svg{width:32px;height:32px;color:#9aa0a6}
h1{font-size:20px;font-weight:400;margin-bottom:8px;color:#202124}
p{color:#5f6368;font-size:14px;line-height:1.6;margin-bottom:6px}
code{background:#f1f3f4;padding:2px 8px;border-radius:4px;font-size:12px;word-break:break-all;display:inline-block;margin:4px 0}
.btn{display:inline-block;margin-top:16px;padding:10px 24px;background:#1a73e8;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;text-decoration:none}
.btn:hover{background:#1765cc}
.err{color:#9aa0a6;font-size:11px;margin-top:12px}
</style></head><body>
<div class="box">
<div class="icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 2.122a1.5 1.5 0 112.121 2.121 1.5 1.5 0 01-2.121-2.121zM12 3a9 9 0 019 9"/></svg></div>
<h1>This site can&#39;t be reached</h1>
<p><code>${host}</code></p>
<p>The site refused the connection, timed out, or is unreachable from our server.</p>
<button class="btn" onclick="window.parent.postMessage({__nav:true,url:window.location.href},'*')">Try Again</button>
<p class="err">${msg}</p>
</div></body></html>`;

    return new Response(errorHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
