import Link from "next/link";
import {
  BarChart3,
  Compass,
  Globe,
  LayoutTemplate,
  RefreshCcw,
  Ship,
  Truck,
  Users,
  Workflow,
} from "lucide-react";

const modules = [
  {
    id: "01",
    title: "Shipping & Quoting",
    description: "Real ocean freight + US trucking integrated into product quoting.",
    status: "Active",
    href: "/market-radar",
    icon: Ship,
    ctaLabel: "View CRM Dashboard →",
    ctaHref: "/shipping-crm",
  },
  {
    id: "02",
    title: "Apollo Integration",
    description: "Automated contact enrichment + email sequence builder.",
    status: "Active",
    href: "/apollo-integration",
    icon: Users,
    ctaLabel: "View Integration →",
    ctaHref: "/apollo-integration",
  },
  {
    id: "03",
    title: "Marketing Analytics",
    description: "Campaign performance, funnel tracking, and ROI dashboards.",
    status: "Coming Soon",
    icon: BarChart3,
  },
  {
    id: "04",
    title: "Import Data Overhaul",
    description: "Unified import pipelines with validation and auto-reconciliation.",
    status: "Coming Soon",
    icon: RefreshCcw,
  },
  {
    id: "05",
    title: "UI/UX Navigation",
    description: "Cross-module navigation improvements and role-based shortcuts.",
    status: "Coming Soon",
    icon: LayoutTemplate,
  },
  {
    id: "06",
    title: "US Fleet Data",
    description: "Carrier and domestic route intelligence for last-mile planning.",
    status: "Coming Soon",
    icon: Truck,
  },
  {
    id: "07",
    title: "Market Intelligence",
    description: "Macro trend, price movement, and competitor watch insights.",
    status: "Active",
    href: "/market-intelligence",
    icon: Globe,
  },
  {
    id: "08",
    title: "Internal Workflow",
    description: "Approvals, handoffs, and SLA monitoring across departments.",
    status: "Coming Soon",
    icon: Workflow,
  },
  {
    id: "09",
    title: "Logistic Explorer",
    description: "Explore shipping rates, routes, and logistics data via the SeaRate API.",
    status: "Active",
    href: "https://searate-api.vercel.app/",
    icon: Compass,
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <main className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            TBP Auto AI Transformation Portal
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
            Select a module below to manage global operations, intelligence, and sales.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = module.status === "Active";

            if (isActive && module.href) {
              const isExternal = module.href.startsWith("http");
              const cardContent = (
                <>
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-blue-600">Module {module.id}</span>
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-slate-900">{module.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">{module.description}</p>
                  <span className="mt-4 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                    Active
                  </span>
                </>
              );
              return (
                <div
                  key={module.id}
                  className="group rounded-xl border border-blue-300 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
                >
                  {isExternal ? (
                    <a
                      href={module.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {cardContent}
                    </a>
                  ) : (
                    <Link href={module.href} className="block">
                      {cardContent}
                    </Link>
                  )}
                  {!isExternal && "ctaHref" in module && module.ctaHref && (
                    <Link
                      href={module.ctaHref}
                      className="mt-1 block text-xs text-blue-600 underline"
                    >
                      {"ctaLabel" in module ? module.ctaLabel : "View →"}
                    </Link>
                  )}
                </div>
              );
            }

            return (
              <div
                key={module.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-4 opacity-75 grayscale"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-slate-500">Module {module.id}</span>
                  <Icon className="h-5 w-5 text-slate-500" />
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-700">{module.title}</h2>
                <p className="mt-2 text-sm text-slate-500">{module.description}</p>
                <span className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                  Coming Soon
                </span>
                <span className="pointer-events-none absolute -top-2 left-1/2 z-10 w-max -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  This module is currently under development.
                </span>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
