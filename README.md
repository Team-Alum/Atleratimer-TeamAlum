# Atlera Timer — Focus Study Timer & Deep Work Dashboard

**Atlera Timer** is a premium, minimalist, distraction-free productivity and study timer application engineered for high-performance deep work sessions.

---

## ✨ Key Features & Architecture

- **Visual Fidelity**: Faithful recreation of the minimalist productivity dashboard with responsive two-column grid, custom SVG countdown timer, soft shadows, balanced typography, and teal/cyan accents.
- **Timestamp-Based Reliability**: Timer calculations are derived from exact epoch timestamp offsets rather than fragile raw intervals. Timer continues running with zero drift even when browser tabs are throttled or suspended in the background.
- **Full Pomodoro Cycle Engine**: Configurable sequence (Focus → Short Break → Long Break) with automatic session tracking, cycle indicators, and customizable intervals.
- **Synthesized Acoustics**:
  - Harmonic Tibetan meditation chime and crisp dual-beep alerts via Web Audio API.
  - Built-in generative ambient background sound (Gentle Rain, White Noise) with volume controls.
- **Interactive Analytics**:
  - Real-time **Today's Focus** metrics with daily goal progress bar.
  - **Your Rhythm** 7-day activity bar chart with day highlights and tooltips.
  - **Session Log** with live session indicators, completed history, and "View All" modal.
- **Comprehensive Views**:
  - `Focus Study Session`: Central dashboard with large circular timer, presets, and upcoming session cards.
  - `Customizable Time`: Sliders and numeric validators for Focus, Short Break, Long Break, Cycle count, and Auto-start toggles.
  - `Timer Customizations`: Theme switcher, sound selection, ambient noise generators, and reduced-motion preferences.
  - `Settings`: JSON export/import data portability, privacy controls, and local storage management.
- **Keyboard Shortcuts**:
  - <kbd>Space</kbd>: Pause or resume timer.
  - <kbd>Ctrl</kbd> + <kbd>R</kbd>: Reset current timer (with native refresh prevention).

---

## 🚀 Getting Started

### 1. Installation
```bash
cd atleratimer
npm install
```

### 2. Launch Development Server
```bash
npm run dev
```

### 3. Production Build & Preview
```bash
npm run build
npm run preview
```

---

## 🛠 Technology Stack

- **React 19**
- **Vite 8**
- **Lucide Icons**
- **Canvas-Confetti**
- **Web Audio API**
- **HTML5 Web Notification API**
- **LocalStorage V1 State Persistence**
