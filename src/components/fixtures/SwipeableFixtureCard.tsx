import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface SwipeableFixtureCardProps {
  fixtureId: string;
  onDismiss: (id: string) => void;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 100;

export function SwipeableFixtureCard({ fixtureId, onDismiss, children }: SwipeableFixtureCardProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setDismissed(true);
    }
  };

  return (
    <AnimatePresence mode="popLayout">
      {!dismissed && (
        <motion.div
          key={fixtureId}
          layout
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.4, right: 0 }}
          onDragEnd={handleDragEnd}
          exit={{
            x: -400,
            opacity: 0,
            height: 0,
            marginTop: 0,
            marginBottom: 0,
            transition: { duration: 0.3, ease: "easeInOut" },
          }}
          onAnimationComplete={(definition) => {
            if (dismissed) {
              onDismiss(fixtureId);
            }
          }}
          style={{ touchAction: "pan-y" }}
          data-swipeable-card
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
