import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radio,
  Eye,
  Calendar,
  PlayCircle,
  Video,
  Clock,
  Bell,
  Crown,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";
import { useGlobalLivestreams } from "@/hooks/c2c/useGlobalLivestreams";
import type { PublicLivestream } from "@/hooks/c2c/usePublicLivestreams";
import { toast } from "sonner";

type Filter = "all" | "live" | "premium" | "category";

export default function GlobalLivesDiscovery() {
  const navigate = useNavigate();
  const { data: allLives = [], isLoading } = useGlobalLivestreams();
  const [activeFilter, setActiveFilter] = useState<Filter>("all");

  const livesNow = useMemo(
    () =>
      allLives
        .filter((l) => l.status === "live")
        .sort((a, b) => b.viewer_count - a.viewer_count),
    [allLives]
  );

  const scheduled = useMemo(
    () =>
      allLives
        .filter((l) => l.status === "scheduled")
        .sort(
          (a, b) =>
            new Date(a.scheduled_at || a.created_at).getTime() -
            new Date(b.scheduled_at || b.created_at).getTime()
        ),
    [allLives]
  );

  const ended = useMemo(
    () =>
      allLives
        .filter((l) => l.status === "ended")
        .sort(
          (a, b) =>
            new Date(b.ended_at || b.created_at).getTime() -
            new Date(a.ended_at || a.created_at).getTime()
        )
        .slice(0, 12),
    [allLives]
  );

  const filteredLive = useMemo(() => {
    if (activeFilter === "premium")
      return livesNow.filter((l) => (l as any).type === "paid");
    return livesNow;
  }, [livesNow, activeFilter]);

  const handleCardClick = (live: PublicLivestream) => {
    const slug = live.workspace_slug;
    if (slug) {
      navigate(`/marketplace/${slug}/live/${live.id}`);
    } else {
      toast.info("Live não disponível de momento");
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0D1117" }}>
      {/* ── HEADER ── */}
      <header
        className="border-b sticky top-0 z-30 backdrop-blur-xl"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          backgroundColor: "rgba(13,17,23,0.85)",
        }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 max-w-7xl">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: "rgba(0,200,150,0.12)" }}
            >
              <Radio className="h-5 w-5" style={{ color: "#00C896" }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Lives em curso
              </h1>
              <p className="text-xs text-white/40">
                {livesNow.length > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: "#ef4444" }}
                    />
                    {livesNow.length} live{livesNow.length !== 1 ? "s" : ""}{" "}
                    agora
                  </span>
                ) : (
                  "Nenhuma live em curso"
                )}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {(
              [
                { key: "all", label: "Todos", icon: Video },
                { key: "live", label: "Abertos", icon: Eye },
                { key: "premium", label: "Premium", icon: Crown },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor:
                    activeFilter === key
                      ? "rgba(0,200,150,0.15)"
                      : "rgba(255,255,255,0.04)",
                  color:
                    activeFilter === key
                      ? "#00C896"
                      : "rgba(255,255,255,0.5)",
                  border: `1px solid ${
                    activeFilter === key
                      ? "rgba(0,200,150,0.3)"
                      : "rgba(255,255,255,0.06)"
                  }`,
                }}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-12">
        {/* ── LIVE NOW ── */}
        <section>
          <SectionTitle
            icon={<Zap className="h-4 w-4" />}
            title="Ao Vivo Agora"
            count={filteredLive.length}
            accent
          />

          {isLoading ? (
            <LiveGrid>
              {[1, 2, 3, 4].map((i) => (
                <LiveCardSkeleton key={i} />
              ))}
            </LiveGrid>
          ) : filteredLive.length === 0 ? (
            <EmptyState
              icon={<Radio className="h-16 w-16" />}
              title="Nenhuma live em curso"
              subtitle="Sê o primeiro a transmitir."
            />
          ) : (
            <LiveGrid>
              <AnimatePresence mode="popLayout">
                {filteredLive.map((live, i) => (
                  <motion.div
                    key={live.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <LiveCard
                      live={live}
                      onClick={() => handleCardClick(live)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </LiveGrid>
          )}
        </section>

        {/* ── SCHEDULED ── */}
        {scheduled.length > 0 && (
          <section>
            <SectionTitle
              icon={<Calendar className="h-4 w-4" />}
              title="Agendadas"
              count={scheduled.length}
            />
            <div className="space-y-2">
              {scheduled.map((live) => (
                <ScheduledRow
                  key={live.id}
                  live={live}
                  onClick={() => handleCardClick(live)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── RECENT ── */}
        {ended.length > 0 && (
          <section>
            <SectionTitle
              icon={<PlayCircle className="h-4 w-4" />}
              title="Recentes"
              count={ended.length}
            />
            <LiveGrid cols={4}>
              {ended.map((live) => (
                <RecentCard key={live.id} live={live} />
              ))}
            </LiveGrid>
          </section>
        )}

        {/* Global empty state */}
        {!isLoading &&
          livesNow.length === 0 &&
          scheduled.length === 0 &&
          ended.length === 0 && (
            <EmptyState
              icon={<Video className="h-20 w-20" />}
              title="Nenhuma live em curso"
              subtitle="Sê o primeiro a transmitir."
              large
            />
          )}
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function SectionTitle({
  icon,
  title,
  count,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span
        className="p-1.5 rounded-md"
        style={{
          backgroundColor: accent
            ? "rgba(239,68,68,0.12)"
            : "rgba(255,255,255,0.05)",
          color: accent ? "#ef4444" : "rgba(255,255,255,0.5)",
        }}
      >
        {icon}
      </span>
      <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
        {title}
      </h2>
      <Badge
        className="text-[10px] px-1.5 py-0 border-0 font-mono"
        style={{
          backgroundColor: accent
            ? "rgba(239,68,68,0.15)"
            : "rgba(255,255,255,0.06)",
          color: accent ? "#ef4444" : "rgba(255,255,255,0.4)",
        }}
      >
        {count}
      </Badge>
    </div>
  );
}

function LiveGrid({
  children,
  cols = 3,
}: {
  children: React.ReactNode;
  cols?: number;
}) {
  return (
    <div
      className={`grid gap-4 ${
        cols === 4
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      }`}
    >
      {children}
    </div>
  );
}

function LiveCard({
  live,
  onClick,
}: {
  live: PublicLivestream;
  onClick: () => void;
}) {
  const isPremium = (live as any).type === "paid";

  return (
    <Card
      className="cursor-pointer overflow-hidden group border-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
      }}
      onClick={onClick}
    >
      <div className="relative aspect-video overflow-hidden">
        {live.thumbnail_url ? (
          <img
            src={live.thumbnail_url}
            alt={live.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #1a1f2e 0%, #0D1117 50%, #162030 100%)",
            }}
          >
            <Radio className="h-10 w-10 text-white/10" />
          </div>
        )}

        {/* Live badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge
            className="border-0 gap-1.5 px-2.5 py-1 font-bold text-xs text-white shadow-lg"
            style={{ backgroundColor: "#ef4444" }}
          >
            <span className="w-2 h-2 bg-white rounded-full inline-block animate-pulse" />
            AO VIVO
          </Badge>
          {isPremium && (
            <Badge
              className="border-0 gap-1 px-2 py-1 font-bold text-[10px] text-black"
              style={{
                background: "linear-gradient(135deg, #FFD700, #FFA500)",
              }}
            >
              <Crown className="h-3 w-3" />
              PREMIUM
            </Badge>
          )}
        </div>

        {/* Viewer count */}
        <div className="absolute bottom-3 right-3">
          <Badge
            className="border-0 gap-1 text-xs text-white backdrop-blur-sm"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          >
            <Eye className="h-3 w-3" />
            {live.viewer_count}
          </Badge>
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(13,17,23,0.8) 0%, transparent 40%)",
          }}
        />
      </div>

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar
            className="h-9 w-9 flex-shrink-0 ring-2"
            className="h-9 w-9 flex-shrink-0 ring-2 ring-emerald-500/30"
          >
            {live.seller_avatar && <AvatarImage src={live.seller_avatar} />}
            <AvatarFallback
              className="text-xs font-bold"
              style={{
                backgroundColor: "rgba(0,200,150,0.12)",
                color: "#00C896",
              }}
            >
              {(live.seller_name || "V")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-white">
              {live.title}
            </h3>
            <p className="text-xs text-white/40 mt-1">
              {live.seller_name || "Vendedor"}
            </p>
            {live.category && (
              <Badge
                className="mt-2 text-[10px] px-1.5 py-0 border-0"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {live.category}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduledRow({
  live,
  onClick,
}: {
  live: PublicLivestream;
  onClick: () => void;
}) {
  const schedDate = live.scheduled_at
    ? new Date(live.scheduled_at)
    : new Date(live.created_at);

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 group"
      style={{
        backgroundColor: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
        e.currentTarget.style.borderColor = "rgba(0,200,150,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
      }}
    >
      {/* Date block */}
      <div
        className="flex-shrink-0 text-center rounded-lg px-3 py-2"
        style={{ backgroundColor: "rgba(0,200,150,0.08)" }}
      >
        <div className="text-lg font-bold" style={{ color: "#00C896" }}>
          {format(schedDate, "dd")}
        </div>
        <div className="text-[10px] uppercase text-white/40 font-medium">
          {format(schedDate, "MMM", { locale: pt })}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white truncate">
          {live.title}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-white/40">
            {live.seller_name || "Vendedor"}
          </span>
          <span className="text-white/15">·</span>
          <span className="text-xs text-white/30 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(schedDate, "HH:mm")}
          </span>
          {live.category && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-xs text-white/30">{live.category}</span>
            </>
          )}
        </div>
      </div>

      {/* Remind button */}
      <Button
        size="sm"
        variant="ghost"
        className="flex-shrink-0 gap-1.5 text-xs text-white/40 hover:text-white hover:bg-white/5"
        onClick={(e) => {
          e.stopPropagation();
          toast.info("Funcionalidade de lembrete em breve!");
        }}
      >
        <Bell className="h-3.5 w-3.5" />
        Lembrar
      </Button>
    </div>
  );
}

function RecentCard({ live }: { live: PublicLivestream }) {
  return (
    <div
      className="rounded-lg overflow-hidden group"
      style={{
        backgroundColor: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="relative aspect-video overflow-hidden">
        {live.thumbnail_url ? (
          <img
            src={live.thumbnail_url}
            alt={live.title}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #1a1f2e 0%, #0D1117 100%)",
            }}
          >
            <PlayCircle className="h-8 w-8 text-white/10" />
          </div>
        )}

        {/* VOD overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-center">
            <PlayCircle className="h-8 w-8 text-white/60 mx-auto mb-1" />
            <span className="text-[10px] text-white/50">Em breve</span>
          </div>
        </div>

        {live.total_views > 0 && (
          <div className="absolute bottom-2 right-2">
            <Badge
              className="border-0 gap-1 text-[10px] text-white/70"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <Eye className="h-2.5 w-2.5" />
              {live.total_views}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-3">
        <h4 className="text-xs font-medium text-white/70 line-clamp-1">
          {live.title}
        </h4>
        <p className="text-[10px] text-white/30 mt-0.5">
          {live.seller_name} ·{" "}
          {live.ended_at &&
            formatDistanceToNow(new Date(live.ended_at), {
              addSuffix: true,
              locale: pt,
            })}
        </p>
      </div>
    </div>
  );
}

function LiveCardSkeleton() {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Skeleton
        className="aspect-video w-full"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
      />
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-3">
          <Skeleton
            className="h-9 w-9 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          />
          <div className="flex-1 space-y-2">
            <Skeleton
              className="h-4 w-3/4"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            />
            <Skeleton
              className="h-3 w-1/2"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  large,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  large?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center ${
        large ? "py-32" : "py-16"
      }`}
    >
      <div className="text-white/8 mb-4">{icon}</div>
      <h3
        className={`font-semibold text-white/30 ${
          large ? "text-xl" : "text-base"
        }`}
      >
        {title}
      </h3>
      <p className="text-sm text-white/15 mt-1">{subtitle}</p>
    </motion.div>
  );
}
