import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Layers, Sparkles, Package, Users, Inbox as InboxIcon, ArrowUpRight, FileText, Eye, Settings as SettingsIcon } from "lucide-react";
import {
  useBillingPlansAdmin,
  useBillingAddonsAdmin,
  usePlatformFeatures,
  useCommercialPackages,
  useUpgradeRequests,
} from "@/hooks/usePlanManagement";

const TABS = [
  { v: "plans", l: "Planos", icon: Crown },
  { v: "features", l: "Features", icon: Sparkles },
  { v: "limits", l: "Limites", icon: Layers },
  { v: "addons", l: "Add-ons", icon: Package },
  { v: "subscriptions", l: "Subscrições", icon: FileText },
  { v: "workspaces", l: "Workspaces", icon: Users },
  { v: "upgrades", l: "Upgrade Requests", icon: ArrowUpRight },
  { v: "packaging", l: "Packaging", icon: Package },
  { v: "preview", l: "Pricing Preview", icon: Eye },
  { v: "settings", l: "Configurações", icon: SettingsIcon },
];

export default function PlanManagementPage() {
  const [tab, setTab] = useState("plans");
  const { data: plans = [] } = useBillingPlansAdmin();
  const { data: features = [] } = usePlatformFeatures();
  const { data: addons = [] } = useBillingAddonsAdmin();
  const { data: packages = [] } = useCommercialPackages();
  const { data: requests = [] } = useUpgradeRequests();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plan Management</h1>
          <p className="text-muted-foreground mt-1">
            Transforme funcionalidades, limites e consumo em planos comerciais claros e rentáveis.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{plans.length} planos</Badge>
          <Badge variant="secondary">{features.length} features</Badge>
          <Badge variant="secondary">{addons.length} add-ons</Badge>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="gap-2">
              <t.icon className="w-4 h-4" />
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Planos comerciais</CardTitle>
              <CardDescription>Templates Free, Starter, Growth, Pro, Enterprise, Internal e Demo.</CardDescription>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não existem planos configurados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plano</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Visibilidade</TableHead>
                      <TableHead>Preço/mês</TableHead>
                      <TableHead>Trial</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.name}
                          {p.recommended && <Badge variant="default" className="ml-2">Recomendado</Badge>}
                        </TableCell>
                        <TableCell>{p.plan_type}</TableCell>
                        <TableCell>{p.visibility}</TableCell>
                        <TableCell>{p.monthly_price ? `${p.monthly_price} €` : "—"}</TableCell>
                        <TableCell>{p.trial_days ?? 0}d</TableCell>
                        <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Catálogo de Features</CardTitle>
              <CardDescription>Toggle por plano nas configurações de cada plano.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature key</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Beta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.feature_key}</TableCell>
                      <TableCell>{f.name}</TableCell>
                      <TableCell><Badge variant="outline">{f.module}</Badge></TableCell>
                      <TableCell>{f.feature_type}</TableCell>
                      <TableCell>{f.beta ? "Sim" : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits">
          <Card>
            <CardHeader><CardTitle>Limites por plano</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((p: any) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(p.limits ?? {}, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addons">
          <Card>
            <CardHeader><CardTitle>Add-ons</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Desbloqueia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addons.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell><Badge variant="outline">{a.addon_type}</Badge></TableCell>
                      <TableCell>{a.price_per_unit ? `${a.price_per_unit} €` : "—"}</TableCell>
                      <TableCell>{a.unit_name ?? "—"}</TableCell>
                      <TableCell>{a.included_quantity ?? "—"}</TableCell>
                      <TableCell className="text-xs">{(a.feature_unlocks ?? []).join(", ") || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <EmptyTab title="Subscrições" description="A lista detalhada de subscrições aparecerá em /admin/billing." />
        </TabsContent>
        <TabsContent value="workspaces">
          <EmptyTab title="Workspaces" description="Gestão de plano por workspace." />
        </TabsContent>

        <TabsContent value="upgrades">
          <Card>
            <CardHeader><CardTitle>Upgrade Requests</CardTitle></CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Não existem pedidos pendentes.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Plano atual → pedido</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.workspace?.name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{r.request_type}</Badge></TableCell>
                        <TableCell className="text-sm">
                          {r.current_plan?.name ?? "—"} → {r.requested_plan?.name ?? "—"}
                        </TableCell>
                        <TableCell><Badge>{r.status}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("pt-PT")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packaging">
          <Card>
            <CardHeader>
              <CardTitle>Packaging Comercial</CardTitle>
              <CardDescription>Pacotes verticais para clínicas, imobiliárias, academias, comércio e enterprise.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((p: any) => (
                <Card key={p.id} className="border-primary/20">
                  <CardHeader>
                    <Badge variant="outline" className="w-fit">{p.target_segment}</Badge>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <CardDescription>{p.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Setup</span>
                      <span>{p.recommended_setup_fee} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mensal</span>
                      <span className="font-semibold">{p.recommended_monthly_price} €</span>
                    </div>
                    {p.positioning && <p className="text-xs italic text-muted-foreground pt-2">{p.positioning}</p>}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Preview</CardTitle>
              <CardDescription>Pré-visualização dos planos como apareceriam numa página pública.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.filter((p: any) => p.is_public).map((p: any) => (
                <Card key={p.id} className={p.recommended ? "border-primary shadow-lg" : ""}>
                  <CardHeader>
                    {p.recommended && <Badge className="w-fit mb-2">Recomendado</Badge>}
                    <CardTitle>{p.name}</CardTitle>
                    <div className="text-3xl font-bold mt-2">
                      {p.monthly_price ?? 0} €
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      {Object.entries(p.limits ?? {}).slice(0, 5).map(([k, v]) => (
                        <li key={k} className="flex justify-between">
                          <span className="text-muted-foreground">{k}</span>
                          <span>{String(v)}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full mt-4" variant={p.recommended ? "default" : "outline"}>
                      {p.enterprise ? "Falar com consultor" : "Começar"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <EmptyTab title="Configurações" description="Configurações globais de packaging e moeda predefinida." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyTab({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground text-sm">
          <InboxIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
          Em desenvolvimento contínuo.
        </div>
      </CardContent>
    </Card>
  );
}
