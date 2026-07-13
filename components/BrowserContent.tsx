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
    setError("Failed to load this page. The site may block proxying or be unavailable.");
  }, []);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data && e.data.__nav && e.data.url) {
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
        <div className="text-center text-chrome-text">
          <svg className="w-16 h-16 mx-auto mb-4 text-chrome-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="1.5" />
            <path strokeLinecap="round" strokeWidth="1.5" d="M21 21l-4.35-4.35" />
          </svg>
          <h2 className="text-xl font-normal mb-2 text-chrome-textDark">qzapmlqpwoeiruty</h2>
          <p className="text-sm">Enter a URL or search term in the address bar above</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center text-chrome-text max-w-md px-4">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-lg font-normal mb-2 text-chrome-textDark">Unable to load this page</h2>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              onLoadStartRef.current();
              setIframeKey((k) => k + 1);
            }}
            className="px-4 py-2 bg-chrome-blue text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
          >
            Try again
          </button>
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
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
        title="Browser content"
      />
    </div>
  );
}
