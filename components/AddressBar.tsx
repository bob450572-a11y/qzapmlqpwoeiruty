"use client";

import React, { useState, forwardRef, useEffect } from "react";

interface AddressBarProps {
  url: string;
  isLoading: boolean;
  onNavigate: (url: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

const AddressBar = forwardRef<HTMLInputElement, AddressBarProps>(
  ({ url, isLoading, onNavigate, onFocusChange }, ref) => {
    const [inputValue, setInputValue] = useState(url);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
      if (!focused) {
        setInputValue(url);
      }
    }, [url, focused]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const input = inputValue.trim();
      if (!input) return;
      onNavigate(input);
      setFocused(false);
      (ref as React.RefObject<HTMLInputElement>)?.current?.blur();
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocusChange?.(true);
      e.target.select();
    };

    const handleBlur = () => {
      setFocused(false);
      onFocusChange?.(false);
      setInputValue(url);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setInputValue(url);
        setFocused(false);
        (ref as React.RefObject<HTMLInputElement>)?.current?.blur();
      }
    };

    const isUrl = inputValue.startsWith("http://") || inputValue.startsWith("https://") || inputValue.includes(".");
    const isSecure = inputValue.startsWith("https://");

    return (
      <form onSubmit={handleSubmit} className="flex-1 mx-2">
        <div className={`address-bar flex items-center bg-chrome-toolbar rounded-full h-[36px] px-3 gap-2 transition-all ${focused ? "ring-2 ring-blue-500/30 bg-white" : "hover:bg-gray-100"}`}>
          {focused ? (
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
            </svg>
          ) : isUrl ? (
            isSecure ? (
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            )
          ) : isLoading ? (
            <div className="spinner flex-shrink-0" />
          ) : (
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
            </svg>
          )}
          <input
            ref={ref}
            type="text"
            value={focused ? inputValue : (url || inputValue)}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[14px] text-chrome-textDark placeholder-gray-400 outline-none"
            placeholder="Search or enter URL"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </form>
    );
  }
);

AddressBar.displayName = "AddressBar";
export default AddressBar;
