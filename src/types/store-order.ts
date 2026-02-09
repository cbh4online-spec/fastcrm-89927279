export interface StoreOrderEvent {
  id: string;
  order_id: string;
  workspace_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export const ORDER_EVENT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  status_change: { label: "Alteração de Estado", icon: "RefreshCw", color: "text-blue-600" },
  note_added: { label: "Nota Adicionada", icon: "MessageSquare", color: "text-gray-600" },
  payment_received: { label: "Pagamento Recebido", icon: "CreditCard", color: "text-green-600" },
  shipment_created: { label: "Envio Criado", icon: "Truck", color: "text-purple-600" },
  refund_issued: { label: "Reembolso Emitido", icon: "RotateCcw", color: "text-red-600" },
};

export const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  paid: { label: "Pago", color: "bg-green-100 text-green-800 border-green-200" },
  processing: { label: "Em Preparação", color: "bg-blue-100 text-blue-800 border-blue-200" },
  shipped: { label: "Enviado", color: "bg-purple-100 text-purple-800 border-purple-200" },
  delivered: { label: "Entregue", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200" },
  refunded: { label: "Reembolsado", color: "bg-gray-100 text-gray-800 border-gray-200" },
};
