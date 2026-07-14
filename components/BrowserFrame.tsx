"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import TabBar from "./TabBar";
import AddressBar from "./AddressBar";
import Toolbar from "./Toolbar";
import VirtualBrowser from "./VirtualBrowser";

type SessionStatus = "idle" | "creating" | "starting" | "ready" | "error";

interface Session {
  codespaceName: string;
  tunnelUrl: string | null;
  status: SessionStatus;
  error?: string;
}

let tabCounter = 0;
function generateId() {
  return `tab_${Date.now()}_${tabCounter++}`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isUrl(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}(\/\S*)?$/.test(trimmed)) return true;
  return false;
}

export default function BrowserFrame() {
  const [addressValue, setAddressValue] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [addressFocused, setAddressFocused] = useState(false);
  const addressBarRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUrl = addressValue.trim();

  const cleanupPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const createSession = useCallback(async (targetUrl: string) => {
    setSession({ codespaceName: "", tunnelUrl: null, status: "creating" });

    try {
      const res = await fetch("/api/session", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setSession({ codespaceName: "", tunnelUrl: null, status: "error", error: data.error });
        return;
      }

      setSession({
        codespaceName: data.codespaceName,
        tunnelUrl: null,
        status: "starting",
      });

      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/session?id=${encodeURIComponent(data.codespaceName)}`);
          const pollData = await pollRes.json();

          if (pollData.tunnelUrl) {
            cleanupPoll();
            setSession({
              codespaceName: data.codespaceName,
              tunnelUrl: pollData.tunnelUrl,
              status: "ready",
            });
          } else if (pollData.status === "Failed" || pollData.status === "Unknown") {
            cleanupPoll();
            setSession({
              codespaceName: data.codespaceName,
              tunnelUrl: null,
              status: "error",
              error: "Codespace failed to start",
            });
          }
        } catch {
          // keep polling
        }
      }, 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSession({ codespaceName: "", tunnelUrl: null, status: "error", error: msg });
    }
  }, [cleanupPoll]);

  const handleNavigate = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      let url = trimmed;
      if (!isUrl(trimmed)) {
        url = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
      } else {
        url = trimmed.startsWith("http") ? trimmed : "https://" + trimmed;
      }

      setAddressValue(url);
      createSession(url);
    },
    [createSession]
  );

  const handleClose = useCallback(async () => {
    cleanupPoll();
    if (session?.codespaceName) {
      try {
        await fetch(`/api/session?id=${encodeURIComponent(session.codespaceName)}`, {
          method: "DELETE",
        });
      } catch {}
    }
    setSession(null);
    setAddressValue("");
  }, [session, cleanupPoll]);

  useEffect(() => {
    return () => cleanupPoll();
  }, [cleanupPoll]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        addressBarRef.current?.focus();
        addressBarRef.current?.select();
      } else if (e.key === "F6") {
        e.preventDefault();
        addressBarRef.current?.focus();
        addressBarRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const sessionStatus = session?.status || "idle";

  return (
    <div className="flex flex-col h-screen bg-chrome-bg select-none">
      <div className="flex items-end bg-chrome-bg h-[46px] px-2 pt-2 gap-[1px]">
        <div className="group flex items-center gap-2 h-[34px] px-3 rounded-t-lg cursor-pointer transition-colors duration-100 max-w-[240px] min-w-[60px] bg-white border-t border-l border-r border-chrome-border">
          <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
          </svg>
          <span className="text-[12px] text-chrome-textDark truncate flex-1">
            {sessionStatus === "idle"
              ? "New Tab"
              : sessionStatus === "ready"
              ? extractDomain(currentUrl || "Browser")
              : "Starting..."}
          </span>
        </div>
      </div>

      <div className="flex items-center bg-white border-b border-chrome-border px-2 py-1 gap-2">
        <Toolbar
          canGoBack={false}
          canGoForward={false}
          isLoading={sessionStatus === "creating" || sessionStatus === "starting"}
          onBack={() => {}}
          onForward={() => {}}
          onRefresh={() => {
            if (currentUrl) {
              handleClose().then(() => {
                setTimeout(() => createSession(currentUrl), 500);
              });
            }
          }}
          onHome={handleClose}
        />
        <AddressBar
          ref={addressBarRef}
          url={currentUrl}
          isLoading={sessionStatus === "creating" || sessionStatus === "starting"}
          onNavigate={(val) => {
            handleNavigate(val);
          }}
          onFocusChange={setAddressFocused}
        />
        <div className="flex items-center gap-1 px-1">
          <button className="nav-button" title="Menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      <VirtualBrowser
        session={session}
        onNavigate={handleNavigate}
        onClose={handleClose}
      />
    </div>
  );
}
