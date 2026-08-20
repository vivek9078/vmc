"use client";

import { useEffect, useState } from "react";
import { useMotionValue, animate } from "framer-motion";

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  formatAsCurrency = false,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  formatAsCurrency?: boolean;
}) {
  const [display, setDisplay] = useState("0");
  const motionValue = useMotionValue(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => {
        setDisplay(
          formatAsCurrency
            ? Math.round(v).toLocaleString("en-US")
            : Math.round(v).toLocaleString()
        );
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
