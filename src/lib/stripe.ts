import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get a singleton Stripe instance.
 * Reads the publishable key from VITE_STRIPE_PUBLISHABLE_KEY env var.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (!key) {
      console.warn("[stripe] VITE_STRIPE_PUBLISHABLE_KEY not set");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
