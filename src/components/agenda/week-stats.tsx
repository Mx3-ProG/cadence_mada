import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateFnsLocale } from "@/i18n/date-fns-locales";
import { Activity, CalendarClock, MailCheck, TrendingUp, Users } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { StatusBadge } from "@/components/agenda/status-badge";
import type { Appointment, AppointmentStatus, Contact } from "@/lib/agenda";

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
    <section className="glass-panel h-full min-w-0 overflow-hidden rounded-2xl p-4">
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
  const dateFnsLocale = useDateFnsLocale();
  const { t } = useTranslation("agenda");
  const noContactLabel = t("week_stats.no_contact");
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
        name: c?.name ?? noContactLabel,
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
      { label: t("week_stats.panel3.morning"), from: 0, to: 12 },
      { label: t("week_stats.panel3.afternoon"), from: 12, to: 17 },
      { label: t("week_stats.panel3.evening"), from: 17, to: 24 },
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
  }, [appointments, contacts, days, t, noContactLabel]);

  const maxDay = Math.max(1, ...stats.perDay.map((d) => d.total));
  const maxContact = Math.max(1, ...stats.perContact.map((c) => c.total));
  const maxSlot = Math.max(1, ...stats.slots.map((s) => s.total));

  return (
    <div className="mt-12">
      <Reveal>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            {t("week_stats.title")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("week_stats.summary", {
            count: stats.total,
            hours: (stats.totalMinutes / 60).toFixed(1),
            rate: pct(stats.byStatus.accepted, stats.total),
          })}
        </p>
      </Reveal>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Reveal delay={0.05}>
          <Panel
            title={t("week_stats.panel1.title")}
            icon={CalendarClock}
            hint={t("week_stats.panel1.hint", {
              day: format(stats.busiestDay.day, "EEEE", { locale: dateFnsLocale }),
              count: stats.busiestDay.total,
            })}
          >
            <div className="max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">{t("week_stats.panel1.day_col")}</th>
                    {STATUSES.map((s) => (
                      <th key={s} className="pb-2 text-center font-medium">
                        {t(`status.${s}`)}
                      </th>
                    ))}
                    <th className="pb-2 text-right font-medium">
                      {t("week_stats.panel1.total_col")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perDay.map((d) => (
                    <tr key={d.day.toISOString()} className="border-t border-border/60">
                      <td className="py-2 pe-2">
                        <span className="capitalize">
                          {format(d.day, "EEE d", { locale: dateFnsLocale })}
                        </span>
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
                      {t("week_stats.panel1.week_row")}
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
            title={t("week_stats.panel2.title")}
            icon={Users}
            hint={t("week_stats.panel2.hint")}
          >
            {stats.perContact.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                {t("week_stats.panel2.empty")}
              </p>
            ) : (
              <div className="max-w-full overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 font-medium">{t("week_stats.panel2.contact_col")}</th>
                      <th className="pb-2 text-center font-medium">
                        {t("week_stats.panel2.appt_col")}
                      </th>
                      <th className="pb-2 text-center font-medium">
                        {t("week_stats.panel2.hours_col")}
                      </th>
                      <th className="pb-2 text-center font-medium">
                        {t("week_stats.panel2.accept_col")}
                      </th>
                      <th className="pb-2 text-right font-medium">
                        {t("week_stats.panel2.score_col")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.perContact.slice(0, 6).map((c) => (
                      <tr key={c.id} className="border-t border-border/60">
                        <td className="py-2 pe-2">
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
          <Panel
            title={t("week_stats.panel3.title")}
            icon={Activity}
            hint={t("week_stats.panel3.hint")}
          >
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
          <Panel
            title={t("week_stats.panel4.title")}
            icon={MailCheck}
            hint={t("week_stats.panel4.hint")}
          >
            <div className="max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[390px] text-sm">
                <tbody>
                  {[
                    {
                      label: t("week_stats.panel4.sent"),
                      value: `${stats.invites.sent} / ${stats.total}`,
                      detail: `${pct(stats.invites.sent, stats.total)} %`,
                    },
                    {
                      label: t("week_stats.panel4.answered"),
                      value: `${stats.invites.answered} / ${stats.total}`,
                      detail: `${pct(stats.invites.answered, stats.total)} %`,
                    },
                    {
                      label: t("week_stats.panel4.not_sent"),
                      value: String(stats.invites.pendingNotSent),
                      detail:
                        stats.invites.pendingNotSent > 0
                          ? t("week_stats.panel4.to_follow_up")
                          : t("week_stats.panel4.ok"),
                    },
                    {
                      label: t("week_stats.panel4.no_email"),
                      value: String(stats.invites.noEmail),
                      detail:
                        stats.invites.noEmail > 0
                          ? t("week_stats.panel4.copy_link")
                          : t("week_stats.panel4.ok"),
                    },
                  ].map((row) => (
                    <tr key={row.label} className="border-t border-border/60 first:border-t-0">
                      <td className="py-2 pe-2 text-muted-foreground">{row.label}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{row.value}</td>
                      <td className="w-24 py-2 text-right text-xs text-muted-foreground">
                        {row.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
