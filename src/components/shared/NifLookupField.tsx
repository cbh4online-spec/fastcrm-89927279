import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Loader2, CheckCircle2, AlertCircle, X, Plus } from "lucide-react";
import { useNifLookup, NifLookupResult } from "@/hooks/useNifLookup";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";

interface NifLookupFieldProps {
  form: UseFormReturn<any>;
  nifFieldName?: string;
  onDataReceived?: (data: NifLookupResult) => void;
  showStatusAlert?: boolean;
}

export function NifLookupField({
  form,
  nifFieldName = "tax_id",
  onDataReceived,
  showStatusAlert = true,
}: NifLookupFieldProps) {
  const { lookup, isLoading, status, message } = useNifLookup({
    showToasts: false,
    onSuccess: (data) => {
      onDataReceived?.(data);
    },
  });

  const handleLookup = async () => {
    const nif = form.getValues(nifFieldName);
    await lookup(nif);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <FormField
          control={form.control}
          name={nifFieldName}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>NIF</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    placeholder="Número de identificação fiscal"
                    maxLength={9}
                    {...field}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, '');
                      field.onChange(value);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLookup}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Pesquisar
                      </>
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {showStatusAlert && status !== "idle" && message && (
        <Alert variant={status === "success" ? "default" : "destructive"}>
          {status === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface CaeTagsFieldProps {
  form: UseFormReturn<any>;
  fieldName?: string;
  label?: string;
}

export function CaeTagsField({
  form,
  fieldName = "cae_codes",
  label = "Códigos CAE",
}: CaeTagsFieldProps) {
  const [inputValue, setInputValue] = useState("");

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {(field.value || []).map((code: string, index: number) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {code}
                    <button
                      type="button"
                      onClick={() => {
                        const newCodes = [...(field.value || [])];
                        newCodes.splice(index, 1);
                        field.onChange(newCodes);
                      }}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar código CAE (ex: 74900)"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = inputValue.trim();
                      if (value && /^\d{5}$/.test(value)) {
                        const currentCodes = field.value || [];
                        if (!currentCodes.includes(value)) {
                          field.onChange([...currentCodes, value]);
                        }
                        setInputValue('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const value = inputValue.trim();
                    if (value && /^\d{5}$/.test(value)) {
                      const currentCodes = field.value || [];
                      if (!currentCodes.includes(value)) {
                        field.onChange([...currentCodes, value]);
                      }
                      setInputValue('');
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Pressione Enter ou clique + para adicionar</p>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
