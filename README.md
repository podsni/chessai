# Chess Bot with Stockfish AI - Enhanced Edition

Chess bot yang dibangun menggunakan **chess.js** dan **Stockfish REST API** dengan **Bun.js** sebagai runtime. Aplikasi ini memungkinkan Anda bermain catur melawan AI Stockfish yang kuat, menganalisis posisi, dan mempelajari berbagai strategi catur. **Sekarang dengan fitur-fitur canggih dan pengalaman pengguna yang ditingkatkan!**

## 🚀 Fitur Utama

### ♟️ Core Chess Features

- **Play vs AI**: Bermain melawan Stockfish engine dengan berbagai tingkat kesulitan
- **Position Analysis**: Analisis posisi catur dengan evaluasi dan best move
- **Interactive Chess Board**: Papan catur interaktif dengan drag & drop
- **Move History**: Riwayat langkah dengan notasi algebris
- **Adjustable Depth**: Atur kedalaman analisis bot (1-15)
- **FEN Position Loading**: Load posisi dari string FEN
- **Real-time Evaluation**: Evaluasi posisi secara real-time

### 📱 Enhanced Mobile Experience

- **Mobile Responsive**: Desain yang optimal untuk semua ukuran layar
- **Touch-Friendly**: Interface yang dirancang untuk perangkat sentuh
- **Dynamic Board Sizing**: Board size otomatis menyesuaikan layar (landscape/portrait)
- **Haptic Feedback**: Getaran pada perangkat mobile untuk feedback yang lebih baik
- **Touch Gestures**: Tap to select dan tap to move yang intuitif
- **Smart Touch Handling**: Prevention of double-tap zoom dan enhanced touch interactions
- **Mobile Instructions**: Dynamic guidance untuk mobile users
- **PWA-Ready**: Optimizations untuk Progressive Web App experience

### 🔊 Audio & Feedback

- **Sound Effects**: Efek suara untuk gerakan, capture, check, dan game end
- **Haptic Feedback**: Getaran yang berbeda untuk berbagai jenis aksi
- **Visual Feedback**: Animasi dan transisi yang smooth
- **Error Handling**: Feedback audio dan haptic untuk invalid moves

### 💾 Game Management

- **Auto-Save**: Otomatis menyimpan permainan saat ini
- **Manual Save**: Simpan permainan dengan nama kustom
- **Load Games**: Muat permainan yang tersimpan kapan saja
- **Export/Import**: Export dan import data permainan
- **Storage Management**: Manajemen penyimpanan lokal yang efisien

### 📋 Real-time Data Display

- **Live FEN Display**: FEN string yang update real-time dengan copy functionality
- **Move Notation**: Algebraic notation untuk move terakhir dengan copy button
- **Position Breakdown**: Educational FEN format explanation
- **Mobile-Optimized**: Responsive display untuk semua ukuran layar

### ⚙️ Advanced Settings

- **Sound Control**: Toggle dan kontrol volume untuk efek suara
- **Haptic Control**: Enable/disable haptic feedback
- **Theme Options**: Pilihan tema (saat ini dark mode)
- **Board Preferences**: Orientasi papan dan pengaturan visual
- **Analysis Options**: Kontrol untuk analysis arrows dan auto-analysis

## 📱 Mobile Features

- **Responsive Layout**: Otomatis menyesuaikan dengan ukuran layar
- **Dynamic Board Sizing**: Board size menyesuaikan device (320px - 600px)
- **Touch Optimized**: Button dan kontrol yang ramah sentuhan (44px minimum)
- **Portrait & Landscape**: Mendukung orientasi potrait dan landscape
- **Compact UI**: Interface yang kompak untuk layar kecil
- **Smart Typography**: Font size yang responsive
- **Touch Feedback**: Visual feedback saat touch interaction
- **Performance Optimized**: Smooth scrolling dan animations

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React 19 + TypeScript + Vite
- **Chess Logic**: chess.js library
- **AI Engine**: Stockfish REST API
- **Runtime**: Bun.js
- **Styling**: CSS3 + Tailwind CSS dengan Advanced Responsive Design
- **Build Tool**: Vite dengan optimasi untuk mobile

