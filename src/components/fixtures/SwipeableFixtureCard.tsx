import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

interface SwipeableFixtureCardProps {
  fixtureId: string;
  onDismiss: (id: string) => void;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 80;
const INTENT_LOCK_THRESHOLD = 8;

export function SwipeableFixtureCard({ fixtureId, onDismiss, children }: SwipeableFixtureCardProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, -80, 0], [0.3, 0.8, 1]);

  const startX = useRef(0);
  const startY = useRef(0);
  const lockedDirection = useRef<"horizontal" | "vertical" | null>(null);
  const isTouching = useRef(false);
  const wasDragged = useRef(false);

  const resetGesture = useCallback(() => {
    isTouching.current = false;
    lockedDirection.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    lockedDirection.current = null;
    isTouching.current = true;
    wasDragged.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isTouching.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;

    if (!lockedDirection.current) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX < INTENT_LOCK_THRESHOLD && absY < INTENT_LOCK_THRESHOLD) return;

      lockedDirection.current = absX > absY ? "horizontal" : "vertical";
    }

    if (lockedDirection.current === "vertical") {
      x.set(0);
      return;
    }

    // Horizontal swipe only; clamp so card cannot be dragged right.
    const nextX = Math.max(-150, Math.min(0, deltaX));
    x.set(nextX);

    if (Math.abs(nextX) > 10) {
      wasDragged.current = true;
    }

    // Prevent browser from treating it as page scroll once horizontal intent is locked.
    e.preventDefault();
  }, [x]);

  const handleTouchEnd = useCallback(() => {
    if (!isTouching.current) return;

    const finalX = x.get();

    if (lockedDirection.current === "horizontal" && finalX <= -SWIPE_THRESHOLD) {
      setIsDismissing(true);
      resetGesture();
      return;
    }

    x.set(0);
    resetGesture();
  }, [resetGesture, x]);

  const handleTouchCancel = useCallback(() => {
    x.set(0);
    resetGesture();
  }, [resetGesture, x]);

  const handleExitComplete = useCallback(() => {
    onDismiss(fixtureId);
  }, [onDismiss, fixtureId]);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (wasDragged.current) {
      e.stopPropagation();
      e.preventDefault();
      wasDragged.current = false;
    }
  }, []);

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {!isDismissing && (
        <motion.div
          key={fixtureId}
          className="touch-pan-y"
          style={{ x, opacity, overflow: "hidden", touchAction: "pan-y" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onClickCapture={handleClickCapture}
          exit={{
            x: -400,
            opacity: 0,
            height: 0,
            paddingTop: 0,
            paddingBottom: 0,
            marginTop: 0,
            marginBottom: 0,
            transition: {
              x: { duration: 0.2, ease: "easeOut" },
              opacity: { duration: 0.2, ease: "easeOut" },
              height: { duration: 0.25, ease: "easeInOut", delay: 0.05 },
              paddingTop: { duration: 0.25, ease: "easeInOut", delay: 0.05 },
              paddingBottom: { duration: 0.25, ease: "easeInOut", delay: 0.05 },
              marginTop: { duration: 0.25, ease: "easeInOut", delay: 0.05 },
              marginBottom: { duration: 0.25, ease: "easeInOut", delay: 0.05 },
            },
          }}
          data-swipeable-card
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
