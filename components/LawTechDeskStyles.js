export function LawTechDeskStyles() {
  return (
    <style jsx global>{`
:root {
  --paper: #f7f6f1;
  --paper-deep: #ebe8dd;
  --ink: #17231d;
  --muted: #69756f;
  --leaf: #183f32;
  --leaf-soft: #dce9df;
  --honey: #d7a43d;
  --honey-soft: #f4e4b8;
  --blue: #8daab7;
  --blue-soft: #e2edf1;
  --line: rgba(23, 35, 29, 0.12);
  --glass: rgba(255, 255, 255, 0.62);
  --glass-strong: rgba(255, 255, 255, 0.78);
  --urgent: #a76535;
  --important: #6e7f45;
  --shadow: 0 24px 80px rgba(24, 63, 50, 0.14);
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--paper);
  color: var(--ink);
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: ui-serif, "Songti SC", "STSong", Georgia, serif;
  background:
    radial-gradient(circle at 16% 10%, rgba(216, 164, 61, 0.24), transparent 28rem),
    radial-gradient(circle at 86% 0%, rgba(141, 170, 183, 0.24), transparent 34rem),
    linear-gradient(135deg, #fbfaf5 0%, #eef4ee 56%, #f7f6f1 100%);
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.28;
  background-image:
    linear-gradient(rgba(23, 35, 29, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(23, 35, 29, 0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(to bottom, #000, transparent 76%);
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
textarea {
  font: inherit;
}

.shell {
  width: min(1180px, calc(100vw - 40px));
  margin: 0 auto;
}

.public-page {
  min-height: 100vh;
  padding: 28px 0 72px;
}

.topbar,
.desk-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(24px) saturate(1.2);
  box-shadow: 0 18px 40px rgba(24, 63, 50, 0.08);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--leaf);
  color: #fff7dd;
  box-shadow: inset 0 -4px 10px rgba(0, 0, 0, 0.22);
}

.nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav a,
.ghost-link,
.primary-link {
  border-radius: 999px;
  padding: 10px 14px;
  color: var(--muted);
  transition: transform 0.35s var(--ease), background 0.35s var(--ease), color 0.35s var(--ease);
}

.nav a:hover,
.ghost-link:hover {
  transform: translateY(-2px);
  color: var(--ink);
  background: rgba(24, 63, 50, 0.08);
}

.primary-link {
  color: #fff8e6;
  background: var(--leaf);
  box-shadow: 0 12px 28px rgba(24, 63, 50, 0.22);
}

.primary-link:hover {
  transform: translateY(-2px);
}

.hero {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 48px;
  align-items: center;
  padding: 82px 0 64px;
}

.eyebrow {
  color: var(--leaf);
  font-size: 13px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.hero h1,
.page-title {
  margin: 18px 0 20px;
  max-width: 760px;
  font-size: clamp(38px, 5.4vw, 78px);
  line-height: 1.02;
  letter-spacing: -0.055em;
}

.hero p,
.lede {
  max-width: 620px;
  color: var(--muted);
  font-size: 19px;
  line-height: 1.9;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 34px;
}

.portrait-card {
  position: relative;
  min-height: 440px;
  border: 1px solid var(--line);
  border-radius: 42px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.28));
  box-shadow: var(--shadow);
  overflow: hidden;
}

.portrait-card::before {
  content: '';
  position: absolute;
  inset: 18px;
  border: 1px solid rgba(24, 63, 50, 0.13);
  border-radius: 32px;
}

.portrait-card img {
  position: absolute;
  right: 28px;
  bottom: 28px;
  width: min(62%, 260px);
  height: auto;
  object-fit: contain;
  border-radius: 28px;
  filter: saturate(0.92) contrast(1.02);
}

.portrait-note {
  position: absolute;
  left: 34px;
  top: 34px;
  max-width: 220px;
  color: var(--muted);
  line-height: 1.8;
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.glass-card,
.desk-card,
.workflow-card,
.tool-card {
  border: 1px solid var(--line);
  border-radius: 28px;
  background: var(--glass);
  backdrop-filter: blur(22px) saturate(1.1);
  box-shadow: 0 16px 42px rgba(24, 63, 50, 0.09);
  transition: transform 0.45s var(--ease), box-shadow 0.45s var(--ease), border-color 0.45s var(--ease);
}

.glass-card:hover,
.desk-card:hover,
.workflow-card:hover,
.tool-card:hover {
  transform: translateY(-6px);
  border-color: rgba(24, 63, 50, 0.22);
  box-shadow: 0 26px 58px rgba(24, 63, 50, 0.14);
}

.glass-card {
  min-height: 178px;
  padding: 24px;
}

.glass-card span,
.desk-card span {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.glass-card h2,
.desk-card h2,
.workflow-card h2,
.tool-card h2 {
  margin: 18px 0 12px;
  font-size: 28px;
  letter-spacing: -0.04em;
}

.glass-card p,
.desk-card p,
.workflow-card p,
.tool-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.75;
}

.desk-layout {
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  gap: 24px;
  width: min(1320px, calc(100vw - 40px));
  margin: 0 auto;
  padding: 18px 0 72px;
}

.desk-sidebar {
  position: sticky;
  top: 16px;
  align-self: start;
  max-height: calc(100svh - 32px);
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(18px) saturate(1.08);
  box-shadow: 0 18px 54px rgba(24, 63, 50, 0.1);
  overflow: auto;
  scrollbar-width: thin;
}

.desk-main {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 16px;
}

.desk-topbar {
  position: sticky;
  top: 16px;
  z-index: 3;
  margin-bottom: 0;
  border-radius: 24px;
  padding: 11px 14px;
  backdrop-filter: blur(18px) saturate(1.08);
}

.desk-topbar > div {
  display: grid;
  gap: 2px;
}

.desk-topbar strong {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0;
}

.desk-mobile-nav {
  display: none;
}

.desk-nav {
  display: grid;
  gap: 18px;
  margin-top: 22px;
}

.desk-nav-group {
  display: grid;
  gap: 6px;
}

.desk-nav-group p {
  margin: 0 0 4px;
  padding: 0 10px;
  color: #8a968f;
  font-size: 12px;
  letter-spacing: 0.14em;
}

.desk-nav a {
  display: block;
  padding: 11px 13px;
  border-radius: 20px;
  color: var(--muted);
  transition: transform 0.35s var(--ease), background 0.35s var(--ease), color 0.35s var(--ease);
}

.desk-nav a:hover,
.desk-nav a[aria-current='page'] {
  transform: translateX(4px);
  color: var(--ink);
  background: rgba(24, 63, 50, 0.09);
}

.desk-page {
  width: min(100%, 980px);
  margin: 0 auto;
  padding: 24px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid var(--line);
  box-shadow: 0 20px 58px rgba(24, 63, 50, 0.1);
}

.desk-page h1 {
  margin: 0 0 18px;
  font-size: clamp(28px, 3.2vw, 46px);
  line-height: 1.08;
  letter-spacing: 0;
}

.desk-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 20px;
}

.desk-card,
.workflow-card,
.tool-card {
  padding: 22px;
}

.card-honey {
  background: linear-gradient(145deg, rgba(244, 228, 184, 0.78), rgba(255, 255, 255, 0.48));
}

.card-leaf {
  background: linear-gradient(145deg, rgba(220, 233, 223, 0.86), rgba(255, 255, 255, 0.48));
}

.card-blue {
  background: linear-gradient(145deg, rgba(226, 237, 241, 0.86), rgba(255, 255, 255, 0.48));
}

.workflow-list {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.workflow-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.workflow-steps b {
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(24, 63, 50, 0.08);
  color: var(--leaf);
  font-size: 13px;
  font-weight: 600;
}

.capture-box {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.capture-box textarea {
  width: 100%;
  min-height: 150px;
  resize: vertical;
  border: 1px solid var(--line);
  border-radius: 26px;
  padding: 18px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.72);
  outline: none;
}

.capture-box textarea:focus {
  border-color: rgba(24, 63, 50, 0.36);
  box-shadow: 0 0 0 5px rgba(24, 63, 50, 0.08);
}

.today-board {
  display: grid;
  gap: 16px;
}

.command-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 116px;
  gap: 0;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid rgba(23, 35, 29, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 14px 34px rgba(24, 63, 50, 0.07);
}

.view-tabs button,
.carry-strip button,
.upcoming-strip button,
.card-actions button,
.item-editor button {
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.64);
  cursor: pointer;
  transition: transform 0.35s var(--ease), background 0.35s var(--ease), box-shadow 0.35s var(--ease);
}

.view-tabs button:hover,
.carry-strip button:hover,
.upcoming-strip button:hover,
.card-actions button:hover,
.item-editor button:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 12px 24px rgba(24, 63, 50, 0.1);
}

.view-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.view-tabs button[aria-pressed='true'] {
  color: #fff8e6;
  background: var(--leaf);
}

.command-bar textarea {
  min-height: 64px;
  max-height: 128px;
  resize: vertical;
  border: 0;
  border-radius: 0;
  padding: 14px 16px;
  color: var(--ink);
  background: transparent;
  outline: none;
  line-height: 1.65;
}

.focus-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.focus-strip.focus-count-1 {
  grid-template-columns: minmax(0, 1fr);
}

.focus-card {
  min-height: 0;
  padding: 18px;
  grid-template-columns: minmax(0, 1fr);
  border-color: rgba(255, 255, 255, 0.78);
  background:
    radial-gradient(circle at 92% 0%, rgba(255, 255, 255, 0.86), transparent 32%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(226, 237, 241, 0.54));
  backdrop-filter: blur(18px) saturate(1.1);
}

.focus-card::before {
  content: '';
  position: absolute;
  inset: 1px;
  pointer-events: none;
  border-radius: 25px;
  border: 1px solid rgba(255, 255, 255, 0.48);
}

.command-bar textarea:focus {
  box-shadow: inset 0 0 0 999px rgba(255, 255, 255, 0.2);
}

.command-bar button {
  border: 0;
  border-left: 1px solid rgba(23, 35, 29, 0.1);
  border-radius: 0;
  padding: 0 18px;
  min-width: 0;
  color: #fff8e6;
  background: var(--leaf);
  cursor: pointer;
  transition: transform 0.35s var(--ease), box-shadow 0.35s var(--ease);
}

.command-bar button:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(24, 63, 50, 0.2);
}

.today-notice {
  justify-self: start;
  margin-top: -8px;
  border: 1px solid rgba(215, 164, 61, 0.22);
  border-radius: 999px;
  padding: 8px 12px;
  color: rgba(23, 35, 29, 0.72);
  background: rgba(255, 248, 230, 0.72);
  font-size: 13px;
}

.carry-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 8px;
  scrollbar-width: thin;
}

.carry-strip button {
  flex: 0 0 auto;
  border: 1px solid rgba(215, 164, 61, 0.28);
  background: rgba(244, 228, 184, 0.72);
}

.upcoming-strip {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(24, 63, 50, 0.1);
  border-radius: 26px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.68), rgba(226, 237, 241, 0.48));
  box-shadow: 0 14px 34px rgba(24, 63, 50, 0.07);
}

.upcoming-strip button {
  width: 100%;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border: 1px solid rgba(24, 63, 50, 0.1);
  border-radius: 18px;
  padding: 8px 10px;
  text-align: left;
  white-space: normal;
}

.upcoming-strip span {
  color: var(--muted);
  font-size: 12px;
}

.upcoming-strip strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
}

.today-lanes {
  display: grid;
  grid-template-columns: minmax(0, 1.62fr) minmax(280px, 1fr);
  gap: 18px;
  align-items: start;
}

.today-lanes.is-single {
  grid-template-columns: minmax(0, 1fr);
}

.today-stack {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.today-lane {
  display: flex;
  flex-direction: column;
  align-content: start;
  gap: 10px;
}

.matrix-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}

.matrix-lane {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(24, 63, 50, 0.1);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.38);
  box-shadow: 0 12px 30px rgba(24, 63, 50, 0.06);
}

.today-lane-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}

.today-lane-title small {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  color: var(--leaf);
  background: rgba(24, 63, 50, 0.08);
}

.today-card {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 26px;
  background: var(--glass-strong);
  box-shadow: 0 12px 34px rgba(24, 63, 50, 0.08);
  transition: transform 0.35s var(--ease), opacity 0.35s var(--ease), box-shadow 0.35s var(--ease);
}

.compact-card {
  padding: 13px;
  grid-template-columns: minmax(0, 1fr);
}

.today-card.no-check {
  grid-template-columns: minmax(0, 1fr);
}

.completed-card {
  background: rgba(255, 255, 255, 0.58);
}

.compact-card .card-title-button {
  font-size: 16px;
}

.today-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 42px rgba(24, 63, 50, 0.12);
}

.today-card.is-done {
  opacity: 0.58;
}

.today-leaf,
.today-study {
  background: linear-gradient(145deg, rgba(220, 233, 223, 0.9), rgba(255, 255, 255, 0.62));
}

.today-blue,
.today-work {
  background: linear-gradient(145deg, rgba(226, 237, 241, 0.9), rgba(255, 255, 255, 0.62));
}

.today-honey,
.today-reading {
  background: linear-gradient(145deg, rgba(244, 228, 184, 0.9), rgba(255, 255, 255, 0.62));
}

.today-rose,
.today-life {
  background: linear-gradient(145deg, rgba(239, 223, 215, 0.92), rgba(255, 255, 255, 0.62));
}

.today-lilac,
.today-writing {
  background: linear-gradient(145deg, rgba(228, 225, 239, 0.92), rgba(255, 255, 255, 0.62));
}

.today-check {
  position: relative;
  margin-top: 3px;
}

.today-check input {
  position: absolute;
  opacity: 0;
}

.today-check span {
  display: block;
  width: 22px;
  height: 22px;
  border: 1px solid rgba(24, 63, 50, 0.3);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.56);
}

.today-check input:checked + span {
  background: var(--leaf);
  box-shadow: inset 0 0 0 5px rgba(255, 255, 255, 0.78);
}

.today-card-body {
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.today-card-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.today-card-content {
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.today-card-head {
  display: block;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.card-actions {
  display: flex;
  min-width: max-content;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.focus-card .card-actions {
  min-width: 0;
  justify-content: flex-start;
}

.focus-card .card-title-button {
  display: block;
  width: 100%;
  max-width: 100%;
  inline-size: auto;
  max-inline-size: none;
  overflow-wrap: anywhere;
  word-break: normal;
}

.card-title-button {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  border: 0;
  padding: 0;
  color: var(--ink);
  background: transparent;
  font-size: 20px;
  line-height: 1.35;
  letter-spacing: 0;
  text-align: left;
  cursor: pointer;
  overflow-wrap: anywhere;
}

.card-summary {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.72;
}

.today-card-head b {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 5px 8px;
  color: #6f4b00;
  background: rgba(215, 164, 61, 0.24);
  font-size: 12px;
  font-weight: 500;
}

.today-card-head b:nth-of-type(2) {
  color: #425526;
  background: rgba(110, 127, 69, 0.18);
}

.today-card-head b:nth-of-type(3) {
  color: #74401e;
  background: rgba(167, 101, 53, 0.18);
}

.card-actions button {
  padding: 5px 8px;
  color: var(--muted);
  font-size: 12px;
}

.today-meta,
.link-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.today-meta span,
.link-chips a {
  border: 1px solid rgba(24, 63, 50, 0.1);
  border-radius: 999px;
  padding: 5px 8px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.48);
  font-size: 12px;
  max-width: 100%;
}

.link-chips {
  margin-top: 12px;
}

.link-chips a {
  max-width: 100%;
  color: var(--leaf);
  background: rgba(255, 255, 255, 0.62);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.link-chips a:hover {
  color: var(--leaf);
  border-color: rgba(24, 63, 50, 0.24);
}

.mini-list {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}

.mini-list label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}

.mini-list input {
  accent-color: var(--leaf);
}

.item-editor {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(24, 63, 50, 0.12);
}

.item-editor input,
.item-editor select,
.item-editor textarea {
  width: 100%;
  border: 1px solid rgba(24, 63, 50, 0.12);
  border-radius: 16px;
  padding: 10px 12px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.62);
  outline: none;
}

.item-editor textarea {
  min-height: 68px;
  resize: vertical;
}

.lane-empty {
  margin: 0;
  border: 1px dashed rgba(24, 63, 50, 0.16);
  border-radius: 22px;
  padding: 18px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.44);
  font-size: 14px;
  line-height: 1.6;
}

.history-section {
  border: 1px solid rgba(24, 63, 50, 0.1);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.48);
  box-shadow: 0 12px 30px rgba(24, 63, 50, 0.06);
  overflow: hidden;
}

.history-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 0;
  padding: 13px 16px;
  color: var(--ink);
  background: transparent;
  cursor: pointer;
}

.history-toggle span {
  font-weight: 650;
}

.history-toggle b {
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
}

.history-list,
.reading-history-list {
  display: grid;
  gap: 8px;
  padding: 0 12px 12px;
}

.reading-empty {
  margin-top: 18px;
  border: 1px dashed rgba(24, 63, 50, 0.18);
  border-radius: 26px;
  padding: 28px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.54);
}

.reading-box {
  display: grid;
  gap: 14px;
}

.reading-workspace {
  display: grid;
  grid-template-columns: minmax(240px, 0.82fr) minmax(0, 1.42fr);
  gap: 16px;
}

.reading-list {
  display: grid;
  align-content: start;
  gap: 10px;
  max-height: calc(100vh - 220px);
  overflow: auto;
  padding-right: 4px;
}

.reading-list button {
  display: grid;
  gap: 7px;
  border: 1px solid rgba(24, 63, 50, 0.1);
  border-radius: 22px;
  padding: 14px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.56);
  text-align: left;
  cursor: pointer;
  transition: transform 0.35s var(--ease), background 0.35s var(--ease), box-shadow 0.35s var(--ease);
}

.reading-list button:hover,
.reading-list button[aria-pressed='true'] {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 32px rgba(24, 63, 50, 0.1);
}

.reading-list button[aria-pressed='true'] {
  border-color: rgba(24, 63, 50, 0.24);
}

.reading-list-meta,
.reading-tags,
.reading-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reading-list span,
.reading-list em,
.reading-detail-tags span {
  color: var(--muted);
  font-size: 12px;
}

.reading-list-meta span,
.reading-tags em,
.reading-detail-tags span {
  border: 1px solid rgba(24, 63, 50, 0.1);
  border-radius: 999px;
  padding: 4px 7px;
  background: rgba(255, 255, 255, 0.5);
  font-style: normal;
}

.reading-list strong {
  font-size: 15px;
  line-height: 1.42;
  font-weight: 520;
  overflow-wrap: anywhere;
}

.reading-list small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.58;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.reading-panel {
  min-width: 0;
  border: 1px solid rgba(24, 63, 50, 0.12);
  border-radius: 34px;
  padding: 24px;
  background:
    radial-gradient(circle at 85% 8%, rgba(215, 164, 61, 0.18), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.76), rgba(226, 237, 241, 0.52));
  box-shadow: 0 18px 48px rgba(24, 63, 50, 0.1);
}

.reading-panel.is-done {
  opacity: 0.72;
}

.reading-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.reading-panel h2 {
  margin: 6px 0 0;
  max-width: 760px;
  font-size: clamp(26px, 4vw, 44px);
  line-height: 1.08;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.reading-panel-head button,
.reading-actions button,
.reading-back,
.reading-note-link {
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  color: #fff8e6;
  background: var(--leaf);
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.35s var(--ease), box-shadow 0.35s var(--ease);
}

.reading-panel-head button:hover,
.reading-actions button:hover,
.reading-back:hover,
.reading-note-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(24, 63, 50, 0.18);
}

.reading-actions button:disabled {
  cursor: not-allowed;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.58);
  box-shadow: none;
}

.reading-summary {
  margin: 18px 0 0;
  max-width: 760px;
  color: rgba(23, 35, 29, 0.76);
  font-size: 16px;
  line-height: 1.88;
  overflow-wrap: anywhere;
}

.reading-detail-tags {
  margin-top: 14px;
}

.reading-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.reading-links a {
  border: 1px solid rgba(24, 63, 50, 0.12);
  border-radius: 999px;
  padding: 8px 11px;
  color: var(--leaf);
  background: rgba(255, 255, 255, 0.68);
  text-decoration: none;
  overflow-wrap: anywhere;
  max-width: 100%;
}

.reading-no-link {
  margin: 16px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.reading-back {
  display: none;
  margin-bottom: 12px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.72);
}

.reading-note {
  display: grid;
  gap: 10px;
  margin-top: 24px;
}

.reading-note span {
  color: var(--muted);
  font-size: 13px;
}

.reading-note textarea {
  min-height: 220px;
  border: 1px solid rgba(24, 63, 50, 0.12);
  border-radius: 24px;
  padding: 16px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.68);
  outline: none;
  resize: vertical;
  line-height: 1.75;
}

.reading-note textarea:focus {
  border-color: rgba(24, 63, 50, 0.34);
  box-shadow: 0 0 0 5px rgba(24, 63, 50, 0.08);
}

.reading-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.reading-actions button:nth-child(2) {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.72);
}

.reading-note-link {
  color: var(--ink);
  background: rgba(244, 228, 184, 0.72);
}

.reading-actions span {
  color: var(--muted);
  font-size: 13px;
}

.reading-history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(24, 63, 50, 0.09);
  border-radius: 18px;
  padding: 11px 12px;
  background: rgba(255, 255, 255, 0.56);
}

.reading-history-item > div {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.reading-history-item strong {
  font-size: 15px;
  font-weight: 540;
  overflow-wrap: anywhere;
}

.reading-history-item button {
  border: 0;
  border-radius: 999px;
  padding: 8px 10px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
}

.notes-desk {
  display: grid;
  grid-template-columns: minmax(240px, 0.82fr) minmax(0, 1.42fr);
  gap: 16px;
  align-items: start;
}

.notes-list,
.notes-editor {
  min-width: 0;
  border: 1px solid rgba(24, 63, 50, 0.1);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 14px 36px rgba(24, 63, 50, 0.07);
}

.notes-list {
  display: grid;
  gap: 10px;
  max-height: calc(100vh - 220px);
  overflow: auto;
  padding: 14px;
}

.notes-list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.notes-list-head h2 {
  margin: 4px 0 0;
  font-size: 24px;
  line-height: 1.18;
  letter-spacing: 0;
}

.notes-list-head button,
.notes-actions button,
.notes-editor-empty button,
.notes-back {
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  color: #fff8e6;
  background: var(--leaf);
  cursor: pointer;
  transition: transform 0.35s var(--ease), box-shadow 0.35s var(--ease), background 0.35s var(--ease);
}

.notes-list-head button:hover,
.notes-actions button:hover,
.notes-editor-empty button:hover,
.notes-back:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(24, 63, 50, 0.16);
}

.notes-list > button {
  display: grid;
  gap: 6px;
  width: 100%;
  border: 1px solid rgba(24, 63, 50, 0.1);
  border-radius: 20px;
  padding: 13px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.56);
  text-align: left;
  cursor: pointer;
}

.notes-list > button[aria-pressed='true'] {
  border-color: rgba(24, 63, 50, 0.28);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 14px 28px rgba(24, 63, 50, 0.08);
}

.notes-list strong {
  font-size: 15px;
  line-height: 1.42;
  font-weight: 560;
  overflow-wrap: anywhere;
}

.notes-list small,
.notes-list span,
.notes-empty,
.notes-actions span {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.58;
}

.notes-list small {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.notes-empty {
  margin: 0;
  border: 1px dashed rgba(24, 63, 50, 0.16);
  border-radius: 20px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.42);
}

.notes-editor {
  display: grid;
  gap: 12px;
  padding: 18px;
  background:
    radial-gradient(circle at 88% 6%, rgba(226, 237, 241, 0.62), transparent 34%),
    rgba(255, 255, 255, 0.64);
}

.notes-title-input,
.notes-body-input {
  width: 100%;
  border: 1px solid rgba(24, 63, 50, 0.12);
  color: var(--ink);
  background: rgba(255, 255, 255, 0.7);
  outline: none;
}

.notes-title-input {
  border-radius: 22px;
  padding: 14px 16px;
  font-size: 22px;
  line-height: 1.28;
  font-family: inherit;
}

.notes-body-input {
  min-height: min(58vh, 560px);
  border-radius: 24px;
  padding: 16px;
  resize: vertical;
  font-size: 15px;
  line-height: 1.78;
}

.notes-title-input:focus,
.notes-body-input:focus {
  border-color: rgba(24, 63, 50, 0.34);
  box-shadow: 0 0 0 5px rgba(24, 63, 50, 0.08);
}

.notes-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.notes-actions button:nth-child(n + 2) {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.72);
}

.notes-actions button:disabled {
  cursor: not-allowed;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.58);
  box-shadow: none;
}

.notes-back {
  display: none;
  width: fit-content;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.72);
}

.notes-editor-empty {
  display: grid;
  min-height: 320px;
  place-items: center;
  border: 1px dashed rgba(24, 63, 50, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.42);
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.empty-panel {
  margin-top: 20px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.62);
}

.empty-panel h2 {
  margin: 0 0 8px;
}

.empty-panel p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.soft-button {
  border: 0;
  border-radius: 999px;
  padding: 12px 16px;
  color: var(--ink);
  background: var(--honey-soft);
  cursor: pointer;
  transition: transform 0.35s var(--ease), box-shadow 0.35s var(--ease);
}

.soft-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(215, 164, 61, 0.18);
}

.page-pad {
  padding: 56px 0;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  margin-top: 28px;
}

.course-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 18px;
  align-items: start;
}

.course-import-panel,
.course-side-panel,
.course-job-list {
  border: 1px solid rgba(78, 114, 99, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 22px 55px rgba(24, 63, 50, 0.08);
  padding: 22px;
  min-width: 0;
}

.course-job-list {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
}

.course-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.course-form-grid label {
  display: grid;
  gap: 8px;
  color: var(--muted);
  font-size: 0.86rem;
}

.course-form-grid input {
  width: 100%;
  border: 1px solid rgba(78, 114, 99, 0.2);
  border-radius: 16px;
  padding: 12px 14px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.76);
}

.course-file-drop {
  display: grid;
  gap: 6px;
  border: 1px dashed rgba(42, 91, 73, 0.32);
  border-radius: 24px;
  padding: 22px;
  color: var(--muted);
  background: rgba(232, 241, 236, 0.58);
  cursor: pointer;
}

.course-file-drop input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.course-file-drop.is-dragging {
  border-color: rgba(24, 63, 50, 0.62);
  background: rgba(220, 233, 223, 0.92);
  box-shadow: inset 0 0 0 3px rgba(24, 63, 50, 0.08);
}

.course-file-drop strong {
  color: var(--leaf);
  font-size: 1.05rem;
}

.course-file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 18px;
}

.course-file-list span {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(78, 114, 99, 0.16);
  border-radius: 999px;
  padding: 8px 11px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.68);
}

.course-file-list small {
  color: var(--muted);
  white-space: nowrap;
}

.soft-button.primary {
  color: #fff8e6;
  background: var(--leaf);
}

.soft-button.danger {
  color: #7f3e2e;
  background: rgba(232, 177, 146, 0.24);
}

.soft-button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.status-line {
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.status-line.error {
  color: #9a4a32;
}

.course-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0;
}

.course-summary-grid div {
  border-radius: 18px;
  padding: 12px;
  background: rgba(232, 241, 236, 0.58);
}

.course-summary-grid dt {
  color: var(--muted);
  font-size: 0.78rem;
}

.course-summary-grid dd {
  margin: 5px 0 0;
  color: var(--leaf);
  font-size: 1.15rem;
}

.course-warning-list {
  display: grid;
  gap: 8px;
}

.course-warning-list p,
.worker-status,
.empty-copy {
  margin: 0;
  border-radius: 18px;
  padding: 12px;
  color: var(--muted);
  line-height: 1.6;
  background: rgba(255, 248, 230, 0.58);
}

.course-material-preview {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.course-material-preview article {
  display: grid;
  gap: 5px;
  border: 1px solid rgba(78, 114, 99, 0.13);
  border-radius: 18px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
}

.course-material-preview strong,
.course-material-preview span,
.course-material-preview small {
  min-width: 0;
  overflow-wrap: anywhere;
}

.course-material-preview strong {
  color: var(--leaf);
}

.course-material-preview span,
.course-material-preview small {
  color: var(--muted);
  line-height: 1.55;
}

.worker-status {
  margin-top: 14px;
  background: rgba(232, 241, 236, 0.54);
}

.worker-status span,
.worker-status strong {
  display: block;
}

.worker-status strong {
  color: var(--leaf);
  margin: 3px 0 6px;
}

.course-job-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border: 1px solid rgba(78, 114, 99, 0.16);
  border-radius: 22px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.62);
}

.course-job-row.active {
  border-color: rgba(5, 57, 38, 0.34);
  box-shadow: 0 18px 38px rgba(24, 63, 50, 0.1);
}

.course-job-row span {
  color: var(--muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.course-job-row h3 {
  margin: 4px 0;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.course-job-row p {
  margin: 0;
  color: var(--muted);
}

.course-job-row small {
  display: block;
  margin-top: 6px;
  color: var(--muted);
}

.course-row-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.course-detail-shell {
  grid-column: 1 / -1;
  display: grid;
  gap: 16px;
  border: 1px solid rgba(78, 114, 99, 0.18);
  border-radius: 30px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 24px 60px rgba(24, 63, 50, 0.08);
  min-width: 0;
}

.course-detail-topbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  border-radius: 24px;
  padding: 16px;
  background: rgba(232, 241, 236, 0.52);
}

.course-detail-topbar span,
.course-lesson-nav h3,
.course-inspector h3 {
  color: var(--muted);
  font-size: 0.82rem;
}

.course-detail-topbar h2 {
  margin: 4px 0;
  color: var(--leaf);
}

.course-detail-topbar p {
  margin: 0;
  color: var(--muted);
}

.course-progress-box {
  display: grid;
  gap: 4px;
  min-width: 180px;
  color: var(--muted);
}

.course-progress-box strong {
  color: var(--leaf);
  font-size: 1.5rem;
}

.course-detail-grid {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 280px;
  gap: 16px;
  align-items: start;
}

.course-lesson-nav,
.course-stage-card,
.course-inspector {
  border: 1px solid rgba(78, 114, 99, 0.14);
  border-radius: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.62);
  min-width: 0;
}

.course-stage-stack {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.lesson-pill {
  width: 100%;
  border: 0;
  border-radius: 18px;
  padding: 12px;
  text-align: left;
  color: var(--ink);
  background: rgba(232, 241, 236, 0.72);
}

.lesson-pill span {
  display: block;
  margin-top: 4px;
  color: var(--muted);
}

.course-form-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.course-form-grid select,
.course-wide-label textarea,
.course-code-textarea,
.course-node-card textarea,
.course-final-note {
  width: 100%;
  border: 1px solid rgba(78, 114, 99, 0.2);
  border-radius: 16px;
  padding: 12px 14px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.76);
}

.course-wide-label {
  display: grid;
  gap: 8px;
  margin: 12px 0;
  color: var(--muted);
}

.course-wide-label textarea {
  min-height: 110px;
  resize: vertical;
}

.course-code-textarea {
  min-height: 220px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
}

.course-node-list {
  display: grid;
  gap: 12px;
}

.course-node-card {
  display: grid;
  gap: 12px;
  border-radius: 20px;
  padding: 14px;
  background: rgba(232, 241, 236, 0.54);
}

.course-node-card span {
  color: var(--muted);
  font-size: 0.8rem;
}

.course-node-card h4 {
  margin: 4px 0;
  color: var(--leaf);
  overflow-wrap: anywhere;
}

.course-node-card p {
  max-height: 120px;
  overflow: auto;
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
}

.course-node-card textarea {
  min-height: 180px;
  resize: vertical;
}

.course-final-note {
  min-height: 420px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1.7;
}

.course-inspector {
  position: sticky;
  top: 102px;
  max-height: min(70vh, 760px);
  overflow: auto;
}

.course-inspector summary {
  cursor: pointer;
  color: var(--leaf);
}

.course-inspector pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--muted);
  line-height: 1.65;
  font-size: 0.86rem;
}

.worker-status.inline {
  margin-top: 14px;
}


.course-selected-files {
  display: grid;
  gap: 10px;
  margin: 14px 0 18px;
}

.course-selected-files article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(160px, 0.34fr);
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(78, 114, 99, 0.15);
  border-radius: 18px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.66);
}

.course-selected-files article > div,
.course-selected-files label {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.course-selected-files strong {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--ink);
}

.course-selected-files small,
.course-selected-files label {
  color: var(--muted);
  font-size: 0.8rem;
}

.course-selected-files select,
.course-outline-fields input,
.course-outline-fields textarea,
.course-feedback-box textarea {
  width: 100%;
  border: 1px solid rgba(78, 114, 99, 0.2);
  border-radius: 14px;
  padding: 10px 12px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.78);
}

.course-empty-state,
.course-waiting-card {
  display: grid;
  gap: 6px;
  border: 1px dashed rgba(78, 114, 99, 0.22);
  border-radius: 20px;
  padding: 18px;
  color: var(--muted);
  background: rgba(232, 241, 236, 0.42);
}

.course-empty-state strong,
.course-waiting-card strong {
  color: var(--leaf);
}

.course-empty-state p,
.course-waiting-card p {
  margin: 0;
  line-height: 1.65;
}

.course-primary-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.course-stepper {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.course-stepper li {
  display: grid;
  justify-items: center;
  gap: 6px;
  min-width: 0;
  color: #8a968f;
  font-size: 0.78rem;
  text-align: center;
}

.course-stepper li::before {
  content: '';
  position: absolute;
}

.course-stepper i {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(78, 114, 99, 0.18);
  border-radius: 50%;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.72);
  font-style: normal;
}

.course-stepper .is-complete i,
.course-stepper .is-current i {
  border-color: transparent;
  color: #fff8e6;
  background: var(--leaf);
}

.course-stepper .is-current span {
  color: var(--leaf);
  font-weight: 700;
}

.course-stepper .is-locked {
  opacity: 0.54;
}

.course-service-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 220px)) minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
}

.course-service-panel > p,
.course-service-badge {
  margin: 0;
  border-radius: 18px;
  padding: 12px 14px;
  background: rgba(232, 241, 236, 0.5);
}

.course-service-badge {
  display: grid;
  gap: 3px;
  border: 1px solid rgba(78, 114, 99, 0.13);
}

.course-service-badge span,
.course-service-badge small,
.course-service-panel > p {
  color: var(--muted);
  line-height: 1.5;
}

.course-service-badge strong {
  color: var(--leaf);
}

.course-service-badge.is-offline strong {
  color: #9a4a32;
}

.course-lesson-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.course-lesson-tabs button {
  display: grid;
  flex: 0 0 auto;
  gap: 3px;
  min-width: 150px;
  border: 1px solid rgba(78, 114, 99, 0.15);
  border-radius: 18px;
  padding: 11px 13px;
  text-align: left;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.62);
  cursor: pointer;
}

.course-lesson-tabs button.active {
  border-color: rgba(24, 63, 50, 0.42);
  background: rgba(220, 233, 223, 0.8);
}

.course-lesson-tabs span {
  color: var(--muted);
  font-size: 0.78rem;
}

.course-stage-heading {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: start;
  margin-bottom: 16px;
}

.course-stage-heading span {
  color: var(--muted);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
}

.course-stage-heading h3 {
  margin: 3px 0 0;
  color: var(--leaf);
  font-size: 1.45rem;
}

.course-stage-heading p {
  max-width: 460px;
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.course-outline-list {
  display: grid;
  gap: 12px;
}

.course-outline-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  border: 1px solid rgba(78, 114, 99, 0.14);
  border-radius: 20px;
  padding: 14px;
  background: rgba(232, 241, 236, 0.44);
}

.course-outline-order {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #fff8e6;
  background: var(--leaf);
}

.course-outline-fields,
.course-outline-fields label {
  display: grid;
  min-width: 0;
  gap: 7px;
  color: var(--muted);
  font-size: 0.82rem;
}

.course-outline-fields textarea {
  min-height: 76px;
  resize: vertical;
}

.course-range-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.course-outline-actions {
  display: grid;
  gap: 6px;
}

.course-outline-actions button,
.course-add-outline {
  border: 1px solid rgba(78, 114, 99, 0.16);
  border-radius: 12px;
  padding: 8px 10px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}

.course-outline-actions button.is-active {
  color: #fff8e6;
  background: var(--leaf);
}

.course-outline-actions button.danger {
  color: #9a4a32;
}

.course-add-outline {
  width: 100%;
  border-style: dashed;
  color: var(--leaf);
}

.course-node-layout {
  display: grid;
  grid-template-columns: minmax(190px, 0.32fr) minmax(0, 1fr);
  gap: 14px;
}

.course-node-nav {
  display: grid;
  align-content: start;
  gap: 7px;
  max-height: 760px;
  overflow: auto;
}

.course-node-nav button {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  border: 1px solid transparent;
  border-radius: 16px;
  padding: 10px;
  text-align: left;
  color: var(--ink);
  background: rgba(232, 241, 236, 0.42);
  cursor: pointer;
}

.course-node-nav button.active {
  border-color: rgba(24, 63, 50, 0.34);
  background: rgba(220, 233, 223, 0.86);
}

.course-node-nav i {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: var(--leaf);
  background: rgba(255, 255, 255, 0.76);
  font-style: normal;
}

.course-node-nav span,
.course-node-nav small {
  display: block;
  min-width: 0;
}

.course-node-nav b {
  display: block;
  overflow-wrap: anywhere;
}

.course-node-nav small {
  margin-top: 4px;
  color: var(--muted);
}

.course-node-editor {
  display: grid;
  min-width: 0;
  gap: 13px;
}

.course-node-editor > header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.course-node-editor header span,
.course-node-editor header > strong {
  color: var(--muted);
  font-size: 0.82rem;
}

.course-node-editor h4 {
  margin: 4px 0 0;
  color: var(--leaf);
  font-size: 1.25rem;
}

.course-node-editor > label,
.course-feedback-box label {
  display: grid;
  gap: 7px;
  color: var(--muted);
}

.course-node-editor > label textarea {
  width: 100%;
  min-height: 330px;
  border: 1px solid rgba(78, 114, 99, 0.2);
  border-radius: 18px;
  padding: 14px;
  resize: vertical;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.78);
  line-height: 1.75;
}

.course-review-report {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(78, 114, 99, 0.14);
  border-radius: 20px;
  padding: 14px;
  background: rgba(232, 241, 236, 0.5);
}

.course-review-report header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.course-review-report header strong {
  color: var(--leaf);
}

.course-review-report header span,
.course-review-report p,
.course-review-report li {
  color: var(--muted);
}

.course-review-scores {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.course-review-scores div {
  display: grid;
  gap: 3px;
  border-radius: 14px;
  padding: 9px;
  text-align: center;
  background: rgba(255, 255, 255, 0.68);
}

.course-review-scores span {
  color: var(--muted);
  font-size: 0.76rem;
}

.course-review-scores b {
  color: var(--leaf);
}

.course-feedback-box {
  display: grid;
  gap: 10px;
  border-left: 3px solid rgba(167, 101, 53, 0.46);
  border-radius: 0 18px 18px 0;
  padding: 14px;
  background: rgba(255, 248, 230, 0.58);
}

.course-feedback-box textarea {
  min-height: 110px;
  resize: vertical;
}

.course-source-drawer,
.course-diagnostics {
  border: 1px solid rgba(78, 114, 99, 0.14);
  border-radius: 18px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.58);
}

.course-source-drawer summary,
.course-diagnostics summary {
  cursor: pointer;
  color: var(--leaf);
}

.course-source-drawer pre {
  max-height: 280px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--muted);
  line-height: 1.65;
}

@media (max-width: 900px) {
  .hero,
  .desk-layout {
    grid-template-columns: 1fr;
  }

  .desk-layout {
    width: min(100% - 24px, 720px);
    gap: 12px;
    padding-top: 12px;
  }

  .desk-sidebar {
    display: none;
  }

  .desk-topbar {
    position: relative;
    top: auto;
  }

  .desk-mobile-nav {
    display: block;
    border: 1px solid var(--line);
    border-radius: 22px;
    padding: 0;
    background: rgba(255, 255, 255, 0.68);
    box-shadow: 0 12px 30px rgba(24, 63, 50, 0.08);
  }

  .desk-mobile-nav summary {
    cursor: pointer;
    padding: 13px 15px;
    color: var(--leaf);
    list-style: none;
  }

  .desk-mobile-nav summary::-webkit-details-marker {
    display: none;
  }

  .desk-mobile-nav nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0 12px 12px;
  }

  .desk-mobile-nav a {
    border-radius: 999px;
    padding: 8px 10px;
    color: var(--muted);
    background: rgba(255, 255, 255, 0.58);
  }

  .desk-mobile-nav a[aria-current='page'] {
    color: #fff8e6;
    background: var(--leaf);
  }

  .desk-page {
    padding: 18px;
    border-radius: 24px;
  }

  .section-grid,
  .desk-grid,
  .tool-grid,
  .today-lanes,
  .focus-strip,
  .matrix-board,
  .reading-workspace,
  .notes-desk,
  .course-workspace,
  .course-detail-topbar,
  .course-detail-grid,
  .command-bar,
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .nav {
    display: none;
  }

  .command-bar {
    grid-template-columns: 1fr;
  }

  .command-bar button {
    min-height: 44px;
    border-left: 0;
    border-top: 1px solid rgba(23, 35, 29, 0.1);
  }

  .card-actions {
    max-width: 100%;
    min-width: 0;
  }

  .today-card-head,
  .reading-panel-head {
    align-items: stretch;
  }

  .reading-list {
    max-height: none;
    padding-right: 0;
  }

  .notes-list {
    max-height: none;
  }

  .reading-box.show-detail .reading-list {
    display: none;
  }

  .reading-box:not(.show-detail) .reading-panel {
    display: none;
  }

  .notes-desk.show-editor .notes-list {
    display: none;
  }

  .notes-desk:not(.show-editor) .notes-editor {
    display: none;
  }

  .reading-history-item {
    grid-template-columns: 1fr;
  }

  .reading-back {
    display: inline-flex;
    justify-content: center;
    width: fit-content;
  }

  .notes-back {
    display: inline-flex;
    justify-content: center;
  }

  .course-job-list,
  .course-detail-shell {
    grid-column: auto;
  }

  .course-inspector {
    position: static;
    max-height: none;
  }
}


@media (max-width: 900px) {
  .course-service-panel,
  .course-node-layout {
    grid-template-columns: 1fr;
  }

  .course-stepper {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    row-gap: 14px;
  }

  .course-selected-files article,
  .course-outline-item {
    grid-template-columns: 1fr;
  }

  .course-outline-order {
    width: 30px;
    height: 30px;
  }

  .course-outline-actions {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .course-range-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .course-stage-heading,
  .course-node-editor > header {
    display: grid;
  }

  .course-node-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: none;
  }
}

@media (max-width: 520px) {
  .desk-layout {
    width: min(100% - 16px, 520px);
  }

  .desk-topbar {
    align-items: flex-start;
    border-radius: 20px;
  }

  .desk-topbar .ghost-link {
    padding: 8px 10px;
    white-space: nowrap;
  }

  .desk-page {
    padding: 14px;
  }

  .today-card {
    grid-template-columns: 24px minmax(0, 1fr);
    padding: 13px;
  }

  .focus-card,
  .compact-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .view-tabs button,
  .carry-strip button,
  .upcoming-strip button,
  .card-actions button,
  .item-editor button,
  .reading-panel-head button,
  .reading-actions button,
  .reading-back,
  .reading-note-link,
  .notes-list-head button,
  .notes-actions button,
  .notes-back {
    padding: 9px 11px;
  }

  .reading-panel {
    padding: 18px;
    border-radius: 26px;
  }

  .notes-editor,
  .notes-list,
  .course-import-panel,
  .course-side-panel,
  .course-job-list {
    border-radius: 24px;
    padding: 14px;
  }

  .course-form-grid,
  .course-form-grid.three,
  .course-job-row {
    grid-template-columns: 1fr;
  }

  .course-row-actions {
    justify-content: flex-start;
  }
}


/* Compact online course workspace */
.course-workspace.compact {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.course-page-switcher,
.course-import-steps {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  gap: 6px;
  padding: 5px;
  border: 1px solid rgba(78, 114, 99, 0.15);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  overflow-x: auto;
}

.course-page-switcher button,
.course-import-steps button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  padding: 9px 14px;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
}

.course-page-switcher button.active,
.course-import-steps button.active {
  color: #fff8e6;
  background: var(--leaf);
}

.course-page-switcher button:disabled,
.course-import-steps button:disabled {
  opacity: .42;
  cursor: not-allowed;
}

.course-library-panel,
.course-import-shell {
  min-width: 0;
  border: 1px solid rgba(78, 114, 99, 0.18);
  border-radius: 28px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 22px 55px rgba(24, 63, 50, 0.08);
}

.course-import-shell {
  display: grid;
  gap: 16px;
}

.course-import-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(210px, 300px);
  gap: 18px;
  align-items: start;
}

.course-import-header span,
.course-import-header p {
  color: var(--muted);
}

.course-import-header h2 {
  margin: 4px 0 6px;
  color: var(--leaf);
  font-size: clamp(1.5rem, 3vw, 2.2rem);
}

.course-import-header p {
  margin: 0;
  line-height: 1.7;
}

.course-import-pane {
  display: grid;
  gap: 16px;
  min-width: 0;
  animation: course-pane-in .24s ease-out;
}

@keyframes course-pane-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.course-selected-files {
  display: grid;
  gap: 8px;
  max-height: 340px;
  overflow: auto;
  padding-right: 3px;
}

.course-selected-files article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, 220px) auto;
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(78, 114, 99, .14);
  border-radius: 18px;
  padding: 11px 12px;
  background: rgba(255, 255, 255, .62);
}

.course-selected-files article > div,
.course-selected-files article > label {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.course-selected-files strong {
  overflow-wrap: anywhere;
}

.course-selected-files small,
.course-selected-files label {
  color: var(--muted);
  font-size: .8rem;
}

.course-selected-files select,
.course-groups select,
.course-groups input {
  min-width: 0;
  border: 1px solid rgba(78, 114, 99, .18);
  border-radius: 12px;
  padding: 8px 10px;
  color: var(--ink);
  background: rgba(255, 255, 255, .8);
}

.course-file-remove {
  border: 0;
  padding: 8px 10px;
  color: #8d4c3b;
  background: transparent;
  cursor: pointer;
}

.course-grouping-panel,
.course-groups {
  display: grid;
  gap: 12px;
}

.course-groups {
  max-height: min(62vh, 700px);
  overflow: auto;
  padding-right: 3px;
}

.course-group-card {
  border: 1px solid rgba(78, 114, 99, .16);
  border-radius: 22px;
  padding: 14px;
  background: rgba(232, 241, 236, .38);
}

.course-group-card > header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.course-group-card > header input {
  font-size: 1.02rem;
  font-weight: 700;
}

.course-group-card > header span {
  color: var(--muted);
  font-size: .78rem;
}


.course-group-header-meta {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.course-group-order-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.course-group-order-actions button {
  border: 0;
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--muted);
  background: rgba(255, 255, 255, .7);
  cursor: pointer;
}

.course-group-order-actions button:disabled {
  opacity: .38;
  cursor: default;
}

.course-group-order-actions button.danger {
  color: #8d4c3b;
}


.course-group-card > div {
  display: grid;
  gap: 8px;
}

.course-group-card article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(130px, 180px) minmax(130px, 180px) auto;
  gap: 8px;
  align-items: end;
  border-radius: 16px;
  padding: 10px;
  background: rgba(255, 255, 255, .66);
}

.course-group-card article > div,
.course-group-card article > label {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.course-group-card article strong {
  overflow-wrap: anywhere;
}

.course-group-card article small,
.course-group-card article label {
  color: var(--muted);
  font-size: .78rem;
}


.course-group-card article .course-ocr-complete {
  width: fit-content;
  border-radius: 999px;
  padding: 3px 7px;
  color: var(--leaf);
  background: rgba(220, 233, 223, .88);
}


.course-ocr-action {
  display: grid;
  gap: 4px;
  align-self: stretch;
}

.course-ocr-action small.error {
  color: #9a4a32;
}

.course-loading-line {
  display: flex;
  align-items: center;
  gap: 11px;
  border: 1px solid rgba(78, 114, 99, .14);
  border-radius: 18px;
  padding: 12px 14px;
  color: var(--muted);
  background: rgba(232, 241, 236, .5);
}

.course-loading-line > i {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border: 2px solid rgba(24, 63, 50, .16);
  border-top-color: var(--leaf);
  border-radius: 50%;
  animation: course-spin .8s linear infinite;
}

.course-loading-line > span {
  display: grid;
  gap: 2px;
}

.course-loading-line strong {
  color: var(--leaf);
}

.course-loading-line small {
  color: var(--muted);
}

@keyframes course-spin { to { transform: rotate(360deg); } }

.course-job-list.compact-list {
  grid-column: auto;
  max-height: min(68vh, 760px);
  overflow: auto;
  padding-right: 3px;
}

.course-detail-shell {
  grid-column: auto;
  max-width: 100%;
}

.course-back-button {
  border: 0;
  padding: 8px 10px;
  border-radius: 12px;
  color: var(--leaf);
  background: rgba(255, 255, 255, .68);
  cursor: pointer;
}

.course-detail-topbar {
  grid-template-columns: auto minmax(0, 1fr) minmax(200px, .65fr) auto;
}

.course-service-panel {
  display: block;
  border: 1px solid rgba(78, 114, 99, .13);
  border-radius: 18px;
  padding: 0;
  background: rgba(255, 255, 255, .45);
}

.course-service-panel > summary {
  padding: 11px 14px;
  color: var(--muted);
  cursor: pointer;
}

.course-service-panel > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0 12px 12px;
}

.course-workbench-grid {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  min-width: 0;
}

.course-lesson-rail {
  display: grid;
  align-content: start;
  gap: 7px;
  position: sticky;
  top: 92px;
  max-height: calc(100vh - 120px);
  overflow: auto;
}

.course-lesson-rail h3 {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: .82rem;
}

.course-lesson-rail button {
  display: grid;
  gap: 3px;
  border: 1px solid rgba(78, 114, 99, .13);
  border-radius: 16px;
  padding: 10px 11px;
  text-align: left;
  color: var(--ink);
  background: rgba(255, 255, 255, .58);
  cursor: pointer;
}

.course-lesson-rail button.active {
  border-color: rgba(24, 63, 50, .38);
  background: rgba(220, 233, 223, .84);
}

.course-lesson-rail span {
  color: var(--muted);
  font-size: .76rem;
}

.course-stage-stack {
  min-width: 0;
}

.course-stage-card {
  max-height: none;
  overflow: visible;
}

.course-node-workbench,
.course-outline-list {
  min-height: 0;
}

.course-node-layout {
  min-height: 420px;
  max-height: min(70vh, 760px);
}

.course-node-nav,
.course-node-editor {
  min-height: 0;
  overflow: auto;
}

@media (max-width: 980px) {
  .course-detail-topbar,
  .course-import-header,
  .course-workbench-grid {
    grid-template-columns: 1fr;
  }

  .course-back-button {
    width: fit-content;
  }

  .course-lesson-rail {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: 220px;
  }

  .course-lesson-rail h3 {
    grid-column: 1 / -1;
  }

  .course-group-card article {
    grid-template-columns: minmax(0, 1fr) minmax(120px, 160px) minmax(120px, 160px);
  }

  .course-ocr-action {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .course-library-panel,
  .course-import-shell,
  .course-detail-shell {
    padding: 13px;
    border-radius: 22px;
  }

  .course-selected-files article,
  .course-group-card article,
  .course-service-panel > div,
  .course-lesson-rail {
    grid-template-columns: 1fr;
  }

  .course-group-card > header {
    grid-template-columns: 1fr;
  }

  .course-import-steps {
    width: 100%;
  }
}


.reading-schedule-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 150px) minmax(120px, 150px) auto;
  gap: 10px;
  align-items: end;
  margin-top: 18px;
  border: 1px solid rgba(78, 114, 99, .14);
  border-radius: 20px;
  padding: 14px;
  background: rgba(232, 241, 236, .48);
}

.reading-schedule-box > div,
.reading-schedule-box label {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.reading-schedule-box span,
.reading-schedule-box label {
  color: var(--muted);
  font-size: .82rem;
}

.reading-schedule-box select,
.reading-schedule-box input {
  width: 100%;
  border: 1px solid rgba(78, 114, 99, .18);
  border-radius: 12px;
  padding: 9px 10px;
  color: var(--ink);
  background: rgba(255, 255, 255, .76);
}

.reading-schedule-box button {
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  color: #fff8e6;
  background: var(--leaf);
  cursor: pointer;
}

@media (max-width: 760px) {
  .reading-schedule-box {
    grid-template-columns: 1fr 1fr;
  }

  .reading-schedule-box > div {
    grid-column: 1 / -1;
  }
}

@media (max-width: 520px) {
  .reading-schedule-box {
    grid-template-columns: 1fr;
  }
}

    `}</style>
  )
}
