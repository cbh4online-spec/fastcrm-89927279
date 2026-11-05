import { describe, it, expect } from "vitest";
import { ACTION_RULES, MAX_BULK_TASKS, TASK_DUE_DAYS, filterNewTasks, taskTitle } from "../actionLists";

const item = { id: "c1", type: "company" as const, name: "Loja X", phone: null, amount: 100, invoices: 2, max_overdue_days: 70 };

describe("listas de ação", () => {
  it("limites acordados: 60 dias, 2× ritmo, 150 €, prazo 3 dias, lote 50", () => {
    expect(ACTION_RULES.collectMinOverdueDays).toBe(60);
    expect(ACTION_RULES.reactivateHabitMultiplier).toBe(2);
    expect(ACTION_RULES.upsellMaxAvgTicket).toBe(150);
    expect(TASK_DUE_DAYS).toBe(3);
    expect(MAX_BULK_TASKS).toBe(50);
  });
  it("não duplica tarefa pendente com o mesmo cliente e motivo", () => {
    const t = taskTitle("collect", item);
    const rows = [{ title: t, related_id: "c1" }, { title: t, related_id: "c2" }];
    expect(filterNewTasks(rows, [{ title: t, related_id: "c1" }])).toEqual([{ title: t, related_id: "c2" }]);
  });
  it("não duplica dentro do mesmo lote e corta em 50", () => {
    const rows = Array.from({ length: 80 }, (_, i) => ({ title: "x", related_id: String(i % 60) }));
    expect(filterNewTasks(rows, [])).toHaveLength(50);
    expect(filterNewTasks([{ title: "x", related_id: "a" }, { title: "x", related_id: "a" }], [])).toHaveLength(1);
  });
});
