import { useState, useRef, useEffect } from "react";
import type { HistoryItem } from "../utils/formHistory";
import "./HistoryDropdown.css";

export interface HistoryDropdownProps {
  history: HistoryItem[];
  onSelect: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * History Dropdown Component
 *
 * Displays historical values for a form field
 * Allows selecting from history or clearing individual/all items
 */
export function HistoryDropdown({
  history,
  onSelect,
  onClear,
  placeholder = "No history",
  isOpen,
  onClose,
}: HistoryDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="history-dropdown" ref={dropdownRef}>
      {history.length === 0 ? (
        <div className="history-empty">
          <span className="history-empty-icon">📝</span>
          <span className="history-empty-text">{placeholder}</span>
        </div>
      ) : (
        <>
          <div className="history-header">
            <span className="history-header-title">Recent Values</span>
            {onClear && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                  onClose();
                }}
                className="history-clear-all"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="history-list">
            {history.map((item, index) => (
              <div
                key={`${item.value}-${index}`}
                className="history-item"
                onClick={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <div className="history-item-content">
                  <div className="history-item-value">
                    {item.label || item.value}
                  </div>
                  <div className="history-item-meta">
                    {formatTimestamp(item.timestamp)}
                  </div>
                </div>
                <button
                  type="button"
                  className="history-item-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Will be handled by parent through onClear
                  }}
                  title="Remove this item"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
