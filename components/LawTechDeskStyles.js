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


.course-detail-topbar {
  grid-template-columns: auto minmax(0, 1fr) minmax(150px, .45fr) auto auto;
  align-items: center;
}

.course-service-lights {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  white-space: nowrap;
}

.course-service-lights > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: .76rem;
  cursor: help;
}

.course-service-lights i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9aa29e;
  box-shadow: 0 0 0 3px rgba(154, 162, 158, .12);
}

.course-service-lights .is-online i {
  background: #4e8a68;
  box-shadow: 0 0 0 3px rgba(78, 138, 104, .13);
}

.course-service-lights .is-offline i {
  background: #b96554;
  box-shadow: 0 0 0 3px rgba(185, 101, 84, .12);
}

.course-archive-panel {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.course-stage-heading.compact {
  align-items: center;
  margin-bottom: 0;
}

.course-archive-hint {
  margin: 0;
  color: var(--muted);
  font-size: .82rem;
}

.course-archive-grid {
  display: grid;
  grid-template-columns: minmax(170px, 220px) minmax(260px, 1fr) minmax(250px, 330px);
  gap: 12px;
  min-height: 430px;
  max-height: min(68vh, 760px);
  min-width: 0;
}

.course-archive-lessons,
.course-material-pool,
.course-material-inspector {
  min-width: 0;
  overflow: auto;
  border: 1px solid rgba(78, 114, 99, .14);
  border-radius: 20px;
  padding: 11px;
  background: rgba(255, 255, 255, .5);
}

.course-archive-lessons,
.course-material-pool {
  display: grid;
  align-content: start;
  gap: 8px;
}

.course-archive-lessons h4,
.course-material-pool h4 {
  margin: 0 0 2px;
  color: var(--muted);
  font-size: .78rem;
  font-weight: 600;
  letter-spacing: .08em;
}

.course-archive-lessons article {
  display: grid;
  gap: 5px;
  border: 1px solid rgba(78, 114, 99, .13);
  border-radius: 15px;
  padding: 9px;
  background: rgba(232, 241, 236, .42);
}

.course-archive-lessons article:has(input:focus),
.course-archive-lessons article:hover {
  border-color: rgba(24, 63, 50, .3);
}

.course-archive-lessons input,
.course-archive-lessons select,
.course-material-inspector select,
.course-material-inspector input {
  min-width: 0;
  border: 1px solid rgba(78, 114, 99, .17);
  border-radius: 10px;
  padding: 7px 8px;
  color: var(--ink);
  background: rgba(255, 255, 255, .78);
}

.course-archive-lessons article > span,
.course-archive-lessons article > small {
  color: var(--muted);
  font-size: .72rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-archive-lessons article > div {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 5px;
}

.course-archive-lessons article button {
  border: 0;
  border-radius: 9px;
  padding: 5px 7px;
  color: var(--muted);
  background: rgba(255, 255, 255, .75);
  cursor: pointer;
}

.course-archive-lessons article button.danger {
  color: #9b4d42;
}

.course-archive-drop-special {
  border: 1px dashed rgba(78, 114, 99, .28);
  border-radius: 14px;
  padding: 10px;
  text-align: center;
  color: var(--leaf);
  font-size: .78rem;
  background: rgba(220, 233, 223, .38);
}

.course-archive-drop-special.muted {
  color: var(--muted);
  background: rgba(255, 255, 255, .44);
}

.course-material-pool > button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(78, 114, 99, .12);
  border-radius: 14px;
  padding: 9px 10px;
  text-align: left;
  color: var(--ink);
  background: rgba(255, 255, 255, .7);
  cursor: grab;
}

.course-material-pool > button.active {
  border-color: rgba(24, 63, 50, .38);
  background: rgba(220, 233, 223, .72);
}

.course-material-pool > button.unassigned {
  border-color: rgba(183, 135, 62, .34);
  background: rgba(244, 228, 184, .3);
}

.course-material-pool > button > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.course-material-pool b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-material-pool small,
.course-material-pool em {
  color: var(--muted);
  font-size: .72rem;
  font-style: normal;
}

.course-material-inspector {
  display: grid;
  align-content: start;
  gap: 10px;
}

.course-material-inspector header {
  min-width: 0;
}

.course-material-inspector header span {
  color: var(--muted);
  font-size: .72rem;
}

.course-material-inspector header h4 {
  margin: 3px 0 0;
  overflow-wrap: anywhere;
}

.course-material-inspector > label {
  display: grid;
  gap: 5px;
  color: var(--muted);
  font-size: .78rem;
}

.course-assignment-list {
  display: grid;
  gap: 8px;
}

.course-assignment-list article {
  display: grid;
  gap: 7px;
  border: 1px solid rgba(78, 114, 99, .13);
  border-radius: 14px;
  padding: 9px;
  background: rgba(232, 241, 236, .34);
}

.course-assignment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.course-assignment-head button {
  border: 0;
  color: #925242;
  background: transparent;
  cursor: pointer;
}

.course-assignment-list label {
  display: grid;
  gap: 4px;
  color: var(--muted);
  font-size: .74rem;
}

.course-assignment-range {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: .72rem;
}

.course-assignment-list small,
.course-assignment-list p {
  margin: 0;
  color: var(--muted);
  font-size: .72rem;
}

.course-inspector-actions {
  display: grid;
  gap: 6px;
}

.course-inspector-actions button {
  border: 1px solid rgba(78, 114, 99, .14);
  border-radius: 10px;
  padding: 7px 9px;
  text-align: left;
  color: var(--leaf);
  background: rgba(255, 255, 255, .68);
  cursor: pointer;
}

.course-global-task {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 10020;
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: min(340px, calc(100vw - 36px));
  border: 1px solid rgba(78, 114, 99, .18);
  border-radius: 999px;
  padding: 5px;
  background: rgba(248, 249, 246, .94);
  box-shadow: 0 16px 44px rgba(24, 63, 50, .18);
  backdrop-filter: blur(16px);
}

.course-global-task > button:first-child {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  border: 0;
  padding: 6px 9px;
  color: var(--ink);
  background: transparent;
  cursor: pointer;
}

.course-global-task > button:first-child > i {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  border-radius: 50%;
  background: #4e8a68;
  box-shadow: 0 0 0 4px rgba(78, 138, 104, .12);
}

.course-global-task.is-running > button:first-child > i {
  animation: course-task-pulse 1.4s ease-in-out infinite;
}

.course-global-task.is-error > button:first-child > i {
  background: #b96554;
  box-shadow: 0 0 0 4px rgba(185, 101, 84, .12);
}

.course-global-task.is-waiting > button:first-child > i {
  background: #c29a49;
  box-shadow: 0 0 0 4px rgba(194, 154, 73, .12);
}

.course-global-task span {
  display: grid;
  min-width: 0;
  text-align: left;
}

.course-global-task b,
.course-global-task small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-global-task small {
  color: var(--muted);
  font-size: .7rem;
}

.course-global-task-close {
  width: 27px;
  height: 27px;
  border: 0;
  border-radius: 50%;
  color: var(--muted);
  background: rgba(78, 114, 99, .08);
  cursor: pointer;
}

@keyframes course-task-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(.78); opacity: .55; }
}

@media (max-width: 1180px) {
  .course-detail-topbar {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .course-progress-box,
  .course-detail-topbar > .course-row-actions {
    grid-column: 2 / -1;
  }

  .course-archive-grid {
    grid-template-columns: minmax(160px, 210px) minmax(240px, 1fr);
  }

  .course-material-inspector {
    grid-column: 1 / -1;
    max-height: 330px;
  }
}

@media (max-width: 760px) {
  .course-detail-topbar,
  .course-archive-grid {
    grid-template-columns: 1fr;
  }

  .course-progress-box,
  .course-detail-topbar > .course-row-actions,
  .course-material-inspector {
    grid-column: auto;
  }

  .course-archive-grid {
    max-height: none;
  }

  .course-archive-lessons,
  .course-material-pool,
  .course-material-inspector {
    max-height: 360px;
  }

  .course-global-task {
    right: 12px;
    bottom: 12px;
  }
}

/* ─────────────────────────────────────────────────────────────
   law-tech 2026 visual system · warm editorial glass
   This layer intentionally overrides the earlier incremental rules.
   ───────────────────────────────────────────────────────────── */
:root {
  --paper: #f4f2ea;
  --paper-deep: #e7e3d7;
  --ink: #17221d;
  --ink-soft: #31423a;
  --muted: #708078;
  --quiet: #95a099;
  --leaf: #113f31;
  --leaf-bright: #2f7458;
  --leaf-soft: #dce9df;
  --honey: #c99731;
  --honey-soft: #f5e4ae;
  --blue: #7899a7;
  --blue-soft: #e2edf0;
  --danger: #a65d4d;
  --line: rgba(25, 55, 43, 0.12);
  --line-strong: rgba(25, 55, 43, 0.2);
  --glass: rgba(255, 255, 255, 0.58);
  --glass-strong: rgba(255, 255, 255, 0.78);
  --glass-faint: rgba(255, 255, 255, 0.38);
  --shadow-sm: 0 10px 30px rgba(24, 54, 43, 0.07);
  --shadow-md: 0 20px 60px rgba(24, 54, 43, 0.1);
  --shadow-lg: 0 34px 100px rgba(24, 54, 43, 0.15);
  --ui-sans: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif;
  --display-serif: "Songti SC", "STSong", "Noto Serif SC", Georgia, serif;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}

html, body {
  min-height: 100%;
}

body {
  font-family: var(--ui-sans);
  background:
    radial-gradient(circle at 14% 4%, rgba(218, 173, 75, 0.18), transparent 29rem),
    radial-gradient(circle at 90% 4%, rgba(112, 157, 169, 0.18), transparent 32rem),
    linear-gradient(145deg, #faf8f1 0%, #edf3ee 55%, #f4f2ea 100%);
}

body::before {
  opacity: 0.18;
  background-size: 52px 52px;
}

::selection {
  color: #fffaf0;
  background: rgba(17, 63, 49, 0.72);
}

button, input, textarea, select {
  font-family: var(--ui-sans);
}

button, a, input, textarea, select, summary {
  -webkit-tap-highlight-color: transparent;
}

* {
  scrollbar-color: rgba(17, 63, 49, 0.24) transparent;
  scrollbar-width: thin;
}

*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: rgba(17, 63, 49, 0.2); background-clip: padding-box; }
*::-webkit-scrollbar-thumb:hover { background: rgba(17, 63, 49, 0.34); background-clip: padding-box; }

/* Public website */
.lawtech-public-page {
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
  overflow-y: visible;
  color: var(--ink);
  background:
    radial-gradient(circle at 12% 0%, rgba(219, 174, 75, 0.2), transparent 28rem),
    radial-gradient(circle at 88% 2%, rgba(118, 159, 174, 0.2), transparent 32rem),
    linear-gradient(145deg, #fbf9f2 0%, #edf3ee 56%, #f6f4ed 100%);
}

.public-shell {
  position: relative;
  z-index: 2;
  width: min(1180px, calc(100vw - 40px));
  margin: 0 auto;
  padding: 22px 0 80px;
}

.public-aurora {
  position: fixed;
  z-index: 0;
  width: 32rem;
  height: 32rem;
  border-radius: 50%;
  opacity: .32;
  filter: blur(70px);
  pointer-events: none;
}

.public-aurora-one { left: -13rem; top: 20%; background: rgba(222, 177, 78, .44); }
.public-aurora-two { right: -13rem; top: -8rem; background: rgba(94, 144, 160, .42); }

.public-header {
  position: sticky;
  top: 18px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 64px;
  padding: 9px 10px 9px 13px;
  border: 1px solid rgba(255, 255, 255, .72);
  border-radius: 22px;
  background: rgba(249, 249, 245, .62);
  box-shadow: 0 16px 48px rgba(24, 54, 43, .09), inset 0 1px 0 rgba(255, 255, 255, .72);
  backdrop-filter: blur(24px) saturate(1.18);
}

.public-brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  font-weight: 720;
}

.public-brand > span:last-child {
  display: grid;
  line-height: 1.1;
}

.public-brand small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 570;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.public-nav {
  display: flex;
  align-items: center;
  gap: 3px;
}

.public-nav > a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 12px;
  padding: 9px 13px;
  color: var(--muted);
  font-size: 14px;
  transition: background .18s ease, color .18s ease, transform .18s ease;
}

.public-nav > a:hover,
.public-nav > a[aria-current='page'] {
  color: var(--ink);
  background: rgba(17, 63, 49, .07);
  transform: translateY(-1px);
}

.public-nav .public-desk-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: 5px;
  color: #fffaf0;
  background: var(--leaf);
  box-shadow: 0 10px 24px rgba(17, 63, 49, .2);
}

.public-nav .public-desk-link:hover { color: #fffaf0; background: #0c3529; }

.public-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(360px, .72fr);
  gap: clamp(40px, 6vw, 78px);
  align-items: center;
  padding: clamp(68px, 10vw, 124px) 0 70px;
}

.public-hero-copy h1,
.public-page-hero h1 {
  margin: 18px 0 22px;
  font-family: var(--display-serif);
  font-size: clamp(48px, 6.7vw, 88px);
  font-weight: 600;
  line-height: 1.03;
  letter-spacing: -.055em;
}

.public-hero-copy h1 em {
  color: var(--leaf);
  font-style: normal;
}

.public-hero-copy > p,
.public-page-hero > p {
  max-width: 650px;
  margin: 0;
  color: var(--muted);
  font-family: var(--display-serif);
  font-size: clamp(17px, 1.5vw, 20px);
  line-height: 1.9;
}

.public-live-note {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 23px;
  border: 1px solid rgba(17, 63, 49, .1);
  border-radius: 999px;
  padding: 7px 11px;
  color: var(--muted);
  background: rgba(255, 255, 255, .45);
  font-size: 12px;
  backdrop-filter: blur(14px);
}

.public-live-note i,
.public-tool-card header em i,
.desk-sidebar-foot i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5f9b76;
  box-shadow: 0 0 0 4px rgba(95, 155, 118, .13);
}

.public-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 34px;
}

.public-hero-actions .primary-link,
.public-hero-actions .ghost-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  border-radius: 14px;
  padding: 0 17px;
  font-weight: 650;
}

.public-hero-actions .ghost-link {
  border: 1px solid rgba(17, 63, 49, .11);
  background: rgba(255, 255, 255, .48);
  backdrop-filter: blur(16px);
}

.public-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin-top: 32px;
  color: var(--muted);
  font-size: 12px;
}

.public-signals span { display: inline-flex; gap: 6px; }
.public-signals b { color: var(--ink-soft); font-weight: 700; }

.public-portrait-card {
  position: relative;
  min-height: 500px;
  border: 1px solid rgba(255, 255, 255, .76);
  border-radius: 36px;
  overflow: hidden;
  background:
    linear-gradient(145deg, rgba(255,255,255,.7), rgba(255,255,255,.28)),
    radial-gradient(circle at 70% 10%, rgba(118, 159, 174, .24), transparent 42%);
  box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,.7);
  backdrop-filter: blur(28px) saturate(1.1);
}

.public-portrait-card::before {
  content: '';
  position: absolute;
  inset: 14px;
  border: 1px solid rgba(17, 63, 49, .09);
  border-radius: 27px;
  pointer-events: none;
}

.portrait-glow {
  position: absolute;
  right: -20%;
  bottom: -8%;
  width: 88%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(214, 169, 70, .34), transparent 66%);
  filter: blur(16px);
}

.portrait-label {
  position: absolute;
  z-index: 3;
  left: 34px;
  top: 34px;
  display: grid;
  gap: 7px;
  max-width: 235px;
}

.portrait-label span,
.portrait-foot span {
  color: var(--muted);
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.portrait-label strong {
  font-family: var(--display-serif);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.65;
}

.portrait-frame {
  position: absolute;
  right: 24px;
  bottom: 48px;
  z-index: 2;
  width: min(72%, 340px);
  aspect-ratio: .88;
  border-radius: 30px;
  overflow: hidden;
  background: rgba(255,255,255,.45);
  box-shadow: 0 24px 64px rgba(24,54,43,.16);
  transform: rotate(1.5deg);
}

.portrait-frame img { width: 100%; height: 100%; object-fit: cover; }

.portrait-foot {
  position: absolute;
  z-index: 3;
  left: 34px;
  right: 34px;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.portrait-foot i { flex: 1; height: 1px; background: rgba(17,63,49,.13); }

.public-entry-grid,
.public-tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.public-entry-card,
.public-tool-card {
  position: relative;
  display: grid;
  min-height: 250px;
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 28px;
  padding: 22px;
  overflow: hidden;
  background: rgba(255,255,255,.5);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.75);
  backdrop-filter: blur(22px) saturate(1.12);
  transition: transform .25s var(--ease), box-shadow .25s var(--ease), border-color .25s ease;
}

.public-entry-card::after,
.public-tool-card::after,
.desk-product-card::after {
  content: '';
  position: absolute;
  right: -42px;
  bottom: -60px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  opacity: .34;
  filter: blur(8px);
}

.tone-leaf::after { background: rgba(95, 155, 118, .36); }
.tone-blue::after { background: rgba(112, 157, 169, .38); }
.tone-honey::after { background: rgba(218, 173, 75, .4); }

.public-entry-card:hover,
.public-tool-card:hover {
  transform: translateY(-7px);
  border-color: rgba(17,63,49,.18);
  box-shadow: 0 28px 74px rgba(24,54,43,.13), inset 0 1px 0 rgba(255,255,255,.8);
}

.public-entry-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(17,63,49,.1);
  border-radius: 14px;
  color: var(--leaf);
  background: rgba(255,255,255,.58);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
}

.public-entry-card > div { align-self: end; position: relative; z-index: 2; }
.public-entry-card small { color: var(--muted); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
.public-entry-card h2,
.public-tool-card h2 { margin: 7px 0 9px; font-family: var(--display-serif); font-size: 30px; letter-spacing: -.04em; }
.public-entry-card p,
.public-tool-card p { margin: 0; color: var(--muted); line-height: 1.72; }
.public-entry-card > b,
.public-tool-card > b { position: relative; z-index: 2; align-self: end; color: var(--leaf); font-size: 12px; font-weight: 680; }

.public-now-card {
  display: grid;
  grid-template-columns: minmax(0, .9fr) minmax(0, 1fr);
  gap: 40px;
  align-items: end;
  margin-top: 18px;
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 28px;
  padding: 28px;
  background: rgba(255,255,255,.42);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.75);
  backdrop-filter: blur(20px);
}

.public-now-card h2 { margin: 8px 0 0; font-family: var(--display-serif); font-size: clamp(24px, 3vw, 38px); line-height: 1.25; }
.public-now-card p { margin: 0; color: var(--muted); line-height: 1.8; }

.public-page-hero { max-width: 860px; padding: clamp(70px, 10vw, 124px) 0 54px; }
.public-page-hero.compact { max-width: 760px; padding-bottom: 48px; }
.public-page-hero h1 { font-size: clamp(44px, 6vw, 74px); }

