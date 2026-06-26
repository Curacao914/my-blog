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
}

.today-card-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.card-actions {
  display: flex;
  flex: 0 1 auto;
  min-width: 0;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 46%;
}

.focus-card .today-card-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: stretch;
}

.focus-card .card-actions {
  width: 100%;
  max-width: 100%;
  justify-content: flex-start;
}

.focus-card .card-title-button {
  display: block;
  inline-size: 100%;
  max-inline-size: 100%;
  flex-basis: auto;
  overflow-wrap: break-word;
  word-break: normal;
}

.card-title-button {
  flex: 1 1 14rem;
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
  }

  .today-card-head,
  .reading-panel-head {
    flex-direction: column;
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
  .notes-list {
    border-radius: 24px;
    padding: 14px;
  }
}

    `}</style>
  )
}
