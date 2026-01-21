import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, Search, ArrowUpDown, ExternalLink } from 'lucide-react';

// Mock data - would be replaced with real GA4/Search Console data
const keywordData = [
  { keyword: 'email marketing', sessions: 2450, ctr: 4.2, generated: 720, signups: 85, convRate: 11.8 },
  { keyword: 'crm software', sessions: 1890, ctr: 3.8, generated: 540, signups: 62, convRate: 11.5 },
  { keyword: 'keyword research', sessions: 1650, ctr: 5.1, generated: 620, signups: 78, convRate: 12.6 },
  { keyword: 'seo tools', sessions: 1420, ctr: 4.5, generated: 480, signups: 52, convRate: 10.8 },
  { keyword: 'lead generation', sessions: 1280, ctr: 3.2, generated: 320, signups: 38, convRate: 11.9 },
  { keyword: 'content marketing', sessions: 1150, ctr: 3.9, generated: 380, signups: 42, convRate: 11.1 },
  { keyword: 'marketing automation', sessions: 980, ctr: 4.8, generated: 420, signups: 55, convRate: 13.1 },
  { keyword: 'social media marketing', sessions: 920, ctr: 2.8, generated: 210, signups: 18, convRate: 8.6 },
  { keyword: 'ppc advertising', sessions: 780, ctr: 5.2, generated: 290, signups: 35, convRate: 12.1 },
  { keyword: 'sales funnel', sessions: 650, ctr: 4.1, generated: 220, signups: 28, convRate: 12.7 },
];

type SortField = 'sessions' | 'ctr' | 'generated' | 'signups' | 'convRate';
type SortDirection = 'asc' | 'desc';

export function KeywordPagesDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('sessions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterIntent, setFilterIntent] = useState<string>('all');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredData = keywordData
    .filter((item) =>
      item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortDirection === 'desc' ? -1 : 1;
      return (a[sortField] - b[sortField]) * multiplier;
    });

  // Calculate totals
  const totalSessions = keywordData.reduce((sum, d) => sum + d.sessions, 0);
  const totalGenerated = keywordData.reduce((sum, d) => sum + d.generated, 0);
  const totalSignups = keywordData.reduce((sum, d) => sum + d.signups, 0);
  const avgConvRate = (totalSignups / totalGenerated * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Keyword Pages Performance</h2>
        <p className="text-sm text-muted-foreground">
          Quais keywords convertem? Escalar ou matar?
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Generate Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGenerated.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSignups.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConvRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterIntent} onValueChange={setFilterIntent}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Intenção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="informational">Informacional</SelectItem>
            <SelectItem value="commercial">Comercial</SelectItem>
            <SelectItem value="transactional">Transacional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 -ml-3"
                    onClick={() => toggleSort('sessions')}
                  >
                    Sessões
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 -ml-3"
                    onClick={() => toggleSort('ctr')}
                  >
                    CTR
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 -ml-3"
                    onClick={() => toggleSort('generated')}
                  >
                    Generated
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 -ml-3"
                    onClick={() => toggleSort('signups')}
                  >
                    Signups
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 -ml-3"
                    onClick={() => toggleSort('convRate')}
                  >
                    Conv. Rate
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.keyword}>
                  <TableCell className="font-medium">{item.keyword}</TableCell>
                  <TableCell>{item.sessions.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {item.ctr}%
                      {item.ctr > 4 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : item.ctr < 3 ? (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{item.generated.toLocaleString()}</TableCell>
                  <TableCell>{item.signups}</TableCell>
                  <TableCell>
                    <Badge
                      variant={item.convRate > 12 ? 'default' : item.convRate < 10 ? 'destructive' : 'secondary'}
                    >
                      {item.convRate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/keywords/${item.keyword.replace(/\s+/g, '-')}`} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Escalar</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  "marketing automation" e "keyword research" têm as melhores taxas de conversão. Criar mais conteúdo relacionado.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Otimizar ou Remover</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  "social media marketing" tem baixo CTR e conversão. Considerar melhorar o conteúdo ou reduzir prioridade.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
