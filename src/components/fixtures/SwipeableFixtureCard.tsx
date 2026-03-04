import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";

interface SwipeableFixtureCardProps {
  fixtureId: string;
  onDismiss: (id: string) => void;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableFixtureCard({ fixtureId, onDismiss, children }: SwipeableFixtureCardProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, -80, 0], [0.3, 0.8, 1]);
  const wasDragged = useRef(false);
  const isVerticalScroll = useRef(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const directionLocked = useRef(false);

  // Manual direction detection to avoid framer-motion's dragDirectionLock
  // which can block vertical scrolling at scroll boundaries
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    isVerticalScroll.current = false;
    directionLocked.current = false;
    wasDragged.current = false;
  }, []);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    // If we haven't locked direction yet, determine it
    if (!directionLocked.current) {
      const absX = Math.abs(info.offset.x);
      const absY = Math.abs(info.offset.y);
      if (absX > 8 || absY > 8) {
        directionLocked.current = true;
        isVerticalScroll.current = absY > absX;
      }
    }

    // If vertical scroll detected, force x back to 0
    if (isVerticalScroll.current) {
      x.set(0);
      return;
    }

    if (Math.abs(info.offset.x) > 10) {
      wasDragged.current = true;
    }
  }, [x]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (isVerticalScroll.current) {
      x.set(0);
      return;
    }
    if (info.offset.x < -SWIPE_THRESHOLD && Math.abs(info.offset.y) < Math.abs(info.offset.x)) {
      setIsDismissing(true);
    }
  }, [x]);

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
          style={{ x, opacity, overflow: "hidden" }}
          drag="x"
          dragConstraints={{ left: -150, right: 0 }}
          dragElastic={{ left: 0.15, right: 0 }}
          dragMomentum={false}
          onPointerDown={handlePointerDown}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
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
