import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, FileText, Wrench, Download, ArrowUpRight } from 'lucide-react';

// Mock data for templates
const templatesData = [
  { name: 'Blog Keywords', slug: 'blog-keywords', started: 820, completed: 680, exported: 420, upgrades: 45, completionRate: 82.9 },
  { name: 'E-commerce SEO', slug: 'ecommerce-seo', started: 650, completed: 520, exported: 310, upgrades: 38, completionRate: 80.0 },
  { name: 'Local Business', slug: 'local-business', started: 480, completed: 390, exported: 220, upgrades: 28, completionRate: 81.3 },
  { name: 'SaaS Keywords', slug: 'saas-keywords', started: 420, completed: 360, exported: 240, upgrades: 32, completionRate: 85.7 },
  { name: 'YouTube SEO', slug: 'youtube-seo', started: 380, completed: 290, exported: 150, upgrades: 18, completionRate: 76.3 },
];

// Mock data for tools
const toolsData = [
  { name: 'Keyword Ideas', slug: 'keyword-ideas', started: 4200, completed: 3150, exported: 1820, upgrades: 185, completionRate: 75.0 },
  { name: 'Question Finder', slug: 'question-finder', started: 1200, completed: 980, exported: 520, upgrades: 52, completionRate: 81.7 },
  { name: 'Competitor Analysis', slug: 'competitor-analysis', started: 890, completed: 720, exported: 380, upgrades: 42, completionRate: 80.9 },
];

const chartConfig = {
  started: { label: 'Iniciados', color: 'hsl(var(--muted-foreground))' },
  completed: { label: 'Completos', color: 'hsl(var(--primary))' },
  exported: { label: 'Exportados', color: 'hsl(142, 76%, 36%)' },
};

const combinedChartData = [
  ...templatesData.map((t) => ({ name: t.name, type: 'template', ...t })),
  ...toolsData.map((t) => ({ name: t.name, type: 'tool', ...t })),
].sort((a, b) => b.completed - a.completed);

export function TemplatesToolsDashboard() {
  const totalTemplateStarted = templatesData.reduce((sum, d) => sum + d.started, 0);
  const totalTemplateCompleted = templatesData.reduce((sum, d) => sum + d.completed, 0);
  const totalToolStarted = toolsData.reduce((sum, d) => sum + d.started, 0);
  const totalToolCompleted = toolsData.reduce((sum, d) => sum + d.completed, 0);
  const totalExports = [...templatesData, ...toolsData].reduce((sum, d) => sum + d.exported, 0);
  const totalUpgrades = [...templatesData, ...toolsData].reduce((sum, d) => sum + d.upgrades, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Templates & Tools Performance</h2>
        <p className="text-sm text-muted-foreground">
          Que templates e ferramentas ativam melhor?
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Templates
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTemplateCompleted.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              de {totalTemplateStarted.toLocaleString()} iniciados ({((totalTemplateCompleted/totalTemplateStarted)*100).toFixed(0)}%)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tools
            </CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalToolCompleted.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              de {totalToolStarted.toLocaleString()} iniciados ({((totalToolCompleted/totalToolStarted)*100).toFixed(0)}%)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Exports
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExports.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upgrade Clicks
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUpgrades.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="started" fill="var(--color-started)" name="Iniciados" />
                <Bar dataKey="completed" fill="var(--color-completed)" name="Completos" />
                <Bar dataKey="exported" fill="var(--color-exported)" name="Exportados" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Iniciados</TableHead>
                <TableHead className="text-right">Completos</TableHead>
                <TableHead className="text-right">Exportados</TableHead>
                <TableHead className="text-right">Upgrades</TableHead>
                <TableHead className="w-32">Taxa Conclusão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templatesData.map((template) => (
                <TableRow key={template.slug}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-right">{template.started.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{template.completed.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{template.exported.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{template.upgrades}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={template.completionRate} className="h-2" />
                      <span className="text-xs w-10">{template.completionRate}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tools Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Ferramentas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ferramenta</TableHead>
                <TableHead className="text-right">Iniciados</TableHead>
                <TableHead className="text-right">Completos</TableHead>
                <TableHead className="text-right">Exportados</TableHead>
                <TableHead className="text-right">Upgrades</TableHead>
                <TableHead className="w-32">Taxa Conclusão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {toolsData.map((tool) => (
                <TableRow key={tool.slug}>
                  <TableCell className="font-medium">{tool.name}</TableCell>
                  <TableCell className="text-right">{tool.started.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{tool.completed.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{tool.exported.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{tool.upgrades}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={tool.completionRate} className="h-2" />
                      <span className="text-xs w-10">{tool.completionRate}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Promover via SEO</p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                O template <strong>"SaaS Keywords"</strong> tem a maior taxa de conclusão (85.7%). 
                Considerar criar mais conteúdo SEO linkando para este template e usar como case study.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
