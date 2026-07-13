
function Detail({ machine, machines, users: machines_users, session, onBack, onUpdate, onFinalize }) {
  var _a, _b, _c, _d, _e, _f;
  const [m, setM] = useState(() => JSON.parse(JSON.stringify(machine)));
  const [showStatus, setShowStatus] = useState(false);
  const [showTemp, setShowTemp] = useState(false);
  const [observation, setObservation] = useState(machine.observation || "");
  const saveObservation = (val) => {
    setObservation(val);
    const updated = __spreadProps(__spreadValues({}, m), { observation: val });
    setM(updated);
    onUpdate(updated);
  };
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  function save(updated) {
    setM(updated);
    onUpdate(updated);
  }
  function updField(patch) {
    save(__spreadValues(__spreadValues({}, m), patch));
  }
  function updJob(k, v) {
    save(__spreadProps(__spreadValues({}, m), { job: __spreadProps(__spreadValues({}, m.job), { [k]: v }) }));
  }
  function updMet(k, v) {
    save(__spreadProps(__spreadValues({}, m), { metrics: __spreadProps(__spreadValues({}, m.metrics), { [k]: v }) }));
  }
  const s = ST[m.status];
  const ppc = Math.max(1, parseInt(String((_b = (_a = m.job) == null ? void 0 : _a.piecesPerCycle) != null ? _b : 1)) || 1);
  const pw = parseFloat(String((_d = (_c = m.job) == null ? void 0 : _c.pieceWeight) != null ? _d : 0).replace(",", ".")) || 0;
  const cyclesTime = m.job ? calcCycles(m.job.startTime, m.job.estimatedEnd, m.job.cycleTime) : null;
  const cycles = cyclesTime != null ? cyclesTime * ppc : null;
  const autoProduced = m.job ? calcAutoProduced(m.job.startTime, m.job.cycleTime, ppc) : null;
  const real = (_f = (_e = m.job) == null ? void 0 : _e.produced) != null ? _f : 0;
  const progressValue = autoProduced != null ? Math.min(autoProduced, cycles != null ? cycles : autoProduced) : real;
  const diffQty = cycles != null ? cycles - real : null;
  const realKg = pw > 0 ? +(real * pw).toFixed(2) : null;
  const totalKg = cycles != null && pw > 0 ? +(cycles * pw).toFixed(2) : null;
  const lossKg = diffQty != null && diffQty > 0 && pw > 0 ? +(diffQty * pw).toFixed(2) : null;
  function selectStatus(ns) {
    let patch = { status: ns };
    if (ns === "running" && !m.job) patch.job = { orderId: "", product: "", produced: 0, startTime: "", estimatedEnd: "", cycleTime: "12", piecesPerCycle: 1, pieceWeight: 0 };
    save(__spreadValues(__spreadValues({}, m), patch));
    setShowStatus(false);
  }
  function handleFinalize() {
    var _a2, _b2, _c2, _d2, _e2, _f2, _g, _h, _i, _j, _k, _l;
    const now = /* @__PURE__ */ new Date();
    const turno = getTurnoFromStart((_a2 = m.job) == null ? void 0 : _a2.startTime) || getTurnoNow();
    let diaParaSalvar;
    if (turno === "B") {
      const hora = now.getHours();
      // Se é madrugada (00:00-16:59), o turno entrou ontem às 17h
      if (hora >= 0 && hora < 17) {
        const ontem = new Date(now);
        ontem.setDate(ontem.getDate() - 1);
        diaParaSalvar = ontem.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      } else {
        // 17:00-23:59: turno acabou de entrar hoje
        diaParaSalvar = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
    } else {
      diaParaSalvar = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    const dateStr = diaParaSalvar + ", " + pad(now.getHours()) + ":" + pad(now.getMinutes());
    try {
      if (m.operator && m.operator !== "\u2014") {
        const ops = JSON.parse(localStorage.getItem("canaleta_operators") || "[]");
        const updated2 = [m.operator, ...ops.filter((x) => x !== m.operator)].slice(0, 20);
        localStorage.setItem("canaleta_operators", JSON.stringify(updated2));
        salvarOperatorsFirebase(updated2);
      }
      if ((_b2 = m.job) == null ? void 0 : _b2.product) {
        const prods = JSON.parse(localStorage.getItem("canaleta_products") || "[]");
        const updated2 = [m.job.product, ...prods.filter((x) => x !== m.job.product)].slice(0, 30);
        localStorage.setItem("canaleta_products", JSON.stringify(updated2));
        salvarProductsFirebase(updated2);
      }
    } catch (e) {
    }
    const rec = {
      date: dateStr,
      turno,
      _name: m.name,
      maquina: m.name,
      operador: m.operator,
      statusLabel: s.label,
      produto: (_d2 = (_c2 = m.job) == null ? void 0 : _c2.product) != null ? _d2 : "\u2014",
      orderId: (_f2 = (_e2 = m.job) == null ? void 0 : _e2.orderId) != null ? _f2 : "\u2014",
      inicio: (_h = (_g = m.job) == null ? void 0 : _g.startTime) != null ? _h : "\u2014",
      termino: (_j = (_i = m.job) == null ? void 0 : _i.estimatedEnd) != null ? _j : "\u2014",
      ciclo: (_l = (_k = m.job) == null ? void 0 : _k.cycleTime) != null ? _l : "\u2014",
      ciclosPeriodo: cycles != null ? cycles : 0,
      producaoReal: real,
      diferenca: diffQty != null ? diffQty : 0,
      pesoTotal: realKg != null ? realKg : 0,
      perdaKg: lossKg != null ? lossKg : 0,
      metricas: [...m.metrics.tempZones || []],
      velocidade: m.metrics.speed || 0,
      rpmExtrusora: m.metrics.rpmExtrusora || 0,
      rpmPuxador: m.metrics.rpmPuxador || 0,
      amperagem: m.metrics.amperagem || 0,
      observacao: observation.trim()
    };
    const updated = __spreadProps(__spreadValues({}, m), { observation: "", history: [...m.history, rec] });
    setObservation("");
    onUpdate(updated);
    salvarRegistroFirebase(m.id, m.name, rec);
    try {
      gerarPDFTurno(rec, m.name);
    } catch (e) {
    }
    onFinalize();
  }
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPass, setUnlockPass] = useState("");
  const [unlockErr, setUnlockErr] = useState("");
  const { jaFinalizado, precisaSenha } = (() => {
    var _a2, _b2;
    if (m.status !== "running" || !m.job) return { jaFinalizado: false, precisaSenha: false };
    // Turno determinado pelo horário de início configurado na máquina
    const turnoMaquina = getTurnoFromStart((_a2 = m.job) == null ? void 0 : _a2.startTime);
    const produto = ((_b2 = m.job.product) == null ? void 0 : _b2.trim()) || "";
    const ordem = ((m.job.orderId) == null ? void 0 : m.job.orderId.trim()) || "";
    const foiFinalizadoNaJanela = (m.history || []).some((h) => {
      var _a3, _b3;
      if (h.turno !== turnoMaquina) return false;
      if (((_a3 = h.produto) == null ? void 0 : _a3.trim()) !== produto) return false;
      if (((_b3 = h.orderId) == null ? void 0 : _b3.trim()) !== ordem) return false;
      return true;
    });
    return {
      jaFinalizado: foiFinalizadoNaJanela,
      precisaSenha: false
    };
  })();
  const turnoAtualLabel = getTurnoNow() === "A" ? "Turno A" : "Turno B";
  function tryUnlock() {
    const allowed = (machines_users || USERS).filter(
      (u) => u.role === "admin" || u.role === "encarregado"
    );
    const ok = allowed.some((u) => u.pass === unlockPass);
    if (ok) {
      setShowUnlockModal(false);
      setUnlockPass("");
      setUnlockErr("");
      handleFinalize();
    } else {
      setUnlockErr("Senha incorreta. Digite a senha do administrador ou encarregado.");
    }
  }
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100%", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", paddingBottom: 80 } }, /* @__PURE__ */ React.createElement("style", null, `@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}} input{outline:none}`), showStatus && /* @__PURE__ */ React.createElement(StatusModal, { current: m.status, onSelect: selectStatus, onClose: () => setShowStatus(false) }), showTemp && /* @__PURE__ */ React.createElement(TempModal, { zones: m.metrics.tempZones || [], onClose: () => setShowTemp(false), onSave: (z) => {
    updMet("tempZones", z);
    setShowTemp(false);
  } }), showUnlockModal && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000d", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #f5a62344", borderRadius: 16, padding: 24, width: "100%", maxWidth: 320 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#e0e8ff", marginBottom: 6 } }, "\u{1F510} Autoriza\xE7\xE3o necess\xE1ria"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#5a6a8a", marginBottom: 18, lineHeight: 1.5 } }, "Esta produ\xE7\xE3o j\xE1 foi finalizada neste turno.", /* @__PURE__ */ React.createElement("br", null), "Digite a senha do ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#f5a623" } }, "administrador"), " ou ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#f5a623" } }, "encarregado"), " para liberar."), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", marginBottom: 14 } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "password",
      autoFocus: true,
      value: unlockPass,
      onChange: (e) => {
        setUnlockPass(e.target.value);
        setUnlockErr("");
      },
      onKeyDown: (e) => {
        if (e.key === "Enter") tryUnlock();
        if (e.key === "Escape") {
          setShowUnlockModal(false);
          setUnlockPass("");
          setUnlockErr("");
        }
      },
      placeholder: "Senha de autoriza\xE7\xE3o",
      style: { width: "100%", background: "#111622", border: "1px solid " + (unlockErr ? "#ff4d6d" : "#2a3450"), color: "#e0e8ff", borderRadius: 8, padding: "11px 14px", fontSize: 14, fontFamily: "monospace", boxSizing: "border-box" }
    }
  )), unlockErr && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ff4d6d", marginBottom: 12, lineHeight: 1.4 } }, unlockErr), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: tryUnlock,
      style: { flex: 1, background: "linear-gradient(135deg,#6a3a00,#aa6a00)", border: "1px solid #f5a62344", color: "#fff8e0", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "monospace" }
    },
    "Autorizar \u2713"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setShowUnlockModal(false);
        setUnlockPass("");
        setUnlockErr("");
      },
      style: { flex: 1, background: "#1e2636", border: "1px solid #2a3450", color: "#7a8aaa", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontSize: 13, fontFamily: "monospace" }
    },
    "Cancelar"
  )))), /* @__PURE__ */ React.createElement("div", { style: { background: "linear-gradient(180deg,#0d1520 0%,#070b12 100%)", borderBottom: "1px solid #1e2636", padding: "14px 16px 16px", marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "\u2039 voltar"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".14em" } }, "Canaleta \xB7 ", m.id)), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "Nome da m\xE1quina", value: m.name, onSave: (v) => updField({ name: v }), large: true })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowStatus(true), style: { background: s.bg, border: "1px solid " + s.color + "66", color: s.color, borderRadius: 20, padding: "6px 16px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "monospace" } }, /* @__PURE__ */ React.createElement("span", { style: __spreadValues({ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block", boxShadow: "0 0 6px " + s.color }, m.status === "running" ? { animation: "blink 1.6s infinite" } : {}) }), s.label, " \u25BE"))), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#2a4a6a", marginBottom: 16 } }, "\u270E Toque em qualquer campo para editar"), (session && (session.role === "admin" || session.role === "encarregado")) && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #4a8aff22", borderRadius: 12, padding: "12px 14px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 } }, "\uD83D\uDD17 Operador vinculado"), /* @__PURE__ */ React.createElement("select", { value: m.operadorVinculado || "", onChange: (e) => updField({ operadorVinculado: e.target.value }), style: { width: "100%", background: "#111622", border: "1px solid #4a8aff44", color: "#7ab8ff", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "monospace", appearance: "none", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 Sem operador vinculado \u2014"), (machines_users || []).filter((u) => !u.isDemo && u.role === "operador").map((u) => /* @__PURE__ */ React.createElement("option", { key: u.user, value: u.user }, u.name, " (", u.user, ")")))), (m.status === "maintenance" || m.status === "idle") && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid " + s.color + "33", borderRadius: 14, padding: 20, marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: s.color, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 14 } }, m.status === "maintenance" ? "\u{1F527} Motivo da manuten\xE7\xE3o" : "\u23F3 Motivo da espera"), /* @__PURE__ */ React.createElement(Field, { label: "Descri\xE7\xE3o", value: m.maintenanceNote || "\u2014", onSave: (v) => updField({ maintenanceNote: v }), fullWidth: true, large: true }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, fontSize: 11, color: "#3a4a6a" } }, "Para ver campos de produ\xE7\xE3o, mude o status para ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#00e5a0" } }, "Em opera\xE7\xE3o"), ".")), m.status === "running" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 } }, /* @__PURE__ */ React.createElement((() => { const vUser = (machines_users || []).find((u) => u.user === m.operadorVinculado); const isOp = session && session.role === "operador"; if (isOp && vUser) return () => React.createElement("div", { style: { flex: "1 1 180px", background: "#0d1117", border: "1px solid #00e5a033", borderRadius: 10, padding: 14 } }, React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Operador"), React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#00e5a0" } }, vUser.name)); return () => React.createElement(AutocompleteField, { label: "Operador", value: m.operator, onSave: (v) => updField({ operator: v }), storageKey: "canaleta_operators", large: true, highlight: true }); })(), null), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 140px", background: "#0d1117", border: "1px solid #1e2636", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Hor\xE1rio"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: 700, color: "#e0e8ff", fontVariantNumeric: "tabular-nums" } }, /* @__PURE__ */ React.createElement(LiveClock, null)))), m.job && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 14, marginBottom: 16 } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { borderBottom: "1px solid #1e2636", padding: "16px 16px 14px", cursor: "pointer" },
      onMouseEnter: (e) => e.currentTarget.style.background = "#0d1520",
      onMouseLeave: (e) => e.currentTarget.style.background = ""
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6, display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "\u25B6 Produ\xE7\xE3o em curso")),
    /* @__PURE__ */ React.createElement(AutocompleteField, { label: "Produto", value: m.job.product, onSave: (v) => updJob("product", v), storageKey: "canaleta_products", large: true, fullWidth: true })
  ), /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 16px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 } }, /* @__PURE__ */ React.createElement(Field, { label: "Ordem", value: m.job.orderId, onSave: (v) => updJob("orderId", v) }), /* @__PURE__ */ React.createElement(TimeField, { label: "In\xEDcio", value: m.job.startTime, onSave: (v) => updJob("startTime", v) }), /* @__PURE__ */ React.createElement(TimeField, { label: "T\xE9rmino prev.", value: m.job.estimatedEnd, onSave: (v) => updJob("estimatedEnd", v) }), /* @__PURE__ */ React.createElement(Field, { label: "Ciclo (seg)", value: m.job.cycleTime, onSave: (v) => updJob("cycleTime", v), numeric: true }), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 140px", background: "#111622", border: "1px solid #00e5a033", borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Meta do per\xEDodo"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 700, color: "#00e5a0" } }, cycles != null ? cycles.toLocaleString("pt-BR") : "\u2014", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 400, color: "#5a6a8a", marginLeft: 4 } }, "p\xE7s")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5a4a", marginTop: 4 } }, cyclesTime != null ? cyclesTime : 0, " ciclos \xD7 ", ppc, " p\xE7/ciclo"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 } }, /* @__PURE__ */ React.createElement(Field, { label: "Produ\xE7\xE3o real", value: m.job.produced, unit: "p\xE7s", onSave: (v) => updJob("produced", parseInt(v) || 0), numeric: true }), /* @__PURE__ */ React.createElement(Field, { label: "Peso da pe\xE7a", value: m.job.pieceWeight, unit: "kg", onSave: (v) => updJob("pieceWeight", parseFloat(v) || 0), numeric: true }), /* @__PURE__ */ React.createElement(Field, { label: "P\xE7s por ciclo", value: m.job.piecesPerCycle, onSave: (v) => updJob("piecesPerCycle", parseInt(v) || 1), numeric: true })), cycles != null && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7a8aaa", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", null, "Progresso atual"), /* @__PURE__ */ React.createElement("span", { style: { color: progressValue >= (cycles || 1) ? "#00e5a0" : "#4a8aff", fontWeight: 700 } }, progressValue, " / ", cycles != null ? cycles : 0, " p\xE7s (", cycles > 0 ? Math.round(progressValue / (cycles || 1) * 100) : 0, "%)")), /* @__PURE__ */ React.createElement(Bar, { value: progressValue, max: cycles || 1, color: progressValue >= (cycles || 1) ? "#00e5a0" : "#4a8aff" }), autoProduced != null && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5a7a", marginTop: 4, textAlign: "right" } }, "\u2191 contagem autom\xE1tica \xB7 atualiza com o rel\xF3gio")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 140px", background: "#111622", border: "1px solid #00e5a033", borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#00e5a066", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Peso produzido"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: "#00e5a0" } }, realKg != null ? parseFloat(realKg).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "\u2014", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 400, color: "#5a6a8a", marginLeft: 4 } }, "kg")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5a4a", marginTop: 3 } }, real, " p\xE7s \xD7 ", pw, " kg/p\xE7")), cycles != null && /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 140px", background: "#111622", border: "1px solid #f5a62322", borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#f5a62366", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Peso meta"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: "#f5a623" } }, totalKg != null ? parseFloat(totalKg).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "\u2014", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 400, color: "#5a6a8a", marginLeft: 4 } }, "kg")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a4a2a", marginTop: 3 } }, cycles, " p\xE7s \xD7 ", pw, " kg/p\xE7"))), cycles != null && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 140px", background: diffQty > 0 ? "#ff4d6d12" : "#00e5a012", border: "1px solid " + (diffQty > 0 ? "#ff4d6d44" : "#00e5a033"), borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: diffQty > 0 ? "#ff6a80" : "#00e5a066", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Diferen\xE7a (p\xE7s)"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: diffQty > 0 ? "#ff4d6d" : "#00e5a0" } }, diffQty != null ? diffQty > 0 ? "\u2212" + diffQty : "+" + Math.abs(diffQty) : "\u2014", " p\xE7s")), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 140px", background: lossKg && lossKg > 0 ? "#ff4d6d12" : "#00e5a012", border: "1px solid " + (lossKg && lossKg > 0 ? "#ff4d6d44" : "#00e5a033"), borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: lossKg && lossKg > 0 ? "#ff6a80" : "#00e5a066", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Perda de material"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: lossKg && lossKg > 0 ? "#ff4d6d" : "#00e5a0" } }, lossKg && lossKg > 0 ? "\u2212" + parseFloat(lossKg).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00", " kg"))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 14, padding: "18px 16px", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 14 } }, "\u{1F4CA} M\xE9tricas"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "RPM Extrusora", value: m.metrics.rpmExtrusora, unit: "rpm", onSave: (v) => updMet("rpmExtrusora", parseFloat(v) || 0), numeric: true }), /* @__PURE__ */ React.createElement(Field, { label: "RPM Puxador", value: m.metrics.rpmPuxador, unit: "rpm", onSave: (v) => updMet("rpmPuxador", parseFloat(v) || 0), numeric: true }), /* @__PURE__ */ React.createElement(Field, { label: "Amperagem", value: m.metrics.amperagem, unit: "A", onSave: (v) => updMet("amperagem", parseFloat(v) || 0), numeric: true }), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { background: "#111622", border: "1px solid " + (m.metrics.temperature > 70 ? "#ff4d6d44" : "#1a2235"), borderRadius: 10, padding: "12px 14px", cursor: "pointer" },
      onClick: () => setShowTemp(true),
      onMouseEnter: (e) => e.currentTarget.style.borderColor = "#f5a62355",
      onMouseLeave: (e) => e.currentTarget.style.borderColor = m.metrics.temperature > 70 ? "#ff4d6d44" : "#1a2235"
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".1em" } }, "\u{1F321} Temperatura \xB7 Zonas"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, (m.metrics.tempZones || []).length > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#3a5a7a" } }, "m\xE9dia: ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#f5a623" } }, Math.round(m.metrics.tempZones.reduce((s2, z) => s2 + z.value, 0) / m.metrics.tempZones.length), "\xB0C")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#3a5a7a", background: "#0d1117", borderRadius: 6, padding: "3px 8px" } }, "+ editar \u25BE"))),
    (m.metrics.tempZones || []).length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 8 } }, [...m.metrics.tempZones || []].sort((a, b) => a.name.localeCompare(b.name)).map((z, i) => {
      const hot = z.value > 80;
      const warm = z.value > 60;
      const col = hot ? "#ff4d6d" : warm ? "#f5a623" : "#00e5a0";
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#0d1117", borderRadius: 8, padding: "8px 10px", border: "1px solid " + col + "33" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 } }, z.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: col, fontVariantNumeric: "tabular-nums" } }, z.value, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 400, color: "#5a6a8a", marginLeft: 2 } }, "\xB0C")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 5, height: 3, background: "#1a2235", borderRadius: 2 } }, /* @__PURE__ */ React.createElement("div", { style: { width: Math.min(100, Math.round(z.value / 120 * 100)) + "%", height: "100%", background: col, borderRadius: 2, transition: "width .4s" } })));
    })) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#2a3a4a", textAlign: "center", padding: "8px 0" } }, "Nenhuma zona configurada \u2014 toque para adicionar")
  )))), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid " + (listening ? "#ff4d6d44" : "#1e2636"), borderRadius: 14, marginBottom: 16, overflow: "hidden", transition: "border-color .2s" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #1a2235", background: "#0a0e18" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 30, height: 30, borderRadius: 8, background: "#1a2636", border: "1px solid #2a3a50", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "#4a8aff", strokeWidth: "2", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#e0e8ff" } }, "Observa\xE7\xE3o"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5a7a", marginTop: 1 } }, "Salvo ao finalizar o turno"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        var _a2;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
          alert("Use o Chrome no Android para reconhecimento de voz.");
          return;
        }
        if (listening) {
          (_a2 = recognitionRef.current) == null ? void 0 : _a2.stop();
          setListening(false);
          return;
        }
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          alert("Microfone bloqueado.\n\nToque no cadeado \u{1F512} na barra do endere\xE7o \u2192 Permiss\xF5es \u2192 Microfone \u2192 Permitir");
          return;
        }
        const rec = new SR();
        rec.lang = "pt-BR";
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let final = "", interim = "";
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
            else interim += e.results[i][0].transcript;
          }
          saveObservation((final + (interim ? "[\u2026" + interim + "]" : "")).trim());
        };
        rec.onerror = (e) => {
          setListening(false);
          if (e.error === "not-allowed") alert("Permiss\xE3o negada. Permita o microfone nas configura\xE7\xF5es do site.");
        };
        rec.onend = () => setListening(false);
        recognitionRef.current = rec;
        try {
          rec.start();
          setListening(true);
        } catch (e) {
          setListening(false);
        }
      },
      style: {
        background: listening ? "#ff4d6d" : "#1a2636",
        border: "1px solid " + (listening ? "#ff4d6d" : "#2a4a6a"),
        color: listening ? "#fff" : "#4a8aff",
        borderRadius: 10,
        padding: "8px 14px",
        cursor: "pointer",
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 7,
        boxShadow: listening ? "0 0 16px #ff4d6d55" : "none",
        animation: listening ? "blink 1.2s infinite" : "none"
      }
    },
    /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("rect", { x: "9", y: "2", width: "6", height: "12", rx: "3" }), /* @__PURE__ */ React.createElement("path", { d: "M5 10a7 7 0 0 0 14 0" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "19", x2: "12", y2: "22" })),
    listening ? "\u25A0 Parar" : "\u{1F3A4} Falar"
  )), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 16px 14px" } }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: observation,
      onChange: (e) => saveObservation(e.target.value),
      placeholder: listening ? "\u{1F3A4} Ouvindo... fale agora" : "Digite ou toque em Falar para usar o microfone...",
      rows: 4,
      style: {
        width: "100%",
        background: listening ? "#0d1117" : "#111622",
        border: "1px solid " + (listening ? "#ff4d6d33" : "#1e2636"),
        color: "#e0e8ff",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 13,
        fontFamily: "monospace",
        resize: "none",
        boxSizing: "border-box",
        lineHeight: 1.6,
        transition: "all .2s"
      },
      onFocus: (e) => e.target.style.borderColor = "#4a8aff55",
      onBlur: (e) => e.target.style.borderColor = listening ? "#ff4d6d33" : "#1e2636"
    }
  ), observation.trim() && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, display: "flex", justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => saveObservation(""),
      style: { background: "transparent", border: "none", color: "#3a4a6a", cursor: "pointer", fontSize: 11, fontFamily: "monospace" }
    },
    "limpar \u2715"
  )))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        if (!m.job || m.status !== "running") return;
        if (precisaSenha) {
          setUnlockPass("");
          setUnlockErr("");
          setShowUnlockModal(true);
        } else {
          handleFinalize();
        }
      },
      style: {
        display: "block",
        width: "100%",
        background: precisaSenha ? "linear-gradient(135deg,#3a2a00,#6a4a00)" : "linear-gradient(135deg,#1a3a6a,#2a5aaa)",
        border: precisaSenha ? "2px solid #f5a62344" : "2px solid #4a8aff88",
        color: precisaSenha ? "#fff8e0" : "#e0f0ff",
        borderRadius: 14,
        padding: "18px 0",
        cursor: "pointer",
        fontSize: 18,
        fontWeight: 900,
        fontFamily: "monospace",
        letterSpacing: ".1em",
        textTransform: "uppercase",
        boxShadow: precisaSenha ? "0 4px 24px #f5a62322" : "0 4px 24px #4a8aff22"
      }
    },
    precisaSenha ? "\u{1F510} FINALIZAR NOVAMENTE" : "\u2713 FINALIZAR TURNO"
  ), precisaSenha && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, textAlign: "center", fontSize: 11, color: "#7a5a2a", fontFamily: "monospace", lineHeight: 1.6 } }, turnoAtualLabel, " \xB7 J\xE1 finalizado nesta janela \xB7 Requer senha de autoriza\xE7\xE3o"), jaFinalizado && !precisaSenha && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, textAlign: "center", fontSize: 11, color: "#3a7a5a", fontFamily: "monospace", lineHeight: 1.6 } }, "\u2713 J\xE1 finalizado \xB7 Nova finaliza\xE7\xE3o liberada automaticamente")));
}
function Summary({ machines, onEnter, onOpenHistory, onExport, onImport, onGoDashboard, onLogout, session }) {
  const clock = useClock();
  const now = /* @__PURE__ */ new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const totalPcs = machines.reduce((a, m) => {
    var _a, _b;
    const c = m.job ? calcCycles(m.job.startTime, m.job.estimatedEnd, m.job.cycleTime) : null;
    return a + ((_b = c != null ? c : (_a = m.job) == null ? void 0 : _a.produced) != null ? _b : 0);
  }, 0);
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", padding: "24px 16px 40px" } }, /* @__PURE__ */ React.createElement("style", null, `@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}`), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 42, fontWeight: 700, color: "#e0e8ff", fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: ".04em", textShadow: "0 0 20px #4a8aff22" } }, /* @__PURE__ */ React.createElement(LiveClock, null), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 20, color: "#4a5a7a", marginLeft: 4 } })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#3a4a6a", marginTop: 4, textTransform: "capitalize" } }, dateStr)), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 24, marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#2a4a6a", letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 6 } }, "\u25C6 PRODU\xC7\xC3O DO DIA"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, fontWeight: 900, color: "#e0e8ff", lineHeight: 1, letterSpacing: "-.02em", textShadow: "0 0 50px #4a8aff22" } }, "CANALETA"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", marginTop: 12 } }, /* @__PURE__ */ React.createElement("button", { onClick: onEnter, style: { background: "transparent", border: "1px solid #2a4a6a", color: "#5a7a9a", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 11, fontFamily: "monospace", letterSpacing: ".08em" } }, "\u2699 painel"), onGoDashboard && /* @__PURE__ */ React.createElement("button", { onClick: onGoDashboard, style: { background: "transparent", border: "1px solid #1a3a2a", color: "#3a7a5a", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 11, fontFamily: "monospace" } }, "\u{1F4CA} produ\xE7\xE3o"), onLogout && /* @__PURE__ */ React.createElement("button", { onClick: onLogout, style: { background: "transparent", border: "1px solid #2a1a30", color: "#5a3a7a", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 11, fontFamily: "monospace" } }, "sair"))), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 14, overflow: "hidden", marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 90px 80px 44px" } }, ["M\xE1quina", "Real", "Ciclos", ""].map((h) => /* @__PURE__ */ React.createElement("div", { key: h, style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", padding: "10px 12px", borderBottom: "1px solid #1a2235", background: "#070b12" } }, h)), machines.map((m) => {
    var _a, _b;
    const s = ST[m.status];
    const cyc = m.job ? calcCycles(m.job.startTime, m.job.estimatedEnd, m.job.cycleTime) : null;
    const real = (_b = (_a = m.job) == null ? void 0 : _a.produced) != null ? _b : 0;
    const diff = cyc != null ? cyc - real : null;
    return [
      /* @__PURE__ */ React.createElement("div", { key: m.id + "n", style: { padding: "12px", borderBottom: "1px solid #1a2235", display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: __spreadValues({ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0, display: "inline-block", boxShadow: "0 0 5px " + s.color }, m.status === "running" ? { animation: "blink 1.6s infinite" } : {}) }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#dde8ff" } }, m.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: s.color } }, s.label), m.job && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a" } }, m.job.product))),
      /* @__PURE__ */ React.createElement("div", { key: m.id + "r", style: { padding: "12px", borderBottom: "1px solid #1a2235", textAlign: "right", verticalAlign: "middle", display: "flex", flexDirection: "column", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#00e5a0" } }, real.toLocaleString("pt-BR")), diff != null && diff > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ff4d6d" } }, "\u25BC", diff)),
      /* @__PURE__ */ React.createElement("div", { key: m.id + "c", style: { padding: "12px", borderBottom: "1px solid #1a2235", textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: "#7a8aaa" } }, cyc != null ? cyc.toLocaleString("pt-BR") : "\u2014")),
      /* @__PURE__ */ React.createElement("div", { key: m.id + "h", style: { padding: "12px", borderBottom: "1px solid #1a2235", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => onOpenHistory(m), style: { background: "#1a2636", border: "1px solid #2a4a6a", color: "#4a8aff", borderRadius: 7, padding: "5px 8px", cursor: "pointer", fontSize: 12 }, title: "Hist\xF3rico \u2014 apagar registros" }, "\u{1F4CB}"))
    ];
  }))), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".1em" } }, "Total produzido"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 24, fontWeight: 700, color: "#00e5a0" } }, totalPcs.toLocaleString("pt-BR"), " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#5a6a8a" } }, "p\xE7s"))), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "16px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a4a6a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 } }, "\u{1F4BE} Transferir dados"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: onExport, style: { flex: 1, background: "#1a2a3a", border: "1px solid #2a4a6a", color: "#7ab8ff", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 20 } }, "\u2B07"), /* @__PURE__ */ React.createElement("span", null, "Exportar dados"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, opacity: 0.6, fontWeight: 400 } }, "salva .json no celular")), /* @__PURE__ */ React.createElement("button", { onClick: onImport, style: { flex: 1, background: "#1a2a3a", border: "1px solid #2a4a6a", color: "#7ab8ff", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 20 } }, "\u2B06"), /* @__PURE__ */ React.createElement("span", null, "Importar dados"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, opacity: 0.6, fontWeight: 400 } }, "carrega .json salvo"))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#2a3a4a", marginTop: 10, textAlign: "center" } }, "Use Exportar para fazer backup ou transferir para outro dispositivo")));
}
function MainScreen({ machines, session, onOpenDetail, onOpenHistory, onAddMachine, onDeleteMachine, onGoSummary, filterStatus, setFilterStatus, hideClock }) {
  var _a;
  const [longPressId, setLongPressId] = useState(null);
  const timers = useRef({});
  const ORDER = { running: 0, idle: 1, maintenance: 2 };
  // Operador só vê a máquina vinculada ao seu login
  const isOperador = (session == null ? void 0 : session.role) === "operador";
  const machinesVisiveis = isOperador
    ? machines.filter((m) => m.operadorVinculado === (session == null ? void 0 : session.user))
    : machines;
  const sorted = [...machinesVisiveis].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const visible = filterStatus === "all" ? sorted : sorted.filter((m) => m.status === filterStatus);
  const counts = { running: machinesVisiveis.filter((m) => m.status === "running").length, idle: machinesVisiveis.filter((m) => m.status === "idle").length, maintenance: machinesVisiveis.filter((m) => m.status === "maintenance").length };
  function startLong(id) {
    if (!onDeleteMachine) return;
    timers.current[id] = setTimeout(() => setLongPressId(id), 700);
  }
  function cancelLong(id) {
    clearTimeout(timers.current[id]);
  }
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100%", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", padding: "20px 16px 80px" } }, /* @__PURE__ */ React.createElement("style", null, `@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}} input{outline:none}`), isOperador && machinesVisiveis.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", padding: "0 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\u2699\uFE0F"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#f5a623", marginBottom: 10 } }, "Nenhuma m\xE1quina atribu\xEDda"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#4a5a7a", lineHeight: 1.7 } }, "Aguarde o encarregado ou administrador vincular seu usu\xE1rio a uma m\xE1quina.")) : /* @__PURE__ */ React.createElement(React.Fragment, null, longPressId && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000d", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #ff4d6d55", borderRadius: 14, padding: 24, minWidth: 260 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#e0e8ff", fontWeight: 700, marginBottom: 8 } }, (_a = machines.find((m) => m.id === longPressId)) == null ? void 0 : _a.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7a8aaa", marginBottom: 18 } }, "O que deseja fazer?"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    onDeleteMachine(longPressId);
    setLongPressId(null);
  }, style: { display: "block", width: "100%", background: "#ff4d6d18", border: "1px solid #ff4d6d44", color: "#ff4d6d", borderRadius: 8, padding: "12px 0", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "monospace", marginBottom: 8 } }, "\u{1F5D1} Deletar m\xE1quina"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a", marginBottom: 8, lineHeight: 1.5 } }, "O hist\xF3rico de produ\xE7\xE3o ser\xE1 preservado e continuar\xE1 dispon\xEDvel na aba Hist\xF3rico."), /* @__PURE__ */ React.createElement("button", { onClick: () => setLongPressId(null), style: { display: "block", width: "100%", background: "#1e2636", border: "1px solid #2a3450", color: "#7a8aaa", borderRadius: 8, padding: "11px 0", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "Cancelar"))), /* @__PURE__ */ React.createElement("div", { style: { position: hideClock ? "relative" : "sticky", top: 0, zIndex: 40, background: "#070b12", borderBottom: "1px solid #1a2235", marginLeft: -16, marginRight: -16, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 30, fontWeight: 900, color: "#e0e8ff", lineHeight: 1, textShadow: "0 0 30px #4a8aff33" } }, "CANALETA"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a6a8a", marginTop: 2, textTransform: "capitalize" } }, (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }))), !hideClock && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement(LiveClock, null), !hideClock && /* @__PURE__ */ React.createElement("button", { onClick: onGoSummary, style: { marginTop: 4, background: "#0d1520", border: "1px solid #1e3050", color: "#3a6a9a", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 10, fontFamily: "monospace", letterSpacing: ".06em", display: "block", width: "100%" } }, "\u25C6 resumo"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22, alignItems: "flex-start" } }, Object.entries(counts).map(([status, count]) => {
    const cfg = ST[status];
    const active = filterStatus === status;
    return /* @__PURE__ */ React.createElement("div", { key: status, onClick: () => setFilterStatus(active ? "all" : status), style: { background: active ? cfg.bg : "#0d1117", border: "1px solid " + (active ? cfg.color + "99" : cfg.color + "33"), borderRadius: 10, padding: "10px 14px", minWidth: 82, textAlign: "center", cursor: "pointer", transition: "all .15s", transform: active ? "translateY(-2px)" : "none", boxShadow: active ? "0 0 16px " + cfg.color + "22" : "none" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 700, color: cfg.color } }, count), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: cfg.color, opacity: active ? 1 : 0.7, textTransform: "uppercase", letterSpacing: ".08em" } }, cfg.label), active && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: cfg.color, marginTop: 3, opacity: 0.6 } }, "\u25CF ativo"));
  }), onAddMachine && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onAddMachine,
      style: { background: "#1a2636", border: "1px dashed #2a4a6a", color: "#4a8aff", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 12, fontFamily: "monospace", fontWeight: 700 },
      onMouseEnter: (e) => {
        e.currentTarget.style.background = "#1e3050";
        e.currentTarget.style.borderColor = "#4a8aff";
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.background = "#1a2636";
        e.currentTarget.style.borderColor = "#2a4a6a";
      }
    },
    "+ Nova"
  )), ["running", "idle", "maintenance"].map((grp) => {
    const grpM = visible.filter((m) => m.status === grp);
    if (!grpM.length) return null;
    const cfg = ST[grp];
    return /* @__PURE__ */ React.createElement("div", { key: grp, style: { marginBottom: 22 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: cfg.color, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, opacity: 0.8 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "inline-block", boxShadow: "0 0 5px " + cfg.color } }), cfg.label, " \u2014 ", grpM.length, " m\xE1quina", grpM.length > 1 ? "s" : ""), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 12 } }, grpM.map((m) => {
      var _a2, _b;
      const s = ST[m.status];
      const cycles = m.job ? calcCycles(m.job.startTime, m.job.estimatedEnd, m.job.cycleTime) : null;
      const real = (_b = (_a2 = m.job) == null ? void 0 : _a2.produced) != null ? _b : 0;
      const diff = cycles != null ? cycles - real : null;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: m.id,
          onMouseEnter: (e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 8px 28px " + s.color + "22";
            e.currentTarget.style.borderColor = s.color + "99";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.borderColor = s.color + "33";
            cancelLong(m.id);
          },
          onMouseDown: () => startLong(m.id),
          onMouseUp: () => cancelLong(m.id),
          onTouchStart: () => startLong(m.id),
          onTouchEnd: () => cancelLong(m.id),
          onTouchMove: () => cancelLong(m.id),
          style: { background: "#0d1117", border: "1px solid " + s.color + "33", borderRadius: 14, padding: "16px 16px 12px", position: "relative", overflow: "hidden", transition: "all .15s" }
        },
        /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 0, right: 0, width: 40, height: 40, background: "linear-gradient(225deg," + s.color + "22,transparent 70%)", borderBottomLeftRadius: 40 } }),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 6 } }, /* @__PURE__ */ React.createElement("div", { onClick: () => onOpenDetail(m.id), style: { cursor: "pointer", flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 2 } }, m.id), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#dde8ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 } }, m.name)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 3, background: s.bg, border: "1px solid " + s.color + "33", borderRadius: 20, padding: "2px 7px", fontSize: 8, color: s.color, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, marginTop: 1 } }, /* @__PURE__ */ React.createElement("span", { style: __spreadValues({ width: 4, height: 4, borderRadius: "50%", background: s.color, display: "inline-block" }, m.status === "running" ? { animation: "blink 1.6s infinite" } : {}) }), s.label)),
        /* @__PURE__ */ React.createElement("div", { onClick: () => onOpenDetail(m.id), style: { cursor: "pointer" } }, m.status === "running" && m.job ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#7ab8ff", marginBottom: 2 } }, "\u{1F464} ", m.operator), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff", marginBottom: 8 } }, "\u{1F4E6} ", m.job.product), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7a8aaa", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", null, "Real: ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#00e5a0" } }, real), " / Ciclos: ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#4a8aff" } }, cycles != null ? cycles : "\u2014")), diff != null && diff > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ff4d6d" } }, "\u25BC", diff)), /* @__PURE__ */ React.createElement(Bar, { value: real, max: cycles || 1, color: diff > 0 ? "#ff4d6d" : "#00e5a0" })) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#3a4a6a", fontStyle: "italic" } }, m.maintenanceNote || (m.status === "idle" ? "Aguardando ordem" : "Em manuten\xE7\xE3o"))),
        /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, paddingTop: 8, borderTop: "1px solid #1a2235", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4a5a7a" } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F464} ", m.operator !== "\u2014" ? m.operator : "Sem operador"), /* @__PURE__ */ React.createElement("span", { style: { color: s.color, cursor: "pointer" }, onClick: () => onOpenDetail(m.id) }, "detalhes \u2192"))
      );
    })));
  })));
}
function ProductionHistoryTab({ machines, onOpenMachineHistory }) {
  const ORDER = { running: 0, idle: 1, maintenance: 2 };
  const sorted = [...machines].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100%", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", padding: "16px 16px 80px" } }, /* @__PURE__ */ React.createElement("style", null, "@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 16 } }, "\u{1F4CB} Hist\xF3rico de Produ\xE7\xE3o"), sorted.map((m) => {
    var _a, _b, _c;
    const s = ST[m.status];
    const cycles = m.job ? calcCycles(m.job.startTime, m.job.estimatedEnd, m.job.cycleTime) : null;
    const real = (_b = (_a = m.job) == null ? void 0 : _a.produced) != null ? _b : 0;
    const diff = cycles != null ? cycles - real : null;
    const lastRec = ((_c = m.history) == null ? void 0 : _c.length) > 0 ? m.history[m.history.length - 1] : null;
    return /* @__PURE__ */ React.createElement("div", { key: m.id, style: { background: "#0d1117", border: "1px solid " + s.color + "22", borderRadius: 12, marginBottom: 10, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#0a0e18", borderBottom: "1px solid #1a2235" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: __spreadValues({ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block", boxShadow: "0 0 5px " + s.color }, m.status === "running" ? { animation: "blink 1.6s infinite" } : {}) }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#dde8ff" } }, m.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: s.color } }, s.label))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onOpenMachineHistory(m),
        style: { background: "#1a2636", border: "1px solid #2a4a6a", color: "#4a8aff", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontFamily: "monospace" },
        title: "Ver hist\xF3rico completo"
      },
      "\u{1F4CB}"
    )), /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 14px" } }, m.job ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a6a8a", marginBottom: 6 } }, m.job.product), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22, fontWeight: 700, color: "#00e5a0" } }, real.toLocaleString("pt-BR")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#5a6a8a", marginLeft: 4 } }, "p\xE7s produzidas")), cycles != null && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#4a8aff" } }, cycles.toLocaleString("pt-BR"), " ciclos"), diff > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ff4d6d" } }, "\u25BC ", diff, " p\xE7s"), diff <= 0 && diff != null && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#00e5a0" } }, "\u2713 meta"))), cycles != null && /* @__PURE__ */ React.createElement("div", { style: { width: "100%", background: "#1a1f2e", borderRadius: 3, height: 5 } }, /* @__PURE__ */ React.createElement("div", { style: { width: Math.min(100, Math.round(real / (cycles || 1) * 100)) + "%", height: "100%", background: diff > 0 ? "#ff4d6d" : "#00e5a0", borderRadius: 3, transition: "width .5s" } }))) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#2a3a4a", fontStyle: "italic" } }, m.maintenanceNote || (m.status === "idle" ? "Aguardando ordem de produ\xE7\xE3o" : "Em manuten\xE7\xE3o")), lastRec && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, paddingTop: 8, borderTop: "1px solid #1a2235", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3a4a6a" } }, /* @__PURE__ */ React.createElement("span", null, "\xDAltimo reg.: ", lastRec.date), /* @__PURE__ */ React.createElement("span", { style: { color: turnoInfo(lastRec.turno).color } }, turnoInfo(lastRec.turno).label, " \xB7 ", lastRec.producaoReal, " p\xE7s"))));
  }), sorted.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "60px 0", color: "#2a3a4a", fontSize: 13 } }, "Nenhuma m\xE1quina cadastrada."));
}
function LiveClock() {
  const clock = useClock();
  return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#e0e8ff", fontVariantNumeric: "tabular-nums", lineHeight: 1 } }, pad(clock.getHours()), /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.4, animation: "blink 1s infinite" } }, ":"), pad(clock.getMinutes()), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#5a6a8a" } }, ":", pad(clock.getSeconds())));
}
function EyeIcon({ open, color }) {
  const c = color || (open ? "#4a8aff" : "#5a6a8a");
  if (open) return /* @__PURE__ */ React.createElement("svg", { width: "20", height: "16", viewBox: "0 0 20 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" }, /* @__PURE__ */ React.createElement("path", { d: "M10 2C5.5 2 1.7 5.1 0 9c1.7 3.9 5.5 7 10 7s8.3-3.1 10-7c-1.7-3.9-5.5-7-10-7z", stroke: c, strokeWidth: "1.5", fill: "none" }), /* @__PURE__ */ React.createElement("circle", { cx: "10", cy: "9", r: "3", stroke: c, strokeWidth: "1.5", fill: "none" }));
  return /* @__PURE__ */ React.createElement("svg", { width: "20", height: "18", viewBox: "0 0 20 18", fill: "none", xmlns: "http://www.w3.org/2000/svg" }, /* @__PURE__ */ React.createElement("path", { d: "M10 3C5.5 3 1.7 6.1 0 10c1.7 3.9 5.5 7 10 7s8.3-3.1 10-7c-1.7-3.9-5.5-7-10-7z", stroke: c, strokeWidth: "1.5", fill: "none" }), /* @__PURE__ */ React.createElement("circle", { cx: "10", cy: "10", r: "3", stroke: c, strokeWidth: "1.5", fill: "none" }), /* @__PURE__ */ React.createElement("line", { x1: "2", y1: "1", x2: "18", y2: "17", stroke: c, strokeWidth: "1.5", strokeLinecap: "round" }));
}
function getDiaDeTrabalho() {
  const agora = /* @__PURE__ */ new Date();
  const hora = agora.getHours();
  // Entre meia-noite e 04:59 ainda é o turno B do dia anterior
  if (hora >= 0 && hora < 5) {
    const ontem = new Date(agora);
    ontem.setDate(ontem.getDate() - 1);
    return ontem.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  return agora.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function DailyTotalBar({ machines }) {
  const turnoAtual = getTurnoNow();
  const diaTrabalho = getDiaDeTrabalho();
  let totalHoje = 0;
  let maquinasAtivas = 0;
  (machines || []).forEach((m) => {
    if (m.status === "running") maquinasAtivas++;
    (m.history || []).forEach((h) => {
      const datePart = (h.date || "").split(",")[0].trim();
      const normDate = (d) => {
        const p = d.split("/");
        return p.length < 3 ? d : p[0].padStart(2, "0") + "/" + p[1].padStart(2, "0") + "/" + p[2];
      };
      if (normDate(datePart) === normDate(diaTrabalho) && h.turno === turnoAtual) {
        totalHoje += Number(h.producaoReal) || 0;
      }
    });
  });
  const tc = turnoAtual === "A" ? { color: "#4a8aff", label: "Turno A" } : { color: "#c47aff", label: "Turno B" };
  return /* @__PURE__ */ React.createElement("div", { style: {
    background: "#0a0e18",
    borderBottom: "1px solid #1e2636",
    padding: "8px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0
  } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { background: tc.color + "22", border: "1px solid " + tc.color + "44", color: tc.color, borderRadius: 10, padding: "2px 8px", fontSize: 9, fontWeight: 700, textTransform: "uppercase" } }, tc.label), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".08em" } }, "Total produzido hoje"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 900, color: "#e0e8ff", fontVariantNumeric: "tabular-nums" } }, totalHoje.toLocaleString("pt-BR"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 400, color: "#5a6a8a", marginLeft: 4 } }, "p\xE7s")))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".08em" } }, "Em opera\xE7\xE3o"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#00e5a0" } }, maquinasAtivas, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 400, color: "#5a6a8a", marginLeft: 3 } }, "m\xE1q."))));
}
function TabShell({
  session,
  onLogout,
  onSettings,
  onReports,
  machines,
  archivedMachines,
  onOpenDetail,
  onAddMachine,
  onDeleteMachine,
  onOpenHistory,
  onOpenMachineHistory,
  filterStatus,
  setFilterStatus,
  onExport,
  onImport,
  activeTab: initTab,
  onTabChange,
  onUpdateMachine
}) {
  const isOperador = (session == null ? void 0 : session.role) === "operador";
  const ALL_TABS = [
    { label: "\u{1F4CB} Resumo", idx: 3, perm: "view_dashboard" },
    { label: "\u2699 Canaleta", idx: 2, perm: "edit" },
    { label: "\u{1F4CA} Produ\xE7\xE3o", idx: 0, perm: "view_dashboard" },
    { label: "\u{1F4CB} Hist\xF3rico", idx: 1, perm: "view_history_tab" }
  ];
  const VISIBLE_TABS = ALL_TABS.filter((t) => canDo(session, t.perm));
  const TABS = VISIBLE_TABS.map((t) => t.label);
  const toVisible = (global) => {
    const vi = VISIBLE_TABS.findIndex((t) => t.idx === global);
    return vi >= 0 ? vi : 0;
  };
  const toGlobal = (visible) => {
    var _a, _b;
    return (_b = (_a = VISIBLE_TABS[visible]) == null ? void 0 : _a.idx) != null ? _b : 2;
  };
  const [tab, setTab_] = useState(toVisible(initTab != null ? initTab : 0));
  useEffect(() => {
    if (initTab != null) setTab_(toVisible(initTab));
  }, [initTab]);
  function setTab(v) {
    const next = typeof v === "function" ? v(tab) : v;
    setTab_(next);
    onTabChange && onTabChange(toGlobal(next));
  }
  const globalTab = toGlobal(tab);
  const scrollRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const startX = useRef(null);
  const startY = useRef(null);
  const isHorizSwipe = useRef(false);
  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizSwipe.current = false;
  }
  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = Math.abs(e.touches[0].clientX - startX.current);
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    if (dx > dy && dx > 8) isHorizSwipe.current = true;
  }
  function onTouchEnd(e) {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (isHorizSwipe.current && Math.abs(dx) > 50) {
      if (dx < 0 && tab < TABS.length - 1) setTab((t) => t + 1);
      if (dx > 0 && tab > 0) setTab((t) => t - 1);
    }
    startX.current = null;
  }
  return /* @__PURE__ */ React.createElement("div", { style: { height: "100vh", display: "flex", flexDirection: "column", background: "#070b12", fontFamily: "monospace", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("style", null, "@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}} input:focus{outline:none;}"), /* @__PURE__ */ React.createElement("div", { style: { background: "#070b12", borderBottom: "1px solid #1a2235", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: "#e0e8ff", lineHeight: 1 } }, "CANALETA"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", marginTop: 1, display: "flex", alignItems: "center", gap: 6 } }, TABS[tab], (session == null ? void 0 : session.isDemo) && /* @__PURE__ */ React.createElement("span", { style: { background: "#f5a62322", border: "1px solid #f5a62344", color: "#f5a623", borderRadius: 10, padding: "1px 7px", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" } }, "DEMO"))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement(LiveClock, null), /* @__PURE__ */ React.createElement("button", { onClick: onLogout, style: { marginTop: 3, background: "transparent", border: "none", color: "#3a2a4a", cursor: "pointer", fontSize: 10, fontFamily: "monospace" } }, "sair \xD7"), /* @__PURE__ */ React.createElement("button", { onClick: onReports, style: { marginTop: 3, background: "transparent", border: "none", color: "#2a4a3a", cursor: "pointer", fontSize: 10, fontFamily: "monospace" } }, "\u{1F4CA} rel."))), /* @__PURE__ */ React.createElement(
    "div",
    {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      style: { flex: 1, position: "relative", overflow: "hidden" }
    },
    [0, 1, 2, 3].map((i) => {
      var _a, _b, _c, _d;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: i,
          ref: scrollRefs[i],
          style: {
            position: "absolute",
            inset: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "none",
            touchAction: "pan-y",
            display: tab === i ? "block" : "none"
          }
        },
        ((_a = VISIBLE_TABS[i]) == null ? void 0 : _a.idx) === 0 && /* @__PURE__ */ React.createElement(ProductionDashboard, { session, machines, onGoPanel: () => setTab(toVisible(2)), onLogout, onSettings, hideHeader: true, onUpdateMachine }),
        ((_b = VISIBLE_TABS[i]) == null ? void 0 : _b.idx) === 1 && /* @__PURE__ */ React.createElement(HistoryScreenNew, { machines, archivedMachines, onBack: () => setTab(toVisible(0)) }),
        ((_c = VISIBLE_TABS[i]) == null ? void 0 : _c.idx) === 2 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "100%" } }, /* @__PURE__ */ React.createElement(DailyTotalBar, { machines }), /* @__PURE__ */ React.createElement(
          MainScreen,
          {
            machines,
            session,
            onOpenDetail,
            onOpenHistory: canDo(session, "open_history") ? onOpenHistory : null,
            onAddMachine: canDo(session, "create_machine") ? onAddMachine : null,
            onDeleteMachine: canDo(session, "delete") ? onDeleteMachine : null,
            onGoSummary: () => setTab(toVisible(0)),
            filterStatus,
            setFilterStatus,
            hideClock: true
          }
        )),
        ((_d = VISIBLE_TABS[i]) == null ? void 0 : _d.idx) === 3 && /* @__PURE__ */ React.createElement(
          ShiftSummaryScreen,
          {
            machines,
            session,
            turno: getTurnoNow(),
            onClose: null,
            closeLabel: null,
            inTab: true,
            onOpenDetail,
            onUpdateMachine
          }
        )
      );
    })
  ), /* @__PURE__ */ React.createElement("div", { style: { background: "#070b12", borderTop: "1px solid #1a2235", padding: "10px 0 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexShrink: 0 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setTab((t) => Math.max(0, t - 1));
      },
      style: { background: "transparent", border: "none", color: tab > 0 ? "#4a8aff" : "#1a2235", cursor: tab > 0 ? "pointer" : "default", fontSize: 22, lineHeight: 1, padding: "0 8px", transition: "color .2s" }
    },
    "\u2039"
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } }, TABS.map((label, i) => /* @__PURE__ */ React.createElement("div", { key: i, onClick: () => {
    setTab(i);
  }, style: { cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("div", { style: {
    width: i === tab ? 22 : 8,
    height: 8,
    borderRadius: 4,
    background: i === tab ? "#4a8aff" : "#2a3450",
    boxShadow: i === tab ? "0 0 8px #4a8aff88" : "none",
    transition: "all .25s ease"
  } }), i === tab && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: "#4a8aff", letterSpacing: ".06em", opacity: 0.8 } }, label)))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setTab((t) => Math.min(TABS.length - 1, t + 1));
      },
      style: { background: "transparent", border: "none", color: tab < TABS.length - 1 ? "#4a8aff" : "#1a2235", cursor: tab < TABS.length - 1 ? "pointer" : "default", fontSize: 22, lineHeight: 1, padding: "0 8px", transition: "color .2s" }
    },
    "\u203A"
  )));
}
function ShiftSummaryScreen({ machines, session, turno, onClose, closeLabel, inTab, onOpenDetail, onUpdateMachine }) {
  const [filtroTurno, setFiltroTurno] = useState(turno);
  const ti = filtroTurno === "AB" ? { color: "#e0e8ff", bg: "#ffffff08", label: "Turno A + Turno B", time: "" } : filtroTurno === "A" ? TA : TB;
  const today = getDiaDeTrabalho();
  const [showCal, setShowCal] = useState(false);
  const [calYear, setCalYear] = useState(() => { const d = new Date(); return d.getFullYear(); });
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return d.getMonth(); });
  const [selDate, setSelDate] = useState(null);
  const [editModal, setEditModal] = useState(null); // { machineId, turno, recIndex, value }
  function openEditQtd(m, t, targetRec) {
    const diaParaTurno = selDate ? selDate : getDiaParaTurno(t);
    const recs = (m.history || []).filter((h) => {
      const dp = (h.date || "").split(",")[0].trim();
      return h.turno === t && datasIguais(dp, diaParaTurno);
    });
    const rec = targetRec || recs[recs.length - 1];
    const recIndex = (m.history || []).lastIndexOf(rec);
    setEditModal({ machineId: m.id, machineName: m.name, turno: t, recIndex, value: String((rec == null ? void 0 : rec.producaoReal) || 0) });
  }
  function saveEditQtd() {
    if (!editModal || !onUpdateMachine) return;
    const m = (machines || []).find((x) => x.id === editModal.machineId);
    if (!m) { setEditModal(null); return; }
    const newHistory = (m.history || []).map((h, i) => i === editModal.recIndex ? __spreadProps(__spreadValues({}, h), { producaoReal: Number(editModal.value) || 0 }) : h);
    onUpdateMachine(__spreadProps(__spreadValues({}, m), { history: newHistory }));
    setEditModal(null);
  }
  const displayDate = selDate || today;
  const allMachines = (machines || []).filter((m) => {
    if (m.status === "running" && !selDate) return true;
    const diaA = selDate || getDiaParaTurno("A");
    const diaB = selDate || getDiaParaTurno("B");
    return (m.history || []).some((h) => {
      const dp = (h.date || "").split(",")[0].trim();
      return (h.producaoReal || 0) > 0 && (datasIguais(dp, diaA) || datasIguais(dp, diaB));
    });
  });
  function getDiaParaTurno(t) {
    const agora = /* @__PURE__ */ new Date();
    const hora = agora.getHours();
    if (t === "B") {
      // Turno B entra às 17h: se estamos entre 00:00-16:59, o turno B em curso começou ontem
      if (hora >= 0 && hora < 17) {
        const ontem = new Date(agora);
        ontem.setDate(ontem.getDate() - 1);
        return ontem.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
      // Se são 17:00-23:59, o turno B de hoje acabou de começar — dia de hoje
      return agora.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    // Turno A: sempre usa getDiaDeTrabalho (que já desconta madrugada)
    return today;
  }
  function datasIguais(dataHist, dataRef) {
    if (!dataHist || !dataRef) return false;
    const norm = (d) => {
      const p = d.trim().split("/");
      if (p.length < 3) return d;
      return p[0].padStart(2, "0") + "/" + p[1].padStart(2, "0") + "/" + p[2];
    };
    return norm(dataHist) === norm(dataRef);
  }
  function getProd(m, t) {
    var _a, _b;
    const diaParaTurno = selDate ? selDate : getDiaParaTurno(t);
    const recs = (m.history || []).filter((h) => {
      const dp = (h.date || "").split(",")[0].trim();
      return h.turno === t && datasIguais(dp, diaParaTurno);
    });
    const produced = recs.reduce((s, r) => s + (r.producaoReal || 0), 0);
    const items = recs.map((r) => ({ product: r.produto || "\u2014", value: r.producaoReal || 0, rec: r }));
    const last = recs.slice(-1)[0];
    const product = (_b = (_a = last == null ? void 0 : last.produto) != null ? _a : m.job == null ? void 0 : m.job.product) != null ? _b : "\u2014";
    return { produced, product, items };
  }
  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const DIAS_SEMANA = ["D","S","T","Q","Q","S","S"];
  function renderCalModal() {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const todayObj = new Date();
    return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000b", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, onClick: () => setShowCal(false) },
      /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1525", border: "1px solid #2a3a50", borderRadius: 18, padding: "20px 16px", width: "100%", maxWidth: 340 }, onClick: (e) => e.stopPropagation() },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } },
          /* @__PURE__ */ React.createElement("button", { onClick: () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }, style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14, fontFamily: "monospace" } }, "\u2039"),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff", fontFamily: "monospace", textTransform: "capitalize" } }, MESES[calMonth], " De ", calYear),
          /* @__PURE__ */ React.createElement("button", { onClick: () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }, style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14, fontFamily: "monospace" } }, "\u203A")
        ),
        /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 } },
          DIAS_SEMANA.map((d, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { textAlign: "center", fontSize: 10, color: "#4a5a7a", fontFamily: "monospace", padding: "2px 0" } }, d))
        ),
        /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 } },
          cells.map((d, i) => {
            if (!d) return /* @__PURE__ */ React.createElement("div", { key: "e"+i });
            const dateStr = String(d).padStart(2,"0") + "/" + String(calMonth+1).padStart(2,"0") + "/" + calYear;
            const isToday = d === todayObj.getDate() && calMonth === todayObj.getMonth() && calYear === todayObj.getFullYear();
            const isSel = selDate === dateStr;
            const hasData = (machines||[]).some(m=>(m.history||[]).some(h=>{const dp=(h.date||"").split(",")[0].trim();const norm=s=>{const p=s.trim().split("/");return p.length<3?s:p[0].padStart(2,"0")+"/"+p[1].padStart(2,"0")+"/"+p[2];};return norm(dp)===norm(dateStr)&&((h.producaoReal||0)>0||(h.producao||0)>0);}));
            return /* @__PURE__ */ React.createElement("button", { key: d, onClick: () => { setSelDate(dateStr); setShowCal(false); }, style: { background: isSel ? "#4a8aff" : isToday ? "#1a3060" : "transparent", border: "1px solid " + (isSel ? "#4a8aff" : isToday ? "#4a8aff66" : hasData ? "#2a4a6a44" : "transparent"), color: isSel ? "#fff" : isToday ? "#7ab8ff" : hasData ? "#c8d8f0" : "#3a4a5a", borderRadius: 8, padding: "8px 0", cursor: hasData || isToday ? "pointer" : "default", fontSize: 13, fontFamily: "monospace", fontWeight: isSel || isToday ? 700 : hasData ? 600 : 400 } },
              /* @__PURE__ */ React.createElement("div", { style: { display:"flex", flexDirection:"column", alignItems:"center", gap:2 } },
                d,
                hasData ? /* @__PURE__ */ React.createElement("div", { style: { width:5, height:5, borderRadius:"50%", background: isSel ? "#fff" : "#4a8aff", opacity: isSel ? 0.9 : 0.7 } }) : null
              )
            );
          })
        ),
        /* @__PURE__ */ React.createElement("button", { onClick: () => { setSelDate(null); setShowCal(false); }, style: { marginTop: 16, width: "100%", background: "#111622", border: "1px solid #1e2636", color: "#5a6a8a", borderRadius: 10, padding: "11px 0", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "Fechar")
      )
    );
  }
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", display: "flex", flexDirection: "column", padding: "0 0 40px", fontFamily: "monospace" } }, /* @__PURE__ */ React.createElement("style", null, "@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}"), showCal && renderCalModal(), editModal && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000c", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }, onClick: () => setEditModal(null) }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1525", border: "2px solid #4a8aff55", borderRadius: 16, padding: 24, width: "100%", maxWidth: 320 }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#e0e8ff", marginBottom: 4 } }, "Editar produ\xE7\xE3o"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a6a8a", marginBottom: 18 } }, editModal.machineName, " \xB7 Turno ", editModal.turno), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Quantidade produzida (p\xE7s)"), /* @__PURE__ */ React.createElement("input", { type: "number", value: editModal.value, onChange: (e) => setEditModal((prev) => __spreadProps(__spreadValues({}, prev), { value: e.target.value })), style: { width: "100%", background: "#111622", border: "2px solid #4a8aff66", color: "#e0e8ff", borderRadius: 10, padding: "12px 14px", fontSize: 22, fontFamily: "monospace", fontWeight: 700, boxSizing: "border-box", textAlign: "center", marginBottom: 18 }, autoFocus: true }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: saveEditQtd, style: { flex: 1, background: "#00e5a0", border: "none", color: "#000", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "monospace" } }, "\u2713 Salvar"), /* @__PURE__ */ React.createElement("button", { onClick: () => setEditModal(null), style: { flex: 1, background: "#1e2636", border: "1px solid #2a3450", color: "#aaa", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontSize: 14, fontFamily: "monospace" } }, "Cancelar")))), /* @__PURE__ */ React.createElement("div", { style: { background: ti.bg, borderBottom: "2px solid " + ti.color + "44", padding: "16px 20px 12px", animation: "fadeUp .4s ease" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: ti.color, textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 4 } }, "\u25C6 ", inTab ? "Resumo do turno" : closeLabel === "Entrar no painel" ? "Resumo do turno" : "Turno encerrado"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 900, color: ti.color } }, ti.label), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 2 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: ti.color, opacity: 0.7 } }, displayDate), /* @__PURE__ */ React.createElement("button", { onClick: () => { const d = new Date(); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); setShowCal(true); }, style: { background: "#1a2a3a", border: "1px solid #2a4a6a55", borderRadius: 8, padding: "3px 7px", cursor: "pointer", fontSize: 13, lineHeight: 1 } }, "\uD83D\uDCC5"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", background: "#0a0f1e", border: "1px solid #1e2636", borderRadius: 10, overflow: "hidden", flexShrink: 0, marginTop: 4 } }, [["A", "Turno A"], ["B", "Turno B"], ["AB", "A+B"]].map(([k, l]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: k,
      onClick: () => setFiltroTurno(k),
      style: {
        padding: "7px 10px",
        background: filtroTurno === k ? k === "A" ? "#4a8aff22" : k === "B" ? "#c47aff22" : "#ffffff12" : "transparent",
        border: "none",
        color: filtroTurno === k ? k === "A" ? "#7ab8ff" : k === "B" ? "#d090ff" : "#e0e8ff" : "#4a5a7a",
        cursor: "pointer",
        fontSize: 10,
        fontFamily: "monospace",
        fontWeight: filtroTurno === k ? 700 : 400,
        borderRight: k !== "AB" ? "1px solid #1e2636" : "none"
      }
    },
    l
  )))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a7a9a", marginTop: 8 } }, (session == null ? void 0 : session.role) === "operador" ? "Operador" : "Encarregado", ":", " ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#e0e8ff" } }, session == null ? void 0 : session.name))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "16px 16px", animation: "fadeUp .5s ease" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 } }, filtroTurno === "AB" ? "Comparativo do dia" : "Produ\xE7\xE3o do turno", " \xB7 ", allMachines.length, " m\xE1quina", allMachines.length !== 1 ? "s" : ""), filtroTurno === "AB" ? (
    // ── MODO COMPARATIVO A+B ──────────────────────────────
    /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 6, paddingRight: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#4a8aff", fontWeight: 700, width: 64, textAlign: "center" } }, "Turno A"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#c47aff", fontWeight: 700, width: 64, textAlign: "center" } }, "Turno B")), allMachines.map((m) => {
      const pA = getProd(m, "A");
      const pB = getProd(m, "B");
      const winner = pA.produced > pB.produced ? "A" : pB.produced > pA.produced ? "B" : null;
      return /* @__PURE__ */ React.createElement("div", { key: m.id, style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "10px 14px", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#e0e8ff" } }, m.name), pA.items.length > 1 || pB.items.length > 1 ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: 2 } }, [...pA.items.map((it) => __spreadProps(__spreadValues({}, it), { t: "A" })), ...pB.items.map((it) => __spreadProps(__spreadValues({}, it), { t: "B" }))].map((it, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 10, color: it.t === "A" ? "#7ab8ff" : "#c894ff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", null, it.product), /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700 } }, it.value.toLocaleString("pt-BR"), " p\xE7s"), /* @__PURE__ */ React.createElement("button", { onClick: () => openEditQtd(m, it.t, it.rec), style: { background: "transparent", border: "none", color: it.t === "A" ? "#7ab8ff" : "#c894ff", cursor: "pointer", fontSize: 11, padding: 0 } }, "\u21D4"))))) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", marginTop: 2 } }, pA.product || pB.product)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => openEditQtd(m, "A"), style: { background: "#1a2636", border: "1px solid #4a8aff44", color: "#7ab8ff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, fontFamily: "monospace" } }, "\u21D4 A"), /* @__PURE__ */ React.createElement("button", { onClick: () => openEditQtd(m, "B"), style: { background: "#1a1030", border: "1px solid #c47aff44", color: "#c47aff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, fontFamily: "monospace" } }, "\u21D4 B"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: winner === "A" ? "#4a8aff" : "#2a4a6a" } }, pA.produced.toLocaleString("pt-BR"), winner === "A" && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, marginLeft: 4 } }, "\u{1F3C6}")), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1f2e", borderRadius: 3, height: 4, marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { width: (pA.produced + pB.produced > 0 ? Math.round(pA.produced / (pA.produced + pB.produced) * 100) : 50) + "%", height: "100%", background: "#4a8aff", borderRadius: 3 } }))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#2a3a4a" } }, "vs"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: winner === "B" ? "#c47aff" : "#5a2a7a" } }, winner === "B" && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, marginRight: 4 } }, "\u{1F3C6}"), pB.produced.toLocaleString("pt-BR")), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1f2e", borderRadius: 3, height: 4, marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { width: (pA.produced + pB.produced > 0 ? Math.round(pB.produced / (pA.produced + pB.produced) * 100) : 50) + "%", height: "100%", background: "#c47aff", borderRadius: 3 } })))));
    }), allMachines.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", border: "1px solid #2a3450", borderRadius: 12, padding: "12px 14px", marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 } }, "Total geral do dia"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, [["A", "#4a8aff"], ["B", "#c47aff"]].map(([t, c]) => {
      const total = allMachines.reduce((s, m) => s + getProd(m, t).produced, 0);
      return /* @__PURE__ */ React.createElement("div", { key: t, style: { flex: 1, background: "#0d1117", borderRadius: 8, padding: "8px", textAlign: "center", border: "1px solid " + c + "33" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: c, fontWeight: 700, marginBottom: 4 } }, "Turno ", t), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 900, color: c } }, total.toLocaleString("pt-BR")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5a7a" } }, "p\xE7s"));
    }))))
  ) : (
    // ── MODO TURNO ÚNICO ──────────────────────────────────
    /* @__PURE__ */ React.createElement(React.Fragment, null, allMachines.map((m) => {
      const { produced, product, items } = getProd(m, filtroTurno);
      return /* @__PURE__ */ React.createElement("div", { key: m.id, style: { background: "#0d1117", border: "1px solid " + ti.color + "22", borderRadius: 12, padding: "14px 16px", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff" } }, m.name), items.length > 1 ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: 4 } }, items.map((it, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 11, color: "#5a6a8a", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 2 } }, /* @__PURE__ */ React.createElement("span", null, it.product), /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700, color: ti.color } }, it.value.toLocaleString("pt-BR"), " p\xE7s"), /* @__PURE__ */ React.createElement("button", { onClick: () => openEditQtd(m, filtroTurno, it.rec), style: { background: "transparent", border: "none", color: ti.color, cursor: "pointer", fontSize: 12, padding: 0 } }, "\u21D4"))))) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a6a8a", marginTop: 2 } }, product)), /* @__PURE__ */ React.createElement("button", { onClick: () => openEditQtd(m, filtroTurno), style: { background: "#1a2636", border: "1px solid #2a4a6a", color: "#7ab8ff", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 } }, "\u21D4 editar")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right", marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, fontWeight: 900, color: ti.color } }, produced.toLocaleString("pt-BR")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a" } }, "p\xE7s")));
    }), allMachines.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px 0", color: "#2a3a4a", fontSize: 13 } }, "Nenhuma m\xE1quina em opera\xE7\xE3o."), allMachines.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { background: ti.bg, border: "1px solid " + ti.color + "44", borderRadius: 12, padding: "14px 16px", marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: ti.color, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 } }, "Total geral"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 26, fontWeight: 900, color: ti.color } }, allMachines.reduce((s, m) => s + getProd(m, filtroTurno).produced, 0).toLocaleString("pt-BR"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 400, marginLeft: 6 } }, "p\xE7s"))))
  )), !inTab && onClose && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onClose,
      style: { display: "block", width: "100%", background: closeLabel === "Entrar no painel" ? "linear-gradient(135deg,#1a3a6a,#2a5aaa)" : "transparent", border: closeLabel === "Entrar no painel" ? "2px solid #4a8aff44" : "1px solid #2a3450", color: closeLabel === "Entrar no painel" ? "#e0f0ff" : "#4a5a6a", borderRadius: 10, padding: "13px 0", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: ".06em" }
    },
    closeLabel
  )));
}
function PassInput({ label, value, onChange, show, setShow }) {
  var inputRef = React.useRef(null);
  React.useEffect(function() {
    if (inputRef.current) inputRef.current.style.webkitTextSecurity = show ? "none" : "disc";
  }, [show]);
  return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, label), /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: inputRef,
      type: "text",
      value,
      onChange: (e) => onChange(e.target.value),
      autoComplete: "off",
      autoCorrect: "off",
      autoCapitalize: "none",
      spellCheck: false,
      style: { width: "100%", background: "#111622", border: "1px solid #1e2636", color: "#e0e8ff", borderRadius: 8, padding: "11px 44px 11px 14px", fontSize: 14, fontFamily: "monospace", boxSizing: "border-box", WebkitTextSecurity: "disc" }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onMouseDown: (e) => { e.preventDefault(); setShow((v) => !v); },
      style: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", padding: "4px" }
    },
    /* @__PURE__ */ React.createElement(EyeIcon, { open: show })
  )));
}

