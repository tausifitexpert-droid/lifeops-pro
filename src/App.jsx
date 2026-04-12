import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const initials = (n) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
const avatarColors = ["#6c63ff", "#ff6584", "#43e97b", "#f7971e", "#4facfe", "#fa709a", "#30cfd0", "#a18cd1"];
const avatarColor = (name) => avatarColors[name.charCodeAt(0) % avatarColors.length];
const fmtDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtAmt = (a) => a != null ? `$${Number(a).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";
const todayStr = () => new Date().toISOString().split("T")[0];
const isOverdue = (d) => d && d < todayStr();
const daysUntil = (d) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d + "T12:00:00") - new Date()) / 86400000);
  return diff;
};

// Simulated AI email scanner
const scanEmailForTask = (email) => {
  const subject = email.subject || "";
  const body = email.body || "";
  const fullText = subject + " " + body;
  const fromEmail = email.from_email || email.from || "";

  // ── Vendor: extract from subject line (more accurate than domain) ─────────
  const SKIP_WORDS = new Set([
    "Your","The","A","An","For","Of","In","On","At","To","And","Or","But",
    "Is","Are","Was","Were","Be","Been","Have","Has","Had","Will","Would",
    "Can","Could","Should","May","Might","Account","Bill","Invoice","Payment",
    "Natural","Gas","Ready","Please","Dear","Hello","Hi","Thank","Thanks",
    "From","January","February","March","April","June","July","August",
    "September","October","November","December","Jan","Feb","Mar","Apr",
    "Jun","Jul","Aug","Sep","Oct","Nov","Dec","New","My","Our","You",
    "This","That","With","We","Us","Service","Services","Email","Notice",
  ]);
  let vendor = "";
  const subjectWords = subject.split(/\s+/);
  for (const w of subjectWords) {
    const clean = w.replace(/[^A-Za-z0-9]/g, "");
    if (clean && clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase()
        && !SKIP_WORDS.has(clean) && clean.length > 2) {
      vendor = clean;
      break;
    }
  }
  // Fallback to domain if subject gives nothing
  if (!vendor) {
    const domainMatch = fromEmail.match(/@(?:[^@]+\.)?([^.@]+)\.[a-z]{2,}$/i);
    if (domainMatch) vendor = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
  }

  // ── Amount: priority patterns then fallback to largest $ value ────────────
  const tryAmount = (pattern) => {
    const m = fullText.match(pattern);
    if (m) {
      const num = parseFloat((m[1] || m[0]).replace(/[$,]/g, ""));
      if (num > 0 && num < 1000000) return num;
    }
    return null;
  };
  let amount =
    tryAmount(/amount\s+(?:to\s+be\s+withdrawn|due)[:\s]+\$?([\d,]+\.?\d*)/i) ||
    tryAmount(/total\s+(?:amount\s+)?due[:\s]+\$?([\d,]+\.?\d*)/i) ||
    tryAmount(/balance\s+due[:\s]+\$?([\d,]+\.?\d*)/i) ||
    tryAmount(/(?:please\s+pay|pay\s+now)[:\s]+\$?([\d,]+\.?\d*)/i) ||
    tryAmount(/invoice\s+(?:total|amount)[:\s]+\$?([\d,]+\.?\d*)/i) ||
    null;
  if (!amount) {
    const all = (fullText.match(/\$[\d,]+\.?\d*/g) || [])
      .map(m => parseFloat(m.replace(/[$,]/g, "")))
      .filter(n => n > 0 && n < 1000000);
    if (all.length) amount = Math.max(...all);
  }

  // ── Due date: handles "Due Thursday, Apr 23, 2026" and all common formats ─
  const tryDate = (d) => {
    try {
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return null;
      const yr = parsed.getFullYear();
      if (yr < 2024 || yr > 2028) return null;
      return parsed.toISOString().split("T")[0];
    } catch { return null; }
  };

  let due_date = null;

  // "Due Thursday, Apr 23, 2026" or "Due Monday, April 30, 2026"
  if (!due_date) {
    const m = fullText.match(/[Dd]ue\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+([A-Za-z]+\.?\s+\d{1,2},?\s*\d{4})/);
    if (m) due_date = tryDate(m[1]);
  }
  // "due on/by April 30, 2026" or "payment due: Apr 23, 2026"
  if (!due_date) {
    const m = fullText.match(/(?:due|pay(?:ment)?\s+(?:due|by|before))[:\s]+([A-Za-z]+\.?\s+\d{1,2},?\s*\d{4})/i);
    if (m) due_date = tryDate(m[1]);
  }
  // "due on/by 04/23/2026" or "2026-04-23"
  if (!due_date) {
    const m = fullText.match(/(?:due|pay(?:ment)?\s+(?:due|by|before))[:\s]+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (m) due_date = tryDate(m[1]);
  }
  // Full month name anywhere: "April 23, 2026"
  if (!due_date) {
    const all = fullText.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s*\d{4}/gi) || [];
    for (const m of all) { due_date = tryDate(m); if (due_date) break; }
  }
  // Short month: "Apr 23, 2026"
  if (!due_date) {
    const all = fullText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+\d{1,2},?\s*\d{4}/gi) || [];
    for (const m of all) { due_date = tryDate(m); if (due_date) break; }
  }
  // ISO: "2026-04-23"
  if (!due_date) {
    const all = fullText.match(/\b(20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/g) || [];
    for (const m of all) { due_date = tryDate(m); if (due_date) break; }
  }
  // US slash: "04/23/2026"
  if (!due_date) {
    const all = fullText.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g) || [];
    for (const m of all) {
      const p = m.split("/");
      due_date = tryDate(p[2] + "-" + p[0].padStart(2,"0") + "-" + p[1].padStart(2,"0"));
      if (due_date) break;
    }
  }

  // ── Category ──────────────────────────────────────────────────────────────
  const t = fullText.toLowerCase();
  let category = "payment";
  if (t.includes("subscription") || t.includes("renewal") || t.includes("renew")) category = "subscription";
  else if (t.includes("domain") || t.includes("hosting")) category = "domain";
  else if (t.includes("invoice")) category = "invoice";
  else if (t.includes("tax") || t.includes("irs") || t.includes("vat")) category = "tax";
  else if (t.includes("insurance")) category = "insurance";

  return {
    title: subject.replace(/^(Re:|Fwd:)\s*/i, "").slice(0, 80),
    vendor, amount, due_date, category,
    description: "Auto-extracted from: " + fromEmail + " on " + fmtDate(email.date),
    source: "email",
    email_id: email.id,
    priority: amount && amount > 500 ? "high" : amount && amount > 100 ? "medium" : "low",
  };

};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=Nunito+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --bg:#f4f5f7; --surface:#ffffff; --surface2:#f0f2f8; --surface3:#e8ebf4;
    --border:#dde1ee; --border2:#c8cedf;
    --navy:#1b2a7b; --navy-dark:#131f5e; --navy-light:#2d3d9a;
    --gold:#c9a84c; --gold-dark:#a8852e; --gold-light:#dfc073;
    --teal:#2a7a7a; --teal-light:#e8f4f4;
    --accent:#1b2a7b; --accent-glow:rgba(27,42,123,0.15);
    --accent2:#e05252; --accent3:#2a7a7a; --accent4:#c9a84c;
    --text:#1a1f3a; --text2:#5a6380; --text3:#9099bb;
    --high:#e05252; --med:#c9a84c; --low:#2a7a7a;
    --radius:12px; --radius-lg:18px;
    --shadow:0 2px 12px rgba(27,42,123,0.07);
    --shadow-md:0 4px 24px rgba(27,42,123,0.12);
    --shadow-lg:0 8px 48px rgba(27,42,123,0.18);
    --transition:0.2s cubic-bezier(0.4,0,0.2,1);
  }
  body { font-family:'Nunito Sans',sans-serif; background:var(--bg); color:var(--text); min-height:100vh; overflow-x:hidden; }
  h1,h2,h3,h4 { font-family:'Playfair Display',serif; }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:var(--surface2); }
  ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:3px; }

  /* Auth */
  .auth-bg { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,var(--navy) 0%,var(--navy-dark) 60%,#0f1840 100%); position:relative; overflow:hidden; }
  .auth-bg::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 70% 60% at 80% 20%,rgba(201,168,76,0.12),transparent),radial-gradient(ellipse 50% 50% at 10% 80%,rgba(42,122,122,0.1),transparent); }
  .auth-bg::after { content:''; position:absolute; top:-200px; right:-200px; width:600px; height:600px; border:1px solid rgba(201,168,76,0.08); border-radius:50%; }
  .auth-card { background:var(--surface); border-radius:24px; padding:52px; width:100%; max-width:480px; box-shadow:0 24px 80px rgba(0,0,0,0.4); position:relative; z-index:1; }
  .auth-logo { font-family:'Playfair Display',serif; font-size:28px; font-weight:700; color:var(--navy); margin-bottom:6px; display:flex; align-items:center; gap:10px; }
  .auth-logo em { color:var(--gold); font-style:italic; }
  .auth-sub { color:var(--text2); font-size:14px; margin-bottom:36px; line-height:1.6; }
  .auth-tabs { display:flex; background:var(--surface2); border-radius:10px; padding:4px; gap:4px; margin-bottom:28px; border:1px solid var(--border); }
  .auth-tab { flex:1; padding:10px; text-align:center; font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:13px; cursor:pointer; border:none; background:none; color:var(--text3); border-radius:8px; transition:var(--transition); letter-spacing:0.3px; }
  .auth-tab.active { background:var(--navy); color:#fff; box-shadow:0 2px 12px rgba(27,42,123,0.3); }

  /* Fields */
  .field { margin-bottom:18px; }
  .field label { display:block; font-size:11px; font-weight:700; color:var(--text2); margin-bottom:7px; text-transform:uppercase; letter-spacing:1px; }
  .field input,.field select,.field textarea { width:100%; background:var(--surface); border:1.5px solid var(--border); border-radius:10px; padding:12px 16px; color:var(--text); font-family:'Nunito Sans',sans-serif; font-size:14px; outline:none; transition:all var(--transition); }
  .field input:focus,.field select:focus,.field textarea:focus { border-color:var(--navy); box-shadow:0 0 0 3px rgba(27,42,123,0.1); }
  .field input:hover,.field select:hover { border-color:var(--border2); }
  .field select { cursor:pointer; } .field select option { background:var(--surface); color:var(--text); }
  .field textarea { resize:vertical; min-height:80px; line-height:1.6; }
  .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .field-row-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }

  /* Buttons */
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:11px 24px; border-radius:50px; font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:13px; cursor:pointer; border:none; transition:all var(--transition); text-decoration:none; white-space:nowrap; letter-spacing:0.3px; }
  .btn-primary { background:var(--gold); color:#1a1203; }
  .btn-primary:hover { background:var(--gold-dark); transform:translateY(-2px); box-shadow:0 6px 24px rgba(201,168,76,0.4); }
  .btn-navy { background:var(--navy); color:#fff; }
  .btn-navy:hover { background:var(--navy-dark); transform:translateY(-2px); box-shadow:0 6px 24px rgba(27,42,123,0.35); }
  .btn-success { background:var(--teal); color:#fff; }
  .btn-success:hover { background:#1f6060; transform:translateY(-1px); }
  .btn-danger { background:var(--accent2); color:#fff; }
  .btn-danger:hover { background:#c94040; }
  .btn-warn { background:var(--gold); color:#1a1203; }
  .btn-warn:hover { background:var(--gold-dark); }
  .btn-ghost { background:var(--surface); color:var(--text2); border:1.5px solid var(--border); border-radius:50px; }
  .btn-ghost:hover { border-color:var(--navy); color:var(--navy); background:var(--surface2); }
  .btn-outline-navy { background:transparent; color:var(--navy); border:1.5px solid var(--navy); border-radius:50px; }
  .btn-outline-navy:hover { background:var(--navy); color:#fff; }
  .btn-sm { padding:7px 16px; font-size:12px; }
  .btn-xs { padding:5px 12px; font-size:11px; }
  .btn-full { width:100%; border-radius:10px; }
  .btn-icon { padding:8px; border-radius:8px; aspect-ratio:1; }
  .btn-icon-sm { padding:6px; border-radius:7px; aspect-ratio:1; }
  .btn:disabled { opacity:0.45; cursor:not-allowed; transform:none !important; box-shadow:none !important; }

  /* Alerts */
  .alert { padding:12px 16px; border-radius:10px; font-size:13px; margin-bottom:14px; display:flex; align-items:flex-start; gap:10px; line-height:1.5; }
  .alert-error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
  .alert-success { background:#f0faf8; border:1px solid #a7d7d7; color:var(--teal); }
  .alert-info { background:#eef1fb; border:1px solid #c3caf0; color:var(--navy); }
  .alert-warn { background:#fef9ec; border:1px solid #f0d98a; color:#92650a; }

  /* Layout */
  .app-layout { display:flex; min-height:100vh; }
  .sidebar { width:260px; background:var(--navy); display:flex; flex-direction:column; padding:0; position:fixed; top:0; left:0; height:100vh; z-index:100; overflow-y:auto; box-shadow:4px 0 20px rgba(27,42,123,0.2); }
  .sidebar-logo { font-family:'Playfair Display',serif; font-size:21px; font-weight:700; color:#fff; padding:26px 22px 22px; margin-bottom:0; letter-spacing:-0.3px; display:flex; align-items:center; gap:10px; border-bottom:1px solid rgba(255,255,255,0.1); }
  .sidebar-logo em { color:var(--gold); font-style:italic; }
  .nav-section { padding:16px 12px 0; }
  .nav-label { font-size:10px; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:1.5px; padding:0 12px; margin-bottom:6px; margin-top:8px; }
  .nav-item { display:flex; align-items:center; gap:11px; padding:11px 12px; border-radius:10px; cursor:pointer; transition:all var(--transition); color:rgba(255,255,255,0.6); font-size:13.5px; font-weight:600; border:none; background:none; width:100%; text-align:left; position:relative; letter-spacing:0.2px; }
  .nav-item:hover { background:rgba(255,255,255,0.1); color:#fff; }
  .nav-item.active { background:var(--gold); color:#1a1203; font-weight:700; }
  .nav-item.active svg { opacity:1; }
  .nav-badge { margin-left:auto; background:var(--accent2); color:#fff; font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px; font-family:'Nunito Sans',sans-serif; }
  .sidebar-bottom { margin-top:auto; padding:12px; border-top:1px solid rgba(255,255,255,0.1); }
  .user-card { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:12px; display:flex; align-items:center; gap:11px; }
  .avatar { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-weight:700; font-size:14px; flex-shrink:0; color:#fff; }
  .avatar-lg { width:52px; height:52px; font-size:20px; border-radius:14px; }
  .avatar-xl { width:64px; height:64px; font-size:24px; border-radius:18px; }
  .user-info { flex:1; min-width:0; }
  .user-name { font-size:13px; font-weight:700; color:#fff; font-family:'Nunito Sans',sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .user-role { font-size:10px; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.8px; margin-top:2px; }

  .main-content { margin-left:260px; flex:1; padding:36px 40px; min-height:100vh; max-width:calc(100vw - 260px); }
  .page-header { margin-bottom:28px; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
  .page-title { font-family:'Playfair Display',serif; font-size:28px; font-weight:700; color:var(--navy); letter-spacing:-0.3px; margin-bottom:4px; }
  .page-sub { color:var(--text2); font-size:13.5px; font-weight:400; }

  /* Stats */
  .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
  .stats-grid-3 { grid-template-columns:repeat(3,1fr); }
  .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:22px; position:relative; overflow:hidden; transition:all var(--transition); box-shadow:var(--shadow); }
  .stat-card.clickable { cursor:pointer; }
  .stat-card.clickable:hover { border-color:var(--navy); transform:translateY(-3px); box-shadow:var(--shadow-md); }
  .stat-card.active-filter { border-color:var(--gold) !important; box-shadow:0 0 0 2px rgba(201,168,76,0.2); }
  .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
  .stat-c1::before { background:var(--navy); }
  .stat-c2::before { background:var(--accent2); }
  .stat-c3::before { background:var(--gold); }
  .stat-c4::before { background:var(--teal); }
  .stat-num { font-family:'Playfair Display',serif; font-size:32px; font-weight:700; margin-bottom:4px; color:var(--navy); }
  .stat-label { font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:0.8px; font-weight:700; }
  .stat-sub { font-size:11px; color:var(--text3); margin-top:4px; }
  .stat-icon { position:absolute; top:18px; right:18px; opacity:0.06; color:var(--navy); }

  /* Cards */
  .card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:24px; box-shadow:var(--shadow); }
  .card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
  .card-title { font-family:'Playfair Display',serif; font-size:16px; font-weight:600; color:var(--navy); display:flex; align-items:center; gap:8px; }

  /* Toolbar */
  .toolbar { display:flex; align-items:center; gap:10px; margin-bottom:20px; flex-wrap:wrap; }
  .search-wrap { position:relative; flex:1; min-width:200px; }
  .search-wrap input { width:100%; background:var(--surface); border:1.5px solid var(--border); border-radius:50px; padding:10px 16px 10px 40px; color:var(--text); font-family:'Nunito Sans',sans-serif; font-size:13px; outline:none; transition:all var(--transition); box-shadow:var(--shadow); }
  .search-wrap input:focus { border-color:var(--navy); box-shadow:0 0 0 3px rgba(27,42,123,0.1); }
  .search-ico { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none; }
  .flt-select { background:var(--surface); border:1.5px solid var(--border); border-radius:50px; padding:10px 16px; color:var(--text); font-family:'Nunito Sans',sans-serif; font-size:13px; outline:none; cursor:pointer; box-shadow:var(--shadow); }
  .flt-select:focus { border-color:var(--navy); }

  /* Task list */
  .task-list { display:flex; flex-direction:column; gap:10px; }
  .task-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:18px 20px; display:flex; align-items:flex-start; gap:14px; transition:all var(--transition); cursor:pointer; box-shadow:var(--shadow); }
  .task-card:hover { border-color:var(--navy); transform:translateY(-1px); box-shadow:var(--shadow-md); }
  .task-card.overdue-card { border-left:3px solid var(--high); }
  .task-card.admin-paid-card { border-left:3px solid var(--teal); }
  .task-check { width:20px; height:20px; border-radius:6px; border:2px solid var(--border2); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all var(--transition); flex-shrink:0; margin-top:2px; }
  .task-check:hover { border-color:var(--navy); }
  .task-check.checked { background:var(--teal); border-color:var(--teal); }
  .task-body { flex:1; min-width:0; }
  .task-title { font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:14px; margin-bottom:3px; color:var(--text); }
  .task-title.done { text-decoration:line-through; color:var(--text3); }
  .task-vendor { font-size:12px; color:var(--text2); margin-bottom:8px; display:flex; align-items:center; gap:5px; }
  .task-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .task-amount { font-family:'Playfair Display',serif; font-weight:700; font-size:16px; color:var(--navy); flex-shrink:0; }

  /* Badges */
  .badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; white-space:nowrap; }
  .badge-high { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
  .badge-medium { background:#fef9ec; color:#92650a; border:1px solid #f0d98a; }
  .badge-low { background:#f0faf8; color:var(--teal); border:1px solid #a7d7d7; }
  .badge-pending { background:#eef1fb; color:var(--navy); border:1px solid #c3caf0; }
  .badge-completed { background:#f0faf8; color:var(--teal); border:1px solid #a7d7d7; }
  .badge-overdue { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
  .badge-admin-paid { background:#f0faf8; color:var(--teal); border:1px solid #a7d7d7; }
  .badge-email { background:#eef1fb; color:var(--navy); border:1px solid #c3caf0; }
  .badge-manual { background:var(--surface2); color:var(--text3); border:1px solid var(--border); }
  .chip { background:var(--surface2); color:var(--text2); padding:3px 10px; border-radius:20px; font-size:11px; border:1px solid var(--border); font-weight:500; }

  /* Overlays & Modals */
  .overlay { position:fixed; inset:0; background:rgba(27,42,123,0.45); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; animation:fadeIn 0.15s ease; }
  @keyframes fadeIn { from{opacity:0}to{opacity:1} }
  .modal { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); width:100%; max-width:580px; box-shadow:0 24px 64px rgba(27,42,123,0.2); max-height:92vh; overflow-y:auto; animation:slideUp 0.2s ease; }
  .modal-lg { max-width:700px; }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
  .modal-head { padding:28px 28px 0; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:24px; }
  .modal-title { font-family:'Playfair Display',serif; font-size:22px; font-weight:700; color:var(--navy); }
  .modal-close { background:var(--surface2); border:1px solid var(--border); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text2); transition:all var(--transition); flex-shrink:0; }
  .modal-close:hover { color:var(--navy); border-color:var(--navy); background:var(--surface3); }
  .modal-body { padding:0 28px; }
  .modal-foot { padding:20px 28px 28px; display:flex; gap:10px; justify-content:flex-end; margin-top:24px; border-top:1px solid var(--border); }

  /* Payment methods */
  .pm-card { background:var(--surface); border:1.5px solid var(--border); border-radius:var(--radius); padding:16px; display:flex; align-items:center; gap:14px; transition:all var(--transition); margin-bottom:10px; box-shadow:var(--shadow); }
  .pm-card:hover { border-color:var(--navy); transform:translateY(-1px); box-shadow:var(--shadow-md); }
  .pm-card.default-pm { border-color:var(--gold); background:#fffdf5; }
  .pm-icon { width:44px; height:32px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:18px; background:var(--surface2); flex-shrink:0; }
  .pm-info { flex:1; }
  .pm-label { font-size:14px; font-weight:600; color:var(--text); }
  .pm-type { font-size:11px; color:var(--text3); margin-top:2px; text-transform:uppercase; letter-spacing:0.5px; }
  .pm-default-badge { background:#fef9ec; color:var(--gold-dark); font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px; border:1px solid #f0d98a; }

  /* Reminder rows */
  .reminder-row { display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--surface2); border-radius:10px; margin-bottom:8px; border:1px solid var(--border); }
  .days-input-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  .days-input { width:80px; background:var(--surface); border:1.5px solid var(--border); border-radius:8px; padding:8px 10px; color:var(--text); font-size:14px; outline:none; text-align:center; }
  .days-input:focus { border-color:var(--navy); }

  /* Service cards */
  .service-card { background:var(--surface); border:2px solid var(--border); border-radius:var(--radius); padding:24px; transition:all var(--transition); cursor:pointer; position:relative; box-shadow:var(--shadow); }
  .service-card:hover { border-color:var(--navy); transform:translateY(-4px); box-shadow:var(--shadow-lg); }
  .service-card.enrolled { border-color:var(--gold); background:#fffdf5; }
  .service-icon { font-size:32px; margin-bottom:12px; }
  .service-name { font-family:'Playfair Display',serif; font-weight:700; font-size:18px; margin-bottom:6px; color:var(--navy); }
  .service-desc { font-size:13px; color:var(--text2); line-height:1.7; margin-bottom:14px; }
  .service-price { font-family:'Playfair Display',serif; font-weight:700; font-size:24px; color:var(--navy); }
  .service-price-note { font-size:11px; color:var(--text3); margin-top:2px; }
  .popular-tag { position:absolute; top:-1px; right:16px; background:var(--gold); color:#1a1203; font-size:10px; font-weight:700; padding:4px 12px; border-radius:0 0 10px 10px; font-family:'Nunito Sans',sans-serif; text-transform:uppercase; letter-spacing:0.5px; }

  /* Toast */
  .toast-wrap { position:fixed; top:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:10px; pointer-events:none; }
  .toast { background:var(--navy); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px 18px; max-width:340px; box-shadow:0 8px 32px rgba(27,42,123,0.35); display:flex; align-items:flex-start; gap:12px; pointer-events:all; animation:toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes toastIn { from{opacity:0;transform:translateX(40px) scale(0.9)}to{opacity:1;transform:translateX(0) scale(1)} }
  .toast-icon { font-size:20px; flex-shrink:0; margin-top:1px; }
  .toast-content { flex:1; }
  .toast-title { font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:13px; margin-bottom:2px; color:#fff; }
  .toast-msg { font-size:12px; color:rgba(255,255,255,0.65); line-height:1.4; }

  /* Banner */
  .banner { background:#fef9ec; border:1px solid #f0d98a; border-radius:var(--radius); padding:14px 20px; display:flex; align-items:center; gap:14px; margin-bottom:20px; }
  .banner-icon { font-size:22px; flex-shrink:0; }
  .banner-text { flex:1; font-size:13px; color:#92650a; }
  .banner-text strong { font-family:'Nunito Sans',sans-serif; font-weight:700; }

  /* Tables */
  .data-table { width:100%; border-collapse:collapse; }
  .data-table th { background:var(--navy); padding:12px 16px; text-align:left; font-size:10px; font-weight:700; color:rgba(255,255,255,0.7); text-transform:uppercase; letter-spacing:1px; border-bottom:none; font-family:'Nunito Sans',sans-serif; }
  .data-table td { padding:13px 16px; font-size:13px; border-bottom:1px solid var(--border); vertical-align:middle; }
  .data-table tr:last-child td { border-bottom:none; }
  .data-table tbody tr { transition:background var(--transition); cursor:pointer; }
  .data-table tbody tr:hover td { background:var(--surface2); }
  .table-wrap { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow); }

  /* Tabs */
  .tabs { display:flex; gap:4px; background:var(--surface2); border-radius:50px; padding:4px; margin-bottom:24px; border:1px solid var(--border); }
  .tab-btn { flex:1; padding:9px; text-align:center; font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:12px; cursor:pointer; border:none; background:none; color:var(--text3); border-radius:50px; transition:all var(--transition); letter-spacing:0.3px; }
  .tab-btn.active { background:var(--navy); color:#fff; box-shadow:0 2px 10px rgba(27,42,123,0.25); }
  .tab-btn:hover:not(.active) { color:var(--navy); background:rgba(27,42,123,0.06); }

  /* Form sections */
  .form-section { background:var(--surface2); border-radius:12px; padding:18px; margin-bottom:14px; border:1px solid var(--border); }
  .form-section-title { font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:12px; color:var(--navy); margin-bottom:14px; display:flex; align-items:center; gap:8px; text-transform:uppercase; letter-spacing:0.8px; }

  /* Email items */
  .email-item { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:16px; margin-bottom:10px; cursor:pointer; transition:all var(--transition); box-shadow:var(--shadow); }
  .email-item:hover { border-color:var(--navy); transform:translateY(-1px); box-shadow:var(--shadow-md); }
  .email-item.has-task { border-left:3px solid var(--teal); }
  .email-item.no-task { border-left:3px solid var(--border2); }
  .email-subject { font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:13px; margin-bottom:4px; color:var(--text); }
  .email-from { font-size:11px; color:var(--text3); margin-bottom:8px; }
  .email-preview { font-size:12px; color:var(--text2); line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }

  /* Empty state */
  .empty-state { text-align:center; padding:60px 32px; color:var(--text3); }
  .empty-state-icon { font-size:48px; margin-bottom:16px; opacity:0.3; filter:grayscale(1); }
  .empty-state p { font-size:14px; color:var(--text2); }

  /* Loading */
  .loading-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:200px; gap:16px; color:var(--text2); font-size:14px; }
  .spinner { width:32px; height:32px; border:3px solid var(--border); border-top-color:var(--navy); border-radius:50%; animation:spin 0.8s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }

  /* Progress */
  .progress-bar { height:6px; background:var(--surface3); border-radius:3px; overflow:hidden; margin-top:6px; }
  .progress-fill { height:100%; border-radius:3px; transition:width 0.4s ease; }

  /* Divider */
  .divider { border:none; border-top:1px solid var(--border); margin:20px 0; }

  /* Due urgency */
  .due-urgent { color:var(--high); }
  .due-soon { color:var(--med); }
  .due-ok { color:var(--teal); }
  .due-normal { color:var(--text2); }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────
function Ico({ n, size = 16, style }) {
  const s = { width: size, height: size, display: "inline-block", flexShrink: 0, ...style };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    tasks: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
    email: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    payment: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    admin: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    cal: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    scan: <><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></>,
    dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    warn: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,
    close: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    service: <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
    sms: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}>
      {paths[n]}
    </svg>
  );
}

// ─── Toast System ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "info", title = "") => {
    const id = uid();
    const icons = { success: "✅", error: "❌", info: "💡", warn: "⚠️", payment: "💳", email: "📧", sms: "📱" };
    setToasts(t => [...t, { id, msg, type, title: title || type.toUpperCase(), icon: icons[type] || "💡" }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <span className="toast-icon">{t.icon}</span>
          <div className="toast-content">
            <div className="toast-title">{t.title}</div>
            <div className="toast-msg">{t.msg}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Due Date Helper ──────────────────────────────────────────────────────────
function DueBadge({ dueDate, status }) {
  if (!dueDate || status === "completed") return null;
  const days = daysUntil(dueDate);
  if (days === null) return null;
  if (days < 0) return <span className="badge badge-overdue">⚠ Overdue {Math.abs(days)}d</span>;
  if (days === 0) return <span className="badge badge-overdue">Due Today!</span>;
  if (days <= 7) return <span className="badge" style={{ background: "rgba(245,158,11,0.15)", color: "var(--med)" }}>Due in {days}d</span>;
  if (days <= 30) return <span className="badge" style={{ background: "rgba(99,91,255,0.1)", color: "var(--navy)" }}>Due in {days}d</span>;
  return <span className="badge" style={{ background: "rgba(0,212,170,0.08)", color: "var(--teal)" }}>Due {fmtDate(dueDate)}</span>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError("Email and password required."); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    setLoading(false);
    onLogin({ ...data.user, ...profile });
  };

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) { setError("All fields required."); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    await supabase.from("profiles").upsert({
      id: data.user.id,
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      role: "user",
      reminder_days: [30, 7],
      notify_email: true,
      notify_sms: true,
    });
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    setLoading(false);
    onLogin({ ...data.user, ...profile });
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">⚡ Task<em>Flow</em> Pro</div>
        <div className="auth-sub">Smart task & payment management for teams</div>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Sign In</button>
          <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>Create Account</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {tab === "register" && (
          <>
            <div className="field"><label>Full Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Alice Chen" /></div>
            <div className="field"><label>Phone (for SMS reminders)</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1-555-0100" /></div>
          </>
        )}
        <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
        <div className="field"><label>Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} /></div>
        <button className="btn btn-primary btn-full" onClick={tab === "login" ? handleLogin : handleRegister} style={{ marginTop: 4 }}>
          {tab === "login" ? "Sign In →" : "Create Account →"}
        </button>
        {tab === "login" && (
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
            Demo: admin@taskflow.com / admin123 &nbsp;|&nbsp; alice@example.com / alice123
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task Modal (Create / Edit) ───────────────────────────────────────────────
function TaskModal({ task, onSave, onClose, user, paymentMethods = [] }) {
  const defaultPM = paymentMethods.find(pm => pm.is_default)?.id || "";

  const [form, setForm] = useState({
    title: task?.title || "",
    vendor: task?.vendor || "",
    description: task?.description || "",
    amount: task?.amount ?? "",
    due_date: task?.due_date || "",
    priority: task?.priority || "medium",
    status: task?.status || "pending",
    category: task?.category || "payment",
    payment_method_id: task?.payment_method_id || defaultPM,
    tags: task?.tags || [],
    admin_service: task?.admin_service || false,
    reminder_days: task?.reminder_days || user?.reminder_days || [30, 7],
  });
  const [tagInput, setTagInput] = useState("");

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      f("tags", [...form.tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  const removeTag = (t) => f("tags", form.tags.filter(x => x !== t));
  const setReminderDay = (idx, val) => {
    const r = [...form.reminder_days];
    r[idx] = parseInt(val) || 0;
    f("reminder_days", r);
  };
  const addReminder = () => f("reminder_days", [...form.reminder_days, 14]);
  const removeReminder = (idx) => f("reminder_days", form.reminder_days.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!form.title) return;
    // payment_method_id must be a UUID or null — never a plain string like "credit_card"
    const isValidUUID = v => v && /^[0-9a-f-]{36}$/i.test(v);
    const cleanForm = {
      ...form,
      amount: form.amount ? parseFloat(form.amount) : null,
      payment_method_id: isValidUUID(form.payment_method_id) ? form.payment_method_id : null,
    };
    onSave(cleanForm);
  };

  const pmIcons = { credit_card: "💳", ach: "🏦", bank: "🏛️", wire: "🌐", check: "📝" };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <div className="modal-title">{task ? "✏️ Edit Task" : "➕ New Task"}</div>
          <button className="modal-close" onClick={onClose}><Ico n="close" size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <div className="form-section-title">📋 Task Details</div>
            <div className="field"><label>Title *</label><input value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. AWS Invoice March 2026" /></div>
            <div className="field-row">
              <div className="field"><label>Vendor / Company</label><input value={form.vendor} onChange={e => f("vendor", e.target.value)} placeholder="Amazon Web Services" /></div>
              <div className="field"><label>Category</label>
                <select value={form.category} onChange={e => f("category", e.target.value)}>
                  <option value="payment">Payment</option>
                  <option value="subscription">Subscription</option>
                  <option value="invoice">Invoice</option>
                  <option value="domain">Domain / Hosting</option>
                  <option value="tax">Tax</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Amount ($)</label><input type="number" step="0.01" value={form.amount} onChange={e => f("amount", e.target.value)} placeholder="0.00" /></div>
              <div className="field"><label>Due Date</label><input type="date" value={form.due_date} onChange={e => f("due_date", e.target.value)} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Priority</label>
                <select value={form.priority} onChange={e => f("priority", e.target.value)}>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
              <div className="field"><label>Status</label>
                <select value={form.status} onChange={e => f("status", e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="field"><label>Description</label><textarea value={form.description} onChange={e => f("description", e.target.value)} placeholder="Additional notes..." /></div>
          </div>

          <div className="form-section">
            <div className="form-section-title">💳 Payment & Reminders</div>
            <div className="field"><label>Payment Method</label>
              <select value={form.payment_method_id} onChange={e => f("payment_method_id", e.target.value)}>
                <option value="">— No payment method —</option>
                {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pmIcons[pm.type] || "💳"} {pm.label}{pm.is_default ? " (Default)" : ""}</option>)}
                {paymentMethods.length === 0 && (
                  <option value="" disabled>Add a payment method in Settings first</option>
                )}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Reminder Schedule</div>
              {form.reminder_days.map((d, i) => (
                <div key={i} className="days-input-row">
                  <span style={{ fontSize: 13, color: "var(--text2)" }}>{i === 0 ? "📅 1st reminder:" : i === 1 ? "📅 2nd reminder:" : `📅 Reminder ${i + 1}:`}</span>
                  <input className="days-input" type="number" min="1" max="365" value={d} onChange={e => setReminderDay(i, e.target.value)} />
                  <span style={{ fontSize: 13, color: "var(--text2)" }}>days before due</span>
                  {form.reminder_days.length > 1 && (
                    <button className="btn btn-ghost btn-icon-sm" onClick={() => removeReminder(i)}><Ico n="close" size={12} /></button>
                  )}
                </div>
              ))}
              {form.reminder_days.length < 5 && (
                <button className="btn btn-ghost btn-sm" onClick={addReminder} style={{ marginTop: 4 }}><Ico n="plus" size={12} />Add Reminder</button>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">🛡️ Admin Managed Service</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1 }}>
                <div style={{ position: "relative", width: 44, height: 24 }} onClick={() => f("admin_service", !form.admin_service)}>
                  <div style={{ width: 44, height: 24, background: form.admin_service ? "var(--navy)" : "var(--surface3)", borderRadius: 12, transition: "background var(--transition)", border: "1px solid var(--border)" }} />
                  <div style={{ position: "absolute", top: 3, left: form.admin_service ? 22 : 3, width: 16, height: 16, background: "#fff", borderRadius: "50%", transition: "left var(--transition)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Enable Admin-Managed Payment</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>Admin team pays this on your behalf before due date</div>
                </div>
              </label>
            </div>
            {form.admin_service && (
              <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 0 }}>
                ✅ This task will be queued for admin payment. You'll receive email & SMS confirmation once processed. A small service fee applies.
              </div>
            )}
          </div>

          <div className="form-section">
            <div className="form-section-title">🏷️ Tags</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {form.tags.map(t => (
                <span key={t} className="chip" style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px" }}>
                  {t}
                  <button onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} placeholder="Add tag..." style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 13, outline: "none" }} />
              <button className="btn btn-ghost btn-sm" onClick={addTag}>Add</button>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.title}>
            {task ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────
function TaskDetailPanel({ task, onClose, onEdit, onDelete, onAdminPay, user, showToast }) {
  const days = daysUntil(task.due_date);
  const [paying, setPaying] = useState(false);

  const handleAdminPay = async () => {
    setPaying(true);
    await supabase.from("tasks").update({
      admin_paid: true,
      admin_paid_at: new Date().toISOString(),
      admin_paid_by: user.id,
      status: "completed",
    }).eq("id", task.id);
    await supabase.from("notifications").insert({
      user_id: task.user_id,
      type: "payment",
      title: "Payment Processed by Admin",
      message: `Your ${task.vendor} payment of ${fmtAmt(task.amount)} has been processed by the admin team.`,
    });
    showToast(`Payment of ${fmtAmt(task.amount)} to ${task.vendor} processed!`, "payment", "Payment Sent");
    setPaying(false);
    onAdminPay();
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="side-panel" style={{ position: "relative", height: "auto", maxHeight: "90vh", width: 520, borderRadius: "var(--radius-lg)", animation: "slideUp 0.2s ease" }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">{task.title}</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>
              {task.vendor && `${task.vendor} · `}Created {fmtDate(task.createdAt)}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><Ico n="close" size={14} /></button>
        </div>
        <div className="panel-body" style={{ maxHeight: "60vh", padding: "20px 28px" }}>
          {/* Amount & Status */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: "var(--surface2)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>Amount</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 26, color: task.adminPaid ? "var(--accent3)" : "var(--text)" }}>{fmtAmt(task.amount)}</div>
            </div>
            <div style={{ flex: 1, background: "var(--surface2)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>Due Date</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: days !== null && days < 0 ? "var(--high)" : days !== null && days <= 7 ? "var(--med)" : "var(--text)" }}>
                {fmtDate(task.dueDate)}
                {days !== null && <span style={{ fontSize: 12, color: "var(--text3)", display: "block", marginTop: 2 }}>
                  {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today!" : `${days} days left`}
                </span>}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <span className={`badge badge-${task.priority}`}>{task.priority}</span>
            <span className={`badge badge-${task.status}`}>{task.status}</span>
            {task.admin_paid && <span className="badge badge-admin-paid">✅ Admin Paid</span>}
            {task.admin_service && !task.admin_paid && <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "var(--med)" }}>🛡️ Admin Managed</span>}
            <span className={`badge badge-${task.source === "email" ? "email" : "manual"}`}>{task.source === "email" ? "📧 Email" : "✍️ Manual"}</span>
          </div>

          {/* Description */}
          {task.description && (
            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{task.description}</div>
          )}

          {/* Payment method */}
          {task.payment_method_id && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>Payment Method</div>
              <div className="pm-card" style={{ margin: 0 }}>
                <div className="pm-icon">💳</div>
                <div className="pm-info"><div className="pm-label">{task.payment_method_id}</div><div className="pm-type">Saved method</div></div>
              </div>
            </div>
          )}

          {/* Reminders */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>Reminder Schedule</div>
            {(task.reminder_days || []).map((r, i) => {
              const reminderDate = task.due_date ? new Date(new Date(task.due_date + "T12:00:00").getTime() - r.days * 86400000).toISOString().split("T")[0] : null;
              return (
                <div key={i} className="reminder-row">
                  <div className={`reminder-icon-wrap ${r.sent ? "sent" : "pending"}`}>{r.sent ? "✅" : "⏰"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{r.days} days before due</div>
                    {reminderDate && <div style={{ fontSize: 11, color: "var(--text3)" }}>Scheduled: {fmtDate(reminderDate)}</div>}
                  </div>
                  <span style={{ fontSize: 11, color: r.sent ? "var(--accent3)" : "var(--text3)" }}>{r.sent ? "Sent" : "Pending"}</span>
                </div>
              );
            })}
          </div>



          {/* Tags */}
          {(task.tags || []).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {task.tags.map(t => <span key={t} className="chip">{t}</span>)}
            </div>
          )}
        </div>
        <div className="panel-foot" style={{ flexWrap: "wrap" }}>
          {user.role === "admin" && !task.admin_paid && (
            <button className="btn btn-success" onClick={handleAdminPay} disabled={paying} style={{ flex: "1 1 auto" }}>
              {paying ? "Processing..." : "💳 Pay Now on Behalf"}
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => onEdit(task)} style={{ flex: 1 }}><Ico n="edit" size={14} />Edit</button>
          <button className="btn btn-ghost" onClick={() => { onDelete(task.id); onClose(); }} style={{ color: "var(--high)", flex: 1 }}><Ico n="trash" size={14} />Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Scanner ─────────────────────────────────────────────────────────────
function EmailScanner({ user, onTaskCreated, showToast }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [connectedProviders, setConnectedProviders] = useState([]);
  const [preview, setPreview] = useState(null);
  const [extractedTask, setExtractedTask] = useState(null);
  const [saving, setSaving] = useState(false);

  const EDGE_URL = "https://vqxuuswirettloxbeudp.supabase.co/functions/v1/fetch-emails";

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase.from("emails").select("*")
        .eq("user_id", user.id).order("date", { ascending: false });
      if (error) console.error("fetchEmails error:", error);
      setEmails(data || []);
      // Detect which providers are already connected
      const providers = [...new Set((data || []).map(e => e.provider).filter(p => p !== "manual"))];
      setConnectedProviders(providers);
    } catch (err) {
      console.error("EmailScanner fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchEmails(); }, []);

  // ── OAuth connect ─────────────────────────────────────────────────────────
  const connectProvider = async (provider) => {
    // Client ID is public (not secret) - safe to use as fallback
    const gmailClientId = import.meta.env.VITE_GMAIL_CLIENT_ID || "1018727582688-0b22j00b3npmfgmg068o2qrf10malnu9.apps.googleusercontent.com";
    const outlookClientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID || "";
    const redirectUri = `${window.location.origin}${window.location.pathname}`;

    if (provider === "gmail") {
      if (!gmailClientId) {
        showToast("Gmail Client ID not configured.", "error", "Config Error");
        return;
      }
      const params = new URLSearchParams({
        client_id: gmailClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        access_type: "offline",
        prompt: "consent",
        state: `gmail_oauth_${user.id}`,
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    } else if (provider === "outlook") {
      if (!outlookClientId) {
        showToast("Add VITE_OUTLOOK_CLIENT_ID to your GitHub Secrets to enable Outlook.", "warn", "Setup Required");
        return;
      }
      const params = new URLSearchParams({
        client_id: outlookClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://graph.microsoft.com/Mail.Read offline_access",
        state: `outlook_oauth_${user.id}`,
      });
      window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
    }
  };

  // ── Handle OAuth callback (runs on page load if ?code= is in URL) ─────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const errorParam = params.get("error");

    // Show any OAuth error from Google
    if (errorParam) {
      window.history.replaceState({}, "", window.location.pathname);
      showToast(`Google error: ${errorParam}`, "error", "OAuth Error");
      return;
    }

    if (!code || !state) return;

    // Detect provider from state
    const provider = state.startsWith("gmail_oauth") ? "gmail"
                   : state.startsWith("outlook_oauth") ? "outlook"
                   : null;
    if (!provider) return;

    // Clear URL params immediately
    window.history.replaceState({}, "", window.location.pathname);
    showToast("Google redirected back ✅ — exchanging code...", "info", "Step 1");

    const exchangeCode = async () => {
      setConnecting(provider);
      showToast(`Connecting ${provider === "gmail" ? "Gmail" : "Outlook"}...`, "email", "Connecting");
      try {
        // Wait for session to be restored (up to 5 seconds)
        let session = null;
        for (let i = 0; i < 10; i++) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.access_token) { session = data.session; break; }
          await new Promise(r => setTimeout(r, 500));
        }
        if (!session) throw new Error("Session not found — please log in first, then connect Gmail.");
        showToast("Session found ✅ — calling Edge Function...", "info", "Step 2");

        const edgeUrl = "https://vqxuuswirettloxbeudp.supabase.co/functions/v1/fetch-emails";
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const redirectUri = `${window.location.origin}${window.location.pathname}`;
        const resp = await fetch(edgeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": anonKey,
          },
          body: JSON.stringify({
            action: "connect", code, provider,
            redirect_uri: redirectUri,
            user_id: session.user.id,
          }),
        });
        const result = await resp.json();
        console.log("Edge Function result:", JSON.stringify(result));
        if (result.error) throw new Error(result.error);
        showToast(`✅ Gmail connected! ${result.count ?? result.total ?? "Some"} emails imported.`, "success", "Connected");
        fetchEmails();
      } catch (err) {
        showToast(`Step failed: ${err.message}`, "error", "Connection Error");
        console.error("OAuth exchange error:", err);
      } finally {
        setConnecting(null);
      }
    };
    exchangeCode();
  }, []);

  // ── Manual scan (re-scan existing unprocessed emails) ─────────────────────
  const simulateScan = async () => {
    setScanning(true);
    showToast("Scanning emails for payment tasks...", "email", "Scanning");
    await new Promise(r => setTimeout(r, 1000));
    await supabase.from("emails").update({ scanned: true })
      .eq("user_id", user.id).eq("scanned", false);
    setScanning(false);
    fetchEmails();
    showToast("Scan complete! Click any email to create a task.", "success", "Done");
  };

  // ── Add sample email for testing ──────────────────────────────────────────
  const addSampleEmail = async () => {
    const futureDate = new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0];
    await supabase.from("emails").insert({
      user_id: user.id, provider: "manual",
      subject: `Sample Invoice - $250.00 due ${futureDate}`,
      from_email: "billing@vendor.com",
      body: `Your invoice of $250.00 is due on ${futureDate}. Please ensure timely payment to avoid service interruption.`,
      date: new Date().toISOString().split("T")[0],
      scanned: false, task_created: false,
    });
    fetchEmails();
    showToast("Sample email added!", "info");
  };

  // ── Preview email + extract task ──────────────────────────────────────────
  const handlePreview = (email) => {
    setPreview(email);
    const extracted = scanEmailForTask(email);
    setExtractedTask({
      ...extracted,
      user_id: user.id,
      status: "pending",
      reminder_days: [30, 7],
      tags: [],
      admin_service: false,
      admin_paid: false,
      source: "email",
    });
  };

  const handleCreateTask = async () => {
    if (!extractedTask || saving) return;
    setSaving(true);
    const { data: task, error } = await supabase.from("tasks").insert(extractedTask).select().single();
    if (error) { showToast("Error creating task: " + error.message, "error"); setSaving(false); return; }
    await supabase.from("emails").update({ task_created: true, task_id: task.id }).eq("id", extractedTask.email_id);
    showToast(`Task "${task.title.slice(0, 40)}..." created!`, "success", "Task Created");
    setSaving(false);
    setPreview(null);
    setExtractedTask(null);
    fetchEmails();
    if (onTaskCreated) onTaskCreated();
  };

  const unscanned = emails.filter(e => !e.task_created);

  const providerSetupNeeded = false; // Client ID hardcoded

  return (
    <div>
      {/* Connect Providers */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title"><Ico n="link" size={16} />Email Integrations</div>
        </div>

        {providerSetupNeeded && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <div>
              <strong>🔑 One-time setup required</strong> to connect Gmail or Outlook.
              Add <code style={{background:"rgba(99,91,255,0.1)",padding:"1px 6px",borderRadius:4}}>VITE_GMAIL_CLIENT_ID</code> and/or{" "}
              <code style={{background:"rgba(99,91,255,0.1)",padding:"1px 6px",borderRadius:4}}>VITE_OUTLOOK_CLIENT_ID</code> to your GitHub Secrets,
              then redeploy. See the <strong>Setup Guide</strong> below for instructions.
              <br/>In the meantime, use <strong>"Add Sample Email"</strong> to test the task extraction.
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[
            { id: "gmail", label: "Gmail", icon: "📧", desc: "Google Workspace" },
            { id: "outlook", label: "Outlook", icon: "📮", desc: "Microsoft 365" },
          ].map(p => (
            <div key={p.id} style={{ flex: "1 1 200px", background: "var(--surface2)", border: `1px solid ${connectedProviders.includes(p.id) ? "var(--teal)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 28 }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{p.desc}</div>
                {connectedProviders.includes(p.id) && <div style={{ fontSize: 11, color: "var(--teal)", marginTop: 2 }}>✓ Connected</div>}
              </div>
              {connecting === p.id ? (
                <button className="btn btn-ghost btn-sm" disabled>Connecting...</button>
              ) : connectedProviders.includes(p.id) ? (
                <button className="btn btn-ghost btn-sm" onClick={simulateScan} disabled={scanning}>
                  <Ico n="refresh" size={12} />{scanning ? "Scanning..." : "Re-scan"}
                </button>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => connectProvider(p.id)}>
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scan + Add buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={simulateScan} disabled={scanning}>
          <Ico n="scan" size={16} />{scanning ? "⏳ Scanning..." : "🔍 Scan for Tasks"}
        </button>
        <button className="btn btn-ghost" onClick={addSampleEmail}>
          + Add Sample Email
        </button>
        {unscanned.length > 0 && (
          <div className="alert alert-warn" style={{ margin: 0, flex: 1 }}>
            <strong>{unscanned.length} email{unscanned.length > 1 ? "s" : ""}</strong> ready — click to create tasks.
          </div>
        )}
      </div>

      {/* Email list */}
      <div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14, marginBottom: 14, color: "var(--navy)" }}>
          Inbox ({emails.length} emails)
        </div>
        {emails.length === 0
          ? loading
            ? <div className="loading-wrap"><div className="spinner"/><span>Loading emails...</span></div>
            : <div className="empty-state"><div className="empty-state-icon">📬</div><p>No emails yet. Connect Gmail/Outlook above, or add a sample email to test.</p></div>
          : emails.map(email => (
            <div key={email.id} className={`email-item ${email.task_created ? "has-task" : "no-task"}`} onClick={() => handlePreview(email)}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: 20, marginTop: 2 }}>{email.provider === "outlook" ? "📮" : "📧"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{email.subject}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>{email.from_email} · {fmtDate(email.date)}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{email.body}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {email.task_created
                    ? <span className="badge badge-completed">✅ Task Created</span>
                    : email.scanned
                      ? <span className="badge badge-pending">⚡ Review</span>
                      : <span className="badge" style={{ background: "var(--surface2)", color: "var(--text3)" }}>Unscanned</span>}
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Setup Guide */}
      {providerSetupNeeded && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <div className="card-title">🔑 Gmail & Outlook Setup Guide</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 10 }}>Gmail Setup</div>
              <ol style={{ fontSize: 13, color: "var(--text2)", lineHeight: 2, paddingLeft: 18 }}>
                <li>Go to <strong>console.cloud.google.com</strong></li>
                <li>Create a project → Enable <strong>Gmail API</strong></li>
                <li>OAuth consent screen → External → Add your email as test user</li>
                <li>Credentials → Create OAuth 2.0 Client ID (Web application)</li>
                <li>Add Authorised redirect URI: <code style={{fontSize:11, background:"var(--surface2)", padding:"1px 5px", borderRadius:3}}>{window.location.origin}{window.location.pathname}</code></li>
                <li>Copy Client ID → add as GitHub Secret: <code style={{fontSize:11, background:"var(--surface2)", padding:"1px 5px", borderRadius:3}}>VITE_GMAIL_CLIENT_ID</code></li>
                <li>Copy Client Secret → add as Supabase secret: <code style={{fontSize:11, background:"var(--surface2)", padding:"1px 5px", borderRadius:3}}>GMAIL_CLIENT_SECRET</code></li>
              </ol>
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 10 }}>Outlook Setup</div>
              <ol style={{ fontSize: 13, color: "var(--text2)", lineHeight: 2, paddingLeft: 18 }}>
                <li>Go to <strong>portal.azure.com</strong> → App registrations</li>
                <li>New registration → Web platform</li>
                <li>Add Redirect URI: <code style={{fontSize:11, background:"var(--surface2)", padding:"1px 5px", borderRadius:3}}>{window.location.origin}{window.location.pathname}</code></li>
                <li>API permissions → Add <strong>Mail.Read</strong></li>
                <li>Copy Application (client) ID → GitHub Secret: <code style={{fontSize:11, background:"var(--surface2)", padding:"1px 5px", borderRadius:3}}>VITE_OUTLOOK_CLIENT_ID</code></li>
                <li>Certificates & secrets → New client secret → Supabase secret: <code style={{fontSize:11, background:"var(--surface2)", padding:"1px 5px", borderRadius:3}}>OUTLOOK_CLIENT_SECRET</code></li>
              </ol>
            </div>
          </div>
          <div className="alert alert-info" style={{ marginTop: 16, marginBottom: 0 }}>
            After adding secrets, also deploy the Edge Function: run <code style={{fontSize:12}}>supabase functions deploy fetch-emails</code> and add <code style={{fontSize:12}}>GMAIL_CLIENT_ID</code>, <code style={{fontSize:12}}>GMAIL_CLIENT_SECRET</code>, <code style={{fontSize:12}}>OUTLOOK_CLIENT_ID</code>, <code style={{fontSize:12}}>OUTLOOK_CLIENT_SECRET</code> to Supabase project secrets (Dashboard → Edge Functions → Secrets).
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && extractedTask && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setPreview(null)}>
          <div className="modal modal-lg">
            <div className="modal-head">
              <div className="modal-title">📧 Email → Task Extraction</div>
              <button className="modal-close" onClick={() => setPreview(null)}><Ico n="close" size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                🤖 AI extracted these details. Review and edit before creating the task.
              </div>
              <div className="form-section" style={{ marginBottom: 14 }}>
                <div className="form-section-title">📬 Source Email</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{preview.subject}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>From: {preview.from_email} · {fmtDate(preview.date)}</div>
              </div>
              <div className="form-section">
                <div className="form-section-title">✨ Extracted Details</div>
                <div className="field"><label>Title</label>
                  <input value={extractedTask.title} onChange={e => setExtractedTask(t => ({ ...t, title: e.target.value }))} />
                </div>
                <div className="field-row">
                  <div className="field"><label>Vendor</label>
                    <input value={extractedTask.vendor || ""} onChange={e => setExtractedTask(t => ({ ...t, vendor: e.target.value }))} />
                  </div>
                  <div className="field"><label>Due Date</label>
                    <input type="date" value={extractedTask.due_date || ""} onChange={e => setExtractedTask(t => ({ ...t, due_date: e.target.value }))} />
                  </div>
                </div>
                <div className="field-row">
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>Amount Detected</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 24, color: "var(--navy)" }}>{fmtAmt(extractedTask.amount)}</div>
                  </div>
                  <div className="field"><label>Priority</label>
                    <select value={extractedTask.priority || "medium"} onChange={e => setExtractedTask(t => ({ ...t, priority: e.target.value }))}>
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
              {!preview.task_created
                ? <button className="btn btn-primary" onClick={handleCreateTask} disabled={saving}>
                    {saving ? "Creating..." : "✅ Create Task from Email"}
                  </button>
                : <span className="badge badge-completed" style={{ padding: "8px 16px" }}>✅ Task already created</span>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Payments & Settings Page ─────────────────────────────────────────────────
function PaymentsSettings({ user, showToast, paymentMethods: initialPMs = [], setPaymentMethods: setGlobalPMs }) {
  const [tab, setTab] = useState("methods");
  const [pms, setPMs] = useState(initialPMs);
  const [addPMModal, setAddPMModal] = useState(false);
  const [newPM, setNewPM] = useState({ type: "credit_card", label: "", last4: "", brand: "" });
  const [savingPM, setSavingPM] = useState(false);
  const [reminderDays, setReminderDays] = useState(user.reminder_days || [30, 7]);
  const [notifyEmail, setNotifyEmail] = useState(user.notify_email !== false);
  const [notifySms, setNotifySms] = useState(user.notify_sms !== false);
  const [profileName, setProfileName] = useState(user.name || "");
  const [profilePhone, setProfilePhone] = useState(user.phone || "");

  const fetchPMs = async () => {
    try {
      const { data, error } = await supabase.from("payment_methods").select("*").eq("user_id", user.id);
      if (error) console.error("fetchPMs error:", error);
      setPMs(data || []);
      if (setGlobalPMs) setGlobalPMs(data || []);
    } catch (err) {
      console.error("fetchPMs error:", err);
    }
  };
  useEffect(() => { fetchPMs(); }, []);

  const setDefault = async (id) => {
    await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("payment_methods").update({ is_default: true }).eq("id", id);
    fetchPMs();
    showToast("Default payment method updated!", "success", "Saved");
  };

  const deletePM = async (id) => {
    await supabase.from("payment_methods").delete().eq("id", id);
    fetchPMs();
    showToast("Payment method removed.", "info", "Removed");
  };

  const addPM = async () => {
    if (!newPM.label || savingPM) return;
    setSavingPM(true);
    await supabase.from("payment_methods").insert({
      ...newPM, user_id: user.id, is_default: pms.length === 0,
    });
    fetchPMs();
    setSavingPM(false);
    setAddPMModal(false);
    setNewPM({ type: "credit_card", label: "", last4: "", brand: "" });
    showToast("Payment method added!", "success", "Added");
  };

  const saveSettings = async () => {
    await supabase.from("profiles").update({
      reminder_days: reminderDays,
      notify_email: notifyEmail,
      notify_sms: notifySms,
    }).eq("id", user.id);
    showToast("Preferences saved!", "success", "Saved");
  };

  const saveProfile = async () => {
    await supabase.from("profiles").update({ name: profileName, phone: profilePhone }).eq("id", user.id);
    showToast("Profile saved!", "success", "Saved");
  };

  const [enrolled, setEnrolled] = useState([]);
  const toggleService = (id) => {
    setEnrolled(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    showToast(enrolled.includes(id) ? "Service cancelled." : "Enrolled! Admin will contact you.", enrolled.includes(id) ? "info" : "success");
  };

  const pmIcons = { credit_card: "💳", ach: "🏦", bank: "🏛️", wire: "🌐", check: "📝" };

  return (
    <div>
      <div className="tabs">
        {[
          { id: "methods", label: "💳 Payment Methods" },
          { id: "reminders", label: "⏰ Reminders" },
          { id: "services", label: "🛡️ Admin Services" },
          { id: "profile", label: "👤 Profile" },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "methods" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15 }}>Your Payment Methods</div>
            <button className="btn btn-primary btn-sm" onClick={() => setAddPMModal(true)}><Ico n="plus" size={14} />Add Method</button>
          </div>
          {pms.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">💳</div><p>No payment methods added yet.</p></div>
          ) : pms.map(pm => (
            <div key={pm.id} className={`pm-card ${pm.is_default ? "default-pm" : ""}`}>
              <div className="pm-icon">{pmIcons[pm.type] || "💳"}</div>
              <div className="pm-info">
                <div className="pm-label">{pm.label}</div>
                <div className="pm-type">{pm.type.replace("_", " ")}</div>
              </div>
              {pm.is_default && <span className="pm-default-badge">Default</span>}
              <div style={{ display: "flex", gap: 6 }}>
                {!pm.is_default && <button className="btn btn-ghost btn-sm" onClick={() => setDefault(pm.id)}>Set Default</button>}
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deletePM(pm.id)} style={{ color: "var(--high)" }}><Ico n="trash" size={13} /></button>
              </div>
            </div>
          ))}

          {addPMModal && (
            <div className="overlay" onClick={e => e.target === e.currentTarget && setAddPMModal(false)}>
              <div className="modal">
                <div className="modal-head">
                  <div className="modal-title">Add Payment Method</div>
                  <button className="modal-close" onClick={() => setAddPMModal(false)}><Ico n="close" size={14} /></button>
                </div>
                <div className="modal-body">
                  <div className="field"><label>Type</label>
                    <select value={newPM.type} onChange={e => setNewPM(p => ({ ...p, type: e.target.value }))}>
                      <option value="credit_card">💳 Credit Card</option>
                      <option value="ach">🏦 ACH / Bank Transfer</option>
                      <option value="wire">🌐 Wire Transfer</option>
                      <option value="check">📝 Check</option>
                    </select>
                  </div>
                  <div className="field"><label>Label / Name</label><input value={newPM.label} onChange={e => setNewPM(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Visa ending 4242" /></div>
                  <div className="field-row">
                    <div className="field"><label>Last 4 digits</label><input value={newPM.last4} onChange={e => setNewPM(p => ({ ...p, last4: e.target.value.slice(0, 4) }))} placeholder="4242" maxLength={4} /></div>
                    <div className="field"><label>Brand / Bank</label><input value={newPM.brand} onChange={e => setNewPM(p => ({ ...p, brand: e.target.value }))} placeholder="Visa / Chase" /></div>
                  </div>
                </div>
                <div className="modal-foot">
                  <button className="btn btn-ghost" onClick={() => setAddPMModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={addPM} disabled={!newPM.label}>Add Payment Method</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "reminders" && (
        <div className="card">
          <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Reminder Preferences</div>
          <div className="form-section" style={{ marginBottom: 14 }}>
            <div className="form-section-title">📅 Default Reminder Schedule</div>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>Set how many days before a due date you want to be reminded. These apply to all new tasks unless overridden.</p>
            {reminderDays.map((d, i) => (
              <div key={i} className="days-input-row">
                <span style={{ fontSize: 13, color: "var(--text2)", minWidth: 100 }}>{i === 0 ? "1st reminder" : i === 1 ? "2nd reminder" : `Reminder ${i + 1}`}:</span>
                <input className="days-input" type="number" min="1" max="365" value={d} onChange={e => { const r=[...reminderDays]; r[i]=parseInt(e.target.value)||0; setReminderDays(r); }} />
                <span style={{ fontSize: 13, color: "var(--text2)" }}>days before due</span>
                {reminderDays.length > 1 && (
                  <button className="btn btn-ghost btn-icon-sm" onClick={() => setReminderDays(prev => prev.filter((_,idx)=>idx!==i))}><Ico n="close" size={12} /></button>
                )}
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => setReminderDays(prev => [...prev, 14])} style={{ marginTop: 8 }}><Ico n="plus" size={12} />Add Reminder</button>
          </div>
          <div className="form-section" style={{ marginBottom: 14 }}>
            <div className="form-section-title">📬 Notification Channels</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "notifyEmail", icon: "📧", label: "Email Notifications", desc: `Sent to ${user.email}`, val: notifyEmail, set: setNotifyEmail },
                { key: "notifySMS", icon: "📱", label: "SMS Notifications", desc: user.phone ? `Sent to ${user.phone}` : "No phone number set", val: notifySms, set: setNotifySms },
              ].map(item => (
                <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                  <div style={{ position: "relative", width: 44, height: 24 }} onClick={() => item.set(!item.val)}>
                    <div style={{ width: 44, height: 24, background: item.val ? "var(--navy)" : "var(--surface3)", borderRadius: 12, transition: "background 0.2s", border: "1px solid var(--border)" }} />
                    <div style={{ position: "absolute", top: 3, left: item.val ? 22 : 3, width: 16, height: 16, background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
                  </div>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-navy" onClick={saveSettings}>Save Preferences</button>
        </div>
      )}

      {tab === "services" && (
        <div>
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            🛡️ Admin Services let our team handle payments on your behalf, so you never miss a due date or incur late fees. You'll receive full transparency via email & SMS.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
            {[
              { id: "as1", name: "Auto-Pay on Behalf", description: "Admin team handles payment before due date. You are notified via email and SMS once paid. No late fees, no stress.", price: 4.99, priceNote: "per transaction", icon: "💳", popular: true },
              { id: "as2", name: "Full Bill Management", description: "We scan, create tasks, set reminders, and pay all your bills monthly. Zero effort required from you.", price: 29.99, priceNote: "per month", icon: "🛡️", popular: false },
              { id: "as3", name: "Payment Negotiation", description: "Our team negotiates better rates with vendors on your behalf. Save more than the service fee on most bills.", price: 19.99, priceNote: "per negotiation", icon: "🤝", popular: false },
            ].map(svc => (
              <div key={svc.id} className={`service-card ${enrolled.includes(svc.id) ? "enrolled" : ""}`} onClick={() => toggleService(svc.id)}>
                {svc.popular && <div className="popular-tag">⭐ Popular</div>}
                <div className="service-icon">{svc.icon}</div>
                <div className="service-name">{svc.name}</div>
                <div className="service-desc">{svc.desc}</div>
                <div className="service-price">{fmtAmt(svc.price)}</div>
                <div className="service-price-note">{svc.priceNote}</div>
                <button className={`btn ${enrolled.includes(svc.id) ? "btn-danger" : "btn-primary"} btn-full`} style={{ marginTop: 16 }} onClick={e => { e.stopPropagation(); toggleService(svc.id); }}>
                  {enrolled.includes(svc.id) ? "✅ Enrolled — Cancel" : "Enroll Now"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "profile" && (
        <div className="card">
          <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Profile Settings</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: 20, background: "var(--surface2)", borderRadius: "var(--radius)" }}>
            <div className="avatar avatar-xl" style={{ background: avatarColor(user.name), color: "#fff" }}>{initials(user.name)}</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18 }}>{user.name}</div>
              <div style={{ color: "var(--text2)", fontSize: 13 }}>{user.email}</div>
              <div style={{ color: "var(--text3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.6px", marginTop: 4 }}>{user.role}</div>
            </div>
          </div>
          <div className="field"><label>Phone Number</label><input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+1-555-0100" /></div>
          <div className="field"><label>Timezone</label>
            <select defaultValue="America/New_York">
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={saveProfile}>Save Profile</button>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ user, setPage, showToast, paymentMethods = [] }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from("tasks").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) console.error("fetchTasks error:", error);
      setTasks(data || []);
    } catch (err) {
      console.error("Dashboard fetchTasks error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchTasks(); }, []);

  const handleSave = async (form) => {
    if (modal === "new") {
      const { error } = await supabase.from("tasks").insert({
        ...form, user_id: user.id, admin_paid: false, source: "manual",
      });
      if (error) { showToast("Error: " + error.message, "error"); return; }
    } else {
      const { error } = await supabase.from("tasks").update(form).eq("id", modal.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
    }
    setModal(null);
    showToast(modal === "new" ? "Task created!" : "Task updated!", "success");
    fetchTasks();
  };

  const handleDelete = async (id) => {
    await supabase.from("tasks").delete().eq("id", id);
    showToast("Task deleted.", "info");
    fetchTasks();
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    overdue: tasks.filter(t => isOverdue(t.due_date) && t.status !== "completed").length,
    totalDue: tasks.filter(t => t.status !== "completed").reduce((s, t) => s + (t.amount || 0), 0),
    adminManaged: tasks.filter(t => t.admin_service).length,
  };

  const urgentTasks = tasks.filter(t => {
    const d = daysUntil(t.due_date);
    return t.status !== "completed" && d !== null && d <= 7;
  }).sort((a, b) => (daysUntil(a.due_date) || 0) - (daysUntil(b.due_date) || 0));

  const filtered = tasks.filter(t => {
    if (activeFilter === "overdue" && !(isOverdue(t.due_date) && t.status !== "completed")) return false;
    if (activeFilter === "pending" && t.status !== "pending") return false;
    if (filterStatus !== "all" && activeFilter === "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.vendor || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Overdue Banner */}
      {stats.overdue > 0 && (
        <div className="banner">
          <div className="banner-icon">⚠️</div>
          <div className="banner-text">
            <strong>Action Required:</strong> You have {stats.overdue} overdue payment{stats.overdue > 1 ? "s" : ""}. Click on a task to view details or request admin payment.
          </div>
          <button className="btn btn-warn btn-sm" onClick={() => setActiveFilter("overdue")}>View Overdue</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-c1 clickable" onClick={() => setActiveFilter("all")}>
          <div className="stat-icon"><Ico n="tasks" size={40} /></div>
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card stat-c3 clickable" onClick={() => setActiveFilter("pending")}>
          <div className="stat-icon"><Ico n="cal" size={40} /></div>
          <div className="stat-num">{stats.pending}</div>
          <div className="stat-label">Pending</div>
          <div className="stat-sub">{fmtAmt(stats.totalDue)} due</div>
        </div>
        <div className={`stat-card stat-c2 clickable ${activeFilter === "overdue" ? "active-filter" : ""}`} onClick={() => setActiveFilter(activeFilter === "overdue" ? "all" : "overdue")}>
          <div className="stat-icon"><Ico n="warn" size={40} /></div>
          <div className="stat-num" style={{ color: stats.overdue > 0 ? "var(--high)" : "var(--text)" }}>{stats.overdue}</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card stat-c4">
          <div className="stat-icon"><Ico n="shield" size={40} /></div>
          <div className="stat-num">{stats.adminManaged}</div>
          <div className="stat-label">Admin Managed</div>
        </div>
      </div>

      {/* Urgent Tasks */}
      {urgentTasks.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div className="card-title">🔥 Urgent — Due Within 7 Days</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {urgentTasks.slice(0, 3).map(t => {
              const d = daysUntil(t.due_date);
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--surface2)", borderRadius: 10, cursor: "pointer", border: `1px solid ${d !== null && d < 0 ? "rgba(255,77,141,0.2)" : d === 0 ? "rgba(245,158,11,0.2)" : "var(--border)"}` }}
                  onClick={() => setDetailTask(t)}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 18, color: d !== null && d < 0 ? "var(--high)" : d === 0 ? "var(--med)" : "var(--text)", minWidth: 40, textAlign: "center" }}>
                    {d !== null && d < 0 ? `${Math.abs(d)}d` : d === 0 ? "NOW" : `${d}d`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{t.vendor}</div>
                  </div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15 }}>{fmtAmt(t.amount)}</div>
                  <DueBadge dueDate={t.due_date} status={t.status} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-ico"><Ico n="tasks" size={15} /></span>
          <input placeholder="Search tasks, vendors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="flt-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="in-progress">In Progress</option>
        </select>
        <select className="flt-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button className="btn btn-primary" onClick={() => setModal("new")}><Ico n="plus" size={15} />New Task</button>
      </div>

      <div className="task-list">
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📋</div><p>No tasks found. Create your first task!</p></div>
        ) : filtered.map(t => <TaskRow key={t.id} task={t} onEdit={setModal} onDelete={handleDelete} onView={setDetailTask} />)}
      </div>

      {modal && <TaskModal task={modal === "new" ? null : modal} onSave={handleSave} onClose={() => setModal(null)} user={user} paymentMethods={paymentMethods} />}
      {detailTask && <TaskDetailPanel task={detailTask} onClose={() => setDetailTask(null)} onEdit={t => { setDetailTask(null); setModal(t); }} onDelete={handleDelete} onAdminPay={fetchTasks} user={user} showToast={showToast} />}
    </div>
  );
}

// ─── Task Row Component ───────────────────────────────────────────────────────
function TaskRow({ task, onEdit, onDelete, onView }) {
  const over = isOverdue(task.due_date) && task.status !== "completed";
  return (
    <div className={`task-card ${over ? "overdue-card" : ""} ${task.admin_paid ? "admin-paid-card" : ""}`} onClick={() => onView(task)}>
      <div className="task-body">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={`task-title ${task.status === "completed" ? "done" : ""}`}>{task.title}</div>
            {task.vendor && <div className="task-vendor"><span>🏢</span>{task.vendor}</div>}
            <div className="task-meta">
              <span className={`badge badge-${task.priority}`}>{task.priority}</span>
              <span className={`badge badge-${task.status}`}>{task.status}</span>
              <DueBadge dueDate={task.due_date} status={task.status} />
              {task.admin_paid && <span className="badge badge-admin-paid">✅ Admin Paid</span>}
              {task.source === "email" && <span className="badge badge-email">📧 Email</span>}
              {(task.tags || []).slice(0, 2).map(t => <span key={t} className="chip">{t}</span>)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
            {task.amount && <div className="task-amount">{fmtAmt(task.amount)}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={e => { e.stopPropagation(); onEdit(task); }}><Ico n="edit" size={13} /></button>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={e => { e.stopPropagation(); onDelete(task.id); }} style={{ color: "var(--high)" }}><Ico n="trash" size={13} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reminders Page ───────────────────────────────────────────────────────────
function RemindersPage({ user, showToast }) {
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [{ data: tasksData, error: tErr }, { data: notifData, error: nErr }] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id).eq("status", "pending"),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (tErr) console.error("tasks fetch error:", tErr);
      if (nErr) console.error("notifications fetch error:", nErr);
      setTasks(tasksData || []);
      setNotifications(notifData || []);
    } catch (err) {
      console.error("RemindersPage fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); }, []);

  const upcomingReminders = tasks
    .filter(t => t.due_date)
    .flatMap(t => (t.reminder_days || []).map(days => {
      const reminderDate = new Date(new Date(t.due_date + "T12:00:00").getTime() - days * 86400000).toISOString().split("T")[0];
      return { taskId: t.id, taskTitle: t.title, vendor: t.vendor, amount: t.amount, days, reminderDate, dueDate: t.due_date };
    }))
    .sort((a, b) => a.reminderDate.localeCompare(b.reminderDate));

  const simulateSend = async () => {
    await supabase.from("notifications").insert({
      user_id: user.id, type: "reminder",
      title: "Test Reminder",
      message: `Email reminder sent to ${user.email}. SMS sent to ${user.phone || "your phone"}.`,
    });
    showToast("📧 Reminder email sent to " + user.email, "email", "Email Sent");
    setTimeout(() => showToast("📱 SMS reminder sent to " + (user.phone || "+1-555-0101"), "sms", "SMS Sent"), 800);
    fetchAll();
  };

  const markRead = async (id) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Upcoming Reminders */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Ico n="bell" size={16} />Scheduled Reminders</div>
            <button className="btn btn-primary btn-sm" onClick={simulateSend}><Ico n="bell" size={12} />Send Test</button>
          </div>
          {upcomingReminders.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 16px" }}><p>No reminders scheduled.</p></div>
          ) : upcomingReminders.map((r, i) => {
            const daysToReminder = daysUntil(r.reminderDate);
            return (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: r.sent ? "rgba(0,212,170,0.1)" : "rgba(99,91,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  {r.sent ? "✅" : "⏰"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{r.taskTitle}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{r.days} days before due · {fmtDate(r.reminderDate)}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 13 }}>{fmtAmt(r.amount)}</div>
                  <div style={{ fontSize: 10, color: r.sent ? "var(--accent3)" : daysToReminder !== null && daysToReminder < 0 ? "var(--high)" : "var(--text3)" }}>
                    {r.sent ? "Sent" : daysToReminder !== null && daysToReminder < 0 ? "Overdue" : `In ${daysToReminder}d`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sent History — uses notifications of type reminder */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Ico n="sms" size={16} />Notification History</div>
          </div>
          {notifications.filter(n => n.type === "reminder").length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 16px" }}><p>No reminders sent yet. Click "Send Test" to try.</p></div>
          ) : notifications.filter(n => n.type === "reminder").map(n => (
            <div key={n.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>📧</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{fmtDate(n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><Ico n="bell" size={16} />In-App Notifications</div>
          {notifications.some(n => !n.read) && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
              Mark All Read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: "32px 16px" }}><p>No notifications yet.</p></div>
        ) : notifications.map(n => (
          <div key={n.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)", opacity: n.read ? 0.6 : 1 }}>
            <div style={{ fontSize: 20, flexShrink: 0 }}>{n.type === "payment" ? "💳" : "🔔"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>{n.message}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{fmtDate(n.createdAt)}</div>
            </div>
            {!n.read && <button className="btn btn-ghost btn-xs" onClick={() => markRead(n.id)}>Mark Read</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ user, showToast }) {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailTask, setDetailTask] = useState(null);
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("tasks");

  const fetchAll = async () => {
    try {
      const [{ data: tasksData, error: tErr }, { data: usersData, error: uErr }] = await Promise.all([
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*"),
      ]);
      if (tErr) console.error("admin tasks error:", tErr);
      if (uErr) console.error("admin users error:", uErr);
      setTasks(tasksData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error("AdminPanel fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); }, []);

  const regularUsers = users.filter(u => u.role !== "admin");

  const filtered = tasks.filter(t => {
    if (filterUser !== "all" && t.user_id !== filterUser) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.vendor || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    overdue: tasks.filter(t => isOverdue(t.due_date) && t.status !== "completed").length,
    adminManaged: tasks.filter(t => t.admin_service && !t.admin_paid).length,
    totalPending: tasks.filter(t => t.status !== "completed").reduce((s, t) => s + (t.amount || 0), 0),
  };

  const handleAdminPay = async (task) => {
    await supabase.from("tasks").update({
      admin_paid: true, admin_paid_at: new Date().toISOString(),
      admin_paid_by: user.id, status: "completed",
    }).eq("id", task.id);
    const taskUser = users.find(u => u.id === task.user_id);
    await supabase.from("notifications").insert({
      user_id: task.user_id, type: "payment",
      title: "Payment Processed by Admin",
      message: `Your ${task.vendor} payment of ${fmtAmt(task.amount)} has been processed.`,
    });
    showToast(`✅ Paid ${fmtAmt(task.amount)} for ${taskUser?.name || "user"}`, "payment", "Payment Sent");
    fetchAll();
  };

  const handleDelete = async (id) => { await supabase.from("tasks").delete().eq("id", id); fetchAll(); };
  const handleSave = async (form) => {
    await supabase.from("tasks").update(form).eq("id", modal.id);
    setModal(null); fetchAll();
  };

  const adminQueue = tasks.filter(t => t.admin_service && !t.admin_paid && t.status !== "completed");

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card stat-c1"><div className="stat-icon"><Ico n="tasks" size={40} /></div><div className="stat-num">{stats.total}</div><div className="stat-label">Total Tasks</div></div>
        <div className="stat-card stat-c3"><div className="stat-icon"><Ico n="dollar" size={40} /></div><div className="stat-num">{fmtAmt(stats.totalPending)}</div><div className="stat-label">Pending Amount</div></div>
        <div className="stat-card stat-c2"><div className="stat-icon"><Ico n="warn" size={40} /></div><div className="stat-num" style={{ color: stats.overdue > 0 ? "var(--high)" : "var(--text)" }}>{stats.overdue}</div><div className="stat-label">Overdue</div></div>
        <div className="stat-card stat-c4"><div className="stat-icon"><Ico n="shield" size={40} /></div><div className="stat-num">{stats.adminManaged}</div><div className="stat-label">Admin Queue</div></div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === "tasks" ? "active" : ""}`} onClick={() => setTab("tasks")}>All Tasks</button>
        <button className={`tab-btn ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>
          Admin Queue {adminQueue.length > 0 && <span className="nav-badge" style={{ marginLeft: 6 }}>{adminQueue.length}</span>}
        </button>
        <button className={`tab-btn ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>Users</button>
      </div>

      {tab === "tasks" && (
        <div>
          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-ico"><Ico n="tasks" size={15} /></span>
              <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="flt-select" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="all">All Users</option>
              {regularUsers.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
            <select className="flt-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>User</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const taskUser = users.find(u => u.id === t.user_id);
                  return (
                    <tr key={t.id} onClick={() => setDetailTask(t)}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                        {t.admin_service && !t.admin_paid && <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "var(--med)", fontSize: 9 }}>🛡️ Admin Managed</span>}
                        {t.admin_paid && <span className="badge badge-admin-paid" style={{ fontSize: 9 }}>✅ Paid</span>}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div className="avatar" style={{ width: 24, height: 24, fontSize: 10, borderRadius: 6, background: avatarColor(taskUser?.name || ""), color: "#fff" }}>{initials(taskUser?.name || "?")}</div>
                          <span style={{ fontSize: 12, color: "var(--text2)" }}>{taskUser?.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text2)" }}>{t.vendor || "—"}</td>
                      <td style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14 }}>{fmtAmt(t.amount)}</td>
                      <td><DueBadge dueDate={t.due_date} status={t.status} /></td>
                      <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 5 }}>
                          {t.admin_service && !t.admin_paid && (
                            <button className="btn btn-success btn-xs" onClick={() => handleAdminPay(t)}>💳 Pay</button>
                          )}
                          <button className="btn btn-ghost btn-xs" onClick={() => setModal(t)}><Ico n="edit" size={12} /></button>
                          <button className="btn btn-ghost btn-xs" onClick={() => handleDelete(t.id)} style={{ color: "var(--high)" }}><Ico n="trash" size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "queue" && (
        <div>
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            🛡️ These tasks have been flagged for admin-managed payment. Review and process payments to help your users avoid penalties.
          </div>
          {adminQueue.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">✅</div><p>No pending payments in admin queue!</p></div>
          ) : adminQueue.map(t => {
            const taskUser = users.find(u => u.id === t.user_id);
            const days = daysUntil(t.due_date);
            return (
              <div key={t.id} style={{ background: "var(--surface)", border: `2px solid ${days !== null && days <= 7 ? "rgba(255,77,141,0.3)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 20, marginBottom: 12, display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8 }}>
                    {taskUser?.name} · {t.vendor} · Due {fmtDate(t.due_date)}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                    <DueBadge dueDate={t.due_date} status={t.status} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 22, marginBottom: 8 }}>{fmtAmt(t.amount)}</div>
                  <button className="btn btn-success" onClick={() => handleAdminPay(t)}>💳 Process Payment</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "users" && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>Email</th><th>Phone</th><th>Tasks</th><th>Pending Amount</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {regularUsers.map(u => {
                const userTasks = tasks.filter(t => t.user_id === u.id);
                const pendingAmt = userTasks.filter(t => t.status !== "completed").reduce((s, t) => s + (t.amount || 0), 0);
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar" style={{ background: avatarColor(u.name), color: "#fff" }}>{initials(u.name)}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                          <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase" }}>{u.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>{u.email}</td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>{u.phone || "—"}</td>
                    <td><span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{userTasks.length}</span></td>
                    <td style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: pendingAmt > 0 ? "var(--med)" : "var(--text3)" }}>{fmtAmt(pendingAmt)}</td>
                    <td style={{ fontSize: 12, color: "var(--text3)" }}>{fmtDate(u.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detailTask && <TaskDetailPanel task={detailTask} onClose={() => setDetailTask(null)} onEdit={t => { setDetailTask(null); setModal(t); }} onDelete={handleDelete} onAdminPay={fetchAll} user={user} showToast={showToast} />}
      {modal && <TaskModal task={modal} onSave={handleSave} onClose={() => setModal(null)} user={user} paymentMethods={[]} />}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App({ onBackToLanding }) {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [authLoading, setAuthLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const { toasts, show: showToast } = useToast();

  useEffect(() => {
    let mounted = true;

    const restoreUser = async (sessionUser) => {
      try {
        const { data: profile } = await supabase
          .from("profiles").select("*").eq("id", sessionUser.id).single();
        if (!mounted) return;
        if (profile) {
          setUser({ ...sessionUser, ...profile });
          setPage(prev => prev === "dashboard" ? (profile.role === "admin" ? "admin" : "dashboard") : prev);
          const { data: pms } = await supabase
            .from("payment_methods").select("*").eq("user_id", sessionUser.id);
          setPaymentMethods(pms || []);
        } else {
          setUser({ ...sessionUser, role: "user", reminder_days: [30, 7] });
        }
      } catch (err) {
        console.error("restoreUser error:", err);
        if (mounted) setUser({ ...sessionUser, role: "user", reminder_days: [30, 7] });
      }
    };

    // Check session once on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        await restoreUser(session.user);
      }
      if (mounted) setAuthLoading(false);
    });

    // Only handle explicit sign out — don't re-run restoreUser on every event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setPage("dashboard");
        setPaymentMethods([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (u) => {
    setUser(u);
    setPage(u.role === "admin" ? "admin" : "dashboard");
    const { data: pms } = await supabase.from("payment_methods").select("*").eq("user_id", u.id);
    setPaymentMethods(pms || []);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setPage("dashboard"); setPaymentMethods([]);
  };

  if (authLoading) return (
    <>
      <style>{css}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--navy)",flexDirection:"column",gap:16}}>
        <div style={{width:40,height:40,border:"3px solid rgba(255,255,255,0.2)",borderTopColor:"var(--gold)",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        <div style={{color:"rgba(255,255,255,0.6)",fontSize:14,fontFamily:"DM Sans,sans-serif"}}>Loading LifeOps Pro...</div>
      </div>
    </>
  );

  if (!user) return <><style>{css}</style><AuthPage onLogin={handleLogin} /></>;

  const unreadCount = 0; // live count fetched per-page
  const adminQueueCount = 0; // live count fetched in AdminPanel

  const userNav = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "tasks", icon: "tasks", label: "My Tasks" },
    { id: "email", icon: "email", label: "Email Scanner" },
    { id: "reminders", icon: "bell", label: "Reminders", badge: unreadCount > 0 ? unreadCount : null },
    { id: "payments", icon: "payment", label: "Payments & Settings" },
  ];

  const adminNav = [
    { id: "admin", icon: "admin", label: "Admin Panel", badge: adminQueueCount > 0 ? adminQueueCount : null },
    { id: "dashboard", icon: "dashboard", label: "My Dashboard" },
    { id: "email", icon: "email", label: "Email Scanner" },
    { id: "reminders", icon: "bell", label: "Reminders" },
    { id: "payments", icon: "payment", label: "Payments & Settings" },
  ];

  const nav = user.role === "admin" ? adminNav : userNav;

  const titles = {
    dashboard: ["Dashboard", `Welcome back, ${user.name.split(" ")[0]}! Here's your overview.`],
    tasks: ["My Tasks", "Manage all your tasks and payments."],
    email: ["Email Scanner", "Scan emails to auto-create tasks from invoices and renewals."],
    reminders: ["Reminders", "View your scheduled reminders and notification history."],
    payments: ["Payments & Settings", "Manage payment methods, reminder preferences, and admin services."],
    admin: ["Admin Panel", "Manage all users, tasks, and process payments on behalf of users."],
  };

  const [pageTitle, pageSub] = titles[page] || ["Page", ""];

  return (
    <>
      <style>{css}</style>
      <ToastContainer toasts={toasts} />
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="sidebar-logo-mark">⚡</div>
              Life<em>Ops</em> Pro
            </div>
          </div>
          <div className="nav-section">
            <span className="nav-label">Navigation</span>
            {nav.map(n => (
              <button key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
                <Ico n={n.icon} size={17} />
                {n.label}
                {n.badge ? <span className="nav-badge">{n.badge}</span> : null}
              </button>
            ))}
          </div>
          {onBackToLanding && (
            <div style={{padding:"0 10px",marginBottom:8}}>
              <button
                onClick={onBackToLanding}
                style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",borderRadius:10,cursor:"pointer",color:"rgba(255,255,255,0.4)",fontSize:13,fontWeight:500,border:"none",background:"none",width:"100%",textAlign:"left",transition:"all 0.2s"}}
                onMouseOver={e=>{e.currentTarget.style.color="rgba(255,255,255,0.8)";e.currentTarget.style.background="rgba(255,255,255,0.06)"}}
                onMouseOut={e=>{e.currentTarget.style.color="rgba(255,255,255,0.4)";e.currentTarget.style.background="none"}}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to Website
              </button>
            </div>
          )}
          <div className="sidebar-bottom">
            <div className="user-card">
              <div className="avatar" style={{ background: avatarColor(user.name), color: "#fff" }}>{initials(user.name)}</div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}</div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={handleLogout} title="Logout"><Ico n="logout" size={14} /></button>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">{pageTitle}</h1>
              <p className="page-sub">{pageSub}</p>
            </div>
          </div>
          {page === "dashboard" && <Dashboard user={user} setPage={setPage} showToast={showToast} paymentMethods={paymentMethods} />}
          {page === "tasks" && <TasksPage user={user} showToast={showToast} paymentMethods={paymentMethods} />}
          {page === "email" && <EmailScanner user={user} onTaskCreated={() => {}} showToast={showToast} />}
          {page === "reminders" && <RemindersPage user={user} showToast={showToast} />}
          {page === "payments" && <PaymentsSettings user={user} showToast={showToast} paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} />}
          {page === "admin" && user.role === "admin" && <AdminPanel user={user} showToast={showToast} />}
        </main>
      </div>
    </>
  );
}

// ─── Full Tasks Page ──────────────────────────────────────────────────────────
function TasksPage({ user, showToast, paymentMethods = [] }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from("tasks").select("*")
        .eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false });
      if (error) console.error("TasksPage fetchTasks error:", error);
      setTasks(data || []);
    } catch (err) {
      console.error("TasksPage error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchTasks(); }, []);

  const handleSave = async (form) => {
    if (modal === "new") {
      const { error } = await supabase.from("tasks").insert({
        ...form, user_id: user.id, source: "manual", admin_paid: false,
      });
      if (error) { showToast("Error: " + error.message, "error"); return; }
    } else {
      const { error } = await supabase.from("tasks").update(form).eq("id", modal.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
    }
    setModal(null);
    showToast(modal === "new" ? "Task created!" : "Task updated!", "success");
    fetchTasks();
  };

  const handleDelete = async (id) => {
    await supabase.from("tasks").delete().eq("id", id);
    showToast("Task deleted.", "info");
    fetchTasks();
  };

  const filtered = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.vendor || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div>
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-ico"><Ico n="tasks" size={15} /></span>
          <input placeholder="Search by title or vendor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="flt-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="in-progress">In Progress</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="flt-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="flt-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="subscription">Subscription</option>
          <option value="invoice">Invoice</option>
          <option value="domain">Domain</option>
          <option value="payment">Payment</option>
          <option value="tax">Tax</option>
          <option value="insurance">Insurance</option>
        </select>
        <button className="btn btn-primary" onClick={() => setModal("new")}><Ico n="plus" size={15} />New Task</button>
      </div>

      {filtered.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "var(--surface2)", borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          <span style={{ color: "var(--text2)" }}>{filtered.length} tasks shown</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "var(--navy)" }}>Total: {fmtAmt(totalFiltered)}</span>
        </div>
      )}

      <div className="task-list">
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📋</div><p>No tasks match your filters.</p></div>
        ) : filtered.map(t => <TaskRow key={t.id} task={t} onEdit={setModal} onDelete={handleDelete} onView={setDetailTask} />)}
      </div>

      {modal && <TaskModal task={modal === "new" ? null : modal} onSave={handleSave} onClose={() => setModal(null)} user={user} paymentMethods={paymentMethods} />}
      {detailTask && <TaskDetailPanel task={detailTask} onClose={() => setDetailTask(null)} onEdit={t => { setDetailTask(null); setModal(t); }} onDelete={handleDelete} onAdminPay={fetchTasks} user={user} showToast={showToast} />}
    </div>
  );
}