.about-grid { display: grid; gap: 12px; }
.about-story-card {
  display: grid;
  grid-template-columns: 80px minmax(0,1fr);
  gap: 18px;
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 24px;
  padding: 24px;
  background: rgba(255,255,255,.46);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.72);
  backdrop-filter: blur(18px);
}
.about-story-card > span { color: var(--honey); font-family: var(--display-serif); font-size: 28px; }
.about-story-card h2 { margin: 0 0 8px; font-family: var(--display-serif); font-size: 25px; }
.about-story-card p { margin: 0; color: var(--muted); line-height: 1.8; }
.about-quote-card { display:flex; align-items:center; gap:14px; margin-top:16px; border-radius:24px; padding:24px; color:#fffaf0; background:linear-gradient(135deg,#143f32,#295e49); box-shadow:0 24px 64px rgba(17,63,49,.2); }
.about-quote-card p { margin:0; font-family:var(--display-serif); font-size:20px; line-height:1.65; }

.public-tool-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.public-tool-card { min-height: 300px; }
.public-tool-card header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.public-tool-card header em { display:inline-flex; align-items:center; gap:7px; border-radius:999px; padding:6px 9px; color:var(--muted); background:rgba(255,255,255,.5); font-size:11px; font-style:normal; }
.public-tool-card > div { align-self:center; position:relative; z-index:2; }
.public-tool-card small { display:block; margin-top:16px; color:var(--quiet); line-height:1.65; }

/* Desk shell */
.desk-layout {
  position: relative;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 14px;
  width: 100%;
  height: 100dvh;
  margin: 0;
  padding: 14px;
  overflow: hidden;
  transition: grid-template-columns .28s var(--ease);
}

.desk-layout.desk-sidebar-collapsed { grid-template-columns: 78px minmax(0, 1fr); }

.desk-ambient {
  position: fixed;
  z-index: -1;
  width: 30rem;
  height: 30rem;
  border-radius: 50%;
  opacity: .22;
  filter: blur(75px);
  pointer-events: none;
}
.desk-ambient-one { left: -12rem; top: 2rem; background: rgba(216, 168, 66, .42); }
.desk-ambient-two { right: -10rem; top: -10rem; background: rgba(105, 151, 166, .4); }

.desk-sidebar {
  position: relative;
  top: auto;
  align-self: stretch;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  max-height: none;
  padding: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 25px;
  background: rgba(250,250,246,.62);
  box-shadow: 0 20px 62px rgba(24,54,43,.1), inset 0 1px 0 rgba(255,255,255,.76);
  backdrop-filter: blur(24px) saturate(1.12);
}

.desk-brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 1px 13px;
  border-bottom: 1px solid rgba(17,63,49,.08);
}

.desk-identity-card { display:grid; grid-template-columns:50px minmax(0,1fr); align-items:center; gap:10px; min-width:0; flex:1; }
.desk-identity-avatar { display:grid; place-items:center; width:50px; height:50px; flex:0 0 50px; border:1px solid rgba(17,63,49,.1); border-radius:17px; overflow:hidden; background:linear-gradient(145deg,rgba(236,241,229,.95),rgba(211,227,214,.72)); box-shadow:0 10px 24px rgba(17,63,49,.1), inset 0 1px 0 rgba(255,255,255,.8); }
.desk-identity-avatar img { width:100%; height:100%; object-fit:cover; image-rendering:auto; transform:scale(1.08); }
.desk-identity-copy { display:grid; gap:4px; min-width:0; }
.desk-identity-clock { display:flex; align-items:baseline; justify-content:space-between; gap:8px; min-width:0; }
.desk-identity-clock strong { overflow:hidden; color:var(--ink); font-family:var(--display-serif); font-size:11px; font-weight:680; text-overflow:ellipsis; white-space:nowrap; }
.desk-identity-clock time { color:var(--leaf); font-size:10px; font-variant-numeric:tabular-nums; font-weight:720; white-space:nowrap; }
.desk-identity-copy p { margin:0; overflow:hidden; color:var(--muted); font-size:10px; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }
.desk-identity-chips { display:flex; flex-wrap:wrap; gap:4px; margin-top:2px; }
.desk-identity-chips span { display:inline-flex; align-items:center; gap:3px; border:1px solid rgba(17,63,49,.07); border-radius:999px; padding:3px 6px; color:var(--quiet); background:rgba(255,255,255,.42); font-size:8px; }
.desk-identity-chips b { color:var(--leaf); font-size:9px; font-variant-numeric:tabular-nums; }
.desk-identity-card.is-collapsed { display:block; flex:0 0 auto; }
.desk-identity-card.is-collapsed .desk-identity-avatar { width:42px; height:42px; border-radius:14px; }
.desk-identity-card.is-compact { grid-template-columns:42px minmax(0,1fr); gap:9px; }
.desk-identity-card.is-compact .desk-identity-avatar { width:42px; height:42px; border-radius:14px; }

.desk-collapse-button {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  border: 1px solid rgba(17,63,49,.08);
  border-radius: 10px;
  color: var(--muted);
  background: rgba(255,255,255,.5);
  cursor: pointer;
  transition: color .18s ease, background .18s ease, transform .18s ease;
}
.desk-collapse-button:hover { color:var(--leaf); background:rgba(255,255,255,.82); transform:translateY(-1px); }

.desk-nav {
  align-content: start;
  gap: 17px;
  margin-top: 14px;
  padding-right: 2px;
  overflow: auto;
}

.desk-nav-group { gap: 4px; }
.desk-nav-group p { padding:0 10px; color:var(--quiet); font-size:9px; font-weight:680; letter-spacing:.13em; text-transform:uppercase; }

.desk-nav a {
  position: relative;
  display: grid;
  grid-template-columns: 20px minmax(0,1fr) 5px;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 9px 10px;
  border-radius: 13px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 570;
  transition: transform .2s var(--ease), background .2s ease, color .2s ease, box-shadow .2s ease;
}

.desk-nav a svg { opacity:.78; transition:opacity .18s ease, transform .18s ease; }
.desk-nav a i { width:5px; height:5px; border-radius:50%; background:transparent; }
.desk-nav a:hover { transform:translateX(2px); color:var(--ink); background:rgba(255,255,255,.55); }
.desk-nav a:hover svg { opacity:1; transform:scale(1.04); }
.desk-nav a[aria-current='page'] {
  color: var(--leaf);
  background: linear-gradient(110deg, rgba(220,233,223,.84), rgba(255,255,255,.55));
  box-shadow: inset 0 0 0 1px rgba(17,63,49,.08), 0 8px 20px rgba(17,63,49,.06);
}
.desk-nav a[aria-current='page'] i { background:var(--leaf-bright); box-shadow:0 0 0 3px rgba(47,116,88,.1); }

.desk-sidebar-foot {
  display: grid;
  gap: 7px;
  margin-top: 10px;
  border: 1px solid rgba(17,63,49,.08);
  border-radius: 15px;
  padding: 11px;
  background: rgba(255,255,255,.38);
}
.desk-sidebar-foot > span { display:flex; align-items:center; gap:9px; color:var(--ink-soft); font-size:11px; font-weight:650; }
.desk-sidebar-foot small { color:var(--muted); font-family:var(--display-serif); font-size:11px; line-height:1.55; }

.desk-sidebar-collapsed .desk-identity-copy,
.desk-sidebar-collapsed .desk-nav a span,
.desk-sidebar-collapsed .desk-nav a i,
.desk-sidebar-collapsed .desk-nav-group p,
.desk-sidebar-collapsed .desk-sidebar-foot { display:none; }
.desk-sidebar-collapsed .desk-brand-row { justify-content:center; flex-wrap:wrap; }
.desk-sidebar-collapsed .desk-nav { gap:10px; }
.desk-sidebar-collapsed .desk-nav-group { gap:6px; }
.desk-sidebar-collapsed .desk-nav a { display:grid; grid-template-columns:1fr; place-items:center; padding:9px; }
.desk-sidebar-collapsed .desk-nav a[aria-current='page']::after { content:''; position:absolute; right:-7px; width:3px; height:18px; border-radius:999px; background:var(--leaf); }

.desk-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  align-content: stretch;
  min-width: 0;
  height: calc(100dvh - 28px);
  gap: 10px;
  overflow: hidden;
}

.desk-topbar {
  position: relative;
  top: auto;
  z-index: 10;
  min-height: 58px;
  margin: 0;
  padding: 8px 9px 8px 12px;
  border: 1px solid rgba(255,255,255,.74);
  border-radius: 19px;
  background: rgba(250,250,246,.62);
  box-shadow: 0 14px 42px rgba(24,54,43,.08), inset 0 1px 0 rgba(255,255,255,.75);
  backdrop-filter: blur(23px) saturate(1.12);
}

.desk-route { display:flex; align-items:center; gap:10px; min-width:0; }
.desk-route-icon { display:grid; place-items:center; width:34px; height:34px; flex:0 0 34px; border:1px solid rgba(17,63,49,.09); border-radius:11px; color:var(--leaf); background:rgba(255,255,255,.5); }
.desk-route > div { display:grid; gap:1px; min-width:0; }
.desk-route .eyebrow { overflow:hidden; color:var(--muted); font-size:8px; font-weight:680; letter-spacing:.16em; text-overflow:ellipsis; white-space:nowrap; }
.desk-route strong { font-size:14px; font-weight:720; }

.desk-top-actions { display:flex; align-items:center; gap:5px; }
.desk-top-action { display:inline-flex; align-items:center; gap:7px; min-height:36px; border-radius:11px; padding:0 11px; color:var(--muted); font-size:12px; font-weight:620; transition:background .18s ease, color .18s ease, transform .18s ease; }
.desk-top-action:hover { color:var(--ink); background:rgba(17,63,49,.06); transform:translateY(-1px); }
.desk-top-action.is-primary { color:#fffaf0; background:var(--leaf); box-shadow:0 8px 20px rgba(17,63,49,.18); }
.desk-top-action.is-primary:hover { color:#fffaf0; background:#0c3529; }

.desk-mobile-nav { display:none; }

.desk-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
  padding: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 24px;
  background: rgba(250,250,246,.46);
  box-shadow: 0 20px 60px rgba(24,54,43,.09), inset 0 1px 0 rgba(255,255,255,.72);
  backdrop-filter: blur(20px) saturate(1.06);
}

.desk-page-content { width:100%; height:100%; min-height:0; overflow:auto; }
.desk-page-courses .desk-page-content,
.desk-page-reading .desk-page-content,
.desk-page-inbox .desk-page-content { overflow:hidden; }

/* Product overview screens */
.desk-product-panel { display:grid; grid-template-rows:auto 1fr; gap:12px; min-height:100%; }
.desk-product-hero {
  position:relative;
  display:grid;
  grid-template-columns:auto minmax(0,1fr) minmax(260px,.62fr);
  align-items:center;
  gap:18px;
  min-height:220px;
  border:1px solid rgba(255,255,255,.72);
  border-radius:24px;
  padding:24px;
  overflow:hidden;
  background:
    radial-gradient(circle at 86% 12%, rgba(113,156,169,.18), transparent 32%),
    linear-gradient(135deg, rgba(255,255,255,.64), rgba(255,255,255,.36));
  box-shadow:var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.72);
}
.desk-product-orb { display:grid; place-items:center; width:72px; height:72px; border:1px solid rgba(17,63,49,.1); border-radius:22px; color:var(--leaf); background:rgba(255,255,255,.55); box-shadow:0 18px 42px rgba(17,63,49,.09); }
.desk-product-copy > span { color:var(--muted); font-size:9px; font-weight:700; letter-spacing:.15em; text-transform:uppercase; }
.desk-product-copy h2 { margin:7px 0 8px; font-family:var(--display-serif); font-size:clamp(29px,3.4vw,46px); font-weight:600; letter-spacing:-.04em; }
.desk-product-copy p { max-width:700px; margin:0; color:var(--muted); line-height:1.75; }
.desk-product-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:17px; }
.desk-product-stats { display:grid; gap:8px; margin:0; }
.desk-product-stats div { border:1px solid rgba(17,63,49,.08); border-radius:15px; padding:11px 12px; background:rgba(255,255,255,.45); }
.desk-product-stats dt { color:var(--muted); font-size:10px; }
.desk-product-stats dd { margin:4px 0 0; color:var(--leaf); font-family:var(--display-serif); font-size:16px; font-weight:600; }
.desk-product-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; min-height:0; }
.desk-product-card { position:relative; display:grid; align-content:space-between; gap:18px; min-height:210px; border:1px solid rgba(255,255,255,.7); border-radius:22px; padding:20px; overflow:hidden; background:rgba(255,255,255,.48); box-shadow:var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.7); }
.desk-product-card-icon { position:relative; z-index:2; display:grid; place-items:center; width:40px; height:40px; border-radius:13px; color:var(--leaf); background:rgba(255,255,255,.58); }
.desk-product-card > div { position:relative; z-index:2; }
.desk-product-card h3 { margin:0 0 8px; font-family:var(--display-serif); font-size:23px; }
.desk-product-card p { margin:0; color:var(--muted); line-height:1.68; }
.desk-product-card small { position:relative; z-index:2; color:var(--quiet); }

/* Shared controls */
.soft-button,
.course-back-button,
.course-row-actions button {
  min-height: 36px;
  border: 1px solid rgba(17,63,49,.1);
  border-radius: 11px;
  padding: 0 12px;
  color: var(--ink-soft);
  background: rgba(255,255,255,.55);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
  font-size: 12px;
  font-weight: 650;
  transition: transform .18s ease, background .18s ease, box-shadow .18s ease, opacity .18s ease;
}
.soft-button:hover:not(:disabled),
.course-back-button:hover:not(:disabled),
.course-row-actions button:hover:not(:disabled) { transform:translateY(-1px); background:rgba(255,255,255,.88); box-shadow:0 9px 22px rgba(17,63,49,.09); }
.soft-button.primary { border-color:transparent; color:#fffaf0; background:var(--leaf); box-shadow:0 9px 22px rgba(17,63,49,.18); }
.soft-button.danger { color:#8b493d; background:rgba(240,214,204,.5); }

/* Today */
.today-board { align-content:start; gap:11px; height:100%; padding-right:2px; overflow:auto; }
.command-bar { grid-template-columns:minmax(0,1fr) 94px; border-radius:17px; background:rgba(255,255,255,.58); box-shadow:var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.7); backdrop-filter:blur(18px); }
.command-bar textarea { min-height:54px; max-height:96px; padding:12px 14px; font-size:13px; }
.command-bar button { min-height:54px; font-size:13px; font-weight:700; }
.view-tabs { gap:5px; }
.view-tabs button { min-height:34px; padding:0 12px; border:1px solid transparent; border-radius:11px; color:var(--muted); background:transparent; font-size:12px; font-weight:620; }
.view-tabs button:hover { transform:none; border-color:rgba(17,63,49,.08); background:rgba(255,255,255,.5); box-shadow:none; }
.view-tabs button[aria-pressed='true'] { color:var(--leaf); border-color:rgba(17,63,49,.1); background:rgba(220,233,223,.72); box-shadow:inset 0 1px 0 rgba(255,255,255,.6); }
.focus-strip { gap:10px; }
.today-card { border-radius:17px; padding:12px; background:rgba(255,255,255,.5); box-shadow:0 9px 26px rgba(24,54,43,.06), inset 0 1px 0 rgba(255,255,255,.68); transition:transform .2s var(--ease), border-color .2s ease, background .2s ease; }
.today-card:hover { transform:translateY(-2px); border-color:rgba(17,63,49,.16); background:rgba(255,255,255,.7); }
.focus-card { min-height:112px; padding:14px; border-radius:20px; background:linear-gradient(140deg,rgba(220,233,223,.76),rgba(255,255,255,.5)); }
.focus-card::before { border-radius:19px; }
.today-card h3, .card-title-button { font-family:var(--display-serif); font-weight:600; }
.today-card-head { gap:8px; }
.card-actions { opacity:.25; transition:opacity .18s ease; }
.today-card:hover .card-actions, .today-card:focus-within .card-actions { opacity:1; }
.today-lanes { gap:10px; }
.today-stack { gap:10px; }
.today-lane { gap:7px; }
.today-lane-title { position:sticky; top:0; z-index:2; padding:5px 2px; background:linear-gradient(to bottom,rgba(246,247,242,.96),rgba(246,247,242,.72),transparent); backdrop-filter:blur(8px); }
.today-lane-title span { color:var(--ink-soft); font-size:12px; font-weight:700; }
.today-lane-title small { color:var(--muted); }
.history-section { border-radius:16px; background:rgba(255,255,255,.32); }

/* Reading */
.reading-box { display:grid; grid-template-rows:minmax(0,1fr) auto; gap:10px; height:100%; min-height:0; }
.reading-workspace { grid-template-columns:minmax(230px,.68fr) minmax(0,1.62fr); gap:10px; min-height:0; height:100%; }
.reading-list { max-height:none; min-height:0; padding:4px 3px 4px 0; }
.reading-list button { gap:5px; border-radius:16px; padding:11px; background:rgba(255,255,255,.42); box-shadow:inset 0 1px 0 rgba(255,255,255,.58); }
.reading-list button:hover,
.reading-list button[aria-pressed='true'] { transform:translateX(2px); background:rgba(255,255,255,.76); box-shadow:0 9px 24px rgba(24,54,43,.07); }
.reading-panel { min-height:0; height:100%; padding:18px; overflow:auto; border-radius:22px; background:linear-gradient(145deg,rgba(255,255,255,.65),rgba(226,237,240,.38)); box-shadow:var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.72); }
.reading-panel h2 { font-family:var(--display-serif); font-size:clamp(25px,3vw,39px); font-weight:600; }
.reading-note textarea { min-height:180px; border-radius:14px; background:rgba(255,255,255,.58); }
.reading-schedule-box { grid-template-columns:minmax(0,1fr) 120px 120px auto; margin-top:13px; border-radius:16px; padding:11px; background:rgba(220,233,223,.42); }
.reading-history { margin:0; }

/* Notes */
.notes-desk { grid-template-columns:minmax(220px,.66fr) minmax(0,1.68fr); gap:10px; align-items:stretch; height:100%; min-height:0; }
.notes-list, .notes-editor { height:100%; min-height:0; border-radius:20px; background:rgba(255,255,255,.48); box-shadow:var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.68); }
.notes-list { max-height:none; padding:11px; }
.notes-list-head { position:sticky; top:0; z-index:3; padding:2px 1px 8px; background:linear-gradient(to bottom,rgba(249,249,245,.94),rgba(249,249,245,.75),transparent); backdrop-filter:blur(9px); }
.notes-list-head h2 { font-family:var(--display-serif); font-size:21px; font-weight:600; }
.notes-list > button { gap:4px; border-radius:14px; padding:10px; background:rgba(255,255,255,.38); }
.notes-list > button[aria-pressed='true'] { background:rgba(220,233,223,.68); box-shadow:inset 0 0 0 1px rgba(17,63,49,.08); }
.notes-editor { display:grid; grid-template-rows:auto minmax(0,1fr) auto; gap:8px; padding:14px; overflow:hidden; background:linear-gradient(145deg,rgba(255,255,255,.63),rgba(226,237,240,.32)); }
.notes-title-input { font-family:var(--display-serif); font-size:clamp(26px,3vw,40px); font-weight:600; }
.notes-body-input { min-height:0; height:100%; resize:none; border-radius:15px; line-height:1.8; background:rgba(255,255,255,.5); }
.notes-actions { min-height:38px; }

