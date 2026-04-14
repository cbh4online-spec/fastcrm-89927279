import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const REACTION_EMOJIS = ["❤️", "🔥", "👍", "😍", "🎉", "👏"];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number; // percentage from right
}

let emojiCounter = 0;

interface Props {
  isLive: boolean;
}

export function LiveReactions({ isLive }: Props) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);

  const spawnEmoji = useCallback((emoji: string) => {
    emojiCounter += 1;
    const item: FloatingEmoji = {
      id: emojiCounter,
      emoji,
      x: 8 + Math.random() * 35,
    };
    setFloating((prev) => [...prev.slice(-20), item]);
    setTimeout(() => {
      setFloating((prev) => prev.filter((e) => e.id !== item.id));
    }, 2800);
  }, []);

  // Auto-spawn random reactions to simulate audience
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.6) {
        const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
        spawnEmoji(emoji);
      }
    }, 1500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [isLive, spawnEmoji]);

  if (!isLive) return null;

  return (
    <>
      {/* Floating emojis */}
      <div className="absolute bottom-16 right-4 w-16 h-64 pointer-events-none z-30">
        <AnimatePresence>
          {floating.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{
                opacity: [1, 1, 0],
                y: -250 - Math.random() * 50,
                scale: [0.5, 1.2, 0.8],
                x: Math.sin(item.id) * 20,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute bottom-0 text-2xl"
              style={{ right: `${item.x}%` }}
            >
              {item.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction buttons */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 z-30">
        {REACTION_EMOJIS.map((emoji) => (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            className="rounded-full w-9 h-9 p-0 text-lg bg-black/40 hover:bg-black/60 hover:scale-110 transition-transform backdrop-blur-sm"
            onClick={() => spawnEmoji(emoji)}
          >
            {emoji}
          </Button>
        ))}
      </div>
    </>
  );
}
