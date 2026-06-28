
function App() {
  const [machines, setMachines] = useState(null);
  const [archivedMachines, setArchivedMachines] = useState([]);
  const [users, setUsers] = useState(USERS);
  useEffect(() => {
    carregarUsersFirebase().then(fbUsers => {
      if (fbUsers && fbUsers.length > 0) setUsers(fbUsers);
      else {
        try {
          const r = localStorage.getItem("canaleta_users");
          if (r) setUsers(JSON.parse(r));
        } catch (e) {}
      }
    });
    carregarArchivedFirebase().then(arq => {
      if (arq && arq.length > 0) setArchivedMachines(arq);
    });
  }, []);
  useEffect(() => {
    if (archivedMachines.length > 0) salvarArchivedFirebase(archivedMachines);
  }, [archivedMachines]);
  const [screen, setScreen] = useState("tabs");
  const [activeTab, setActiveTab] = useState(3);
  const [detailId, setDetailId] = useState(null);
  const [histTarget, setHistTarget] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [operadorFinished, setOperadorFinished] = useState([]);
  const [loginLog, setLoginLog] = useState(() => {
    try {
      const r = localStorage.getItem("canaleta_loginlog");
      return r ? JSON.parse(r) : [];
    } catch (e) {
      return [];
    }
  });
  const screenRef = useRef("tabs");
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  useEffect(() => {
    window.history.pushState({ canaleta: 1 }, "");
    window.history.pushState({ canaleta: 2 }, "");
    window.history.go(-1);
    function handlePopState() {
      window.history.pushState({ canaleta: 1 }, "");
      const s = screenRef.current;
      if (s === "tabs") {
        return;
      }
      setDetailId(null);
      setHistTarget(null);
      setActiveTab(3);
      setScreen("tabs");
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    Promise.all([persistLoad(), loadAuth()]).then(([saved, auth]) => {
      const ms = saved || JSON.parse(JSON.stringify(INIT_MACHINES));
      setMachines(ms);
      if (auth) {
        setSession(auth);
        setActiveTab(3);
      }
      setAuthLoading(false);
      // Inscreve para receber atualizações em tempo real do Firebase
      const unsubscribe = subscribeFirebase((updated) => {
        setMachines((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(updated)) {
            return updated;
          }
          return prev;
        });
      });
      window._fbUnsubscribe = unsubscribe;
    });
    return () => { if (window._fbUnsubscribe) window._fbUnsubscribe(); };
  }, []);
  const isDemoRef = useRef(false);
  useEffect(() => {
    if (machines !== null && !isDemoRef.current) {
      persistSave(machines);
    }
  }, [machines]);
  function handleLogin(user, remember) {
    setSession(user);
    if (remember && !user.isDemo) saveAuth(user);
    if (user.isDemo) {
      try {
        const realData = localStorage.getItem(STORAGE_KEY);
        if (realData) localStorage.setItem(STORAGE_KEY + "_backup", realData);
      } catch (e) {
      }
      isDemoRef.current = true;
      setMachines(JSON.parse(JSON.stringify(DEMO_MACHINES)));
      setScreen("tabs");
      return;
    }
    const entry = { user: user.user, time: (/* @__PURE__ */ new Date()).toLocaleString("pt-BR") };
    const updated = [...loginLog.filter((l) => l.user !== user.user), entry];
    setLoginLog(updated);
    try {
      localStorage.setItem("canaleta_loginlog", JSON.stringify(updated));
    } catch (e) {
    }
    setActiveTab(3);
    setScreen("tabs");
  }
  function handleLogout() {
    const wasDemo = session == null ? void 0 : session.isDemo;
    setSession(null);
    if (!wasDemo) {
      clearAuth();
      return;
    }
    isDemoRef.current = false;
    try {
      const backup = localStorage.getItem(STORAGE_KEY + "_backup");
      if (backup) {
        const real = JSON.parse(backup);
        localStorage.setItem(STORAGE_KEY, backup);
        localStorage.removeItem(STORAGE_KEY + "_backup");
        setMachines(real);
        return;
      }
    } catch (e) {
    }
    persistLoad().then((saved) => {
      setMachines(saved || JSON.parse(JSON.stringify(INIT_MACHINES)));
    });
  }
  function changePassword(username, newPass) {
    const updated = users.map((u) => u.user === username ? __spreadProps(__spreadValues({}, u), { pass: newPass }) : u);
    setUsers(updated);
    try {
      localStorage.setItem("canaleta_users", JSON.stringify(updated));
    } catch (e) {}
    salvarUsersFirebase(updated);
    try {
      const rem = localStorage.getItem("canaleta_remember");
      if (rem) {
        const r = JSON.parse(rem);
        if (r.user === username) localStorage.setItem("canaleta_remember", JSON.stringify(__spreadProps(__spreadValues({}, r), { pass: newPass })));
      }
    } catch (e) {}
  }
  function addUser(newUser) {
    const updated = [...users, newUser];
    setUsers(updated);
    try {
      localStorage.setItem("canaleta_users", JSON.stringify(updated));
    } catch (e) {}
    salvarUsersFirebase(updated);
  }
  function changeRole(username, newRole) {
    const updated = users.map((u) => u.user === username ? __spreadProps(__spreadValues({}, u), { role: newRole }) : u);
    setUsers(updated);
    try { localStorage.setItem("canaleta_users", JSON.stringify(updated)); } catch (e) {}
    salvarUsersFirebase(updated);
  }
  function deleteUser(username) {
    const updated = users.filter((u) => u.user !== username);
    setUsers(updated);
    try { localStorage.setItem("canaleta_users", JSON.stringify(updated)); } catch (e) {}
    salvarUsersFirebase(updated);
  }
  function updateMachine(updated) {
    setMachines((ms) => ms.map((m) => m.id === updated.id ? updated : m));
  }
  function addMachine() {
    const nm = { id: uid(), name: "Nova M\xE1quina", model: "\u2014", status: "idle", operator: "\u2014", job: null, metrics: { temperature: 0, speed: 0, rpmExtrusora: 0, rpmPuxador: 0, amperagem: 0, tempZones: [] }, maintenanceNote: "", history: [] };
    setMachines((ms) => [...ms, nm]);
    setDetailId(nm.id);
    setScreen("detail");
  }
  function deleteMachine(id) {
    setMachines((ms) => {
      const target = ms.find((m) => m.id === id);
      if (target && (target.history || []).length > 0) {
        setArchivedMachines((arq) => [...arq, __spreadProps(__spreadValues({}, target), { archivedAt: Date.now() })]);
      }
      const updated = ms.filter((m) => m.id !== id);
      return updated;
    });
  }
  function exportData() {
    const data = JSON.stringify(machines, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "canaleta-dados-" + (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR").replace(/\//g, "-") + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function importData() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json,application/json";
    inp.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!Array.isArray(parsed)) {
            alert("Arquivo inv\xE1lido \u2014 deve ser uma lista de m\xE1quinas.");
            return;
          }
          if (window.confirm("Isso VAI SUBSTITUIR todos os dados atuais pelos do arquivo.\n\nTem certeza?")) {
            setMachines(parsed);
          }
        } catch (err) {
          alert("Erro ao ler o arquivo: " + err.message);
        }
      };
      reader.readAsText(file);
    };
    document.body.appendChild(inp);
    inp.click();
    document.body.removeChild(inp);
  }
  if (authLoading || machines === null) {
    return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, fontWeight: 900, color: "#e0e8ff", fontFamily: "monospace", letterSpacing: "-.02em", textShadow: "0 0 40px #4a8aff33" } }, "CANALETA"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#3a5a7a", fontFamily: "monospace" } }, "Carregando..."));
  }
  if (!session) {
    return /* @__PURE__ */ React.createElement(LoginScreen, { users, onLogin: handleLogin });
  }
  if ((session == null ? void 0 : session.role) === "operador" && operadorFinished.length > 0) {
    const runningMachines = machines.filter((m) => m.status === "running");
    const allDone = runningMachines.length > 0 && runningMachines.every((m) => operadorFinished.includes(m.id));
    if (allDone) {
      const turnoNow = (/* @__PURE__ */ new Date()).getHours() >= 5 && (/* @__PURE__ */ new Date()).getHours() < 17 ? "A" : "B";
      return /* @__PURE__ */ React.createElement(
        ShiftSummaryScreen,
        {
          machines,
          session,
          turno: turnoNow,
          closeLabel: "Sair",
          onClose: () => {
            setOperadorFinished([]);
            handleLogout();
          }
        }
      );
    }
  }
  if (((session == null ? void 0 : session.role) === "encarregado" || (session == null ? void 0 : session.role) === "admin") && screen === "shift_summary") {
    const turnoNow = (/* @__PURE__ */ new Date()).getHours() >= 5 && (/* @__PURE__ */ new Date()).getHours() < 17 ? "A" : "B";
    return /* @__PURE__ */ React.createElement(
      ShiftSummaryScreen,
      {
        machines,
        session,
        turno: turnoNow,
        closeLabel: "Entrar no painel",
        onClose: () => setScreen("tabs"),
        onOpenDetail: (id) => { setDetailId(id); setScreen("detail"); },
        onUpdateMachine: session.isDemo ? null : updateMachine
      }
    );
  }
  if (screen === "history_new") {
    return /* @__PURE__ */ React.createElement(
      HistoryScreenNew,
      {
        machines,
        archivedMachines,
        onBack: () => setScreen("tabs")
      }
    );
  }
  if (screen === "reports") {
    return /* @__PURE__ */ React.createElement(
      ReportsScreen,
      {
        machines,
        onBack: () => setScreen("tabs")
      }
    );
  }
  if (screen === "settings") {
    return /* @__PURE__ */ React.createElement(
      SettingsScreen,
      {
        session,
        users,
        onChangePass: session.isDemo ? null : changePassword,
        onAddUser: session.isDemo ? null : addUser,
        onChangeRole: session.isDemo ? null : session.role === "admin" ? changeRole : null,
        onDeleteUser: session.isDemo ? null : session.role === "admin" ? deleteUser : null,
        users: session.isDemo ? [] : users,
        onBack: () => setScreen("tabs"),
        loginLog,
        onExport: exportData,
        onImport: importData
      }
    );
  }
  function deleteHistoryRecord(rec) {
    setMachines((ms) => ms.map((m) => {
      const idx = (m.history || []).findIndex((h) => h.date === rec.date && h.maquina === rec.maquina && h.produto === rec.produto);
      if (idx === -1) return m;
      const nh = [...m.history];
      nh.splice(idx, 1);
      return __spreadProps(__spreadValues({}, m), { history: nh });
    }));
  }
  function updateHistoryRecord(oldRec, newData) {
    setMachines((ms) => ms.map((m) => {
      const idx = (m.history || []).findIndex((h) => h.date === oldRec.date && h.maquina === oldRec.maquina && h.produto === oldRec.produto);
      if (idx === -1) return m;
      const nh = [...m.history];
      nh[idx] = __spreadValues(__spreadValues({}, nh[idx]), newData);
      return __spreadProps(__spreadValues({}, m), { history: nh });
    }));
  }
  const currentMachine = detailId ? machines.find((m) => m.id === detailId) : null;
  const histMachine = (histTarget == null ? void 0 : histTarget.id) ? machines.find((m) => m.id === histTarget.id) : null;
  if (screen === "detail" && currentMachine) {
    return /* @__PURE__ */ React.createElement(
      Detail,
      {
        machine: currentMachine,
        machines,
        users,
        session,
        onBack: () => {
          setDetailId(null);
          setScreen("tabs");
        },
        onUpdate: session.isDemo ? () => {} : updateMachine,
        onFinalize: session.isDemo ? () => { alert("Modo demonstração — nenhuma alteração é salva."); } : () => {
          setDetailId(null);
          setScreen("tabs");
          if ((session == null ? void 0 : session.role) === "operador") {
            setOperadorFinished((f) => [...f, currentMachine.id]);
          }
        },
        returnToTab: activeTab
      }
    );
  }
  if (screen === "history") {
    return /* @__PURE__ */ React.createElement(
      HistoryScreen,
      {
        machines,
        singleMachine: histMachine || null,
        summaryMode: (histTarget == null ? void 0 : histTarget.summaryMode) || false,
        onBack: () => {
          if ((histTarget == null ? void 0 : histTarget.fromTab) != null) setActiveTab(histTarget.fromTab);
          setScreen("tabs");
          setHistTarget(null);
        },
        onDeleteRecord: (session.isDemo || !canDo(session, "delete")) ? null : deleteHistoryRecord,
        onUpdateRecord: (session.isDemo || !canDo(session, "delete")) ? null : updateHistoryRecord
      }
    );
  }
  return /* @__PURE__ */ React.createElement(
    TabShell,
    {
      session,
      onLogout: handleLogout,
      onSettings: () => setScreen("settings"),
      onReports: () => setScreen("reports"),
      machines,
      archivedMachines,
      activeTab,
      onTabChange: setActiveTab,
      onOpenDetail: (id) => {
        setDetailId(id);
        setScreen("detail");
      },
      onAddMachine: session.isDemo ? null : addMachine,
      onDeleteMachine: session.isDemo ? null : deleteMachine,
      onOpenHistory: (m) => {
        setHistTarget({ id: m.id, summaryMode: false, fromTab: activeTab });
        setScreen("history");
      },
      onOpenMachineHistory: (m) => {
        setHistTarget({ id: m.id, summaryMode: false, fromTab: activeTab });
        setScreen("history");
      },
      filterStatus,
      setFilterStatus,
      onExport: exportData,
      onImport: importData,
      onUpdateMachine: updateMachine
    }
  );
}

const _r=ReactDOM.createRoot(document.getElementById("root"));_r.render(React.createElement(App));setTimeout(()=>{const s=document.getElementById("splash");if(s){s.classList.add("out");setTimeout(()=>s.remove(),600);}},1600);