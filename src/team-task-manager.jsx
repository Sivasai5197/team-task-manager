import { useState, useEffect, useCallback } from "react";

const getToken = () => sessionStorage.getItem("ttm_token");

const request = async (endpoint, options = {}) => {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!isJson) {
    throw new Error("API server returned a web page instead of JSON. Start the backend server and make sure /api requests reach Express.");
  }
  if (!res.ok) throw new Error(data.error || "API request failed");
  return data;
};

const API = {
  signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProjects: () => request('/projects'),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getTasks: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request(`/tasks${query ? `?${query}` : ''}`);
  },
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, updates) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  getUsers: () => request('/users'),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isOverdue = (task) => task.status !== "completed" && task.dueDate && new Date(task.dueDate) < new Date();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const priorityColor = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
const statusMeta = {
  "pending": { label: "Pending", color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
  "in-progress": { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  "completed": { label: "Completed", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
};


// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    projects: <><path d="M2 7a2 2 0 012-2h4l2 2h10a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" /></>,
    tasks: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></>,
    check: <><polyline points="20 6 9 17 4 12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    chevronDown: <><polyline points="6 9 12 15 18 9" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>,
    star: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ─── Modal Component ──────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, width = 480 }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem", animation: "fadeIn 0.15s ease" }}>
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px", borderRadius: "6px", display: "flex" }}><Icon name="x" size={18} /></button>
      </div>
      <div style={{ padding: "1.5rem" }}>{children}</div>
    </div>
  </div>
);

// ─── Form Components ──────────────────────────────────────────────────────────
const Input = ({ label, error, ...props }) => (
  <div style={{ marginBottom: "1rem" }}>
    {label && <label style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>}
    <input {...props} style={{ width: "100%", padding: "0.6rem 0.85rem", background: "var(--input-bg)", border: `1px solid ${error ? "#ef4444" : "var(--border)"}`, borderRadius: "8px", color: "var(--text)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s", fontFamily: "inherit", ...props.style }} onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = error ? "#ef4444" : "var(--border)"} />
    {error && <p style={{ color: "#ef4444", fontSize: "0.78rem", marginTop: "4px", margin: "4px 0 0" }}>{error}</p>}
  </div>
);

