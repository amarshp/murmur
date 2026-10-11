import { useState, useEffect } from "react";

export const useWindowDrag = () => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      // Left mouse button
      setIsDragging(true);
      window.electronAPI.startWindowDrag?.();
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      window.electronAPI.stopWindowDrag?.();
    }
  };

  const handleClick = (e) => {
    // Prevent any click actions - use hotkey only
    e.preventDefault();
  };

  // Set up global mouse up listener when dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        window.electronAPI.stopWindowDrag?.();
      };

      // A release outside the window, or while the window went click-through,
      // never reaches mouseup; any of these ends the drag so it cannot stick.
      const handleMove = (e) => {
        if (e.buttons === 0) handleGlobalMouseUp();
      };

      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.addEventListener("pointerup", handleGlobalMouseUp);
      document.addEventListener("mousemove", handleMove);
      window.addEventListener("blur", handleGlobalMouseUp);

      return () => {
        document.removeEventListener("mouseup", handleGlobalMouseUp);
        document.removeEventListener("pointerup", handleGlobalMouseUp);
        document.removeEventListener("mousemove", handleMove);
        window.removeEventListener("blur", handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  return {
    isDragging,
    handleMouseDown,
    handleMouseUp,
    handleClick,
  };
};