function SettingsScreen({ session, users, onChangePass, onAddUser, onChangeRole, onDeleteUser, onBack, loginLog, onExport, onImport }) {
  const [view, setView] = useState("menu");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newLogin, setNewLogin] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("operador");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserConf, setNewUserConf] = useState("");
  const [showNP, setShowNP] = useState(false);
  const [revealPass, setRevealPass] = useState({});
  const [msg, setMsg] = useState(null);
  const rc = { admin: "#ff4d6d", encarregado: "#f5a623", operador: "#00e5a0" }[session == null ? void 0 : session.role] || "#5a6a8a";
  const isAdmin = (session == null ? void 0 : session.role) === "admin";
  const canAddUsers = isAdmin || (session == null ? void 0 : session.role) === "encarregado";
  function doChangePass() {
    setMsg(null);
    const me = users.find((u) => u.user === session.user);
    if (!me) return;
    if (me.pass !== oldPass) {
      setMsg({ type: "err", text: "Senha atual incorreta." });
      return;
    }
    if (newPass.length < 4) {
      setMsg({ type: "err", text: "M\xEDnimo 4 caracteres." });
      return;
    }
    if (newPass !== confirm) {
      setMsg({ type: "err", text: "As senhas n\xE3o conferem." });
      return;
    }
    onChangePass(session.user, newPass);
    setOldPass("");
    setNewPass("");
    setConfirm("");
    setMsg({ type: "ok", text: "Senha alterada com sucesso!" });
  }
  function doAddUser() {
    setMsg(null);
    const login = newLogin.trim().toLowerCase();
    if (!login) {
      setMsg({ type: "err", text: "Digite um login." });
      return;
    }
    if (users.find((u) => u.user === login)) {
      setMsg({ type: "err", text: "Login j\xE1 existe." });
      return;
    }
    if (newUserPass.length < 4) {
      setMsg({ type: "err", text: "M\xEDnimo 4 caracteres." });
      return;
    }
    if (newUserPass !== newUserConf) {
      setMsg({ type: "err", text: "Senhas n\xE3o conferem." });
      return;
    }
    const name = newName.trim() || login.charAt(0).toUpperCase() + login.slice(1);
    onAddUser({ user: login, pass: newUserPass, name, role: newRole });
    setNewLogin("");
    setNewName("");
    setNewUserPass("");
    setNewUserConf("");
    setNewRole("operador");
    setMsg({ type: "ok", text: (newRole === "operador" ? "Operador" : "Encarregado") + ' "' + login + '" criado com sucesso!' });
  }
  const viewTitle = { menu: "Meu Perfil", changepass: "Mudar Senha", adduser: "Adicionar Usu\xE1rio", userlist: "Usu\xE1rios Cadastrados" }[view] || "Configura\xE7\xF5es";
  const roleC = { admin: "#ff4d6d", encarregado: "#f5a623", operador: "#00e5a0" };
  const roleLabel = { admin: "Admin", encarregado: "Encarregado", operador: "Operador" };
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", padding: "24px 16px 40px" } }, /* @__PURE__ */ React.createElement("style", null, "input:focus{outline:none;border-color:#4a8aff!important;} select:focus{outline:none;}"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 22 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: view === "menu" ? onBack : () => {
        setView("menu");
        setMsg(null);
      },
      style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontFamily: "monospace" }
    },
    "\u2039 voltar"
  ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".12em" } }, "Configura\xE7\xF5es"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#e0e8ff" } }, viewTitle))), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid " + rc + "33", borderRadius: 14, padding: "14px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 42, height: 42, borderRadius: "50%", background: rc + "18", border: "2px solid " + rc + "44", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: rc, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "8", r: "4" }), /* @__PURE__ */ React.createElement("path", { d: "M4 20c0-4 3.6-7 8-7s8 3 8 7" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#e0e8ff" } }, session == null ? void 0 : session.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: rc, marginTop: 2, textTransform: "uppercase", letterSpacing: ".08em" } }, session == null ? void 0 : session.role), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", marginTop: 1 } }, "login: ", session == null ? void 0 : session.user))), view === "menu" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setView("changepass");
        setMsg(null);
      },
      style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "14px 16px", cursor: "pointer", fontFamily: "monospace", textAlign: "left", display: "flex", alignItems: "center", gap: 12, color: "#e0e8ff" },
      onMouseEnter: (e) => e.currentTarget.style.borderColor = "#4a8aff44",
      onMouseLeave: (e) => e.currentTarget.style.borderColor = "#1e2636"
    },
    /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, borderRadius: 10, background: "#1a2636", border: "1px solid #2a3a50", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("svg", { width: "17", height: "17", viewBox: "0 0 24 24", fill: "none", stroke: "#4a8aff", strokeWidth: "2", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }))),
    /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700 } }, "Mudar senha"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4a5a7a", marginTop: 1 } }, "Alterar a senha da sua conta")),
    /* @__PURE__ */ React.createElement("span", { style: { color: "#2a4a6a", fontSize: 18 } }, "\u203A")
  ), canAddUsers && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setView("adduser");
        setMsg(null);
      },
      style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "14px 16px", cursor: "pointer", fontFamily: "monospace", textAlign: "left", display: "flex", alignItems: "center", gap: 12, color: "#e0e8ff" },
      onMouseEnter: (e) => e.currentTarget.style.borderColor = "#00e5a033",
      onMouseLeave: (e) => e.currentTarget.style.borderColor = "#1e2636"
    },
    /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, borderRadius: 10, background: "#0a1a0a", border: "1px solid #1a3a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("svg", { width: "17", height: "17", viewBox: "0 0 24 24", fill: "none", stroke: "#00e5a0", strokeWidth: "2", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("circle", { cx: "9", cy: "7", r: "4" }), /* @__PURE__ */ React.createElement("path", { d: "M3 21v-2a4 4 0 0 1 4-4h4" }), /* @__PURE__ */ React.createElement("line", { x1: "19", y1: "11", x2: "19", y2: "17" }), /* @__PURE__ */ React.createElement("line", { x1: "16", y1: "14", x2: "22", y2: "14" }))),
    /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700 } }, "Adicionar ", isAdmin ? "operador / encarregado" : "operador"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4a5a7a", marginTop: 1 } }, "Criar novo login de acesso")),
    /* @__PURE__ */ React.createElement("span", { style: { color: "#2a4a6a", fontSize: 18 } }, "\u203A")
  ), isAdmin && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setView("userlist");
        setMsg(null);
      },
      style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "14px 16px", cursor: "pointer", fontFamily: "monospace", textAlign: "left", display: "flex", alignItems: "center", gap: 12, color: "#e0e8ff" },
      onMouseEnter: (e) => e.currentTarget.style.borderColor = "#ff4d6d33",
      onMouseLeave: (e) => e.currentTarget.style.borderColor = "#1e2636"
    },
    /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, borderRadius: 10, background: "#1a0a0a", border: "1px solid #3a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("svg", { width: "17", height: "17", viewBox: "0 0 24 24", fill: "none", stroke: "#ff4d6d", strokeWidth: "2", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("circle", { cx: "9", cy: "7", r: "4" }), /* @__PURE__ */ React.createElement("path", { d: "M3 21v-2a4 4 0 0 1 4-4h9" }), /* @__PURE__ */ React.createElement("circle", { cx: "17", cy: "7", r: "4" }))),
    /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700 } }, "Usu\xE1rios cadastrados"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4a5a7a", marginTop: 1 } }, "Ver logins, senhas e \xFAltimo acesso")),
    /* @__PURE__ */ React.createElement("span", { style: { color: "#2a4a6a", fontSize: 18 } }, "\u203A")
  ), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1a2635", borderRadius: 12, padding: "14px 16px", marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a4a6a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 } }, "\u{1F4BE} Backup de dados"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onExport,
      style: { flex: 1, background: "#1a2a3a", border: "1px solid #2a4a6a", color: "#7ab8ff", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22 } }, "\u2B07"),
    /* @__PURE__ */ React.createElement("span", null, "Exportar"),
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, opacity: 0.6, fontWeight: 400 } }, "salva .json")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onImport,
      style: { flex: 1, background: "#1a2a3a", border: "1px solid #2a4a6a", color: "#7ab8ff", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22 } }, "\u2B06"),
    /* @__PURE__ */ React.createElement("span", null, "Importar"),
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, opacity: 0.6, fontWeight: 400 } }, "carrega .json")
  )), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#2a3a4a", marginTop: 8, textAlign: "center" } }, "Exporte antes de atualizar o app para n\xE3o perder dados"))), view === "changepass" && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 14, padding: "18px 16px" } }, /* @__PURE__ */ React.createElement(PassInput, { label: "Senha atual", value: oldPass, onChange: setOldPass, show: showOld, setShow: setShowOld }), /* @__PURE__ */ React.createElement(PassInput, { label: "Nova senha", value: newPass, onChange: setNewPass, show: showNew, setShow: setShowNew }), /* @__PURE__ */ React.createElement(PassInput, { label: "Confirmar nova", value: confirm, onChange: setConfirm, show: showNew, setShow: setShowNew }), msg && /* @__PURE__ */ React.createElement("div", { style: { background: msg.type === "ok" ? "#00e5a018" : "#ff4d6d12", border: "1px solid " + (msg.type === "ok" ? "#00e5a044" : "#ff4d6d44"), borderRadius: 8, padding: "9px 12px", fontSize: 12, color: msg.type === "ok" ? "#00e5a0" : "#ff8099", marginBottom: 14, textAlign: "center" } }, msg.type === "ok" ? "\u2713 " : "", msg.text), /* @__PURE__ */ React.createElement("button", { onClick: doChangePass, style: { width: "100%", background: "linear-gradient(135deg,#1a3a6a,#2a5aaa)", border: "1px solid #4a8aff44", color: "#e0f0ff", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "monospace" } }, "Salvar nova senha")), view === "adduser" && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 14, padding: "18px 16px" } }, isAdmin && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Tipo de usu\xE1rio"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, ["operador", "encarregado"].map((r) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: r,
      onClick: () => setNewRole(r),
      style: { flex: 1, background: newRole === r ? roleC[r] + "22" : "#111622", border: "1px solid " + (newRole === r ? roleC[r] + "66" : "#1e2636"), color: newRole === r ? roleC[r] : "#5a6a8a", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: newRole === r ? 700 : 400, textTransform: "uppercase", letterSpacing: ".06em" }
    },
    r
  )))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Login"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: newLogin,
      onChange: (e) => setNewLogin(e.target.value),
      placeholder: "ex: joao.silva",
      autoCapitalize: "none",
      style: { width: "100%", background: "#111622", border: "1px solid #1e2636", color: "#e0e8ff", borderRadius: 8, padding: "11px 14px", fontSize: 14, fontFamily: "monospace", boxSizing: "border-box" }
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Nome (opcional)"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: newName,
      onChange: (e) => setNewName(e.target.value),
      placeholder: "Nome completo",
      style: { width: "100%", background: "#111622", border: "1px solid #1e2636", color: "#e0e8ff", borderRadius: 8, padding: "11px 14px", fontSize: 14, fontFamily: "monospace", boxSizing: "border-box" }
    }
  )), /* @__PURE__ */ React.createElement(PassInput, { label: "Senha", value: newUserPass, onChange: setNewUserPass, show: showNP, setShow: setShowNP }), /* @__PURE__ */ React.createElement(PassInput, { label: "Confirmar senha", value: newUserConf, onChange: setNewUserConf, show: showNP, setShow: setShowNP }), msg && /* @__PURE__ */ React.createElement("div", { style: { background: msg.type === "ok" ? "#00e5a018" : "#ff4d6d12", border: "1px solid " + (msg.type === "ok" ? "#00e5a044" : "#ff4d6d44"), borderRadius: 8, padding: "9px 12px", fontSize: 12, color: msg.type === "ok" ? "#00e5a0" : "#ff8099", marginBottom: 14, textAlign: "center" } }, msg.type === "ok" ? "\u2713 " : "", msg.text), /* @__PURE__ */ React.createElement("button", { onClick: doAddUser, style: { width: "100%", background: "linear-gradient(135deg,#0a2a1a,#1a5a3a)", border: "1px solid #00e5a033", color: "#e0fff0", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "monospace" } }, "Criar ", newRole === "encarregado" ? "encarregado" : "operador")), view === "userlist" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, users.filter((u) => u.user !== "admin").map((u) => {
    const uc = roleC[u.role] || "#5a6a8a";
    const log = (loginLog || []).filter((l) => l.user === u.user).slice(-1)[0];
    const showing = revealPass[u.user];
    const podeVerSenha = session.role === "admin";
    return /* @__PURE__ */ React.createElement("div", { key: u.user, style: { background: "#0d1117", border: "1px solid " + uc + "22", borderRadius: 12, padding: "14px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, borderRadius: "50%", background: uc + "18", border: "1px solid " + uc + "44", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: uc, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "8", r: "4" }), /* @__PURE__ */ React.createElement("path", { d: "M4 20c0-4 3.6-7 8-7s8 3 8 7" }))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff" } }, u.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: uc, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 1 } }, roleLabel[u.role]))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 8, padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 } }, "Login"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff", fontFamily: "monospace" } }, u.user)), podeVerSenha ? /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3, display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", null, "Senha"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onMouseDown: (e) => {
          e.preventDefault();
          setRevealPass((p) => __spreadProps(__spreadValues({}, p), { [u.user]: !p[u.user] }));
        },
        style: { background: "transparent", border: "none", cursor: "pointer", padding: "0 2px" }
      },
      /* @__PURE__ */ React.createElement(EyeIcon, { open: !!showing, color: "#3a5a7a" })
    )), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#f5a623", fontFamily: "monospace", letterSpacing: ".06em" } }, showing ? u.pass : "\u2022\u2022\u2022\u2022")) : /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 } }, "Senha"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#3a4a5a", fontFamily: "monospace" } }, "\u2022\u2022\u2022\u2022"))), /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 8, padding: "8px 10px", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 } }, "\xDAltimo acesso"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: log ? "#c8d8f0" : "#2a3a4a", fontStyle: log ? "normal" : "italic" } }, log ? log.time : "Nunca registrado")), session.role === "admin" && u.user !== "admin" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 } }, "Fun\xE7\xE3o"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, [["admin", "Admin", "#ff4d6d"], ["encarregado", "Encarregado", "#f5a623"], ["operador", "Operador", "#00e5a0"]].map(([r, l, c]) => /* @__PURE__ */ React.createElement("button", { key: r, onClick: () => onChangeRole && onChangeRole(u.user, r), style: { flex: 1, background: u.role === r ? c + "22" : "#111622", border: "1px solid " + (u.role === r ? c + "88" : "#1e2636"), color: u.role === r ? c : "#4a5a7a", borderRadius: 8, padding: "7px 0", cursor: "pointer", fontSize: 10, fontFamily: "monospace", fontWeight: u.role === r ? 700 : 400 } }, l)))), session.role === "admin" && /* @__PURE__ */ React.createElement("button", { onClick: () => { const nova = window.prompt('Nova senha para "' + u.name + '" (m\xEDn. 4 caracteres):', ""); if (nova === null) return; const trimmed = nova.trim(); if (trimmed.length < 4) { window.alert("A senha precisa ter no m\xEDnimo 4 caracteres."); return; } onChangePass && onChangePass(u.user, trimmed); }, style: { marginTop: 10, width: "100%", background: "#0a1a2a", border: "1px solid #4a8aff44", color: "#7ab8ff", borderRadius: 8, padding: "9px 0", cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: 700 } }, "\uD83D\uDD11 Trocar senha"), session.role === "admin" && u.user !== "admin" && /* @__PURE__ */ React.createElement("button", { onClick: () => { if (window.confirm("Deletar usu\xE1rio \"" + u.name + "\"? Esta a\xE7\xE3o n\xE3o pode ser desfeita.")) { onDeleteUser && onDeleteUser(u.user); } }, style: { marginTop: 10, width: "100%", background: "#1a0a0a", border: "1px solid #ff4d6d44", color: "#ff4d6d", borderRadius: 8, padding: "9px 0", cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: 700 } }, "\uD83D\uDDD1 Deletar usu\xE1rio"));
  }), users.filter((u) => u.user !== "admin").length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px 0", color: "#2a3a4a", fontSize: 13 } }, "Nenhum usu\xE1rio cadastrado ainda.")));
}
function gerarPDFTurno(rec, machineName) {
  const ti = rec.turno === "A" ? { label: "Turno A", color: "#1a4a9a", time: "05:00\u201317:00" } : { label: "Turno B", color: "#6a2a9a", time: "17:00\u201305:00" };
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relat\xF3rio ${ti.label} \u2014 ${machineName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Courier New',monospace;background:#fff;color:#111;padding:24px;font-size:12px;}
  .header{border-bottom:3px solid ${ti.color};padding-bottom:16px;margin-bottom:20px;}
  .logo{font-size:28px;font-weight:900;color:#111;letter-spacing:-.02em;}
  .sub{font-size:11px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:.1em;}
  .turno-badge{display:inline-block;background:${ti.color};color:#fff;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-top:8px;}
  .section{background:#f8f8f8;border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:14px;}
  .section-title{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#666;margin-bottom:12px;font-weight:700;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .field{background:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:10px;}
  .field-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:4px;}
  .field-value{font-size:14px;font-weight:700;color:#111;}
  .field-value.red{color:#c00;}
  .field-value.green{color:#080;}
  .zones{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;}
  .zone{background:#fff;border:1px solid #ddd;border-radius:6px;padding:8px;text-align:center;}
  .zone-name{font-size:9px;color:#888;margin-bottom:4px;}
  .zone-val{font-size:16px;font-weight:700;color:#b06000;}
  .obs{background:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:12px;margin-top:8px;font-size:12px;line-height:1.6;color:#333;min-height:50px;}
  .footer{border-top:1px solid #ddd;padding-top:12px;margin-top:20px;display:flex;justify-content:space-between;font-size:10px;color:#999;}
  @media print{body{padding:12px;}@page{margin:1cm;}}
</style></head><body>
<div class="header">
  <div class="logo">CANALETA</div>
  <div class="sub">Relat\xF3rio de Produ\xE7\xE3o \u2014 Finaliza\xE7\xE3o de Turno</div>
  <div class="turno-badge">${ti.label} \xB7 ${ti.time}</div>
</div>

<div class="section">
  <div class="section-title">\u{1F527} Identifica\xE7\xE3o</div>
  <div class="grid">
    <div class="field"><div class="field-label">M\xE1quina</div><div class="field-value">${rec.maquina || "\u2014"}</div></div>
    <div class="field"><div class="field-label">Operador</div><div class="field-value">${rec.operador || "\u2014"}</div></div>
    <div class="field"><div class="field-label">Data / Hora</div><div class="field-value">${rec.date || "\u2014"}</div></div>
    <div class="field"><div class="field-label">Status</div><div class="field-value">${rec.statusLabel || "\u2014"}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">\u{1F4E6} Produ\xE7\xE3o</div>
  <div class="grid">
    <div class="field"><div class="field-label">Produto</div><div class="field-value" style="font-size:11px">${rec.produto || "\u2014"}</div></div>
    <div class="field"><div class="field-label">Ordem</div><div class="field-value">${rec.orderId || "\u2014"}</div></div>
    <div class="field"><div class="field-label">In\xEDcio</div><div class="field-value">${rec.inicio || "\u2014"}</div></div>
    <div class="field"><div class="field-label">T\xE9rmino</div><div class="field-value">${rec.termino || "\u2014"}</div></div>
    <div class="field"><div class="field-label">Ciclo (seg)</div><div class="field-value">${rec.ciclo || "\u2014"}</div></div>
    <div class="field"><div class="field-label">Meta (ciclos)</div><div class="field-value">${(rec.ciclosPeriodo || 0).toLocaleString("pt-BR")}</div></div>
    <div class="field"><div class="field-label">Produ\xE7\xE3o real</div><div class="field-value green">${(rec.producaoReal || 0).toLocaleString("pt-BR")} p\xE7s</div></div>
    <div class="field"><div class="field-label">Diferen\xE7a</div><div class="field-value ${(rec.diferenca || 0) > 0 ? "red" : "green"}">${(rec.diferenca || 0) > 0 ? "\u2212" : "+" + Math.abs(rec.diferenca || 0)}${Math.abs(rec.diferenca || 0)} p\xE7s</div></div>
    <div class="field"><div class="field-label">Peso produzido</div><div class="field-value">${parseFloat(rec.pesoTotal || 0).toFixed(2).replace(".", ",")} kg</div></div>
    <div class="field"><div class="field-label">Perda material</div><div class="field-value ${(rec.perdaKg || 0) > 0 ? "red" : "green"}">${parseFloat(rec.perdaKg || 0).toFixed(2).replace(".", ",")} kg</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">\u{1F4CA} M\xE9tricas</div>
  <div class="grid">
    <div class="field"><div class="field-label">Velocidade</div><div class="field-value">${rec.velocidade || "\u2014"} m/min</div></div>
    <div class="field"><div class="field-label">Zonas registradas</div><div class="field-value">${(rec.metricas || []).length}</div></div>
  </div>
  ${(rec.metricas || []).length > 0 ? `<div class="zones">${(rec.metricas || []).map((z) => `<div class="zone"><div class="zone-name">${z.name}</div><div class="zone-val">${z.value}\xB0C</div></div>`).join("")}</div>` : ""}
</div>

${rec.observacao ? `<div class="section"><div class="section-title">\u{1F4AC} Observa\xE7\xE3o</div><div class="obs">${rec.observacao}</div></div>` : ""}

<div class="footer">
  <span>Canaleta \u2014 Sistema de Monitoramento Industrial</span>
  <span>Gerado em: ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}</span>
</div>
</body></html>`;
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) {
    alert("Permita pop-ups para gerar o PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
function gerarRelatorioGeral(machines, periodo) {
  const now = /* @__PURE__ */ new Date();
  const allRecs = machines.flatMap((m) => (m.history || []).map((h) => __spreadProps(__spreadValues({}, h), { _maquina: m.name })));
  const cutoff = /* @__PURE__ */ new Date();
  if (periodo === "semana") cutoff.setDate(cutoff.getDate() - 7);
  else if (periodo === "mes") cutoff.setDate(cutoff.getDate() - 30);
  else cutoff.setDate(cutoff.getDate() - 1);
  const filtered = allRecs.filter((r) => {
    var _a, _b;
    try {
      const d = (_b = (_a = r.date) == null ? void 0 : _a.split(",")[0]) == null ? void 0 : _b.split("/");
      if (!d) return false;
      const rd = new Date(+d[2], +d[1] - 1, +d[0]);
      return rd >= cutoff;
    } catch (e) {
      return false;
    }
  });
  const byMachine = {};
  filtered.forEach((r) => {
    if (!byMachine[r._maquina]) byMachine[r._maquina] = { A: [], B: [] };
    byMachine[r._maquina][r.turno || "A"].push(r);
  });
  const periodoLabel = periodo === "dia" ? "\xDAltimo dia" : periodo === "semana" ? "\xDAltima semana" : "\xDAltimo m\xEAs";
  const machineRows = Object.entries(byMachine).map(([name, turnos]) => {
    const totalA = turnos.A.reduce((s, r) => s + (r.producaoReal || 0), 0);
    const totalB = turnos.B.reduce((s, r) => s + (r.producaoReal || 0), 0);
    const pesoA = turnos.A.reduce((s, r) => s + (r.pesoTotal || 0), 0);
    const pesoB = turnos.B.reduce((s, r) => s + (r.pesoTotal || 0), 0);
    const perdaA = turnos.A.reduce((s, r) => s + (r.perdaKg || 0), 0);
    const perdaB = turnos.B.reduce((s, r) => s + (r.perdaKg || 0), 0);
    return `<tr>
      <td style="font-weight:700;padding:8px 10px;border-bottom:1px solid #eee">${name}</td>
      <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #eee;color:#1a4a9a;font-weight:700">${totalA.toLocaleString("pt-BR")}</td>
      <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #eee;color:#6a2a9a;font-weight:700">${totalB.toLocaleString("pt-BR")}</td>
      <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #eee;font-weight:700">${(totalA + totalB).toLocaleString("pt-BR")}</td>
      <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #eee">${(pesoA + pesoB).toFixed(2).replace(".", ",")} kg</td>
      <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #eee;color:#c00">${(perdaA + perdaB).toFixed(2).replace(".", ",")} kg</td>
    </tr>`;
  }).join("");
  const totPcs = filtered.reduce((s, r) => s + (r.producaoReal || 0), 0);
  const totPeso = filtered.reduce((s, r) => s + (r.pesoTotal || 0), 0);
  const totPerd = filtered.reduce((s, r) => s + (r.perdaKg || 0), 0);
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relat\xF3rio Geral \u2014 ${periodoLabel}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Courier New',monospace;background:#fff;color:#111;padding:24px;font-size:12px;}
  .header{border-bottom:3px solid #111;padding-bottom:16px;margin-bottom:20px;}
  .logo{font-size:28px;font-weight:900;}
  .sub{font-size:11px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:.1em;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
  th{background:#111;color:#fff;padding:10px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.08em;}
  th:first-child{text-align:left;}
  .totals td{font-weight:700;background:#f0f0f0;padding:10px;border-top:2px solid #111;}
  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
  .card{background:#f8f8f8;border:1px solid #ddd;border-radius:8px;padding:14px;text-align:center;}
  .card-label{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#666;margin-bottom:6px;}
  .card-value{font-size:22px;font-weight:700;}
  .footer{border-top:1px solid #ddd;padding-top:12px;margin-top:20px;display:flex;justify-content:space-between;font-size:10px;color:#999;}
  @media print{body{padding:12px;}@page{margin:1cm;}}
</style></head><body>
<div class="header">
  <div class="logo">CANALETA</div>
  <div class="sub">Relat\xF3rio Geral de Produ\xE7\xE3o \u2014 ${periodoLabel}</div>
  <div style="font-size:11px;color:#666;margin-top:6px">Gerado em: ${now.toLocaleString("pt-BR")}</div>
</div>

<div class="summary">
  <div class="card"><div class="card-label">Total produzido</div><div class="card-value">${totPcs.toLocaleString("pt-BR")}<span style="font-size:12px;font-weight:400"> p\xE7s</span></div></div>
  <div class="card"><div class="card-label">Peso total</div><div class="card-value">${totPeso.toFixed(1).replace(".", ",")}<span style="font-size:12px;font-weight:400"> kg</span></div></div>
  <div class="card"><div class="card-label">Perda material</div><div class="card-value" style="color:#c00">${totPerd.toFixed(1).replace(".", ",")}<span style="font-size:12px;font-weight:400"> kg</span></div></div>
</div>

<table>
  <thead><tr>
    <th style="text-align:left">M\xE1quina</th>
    <th style="color:#aaf">Turno A</th>
    <th style="color:#caf">Turno B</th>
    <th>Total p\xE7s</th>
    <th>Peso kg</th>
    <th>Perda kg</th>
  </tr></thead>
  <tbody>${machineRows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999">Nenhum registro no per\xEDodo</td></tr>'}</tbody>
  <tfoot class="totals"><tr>
    <td>TOTAL GERAL</td>
    <td style="text-align:center">${filtered.filter((r) => r.turno === "A").reduce((s, r) => s + (r.producaoReal || 0), 0).toLocaleString("pt-BR")}</td>
    <td style="text-align:center">${filtered.filter((r) => r.turno === "B").reduce((s, r) => s + (r.producaoReal || 0), 0).toLocaleString("pt-BR")}</td>
    <td style="text-align:center">${totPcs.toLocaleString("pt-BR")}</td>
    <td style="text-align:center">${totPeso.toFixed(2).replace(".", ",")}</td>
    <td style="text-align:center;color:#c00">${totPerd.toFixed(2).replace(".", ",")}</td>
  </tr></tfoot>
</table>

<div class="footer">
  <span>Canaleta \u2014 Sistema de Monitoramento Industrial</span>
  <span>${periodoLabel} \xB7 ${now.toLocaleDateString("pt-BR")}</span>
</div>
</body></html>`;
  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) {
    alert("Permita pop-ups para gerar o relat\xF3rio.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
function ReportsScreen({ machines, onBack }) {
  const [periodo, setPeriodo] = useState("semana");
  const allRecs = machines.flatMap((m) => (m.history || []).map((h) => __spreadProps(__spreadValues({}, h), { _maquina: m.name })));
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", padding: "24px 16px 40px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 } }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "\u2039 voltar"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".12em" } }, "Relat\xF3rios"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#e0e8ff" } }, "Exportar PDF"))), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 14, padding: "16px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 } }, "\u{1F4C5} Per\xEDodo do relat\xF3rio geral"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, [["dia", "Hoje"], ["semana", "7 dias"], ["mes", "30 dias"]].map(([v, l]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: v,
      onClick: () => setPeriodo(v),
      style: { flex: 1, background: periodo === v ? "#1e3050" : "#111622", border: "1px solid " + (periodo === v ? "#4a8aff88" : "#1e2636"), color: periodo === v ? "#7ab8ff" : "#5a6a8a", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: periodo === v ? 700 : 400 }
    },
    l
  )))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => gerarRelatorioGeral(machines, periodo),
      style: { width: "100%", background: "linear-gradient(135deg,#1a3a6a,#2a5aaa)", border: "1px solid #4a8aff44", color: "#e0f0ff", borderRadius: 12, padding: "16px", cursor: "pointer", fontFamily: "monospace", fontSize: 14, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22 } }, "\u{1F4CA}"),
    /* @__PURE__ */ React.createElement("div", { style: { textAlign: "left" } }, /* @__PURE__ */ React.createElement("div", null, "Relat\xF3rio Geral"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, opacity: 0.7, fontWeight: 400, marginTop: 2 } }, "Todas as m\xE1quinas \xB7 comparativo Turno A vs B"))
  ), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 14, padding: "16px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 } }, "\u{1F3ED} \xDAltimo registro por m\xE1quina"), machines.filter((m) => (m.history || []).length > 0).map((m) => {
    const last = m.history[m.history.length - 1];
    return /* @__PURE__ */ React.createElement("div", { key: m.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a2235" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff" } }, m.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a", marginTop: 2 } }, last.date, " \xB7 Turno ", last.turno)), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => gerarPDFTurno(last, m.name),
        style: { background: "#1a2636", border: "1px solid #2a4a6a", color: "#4a8aff", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }
      },
      "\u{1F4C4} PDF"
    ));
  }), machines.filter((m) => (m.history || []).length > 0).length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "20px 0", color: "#2a3a4a", fontSize: 12 } }, "Nenhum turno finalizado ainda")), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 14, padding: "16px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 } }, "\u{1F4C8} Resumo geral (", allRecs.length, " registros)"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 } }, [
    ["Total p\xE7s", allRecs.reduce((s, r) => s + (r.producaoReal || 0), 0).toLocaleString("pt-BR"), "#00e5a0"],
    ["Peso (kg)", allRecs.reduce((s, r) => s + (r.pesoTotal || 0), 0).toFixed(1).replace(".", ","), "#f5a623"],
    ["Perda (kg)", allRecs.reduce((s, r) => s + (r.perdaKg || 0), 0).toFixed(1).replace(".", ","), "#ff4d6d"]
  ].map(([l, v, c]) => /* @__PURE__ */ React.createElement("div", { key: l, style: { background: "#111622", borderRadius: 10, padding: "10px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: c, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4, opacity: 0.8 } }, l), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: c } }, v))))));
}
function MaintenanceScreen({ session, onAddOrder, onUpdateOrder, onDeleteOrder }) {
  const [orders, setOrders_] = useState(() => {
    try {
      const r = localStorage.getItem("canaleta_maintenance");
      return r ? JSON.parse(r) : [];
    } catch (e) {
      return [];
    }
  });
  React.useEffect(function(){
    carregarMaintenanceFirebase().then(function(data){ setOrders_(data); });
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [snap, setSnap] = useState(null);
  const [form, setForm] = useState({ machine: "", description: "", priority: "media", requestedBy: "" });
  function saveOrders(list) {
    setOrders_(list);
    salvarMaintenanceFirebase(list);
    onAddOrder && onAddOrder(list);
  }
  function openNew() {
    setForm({ machine: "", description: "", priority: "media", requestedBy: (session == null ? void 0 : session.name) || "" });
    setEditId(null);
    setShowForm(true);
  }
  function openEdit(o) {
    setForm({ machine: o.machine, description: o.description, priority: o.priority, requestedBy: o.requestedBy });
    setEditId(o.id);
    setShowForm(true);
  }
  function submitForm() {
    if (!form.machine.trim() || !form.description.trim()) return;
    const now = (/* @__PURE__ */ new Date()).toLocaleString("pt-BR");
    if (editId) {
      const updated = orders.map((o) => o.id === editId ? __spreadProps(__spreadValues(__spreadValues({}, o), form), { updatedAt: now }) : o);
      saveOrders(updated);
    } else {
      const newOrder = __spreadProps(__spreadValues({
        id: Date.now().toString()
      }, form), {
        status: "aberto",
        createdAt: now,
        approvedMechanic: null,
        approvedSupervisor: null,
        completedAt: null
      });
      saveOrders([newOrder, ...orders]);
    }
    setShowForm(false);
  }
  function approveMechanic(id) {
    const updated = orders.map(
      (o) => o.id === id ? __spreadProps(__spreadValues({}, o), { approvedMechanic: (session == null ? void 0 : session.name) || "Mec\xE2nico", approvedMechanicAt: (/* @__PURE__ */ new Date()).toLocaleString("pt-BR") }) : o
    );
    saveOrders(updated);
  }
  function approveSupervisor(id) {
    const updated = orders.map((o) => {
      if (o.id !== id) return o;
      const bothDone = o.approvedMechanic && true;
      return __spreadProps(__spreadValues({}, o), {
        approvedSupervisor: (session == null ? void 0 : session.name) || "Encarregado",
        approvedSupervisorAt: (/* @__PURE__ */ new Date()).toLocaleString("pt-BR"),
        status: bothDone ? "concluido" : o.status,
        completedAt: bothDone ? (/* @__PURE__ */ new Date()).toLocaleString("pt-BR") : null
      });
    });
    saveOrders(updated);
  }
  function deleteOrder(id) {
    saveOrders(orders.filter((o) => o.id !== id));
  }
  const PRIORITY = { alta: { label: "Alta", color: "#ff4d6d" }, media: { label: "M\xE9dia", color: "#f5a623" }, baixa: { label: "Baixa", color: "#4a8aff" } };
  const STATUS = { aberto: { label: "Em aberto", color: "#f5a623" }, concluido: { label: "Conclu\xEDdo", color: "#00e5a0" } };
  const abertos = orders.filter((o) => o.status === "aberto");
  const concluidos = orders.filter((o) => o.status === "concluido");
  const isAdmin = (session == null ? void 0 : session.role) === "admin";
  const isEncarregado = (session == null ? void 0 : session.role) === "encarregado" || isAdmin;
  const isMechanic = true;
  function OrderCard({ o }) {
    const pc = PRIORITY[o.priority] || PRIORITY.media;
    const sc = STATUS[o.status] || STATUS.aberto;
    const mechDone = !!o.approvedMechanic;
    const supervDone = !!o.approvedSupervisor;
    const canApproveMech = isMechanic && !mechDone;
    const canApproveSuperv = isEncarregado && !supervDone && mechDone;
    return /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid " + pc.color + "33", borderRadius: 12, marginBottom: 12, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0a0e18", padding: "10px 14px", borderBottom: "1px solid #1a2235", display: "flex", justifyContent: "space-between", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 3 } }, /* @__PURE__ */ React.createElement("span", { style: { background: pc.color + "22", border: "1px solid " + pc.color + "44", color: pc.color, borderRadius: 10, padding: "1px 8px", fontSize: 9, fontWeight: 700, textTransform: "uppercase" } }, pc.label), /* @__PURE__ */ React.createElement("span", { style: { background: sc.color + "22", border: "1px solid " + sc.color + "44", color: sc.color, borderRadius: 10, padding: "1px 8px", fontSize: 9, fontWeight: 700, textTransform: "uppercase" } }, sc.label)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#e0e8ff" } }, o.machine), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", marginTop: 2 } }, o.createdAt, " \xB7 ", o.requestedBy)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setSnap(o), style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#4a8aff", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12 } }, "ver"), isEncarregado && o.status === "aberto" && /* @__PURE__ */ React.createElement("button", { onClick: () => openEdit(o), style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7a8aaa", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12 } }, "\u270E"), onDeleteOrder && /* @__PURE__ */ React.createElement("button", { onClick: () => deleteOrder(o.id), style: { background: "#ff4d6d12", border: "1px solid #ff4d6d33", color: "#ff4d6d", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12 } }, "\u{1F5D1}"))), /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 14px", fontSize: 12, color: "#c8d8f0", lineHeight: 1.6, borderBottom: "1px solid #1a2235" } }, o.description), /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 14px", display: "flex", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 130, background: mechDone ? "#00e5a018" : "#111622", border: "1px solid " + (mechDone ? "#00e5a044" : "#1e2636"), borderRadius: 8, padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 } }, "\u{1F527} Mec\xE2nico"), mechDone ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#00e5a0", fontWeight: 700 } }, "\u2713 ", o.approvedMechanic, /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#3a5a4a", fontWeight: 400 } }, o.approvedMechanicAt)) : canApproveMech ? /* @__PURE__ */ React.createElement("button", { onClick: () => approveMechanic(o.id), style: { width: "100%", background: "#00e5a022", border: "1px solid #00e5a055", color: "#00e5a0", borderRadius: 6, padding: "6px 0", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "monospace" } }, "Confirmar") : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#3a4a6a", fontStyle: "italic" } }, "Aguardando...")), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 130, background: supervDone ? "#00e5a018" : mechDone ? "#f5a62318" : "#111622", border: "1px solid " + (supervDone ? "#00e5a044" : mechDone ? "#f5a62344" : "#1e2636"), borderRadius: 8, padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 } }, "\u{1F454} Encarregado"), supervDone ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#00e5a0", fontWeight: 700 } }, "\u2713 ", o.approvedSupervisor, /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#3a5a4a", fontWeight: 400 } }, o.approvedSupervisorAt)) : !mechDone ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#3a4a6a", fontStyle: "italic" } }, "Aguarda mec\xE2nico...") : canApproveSuperv ? /* @__PURE__ */ React.createElement("button", { onClick: () => approveSupervisor(o.id), style: { width: "100%", background: "#f5a62322", border: "1px solid #f5a62355", color: "#f5a623", borderRadius: 6, padding: "6px 0", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "monospace" } }, "Finalizar") : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a4a2a", fontStyle: "italic" } }, "Aguardando encarregado"))));
  }
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100%", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", padding: "16px 16px 80px" } }, /* @__PURE__ */ React.createElement("style", null, "input:focus,textarea:focus{outline:none;border-color:#4a8aff!important;}"), snap && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000d", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, onClick: () => setSnap(null) }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0a0e18", border: "1px solid #1e2a3a", borderRadius: 16, padding: 20, width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto" }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "#e0e8ff" } }, snap.machine), /* @__PURE__ */ React.createElement("button", { onClick: () => setSnap(null), style: { background: "transparent", border: "none", color: "#7a8aaa", cursor: "pointer", fontSize: 20 } }, "\u2715")), [["Prioridade", (PRIORITY[snap.priority] || PRIORITY.media).label], ["Status", (STATUS[snap.status] || STATUS.aberto).label], ["Aberto em", snap.createdAt], ["Solicitado por", snap.requestedBy], ["Descri\xE7\xE3o", snap.description], ["Mec\xE2nico", snap.approvedMechanic || "Pendente"], ["Aprovado mec\xE2nico em", snap.approvedMechanicAt || "\u2014"], ["Encarregado", snap.approvedSupervisor || "Pendente"], ["Finalizado em", snap.completedAt || "\u2014"]].map(([k, v]) => /* @__PURE__ */ React.createElement("div", { key: k, style: { background: "#111622", borderRadius: 8, padding: "8px 10px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 } }, k), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#e0e8ff" } }, v || "\u2014"))))), showForm && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000d", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0a0e18", border: "1px solid #4a8aff44", borderRadius: 16, padding: 20, width: "100%", maxWidth: 400 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#e0e8ff", marginBottom: 16 } }, editId ? "Editar ordem" : "Nova ordem de manuten\xE7\xE3o"), [["M\xE1quina / Equipamento", "machine", "text"], ["Solicitado por", "requestedBy", "text"]].map(([l, k, t]) => /* @__PURE__ */ React.createElement("div", { key: k, style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, l), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: form[k],
      onChange: (e) => setForm((f) => __spreadProps(__spreadValues({}, f), { [k]: e.target.value })),
      style: { width: "100%", background: "#111622", border: "1px solid #1e2636", color: "#e0e8ff", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box" }
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Prioridade"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, Object.entries(PRIORITY).map(([k, v]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: k,
      onClick: () => setForm((f) => __spreadProps(__spreadValues({}, f), { priority: k })),
      style: { flex: 1, background: form.priority === k ? v.color + "22" : "#111622", border: "1px solid " + (form.priority === k ? v.color + "66" : "#1e2636"), color: form.priority === k ? v.color : "#5a6a8a", borderRadius: 8, padding: "8px 0", cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: form.priority === k ? 700 : 400 }
    },
    v.label
  )))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "Descri\xE7\xE3o do problema"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: form.description,
      onChange: (e) => setForm((f) => __spreadProps(__spreadValues({}, f), { description: e.target.value })),
      rows: 3,
      style: { width: "100%", background: "#111622", border: "1px solid #1e2636", color: "#e0e8ff", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box", resize: "none" }
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: submitForm, style: { flex: 1, background: "linear-gradient(135deg,#1a3a6a,#2a5aaa)", border: "1px solid #4a8aff44", color: "#e0f0ff", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "monospace" } }, editId ? "Salvar" : "Abrir OS"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowForm(false), style: { flex: 1, background: "#1e2636", border: "1px solid #2a3450", color: "#7a8aaa", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "Cancelar")))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 2 } }, "\u{1F527} Ordens de Servi\xE7o"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#e0e8ff" } }, "Manuten\xE7\xE3o")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: openNew,
      style: { background: "linear-gradient(135deg,#1a3a6a,#2a5aaa)", border: "1px solid #4a8aff44", color: "#e0f0ff", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "monospace" }
    },
    "+ Nova OS"
  )), abertos.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { background: "#f5a62318", border: "1px solid #f5a62344", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22, fontWeight: 900, color: "#f5a623" } }, abertos.length), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#f5a623" } }, "ordem", abertos.length > 1 ? "s" : "", " em aberto \u2014 requer aten\xE7\xE3o")), abertos.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#f5a623", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: "#f5a623", display: "inline-block" } }), "Em aberto (", abertos.length, ")"), abertos.map((o) => /* @__PURE__ */ React.createElement(OrderCard, { key: o.id, o }))), concluidos.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { height: 1, background: "#1e2636", margin: "16px 0 12px" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#00e5a0", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: "#00e5a0", display: "inline-block" } }), "Conclu\xEDdas (", concluidos.length, ")"), concluidos.map((o) => /* @__PURE__ */ React.createElement(OrderCard, { key: o.id, o }))), orders.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "60px 0", color: "#2a3a4a" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 12 } }, "\u{1F527}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#3a5a7a", marginBottom: 6 } }, "Nenhuma OS aberta"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12 } }, 'Toque em "+ Nova OS" para registrar uma manuten\xE7\xE3o')));
}
function gerarPDFFromRecord(r, machineName) {
  const adapted = {
    date: r.date,
    turno: r.turno,
    maquina: machineName,
    operador: r.operador || "\u2014",
    produto: r.produto || "\u2014",
    orderId: r.orderId || "\u2014",
    producaoReal: r.producaoReal || 0,
    ciclosPeriodo: r.ciclosPeriodo || 0,
    pesoTotal: r.pesoTotal || 0,
    perdaKg: r.perdaKg || 0,
    diferenca: (r.ciclosPeriodo || 0) - (r.producaoReal || 0),
    ciclo: r.ciclo || "\u2014",
    velocidade: r.velocidade || 0,
    rpmExtrusora: r.rpmExtrusora || 0,
    rpmPuxador: r.rpmPuxador || 0,
    amperagem: r.amperagem || 0,
    metricas: (r.zonas || []).map((z) => ({ name: z.n, value: z.v })),
    observacao: r.obs || ""
  };
  gerarPDFTurno(adapted, machineName);
}
function HistoryScreenNew({ machines, archivedMachines, onBack }) {
  const allHistMachines = [...machines, ...(archivedMachines || []).map((m) => __spreadProps(__spreadValues({}, m), { _archived: true }))];
  const [step, setStep] = useState("machines");
  const [selMachine, setSelMachine] = useState(null);
  const [selProduct, setSelProduct] = useState(null);
  const [selRecord, setSelRecord] = useState(null);
  const [agrupado, setAgrupado] = useState(true);
  const [openDay, setOpenDay] = useState(null);
  const stepRef = useRef("machines");
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  useEffect(() => {
    function handleBack(e) {
      window.history.pushState({ canaleta: 1 }, "");
      const s = stepRef.current;
      if (s === "detail") {
        setStep("records");
        setSelRecord(null);
      } else if (s === "records") {
        setStep("products");
        setSelProduct(null);
        setOpenDay(null);
      } else if (s === "products") {
        setStep("machines");
        setSelMachine(null);
      } else if (s === "machines") {
        onBack && onBack();
      }
    }
    window.addEventListener("popstate", handleBack);
    return () => {
      window.removeEventListener("popstate", handleBack);
    };
  }, [onBack]);
  const ST2 = {
    running: { color: "#00e5a0", label: "Em opera\xE7\xE3o" },
    maintenance: { color: "#ff4d6d", label: "Manuten\xE7\xE3o" },
    idle: { color: "#f5a623", label: "Aguardando" }
  };
  const TC = { A: { color: "#4a8aff", label: "Turno A" }, B: { color: "#c47aff", label: "Turno B" } };
  function convertRecords(machine) {
    return (machine.history || []).map((h) => ({
      date: (h.date || "").split(",")[0].trim() || "\u2014",
      turno: h.turno || "A",
      operador: h.operador || "\u2014",
      produto: h.produto || "\u2014",
      producaoReal: Number(h.producaoReal) || 0,
      ciclosPeriodo: Number(h.ciclosPeriodo) || 0,
      pesoTotal: Number(h.pesoTotal) || 0,
      perdaKg: Number(h.perdaKg) || 0,
      ciclo: h.ciclo || "\u2014",
      rpmExtrusora: Number(h.rpmExtrusora) || 0,
      rpmPuxador: Number(h.rpmPuxador) || 0,
      amperagem: Number(h.amperagem) || 0,
      zonas: (h.metricas || []).map((z) => {
        var _a;
        return { n: z.name || z.n || "\u2014", v: Number((_a = z.value) != null ? _a : z.v) || 0 };
      }),
      obs: h.observacao || h.obs || ""
    }));
  }
  if (step === "detail" && selRecord) {
    const r = selRecord;
    const t = TC[r.turno] || TC.A;
    const pct = r.ciclosPeriodo > 0 ? Math.min(100, Math.round(r.producaoReal / r.ciclosPeriodo * 100)) : 0;
    const diff = r.ciclosPeriodo - r.producaoReal;
    return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", paddingBottom: 40 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0a0e18", borderBottom: "1px solid #1e2636", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setStep("records"), style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "\u2039 voltar"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".1em" } }, selMachine.name, " \xB7 ", r.date), /* @__PURE__ */ React.createElement("span", { style: { background: t.color + "18", border: "1px solid " + t.color + "44", color: t.color, borderRadius: 10, padding: "2px 10px", fontSize: 11, fontWeight: 700 } }, t.label))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => gerarPDFFromRecord(r, (selMachine == null ? void 0 : selMachine.name) || "M\xE1quina"),
        style: { background: "linear-gradient(135deg,#1a3a6a,#2a5aaa)", border: "1px solid #4a8aff44", color: "#e0f0ff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "monospace" }
      },
      "\u{1F4C4} PDF"
    )), /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "12px 14px", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 } }, "Produto"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#7ab8ff", marginBottom: 6 } }, r.produto), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, [["Operador", r.operador], ["Ciclo", r.ciclo + "s"]].map(([l, v]) => /* @__PURE__ */ React.createElement("div", { key: l, style: { background: "#111622", borderRadius: 8, padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", marginBottom: 3, textTransform: "uppercase" } }, l), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff" } }, v))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "12px 14px", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 } }, "\u{1F4E6} Produ\xE7\xE3o"), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1f2e", borderRadius: 4, height: 8, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { width: pct + "%", height: "100%", background: pct >= 100 ? "#00e5a0" : "#4a8aff", borderRadius: 4 } })), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right", fontSize: 10, color: pct >= 100 ? "#00e5a0" : "#4a8aff", fontWeight: 700, marginBottom: 8 } }, pct, "%"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 } }, [["Real", r.producaoReal.toLocaleString("pt-BR") + " p\xE7s", "#00e5a0"], ["Meta", r.ciclosPeriodo.toLocaleString("pt-BR") + " p\xE7s", "#f5a623"], ["Diferen\xE7a", (diff > 0 ? "\u2212" : "+") + Math.abs(diff) + " p\xE7s", diff > 0 ? "#ff4d6d" : "#00e5a0"]].map(([l, v, c]) => /* @__PURE__ */ React.createElement("div", { key: l, style: { background: "#111622", borderRadius: 8, padding: "8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a", marginBottom: 3, textTransform: "uppercase" } }, l), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: c } }, v)))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 8, padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a", marginBottom: 3 } }, "Peso produzido"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#f5a623" } }, r.pesoTotal.toFixed(2).replace(".", ","), " kg")), /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 8, padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a", marginBottom: 3 } }, "Perda material"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: r.perdaKg > 0 ? "#ff4d6d" : "#00e5a0" } }, r.perdaKg.toFixed(2).replace(".", ","), " kg")))), /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "12px 14px", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 } }, "\u{1F4D0} Par\xE2metros"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: r.zonas.length > 0 ? 10 : 0 } }, r.rpmExtrusora > 0 && /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 8, padding: "8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a", marginBottom: 3 } }, "RPM Ext."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#4a8aff" } }, r.rpmExtrusora)), r.rpmPuxador > 0 && /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 8, padding: "8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a", marginBottom: 3 } }, "RPM Pux."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#4a8aff" } }, r.rpmPuxador)), r.amperagem > 0 && /* @__PURE__ */ React.createElement("div", { style: { background: "#111622", borderRadius: 8, padding: "8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#5a6a8a", marginBottom: 3 } }, "Amper."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#f5a623" } }, r.amperagem, "A"))), r.zonas.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 } }, "Zonas de Temperatura"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 6 } }, r.zonas.map((z, i) => {
      const c = z.v > 185 ? "#ff4d6d" : z.v > 170 ? "#f5a623" : "#00e5a0";
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#111622", border: "1px solid " + c + "22", borderRadius: 8, padding: "6px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 8, color: "#5a6a8a", marginBottom: 2 } }, z.n), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: c } }, z.v, "\xB0C"));
    })))), r.obs && /* @__PURE__ */ React.createElement("div", { style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "12px 14px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 } }, "\u{1F4AC} Observa\xE7\xE3o"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#c8d8f0", lineHeight: 1.7, fontStyle: "italic" } }, '"', r.obs, '"'))));
  }
  if (step === "records" && selMachine && selProduct) {
    const records = convertRecords(selMachine).filter((r) => r.produto === selProduct);
    const t_colors = { A: "#4a8aff", B: "#c47aff" };
    const byDay = {};
    records.forEach((r) => {
      if (!byDay[r.date]) byDay[r.date] = [];
      byDay[r.date].push(r);
    });
    const days = Object.keys(byDay).sort((a, b) => {
      const p = (d) => {
        const x = d.split("/");
        return new Date(+x[2], +x[1] - 1, +x[0]);
      };
      return p(b) - p(a);
    });
    return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", paddingBottom: 40 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0a0e18", borderBottom: "1px solid #1e2636", padding: "14px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setStep("products"), style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "\u2039 voltar"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".1em" } }, selMachine.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#7ab8ff" } }, selProduct.length > 30 ? selProduct.slice(0, 30) + "\u2026" : selProduct))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", background: "#111622", border: "1px solid #1e2636", borderRadius: 10, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setAgrupado(true), style: { padding: "6px 10px", background: agrupado ? "#1e3050" : "transparent", border: "none", color: agrupado ? "#7ab8ff" : "#4a5a7a", cursor: "pointer", fontSize: 10, fontFamily: "monospace", fontWeight: agrupado ? 700 : 400 } }, "\u{1F4C5} Dia"), /* @__PURE__ */ React.createElement("button", { onClick: () => setAgrupado(false), style: { padding: "6px 10px", background: !agrupado ? "#1e3050" : "transparent", border: "none", color: !agrupado ? "#7ab8ff" : "#4a5a7a", cursor: "pointer", fontSize: 10, fontFamily: "monospace", fontWeight: !agrupado ? 700 : 400 } }, "\u{1F504} Turno")))), /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 16px" } }, records.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "60px 0", color: "#2a3a4a" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, marginBottom: 10 } }, "\u{1F4CB}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#3a5a7a" } }, "Sem registros para este produto")) : agrupado ? (
      // Modo agrupado por dia
      days.map((day) => {
        const recs = byDay[day];
        const isOpen = openDay === day;
        return /* @__PURE__ */ React.createElement("div", { key: day, style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement(
          "div",
          {
            onClick: () => setOpenDay(isOpen ? null : day),
            style: { background: "#0d1117", border: "1px solid " + (isOpen ? "#4a8aff55" : "#1e2636"), borderRadius: isOpen ? "12px 12px 0 0" : 12, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }
          },
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#e0e8ff", marginBottom: 4 } }, day), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, recs.map((r, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: { background: (TC[r.turno] || TC.A).color + "18", border: "1px solid " + (TC[r.turno] || TC.A).color + "44", color: (TC[r.turno] || TC.A).color, borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700 } }, (TC[r.turno] || TC.A).label)), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#5a6a8a", alignSelf: "center" } }, recs.reduce((s, r) => s + r.producaoReal, 0).toLocaleString("pt-BR"), " p\xE7s"))),
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
            e.stopPropagation();
            const recs2 = byDay[day];
            if (recs2 && recs2[0]) gerarPDFFromRecord(recs2[0], (selMachine == null ? void 0 : selMachine.name) || "M\xE1quina");
          }, style: { background: "#1a2636", border: "1px solid #2a4a6a", color: "#4a8aff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12 } }, "\u{1F4C4}"), /* @__PURE__ */ React.createElement("span", { style: { color: "#4a8aff", fontSize: 14 } }, isOpen ? "\u25B2" : "\u25BC"))
        ), isOpen && recs.map((r, i) => {
          const t = TC[r.turno] || TC.A;
          const pct = r.ciclosPeriodo > 0 ? Math.min(100, Math.round(r.producaoReal / r.ciclosPeriodo * 100)) : 0;
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: i,
              style: { background: "#0a0e18", border: "1px solid " + t.color + "33", borderTop: "none", borderRadius: i === recs.length - 1 ? "0 0 12px 12px" : "0", padding: "10px 16px", cursor: "pointer" },
              onClick: () => {
                setSelRecord(r);
                setStep("detail");
              }
            },
            /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { background: t.color + "18", border: "1px solid " + t.color + "44", color: t.color, borderRadius: 10, padding: "2px 8px", fontSize: 10, fontWeight: 700 } }, t.label), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#5a6a8a" } }, r.operador), /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
              e.stopPropagation();
              gerarPDFTurno(r, (selMachine == null ? void 0 : selMachine.name) || "M\xE1quina");
            }, style: { background: "#1a2636", border: "1px solid #2a4a6a", color: "#4a8aff", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontSize: 11 } }, "\u{1F4C4}"))),
            /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1f2e", borderRadius: 3, height: 5, marginBottom: 5 } }, /* @__PURE__ */ React.createElement("div", { style: { width: pct + "%", height: "100%", background: pct >= 100 ? "#00e5a0" : "#4a8aff", borderRadius: 3 } })),
            /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#c8d8f0", fontWeight: 700 } }, r.producaoReal.toLocaleString("pt-BR"), " p\xE7s"), /* @__PURE__ */ React.createElement("span", { style: { color: "#f5a623" } }, r.pesoTotal.toFixed(1).replace(".", ","), " kg"), /* @__PURE__ */ React.createElement("span", { style: { color: pct >= 100 ? "#00e5a0" : "#ff4d6d", fontWeight: 700 } }, pct, "%"), /* @__PURE__ */ React.createElement("span", { style: { color: "#2a4a6a", fontSize: 10 } }, "detalhes \u203A"))
          );
        }));
      })
    ) : (
      // Modo individual por turno
      records.map((r, i) => {
        const t = TC[r.turno] || TC.A;
        const pct = r.ciclosPeriodo > 0 ? Math.min(100, Math.round(r.producaoReal / r.ciclosPeriodo * 100)) : 0;
        return /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#0d1117", border: "1px solid " + t.color + "33", borderRadius: 12, marginBottom: 8, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #1a2235" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff" } }, r.date), /* @__PURE__ */ React.createElement("span", { style: { background: t.color + "18", border: "1px solid " + t.color + "44", color: t.color, borderRadius: 10, padding: "2px 8px", fontSize: 10, fontWeight: 700 } }, t.label)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#5a6a8a" } }, r.operador), /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
          e.stopPropagation();
          gerarPDFTurno(r, (selMachine == null ? void 0 : selMachine.name) || "M\xE1quina");
        }, style: { background: "#1a2636", border: "1px solid #2a4a6a", color: "#4a8aff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12 } }, "\u{1F4C4}"))), /* @__PURE__ */ React.createElement("div", { onClick: () => {
          setSelRecord(r);
          setStep("detail");
        }, style: { padding: "10px 14px", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1f2e", borderRadius: 3, height: 5, marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { width: pct + "%", height: "100%", background: pct >= 100 ? "#00e5a0" : "#4a8aff", borderRadius: 3 } })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#c8d8f0", fontWeight: 700 } }, r.producaoReal.toLocaleString("pt-BR"), " p\xE7s"), /* @__PURE__ */ React.createElement("span", { style: { color: "#f5a623" } }, r.pesoTotal.toFixed(1).replace(".", ","), " kg"), /* @__PURE__ */ React.createElement("span", { style: { color: pct >= 100 ? "#00e5a0" : "#ff4d6d", fontWeight: 700 } }, pct, "%"), /* @__PURE__ */ React.createElement("span", { style: { color: "#2a4a6a", fontSize: 10 } }, "detalhes \u203A"))));
      })
    )));
  }
  if (step === "products" && selMachine) {
    const records = convertRecords(selMachine);
    const prods = [...new Set(records.map((r) => r.produto).filter((p) => p && p !== "\u2014"))];
    return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", paddingBottom: 40 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#0a0e18", borderBottom: "1px solid #1e2636", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setStep("machines"), style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "\u2039 voltar"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".1em" } }, "Hist\xF3rico"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#e0e8ff" } }, selMachine.name))), /* @__PURE__ */ React.createElement("button", { onClick: () => gerarRelatorioGeral(machines || [], "mes"), style: { background: "linear-gradient(135deg,#3a1a6a,#6a2aaa)", border: "1px solid #c47aff44", color: "#f0e0ff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "monospace" } }, "\u{1F4CB} PDF geral")), /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 16px" } }, prods.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "60px 0", color: "#2a3a4a" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, marginBottom: 10 } }, "\u{1F4CB}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#3a5a7a", marginBottom: 4 } }, "Sem registros ainda"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#2a3a4a" } }, "Os registros aparecem ap\xF3s finalizar turnos")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a5a7a", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 } }, "Produtos produzidos"), prods.map((p) => {
      const regs = records.filter((r) => r.produto === p);
      const total = regs.reduce((s, r) => s + r.producaoReal, 0);
      const dias = [...new Set(regs.map((r) => r.date))].length;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: p,
          onClick: () => {
            setSelProduct(p);
            setOpenDay(null);
            setStep("records");
          },
          style: { background: "#0d1117", border: "1px solid #1e2636", borderRadius: 12, padding: "14px 16px", cursor: "pointer", marginBottom: 10 },
          onMouseEnter: (e) => e.currentTarget.style.borderColor = "#4a8aff55",
          onMouseLeave: (e) => e.currentTarget.style.borderColor = "#1e2636"
        },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#e0e8ff", marginBottom: 5 } }, p),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5a6a8a" } }, /* @__PURE__ */ React.createElement("span", null, regs.length, " registro", regs.length !== 1 ? "s" : ""), /* @__PURE__ */ React.createElement("span", null, dias, " dia", dias !== 1 ? "s" : ""), /* @__PURE__ */ React.createElement("span", { style: { color: "#f5a623", fontWeight: 700 } }, total.toLocaleString("pt-BR"), " p\xE7s total"), /* @__PURE__ */ React.createElement("span", { style: { color: "#2a4a6a" } }, "ver \u203A"))
      );
    }))));
  }
  return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", background: "#070b12", color: "#c8d8f0", fontFamily: "monospace", padding: "16px 16px 80px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 } }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, style: { background: "#1a2636", border: "1px solid #2a3a50", color: "#7ab8ff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontFamily: "monospace" } }, "\u2039 voltar"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#3a5a7a", textTransform: "uppercase", letterSpacing: ".12em" } }, "Hist\xF3rico"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#e0e8ff" } }, "Selecione a Extrusora"))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, (allHistMachines || []).map((m) => {
    const s = m._archived ? { color: "#7a5a8a", label: "Removida" } : (ST2[m.status] || ST2.idle);
    const totalRec = (m.history || []).length;
    const prods = [...new Set((m.history || []).map((h) => h.produto).filter(Boolean))];
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: m.id,
        onClick: () => {
          setSelMachine(m);
          setSelProduct(null);
          setStep("products");
        },
        style: { background: "#0d1117", border: "2px solid " + s.color + "44", borderRadius: 14, padding: "14px", cursor: "pointer", transition: "border-color .15s", opacity: m._archived ? 0.75 : 1 },
        onMouseEnter: (e) => e.currentTarget.style.borderColor = s.color + "99",
        onMouseLeave: (e) => e.currentTarget.style.borderColor = s.color + "44"
      },
      /* @__PURE__ */ React.createElement("div", { style: { width: 40, height: 40, borderRadius: "50%", background: s.color + "18", border: "2px solid " + s.color + "44", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: s.color, strokeWidth: "1.8", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("rect", { x: "2", y: "8", width: "14", height: "8", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M16 10h4l2 2-2 2h-4" }), /* @__PURE__ */ React.createElement("line", { x1: "6", y1: "8", x2: "6", y2: "5" }), /* @__PURE__ */ React.createElement("line", { x1: "10", y1: "8", x2: "10", y2: "5" }))),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 900, color: "#e0e8ff", marginBottom: 3 } }, m.name, m._archived && " \uD83D\uDDC4\uFE0F"),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 5, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 5, height: 5, borderRadius: "50%", background: s.color, display: "inline-block" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: s.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" } }, s.label)),
      totalRec > 0 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5a6a8a" } }, totalRec, " registro", totalRec !== 1 ? "s" : ""), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#4a6a8a" } }, prods.length, " produto", prods.length !== 1 ? "s" : "")) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#2a3a4a", fontStyle: "italic" } }, "sem registros"),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#2a4a6a", marginTop: 6, textAlign: "right" } }, "toque \u203A")
    );
  })));
}