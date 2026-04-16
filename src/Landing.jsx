import { useState, useEffect, useRef } from "react";

// ─── Landing CSS ──────────────────────────────────────────────────────────────
const landingCss = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy: #1B2A7B;
    --navy-dark: #141f5c;
    --navy-light: #2235a0;
    --gold: #C9A84C;
    --gold-dark: #b8942f;
    --gold-light: #d9bc74;
    --teal: #2D7A7A;
    --teal-light: #3a9898;
    --teal-bg: #EBF5F5;
    --bg: #FFFFFF;
    --bg2: #F5F6FA;
    --bg3: #EEF0F8;
    --border: #E2E5F0;
    --text: #111827;
    --text2: #4B5563;
    --text3: #9CA3AF;
    --radius: 14px;
    --radius-lg: 20px;
    --shadow: 0 4px 20px rgba(27,42,123,0.10);
    --shadow-lg: 0 12px 48px rgba(27,42,123,0.14);
    --transition: 0.25s cubic-bezier(0.4,0,0.2,1);
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  /* ── Navbar ──────────────────────────────────────────────────────── */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    transition: all var(--transition);
  }
  .lp-nav.scrolled {
    box-shadow: 0 4px 24px rgba(27,42,123,0.08);
  }
  .lp-nav-inner {
    max-width: 1200px; margin: 0 auto;
    padding: 0 40px;
    height: 68px;
    display: flex; align-items: center; justify-content: space-between; gap: 24px;
  }
  .lp-logo {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 700;
    color: var(--navy); letter-spacing: -0.3px;
    display: flex; align-items: center; gap: 10px;
    text-decoration: none; cursor: pointer;
    flex-shrink: 0;
  }
  .lp-logo em { color: var(--gold); font-style: normal; }
  .lp-logo-mark {
    width: 34px; height: 34px; border-radius: 9px;
    background: linear-gradient(135deg, var(--navy), var(--navy-light));
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .lp-nav-links {
    display: flex; align-items: center; gap: 4px; flex: 1; justify-content: center;
  }
  .lp-nav-link {
    padding: 8px 16px; border-radius: 8px;
    font-size: 14px; font-weight: 500;
    color: var(--text2); cursor: pointer;
    transition: all var(--transition); border: none; background: none;
    text-decoration: none;
  }
  .lp-nav-link:hover { color: var(--navy); background: var(--bg2); }
  .lp-nav-link.active { color: var(--navy); font-weight: 600; }
  .lp-nav-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .lp-btn-outline {
    padding: 9px 22px; border-radius: 50px;
    border: 1.5px solid var(--navy); color: var(--navy);
    font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 14px;
    cursor: pointer; background: none; transition: all var(--transition);
  }
  .lp-btn-outline:hover { background: var(--navy); color: #fff; }
  .lp-btn-solid {
    padding: 9px 22px; border-radius: 50px;
    background: var(--navy); color: #fff;
    font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 14px;
    cursor: pointer; border: none; transition: all var(--transition);
    box-shadow: 0 2px 12px rgba(27,42,123,0.25);
  }
  .lp-btn-solid:hover { background: var(--navy-light); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(27,42,123,0.3); }

  /* ── Sections wrapper ─────────────────────────────────────────────── */
  .lp-page { padding-top: 68px; }

  /* ── Hero ─────────────────────────────────────────────────────────── */
  .hero {
    background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 60%, #2235a0 100%);
    min-height: 88vh;
    display: flex; align-items: center;
    position: relative; overflow: hidden;
    padding: 80px 0 60px;
  }
  .hero::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 60% 70% at 100% 50%, rgba(201,168,76,0.12) 0%, transparent 60%),
      radial-gradient(ellipse 40% 50% at 0% 80%, rgba(45,122,122,0.15) 0%, transparent 50%);
  }
  .hero-ring {
    position: absolute; border-radius: 50%;
    border: 1px solid rgba(201,168,76,0.1);
  }
  .hero-ring-1 { width: 600px; height: 600px; top: -200px; right: -100px; }
  .hero-ring-2 { width: 400px; height: 400px; top: -100px; right: 0px; }
  .hero-inner {
    max-width: 1200px; margin: 0 auto; padding: 0 40px;
    display: grid; grid-template-columns: 1fr 1fr;
    align-items: center; gap: 60px; position: relative; z-index: 1;
  }
  .hero-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 50px; padding: 6px 16px;
    font-size: 12px; font-weight: 600;
    color: rgba(255,255,255,0.85);
    text-transform: uppercase; letter-spacing: 1px;
    margin-bottom: 24px;
  }
  .hero-title {
    font-family: 'Playfair Display', serif;
    font-size: 58px; font-weight: 700;
    color: #fff; line-height: 1.1;
    letter-spacing: -1.5px; margin-bottom: 20px;
  }
  .hero-title em { color: var(--gold); font-style: italic; }
  .hero-sub {
    font-size: 17px; color: rgba(255,255,255,0.75);
    line-height: 1.7; margin-bottom: 36px; max-width: 480px;
  }
  .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; }
  .hero-btn-gold {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 32px; border-radius: 50px;
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%);
    color: #1a1200; font-family: 'DM Sans', sans-serif;
    font-weight: 700; font-size: 15px; cursor: pointer; border: none;
    transition: all var(--transition);
    box-shadow: 0 4px 20px rgba(201,168,76,0.4);
  }
  .hero-btn-gold:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(201,168,76,0.5); }
  .hero-btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 28px; border-radius: 50px;
    background: rgba(255,255,255,0.1);
    border: 1.5px solid rgba(255,255,255,0.3);
    color: #fff; font-family: 'DM Sans', sans-serif;
    font-weight: 600; font-size: 15px; cursor: pointer;
    transition: all var(--transition);
  }
  .hero-btn-ghost:hover { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.5); }
  .hero-trust {
    display: flex; align-items: center; gap: 10px;
    margin-top: 28px; font-size: 13px; color: rgba(255,255,255,0.5);
  }
  .hero-trust-stars { color: var(--gold); letter-spacing: 2px; font-size: 14px; }

  /* Hero right */
  .hero-visual { position: relative; }
  .hero-mockup {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 20px; padding: 24px;
    backdrop-filter: blur(8px);
  }
  .hero-mockup-bar {
    display: flex; align-items: center; gap: 6px; margin-bottom: 16px;
  }
  .mockup-dot { width: 10px; height: 10px; border-radius: 50%; }
  .mockup-dot:nth-child(1) { background: #FF5F57; }
  .mockup-dot:nth-child(2) { background: #FFBD2E; }
  .mockup-dot:nth-child(3) { background: #28CA41; }
  .hero-mockup-screen {
    background: #f0f2f8; border-radius: 12px;
    padding: 20px; min-height: 320px;
  }
  .mockup-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px; padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .mockup-title { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 700; color: var(--navy); }
  .mockup-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 14px; }
  .mockup-stat {
    background: #fff; border-radius: 10px; padding: 12px;
    border: 1px solid var(--border);
    box-shadow: 0 1px 4px rgba(27,42,123,0.07);
  }
  .mockup-stat-num { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: var(--navy); }
  .mockup-stat-label { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; }
  .mockup-tasks { display: flex; flex-direction: column; gap: 8px; }
  .mockup-task {
    background: #fff; border-radius: 8px; padding: 10px 12px;
    display: flex; align-items: center; gap: 10px;
    border: 1px solid var(--border);
  }
  .mockup-task-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .mockup-task-text { font-size: 12px; color: var(--text); flex: 1; }
  .mockup-task-amt { font-size: 12px; font-weight: 700; color: var(--navy); }
  .hero-notification {
    position: absolute; bottom: -20px; left: -20px;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(27,42,123,0.15);
    border-radius: 14px; padding: 14px 18px;
    display: flex; align-items: center; gap: 12px;
    box-shadow: 0 8px 32px rgba(27,42,123,0.2);
    min-width: 260px;
    animation: float 3s ease-in-out infinite;
  }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  .notif-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: var(--teal-bg); color: var(--teal);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }
  .notif-title { font-size: 13px; font-weight: 700; color: var(--navy); }
  .notif-sub { font-size: 11px; color: var(--text2); }

  /* ── Section Shared ────────────────────────────────────────────────── */
  .section { padding: 96px 0; }
  .section-alt { background: var(--bg2); }
  .section-navy { background: linear-gradient(135deg, var(--navy-dark), var(--navy)); color: #fff; }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 40px; }
  .section-eyebrow {
    font-size: 12px; font-weight: 700;
    color: var(--teal); text-transform: uppercase; letter-spacing: 1.2px;
    margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
  }
  .section-eyebrow::before { content: ''; width: 24px; height: 2px; background: var(--teal); border-radius: 1px; }
  .section-eyebrow.white { color: rgba(255,255,255,0.7); }
  .section-eyebrow.white::before { background: var(--gold); }
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 42px; font-weight: 700;
    color: var(--navy); line-height: 1.2;
    letter-spacing: -0.8px; margin-bottom: 16px;
  }
  .section-title em { color: var(--teal); font-style: italic; }
  .section-title.white { color: #fff; }
  .section-title.gold em { color: var(--gold); }
  .section-sub {
    font-size: 16px; color: var(--text2);
    line-height: 1.7; max-width: 560px;
  }
  .section-sub.white { color: rgba(255,255,255,0.7); }
  .section-header-centered { text-align: center; }
  .section-header-centered .section-eyebrow { justify-content: center; }
  .section-header-centered .section-eyebrow::before { display: none; }
  .section-header-centered .section-sub { margin: 0 auto; }

  /* ── Features Grid ────────────────────────────────────────────────── */
  .features-split {
    display: grid; grid-template-columns: 1fr 1fr;
    align-items: center; gap: 80px;
  }
  .features-list { display: flex; flex-direction: column; gap: 28px; }
  .feature-item { display: flex; gap: 18px; }
  .feature-icon {
    width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
  }
  .feature-icon.navy { background: rgba(27,42,123,0.08); }
  .feature-icon.teal { background: var(--teal-bg); }
  .feature-icon.gold { background: rgba(201,168,76,0.1); }
  .feature-name {
    font-family: 'Playfair Display', serif;
    font-size: 17px; font-weight: 600; color: var(--navy); margin-bottom: 4px;
  }
  .feature-desc { font-size: 14px; color: var(--text2); line-height: 1.6; }

  .features-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
  .feature-card {
    background: #fff; border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 28px;
    box-shadow: var(--shadow);
    transition: all var(--transition);
  }
  .feature-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: rgba(27,42,123,0.2); }
  .feature-card.navy-card {
    background: var(--navy); border-color: var(--navy);
  }
  .feature-card.navy-card .feature-name { color: #fff; }
  .feature-card.navy-card .feature-desc { color: rgba(255,255,255,0.7); }
  .feature-card-icon {
    width: 48px; height: 48px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; margin-bottom: 16px;
  }
  .feature-card-bullets { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
  .feature-card-bullet {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--text2);
  }
  .bullet-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); flex-shrink: 0; }
  .feature-card.navy-card .feature-card-bullet { color: rgba(255,255,255,0.75); }
  .feature-card.navy-card .bullet-dot { background: var(--gold); }

  /* ── How It Works ─────────────────────────────────────────────────── */
  .steps-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; margin-top: 60px; }
  .step-card {
    text-align: center; padding: 40px 28px;
    background: #fff; border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow); position: relative;
    transition: all var(--transition);
  }
  .step-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
  .step-num {
    position: absolute; top: -18px; left: 50%; transform: translateX(-50%);
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--navy); color: #fff;
    font-family: 'Playfair Display', serif;
    font-weight: 700; font-size: 15px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(27,42,123,0.3);
  }
  .step-icon { font-size: 36px; margin-bottom: 16px; }
  .step-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 700; color: var(--navy); margin-bottom: 8px;
  }
  .step-desc { font-size: 14px; color: var(--text2); line-height: 1.6; }

  /* ── Pricing ─────────────────────────────────────────────────────── */
  .pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 52px; }
  .pricing-card {
    background: #fff; border: 1.5px solid var(--border);
    border-radius: var(--radius-lg); padding: 36px 32px;
    box-shadow: var(--shadow); position: relative;
    transition: all var(--transition);
    display: flex; flex-direction: column;
  }
  .pricing-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
  .pricing-card.popular {
    border-color: var(--navy);
    box-shadow: 0 8px 40px rgba(27,42,123,0.18);
  }
  .pricing-popular-badge {
    position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
    background: var(--gold); color: #1a1200;
    font-size: 11px; font-weight: 700;
    padding: 4px 16px; border-radius: 50px;
    text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
  }
  .pricing-name {
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 700; color: var(--navy); margin-bottom: 6px;
  }
  .pricing-card.popular .pricing-name { color: #fff; }
  .pricing-desc { font-size: 13px; color: var(--text2); margin-bottom: 24px; line-height: 1.5; }
  .pricing-card.popular .pricing-desc { color: rgba(255,255,255,0.65); }
  .pricing-price {
    font-family: 'Playfair Display', serif;
    font-size: 44px; font-weight: 800;
    color: var(--navy); margin-bottom: 4px; line-height: 1;
  }
  .pricing-card.popular .pricing-price { color: var(--gold); }
  .pricing-period { font-size: 13px; color: var(--text3); margin-bottom: 28px; }
  .pricing-card.popular .pricing-period { color: rgba(255,255,255,0.5); }
  .pricing-divider { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
  .pricing-card.popular .pricing-divider { border-color: rgba(255,255,255,0.1); }
  .pricing-features { display: flex; flex-direction: column; gap: 10px; flex: 1; }
  .pricing-feature {
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; color: var(--text2);
  }
  .pricing-card.popular .pricing-feature { color: rgba(255,255,255,0.8); }
  .pricing-check { font-size: 14px; color: var(--teal); font-weight: 700; flex-shrink: 0; }
  .pricing-card.popular .pricing-check { color: var(--gold); }
  .pricing-cta { margin-top: 28px; }
  .pricing-btn {
    width: 100%; padding: 13px; border-radius: 50px;
    font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 14px;
    cursor: pointer; border: none; transition: all var(--transition);
  }
  .pricing-btn-outline {
    background: none; border: 2px solid var(--navy); color: var(--navy);
  }
  .pricing-btn-outline:hover { background: var(--navy); color: #fff; }
  .pricing-btn-gold {
    background: linear-gradient(135deg, var(--gold), var(--gold-dark));
    color: #1a1200;
    box-shadow: 0 4px 16px rgba(201,168,76,0.4);
  }
  .pricing-btn-gold:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(201,168,76,0.5); }

  /* ── Testimonials ─────────────────────────────────────────────────── */
  .testimonials-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 52px; }
  .testimonial-card {
    background: #fff; border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 28px;
    box-shadow: var(--shadow); transition: all var(--transition);
  }
  .testimonial-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
  .testimonial-stars { color: var(--gold); font-size: 16px; letter-spacing: 2px; margin-bottom: 14px; }
  .testimonial-quote {
    font-family: 'Playfair Display', serif;
    font-size: 15px; font-style: italic;
    color: var(--text); line-height: 1.7; margin-bottom: 20px;
  }
  .testimonial-author { display: flex; align-items: center; gap: 12px; }
  .testimonial-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 15px; color: #fff; flex-shrink: 0;
  }
  .testimonial-name { font-size: 14px; font-weight: 600; color: var(--navy); }
  .testimonial-role { font-size: 12px; color: var(--text3); }

  /* ── About Page ─────────────────────────────────────────────────────── */
  .page-hero-banner {
    background: linear-gradient(135deg, var(--navy-dark), var(--navy));
    padding: 64px 0 56px;
    text-align: center;
    position: relative; overflow: hidden;
  }
  .page-hero-banner::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 50% 80% at 50% 0%, rgba(201,168,76,0.1), transparent 60%);
  }
  .page-hero-banner h1 {
    font-family: 'Playfair Display', serif;
    font-size: 42px; font-weight: 700;
    color: #fff; margin-bottom: 10px; position: relative;
  }
  .page-hero-banner p { font-size: 16px; color: rgba(255,255,255,0.7); position: relative; }

  .mission-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
  .mission-icon-wrap {
    width: 56px; height: 56px; border-radius: 14px;
    background: var(--teal-bg); color: var(--teal);
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; margin-bottom: 18px;
  }
  .mission-visual {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 20px; padding: 40px;
    display: flex; align-items: center; justify-content: center;
    min-height: 280px;
  }
  .mission-visual-inner { font-size: 96px; opacity: 0.3; }

  .hybrid-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 40px; }
  .hybrid-card {
    background: #fff; border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 32px;
    box-shadow: var(--shadow);
  }
  .hybrid-card.dark {
    background: var(--navy); border-color: var(--navy);
  }
  .hybrid-card-icon {
    width: 44px; height: 44px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; margin-bottom: 14px;
    background: var(--teal-bg); color: var(--teal);
  }
  .hybrid-card.dark .hybrid-card-icon { background: rgba(45,122,122,0.2); }
  .hybrid-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 600; color: var(--teal); margin-bottom: 8px;
  }
  .hybrid-card.dark .hybrid-card-title { color: var(--gold); }
  .hybrid-card-desc { font-size: 14px; color: var(--text2); line-height: 1.6; margin-bottom: 14px; }
  .hybrid-card.dark .hybrid-card-desc { color: rgba(255,255,255,0.65); }
  .hybrid-bullets { display: flex; flex-direction: column; gap: 7px; }
  .hybrid-bullet {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--text2);
  }
  .hybrid-bullet::before { content: '✦'; color: var(--teal); font-size: 10px; flex-shrink: 0; }
  .hybrid-card.dark .hybrid-bullet { color: rgba(255,255,255,0.7); }
  .hybrid-card.dark .hybrid-bullet::before { color: var(--gold); }

  .values-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; margin-top: 52px; }
  .value-card {
    text-align: center; padding: 36px 24px;
    background: #fff; border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    transition: all var(--transition);
  }
  .value-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
  .value-icon { font-size: 36px; margin-bottom: 14px; }
  .value-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 700; color: var(--navy); margin-bottom: 8px;
  }
  .value-desc { font-size: 14px; color: var(--text2); line-height: 1.6; }

  .audience-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; margin-top: 48px; }
  .audience-card {
    background: #fff; border: 1px solid var(--border);
    border-radius: var(--radius); padding: 24px 20px;
    box-shadow: var(--shadow-sm); transition: all var(--transition);
  }
  .audience-card:hover { border-color: var(--teal); transform: translateY(-2px); }
  .audience-icon { font-size: 28px; margin-bottom: 10px; }
  .audience-title { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 600; color: var(--navy); margin-bottom: 4px; }
  .audience-desc { font-size: 13px; color: var(--text2); line-height: 1.5; }

  /* ── Contact Page ─────────────────────────────────────────────────── */
  .contact-grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: 60px; align-items: start; }
  .contact-info-item { display: flex; gap: 16px; margin-bottom: 28px; }
  .contact-info-icon {
    width: 44px; height: 44px; border-radius: 11px;
    background: var(--teal-bg); color: var(--teal);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .contact-info-label { font-size: 12px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }
  .contact-info-val { font-size: 15px; color: var(--navy); font-weight: 500; }
  .contact-form-card {
    background: #fff; border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 40px;
    box-shadow: var(--shadow-lg);
  }
  .contact-field { margin-bottom: 18px; }
  .contact-field label {
    display: block; font-size: 11px; font-weight: 600;
    color: var(--text2); margin-bottom: 7px;
    text-transform: uppercase; letter-spacing: 0.8px;
  }
  .contact-field input, .contact-field select, .contact-field textarea {
    width: 100%;
    background: var(--bg2); border: 1.5px solid var(--border);
    border-radius: 10px; padding: 11px 15px;
    color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: 14px; outline: none;
    transition: border-color var(--transition), box-shadow var(--transition);
  }
  .contact-field input:focus, .contact-field select:focus, .contact-field textarea:focus {
    border-color: var(--navy);
    box-shadow: 0 0 0 3px rgba(27,42,123,0.08);
    background: #fff;
  }
  .contact-field textarea { resize: vertical; min-height: 120px; line-height: 1.5; }
  .contact-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .contact-submit {
    width: 100%; padding: 14px; border-radius: 50px;
    background: linear-gradient(135deg, var(--navy), var(--navy-light));
    color: #fff; font-family: 'DM Sans', sans-serif;
    font-weight: 700; font-size: 15px; cursor: pointer; border: none;
    transition: all var(--transition);
    box-shadow: 0 4px 16px rgba(27,42,123,0.3);
    margin-top: 4px;
  }
  .contact-submit:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(27,42,123,0.4); }

  /* ── CTA Section ─────────────────────────────────────────────────── */
  .cta-section {
    background: linear-gradient(135deg, var(--navy-dark), var(--navy));
    padding: 96px 0; text-align: center; position: relative; overflow: hidden;
  }
  .cta-section::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 80% at 50% 100%, rgba(201,168,76,0.1), transparent 60%);
  }
  .cta-title {
    font-family: 'Playfair Display', serif;
    font-size: 46px; font-weight: 700; color: #fff;
    line-height: 1.2; margin-bottom: 16px;
    letter-spacing: -0.8px; position: relative;
  }
  .cta-sub {
    font-size: 16px; color: rgba(255,255,255,0.7);
    max-width: 520px; margin: 0 auto 36px;
    line-height: 1.7; position: relative;
  }
  .cta-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; position: relative; }
  .cta-trust { font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 20px; position: relative; }

  /* ── Footer ──────────────────────────────────────────────────────── */
  .footer {
    background: var(--navy-dark); color: rgba(255,255,255,0.6);
    padding: 64px 0 32px;
  }
  .footer-grid {
    display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 48px; margin-bottom: 48px;
  }
  .footer-logo {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 700; color: #fff;
    display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
  }
  .footer-logo em { color: var(--gold); font-style: normal; }
  .footer-desc { font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.5); max-width: 280px; }
  .footer-col-title {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px; font-weight: 700;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 16px;
  }
  .footer-links { display: flex; flex-direction: column; gap: 10px; }
  .footer-link {
    font-size: 14px; color: rgba(255,255,255,0.55);
    cursor: pointer; transition: color var(--transition);
    border: none; background: none; text-align: left; padding: 0;
  }
  .footer-link:hover { color: #fff; }
  .footer-contact-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: rgba(255,255,255,0.55); margin-bottom: 10px; }
  .footer-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin-bottom: 24px; }
  .footer-bottom {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 13px; color: rgba(255,255,255,0.35); flex-wrap: wrap; gap: 8px;
  }

  /* ── Stats Banner ────────────────────────────────────────────────── */
  .stats-banner { background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 48px 0; }
  .stats-banner-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 32px; text-align: center; }
  .stats-banner-num {
    font-family: 'Playfair Display', serif;
    font-size: 40px; font-weight: 700; color: var(--navy); margin-bottom: 4px;
  }
  .stats-banner-label { font-size: 14px; color: var(--text2); }

  /* ── FAQ ─────────────────────────────────────────────────────────── */
  .faq-list { max-width: 720px; margin: 48px auto 0; }
  .faq-item {
    border: 1px solid var(--border); border-radius: var(--radius);
    margin-bottom: 12px; overflow: hidden; background: #fff;
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--transition);
  }
  .faq-item:hover { box-shadow: var(--shadow); }
  .faq-q {
    padding: 20px 24px; display: flex; align-items: center;
    justify-content: space-between; cursor: pointer;
    font-weight: 600; font-size: 15px; color: var(--navy);
    font-family: 'Playfair Display', serif;
    gap: 16px; user-select: none;
  }
  .faq-arrow { color: var(--teal); font-size: 20px; flex-shrink: 0; transition: transform var(--transition); }
  .faq-arrow.open { transform: rotate(45deg); }
  .faq-a {
    padding: 0 24px 20px;
    font-size: 14px; color: var(--text2); line-height: 1.7;
    display: none;
  }
  .faq-a.open { display: block; }

  /* ── Scroll animation ────────────────────────────────────────────── */
  .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
  .reveal.visible { opacity: 1; transform: translateY(0); }
  .reveal-delay-1 { transition-delay: 0.1s; }
  .reveal-delay-2 { transition-delay: 0.2s; }
  .reveal-delay-3 { transition-delay: 0.3s; }
