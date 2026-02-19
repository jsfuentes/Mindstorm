"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import BlockContextMenu from "./BlockContextMenu";

/** Given a heading node, collect it + all siblings until the next same-or-higher-level heading. */
function getSectionElements(node: HTMLElement): HTMLElement[] {
  const tag = node.tagName;
  if (!/^H[1-6]$/i.test(tag)) return [node];

  const level = parseInt(tag[1]);
  const elements: HTMLElement[] = [node];
  let sibling = node.nextElementSibling as HTMLElement | null;
  while (sibling) {
    if (
      /^H[1-6]$/i.test(sibling.tagName) &&
      parseInt(sibling.tagName[1]) <= level
    )
      break;
    elements.push(sibling);
    sibling = sibling.nextElementSibling as HTMLElement | null;
  }
  return elements;
}

function sectionElementsToHtml(elements: HTMLElement[]): string {
  return elements.map((el) => el.outerHTML).join("");
}

/** Return the HTML of the current text selection, or null if nothing is selected. */
function getSelectionHtml(): string | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const frag = sel.getRangeAt(0).cloneContents();
  const div = document.createElement("div");
  div.appendChild(frag);
  const html = div.innerHTML.trim();
  return html || null;
}

/** Walk up from a target to find the top-level ProseMirror child. */
function findTopLevelBlock(
  target: HTMLElement | null,
  prosemirror: HTMLElement
): HTMLElement | null {
  let el: HTMLElement | null = target;
  while (el && el.parentElement !== prosemirror) {
    el = el.parentElement;
  }
  if (!el || el.parentElement !== prosemirror) return null;
  return el;
}

/** Get the ProseMirror doc positions spanning a list of top-level DOM elements. */
function getBlockRange(
  view: { posAtDOM: (node: Node, offset: number) => number },
  doc: { resolve: (pos: number) => { before: (depth: number) => number; after: (depth: number) => number; depth: number } },
  elements: HTMLElement[]
): { from: number; to: number } | null {
  try {
    const first = elements[0];
    const last = elements[elements.length - 1];

    const fromPos = view.posAtDOM(first, 0);
    const $from = doc.resolve(fromPos);
    const from = $from.before($from.depth);

    const toPos = view.posAtDOM(last, last.childNodes.length);
    const $to = doc.resolve(toPos);
    const to = $to.after($to.depth);

    return { from, to };
  } catch {
    return null;
  }
}

type MenuState = {
  x: number;
  y: number;
  blockHtml: string;
  from: number;
  to: number;
};

