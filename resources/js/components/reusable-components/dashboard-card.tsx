import React from "react";

import { cn } from "@/lib/utils";
import { Card, CardFooter, CardHeader } from "../ui/card";


interface ReusableCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export function ReusableCard({
  title,
  icon,
  children,
  loading = false,
  error = null,
  className,
}: ReusableCardProps) {
  return (
    <Card
      className={cn(
        "card bg border overflow-hidden ", // DaisyUI card base class
        className
      )}
    >
      {/* Card Header */}
     
        <CardHeader  className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h2 className="card-title text-sm font-medium text-secondary-foreground flex items-center gap-1">
            {title}
          </h2>
          {icon && <span>{icon}</span>}
        </CardHeader>

      
        {loading ? (
          <CardFooter className="">
            <div className="h-8 w-[140px] bg-primary animate-pulse" />
            <div className="h-4 w-[180px] bg-primary animate-pulse" />
          </CardFooter>
        ) : error ? (
          <CardFooter className="text-error text-sm">{error}</CardFooter>
        ) : (
          children
        )}
    
    </Card>
  );
}