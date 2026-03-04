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
  const directionLocked = useRef(false);

  const resetGestureState = useCallback(() => {
    isVerticalScroll.current = false;
    directionLocked.current = false;
    wasDragged.current = false;
  }, []);

  const handlePointerDown = useCallback(() => {
    resetGestureState();
  }, [resetGestureState]);

  const handlePointerCancel = useCallback(() => {
    resetGestureState();
    x.set(0);
  }, [resetGestureState, x]);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    if (!directionLocked.current) {
      const absX = Math.abs(info.offset.x);
      const absY = Math.abs(info.offset.y);
      if (absX > 8 || absY > 8) {
        directionLocked.current = true;
        isVerticalScroll.current = absY > absX;
      }
    }

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
      return;
    }

    x.set(0);
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
          style={{ x, opacity, overflow: "hidden", touchAction: "pan-y" }}
          drag="x"
          dragConstraints={{ left: -150, right: 0 }}
          dragElastic={{ left: 0.15, right: 0 }}
          dragMomentum={false}
          onPointerDown={handlePointerDown}
          onPointerCancel={handlePointerCancel}
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
