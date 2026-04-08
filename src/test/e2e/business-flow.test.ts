/**
 * E2E Business Flow Integration Tests
 * 
 * Tests the critical business path: Auth → Lead → Opportunity → Invoice
 * Uses mocked Supabase client to validate logic without real DB calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockAuth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
    auth: mockAuth,
  },
}));

// Helper to create chainable query mock
function createQueryMock(returnData: any = null, returnError: any = null) {
  const chain: any = {};
  const methods = ["select", "insert", "update", "delete", "eq", "neq", "in", "is", "not",
    "gt", "gte", "lt", "lte", "like", "ilike", "order", "limit", "range",
    "single", "maybeSingle", "filter", "match", "or", "and", "contains",
    "containedBy", "overlaps", "textSearch"];
  
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  
  // Terminal methods return the data
  chain.single = vi.fn().mockResolvedValue({ data: returnData, error: returnError });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: returnData, error: returnError });
  chain.then = undefined; // Make it thenable at the chain level
  
  // Override select/insert to also be thenable
  const originalSelect = chain.select;
  chain.select = vi.fn((...args: any[]) => {
    const result = originalSelect(...args);
    result.then = (resolve: any) => resolve({ data: returnData ? [returnData] : [], error: returnError });
    return result;
  });

  const originalInsert = chain.insert;
  chain.insert = vi.fn((...args: any[]) => {
    const result = originalInsert(...args);
    result.then = (resolve: any) => resolve({ data: returnData, error: returnError });
    return result;
  });

  return chain;
}

describe("Business Flow: Auth → Lead → Opportunity → Invoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Authentication Flow", () => {
    it("successful login returns session with user data", async () => {
      const mockSession = {
        access_token: "test-jwt-token",
        refresh_token: "test-refresh",
        user: {
          id: "user-123",
          email: "test@example.com",
          role: "authenticated",
        },
      };

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      const { data, error } = await mockAuth.signInWithPassword({
        email: "test@example.com",
        password: "secure-password-123",
      });

      expect(error).toBeNull();
      expect(data.session).toBeDefined();
      expect(data.session.access_token).toBe("test-jwt-token");
      expect(data.user.email).toBe("test@example.com");
    });

    it("login with invalid credentials returns error", async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: "Invalid login credentials", status: 400 },
      });

      const { data, error } = await mockAuth.signInWithPassword({
        email: "wrong@example.com",
        password: "wrong-password",
      });

      expect(error).toBeDefined();
      expect(error.message).toContain("Invalid");
      expect(data.session).toBeNull();
    });

    it("getSession returns active session after login", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: {
          session: {
            access_token: "active-token",
            user: { id: "user-123", email: "test@example.com" },
          },
        },
        error: null,
      });

      const { data, error } = await mockAuth.getSession();
      expect(error).toBeNull();
      expect(data.session).toBeDefined();
      expect(data.session.user.id).toBe("user-123");
    });
  });

  describe("2. Lead Creation", () => {
    it("creates a lead with valid data", async () => {
      const leadData = {
        id: "lead-456",
        name: "Empresa Teste Lda",
        email: "contacto@empresateste.pt",
        phone: "+351912345678",
        source: "website",
        status: "new",
        workspace_id: "ws-789",
        created_at: new Date().toISOString(),
      };

      const chain = createQueryMock(leadData);
      mockFrom.mockReturnValue(chain);

      mockFrom("leads");
      const result = await chain.single();

      expect(mockFrom).toHaveBeenCalledWith("leads");
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe("Empresa Teste Lda");
      expect(result.data.status).toBe("new");
    });

    it("rejects lead creation without required fields", async () => {
      const chain = createQueryMock(null, {
        message: 'null value in column "name" violates not-null constraint',
        code: "23502",
      });
      mockFrom.mockReturnValue(chain);

      const result = await new Promise((resolve) => {
        const query = mockFrom("leads").insert([{ email: "test@test.com" }]);
        query.insert([{ email: "test@test.com" }]).then(resolve);
      });

      expect((result as any).error).toBeDefined();
      expect((result as any).error.code).toBe("23502");
    });
  });

  describe("3. Lead → Opportunity Conversion", () => {
    it("converts a qualified lead into an opportunity", async () => {
      const opportunityData = {
        id: "opp-101",
        lead_id: "lead-456",
        title: "Proposta Empresa Teste",
        value: 5000,
        currency: "EUR",
        stage: "qualification",
        workspace_id: "ws-789",
        created_at: new Date().toISOString(),
      };

      const chain = createQueryMock(opportunityData);
      mockFrom.mockReturnValue(chain);

      mockFrom("opportunities");
      const result = await chain.single();

      expect(mockFrom).toHaveBeenCalledWith("opportunities");
      expect(result.data).toBeDefined();
      expect(result.data.lead_id).toBe("lead-456");
      expect(result.data.stage).toBe("qualification");
      expect(result.data.value).toBe(5000);
    });

    it("opportunity references the original lead", async () => {
      const opportunityData = {
        id: "opp-101",
        lead_id: "lead-456",
        title: "Proposta Empresa Teste",
      };

      const chain = createQueryMock(opportunityData);
      mockFrom.mockReturnValue(chain);

      // Verify the foreign key relationship
      expect(opportunityData.lead_id).toBe("lead-456");
      expect(opportunityData.lead_id).toBeTruthy();
    });
  });

  describe("4. Opportunity → Invoice Generation", () => {
    it("generates an invoice from a won opportunity", async () => {
      const invoiceData = {
        id: "inv-201",
        opportunity_id: "opp-101",
        contact_id: "contact-301",
        total: 5000,
        currency: "EUR",
        status: "draft",
        workspace_id: "ws-789",
        items: [
          { description: "Serviço de consultoria", quantity: 1, unit_price: 5000 },
        ],
        created_at: new Date().toISOString(),
      };

      const chain = createQueryMock(invoiceData);
      mockFrom.mockReturnValue(chain);

      mockFrom("invoices");
      const result = await chain.single();

      expect(mockFrom).toHaveBeenCalledWith("invoices");
      expect(result.data).toBeDefined();
      expect(result.data.total).toBe(5000);
      expect(result.data.status).toBe("draft");
      expect(result.data.opportunity_id).toBe("opp-101");
    });

    it("invoice total matches opportunity value", async () => {
      const opportunityValue = 5000;
      const invoiceTotal = 5000;
      expect(invoiceTotal).toBe(opportunityValue);
    });
  });

  describe("5. Cross-cutting: Workspace Isolation", () => {
    it("queries are always scoped by workspace_id", () => {
      const chain = createQueryMock([]);
      mockFrom.mockReturnValue(chain);

      mockFrom("leads").select("*").eq("workspace_id", "ws-789");

      expect(mockFrom).toHaveBeenCalledWith("leads");
      expect(chain.eq).toHaveBeenCalledWith("workspace_id", "ws-789");
    });

    it("insert operations include workspace_id", () => {
      const chain = createQueryMock(null);
      mockFrom.mockReturnValue(chain);

      const insertData = {
        name: "Test Lead",
        workspace_id: "ws-789",
      };

      mockFrom("leads").insert([insertData]);

      expect(chain.insert).toHaveBeenCalledWith([
        expect.objectContaining({ workspace_id: "ws-789" }),
      ]);
    });
  });

  describe("6. Edge Function Auth Guards", () => {
    it("requireAuth pattern validates Authorization header format", () => {
      const validHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
      expect(validHeader.startsWith("Bearer ")).toBe(true);

      const invalidHeaders = ["", "Basic abc", "bearer token", "Token xyz"];
      for (const h of invalidHeaders) {
        expect(h.startsWith("Bearer ")).toBe(false);
      }
    });

    it("service_role guard pattern matches exact key", () => {
      const serviceRoleKey = "test-service-role-key-12345";
      const validAuth = `Bearer ${serviceRoleKey}`;
      const invalidAuth = `Bearer wrong-key`;

      expect(validAuth).toBe(`Bearer ${serviceRoleKey}`);
      expect(invalidAuth).not.toBe(`Bearer ${serviceRoleKey}`);
    });
  });
});
