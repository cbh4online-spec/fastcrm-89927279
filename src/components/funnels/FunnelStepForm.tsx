import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle2 } from "lucide-react";

export interface FormFieldConfig {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "textarea" | "checkbox" | "radio" | "hidden" | "consent" | "marketing_opt_in";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FunnelStepFormProps {
  fields: FormFieldConfig[];
  ctaText?: string;
  ctaColor?: string;
  consentRequired?: boolean;
  consentText?: string;
  privacyPolicyUrl?: string;
  marketingOptInEnabled?: boolean;
  marketingOptInLabel?: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onFormStarted?: () => void;
  submitted?: boolean;
}

function buildSchema(fields: FormFieldConfig[], consentRequired?: boolean) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const f of fields) {
    if (f.type === "hidden") continue;
    if (f.type === "consent" || f.type === "marketing_opt_in") {
      if (f.type === "consent" && consentRequired) {
        shape[f.id] = z.literal(true, { errorMap: () => ({ message: "Consentimento obrigatório" }) });
      } else {
        shape[f.id] = z.boolean().optional();
      }
      continue;
    }
    if (f.type === "checkbox") {
      shape[f.id] = f.required
        ? z.literal(true, { errorMap: () => ({ message: "Campo obrigatório" }) })
        : z.boolean().optional();
      continue;
    }

    let s: z.ZodTypeAny = z.string();
    if (f.type === "email") {
      s = z.string().email("Email inválido");
    } else if (f.type === "phone") {
      s = z.string().regex(/^\+?[\d\s\-()]{7,20}$/, "Telefone inválido");
    }

    if (f.required) {
      s = (s as z.ZodString).min(1, "Campo obrigatório");
    } else {
      s = (s as z.ZodString).optional().or(z.literal(""));
    }
    shape[f.id] = s;
  }

  // Add consent fields if not already in form_fields
  if (consentRequired && !fields.some(f => f.type === "consent")) {
    shape["__consent"] = z.literal(true, { errorMap: () => ({ message: "Consentimento obrigatório" }) });
  }

  // Honeypot
  shape["__hp"] = z.string().max(0).optional();

  return z.object(shape);
}

