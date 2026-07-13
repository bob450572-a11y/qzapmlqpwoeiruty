"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface BrowserContentProps {
  url: string;
  onNavigate: (url: string) => void;
  onTitleChange: (title: string) => void;
  onLoadStart: () => void;
  onLoadEnd: () => void;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function BrowserContent({
  url,
  onNavigate,
  onTitleChange,
  onLoadStart,
  onLoadEnd,
}: BrowserContentProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const skipNextLoadRef = useRef(false);
  const urlRef = useRef(url);
  const onLoadStartRef = useRef(onLoadStart);
  const onLoadEndRef = useRef(onLoadEnd);
  const onTitleChangeRef = useRef(onTitleChange);
  const onNavigateRef = useRef(onNavigate);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onLoadStartRef.current = onLoadStart;
  onLoadEndRef.current = onLoadEnd;
  onTitleChangeRef.current = onTitleChange;
  onNavigateRef.current = onNavigate;

  const prevUrlRef = useRef(url);

  useEffect(() => {
    setError(null);
    setLoadTimeout(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (url && url !== prevUrlRef.current && !skipNextLoadRef.current) {
      onLoadStartRef.current();
      setIframeKey((k) => k + 1);
      timeoutRef.current = setTimeout(() => {
        setLoadTimeout(true);
      }, 30000);
    }
    skipNextLoadRef.current = false;
    prevUrlRef.current = url;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [url]);

  const handleLoad = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoadTimeout(false);
    onLoadEndRef.current();

    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentDocument) {
        const title = iframe.contentDocument.title;
        if (title && title.length > 0 && title !== "about:blank") {
          onTitleChangeRef.current(title);
        }
      }
    } catch {
      // Cross-origin - can't read title
    }
  }, []);

  const handleError = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onLoadEndRef.current();
    setError("net::ERR_CONNECTION_FAILED");
  }, []);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data && e.data.__nav && e.data.url) {
        if (e.data.newTab) {
          window.dispatchEvent(
            new CustomEvent("__newTabNav", { detail: { url: e.data.url } })
          );
        } else {
          onNavigateRef.current(e.data.url);
        }
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
          <p className="text-sm text-gray-400 mb-8">
            A virtual browser. Type a URL or search term above.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            {[
              { name: "Wikipedia", url: "https://wikipedia.org", letter: "W" },
              { name: "Reddit", url: "https://reddit.com", letter: "R" },
              { name: "YouTube", url: "https://youtube.com", letter: "Y" },
              { name: "GitHub", url: "https://github.com", letter: "G" },
            ].map((site) => (
              <button
                key={site.name}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("__navigate", {
                      detail: { url: site.url },
                    })
                  );
                }}
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-lg">{site.letter}</span>
                <span className="text-[12px] text-gray-600 truncate">{site.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 2.122a1.5 1.5 0 112.121 2.121 1.5 1.5 0 01-2.121-2.121zM12 3a9 9 0 019 9" />
            </svg>
          </div>
          <h2 className="text-xl font-normal mb-2 text-gray-700">
            This site can&apos;t be reached
          </h2>
          <p className="text-sm text-gray-500 mb-1 font-mono">{extractDomain(url)}</p>
          <p className="text-sm text-gray-400 mb-6">
            The site refused the connection or timed out.
          </p>
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
                window.dispatchEvent(
                  new CustomEvent("__navigate", { detail: { url: "" } })
                );
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
      {loadTimeout && (
        <div className="absolute top-2 right-2 z-10 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700 shadow-sm">
          Still loading...
          <button
            onClick={() => {
              setLoadTimeout(false);
              onLoadEndRef.current();
            }}
            className="ml-2 underline hover:text-yellow-900"
          >
            Dismiss
          </button>
        </div>
      )}
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
