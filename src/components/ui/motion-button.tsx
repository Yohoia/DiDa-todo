"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

type MotionButtonProps = HTMLMotionProps<"button">;

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, whileHover, whileTap, transition, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={whileHover || { scale: 1.02 }}
        whileTap={whileTap || { scale: 0.98 }}
        transition={transition || { duration: 0.15, ease: "easeOut" }}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);

MotionButton.displayName = "MotionButton";
