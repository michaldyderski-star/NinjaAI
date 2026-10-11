/* NinjaAI — UI layer. Depends on js/calc.js (window.NinjaCalc). */
(function () {
  "use strict";

  var C = window.NinjaCalc;
  var STORAGE_KEY = "ninjaai.plans.v1";
  var MAX_COMPARE = 3;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    plans: loadPlans(),
    plan: C.emptyPlan(),
    view: "plan",
    compareIds: [],
    result: null,
  };

  /* ---------- Storage ---------- */

  function loadPlans() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(C.isPlan) : [];
    } catch (e) {
      return [];
    }
  }

  function persist(plans) {
    state.plans = plans;
    renderPlanList();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
      return true;
    } catch (e) {
      toast("error", "Nie udało się zapisać w przeglądarce (tryb prywatny lub brak miejsca).");
      return false;
    }
  }

  /* ---------- Helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Fields that define a plan's content; timestamps and status don't count as edits. */
  function fingerprint(p) {
    return JSON.stringify([p.name, p.year, p.annualBudget, p.allocations]);
  }

  function isDirty() {
    var saved = state.plans.find(function (p) { return p.id === state.plan.id; });
    return saved
      ? fingerprint(saved) !== fingerprint(state.plan)
      : fingerprint(state.plan) !== fingerprint(C.emptyPlan());
  }

  function confirmDiscard() {
    return !isDirty() || window.confirm("Masz niezapisane zmiany. Czy na pewno chcesz je porzucić?");
  }

  var toastTimer = null;
  function toast(kind, text) {
    var el = $("toast");
    el.className = "toast no-print toast-" + kind;
    el.setAttribute("role", kind === "error" ? "alert" : "status");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3500);
  }

  /* ---------- Numeric fields ---------- */

  var numberFields = [];

  /*
   * Binds a text input to a numeric value. Only valid values are committed;
   * while the text is invalid an inline message explains why, and on blur the
   * field reverts to the last valid value.
   */
  function bindNumber(input, opts) {
    var box = input.closest(".field-box");
    var errId = input.id + "-err";
    var err = document.createElement("p");
    err.className = "field-error";
    err.id = errId;
    err.setAttribute("role", "alert");
    err.hidden = true;
    box.insertAdjacentElement("afterend", err);

    var display = opts.display || C.formatNumber;

    function setError(msg) {
      err.textContent = msg || "";
      err.hidden = !msg;
      box.classList.toggle("has-error", !!msg);
      if (msg) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", errId);
      } else {
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    }

    input.addEventListener("focus", function () { input.select(); });
    input.addEventListener("input", function () {
      var raw = input.value;
      if (raw.trim() === "") {
        setError(null);
        opts.set(Math.max(0, opts.min));
        return;
      }
      var n = C.parseDecimal(raw);
      if (n === null) {
        setError("Wpisz liczbę (maks. 2 miejsca po przecinku).");
        return;
      }
      if (n < opts.min || n > opts.max()) {
        setError(opts.rangeMessage);
        return;
      }
      setError(null);
      opts.set(n);
    });
    input.addEventListener("blur", function () {
      setError(null);
      input.value = display(opts.get());
    });

    var field = {
      input: input,
      sync: function () {
        if (document.activeElement !== input) {
          input.value = display(opts.get());
          setError(null);
        }
      },
    };
    numberFields.push(field);
    return field;
  }

  /* ---------- Plan editing ---------- */

  function setPlan(plan) {
    state.plan = plan;
    $("f-name").value = plan.name;
    state.view = "plan";
    render();
    renderPlanList();
  }

  function updatePlan(patch) {
    Object.assign(state.plan, patch);
    render();
  }

  function updateAllocation(i, patch) {
    Object.assign(state.plan.allocations[i], patch);
    render();
  }

  /* ---------- Allocation table (built once) ---------- */

  var rows = [];

  function buildTable() {
    var body = $("alloc-body");
    C.CHANNELS.forEach(function (ch, i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<th scope="row" class="alloc-channel">' +
          '<span class="dot" style="background:' + ch.color + '" aria-hidden="true"></span>' +
          esc(ch.label) + '<span class="tag" hidden></span>' +
        "</th>" +
        '<td data-label="% budżetu"><div class="field"><label class="sr-only" for="share-' + i + '">' + esc(ch.label) + ': % budżetu</label>' +
          '<div class="field-box"><input id="share-' + i + '" type="text" inputmode="decimal" autocomplete="off" /><span class="field-suffix" aria-hidden="true">%</span></div></div></td>' +
        '<td data-label="Kwota"><div class="field"><label class="sr-only" for="amount-' + i + '">' + esc(ch.label) + ': kwota w zł</label>' +
          '<div class="field-box"><input id="amount-' + i + '" type="text" inputmode="decimal" autocomplete="off" /><span class="field-suffix" aria-hidden="true">zł</span></div></div></td>' +
        '<td data-label="Spodziewany ROI"><div class="field"><label class="sr-only" for="roi-' + i + '">' + esc(ch.label) + ': spodziewany % zwrotu</label>' +
          '<div class="field-box"><input id="roi-' + i + '" type="text" inputmode="decimal" autocomplete="off" /><span class="field-suffix" aria-hidden="true">%</span></div></div>' +
          '<p class="field-warn" hidden>Bardzo wysoki ROI — sprawdź to założenie.</p></td>' +
        '<td data-label="Zwrot" class="num"></td>' +
        '<td data-label="Wartość końcowa" class="num"></td>';
      body.appendChild(tr);

      bindNumber(tr.querySelector("#share-" + i), {
        get: function () { return state.plan.allocations[i].sharePercent; },
        set: function (v) { updateAllocation(i, { sharePercent: v }); },
        min: 0,
        max: function () { return 100; },
        rangeMessage: "Udział musi mieścić się w zakresie 0–100%.",
      });
      var amountInput = tr.querySelector("#amount-" + i);
      bindNumber(amountInput, {
        get: function () { return state.result.channels[i].amount / 100; },
        set: function (v) {
          updateAllocation(i, { sharePercent: C.amountToPercent(C.zlToGrosze(v), state.plan.annualBudget) });
        },
        min: 0,
        max: function () { return state.plan.annualBudget / 100; },
        rangeMessage: "Kwota nie może przekraczać rocznego budżetu.",
      });
      bindNumber(tr.querySelector("#roi-" + i), {
        get: function () { return state.plan.allocations[i].expectedRoiPercent; },
        set: function (v) { updateAllocation(i, { expectedRoiPercent: v }); },
        min: C.ROI_MIN,
        max: function () { return C.ROI_MAX; },
        rangeMessage: "ROI musi mieścić się w zakresie " + C.ROI_MIN + "% – " + C.formatNumber(C.ROI_MAX) + "%.",
      });

      rows.push({
        tag: tr.querySelector(".tag"),
        amountInput: amountInput,
        warn: tr.querySelector(".field-warn"),
        ret: tr.children[4],
        final: tr.children[5],
      });
    });
  }

  /* ---------- Rendering ---------- */

  function render() {
    var plan = state.plan;
    var r = (state.result = C.calculatePlan(plan.annualBudget, plan.allocations));

    $("view-plan").hidden = state.view !== "plan";
    $("view-compare").hidden = state.view !== "compare";
    if (state.view === "compare") renderCompare();

    // Sum bar
    var bar = $("sumbar");
    bar.className = "sumbar is-" + r.sumState;
    $("sum-pct").textContent = C.formatPercent(r.allocatedPercent);
    $("sum-badge").textContent = { under: "!", exact: "✓", over: "✕" }[r.sumState];
    $("sum-fill").style.width = Math.min(r.allocatedPercent, 100) + "%";
    $("sum-track").setAttribute("aria-valuenow", String(Math.round(r.allocatedPercent)));
    $("sum-msg").textContent =
      r.sumState === "exact"
        ? "Cały budżet jest rozdzielony."
        : r.sumState === "under"
          ? "Pozostało do rozdzielenia: " + C.formatPercent(r.remainingPercent) + " (" + C.formatMoney(r.remainingAmount) + "). Plan zapiszesz jako szkic."
          : "Przekroczono 100% o " + C.formatPercent(-r.remainingPercent) + " (" + C.formatMoney(-r.remainingAmount) + "). Zmniejsz udziały, aby zapisać plan jako gotowy i go wyeksportować.";

    // Table rows
    r.channels.forEach(function (c, i) {
      var row = rows[i];
      var tag = r.bestChannel === c.channel ? "best" : r.worstChannel === c.channel ? "worst" : null;
      row.tag.hidden = !tag;
      row.tag.className = "tag tag-" + tag;
      row.tag.textContent = tag === "best" ? "najwyższy ROI" : "najniższy ROI";
      row.warn.hidden = !(plan.allocations[i].expectedRoiPercent > C.ROI_WARN);
      row.amountInput.disabled = plan.annualBudget <= 0;
      row.amountInput.closest(".field-box").classList.toggle("is-disabled", plan.annualBudget <= 0);
      row.ret.textContent = C.formatMoney(c.returnAmount);
      row.final.textContent = C.formatMoney(c.finalValue);
      row.final.classList.toggle("neg", c.finalValue < 0);
    });

    // Totals
    var roiText = r.weightedRoiPercent === null ? "—" : C.formatPercent(r.weightedRoiPercent, true);
    $("t-share").textContent = C.formatPercent(r.allocatedPercent);
    $("t-share").className = "num is-" + r.sumState;
    $("t-amount").textContent = C.formatMoney(r.totalAmount);
    $("t-roi").textContent = roiText;
    $("t-return").textContent = C.formatMoney(r.totalReturn);
    $("t-final").textContent = C.formatMoney(r.totalFinalValue);
    $("t-final").classList.toggle("neg", r.totalFinalValue < 0);

    // KPIs
    $("kpis").innerHTML = [
      ["Budżet", C.formatMoney(plan.annualBudget), false],
      ["Łączny zwrot", C.formatMoney(r.totalReturn), false],
      ["Wartość końcowa", C.formatMoney(r.totalFinalValue), r.totalFinalValue < 0],
      ["Ważony ROI", roiText, false],
    ].map(function (k) {
      return '<div class="kpi"><dt>' + k[0] + "</dt><dd" + (k[2] ? ' class="neg"' : "") + ">" + k[1] + "</dd></div>";
    }).join("");

    // Buttons
    var canExport = r.sumState === "exact" && plan.annualBudget > 0;
    var reason = plan.annualBudget <= 0
      ? "Wpisz roczny budżet, aby wyeksportować plan."
      : r.sumState !== "exact" ? "Suma udziałów musi wynosić dokładnie 100%." : "";
    ["btn-csv", "btn-pdf"].forEach(function (id) {
      $(id).disabled = !canExport;
      $(id).title = reason;
    });
    $("btn-distribute").disabled = r.sumState !== "under";
    $("btn-reset").disabled = r.allocatedHundredths === 0;
    $("btn-save").textContent = "Zapisz" + (isDirty() ? " *" : "");
    $("print-footer").textContent =
      plan.name + " · " + plan.year + " · budżet " + C.formatMoney(plan.annualBudget) +
      " · wygenerowano " + new Date().toLocaleDateString("pl-PL") + " w NinjaAI";

    renderDonut(r);
    renderBars(r);
    numberFields.forEach(function (f) { f.sync(); });
  }

  /* ---------- Charts (inline SVG) ---------- */

  function svg(tag, attrs, parent) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  function addTitle(el, text) { svg("title", {}, el).textContent = text; }

  function renderDonut(r) {
    var host = $("chart-donut");
    var funded = r.channels.filter(function (c) { return c.amount > 0; });
    if (funded.length === 0) {
      host.innerHTML = '<p class="chart-empty">Wpisz budżet i udziały kanałów, aby zobaczyć wykres.</p>';
      return;
    }
    host.innerHTML = "";
    var size = 240, radius = 88, width = 34, circ = 2 * Math.PI * radius;
    var root = svg("svg", { viewBox: "0 0 " + size + " " + size, role: "img", "aria-label": "Wykres pierścieniowy podziału budżetu", style: "max-width:260px;margin:0 auto" }, host);
    var g = svg("g", { transform: "rotate(-90 " + size / 2 + " " + size / 2 + ")" }, root);
    var offset = 0;
    var gap = funded.length > 1 ? 2 : 0;
    funded.forEach(function (c) {
      var len = (c.amount / r.totalAmount) * circ;
      var seg = svg("circle", {
        class: "seg", cx: size / 2, cy: size / 2, r: radius, fill: "none",
        stroke: C.channel(c.channel).color, "stroke-width": width,
        "stroke-dasharray": Math.max(len - gap, 0.5) + " " + (circ - Math.max(len - gap, 0.5)),
        "stroke-dashoffset": -offset,
      }, g);
      addTitle(seg, C.channel(c.channel).label + ": " + C.formatMoney(c.amount) + " (" + C.formatPercent(c.sharePercent) + ")");
      offset += len;
    });
    svg("text", { x: size / 2, y: size / 2 + 2, "text-anchor": "middle", class: "donut-total" }, root).textContent = C.formatMoneyShort(r.totalAmount);
    svg("text", { x: size / 2, y: size / 2 + 20, "text-anchor": "middle", class: "donut-sub" }, root).textContent = "budżet";

    var legend = document.createElement("ul");
    legend.className = "legend";
    legend.innerHTML = funded.map(function (c) {
      var ch = C.channel(c.channel);
      return '<li><span class="dot" style="background:' + ch.color + '" aria-hidden="true"></span>' + esc(ch.label) +
        ' <span class="muted">' + C.formatPercent(c.sharePercent) + "</span></li>";
    }).join("");
    host.appendChild(legend);
  }

  function niceTicks(min, max, count) {
    if (max === min) max = min + 1;
    var raw = (max - min) / count;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).find(function (s) { return s >= raw; });
    var ticks = [];
    for (var v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 2; v += step) ticks.push(v);
    return ticks;
  }

  function renderBars(r) {
    var host = $("chart-bars");
    if (r.totalAmount === 0) {
      host.innerHTML = '<p class="chart-empty">Brak danych do porównania.</p>';
      return;
    }
    host.innerHTML = "";
    var W = Math.max(host.clientWidth || 600, 260);
    var narrow = W < 420;
    var H = 280, m = { l: 74, r: 8, t: 10, b: narrow ? 64 : 30 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;

    var values = [0];
    r.channels.forEach(function (c) { values.push(c.amount, c.returnAmount); });
    var ticks = niceTicks(Math.min.apply(null, values), Math.max.apply(null, values), 4);
    var lo = ticks[0], hi = ticks[ticks.length - 1];
    var y = function (v) { return m.t + ih - ((v - lo) / (hi - lo)) * ih; };

    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": "Wykres słupkowy: wydatek i oczekiwany zwrot dla każdego kanału" }, host);
    var axis = svg("g", { class: "axis" }, root);
    ticks.forEach(function (t) {
      svg("line", { class: "gridline", x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }, axis);
      svg("text", { x: m.l - 8, y: y(t) + 4, "text-anchor": "end" }, axis).textContent = C.formatMoneyShort(t);
    });
    svg("line", { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: "var(--muted)", "stroke-width": 1 }, axis);

    var band = iw / r.channels.length;
    var bw = Math.min(28, (band * 0.7) / 2);
    r.channels.forEach(function (c, i) {
      var ch = C.channel(c.channel);
      var cx = m.l + band * i + band / 2;
      [["Wydatek", c.amount, "bar-spend", cx - bw - 1], ["Zwrot", c.returnAmount, "bar-return", cx + 1]].forEach(function (b) {
        var top = Math.min(y(b[1]), y(0));
        var h = Math.abs(y(b[1]) - y(0));
        var rect = svg("rect", { class: "bar " + b[2], x: b[3], y: top, width: bw, height: Math.max(h, b[1] === 0 ? 0 : 1), rx: 3 }, root);
        addTitle(rect, ch.label + " — " + b[0] + ": " + C.formatMoney(b[1]));
      });
      var label = svg("text", narrow
        ? { x: cx, y: H - m.b + 14, "text-anchor": "end", transform: "rotate(-35 " + cx + " " + (H - m.b + 14) + ")" }
        : { x: cx, y: H - m.b + 18, "text-anchor": "middle" }, axis);
      label.textContent = ch.label;
    });

    var legend = document.createElement("ul");
    legend.className = "legend";
    legend.innerHTML =
      '<li><span class="dot" style="background:var(--spend)" aria-hidden="true"></span>Wydatek</li>' +
      '<li><span class="dot" style="background:#6366f1" aria-hidden="true"></span>Zwrot</li>';
    host.appendChild(legend);
  }

  /* ---------- Saved plans ---------- */

  function renderPlanList() {
    var host = $("plan-list");
    var btn = $("btn-compare");
    if (state.plans.length === 0) {
      host.innerHTML = '<p class="muted small">Nie masz jeszcze zapisanych planów. Zapisane plany zostają w tej przeglądarce.</p>';
      btn.hidden = true;
      return;
    }
    var sorted = state.plans.slice().sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });
    host.innerHTML = '<ul class="plans">' + sorted.map(function (p) {
      var r = C.calculatePlan(p.annualBudget, p.allocations);
      var checked = state.compareIds.indexOf(p.id) >= 0;
      var disabled = !checked && state.compareIds.length >= MAX_COMPARE;
      return '<li class="plan' + (p.id === state.plan.id ? " is-current" : "") + '" data-id="' + esc(p.id) + '">' +
        '<div class="plan-top">' +
          '<input type="checkbox" data-action="compare"' + (checked ? " checked" : "") + (disabled ? " disabled" : "") +
            ' aria-label="Porównaj: ' + esc(p.name) + '" title="' + (disabled ? "Możesz porównać maksymalnie " + MAX_COMPARE + " plany" : "Dodaj do porównania") + '" />' +
          '<button type="button" class="plan-name" data-action="open">' + esc(p.name) + "</button>" +
          '<span class="status status-' + p.status + '">' + (p.status === "final" ? "gotowy" : "szkic") + "</span>" +
        "</div>" +
        '<p class="plan-meta">' + p.year + " · " + C.formatMoney(p.annualBudget) + " · ROI " +
          (r.weightedRoiPercent === null ? "—" : C.formatPercent(r.weightedRoiPercent)) + "</p>" +
        '<div class="plan-actions">' +
          '<button type="button" class="link" data-action="rename">Zmień nazwę</button>' +
          '<button type="button" class="link" data-action="duplicate">Duplikuj</button>' +
          '<button type="button" class="link danger" data-action="delete">Usuń</button>' +
        "</div></li>";
    }).join("") + "</ul>";
    btn.hidden = false;
    btn.disabled = state.compareIds.length < 2;
    btn.textContent = "Porównaj zaznaczone (" + state.compareIds.length + "/" + MAX_COMPARE + ")";
  }

  function findPlan(id) { return state.plans.find(function (p) { return p.id === id; }); }

  function startRename(li, plan) {
    var nameBtn = li.querySelector(".plan-name");
    var input = document.createElement("input");
    input.className = "plan-rename";
    input.value = plan.name;
    input.maxLength = 80;
    input.setAttribute("aria-label", "Nowa nazwa planu");
    nameBtn.replaceWith(input);
    input.focus();
    input.select();
    var done = false;
    function finish(save) {
      if (done) return;
      done = true;
      var name = input.value.trim();
      if (save && name && name !== plan.name) {
        persist(state.plans.map(function (p) {
          return p.id === plan.id ? Object.assign({}, p, { name: name, updatedAt: new Date().toISOString() }) : p;
        }));
        if (state.plan.id === plan.id) {
          state.plan.name = name;
          $("f-name").value = name;
          render();
        }
      } else {
        renderPlanList();
      }
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    });
    input.addEventListener("blur", function () { finish(true); });
  }

  $("plan-list").addEventListener("click", function (e) {
    var target = e.target.closest("[data-action]");
    if (!target) return;
    var li = target.closest(".plan");
    var plan = findPlan(li.dataset.id);
    if (!plan) return;
    switch (target.dataset.action) {
      case "open":
        if (plan.id !== state.plan.id && confirmDiscard()) setPlan(C.clonePlan(plan));
        else if (plan.id === state.plan.id && state.view !== "plan") { state.view = "plan"; render(); }
        break;
      case "rename":
        startRename(li, plan);
        break;
      case "duplicate":
        var copy = C.duplicatePlan(plan);
        if (persist(state.plans.concat([copy]))) toast("ok", "Utworzono kopię „" + plan.name + "”.");
        break;
      case "delete":
        if (window.confirm("Usunąć plan „" + plan.name + "”? Tej operacji nie można cofnąć.")) {
          state.compareIds = state.compareIds.filter(function (x) { return x !== plan.id; });
          persist(state.plans.filter(function (p) { return p.id !== plan.id; }));
          if (state.view === "compare") render();
        }
        break;
    }
  });

  $("plan-list").addEventListener("change", function (e) {
    if (e.target.dataset.action !== "compare") return;
    var id = e.target.closest(".plan").dataset.id;
    var ids = state.compareIds;
    state.compareIds = ids.indexOf(id) >= 0
      ? ids.filter(function (x) { return x !== id; })
      : ids.length < MAX_COMPARE ? ids.concat([id]) : ids;
    renderPlanList();
    if (state.view === "compare") renderCompare();
  });

  /* ---------- Compare ---------- */

  function diffMoney(v) { return v === 0 ? "" : (v > 0 ? "+" : "−") + C.formatMoney(Math.abs(v)); }
  function diffPct(v) { return Math.abs(v) < 0.005 ? "" : (v > 0 ? "+" : "−") + C.formatPercent(Math.abs(v)) + " pp"; }
  function diffHtml(i, text) {
    return i === 0 || !text ? "" : '<span class="diff ' + (text.charAt(0) === "+" ? "up" : "down") + '">' + text + "</span>";
  }

  function renderCompare() {
    var host = $("view-compare");
    var plans = state.compareIds.map(findPlan).filter(Boolean);
    var back = '<button type="button" class="btn" data-back>Wróć do planu</button>';
    if (plans.length < 2) {
      host.innerHTML = '<h2>Porównanie scenariuszy</h2><p class="muted">Zaznacz 2 lub 3 zapisane plany na liście „Zapisane plany”, aby porównać je obok siebie.</p>' + back;
      return;
    }
    var results = plans.map(function (p) { return C.calculatePlan(p.annualBudget, p.allocations); });
    var base = results[0];

    function row(label, cell) {
      return '<tr><th scope="row">' + label + "</th>" + results.map(function (r, i) {
        return '<td class="num">' + cell(r, i) + "</td>";
      }).join("") + "</tr>";
    }

    var html =
      '<div class="section-head"><h2>Porównanie scenariuszy</h2>' + back + "</div>" +
      '<p class="muted small">Różnice liczone względem pierwszego scenariusza („' + esc(plans[0].name) + "”).</p>" +
      '<div class="table-scroll"><table class="compare"><thead><tr><th scope="col">Wskaźnik</th>' +
      plans.map(function (p) { return '<th scope="col" class="num">' + esc(p.name) + "</th>"; }).join("") +
      "</tr></thead><tbody>" +
      row("Budżet", function (r, i) {
        return C.formatMoney(plans[i].annualBudget) + diffHtml(i, diffMoney(plans[i].annualBudget - plans[0].annualBudget));
      }) +
      row("Łączny zwrot", function (r, i) {
        return C.formatMoney(r.totalReturn) + diffHtml(i, diffMoney(r.totalReturn - base.totalReturn));
      }) +
      row("Wartość końcowa", function (r, i) {
        return C.formatMoney(r.totalFinalValue) + diffHtml(i, diffMoney(r.totalFinalValue - base.totalFinalValue));
      }) +
      row("Ważony ROI", function (r, i) {
        if (r.weightedRoiPercent === null) return "—";
        return C.formatPercent(r.weightedRoiPercent, true) +
          (base.weightedRoiPercent === null ? "" : diffHtml(i, diffPct(r.weightedRoiPercent - base.weightedRoiPercent)));
      }) +
      '<tr class="group"><th scope="colgroup" colspan="' + (plans.length + 1) + '">Kwota na kanał (udział · ROI)</th></tr>' +
      C.CHANNELS.map(function (ch) {
        var label = '<span class="dot" style="background:' + ch.color + '" aria-hidden="true"></span>' + esc(ch.label);
        return row(label, function (r, i) {
          var c = r.channels.find(function (x) { return x.channel === ch.id; });
          var b = base.channels.find(function (x) { return x.channel === ch.id; });
          if (!c || !b) return "—";
          return C.formatMoney(c.amount) +
            '<span class="muted small block">' + C.formatPercent(c.sharePercent) + " · ROI " + C.formatPercent(c.roiPercent) + "</span>" +
            diffHtml(i, diffMoney(c.amount - b.amount));
        });
      }).join("") +
      "</tbody></table></div>";
    host.innerHTML = html;
  }

  $("view-compare").addEventListener("click", function (e) {
    if (e.target.closest("[data-back]")) { state.view = "plan"; render(); }
  });

  /* ---------- Top-level actions ---------- */

  $("f-name").addEventListener("input", function (e) { updatePlan({ name: e.target.value }); });

  bindNumber($("f-year"), {
    get: function () { return state.plan.year; },
    set: function (v) { updatePlan({ year: Math.trunc(v) }); },
    min: 2000,
    max: function () { return 2100; },
    display: String,
    rangeMessage: "Podaj rok z zakresu 2000–2100.",
  });

  bindNumber($("f-budget"), {
    get: function () { return state.plan.annualBudget / 100; },
    set: function (v) { updatePlan({ annualBudget: C.zlToGrosze(v) }); },
    min: 0,
    max: function () { return 1e12; },
    display: C.formatNumberFixed,
    rangeMessage: "Budżet musi być liczbą dodatnią.",
  });

  $("btn-new").addEventListener("click", function () { if (confirmDiscard()) setPlan(C.emptyPlan()); });
  $("btn-example").addEventListener("click", function () { if (confirmDiscard()) setPlan(C.examplePlan()); });

  $("btn-save").addEventListener("click", function () {
    var r = state.result;
    var status = r.sumState === "exact" ? "final" : "draft";
    var next = Object.assign(C.clonePlan(state.plan), {
      name: state.plan.name.trim() || "Bez nazwy",
      status: status,
      updatedAt: new Date().toISOString(),
    });
    var exists = !!findPlan(next.id);
    state.plan = C.clonePlan(next);
    $("f-name").value = next.name;
    var ok = persist(exists
      ? state.plans.map(function (p) { return p.id === next.id ? next : p; })
      : state.plans.concat([next]));
    render();
    if (ok) toast("ok", status === "final" ? "Zapisano plan jako gotowy." : "Zapisano plan jako szkic — suma udziałów ≠ 100%.");
  });

  $("btn-csv").addEventListener("click", function () {
    var url = URL.createObjectURL(new Blob([C.planToCsv(state.plan, state.result)], { type: "text/csv;charset=utf-8" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = C.safeFilename(state.plan.name) + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  $("btn-pdf").addEventListener("click", function () { window.print(); });

  $("btn-distribute").addEventListener("click", function () {
    updatePlan({ allocations: C.distributeRemainder(state.plan.allocations) });
  });
  $("btn-reset").addEventListener("click", function () {
    updatePlan({ allocations: C.resetShares(state.plan.allocations) });
  });

  $("btn-compare").addEventListener("click", function () { state.view = "compare"; render(); });

  window.addEventListener("beforeunload", function (e) {
    if (isDirty()) { e.preventDefault(); e.returnValue = ""; }
  });

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (state.view === "plan") renderBars(state.result); }, 120);
  });

  /* ---------- Start ---------- */

  state.result = C.calculatePlan(state.plan.annualBudget, state.plan.allocations);
  buildTable();
  setPlan(state.plan);
})();