/* Course workspace */
.course-workspace { height:100%; min-height:0; overflow:hidden; }
.course-workspace.compact { display:grid; grid-template-rows:auto minmax(0,1fr); gap:9px; }
.course-page-switcher { width:fit-content; gap:3px; border:1px solid rgba(17,63,49,.09); border-radius:12px; padding:3px; background:rgba(255,255,255,.42); }
.course-page-switcher button { min-height:31px; border-radius:9px; padding:0 12px; font-size:12px; }
.course-library-panel,
.course-import-shell { height:100%; min-height:0; overflow:auto; border-radius:20px; padding:16px; background:rgba(255,255,255,.48); box-shadow:var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.68); }
.course-import-header { grid-template-columns:minmax(0,1fr) auto; align-items:center; }
.course-import-header h2 { font-family:var(--display-serif); font-weight:600; }
.course-import-steps { position:sticky; top:0; z-index:5; width:fit-content; border-radius:12px; padding:3px; background:rgba(247,248,244,.86); backdrop-filter:blur(14px); }
.course-import-steps button { min-height:32px; border-radius:9px; font-size:12px; }

.course-detail-shell {
  grid-column:auto;
  display:grid;
  grid-template-rows:auto auto minmax(0,1fr);
  gap:8px;
  height:100%;
  min-height:0;
  padding:10px;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.7);
  border-radius:21px;
  background:rgba(255,255,255,.42);
  box-shadow:var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.72);
}

.course-detail-topbar {
  grid-template-columns:auto minmax(0,1fr) minmax(126px,.34fr) auto auto;
  gap:9px;
  min-height:58px;
  padding:8px 9px;
  border:1px solid rgba(17,63,49,.07);
  border-radius:15px;
  background:linear-gradient(120deg,rgba(220,233,223,.54),rgba(255,255,255,.45));
}
.course-detail-topbar h2 { margin:1px 0; font-family:var(--display-serif); font-size:19px; font-weight:600; }
.course-detail-topbar p { font-size:11px; }
.course-detail-topbar > div > span { font-size:9px; letter-spacing:.09em; text-transform:uppercase; }
.course-progress-box { display:grid; grid-template-columns:auto 1fr; align-items:center; gap:8px; min-width:0; }
.course-progress-box strong { font-size:17px; }
.course-progress-box span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.course-service-lights { gap:8px; }
.course-service-lights > span { font-size:10px; }
.course-detail-topbar .course-row-actions { display:flex; flex-wrap:nowrap; gap:4px; }

.course-stepper { gap:4px; margin:0; }
.course-stepper > * { min-height:28px; border-radius:9px; padding:5px 7px; font-size:9px; }

.course-workbench-grid { grid-template-columns:168px minmax(0,1fr); gap:8px; align-items:stretch; min-height:0; height:100%; overflow:hidden; }
.course-lesson-rail { position:relative; top:auto; max-height:none; height:100%; min-height:0; gap:5px; overflow:auto; border:1px solid rgba(17,63,49,.08); border-radius:15px; padding:8px; background:rgba(255,255,255,.34); }
.course-lesson-rail h3 { position:sticky; top:0; z-index:2; margin:0; padding:4px 3px 6px; background:rgba(247,248,244,.9); backdrop-filter:blur(8px); }
.course-lesson-rail button { gap:2px; border-radius:11px; padding:8px; font-size:11px; background:rgba(255,255,255,.38); }
.course-lesson-rail button.active { border-color:rgba(17,63,49,.18); background:rgba(220,233,223,.72); box-shadow:inset 3px 0 0 var(--leaf-bright); }
.course-lesson-rail span { font-size:9px; }

.course-stage-stack { display:grid; grid-template-rows:minmax(0,1fr) auto auto; gap:6px; min-height:0; height:100%; overflow:hidden; }
.course-stage-card { height:100%; min-height:0; max-height:none; overflow:auto; border-radius:16px; padding:11px; background:rgba(255,255,255,.48); box-shadow:inset 0 1px 0 rgba(255,255,255,.66); }
.course-stage-heading { gap:8px; margin-bottom:9px; }
.course-stage-heading h3 { margin:2px 0 0; font-family:var(--display-serif); font-size:18px; font-weight:600; }
.course-stage-heading span, .course-stage-heading p { font-size:10px; }
.course-stage-heading.compact { display:flex; }
.course-loading-line { min-height:38px; border-radius:12px; padding:9px 11px; }

