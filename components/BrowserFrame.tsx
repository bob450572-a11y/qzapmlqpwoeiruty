"use client";

import React, { useState, useCallback } from "react";
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

function generateId() {
  return Math.random().toString(36).substring(2, 9);
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
        setTabs([newTab]);
        setActiveTabId(newTab.id);
        return;
      }
      const currentIndex = tabs.findIndex((t) => t.id === tabId);
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
          url={displayUrl}
          isLoading={isLoading}
          onNavigate={handleNavigate}
        />
        <div className="flex items-center gap-1 px-1">
          <button className="nav-button" title="Extensions">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </button>
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
