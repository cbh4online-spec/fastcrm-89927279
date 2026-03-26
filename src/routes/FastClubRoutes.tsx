import { lazy, Suspense } from "react";
import { Route, Outlet } from "react-router-dom";
import { ClubLayout } from "@/components/club/ClubLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { WorkspaceInstanceProvider } from "@/contexts/WorkspaceInstanceContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ActivityProfileProvider } from "@/contexts/ActivityProfileContext";

const FastClubPage = lazy(() => import("@/pages/community/FastClubPage"));
const ForumPage = lazy(() => import("@/pages/community/ForumPage"));
const ForumTopicPage = lazy(() => import("@/pages/community/ForumTopicPage"));
const LoyaltyPage = lazy(() => import("@/pages/community/LoyaltyPage"));
const StartHerePage = lazy(() => import("@/pages/fastclub/StartHerePage"));
const MetodoParePage = lazy(() => import("@/pages/fastclub/MetodoParePage"));
const DemosPage = lazy(() => import("@/pages/fastclub/DemosPage"));
const DesafioPage = lazy(() => import("@/pages/fastclub/DesafioPage"));
const ResultadosPage = lazy(() => import("@/pages/fastclub/ResultadosPage"));
const RedePrivadaPage = lazy(() => import("@/pages/fastclub/RedePrivadaPage"));
const AnunciosPage = lazy(() => import("@/pages/fastclub/AnunciosPage"));
const MissaoSemanaPage = lazy(() => import("@/pages/fastclub/MissaoSemanaPage"));
const ImplementacaoPage = lazy(() => import("@/pages/fastclub/ImplementacaoPage"));
const IAAvancadaPage = lazy(() => import("@/pages/fastclub/IAAvancadaPage"));
const FastMatchPage = lazy(() => import("@/pages/fastclub/FastMatchPage"));
const LaboratorioPage = lazy(() => import("@/pages/fastclub/LaboratorioPage"));
const HotSeatsPage = lazy(() => import("@/pages/fastclub/HotSeatsPage"));
const AtualizacoesPage = lazy(() => import("@/pages/fastclub/AtualizacoesPage"));
const PlaneamentoParePage = lazy(() => import("@/pages/fastclub/metodo-pare/PlaneamentoPage"));
const AutomacaoParePage = lazy(() => import("@/pages/fastclub/metodo-pare/AutomacaoPage"));
const ResultadosParePage = lazy(() => import("@/pages/fastclub/metodo-pare/ResultadosParePage"));
const EficienciaParePage = lazy(() => import("@/pages/fastclub/metodo-pare/EficienciaPage"));
const DemonstracoesPage = lazy(() => import("@/pages/fastclub/demos/DemonstracoesPage"));
const CasosPraticosPage = lazy(() => import("@/pages/fastclub/demos/CasosPraticosPage"));
const RoadmapFCPage = lazy(() => import("@/pages/fastclub/demos/RoadmapPage"));
const ComoFuncionaPage = lazy(() => import("@/pages/fastclub/rede-privada/ComoFuncionaPage"));
const OtimizarPerfilPage = lazy(() => import("@/pages/fastclub/rede-privada/OtimizarPerfilPage"));
const IndicadoresPage = lazy(() => import("@/pages/fastclub/rede-privada/IndicadoresPage"));
const NegociosFechadosPage = lazy(() => import("@/pages/fastclub/rede-privada/NegociosFechadosPage"));
const EstrategiasPage = lazy(() => import("@/pages/fastclub/rede-privada/EstrategiasPage"));

export function FastClubPortalRoute() {
  return (
    <Route path="/club/fastclub" element={
      <AuthProvider>
        <WorkspaceProvider>
          <WorkspaceInstanceProvider>
            <ActivityProfileProvider>
              <SubscriptionProvider>
                <ClubLayout><Outlet /></ClubLayout>
              </SubscriptionProvider>
            </ActivityProfileProvider>
          </WorkspaceInstanceProvider>
        </WorkspaceProvider>
      </AuthProvider>
    }>
      <Route index element={<FastClubPage />} />
      <Route path="forum" element={<ForumPage />} />
      <Route path="forum/:topicId" element={<ForumTopicPage />} />
      <Route path="rewards" element={<LoyaltyPage />} />
      <Route path="start-here" element={<StartHerePage />} />
      <Route path="metodo-pare" element={<MetodoParePage />} />
      <Route path="metodo-pare/planeamento" element={<PlaneamentoParePage />} />
      <Route path="metodo-pare/automacao" element={<AutomacaoParePage />} />
      <Route path="metodo-pare/resultados" element={<ResultadosParePage />} />
      <Route path="metodo-pare/eficiencia" element={<EficienciaParePage />} />
      <Route path="demos" element={<DemosPage />} />
      <Route path="demos/demonstracoes" element={<DemonstracoesPage />} />
      <Route path="demos/casos-praticos" element={<CasosPraticosPage />} />
      <Route path="demos/roadmap" element={<RoadmapFCPage />} />
      <Route path="desafio-7-dias" element={<DesafioPage />} />
      <Route path="resultados" element={<ResultadosPage />} />
      <Route path="rede-privada" element={<RedePrivadaPage />} />
      <Route path="rede-privada/como-funciona" element={<ComoFuncionaPage />} />
      <Route path="rede-privada/otimizar-perfil" element={<OtimizarPerfilPage />} />
      <Route path="rede-privada/indicadores" element={<IndicadoresPage />} />
      <Route path="rede-privada/negocios-fechados" element={<NegociosFechadosPage />} />
      <Route path="rede-privada/estrategias" element={<EstrategiasPage />} />
      <Route path="anuncios" element={<AnunciosPage />} />
      <Route path="atualizacoes" element={<AtualizacoesPage />} />
      <Route path="missao-semana" element={<MissaoSemanaPage />} />
      <Route path="implementacao" element={<ImplementacaoPage />} />
      <Route path="ia-avancada" element={<IAAvancadaPage />} />
      <Route path="fastmatch" element={<FastMatchPage />} />
      <Route path="laboratorio" element={<LaboratorioPage />} />
      <Route path="hot-seats" element={<HotSeatsPage />} />
    </Route>
  );
}
