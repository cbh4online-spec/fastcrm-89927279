// Package/Entitlement alert types
export type PackageAlertType = 
  | 'low_remaining'      // 80% consumed
  | 'expiring_soon'      // 7 days before expiry
  | 'inactive'           // No sessions for X days
  | 'completed'          // All sessions consumed
  | 'expired';           // Past expiry date

export type PackageAlertSeverity = 'info' | 'warning' | 'error';

export interface PackageAlert {
  type: PackageAlertType;
  severity: PackageAlertSeverity;
  title: string;
  message: string;
  entitlementId: string;
  productName: string;
  clientName: string;
  actions: PackageAlertAction[];
}

export interface PackageAlertAction {
  label: string;
  action: 'create_task' | 'create_opportunity' | 'send_message' | 'view_package';
  config?: Record<string, any>;
}

// Configuration for inactivity detection
export const INACTIVITY_DAYS_THRESHOLD = 14;
export const EXPIRY_WARNING_DAYS = 7;
export const LOW_REMAINING_THRESHOLD = 0.2; // 20% remaining

export const packageAlertMessages: Record<PackageAlertType, { title: string; message: (data: any) => string }> = {
  low_remaining: {
    title: 'Pacote quase a terminar',
    message: (data) => `${data.clientName} tem apenas ${data.remaining} ${data.unitName}(s) restantes. Considere sugerir renovação ou upgrade.`,
  },
  expiring_soon: {
    title: 'Validade a expirar',
    message: (data) => `O pacote de ${data.clientName} expira em ${data.daysLeft} dias. Contacte para agendar sessões restantes.`,
  },
  inactive: {
    title: 'Cliente inativo',
    message: (data) => `${data.clientName} não tem sessões registadas há ${data.daysSince} dias. Crie um follow-up.`,
  },
  completed: {
    title: 'Pacote concluído',
    message: (data) => `${data.clientName} completou o pacote de ${data.productName}. Excelente momento para propor o próximo nível.`,
  },
  expired: {
    title: 'Pacote expirado',
    message: (data) => `O pacote de ${data.clientName} expirou com ${data.remaining} ${data.unitName}(s) por usar. Considere oferecer extensão.`,
  },
};
