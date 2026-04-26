import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const;

/** Section wrapper: max-width container + generous vertical padding */
export function Section({
  id,
  children,
  className,
  bleed = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  bleed?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative w-full",
        bleed ? "px-0" : "px-6 md:px-10",
        "py-20 md:py-28",
        className,
      )}
    >
      <div className={cn("mx-auto", bleed ? "" : "max-w-7xl")}>{children}</div>
    </section>
  );
}

/** Eyebrow chip used above section titles */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-brand">
      <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
      {children}
    </div>
  );
}

/** Section header (eyebrow + title + subtitle) with scroll reveal */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE_PREMIUM }}
      className={cn(
        "mb-14 max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
      )}
    >
      {eyebrow && (
        <div className={cn("mb-5 flex", align === "center" ? "justify-center" : "")}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-navy md:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-lg leading-relaxed text-navy-500 md:text-xl">{subtitle}</p>
      )}
    </motion.div>
  );
}

/** Reveal-on-scroll wrapper for any child */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: EASE_PREMIUM, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Animated number counter — animates from 0 → value when in view */
export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.6,
  locale = "pt-PT",
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  locale?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: duration * 1000, bounce: 0 });
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const display = useTransform(spring, (latest) =>
    `${prefix}${formatter.format(Number(latest.toFixed(decimals)))}${suffix}`,
  );

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  return (
    <motion.span ref={ref} className={cn("tabular-nums", className)}>
      {display}
    </motion.span>
  );
}

/** Soft brand glow background blob */
export function BrandGlow({
  className,
  variant = "blue",
}: {
  className?: string;
  variant?: "blue" | "cyan" | "mix";
}) {
  const bg =
    variant === "cyan"
      ? "bg-[radial-gradient(ellipse_at_center,hsl(192_100%_50%/0.18),transparent_70%)]"
      : variant === "mix"
      ? "bg-[radial-gradient(ellipse_at_center,hsl(218_100%_54%/0.18),hsl(192_100%_50%/0.12)_45%,transparent_75%)]"
      : "bg-[radial-gradient(ellipse_at_center,hsl(218_100%_54%/0.18),transparent_70%)]";
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute blur-3xl", bg, className)}
    />
  );
}
