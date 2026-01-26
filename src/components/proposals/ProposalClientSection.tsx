import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, User, FileText, MapPin } from "lucide-react";
import { ClientSearchSelect } from "./ClientSearchSelect";
import { CLIENT_TYPE_OPTIONS, type ClientType } from "./proposalConstants";
import { cn } from "@/lib/utils";

interface ClientData {
  clientType: ClientType;
  contactId: string | null;
  companyId: string | null;
  billingName: string;
  billingNif: string;
  billingAddress: string;
}

interface ProposalClientSectionProps {
  data: ClientData;
  onChange: (data: ClientData) => void;
  disabled?: boolean;
}

export function ProposalClientSection({
  data,
  onChange,
  disabled = false,
}: ProposalClientSectionProps) {
  const handleClientTypeChange = (value: ClientType) => {
    onChange({
      ...data,
      clientType: value,
      // Clear the other client type when switching
      contactId: value === "contact" ? data.contactId : null,
      companyId: value === "company" ? data.companyId : null,
    });
  };

  const handleClientSelect = (
    id: string | null,
    client: { name: string; email?: string | null; tax_id?: string | null; address?: string | null } | null
  ) => {
    if (data.clientType === "contact") {
      onChange({
        ...data,
        contactId: id,
        // Pre-fill billing info from client
        billingName: client?.name || data.billingName,
        billingNif: client?.tax_id || data.billingNif,
        billingAddress: client?.address || data.billingAddress,
      });
    } else {
      onChange({
        ...data,
        companyId: id,
        billingName: client?.name || data.billingName,
        billingNif: client?.tax_id || data.billingNif,
        billingAddress: client?.address || data.billingAddress,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Client Type Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Tipo de Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.clientType}
            onValueChange={(v) => handleClientTypeChange(v as ClientType)}
            className="grid grid-cols-2 gap-4"
            disabled={disabled}
          >
            {CLIENT_TYPE_OPTIONS.map((option) => {
              const Icon = option.value === "company" ? Building2 : User;
              return (
                <Label
                  key={option.value}
                  htmlFor={option.value}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    data.clientType === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Client Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            {data.clientType === "company" ? (
              <Building2 className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
            Selecionar {data.clientType === "contact" ? "Contacto" : "Empresa"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientSearchSelect
            clientType={data.clientType}
            value={data.clientType === "contact" ? data.contactId : data.companyId}
            onChange={handleClientSelect}
            placeholder={`Pesquisar ${data.clientType === "contact" ? "contacto" : "empresa"}...`}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Dados de Faturação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing-name">Nome / Empresa</Label>
              <Input
                id="billing-name"
                value={data.billingName}
                onChange={(e) => onChange({ ...data, billingName: e.target.value })}
                placeholder="Nome para faturação"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-nif">NIF</Label>
              <Input
                id="billing-nif"
                value={data.billingNif}
                onChange={(e) => onChange({ ...data, billingNif: e.target.value })}
                placeholder="Número de Identificação Fiscal"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-address" className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              Morada de Faturação
            </Label>
            <Textarea
              id="billing-address"
              value={data.billingAddress}
              onChange={(e) => onChange({ ...data, billingAddress: e.target.value })}
              placeholder="Morada completa para faturação..."
              rows={3}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
