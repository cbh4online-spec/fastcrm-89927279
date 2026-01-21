import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreditSimulator } from "../hooks/useCreditSimulator";
import { useBankPartners } from "../hooks/useBankPartners";
import { CREDIT_TYPE_LABELS, CreditType } from "../types";
import { 
  Calculator, 
  Building2, 
  TrendingUp,
  Euro,
  Calendar,
  Percent,
  Home,
  User,
  Car,
  CheckCircle2,
  Star
} from "lucide-react";

const CREDIT_TYPE_ICONS: Record<CreditType, typeof Home> = {
  habitacao: Home,
  pessoal: User,
  empresarial: Building2,
  automovel: Car,
};

export function CreditSimulator() {
  const [creditType, setCreditType] = useState<CreditType>("habitacao");
  const [amount, setAmount] = useState(150000);
  const [termYears, setTermYears] = useState(30);
  const [propertyValue, setPropertyValue] = useState(200000);
  const [customRate, setCustomRate] = useState(3.5);
  const [activeTab, setActiveTab] = useState("simulation");

  const { simulate, quickCalculate, generateAmortizationTable, hasBanks } = useCreditSimulator();
  const { data: banks = [] } = useBankPartners();

  const termMonths = termYears * 12;
  const ltv = creditType === "habitacao" && propertyValue > 0 
    ? (amount / propertyValue) * 100 
    : undefined;

  // Quick calculation
  const quickResult = useMemo(() => {
    return quickCalculate(amount, termMonths, customRate);
  }, [amount, termMonths, customRate, quickCalculate]);

  // Full simulation with bank comparison
  const simulationResult = useMemo(() => {
    if (!hasBanks) return null;
    return simulate({
      credit_type: creditType,
      amount,
      term_months: termMonths,
      property_value: creditType === "habitacao" ? propertyValue : undefined,
    });
  }, [creditType, amount, termMonths, propertyValue, hasBanks, simulate]);

  // Amortization table (first 12 and last 12 months)
  const amortizationTable = useMemo(() => {
    const full = generateAmortizationTable(amount, termMonths, customRate);
    if (full.length <= 24) return full;
    return [
      ...full.slice(0, 12),
      { month: -1, payment: 0, principal: 0, interest: 0, balance: 0 }, // Separator
      ...full.slice(-12),
    ];
  }, [amount, termMonths, customRate, generateAmortizationTable]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Parâmetros
            </CardTitle>
            <CardDescription>
              Configure os dados do crédito
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Credit Type */}
            <div className="space-y-2">
              <Label>Tipo de Crédito</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CREDIT_TYPE_LABELS) as CreditType[]).map((type) => {
                  const Icon = CREDIT_TYPE_ICONS[type];
                  const isSelected = creditType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setCreditType(type)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <p className={`text-xs font-medium ${isSelected ? "text-primary" : ""}`}>
                        {CREDIT_TYPE_LABELS[type]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Montante</Label>
                <span className="text-sm font-medium">{formatCurrency(amount)}</span>
              </div>
              <Slider
                value={[amount]}
                onValueChange={([v]) => setAmount(v)}
                min={5000}
                max={creditType === "habitacao" ? 500000 : 100000}
                step={1000}
              />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-2"
              />
            </div>

            {/* Property Value (for habitacao) */}
            {creditType === "habitacao" && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Valor do Imóvel</Label>
                  <span className="text-sm font-medium">{formatCurrency(propertyValue)}</span>
                </div>
                <Slider
                  value={[propertyValue]}
                  onValueChange={([v]) => setPropertyValue(v)}
                  min={50000}
                  max={1000000}
                  step={5000}
                />
                {ltv !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">LTV:</span>
                    <Badge variant={ltv > 80 ? "destructive" : ltv > 70 ? "secondary" : "default"}>
                      {ltv.toFixed(1)}%
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Term */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Prazo</Label>
                <span className="text-sm font-medium">{termYears} anos ({termMonths} meses)</span>
              </div>
              <Slider
                value={[termYears]}
                onValueChange={([v]) => setTermYears(v)}
                min={1}
                max={creditType === "habitacao" ? 40 : 10}
                step={1}
              />
            </div>

            {/* Interest Rate */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Taxa de Juro (TAN)</Label>
                <span className="text-sm font-medium">{customRate}%</span>
              </div>
              <Slider
                value={[customRate]}
                onValueChange={([v]) => setCustomRate(v)}
                min={0.5}
                max={15}
                step={0.1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resultados da Simulação</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="simulation">Simulação</TabsTrigger>
                <TabsTrigger value="banks">Comparar Bancos</TabsTrigger>
                <TabsTrigger value="amortization">Amortização</TabsTrigger>
              </TabsList>

              <TabsContent value="simulation" className="space-y-6 pt-4">
                {/* Main Results */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-primary mb-1">
                        <Euro className="w-4 h-4" />
                        <span className="text-sm font-medium">Prestação Mensal</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {formatCurrency(quickResult.monthlyPayment)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Percent className="w-4 h-4" />
                        <span className="text-sm font-medium">Total de Juros</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {formatCurrency(quickResult.totalInterest)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">Montante Total</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {formatCurrency(quickResult.totalAmount)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm">
                    Para um crédito de <strong>{formatCurrency(amount)}</strong> a{" "}
                    <strong>{termYears} anos</strong> com taxa de <strong>{customRate}%</strong>:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Pagará {formatCurrency(quickResult.monthlyPayment)} por mês durante {termMonths} meses</li>
                    <li>• No total, pagará {formatCurrency(quickResult.totalInterest)} em juros</li>
                    <li>• O custo total do crédito será {formatCurrency(quickResult.totalAmount)}</li>
                    {ltv !== undefined && (
                      <li>• LTV (Loan-to-Value): {ltv.toFixed(1)}%</li>
                    )}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="banks" className="pt-4">
                {!hasBanks ? (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Sem bancos configurados</h3>
                    <p className="text-sm text-muted-foreground">
                      Adicione parceiros bancários para ver comparações
                    </p>
                  </div>
                ) : simulationResult && simulationResult.bankComparisons.length > 0 ? (
                  <div className="space-y-4">
                    {simulationResult.bankComparisons.map((bank, i) => (
                      <div 
                        key={bank.bank_id}
                        className={`p-4 rounded-lg border flex items-center justify-between ${
                          bank.is_best_rate ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{bank.bank_name}</p>
                              {bank.is_best_rate && (
                                <Badge className="gap-1">
                                  <Star className="w-3 h-3" />
                                  Melhor Taxa
                                </Badge>
                              )}
                              {bank.is_lowest_payment && !bank.is_best_rate && (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Menor Prestação
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Taxa: {bank.rate.toFixed(2)}% | TAEG: {bank.taeg.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(bank.monthly_payment)}</p>
                          <p className="text-xs text-muted-foreground">
                            {bank.estimated_approval_chance}% prob. aprovação
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum banco disponível para este tipo de crédito
                  </div>
                )}
              </TabsContent>

              <TabsContent value="amortization" className="pt-4">
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês</TableHead>
                        <TableHead className="text-right">Prestação</TableHead>
                        <TableHead className="text-right">Capital</TableHead>
                        <TableHead className="text-right">Juros</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {amortizationTable.map((row, i) => (
                        row.month === -1 ? (
                          <TableRow key={i}>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-2">
                              ⋮
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={i}>
                            <TableCell>{row.month}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.payment)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.principal)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.interest)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.balance)}</TableCell>
                          </TableRow>
                        )
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
