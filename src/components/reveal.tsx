"use client";
import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const hidden = { opacity: 0, y, filter: "blur(6px)" };

  return (
    <motion.div
      ref={ref}
      initial={hidden}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : hidden}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className ?? ""}
    >
      {children}
    </motion.div>
  );
}
