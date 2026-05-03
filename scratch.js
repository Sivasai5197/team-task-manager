import fs from 'fs';

const file = 'src/team-task-manager.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace DB and API
const newAPI = `const getToken = () => sessionStorage.getItem("ttm_token");

const request = async (endpoint, options = {}) => {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = \`Bearer \${token}\`;
  
  const res = await fetch(\`/api\${endpoint}\`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API request failed");
  return data;
};

const API = {
  signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProjects: () => request('/projects'),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  deleteProject: (id) => request(\`/projects/\${id}\`, { method: 'DELETE' }),
  getTasks: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request(\`/tasks\${query ? \`?\${query}\` : ''}\`);
  },
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, updates) => request(\`/tasks/\${id}\`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteTask: (id) => request(\`/tasks/\${id}\`, { method: 'DELETE' }),
  getUsers: () => request('/users'),
};`;

content = content.replace(/\/\/ ─── DB \/ Storage Layer[\s\S]*?getUsers: \(\) => \(DB\.get\("ttm_users"\) \|\| \[\]\)\.map\(u => \{ const safe = \{ \.\.\.u \}; delete safe\.password; return safe; \}\),\n\};/g, newAPI);

// Replace Auth submit
const oldSubmit = `  const submit = () => {
    setError(""); setLoading(true);
    setTimeout(() => {
      const res = mode === "login" ? API.login(form) : API.signup(form);
      setLoading(false);
      if (res.error) { setError(res.error); return; }
      onLogin(res.user);
    }, 400);
  };`;
const newSubmit = `  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const res = mode === "login" ? await API.login(form) : await API.signup(form);
      setLoading(false);
      onLogin(res.user, res.token);
    } catch (e) {
      setLoading(false);
      setError(e.message);
    }
  };`;
content = content.replace(oldSubmit, newSubmit);

// Replace App functions
const oldAppFunctions = `  const reload = useCallback(() => {
    setProjects(API.getProjects());
    setTasks(API.getTasks());
    setUsers(API.getUsers());
  }, []);

  useEffect(() => {
    initDB();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (u) => { sessionStorage.setItem("ttm_session", JSON.stringify(u)); setUser(u); setPage("dashboard"); };
  const logout = () => { sessionStorage.removeItem("ttm_session"); setUser(null); };

  if (!user) return <AuthScreen onLogin={login} />;

  // Stats
  const myTasks = isAdmin ? tasks : tasks.filter(t => t.assignedTo === user.id);
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

  const createProject = () => {
    if (!newProject.name.trim()) return;
    const res = API.createProject({ ...newProject, userId: user.id });
    if (!res.error) { reload(); setNewProject({ name: "", description: "", color: "#6366f1" }); setModal(null); }
  };

  const deleteProject = (id) => { if (confirm("Delete project and all its tasks?")) { API.deleteProject(id); reload(); } };
  const updateTask = (id, updates) => { API.updateTask(id, updates); reload(); };
  const deleteTask = (id) => { if (confirm("Delete this task?")) { API.deleteTask(id); reload(); } };`;

const newAppFunctions = `  const reload = useCallback(async () => {
    try {
      const [p, t, u] = await Promise.all([API.getProjects(), API.getTasks(), API.getUsers()]);
      setProjects(p); setTasks(t); setUsers(u);
    } catch (e) {
      if (e.message.includes("Unauthorized")) logout();
    }
  }, []);

  useEffect(() => {
    if (user) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const login = (u, token) => { 
    sessionStorage.setItem("ttm_session", JSON.stringify(u)); 
    sessionStorage.setItem("ttm_token", token);
    setUser(u); setPage("dashboard"); 
  };
  const logout = () => { 
    sessionStorage.removeItem("ttm_session"); 
    sessionStorage.removeItem("ttm_token"); 
    setUser(null); 
  };

  if (!user) return <AuthScreen onLogin={login} />;

  // Stats
  const myTasks = isAdmin ? tasks : tasks.filter(t => t.assignedTo === user.id);
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
      await API.createProject({ ...newProject, userId: user.id });
      reload(); setNewProject({ name: "", description: "", color: "#6366f1" }); setModal(null);
    } catch (e) { alert(e.message); }
  };

  const deleteProject = async (id) => { if (confirm("Delete project and all its tasks?")) { await API.deleteProject(id); reload(); } };
  const updateTask = async (id, updates) => { await API.updateTask(id, updates); reload(); };
  const deleteTask = async (id) => { if (confirm("Delete this task?")) { await API.deleteTask(id); reload(); } };`;

content = content.replace(oldAppFunctions, newAppFunctions);

fs.writeFileSync(file, content);
console.log("Replaced successfully!");
