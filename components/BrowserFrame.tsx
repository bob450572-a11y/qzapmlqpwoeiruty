"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import TabBar from "./TabBar";
import AddressBar from "./AddressBar";
import Toolbar from "./Toolbar";
import BrowserContent from "./BrowserContent";
import SearchResults from "./SearchResults";

interface Tab {
  id: string;
  title: string;
  url: string;
  searchQuery: string | null;
  history: string[];
  historyIndex: number;
}

let tabCounter = 0;
function generateId() {
  return `tab_${Date.now()}_${tabCounter++}`;
}

function createNewTab(): Tab {
  return {
    id: generateId(),
    title: "New Tab",
    url: "",
    searchQuery: null,
    history: [],
    historyIndex: -1,
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isUrl(input: string): boolean {
  if (/^https?:\/\//i.test(input)) return true;
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}(\/\S*)?$/.test(input)) return true;
  return false;
}

export default function BrowserFrame() {
  const [tabs, setTabs] = useState<Tab[]>([createNewTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);
  const addressBarRef = useRef<HTMLInputElement>(null);
  const closedTabsRef = useRef<string[]>([]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const updateTab = useCallback(
    (tabId: string, updates: Partial<Tab>) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, ...updates } : t))
      );
    },
    []
  );

  const handleNavigate = useCallback(
    (input: string) => {
      const tabId = activeTab.id;
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      if (isUrl(input)) {
        const url = input.startsWith("http") ? input : "https://" + input;
        const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), `url:${url}`];
        updateTab(tabId, {
          url,
          searchQuery: null,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          title: extractDomain(url),
        });
      } else {
        const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), `search:${input}`];
        updateTab(tabId, {
          url: "",
          searchQuery: input,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          title: `${input} - Search`,
        });
      }
    },
    [activeTab, tabs, updateTab]
  );

  const navigateToEntry = useCallback(
    (tabId: string, entry: string) => {
      if (entry.startsWith("search:")) {
        const query = entry.slice(7);
        updateTab(tabId, {
          url: "",
          searchQuery: query,
          title: `${query} - Search`,
        });
      } else if (entry.startsWith("url:")) {
        const url = entry.slice(4);
        updateTab(tabId, {
          url,
          searchQuery: null,
          title: extractDomain(url),
        });
      }
    },
    [updateTab]
  );

  const handleBack = useCallback(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab || tab.historyIndex <= 0) return;
    const newIndex = tab.historyIndex - 1;
    updateTab(activeTabId, { historyIndex: newIndex });
    navigateToEntry(activeTabId, tab.history[newIndex]);
  }, [tabs, activeTabId, updateTab, navigateToEntry]);

  const handleForward = useCallback(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    const newIndex = tab.historyIndex + 1;
    updateTab(activeTabId, { historyIndex: newIndex });
    navigateToEntry(activeTabId, tab.history[newIndex]);
  }, [tabs, activeTabId, updateTab, navigateToEntry]);

  const handleRefresh = useCallback(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;

    if (tab.searchQuery) {
      const q = tab.searchQuery;
      updateTab(activeTabId, { searchQuery: null });
      setTimeout(() => updateTab(activeTabId, { searchQuery: q }), 50);
    } else if (tab.url) {
      const u = tab.url;
      updateTab(activeTabId, { url: "" });
      setTimeout(() => updateTab(activeTabId, { url: u }), 50);
    }
  }, [tabs, activeTabId, updateTab]);

  const handleHome = useCallback(() => {
    updateTab(activeTabId, {
      url: "",
      searchQuery: null,
      title: "New Tab",
      history: [],
      historyIndex: -1,
    });
  }, [activeTabId, updateTab]);

  const handleTabSelect = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const handleTabClose = useCallback(
    (tabId: string) => {
      if (tabs.length === 1) {
        const newTab = createNewTab();
        closedTabsRef.current.push(JSON.stringify(tabs[0]));
        setTabs([newTab]);
        setActiveTabId(newTab.id);
        return;
      }
      const currentIndex = tabs.findIndex((t) => t.id === tabId);
      const closedTab = tabs.find((t) => t.id === tabId);
      if (closedTab) closedTabsRef.current.push(JSON.stringify(closedTab));
      if (closedTabsRef.current.length > 20) closedTabsRef.current.shift();
      const newTabs = tabs.filter((t) => t.id !== tabId);
      setTabs(newTabs);
      if (activeTabId === tabId) {
        const newIndex = Math.min(currentIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newIndex].id);
      }
    },
    [tabs, activeTabId]
  );

  const handleTabAdd = useCallback(() => {
    const newTab = createNewTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const handleReopenTab = useCallback(() => {
    const last = closedTabsRef.current.pop();
    if (last) {
      const tab = JSON.parse(last) as Tab;
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
    }
  }, []);

  const focusAddressBar = useCallback(() => {
    addressBarRef.current?.focus();
    addressBarRef.current?.select();
  }, []);

  useEffect(() => {
    function handleQuickNav(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.url) handleNavigate(detail.url);
    }
    function handleNewTabNav(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.url) {
        const newTab = createNewTab();
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
        setTimeout(() => {
          const url = detail.url;
          if (isUrl(url)) {
            const finalUrl = url.startsWith("http") ? url : "https://" + url;
            updateTab(newTab.id, {
              url: finalUrl,
              searchQuery: null,
              title: extractDomain(finalUrl),
              history: [`url:${finalUrl}`],
              historyIndex: 0,
            });
          }
        }, 50);
      }
    }
    window.addEventListener("__navigate", handleQuickNav);
    window.addEventListener("__newTabNav", handleNewTabNav);
    return () => {
      window.removeEventListener("__navigate", handleQuickNav);
      window.removeEventListener("__newTabNav", handleNewTabNav);
    };
  }, [handleNavigate, updateTab]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "t") {
        e.preventDefault();
        handleTabAdd();
      } else if (ctrl && e.key === "w") {
        e.preventDefault();
        handleTabClose(activeTabId);
      } else if (ctrl && e.shiftKey && e.key === "T") {
        e.preventDefault();
        handleReopenTab();
      } else if (ctrl && (e.key === "l" || e.key === "L" || e.key === "e" || e.key === "E")) {
        e.preventDefault();
        focusAddressBar();
      } else if (e.key === "F5" || (ctrl && e.key === "r")) {
        e.preventDefault();
        handleRefresh();
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handleBack();
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleForward();
      } else if (e.key === "Escape") {
        if (isLoading) {
          setIsLoading(false);
        }
      } else if (e.key === "F6" || (ctrl && e.key === "l")) {
        e.preventDefault();
        focusAddressBar();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, isLoading, handleTabAdd, handleTabClose, handleReopenTab, handleRefresh, handleBack, handleForward, focusAddressBar]);

  const handleNewTabNavigate = useCallback(
    (input: string) => {
      handleNavigate(input);
      setAddressFocused(false);
    },
    [handleNavigate]
  );

  const displayUrl = activeTab.searchQuery || activeTab.url;

  return (
    <div className="flex flex-col h-screen bg-chrome-bg select-none">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onTabAdd={handleTabAdd}
      />

      <div className="flex items-center bg-white border-b border-chrome-border px-2 py-1 gap-2">
        <Toolbar
          canGoBack={activeTab.historyIndex > 0}
          canGoForward={activeTab.historyIndex < activeTab.history.length - 1}
          isLoading={isLoading}
          onBack={handleBack}
          onForward={handleForward}
          onRefresh={handleRefresh}
          onHome={handleHome}
        />
        <AddressBar
          ref={addressBarRef}
          url={displayUrl}
          isLoading={isLoading}
          onNavigate={handleNewTabNavigate}
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

      {activeTab.searchQuery ? (
        <SearchResults
          query={activeTab.searchQuery}
          onNavigate={handleNavigate}
        />
      ) : (
        <BrowserContent
          url={activeTab.url}
          onUrlChange={(url) => updateTab(activeTabId, { url, title: extractDomain(url) })}
          onTitleChange={(title) => updateTab(activeTabId, { title })}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
        />
      )}
    </div>
  );
}
