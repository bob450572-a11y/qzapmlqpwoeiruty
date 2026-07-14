"use client";

import React from "react";

interface Session {
  codespaceName: string;
  tunnelUrl: string | null;
  status: "idle" | "creating" | "starting" | "ready" | "error";
  error?: string;
}

interface VirtualBrowserProps {
  session: Session | null;
  onNavigate: (url: string) => void;
  onClose: () => void;
}

function IdleScreen({ onNavigate }: { onNavigate: (url: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="text-center px-4 max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
            <path strokeLinecap="round" strokeWidth="1.5" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        </div>
        <h2 className="text-2xl font-light mb-3 text-gray-700">Virtual Browser</h2>
        <p className="text-sm text-gray-400 mb-8">
          Type a URL or search term in the address bar to launch a real browser.
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
              onClick={() => window.dispatchEvent(
                new CustomEvent("__navigate", { detail: { url: site.url } })
              )}
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

function LoadingScreen({ status }: { status: "creating" | "starting" }) {
  const messages: Record<string, string[]> = {
    creating: [
      "Allocating server resources...",
      "Spinning up your browser...",
    ],
    starting: [
      "Installing browser components...",
      "Starting Chrome...",
      "Setting up secure tunnel...",
      "Almost ready...",
    ],
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="text-center px-4 max-w-md">
        <div className="spinner-lg mx-auto mb-6" />
        <h2 className="text-xl font-light mb-2 text-gray-700">
          {status === "creating" ? "Creating your browser..." : "Starting your browser..."}
        </h2>
        <p className="text-sm text-gray-400 mb-2">
          This may take 30-60 seconds.
        </p>
        <div className="mt-4 text-xs text-gray-300 space-y-1">
          {messages[status].map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onRetry, onHome }: { error: string; onRetry: () => void; onHome: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-normal mb-2 text-gray-700">Browser failed to start</h2>
        <p className="text-sm text-gray-400 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={onHome}
            className="px-5 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VirtualBrowser({ session, onNavigate, onClose }: VirtualBrowserProps) {
  if (!session || session.status === "idle") {
    return <IdleScreen onNavigate={onNavigate} />;
  }

  if (session.status === "creating" || session.status === "starting") {
    return <LoadingScreen status={session.status} />;
  }

  if (session.status === "error") {
    return (
      <ErrorScreen
        error={session.error || "Unknown error"}
        onRetry={() => {
          onClose();
        }}
        onHome={onClose}
      />
    );
  }

  if (session.status === "ready" && session.tunnelUrl) {
    const vncUrl = `${session.tunnelUrl}/vnc.html?autoconnect=true&resize=remote&reconnect=true&reconnect_delay=1000&quality=6`;

    return (
      <div className="flex-1 relative bg-white">
        <iframe
          src={vncUrl}
          className="w-full h-full border-none"
          title="Virtual Browser"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    );
  }

  return <IdleScreen onNavigate={onNavigate} />;
}
