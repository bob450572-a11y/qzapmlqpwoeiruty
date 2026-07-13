"use client";

import React, { useState } from "react";

interface AddressBarProps {
  url: string;
  isLoading: boolean;
  onNavigate: (url: string) => void;
}

export default function AddressBar({ url, isLoading, onNavigate }: AddressBarProps) {
  const [inputValue, setInputValue] = useState(url);

  React.useEffect(() => {
    setInputValue(url);
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputValue.trim();
    if (!input) return;
    onNavigate(input);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 mx-2">
      <div className="address-bar flex items-center bg-chrome-toolbar border border-chrome-border rounded-full h-[36px] px-3 gap-2 hover:shadow-md transition-shadow">
        {isLoading ? (
          <div className="spinner flex-shrink-0" />
        ) : (
          <svg
            className="w-4 h-4 text-chrome-text flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
          </svg>
        )}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          className="flex-1 bg-transparent text-[14px] text-chrome-textDark placeholder-chrome-text"
          placeholder="Search or enter URL"
          spellCheck={false}
        />
        <svg
          className="w-4 h-4 text-chrome-text flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
        </svg>
      </div>
    </form>
  );
}