export default function BlockEditor({
  html,
  onHtmlChange,
  onAiCommand,
}: {
  html: string;
  onHtmlChange: (html: string) => void;
  onAiCommand: (blockHtml: string, command: string) => Promise<string>;
}) {
  const isExternalUpdate = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [handleState, setHandleState] = useState<{
    top: number;
    visible: boolean;
  }>({ top: 0, visible: false });
  const hoveredNodeRef = useRef<HTMLElement | null>(null);
  const highlightedEls = useRef<HTMLElement[]>([]);
  const [contextMenu, setContextMenu] = useState<MenuState | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
    content: html || "",
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return;
      onHtmlChange(editor.getHTML());
    },
  });

  // Sync external html prop into editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const currentHtml = editor.getHTML();
    if (html === currentHtml) return;
    isExternalUpdate.current = true;
    editor.commands.setContent(html || "");
    isExternalUpdate.current = false;
  }, [html, editor]);

  const getProseMirror = useCallback((): HTMLElement | null => {
    return editorContainerRef.current?.querySelector(".ProseMirror") ?? null;
  }, []);

  const clearHighlight = useCallback(() => {
    for (const el of highlightedEls.current) {
      el.removeAttribute("data-section-hover");
    }
    highlightedEls.current = [];
  }, []);

  const applyHighlight = useCallback(
    (block: HTMLElement) => {
      clearHighlight();
      const section = getSectionElements(block);
      for (const el of section) {
        el.setAttribute("data-section-hover", "true");
      }
      highlightedEls.current = section;
    },
    [clearHighlight]
  );

  // Track hovered block via mousemove on the container
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container || !editor) return;

    const onMouseMove = (e: MouseEvent) => {
      if (handleRef.current?.contains(e.target as Node)) return;

      const prosemirror = container.querySelector(
        ".ProseMirror"
      ) as HTMLElement | null;
      if (!prosemirror) return;

      const block = findTopLevelBlock(e.target as HTMLElement, prosemirror);
      if (!block) {
        if (hoveredNodeRef.current) {
          hoveredNodeRef.current = null;
          setHandleState((prev) => ({ ...prev, visible: false }));
          clearHighlight();
        }
        return;
      }

      if (block === hoveredNodeRef.current) return;

      hoveredNodeRef.current = block;
      applyHighlight(block);

      const containerRect = container.getBoundingClientRect();
      const nodeRect = block.getBoundingClientRect();
      setHandleState({
        top: nodeRect.top - containerRect.top,
        visible: true,
      });
    };

    const onMouseLeave = () => {
      hoveredNodeRef.current = null;
      setHandleState({ top: 0, visible: false });
      clearHighlight();
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [editor, clearHighlight, applyHighlight]);

  // Click the handle → open AI menu for the hovered block/section
  const handleHandleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const node = hoveredNodeRef.current;
      if (!node || !editor) return;
      const handleRect = handleRef.current?.getBoundingClientRect();
      if (!handleRect) return;

      const section = getSectionElements(node);
      const range = getBlockRange(editor.view, editor.state.doc, section);
      if (!range) return;

      setContextMenu({
        x: handleRect.left,
        y: handleRect.bottom + 4,
        blockHtml: sectionElementsToHtml(section),
        ...range,
      });
    },
    [editor]
  );

  // Right-click → if text is selected use that, otherwise use the hovered block/section
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!editor) return;
      const prosemirror = getProseMirror();
      if (!prosemirror) return;

      // Check for text selection first
      const selHtml = getSelectionHtml();
      if (selHtml) {
        e.preventDefault();
        const { from, to } = editor.state.selection;
        setContextMenu({ x: e.clientX, y: e.clientY, blockHtml: selHtml, from, to });
        return;
      }

      // Fall back to block/section level
      const block = findTopLevelBlock(e.target as HTMLElement, prosemirror);
      if (!block) return;

      const section = getSectionElements(block);
      const range = getBlockRange(editor.view, editor.state.doc, section);
      if (!range) return;

      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        blockHtml: sectionElementsToHtml(section),
        ...range,
      });
    },
    [editor, getProseMirror]
  );

  const handleAiCommand = useCallback(
    async (command: string) => {
      if (!contextMenu || !editor) return;
      const { blockHtml, from, to } = contextMenu;
      setContextMenu(null);

      const newHtml = await onAiCommand(blockHtml, command);
      if (!newHtml) return;

      // Strip inter-tag whitespace so blank lines don't become empty paragraphs
      const cleaned = newHtml.replace(/>\s+</g, "><").trim();

      // Use a direct ProseMirror transaction for clean replacement
      const wrapper = document.createElement("div");
      wrapper.innerHTML = cleaned;
      const parser = PMDOMParser.fromSchema(editor.schema);
      const slice = parser.parseSlice(wrapper);
      editor.view.dispatch(editor.state.tr.replace(from, to, slice));
    },
    [contextMenu, editor, onAiCommand]
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      const node = hoveredNodeRef.current;
      if (!node || !editor) return;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setDragImage(node, 0, 0);
      node.dataset.dragging = "true";
    },
    [editor]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const prosemirror = getProseMirror();
      if (!prosemirror || !editor) return;

      const dragging = prosemirror.querySelector(
        "[data-dragging]"
      ) as HTMLElement | null;
      if (!dragging) return;

      let dropTarget = document.elementFromPoint(
        e.clientX,
        e.clientY
      ) as HTMLElement | null;
      while (dropTarget && dropTarget.parentElement !== prosemirror) {
        dropTarget = dropTarget.parentElement as HTMLElement;
      }

      if (dropTarget && dropTarget !== dragging) {
        const rect = dropTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          prosemirror.insertBefore(dragging, dropTarget);
        } else {
          prosemirror.insertBefore(dragging, dropTarget.nextSibling);
        }
        delete dragging.dataset.dragging;
        onHtmlChange(prosemirror.innerHTML);
      } else {
        delete dragging?.dataset.dragging;
      }
      e.preventDefault();
    },
    [editor, onHtmlChange, getProseMirror]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div
      ref={editorContainerRef}
      className="block-editor-container relative"
      data-testid="document-content"
      onContextMenu={handleContextMenu}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div
        ref={handleRef}
        className="block-handle"
        style={{
          top: handleState.top,
          opacity: handleState.visible ? 1 : 0,
          pointerEvents: handleState.visible ? "auto" : "none",
        }}
        draggable
        onDragStart={handleDragStart}
        onClick={handleHandleClick}
        title="Click for AI commands, drag to reorder"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="5" cy="3" r="1.2" />
          <circle cx="9" cy="3" r="1.2" />
          <circle cx="5" cy="7" r="1.2" />
          <circle cx="9" cy="7" r="1.2" />
          <circle cx="5" cy="11" r="1.2" />
          <circle cx="9" cy="11" r="1.2" />
        </svg>
      </div>

      <EditorContent editor={editor} />

      {contextMenu && (
        <BlockContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onCommand={handleAiCommand}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
