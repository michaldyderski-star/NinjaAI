/*
 * NinjaAI — pure calculation, formatting and CSV logic.
 * Works in the browser (window.NinjaCalc) and in Node (module.exports) for tests.
 * All money is in integer grosze, all shares in integer hundredths of a percent
 * (100% === 10 000), so results never drift by floating point errors.
 */
(function (root) {
  "use strict";

  var CHANNELS = [
    { id: "social_media", label: "Social media", color: "#6366f1" },
    { id: "www", label: "WWW", color: "#06b6d4" },
    { id: "radio", label: "Radio", color: "#f59e0b" },
    { id: "tv", label: "TV", color: "#ef4444" },
    { id: "billboard", label: "Billboard", color: "#22c55e" },
    { id: "newspaper", label: "Gazeta", color: "#a855f7" },
  ];

  var FULL_SHARE = 10000;
  var ROI_MIN = -100;
  var ROI_MAX = 10000;
  var ROI_WARN = 1000;

  function channel(id) {
    for (var i = 0; i < CHANNELS.length; i++) if (CHANNELS[i].id === id) return CHANNELS[i];
    return { id: id, label: id, color: "#94a3b8" };
  }

  function toHundredths(percent) { return Math.round(percent * 100); }
  function fromHundredths(h) { return h / 100; }
  function sum(arr) { return arr.reduce(function (s, x) { return s + x; }, 0); }

  /* ---------- Plans ---------- */

  function newId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  function emptyPlan(now) {
    now = now || new Date();
    var iso = now.toISOString();
    return {
      id: newId(),
      name: "Marketing " + (now.getFullYear() + 1),
      year: now.getFullYear() + 1,
      currency: "PLN",
      annualBudget: 0,
      allocations: CHANNELS.map(function (c) {
        return { channel: c.id, sharePercent: 0, expectedRoiPercent: 0 };
      }),
      status: "draft",
      createdAt: iso,
      updatedAt: iso,
    };
  }

  /* Example from PRD §8. */
  function examplePlan(now) {
    var plan = emptyPlan(now);
    var ex = {
      social_media: [35, 180], www: [20, 150], radio: [10, 60],
      tv: [20, 40], billboard: [10, 30], newspaper: [5, 20],
    };
    plan.annualBudget = 12000000;
    plan.allocations.forEach(function (a) {
      a.sharePercent = ex[a.channel][0];
      a.expectedRoiPercent = ex[a.channel][1];
    });
    return plan;
  }

  function clonePlan(plan) { return JSON.parse(JSON.stringify(plan)); }

  function duplicatePlan(plan, now) {
    var iso = (now || new Date()).toISOString();
    var copy = clonePlan(plan);
    copy.id = newId();
    copy.name = plan.name + " (kopia)";
    copy.createdAt = iso;
    copy.updatedAt = iso;
    return copy;
  }

  function isPlan(x) {
    return !!x && typeof x === "object" && typeof x.id === "string" &&
      typeof x.name === "string" && typeof x.annualBudget === "number" && Array.isArray(x.allocations);
  }

  /* ---------- Calculations ---------- */

  /*
   * Splits `budget` grosze across shares (hundredths of a percent) with the
   * largest-remainder method, so amounts add up exactly to the rounded total.
   */
  function splitBudget(budget, shares) {
    var target = Math.round((budget * sum(shares)) / FULL_SHARE);
    var exact = shares.map(function (s) { return (budget * s) / FULL_SHARE; });
    var floors = exact.map(Math.floor);
    var rest = target - sum(floors);
    var order = exact
      .map(function (x, i) { return { i: i, frac: x - Math.floor(x) }; })
      .filter(function (o) { return shares[o.i] > 0; })
      .sort(function (a, b) { return b.frac - a.frac || a.i - b.i; });
    for (var k = 0; rest > 0 && order.length > 0; k = (k + 1) % order.length, rest--) {
      floors[order[k].i] += 1;
    }
    return floors;
  }

  function sumState(allocatedHundredths) {
    if (allocatedHundredths === FULL_SHARE) return "exact";
    return allocatedHundredths < FULL_SHARE ? "under" : "over";
  }

  function calculatePlan(budget, allocations) {
    var shares = allocations.map(function (a) { return toHundredths(a.sharePercent); });
    var amounts = splitBudget(budget, shares);
    var profits = allocations.map(function (a, i) {
      return Math.round((amounts[i] * toHundredths(a.expectedRoiPercent)) / FULL_SHARE);
    });
    var totalAmount = sum(amounts);
    var totalProfit = sum(profits);
    var allocated = sum(shares);

    var channels = allocations.map(function (a, i) {
      return {
        channel: a.channel,
        sharePercent: fromHundredths(shares[i]),
        roiPercent: fromHundredths(toHundredths(a.expectedRoiPercent)),
        amount: amounts[i],
        profit: profits[i],
        finalValue: amounts[i] + profits[i],
        profitSharePercent: totalProfit !== 0 ? (profits[i] / totalProfit) * 100 : null,
      };
    });

    var best = null, worst = null;
    var funded = channels.filter(function (c) { return c.sharePercent > 0; });
    if (funded.length >= 2) {
      var b = funded.reduce(function (m, c) { return c.roiPercent > m.roiPercent ? c : m; });
      var w = funded.reduce(function (m, c) { return c.roiPercent < m.roiPercent ? c : m; });
      if (b.roiPercent !== w.roiPercent) { best = b.channel; worst = w.channel; }
    }

    return {
      channels: channels,
      allocatedHundredths: allocated,
      allocatedPercent: fromHundredths(allocated),
      remainingPercent: fromHundredths(FULL_SHARE - allocated),
      remainingAmount: budget - totalAmount,
      sumState: sumState(allocated),
      totalAmount: totalAmount,
      totalProfit: totalProfit,
      totalFinalValue: totalAmount + totalProfit,
      weightedRoiPercent: totalAmount > 0 ? (totalProfit / totalAmount) * 100 : null,
      bestChannel: best,
      worstChannel: worst,
    };
  }

  /* Percent of `budget` that `amount` represents, rounded to 2 decimals. */
  function amountToPercent(amount, budget) {
    if (budget <= 0) return 0;
    return fromHundredths(Math.round((amount * FULL_SHARE) / budget));
  }

  /*
   * FR-9: splits the unallocated share equally between channels at 0%, or
   * between all channels if none is empty. Leftover hundredths go to the
   * first channels so the total lands exactly on 100%.
   */
  function distributeRemainder(allocations) {
    var shares = allocations.map(function (a) { return toHundredths(a.sharePercent); });
    var remaining = FULL_SHARE - sum(shares);
    if (remaining <= 0) return allocations;
    var targets = [];
    shares.forEach(function (s, i) { if (s === 0) targets.push(i); });
    if (targets.length === 0) targets = allocations.map(function (_, i) { return i; });
    var base = Math.floor(remaining / targets.length);
    var extra = remaining - base * targets.length;
    targets.forEach(function (i) {
      shares[i] += base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
    });
    return allocations.map(function (a, i) {
      return Object.assign({}, a, { sharePercent: fromHundredths(shares[i]) });
    });
  }

  function resetShares(allocations) {
    return allocations.map(function (a) { return Object.assign({}, a, { sharePercent: 0 }); });
  }

  /* ---------- Formatting ---------- */

  var pln = new Intl.NumberFormat("pl-PL", {
    style: "currency", currency: "PLN", minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  var plnShort = new Intl.NumberFormat("pl-PL", {
    style: "currency", currency: "PLN", notation: "compact", maximumFractionDigits: 1,
  });
  var num2 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });
  var num2fixed = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function formatMoney(grosze) { return pln.format(grosze / 100); }
  function formatMoneyShort(grosze) { return plnShort.format(grosze / 100); }
  function formatPercent(p, fixed) { return (fixed ? num2fixed : num2).format(p) + "%"; }
  function formatNumber(n) { return num2.format(n); }
  function formatNumberFixed(n) { return num2fixed.format(n); }

  /*
   * Parses input like "120 000,50", "120000.5", "1 000 zł", "35%".
   * Returns null when it isn't a number or has more than 2 decimal places.
   */
  function parseDecimal(raw) {
    var cleaned = String(raw)
      .replace(/[\s  ]/g, "")
      .replace(/zł|%/gi, "")
      .replace(",", ".");
    if (cleaned === "" || cleaned === "-") return null;
    if (!/^-?\d+(\.\d{0,2})?$/.test(cleaned)) return null;
    var n = Number(cleaned);
    return isFinite(n) ? n : null;
  }

  function zlToGrosze(zl) { return Math.round(zl * 100); }

  /* ---------- CSV ---------- */

  function csvZl(g) { return (g / 100).toFixed(2).replace(".", ","); }
  function csvPct(p) { return p === null ? "" : p.toFixed(2).replace(".", ","); }
  function csvEscape(v) { return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  /* Semicolon-separated with comma decimals, so Polish Excel opens it as columns. */
  function planToCsv(plan, result) {
    var rows = [
      ["Plan", plan.name],
      ["Rok", String(plan.year)],
      ["Roczny budżet (zł)", csvZl(plan.annualBudget)],
      [],
      ["Kanał", "% budżetu", "Kwota (zł)", "ROI %", "Zwrot (zł)", "Wartość końcowa (zł)"],
    ];
    result.channels.forEach(function (c) {
      rows.push([channel(c.channel).label, csvPct(c.sharePercent), csvZl(c.amount),
        csvPct(c.roiPercent), csvZl(c.profit), csvZl(c.finalValue)]);
    });
    rows.push(["SUMA", csvPct(result.allocatedPercent), csvZl(result.totalAmount),
      csvPct(result.weightedRoiPercent), csvZl(result.totalProfit), csvZl(result.totalFinalValue)]);
    return "﻿" + rows.map(function (r) { return r.map(csvEscape).join(";"); }).join("\r\n");
  }

  function safeFilename(name) {
    return String(name).trim().replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "") || "plan";
  }

  var api = {
    CHANNELS: CHANNELS, FULL_SHARE: FULL_SHARE, ROI_MIN: ROI_MIN, ROI_MAX: ROI_MAX, ROI_WARN: ROI_WARN,
    channel: channel, emptyPlan: emptyPlan, examplePlan: examplePlan, clonePlan: clonePlan,
    duplicatePlan: duplicatePlan, isPlan: isPlan,
    splitBudget: splitBudget, calculatePlan: calculatePlan, amountToPercent: amountToPercent,
    distributeRemainder: distributeRemainder, resetShares: resetShares,
    formatMoney: formatMoney, formatMoneyShort: formatMoneyShort, formatPercent: formatPercent,
    formatNumber: formatNumber, formatNumberFixed: formatNumberFixed,
    parseDecimal: parseDecimal, zlToGrosze: zlToGrosze,
    planToCsv: planToCsv, safeFilename: safeFilename,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NinjaCalc = api;
})(this);
