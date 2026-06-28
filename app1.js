const{useState,useEffect,useRef,useCallback}=React;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const APP_VERSION = "v1.0.0";
const APP_DEV = "Fabr\xEDcio Ferreira";
const STORAGE_KEY = "canaleta_machines_v1";

async function salvarArchivedFirebase(archived) {
  try {
    localStorage.setItem("canaleta_archived", JSON.stringify(archived));
  } catch (e) {}
  try {
    if (window._fbReady && window._fbDb) {
      await window._fbDb.collection("canaleta").doc("archived").set({
        data: JSON.stringify(archived),
        updatedAt: Date.now()
      });
    }
  } catch (e) {
    console.warn("Firebase archived save error:", e);
  }
}
async function carregarArchivedFirebase() {
  try {
    if (window._fbReady && window._fbDb) {
      const snap = await window._fbDb.collection("canaleta").doc("archived").get();
      if (snap.exists) {
        const parsed = JSON.parse(snap.data().data);
        localStorage.setItem("canaleta_archived", JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Firebase archived load error:", e);
  }
  try {
    const r = localStorage.getItem("canaleta_archived");
    if (r) return JSON.parse(r);
  } catch (e) {}
  return [];
}
async function salvarUsersFirebase(users) {
  try {
    if (window._fbReady && window._fbDb) {
      await window._fbDb.collection("canaleta").doc("users").set({
        data: JSON.stringify(users),
        updatedAt: Date.now()
      });
    }
  } catch (e) {
    console.warn("Firebase users save error:", e);
  }
}
async function carregarUsersFirebase() {
  try {
    if (window._fbReady && window._fbDb) {
      const snap = await window._fbDb.collection("canaleta").doc("users").get();
      if (snap.exists) {
        const parsed = JSON.parse(snap.data().data);
        localStorage.setItem("canaleta_users", JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Firebase users load error:", e);
  }
  try {
    const r = localStorage.getItem("canaleta_users");
    if (r) return JSON.parse(r);
  } catch (e) {}
  return null;
}
async function salvarRegistroFirebase(machineId, machineName, rec) {
  try {
    if (window._fbReady && window._fbDb) {
      const id = machineId + "_" + Date.now();
      await window._fbDb.collection("turnos").doc(id).set({
        machineId,
        machineName,
        ...rec,
        _savedAt: Date.now()
      });
    }
  } catch (e) {
    console.warn("Firebase registro error:", e);
  }
}

async function carregarHistoricoFirebase(machines) {
  try {
    if (!window._fbReady || !window._fbDb) return machines;
    const snap = await window._fbDb.collection("turnos").get();
    if (snap.empty) return machines;
    const registros = [];
    snap.forEach(doc => registros.push({ id: doc.id, ...doc.data() }));
    // Agrupa por machineId e injeta no history de cada máquina
    const result = machines.map(m => {
      const mRecs = registros
        .filter(r => r.machineId === m.id)
        .map(r => {
          const { machineId, machineName, _savedAt, id, ...rec } = r;
          return rec;
        })
        .sort((a, b) => {
          const pa = (a.date || "").split(", ");
          const pb = (b.date || "").split(", ");
          return (pa[0] + pa[1]) > (pb[0] + pb[1]) ? 1 : -1;
        });
      // Mescla com history local sem duplicar por date+turno
      const existingKeys = new Set((m.history || []).map(h => h.date + h.turno + h.maquina));
      const novos = mRecs.filter(r => !existingKeys.has(r.date + r.turno + r.maquina));
      return { ...m, history: [...(m.history || []), ...novos] };
    });
    return result;
  } catch (e) {
    console.warn("Firebase carregar historico error:", e);
    return machines;
  }
}

async function persistSave(machines) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
  } catch (e) {}
  try {
    if (window._fbReady && window._fbDb) {
      await window._fbDb.collection("canaleta").doc("machines").set({
        data: JSON.stringify(machines),
        updatedAt: Date.now()
      });
    }
  } catch (e) {
    console.warn("Firebase save error:", e);
  }
}
async function persistLoad() {
  try {
    if (window._fbReady && window._fbDb) {
      const snap = await window._fbDb.collection("canaleta").doc("machines").get();
      if (snap.exists) {
        const parsed = JSON.parse(snap.data().data);
        // Mescla com histórico individual salvo no Firebase
        const comHistorico = await carregarHistoricoFirebase(parsed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(comHistorico));
        return comHistorico;
      }
    }
  } catch (e) {
    console.warn("Firebase load error:", e);
  }
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch (e) {}
  return null;
}
function subscribeFirebase(onUpdate) {
  if (!window._fbReady || !window._fbDb) return () => {};
  try {
    return window._fbDb.collection("canaleta").doc("machines").onSnapshot((snap) => {
      if (snap.exists) {
        try {
          const parsed = JSON.parse(snap.data().data);
          carregarHistoricoFirebase(parsed).then(comHistorico => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(comHistorico));
            onUpdate(comHistorico);
          });
        } catch (e) {}
      }
    });
  } catch (e) {
    return () => {};
  }
}
const AUTH_KEY = "canaleta_auth_v1";
const USERS = [
  { user: "admin", pass: "1234", name: "Administrador", role: "admin" },
  { user: "encarregado", pass: "5678", name: "Encarregado", role: "encarregado" },
  { user: "operador", pass: "0000", name: "Operador", role: "operador" },
  { user: "fabricio", pass: "1111", name: "Fabr\xEDcio", role: "operador" },
  { user: "leandro", pass: "2222", name: "Leandro", role: "operador" },
  { user: "felipe", pass: "3333", name: "Felipe", role: "operador" },
  { user: "chico", pass: "4444", name: "Chico", role: "operador" },
  { user: "luis", pass: "5555", name: "Luis", role: "operador" },
  { user: "cleiton", pass: "6666", name: "Cleiton", role: "operador" },
  { user: "juliano", pass: "7777", name: "Juliano", role: "operador" },
  { user: "demo", pass: "demo", name: "Demonstra\xE7\xE3o", role: "admin", isDemo: true }
];
function canDo(session, action) {
  if (session == null ? void 0 : session.isDemo) return true;
  const role = (session == null ? void 0 : session.role) || "operador";
  switch (action) {
    case "view_dashboard":
      return role === "admin" || role === "encarregado";
    case "view_history_tab":
      return role === "admin" || role === "encarregado";
    case "open_history":
      return role === "admin" || role === "encarregado";
    case "delete":
      return role === "admin";
    case "create_machine":
      return role === "admin" || role === "encarregado";
    case "edit":
      return true;
    // todos podem editar
    case "finalize":
      return true;
    // todos podem finalizar
    default:
      return role === "admin";
  }
}
async function saveAuth(s) {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(s));
  } catch (e) {
  }
}
async function loadAuth() {
  try {
    const r = localStorage.getItem(AUTH_KEY);
    if (r) return JSON.parse(r);
  } catch (e) {
  }
  return null;
}
async function clearAuth() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (e) {
  }
}
const TEST_DAYS = {};
function LoginScreen({ onLogin, users: propUsers, onExport, onImport }) {
  const users = propUsers || USERS;
  const saved = (() => {
    try {
      const r = localStorage.getItem("canaleta_remember");
      return r ? JSON.parse(r) : null;
    } catch (e) {
      return null;
    }
  })();
  const [user, setUser] = useState((saved == null ? void 0 : saved.user) || "");
  const [pass, setPass] = useState((saved == null ? void 0 : saved.pass) || "");
  const [remember, setRemember] = useState(!!saved);
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const clock = useClock();
  function doLogin() {
    setErr("");
    setLoading(true);
    setTimeout(() => {
      const found = users.find((u) => u.user === user.trim().toLowerCase() && u.pass === pass);
      if (found) {
        if (remember) {
          try {
            localStorage.setItem("canaleta_remember", JSON.stringify({ user: user.trim().toLowerCase(), pass }));
          } catch (e) {
          }
        } else {
          try {
            localStorage.removeItem("canaleta_remember");
          } catch (e) {
          }
        }
        onLogin(found);
      } else {
        setErr("Usu\xE1rio ou senha incorretos.");
        setLoading(false);
      }
    }, 500);
  }
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "monospace" } }, /* @__PURE__ */ React.createElement("style", null, "@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} input:focus{outline:none;border-color:#4a8aff!important;}"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 36, animation: "fadeUp .5s ease" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 50, fontWeight: 900, color: "#e0e8ff", letterSpacing: "-.02em", textShadow: "0 0 60px #4a8aff33", lineHeight: 1 } }, "CANALETA"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#2a4a6a", letterSpacing: ".2em", textTransform: "uppercase", marginTop: 6 } }, "Monitoramento Industrial"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 26, fontWeight: 700, color: "#3a5a7a", fontVariantNumeric: "tabular-nums", marginTop: 10, letterSpacing: ".04em" } }, pad(clock.getHours()), /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.4, animation: "blink 1s infinite" } }, ":"), pad(clock.getMinutes()), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15, color: "#2a3a5a", marginLeft: 4 } }, ":", pad(clock.getSeconds()))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#2a3a5a", marginTop: 4, textTransform: "capitalize" } }, (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }))), /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 340, background: "#0d1117", border: "1px solid #1e2636", borderRadius: 16, padding: 26, animation: "fadeUp .6s ease" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 20, textAlign: "center" } }, "Acesso ao sistema"), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Usu\xE1rio"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: user,
      onChange: (e) => setUser(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && doLogin(),
      placeholder: "seu usu\xE1rio",
      autoCapitalize: "none",
      style: { width: "100%", background: "#111622", border: "1px solid #1e2636", color: "#e0e8ff", borderRadius: 8, padding: "11px 14px", fontSize: 14, fontFamily: "monospace", boxSizing: "border-box" }
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 18 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Senha"), /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: showPass ? "text" : "password",
      value: pass,
      onChange: (e) => setPass(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && doLogin(),
      placeholder: "\u2022\u2022\u2022\u2022",
      style: { width: "100%", background: "#111622", border: "1px solid #1e2636", color: "#e0e8ff", borderRadius: 8, padding: "11px 44px 11px 14px", fontSize: 14, fontFamily: "monospace", boxSizing: "border-box" }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onMouseDown: (e) => {
        e.preventDefault();
        setShowPass((v) => !v);
      },
      style: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: showPass ? "#4a8aff" : "#3a5a7a", padding: "0 2px" },
      title: showPass ? "Ocultar senha" : "Mostrar senha"
    },
    /* @__PURE__ */ React.createElement(EyeIcon, { open: showPass })
  ))), err && /* @__PURE__ */ React.createElement("div", { style: { background: "#ff4d6d12", border: "1px solid #ff4d6d44", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff8099", marginBottom: 14, textAlign: "center" } }, err), /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => setRemember((r) => !r),
      style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer", userSelect: "none" }
    },
    /* @__PURE__ */ React.createElement("div", { style: {
      width: 20,
      height: 20,
      borderRadius: 5,
      flexShrink: 0,
      background: remember ? "#4a8aff" : "#111622",
      border: "2px solid " + (remember ? "#4a8aff" : "#2a3450"),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all .15s"
    } }, remember && /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontSize: 13, lineHeight: 1 } }, "\u2713")),
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: remember ? "#7ab8ff" : "#4a5a7a" } }, "Manter sess\xE3o salva")
  ), /* @__PURE__ */ React.createElement("button", { onClick: doLogin, disabled: loading, style: { width: "100%", background: loading ? "#1a2636" : "linear-gradient(135deg,#1a3a6a,#2a5aaa)", border: "1px solid #4a8aff44", color: loading ? "#3a5a7a" : "#e0f0ff", borderRadius: 10, padding: "13px 0", cursor: loading ? "default" : "pointer", fontSize: 14, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" } }, loading ? "Verificando..." : "Entrar \u2192")), /* @__PURE__ */ React.createElement("div", { onClick: () => { if (window._dp) { window._dp.prompt(); window._dp = null; } else { const ibar = document.getElementById("ibar"); if (ibar) ibar.style.display = "flex"; } }, style: { marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#0a1a0f", border: "1px solid #00e5a033", borderRadius: 10, padding: "11px 16px", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 18 } }, "\uD83D\uDCF2"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#00e5a0", fontFamily: "monospace" } }, "Instalar Canaleta"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a6a4a", fontFamily: "monospace" } }, "Adicionar \xE0 tela inicial")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, color: "#00e5a0", marginLeft: "auto" } }, "\u2193")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#3a5a7a", fontFamily: "monospace" } }, "Desenvolvido por ", /* @__PURE__ */ React.createElement("span", { style: { color: "#4a8aff" } }, APP_DEV)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#2a4a6a", marginTop: 3, fontFamily: "monospace" } }, APP_VERSION)));
}
function ProductionDashboard({ session, machines, onGoPanel, onLogout, onSettings, hideHeader }) {
  const clock = useClock();
  const [compModal, setCompModal] = useState(null);
  const buildDaysFromHistory = () => {
    const dayMap2 = {};
    (machines || []).forEach((m) => {
      (m.history || []).forEach((rec) => {
        var _a, _b;
        let datePart = (_b = (_a = rec.date) == null ? void 0 : _a.split(",")[0]) == null ? void 0 : _b.trim();
        if (!datePart) return;
        const turno = rec.turno || "A";
        if (!dayMap2[datePart]) dayMap2[datePart] = { A: [], B: [] };
        const existing = dayMap2[datePart][turno].find((r) => r.line === m.name && r.product === rec.produto);
        if (existing) {
          // Usa o registro mais recente (mesma máquina/turno/dia/produto = atualização, não soma)
          const recTime = (rec.date || "").split(", ")[1] || "";
          const existTime = (existing._rec && existing._rec.date || "").split(", ")[1] || "";
          if (recTime >= existTime) {
            existing.produced = rec.producaoReal || 0;
            existing.target = rec.ciclosPeriodo || 0;
            existing._rec = rec;
          }
        } else {
          dayMap2[datePart][turno].push({
            line: m.name,
            product: rec.produto || "\u2014",
            produced: rec.producaoReal || 0,
            target: rec.ciclosPeriodo || 0,
            _rec: rec
            // keep full record for observation
          });
        }
      });
    });
    return dayMap2;
  };
  const dayMap = buildDaysFromHistory();
  const days = Object.keys(dayMap).sort((a, b) => {
    const p = (d) => {
      const x = d.split("/");
      return new Date(+x[2], +x[1] - 1, +x[0]);
    };
    return p(b) - p(a);
  });
  const [selDay, setSelDay] = useState(days[0] || "");
  const [showProdCal, setShowProdCal] = useState(false);
  const [prodCalYear, setProdCalYear] = useState(() => new Date().getFullYear());
  const [prodCalMonth, setProdCalMonth] = useState(() => new Date().getMonth());
  const dd = dayMap[selDay] || { A: [], B: [] };
  const MESES_PROD = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const DSEM_PROD = ["D","S","T","Q","Q","S","S"];
  function renderProdCalModal() {
    const firstDay = new Date(prodCalYear, prodCalMonth, 1).getDay();
    const daysInMonth = new Date(prodCalYear, prodCalMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const todayObj = new Date();
    return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000b", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, onClick: () => setShowProdCal(false) },
      /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1525", border: "1px solid #2a3a50", borderRadius: 18, padding: "20px 16px", width: "100%", maxWidth: 340 }, onClick: (e) => e.stopPropagation() },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } },
          /* @__PURE__ */ React.createElement("button", { onClick: () => { if (prodCalMonth === 0) { setProdCalMonth(11); setProdCalYear(y => y-1); } else setProdCalMonth(m => m-1); }, style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14, fontFamily: "monospace" } }, "\u2039"),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff", fontFamily: "monospace", textTransform: "capitalize" } }, MESES_PROD[prodCalMonth], " De ", prodCalYear),
          /* @__PURE__ */ React.createElement("button", { onClick: () => { if (prodCalMonth === 11) { setProdCalMonth(0); setProdCalYear(y => y+1); } else setProdCalMonth(m => m+1); }, style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14, fontFamily: "monospace" } }, "\u203A")
        ),
        /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 } },
          DSEM_PROD.map((d, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { textAlign: "center", fontSize: 10, color: "#4a5a7a", fontFamily: "monospace", padding: "2px 0" } }, d))
        ),
        /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 } },
          cells.map((d, i) => {
            if (!d) return /* @__PURE__ */ React.createElement("div", { key: "e"+i });
            const dateStr = String(d).padStart(2,"0") + "/" + String(prodCalMonth+1).padStart(2,"0") + "/" + prodCalYear;
            const isToday = d === todayObj.getDate() && prodCalMonth === todayObj.getMonth() && prodCalYear === todayObj.getFullYear();
            const isSel = selDay === dateStr;
            const hasData = !!dayMap[dateStr];
            return /* @__PURE__ */ React.createElement("button", { key: d, onClick: () => { setSelDay(dateStr); setShowProdCal(false); }, style: { background: isSel ? "#4a8aff" : isToday ? "#1a3060" : "transparent", border: "1px solid " + (isSel ? "#4a8aff" : isToday ? "#4a8aff66" : hasData ? "#2a4a6a44" : "transparent"), color: isSel ? "#fff" : isToday ? "#7ab8ff" : hasData ? "#c8d8f0" : "#3a4a5a", borderRadius: 8, padding: "8px 0", cursor: hasData || isToday ? "pointer" : "default", fontSize: 13, fontFamily: "monospace", fontWeight: isSel || isToday ? 700 : hasData ? 600 : 400 } },
              /* @__PURE__ */ React.createElement("div", { style: { display:"flex", flexDirection:"column", alignItems:"center", gap:2 } },
                d,
                hasData ? /* @__PURE__ */ React.createElement("div", { style: { width:5, height:5, borderRadius:"50%", background: isSel ? "#fff" : "#4a8aff", opacity: isSel ? 0.9 : 0.7 } }) : null
              )
            );
          })
        ),
        /* @__PURE__ */ React.createElement("button", { onClick: () => setShowProdCal(false), style: { marginTop: 16, width: "100%", background: "#111622", border: "1px solid #1e2636", color: "#5a6a8a", borderRadius: 10, padding: "11px 0", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "Fechar")
      )
    );
  }
  const lines = [...new Set([...dd.A, ...dd.B].map((r) => r.line))];
  function MiniBar({ value, target, color }) {
    const pct = Math.min(100, Math.round(value / (target || 1) * 100));
    const ok = pct >= 100;
    return /* @__PURE__ */ React.createElement("div", { style: { width: "100%", background: "#1a1f2e", borderRadius: 3, height: 5, marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { width: pct + "%", height: "100%", background: ok ? "#00e5a0" : color, borderRadius: 3, transition: "width .5s" } }));
  }
  function ComparisonModal({ data, onClose }) {
    var _a, _b, _c, _d, _e, _f;
    const { line, product, rA, rB } = data;
    const pA = (_a = rA == null ? void 0 : rA.produced) != null ? _a : 0;
    const pB = (_b = rB == null ? void 0 : rB.produced) != null ? _b : 0;
    const tgt = Math.max((rA == null ? void 0 : rA.target) || 0, (rB == null ? void 0 : rB.target) || 0);
    const winner = pA > pB ? "A" : pB > pA ? "B" : null;
    const diff = Math.abs(pA - pB);
    const obsA = ((_c = rA == null ? void 0 : rA._rec) == null ? void 0 : _c.observacao) || "";
    const obsB = ((_d = rB == null ? void 0 : rB._rec) == null ? void 0 : _d.observacao) || "";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        style: { position: "fixed", inset: 0, background: "#000d", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
        onClick: onClose
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: { background: "#0a0e18", border: "1px solid #1e2a3a", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", padding: "20px 16px 24px" },
          onClick: (e) => e.stopPropagation()
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 } }, "\u{1F3ED} ", line), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "#e0e8ff", lineHeight: 1.3 } }, product), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#3a5a7a", marginTop: 4 } }, selDay)), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { background: "transparent", border: "none", color: "#5a6a8a", cursor: "pointer", fontSize: 20 } }, "\u2715")),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 16 } }, [["A", "#4a8aff", pA, rA], ["B", "#c47aff", pB, rB]].map(([t, c, p, r]) => {
          var _a2;
          return /* @__PURE__ */ React.createElement("div", { key: t, style: { flex: 1, background: "#0d1117", border: "2px solid " + (winner === t ? c + "88" : c + "22"), borderRadius: 12, padding: "14px 12px", textAlign: "center", position: "relative" } }, winner === t && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 8, right: 8, fontSize: 14 } }, "\u{1F3C6}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: c, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 8 } }, "Turno ", t), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums" } }, p.toLocaleString("pt-BR")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a", marginBottom: 10 } }, "p\xE7s produzidas"), tgt > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(MiniBar, { value: p, target: tgt, color: c }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, marginTop: 4, color: p >= tgt ? "#00e5a0" : "#ff4d6d", fontWeight: 700 } }, p >= tgt ? "\u2713 Meta batida" : `\u25BC ${(tgt - p).toLocaleString("pt-BR")} p\xE7s abaixo`)), ((_a2 = r == null ? void 0 : r._rec) == null ? void 0 : _a2.ciclo) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5a7a", marginTop: 6 } }, "Ciclo: ", r._rec.ciclo, "s \xB7 ", r._rec.velocidade, " m/min"));
        })),
        diff > 0 && /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#5a6a8a" } }, "Diferen\xE7a entre turnos"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, fontWeight: 700, color: "#f5a623" } }, diff.toLocaleString("pt-BR"), " p\xE7s")),
        (obsA || obsB) && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, overflow: "hidden", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 14px", background: "#0a0e18", borderBottom: "1px solid #1e2636" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em" } }, "\u{1F4AC} Observa\xE7\xF5es dos operadores")), obsA && /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 14px", borderBottom: obsB ? "1px solid #1a2235" : "none" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a8aff", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: "#4a8aff", display: "inline-block" } }), "Turno A \xB7 ", ((_e = rA == null ? void 0 : rA._rec) == null ? void 0 : _e.operador) || "\u2014"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#c8d8f0", lineHeight: 1.7, fontStyle: "italic" } }, '"', obsA, '"')), obsB && /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 14px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c47aff", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: "#c47aff", display: "inline-block" } }), "Turno B \xB7 ", ((_f = rB == null ? void 0 : rB._rec) == null ? void 0 : _f.operador) || "\u2014"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#c8d8f0", lineHeight: 1.7, fontStyle: "italic" } }, '"', obsB, '"'))),
        !obsA && !obsB && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "12px 0", color: "#2a3a4a", fontSize: 12 } }, "Nenhuma observa\xE7\xE3o registrada neste dia")
      )
    );
  }
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100%", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", paddingBottom: 80 } }, /* @__PURE__ */ React.createElement("style", null, "@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}"), showProdCal && renderProdCalModal(), compModal && /* @__PURE__ */ React.createElement(ComparisonModal, { data: compModal, onClose: () => setCompModal(null) }), !hideHeader && /* @__PURE__ */ React.createElement("div", { style: { position: "sticky", top: 0, zIndex: 40, background: "#070b12", borderBottom: "1px solid #1a2235", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 900, color: "#e0e8ff", lineHeight: 1 } }, "CANALETA"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", marginTop: 2 } }, "\u{1F4CA} Resumo de Produ\xE7\xE3o")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement(LiveClock, null), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 4, justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement("button", { onClick: onGoPanel, style: { background: "#1a2636", border: "1px solid #2a4a6a", color: "#4a8aff", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 9, fontFamily: "monospace" } }, "\u2699 painel"), /* @__PURE__ */ React.createElement("button", { onClick: onLogout, style: { background: "#1a1620", border: "1px solid #3a2040", color: "#7a5a8a", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 9, fontFamily: "monospace" } }, "sair")))), /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 16px 0" } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: onSettings,
      style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer", userSelect: "none" },
      onMouseEnter: (e) => e.currentTarget.style.opacity = ".8",
      onMouseLeave: (e) => e.currentTarget.style.opacity = "1"
    },
    /* @__PURE__ */ React.createElement("div", { style: { width: 34, height: 34, borderRadius: "50%", background: "#1a2636", border: "1px solid #2a4a6a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "#4a8aff", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "8", r: "4" }), /* @__PURE__ */ React.createElement("path", { d: "M4 20c0-4 3.6-7 8-7s8 3 8 7" }))),
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff", lineHeight: 1 } }, session.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#7ab8ff", marginTop: 3, textTransform: "capitalize" } }, session.role)),
    /* @__PURE__ */ React.createElement("div", { style: { marginLeft: "auto", fontSize: 10, color: "#2a4a6a" } }, "\u25B8")
  ), days.length > 0 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff" } }, selDay || "Selecione um dia"), /* @__PURE__ */ React.createElement("button", { onClick: () => { const d = new Date(); setProdCalYear(d.getFullYear()); setProdCalMonth(d.getMonth()); setShowProdCal(true); }, style: { background: "#1a2a3a", border: "1px solid #2a4a6a55", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 13, lineHeight: 1, display: "flex", alignItems: "center", gap: 5 } }, "\uD83D\uDCC5", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#7ab8ff", fontFamily: "monospace" } }, "Escolher dia"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, marginBottom: 14 } }, [["Turno A", "#4a8aff", "05:00\u201317:00"], ["Turno B", "#c47aff", "17:00\u201305:00"]].map(([l, c, t]) => /* @__PURE__ */ React.createElement("div", { key: l, style: { display: "flex", alignItems: "center", gap: 5 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: c } }, l, " \xB7 ", t)))), lines.map((line) => {
    const iA = dd.A.filter((r) => r.line === line);
    const iB = dd.B.filter((r) => r.line === line);
    const products = [...new Set([...iA, ...iB].map((r) => r.product))];
    return /* @__PURE__ */ React.createElement("div", { key: line, style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 14, marginBottom: 12, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0a0e18", padding: "10px 14px", borderBottom: "1px solid #1e2636", display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13 } }, "\u{1F3ED}"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff" } }, line), /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "auto", fontSize: 10, color: "#3a5a7a" } }, selDay)), products.map((product) => {
      var _a, _b, _c, _d;
      const rA = iA.find((r) => r.product === product);
      const rB = iB.find((r) => r.product === product);
      const tgt = Math.max((rA == null ? void 0 : rA.target) || 0, (rB == null ? void 0 : rB.target) || 0);
      const pA = (_a = rA == null ? void 0 : rA.produced) != null ? _a : 0;
      const pB = (_b = rB == null ? void 0 : rB.produced) != null ? _b : 0;
      const hasObs = ((_c = rA == null ? void 0 : rA._rec) == null ? void 0 : _c.observacao) || ((_d = rB == null ? void 0 : rB._rec) == null ? void 0 : _d.observacao);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: product,
          onClick: () => setCompModal({ line, product, rA, rB }),
          style: { padding: "12px 14px", borderBottom: "1px solid #111622", cursor: "pointer", transition: "background .15s" },
          onMouseEnter: (e) => e.currentTarget.style.background = "#111622",
          onMouseLeave: (e) => e.currentTarget.style.background = "transparent"
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#c8d8f0", flex: 1, paddingRight: 8 } }, product), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 } }, hasObs && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, background: "#4a8aff22", border: "1px solid #4a8aff44", color: "#4a8aff", borderRadius: 10, padding: "2px 7px" } }, "\u{1F4AC} obs"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#2a4a6a" } }, "ver \u203A"))),
        rA && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#4a8aff", fontWeight: 700 } }, "Turno A"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, fontWeight: 700, color: "#4a8aff" } }, pA.toLocaleString("pt-BR")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#3a5a7a", marginLeft: 4 } }, "p\xE7s"), tgt > 0 && (pA >= tgt ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#00e5a0", marginLeft: 6 } }, "\u2713") : /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ff4d6d", marginLeft: 6 } }, "\u25BC", (tgt - pA).toLocaleString("pt-BR"))))), /* @__PURE__ */ React.createElement(MiniBar, { value: pA, target: tgt || pA, color: "#4a8aff" })),
        rB && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#c47aff", fontWeight: 700 } }, "Turno B"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, fontWeight: 700, color: "#c47aff" } }, pB.toLocaleString("pt-BR")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#3a5a7a", marginLeft: 4 } }, "p\xE7s"), tgt > 0 && (pB >= tgt ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#00e5a0", marginLeft: 6 } }, "\u2713") : /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ff4d6d", marginLeft: 6 } }, "\u25BC", (tgt - pB).toLocaleString("pt-BR"))))), /* @__PURE__ */ React.createElement(MiniBar, { value: pB, target: tgt || pB, color: "#c47aff" })),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "1px solid #1a2235" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#3a5a7a" } }, "Total A+B"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "#f5a623" } }, (pA + pB).toLocaleString("pt-BR"), " p\xE7s"))
      );
    }));
  }), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "14px 16px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 } }, "Totais \u2014 ", selDay), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, [["Turno A", dd.A.reduce((s, r) => s + r.produced, 0), "#4a8aff"], ["Turno B", dd.B.reduce((s, r) => s + r.produced, 0), "#c47aff"], ["Geral", [...dd.A, ...dd.B].reduce((s, r) => s + r.produced, 0), "#00e5a0"]].map(([l, v, c]) => /* @__PURE__ */ React.createElement("div", { key: l, style: { flex: 1, background: "#111622", borderRadius: 10, padding: "10px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: c, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4, opacity: 0.8 } }, l), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: c } }, v.toLocaleString("pt-BR")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5a7a", marginTop: 2 } }, "p\xE7s")))))) : /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "60px 20px", color: "#2a3a4a" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 16 } }, "\u{1F4CA}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#3a5a7a", marginBottom: 8 } }, "Sem registros ainda"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#2a3a4a" } }, "Os dados aparecem aqui conforme os turnos forem finalizados"))));
}
let _uid = 10;
function uid() {
  return "CAN-" + String(_uid++).padStart(2, "0");
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function useClock() {
  const [d, set] = useState(/* @__PURE__ */ new Date());
  useEffect(() => {
    const t = setInterval(() => set(/* @__PURE__ */ new Date()), 1e3);
    return () => clearInterval(t);
  }, []);
  return d;
}
function calcCycles(s, e, c) {
  const toM = (x) => {
    if (x == null) return null;
    const str = String(x).trim();
    const p = str.split(":");
    if (p.length !== 2) return null;
    const h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };
  const sm = toM(s), em = toM(e);
  const cs = parseFloat(String(c).replace(",", "."));
  if (sm == null || em == null || isNaN(cs) || cs <= 0) return null;
  const durMin = em > sm ? em - sm : em === sm ? 0 : 1440 - sm + em;
  return Math.floor(durMin * 60 / cs);
}
function calcAutoProduced(startTime, cycleTime, piecesPerCycle) {
  const toM = (x) => {
    if (x == null) return null;
    const p = String(x).trim().split(":");
    if (p.length !== 2) return null;
    const h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };
  const sm = toM(startTime);
  const cs = parseFloat(String(cycleTime).replace(",", "."));
  const ppc = Math.max(1, parseInt(piecesPerCycle) || 1);
  if (sm == null || isNaN(cs) || cs <= 0) return null;
  const now = /* @__PURE__ */ new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const elapsed = nowM >= sm ? nowM - sm : 1440 - sm + nowM;
  if (elapsed <= 0) return 0;
  return Math.floor(elapsed * 60 / cs * ppc);
}
function calcWeight(cy, ppc, pw) {
  if (!cy || !ppc || !pw) return null;
  return +(cy * ppc * pw).toFixed(2);
}
function getTurnoFromStart(startTime) {
  if (!startTime) return getTurnoNow();
  const p = startTime.split(":");
  if (p.length !== 2) return getTurnoNow();
  const h = parseInt(p[0]);
  return h >= 5 && h < 17 ? "A" : "B";
}
function getTurnoNow() {
  const h = (/* @__PURE__ */ new Date()).getHours();
  return h >= 5 && h < 17 ? "A" : "B";
}
function getTurno(d) {
  return getTurnoNow();
}
const TA = { label: "Turno A", color: "#4a8aff", bg: "#4a8aff18", time: "05:00\u201317:00" };
const TB = { label: "Turno B", color: "#c47aff", bg: "#c47aff18", time: "17:00\u201305:00" };
function turnoInfo(t) {
  return t === "A" ? TA : TB;
}
const ST = {
  running: { label: "Em opera\xE7\xE3o", color: "#00e5a0", bg: "#00e5a018" },
  idle: { label: "Aguardando", color: "#f5a623", bg: "#f5a62318" },
  maintenance: { label: "Manuten\xE7\xE3o", color: "#ff4d6d", bg: "#ff4d6d18" }
};
const INIT_MACHINES = [{"id": "CAN-01", "name": "EXT 02", "model": "Perfiladeira CAN-500", "status": "running", "operator": "Fabrício", "job": {"orderId": "1.292.285", "product": "Canaleta 50X50X2000mm SEMI ABERTA. (CX 9034)", "produced": 0, "startTime": "17:00", "estimatedEnd": "05:00", "cycleTime": 60, "piecesPerCycle": 1, "pieceWeight": 0.73}, "metrics": {"temperature": 58, "speed": 21.5, "tempZones": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 173}, {"name": "Zona 3", "value": 172}, {"name": "Zona 4", "value": 170}, {"name": "Zona 5", "value": 160}, {"name": "Cabeçote 1", "value": 175}, {"name": "Cabeçote 2", "value": 180}, {"name": "Cabeçote 4", "value": 175}], "rpmExtrusora": 21, "rpmPuxador": 6.2, "amperagem": 81.8}, "maintenanceNote": "", "history": [{"date": "01/06/2026, 20:10", "turno": "A", "_name": "EXT 02", "maquina": "EXT 02", "operador": "Luis", "statusLabel": "Em operação", "produto": "Canaleta 30X30X2000mm BR SEMI ABERTA", "orderId": "1.292.285", "inicio": "05:00", "termino": "17:00", "ciclo": 46, "ciclosPeriodo": 939, "producaoReal": 650, "diferenca": 289, "pesoTotal": 394.38, "perdaKg": 121.38, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 173}, {"name": "Zona 3", "value": 172}, {"name": "Zona 4", "value": 170}, {"name": "Zona 5", "value": 160}, {"name": "Cabeçote 1", "value": 175}, {"name": "Cabeçote 2", "value": 180}, {"name": "Cabeçote 4", "value": 160}], "velocidade": 15.8}, {"date": "08/06/2026, 17:23", "turno": "A", "_name": "EXT 02", "maquina": "EXT 02", "operador": "Luis", "statusLabel": "Em operação", "produto": "Canaleta 50X50X2000mm CZ/ABERTA. (CX 9034)", "orderId": "1.292.285", "inicio": "05:00", "termino": "17:00", "ciclo": 62, "ciclosPeriodo": 696, "producaoReal": 344, "diferenca": 352, "pesoTotal": 256.28, "perdaKg": 262.24, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 173}, {"name": "Zona 3", "value": 172}, {"name": "Zona 4", "value": 170}, {"name": "Zona 5", "value": 160}, {"name": "Cabeçote 1", "value": 175}, {"name": "Cabeçote 2", "value": 180}, {"name": "Cabeçote 4", "value": 175}], "velocidade": 21.5, "observacao": "Acabou a promoção início do turno as 17:23"}, {"date": "08/06/2026, 17:25", "turno": "B", "_name": "EXT 02", "maquina": "EXT 02", "operador": "Fabrício", "statusLabel": "Em operação", "produto": "Canaleta 50X50X2000mm CZ/ABERTA. (CX 9034)", "orderId": "1.292.285", "inicio": "17:00", "termino": "17:23", "ciclo": 62, "ciclosPeriodo": 22, "producaoReal": 20, "diferenca": 2, "pesoTotal": 14.9, "perdaKg": 1.49, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 173}, {"name": "Zona 3", "value": 172}, {"name": "Zona 4", "value": 170}, {"name": "Zona 5", "value": 160}, {"name": "Cabeçote 1", "value": 175}, {"name": "Cabeçote 2", "value": 180}, {"name": "Cabeçote 4", "value": 175}], "velocidade": 21.5, "observacao": "Troca de produção"}, {"date": "08/06/2026, 04:48", "turno": "B", "_name": "EXT 02", "maquina": "EXT 02", "operador": "Fabrício", "statusLabel": "Em operação", "produto": "Canaleta 50X50X2000mm CZ/SEMI ABERTA. (CX 9034)", "orderId": "1.292.285", "inicio": "19:00", "termino": "05:00", "ciclo": 62, "ciclosPeriodo": 580, "producaoReal": 552, "diferenca": 28, "pesoTotal": 414, "perdaKg": 21, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 173}, {"name": "Zona 3", "value": 172}, {"name": "Zona 4", "value": 170}, {"name": "Zona 5", "value": 160}, {"name": "Cabeçote 1", "value": 175}, {"name": "Cabeçote 2", "value": 180}, {"name": "Cabeçote 4", "value": 175}], "velocidade": 21.5, "rpmExtrusora": 21.8, "rpmPuxador": 7, "amperagem": 84.8, "observacao": "Peso 0,880g FEXADA"}, {"date": "09/06/2026, 17:33", "turno": "A", "_name": "EXT 02", "maquina": "EXT 02", "operador": "Luis", "statusLabel": "Em operação", "produto": "Canaleta 50X50X2000mm SEMI ABERTA. (CX 9034)", "orderId": "1.292.285", "inicio": "05:00", "termino": "17:00", "ciclo": 60, "ciclosPeriodo": 720, "producaoReal": 268, "diferenca": 452, "pesoTotal": 195.64, "perdaKg": 329.96, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 173}, {"name": "Zona 3", "value": 172}, {"name": "Zona 4", "value": 170}, {"name": "Zona 5", "value": 160}, {"name": "Cabeçote 1", "value": 175}, {"name": "Cabeçote 2", "value": 180}, {"name": "Cabeçote 4", "value": 175}], "velocidade": 21.5, "rpmExtrusora": 20, "rpmPuxador": 6.2, "amperagem": 81.8, "observacao": ""}], "observation": ""}, {"id": "CAN-02", "name": "EXT 04", "model": "Perfiladeira CAN-500", "status": "running", "operator": "Leandro", "job": {"orderId": "OP-2024-1002", "product": "Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF", "produced": 0, "startTime": "17:00", "estimatedEnd": "17:00", "cycleTime": 22, "piecesPerCycle": 2, "pieceWeight": 0.135}, "metrics": {"temperature": 61, "speed": 26.5, "tempZones": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 166}, {"name": "Zona 3", "value": 170}, {"name": "Zona 4", "value": 160}, {"name": "Zona 5", "value": 162}, {"name": "Zona 6", "value": 180}, {"name": "Zona 7", "value": 185}], "rpmExtrusora": 27, "rpmPuxador": 26, "amperagem": 33.6}, "maintenanceNote": "", "history": [{"date": "01/06/2026, 20:35", "turno": "A", "_name": "EXT 04", "maquina": "EXT 04", "operador": "Cleiton", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF", "orderId": "OP-2024-1002", "inicio": "05:00", "termino": "17:00", "ciclo": 25, "ciclosPeriodo": 1728, "producaoReal": 1300, "diferenca": 428, "pesoTotal": 224.64, "perdaKg": 55.64, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 172.2}, {"name": "Zona 3", "value": 177}, {"name": "Zona 4", "value": 160}, {"name": "Zona 5", "value": 169}, {"name": "Zona 6", "value": 180}, {"name": "Zona 7", "value": 191}], "velocidade": 34.3}, {"date": "02/06/2026, 03:34", "turno": "B", "_name": "EXT 04", "maquina": "EXT 04", "operador": "Leandro", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF", "orderId": "OP-2024-1002", "inicio": "17:00", "termino": "05:00", "ciclo": 25, "ciclosPeriodo": 1728, "producaoReal": 2500, "diferenca": -772, "pesoTotal": 325, "perdaKg": 0, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 172.2}, {"name": "Zona 3", "value": 177}, {"name": "Zona 4", "value": 160}, {"name": "Zona 5", "value": 169}, {"name": "Zona 6", "value": 180}, {"name": "Zona 7", "value": 191}], "velocidade": 34.3, "observacao": "Parou por falta de etiqueta de código de barra"}, {"date": "03/06/2026, 17:21", "turno": "A", "_name": "EXT 04", "maquina": "EXT 04", "operador": "Cleiton", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/DIVISÓRIA S/ FITA DF", "orderId": "OP-2024-1002", "inicio": "05:00", "termino": "17:00", "ciclo": 21, "ciclosPeriodo": 4114, "producaoReal": 1200, "diferenca": 2914, "pesoTotal": 150, "perdaKg": 364.25, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 172.2}, {"name": "Zona 3", "value": 177}, {"name": "Zona 4", "value": 160}, {"name": "Zona 5", "value": 169}, {"name": "Zona 6", "value": 190}, {"name": "Zona 7", "value": 191}], "velocidade": 41.2, "observacao": "Não sabe a hora que iniciou a produção"}, {"date": "03/06/2026, 04:03", "turno": "B", "_name": "EXT 04", "maquina": "EXT 04", "operador": "Leandro", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/DIVISÓRIA S/ FITA DF", "orderId": "OP-2024-1002", "inicio": "17:00", "termino": "05:00", "ciclo": 24, "ciclosPeriodo": 3600, "producaoReal": 2500, "diferenca": 1100, "pesoTotal": 312.5, "perdaKg": 137.5, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 172.2}, {"name": "Zona 3", "value": 177}, {"name": "Zona 4", "value": 160}, {"name": "Zona 5", "value": 169}, {"name": "Zona 6", "value": 190}, {"name": "Zona 7", "value": 191}], "velocidade": 35.6, "observacao": "Baixou a velocidade de 41.5 para 35.6 a máquina tava parando de mais e teve que fazer a limpeza dela e volta a produção, problema na bomba as 03:00h"}, {"date": "08/06/2026, 04:49", "turno": "B", "_name": "EXT 04", "maquina": "EXT 04", "operador": "Leandro", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF", "orderId": "OP-2024-1002", "inicio": "18:15", "termino": "05:00", "ciclo": 22, "ciclosPeriodo": 3518, "producaoReal": 2100, "diferenca": 1418, "pesoTotal": 283.5, "perdaKg": 191.43, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 172.2}, {"name": "Zona 3", "value": 177}, {"name": "Zona 4", "value": 160}, {"name": "Zona 5", "value": 169}, {"name": "Zona 6", "value": 190}, {"name": "Zona 7", "value": 194}], "velocidade": 26.5, "rpmExtrusora": 26.5, "rpmPuxador": 26.17, "amperagem": 32.7, "observacao": ""}, {"date": "09/06/2026, 17:37", "turno": "A", "_name": "EXT 04", "maquina": "EXT 04", "operador": "Cleiton", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF", "orderId": "OP-2024-1002", "inicio": "05:00", "termino": "17:00", "ciclo": 22, "ciclosPeriodo": 3926, "producaoReal": 3400, "diferenca": 526, "pesoTotal": 459, "perdaKg": 71.01, "metricas": [{"name": "Zona 1", "value": 170}, {"name": "Zona 2", "value": 166}, {"name": "Zona 3", "value": 170}, {"name": "Zona 4", "value": 160}, {"name": "Zona 5", "value": 162}, {"name": "Zona 6", "value": 180}, {"name": "Zona 7", "value": 185}], "velocidade": 26.5, "rpmExtrusora": 27, "rpmPuxador": 26, "amperagem": 33.6, "observacao": ""}], "observation": ""}, {"id": "CAN-03", "name": "EXT 08", "model": "Perfiladeira CAN-800", "status": "running", "operator": "Felipe", "job": {"orderId": "OP-2024-1003", "product": "Canaleta 20X10X2000mm C/ DF", "produced": 0, "startTime": "17:00", "estimatedEnd": "05:00", "cycleTime": 22, "piecesPerCycle": 2, "pieceWeight": 0.13}, "metrics": {"temperature": 55, "speed": 52519055, "tempZones": [{"name": "Cabeçote Zona 1", "value": 165}, {"name": "Cabeçote Zona 2", "value": 200}, {"name": "Cabeçote Zona 3", "value": 186}, {"name": "Cabeçote Zona 4", "value": 180}, {"name": "Canhão Zona 1", "value": 178}, {"name": "Canhão Zona 2", "value": 180}, {"name": "Canhão Zona 3", "value": 182}, {"name": "Canhão Zona 4", "value": 183}], "rpmExtrusora": 525, "rpmPuxador": 55, "amperagem": 149}, "maintenanceNote": "", "history": [{"date": "02/06/2026, 04:55", "turno": "B", "_name": "EXT 08", "maquina": "EXT 08", "operador": "Felipe", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/ DF", "orderId": "OP-2024-1003", "inicio": "17:00", "termino": "05:00", "ciclo": 23, "ciclosPeriodo": 3756, "producaoReal": 3200, "diferenca": 556, "pesoTotal": 416, "perdaKg": 72.28, "metricas": [{"name": "Cabeçote Zona 1", "value": 165}, {"name": "Cabeçote Zona 2", "value": 227}, {"name": "Cabeçote Zona 3", "value": 182}, {"name": "Cabeçote Zona 4", "value": 182}, {"name": "Canhão Zona 1", "value": 180}, {"name": "Canhão Zona 2", "value": 182}, {"name": "Canhão Zona 3", "value": 185.1}, {"name": "Canhão Zona 4", "value": 185}], "velocidade": 52118454, "observacao": ""}, {"date": "03/06/2026, 17:52", "turno": "A", "_name": "EXT 08", "maquina": "EXT 08", "operador": "Patrick", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/ DF", "orderId": "OP-2024-1003", "inicio": "05:00", "termino": "17:00", "ciclo": 22, "ciclosPeriodo": 3926, "producaoReal": 2900, "diferenca": 1026, "pesoTotal": 377, "perdaKg": 133.38, "metricas": [{"name": "Cabeçote Zona 1", "value": 165}, {"name": "Cabeçote Zona 2", "value": 227}, {"name": "Cabeçote Zona 3", "value": 180}, {"name": "Cabeçote Zona 4", "value": 182}, {"name": "Canhão Zona 1", "value": 180}, {"name": "Canhão Zona 2", "value": 182}, {"name": "Canhão Zona 3", "value": 185.1}, {"name": "Canhão Zona 4", "value": 185}], "velocidade": 52519056, "observacao": ""}, {"date": "03/06/2026, 04:01", "turno": "B", "_name": "EXT 08", "maquina": "EXT 08", "operador": "Felipe", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/ DF", "orderId": "OP-2024-1003", "inicio": "17:00", "termino": "05:00", "ciclo": 22, "ciclosPeriodo": 3926, "producaoReal": 2500, "diferenca": 1426, "pesoTotal": 325, "perdaKg": 185.38, "metricas": [{"name": "Cabeçote Zona 1", "value": 165}, {"name": "Cabeçote Zona 2", "value": 227}, {"name": "Cabeçote Zona 3", "value": 180}, {"name": "Cabeçote Zona 4", "value": 182}, {"name": "Canhão Zona 1", "value": 180}, {"name": "Canhão Zona 2", "value": 182}, {"name": "Canhão Zona 3", "value": 185.1}, {"name": "Canhão Zona 4", "value": 185}], "velocidade": 52519056, "observacao": ""}, {"date": "08/06/2026, 17:52", "turno": "A", "_name": "EXT 08", "maquina": "EXT 08", "operador": "Juliano", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/ DF", "orderId": "OP-2024-1003", "inicio": "05:00", "termino": "17:00", "ciclo": 22, "ciclosPeriodo": 3926, "producaoReal": 600, "diferenca": 3326, "pesoTotal": 78, "perdaKg": 432.38, "metricas": [{"name": "Cabeçote Zona 1", "value": 165}, {"name": "Cabeçote Zona 2", "value": 200}, {"name": "Cabeçote Zona 3", "value": 186}, {"name": "Cabeçote Zona 4", "value": 180}, {"name": "Canhão Zona 1", "value": 178}, {"name": "Canhão Zona 2", "value": 180}, {"name": "Canhão Zona 3", "value": 182}, {"name": "Canhão Zona 4", "value": 183}], "velocidade": 52519055, "observacao": ""}, {"date": "08/06/2026, 04:50", "turno": "B", "_name": "EXT 08", "maquina": "EXT 08", "operador": "Felipe", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/ DF", "orderId": "OP-2024-1003", "inicio": "17:00", "termino": "05:00", "ciclo": 22, "ciclosPeriodo": 1963, "producaoReal": 3800, "diferenca": -1837, "pesoTotal": 494, "perdaKg": 0, "metricas": [{"name": "Cabeçote Zona 1", "value": 165}, {"name": "Cabeçote Zona 2", "value": 200}, {"name": "Cabeçote Zona 3", "value": 186}, {"name": "Cabeçote Zona 4", "value": 180}, {"name": "Canhão Zona 1", "value": 178}, {"name": "Canhão Zona 2", "value": 180}, {"name": "Canhão Zona 3", "value": 182}, {"name": "Canhão Zona 4", "value": 183}], "velocidade": 52519055, "rpmExtrusora": 525, "rpmPuxador": 55, "amperagem": 149, "observacao": "Obs:CoEtx Vel. 190"}, {"date": "09/06/2026, 18:02", "turno": "A", "_name": "EXT 08", "maquina": "EXT 08", "operador": "Juliano", "statusLabel": "Em operação", "produto": "Canaleta 20X10X2000mm C/ DF", "orderId": "OP-2024-1003", "inicio": "05:00", "termino": "17:00", "ciclo": 22, "ciclosPeriodo": 3926, "producaoReal": 3200, "diferenca": 726, "pesoTotal": 416, "perdaKg": 94.38, "metricas": [{"name": "Cabeçote Zona 1", "value": 165}, {"name": "Cabeçote Zona 2", "value": 200}, {"name": "Cabeçote Zona 3", "value": 186}, {"name": "Cabeçote Zona 4", "value": 180}, {"name": "Canhão Zona 1", "value": 178}, {"name": "Canhão Zona 2", "value": 180}, {"name": "Canhão Zona 3", "value": 182}, {"name": "Canhão Zona 4", "value": 183}], "velocidade": 52519055, "rpmExtrusora": 525, "rpmPuxador": 55, "amperagem": 149, "observacao": ""}], "observation": ""}, {"id": "CAN-04", "name": "EXT 09", "model": "Perfiladeira CAN-500", "status": "maintenance", "operator": "Equipe Manutenção", "job": {"orderId": "", "product": "", "produced": 0, "startTime": "", "estimatedEnd": "", "cycleTime": "12", "piecesPerCycle": 1, "pieceWeight": 0}, "metrics": {"temperature": 30, "speed": 0, "tempZones": []}, "maintenanceNote": "DESMONTADA", "history": []}, {"id": "CAN-05", "name": "EXT 07", "model": "Perfiladeira CAN-800", "status": "maintenance", "operator": "Equipe Manutenção", "job": null, "metrics": {"temperature": 30, "speed": 0, "tempZones": []}, "maintenanceNote": "DESMONTADA", "history": []}, {"id": "CAN-06", "name": "EXT 05", "model": "Perfiladeira CAN-500", "status": "running", "operator": "Felipe", "job": {"orderId": "1.290.286", "product": "Canaleta 20X20X2000mm CZ SEMI ABERTA", "produced": 0, "startTime": "17:00", "estimatedEnd": "05:00", "cycleTime": 32, "piecesPerCycle": 1, "pieceWeight": 0.24}, "metrics": {"temperature": 32, "speed": 0, "tempZones": [{"name": "Zona 1", "value": 125}, {"name": "Zona 2", "value": 152}, {"name": "Zona 3", "value": 158}, {"name": "Zona 4", "value": 158}, {"name": "Zona 5", "value": 144}, {"name": "Zona 6", "value": 150}, {"name": "Zona 7", "value": 175}, {"name": "Zona 8", "value": 176}], "rpmExtrusora": 18.9, "rpmPuxador": 11, "amperagem": 12.6}, "maintenanceNote": "SEM PRODUÇÃO", "history": [{"date": "01/06/2026, 20:37", "turno": "B", "_name": "Canaleta #6", "maquina": "Canaleta #6", "operador": "—", "statusLabel": "Manutenção", "produto": "—", "orderId": "—", "inicio": "—", "termino": "—", "ciclo": "—", "ciclosPeriodo": 0, "producaoReal": 0, "diferenca": 0, "pesoTotal": 0, "perdaKg": 0, "metricas": [], "velocidade": 0}, {"date": "09/06/2026, 17:51", "turno": "A", "_name": "EXT 05", "maquina": "EXT 05", "operador": "Equipe", "statusLabel": "Em operação", "produto": "Canaleta 20X20X2000mm CZ SEMI ABERTA", "orderId": "1.290.286", "inicio": "05:00", "termino": "17:00", "ciclo": 32, "ciclosPeriodo": 1350, "producaoReal": 288, "diferenca": 1062, "pesoTotal": 69.12, "perdaKg": 254.88, "metricas": [{"name": "Zona 1", "value": 125}, {"name": "Zona 2", "value": 152}, {"name": "Zona 3", "value": 158}, {"name": "Zona 4", "value": 158}, {"name": "Zona 5", "value": 144}, {"name": "Zona 6", "value": 150}, {"name": "Zona 7", "value": 175}, {"name": "Zona 8", "value": 176}], "velocidade": 0, "rpmExtrusora": 18.9, "rpmPuxador": 11, "amperagem": 12.6, "observacao": ""}], "observation": ""}];
const DEMO_MACHINES = [{"id":"DEMO-01","name":"EXT 02","model":"Perfiladeira CAN-500","status":"running","operator":"Fabrício","observation":"","job":{"orderId":"1.292.285","product":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","produced":580,"startTime":"17:00","estimatedEnd":"05:00","cycleTime":60,"piecesPerCycle":1,"pieceWeight":0.73},"metrics":{"temperature":58,"speed":21.5,"tempZones":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"rpmExtrusora":21,"rpmPuxador":6.2,"amperagem":81.8},"maintenanceNote":"","operadorVinculado":"fabricio","history":[{"date":"09/06/2026, 17:33","turno":"A","_name":"EXT 02","maquina":"EXT 02","operador":"Luis","statusLabel":"Em operação","produto":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","orderId":"1.292.285","inicio":"05:00","termino":"17:00","ciclo":60,"ciclosPeriodo":720,"producaoReal":688,"diferenca":32,"pesoTotal":502.24,"perdaKg":12.41,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"velocidade":21.5,"rpmExtrusora":21,"rpmPuxador":6.2,"amperagem":81.8,"observacao":"Turno produtivo. Temperatura estável."},{"date":"09/06/2026, 04:48","turno":"B","_name":"EXT 02","maquina":"EXT 02","operador":"Fabrício","statusLabel":"Em operação","produto":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","orderId":"1.292.285","inicio":"17:00","termino":"05:00","ciclo":60,"ciclosPeriodo":720,"producaoReal":580,"diferenca":140,"pesoTotal":423.4,"perdaKg":0,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"velocidade":21.5,"rpmExtrusora":21,"rpmPuxador":6.2,"amperagem":81.8,"observacao":""},{"date":"10/06/2026, 17:25","turno":"A","_name":"EXT 02","maquina":"EXT 02","operador":"Luis","statusLabel":"Em operação","produto":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","orderId":"1.292.285","inicio":"05:00","termino":"17:00","ciclo":60,"ciclosPeriodo":720,"producaoReal":710,"diferenca":10,"pesoTotal":518.3,"perdaKg":0,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"velocidade":21.5,"rpmExtrusora":21,"rpmPuxador":6.2,"amperagem":81.8,"observacao":"Meta batida! Ótimo turno."},{"date":"10/06/2026, 04:50","turno":"B","_name":"EXT 02","maquina":"EXT 02","operador":"Fabrício","statusLabel":"Em operação","produto":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","orderId":"1.292.285","inicio":"17:00","termino":"05:00","ciclo":60,"ciclosPeriodo":720,"producaoReal":650,"diferenca":70,"pesoTotal":474.5,"perdaKg":51.1,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"velocidade":21,"rpmExtrusora":21,"rpmPuxador":6,"amperagem":80.5,"observacao":"Pequena parada às 02h para ajuste."},{"date":"11/06/2026, 17:40","turno":"A","_name":"EXT 02","maquina":"EXT 02","operador":"Luis","statusLabel":"Em operação","produto":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","orderId":"1.292.285","inicio":"05:00","termino":"17:00","ciclo":60,"ciclosPeriodo":720,"producaoReal":695,"diferenca":25,"pesoTotal":507.34999999999997,"perdaKg":18.25,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"velocidade":21.5,"rpmExtrusora":21,"rpmPuxador":6.2,"amperagem":81.8,"observacao":""},{"date":"11/06/2026, 04:49","turno":"B","_name":"EXT 02","maquina":"EXT 02","operador":"Fabrício","statusLabel":"Em operação","produto":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","orderId":"1.292.285","inicio":"17:00","termino":"05:00","ciclo":60,"ciclosPeriodo":720,"producaoReal":620,"diferenca":100,"pesoTotal":452.59999999999997,"perdaKg":72.99,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"velocidade":21,"rpmExtrusora":20.5,"rpmPuxador":6,"amperagem":80.2,"observacao":"Material com variação de cor no início."},{"date":"12/06/2026, 17:28","turno":"A","_name":"EXT 02","maquina":"EXT 02","operador":"Luis","statusLabel":"Em operação","produto":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","orderId":"1.292.285","inicio":"05:00","termino":"17:00","ciclo":60,"ciclosPeriodo":720,"producaoReal":730,"diferenca":-10,"pesoTotal":532.9,"perdaKg":0,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"velocidade":21.8,"rpmExtrusora":21,"rpmPuxador":6.3,"amperagem":82,"observacao":"Excelente turno, meta superada."},{"date":"12/06/2026, 04:55","turno":"B","_name":"EXT 02","maquina":"EXT 02","operador":"Fabrício","statusLabel":"Em operação","produto":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","orderId":"1.292.285","inicio":"17:00","termino":"05:00","ciclo":60,"ciclosPeriodo":720,"producaoReal":608,"diferenca":112,"pesoTotal":443.84,"perdaKg":81.76,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"velocidade":21,"rpmExtrusora":21,"rpmPuxador":6.1,"amperagem":81.5,"observacao":""},{"date":"13/06/2026, 17:51","turno":"A","_name":"EXT 02","maquina":"EXT 02","operador":"Luis","statusLabel":"Em operação","produto":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","orderId":"1.292.285","inicio":"05:00","termino":"17:00","ciclo":60,"ciclosPeriodo":720,"producaoReal":688,"diferenca":32,"pesoTotal":502.24,"perdaKg":23.36,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"velocidade":21.5,"rpmExtrusora":21,"rpmPuxador":6.2,"amperagem":81.8,"observacao":""},{"date":"13/06/2026, 04:49","turno":"B","_name":"EXT 02","maquina":"EXT 02","operador":"Fabrício","statusLabel":"Em operação","produto":"Canaleta 50X50X2000mm BR SEMI ABERTA. (CX 9035)","orderId":"1.292.285","inicio":"17:00","termino":"05:00","ciclo":60,"ciclosPeriodo":720,"producaoReal":580,"diferenca":140,"pesoTotal":423.4,"perdaKg":0,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":173},{"name":"Zona 3","value":172},{"name":"Zona 4","value":170},{"name":"Zona 5","value":160},{"name":"Cabeçote 1","value":175},{"name":"Cabeçote 2","value":180}],"velocidade":21.5,"rpmExtrusora":21,"rpmPuxador":6.2,"amperagem":81.8,"observacao":""}]},{"id":"DEMO-02","name":"EXT 04","model":"Perfiladeira CAN-500","status":"running","operator":"Leandro","observation":"","job":{"orderId":"OP-2024-1002","product":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","produced":2800,"startTime":"17:00","estimatedEnd":"05:00","cycleTime":22,"piecesPerCycle":2,"pieceWeight":0.135},"metrics":{"temperature":61,"speed":26.5,"tempZones":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"rpmExtrusora":27,"rpmPuxador":26,"amperagem":33.6},"maintenanceNote":"","operadorVinculado":"leandro","history":[{"date":"09/06/2026, 18:03","turno":"A","_name":"EXT 04","maquina":"EXT 04","operador":"Cleiton","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","orderId":"OP-2024-1002","inicio":"05:00","termino":"17:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3500,"diferenca":427,"pesoTotal":472.50000000000006,"perdaKg":56.745,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"velocidade":26.5,"rpmExtrusora":27,"rpmPuxador":26,"amperagem":33.6,"observacao":""},{"date":"09/06/2026, 04:58","turno":"B","_name":"EXT 04","maquina":"EXT 04","operador":"Leandro","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","orderId":"OP-2024-1002","inicio":"17:00","termino":"05:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":2800,"diferenca":1127,"pesoTotal":378,"perdaKg":151.695,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"velocidade":26.5,"rpmExtrusora":27,"rpmPuxador":26,"amperagem":33.6,"observacao":"Parou por falta de etiqueta às 02h."},{"date":"10/06/2026, 17:37","turno":"A","_name":"EXT 04","maquina":"EXT 04","operador":"Cleiton","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","orderId":"OP-2024-1002","inicio":"05:00","termino":"17:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3400,"diferenca":527,"pesoTotal":459.00000000000006,"perdaKg":71.145,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"velocidade":26.5,"rpmExtrusora":27,"rpmPuxador":26,"amperagem":33.6,"observacao":""},{"date":"10/06/2026, 04:49","turno":"B","_name":"EXT 04","maquina":"EXT 04","operador":"Leandro","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","orderId":"OP-2024-1002","inicio":"17:00","termino":"05:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3600,"diferenca":327,"pesoTotal":486.00000000000006,"perdaKg":0,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"velocidade":26.8,"rpmExtrusora":27,"rpmPuxador":26.2,"amperagem":34,"observacao":"Meta batida! Ótimo turno."},{"date":"11/06/2026, 17:21","turno":"A","_name":"EXT 04","maquina":"EXT 04","operador":"Cleiton","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","orderId":"OP-2024-1002","inicio":"05:00","termino":"17:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3200,"diferenca":727,"pesoTotal":432,"perdaKg":98.145,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"velocidade":26.5,"rpmExtrusora":27,"rpmPuxador":26,"amperagem":33.6,"observacao":""},{"date":"11/06/2026, 04:03","turno":"B","_name":"EXT 04","maquina":"EXT 04","operador":"Leandro","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","orderId":"OP-2024-1002","inicio":"17:00","termino":"05:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":2500,"diferenca":1427,"pesoTotal":337.5,"perdaKg":192.645,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"velocidade":26,"rpmExtrusora":26.5,"rpmPuxador":25.8,"amperagem":33,"observacao":"Problema na bomba às 03:00h."},{"date":"12/06/2026, 17:44","turno":"A","_name":"EXT 04","maquina":"EXT 04","operador":"Cleiton","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","orderId":"OP-2024-1002","inicio":"05:00","termino":"17:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3300,"diferenca":627,"pesoTotal":445.50000000000006,"perdaKg":84.645,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"velocidade":26.5,"rpmExtrusora":27,"rpmPuxador":26,"amperagem":33.6,"observacao":""},{"date":"12/06/2026, 04:49","turno":"B","_name":"EXT 04","maquina":"EXT 04","operador":"Leandro","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","orderId":"OP-2024-1002","inicio":"17:00","termino":"05:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":2100,"diferenca":1827,"pesoTotal":283.5,"perdaKg":246.645,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"velocidade":26.5,"rpmExtrusora":27,"rpmPuxador":26,"amperagem":33.6,"observacao":"Iniciou às 18:15 após manutenção."},{"date":"13/06/2026, 18:03","turno":"A","_name":"EXT 04","maquina":"EXT 04","operador":"Cleiton","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","orderId":"OP-2024-1002","inicio":"05:00","termino":"17:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3500,"diferenca":427,"pesoTotal":472.50000000000006,"perdaKg":56.745,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"velocidade":26.5,"rpmExtrusora":27,"rpmPuxador":26,"amperagem":33.6,"observacao":""},{"date":"13/06/2026, 04:58","turno":"B","_name":"EXT 04","maquina":"EXT 04","operador":"Leandro","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/DIVISÓRIA C/ FITA DF","orderId":"OP-2024-1002","inicio":"17:00","termino":"05:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":2800,"diferenca":1127,"pesoTotal":378,"perdaKg":151.695,"metricas":[{"name":"Zona 1","value":170},{"name":"Zona 2","value":166},{"name":"Zona 3","value":170},{"name":"Zona 4","value":160},{"name":"Zona 5","value":162},{"name":"Zona 6","value":180},{"name":"Zona 7","value":185}],"velocidade":26.5,"rpmExtrusora":27,"rpmPuxador":26,"amperagem":33.6,"observacao":""}]},{"id":"DEMO-03","name":"EXT 08","model":"Perfiladeira CAN-800","status":"running","operator":"Felipe","observation":"","job":{"orderId":"OP-2024-1003","product":"Canaleta 20X10X2000mm C/ DF","produced":3000,"startTime":"17:00","estimatedEnd":"05:00","cycleTime":22,"piecesPerCycle":2,"pieceWeight":0.13},"metrics":{"temperature":55,"speed":38,"tempZones":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149},"maintenanceNote":"","operadorVinculado":"felipe","history":[{"date":"09/06/2026, 17:51","turno":"A","_name":"EXT 08","maquina":"EXT 08","operador":"Juliano","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/ DF","orderId":"OP-2024-1003","inicio":"05:00","termino":"17:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3100,"diferenca":827,"pesoTotal":403,"perdaKg":106.51,"metricas":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"velocidade":38,"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149,"observacao":""},{"date":"09/06/2026, 04:58","turno":"B","_name":"EXT 08","maquina":"EXT 08","operador":"Felipe","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/ DF","orderId":"OP-2024-1003","inicio":"17:00","termino":"05:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3000,"diferenca":927,"pesoTotal":390,"perdaKg":119.51,"metricas":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"velocidade":38,"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149,"observacao":""},{"date":"10/06/2026, 18:02","turno":"A","_name":"EXT 08","maquina":"EXT 08","operador":"Juliano","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/ DF","orderId":"OP-2024-1003","inicio":"05:00","termino":"17:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3200,"diferenca":727,"pesoTotal":416,"perdaKg":93.51,"metricas":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"velocidade":38,"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149,"observacao":""},{"date":"10/06/2026, 04:53","turno":"B","_name":"EXT 08","maquina":"EXT 08","operador":"Felipe","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/ DF","orderId":"OP-2024-1003","inicio":"17:00","termino":"05:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":1300,"diferenca":2627,"pesoTotal":169,"perdaKg":341.51,"metricas":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"velocidade":38,"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149,"observacao":"Problema elétrico às 22h. Parada de 3h."},{"date":"11/06/2026, 17:52","turno":"A","_name":"EXT 08","maquina":"EXT 08","operador":"Juliano","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/ DF","orderId":"OP-2024-1003","inicio":"05:00","termino":"17:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":2900,"diferenca":1027,"pesoTotal":377,"perdaKg":132.51,"metricas":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"velocidade":38,"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149,"observacao":""},{"date":"11/06/2026, 04:01","turno":"B","_name":"EXT 08","maquina":"EXT 08","operador":"Felipe","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/ DF","orderId":"OP-2024-1003","inicio":"17:00","termino":"05:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":2500,"diferenca":1427,"pesoTotal":325,"perdaKg":182.51,"metricas":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"velocidade":38,"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149,"observacao":""},{"date":"12/06/2026, 17:44","turno":"A","_name":"EXT 08","maquina":"EXT 08","operador":"Juliano","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/ DF","orderId":"OP-2024-1003","inicio":"05:00","termino":"17:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3500,"diferenca":427,"pesoTotal":455,"perdaKg":119.51,"metricas":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"velocidade":38.5,"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149,"observacao":"Meta batida! Velocidade levemente aumentada."},{"date":"12/06/2026, 04:50","turno":"B","_name":"EXT 08","maquina":"EXT 08","operador":"Felipe","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/ DF","orderId":"OP-2024-1003","inicio":"17:00","termino":"05:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3800,"diferenca":127,"pesoTotal":494,"perdaKg":0,"metricas":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"velocidade":38,"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149,"observacao":"Excelente turno. Meta superada."},{"date":"13/06/2026, 17:51","turno":"A","_name":"EXT 08","maquina":"EXT 08","operador":"Juliano","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/ DF","orderId":"OP-2024-1003","inicio":"05:00","termino":"17:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3100,"diferenca":827,"pesoTotal":403,"perdaKg":106.51,"metricas":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"velocidade":38,"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149,"observacao":""},{"date":"13/06/2026, 04:58","turno":"B","_name":"EXT 08","maquina":"EXT 08","operador":"Felipe","statusLabel":"Em operação","produto":"Canaleta 20X10X2000mm C/ DF","orderId":"OP-2024-1003","inicio":"17:00","termino":"05:00","ciclo":22,"ciclosPeriodo":3927,"producaoReal":3000,"diferenca":927,"pesoTotal":390,"perdaKg":119.51,"metricas":[{"name":"Cabeçote Zona 1","value":165},{"name":"Cabeçote Zona 2","value":200},{"name":"Cabeçote Zona 3","value":186},{"name":"Cabeçote Zona 4","value":180},{"name":"Canhão Zona 1","value":178},{"name":"Canhão Zona 2","value":180},{"name":"Canhão Zona 3","value":182},{"name":"Canhão Zona 4","value":183}],"velocidade":38,"rpmExtrusora":525,"rpmPuxador":55,"amperagem":149,"observacao":""}]},{"id":"DEMO-04","name":"EXT 05","model":"Perfiladeira CAN-500","status":"running","operator":"Chico","observation":"","job":{"orderId":"1.290.286","product":"Canaleta 20X20X2000mm CZ SEMI ABERTA","produced":192,"startTime":"17:00","estimatedEnd":"05:00","cycleTime":32,"piecesPerCycle":1,"pieceWeight":0.24},"metrics":{"temperature":32,"speed":11,"tempZones":[{"name":"Zona 1","value":125},{"name":"Zona 2","value":152},{"name":"Zona 3","value":158},{"name":"Zona 4","value":158},{"name":"Zona 5","value":144},{"name":"Zona 6","value":150},{"name":"Zona 7","value":175},{"name":"Zona 8","value":176}],"rpmExtrusora":18.9,"rpmPuxador":11,"amperagem":12.6},"maintenanceNote":"","operadorVinculado":"chico","history":[{"date":"09/06/2026, 17:51","turno":"A","_name":"EXT 05","maquina":"EXT 05","operador":"Equipe","statusLabel":"Em operação","produto":"Canaleta 20X20X2000mm CZ SEMI ABERTA","orderId":"1.290.286","inicio":"05:00","termino":"17:00","ciclo":32,"ciclosPeriodo":1350,"producaoReal":288,"diferenca":1062,"pesoTotal":69.12,"perdaKg":36.48,"metricas":[{"name":"Zona 1","value":125},{"name":"Zona 2","value":152},{"name":"Zona 3","value":158},{"name":"Zona 4","value":158},{"name":"Zona 5","value":144},{"name":"Zona 6","value":150},{"name":"Zona 7","value":175},{"name":"Zona 8","value":176}],"velocidade":11,"rpmExtrusora":18.9,"rpmPuxador":11,"amperagem":12.6,"observacao":""},{"date":"09/06/2026, 02:43","turno":"B","_name":"EXT 05","maquina":"EXT 05","operador":"Fabrício","statusLabel":"Em operação","produto":"Canaleta 20X20X2000mm CZ SEMI ABERTA","orderId":"1.290.286","inicio":"17:00","termino":"05:00","ciclo":32,"ciclosPeriodo":1350,"producaoReal":192,"diferenca":1158,"pesoTotal":46.08,"perdaKg":83.52,"metricas":[{"name":"Zona 1","value":125},{"name":"Zona 2","value":152},{"name":"Zona 3","value":158},{"name":"Zona 4","value":158},{"name":"Zona 5","value":144},{"name":"Zona 6","value":150},{"name":"Zona 7","value":175},{"name":"Zona 8","value":176}],"velocidade":11,"rpmExtrusora":18.9,"rpmPuxador":11,"amperagem":12.6,"observacao":""},{"date":"10/06/2026, 17:30","turno":"A","_name":"EXT 05","maquina":"EXT 05","operador":"Equipe","statusLabel":"Em operação","produto":"Canaleta 20X20X2000mm CZ SEMI ABERTA","orderId":"1.290.286","inicio":"05:00","termino":"17:00","ciclo":32,"ciclosPeriodo":1350,"producaoReal":310,"diferenca":1040,"pesoTotal":74.39999999999999,"perdaKg":14.4,"metricas":[{"name":"Zona 1","value":125},{"name":"Zona 2","value":152},{"name":"Zona 3","value":158},{"name":"Zona 4","value":158},{"name":"Zona 5","value":144},{"name":"Zona 6","value":150},{"name":"Zona 7","value":175},{"name":"Zona 8","value":176}],"velocidade":11.2,"rpmExtrusora":18.9,"rpmPuxador":11,"amperagem":12.6,"observacao":"Bom turno."},{"date":"10/06/2026, 03:39","turno":"B","_name":"EXT 05","maquina":"EXT 05","operador":"Chico","statusLabel":"Em operação","produto":"Canaleta 20X20X2000mm CZ SEMI ABERTA","orderId":"1.290.286","inicio":"17:00","termino":"05:00","ciclo":32,"ciclosPeriodo":1350,"producaoReal":464,"diferenca":886,"pesoTotal":111.36,"perdaKg":0,"metricas":[{"name":"Zona 1","value":125},{"name":"Zona 2","value":152},{"name":"Zona 3","value":158},{"name":"Zona 4","value":158},{"name":"Zona 5","value":144},{"name":"Zona 6","value":150},{"name":"Zona 7","value":175},{"name":"Zona 8","value":176}],"velocidade":11,"rpmExtrusora":18.9,"rpmPuxador":11,"amperagem":12.6,"observacao":"Meta batida!"},{"date":"11/06/2026, 17:45","turno":"A","_name":"EXT 05","maquina":"EXT 05","operador":"Equipe","statusLabel":"Em operação","produto":"Canaleta 20X20X2000mm CZ SEMI ABERTA","orderId":"1.290.286","inicio":"05:00","termino":"17:00","ciclo":32,"ciclosPeriodo":1350,"producaoReal":290,"diferenca":1060,"pesoTotal":69.6,"perdaKg":33.6,"metricas":[{"name":"Zona 1","value":125},{"name":"Zona 2","value":152},{"name":"Zona 3","value":158},{"name":"Zona 4","value":158},{"name":"Zona 5","value":144},{"name":"Zona 6","value":150},{"name":"Zona 7","value":175},{"name":"Zona 8","value":176}],"velocidade":11,"rpmExtrusora":18.9,"rpmPuxador":11,"amperagem":12.6,"observacao":""},{"date":"11/06/2026, 04:10","turno":"B","_name":"EXT 05","maquina":"EXT 05","operador":"Chico","statusLabel":"Em operação","produto":"Canaleta 20X20X2000mm CZ SEMI ABERTA","orderId":"1.290.286","inicio":"17:00","termino":"05:00","ciclo":32,"ciclosPeriodo":1350,"producaoReal":380,"diferenca":970,"pesoTotal":91.2,"perdaKg":0,"metricas":[{"name":"Zona 1","value":125},{"name":"Zona 2","value":152},{"name":"Zona 3","value":158},{"name":"Zona 4","value":158},{"name":"Zona 5","value":144},{"name":"Zona 6","value":150},{"name":"Zona 7","value":175},{"name":"Zona 8","value":176}],"velocidade":11,"rpmExtrusora":18.9,"rpmPuxador":11,"amperagem":12.6,"observacao":""}]},{"id":"DEMO-05","name":"EXT 07","model":"Perfiladeira CAN-800","status":"maintenance","operator":"Equipe Manutenção","observation":"","job":null,"metrics":{"temperature":30,"speed":0,"tempZones":[]},"maintenanceNote":"DESMONTADA — aguardando peças","history":[]},{"id":"DEMO-06","name":"EXT 09","model":"Perfiladeira CAN-500","status":"maintenance","operator":"Equipe Manutenção","observation":"","job":null,"metrics":{"temperature":30,"speed":0,"tempZones":[]},"maintenanceNote":"DESMONTADA","history":[]}];
function AutocompleteField({ label, value, onSave, storageKey, large, fullWidth, highlight }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const borderColor = highlight ? "#00e5a055" : "#1a2235";
  function loadSuggestions() {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }
  function saveSuggestion(val) {
    if (!val || !storageKey) return;
    try {
      const list = loadSuggestions();
      const updated = [val, ...list.filter((x) => x !== val)].slice(0, 20);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
    }
  }
  function start() {
    setDraft(String(value != null ? value : ""));
    setSuggestions(loadSuggestions());
    setOpen(true);
  }
  function save(v) {
    const val = (v != null ? v : draft).trim();
    if (val) {
      onSave(val);
      saveSuggestion(val);
    }
    setOpen(false);
  }
  const filtered = draft.length > 0 ? suggestions.filter((s) => s.toLowerCase().includes(draft.toLowerCase()) && s !== draft) : suggestions;
  if (open) return /* @__PURE__ */ React.createElement("div", { style: { flex: fullWidth ? "1 1 100%" : "1 1 140px", background: "#0a1628", border: "2px solid #4a8aff", borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a8aff", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 } }, label), /* @__PURE__ */ React.createElement(
    "input",
    {
      autoFocus: true,
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setOpen(false);
      },
      style: { width: "100%", background: "#070b12", border: "1px solid #4a8aff", color: "#fff", borderRadius: 6, padding: "8px 10px", fontSize: large ? 16 : 14, fontFamily: "monospace", fontWeight: 700, boxSizing: "border-box", marginBottom: 6 }
    }
  ), filtered.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { background: "#070b12", border: "1px solid #2a3a50", borderRadius: 6, marginBottom: 8, maxHeight: 160, overflowY: "auto" } }, filtered.map((s, i) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: i,
      onClick: () => save(s),
      style: { padding: "8px 10px", fontSize: 13, color: "#7ab8ff", cursor: "pointer", borderBottom: "1px solid #1a2235", fontFamily: "monospace" },
      onMouseEnter: (e) => e.currentTarget.style.background = "#1a2636",
      onMouseLeave: (e) => e.currentTarget.style.background = "transparent"
    },
    s
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => save(), style: { flex: 1, background: "#00e5a0", border: "none", color: "#000", borderRadius: 6, padding: "8px 0", cursor: "pointer", fontWeight: 700, fontSize: 13 } }, "\u2713 Salvar"), /* @__PURE__ */ React.createElement("button", { onClick: () => setOpen(false), style: { flex: 1, background: "#1e2636", border: "1px solid #2a3450", color: "#aaa", borderRadius: 6, padding: "8px 0", cursor: "pointer", fontSize: 13 } }, "Cancelar")));
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: start,
      style: { flex: fullWidth ? "1 1 100%" : "1 1 140px", background: "#111622", border: "1px solid " + borderColor, borderRadius: 10, padding: 12, cursor: "pointer", userSelect: "none" },
      onMouseEnter: (e) => e.currentTarget.style.borderColor = "#4a8aff55",
      onMouseLeave: (e) => e.currentTarget.style.borderColor = borderColor
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: highlight ? "#00e5a0" : "#5a6a8a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6, display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("span", { style: { color: "#2a4a7a" } }, "\u270E")),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: large ? 20 : 16, fontWeight: 700, color: "#e8f0ff" } }, value || "\u2014", suggestions.length > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#2a4a6a", marginLeft: 6 } }, "\u25BE hist\xF3rico"))
  );
}
function Bar({ value, max, color }) {
  const pct = Math.min(100, Math.round(value / (max || 1) * 100));
  return /* @__PURE__ */ React.createElement("div", { style: { width: "100%", background: "#1a1f2e", borderRadius: 4, height: 7 } }, /* @__PURE__ */ React.createElement("div", { style: { width: pct + "%", height: "100%", background: color, borderRadius: 4, boxShadow: "0 0 8px " + color + "66", transition: "width .5s" } }));
}
function Field({ label, value, unit, onSave, numeric, fullWidth, large, highlight }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const borderColor = highlight ? "#00e5a055" : "#1a2235";
  function start() {
    setDraft(String(value != null ? value : ""));
    setOpen(true);
  }
  function save() {
    const v = draft.trim();
    if (v !== "") onSave(numeric ? parseFloat(v) || 0 : v);
    setOpen(false);
  }
  function cancel() {
    setOpen(false);
  }
  if (open) return /* @__PURE__ */ React.createElement("div", { style: { flex: fullWidth ? "1 1 100%" : "1 1 140px", background: "#0a1628", border: "2px solid #4a8aff", borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a8aff", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 } }, label), /* @__PURE__ */ React.createElement(
    "input",
    {
      autoFocus: true,
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") cancel();
      },
      style: { width: "100%", background: "#070b12", border: "1px solid #4a8aff", color: "#fff", borderRadius: 6, padding: "8px 10px", fontSize: large ? 18 : 14, fontFamily: "monospace", fontWeight: 700, boxSizing: "border-box", marginBottom: 8 }
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement("button", { onClick: save, style: { flex: 1, background: "#00e5a0", border: "none", color: "#000", borderRadius: 6, padding: "8px 0", cursor: "pointer", fontWeight: 700, fontSize: 13 } }, "\u2713 Salvar"), /* @__PURE__ */ React.createElement("button", { onClick: cancel, style: { flex: 1, background: "#1e2636", border: "1px solid #2a3450", color: "#aaa", borderRadius: 6, padding: "8px 0", cursor: "pointer", fontSize: 13 } }, "Cancelar")));
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: start,
      style: { flex: fullWidth ? "1 1 100%" : "1 1 140px", background: "#111622", border: "1px solid " + borderColor, borderRadius: 10, padding: 12, cursor: "pointer", userSelect: "none", transition: "border-color .15s" },
      onMouseEnter: (e) => e.currentTarget.style.borderColor = "#4a8aff55",
      onMouseLeave: (e) => e.currentTarget.style.borderColor = borderColor
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: highlight ? "#00e5a0" : "#5a6a8a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6, display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("span", { style: { color: "#2a4a7a" } }, "\u270E")),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: large ? 20 : 16, fontWeight: 700, color: "#e8f0ff" } }, value != null ? value : "\u2014", unit && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 400, color: "#5a6a8a", marginLeft: 3 } }, unit))
  );
}
function TimeField({ label, value, onSave }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  function fmt(r) {
    return r.length <= 2 ? r : r.slice(0, 2) + ":" + r.slice(2);
  }
  function handleKey(k) {
    if (k === "\u2190") {
      setRaw((r) => r.slice(0, -1));
      return;
    }
    if (k === "OK") {
      const f = fmt(raw);
      if (/^\d{2}:\d{2}$/.test(f)) {
        const hh = parseInt(f), mm = parseInt(f.slice(3));
        if (hh < 24 && mm < 60) {
          onSave(f);
        }
      }
      setOpen(false);
      return;
    }
    setRaw((r) => r.length < 4 ? r + String(k) : r);
  }
  if (open) return /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 140px", background: "#0a1628", border: "2px solid #4a8aff", borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a8aff", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 } }, label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, fontWeight: 700, color: "#e0e8ff", textAlign: "center", letterSpacing: ".1em", marginBottom: 10, fontVariantNumeric: "tabular-nums" } }, fmt(raw) || "--:--"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 8 } }, [1, 2, 3, 4, 5, 6, 7, 8, 9, "\u2190", 0, "OK"].map((k, i) => /* @__PURE__ */ React.createElement("button", { key: i, onClick: () => handleKey(k), style: { background: k === "OK" ? "#00e5a0" : k === "\u2190" ? "#1e2636" : "#111622", border: "1px solid " + (k === "OK" ? "#00e5a0" : "#2a3450"), color: k === "OK" ? "#000" : "#e0e8ff", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontSize: 16, fontWeight: 700, fontFamily: "monospace" } }, k))), /* @__PURE__ */ React.createElement("button", { onClick: () => setOpen(false), style: { width: "100%", background: "#1e2636", border: "1px solid #2a3450", color: "#aaa", borderRadius: 6, padding: "8px 0", cursor: "pointer", fontSize: 12 } }, "Cancelar"));
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => {
        setRaw("");
        setOpen(true);
      },
      style: { flex: "1 1 140px", background: "#111622", border: "1px solid #1a2235", borderRadius: 10, padding: 12, cursor: "pointer", userSelect: "none" },
      onMouseEnter: (e) => e.currentTarget.style.borderColor = "#4a8aff55",
      onMouseLeave: (e) => e.currentTarget.style.borderColor = "#1a2235"
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6, display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("span", { style: { color: "#2a4a7a" } }, "\u23F1")),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: "#e8f0ff", fontVariantNumeric: "tabular-nums" } }, value || "--:--")
  );
}
function TempModal({ zones, onClose, onSave }) {
  const [list, setList] = useState(() => zones.map((z, i) => __spreadProps(__spreadValues({}, z), { id: i, editingVal: false, draft: "" })));
  const [nid, setNid] = useState(zones.length);
  const [ctxId, setCtxId] = useState(null);
  const timers = useRef({});
  function lp(id) {
    return {
      onMouseDown: () => {
        timers.current[id] = setTimeout(() => setCtxId(id), 700);
      },
      onMouseUp: () => clearTimeout(timers.current[id]),
      onMouseLeave: () => clearTimeout(timers.current[id]),
      onTouchStart: () => {
        timers.current[id] = setTimeout(() => setCtxId(id), 700);
      },
      onTouchEnd: () => clearTimeout(timers.current[id])
    };
  }
  return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000d", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, onClick: () => setCtxId(null) }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 14, padding: 22, width: "100%", maxWidth: 440, maxHeight: "88vh", overflowY: "auto" }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#e0e8ff" } }, "\u{1F321} Zonas de Temperatura"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { background: "transparent", border: "none", color: "#7a8aaa", cursor: "pointer", fontSize: 18 } }, "\u2715")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a4a6a", marginBottom: 16 } }, "Segure para excluir uma zona"), list.map((z, i) => /* @__PURE__ */ React.createElement("div", __spreadProps(__spreadValues({ key: z.id }, lp(z.id)), { style: { background: "#111622", border: "1px solid #1e2636", borderRadius: 10, padding: "12px 14px", marginBottom: 10, userSelect: "none" } }), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: z.name,
      onChange: (e) => setList((l) => l.map((x) => x.id === z.id ? __spreadProps(__spreadValues({}, x), { name: e.target.value }) : x)),
      onClick: (e) => e.stopPropagation(),
      style: { width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #2a3a4a", color: "#e0e8ff", fontSize: 13, fontFamily: "monospace", fontWeight: 600, padding: "2px 0 4px", marginBottom: 12, boxSizing: "border-box" }
    }
  ), z.editingVal ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      autoFocus: true,
      value: z.draft,
      type: "number",
      placeholder: "\xB0C",
      onChange: (e) => setList((l) => l.map((x) => x.id === z.id ? __spreadProps(__spreadValues({}, x), { draft: e.target.value }) : x)),
      onKeyDown: (e) => {
        if (e.key === "Enter") setList((l) => l.map((x) => x.id === z.id ? __spreadProps(__spreadValues({}, x), { value: parseFloat(x.draft) || 0, editingVal: false }) : x));
      },
      onClick: (e) => e.stopPropagation(),
      style: { flex: 1, background: "#0a1628", border: "1px solid #4a8aff", color: "#fff", borderRadius: 6, padding: "7px 10px", fontSize: 16, fontFamily: "monospace", fontWeight: 700 }
    }
  ), /* @__PURE__ */ React.createElement("span", { style: { color: "#5a6a8a", fontSize: 12 } }, "\xB0C"), /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
    e.stopPropagation();
    setList((l) => l.map((x) => x.id === z.id ? __spreadProps(__spreadValues({}, x), { value: parseFloat(x.draft) || 0, editingVal: false }) : x));
  }, style: { background: "#00e5a022", border: "1px solid #00e5a055", color: "#00e5a0", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 } }, "\u2713"), /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
    e.stopPropagation();
    setList((l) => l.map((x) => x.id === z.id ? __spreadProps(__spreadValues({}, x), { editingVal: false }) : x));
  }, style: { background: "#1a1f2e", border: "1px solid #2a3450", color: "#aaa", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 } }, "\u2715")) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 26, fontWeight: 700, color: "#f5a623", fontVariantNumeric: "tabular-nums" } }, z.value, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 400, color: "#5a6a8a", marginLeft: 3 } }, "\xB0C")), /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
    e.stopPropagation();
    setList((l) => l.map((x) => x.id === z.id ? __spreadProps(__spreadValues({}, x), { editingVal: true, draft: "" }) : x));
  }, style: { background: "#1a2636", border: "1px solid #2a4a6a", color: "#4a8aff", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontFamily: "monospace" } }, "\u270E Editar \xB0C")))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setList((l) => [...l, { id: nid, name: "Nova Zona", value: 0, editingVal: false, draft: "" }]);
    setNid((n) => n + 1);
  }, style: { width: "100%", background: "#1a2636", border: "1px dashed #2a4a6a", color: "#4a8aff", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontSize: 13, marginBottom: 12, fontFamily: "monospace" } }, "+ Adicionar zona"), /* @__PURE__ */ React.createElement("button", { onClick: () => onSave(list.map(({ name, value }) => ({ name, value }))), style: { width: "100%", background: "#00e5a0", border: "none", color: "#000", borderRadius: 8, padding: "11px 0", cursor: "pointer", fontWeight: 700, fontSize: 14 } }, "\u2713 Confirmar")), ctxId !== null && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }, onClick: () => setCtxId(null) }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #ff4d6d55", borderRadius: 12, padding: 22, minWidth: 230 }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7a8aaa", marginBottom: 16 } }, "O que deseja fazer?"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setList((l) => l.filter((x) => x.id !== ctxId));
    setCtxId(null);
  }, style: { display: "block", width: "100%", background: "#ff4d6d18", border: "1px solid #ff4d6d44", color: "#ff4d6d", borderRadius: 8, padding: "11px 0", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "monospace", marginBottom: 8 } }, "\u{1F5D1} Apagar esta zona"), /* @__PURE__ */ React.createElement("button", { onClick: () => setCtxId(null), style: { display: "block", width: "100%", background: "#1e2636", border: "1px solid #2a3450", color: "#7a8aaa", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "Cancelar"))));
}
function StatusModal({ current, onSelect, onClose }) {
  return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000d", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 14, padding: 24, width: "100%", maxWidth: 320 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff", marginBottom: 18 } }, "Alterar status da m\xE1quina"), Object.entries(ST).map(([key, cfg]) => /* @__PURE__ */ React.createElement("button", { key, onClick: () => onSelect(key), style: { display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 10, background: current === key ? cfg.bg : "#111622", border: "1px solid " + (current === key ? cfg.color + "99" : "#1e2636"), color: cfg.color, borderRadius: 10, padding: "12px 16px", cursor: "pointer", fontFamily: "monospace", fontSize: 13, fontWeight: 700, textAlign: "left" } }, /* @__PURE__ */ React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: cfg.color, display: "inline-block", boxShadow: "0 0 6px " + cfg.color } }), cfg.label, current === key && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "auto", fontSize: 10, opacity: 0.6 } }, "\u25CF atual"))), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { width: "100%", background: "#1e2636", border: "1px solid #2a3450", color: "#7a8aaa", borderRadius: 10, padding: "10px 0", cursor: "pointer", fontSize: 13, fontFamily: "monospace", marginTop: 4 } }, "Cancelar")));
}
function HistoryScreen({ machines, singleMachine, summaryMode, onBack, onDeleteRecord, onUpdateRecord }) {
  const [tab, setTab] = useState(summaryMode ? "shifts" : "machine");
  const [snap, setSnap] = useState(null);
  const [editRec, setEditRec] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const allRecs = singleMachine ? (singleMachine.history || []).map((h) => __spreadProps(__spreadValues({}, h), { _name: singleMachine.name })) : machines.flatMap((m) => (m.history || []).map((h) => __spreadProps(__spreadValues({}, h), { _name: m.name })));
  const histA = allRecs.filter((r) => r.turno === "A").sort((a, b) => b.date.localeCompare(a.date));
  const histB = allRecs.filter((r) => r.turno === "B").sort((a, b) => b.date.localeCompare(a.date));
  const totalA = histA.reduce((s, r) => s + (r.producaoReal || 0), 0);
  const totalB = histB.reduce((s, r) => s + (r.producaoReal || 0), 0);
  const MACHINE_FIELDS = [["Operador", "operador"], ["Status", "statusLabel"], ["Produto", "produto"], ["Ordem", "orderId"], ["In\xEDcio", "inicio"], ["T\xE9rmino", "termino"], ["Velocidade", "velocidade"], ["M\xE9tricas", "_metricas"]];
  const SHIFTS_FIELDS = [["Ciclo", "ciclo"], ["Ciclos per\xEDodo", "ciclosPeriodo"], ["Produ\xE7\xE3o real", "producaoReal"], ["Diferen\xE7a (p\xE7s)", "diferenca"], ["Peso total (kg)", "pesoTotal"], ["Perda material (kg)", "perdaKg"]];
  function openEdit(r) {
    setEditDraft(__spreadValues({}, r));
    setEditRec(r);
  }
  function saveEdit() {
    onUpdateRecord && onUpdateRecord(editRec, editDraft);
    setEditRec(null);
  }
  function RowActions({ r }) {
    if (!onDeleteRecord && !onUpdateRecord) return null;
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexShrink: 0 } }, onUpdateRecord && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          openEdit(r);
        },
        style: { background: "#4a8aff12", border: "1px solid #4a8aff44", color: "#4a8aff", borderRadius: 8, padding: "7px 9px", cursor: "pointer", fontSize: 14 },
        title: "Editar"
      },
      "\u270E"
    ), onDeleteRecord && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          setConfirmDelete(r);
        },
        style: { background: "#ff4d6d12", border: "1px solid #ff4d6d44", color: "#ff4d6d", borderRadius: 8, padding: "7px 9px", cursor: "pointer", fontSize: 14 },
        title: "Apagar"
      },
      "\u{1F5D1}"
    ));
  }
  function TurnoGroup({ records, ti, total, showFields }) {
    return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: ti.color, display: "inline-block", boxShadow: "0 0 6px " + ti.color } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: ti.color, textTransform: "uppercase", letterSpacing: ".1em" } }, ti.label, " \xB7 ", ti.time)), records.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#3a4a6a", paddingLeft: 16, marginBottom: 12 } }, "Sem registros."), records.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#0d1117", border: "1px solid " + ti.color + "22", borderRadius: 12, marginBottom: 10, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #1a2235", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { onClick: () => setSnap(__spreadProps(__spreadValues({}, r), { _showFields: showFields })), style: { flex: 1, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a", marginBottom: 2 } }, r.date), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#e0e8ff" } }, !singleMachine && /* @__PURE__ */ React.createElement("span", { style: { color: ti.color, marginRight: 6 } }, r._name), r.produto), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a6a8a" } }, r.operador)), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right", marginRight: 6, cursor: "pointer" }, onClick: () => setSnap(__spreadProps(__spreadValues({}, r), { _showFields: showFields })) }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: ti.color } }, r.producaoReal || 0), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a" } }, "p\xE7s \xB7 ver \u2192")), /* @__PURE__ */ React.createElement(RowActions, { r })), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 1, background: "#1a2235" } }, showFields.filter(([, k]) => k !== "_metricas" && k !== "velocidade").map(([label, key]) => {
      var _a;
      return /* @__PURE__ */ React.createElement("div", { key, style: { background: "#0d1117", padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 } }, label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: "#c8d8f0" } }, (_a = r[key]) != null ? _a : "\u2014", key === "ciclo" ? "s" : key === "velocidade" ? " m/min" : ""));
    }), showFields.some(([, k]) => k === "_metricas") && (r.metricas || []).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", padding: "8px 10px", gridColumn: "1 / -1" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 } }, "\u{1F4CA} M\xE9tricas"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } }, (r.metricas || []).map((z, zi) => /* @__PURE__ */ React.createElement("span", { key: zi, style: { background: "#111622", borderRadius: 5, padding: "3px 8px", fontSize: 11, color: "#f5a623", fontWeight: 600 } }, z.name, ": ", z.value, "\xB0C")), r.velocidade != null && /* @__PURE__ */ React.createElement("span", { style: { background: "#111622", borderRadius: 5, padding: "3px 8px", fontSize: 11, color: "#4a8aff", fontWeight: 600 } }, "Vel.: ", r.velocidade, " m/min")))))), records.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, background: ti.bg, border: "1px solid " + ti.color + "44", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: ti.color, textTransform: "uppercase", letterSpacing: ".08em" } }, "Total ", ti.label), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 20, fontWeight: 700, color: ti.color } }, total.toLocaleString("pt-BR"), " p\xE7s")), onDeleteRecord && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (window.confirm("Apagar TODOS os registros do " + ti.label + "?")) records.forEach((r) => onDeleteRecord(r));
        },
        style: { background: "#ff4d6d12", border: "1px solid #ff4d6d33", color: "#ff4d6d", borderRadius: 8, padding: "10px 12px", cursor: "pointer", fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap" }
      },
      "\u{1F5D1} todos"
    )));
  }
  const EDITABLE_KEYS = [["Operador", "operador"], ["Produto", "produto"], ["Ordem", "orderId"], ["In\xEDcio", "inicio"], ["T\xE9rmino", "termino"], ["Ciclo (s)", "ciclo"], ["Produ\xE7\xE3o real", "producaoReal"], ["Diferen\xE7a", "diferenca"], ["Peso total (kg)", "pesoTotal"], ["Perda material (kg)", "perdaKg"], ["Velocidade (m/min)", "velocidade"]];
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", padding: "24px 16px 40px" } }, /* @__PURE__ */ React.createElement("style", null, `@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}`), snap && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000e", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, onClick: () => setSnap(null) }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0a0e18", border: "2px solid " + turnoInfo(snap.turno).color + "55", borderRadius: 16, padding: 22, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: turnoInfo(snap.turno).color, fontWeight: 700, textTransform: "uppercase" } }, turnoInfo(snap.turno).label, " \xB7 ", turnoInfo(snap.turno).time), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#e0e8ff", marginTop: 2 } }, snap._name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a6a8a" } }, snap.date)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, onUpdateRecord && /* @__PURE__ */ React.createElement("button", { onClick: () => {
    openEdit(snap);
    setSnap(null);
  }, style: { background: "#4a8aff12", border: "1px solid #4a8aff44", color: "#4a8aff", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 } }, "\u270E"), onDeleteRecord && /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setConfirmDelete(snap);
    setSnap(null);
  }, style: { background: "#ff4d6d12", border: "1px solid #ff4d6d44", color: "#ff4d6d", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 } }, "\u{1F5D1}"), /* @__PURE__ */ React.createElement("button", { onClick: () => setSnap(null), style: { background: "transparent", border: "none", color: "#7a8aaa", cursor: "pointer", fontSize: 20 } }, "\u2715"))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 } }, [["Operador", snap.operador], ["Status", snap.statusLabel], ["Produto", snap.produto], ["Ordem", snap.orderId], ["In\xEDcio", snap.inicio], ["T\xE9rmino", snap.termino], ["Ciclo", snap.ciclo + "s"], ["Ciclos per\xEDodo", (snap.ciclosPeriodo || 0) + " p\xE7s"], ["Produ\xE7\xE3o real", (snap.producaoReal || 0) + " p\xE7s"], ["Diferen\xE7a", (snap.diferenca || 0) + " p\xE7s"], ["Peso total", (snap.pesoTotal || 0) + " kg"], ["Perda mat.", (snap.perdaKg || 0) + " kg"]].map(([k, v]) => /* @__PURE__ */ React.createElement("div", { key: k, style: { background: "#111622", borderRadius: 8, padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 } }, k), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "#e0e8ff" } }, v != null ? v : "\u2014")))), ((snap.metricas || []).length > 0 || snap.velocidade != null) && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", borderRadius: 8, padding: "10px 12px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 } }, "\u{1F4CA} M\xE9tricas"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, (snap.metricas || []).map((z, zi) => /* @__PURE__ */ React.createElement("div", { key: zi, style: { background: "#111622", borderRadius: 6, padding: "5px 9px", fontSize: 11, color: "#f5a623", fontWeight: 700 } }, z.name, ": ", z.value, "\xB0C")), snap.velocidade != null && /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 6, padding: "5px 9px", fontSize: 11, color: "#4a8aff", fontWeight: 700 } }, "Vel.: ", snap.velocidade, " m/min"))))), editRec && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000e", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "2px solid #4a8aff55", borderRadius: 14, padding: 22, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#e0e8ff" } }, "\u270E Editar registro"), /* @__PURE__ */ React.createElement("button", { onClick: () => setEditRec(null), style: { background: "transparent", border: "none", color: "#7a8aaa", cursor: "pointer", fontSize: 18 } }, "\u2715")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a6a8a", marginBottom: 16 } }, editRec._name, " \xB7 ", editRec.date), EDITABLE_KEYS.map(([label, key]) => {
    var _a;
    return /* @__PURE__ */ React.createElement("div", { key, style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a6a8a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 5 } }, label), /* @__PURE__ */ React.createElement(
      "input",
      {
        value: (_a = editDraft[key]) != null ? _a : "",
        onChange: (e) => setEditDraft((d) => __spreadProps(__spreadValues({}, d), { [key]: e.target.value })),
        style: { width: "100%", background: "#111622", border: "1px solid #2a3a50", color: "#e0e8ff", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box" }
      }
    ));
  }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 18 } }, /* @__PURE__ */ React.createElement("button", { onClick: saveEdit, style: { flex: 1, background: "#00e5a0", border: "none", color: "#000", borderRadius: 8, padding: "11px 0", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "monospace" } }, "\u2713 Salvar"), /* @__PURE__ */ React.createElement("button", { onClick: () => setEditRec(null), style: { flex: 1, background: "#1e2636", border: "1px solid #2a3450", color: "#aaa", borderRadius: 8, padding: "11px 0", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "Cancelar")))), confirmDelete && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000e", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "2px solid #ff4d6d55", borderRadius: 14, padding: 24, width: "100%", maxWidth: 320 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff", marginBottom: 6 } }, "Apagar registro?"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7a8aaa", marginBottom: 4 } }, confirmDelete._name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#e0e8ff", marginBottom: 4 } }, confirmDelete.produto), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a6a8a", marginBottom: 18 } }, confirmDelete.date), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        onDeleteRecord && onDeleteRecord(confirmDelete);
        setConfirmDelete(null);
      },
      style: { display: "block", width: "100%", background: "#ff4d6d", border: "none", color: "#fff", borderRadius: 8, padding: "12px 0", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "monospace", marginBottom: 8 }
    },
    "\u{1F5D1} Confirmar exclus\xE3o"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setConfirmDelete(null),
      style: { display: "block", width: "100%", background: "#1e2636", border: "1px solid #2a3450", color: "#7a8aaa", borderRadius: 8, padding: "11px 0", cursor: "pointer", fontSize: 13, fontFamily: "monospace" }
    },
    "Cancelar"
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 22 } }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, style: { background: "#1a1f2e", border: "1px solid #2a3450", color: "#8a9abc", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "\u2190 Voltar"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".12em" } }, "Hist\xF3rico"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#e0e8ff" } }, singleMachine ? singleMachine.name : "Todas as M\xE1quinas"))), !summaryMode && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 20 } }, [["machine", "\u{1F527} M\xE1quina e Produ\xE7\xE3o"], ["shifts", "\u{1F4CA} Turnos e Dias"]].map(([k, l]) => /* @__PURE__ */ React.createElement("button", { key: k, onClick: () => setTab(k), style: { flex: 1, background: tab === k ? "#1e3050" : "#111622", border: "1px solid " + (tab === k ? "#4a8aff88" : "#1e2636"), color: tab === k ? "#7ab8ff" : "#5a6a8a", borderRadius: 10, padding: "10px 0", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "monospace" } }, l))), tab === "machine" && !summaryMode && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(TurnoGroup, { records: histA, ti: TA, total: totalA, showFields: MACHINE_FIELDS }), /* @__PURE__ */ React.createElement("div", { style: { height: 1, background: "#1e2636", margin: "8px 0 20px" } }), /* @__PURE__ */ React.createElement(TurnoGroup, { records: histB, ti: TB, total: totalB, showFields: MACHINE_FIELDS })), (tab === "shifts" || summaryMode) && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(TurnoGroup, { records: histA, ti: TA, total: totalA, showFields: SHIFTS_FIELDS }), /* @__PURE__ */ React.createElement("div", { style: { height: 1, background: "#1e2636", margin: "8px 0 20px" } }), /* @__PURE__ */ React.createElement(TurnoGroup, { records: histB, ti: TB, total: totalB, showFields: SHIFTS_FIELDS })), allRecs.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px 0", color: "#3a4a6a", fontSize: 13 } }, "Nenhuma finaliza\xE7\xE3o registrada ainda."));
}