`;

// ─── Scroll Reveal Hook ────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ page, setPage, onEnterApp }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = ['Home', 'Features', 'Pricing', 'About', 'Contact'];

  return (
    <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-nav-inner">
        <div className="lp-logo" onClick={() => setPage('Home')}>
          <div className="lp-logo-mark">⚡</div>
          Life<em>Ops</em> Pro
        </div>
        <div className="lp-nav-links">
          {links.map(l => (
            <button key={l} className={`lp-nav-link ${page === l ? 'active' : ''}`} onClick={() => setPage(l)}>{l}</button>
          ))}
        </div>
        <div className="lp-nav-actions">
          <button className="lp-btn-outline" onClick={onEnterApp}>Sign In</button>
          <button className="lp-btn-solid" onClick={onEnterApp}>Sign Up Free</button>
        </div>
      </div>
    </nav>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ setPage, onEnterApp }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <div className="lp-logo-mark" style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.3)' }}>⚡</div>
              Life<em>Ops</em> Pro
            </div>
            <p className="footer-desc">Your intelligent concierge for life administration. We handle the details so you can focus on what truly matters.</p>
          </div>
          <div>
            <div className="footer-col-title">Quick Links</div>
            <div className="footer-links">
              {['Home', 'Features', 'Pricing', 'About'].map(l => (
                <button key={l} className="footer-link" onClick={() => setPage(l)}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="footer-col-title">Support</div>
            <div className="footer-links">
              <button className="footer-link" onClick={() => setPage('Contact')}>Contact Us</button>
              <button className="footer-link" onClick={onEnterApp}>Dashboard</button>
              <button className="footer-link">Privacy Policy</button>
              <button className="footer-link">Terms of Service</button>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Get in Touch</div>
            <div className="footer-contact-item">📧 support@lifeopspro.com</div>
            <div className="footer-contact-item">📞 +1 (555) LIFE-OPS</div>
            <div style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Mon–Fri, 9am–6pm EST</div>
          </div>
        </div>
        <hr className="footer-divider" />
        <div className="footer-bottom">
          <span>© 2026 LifeOps Pro. All rights reserved.</span>
          <span>Trusted by 500+ professionals worldwide ⭐</span>
        </div>
      </div>
    </footer>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────
function CTASection({ onEnterApp, setPage, title = "Ready to reclaim your time?", sub = "Join thousands of professionals who trust LifeOps Pro to handle their administrative tasks efficiently and reliably." }) {
  return (
    <section className="cta-section">
      <div className="container">
        <h2 className="cta-title">{title}</h2>
        <p className="cta-sub">{sub}</p>
        <div className="cta-actions">
          <button className="hero-btn-gold" onClick={onEnterApp}>Get Started Free →</button>
          <button className="hero-btn-ghost" onClick={() => setPage ? setPage('Pricing') : onEnterApp()}>View Pricing Plans</button>
        </div>
        <p className="cta-trust">★ Trusted by 500+ Professionals · No credit card required</p>
      </div>
    </section>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ onEnterApp, setPage }) {
  useReveal();

  const [faqOpen, setFaqOpen] = useState(null);
  const faqs = [
    { q: "How does LifeOps Pro work?", a: "LifeOps Pro connects to your email to automatically detect invoices, bills, and tasks. Our AI extracts key details like vendor, amount, and due dates, creates tasks, and sends you reminders — so nothing falls through the cracks." },
    { q: "Is my financial data secure?", a: "Absolutely. We use enterprise-grade encryption and never store your actual payment credentials. Your data is protected by Supabase's bank-level security infrastructure with row-level security policies." },
    { q: "Can the admin team pay bills on my behalf?", a: "Yes! Our premium Admin Service feature allows our concierge team to process payments on your behalf before due dates. You receive email and SMS confirmation once processed." },
    { q: "What email providers are supported?", a: "We currently support Gmail and Outlook/Microsoft 365. More integrations including Yahoo Mail and Apple Mail are coming soon." },
    { q: "How do reminders work?", a: "You can configure up to 5 reminder stages per task — for example, 30 days, 7 days, and 1 day before the due date. Reminders are sent via email and optionally SMS to your registered phone number." },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="hero-ring hero-ring-1" />
        <div className="hero-ring hero-ring-2" />
        <div className="hero-inner">
          <div>
            <div className="hero-eyebrow">✨ THE INTELLIGENT CONCIERGE</div>
            <h1 className="hero-title">
              We handle your<br/>
              <em>life admin</em><br/>
              so you can focus.
            </h1>
            <p className="hero-sub">LifeOps Pro combines intelligent AI automation with dedicated human support to manage your scheduling, reminders, and administrative tasks seamlessly.</p>
            <div className="hero-actions">
              <button className="hero-btn-gold" onClick={onEnterApp}>Get Started →</button>
              <button className="hero-btn-ghost" onClick={onEnterApp}>Try Free</button>
            </div>
            <div className="hero-trust">
              <span className="hero-trust-stars">★★★★★</span>
              <span>Trusted by 500+ professionals</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-mockup">
              <div className="hero-mockup-bar">
                <div className="mockup-dot" /><div className="mockup-dot" /><div className="mockup-dot" />
              </div>
              <div className="hero-mockup-screen">
                <div className="mockup-header">
                  <div className="mockup-title">Dashboard Overview</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>April 2026</div>
                </div>
                <div className="mockup-stats">
                  <div className="mockup-stat">
                    <div className="mockup-stat-num">12</div>
                    <div className="mockup-stat-label">Tasks</div>
                  </div>
                  <div className="mockup-stat">
                    <div className="mockup-stat-num" style={{ color: '#C9A84C' }}>$2.4k</div>
                    <div className="mockup-stat-label">Pending</div>
                  </div>
                  <div className="mockup-stat">
                    <div className="mockup-stat-num" style={{ color: '#2D7A7A' }}>3</div>
                    <div className="mockup-stat-label">Managed</div>
                  </div>
                </div>
                <div className="mockup-tasks">
                  {[
                    { label: 'AWS Invoice', amt: '$847', color: '#DC2626' },
                    { label: 'Figma Renewal', amt: '$540', color: '#C9A84C' },
                    { label: 'Office 365', amt: '$1,200', color: '#2D7A7A' },
                  ].map((t, i) => (
                    <div key={i} className="mockup-task">
                      <div className="mockup-task-dot" style={{ background: t.color }} />
                      <div className="mockup-task-text">{t.label}</div>
                      <div className="mockup-task-amt">{t.amt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="hero-notification">
              <div className="notif-icon">✅</div>
              <div>
                <div className="notif-title">Daily Briefing Complete</div>
                <div className="notif-sub">All 12 tasks for today have been scheduled.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <div className="stats-banner">
        <div className="container">
          <div className="stats-banner-grid">
            {[
              { num: '500+', label: 'Professionals Served' },
              { num: '$2M+', label: 'Bills Managed' },
              { num: '99.9%', label: 'On-Time Payments' },
              { num: '4.9★', label: 'Average Rating' },
            ].map((s, i) => (
              <div key={i}>
                <div className="stats-banner-num">{s.num}</div>
                <div className="stats-banner-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Split */}
      <section className="section">
        <div className="container">
          <div className="features-split">
            <div>
              <div className="section-eyebrow reveal">The Perfect Balance</div>
              <h2 className="section-title reveal">
                <em>Artificial Intelligence</em> &<br/>Human Empathy.
              </h2>
              <p className="section-sub reveal" style={{ marginBottom: 40 }}>We don't just automate; we understand. Our hybrid approach combines the ruthless efficiency of AI with the nuanced judgment of expert human concierges.</p>
              <div className="features-list">
                {[
                  { icon: '⚡', color: 'navy', name: 'Instant Execution', desc: 'AI handles routine tasks in milliseconds — bill scanning, reminder scheduling, and task creation happen automatically.' },
                  { icon: '🤝', color: 'teal', name: 'Complex Negotiation', desc: 'Humans handle vendors and sensitive calls. Our team steps in when a personal touch makes all the difference.' },
                  { icon: '🛡️', color: 'gold', name: 'Always Protected', desc: 'Enterprise-grade security with row-level data isolation ensures your financial information stays private.' },
                ].map((f, i) => (
                  <div key={i} className={`feature-item reveal reveal-delay-${i + 1}`}>
                    <div className={`feature-icon ${f.color}`} style={{ fontSize: 22 }}>{f.icon}</div>
                    <div>
                      <div className="feature-name">{f.name}</div>
                      <div className="feature-desc">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="features-cards" style={{ gridTemplateColumns: '1fr', gap: 20 }}>
                {[
                  {
                    icon: '🤖', bg: 'var(--teal-bg)', color: 'var(--teal)',
                    name: 'AI-Powered Automation',
                    desc: 'Our intelligent system monitors your emails, calendars, and tasks, automatically organizing and prioritizing your administrative workload.',
                    bullets: ['Email Parsing & Sorting', 'Smart Scheduling', 'Bill Reminders'],
                    dark: false,
                  },
                  {
                    icon: '👥', bg: 'rgba(27,42,123,0.08)', color: 'var(--navy)',
                    name: 'Human Concierge Support',
                    desc: 'When tasks require a personal touch, our dedicated team steps in — phone calls, vendor negotiations, complex coordination.',
                    bullets: ['Vendor Phone Calls', 'Appointment Booking', 'Travel Arrangements'],
                    dark: true,
                  },
                  {
                    icon: '🔗', bg: 'rgba(201,168,76,0.12)', color: 'var(--gold-dark)',
                    name: 'Seamless Integration',
                    desc: 'Connect Gmail, Outlook, and Google Calendar. We work within your ecosystem without disrupting your workflow.',
                    bullets: ['Gmail', 'Outlook', 'Calendar'],
                    dark: false,
                  },
                ].map((f, i) => (
                  <div key={i} className={`feature-card ${f.dark ? 'navy-card' : ''} reveal reveal-delay-${i + 1}`}>
                    <div className="feature-card-icon" style={{ background: f.dark ? 'rgba(255,255,255,0.1)' : f.bg }}>
                      <span style={{ fontSize: 22 }}>{f.icon}</span>
                    </div>
                    <div className="feature-name" style={{ fontSize: 16, marginBottom: 6 }}>{f.name}</div>
                    <div className="feature-desc">{f.desc}</div>
                    <div className="feature-card-bullets">
                      {f.bullets.map((b, j) => (
                        <div key={j} className="feature-card-bullet"><div className="bullet-dot" />{b}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header-centered reveal">
            <div className="section-eyebrow">Simple Process</div>
            <h2 className="section-title">How It Works</h2>
            <p className="section-sub">Get started in minutes and let LifeOps Pro transform your administrative life.</p>
          </div>
          <div className="steps-grid">
            {[
              { icon: '📧', title: 'Connect Your Email', desc: 'Link your Gmail or Outlook account. Our AI immediately begins scanning for bills, invoices, and tasks.' },
              { icon: '✨', title: 'AI Extracts & Organises', desc: 'Vendor, amount, due date, and category are automatically detected and added to your task list.' },
              { icon: '💳', title: 'We Handle the Rest', desc: 'Receive reminders at your chosen intervals. Opt in to admin payment service and never worry again.' },
            ].map((s, i) => (
              <div key={i} className={`step-card reveal reveal-delay-${i + 1}`}>
                <div className="step-num">{i + 1}</div>
                <div className="step-icon">{s.icon}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section">
        <div className="container">
          <div className="section-header-centered reveal">
            <div className="section-eyebrow">Why Choose Us</div>
            <h2 className="section-title">Experience the freedom of a<br/> managed life.</h2>
          </div>
          <div className="features-cards" style={{ marginTop: 52 }}>
            {[
              { icon: '⏱️', num: '01', title: 'Save Time & Effort', desc: 'Automate tedious tasks and streamline your workflow. Our platform cuts down hours spent on administrative duties.' },
              { icon: '😌', num: '02', title: 'Reduce Stress & Worry', desc: 'Eliminate the anxiety of missed deadlines. Real-time insights and automated alerts ensure you\'re always in control.' },
              { icon: '📈', num: '03', title: 'Achieve Better Outcomes', desc: 'Leverage powerful analytics to identify trends, predict future needs, and make smarter decisions.' },
            ].map((f, i) => (
              <div key={i} className={`feature-card reveal reveal-delay-${i + 1}`}>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginBottom: 12 }}>{f.num}</div>
                <div className="feature-card-icon" style={{ background: 'var(--teal-bg)' }}><span>{f.icon}</span></div>
                <div className="feature-name" style={{ fontSize: 17, marginBottom: 6 }}>{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header-centered reveal">
            <div className="section-eyebrow">What People Say</div>
            <h2 className="section-title">Loved by professionals worldwide.</h2>
          </div>
          <div className="testimonials-grid">
            {[
              { stars: '★★★★★', quote: '"LifeOps Pro completely transformed how I manage my business bills. I used to spend 3 hours every week — now it\'s fully automated."', name: 'Sarah Mitchell', role: 'Freelance Designer', color: '#1B2A7B' },
              { stars: '★★★★★', quote: '"The admin payment service is a game changer. They paid my AWS bill before I even remembered it was due. Saved me $150 in late fees."', name: 'James Okafor', role: 'SaaS Founder', color: '#2D7A7A' },
              { stars: '★★★★★', quote: '"As a new immigrant, navigating bills and admin was overwhelming. LifeOps Pro made everything manageable and stress-free."', name: 'Priya Sharma', role: 'Healthcare Professional', color: '#C9A84C' },
            ].map((t, i) => (
              <div key={i} className={`testimonial-card reveal reveal-delay-${i + 1}`}>
                <div className="testimonial-stars">{t.stars}</div>
                <p className="testimonial-quote">{t.quote}</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{ background: t.color }}>{t.name[0]}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container">
          <div className="section-header-centered reveal">
            <div className="section-eyebrow">FAQ</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div key={i} className="faq-item">
                <div className="faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  <span>{f.q}</span>
                  <span className={`faq-arrow ${faqOpen === i ? 'open' : ''}`}>+</span>
                </div>
                <div className={`faq-a ${faqOpen === i ? 'open' : ''}`}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection onEnterApp={onEnterApp} setPage={setPage} />
    </div>
  );
}

// ─── FEATURES PAGE ─────────────────────────────────────────────────────────────
function FeaturesPage({ onEnterApp, setPage }) {
  useReveal();
  return (
    <div>
      <div className="page-hero-banner">
        <div className="container">
          <h1>Features</h1>
          <p>Everything you need to take control of your life administration.</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-header-centered reveal">
            <div className="section-eyebrow">Core Features</div>
            <h2 className="section-title">Powerful tools, zero complexity.</h2>
            <p className="section-sub">Every feature is designed to save you time and reduce stress — not add more to your plate.</p>
          </div>
          <div className="features-cards" style={{ marginTop: 52 }}>
            {[
              { icon: '📧', title: 'Email Scanner', desc: 'Automatically scan Gmail and Outlook to detect invoices, renewal notices, and payment requests. AI extracts vendor, amount, and due dates instantly.' },
              { icon: '📋', title: 'Smart Task Manager', desc: 'Create and manage tasks with vendor details, payment amounts, due dates, categories, and custom reminder schedules — all in one clean interface.' },
              { icon: '⏰', title: 'Multi-Stage Reminders', desc: 'Set up to 5 reminders per task at your chosen intervals (e.g. 30 days, 7 days, 1 day before due). Delivered via email and SMS.' },
              { icon: '💳', title: 'Payment Methods', desc: 'Store credit cards, ACH, wire transfer, and check details. Set defaults per task so payments always go through the right account.' },
              { icon: '🛡️', title: 'Admin Payment Service', desc: 'Opt in to let our team process payments on your behalf. You get notified instantly. No late fees, no missed deadlines.' },
              { icon: '📊', title: 'Analytics Dashboard', desc: 'See your total pending amounts, overdue tasks, admin-managed payments, and spending trends at a glance.' },
            ].map((f, i) => (
              <div key={i} className={`feature-card reveal reveal-delay-${(i % 3) + 1}`}>
                <div className="feature-card-icon" style={{ background: 'var(--teal-bg)' }}><span>{f.icon}</span></div>
                <div className="feature-name" style={{ fontSize: 17, marginBottom: 6 }}>{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="features-split">
            <div className="reveal">
              <div className="section-eyebrow">AI + Human</div>
              <h2 className="section-title">The hybrid model that actually works.</h2>
              <p className="section-sub" style={{ marginBottom: 28 }}>AI handles speed and scale. Humans handle nuance and negotiation. Together they cover everything.</p>
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 24, fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, fontStyle: 'italic', boxShadow: 'var(--shadow)' }}>
                "This hybrid approach ensures you get the speed and efficiency of automation combined with the empathy, judgment, and problem-solving abilities that only humans can provide."
              </div>
            </div>
            <div>
              {[
                { icon: '🤖', title: 'AI Layer', items: ['Instant email parsing and task extraction', 'Automated scheduling and calendar management', 'Smart prioritisation based on deadlines', 'Real-time payment amount detection'] },
                { icon: '👤', title: 'Human Layer', items: ['Personal attention for complex tasks', 'Professional communication with vendors', 'Thoughtful problem-solving and creative solutions', 'Payment processing on your behalf'] },
              ].map((h, i) => (
                <div key={i} className={`hybrid-card ${i === 1 ? 'dark' : ''} reveal reveal-delay-${i + 1}`} style={{ marginBottom: 20 }}>
                  <div className="hybrid-card-icon"><span>{h.icon}</span></div>
                  <div className="hybrid-card-title">{h.title}</div>
                  <div className="hybrid-bullets">
                    {h.items.map((it, j) => <div key={j} className="hybrid-bullet">{it}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CTASection onEnterApp={onEnterApp} setPage={setPage} title="Start automating your life admin today." sub="Join 500+ professionals who've reclaimed their time with LifeOps Pro." />
    </div>
  );
}

// ─── PRICING PAGE ──────────────────────────────────────────────────────────────
function PricingPage({ onEnterApp, setPage }) {
  useReveal();
  const [annual, setAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Professional');

  const plans = [
    {
      name: 'Starter', monthlyPrice: 0, popular: false,
      desc: 'Perfect for individuals getting started with life administration.',
      features: ['Up to 10 tasks per month', 'Email scanner (Gmail)', '2 reminders per task', 'Basic dashboard', 'Email support'],
      missing: ['Admin payment service', 'SMS notifications', 'Priority support'],
    },
    {
      name: 'Professional', monthlyPrice: 19, popular: true,
      desc: 'For professionals who want full automation and peace of mind.',
      features: ['Unlimited tasks', 'Gmail + Outlook scanning', '5 reminders per task', 'SMS + email notifications', 'Admin payment service ($4.99/txn)', 'Advanced analytics', 'Priority support'],
      missing: [],
    },
    {
      name: 'Business', monthlyPrice: 49, popular: false,
      desc: 'For small organizations managing multiple users and high payment volumes.',
      features: ['Everything in Professional', 'Up to 10 team members', 'Shared admin panel', 'Full bill management', 'Dedicated concierge', 'Custom integrations', 'SLA support'],
      missing: [],
    },
  ];

  const getPrice = (p) => {
    if (p.monthlyPrice === 0) return { display: '$0', period: '/month forever' };
    const price = annual ? Math.round(p.monthlyPrice * 0.8) : p.monthlyPrice;
    return { display: `$${price}`, period: annual ? '/month, billed annually' : '/month' };
  };

  return (
    <div>
      <div className="page-hero-banner">
        <div className="container">
          <h1>Simple, Transparent Pricing</h1>
          <p>No hidden fees. Cancel anytime. Start free today.</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          {/* Monthly / Annual Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 48 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: !annual ? 'var(--navy)' : 'var(--text3)' }}>Monthly</span>
            <div
              onClick={() => setAnnual(!annual)}
              style={{ width: 52, height: 28, borderRadius: 14, background: annual ? 'var(--navy)' : '#D1D5DB', cursor: 'pointer', position: 'relative', transition: 'background 0.25s' }}
            >
              <div style={{ position: 'absolute', top: 3, left: annual ? 26 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, color: annual ? 'var(--navy)' : 'var(--text3)' }}>
              Annual <span style={{ background: 'var(--teal)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 50, marginLeft: 4 }}>Save 20%</span>
            </span>
          </div>

          <div className="pricing-grid">
            {plans.map((p, i) => {
              const { display, period } = getPrice(p);
              const isSelected = selectedPlan === p.name;
              // A card is "highlighted" only when IT is the selected card.
              // popular flag only controls the default badge — NOT background when another card is selected.
              const highlighted = isSelected;
              const cardBg = highlighted ? 'var(--navy)' : '#fff';
              const cardBorder = highlighted ? '2px solid var(--gold)' : '1.5px solid var(--border)';
              const textColor = highlighted ? '#fff' : undefined;
              const subColor = highlighted ? 'rgba(255,255,255,0.65)' : undefined;
              const periodColor = highlighted ? 'rgba(255,255,255,0.5)' : undefined;
              const dividerColor = highlighted ? 'rgba(255,255,255,0.1)' : undefined;
              const featureColor = highlighted ? 'rgba(255,255,255,0.85)' : undefined;
              return (
              <div
                key={i}
                className={`pricing-card reveal reveal-delay-${i + 1}`}
                onClick={() => setSelectedPlan(p.name)}
                style={{
                  cursor: 'pointer',
                  background: cardBg,
                  border: cardBorder,
                  transform: highlighted ? 'translateY(-6px)' : undefined,
                  boxShadow: highlighted ? '0 16px 48px rgba(27,42,123,0.25)' : 'var(--shadow)',
                  transition: 'all 0.25s ease',
                }}
              >
                {isSelected
                  ? <div className="pricing-popular-badge" style={{ background: 'var(--gold)', color: '#1a1200' }}>✓ Selected</div>
                  : p.popular
                    ? <div className="pricing-popular-badge">⭐ Most Popular</div>
                    : null
                }
                <div className="pricing-name" style={{ color: textColor }}>{p.name}</div>
                <div className="pricing-desc" style={{ color: subColor }}>{p.desc}</div>
                <div className="pricing-price" style={{ color: highlighted ? 'var(--gold)' : 'var(--navy)' }}>{display}</div>
                <div className="pricing-period" style={{ color: periodColor }}>{period}</div>
                <hr className="pricing-divider" style={{ borderColor: dividerColor }} />
                <div className="pricing-features">
                  {p.features.map((f, j) => (
                    <div key={j} className="pricing-feature" style={{ color: featureColor }}>
                      <span className="pricing-check" style={{ color: highlighted ? 'var(--gold)' : 'var(--teal)' }}>✓</span>{f}
                    </div>
                  ))}
                  {p.missing.map((f, j) => (
                    <div key={j} className="pricing-feature" style={{ opacity: 0.35 }}><span>✗</span>{f}</div>
                  ))}
                </div>
                <div className="pricing-cta">
                  <button
                    className={`pricing-btn ${highlighted ? 'pricing-btn-gold' : 'pricing-btn-outline'}`}
                    onClick={(e) => { e.stopPropagation(); onEnterApp(); }}
                  >
                    {p.monthlyPrice === 0 ? 'Get Started Free' : 'Start Free Trial'}
                  </button>
                </div>
              </div>
            );
            })}
          </div>

          <div style={{ marginTop: 64, background: 'var(--bg2)', borderRadius: 20, padding: '40px 48px', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }} className="reveal">
            <div>
              <div className="section-eyebrow" style={{ marginBottom: 10 }}>Admin Services</div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>Pay-as-you-go concierge services</h3>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>On top of your plan, enroll in any of our admin services and let our team handle the heavy lifting.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: '💳', name: 'Auto-Pay on Behalf', price: '$4.99/txn', desc: 'We pay before due date, you get confirmation' },
                { icon: '🛡️', name: 'Full Bill Management', price: '$29.99/mo', desc: 'Scan, create, remind and pay all your bills' },
                { icon: '🤝', name: 'Payment Negotiation', price: '$19.99/neg', desc: 'We negotiate better rates with your vendors' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.desc}</div>
                  </div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 14, color: 'var(--teal)', whiteSpace: 'nowrap' }}>{s.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CTASection onEnterApp={onEnterApp} setPage={setPage} title="Start free, upgrade when you're ready." sub="No credit card required for the Starter plan. Upgrade anytime as your needs grow." />
    </div>
  );
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────
function AboutPage({ onEnterApp, setPage }) {
  useReveal();
  return (
    <div>
      <div className="page-hero-banner">
        <div className="container">
          <h1>About LifeOps Pro</h1>
          <p>We're on a mission to simplify life administration for busy people everywhere.</p>
        </div>
      </div>

      {/* Mission */}
      <section className="section">
        <div className="container">
          <div className="mission-grid">
            <div className="reveal">
              <div className="mission-icon-wrap">🎯</div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Our Mission</h2>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>At LifeOps Pro, we believe that everyone deserves to focus on what truly matters in their lives. Administrative tasks — scheduling appointments, managing emails, tracking deadlines, coordinating with vendors — consume valuable time and mental energy that could be better spent on meaningful work, family, and personal growth.</p>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8 }}>Our mission is to democratize access to personal concierge services by combining cutting-edge AI technology with dedicated human support, making professional life administration affordable and accessible to busy professionals, small business owners, parents, and anyone overwhelmed by daily administrative burdens.</p>
            </div>
            <div className="mission-visual reveal reveal-delay-1">
              <div className="mission-visual-inner">🎯</div>
            </div>
          </div>
        </div>
      </section>

      {/* Hybrid Model */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header-centered reveal">
            <h2 className="section-title" style={{ fontSize: 36 }}>The Hybrid AI + Human Model</h2>
            <p className="section-sub">We've designed a unique approach that combines the best of both worlds.</p>
          </div>
          <div className="hybrid-grid">
            {[
              {
                icon: '🤖', dark: false,
                title: 'AI-Powered Efficiency',
                desc: 'Our intelligent automation layer works 24/7 to monitor your communications, identify tasks, set reminders, and organise your schedule. The AI handles routine administrative work with speed and precision, learning your preferences over time.',
                bullets: ['Instant email parsing and task extraction', 'Automated scheduling and calendar management', 'Smart prioritisation based on deadlines and importance'],
              },
              {
                icon: '👥', dark: true,
                title: 'Human Touch & Expertise',
                desc: 'When tasks require judgment, negotiation, or a personal touch, our team of experienced concierges steps in. They handle complex coordination, make phone calls, follow up with vendors, and ensure nothing falls through the cracks.',
                bullets: ['Personal attention for complex tasks', 'Professional communication with vendors and service providers', 'Thoughtful problem-solving and creative solutions'],
              },
            ].map((h, i) => (
              <div key={i} className={`hybrid-card ${h.dark ? 'dark' : ''} reveal reveal-delay-${i + 1}`}>
                <div className="hybrid-card-icon"><span>{h.icon}</span></div>
                <div className="hybrid-card-title">{h.title}</div>
                <div className="hybrid-card-desc">{h.desc}</div>
                <div className="hybrid-bullets">
                  {h.bullets.map((b, j) => <div key={j} className="hybrid-bullet">{b}</div>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', maxWidth: 640, margin: '32px auto 0', textAlign: 'center', fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, fontStyle: 'italic', boxShadow: 'var(--shadow)' }} className="reveal">
            "This hybrid approach ensures you get the speed and efficiency of automation combined with the empathy, judgment, and problem-solving abilities that only humans can provide. It's the perfect balance for managing modern life's administrative complexity."
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="section">
        <div className="container">
          <div className="section-header-centered reveal">
            <h2 className="section-title">Our Core Values</h2>
          </div>
          <div className="values-grid">
            {[
              { icon: '🛡️', title: 'Trust & Security', desc: 'Your privacy and data security are paramount. We use enterprise-grade encryption and never share your information without explicit permission.' },
              { icon: '⚡', title: 'Efficiency First', desc: 'We\'re obsessed with saving you time. Every feature is designed to reduce friction and help you accomplish more with less effort.' },
              { icon: '❤️', title: 'Human-Centered', desc: 'Technology serves people, not the other way around. We build tools that adapt to your life, not force you to adapt to them.' },
            ].map((v, i) => (
              <div key={i} className={`value-card reveal reveal-delay-${i + 1}`}>
                <div className="value-icon">{v.icon}</div>
                <div className="value-title">{v.title}</div>
                <div className="value-desc">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header-centered reveal">
            <h2 className="section-title">Who We Serve</h2>
            <p className="section-sub">LifeOps Pro is designed for anyone who values their time and wants to focus on what truly matters.</p>
          </div>
          <div className="audience-grid">
            {[
              { icon: '💼', title: 'Busy Professionals', desc: 'Focus on your career while we handle scheduling, email organisation, and administrative tasks for you.' },
              { icon: '🏢', title: 'Small Business Owners', desc: 'Spend more time growing your business and less time on administrative overhead.' },
              { icon: '👨‍👩‍👧', title: 'Parents', desc: 'Juggle family responsibilities with confidence, knowing your tasks are managed efficiently.' },
              { icon: '🌍', title: 'Immigrants & Newcomers', desc: 'Navigate administrative systems in a new country with expert guidance and support.' },
            ].map((a, i) => (
              <div key={i} className={`audience-card reveal reveal-delay-${(i % 4) + 1}`}>
                <div className="audience-icon">{a.icon}</div>
                <div className="audience-title">{a.title}</div>
                <div className="audience-desc">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection onEnterApp={onEnterApp} setPage={setPage} title="Join Us on This Journey." sub="Experience the freedom of having a dedicated team managing your life administration. Start your free trial today." />
    </div>
  );
}

// ─── CONTACT PAGE ──────────────────────────────────────────────────────────────
function ContactPage() {
  useReveal();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in your name, email and message.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      // Send via Formspree — free, no signup needed for basic use
      // Replace FORM_ID below with your Formspree form ID after setup
      const FORMSPREE_ID = 'xjgjgpdy'; // tausif.itexpert@gmail.com
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          "Full Name": form.name,
          "Email Address": form.email,
          "Subject": form.subject || 'General Enquiry',
          "Message": form.message,
          _replyto: form.email,
          _subject: `LifeOps Pro Contact: ${form.subject || 'General Enquiry'} from ${form.name}`,
        }),
      });
      if (res.ok) {
        setSent(true);
        setForm({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setSent(false), 6000);
      } else {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to send. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="page-hero-banner">
        <div className="container">
          <h1>Get in Touch</h1>
          <p>We'd love to hear from you. Send us a message and we'll respond within 24 hours.</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <div className="reveal">
              <div className="section-eyebrow">Contact Info</div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Let's start a conversation.</h2>
              <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 40 }}>Whether you have a question about features, pricing, or just want to know more — our team is ready to answer all your questions.</p>
              <div className="contact-info-item">
                <div className="contact-info-icon">📧</div>
                <div>
                  <div className="contact-info-label">Email</div>
                  <div className="contact-info-val">support@lifeopspro.com</div>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon">📞</div>
                <div>
                  <div className="contact-info-label">Phone</div>
                  <div className="contact-info-val">+1 (555) LIFE-OPS</div>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon">🕐</div>
                <div>
                  <div className="contact-info-label">Working Hours</div>
                  <div className="contact-info-val">Monday–Friday, 9am–6pm EST</div>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon">📍</div>
                <div>
                  <div className="contact-info-label">Based In</div>
                  <div className="contact-info-val">New York, NY · Remote Team Worldwide</div>
                </div>
              </div>
            </div>
            <div className="contact-form-card reveal reveal-delay-1">
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: 'var(--navy)', marginBottom: 24 }}>Send us a message</h3>
              {sent && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderLeft: '4px solid #059669', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#065f46', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  ✅ Message sent! We'll get back to you within 24 hours.
                </div>
              )}
              <div className="contact-field-row">
                <div className="contact-field"><label>Full Name *</label><input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Alice Chen" /></div>
                <div className="contact-field"><label>Email Address *</label><input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="alice@example.com" /></div>
              </div>
              <div className="contact-field">
                <label>Subject</label>
                <select value={form.subject} onChange={e => f('subject', e.target.value)}>
                  <option value="">Select a topic...</option>
                  <option>General Enquiry</option>
                  <option>Pricing & Plans</option>
                  <option>Technical Support</option>
                  <option>Admin Services</option>
                  <option>Partnership</option>
                </select>
              </div>
              <div className="contact-field"><label>Message *</label><textarea value={form.message} onChange={e => f('message', e.target.value)} placeholder="Tell us how we can help..." style={{ minHeight: 140 }} /></div>
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #EF4444', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#991B1B', marginBottom: 16 }}>
                  ⚠️ {error}
                </div>
              )}
              <button className="contact-submit" onClick={handleSubmit} disabled={sending} style={{ opacity: sending ? 0.7 : 1 }}>
                {sending ? 'Sending...' : 'Send Message →'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── MAIN LANDING APP ──────────────────────────────────────────────────────────
export default function LandingApp({ onEnterApp }) {
  const [page, setPage] = useState('Home');

  const goToPage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <style>{landingCss}</style>
      <Navbar page={page} setPage={goToPage} onEnterApp={onEnterApp} />
      <div className="lp-page">
        {page === 'Home'     && <HomePage     onEnterApp={onEnterApp} setPage={goToPage} />}
        {page === 'Features' && <FeaturesPage onEnterApp={onEnterApp} setPage={goToPage} />}
        {page === 'Pricing'  && <PricingPage  onEnterApp={onEnterApp} setPage={goToPage} />}
        {page === 'About'    && <AboutPage    onEnterApp={onEnterApp} setPage={goToPage} />}
        {page === 'Contact'  && <ContactPage  />}
        <Footer setPage={goToPage} onEnterApp={onEnterApp} />
      </div>
    </>
  );
}
