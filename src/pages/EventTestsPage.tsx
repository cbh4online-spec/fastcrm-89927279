import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FlaskConical, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";

interface TestCase {
  id: string;
  event_name: string;
  test_name: string;
  test_type: string;
  input_payload: Record<string, unknown>;
  expected_signal: string | null;
  expected_decision: string | null;
  expected_action: string | null;
  expected_result: string;
  priority: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  created_at: string;
}

const testTypeLabels: Record<string, string> = {
  valid: "Valid",
  valid_payload: "Valid Payload",
  invalid: "Invalid",
  invalid_payload: "Invalid Payload",
  conditional: "Conditional",
  conditional_branch: "Conditional",
  idempotency: "Idempotency",
  failure_path: "Failure Path",
};

const resultConfig: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  accept: { icon: CheckCircle2, className: "text-emerald-500" },
  reject: { icon: XCircle, className: "text-destructive" },
  skip: { icon: AlertTriangle, className: "text-yellow-500" },
  error: { icon: AlertTriangle, className: "text-orange-500" },
};

// Map expected_result to display — handle both old and new conventions
const getResultDisplay = (result: string) => {
  if (result.includes("failure") || result.includes("error")) return resultConfig.error;
  if (result.includes("schema_validation") || result.includes("reject")) return resultConfig.reject;
  if (result.includes("without") || result.includes("skip") || result.includes("single_") || result.includes("once")) return resultConfig.skip;
  return resultConfig.accept;
};

const statusConfig: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  pass: { label: "Pass", variant: "default" },
  fail: { label: "Fail", variant: "destructive" },
  skipped: { label: "Skipped", variant: "secondary" },
};

const domains = ["all", "crm", "sales", "calendar", "comm", "strategy"];

export default function EventTestsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["event-test-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_test_cases")
        .select("*")
        .order("event_name")
        .order("test_type");
      if (error) throw error;
      return (data ?? []) as TestCase[];
    },
  });

  const filtered = useMemo(() => {
    return tests.filter((t) => {
      if (search && !t.event_name.toLowerCase().includes(search.toLowerCase()) && !t.test_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && t.test_type !== typeFilter) return false;
      if (domainFilter !== "all" && !t.event_name.startsWith(domainFilter + ".")) return false;
      if (statusFilter === "never_run" && t.last_run_status !== null) return false;
      if (statusFilter !== "all" && statusFilter !== "never_run" && t.last_run_status !== statusFilter) return false;
      return true;
    });
  }, [tests, search, typeFilter, domainFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = tests.length;
    const passed = tests.filter((t) => t.last_run_status === "pass").length;
    const failed = tests.filter((t) => t.last_run_status === "fail").length;
    const neverRun = tests.filter((t) => !t.last_run_status).length;
    const events = new Set(tests.map((t) => t.event_name)).size;
    const passRate = total - neverRun > 0 ? Math.round((passed / (total - neverRun)) * 100) : 0;
    return { total, passed, failed, neverRun, events, passRate };
  }, [tests]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Event Test Matrix"
          description="Tier 1 event validation — signals, decisions & actions"
          count={stats.total}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Tests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-2xl font-bold text-emerald-500">{stats.passed}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.neverRun}</p>
              <p className="text-xs text-muted-foreground">Never Run</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.events}</p>
              <p className="text-xs text-muted-foreground">Events Covered</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar evento ou teste..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Domain" /></SelectTrigger>
            <SelectContent>
              {domains.map((d) => (
                <SelectItem key={d} value={d}>{d === "all" ? "All Domains" : d.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Test Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(testTypeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
              <SelectItem value="never_run">Never Run</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      A carregar testes...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum teste encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => {
                    const rc = getResultDisplay(t.expected_result);
                    const ResultIcon = rc.icon;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs max-w-[180px] truncate">{t.event_name}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{t.test_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {testTypeLabels[t.test_type] ?? t.test_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.expected_signal ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.expected_decision ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.expected_action ?? "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${rc.className}`}>
                            <ResultIcon className="h-3.5 w-3.5" />
                            {t.expected_result}
                          </span>
                        </TableCell>
                        <TableCell>
                          {t.last_run_status ? (
                            <Badge variant={statusConfig[t.last_run_status]?.variant ?? "secondary"}>
                              {statusConfig[t.last_run_status]?.label ?? t.last_run_status}
                            </Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Never run
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
