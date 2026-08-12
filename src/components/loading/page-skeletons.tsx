import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/agenda/app-header";
import { CalendarLoader } from "@/components/loading/calendar-loader";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function LoaderRow({ label }: { label: string }) {
  return (
    <div className="glass-panel rounded-2xl px-6 py-10">
      <CalendarLoader label={label} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      <LoaderRow label="Préparation de ta semaine…" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </Shell>
  );
}

export function ContactsSkeleton() {
  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      <LoaderRow label="Chargement de ton carnet de contacts…" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </Shell>
  );
}

export function SettingsSkeleton() {
  return (
    <Shell>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <LoaderRow label="Chargement de tes réglages…" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </Shell>
  );
}

export function AdminSkeleton() {
  return (
    <Shell>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <LoaderRow label="Inspection des données…" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </Shell>
  );
}

export function LandingSkeleton() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-14 w-full max-w-2xl" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <LoaderRow label="Chargement…" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </main>
    </div>
  );
}

export function SimpleSkeleton({ label }: { label?: string | undefined }) {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-24 sm:px-6">
        <CalendarLoader {...(label ? { label } : {})} />
        <div className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
