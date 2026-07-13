"use client";

import React from "react";

interface Tab {
  id: string;
  title: string;
  url: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabAdd: () => void;
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return "";
  }
}

export default function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabAdd,
}: TabBarProps) {
  return (
    <div className="flex items-end bg-chrome-bg h-[46px] px-2 pt-2 gap-[1px] overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const favicon = getFaviconUrl(tab.url);
        return (
          <div
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            onMouseUp={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onTabClose(tab.id);
              }
            }}
            className={`
              group flex items-center gap-2 h-[34px] px-3 rounded-t-lg cursor-pointer
              transition-colors duration-100 max-w-[240px] min-w-[60px]
              ${
                isActive
                  ? "bg-white border-t border-l border-r border-chrome-border"
                  : "bg-chrome-tab hover:bg-chrome-hover"
              }
            `}
          >
            {favicon ? (
              <img
                src={favicon}
                alt=""
                className="w-4 h-4 flex-shrink-0 rounded-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <svg
                className="w-4 h-4 flex-shrink-0 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              </svg>
            )}
            <span className="text-[12px] text-chrome-textDark truncate flex-1">
              {tab.title || "New Tab"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="tab-close w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
      <button
        onClick={onTabAdd}
        className="nav-button ml-1 mb-1 w-8 h-8 flex-shrink-0"
        title="New Tab (Ctrl+T)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
