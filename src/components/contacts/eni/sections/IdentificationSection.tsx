import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, FileText, MessageSquare } from "lucide-react";
import { ENIContact, EntityType, ENTITY_TYPE_LABELS } from "../ENIContactTypes";

interface IdentificationSectionProps {
  contact: ENIContact;
  isEditing: boolean;
  editedData: Partial<ENIContact>;
  onFieldChange: (field: keyof ENIContact, value: unknown) => void;
}

export function IdentificationSection({ 
  contact, 
  isEditing, 
  editedData, 
  onFieldChange 
}: IdentificationSectionProps) {
  const getValue = <K extends keyof ENIContact>(field: K): ENIContact[K] => {
    return isEditing && field in editedData ? editedData[field] as ENIContact[K] : contact[field];
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Identificação
        </CardTitle>
        <CardDescription>Dados pessoais e fiscais do cliente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Entity Type */}
        <div className="space-y-2">
          <Label htmlFor="entity_type">Tipo de Entidade *</Label>
          {isEditing ? (
            <Select
              value={getValue('entity_type') || 'consumidor_final'}
              onValueChange={(value) => onFieldChange('entity_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium">
              {ENTITY_TYPE_LABELS[getValue('entity_type') as EntityType] || 'Consumidor Final'}
            </p>
          )}
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo *</Label>
          {isEditing ? (
            <Input
              id="name"
              value={getValue('name') || ''}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder="Nome do cliente"
            />
          ) : (
            <p className="text-sm">{contact.name}</p>
          )}
        </div>

        {/* NIF */}
        <div className="space-y-2">
          <Label htmlFor="tax_id" className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            NIF
          </Label>
          {isEditing ? (
            <Input
              id="tax_id"
              value={getValue('tax_id') || ''}
              onChange={(e) => onFieldChange('tax_id', e.target.value)}
              placeholder="Número de Identificação Fiscal"
              maxLength={9}
            />
          ) : (
            <p className="text-sm">{getValue('tax_id') || '—'}</p>
          )}
        </div>

        {/* Commercial Name (optional) */}
        <div className="space-y-2">
          <Label htmlFor="commercial_name">Nome Comercial (opcional)</Label>
          {isEditing ? (
            <Input
              id="commercial_name"
              value={getValue('commercial_name') || ''}
              onChange={(e) => onFieldChange('commercial_name', e.target.value)}
              placeholder="Nome comercial ou marca"
            />
          ) : (
            <p className="text-sm">{getValue('commercial_name') || '—'}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" />
            Email Principal
          </Label>
          {isEditing ? (
            <Input
              id="email"
              type="email"
              value={getValue('email') || ''}
              onChange={(e) => onFieldChange('email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          ) : (
            <p className="text-sm">
              {getValue('email') ? (
                <a href={`mailto:${getValue('email')}`} className="text-primary hover:underline">
                  {getValue('email')}
                </a>
              ) : '—'}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            Telemóvel
          </Label>
          {isEditing ? (
            <Input
              id="phone"
              value={getValue('phone') || ''}
              onChange={(e) => onFieldChange('phone', e.target.value)}
              placeholder="+351 912 345 678"
            />
          ) : (
            <p className="text-sm">
              {getValue('phone') ? (
                <a href={`tel:${getValue('phone')}`} className="text-primary hover:underline">
                  {getValue('phone')}
                </a>
              ) : '—'}
            </p>
          )}
        </div>

        {/* WhatsApp */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has_whatsapp"
              checked={getValue('has_whatsapp') || false}
              onCheckedChange={(checked) => onFieldChange('has_whatsapp', checked)}
              disabled={!isEditing}
            />
            <Label htmlFor="has_whatsapp" className="flex items-center gap-2 cursor-pointer">
              <MessageSquare className="h-3.5 w-3.5 text-green-600" />
              Tem WhatsApp
            </Label>
          </div>
          
          {getValue('has_whatsapp') && (
            <div className="ml-6">
              {isEditing ? (
                <Input
                  value={getValue('whatsapp_number') || getValue('phone') || ''}
                  onChange={(e) => onFieldChange('whatsapp_number', e.target.value)}
                  placeholder="Número WhatsApp"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {getValue('whatsapp_number') || getValue('phone') || '—'}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
