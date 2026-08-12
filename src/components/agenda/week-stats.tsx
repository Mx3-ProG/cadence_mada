import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity, CalendarClock, MailCheck, TrendingUp, Users } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { StatusBadge } from "@/components/agenda/status-badge";
import { statusLabel, type Appointment, type AppointmentStatus, type Contact } from "@/lib/agenda";

const STATUSES: AppointmentStatus[] = ["pending", "accepted", "declined", "cancelled"];

function Bar({ value, max, tone = "bg-primary" }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  hint,
  children,
}: {
  title: string;
  icon: typeof Users;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel h-full rounded-2xl p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </h3>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function WeekStats({
  appointments,
  contacts,
  days,
}: {
  appointments: Appointment[];
  contacts: Contact[];
  days: Date[];
}) {
  const stats = useMemo(() => {
    const total = appointments.length;

    const byStatus: Record<AppointmentStatus, number> = {
      pending: 0,
      accepted: 0,
      declined: 0,
      cancelled: 0,
    };
    for (const a of appointments) byStatus[a.status] += 1;

    // Croisé jour × statut
    const perDay = days.map((day) => {
      const list = appointments.filter((a) => isSameDay(new Date(a.starts_at), day));
      const counts: Record<AppointmentStatus, number> = {
        pending: 0,
        accepted: 0,
        declined: 0,
        cancelled: 0,
      };
      let minutes = 0;
      for (const a of list) {
        counts[a.status] += 1;
        minutes += Math.max(
          0,
          (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000,
        );
      }
      return { day, total: list.length, counts, minutes };
    });

    const busiestDay = perDay.reduce(
      (best, d) => (d.total > best.total ? d : best),
      perDay[0] ?? { day: days[0]!, total: 0, counts: byStatus, minutes: 0 },
    );

    // Croisé contact × statut + score de demande
    const contactName = new Map(contacts.map((c) => [c.id, c] as const));
    const perContactMap = new Map<
      string,
      {
        id: string;
        name: string;
        company: string | null;
        total: number;
        counts: Record<AppointmentStatus, number>;
        minutes: number;
        hasEmail: boolean;
      }
    >();
    for (const a of appointments) {
      const key = a.contact_id ?? "__none__";
      const c = a.contact_id ? contactName.get(a.contact_id) : undefined;
      const entry = perContactMap.get(key) ?? {
        id: key,
        name: c?.name ?? "Sans contact",
        company: c?.company ?? null,
        total: 0,
        counts: { pending: 0, accepted: 0, declined: 0, cancelled: 0 },
        minutes: 0,
        hasEmail: Boolean(c?.email),
      };
      entry.total += 1;
      entry.counts[a.status] += 1;
      entry.minutes += Math.max(
        0,
        (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000,
      );
      perContactMap.set(key, entry);
    }
    // Score de "demande" : volume + temps consacré, pénalisé par les refus
    const perContact = [...perContactMap.values()]
      .map((c) => ({
        ...c,
        score: c.total * 3 + c.minutes / 60 - c.counts.declined * 1.5,
        acceptRate: pct(c.counts.accepted, c.total),
      }))
      .sort((a, b) => b.score - a.score);

    // Créneaux horaires
    const slots = [
      { label: "Matin (avant 12h)", from: 0, to: 12 },
      { label: "Après-midi (12h–17h)", from: 12, to: 17 },
      { label: "Fin de journée (17h+)", from: 17, to: 24 },
    ].map((s) => ({
      ...s,
      total: appointments.filter((a) => {
        const h = new Date(a.starts_at).getHours();
        return h >= s.from && h < s.to;
      }).length,
    }));

    // Suivi des invitations
    const withContact = appointments.filter((a) => a.contact_id);
    const sent = appointments.filter((a) => a.invite_sent_at).length;
    const answered = appointments.filter(
      (a) => a.status === "accepted" || a.status === "declined",
    ).length;
    const noEmail = withContact.filter((a) => {
      const c = a.contact_id ? contactName.get(a.contact_id) : undefined;
      return !c?.email;
    }).length;
    const pendingNotSent = appointments.filter(
      (a) => a.status === "pending" && !a.invite_sent_at,
    ).length;

    const totalMinutes = perDay.reduce((sum, d) => sum + d.minutes, 0);

    return {
      total,
      byStatus,
      perDay,
      busiestDay,
      perContact,
      slots,
      totalMinutes,
      invites: { sent, answered, noEmail, pendingNotSent },
    };
  }, [appointments, contacts, days]);

  const maxDay = Math.max(1, ...stats.perDay.map((d) => d.total));
  const maxContact = Math.max(1, ...stats.perContact.map((c) => c.total));
  const maxSlot = Math.max(1, ...stats.slots.map((s) => s.total));

  return (
    <div className="mt-12">
      <Reveal>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Statistiques de la semaine
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.total} rendez-vous · {(stats.totalMinutes / 60).toFixed(1)} h planifiées · taux
          d'acceptation {pct(stats.byStatus.accepted, stats.total)} %
        </p>
      </Reveal>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Reveal delay={0.05}>
          <Panel
            title="Répartition par jour × statut"
            icon={CalendarClock}
            hint={`Jour le plus demandé : ${format(stats.busiestDay.day, "EEEE", { locale: fr })} (${stats.busiestDay.total})`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Jour</th>
                    {STATUSES.map((s) => (
                      <th key={s} className="pb-2 text-center font-medium">
                        {statusLabel[s]}
                      </th>
                    ))}
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perDay.map((d) => (
                    <tr key={d.day.toISOString()} className="border-t border-border/60">
                      <td className="py-2 pr-2">
                        <span className="capitalize">{format(d.day, "EEE d", { locale: fr })}</span>
                        <Bar value={d.total} max={maxDay} />
                      </td>
                      {STATUSES.map((s) => (
                        <td
                          key={s}
                          className={`text-center tabular-nums ${
                            d.counts[s] === 0 ? "text-muted-foreground/50" : ""
                          }`}
                        >
                          {d.counts[s]}
                        </td>
                      ))}
                      <td className="py-2 text-right font-semibold tabular-nums">{d.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td className="pt-2 text-xs uppercase tracking-wider text-muted-foreground">
                      Semaine
                    </td>
                    {STATUSES.map((s) => (
                      <td key={s} className="pt-2 text-center font-semibold tabular-nums">
                        {stats.byStatus[s]}
                      </td>
                    ))}
                    <td className="pt-2 text-right font-semibold tabular-nums">{stats.total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.1}>
          <Panel
            title="Contacts les plus demandeurs"
            icon={Users}
            hint="Score = volume + temps passé, pénalisé par les refus"
          >
            {stats.perContact.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                Aucun rendez-vous cette semaine
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 font-medium">Contact</th>
                      <th className="pb-2 text-center font-medium">RDV</th>
                      <th className="pb-2 text-center font-medium">Heures</th>
                      <th className="pb-2 text-center font-medium">Accept.</th>
                      <th className="pb-2 text-right font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.perContact.slice(0, 6).map((c) => (
                      <tr key={c.id} className="border-t border-border/60">
                        <td className="py-2 pr-2">
                          <p className="truncate font-medium">{c.name}</p>
                          {c.company && (
                            <p className="truncate text-xs text-muted-foreground">{c.company}</p>
                          )}
                          <Bar value={c.total} max={maxContact} />
                        </td>
                        <td className="text-center tabular-nums">{c.total}</td>
                        <td className="text-center tabular-nums">{(c.minutes / 60).toFixed(1)}</td>
                        <td className="text-center tabular-nums">{c.acceptRate} %</td>
                        <td className="text-right font-semibold tabular-nums">
                          {c.score.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={0.15}>
          <Panel title="Créneaux préférés" icon={Activity} hint="Répartition horaire des demandes">
            <ul className="space-y-3">
              {stats.slots.map((s) => (
                <li key={s.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{s.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.total} · {pct(s.total, stats.total)} %
                    </span>
                  </div>
                  <Bar value={s.total} max={maxSlot} />
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <StatusBadge status={s} />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {stats.byStatus[s]}
                  </span>
                </span>
              ))}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.2}>
          <Panel title="Suivi des invitations" icon={MailCheck} hint="Envois, réponses et blocages">
            <table className="w-full text-sm">
              <tbody>
                {[
                  {
                    label: "Invitations envoyées par email",
                    value: `${stats.invites.sent} / ${stats.total}`,
                    detail: `${pct(stats.invites.sent, stats.total)} %`,
                  },
                  {
                    label: "Réponses reçues",
                    value: `${stats.invites.answered} / ${stats.total}`,
                    detail: `${pct(stats.invites.answered, stats.total)} %`,
                  },
                  {
                    label: "En attente, lien jamais envoyé",
                    value: String(stats.invites.pendingNotSent),
                    detail: stats.invites.pendingNotSent > 0 ? "à relancer" : "ok",
                  },
                  {
                    label: "Contacts sans adresse email",
                    value: String(stats.invites.noEmail),
                    detail: stats.invites.noEmail > 0 ? "lien à copier" : "ok",
                  },
                ].map((row) => (
                  <tr key={row.label} className="border-t border-border/60 first:border-t-0">
                    <td className="py-2 pr-2 text-muted-foreground">{row.label}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{row.value}</td>
                    <td className="w-24 py-2 text-right text-xs text-muted-foreground">
                      {row.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
