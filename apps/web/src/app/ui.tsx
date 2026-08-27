import type { ReactNode } from "react";

export const courses = [
  {
    id: "1",
    title: "Machine Learning",
    subtitle: "From fundamentals to model evaluation and applied projects.",
    lessons: "16 lessons",
    projects: "4 projects",
    progress: "75%",
    state: "In Progress",
    mark: "AI",
    tone: "accent",
  },
] as const;

export const modules = [
  ["Foundations", "6 lessons", "Start with the basics: data, features, and the ML workflow.", "100%", "Complete"],
  ["Core Concepts", "5 lessons", "Explore core algorithms and how they work.", "80%", "In Progress"],
  ["Advanced Topics", "6 lessons", "Dive deeper into model tuning, evaluation, and overfitting.", "20%", "Not Started"],
  ["Real World", "4 lessons", "Apply your skills to real datasets and build end-to-end models.", "0%", "Locked"],
] as const;

export const lessons = [
  ["1", "What is Machine Learning?", "Key ideas, types and real world applications", "20 min", "Done"],
  ["2", "Data in Machine Learning", "Understanding datasets and features", "25 min", "Done"],
  ["3", "Train, Validation, Test Split", "How we test and make models properly", "18 min", "Done"],
  ["4", "Bias & Variance", "The fundamental trade-off", "22 min", "Done"],
  ["5", "Model Evaluation", "Metrics that actually matter", "26 min", "In Progress"],
  ["6", "Overfitting & Underfitting", "Ready after Model Evaluation", "24 min", "Locked"],
] as const;

export function Logo() {
  return (
    <a className="brand" href="/dashboard">
      <Sparkle className="logo-mark" />
      <span>Lumi</span>
    </a>
  );
}

export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2.5c1.8 7 5.5 10.7 12.5 12.5C21.5 16.8 17.8 20.5 16 27.5 14.2 20.5 10.5 16.8 3.5 15 10.5 13.2 14.2 9.5 16 2.5Z" />
      <path d="M5.5 3.5c.6 2.2 1.8 3.4 4 4-2.2.6-3.4 1.8-4 4-.6-2.2-1.8-3.4-4-4 2.2-.6 3.4-1.8 4-4Z" />
      <path d="M26 22c.5 1.9 1.6 3 3.5 3.5-1.9.5-3 1.6-3.5 3.5-.5-1.9-1.6-3-3.5-3.5 1.9-.5 3-1.6 3.5-3.5Z" />
    </svg>
  );
}

export function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 12 12 4l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z",
    book: "M5 5h6a4 4 0 0 1 4 4v13a4 4 0 0 0-4-4H5V5Zm10 4a4 4 0 0 1 4-4h6v13h-6a4 4 0 0 0-4 4V9Z",
    folder: "M3 7h7l2 3h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
    chart: "M5 20V10m7 10V5m7 15v-8M3 22h20",
    bookmark: "M7 4h10a1 1 0 0 1 1 1v17l-6-3-6 3V5a1 1 0 0 1 1-1Z",
    search: "M10.5 18a7.5 7.5 0 1 1 5.3-2.2L22 22",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2",
    check: "m5 12 4 4L19 6",
    lock: "M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v10H6V11Z",
    arrow: "M19 12H5m7-7-7 7 7 7",
    brain: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3.5 3.5 0 0 0 7.5 18H9V4Zm6 0a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2A3.5 3.5 0 0 1 16.5 18H15V4ZM9 9H6m3 4H5.5m9.5-4h3m-3 4h3.5",
    layers: "m12 3 9 5-9 5-9-5 9-5Zm-7 9 7 4 7-4M5 16l7 4 7-4",
    code: "m8 9-4 3 4 3m8-6 4 3-4 3m-2-8-4 10",
    cube: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5m8 4.5v9",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    rocket: "M7 14 4 17v3l3-1 3-3m4-12c3 0 5 1 6 2-1 4-3 7-7 10l-5-5c3-4 6-6 10-7Zm-1 5h.01",
  };

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] ?? paths.book} />
    </svg>
  );
}

export function ProgressBar({ value }: { value: string }) {
  return (
    <div className="progressbar">
      <span style={{ width: value }} />
    </div>
  );
}

export function Status({ label }: { label: string }) {
  const className =
    label === "Complete" || label === "Done"
      ? "good"
      : label === "In Progress"
        ? "purple"
        : label === "Failed"
          ? "danger"
        : "gray";
  return <span className={`status ${className}`}>{label}</span>;
}

export function DisabledPill({ children }: { children: ReactNode }) {
  return (
    <span className="disabled-pill" aria-disabled="true">
      {children}
    </span>
  );
}

export function Sidebar({ active }: { active: string }) {
  const links = [
    ["Home", "/dashboard", "home"],
    ["Courses", "/courses", "book"],
  ] as const;

  return (
    <aside className="sidebar">
      <Logo />
      <nav className="nav">
        {links.map(([label, href, mark]) => (
          <a key={label} className={active === label ? "active" : ""} href={href}>
            <Icon name={mark} />
            {label}
          </a>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <img className="side-mascot" src="/mascot-waving.png" alt="" />
      </div>
    </aside>
  );
}

export function AppShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <main className="app">
      <Sidebar active={active} />
      <section className="main">{children}</section>
    </main>
  );
}

export function CourseTabs({ active, courseId = "1" }: { active: string; courseId?: string }) {
  const tabs = [
    ["Overview", `/courses/${courseId}`],
    ["Lessons", `/courses/${courseId}/lessons`],
    ["Chat", `/courses/${courseId}/chat`],
  ];

  return (
    <nav className="tabs">
      {tabs.map(([label, href]) => (
        <a key={label} className={active === label ? "active" : ""} href={href}>
          {label}
        </a>
      ))}
    </nav>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

export function CourseIcon({ children = "AI", tone = "" }: { children?: ReactNode; tone?: string }) {
  const icon = typeof children === "string" ? { AI: "brain", SD: "layers", PY: "code", DS: "cube" }[children] : undefined;

  return <span className={`iconbox ${tone}`}>{icon ? <Icon name={icon} /> : children}</span>;
}

export function EmptyNotice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <section className="notice">
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <div className="notice-action">{action}</div> : null}
    </section>
  );
}
