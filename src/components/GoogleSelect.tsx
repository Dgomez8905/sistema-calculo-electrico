"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface GoogleSelectOption {
  value: string;
  label: string;
}

interface GoogleSelectProps {
  value: string | number;
  onChange: (e: { target: { value: string } }) => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  variant?: "default" | "ghost";
}

export default function GoogleSelect({
  value,
  onChange,
  children,
  className = "",
  title,
  variant = "default",
}: GoogleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extraer opciones desde los hijos <option>
  const options: GoogleSelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement<{ value?: string | number; children?: React.ReactNode }>(child)) {
      const optVal =
        child.props.value !== undefined ? String(child.props.value) : "";
      const rawChildren = child.props.children;
      const optLabel = Array.isArray(rawChildren)
        ? rawChildren.join("")
        : String(rawChildren ?? "");
      options.push({ value: optVal, label: optLabel.trim() });
    }
  });

  const selectedOption =
    options.find((o) => o.value === String(value)) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`google-dropdown-container ${className}`}
      title={title}
    >
      <button
        type="button"
        data-open={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          variant === "ghost"
            ? "google-dropdown-trigger-ghost"
            : "google-dropdown-trigger"
        }
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-[#1a73e8]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`google-dropdown-menu ${
            variant === "ghost" ? "right-0 left-auto min-w-[240px]" : ""
          }`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                data-selected={isSelected}
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  setIsOpen(false);
                }}
                className="google-dropdown-option"
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#1a73e8]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

