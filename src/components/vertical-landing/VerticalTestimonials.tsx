import { Star } from "lucide-react";
import type { VerticalConfig } from "@/config/verticalConfigs";

interface Props {
  config: VerticalConfig;
}

export function VerticalTestimonials({ config }: Props) {
  const testimonials = config.testimonials;
  if (!testimonials?.length) return null;

  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-[0.2em] mb-4 block" style={{ color: config.cores.primaria }}>
            Testemunhos
          </span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
            O que dizem os nossos clientes
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,8%)] p-6 space-y-4"
            >
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${s <= t.rating ? "fill-yellow-400 text-yellow-400" : "text-[hsl(215,20%,30%)]"}`}
                  />
                ))}
              </div>
              <p className="text-sm text-[hsl(215,20%,65%)] leading-relaxed italic">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${config.cores.primaria}20` }}
                  >
                    <span className="text-xs font-bold" style={{ color: config.cores.primaria }}>
                      {t.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold">{t.name}</p>
                  {t.role && <p className="text-xs text-[hsl(215,20%,65%)]">{t.role}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
