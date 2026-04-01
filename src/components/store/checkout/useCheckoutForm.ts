import { useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parsePhoneNumber } from "libphonenumber-js";
import { trackEvent } from "@/lib/analytics";
import { checkoutStep1Schema, checkoutStep2Schema } from "./checkoutSchema";
import type { CartItem } from "@/contexts/StoreCartContext";

interface UseCheckoutFormOptions {
  wsId: string;
  wsSlug: string;
  items: CartItem[];
  subtotal: number;
}

export function useCheckoutForm({ wsId, wsSlug, items, subtotal }: UseCheckoutFormOptions) {
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const [contactId, setContactId] = useState<string | null>(null);
  const emailCapturedRef = useRef(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const captureLead = useCallback(
    async (data: { name: string; phone: string; email?: string }) => {
      try {
        const { data: result, error } = await supabase.functions.invoke("store-capture-lead", {
          body: {
            workspaceId: wsId,
            sessionId,
            name: data.name,
            phone: data.phone,
            email: data.email || undefined,
            cartItems: items.map((item) => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        });
        if (!error && result?.contactId) {
          setContactId(result.contactId);
        }
      } catch {
        // Non-blocking
      }
    },
    [wsId, sessionId, items]
  );

  const updateField = (field: string, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }));
    setFieldErrors((p) => ({ ...p, [field]: "" }));
  };

  const isStep1Valid = () => {
    return checkoutStep1Schema.safeParse(formData).success;
  };

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    const result = checkoutStep1Schema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    // Normalize phone
    try {
      const parsed = parsePhoneNumber(formData.phone, "PT");
      if (parsed) setFormData((p) => ({ ...p, phone: parsed.formatInternational() }));
    } catch {}

    captureLead({ name: formData.name, phone: formData.phone });
    trackEvent("begin_checkout", { workspaceSlug: wsSlug, subtotal, itemCount: items.length });
    setStep(2);
  };

  const handleEmailBlur = () => {
    if (formData.email.trim() && !emailCapturedRef.current) {
      emailCapturedRef.current = true;
      captureLead({ name: formData.name, phone: formData.phone, email: formData.email });
    }
  };

  const handleEmailChange = (value: string) => {
    updateField("email", value);
    emailCapturedRef.current = false;
  };

  const validateStep2 = (): boolean => {
    const result = checkoutStep2Schema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      });
      setFieldErrors(errors);
      return false;
    }
    return true;
  };

  return {
    formData,
    fieldErrors,
    step,
    setStep,
    isProcessing,
    setIsProcessing,
    contactId,
    sessionId,
    updateField,
    isStep1Valid,
    handleStep1Continue,
    handleEmailBlur,
    handleEmailChange,
    validateStep2,
  };
}
