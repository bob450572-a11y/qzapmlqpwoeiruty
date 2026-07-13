"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface BrowserContentProps {
  url: string;
  onUrlChange: (url: string) => void;
  onTitleChange: (title: string) => void;
  onLoadStart: () => void;
  onLoadEnd: () => void;
}

export default function BrowserContent({
  url,
  onUrlChange,
  onTitleChange,
  onLoadStart,
  onLoadEnd,
}: BrowserContentProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const skipNextLoadRef = useRef(false);
  const urlRef = useRef(url);
  const onLoadStartRef = useRef(onLoadStart);
  const onLoadEndRef = useRef(onLoadEnd);
  const onTitleChangeRef = useRef(onTitleChange);
  const onUrlChangeRef = useRef(onUrlChange);

  onLoadStartRef.current = onLoadStart;
  onLoadEndRef.current = onLoadEnd;
  onTitleChangeRef.current = onTitleChange;
  onUrlChangeRef.current = onUrlChange;

  const prevUrlRef = useRef(url);

  useEffect(() => {
    setError(null);
    if (url && url !== prevUrlRef.current && !skipNextLoadRef.current) {
      onLoadStartRef.current();
      setIframeKey((k) => k + 1);
    }
    skipNextLoadRef.current = false;
    prevUrlRef.current = url;
  }, [url]);

  const handleLoad = useCallback(() => {
    onLoadEndRef.current();
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentDocument) {
        const title = iframe.contentDocument.title;
        if (title) onTitleChangeRef.current(title);
        try {
          const currentUrl = iframe.contentWindow?.location?.href;
          if (currentUrl) {
            const parsedUrl = new URL(currentUrl);
            const decodedUrl = parsedUrl.searchParams.get("url");
            if (decodedUrl) {
              const extracted = decodeURIComponent(decodedUrl);
              if (extracted !== urlRef.current) {
                skipNextLoadRef.current = true;
                onUrlChangeRef.current(extracted);
              }
            }
          }
        } catch {}
      }
    } catch {}
  }, []);

  const handleError = useCallback(() => {
    onLoadEndRef.current();
    setError("net::ERR_CONNECTION_FAILED");
  }, []);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data && e.data.__nav && e.data.url) {
        if (e.data.newTab) {
          window.dispatchEvent(new CustomEvent("__newTabNav", { detail: { url: e.data.url } }));
        }
        onUrlChangeRef.current(e.data.url);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  urlRef.current = url;

  if (!url) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center px-4 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              <path strokeLinecap="round" strokeWidth="1.5" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </div>
          <h2 className="text-2xl font-light mb-3 text-gray-700">qzapmlqpwoeiruty</h2>
          <p className="text-sm text-gray-400 mb-6">A virtual browser. Type a URL or search term above to get started.</p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("__navigate", { detail: { url: "https://wikipedia.org" } }));
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-lg">W</span>
              <span className="text-[12px] text-gray-600 truncate">Wikipedia</span>
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("__navigate", { detail: { url: "https://reddit.com" } }));
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-lg">R</span>
              <span className="text-[12px] text-gray-600 truncate">Reddit</span>
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("__navigate", { detail: { url: "https://youtube.com" } }));
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-lg">Y</span>
              <span className="text-[12px] text-gray-600 truncate">YouTube</span>
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("__navigate", { detail: { url: "https://github.com" } }));
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-lg">G</span>
              <span className="text-[12px] text-gray-600 truncate">GitHub</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 2.122a1.5 1.5 0 112.121 2.121 1.5 1.5 0 01-2.121-2.121zM12 3a9 9 0 019 9" />
          </svg>
          <h2 className="text-xl font-normal mb-2 text-gray-700">This site can&apos;t be reached</h2>
          <p className="text-sm text-gray-500 mb-1 font-mono">{extractDomain(url)}</p>
          <p className="text-sm text-gray-400 mb-6">The site refused the connection or timed out.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                onLoadStartRef.current();
                setIframeKey((k) => k + 1);
              }}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => {
                setError(null);
                onUrlChangeRef.current("");
              }}
              className="px-5 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-white">
      <iframe
        key={iframeKey}
        ref={iframeRef}
        src={`/api/proxy?url=${encodeURIComponent(url)}`}
        onLoad={handleLoad}
        onError={handleError}
        className="w-full h-full border-none"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads allow-presentation"
        title="Browser content"
      />
    </div>
  );
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
