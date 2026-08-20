"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function BentoCard({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className={`card-surface p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}
