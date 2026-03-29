import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedHandCursorProps {
  containerRef: React.RefObject<HTMLElement>;
}

export function AnimatedHandCursor({ containerRef }: AnimatedHandCursorProps) {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseDown = useCallback(() => setIsGrabbing(true), []);
  const handleMouseUp = useCallback(() => setIsGrabbing(false), []);
  const handleMouseEnter = useCallback(() => setIsVisible(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
    setIsGrabbing(false);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mousedown", handleMouseDown);
    el.addEventListener("mouseup", handleMouseUp);
    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mousedown", handleMouseDown);
      el.removeEventListener("mouseup", handleMouseUp);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [containerRef, handleMouseMove, handleMouseDown, handleMouseUp, handleMouseEnter, handleMouseLeave]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.15 }}
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: position.x - 16,
            top: position.y - 4,
          }}
        >
          <motion.svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            animate={isGrabbing
              ? { scale: 0.85, rotate: -8 }
              : { scale: [1, 1.06, 1], rotate: [0, 3, -2, 0] }
            }
            transition={isGrabbing
              ? { duration: 0.12 }
              : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {/* Drop shadow */}
            <defs>
              <filter id="hand-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.3" />
              </filter>
            </defs>

            {isGrabbing ? (
              /* Grabbing / closed hand */
              <g filter="url(#hand-shadow)">
                <path
                  d="M8 12V8.5C8 7.67 8.67 7 9.5 7S11 7.67 11 8.5V12M11 8V6.5C11 5.67 11.67 5 12.5 5S14 5.67 14 6.5V12M14 7.5C14 6.67 14.67 6 15.5 6S17 6.67 17 7.5V12"
                  stroke="hsl(35, 40%, 90%)"
                  strokeWidth="1.2"
                  fill="hsl(35, 50%, 95%)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 9.5C17 8.67 17.67 8 18.5 8S20 8.67 20 9.5V15C20 18.31 17.31 21 14 21H12.5C10.5 21 8.68 20.05 7.5 18.5L4.78 14.67C4.3 14.01 4.43 13.11 5.08 12.62C5.73 12.13 6.63 12.27 7.11 12.92L8 14"
                  stroke="hsl(35, 40%, 90%)"
                  strokeWidth="1.2"
                  fill="hsl(35, 50%, 95%)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ) : (
              /* Open hand / grab ready */
              <g filter="url(#hand-shadow)">
                <path
                  d="M8 13V7.5C8 6.67 8.67 6 9.5 6S11 6.67 11 7.5V13M11 6.5V4.5C11 3.67 11.67 3 12.5 3S14 3.67 14 4.5V13M14 5.5C14 4.67 14.67 4 15.5 4S17 4.67 17 5.5V13"
                  stroke="hsl(35, 40%, 85%)"
                  strokeWidth="1.2"
                  fill="hsl(35, 50%, 95%)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 7.5C17 6.67 17.67 6 18.5 6S20 6.67 20 7.5V15C20 18.31 17.31 21 14 21H12.5C10.5 21 8.68 20.05 7.5 18.5L4.78 14.67C4.3 14.01 4.43 13.11 5.08 12.62C5.73 12.13 6.63 12.27 7.11 12.92L8 14"
                  stroke="hsl(35, 40%, 85%)"
                  strokeWidth="1.2"
                  fill="hsl(35, 50%, 95%)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