const Select = ({ label, children, error, ...props }) => (
  <div style={{ marginBottom: "1rem" }}>
    {label && <label style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>}
    <select {...props} style={{ width: "100%", padding: "0.6rem 0.85rem", background: "var(--input-bg)", border: `1px solid ${error ? "#ef4444" : "var(--border)"}`, borderRadius: "8px", color: "var(--text)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit", cursor: "pointer", ...props.style }}>{children}</select>
    {error && <p style={{ color: "#ef4444", fontSize: "0.78rem", margin: "4px 0 0" }}>{error}</p>}
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div style={{ marginBottom: "1rem" }}>
    {label && <label style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>}
    <textarea {...props} style={{ width: "100%", padding: "0.6rem 0.85rem", background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 80, fontFamily: "inherit", ...props.style }} onFocus={e => e.target.style.borderColor = "var(--accent)"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
  </div>
);

const Btn = ({ children, variant = "primary", size = "md", icon, loading, ...props }) => {
  const styles = {
    primary: { background: "var(--accent)", color: "#fff", border: "none" },
    secondary: { background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" },
    danger: { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" },
    ghost: { background: "transparent", color: "var(--muted)", border: "none" },
  };
  const sizes = { sm: { padding: "0.35rem 0.75rem", fontSize: "0.8rem" }, md: { padding: "0.55rem 1.1rem", fontSize: "0.875rem" }, lg: { padding: "0.75rem 1.5rem", fontSize: "1rem" } };
  return (
    <button {...props} style={{ ...styles[variant], ...sizes[size], borderRadius: "8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 600, transition: "opacity 0.15s, transform 0.1s", fontFamily: "inherit", opacity: loading ? 0.7 : 1, ...props.style }}
      onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}>
      {icon && <Icon name={icon} size={14} />}{loading ? "Loading…" : children}
    </button>
  );
};

// ─── Auth Screen ──────────────────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "admin@demo.com", password: "admin123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, password: form.password };
      const res = mode === "login" ? await API.login(payload) : await API.signup(payload);
      setLoading(false);
      onLogin(res.user, res.token);
    } catch (e) {
      setLoading(false);
      setError(e.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "var(--font)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, background: "var(--accent)", borderRadius: "16px", marginBottom: "1rem", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
            <Icon name="tasks" size={28} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>TeamTask</h1>
          <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>Collaborative task management</p>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "2rem", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", background: "var(--surface2)", borderRadius: "10px", padding: "4px", marginBottom: "1.5rem" }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "0.5rem", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", fontFamily: "inherit", transition: "all 0.2s", background: mode === m ? "var(--surface)" : "transparent", color: mode === m ? "var(--text)" : "var(--muted)", boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.2)" : "none" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "0.75rem 1rem", color: "#ef4444", fontSize: "0.875rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}><Icon name="alert" size={16} color="#ef4444" />{error}</div>}

          {mode === "signup" && <Input label="Full Name" value={form.name} onChange={set("name")} placeholder="Your full name" />}
          <Input label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
          <Input label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />
          {mode === "signup" && <p style={{ margin: "-0.25rem 0 1rem", color: "var(--muted)", fontSize: "0.8rem" }}>New accounts start as members. Use the seeded admin account to manage projects and assignments.</p>}

          <Btn size="lg" loading={loading} onClick={submit} style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}>
            {mode === "login" ? "Sign In" : "Create Account"}
          </Btn>

          {mode === "login" && (
            <div style={{ marginTop: "1.25rem", padding: "1rem", background: "var(--surface2)", borderRadius: "10px", fontSize: "0.8rem", color: "var(--muted)" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "var(--text)" }}>Demo Accounts:</p>
              <p style={{ margin: "2px 0" }}>Admin: admin@demo.com / admin123</p>
              <p style={{ margin: "2px 0" }}>Member: member@demo.com / member123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color, sub }) => (
  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <div style={{ width: 36, height: 36, borderRadius: "10px", background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={color} />
      </div>
    </div>
    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{sub}</div>}
  </div>
);

// ─── Task Badge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const m = statusMeta[status] || statusMeta["pending"];
  return <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.74rem", fontWeight: 700, color: m.color, background: m.bg, whiteSpace: "nowrap" }}>{m.label}</span>;
};

const PriorityDot = ({ priority }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: priorityColor[priority] || "#94a3b8", flexShrink: 0 }} />{priority}
  </span>
);

// ─── Task Card ────────────────────────────────────────────────────────────────
const TaskCard = ({ task, projects, users, user, onUpdate, onDelete, isAdmin }) => {
  const project = projects.find(p => p.id === task.projectId);
  const assigneeId = task.assignedToId;
  const assignee = task.assignedTo || users.find(u => u.id === assigneeId);
  const overdue = isOverdue(task);
  const canEdit = isAdmin || assigneeId === user.id;

  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${overdue ? "rgba(239,68,68,0.3)" : "var(--border)"}`, borderRadius: "14px", padding: "1rem 1.25rem", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", textDecoration: task.status === "completed" ? "line-through" : "none", opacity: task.status === "completed" ? 0.6 : 1 }}>{task.title}</p>
          {task.description && <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</p>}
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", alignItems: "center", marginBottom: "0.75rem" }}>
        {project && <span style={{ fontSize: "0.75rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: project.color }} />{project.name}</span>}
        <PriorityDot priority={task.priority} />
        {task.dueDate && <span style={{ fontSize: "0.75rem", color: overdue ? "#ef4444" : "var(--muted)", display: "flex", alignItems: "center", gap: "4px", fontWeight: overdue ? 700 : 400 }}><Icon name="clock" size={12} color={overdue ? "#ef4444" : "currentColor"} />{overdue ? "Overdue · " : ""}{fmtDate(task.dueDate)}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{assignee ? `Assigned to ${assignee.name}` : "Unassigned"}</span>
        {canEdit && (
          <div style={{ display: "flex", gap: "4px" }}>
            {isAdmin && (
              <Select value={task.status} onChange={e => onUpdate(task.id, { status: e.target.value })} style={{ padding: "3px 8px", fontSize: "0.75rem", borderRadius: "6px", marginBottom: 0 }}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </Select>
            )}
            {!isAdmin && assigneeId === user.id && (
              <Select value={task.status} onChange={e => onUpdate(task.id, { status: e.target.value })} style={{ padding: "3px 8px", fontSize: "0.75rem", borderRadius: "6px", marginBottom: 0 }}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </Select>
            )}
            {isAdmin && <button onClick={() => onDelete(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px", borderRadius: "6px", display: "flex", opacity: 0.7 }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}><Icon name="trash" size={14} color="#ef4444" /></button>}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Project Card ─────────────────────────────────────────────────────────────
const ProjectCard = ({ project, tasks, onDelete, isAdmin, onClick }) => {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completed = projectTasks.filter(t => t.status === "completed").length;
  const pct = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;

  return (
    <div onClick={onClick} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.25)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: "12px", background: project.color + "33", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="projects" size={20} color={project.color} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>{project.name}</h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>{fmtDate(project.createdAt)}</p>
          </div>
        </div>
        {isAdmin && <button onClick={e => { e.stopPropagation(); onDelete(project.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px", borderRadius: "6px", opacity: 0.5 }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}><Icon name="trash" size={15} color="#ef4444" /></button>}
      </div>
      {project.description && <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5 }}>{project.description}</p>}
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{completed}/{projectTasks.length} tasks</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: project.color }}>{pct}%</span>
        </div>
        <div style={{ height: 5, background: "var(--surface2)", borderRadius: "99px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: project.color, borderRadius: "99px", transition: "width 0.4s ease" }} />
        </div>
      </div>
    </div>
  );
};

// ─── Create Task Modal ────────────────────────────────────────────────────────
const CreateTaskModal = ({ onClose, projects, users, preProjectId, onCreated }) => {
  const [form, setForm] = useState({ title: "", description: "", projectId: preProjectId || "", assignedToId: "", priority: "medium", dueDate: "", status: "pending" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title required";
    if (!form.projectId) errs.projectId = "Select a project";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await API.createTask(form);
      onCreated(res.task); onClose();
    } catch (e) {
      setErrors({ title: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create Task" onClose={onClose}>
      <Input label="Task Title" value={form.title} onChange={set("title")} placeholder="Enter task title…" error={errors.title} />
      <Textarea label="Description" value={form.description} onChange={set("description")} placeholder="Optional description…" />
      <Select label="Project" value={form.projectId} onChange={set("projectId")} error={errors.projectId}>
        <option value="">Select project…</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </Select>
      <Select label="Assign To" value={form.assignedToId} onChange={set("assignedToId")}>
        <option value="">Unassigned</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </Select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <Select label="Priority" value={form.priority} onChange={set("priority")}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
        <Input label="Due Date" type="date" value={form.dueDate} onChange={set("dueDate")} />
      </div>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn loading={loading} onClick={submit} icon="plus">Create Task</Btn>
      </div>
    </Modal>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { const s = sessionStorage.getItem("ttm_session"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [page, setPage] = useState("dashboard");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [newProject, setNewProject] = useState({ name: "", description: "", color: "#6366f1" });

  const isAdmin = user?.role === "admin";

  const logout = useCallback(() => {
    sessionStorage.removeItem("ttm_session");
    sessionStorage.removeItem("ttm_token");
    setUser(null);
  }, []);

  const reload = useCallback(async () => {
    try {
      const [p, t, u] = await Promise.all([API.getProjects(), API.getTasks(), API.getUsers()]);
      setProjects(p); setTasks(t); setUsers(u);
    } catch (e) {
      if (e.message.includes("Unauthorized")) logout();
    }
  }, [logout]);

  useEffect(() => {
    if (!user) return undefined;
    const timerId = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timerId);
  }, [user, reload]);

  const login = (u, token) => { 
    sessionStorage.setItem("ttm_session", JSON.stringify(u)); 
    sessionStorage.setItem("ttm_token", token);
    setUser(u); setPage("dashboard"); 
  };

  if (!user) return <AuthScreen onLogin={login} />;

  // Stats
  const myTasks = isAdmin ? tasks : tasks.filter(t => t.assignedToId === user.id);
  const stats = {
    total: myTasks.length,
    completed: myTasks.filter(t => t.status === "completed").length,
    pending: myTasks.filter(t => t.status === "pending").length,
    inProgress: myTasks.filter(t => t.status === "in-progress").length,
    overdue: myTasks.filter(t => isOverdue(t)).length,
  };

  const visibleTasks = myTasks.filter(t => {
    if (filterProject && t.projectId !== filterProject) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const createProject = async () => {
    if (!newProject.name.trim()) return;
    try {
      await API.createProject(newProject);
      reload(); setNewProject({ name: "", description: "", color: "#6366f1" }); setModal(null);
    } catch (e) { alert(e.message); }
  };

  const deleteProject = async (id) => { if (confirm("Delete project and all its tasks?")) { await API.deleteProject(id); reload(); } };
  const updateTask = async (id, updates) => { await API.updateTask(id, updates); reload(); };
  const deleteTask = async (id) => { if (confirm("Delete this task?")) { await API.deleteTask(id); reload(); } };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "projects", label: "Projects", icon: "projects" },
    { id: "tasks", label: "Tasks", icon: "tasks" },
    ...(isAdmin ? [{ id: "team", label: "Team", icon: "users" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)", fontFamily: "var(--font)", color: "var(--text)" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 10 }}>
        <div style={{ padding: "1.5rem 1.25rem 1rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 34, height: 34, background: "var(--accent)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="tasks" size={18} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.03em" }}>TeamTask</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "1rem 0.75rem" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: "0.65rem", width: "100%", padding: "0.6rem 0.75rem", background: page === item.id ? "var(--accent)" : "transparent", color: page === item.id ? "#fff" : "var(--muted)", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", marginBottom: "2px", fontFamily: "inherit", transition: "all 0.15s", textAlign: "left" }}
              onMouseEnter={e => { if (page !== item.id) e.currentTarget.style.background = "var(--surface2)"; }}
              onMouseLeave={e => { if (page !== item.id) e.currentTarget.style.background = "transparent"; }}>
              <Icon name={item.icon} size={17} color={page === item.id ? "#fff" : "currentColor"} />
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "1rem 0.75rem", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem", padding: "0 0.25rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600, textTransform: "capitalize" }}>{user.role}</p>
            </div>
          </div>
          <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", padding: "0.5rem 0.75rem", background: "transparent", color: "var(--muted)", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 500, fontSize: "0.82rem", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}>
            <Icon name="logout" size={15} />Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 220, flex: 1, padding: "2rem", minHeight: "100vh", maxWidth: "calc(100vw - 220px)" }}>

        {/* Dashboard */}
        {page === "dashboard" && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.04em" }}>
                {isAdmin ? "Overview Dashboard" : "My Dashboard"}
              </h1>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                {isAdmin ? "All projects and tasks at a glance" : "Your assigned tasks and progress"}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <StatCard label="Total Tasks" value={stats.total} icon="tasks" color="#6366f1" sub="All tasks" />
              <StatCard label="Completed" value={stats.completed} icon="check" color="#22c55e" sub={`${stats.total ? Math.round(stats.completed / stats.total * 100) : 0}% done`} />
              <StatCard label="In Progress" value={stats.inProgress} icon="star" color="#f59e0b" sub="Active work" />
              <StatCard label="Pending" value={stats.pending} icon="clock" color="#94a3b8" sub="Not started" />
              <StatCard label="Overdue" value={stats.overdue} icon="alert" color="#ef4444" sub="Need attention" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Recent Tasks</h2>
                  <Btn variant="ghost" size="sm" onClick={() => setPage("tasks")}>View all →</Btn>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {myTasks.slice(0, 5).map(t => (
                    <TaskCard key={t.id} task={t} projects={projects} users={users} user={user} onUpdate={updateTask} onDelete={deleteTask} isAdmin={isAdmin} />
                  ))}
                  {myTasks.length === 0 && <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)", background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)" }}>No tasks yet</div>}
                </div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Projects</h2>
                  <Btn variant="ghost" size="sm" onClick={() => setPage("projects")}>View all →</Btn>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {projects.slice(0, 4).map(p => (
                    <ProjectCard key={p.id} project={p} tasks={tasks} onDelete={deleteProject} isAdmin={isAdmin} onClick={() => setPage("projects")} />
                  ))}
                  {projects.length === 0 && <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)", background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)" }}>No projects yet</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects */}
        {page === "projects" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.04em" }}>Projects</h1>
                <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
              </div>
              {isAdmin && <Btn icon="plus" onClick={() => setModal("create-project")}>New Project</Btn>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {projects.map(p => (
                <ProjectCard key={p.id} project={p} tasks={tasks} onDelete={deleteProject} isAdmin={isAdmin} onClick={() => { setFilterProject(p.id); setPage("tasks"); }} />
              ))}
            </div>
            {projects.length === 0 && (
              <div style={{ textAlign: "center", padding: "4rem", color: "var(--muted)" }}>
                <Icon name="projects" size={48} color="var(--border)" />
                <p style={{ marginTop: "1rem" }}>No projects yet.{isAdmin ? " Create one to get started." : ""}</p>
              </div>
            )}
          </div>
        )}

        {/* Tasks */}
        {page === "tasks" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.04em" }}>Tasks</h1>
                <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>{visibleTasks.length} task{visibleTasks.length !== 1 ? "s" : ""}</p>
              </div>
              {isAdmin && <Btn icon="plus" onClick={() => setModal("create-task")}>New Task</Btn>}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}><Icon name="search" size={15} /></span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" style={{ width: "100%", paddingLeft: "2.2rem", paddingRight: "0.75rem", paddingTop: "0.6rem", paddingBottom: "0.6rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ padding: "0.6rem 0.85rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "0.875rem", fontFamily: "inherit", cursor: "pointer" }}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "0.6rem 0.85rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "0.875rem", fontFamily: "inherit", cursor: "pointer" }}>
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              {(filterProject || filterStatus || search) && <Btn variant="ghost" size="sm" onClick={() => { setFilterProject(""); setFilterStatus(""); setSearch(""); }}>Clear</Btn>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "0.85rem" }}>
              {visibleTasks.map(t => (
                <TaskCard key={t.id} task={t} projects={projects} users={users} user={user} onUpdate={updateTask} onDelete={deleteTask} isAdmin={isAdmin} />
              ))}
            </div>
            {visibleTasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "4rem", color: "var(--muted)" }}>
                <Icon name="tasks" size={48} color="var(--border)" />
                <p style={{ marginTop: "1rem" }}>No tasks found</p>
              </div>
            )}
          </div>
        )}

        {/* Team (Admin only) */}
        {page === "team" && isAdmin && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.04em" }}>Team Members</h1>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>{users.length} members</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {users.map(u => {
                const userTasks = tasks.filter(t => t.assignedToId === u.id);
                const done = userTasks.filter(t => t.status === "completed").length;
                return (
                  <div key={u.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: u.role === "admin" ? "var(--accent)" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{u.name.charAt(0)}</div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: "var(--text)" }}>{u.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: u.role === "admin" ? "var(--accent)" : "#f59e0b", fontWeight: 600, textTransform: "capitalize" }}>{u.role}</p>
                      </div>
                    </div>
                    <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>{u.email}</p>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {[["total", userTasks.length, "var(--muted)"], ["done", done, "#22c55e"], ["overdue", userTasks.filter(t => isOverdue(t)).length, "#ef4444"]].map(([l, v, c]) => (
                        <div key={l} style={{ flex: 1, textAlign: "center", background: "var(--surface2)", borderRadius: "8px", padding: "0.5rem" }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem", color: c }}>{v}</p>
                          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--muted)", textTransform: "capitalize" }}>{l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {modal === "create-project" && (
        <Modal title="Create Project" onClose={() => setModal(null)}>
          <Input label="Project Name" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Website Redesign" />
          <Textarea label="Description" value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} placeholder="What is this project about?" />
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Color</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"].map(c => (
                <button key={c} onClick={() => setNewProject(p => ({ ...p, color: c }))} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: newProject.color === c ? "3px solid var(--text)" : "3px solid transparent", cursor: "pointer", transition: "transform 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"} onMouseLeave={e => e.currentTarget.style.transform = ""} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn icon="plus" onClick={createProject}>Create Project</Btn>
          </div>
        </Modal>
      )}

      {/* Create Task Modal */}
      {modal === "create-task" && (
        <CreateTaskModal onClose={() => setModal(null)} projects={projects} users={users} preProjectId={filterProject} onCreated={() => reload()} />
      )}
    </div>
  );
}

// ─── Global Styles ────────────────────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
  :root {
    --font: 'Sora', system-ui, sans-serif;
    --bg: #0d0f14;
    --surface: #161921;
    --surface2: #1e2230;
    --border: #252a38;
    --text: #f1f3f8;
    --muted: #6b7280;
    --accent: #6366f1;
    --input-bg: #1e2230;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); font-family: var(--font); }
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
  select option { background: #1e2230; color: #f1f3f8; }
`;
document.head.appendChild(style);
