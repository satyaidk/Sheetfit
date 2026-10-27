"use client";

/**
 * Global keyboard shortcuts, clipboard image paste and the unsaved-changes
 * guard. Shortcuts are ignored while the user is typing in a field, so
 * Backspace in a width input never deletes a design.
 */

import { useEffect } from "react";
import { useEditor } from "@/store/editor-store";
import { saveCurrentProject, uploadFiles } from "@/lib/editor-actions";

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.getAttribute("role") === "slider";
}

export function useEditorShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useEditor.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Save and print work even from inside fields.
      if (mod && key === "s") {
        e.preventDefault();
        void saveCurrentProject();
        return;
      }
      if (mod && key === "p") {
        e.preventDefault();
        if (s.doc.designs.length > 0) s.setDialog("print");
        return;
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        s.setPanelOpen(!s.panelOpen);
        return;
      }
      if (isTyping(e.target) || s.dialog) return;

      if (e.key === "?") {
        s.setDialog("shortcuts");
        return;
      }
      if ((e.key === "PageDown" || e.key === "PageUp") && s.pages.length > 1) {
        e.preventDefault();
        s.switchPage(Math.min(s.pages.length - 1, Math.max(0, s.activePage + (e.key === "PageDown" ? 1 : -1))));
        return;
      }
      if (mod && (e.key === "]" || e.key === "[")) {
        e.preventDefault();
        const id = s.selection[0];
        if (!id) return;
        if (e.key === "]") s.bringForward(id, e.altKey);
        else s.sendBackward(id, e.altKey);
        return;
      }
      if (e.altKey && e.shiftKey && key === "l") {
        e.preventDefault();
        const picked = s.doc.designs.filter((d) => s.selection.includes(d.id));
        const lock = !picked.every((d) => d.locked);
        for (const d of picked) s.updateDesign(d.id, { locked: lock });
        return;
      }
      if (e.altKey && (e.key === "," || e.key === ".") && s.selection.length > 0) {
        e.preventDefault();
        const step = e.key === "," ? -15 : 15;
        for (const d of s.doc.designs.filter((x) => s.selection.includes(x.id) && !x.locked)) {
          s.updateDesign(d.id, { rotation: (d.rotation + step) % 360 });
        }
        return;
      }
      if (e.shiftKey && !mod && (key === "h" || key === "v") && s.selection.length > 0) {
        e.preventDefault();
        s.flipDesigns(key === "h" ? "x" : "y");
        return;
      }
      const onCanvas = e.target === document.body || (e.target as HTMLElement).getAttribute?.("role") === "application";
      if (key === "tab" && !mod && onCanvas && s.doc.designs.length > 0) {
        // Cycle the selection through designs (keyboard access to canvas objects).
        e.preventDefault();
        const ids = s.doc.designs.map((d) => d.id);
        const current = ids.indexOf(s.selection[0]);
        const next = current < 0 ? 0 : (current + (e.shiftKey ? -1 : 1) + ids.length) % ids.length;
        s.select([ids[next]]);
        return;
      }

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        s.redo();
      } else if (mod && key === "c") {
        s.copySelection();
      } else if (mod && key === "x") {
        s.copySelection();
        s.deleteSelection();
      } else if (mod && key === "v") {
        // Handled in the paste listener so image files on the clipboard work too.
      } else if (mod && key === "d") {
        e.preventDefault();
        s.duplicateSelection();
      } else if (mod && key === "a") {
        e.preventDefault();
        s.selectAll();
      } else if (mod && key === "g") {
        e.preventDefault();
        if (e.shiftKey) s.ungroupSelection();
        else s.groupSelection();
      } else if (key === "delete" || key === "backspace") {
        if (s.selection.length > 0) {
          e.preventDefault();
          s.deleteSelection();
        }
      } else if (key === "escape") {
        s.clearSelection();
      } else if (key.startsWith("arrow") && s.selection.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        s.nudgeSelection(dx, dy);
      } else if (e.key === "+" || e.key === "=") {
        s.zoomTo(s.zoom * 1.25);
      } else if (e.key === "-") {
        s.zoomTo(s.zoom / 1.25);
      } else if (e.shiftKey && (e.code === "Digit1" || e.code === "Digit2")) {
        s.fitPage();
      } else if (e.shiftKey && e.code === "Digit3") {
        s.zoomToSelection();
      } else if (e.shiftKey && (e.code === "Digit0")) {
        s.zoomTo(1);
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (files.length > 0) {
        e.preventDefault();
        void uploadFiles(files);
      } else {
        useEditor.getState().paste();
      }
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const { project, doc } = useEditor.getState();
      if (project.dirty && doc.designs.length > 0) e.preventDefault();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);
}
