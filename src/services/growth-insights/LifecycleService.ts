// Lifecycle Service - Scheduled maintenance and automated triggers
import type { 
  LifecycleTrigger, 
  LifecycleEvent, 
  LifecycleEventType, 
  LifecycleActionType,
  TopCustomer 
} from '@/types/growth-insights';

export class LifecycleService {
  private static instance: LifecycleService;

  static getInstance(): LifecycleService {
    if (!LifecycleService.instance) {
      LifecycleService.instance = new LifecycleService();
    }
    return LifecycleService.instance;
  }

  /**
   * Get default lifecycle triggers for common business patterns
   */
  getDefaultTriggers(): LifecycleTrigger[] {
    return [
      {
        id: 'default-followup-30',
        name: 'Follow-up 30 dias',
        description: 'Contactar cliente 30 dias após compra para verificar satisfação',
        eventType: 'days_after_purchase',
        eventValue: 30,
        action: 'create_task',
        actionConfig: {
          title: 'Follow-up de satisfação',
          description: 'Verificar se o cliente está satisfeito com a compra'
        },
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'default-upsell-60',
        name: 'Oportunidade de upsell',
        description: 'Sugerir produtos complementares 60 dias após compra',
        eventType: 'days_after_purchase',
        eventValue: 60,
        action: 'create_opportunity',
        actionConfig: {
          title: 'Oportunidade de cross-sell',
          stage: 'initial'
        },
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'default-reactivation-90',
        name: 'Reativação de cliente',
        description: 'Contactar cliente inativo há 90 dias',
        eventType: 'days_after_last_interaction',
        eventValue: 90,
        action: 'send_email',
        actionConfig: {
          templateId: 'reactivation',
          subject: 'Sentimos a sua falta!'
        },
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'default-renewal-30',
        name: 'Lembrete de renovação',
        description: 'Avisar 30 dias antes da renovação',
        eventType: 'days_before_renewal',
        eventValue: 30,
        action: 'create_task',
        actionConfig: {
          title: 'Renovação próxima',
          priority: 'high'
        },
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Evaluate lifecycle triggers for all customers
   */
  evaluateTriggers(
    customers: TopCustomer[],
    triggers: LifecycleTrigger[],
    lastInteractions: Map<string, Date>,
    renewalDates: Map<string, Date>
  ): LifecycleEvent[] {
    const events: LifecycleEvent[] = [];
    const now = new Date();

    for (const customer of customers) {
      for (const trigger of triggers.filter(t => t.isActive)) {
        const event = this.evaluateTriggerForCustomer(
          customer,
          trigger,
          lastInteractions.get(customer.id),
          renewalDates.get(customer.id),
          now
        );

        if (event) {
          events.push(event);
        }
      }
    }

    return events.sort((a, b) => 
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );
  }

  /**
   * Evaluate a single trigger for a customer
   */
  private evaluateTriggerForCustomer(
    customer: TopCustomer,
    trigger: LifecycleTrigger,
    lastInteraction?: Date,
    renewalDate?: Date,
    now: Date = new Date()
  ): LifecycleEvent | null {
    let eventDate: Date | null = null;
    let productContext: { id?: string; name?: string } = {};

    switch (trigger.eventType) {
      case 'days_after_purchase': {
        if (customer.products.length === 0) return null;
        const lastProduct = customer.products[customer.products.length - 1];
        const purchaseDate = new Date(lastProduct.purchaseDate);
        eventDate = new Date(purchaseDate);
        eventDate.setDate(eventDate.getDate() + trigger.eventValue);
        productContext = { id: lastProduct.productId, name: lastProduct.productName };
        break;
      }

      case 'days_after_completion': {
        // Assume completion date is purchase date + some buffer
        if (customer.products.length === 0) return null;
        const lastProduct = customer.products[customer.products.length - 1];
        const completionDate = new Date(lastProduct.purchaseDate);
        completionDate.setDate(completionDate.getDate() + 7); // Assume 7 days to complete
        eventDate = new Date(completionDate);
        eventDate.setDate(eventDate.getDate() + trigger.eventValue);
        productContext = { id: lastProduct.productId, name: lastProduct.productName };
        break;
      }

      case 'days_after_last_interaction': {
        if (!lastInteraction) {
          // Use last purchase as fallback
          if (customer.lastPurchaseDate) {
            lastInteraction = new Date(customer.lastPurchaseDate);
          } else {
            return null;
          }
        }
        eventDate = new Date(lastInteraction);
        eventDate.setDate(eventDate.getDate() + trigger.eventValue);
        break;
      }

      case 'days_before_renewal': {
        if (!renewalDate) return null;
        eventDate = new Date(renewalDate);
        eventDate.setDate(eventDate.getDate() - trigger.eventValue);
        break;
      }
    }

    if (!eventDate) return null;

    // Check if event is due (within next 7 days or past due)
    const daysDiff = this.daysBetween(now, eventDate);
    if (daysDiff > 7 || daysDiff < -30) return null;

    return {
      id: `event-${customer.id}-${trigger.id}-${eventDate.toISOString()}`,
      triggerId: trigger.id,
      customerId: customer.id,
      customerName: customer.name,
      productId: productContext.id,
      productName: productContext.name,
      eventDate: eventDate.toISOString(),
      status: daysDiff < 0 ? 'pending' : 'pending',
      actionType: trigger.action,
      suggestion: this.generateSuggestion(trigger, customer, productContext)
    };
  }

  /**
   * Generate human-readable suggestion text
   */
  private generateSuggestion(
    trigger: LifecycleTrigger,
    customer: TopCustomer,
    productContext: { id?: string; name?: string }
  ): string {
    const actionLabels: Record<LifecycleActionType, string> = {
      create_task: 'Criar tarefa para',
      send_email: 'Enviar email para',
      send_whatsapp: 'Enviar WhatsApp para',
      create_opportunity: 'Criar oportunidade para',
      trigger_automation: 'Disparar automação para'
    };

    const base = `${actionLabels[trigger.action]} ${customer.name}`;
    
    if (productContext.name) {
      return `${base} sobre "${productContext.name}".`;
    }

    return `${base}.`;
  }

  /**
   * Execute a lifecycle action
   */
  async executeAction(
    event: LifecycleEvent,
    trigger: LifecycleTrigger
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    // This would integrate with actual actions
    // For now, return placeholder success
    switch (event.actionType) {
      case 'create_task':
        return {
          success: true,
          result: `Tarefa criada: ${trigger.actionConfig.title || 'Follow-up'}`
        };
      
      case 'send_email':
        return {
          success: true,
          result: `Email preparado: ${trigger.actionConfig.subject || 'Mensagem automática'}`
        };
      
      case 'create_opportunity':
        return {
          success: true,
          result: `Oportunidade criada: ${trigger.actionConfig.title || 'Nova oportunidade'}`
        };
      
      default:
        return {
          success: true,
          result: 'Ação executada com sucesso'
        };
    }
  }

  private daysBetween(date1: Date, date2: Date): number {
    const diffTime = date2.getTime() - date1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export const lifecycleService = LifecycleService.getInstance();
