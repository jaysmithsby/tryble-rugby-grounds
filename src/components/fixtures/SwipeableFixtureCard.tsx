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

  const handleDragStart = useCallback(() => {
    wasDragged.current = false;
  }, []);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 10) {
      wasDragged.current = true;
    }
  }, []);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && Math.abs(info.offset.y) < Math.abs(info.offset.x)) {
      setIsDismissing(true);
    }
  }, []);

  const handleExitComplete = useCallback(() => {
    onDismiss(fixtureId);
  }, [onDismiss, fixtureId]);

  // Prevent click events from firing after a swipe gesture
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
          style={{ x, opacity, overflow: "hidden", touchAction: "pan-y" }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: -150, right: 0 }}
          dragElastic={{ left: 0.15, right: 0 }}
          dragMomentum={false}
          onDragStart={handleDragStart}
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
