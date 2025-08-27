"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface CountAnimationProps {
  number: number;
  className: string;
  formatAsCurrency?: boolean;
}

function CountAnimation({
  number,
  className,
  formatAsCurrency = false,
}: CountAnimationProps) {
  const count = useMotionValue(0);
  // Use two separate transforms based on format type
  const roundedNumber = useTransform(count, (value) => Number(value.toFixed(2)));
  const formattedCurrency = useTransform(count, (latest) => {
    return `₱${new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(latest)}`;
  });

  useEffect(() => {
    const animation = animate(count, number, { duration: 2 });
    return animation.stop;
  }, [number]);

  return (
    <motion.h1 className={cn(className)}>
      {formatAsCurrency ? formattedCurrency : roundedNumber}
    </motion.h1>
  );
}

export { CountAnimation };
