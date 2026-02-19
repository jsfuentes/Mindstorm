"use client";

import { useEffect, useRef } from "react";

const COMMANDS = [
  { label: "Rewrite", command: "rewrite" },
  { label: "Condense", command: "condense" },
  { label: "Expand", command: "expand" },
] as const;

export default function BlockContextMenu({
  x,
  y,
  onCommand,
  onClose,
}: {
  x: number;
  y: number;
  onCommand: (command: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 50,
  };

  return (
    <div ref={menuRef} className="block-context-menu" style={style}>
      <div className="text-xs text-gray-400 px-3 py-1.5 select-none">
        AI Commands
      </div>
      {COMMANDS.map(({ label, command }) => (
        <button
          key={command}
          className="block-context-menu-item"
          onClick={() => onCommand(command)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