## 📦 Instalasi

### Prasyarat

- Bun.js terinstall (https://bun.sh/)
- Node.js 18+ (untuk fallback)

### Langkah Instalasi

1. Clone atau navigate ke folder project:

```bash
cd chessbot-analysis
```

2. Install dependencies dengan Bun:

```bash
bun install
```

3. Jalankan development server:

```bash
bun run dev
# atau
bun start
```

4. Buka browser dan akses:

```
http://localhost:5173
```

## 🏗️ Build & Deployment

### Build dengan Bun

```bash
# Build untuk production
bun run build:bun

# Preview build result
bun run preview:bun

# Test build dan preview sekaligus
bun run test:build
```

### Build Output Optimized

```
dist/index.html                   0.97 kB │ gzip:  0.49 kB
dist/assets/index-CImwEP2L.css   25.54 kB │ gzip:  5.90 kB
dist/assets/chess-CaM438JE.js   136.40 kB │ gzip: 39.95 kB
dist/assets/index-DGlH2Hr0.js   204.57 kB │ gzip: 62.82 kB
```

### Build Scripts Available

- `bun start` - Menjalankan dev server
- `bun run build` - Build untuk production
- `bun run build:bun` - Build menggunakan Bun
- `bun run preview` - Preview build result
- `bun run preview:bun` - Preview dengan Bun
- `bun run test:build` - Build dan preview sekaligus

### Deploy ke Hosting

Files hasil build akan ada di folder `dist/`. Upload ke hosting static seperti:

- **Vercel** (Recommended untuk React apps)
- **Netlify**
- **GitHub Pages**
- **Cloudflare Pages**

## 🎮 Cara Menggunakan

### 💻 Desktop

- Board size: 400px - 600px (sesuai layar)
- Klik square untuk memilih piece
- Drag & drop pieces untuk move cepat
- Gunakan sidebar controls untuk pengaturan
- Hover effects untuk better UX

### 📱 Mobile & Tablet

- **Portrait Mode**: Board dan controls tersusun vertikal
- **Board Size Mobile**: 320px - 400px (auto-adjust)
- **Landscape Mode**: Board dan controls berdampingan
- **Touch Controls**: Tap piece kemudian tap tujuan
- **Touch Feedback**: Visual feedback saat interaction

### Fitur Umum

1. **Bermain vs AI**: Pilih "Play as White/Black" untuk mulai
2. **Analisis Posisi**: Klik "Analyze" untuk evaluasi posisi
3. **Load FEN**: Input FEN string untuk setup posisi khusus
4. **Game Modes**: Human vs AI, AI vs AI, Human vs Human

## 📱 Mobile Optimization Details

### Responsive Breakpoints & Board Sizes

- **Mobile Portrait** (< 480px): Board 320px, compact UI
- **Mobile Landscape** (480px - 768px): Board 400px, side-by-side layout
- **Tablet** (768px - 1024px): Board 500px, enhanced controls
- **Desktop** (> 1024px): Board 600px, full features

### Touch Improvements

- **Minimum button size**: 44px (iOS/Android standard)
- **Touch-friendly sliders**: Larger thumb (24px)
- **Touch feedback**: Scale animation (0.98x) on press
- **Hover effects**: Disabled untuk touch devices
- **Smooth scrolling**: -webkit-overflow-scrolling: touch

### Performance Mobile

- **Bundle splitting**: Vendor (11.73kB) + Chess (136.40kB) chunks
- **Lazy loading**: Components load on demand
- **CSS containment**: layout style paint untuk board
- **Animation optimization**: will-change transforms
- **Memory management**: Event listener cleanup

### UI/UX Improvements

- **Dynamic notation**: Hide pada board < 280px
- **Responsive typography**: 8px - 12px berdasarkan board size
- **Player indicators**: Animated pulse untuk current turn
- **Game status**: Clear visual feedback dengan icons
- **Turn counter**: Centered display dengan responsive text

## 🚀 Performance Tips

### Mobile Performance

- Gunakan WiFi untuk analysis yang kompleks
- Lower AI depth (5-8) untuk response cepat
- Disable auto-analysis untuk hemat baterai
- Tutup tab lain untuk performa optimal

### Desktop Performance

- AI depth 10-15 untuk gameplay terbaik
- Enable semua features tanpa khawatir
- Multiple tabs didukung

## 🔧 Konfigurasi

### Bot Settings

- **Depth**: 1-15 (default: 10)
  - 1-5: Pemula (cepat di mobile)
  - 6-10: Menengah
  - 11-15: Expert (mungkin lambat di mobile)

### Enhanced Settings

- **Sound Effects**: Enable/disable dengan test button tersedia
- **Haptic Feedback**: Control getaran pada mobile devices
- **Auto Analysis**: Direkomendasikan OFF untuk mobile (hemat baterai)
- **Analysis Arrows**: ON untuk visual learning
- **Board Notation**: Auto hide pada layar kecil
- **AI Depth**: Slider untuk mengatur kekuatan engine (1-15)

## 🎮 Enhanced User Experience

### Audio Feedback

- **Move Sound**: Suara pleasant untuk gerakan normal
- **Capture Sound**: Suara lebih dramatis untuk capture pieces
- **Check Alert**: Suara peringatan untuk situasi check
- **Game End**: Fanfare untuk akhir permainan
- **Error Sound**: Beep untuk invalid moves

### Haptic Feedback (Mobile)

- **Light Tap**: UI interactions
- **Medium Tap**: Piece selection
- **Strong Tap**: Captures
- **Success Pattern**: Valid moves
- **Error Pattern**: Invalid attempts
- **Check Pattern**: Check warnings
- **Game End Pattern**: Checkmate/draw

### Game Management

- **Auto-Save**: Setiap move otomatis disimpan
- **Manual Save**: Tombol save untuk menyimpan dengan nama
- **Load Menu**: Akses via settings untuk load saved games
- **Export Data**: JSON export untuk backup
- **Storage Info**: Monitor penggunaan storage

## 🔍 Troubleshooting

### Mobile Issues

- **Board terlalu kecil**: Rotate ke landscape atau zoom browser
- **Touch tidak responsif**: Refresh browser, pastikan modern browser
- **Slow performance**: Lower AI depth, disable analysis arrows
- **Layout broken**: Update browser, clear cache

### General Issues

- **API Issues**: Cek koneksi internet, tunggu jika rate limited
- **Build Errors**: Pastikan Bun terbaru, coba `bun install --force`

## 📚 Technical Details

### New Architecture (v2.2)

- **Error Boundaries**: Graceful error handling throughout the app
- **Service Architecture**: Modular services for sound, haptic, and storage
- **Enhanced Feedback**: Audio and haptic feedback systems
- **Game Management**: Advanced save/load with auto-save functionality
- **Settings System**: Persistent settings with real-time preview

### New Services

- **SoundManager**: Web Audio API untuk efek suara yang immersive
- **HapticManager**: Vibration API untuk mobile feedback yang contextual
- **GameStorage**: LocalStorage management dengan auto-save dan export/import
- **ErrorBoundary**: Component untuk graceful error recovery

### Build Optimization

```javascript
// vite.config.ts optimizations
- Code splitting (vendor, chess chunks)
- Asset organization by type
- Performance optimizations
- Error boundaries for stability
- ES2015 target untuk browser support
- Minification dengan esbuild
- Host configuration untuk mobile testing
```

### CSS Architecture

- **CSS Variables** untuk consistent theming
- **CSS Grid & Flexbox** untuk responsive layout
- **Media Queries** untuk device-specific styles
- **Touch-specific** styling dengan hover detection
- **Performance** containment dan will-change optimizations

### Component Architecture

```typescript
// Dynamic board sizing
const calculateBoardSize = () => {
  const screenWidth = window.innerWidth;
  if (screenWidth < 480) return Math.min(screenWidth * 0.95, 320);
  if (screenWidth < 768) return Math.min(screenWidth * 0.6, 400);
  if (screenWidth < 1024) return Math.min(screenWidth * 0.5, 500);
  return Math.min(screenWidth * 0.4, 600);
};
```

## 🤝 Kontribusi

Kontribusi sangat diterima! Terutama untuk:

1. **Mobile UX improvements**
2. **Performance optimizations**
3. **New responsive features**
4. **Cross-browser compatibility**

### Development Setup

```bash
# Fork repository
git clone your-fork-url
cd chessbot-analysis

# Install with Bun
bun install

# Start development
bun run dev

# Test mobile (dengan device emulation)
# atau akses dari mobile device di network yang sama
```

## 📄 Lisensi

Project ini menggunakan lisensi MIT. Lihat file LICENSE untuk detail.

## 👥 Credits

- **chess.js**: jhlywa/chess.js
- **react-chessboard**: Clariity/react-chessboard
- **Stockfish API**: stockfish.online
- **Bun.js**: oven-sh/bun
- **React**: facebook/react
- **Vite**: vitejs/vite
- **Tailwind CSS**: tailwindlabs/tailwindcss

## 🐛 Bug Reports

Laporkan bug melalui GitHub Issues dengan detail:

- **Device & Browser** (termasuk mobile device)
- **Screen size & orientation**
- **Steps to reproduce**
- **Screenshots** (sangat membantu untuk mobile issues)
- **Console error logs**

### Mobile Testing

- Test di berbagai device sizes
- Test portrait dan landscape mode
- Test touch interactions
- Performance testing di mobile networks

---

**Selamat bermain catur di semua device! 🎯♟️📱💻**

### Recent Updates ✨

#### v2.3 - Real-time FEN & Enhanced Mobile

- ✅ **Real-time FEN Display** - Live FEN dengan copy functionality
- ✅ **Move Notation Display** - Live algebraic notation dengan copy button
- ✅ **Enhanced Mobile Board** - Improved touch handling dengan haptic feedback
- ✅ **Smart Board Sizing** - Landscape/portrait optimized sizing
- ✅ **Mobile Touch Optimization** - Better touch interactions dan prevention of double-tap
- ✅ **Enhanced Mobile Instructions** - Dynamic mobile guidance
- ✅ **Improved CSS Mobile** - Touch-friendly styles dan PWA-ready optimizations

#### v2.2 - Enhanced Experience & Advanced Features

- ✅ **Audio Feedback System** - Sound effects untuk moves, captures, check, errors
- ✅ **Haptic Feedback** - Contextual vibration untuk mobile devices
- ✅ **Advanced Game Management** - Auto-save, manual save, load system
- ✅ **Enhanced Settings** - Sound/haptic controls, persistent settings
- ✅ **Error Boundaries** - Graceful error handling dan recovery
- ✅ **Service Architecture** - Modular services untuk better maintainability
- ✅ **Export/Import System** - Backup dan restore game data
- ✅ **Storage Management** - Smart storage dengan auto-cleanup
- ✅ **Performance Optimized** - Enhanced build dengan asset organization
- ✅ **Mobile Experience** - Improved touch feedback dan responsiveness

#### v2.1 - Mini Board Sync & Enhanced Mobile

- ✅ **Mini Board Orientation Sync** - Mini boards ikut flip dengan board utama
- ✅ **Dynamic Board Sizing** - Otomatis 320px-600px sesuai layar
- ✅ **Advanced Touch Controls** - 44px minimum, feedback animations
- ✅ **Smart UI Adaptation** - Typography, spacing, notifications responsive
- ✅ **Cross-Device Compatibility** - Konsisten di semua device
- ✅ **Bun.js Full Integration** - Build, dev, preview dengan Bun