export function FunnelStepForm({
  fields,
  ctaText,
  ctaColor,
  consentRequired,
  consentText,
  privacyPolicyUrl,
  marketingOptInEnabled,
  marketingOptInLabel,
  onSubmit,
  onFormStarted,
  submitted,
}: FunnelStepFormProps) {
  const schema = buildSchema(fields, consentRequired);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(
      fields.map(f => [f.id, f.type === "checkbox" || f.type === "consent" || f.type === "marketing_opt_in" ? false : ""])
    ),
  });

  const formStartedRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  // Track form_started on first focus
  const handleFocus = () => {
    if (!formStartedRef.current) {
      formStartedRef.current = true;
      onFormStarted?.();
    }
  };

  const doSubmit = async (data: Record<string, unknown>) => {
    // Check honeypot
    if (data.__hp) return;
    delete data.__hp;

    try {
      await onSubmit(data);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (submitted || status === "success") {
    return (
      <div className="text-center py-8 space-y-3 bg-muted/30 border rounded-xl p-6">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <h3 className="text-lg font-semibold">Enviado com sucesso!</h3>
        <p className="text-sm text-muted-foreground">Obrigado pelo seu interesse.</p>
      </div>
    );
  }

  const needsExternalConsent = consentRequired && !fields.some(f => f.type === "consent");

  return (
    <form
      onSubmit={handleSubmit(doSubmit)}
      onFocus={handleFocus}
      className="space-y-4 bg-muted/30 border rounded-xl p-6"
      noValidate
    >
      {/* Honeypot - invisible to users */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <input type="text" tabIndex={-1} autoComplete="off" {...register("__hp")} />
      </div>

      {fields.map((field) => {
        if (field.type === "hidden") {
          return <input key={field.id} type="hidden" {...register(field.id)} />;
        }

        const error = errors[field.id];

        if (field.type === "consent") {
          return (
            <div key={field.id} className="space-y-1">
              <div className="flex items-start gap-2">
                <Checkbox
                  id={field.id}
                  checked={!!watch(field.id)}
                  onCheckedChange={(v) => setValue(field.id, !!v, { shouldValidate: true })}
                />
                <label htmlFor={field.id} className="text-sm leading-tight cursor-pointer">
                  {consentText || field.label || "Aceito os termos e condições"}
                  {privacyPolicyUrl && (
                    <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline ml-1">
                      Política de Privacidade
                    </a>
                  )}
                </label>
              </div>
              {error && <p className="text-xs text-destructive">{String(error.message)}</p>}
            </div>
          );
        }

        if (field.type === "marketing_opt_in") {
          if (!marketingOptInEnabled) return null;
          return (
            <div key={field.id} className="flex items-start gap-2">
              <Checkbox
                id={field.id}
                checked={!!watch(field.id)}
                onCheckedChange={(v) => setValue(field.id, !!v, { shouldValidate: true })}
              />
              <label htmlFor={field.id} className="text-sm leading-tight cursor-pointer">
                {marketingOptInLabel || field.label || "Aceito receber comunicações de marketing"}
              </label>
            </div>
          );
        }

        if (field.type === "checkbox") {
          return (
            <div key={field.id} className="space-y-1">
              <div className="flex items-start gap-2">
                <Checkbox
                  id={field.id}
                  checked={!!watch(field.id)}
                  onCheckedChange={(v) => setValue(field.id, !!v, { shouldValidate: true })}
                />
                <label htmlFor={field.id} className="text-sm leading-tight cursor-pointer">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </label>
              </div>
              {error && <p className="text-xs text-destructive">{String(error.message)}</p>}
            </div>
          );
        }

        if (field.type === "radio" && field.options?.length) {
          return (
            <div key={field.id} className="space-y-1.5">
              <Label className="text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <RadioGroup
                value={watch(field.id) as string || ""}
                onValueChange={(v) => setValue(field.id, v, { shouldValidate: true })}
              >
                {field.options.map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                    <Label htmlFor={`${field.id}-${opt}`} className="text-sm font-normal cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
              {error && <p className="text-xs text-destructive">{String(error.message)}</p>}
            </div>
          );
        }

        if (field.type === "select" && field.options?.length) {
          return (
            <div key={field.id} className="space-y-1.5">
              <Label className="text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Select
                value={watch(field.id) as string || ""}
                onValueChange={(v) => setValue(field.id, v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={field.placeholder || "Selecionar..."} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error && <p className="text-xs text-destructive">{String(error.message)}</p>}
            </div>
          );
        }

        if (field.type === "textarea") {
          return (
            <div key={field.id} className="space-y-1.5">
              <Label className="text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Textarea
                {...register(field.id)}
                placeholder={field.placeholder}
                rows={3}
              />
              {error && <p className="text-xs text-destructive">{String(error.message)}</p>}
            </div>
          );
        }

        // text, email, phone
        return (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <Input
              type={field.type === "phone" ? "tel" : field.type === "email" ? "email" : "text"}
              {...register(field.id)}
              placeholder={field.placeholder}
            />
            {error && <p className="text-xs text-destructive">{String(error.message)}</p>}
          </div>
        );
      })}

      {/* External consent checkbox (when consent_required but no consent field in form_fields) */}
      {needsExternalConsent && (
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <Checkbox
              id="__consent"
              checked={!!watch("__consent")}
              onCheckedChange={(v) => setValue("__consent", !!v, { shouldValidate: true })}
            />
            <label htmlFor="__consent" className="text-sm leading-tight cursor-pointer">
              {consentText || "Aceito os termos e condições"}
              {privacyPolicyUrl && (
                <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline ml-1">
                  Política de Privacidade
                </a>
              )}
            </label>
          </div>
          {errors["__consent"] && <p className="text-xs text-destructive">{String(errors["__consent"].message)}</p>}
        </div>
      )}

      {/* Marketing opt-in (when enabled globally but no field in form_fields) */}
      {marketingOptInEnabled && !fields.some(f => f.type === "marketing_opt_in") && (
        <div className="flex items-start gap-2">
          <Checkbox
            id="__marketing_opt_in"
            checked={!!watch("__marketing_opt_in" as any)}
            onCheckedChange={(v) => setValue("__marketing_opt_in" as any, !!v)}
          />
          <label htmlFor="__marketing_opt_in" className="text-sm leading-tight cursor-pointer">
            {marketingOptInLabel || "Aceito receber comunicações de marketing"}
          </label>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-destructive text-center">Erro ao enviar. Tente novamente.</p>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isSubmitting}
        style={ctaColor ? { backgroundColor: ctaColor } : undefined}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {ctaText || "Enviar"}
      </Button>
    </form>
  );
}