.course-node-workbench { display:grid; grid-template-rows:auto minmax(0,1fr); overflow:hidden; }
.course-node-layout { grid-template-columns:205px minmax(0,1fr); gap:8px; height:100%; min-height:0; max-height:none; overflow:hidden; }
.course-node-nav { gap:5px; max-height:none; min-height:0; padding-right:2px; overflow:auto; }
.course-node-nav button { grid-template-columns:24px minmax(0,1fr); gap:7px; min-height:54px; border-radius:11px; padding:8px; background:rgba(220,233,223,.3); }
.course-node-nav button.active { background:rgba(220,233,223,.76); box-shadow:inset 3px 0 0 var(--leaf-bright); }
.course-node-nav i { width:22px; height:22px; font-size:10px; }
.course-node-nav b { display:-webkit-box; overflow:hidden; font-family:var(--display-serif); font-size:12px; line-height:1.4; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.course-node-nav small { margin-top:2px; font-size:9px; }

.course-node-editor { display:grid; grid-template-rows:auto auto minmax(0,1fr); gap:7px; min-height:0; overflow:hidden; border:1px solid rgba(17,63,49,.08); border-radius:14px; padding:10px; background:rgba(255,255,255,.4); }
.course-node-editor-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.course-node-editor h4 { margin:2px 0 0; font-family:var(--display-serif); font-size:18px; font-weight:600; }
.course-node-editor-head span, .course-node-editor-head > strong { font-size:10px; }
.course-editor-tabs { display:flex; gap:3px; width:fit-content; border:1px solid rgba(17,63,49,.08); border-radius:10px; padding:3px; background:rgba(255,255,255,.42); }
.course-editor-tabs button { min-height:28px; border:0; border-radius:7px; padding:0 10px; color:var(--muted); background:transparent; font-size:10px; font-weight:650; cursor:pointer; }
.course-editor-tabs button[aria-pressed='true'] { color:var(--leaf); background:rgba(220,233,223,.78); box-shadow:inset 0 0 0 1px rgba(17,63,49,.06); }
.course-editor-pane { min-height:0; overflow:hidden; }
.course-draft-pane { display:grid; grid-template-rows:minmax(0,1fr) auto; gap:7px; height:100%; min-height:0; }
.course-draft-pane > label { display:grid; grid-template-rows:auto minmax(0,1fr); gap:5px; min-height:0; color:var(--muted); font-size:10px; }
.course-draft-pane textarea { width:100%; height:100%; min-height:0; resize:none; border:1px solid rgba(17,63,49,.1); border-radius:11px; padding:12px; color:var(--ink); background:rgba(255,255,255,.62); line-height:1.8; outline:none; }
.course-draft-pane textarea:focus { border-color:rgba(17,63,49,.25); box-shadow:0 0 0 3px rgba(17,63,49,.05); }
.course-editor-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:38px; }
.course-editor-footer > span { color:var(--muted); font-size:9px; }
.course-editor-footer .course-primary-row { margin:0; }
.course-review-pane, .course-source-pane, .course-version-pane { height:100%; min-height:0; overflow:auto; padding-right:2px; }
.course-review-report { border-radius:13px; padding:11px; }
.course-review-scores { gap:5px; }
.course-review-scores div { border-radius:9px; padding:8px; }
.course-feedback-box { border-radius:13px; padding:11px; }
.course-feedback-box textarea { min-height:100px; }
.course-source-pane { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.course-source-pane section { display:grid; grid-template-rows:auto minmax(0,1fr); min-height:0; border:1px solid rgba(17,63,49,.08); border-radius:12px; padding:9px; background:rgba(255,255,255,.45); }
.course-source-pane header { display:flex; justify-content:space-between; gap:8px; padding-bottom:7px; }
.course-source-pane header span { color:var(--muted); font-size:9px; }
.course-source-pane pre { margin:0; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; color:var(--ink-soft); font-family:var(--display-serif); font-size:12px; line-height:1.7; }
.course-version-pane { display:grid; align-content:start; gap:7px; }
.course-version-pane article { border:1px solid rgba(17,63,49,.08); border-radius:12px; padding:10px; background:rgba(255,255,255,.45); }
.course-version-pane article > div { display:flex; justify-content:space-between; gap:10px; }
.course-version-pane article span { color:var(--muted); font-size:9px; }
.course-version-pane article p { display:-webkit-box; margin:7px 0 0; overflow:hidden; color:var(--muted); font-size:11px; line-height:1.6; -webkit-box-orient:vertical; -webkit-line-clamp:3; }

.course-outline-list { max-height:none; min-height:0; overflow:auto; }
.course-outline-item { border-radius:13px; padding:9px; }
.course-outline-fields textarea { min-height:62px; }
.course-final-note { height:calc(100% - 86px); min-height:260px; resize:none; }
.course-diagnostics { flex:0 0 auto; max-height:120px; overflow:auto; border-radius:11px; }
.status-line { flex:0 0 auto; margin:0; border-radius:10px; padding:8px 10px; background:rgba(255,255,255,.42); font-size:10px; }
.status-line.error { border:1px solid rgba(166,93,77,.18); background:rgba(245,226,220,.58); }

.course-global-task { right:18px; bottom:18px; border-radius:15px; padding:4px; background:rgba(249,250,246,.78); box-shadow:0 18px 50px rgba(24,54,43,.14), inset 0 1px 0 rgba(255,255,255,.72); }
.course-global-task > button:first-child { min-height:38px; }

/* Existing content page visual alignment */
.content-page, .tools-page {
  color:var(--ink) !important;
  background:
    radial-gradient(circle at 12% 0%,rgba(219,174,75,.16),transparent 28rem),
    radial-gradient(circle at 88% 2%,rgba(118,159,174,.17),transparent 32rem),
    linear-gradient(145deg,#fbf9f2,#edf3ee 56%,#f6f4ed) !important;
  font-family:var(--ui-sans) !important;
}
.content-page .top-nav, .tools-page .top-nav { border:1px solid rgba(255,255,255,.72); border-radius:20px; padding:9px 12px; height:auto; min-height:62px; background:rgba(249,249,245,.58); box-shadow:var(--shadow-sm); backdrop-filter:blur(22px); }
.content-page .workspace, .content-page .side-panel, .content-page .content-list, .content-page .content-card { border-color:rgba(17,63,49,.1) !important; border-radius:20px !important; background:rgba(255,255,255,.48) !important; box-shadow:var(--shadow-sm) !important; }

@media (max-width: 1100px) {
  .desk-layout { grid-template-columns:210px minmax(0,1fr); }
  .desk-layout.desk-sidebar-collapsed { grid-template-columns:72px minmax(0,1fr); }
  .course-detail-topbar { grid-template-columns:auto minmax(0,1fr) auto; }
  .course-progress-box, .course-detail-topbar > .course-row-actions { grid-column:auto; }
  .course-service-lights { display:none; }
  .course-source-pane { grid-template-columns:1fr; }
  .public-hero { grid-template-columns:minmax(0,1fr) minmax(320px,.7fr); }
}

@media (max-width: 900px) {
  body { overflow:auto; }
  .desk-layout, .desk-layout.desk-sidebar-collapsed { display:block; width:100%; height:auto; min-height:100dvh; padding:8px; overflow:visible; }
  .desk-sidebar { display:none; }
  .desk-main { height:auto; min-height:calc(100dvh - 16px); overflow:visible; }
  .desk-topbar { position:sticky; top:8px; }
  .desk-top-actions .desk-top-action:not(.is-primary) { display:none; }
  .desk-mobile-nav { display:block; border:1px solid rgba(255,255,255,.72); border-radius:16px; background:rgba(250,250,246,.7); box-shadow:var(--shadow-sm); backdrop-filter:blur(18px); }
  .desk-mobile-nav summary { display:flex; align-items:center; gap:8px; padding:10px 12px; list-style:none; color:var(--leaf); }
  .desk-mobile-nav summary b { margin-left:auto; color:var(--muted); font-size:10px; }
  .desk-mobile-nav nav { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; padding:0 8px 8px; }
  .desk-mobile-nav a { display:flex; align-items:center; justify-content:center; gap:6px; min-height:38px; border-radius:10px; padding:6px; font-size:11px; background:rgba(255,255,255,.46); }
  .desk-page { min-height:calc(100dvh - 138px); height:auto; padding:8px; }
  .desk-page-content, .desk-page-courses .desk-page-content, .desk-page-reading .desk-page-content, .desk-page-inbox .desk-page-content { min-height:calc(100dvh - 156px); height:auto; overflow:visible; }
  .public-hero { grid-template-columns:1fr; padding-top:72px; }
  .public-portrait-card { min-height:440px; }
  .public-entry-grid, .public-tool-grid, .desk-product-grid { grid-template-columns:1fr; }
  .public-entry-card { min-height:190px; }
  .public-now-card, .desk-product-hero { grid-template-columns:1fr; }
  .desk-product-orb { width:58px; height:58px; }
  .reading-box, .notes-desk, .course-workspace, .course-detail-shell, .course-workbench-grid, .course-node-layout { height:auto; min-height:0; overflow:visible; }
  .course-detail-shell { display:block; }
  .course-detail-topbar { grid-template-columns:1fr; }
  .course-detail-topbar > * { grid-column:auto !important; }
  .course-workbench-grid { grid-template-columns:1fr; margin-top:8px; }
  .course-lesson-rail { grid-template-columns:repeat(2,minmax(0,1fr)); max-height:220px; height:auto; }
  .course-lesson-rail h3 { grid-column:1/-1; }
  .course-stage-stack, .course-stage-card { height:auto; overflow:visible; }
  .course-node-layout { grid-template-columns:1fr; }
  .course-node-nav { display:flex; max-height:none; overflow:auto; }
  .course-node-nav button { flex:0 0 min(220px,72vw); }
  .course-node-editor { min-height:560px; }
  .reading-workspace, .notes-desk { grid-template-columns:1fr; }
  .reading-list, .notes-list { max-height:360px; }
  .reading-panel, .notes-editor { min-height:540px; }
}

@media (max-width: 680px) {
  .public-shell { width:min(100% - 18px, 680px); padding-top:9px; }
  .public-header { top:9px; min-height:56px; border-radius:17px; }
  .public-nav > a:not(.public-desk-link):not(.public-search-link) { display:none; }
  .public-nav .public-search-link { width:38px; height:38px; justify-content:center; padding:0; font-size:0; }
  .public-brand small { display:none; }
  .public-hero-copy h1, .public-page-hero h1 { font-size:clamp(42px,13vw,62px); }
  .public-portrait-card { min-height:390px; }
  .portrait-label { left:25px; top:25px; }
  .portrait-frame { right:18px; width:72%; }
  .public-entry-grid { gap:10px; }
  .about-story-card { grid-template-columns:44px minmax(0,1fr); padding:18px; }
  .desk-top-action span { display:none; }
  .desk-mobile-nav nav { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .command-bar { grid-template-columns:minmax(0,1fr) 72px; }
  .focus-strip { grid-template-columns:1fr; }
  .course-editor-footer { align-items:flex-start; flex-direction:column; }
  .course-source-pane { grid-template-columns:1fr; }
  .reading-schedule-box { grid-template-columns:1fr 1fr; }
  .reading-schedule-box > div { grid-column:1/-1; }
  .desk-product-stats { grid-template-columns:1fr 1fr; }
}


/* Course pipeline + mobile navigation refinement */
.desk-mobile-menu-button,
.desk-mobile-drawer-shell { display:none; }

.course-detail-topbar {
  grid-template-columns:auto minmax(0,1fr) auto auto;
  gap:10px;
}
.course-detail-topbar h2 { font-size:21px; }
.course-detail-topbar p { font-size:12px; }
.course-detail-topbar > div > span { font-size:10px; }
.course-attention-pill {
  display:flex;
  align-items:center;
  gap:7px;
  min-height:34px;
  border:1px solid rgba(178,125,53,.18);
  border-radius:11px;
  padding:5px 9px;
  color:#765322;
  background:rgba(244,230,193,.58);
}
.course-attention-pill strong { font-size:16px; }
.course-attention-pill span { font-size:11px; white-space:nowrap; }
.course-stepper > * { min-height:31px; padding:6px 8px; font-size:11px; }
.course-lesson-rail { width:auto; }
.course-lesson-rail button { padding:9px; font-size:12px; }
.course-lesson-rail span { font-size:11px; }
.course-stage-heading span,
.course-stage-heading p { font-size:11px; }
.course-stage-heading h3 { font-size:20px; }
.course-stage-card { padding:13px; }

.course-node-workbench { grid-template-rows:auto auto minmax(0,1fr); gap:8px; }
.course-node-filters {
  display:flex;
  align-items:center;
  gap:5px;
  min-width:0;
  overflow:auto hidden;
  scrollbar-width:none;
}
.course-node-filters::-webkit-scrollbar { display:none; }
.course-node-filters button {
  display:flex;
  align-items:center;
  gap:7px;
  flex:0 0 auto;
  min-height:31px;
  border:1px solid rgba(17,63,49,.08);
  border-radius:10px;
  padding:0 10px;
  color:var(--muted);
  background:rgba(255,255,255,.38);
  font-size:11px;
  cursor:pointer;
}
.course-node-filters button.active { color:var(--leaf); background:rgba(220,233,223,.76); }
.course-node-filters button:disabled { opacity:.46; cursor:default; }
.course-node-filters b { min-width:18px; border-radius:999px; padding:2px 5px; background:rgba(17,63,49,.07); font-size:10px; text-align:center; }
.course-node-layout { grid-template-columns:245px minmax(0,1fr); gap:10px; }
.course-node-nav { gap:6px; }
.course-node-nav button { grid-template-columns:26px minmax(0,1fr); gap:8px; min-height:64px; padding:10px; }
.course-node-nav i { width:24px; height:24px; font-size:11px; }
.course-node-nav b { font-size:13px; line-height:1.45; -webkit-line-clamp:2; }
.course-node-nav small { margin-top:4px; font-size:11px; font-weight:650; }
.course-node-nav button.status-active small,
.course-node-editor-head > strong.status-active { color:#256b5a; }
.course-node-nav button.status-attention small,
.course-node-editor-head > strong.status-attention { color:#8b5e1c; }
.course-node-nav button.status-approved small,
.course-node-editor-head > strong.status-approved { color:#47705f; }
.course-node-nav button.status-attention { background:rgba(244,230,193,.42); }
.course-node-editor { gap:9px; padding:12px; }
.course-node-editor h4 { font-size:20px; }
.course-node-editor-head span,
.course-node-editor-head > strong { font-size:11px; }
.course-node-editor-head > strong { flex:0 0 auto; border-radius:999px; padding:5px 9px; background:rgba(220,233,223,.48); }
.course-editor-tabs button { min-height:31px; padding:0 12px; font-size:12px; }
.course-draft-pane > label { font-size:12px; }
.course-draft-pane textarea { font-size:14px; }
.course-editor-footer > span { font-size:11px; }

.course-review-pane {
  display:grid;
  grid-template-rows:minmax(0,1fr) auto;
  height:100%;
  min-height:0;
  overflow:hidden;
  padding:0;
}
.course-review-scroll { min-height:0; overflow:auto; padding:1px 4px 10px 1px; }
.course-review-actions {
  display:grid;
  gap:9px;
  border-top:1px solid rgba(17,63,49,.08);
  padding:10px 2px 1px;
  background:linear-gradient(to bottom,rgba(249,250,246,.84),rgba(249,250,246,.98));
}
.course-review-actions label { display:grid; gap:5px; color:var(--muted); font-size:12px; }
.course-review-actions textarea { width:100%; min-height:132px; max-height:220px; resize:vertical; border:1px solid rgba(17,63,49,.1); border-radius:11px; padding:10px; background:rgba(255,255,255,.65); }
.course-optional-revision { border:1px solid rgba(17,63,49,.08); border-radius:10px; padding:8px 10px; background:rgba(255,255,255,.4); }
.course-optional-revision summary { color:var(--leaf); font-size:12px; cursor:pointer; }
.course-optional-revision[open] summary { margin-bottom:9px; }
.course-optional-revision .course-primary-row { margin:8px 0 0; justify-content:flex-end; }
.course-review-report { padding:13px; }
.course-review-report > header { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:start; gap:14px; }
.course-review-report > header > div { display:grid; gap:2px; }
.course-review-report > header p { margin:0; line-height:1.65; }
.course-review-scores div { padding:9px; }
.course-review-scores span { font-size:11px; }
.course-review-scores b { font-size:16px; }
.course-review-issues { margin-top:10px; border-radius:11px; padding:10px; background:rgba(255,255,255,.44); }
.course-review-issues h5 { margin:0 0 7px; font-size:12px; }
.course-review-issues ul { display:grid; gap:7px; margin:0; padding-left:18px; }
.course-review-issues li { line-height:1.55; }
.course-review-issues li small { display:block; margin-top:2px; color:var(--muted); }
.course-review-issues.is-blocking { border:1px solid rgba(166,93,77,.18); background:rgba(245,226,220,.46); }
.course-review-issues.is-important { border:1px solid rgba(178,125,53,.14); background:rgba(244,230,193,.35); }
.course-review-issues.is-suggestion { border:1px solid rgba(17,63,49,.08); }
.course-review-clear,
.course-auto-action { border-radius:10px; padding:10px 11px; background:rgba(220,233,223,.42); color:var(--ink-soft); font-size:12px; line-height:1.6; }
.course-node-error { border:1px solid rgba(166,93,77,.18); border-radius:11px; padding:11px; background:rgba(245,226,220,.52); }
.course-node-error p { margin:5px 0 0; }
.course-version-pane article span { font-size:11px; }
.course-version-pane article p { font-size:12px; }
.course-version-pane details { margin-top:8px; }
.course-version-pane summary { color:var(--leaf); font-size:11px; cursor:pointer; }
.course-version-pane pre { max-height:320px; overflow:auto; white-space:pre-wrap; font-family:var(--display-serif); font-size:12px; line-height:1.7; }
.course-source-pane header span { font-size:11px; }
.course-source-pane pre { font-size:13px; }

@media (max-width: 1100px) {
  .course-node-layout { grid-template-columns:220px minmax(0,1fr); }
  .course-detail-topbar { grid-template-columns:auto minmax(0,1fr) auto auto; }
  .course-detail-topbar > .course-row-actions { grid-column:2/-1; justify-content:flex-end; }
}

@media (max-width: 900px) {
  .desk-topbar { z-index:35; }
  .desk-mobile-menu-button {
    display:grid;
    place-items:center;
    flex:0 0 auto;
    width:36px;
    height:36px;
    border:1px solid rgba(17,63,49,.09);
    border-radius:11px;
    color:var(--leaf);
    background:rgba(255,255,255,.58);
  }
  .desk-route-icon { display:none; }
  .desk-mobile-nav { display:none !important; }
  .desk-mobile-drawer-shell { display:block; position:fixed; inset:0; z-index:120; pointer-events:none; visibility:hidden; }
  .desk-mobile-drawer-shell.is-open { pointer-events:auto; visibility:visible; }
  .desk-mobile-drawer-backdrop { position:absolute; inset:0; border:0; background:rgba(12,31,25,.28); opacity:0; transition:opacity .2s ease; }
  .desk-mobile-drawer-shell.is-open .desk-mobile-drawer-backdrop { opacity:1; }
  .desk-mobile-drawer {
    position:absolute;
    inset:8px auto 8px 8px;
    display:grid;
    grid-template-rows:auto minmax(0,1fr) auto;
    width:min(318px,calc(100vw - 34px));
    border:1px solid rgba(255,255,255,.78);
    border-radius:22px;
    padding:12px;
    overflow:hidden;
    background:rgba(248,249,245,.94);
    box-shadow:0 24px 70px rgba(14,41,32,.22);
    backdrop-filter:blur(24px);
    transform:translateX(calc(-100% - 20px));
    transition:transform .22s ease;
  }
  .desk-mobile-drawer-shell.is-open .desk-mobile-drawer { transform:translateX(0); }
  .desk-mobile-drawer > header { display:flex; align-items:center; justify-content:space-between; padding:3px 3px 12px; }
  .desk-mobile-drawer > header > div { display:flex; align-items:center; gap:9px; }
  .desk-mobile-drawer .desk-identity-card { flex:1; min-width:0; }
  .desk-mobile-drawer > header button { width:34px; height:34px; border:0; border-radius:10px; background:rgba(17,63,49,.06); font-size:22px; }
  .desk-mobile-drawer .desk-nav { overflow:auto; padding:2px; }
  .desk-mobile-drawer .desk-nav-group p { display:block; }
  .desk-mobile-drawer .desk-nav a { min-height:43px; }
  .desk-mobile-drawer > footer { display:flex; align-items:center; gap:8px; padding:10px 5px 3px; color:var(--muted); font-size:11px; }
  .desk-mobile-drawer > footer i { width:7px; height:7px; border-radius:50%; background:var(--leaf-bright); }

  .course-detail-shell { padding:8px; }
  .course-detail-topbar { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:8px; }
  .course-detail-topbar > .course-row-actions { grid-column:1/-1; justify-content:flex-start; overflow:auto hidden; padding-bottom:2px; }
  .course-attention-pill { grid-column:3; grid-row:1; }
  .course-stepper { display:flex; overflow:auto hidden; scrollbar-width:none; }
  .course-stepper::-webkit-scrollbar { display:none; }
  .course-stepper > * { flex:0 0 auto; min-width:86px; }
  .course-workbench-grid { display:grid; grid-template-columns:1fr; }
  .course-lesson-rail { display:flex; max-height:none; overflow:auto hidden; padding:7px; }
  .course-lesson-rail h3 { position:static; flex:0 0 auto; align-self:center; padding:0 5px; }
  .course-lesson-rail button { flex:0 0 min(190px,66vw); }
  .course-stage-stack { min-height:680px; }
  .course-stage-card { min-height:680px; overflow:hidden; }
  .course-node-layout { grid-template-columns:1fr; grid-template-rows:auto minmax(0,1fr); overflow:hidden; }
  .course-node-nav { display:flex; min-height:72px; max-height:80px; overflow:auto hidden; padding-bottom:3px; }
  .course-node-nav button { flex:0 0 min(238px,76vw); min-height:68px; }
  .course-node-editor { min-height:570px; height:100%; }
  .course-source-pane { grid-template-columns:1fr; }
}

@media (max-width: 680px) {
  .course-detail-topbar h2 { font-size:18px; }
  .course-detail-topbar p { font-size:11px; }
  .course-attention-pill { padding:4px 7px; }
  .course-detail-topbar .course-row-actions .soft-button { flex:0 0 auto; }
  .course-stage-heading.compact { align-items:flex-start; flex-direction:column; }
  .course-stage-heading.compact p { margin:0; }
  .course-node-filters button { padding:0 8px; }
  .course-node-editor h4 { font-size:18px; }
  .course-editor-tabs { width:100%; overflow:auto hidden; }
  .course-editor-tabs button { flex:1 0 auto; }
  .course-editor-footer { align-items:stretch; }
  .course-editor-footer .course-primary-row { justify-content:flex-end; }
  .course-review-report > header { grid-template-columns:1fr; }
  .course-review-scores { grid-template-columns:repeat(5,minmax(54px,1fr)); overflow:auto; }
  .course-review-actions textarea { min-height:150px; }
}

/* Today: a quiet preview of future items, visually separate from today's commitments. */
.today-later-list {
  display:grid; gap:8px; margin-top:2px; padding:12px 14px;
  border:1px solid rgba(28,70,55,.08); border-radius:20px;
  background:rgba(255,255,255,.38);
}
.today-later-list > header { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.today-later-list > header span { color:var(--muted); font-size:12px; font-weight:700; letter-spacing:.08em; }
.today-later-list > header button { border:0; padding:3px 0; color:var(--muted); background:transparent; font-size:11px; cursor:pointer; }
.today-later-list > header button:hover { color:var(--leaf); }
.today-later-list > div { display:grid; gap:2px; }
.today-later-list > div > button {
  display:grid; grid-template-columns:minmax(92px,auto) minmax(0,1fr);
  align-items:center; gap:12px; width:100%; border:0; border-radius:12px;
  padding:7px 8px; color:inherit; text-align:left; background:transparent; cursor:pointer;
}
.today-later-list > div > button:hover { background:rgba(255,255,255,.62); }
.today-later-list > div span { color:var(--muted); font-size:11px; white-space:nowrap; }
.today-later-list > div strong { min-width:0; overflow:hidden; color:rgba(24,52,43,.78); font-size:12px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
@media (max-width: 640px) {
  .today-later-list { padding:11px 12px; border-radius:16px; }
  .today-later-list > div > button { grid-template-columns:1fr; gap:2px; }
}

/* Desk density and overflow guardrails */
.desk-nav {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}

.course-import-header {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.course-import-header h2 {
  font-size: clamp(1.45rem, 2.2vw, 1.9rem);
  line-height: 1.18;
}

.course-import-steps {
  position: relative;
  top: auto;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(100%, 720px);
  max-width: 100%;
  min-height: 40px;
  gap: 4px;
  overflow: hidden;
  border-radius: 12px;
  padding: 3px;
  background: rgba(247, 248, 244, .9);
  backdrop-filter: blur(14px);
}

.course-import-steps button {
  width: 100%;
  min-width: 0;
  min-height: 34px;
  padding: 0 12px;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-import-steps button.active {
  color: #fff8e6;
  background: var(--leaf);
}

.desk-product-hero {
  min-height: 180px;
  gap: 14px;
  padding: 20px;
}

.desk-product-orb {
  width: 60px;
  height: 60px;
  border-radius: 18px;
}

.desk-product-copy h2 {
  margin: 6px 0 8px;
  font-size: clamp(26px, 2.8vw, 36px);
  line-height: 1.18;
}

.desk-product-copy p {
  font-size: 13px;
  line-height: 1.7;
}

.desk-product-card {
  min-height: 180px;
  gap: 14px;
  padding: 17px;
}

.desk-product-card h3 {
  font-size: 20px;
}

.desk-product-card p {
  font-size: 13px;
  line-height: 1.65;
}

@media (max-width: 680px) {
  .course-import-steps {
    width: 100%;
  }

  .course-import-steps button {
    padding: 0 8px;
    font-size: 11px;
  }

  .desk-product-copy h2 {
    font-size: clamp(25px, 9vw, 34px);
  }
}

/* Course review focus and readability */
html.course-focus-open,
html.course-focus-open body { overflow:hidden; }

.course-node-nav button { height:auto; min-height:76px; align-items:start; }
.course-node-nav button > span { min-width:0; align-self:stretch; }
.course-node-nav b { -webkit-line-clamp:3; }
.course-node-nav small { display:block; line-height:1.35; white-space:normal; }

.course-editor-toolbar { display:flex; align-items:center; gap:8px; min-width:0; }
.course-editor-toolbar .course-editor-tabs { flex:1 1 auto; min-width:0; }
.course-focus-toggle {
  flex:0 0 auto; min-height:31px; border:1px solid rgba(17,63,49,.1); border-radius:10px;
  padding:0 11px; color:var(--leaf); background:rgba(255,255,255,.52);
  font-size:11px; font-weight:700; cursor:pointer;
}
.course-focus-toggle:hover,
.course-focus-toggle[aria-pressed='true'] { background:rgba(220,233,223,.78); }

.course-focus-backdrop {
  position:fixed; inset:0; z-index:180; border:0;
  background:rgba(12,31,25,.34); backdrop-filter:blur(8px);
}
.course-node-editor.is-focus-mode {
  position:fixed; inset:clamp(10px,2vw,28px); z-index:181;
  width:auto; max-width:none; height:auto; min-height:0;
  border:1px solid rgba(255,255,255,.8); border-radius:22px; padding:16px; overflow:hidden;
  background:rgba(248,250,246,.97); box-shadow:0 30px 100px rgba(10,34,26,.28);
  backdrop-filter:blur(26px);
}

.course-review-pane { grid-template-rows:minmax(190px,1fr) auto; }
.course-review-scroll { scrollbar-gutter:stable; }
.course-review-actions { max-height:min(38vh,280px); overflow:auto; scrollbar-gutter:stable; }
.course-review-actions textarea { min-height:86px; max-height:170px; }
.course-review-report > header p { max-height:8em; overflow:auto; scrollbar-gutter:stable; }

.course-node-editor.is-focus-mode .course-review-pane { grid-template-rows:minmax(320px,1fr) auto; }
.course-node-editor.is-focus-mode .course-review-actions { max-height:min(34vh,340px); }
.course-node-editor.is-focus-mode .course-review-report > header p { max-height:none; overflow:visible; }
.course-node-editor.is-focus-mode .course-review-scroll { padding-right:10px; }

@media (max-width:680px) {
  .course-editor-toolbar { align-items:stretch; }
  .course-focus-toggle { padding:0 8px; }
  .course-node-editor.is-focus-mode { inset:6px; border-radius:16px; padding:10px; }
  .course-node-editor.is-focus-mode .course-review-pane { grid-template-rows:minmax(260px,1fr) auto; }
}

/* Manual final review and Markdown reading view */
.course-final-stage {
  display: grid;
  gap: 12px;
}

.course-final-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.course-final-mode {
  display: inline-flex;
  gap: 3px;
  border: 1px solid rgba(17,63,49,.09);
  border-radius: 11px;
  padding: 3px;
  background: rgba(255,255,255,.46);
}

.course-final-mode button {
  min-height: 30px;
  border: 0;
  border-radius: 8px;
  padding: 0 12px;
  color: var(--muted);
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}

.course-final-mode button[aria-selected='true'] {
  color: var(--leaf);
  background: rgba(220,233,223,.82);
}

.course-final-count {
  color: var(--quiet);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.course-final-preview,
.course-final-note {
  min-height: min(62vh,680px);
  max-height: min(68vh,760px);
  overflow: auto;
  scrollbar-gutter: stable;
  border: 1px solid rgba(17,63,49,.09);
  border-radius: 16px;
  padding: clamp(18px,3vw,34px);
  color: var(--ink);
  background: rgba(255,255,255,.58);
}

.course-final-note {
  width: 100%;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.72;
}

.course-final-preview {
  font-family: var(--display-serif);
  font-size: 15px;
  line-height: 1.9;
}

.course-final-preview > :first-child { margin-top: 0; }
.course-final-preview > :last-child { margin-bottom: 0; }
.course-final-preview h1 { margin: 0 0 1.1em; font-size: clamp(28px,4vw,42px); line-height: 1.25; }
.course-final-preview h2 { margin: 2em 0 .8em; font-size: 24px; line-height: 1.35; }
.course-final-preview h3 { margin: 1.65em 0 .65em; font-size: 19px; line-height: 1.4; }
.course-final-preview p,
.course-final-preview li { line-height: 1.9; }
.course-final-preview blockquote {
  margin: 1.2em 0;
  border-left: 3px solid rgba(61,103,80,.34);
  padding: 4px 0 4px 15px;
  color: var(--muted);
}
.course-final-preview hr { margin: 2em 0; border: 0; border-top: 1px solid rgba(17,63,49,.1); }
.course-final-preview pre {
  overflow: auto;
  border-radius: 12px;
  padding: 13px;
  background: rgba(17,63,49,.055);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.course-final-preview table { display: block; max-width: 100%; overflow: auto; border-collapse: collapse; }
.course-final-preview th,
.course-final-preview td { border: 1px solid rgba(17,63,49,.1); padding: 7px 9px; text-align: left; }

.course-final-actions {
  margin-top: 0;
}

.course-final-unsaved {
  margin: -4px 0 0;
  color: #8b5e1c;
  font-size: 11px;
  text-align: right;
}

.course-final-history {
  border-top: 1px solid rgba(17,63,49,.08);
  padding-top: 9px;
}

.course-final-history > summary {
  color: var(--quiet);
  font-size: 11px;
  cursor: pointer;
}

@media (max-width: 680px) {
  .course-final-toolbar {
    align-items: flex-start;
  }

  .course-final-preview,
  .course-final-note {
    min-height: 58vh;
    max-height: none;
    padding: 17px;
  }

  .course-final-actions {
    justify-content: flex-start;
  }
}

/* Course final feedback and note library */
.course-final-revision-box {
  border: 1px solid rgba(17,63,49,.09);
  border-radius: 13px;
  padding: 10px 12px;
  background: rgba(255,255,255,.42);
}

.course-final-revision-box > summary {
  color: var(--leaf);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.course-final-revision-box[open] > summary {
  margin-bottom: 10px;
}

.course-final-revision-box label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}

.course-final-revision-box textarea {
  width: 100%;
  min-height: 88px;
  max-height: 190px;
  resize: vertical;
  border: 1px solid rgba(17,63,49,.1);
  border-radius: 11px;
  padding: 10px;
  color: var(--ink);
  background: rgba(255,255,255,.68);
  line-height: 1.65;
}

.note-library-shell {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.note-library-head {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 18px;
  align-items: end;
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 22px;
  padding: 20px;
  background: rgba(255,255,255,.5);
  box-shadow: var(--shadow-sm);
}

.note-library-head > div > span,
.note-library-course > header span,
.note-library-lesson span {
  color: var(--quiet);
  font-size: 10px;
  font-weight: 680;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.note-library-head h2 {
  margin: 5px 0 7px;
  font-family: var(--display-serif);
  font-size: 28px;
}

.note-library-head p,
.note-library-course p,
.note-library-lesson p {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
}

.note-library-head dl {
  display: grid;
  grid-template-columns: repeat(3,minmax(64px,1fr));
  gap: 7px;
  margin: 0;
}

.note-library-head dl div {
  display: grid;
  gap: 2px;
  min-width: 64px;
  border-radius: 12px;
  padding: 9px 11px;
  background: rgba(220,233,223,.48);
}

.note-library-head dt {
  color: var(--quiet);
  font-size: 10px;
}

.note-library-head dd {
  margin: 0;
  color: var(--leaf);
  font-size: 18px;
  font-weight: 740;
}

.note-library-list {
  display: grid;
  gap: 12px;
}

.note-library-course {
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 21px;
  padding: 15px;
  background: rgba(255,255,255,.46);
  box-shadow: var(--shadow-sm);
}

.note-library-course > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 2px 2px 13px;
}

.note-library-course h3 {
  margin: 4px 0 4px;
  font-family: var(--display-serif);
  font-size: 22px;
}

.note-library-lessons {
  display: grid;
  gap: 7px;
}

.note-library-lesson {
  display: grid;
  grid-template-columns: 34px minmax(0,1fr) auto;
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(17,63,49,.07);
  border-radius: 14px;
  padding: 10px;
  background: rgba(255,255,255,.42);
}

.note-library-lesson.has-note {
  background: rgba(232,241,236,.5);
}

.note-library-order {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  color: var(--leaf);
  background: rgba(220,233,223,.78);
  font-size: 12px;
  font-weight: 740;
}

.note-library-lesson h4 {
  margin: 2px 0 3px;
  font-size: 15px;
}

.note-library-lesson p {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.note-library-lesson small {
  display: block;
  margin-top: 4px;
  color: var(--quiet);
  font-size: 10px;
}

@media (max-width: 760px) {
  .note-library-head {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .note-library-course > header {
    align-items: flex-start;
    flex-direction: column;
  }

  .note-library-lesson {
    grid-template-columns: 30px minmax(0,1fr);
  }

  .note-library-lesson > .soft-button {
    grid-column: 2;
    justify-self: start;
  }
}

/* Lesson note trash and recovery */
.note-library-tabs {
  display: inline-flex;
  justify-self: start;
  gap: 3px;
  border: 1px solid rgba(17,63,49,.09);
  border-radius: 12px;
  padding: 3px;
  background: rgba(255,255,255,.46);
}

.note-library-tabs button {
  min-height: 31px;
  border: 0;
  border-radius: 9px;
  padding: 0 13px;
  color: var(--muted);
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}

.note-library-tabs button.active {
  color: var(--leaf);
  background: rgba(220,233,223,.82);
  font-weight: 720;
}

.note-library-lesson.is-trashed {
  border-style: dashed;
  background: rgba(255,255,255,.31);
  opacity: .9;
}

.note-library-lesson-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.soft-button.danger.subtle {
  color: #8d5d55;
  background: transparent;
  box-shadow: none;
}

.course-note-trash-card {
  display: grid;
  gap: 14px;
}

.course-note-trash-meta {
  display: grid;
  gap: 4px;
  border: 1px dashed rgba(17,63,49,.13);
  border-radius: 14px;
  padding: 14px;
  background: rgba(255,255,255,.38);
}

.course-note-trash-meta span,
.course-note-trash-meta small {
  color: var(--quiet);
  font-size: 11px;
}

.course-note-trash-meta strong {
  color: var(--ink);
  font-size: 15px;
}

@media (max-width: 760px) {
  .note-library-lesson-actions {
    grid-column: 2;
    justify-content: flex-start;
  }
}

/* Course publishing core */
.course-publication-line {
  margin: -2px 0 0;
  color: var(--quiet);
  font-size: 11px;
  text-align: right;
}

.course-publication-line a {
  color: var(--leaf);
}

.publishing-desk {
  display: grid;
  gap: 14px;
}

.publishing-head,
.publishing-picker,
.publishing-index,
.publishing-workspace {
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 22px;
  background: rgba(255,255,255,.5);
  box-shadow: var(--shadow-sm);
}

.publishing-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
}

.publishing-head span,
.publishing-picker > div > span,
.publishing-index header span,
.publishing-source > span {
  color: var(--quiet);
  font-size: 10px;
  font-weight: 720;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.publishing-head h2 {
  margin: 5px 0 7px;
  font-family: var(--display-serif);
  font-size: 28px;
}

.publishing-head p,
.publishing-picker p,
.publishing-source p {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
}

.publishing-head-actions,
.publishing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.publishing-workspace {
  display: grid;
  grid-template-columns: minmax(190px, .34fr) minmax(0, 1fr);
  overflow: hidden;
}

.publishing-source {
  padding: 18px;
  border-right: 1px solid rgba(17,63,49,.08);
  background: rgba(220,233,223,.3);
}

.publishing-source h3 {
  margin: 7px 0 5px;
  font-family: var(--display-serif);
  font-size: 22px;
}

.publishing-source small {
  color: var(--quiet);
}

.publishing-state {
  display: grid;
  gap: 4px;
  margin-top: 18px;
  border-radius: 13px;
  padding: 12px;
  background: rgba(255,255,255,.55);
}

.publishing-state span,
.publishing-state a {
  color: var(--quiet);
  font-size: 11px;
}

.publishing-state a {
  color: var(--leaf);
}

.publishing-editor {
  min-width: 0;
  padding: 18px;
}

.publishing-tabs {
  display: inline-flex;
  gap: 3px;
  margin-bottom: 14px;
  border: 1px solid rgba(17,63,49,.09);
  border-radius: 11px;
  padding: 3px;
}

.publishing-tabs button {
  min-height: 30px;
  border: 0;
  border-radius: 8px;
  padding: 0 13px;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
}

.publishing-tabs button.active {
  color: var(--leaf);
  background: rgba(220,233,223,.82);
}

.publishing-form {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 12px;
}

.publishing-form label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}

.publishing-form .wide {
  grid-column: 1 / -1;
}

.publishing-form input,
.publishing-form textarea,
.publishing-form select {
  width: 100%;
  border: 1px solid rgba(17,63,49,.1);
  border-radius: 11px;
  padding: 10px 11px;
  color: var(--ink);
  background: rgba(255,255,255,.72);
}

.publishing-form textarea {
  resize: vertical;
}

.publishing-field-label,
.publishing-choice > span {
  color: var(--muted);
  font-size: 12px;
}

.publishing-choice,
.publishing-tag-editor {
  position: relative;
  display: grid;
  gap: 7px;
}

.publishing-choice-control,
.publishing-tag-shell {
  position: relative;
  min-width: 0;
}

.publishing-choice-control > input {
  padding-right: 38px;
}

.publishing-choice-control > button {
  position: absolute;
  z-index: 2;
  top: 4px;
  right: 4px;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 9px;
  color: var(--quiet);
  background: transparent;
  cursor: pointer;
}

.publishing-choice-control.is-open > button {
  color: var(--blue);
  background: rgba(226,237,241,.64);
}

.publishing-choice-menu,
.publishing-tag-menu {
  position: absolute;
  z-index: 30;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  max-height: 210px;
  overflow: auto;
  border: 1px solid rgba(17,63,49,.1);
  border-radius: 13px;
  padding: 8px;
  background: rgba(250,252,250,.97);
  box-shadow: 0 18px 42px rgba(24,63,50,.15), inset 0 1px 0 rgba(255,255,255,.85);
  backdrop-filter: blur(20px);
}

.publishing-choice-menu button,
.publishing-tag-menu button,
.publishing-preview-tags span {
  border: 1px solid rgba(49,90,140,.14);
  border-radius: 999px;
  padding: 4px 8px;
  color: #355d86;
  background: rgba(226,237,241,.54);
  font-size: 10px;
  line-height: 1.25;
  cursor: pointer;
}

.publishing-choice-menu button:hover,
.publishing-choice-menu button.active,
.publishing-tag-menu button:hover {
  color: var(--blue);
  border-color: rgba(49,90,140,.28);
  background: rgba(214,230,237,.82);
}

.publishing-choice-menu p,
.publishing-tag-menu p {
  width: 100%;
  margin: 2px;
  color: var(--quiet);
  font-size: 10px;
}

.publishing-tag-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-content: center;
  gap: 4px;
  min-height: 43px;
  border: 1px solid rgba(17,63,49,.1);
  border-radius: 12px;
  padding: 5px 7px;
  background: rgba(255,255,255,.72);
}

.publishing-tag-input input {
  flex: 0 1 92px;
  width: 92px;
  min-width: 68px;
  border: 0;
  padding: 3px 2px;
  background: transparent;
  outline: none;
}

.publishing-tag-input button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  border: 1px solid rgba(49,90,140,.14);
  border-radius: 999px;
  padding: 3px 7px;
  color: #355d86;
  background: rgba(226,237,241,.54);
  font-size: 10px;
  line-height: 1.15;
  cursor: pointer;
}

.publishing-tag-input button i {
  color: var(--quiet);
  font-style: normal;
}

.publishing-preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.publishing-preview-tags {
  margin-top: 10px;
}

.publishing-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.publishing-checks label {
  display: flex;
  grid: none;
  align-items: center;
  gap: 6px;
}

.publishing-checks input {
  width: auto;
}

.publishing-preview {
  max-height: 68vh;
  overflow: auto;
  border: 1px solid rgba(17,63,49,.09);
  border-radius: 16px;
  padding: clamp(18px,3vw,34px);
  background: rgba(255,255,255,.58);
  line-height: 1.85;
}

.publishing-preview-cover {
  display: grid;
  align-content: end;
  gap: 5px;
  min-height: 170px;
  margin: calc(clamp(18px,3vw,34px) * -1) calc(clamp(18px,3vw,34px) * -1) 22px;
  padding: 22px;
  color: rgba(255,255,255,.94);
  background:
    radial-gradient(circle at 82% 12%, rgba(116,167,178,.72), transparent 42%),
    linear-gradient(145deg,#204b3e,#4f776b);
  background-size: cover;
  background-position: center;
}

.publishing-preview-cover span { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; opacity: .76; }
.publishing-preview-cover strong { font-family: var(--display-serif); font-size: 27px; font-weight: 560; }
.publishing-preview-cover.has-image { min-height: 220px; }

.publishing-preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--quiet);
  font-size: 11px;
}

.publishing-preview h1 {
  margin: 10px 0 12px;
  font-family: var(--display-serif);
}

.publishing-preview > p {
  color: var(--muted);
}

.publishing-actions {
  margin-top: 14px;
}

.publishing-picker,
.publishing-index {
  padding: 18px;
}

.publishing-note-list,
.publishing-index-list {
  display: grid;
  gap: 7px;
  margin-top: 14px;
}

.publishing-note-row,
.publishing-index-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid rgba(17,63,49,.07);
  border-radius: 14px;
  padding: 11px 12px;
  background: rgba(255,255,255,.46);
}

.publishing-note-row div,
.publishing-index-list article > div {
  display: grid;
  gap: 3px;
}

.publishing-note-row span,
.publishing-index-list p,
.publishing-index-list span {
  margin: 0;
  color: var(--quiet);
  font-size: 11px;
}

.publishing-index > header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.publishing-index h3 {
  margin: 4px 0 0;
  font-family: var(--display-serif);
  font-size: 22px;
}

@media (max-width: 760px) {
  .publishing-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .publishing-workspace {
    grid-template-columns: 1fr;
  }

  .publishing-source {
    border-right: 0;
    border-bottom: 1px solid rgba(17,63,49,.08);
  }

  .publishing-form {
    grid-template-columns: 1fr;
  }

  .publishing-form .wide {
    grid-column: auto;
  }
}


/* Course note library hierarchy and independent reader */
.note-library-toolbar {
  display: grid;
  grid-template-columns: auto minmax(220px, 1fr) 150px;
  gap: 10px;
  align-items: end;
}

.note-library-search,
.note-library-sort {
  display: grid;
  gap: 5px;
  color: var(--quiet);
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.note-library-search input,
.note-library-sort select {
  width: 100%;
  min-height: 38px;
  border: 1px solid rgba(17,63,49,.09);
  border-radius: 13px;
  padding: 0 12px;
  color: var(--ink);
  background: rgba(255,255,255,.62);
  outline: none;
}

.note-library-search input:focus,
.note-library-sort select:focus {
  border-color: rgba(49,90,140,.32);
  box-shadow: 0 0 0 3px rgba(49,90,140,.07);
}

.note-library-category {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(17,63,49,.08);
  border-radius: 24px;
  padding: 14px;
  background: linear-gradient(150deg,rgba(255,255,255,.62),rgba(224,236,229,.28));
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.72);
}

.note-library-category > header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  padding: 2px 4px 4px;
}

.note-library-category > header span,
.note-library-course-title > span,
.note-library-lesson-link > span,
.note-library-lesson-copy > span {
  color: var(--blue);
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.note-library-category > header h3 {
  margin: 2px 0 0;
  font-family: var(--display-serif);
  font-size: 23px;
  font-weight: 600;
}

.note-library-category > header p {
  max-width: 420px;
  margin: 0;
  color: var(--quiet);
  font-size: 11px;
  line-height: 1.6;
  text-align: right;
}

.note-library-list {
  gap: 9px;
}

.note-library-course {
  border: 1px solid rgba(17,63,49,.075);
  border-radius: 19px;
  padding: 0;
  overflow: visible;
  background: rgba(255,255,255,.52);
  box-shadow: none;
}

.note-library-course > summary {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 18px;
  align-items: center;
  padding: 15px 16px;
  cursor: pointer;
  list-style: none;
}

.note-library-course > summary::-webkit-details-marker,
.note-library-manage > summary::-webkit-details-marker,
.note-library-course-tools details > summary::-webkit-details-marker,
.course-note-reader-manage > summary::-webkit-details-marker {
  display: none;
}

.note-library-course > summary::after {
  content: '⌄';
  grid-column: 3;
  color: var(--quiet);
  font-size: 16px;
  transform: rotate(-90deg);
  transition: transform .18s ease;
}

.note-library-course[open] > summary::after {
  transform: rotate(0);
}

.note-library-course-title {
  min-width: 0;
}

.note-library-course-title h3 {
  margin: 3px 0;
  font-family: var(--display-serif);
  font-size: 20px;
  font-weight: 600;
}

.note-library-course-title p {
  overflow: hidden;
  margin: 0;
  color: var(--quiet);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-library-course-count {
  display: grid;
  min-width: 50px;
  text-align: right;
}

.note-library-course-count strong {
  font-family: var(--display-serif);
  font-size: 22px;
  font-weight: 600;
}

.note-library-course-count span {
  color: var(--quiet);
  font-size: 9px;
}

.note-library-course-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid rgba(17,63,49,.06);
  padding: 8px 14px;
  color: var(--quiet);
  font-size: 10px;
  background: rgba(231,239,234,.28);
}

.note-library-course-tools details,
.note-library-manage,
.course-note-reader-manage {
  position: relative;
}

.note-library-course-tools details > summary,
.note-library-manage > summary,
.course-note-reader-manage > summary {
  border: 1px solid rgba(17,63,49,.08);
  border-radius: 999px;
  padding: 6px 10px;
  color: var(--blue);
  background: rgba(255,255,255,.62);
  cursor: pointer;
  list-style: none;
}

.note-library-course-tools details > div,
.note-library-manage > div,
.course-note-reader-manage > div {
  position: absolute;
  z-index: 20;
  top: calc(100% + 6px);
  right: 0;
  display: grid;
  min-width: 150px;
  border: 1px solid rgba(17,63,49,.09);
  border-radius: 14px;
  padding: 6px;
  background: rgba(250,252,251,.98);
  box-shadow: 0 16px 38px rgba(24,54,43,.14);
}

.note-library-course-tools details a,
.note-library-manage a,
.note-library-manage button,
.course-note-reader-manage a,
.course-note-reader-manage button {
  border: 0;
  border-radius: 9px;
  padding: 8px 9px;
  color: var(--ink);
  background: transparent;
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}

.note-library-course-tools details a:hover,
.note-library-manage a:hover,
.note-library-manage button:hover,
.course-note-reader-manage a:hover,
.course-note-reader-manage button:hover {
  background: rgba(220,233,223,.58);
}

.note-library-manage .danger,
.course-note-reader-manage .danger {
  color: #9b423c;
}

.note-library-lessons {
  gap: 7px;
  padding: 10px;
}

.note-library-lesson {
  grid-template-columns: 34px minmax(0,1fr) auto;
  gap: 10px;
  min-height: 98px;
  padding: 8px 9px 8px 7px;
  transition: border-color .16s ease, background .16s ease, transform .16s ease;
}

.note-library-lesson.has-note:hover {
  border-color: rgba(49,90,140,.18);
  background: rgba(255,255,255,.76);
  transform: translateY(-1px);
}

.note-library-lesson-link,
.note-library-lesson-copy {
  display: grid;
  align-content: center;
  min-width: 0;
  padding: 5px 3px;
}

.note-library-lesson-link h4,
.note-library-lesson-copy h4 {
  margin: 3px 0 4px;
  font-family: var(--display-serif);
  font-size: 17px;
  font-weight: 600;
}

.note-library-lesson-link p,
.note-library-lesson-copy p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.note-library-lesson-link small,
.note-library-lesson-copy small {
  margin-top: 6px;
  color: var(--quiet);
  font-size: 10px;
}

.note-library-manage {
  align-self: start;
  margin-top: 5px;
}

.course-note-reader-state {
  display: grid;
  place-items: center;
  min-height: 420px;
  border: 1px solid rgba(17,63,49,.08);
  border-radius: 24px;
  padding: 28px;
  text-align: center;
  background: rgba(255,255,255,.5);
}

.course-note-reader-state strong {
  font-family: var(--display-serif);
  font-size: 25px;
}

.course-note-reader-state p { color: var(--quiet); }

.course-note-reader {
  display: grid;
  gap: 10px;
  min-height: 0;
}

.course-note-reader-head {
  position: sticky;
  top: 8px;
  z-index: 18;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid rgba(17,63,49,.08);
  border-radius: 17px;
  padding: 8px 10px;
  background: rgba(248,251,249,.86);
  box-shadow: 0 9px 28px rgba(32,58,49,.06);
  backdrop-filter: blur(18px);
}

.course-note-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  overflow: hidden;
  color: var(--quiet);
  font-size: 11px;
  white-space: nowrap;
}

.course-note-breadcrumbs a { color: var(--blue); }
.course-note-breadcrumbs span:last-child { overflow: hidden; text-overflow: ellipsis; }

.course-note-reader-tools {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
}

.course-note-reader-tools > button,
.course-note-reader-manage > summary {
  border: 1px solid rgba(17,63,49,.09);
  border-radius: 999px;
  padding: 6px 10px;
  color: var(--muted);
  background: rgba(255,255,255,.64);
  font-size: 10px;
  cursor: pointer;
}

.course-note-reader-tools > button[aria-pressed='true'] {
  color: var(--green);
  background: rgba(220,233,223,.64);
}

.course-note-reader-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(190px,.54fr) minmax(0,1.72fr) minmax(165px,.48fr);
  gap: 10px;
  align-items: start;
  transition: grid-template-columns .22s ease;
}

.course-note-reader.course-index-closed .course-note-reader-grid {
  grid-template-columns: 0 minmax(0,1.72fr) minmax(165px,.48fr);
}

.course-note-reader.toc-closed .course-note-reader-grid {
  grid-template-columns: minmax(190px,.54fr) minmax(0,1.72fr) 0;
}

.course-note-reader.course-index-closed.toc-closed .course-note-reader-grid {
  grid-template-columns: 0 minmax(0,1fr) 0;
}

.course-note-course-index,
.course-note-article,
.course-note-toc {
  border: 1px solid rgba(17,63,49,.075);
  border-radius: 22px;
  background: rgba(255,255,255,.58);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.7);
}

.course-note-course-index,
.course-note-toc {
  position: sticky;
  top: 12px;
  max-height: calc(100dvh - 116px);
  overflow: auto;
  padding: 14px;
}

.course-note-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.course-note-side-head > span,
.course-note-article > header > span,
.reading-progress-head > span {
  color: var(--blue);
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.course-note-side-head > button {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  color: var(--quiet);
  background: rgba(220,233,223,.5);
  cursor: pointer;
}

.course-note-course-index h2 {
  margin: 6px 0 4px;
  font-family: var(--display-serif);
  font-size: 19px;
  font-weight: 600;
}

.course-note-course-index > p,
.reading-navigator > p {
  margin: 0;
  color: var(--quiet);
  font-size: 10px;
  line-height: 1.6;
}

.course-note-course-index nav,
.reading-navigator nav {
  display: grid;
  gap: 4px;
  margin-top: 14px;
}

.course-note-course-index nav a {
  display: grid;
  grid-template-columns: 24px minmax(0,1fr);
  gap: 7px;
  align-items: center;
  border-radius: 11px;
  padding: 8px;
  color: var(--muted);
  font-size: 11px;
}

.course-note-course-index nav a:hover,
.course-note-course-index nav a.active {
  color: var(--ink);
  background: rgba(220,233,223,.55);
}

.course-note-course-index nav b {
  color: var(--blue);
  font-family: var(--display-serif);
  font-size: 15px;
  font-weight: 600;
}

.course-note-course-index nav span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-note-signature {
  margin: 22px 4px 2px;
  padding-top: 14px;
  border-top: 1px solid rgba(17,63,49,.07);
  color: rgba(25,59,49,.7);
}

.course-note-article {
  min-width: 0;
  padding: clamp(22px,4vw,48px);
}

.course-note-article > header {
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(17,63,49,.08);
}

.course-note-article > header h1 {
  margin: 8px 0 12px;
  font-family: var(--display-serif);
  font-size: clamp(31px,4.6vw,51px);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -.045em;
}

.course-note-article > header p {
  margin: 0;
  color: var(--quiet);
  font-size: 11px;
}

.course-note-markdown,
.markdown-document {
  padding-top: 20px;
  color: #26302c;
  font-size: 15px;
  line-height: 1.95;
}

.course-note-markdown > :first-child,
.markdown-document > :first-child { margin-top: 0; }
.course-note-markdown > :last-child,
.markdown-document > :last-child { margin-bottom: 0; }
.course-note-markdown h1,
.course-note-markdown h2,
.course-note-markdown h3,
.course-note-markdown h4,
.markdown-document h1,
.markdown-document h2,
.markdown-document h3,
.markdown-document h4 {
  scroll-margin-top: 88px;
  font-family: var(--display-serif);
  font-weight: 600;
  line-height: 1.42;
}
.course-note-markdown h1,
.markdown-document h1 { margin: 0 0 1em; font-size: 30px; }
.course-note-markdown h2,
.markdown-document h2 { margin: 2.15em 0 .85em; font-size: 24px; }
.course-note-markdown h3,
.markdown-document h3 { margin: 1.8em 0 .7em; font-size: 20px; }
.course-note-markdown h4,
.markdown-document h4 { margin: 1.5em 0 .6em; font-size: 17px; }
.course-note-markdown p,
.course-note-markdown ul,
.course-note-markdown ol,
.course-note-markdown blockquote,
.markdown-document p,
.markdown-document ul,
.markdown-document ol,
.markdown-document blockquote { margin: 1em 0; }
.course-note-markdown blockquote,
.markdown-document blockquote {
  border-left: 3px solid rgba(49,90,140,.25);
  padding: 2px 0 2px 16px;
  color: var(--muted);
}
.course-note-markdown pre,
.markdown-document pre {
  overflow: auto;
  border-radius: 14px;
  padding: 14px;
  background: #1f2925;
  color: #f4f7f5;
}
.course-note-markdown code:not(pre code),
.markdown-document code:not(pre code) {
  border-radius: 5px;
  padding: 2px 5px;
  background: rgba(49,90,140,.07);
}
.course-note-markdown table,
.markdown-document table {
  display: block;
  max-width: 100%;
  overflow: auto;
  border-collapse: collapse;
}
.course-note-markdown th,
.course-note-markdown td,
.markdown-document th,
.markdown-document td {
  border: 1px solid rgba(17,63,49,.1);
  padding: 7px 9px;
  text-align: left;
}
.course-note-markdown a,
.markdown-document a {
  color: var(--blue);
  text-decoration: underline;
  text-decoration-color: rgba(49,90,140,.25);
  text-underline-offset: 3px;
}

.reading-navigator { min-width: 0; }
.reading-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}
.reading-progress-head strong {
  color: var(--green);
  font-family: var(--display-serif);
  font-size: 14px;
  font-weight: 600;
}
.reading-progress-track {
  height: 3px;
  overflow: hidden;
  margin: 9px 0 12px;
  border-radius: 999px;
  background: rgba(17,63,49,.08);
}
.reading-progress-track i {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--blue), var(--green));
  transform-origin: left center;
  transition: transform .12s linear;
}
.reading-navigator nav {
  max-height: calc(100dvh - 220px);
  overflow: auto;
  padding-right: 2px;
}
.reading-navigator nav a {
  border-left: 1px solid rgba(17,63,49,.08);
  padding: 5px 0 5px 9px;
  color: var(--quiet);
  font-size: 10px;
  line-height: 1.45;
  transition: color .16s ease, border-color .16s ease, background .16s ease;
}
.reading-navigator nav a:hover,
.reading-navigator nav a.active {
  color: var(--blue);
  border-left-color: rgba(49,90,140,.45);
  background: linear-gradient(90deg, rgba(49,90,140,.06), transparent);
}
.reading-navigator nav a.level-2 { padding-left: 14px; }
.reading-navigator nav a.level-3 { padding-left: 20px; }
.reading-navigator nav a.level-4 { padding-left: 26px; }

.course-note-pagination {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 36px;
  padding-top: 18px;
  border-top: 1px solid rgba(17,63,49,.08);
}
.course-note-pagination a {
  display: grid;
  gap: 4px;
  border-radius: 14px;
  padding: 12px;
  background: rgba(231,239,234,.42);
}
.course-note-pagination a.next { text-align: right; }
.course-note-pagination span { color: var(--quiet); font-size: 9px; text-transform: uppercase; }
.course-note-pagination strong { font-family: var(--display-serif); font-size: 14px; font-weight: 600; }

.course-note-edge-toggle {
  position: sticky;
  top: 92px;
  z-index: 8;
  align-self: start;
  width: 30px;
  min-height: 76px;
  border: 1px solid rgba(17,63,49,.09);
  color: var(--green);
  background: rgba(248,251,249,.9);
  box-shadow: 0 10px 24px rgba(32,58,49,.08);
  writing-mode: vertical-rl;
  letter-spacing: .12em;
  font-size: 10px;
  cursor: pointer;
}
.course-note-edge-toggle.left { grid-column: 1; justify-self: start; border-radius: 0 13px 13px 0; }
.course-note-edge-toggle.right { grid-column: 3; justify-self: end; border-radius: 13px 0 0 13px; }
.course-note-panel-backdrop { display: none; }

@media (max-width: 1120px) {
  .course-note-reader-grid,
  .course-note-reader.course-index-closed .course-note-reader-grid,
  .course-note-reader.toc-closed .course-note-reader-grid,
  .course-note-reader.course-index-closed.toc-closed .course-note-reader-grid {
    grid-template-columns: minmax(170px,.48fr) minmax(0,1.55fr);
  }

  .course-note-toc {
    position: fixed;
    z-index: 42;
    top: 84px;
    right: 18px;
    width: min(280px,calc(100vw - 36px));
    max-height: calc(100dvh - 104px);
    background: rgba(250,252,251,.97);
    box-shadow: 0 24px 70px rgba(17,45,36,.18);
  }

  .course-note-edge-toggle.right {
    position: fixed;
    z-index: 32;
    top: 128px;
    right: 0;
  }
}

@media (max-width: 760px) {
  .note-library-toolbar { grid-template-columns: 1fr 120px; }
  .note-library-tabs { grid-column: 1 / -1; }
  .note-library-category > header { align-items: flex-start; flex-direction: column; }
  .note-library-category > header p { text-align: left; }
  .note-library-course > summary { grid-template-columns: minmax(0,1fr) auto; }
  .note-library-course-count { display: none; }
  .note-library-course > summary::after { grid-column: 2; }
  .note-library-lesson { grid-template-columns: 30px minmax(0,1fr); }
  .note-library-manage { grid-column: 2; justify-self: start; margin: 0 0 4px; }
  .note-library-manage > div { right: auto; left: 0; }

  .course-note-reader-head {
    position: static;
    align-items: flex-start;
    flex-direction: column;
  }
  .course-note-reader-tools { width: 100%; }
  .course-note-reader-tools > button { flex: 1; }
  .course-note-reader-grid,
  .course-note-reader.course-index-closed .course-note-reader-grid,
  .course-note-reader.toc-closed .course-note-reader-grid,
  .course-note-reader.course-index-closed.toc-closed .course-note-reader-grid {
    grid-template-columns: 1fr;
  }
  .course-note-course-index,
  .course-note-toc {
    position: fixed;
    z-index: 46;
    top: 72px;
    bottom: 18px;
    width: min(310px,calc(100vw - 36px));
    max-height: none;
    background: rgba(250,252,251,.98);
    box-shadow: 0 24px 70px rgba(17,45,36,.2);
  }
  .course-note-course-index { left: 18px; }
  .course-note-toc { right: 18px; }
  .course-note-panel-backdrop {
    display: block;
    position: fixed;
    z-index: 40;
    inset: 0;
    border: 0;
    background: rgba(23,39,33,.24);
    backdrop-filter: blur(2px);
  }
  .course-note-edge-toggle.left,
  .course-note-edge-toggle.right {
    position: fixed;
    z-index: 32;
    top: 128px;
  }
  .course-note-edge-toggle.left { left: 0; }
  .course-note-edge-toggle.right { right: 0; }
  .course-note-article { padding: 22px 18px; }
}


.desk-module-intro {
  display:flex;
  align-items:end;
  justify-content:space-between;
  gap:24px;
  margin-bottom:18px;
  border:1px solid rgba(255,255,255,.72);
  border-radius:22px;
  padding:20px 22px;
  background:linear-gradient(145deg,rgba(255,255,255,.68),rgba(239,245,241,.42));
  box-shadow:0 18px 54px rgba(24,63,50,.06),inset 0 1px 0 rgba(255,255,255,.86);
  backdrop-filter:blur(18px);
}
.desk-module-intro span,
.writing-desk-hero span,
.system-desk-hero span,
.writing-desk-panel header span,
.system-desk-grid article header span {
  color:var(--quiet);
  font-size:10px;
  letter-spacing:.1em;
  text-transform:uppercase;
}
.desk-module-intro h2,
.writing-desk-hero h2,
.system-desk-hero h2 {
  margin:6px 0 7px;
  font-family:var(--display-serif);
  font-size:clamp(28px,4vw,42px);
  font-weight:600;
  letter-spacing:-.04em;
}
.desk-module-intro p,
.writing-desk-hero p,
.system-desk-hero p {
  max-width:720px;
  margin:0;
  color:var(--muted);
  line-height:1.75;
}
.desk-loading-state {
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  min-height:260px;
  color:var(--quiet);
}
.desk-loading-state i {
  width:9px;
  height:9px;
  border-radius:50%;
  background:var(--leaf);
  box-shadow:0 0 0 7px rgba(31,88,69,.08);
  animation:course-task-pulse 1.4s ease-in-out infinite;
}
.writing-desk,
.system-desk { display:grid; gap:16px; }
.writing-desk-hero,
.system-desk-hero {
  display:flex;
  align-items:end;
  justify-content:space-between;
  gap:24px;
  border:1px solid rgba(255,255,255,.74);
  border-radius:26px;
  padding:24px;
  background:linear-gradient(145deg,rgba(255,255,255,.7),rgba(239,245,241,.44));
  box-shadow:0 22px 64px rgba(24,63,50,.07),inset 0 1px 0 rgba(255,255,255,.88);
  backdrop-filter:blur(20px);
}
.writing-desk-hero > div:last-child { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
.writing-desk-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.writing-desk-stats > div {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  border:1px solid rgba(255,255,255,.7);
  border-radius:18px;
  padding:15px 17px;
  background:rgba(255,255,255,.48);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.78);
}
.writing-desk-stats span { color:var(--quiet); font-size:11px; }
.writing-desk-stats strong { font-family:var(--display-serif); font-size:25px; }
.writing-desk-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.writing-desk-panel,
.system-desk-grid article {
  min-width:0;
  border:1px solid rgba(255,255,255,.72);
  border-radius:23px;
  padding:18px;
  background:linear-gradient(145deg,rgba(255,255,255,.64),rgba(239,245,241,.4));
  box-shadow:0 18px 54px rgba(24,63,50,.055),inset 0 1px 0 rgba(255,255,255,.84);
  backdrop-filter:blur(18px);
}
.writing-desk-panel > header { display:flex; align-items:end; justify-content:space-between; gap:14px; padding:2px 2px 14px; border-bottom:1px solid rgba(23,35,29,.07); }
.writing-desk-panel h3,
.system-desk-grid h3 { margin:4px 0 0; font-family:var(--display-serif); font-size:23px; font-weight:600; }
.writing-desk-panel header a { color:var(--green); font-size:10px; }
.writing-desk-list { display:grid; gap:7px; padding-top:12px; }
.writing-desk-list > a { display:flex; align-items:start; justify-content:space-between; gap:14px; border-radius:15px; padding:11px 12px; color:var(--ink); background:rgba(255,255,255,.34); transition:transform .18s ease,background .18s ease; }
.writing-desk-list > a:hover { transform:translateY(-2px); background:rgba(255,255,255,.68); }
.writing-desk-list strong { display:block; font-size:12px; }
.writing-desk-list p { display:-webkit-box; overflow:hidden; margin:5px 0 0; color:var(--muted); font-size:10px; line-height:1.55; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.writing-desk-list small { flex:0 0 auto; color:var(--quiet); font-size:9px; }
.writing-desk-empty { margin:0; padding:30px 10px; color:var(--quiet); text-align:center; }
.system-desk-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.system-desk-grid article { display:flex; min-height:220px; flex-direction:column; }
.system-desk-grid article > p { color:var(--muted); font-size:12px; line-height:1.75; }
.system-desk-grid article > small { margin-top:auto; color:var(--quiet); font-size:10px; line-height:1.6; }
.system-desk-grid dl { display:grid; gap:7px; margin:16px 0 0; }
.system-desk-grid dl div { display:flex; justify-content:space-between; gap:12px; border-top:1px solid rgba(23,35,29,.06); padding-top:7px; }
.system-desk-grid dt { color:var(--quiet); font-size:10px; }
.system-desk-grid dd { margin:0; font-size:10px; font-weight:650; }
.system-state-pill { display:inline-flex; align-items:center; gap:7px; align-self:flex-start; margin-top:16px; border-radius:999px; padding:6px 9px; color:var(--quiet); background:rgba(255,255,255,.5); font-size:10px; }
.system-state-pill i { width:7px; height:7px; border-radius:50%; background:#c89045; }
.system-state-pill.is-ok i { background:#2f7a5d; }
.system-connection-list { display:flex; flex-wrap:wrap; gap:6px; margin-top:3px; }
.system-connection-list .system-state-pill { margin-top:7px; }
.system-desk-grid button { align-self:flex-start; margin-top:12px; border:0; border-radius:999px; padding:7px 10px; color:var(--green); background:rgba(220,233,223,.65); cursor:pointer; }
.reminder-settings-card { min-height:280px !important; }
.reminder-settings-card > header { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
.reminder-settings-card > header em { border:1px solid rgba(17,63,49,.08); border-radius:999px; padding:5px 8px; color:var(--quiet); background:rgba(255,255,255,.48); font-size:9px; font-style:normal; }
.reminder-settings-card form { display:grid; gap:12px; margin-top:14px; }
.reminder-channel-status { display:flex; flex-wrap:wrap; gap:5px; margin-top:10px; }
.reminder-channel-status span { display:inline-flex; align-items:center; gap:5px; border-radius:999px; padding:4px 7px; color:var(--quiet); background:rgba(239,220,208,.48); font-size:8px; }
.reminder-channel-status span::before { content:''; width:5px; height:5px; border-radius:50%; background:#c89045; }
.reminder-channel-status span.is-ok { color:var(--leaf); background:rgba(220,233,223,.58); }
.reminder-channel-status span.is-ok::before { background:#2f7a5d; }
.reminder-email-field { display:grid; gap:6px; }
.reminder-email-field > span { color:var(--quiet); font-size:10px; }
.reminder-email-field input { width:100%; min-height:42px; border:1px solid rgba(17,63,49,.1); border-radius:13px; padding:0 12px; color:var(--ink); background:rgba(255,255,255,.58); outline:none; transition:border-color .18s ease,box-shadow .18s ease,background .18s ease; }
.reminder-email-field input:focus { border-color:rgba(24,63,50,.28); background:rgba(255,255,255,.82); box-shadow:0 0 0 4px rgba(24,63,50,.07); }
.reminder-toggle-list { display:flex; flex-wrap:wrap; gap:7px; }
.reminder-toggle { display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(17,63,49,.08); border-radius:999px; padding:6px 9px 6px 7px; color:var(--muted); background:rgba(255,255,255,.42); cursor:pointer; }
.reminder-toggle input { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
.reminder-toggle > span { position:relative; width:28px; height:16px; border-radius:999px; background:rgba(105,117,111,.24); transition:background .18s ease; }
.reminder-toggle > span i { position:absolute; left:2px; top:2px; width:12px; height:12px; border-radius:50%; background:#fff; box-shadow:0 2px 6px rgba(17,63,49,.16); transition:transform .18s var(--ease); }
.reminder-toggle input:checked + span { background:var(--leaf); }
.reminder-toggle input:checked + span i { transform:translateX(12px); }
.reminder-toggle b { font-size:10px; font-weight:620; }
.reminder-settings-actions { display:flex; flex-wrap:wrap; gap:7px; }
.reminder-settings-actions button { margin-top:0; }
.reminder-settings-actions button.is-primary { color:#fffaf0; background:var(--leaf); box-shadow:0 8px 18px rgba(24,63,50,.16); }
.reminder-settings-actions button:disabled { cursor:not-allowed; opacity:.5; }
.reminder-settings-message { margin:0 !important; border-radius:11px; padding:8px 10px; color:var(--leaf) !important; background:rgba(220,233,223,.55); font-size:10px !important; }
.reminder-settings-message.is-error { color:#8a4b35 !important; background:rgba(239,220,208,.62); }
.reminder-settings-card form > small { margin-top:0 !important; color:var(--quiet); font-size:9px; line-height:1.6; }
@media (max-width:900px) {
  .writing-desk-grid,
  .system-desk-grid { grid-template-columns:1fr; }
  .system-desk-grid article { min-height:0; }
}
@media (max-width:700px) {
  .desk-module-intro,
  .writing-desk-hero,
  .system-desk-hero { align-items:flex-start; flex-direction:column; }
  .writing-desk-hero > div:last-child { justify-content:flex-start; }
  .writing-desk-stats { grid-template-columns:1fr; }
}


/* Multi-user workspace, account menu and compact settings */
.desk-layout { grid-template-columns:292px minmax(0,1fr); }
.desk-brand-row { align-items:flex-start; gap:12px; padding:5px 3px 17px; }
.desk-identity-card { grid-template-columns:72px minmax(0,1fr); gap:14px; min-height:92px; }
.desk-identity-avatar { width:72px; height:72px; flex-basis:72px; border-radius:22px; }
.desk-identity-avatar img { image-rendering:pixelated; transform:none; }
.desk-identity-copy { align-content:center; gap:7px; }
.desk-identity-clock { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; }
.desk-identity-clock strong { overflow:visible; font-size:16px; line-height:1.2; text-overflow:clip; white-space:nowrap; }
.desk-identity-clock time { font-size:14px; line-height:1.2; }
.desk-identity-copy p { overflow:visible; font-size:13px; line-height:1.45; text-overflow:clip; white-space:normal; }
.desk-identity-chips { gap:6px; margin-top:1px; }
.desk-identity-chips span { gap:4px; padding:5px 8px; font-size:10px; }
.desk-identity-chips b { font-size:12px; }
.desk-collapse-button { width:40px; height:40px; flex-basis:40px; border-radius:13px; }
.desk-identity-card.is-compact { grid-template-columns:54px minmax(0,1fr); min-height:68px; }
.desk-identity-card.is-compact .desk-identity-avatar { width:54px; height:54px; border-radius:17px; }
.desk-sidebar-collapsed .desk-brand-row { align-items:center; padding-inline:0; }
.desk-sidebar-collapsed .desk-identity-card { min-height:42px; }

.workspace-account-menu { position:relative; z-index:60; }
.workspace-account-trigger { display:flex; align-items:center; gap:9px; min-height:42px; border:1px solid rgba(17,63,49,.08); border-radius:14px; padding:5px 8px 5px 5px; color:var(--ink); background:rgba(255,255,255,.5); cursor:pointer; box-shadow:inset 0 1px 0 rgba(255,255,255,.8); }
.workspace-account-trigger > span:not(.workspace-account-avatar) { display:grid; min-width:0; text-align:left; }
.workspace-account-trigger strong { max-width:150px; overflow:hidden; font-size:11px; text-overflow:ellipsis; white-space:nowrap; }
.workspace-account-trigger small { color:var(--quiet); font-size:9px; }
.workspace-account-avatar { display:grid; place-items:center; width:32px; height:32px; flex:0 0 32px; overflow:hidden; border:1px solid rgba(17,63,49,.1); border-radius:11px; color:#f8f2d9; background:var(--leaf); }
.workspace-account-avatar.is-large { width:46px; height:46px; flex-basis:46px; border-radius:15px; }
.workspace-account-avatar img { width:100%; height:100%; object-fit:cover; }
.workspace-account-avatar b { font-family:var(--display-serif); font-size:15px; }
.workspace-account-popover { position:absolute; z-index:80; top:calc(100% + 9px); right:0; width:min(330px,calc(100vw - 24px)); border:1px solid rgba(255,255,255,.82); border-radius:20px; padding:12px; background:rgba(248,249,245,.94); box-shadow:0 26px 70px rgba(18,48,38,.2),inset 0 1px 0 rgba(255,255,255,.9); backdrop-filter:blur(24px); }
.workspace-account-popover > header { display:flex; gap:11px; align-items:center; padding:4px 4px 12px; border-bottom:1px solid rgba(17,63,49,.08); }
.workspace-account-popover > header > div { display:grid; min-width:0; }
.workspace-account-popover header strong,.workspace-account-popover header span,.workspace-account-popover header small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.workspace-account-popover header strong { font-size:13px; }
.workspace-account-popover header span { color:var(--muted); font-size:10px; }
.workspace-account-popover header small { color:var(--quiet); font-size:9px; }
.workspace-identity-switch { display:grid; gap:6px; margin:11px 0; border-radius:13px; padding:10px; background:rgba(220,233,223,.46); }
.workspace-identity-switch > span { color:var(--quiet); font-size:9px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
.workspace-identity-switch select { width:100%; border:1px solid rgba(17,63,49,.1); border-radius:10px; padding:8px 9px; color:var(--ink); background:rgba(255,255,255,.75); }
.workspace-identity-switch button { justify-self:start; border:0; padding:0; color:var(--leaf); background:transparent; cursor:pointer; font-size:10px; }
.workspace-account-popover nav { display:grid; gap:3px; padding:4px 0; }
.workspace-account-popover nav a { display:flex; align-items:center; gap:9px; border-radius:11px; padding:9px 10px; color:var(--ink-soft); font-size:11px; }
.workspace-account-popover nav a:hover { color:var(--leaf); background:rgba(220,233,223,.55); }
.workspace-account-popover footer { display:flex; justify-content:flex-end; border-top:1px solid rgba(17,63,49,.08); padding-top:9px; }
.workspace-account-popover footer button { border:0; border-radius:999px; padding:7px 10px; color:#86503d; background:rgba(239,220,208,.55); cursor:pointer; }
.workspace-auth-actions { display:flex; align-items:center; gap:7px; }
.workspace-auth-actions a { border:1px solid rgba(17,63,49,.09); border-radius:12px; padding:9px 12px; color:var(--leaf); background:rgba(255,255,255,.46); font-size:11px; font-weight:650; }
.workspace-auth-actions a.is-primary { color:#fffaf0; background:var(--leaf); }
.workspace-auth-actions.is-compact a { padding:8px 10px; }
.workspace-account-loading { width:36px; height:36px; border-radius:12px; background:rgba(220,233,223,.52); animation:course-task-pulse 1.4s ease-in-out infinite; }
.public-header > .workspace-account-menu,.public-header > .workspace-auth-actions { margin-left:8px; }

.system-settings { display:grid; gap:14px; min-height:100%; }
.settings-page-head { border-bottom:1px solid rgba(17,63,49,.08); padding:4px 2px 16px; }
.settings-page-head span,.settings-section > header > span { color:var(--quiet); font-size:9px; font-weight:720; letter-spacing:.11em; text-transform:uppercase; }
.settings-page-head h2 { margin:5px 0 5px; font-family:var(--display-serif); font-size:30px; font-weight:600; }
.settings-page-head p,.settings-section > header p { margin:0; color:var(--muted); line-height:1.65; }
.settings-layout { display:grid; grid-template-columns:178px minmax(0,1fr); gap:18px; align-items:start; }
.settings-nav { position:sticky; top:0; display:grid; gap:3px; border-right:1px solid rgba(17,63,49,.08); padding:4px 14px 4px 0; }
.settings-nav button { border:0; border-radius:11px; padding:10px 11px; color:var(--muted); background:transparent; cursor:pointer; text-align:left; }
.settings-nav button:hover { color:var(--ink); background:rgba(255,255,255,.45); }
.settings-nav button[aria-current='page'] { color:var(--leaf); background:rgba(220,233,223,.66); box-shadow:inset 0 0 0 1px rgba(17,63,49,.06); }
.settings-content { min-width:0; }
.settings-section { display:grid; gap:16px; max-width:920px; border:0; padding:2px 0 30px; background:transparent; box-shadow:none; }
.settings-section > header { display:grid; gap:4px; padding-bottom:14px; border-bottom:1px solid rgba(17,63,49,.07); }
.settings-section > header h3 { margin:0; font-family:var(--display-serif); font-size:24px; font-weight:600; }
.settings-form { display:grid; gap:13px; }
.settings-form > label,.settings-form-grid > label,.member-row-fields label,.member-invite-form > label { display:grid; gap:6px; color:var(--muted); font-size:10px; }
.settings-form input,.settings-form select,.member-row-fields input,.member-row-fields select,.member-invite-form input { width:100%; min-height:42px; border:1px solid rgba(17,63,49,.1); border-radius:12px; padding:0 11px; color:var(--ink); background:rgba(255,255,255,.58); outline:none; }
.settings-form input:focus,.settings-form select:focus,.member-row-fields input:focus,.member-row-fields select:focus,.member-invite-form input:focus { border-color:rgba(17,63,49,.28); box-shadow:0 0 0 4px rgba(17,63,49,.06); background:rgba(255,255,255,.82); }
.settings-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.settings-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
.settings-actions button,.member-row footer button,.pending-invites button,.settings-inline-notice button { border:1px solid rgba(17,63,49,.09); border-radius:11px; padding:8px 11px; color:var(--leaf); background:rgba(255,255,255,.55); cursor:pointer; }
.settings-actions button.is-primary,.member-row footer button.is-primary { color:#fffaf0; background:var(--leaf); }
.member-row footer button.is-danger { color:#8a4b35; background:rgba(239,220,208,.55); }
.settings-message,.settings-inline-notice { margin:0; border-radius:12px; padding:10px 11px; color:var(--leaf); background:rgba(220,233,223,.48); font-size:10px; line-height:1.6; }
.settings-message.is-error,.settings-inline-notice.is-error { color:#8a4b35; background:rgba(239,220,208,.58); }
.settings-muted { color:var(--quiet); }
.settings-status-line { display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid rgba(17,63,49,.07); padding:0 0 12px; }
.settings-status-line b { color:#966a2b; font-size:11px; }
.settings-status-line b.is-ok { color:#2f7a5d; }
.settings-status-line span { color:var(--quiet); font-size:10px; }
.settings-profile-row { display:flex; align-items:center; gap:13px; border-bottom:1px solid rgba(17,63,49,.07); padding-bottom:15px; }
.settings-profile-avatar { display:grid; place-items:center; width:58px; height:58px; overflow:hidden; border-radius:18px; color:#fff8e6; background:var(--leaf); }
.settings-profile-avatar img { width:100%; height:100%; object-fit:cover; }
.settings-profile-row > div { display:grid; }
.settings-profile-row strong { font-size:15px; }
.settings-profile-row span,.settings-profile-row small { color:var(--muted); font-size:10px; }
.settings-definition-list { display:grid; gap:0; margin:0; }
.settings-definition-list div { display:grid; grid-template-columns:130px minmax(0,1fr); gap:14px; border-bottom:1px solid rgba(17,63,49,.06); padding:12px 0; }
.settings-definition-list dt { color:var(--quiet); font-size:10px; }
.settings-definition-list dd { margin:0; color:var(--ink-soft); font-size:11px; line-height:1.6; }
.system-connection-table { display:grid; }
.system-connection-table > div { display:flex; justify-content:space-between; align-items:center; gap:12px; border-bottom:1px solid rgba(17,63,49,.06); padding:11px 0; }
.settings-subsection { display:flex; align-items:center; justify-content:space-between; gap:18px; border-top:1px solid rgba(17,63,49,.07); padding-top:15px; }
.settings-subsection h4 { margin:0 0 4px; font-size:12px; }
.settings-subsection p { margin:0; color:var(--muted); font-size:10px; }

.member-invite-form { display:grid; gap:13px; border-bottom:1px solid rgba(17,63,49,.08); padding-bottom:18px; }
.member-permission-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
.member-permission-grid label { display:flex; align-items:flex-start; gap:8px; border:1px solid rgba(17,63,49,.06); border-radius:12px; padding:9px; background:rgba(255,255,255,.36); }
.member-permission-grid input { margin-top:2px; }
.member-permission-grid span { display:grid; }
.member-permission-grid b { font-size:10px; }
.member-permission-grid small { color:var(--quiet); font-size:9px; line-height:1.45; }
.member-list { display:grid; gap:9px; }
.member-row { display:grid; gap:13px; border:1px solid rgba(17,63,49,.08); border-radius:16px; padding:13px; background:rgba(255,255,255,.35); }
.member-row > header { display:grid; grid-template-columns:42px minmax(0,1fr) auto; align-items:center; gap:10px; }
.member-avatar { display:grid; place-items:center; width:42px; height:42px; overflow:hidden; border-radius:13px; color:#fff8e6; background:var(--leaf); }
.member-avatar img { width:100%; height:100%; object-fit:cover; }
.member-row header > div { display:grid; }
.member-row header strong { font-size:12px; }
.member-row header span { color:var(--muted); font-size:9px; }
.member-status { border-radius:999px; padding:5px 8px; color:var(--quiet); background:rgba(255,255,255,.55); font-size:9px; font-style:normal; }
.member-status.is-active { color:#2f7a5d; background:rgba(220,233,223,.62); }
.member-status.is-suspended { color:#8a4b35; background:rgba(239,220,208,.62); }
.member-row-fields { display:grid; grid-template-columns:1fr 180px; gap:10px; }
.member-row footer { display:flex; align-items:center; flex-wrap:wrap; gap:7px; }
.member-row footer span { color:var(--quiet); font-size:9px; }
.member-owner-note { margin:0; color:var(--muted); font-size:10px; }
.pending-invites { display:grid; gap:7px; border-top:1px solid rgba(17,63,49,.08); padding-top:14px; }
.pending-invites h4 { margin:0; font-size:12px; }
.pending-invites > div { display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:10px; border-bottom:1px solid rgba(17,63,49,.06); padding:8px 0; }
.pending-invites small { color:var(--quiet); }

/* Repair focus, publishing and writing action layout */
.focus-strip { position:relative; z-index:2; align-items:stretch; margin-bottom:4px; }
.focus-card { position:relative; height:auto; overflow:visible; }
.carry-strip { position:relative; z-index:1; margin:0; }
.today-lanes { position:relative; z-index:0; }
.publishing-head-actions,.publishing-actions,.writing-desk-actions { align-items:center; }
.publishing-head-actions .soft-button,.publishing-actions .soft-button,.writing-desk-actions .soft-button { display:inline-flex; align-items:center; justify-content:center; min-height:40px; line-height:1.2; white-space:nowrap; }
.publishing-note-row { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; }
.publishing-note-row > span { align-self:center; justify-self:end; white-space:nowrap; }
.publishing-index-list article { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; }
.publishing-index-list article > .course-row-actions { display:flex; align-items:center; justify-content:flex-end; gap:7px; }
.writing-desk-hero { align-items:center; }
.writing-desk-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }

@media (max-width:1100px) {
  .desk-layout { grid-template-columns:250px minmax(0,1fr); }
  .desk-identity-card { grid-template-columns:58px minmax(0,1fr); gap:10px; }
  .desk-identity-avatar { width:58px; height:58px; flex-basis:58px; border-radius:18px; }
  .desk-identity-clock strong { font-size:13px; }
  .desk-identity-clock time { font-size:12px; }
  .desk-identity-copy p { font-size:11px; }
  .desk-identity-chips span { padding:4px 6px; font-size:9px; }
}
@media (max-width:900px) {
  .settings-layout { grid-template-columns:1fr; }
  .settings-nav { position:static; display:flex; overflow:auto; border-right:0; border-bottom:1px solid rgba(17,63,49,.08); padding:0 0 9px; }
  .settings-nav button { flex:0 0 auto; }
  .workspace-account-trigger > span:not(.workspace-account-avatar) { display:none; }
  .workspace-account-trigger { padding:4px; }
}
@media (max-width:700px) {
  .settings-form-grid,.member-permission-grid,.member-row-fields { grid-template-columns:1fr; }
  .settings-definition-list div { grid-template-columns:1fr; gap:5px; }
  .settings-subsection,.settings-status-line { align-items:flex-start; flex-direction:column; }
  .member-row > header { grid-template-columns:42px minmax(0,1fr); }
  .member-status { grid-column:2; justify-self:start; }
  .publishing-head-actions,.publishing-actions,.writing-desk-actions { justify-content:flex-start; width:100%; }
  .publishing-note-row,.publishing-index-list article { grid-template-columns:1fr; }
  .publishing-note-row > span,.publishing-index-list article > .course-row-actions { justify-self:start; }
  .workspace-auth-actions a { padding:8px 9px; font-size:10px; }
}


/* Workspace polish: stable flow, compact permissions, profile settings and action alignment */
.desk-sidebar { grid-template-rows:auto auto minmax(0,1fr) auto; }
.desk-home-link {
  display:inline-flex;
  align-items:center;
  gap:6px;
  width:max-content;
  margin:0 2px 7px;
  border-radius:9px;
  padding:5px 7px;
  color:var(--quiet);
  font-size:9px;
  font-weight:650;
  text-decoration:none;
  transition:color .18s ease, background .18s ease, transform .18s ease;
}
.desk-home-link:hover { color:var(--leaf); background:rgba(255,255,255,.52); transform:translateY(-1px); }
.desk-sidebar-collapsed .desk-home-link { justify-self:center; margin-inline:0; padding:7px; }
.desk-sidebar-collapsed .desk-home-link span { display:none; }
.desk-mobile-drawer { grid-template-rows:auto auto minmax(0,1fr) auto; }
.desk-mobile-drawer > .desk-identity-card { margin:0 3px 10px; }
.desk-home-link.is-mobile { margin:0; }

/* The old carry strip duplicated overdue items and visually slipped between focus and lanes. */
.focus-strip,
.today-lanes,
.today-later-list { position:static; z-index:auto; }
.focus-strip { align-items:stretch; margin:0; }
.focus-card { position:relative; height:auto; overflow:visible; }
.today-lanes { margin-top:0; }

/* One authoritative action-row contract prevents links and buttons from drifting. */
.course-row-actions,
.writing-desk-actions,
.publishing-head-actions,
.publishing-actions,
.settings-actions,
.member-row footer,
.site-maintenance-actions {
  display:flex;
  align-items:center;
  flex-wrap:wrap;
  gap:8px;
  min-width:0;
}
.course-row-actions > a,
.course-row-actions > button,
.writing-desk-actions > a,
.writing-desk-actions > button,
.publishing-head-actions > a,
.publishing-head-actions > button,
.publishing-actions > a,
.publishing-actions > button,
.settings-actions > button,
.member-row footer > button {
  position:static !important;
  inset:auto !important;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  flex:0 0 auto;
  width:auto;
  min-width:0;
  min-height:38px;
  margin:0;
  line-height:1.2;
  white-space:nowrap;
  vertical-align:middle;
}
.publishing-index-list article {
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  min-height:92px;
}
.publishing-index-list article > div:first-child { min-width:0; }
.publishing-index-list article > .course-row-actions { align-self:center; justify-self:end; }
.writing-desk-hero { grid-template-columns:minmax(0,1fr) auto; align-items:center; }
.writing-desk-actions { align-self:center; justify-content:flex-end; }

/* Compact permission rows with an in-house switch instead of native giant blue boxes. */
.member-permission-block { display:grid; gap:10px; }
.member-permission-block > div:first-child { display:flex; align-items:baseline; justify-content:space-between; gap:12px; }
.member-permission-block > div:first-child strong { font-size:11px; }
.member-permission-block > div:first-child small { color:var(--quiet); font-size:9px; }
.member-permission-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
.member-permission-grid .member-permission-item {
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  gap:12px;
  min-height:64px;
  border:1px solid rgba(17,63,49,.07);
  border-radius:13px;
  padding:10px 11px;
  background:rgba(255,255,255,.34);
  cursor:pointer;
  transition:border-color .18s ease, background .18s ease, box-shadow .18s ease;
}
.member-permission-grid .member-permission-item:hover { border-color:rgba(17,63,49,.14); background:rgba(255,255,255,.54); }
.member-permission-grid .member-permission-item.is-enabled { border-color:rgba(38,103,78,.14); background:rgba(220,233,223,.42); }
.member-permission-grid .member-permission-copy { display:grid; gap:3px; min-width:0; }
.member-permission-grid .member-permission-copy b { color:var(--ink); font-size:11px; }
.member-permission-grid .member-permission-copy small { color:var(--quiet); font-size:9px; line-height:1.45; }
.member-permission-grid .permission-switch { position:relative; display:block; width:36px; height:21px; flex:0 0 36px; }
.member-permission-grid .permission-switch input { position:absolute; inset:0; width:100%; height:100%; margin:0; opacity:0; cursor:pointer; }
.member-permission-grid .permission-switch i {
  position:absolute;
  inset:0;
  border:1px solid rgba(17,63,49,.14);
  border-radius:999px;
  background:rgba(17,63,49,.08);
  transition:background .18s ease, border-color .18s ease;
  pointer-events:none;
}
.member-permission-grid .permission-switch i::after {
  content:'';
  position:absolute;
  top:2px;
  left:2px;
  width:15px;
  height:15px;
  border-radius:50%;
  background:#fff;
  box-shadow:0 2px 7px rgba(17,63,49,.16);
  transition:transform .18s ease;
}
.member-permission-grid .permission-switch input:checked + i { border-color:var(--leaf); background:var(--leaf); }
.member-permission-grid .permission-switch input:checked + i::after { transform:translateX(15px); }
.member-permission-grid .permission-switch input:focus-visible + i { box-shadow:0 0 0 4px rgba(17,63,49,.09); }
.member-permission-grid .permission-switch input:disabled + i { opacity:.45; }

/* Account profile editor stores only the remote image URL, never image bytes. */
.settings-profile-summary { display:flex; align-items:center; gap:13px; border-bottom:1px solid rgba(17,63,49,.07); padding-bottom:15px; }
.settings-profile-summary > div { display:grid; gap:2px; min-width:0; }
.settings-profile-summary strong { font-size:15px; }
.settings-profile-summary span,
.settings-profile-summary small { color:var(--muted); font-size:10px; }
.account-profile-form { max-width:720px; }
.account-profile-form label > small { color:var(--quiet); font-size:9px; line-height:1.55; }

/* Site status is intentionally read-only; safe maintenance actions stay editable. */
.system-connection-table > div > span:first-child { display:grid; gap:2px; }
.system-connection-table > div > span:first-child strong { color:var(--ink); font-size:11px; }
.system-connection-table > div > span:first-child small { color:var(--quiet); font-size:9px; }
.site-maintenance-actions { justify-content:flex-end; }

@media (max-width:700px) {
  .member-permission-grid { grid-template-columns:1fr; }
  .member-permission-block > div:first-child { align-items:flex-start; flex-direction:column; gap:3px; }
  .publishing-index-list article { grid-template-columns:1fr; }
  .publishing-index-list article > .course-row-actions { justify-self:start; }
  .writing-desk-hero { grid-template-columns:1fr; }
  .writing-desk-actions { justify-content:flex-start; }
}


/* Reading library: folders lead, documents follow. */
.reading-library { display:grid; gap:18px; }
.reading-library-head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding:4px 2px 2px; }
.reading-library-head h2 { margin:8px 0 6px; font-size:clamp(28px,3.2vw,42px); letter-spacing:-.04em; }
.reading-library-head p { margin:0; max-width:660px; color:var(--muted); line-height:1.7; }
.reading-library-head-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
.reading-library button,
.reading-library select,
.reading-library input,
.reading-library textarea { border:1px solid rgba(17,63,49,.12); border-radius:14px; background:rgba(255,255,255,.64); color:var(--ink); }
.reading-library button { padding:9px 13px; cursor:pointer; transition:transform .18s ease,background .18s ease,border-color .18s ease; }
.reading-library button:hover:not(:disabled) { transform:translateY(-1px); background:rgba(255,255,255,.88); border-color:rgba(17,63,49,.22); }
.reading-library button:disabled { opacity:.45; cursor:not-allowed; }
.reading-library .is-danger { color:#8f4d39; }
.reading-breadcrumbs { display:flex; flex-wrap:wrap; align-items:center; gap:5px; }
.reading-breadcrumbs button { padding:7px 10px; border-color:transparent; background:transparent; color:var(--muted); }
.reading-breadcrumbs button:not(:last-child)::after { content:' /'; margin-left:8px; color:rgba(17,63,49,.28); }
.reading-folder-strip { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
.reading-folder-card { min-width:0; }
.reading-folder-card > button { width:100%; min-height:158px; display:grid; align-content:start; justify-items:start; gap:7px; padding:18px; text-align:left; border-radius:24px; background:linear-gradient(145deg,rgba(255,255,255,.76),rgba(220,233,223,.38)); box-shadow:0 14px 34px rgba(24,63,50,.07); }
.reading-folder-card strong { font-size:17px; }
.reading-folder-card small { color:var(--muted); font-size:10px; }
.reading-folder-card p { margin:4px 0 0; color:var(--muted); font-size:11px; line-height:1.6; }
.reading-folder-icon { display:grid; place-items:center; width:38px; height:38px; border-radius:13px; background:rgba(24,63,50,.1); color:var(--leaf); font-size:14px; font-weight:700; }
.reading-folder-toolbar,
.reading-item-manage { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:10px; border:1px solid rgba(17,63,49,.08); border-radius:18px; background:rgba(255,255,255,.38); }
.reading-folder-toolbar label,
.reading-item-manage label { display:flex; align-items:center; gap:7px; color:var(--muted); font-size:10px; }
.reading-folder-toolbar select,
.reading-item-manage select { min-width:180px; padding:8px 10px; }
.reading-library .reading-workspace { margin-top:0; }
.reading-panel .reading-markdown { margin:20px 0; padding:20px; border-radius:20px; background:rgba(255,255,255,.42); border:1px solid rgba(17,63,49,.08); }
.reading-panel .reading-markdown h1,
.reading-panel .reading-markdown h2,
.reading-panel .reading-markdown h3 { letter-spacing:-.02em; }
.reading-panel .reading-markdown p,
.reading-panel .reading-markdown li { line-height:1.9; }
.reading-empty { min-height:180px; display:grid; place-items:center; border:1px dashed rgba(17,63,49,.14); border-radius:24px; color:var(--muted); background:rgba(255,255,255,.32); }

/* System settings are grouped by responsibility, not by implementation detail. */
.settings-page-head p { margin:7px 0 0; max-width:720px; color:var(--muted); line-height:1.7; }
.settings-nav-group { display:grid; gap:5px; }
.settings-nav-group + .settings-nav-group { margin-top:13px; padding-top:13px; border-top:1px solid rgba(17,63,49,.07); }
.settings-nav-group > span { padding:0 10px 3px; color:var(--quiet); font-size:9px; letter-spacing:.16em; text-transform:uppercase; }
.settings-stack { display:grid; gap:15px; }
.notion-sync-settings { display:flex; align-items:center; justify-content:space-between; gap:20px; }
.notion-sync-settings > div:first-child { max-width:570px; }
.notion-sync-settings h4 { margin:0 0 6px; }
.notion-sync-settings p { margin:0; color:var(--muted); font-size:11px; line-height:1.7; }
.settings-link-button { display:inline-flex; align-items:center; justify-content:center; border:1px solid rgba(17,63,49,.12); border-radius:14px; padding:9px 13px; background:rgba(255,255,255,.62); font-size:11px; }
.settings-link-button.is-primary { color:#fff; background:var(--leaf); }
.ai-usage-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
.ai-usage-summary article { display:grid; gap:4px; min-height:112px; padding:15px; border:1px solid rgba(17,63,49,.08); border-radius:18px; background:rgba(255,255,255,.45); }
.ai-usage-summary article > span { color:var(--muted); font-size:9px; letter-spacing:.1em; text-transform:uppercase; }
.ai-usage-summary strong { font-size:22px; }
.ai-usage-summary small { color:var(--quiet); font-size:9px; line-height:1.5; }
.ai-usage-table { display:grid; margin-top:14px; border:1px solid rgba(17,63,49,.08); border-radius:18px; overflow:hidden; }
.ai-usage-row { display:grid; grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(70px,.5fr)); align-items:center; gap:10px; padding:11px 14px; border-top:1px solid rgba(17,63,49,.06); font-size:10px; }
.ai-usage-row:first-child { border-top:0; }
.ai-usage-row.is-head { color:var(--muted); background:rgba(220,233,223,.34); }
.ai-usage-row > span:first-child { display:grid; gap:2px; min-width:0; }
.ai-usage-row strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ai-usage-row small { color:var(--quiet); }
.ai-pricing-grid { margin-top:10px; }

@media (max-width:980px) {
  .reading-folder-strip { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .ai-usage-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
}

@media (max-width:700px) {
  .reading-library-head { align-items:flex-start; flex-direction:column; }
  .reading-library-head-actions { justify-content:flex-start; }
  .reading-folder-strip { grid-template-columns:1fr; }
  .reading-folder-card > button { min-height:126px; }
  .reading-folder-toolbar,
  .reading-item-manage { align-items:stretch; flex-direction:column; }
  .reading-folder-toolbar label,
  .reading-item-manage label { align-items:stretch; flex-direction:column; }
  .reading-folder-toolbar select,
  .reading-item-manage select { width:100%; min-width:0; }
  .notion-sync-settings { align-items:flex-start; flex-direction:column; }
  .ai-usage-summary { grid-template-columns:1fr 1fr; }
  .ai-usage-row { grid-template-columns:minmax(0,1.4fr) repeat(3,54px); padding:10px; gap:5px; }
}


/* Reading library v2: page scrolls, folders lead, actions stay quiet. */
.desk-page-reading .desk-page-content { overflow:auto; }
.reading-library {
  position:relative;
  display:grid;
  align-content:start;
  gap:15px;
  min-height:100%;
  height:auto;
  overflow:visible;
  padding:2px 3px 18px 1px;
}
.reading-document-view { height:100%; min-height:0; grid-template-rows:auto minmax(0,1fr); overflow:hidden; }
.reading-document-view .reading-panel { height:100%; min-height:0; overflow:auto; }
.reading-library .reading-workspace { height:auto; min-height:0; }
.reading-folder-card,
.reading-file-list > article { position:relative; }
.reading-folder-card { min-height:0; }
.reading-folder-open,
.reading-file-open {
  width:100%;
  border:0 !important;
  background:transparent !important;
  box-shadow:none !important;
}
.reading-folder-open {
  display:grid !important;
  grid-template-columns:auto minmax(0,1fr);
  align-items:start;
  gap:12px !important;
  min-height:136px;
}
.reading-folder-open > span:last-child { display:grid; gap:5px; min-width:0; }
.reading-file-list {
  display:grid;
  border:1px solid rgba(17,63,49,.08);
  border-radius:22px;
  overflow:visible;
  background:rgba(255,255,255,.34);
}
.reading-file-list > header {
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:12px 15px;
  border-bottom:1px solid rgba(17,63,49,.07);
  color:var(--muted);
  font-size:10px;
}
.reading-file-list > article {
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  border-bottom:1px solid rgba(17,63,49,.06);
}
.reading-file-list > article:last-child { border-bottom:0; }
.reading-file-open {
  display:grid !important;
  grid-template-columns:38px minmax(0,1fr);
  align-items:start;
  gap:12px !important;
  padding:14px 16px !important;
  text-align:left;
}
.reading-file-open > span:last-child { display:grid; gap:4px; min-width:0; }
.reading-file-open strong { font-family:var(--display-serif); font-size:16px; font-weight:600; }
.reading-file-open small { color:var(--muted); font-size:10px; }
.reading-file-open p { display:-webkit-box; margin:2px 0 0; overflow:hidden; color:var(--muted); font-size:11px; line-height:1.6; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.reading-file-kind { display:grid; place-items:center; width:36px; height:36px; border-radius:12px; color:var(--leaf); background:rgba(220,233,223,.7); font-weight:700; }
.reading-action-menu { position:relative; z-index:7; align-self:start; margin:9px 9px 0 0; }
.reading-folder-card > .reading-action-menu { position:absolute; top:8px; right:5px; margin:0; }
.reading-more-button {
  width:34px;
  height:34px;
  display:grid;
  place-items:center;
  border-color:transparent !important;
  border-radius:50% !important;
  padding:0 !important;
  color:var(--muted);
  background:rgba(255,255,255,.42) !important;
  box-shadow:none !important;
  opacity:.42;
}
.reading-folder-card:hover .reading-more-button,
.reading-file-list article:hover .reading-more-button,
.reading-more-button[aria-expanded='true'] { opacity:1; background:rgba(255,255,255,.86) !important; }
.reading-action-popover {
  position:absolute;
  top:38px;
  right:0;
  z-index:30;
  display:grid;
  min-width:174px;
  padding:6px;
  border:1px solid rgba(17,63,49,.1);
  border-radius:15px;
  background:rgba(250,250,246,.96);
  box-shadow:0 18px 48px rgba(24,54,43,.16);
  backdrop-filter:blur(20px);
}
.reading-action-popover button {
  width:100%;
  border:0 !important;
  border-radius:10px !important;
  padding:9px 10px !important;
  text-align:left;
  background:transparent !important;
  box-shadow:none !important;
}
.reading-action-popover button:hover { background:rgba(17,63,49,.06) !important; transform:none !important; }
.reading-action-popover .is-danger { color:#974c3e; }
.reading-document-topbar {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}
.reading-document-topbar > button {
  border-color:transparent !important;
  background:transparent !important;
  color:var(--muted);
}
.reading-document-topbar .reading-action-menu { margin:0; }
.reading-library-status { position:sticky; bottom:4px; width:fit-content; margin:0 auto; border-radius:999px; padding:8px 12px; color:#fff; background:rgba(17,63,49,.9); box-shadow:0 12px 32px rgba(17,63,49,.18); font-size:10px; }

/* Native prompts are replaced by an in-page glass dialog. */
.reading-dialog-backdrop {
  position:fixed;
  inset:0;
  z-index:12000;
  display:grid;
  place-items:center;
  padding:20px;
  background:rgba(16,25,21,.32);
  backdrop-filter:blur(16px);
}
.reading-dialog {
  width:min(470px,100%);
  display:grid;
  gap:18px;
  border:1px solid rgba(255,255,255,.72);
  border-radius:26px;
  padding:22px;
  background:rgba(249,249,245,.94);
  box-shadow:0 34px 110px rgba(16,38,30,.26), inset 0 1px 0 rgba(255,255,255,.8);
}
.reading-dialog header span { color:var(--muted); font-size:9px; font-weight:700; letter-spacing:.15em; text-transform:uppercase; }
.reading-dialog h3 { margin:7px 0 0; font-family:var(--display-serif); font-size:27px; font-weight:600; }
.reading-dialog header p { margin:7px 0 0; color:var(--muted); font-size:12px; line-height:1.7; }
.reading-dialog label { display:grid; gap:7px; color:var(--muted); font-size:10px; }
.reading-dialog input,
.reading-dialog select { width:100%; min-height:44px; border:1px solid rgba(17,63,49,.13); border-radius:14px; padding:0 13px; color:var(--ink); background:rgba(255,255,255,.72); outline:none; }
.reading-dialog input:focus,
.reading-dialog select:focus { border-color:rgba(17,63,49,.3); box-shadow:0 0 0 4px rgba(17,63,49,.06); }
.reading-dialog footer { display:flex; justify-content:flex-end; gap:8px; }
.reading-dialog footer button { min-height:39px; border:1px solid rgba(17,63,49,.1); border-radius:12px; padding:0 15px; background:rgba(255,255,255,.65); }
.reading-dialog footer .is-primary { color:#fff; background:var(--leaf); }
.reading-dialog footer .is-danger { color:#fff; background:#934d40; }

/* Course automation and WeChat settings. */
.settings-check-row { display:flex !important; align-items:flex-start; gap:11px; border:1px solid rgba(17,63,49,.08); border-radius:16px; padding:12px; background:rgba(255,255,255,.38); }
.settings-check-row input { width:17px; height:17px; margin:2px 0 0; accent-color:var(--leaf); }
.settings-check-row > span { display:grid; gap:3px; }
.settings-check-row strong { color:var(--ink); font-size:12px; }
.settings-check-row small { color:var(--muted); font-size:10px; line-height:1.55; }
.course-model-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
.course-backfill-result { display:grid; gap:5px; border-radius:15px; padding:11px; background:rgba(220,233,223,.4); color:var(--muted); font-size:10px; }
.course-wechat-settings { display:grid; gap:12px; }
.deepseek-price-note { display:grid; gap:5px; margin-top:14px; border:1px solid rgba(17,63,49,.08); border-radius:16px; padding:12px; background:rgba(255,255,255,.38); }
.deepseek-price-note strong { font-size:11px; }
.deepseek-price-note span,
.deepseek-price-note small { color:var(--muted); font-size:9px; line-height:1.55; }

@media (max-width:700px) {
  .reading-library { overflow:auto; }
  .reading-document-view { overflow:auto; height:auto; }
  .reading-document-view .reading-panel { height:auto; overflow:visible; }
  .reading-file-list > article { grid-template-columns:minmax(0,1fr) 42px; }
  .reading-more-button { opacity:1; }
  .reading-dialog { border-radius:22px; padding:18px; }
  .course-model-grid { grid-template-columns:1fr; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior:auto !important; animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
}

    `}</style>
  )
}
