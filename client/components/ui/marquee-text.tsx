"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface MarqueeTextProps {
  children: string;
  className?: string;
  speed?: number; // pixels per second
}

export function MarqueeText({
  children,
  className,
  speed = 30, // 30 pixels per second
}: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [translateDistance, setTranslateDistance] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0); // 0 to translateDistance
  const animationRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1); // 1 = moving right (showing end), -1 = moving left (showing start)
  const pauseTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        const overflow = textWidth > containerWidth;
        setIsOverflowing(overflow);
        if (overflow) {
          setTranslateDistance(textWidth - containerWidth);
        }
      }
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [children]);

  const animate = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Handle pause at ends (1.5 seconds)
      if (pauseTimeRef.current > 0) {
        pauseTimeRef.current -= deltaTime;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Calculate movement based on speed (pixels per second)
      const movement = (speed * deltaTime) / 1000;

      setCurrentPosition((prev) => {
        let newPos = prev + movement * directionRef.current;

        // Hit the end - pause and reverse
        if (newPos >= translateDistance) {
          newPos = translateDistance;
          directionRef.current = -1;
          pauseTimeRef.current = 1500; // 1.5s pause
        }
        // Hit the start - pause and reverse
        else if (newPos <= 0) {
          newPos = 0;
          directionRef.current = 1;
          pauseTimeRef.current = 5000; // 5s pause
        }

        return newPos;
      });

      animationRef.current = requestAnimationFrame(animate);
    },
    [speed, translateDistance]
  );

  useEffect(() => {
    if (!isOverflowing || translateDistance === 0) return;

    // Start animation
    lastTimeRef.current = 0;
    pauseTimeRef.current = 5000; // Initial pause before starting
    directionRef.current = 1;
    setCurrentPosition(0);

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isOverflowing, translateDistance, animate]);

  if (!isOverflowing) {
    return (
      <div ref={containerRef} className={cn("overflow-hidden", className)}>
        <span ref={textRef} className="whitespace-nowrap inline-block">
          {children}
        </span>
      </div>
    );
  }

  // Calculate gradient opacity based on position (smooth fade)
  const leftFadeOpacity = Math.min(1, currentPosition / 10);
  const rightFadeOpacity = Math.min(
    1,
    (translateDistance - currentPosition) / 10
  );

  // Create mask gradient based on fade positions
  const maskGradient = `linear-gradient(to right, 
    rgba(0,0,0,${1 - leftFadeOpacity}) 0%, 
    rgba(0,0,0,1) 12px, 
    rgba(0,0,0,1) calc(100% - 12px), 
    rgba(0,0,0,${1 - rightFadeOpacity}) 100%
  )`;

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden relative", className)}
      style={{
        maskImage: maskGradient,
        WebkitMaskImage: maskGradient,
      }}
    >
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap px-0.5"
        style={{
          transform: `translateX(-${currentPosition}px)`,
        }}
      >
        {children}
      </span>
    </div>
  );
}
