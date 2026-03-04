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
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setIsDismissing(true);
    }
  }, []);

  const handleExitComplete = useCallback(() => {
    onDismiss(fixtureId);
  }, [onDismiss, fixtureId]);

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {!isDismissing && (
        <motion.div
          ref={cardRef}
          key={fixtureId}
          style={{ x, opacity, overflow: "hidden" }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.3, right: 0 }}
          dragSnapToOrigin
          onDragEnd={handleDragEnd}
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
