import { Elysia, t } from 'elysia'
import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'
import { Database } from 'bun:sqlite'
import { randomBytes } from 'crypto'

// --- 1. SETUP DATABASE (SQLite) ---
const db = new Database('fish_it.sqlite')

// Initialize Database
db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    roblox_user TEXT,
    service_type TEXT,
    item_name TEXT,
    price INTEGER,
    payment_method TEXT,
    proof_image TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT, -- TOPUP, JOKI, ITEM
    name TEXT,
    price INTEGER,
    description TEXT
  );
`)

// Add missing columns if DB was created before schema update
const ensureColumn = (table: string, column: string, definition: string) => {
  const info = db.query(`PRAGMA table_info(${table});`).all() as any[]
  const exists = info.some((c) => c.name === column)
  if (!exists) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${definition};`)
    console.log(`ℹ️ Added column ${column} to ${table}`)
  }
}

ensureColumn('orders', 'payment_method', 'payment_method TEXT')
ensureColumn('orders', 'proof_image', 'proof_image TEXT')

// Seed Initial Products if empty
const productCount = db.query('SELECT count(*) as count FROM products').get() as any
if (productCount.count === 0) {
  const seed = db.prepare('INSERT INTO products (category, name, price, description) VALUES ($cat, $name, $price, $desc)')
  seed.run({ $cat: 'TOPUP', $name: '1,000 Gems', $price: 10000, $desc: 'Instant delivery via gift' })
  seed.run({ $cat: 'TOPUP', $name: '5,000 Gems', $price: 45000, $desc: 'Bonus 500 Gems' })
  seed.run({ $cat: 'JOKI', $name: 'Level 1-50', $price: 25000, $desc: 'Proses 1 jam' })
  seed.run({ $cat: 'ITEM', $name: 'Aurora Rod', $price: 150000, $desc: 'Rare Item 0.5% chance' })
}

// --- 2. COMPONENTS & DESIGNS ---

const Head = (title: string) => `
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/hyperscript.org@0.9.12"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Outfit', sans-serif; }
      .glass {
        background: rgba(17, 24, 39, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
      }
      .glass-card {
        background: linear-gradient(145deg, rgba(31, 41, 55, 0.6) 0%, rgba(17, 24, 39, 0.8) 100%);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .gradient-text {
        background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #818cf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-size: 200% auto;
        animation: gradient 5s ease infinite;
      }
      @keyframes gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .animate-float { animation: float 6s ease-in-out infinite; }
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
        100% { transform: translateY(0px); }
      }
      .grid-bg {
        background-size: 40px 40px;
        background-image: linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #111827; }
      ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
      
      /* FAQ Animation & Logic */
      details summary::-webkit-details-marker { display: none; }
      details > summary { list-style: none; }
      details[open] summary ~ * { animation: fadeIn 0.3s ease-in-out; }
      details[open] summary svg { transform: rotate(180deg); }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  </head>
`

const Navbar = () => `
  <nav class="fixed w-full z-50 glass border-b border-white/5 bg-gray-950/80">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-20">
        <div class="flex-shrink-0 flex items-center gap-2">
            <span class="text-3xl">🎣</span>
            <a href="/" class="text-2xl font-extrabold text-white tracking-wider">
              FISH<span class="text-cyan-400">IT</span><span class="text-blue-500">.</span>
            </a>
        </div>
        <div class="hidden md:block">
          <div class="ml-10 flex items-baseline space-x-8">
            <a href="/#home" class="text-gray-300 hover:text-cyan-400 transition px-3 py-2 rounded-md text-sm font-medium">Home</a>
            <a href="/#features" class="text-gray-300 hover:text-cyan-400 transition px-3 py-2 rounded-md text-sm font-medium">Layanan</a>
            <a href="/#how-it-works" class="text-gray-300 hover:text-cyan-400 transition px-3 py-2 rounded-md text-sm font-medium">Cara Order</a>
            <a href="/track" class="text-gray-300 hover:text-cyan-400 transition px-3 py-2 rounded-md text-sm font-medium">Lacak Order</a>
            <a href="/#order" class="bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 transition px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-cyan-900/20">
              Order Sekarang
            </a>
          </div>
        </div>
      </div>
    </div>
  </nav>
`

const HeroSection = () => `
  <section id="home" class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gray-950 grid-bg">
    <div class="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full z-0 pointer-events-none">
      <div class="absolute top-20 left-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] mix-blend-screen animate-float"></div>
      <div class="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-float" style="animation-delay: 2s"></div>
    </div>
    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-cyan-500/30 text-cyan-400 text-sm font-semibold mb-8 animate-bounce delay-1000">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        Layanan Joki Roblox Tercepat #1 di Indonesia
      </div>
      <h1 class="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
        Kuasai Lautan Roblox <br>
        <span class="gradient-text">Tanpa Buang Waktu</span>
      </h1>
      <p class="mt-4 max-w-2xl mx-auto text-xl text-gray-400 mb-10 leading-relaxed">
        Solusi instan untuk mendapatkan <span class="text-cyan-200 font-bold">Rare Items</span>, <span class="text-cyan-200 font-bold">Max Level</span>, dan <span class="text-cyan-200 font-bold">Unlimited Gems</span>. 
        Aman, Legal, dan Bergaransi.
      </p>
      <div class="flex flex-col sm:flex-row justify-center gap-4 items-center">
        <a href="#order" class="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-10 rounded-full shadow-lg shadow-cyan-500/40 transition transform hover:-translate-y-1 hover:shadow-cyan-400/50 flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
           Gas Order Sekarang
        </a>
        <a href="/track" class="w-full sm:w-auto glass text-white font-semibold py-4 px-10 rounded-full hover:bg-white/5 transition flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
           Cek Status Order
        </a>
      </div>
      <div class="mt-16 pt-8 border-t border-white/5 flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition duration-500">
        <div class="flex items-center gap-3">
            <span class="text-cyan-400 p-2 bg-cyan-400/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </span> 
            <span class="font-bold text-white">Instant Process</span>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-blue-400 p-2 bg-blue-400/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </span>
            <span class="font-bold text-white">Anti-Hack Safe</span>
        </div>
        <div class="flex items-center gap-3">
             <span class="text-green-400 p-2 bg-green-400/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
             </span>
             <span class="font-bold text-white">Best Price Guarantee</span>
        </div>
      </div>
    </div>
  </section>
`

const StatsSection = () => `
  <section class="py-10 border-y border-white/5 bg-gray-900/30 backdrop-blur-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div>
          <div class="text-3xl md:text-5xl font-extrabold text-white mb-2">1.5K+</div>
          <div class="text-sm font-medium text-cyan-400 uppercase tracking-widest">Order Selesai</div>
        </div>
        <div>
          <div class="text-3xl md:text-5xl font-extrabold text-white mb-2">500+</div>
          <div class="text-sm font-medium text-blue-400 uppercase tracking-widest">Happy Clients</div>
        </div>
        <div>
          <div class="text-3xl md:text-5xl font-extrabold text-white mb-2">24/7</div>
          <div class="text-sm font-medium text-purple-400 uppercase tracking-widest">Support Aktif</div>
        </div>
        <div>
          <div class="text-3xl md:text-5xl font-extrabold text-white mb-2">100%</div>
          <div class="text-sm font-medium text-green-400 uppercase tracking-widest">Success Rate</div>
        </div>
      </div>
    </div>
  </section>
`

const FeaturesSection = () => `
  <section id="features" class="py-24 relative overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16 relative z-10">
        <h2 class="text-3xl md:text-5xl font-bold text-white mb-6">Kenapa <span class="gradient-text">Top Player</span> Pilih Kami?</h2>
        <p class="text-gray-400 max-w-2xl mx-auto text-lg">Jangan biarkan grinding membosankan menghambat progresmu. Biar kami yang urus sisanya.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        <div class="glass-card p-10 rounded-3xl hover:translate-y-[-10px] transition duration-300 group border-t-4 border-t-cyan-500">
          <div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-cyan-900/50 group-hover:scale-110 transition text-white">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <h3 class="text-2xl font-bold text-white mb-4">Pengerjaan Kilat</h3>
          <p class="text-gray-400 leading-relaxed">
            Sistem kami dirancang untuk eksekusi cepat. Begitu pembayaran masuk, tim kami langsung bergerak.
          </p>
        </div>

        <div class="glass-card p-10 rounded-3xl hover:translate-y-[-10px] transition duration-300 group border-t-4 border-t-blue-500">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-900/50 group-hover:scale-110 transition text-white">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3 class="text-2xl font-bold text-white mb-4">Keamanan Akun</h3>
          <p class="text-gray-400 leading-relaxed">
            Privasi loginmu aman. Kami menggunakan metode joki manual tanpa script berbahaya yang bisa memicu ban.
          </p>
        </div>

        <div class="glass-card p-10 rounded-3xl hover:translate-y-[-10px] transition duration-300 group border-t-4 border-t-purple-500">
          <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-purple-900/50 group-hover:scale-110 transition text-white">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/></svg>
          </div>
          <h3 class="text-2xl font-bold text-white mb-4">Harga Pelajar</h3>
          <p class="text-gray-400 leading-relaxed">
            Dapatkan item "Mythic" dengan harga jajan. Kami memberikan value terbaik untuk uangmu.
          </p>
        </div>
      </div>
    </div>
  </section>
`

const HowItWorksSection = () => `
  <section id="how-it-works" class="py-24 bg-gray-900 relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-20">
        <h2 class="text-3xl md:text-5xl font-bold text-white mb-6">Cara Order <span class="text-cyan-400">Mudah</span></h2>
        <p class="text-gray-400">Hanya 3 langkah mudah untuk upgrade akun kamu.</p>
      </div>

      <div class="relative">
        <div class="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-gray-800 via-cyan-900 to-gray-800 -translate-y-1/2 z-0"></div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
          <div class="bg-gray-950 border border-gray-800 p-8 rounded-3xl text-center relative hover:border-cyan-500 transition">
            <div class="w-16 h-16 bg-gray-800 border-4 border-gray-950 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto -mt-16 mb-6 relative z-20 shadow-xl">1</div>
            <h3 class="text-xl font-bold text-white mb-3">Pilih Paket</h3>
            <p class="text-gray-400 text-sm">Pilih layanan yang kamu butuhkan dan isi formulir lengkap.</p>
          </div>

          <div class="bg-gray-950 border border-gray-800 p-8 rounded-3xl text-center relative hover:border-blue-500 transition">
            <div class="w-16 h-16 bg-gray-800 border-4 border-gray-950 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto -mt-16 mb-6 relative z-20 shadow-xl">2</div>
            <h3 class="text-xl font-bold text-white mb-3">Lakukan Pembayaran</h3>
            <p class="text-gray-400 text-sm">Transfer sesuai nominal yang tertera ke rekening admin.</p>
          </div>

          <div class="bg-gray-950 border border-gray-800 p-8 rounded-3xl text-center relative hover:border-green-500 transition">
            <div class="w-16 h-16 bg-gray-800 border-4 border-gray-950 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto -mt-16 mb-6 relative z-20 shadow-xl">3</div>
            <h3 class="text-xl font-bold text-white mb-3">Konfirmasi WA</h3>
            <p class="text-gray-400 text-sm">Klik tombol konfirmasi WA, dan admin akan segera memproses orderanmu.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
`

const TestimonialSection = () => `
  <section class="py-24 bg-gray-950/50 overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 class="text-3xl font-bold text-center text-white mb-16">Apa Kata Mereka?</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass p-6 rounded-2xl relative">
          <div class="absolute -top-4 -left-4 text-6xl text-cyan-500/20">"</div>
          <p class="text-gray-300 mb-6 italic relative z-10">"Gila sih cepet banget, baru bayar ditinggal makan bentar udah kelar jokinya. Recommended parah!"</p>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500"></div>
            <div>
              <div class="font-bold text-white text-sm">Aldi_MancingMania</div>
              <div class="text-xs text-gray-500">Member sejak 2024</div>
            </div>
          </div>
        </div>

        <div class="glass p-6 rounded-2xl relative">
          <div class="absolute -top-4 -left-4 text-6xl text-cyan-500/20">"</div>
          <p class="text-gray-300 mb-6 italic relative z-10">"Awalnya ragu tapi ternyata amanah. Item Mythic nya beneran dapet murah banget dibanding toko sebelah."</p>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            <div>
              <div class="font-bold text-white text-sm">SultanRoblox88</div>
              <div class="text-xs text-gray-500">Member sejak 2024</div>
            </div>
          </div>
        </div>

        <div class="glass p-6 rounded-2xl relative">
          <div class="absolute -top-4 -left-4 text-6xl text-cyan-500/20">"</div>
          <p class="text-gray-300 mb-6 italic relative z-10">"Adminnya ramah dan fast respon. Bakal langganan terus disini sih fix."</p>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <div>
              <div class="font-bold text-white text-sm">GamingSantuy</div>
              <div class="text-xs text-gray-500">Member sejak 2024</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
`

const FAQSection = () => `
  <section class="py-20 bg-gray-900/30 border-t border-white/5">
     <div class="max-w-3xl mx-auto px-4">
        <h2 class="text-2xl font-bold text-white text-center mb-10">Frequently Asked Questions</h2>
        <div class="space-y-4">
          <details class="bg-gray-950 border border-gray-800 rounded-xl p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:border-cyan-500/50">
            <summary class="flex justify-between items-center font-medium text-gray-200 hover:text-cyan-400 transition">
              Berapa lama proses joki?
              <span class="transition-transform duration-300">
                <svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
              </span>
            </summary>
            <p class="text-gray-400 mt-4 leading-relaxed">
              Rata-rata order diproses dalam 10-60 menit tergantung antrian. Untuk joki level max bisa memakan waktu 1-2 hari.
            </p>
          </details>

          <details class="bg-gray-950 border border-gray-800 rounded-xl p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:border-cyan-500/50">
            <summary class="flex justify-between items-center font-medium text-gray-200 hover:text-cyan-400 transition">
              Apakah support pembayaran E-Wallet?
              <span class="transition-transform duration-300">
                <svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
              </span>
            </summary>
            <p class="text-gray-400 mt-4 leading-relaxed">
              Ya! Kami menerima Dana, OVO, Gopay, ShopeePay dan Transfer Bank BCA.
            </p>
          </details>
        </div>
     </div>
  </section>
`

// Fetch products for dropdown using simple manual query inside component (in real app, pass data)
const getProductsOptions = () => {
    const products = db.query('SELECT * FROM products ORDER BY category, price ASC').all() as any[]
    const grouped: Record<string, any[]> = {}
    products.forEach(p => {
        if(!grouped[p.category]) grouped[p.category] = []
        grouped[p.category].push(p)
    })
    
    let html = '<option value="">-- Pilih Paket --</option>'
    for(const [cat, list] of Object.entries(grouped)) {
        html += `<optgroup label="${cat}">`
        list.forEach(p => {
            html += `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}">${p.name} - Rp${p.price.toLocaleString('id-ID')}</option>`
        })
        html += `</optgroup>`
    }
    return html
}

const generateCSRFToken = () => randomBytes(32).toString('hex')

const OrderFormSection = () => `
  <section id="order" class="py-24 relative bg-gray-900/50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-extrabold text-white mb-4">Buat Pesanan <span class="gradient-text">Sekarang</span></h2>
        <p class="text-gray-400 max-w-2xl mx-auto">Isi form di bawah untuk membuat order. Data akan langsung masuk ke admin panel kami.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Form Section -->
        <div class="lg:col-span-2">
          <div class="glass rounded-3xl p-8 md:p-10 border border-cyan-500/20 space-y-6">
        
            <form
              hx-post="/orders"
              enctype="multipart/form-data"
              hx-target="#form-response"
              hx-swap="innerHTML"
              hx-on::after-request="if(event.detail.successful){this.reset();const p=document.getElementById('price-input');if(p)p.value='0';const h=document.getElementById('item_name_input');if(h)h.value='';}"
              class="space-y-6"
              id="order-form">
              <!-- Customer Name -->
              <div>
                <label class="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-cyan-400" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Nama Lengkap
                </label>
                <input type="text" name="customer_name" id="customer_name" class="w-full bg-gray-900/50 border border-gray-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-4 py-3 text-white outline-none transition" placeholder="Contoh: Muhammad Rizki" required>
                <small class="text-gray-500 mt-1 block">Nama yang muncul di admin panel</small>
              </div>

              <!-- Roblox Username -->
              <div>
                <label class="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-cyan-400" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h2"/><path d="M8 12v2"/><path d="M15 13h2"/><path d="M16 12v2"/></svg>
                    Username Roblox
                </label>
                <input type="text" name="roblox_user" id="roblox_user" class="w-full bg-gray-900/50 border border-gray-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-4 py-3 text-white outline-none transition" placeholder="Contoh: FishingPro_99" required>
                <small class="text-gray-500 mt-1 block">Username akun Roblox kamu</small>
              </div>

              <!-- Package Selection -->
              <div>
                <label class="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-cyan-400" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-9"/></svg>
                    Pilih Paket
                </label>
                <div class="relative">
                  <select name="product_id" id="product_select" class="w-full bg-gray-900/50 border border-gray-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-4 py-3 text-white outline-none transition appearance-none cursor-pointer" required>
                    ${getProductsOptions()}
                    <optgroup label="Custom">
                      <option value="CUSTOM" data-price="0" data-name="Custom Request">Request Custom (Chat Admin)</option>
                    </optgroup>
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                </div>
                <input type="hidden" name="item_name" id="item_name_input">
              </div>

              <!-- Payment Method -->
              <div>
                <label class="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-cyan-400" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    Metode Pembayaran
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label class="cursor-pointer group">
                    <input type="radio" name="payment_method" value="BCA" class="peer sr-only" required>
                    <div class="bg-gray-900/50 border-2 border-gray-700 peer-checked:border-green-500 peer-checked:bg-green-500/10 p-4 rounded-xl text-center transition group-hover:border-green-500/50">
                      <div class="mb-2 flex justify-center text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="21" width="18" height="2"/><rect x="9" y="8" width="6" height="10"/><path d="M5 21V7"/><path d="M19 21V7"/><path d="M2 7h20"/><path d="M12 2 2 7h20L12 2z"/></svg>
                      </div>
                      <div class="font-bold text-white text-sm">BCA</div>
                      <div class="text-xs text-gray-500 mt-1">1234-5678-90</div>
                    </div>
                  </label>
                  <label class="cursor-pointer group">
                    <input type="radio" name="payment_method" value="DANA" class="peer sr-only">
                    <div class="bg-gray-900/50 border-2 border-gray-700 peer-checked:border-blue-500 peer-checked:bg-blue-500/10 p-4 rounded-xl text-center transition group-hover:border-blue-500/50">
                      <div class="mb-2 flex justify-center text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                      </div>
                      <div class="font-bold text-white text-sm">DANA</div>
                      <div class="text-xs text-gray-500 mt-1">0812-3456-7890</div>
                    </div>
                  </label>
                  <label class="cursor-pointer group">
                    <input type="radio" name="payment_method" value="GOPAY" class="peer sr-only">
                    <div class="bg-gray-900/50 border-2 border-gray-700 peer-checked:border-orange-500 peer-checked:bg-orange-500/10 p-4 rounded-xl text-center transition group-hover:border-orange-500/50">
                      <div class="mb-2 flex justify-center text-white">
                         <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                      </div>
                      <div class="font-bold text-white text-sm">GOPAY</div>
                      <div class="text-xs text-gray-500 mt-1">0812-3456-7890</div>
                    </div>
                  </label>
                </div>
              </div>

              <input type="hidden" name="price" id="price-input" value="0">
              
              <!-- Submit Button -->
              <button type="submit" class="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-900/40 transition transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
                Buat Order Sekarang
              </button>
            </form>
            <div id="form-response" class="mt-6"></div>
            <script>
              document.addEventListener('htmx:afterRequest', (evt) => {
                if (evt.target && evt.target.id === 'order-form' && evt.detail.successful) {
                  const form = evt.target as HTMLFormElement
                  form.reset()
                  const setText = (id: string, value: string) => {
                    const el = document.getElementById(id)
                    if (el) el.textContent = value
                  }
                  setText('preview_name', '-');
                  setText('preview_roblox', '-');
                  setText('preview_package', '-');
                  setText('preview_method', '-');
                  setText('preview_price', 'Rp0');
                  const priceInput = document.getElementById('price-input') as HTMLInputElement | null
                  if (priceInput) priceInput.value = '0'
                  const hiddenItem = document.getElementById('item_name_input') as HTMLInputElement | null
                  if (hiddenItem) hiddenItem.value = ''
                }
              })
            </script>
          </div>
        </div>

        <!-- Live Preview Section -->
        <div class="lg:col-span-1">
          <div class="glass rounded-3xl p-8 border border-cyan-500/20 sticky top-24">
            <h3 class="text-lg font-bold text-white mb-6">📋 Preview Order</h3>
            
            <div class="space-y-4 text-sm">
              <!-- Name Preview -->
              <div class="bg-gray-900/50 rounded-lg p-3">
                <div class="text-gray-500 text-xs uppercase mb-1">Nama</div>
                <div class="text-white font-semibold" id="preview_name">-</div>
              </div>

              <!-- Roblox User Preview -->
              <div class="bg-gray-900/50 rounded-lg p-3">
                <div class="text-gray-500 text-xs uppercase mb-1">Akun Roblox</div>
                <div class="text-white font-semibold" id="preview_roblox">-</div>
              </div>

              <!-- Package Preview -->
              <div class="bg-gray-900/50 rounded-lg p-3">
                <div class="text-gray-500 text-xs uppercase mb-1">Paket</div>
                <div class="text-white font-semibold" id="preview_package">-</div>
              </div>

              <!-- Payment Method Preview -->
              <div class="bg-gray-900/50 rounded-lg p-3">
                <div class="text-gray-500 text-xs uppercase mb-1">Metode Bayar</div>
                <div class="text-white font-semibold" id="preview_method">-</div>
              </div>

              <!-- Separator -->
              <div class="border-t border-gray-700 my-4"></div>

              <!-- Price Preview -->
              <div class="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-lg p-4 border border-cyan-500/30">
                <div class="text-gray-400 text-xs uppercase mb-2">Total Harga</div>
                <div class="text-3xl font-bold text-cyan-400" id="preview_price">Rp0</div>
              </div>

              <!-- Info -->
              <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div class="text-xs text-blue-300">✓ Data akan langsung masuk ke admin panel</div>
                <div class="text-xs text-blue-300 mt-1">✓ Admin akan segera memproses order kamu</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      const customerNameInput = document.getElementById('customer_name');
      const robloxUserInput = document.getElementById('roblox_user');
      const productSelect = document.getElementById('product_select');
      const paymentMethodInputs = document.querySelectorAll('input[name="payment_method"]');
      const priceInput = document.getElementById('price-input');
      const itemNameInput = document.getElementById('item_name_input');
      const orderForm = document.getElementById('order-form');

      // Preview elements
      const previewName = document.getElementById('preview_name');
      const previewRoblox = document.getElementById('preview_roblox');
      const previewPackage = document.getElementById('preview_package');
      const previewMethod = document.getElementById('preview_method');
      const previewPrice = document.getElementById('preview_price');

      // Update preview function
      function updatePreview() {
        previewName.textContent = customerNameInput.value || '-';
        previewRoblox.textContent = robloxUserInput.value || '-';
        
        const selectedOption = productSelect.options[productSelect.selectedIndex];
        const packageName = selectedOption.getAttribute('data-name') || '-';
        const price = parseInt(selectedOption.getAttribute('data-price') || '0');
        previewPackage.textContent = packageName;
        previewPrice.textContent = 'Rp' + price.toLocaleString('id-ID');
        
        priceInput.value = price;
        itemNameInput.value = packageName;
      }

      function updateMethodPreview() {
        const selected = document.querySelector('input[name="payment_method"]:checked');
        previewMethod.textContent = selected ? selected.value : '-';
      }

      customerNameInput.addEventListener('input', updatePreview);
      robloxUserInput.addEventListener('input', updatePreview);
      productSelect.addEventListener('change', updatePreview);
      paymentMethodInputs.forEach(input => {
        input.addEventListener('change', updateMethodPreview);
      });

      orderForm.addEventListener('htmx:beforeRequest', function(e) {
        let valid = true;
        let errorMsg = '';
        
        if (!customerNameInput.value.trim()) {
          valid = false;
          errorMsg = '⚠️ Nama tidak boleh kosong';
        } else if (!robloxUserInput.value.trim()) {
          valid = false;
          errorMsg = '⚠️ Username Roblox tidak boleh kosong';
        } else if (!productSelect.value) {
          valid = false;
          errorMsg = '⚠️ Pilih paket terlebih dahulu';
        } else if (!document.querySelector('input[name="payment_method"]:checked')) {
          valid = false;
          errorMsg = '⚠️ Pilih metode pembayaran';
        }
        
        if (!valid) {
          e.preventDefault();
          alert(errorMsg);
        }
      });

      orderForm.addEventListener('htmx:afterSwap', function(e) {
        if (document.getElementById('form-response').innerText.includes('Berhasil')) {
          setTimeout(() => {
            orderForm.reset();
            updatePreview();
            updateMethodPreview();
          }, 2000);
        }
      });

      updatePreview();
      updateMethodPreview();
    </script>
  </section>
`

const Footer = () => `
  <footer class="bg-gray-950 border-t border-white/5 pt-12 pb-8 text-center">
    <p class="text-gray-600 text-sm">&copy; ${new Date().getFullYear()} Fish It Store.</p>
    <a href="/login" class="text-gray-800 hover:text-gray-600 text-xs mt-4 inline-block">Admin Access</a>
  </footer>
`

// --- 3. ELYSIA APPLICATION ---

const app = new Elysia()
  .use(staticPlugin())
  .use(html())
  .decorate('db', db)

  // --- PUBLIC ROUTES ---
  // RENDER COMPLETE PAGE WITH RICH SECTIONS
  .get('/', () => `
    <!DOCTYPE html>
    <html lang="id" class="scroll-smooth">
      ${Head('Fish It - Jasa Joki & Top Up Terpercaya')}
      <body class="bg-gray-950 text-gray-100 min-h-screen antialiased select-none">
        ${Navbar()}
        ${HeroSection()}
        ${StatsSection()}
        ${FeaturesSection()}
        ${HowItWorksSection()}
        ${TestimonialSection()}
        ${OrderFormSection()}
        ${FAQSection()}
        ${Footer()}
      </body>
    </html>
  `)
  
  .get('/track', () => `<!DOCTYPE html><html lang="id">${Head('Lacak Pesanan')}<body class="bg-gray-950 text-gray-100 min-h-screen antialiased">${Navbar()}<div class="min-h-screen pt-40 px-4 max-w-3xl mx-auto"><div class="text-center mb-10"><h1 class="text-3xl font-bold text-white">Lacak Pesanan</h1></div><div class="glass p-8 rounded-2xl"><input type="text" name="roblox_user" hx-post="/track/search" hx-target="#track-results" hx-trigger="keyup changed delay:500ms" class="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-white outline-none" placeholder="Username Roblox..." autofocus></div><div id="track-results" class="space-y-4 mt-8"></div></div>${Footer()}</body></html>`)

  .post('/track/search', ({ db, body }) => {
    const user = body.roblox_user
    if (!user || user.length < 3) return '<div class="text-center text-gray-500">Masukkan minimal 3 karakter</div>'
    const orders = db.query('SELECT * FROM orders WHERE roblox_user LIKE $user ORDER BY id DESC').all({ $user: `%${user}%` }) as any[]
    if (orders.length === 0) return `<div class="text-center text-gray-500 py-8">Tidak ada data untuk "${user}"</div>`
    return orders.map(order => `
      <div class="glass p-4 rounded-xl flex items-center justify-between border-l-4 ${order.status === 'Done' ? 'border-l-green-500' : 'border-l-yellow-500'}">
        <div><div class="font-bold text-white">${order.item_name}</div><div class="text-xs text-gray-400">ID: ${order.id} • ${new Date(order.created_at).toLocaleDateString('id-ID')}</div></div>
        <div class="text-sm font-bold ${order.status==='Done'?'text-green-400':'text-yellow-400'}">${order.status}</div>
      </div>
    `).join('')
  }, { body: t.Object({ roblox_user: t.String() }) })

  .get('/login', ({ cookie: { auth }, cookie: { csrf } }) => {
    if (auth.value) return Response.redirect('/dashboard')
    const csrfToken = generateCSRFToken()
    csrf.set({ value: csrfToken, httpOnly: true, sameSite: 'strict' })
    return `<!DOCTYPE html><html lang="id">${Head('Login Admin')}<body class="bg-gray-950 flex items-center justify-center min-h-screen"><div class="w-full max-w-sm p-8 bg-gray-900 rounded-2xl border border-gray-800"><h1 class="text-2xl font-bold text-white text-center mb-6">Login Admin</h1><form method="post" action="/login"><input type="hidden" name="csrf_token" value="${csrfToken}"><input type="password" name="password" class="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-white mb-4" placeholder="Password" required><button class="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg">Masuk</button></form></div></body></html>`
  })

  .post('/login', ({ body, cookie: { auth, csrf } }) => {
    // Verify CSRF token
    if (!csrf.value || csrf.value !== body.csrf_token) {
      return { status: 403, body: 'CSRF token invalid' }
    }
    
    // Use hashed password (store: $2a$10$YourHashedPasswordHere)
    // For demo: hashed 'admin123' - in production use proper environment variable
    const adminPasswordHash = '$2a$10$vI8aWBYW2Asset9DpaRBLuQWQPS5rWO0W5/PgG8Du6.tnWHe6KTHO' // bcrypt hash of 'admin123'
    
    // Verify password (using simple string comparison for demo, use bcrypt.compare in production)
    if (body.password !== 'admin123') {
      return Response.redirect('/login?error=invalid')
    }
    
    auth.set({ value: 'true', httpOnly: true, maxAge: 86400 })
    csrf.remove()
    return Response.redirect('/dashboard')
  }, { body: t.Object({ password: t.String(), csrf_token: t.String() }) })

  .get('/logout', ({ cookie: { auth } }) => { auth.remove(); return Response.redirect('/login') })

  // --- ADMIN ROUTES ---
  .guard({ beforeHandle: ({ cookie: { auth } }) => { if (!auth.value) return Response.redirect('/login') } }, (app) => app
      .get('/dashboard', ({ db }) => {
        // 📊 1. Analytics Calculations
        const stats = db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status != 'Cancelled' THEN price ELSE 0 END) as revenue,
                SUM(CASE WHEN status = 'Pending' OR status = 'Processing' THEN 1 ELSE 0 END) as active
            FROM orders
        `).get() as any

        return `
        <!DOCTYPE html>
        <html lang="id">
          ${Head('Admin Dashboard')}
          <body class="bg-gray-950 text-gray-100 min-h-screen font-sans selection:bg-cyan-500/30 grid-bg">
            
            <!-- Navbar Admin -->
            <nav class="glass border-b border-white/5 sticky top-0 z-50">
              <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-900/50">A</div>
                   <span class="font-bold text-xl tracking-wide">Admin<span class="text-cyan-400">Panel</span></span>
                </div>
                <div class="flex gap-4">
                    <a href="/" target="_blank" class="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm font-medium">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                        View Site
                    </a>
                    <a href="/logout" class="flex items-center gap-2 text-red-400 hover:text-red-300 transition text-sm font-medium bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/50 hover:border-red-500/50">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                        Logout
                    </a>
                </div>
              </div>
            </nav>

            <div class="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
              
              <!-- � Stats Cards -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <!-- Revenue -->
                 <div class="glass p-6 rounded-2xl border-t-4 border-t-green-500 relative overflow-hidden group">
                    <div class="absolute -right-6 -top-6 w-32 h-32 bg-green-500/10 rounded-full group-hover:scale-150 transition duration-700"></div>
                    <div class="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Total Revenue</div>
                    <div class="text-4xl font-extrabold text-white">Rp${(stats.revenue || 0).toLocaleString('id-ID')}</div>
                 </div>

                 <!-- Active Orders -->
                 <div class="glass p-6 rounded-2xl border-t-4 border-t-cyan-500 relative overflow-hidden group">
                    <div class="absolute -right-6 -top-6 w-32 h-32 bg-cyan-500/10 rounded-full group-hover:scale-150 transition duration-700"></div>
                    <div class="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Active Orders</div>
                    <div class="text-4xl font-extrabold text-white">${stats.active || 0}</div>
                 </div>

                 <!-- Total Orders -->
                 <div class="glass p-6 rounded-2xl border-t-4 border-t-purple-500 relative overflow-hidden group">
                    <div class="absolute -right-6 -top-6 w-32 h-32 bg-purple-500/10 rounded-full group-hover:scale-150 transition duration-700"></div>
                    <div class="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Total Orders</div>
                    <div class="text-4xl font-extrabold text-white">${stats.total || 0}</div>
                 </div>
              </div>

              <!-- 🛠 Controls & Table -->
              <div class="glass rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                
                <!-- Toolbar -->
                <div class="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4 items-center bg-gray-900/50">
                   <h2 class="text-xl font-bold text-white flex items-center gap-2">
                      <span class="text-2xl">📦</span> Order Management
                   </h2>
                   
                   <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <!-- Search -->
                      <div class="relative group">
                        <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                        <input 
                            type="text" 
                            name="search" 
                            placeholder="Cari Order ID / Username..." 
                            class="bg-gray-950/50 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white w-full md:w-64 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                            hx-get="/orders/rows" 
                            hx-trigger="keyup changed delay:500ms" 
                            hx-target="#table-body"
                            hx-include="[name='status']"
                        >
                      </div>

                      <!-- Filter -->
                      <select 
                        name="status" 
                        class="bg-gray-950/50 border border-gray-700 rounded-xl py-2.5 px-4 text-sm text-white focus:border-cyan-500 outline-none cursor-pointer hover:bg-gray-900 transition"
                        hx-get="/orders/rows"
                        hx-trigger="change"
                        hx-target="#table-body"
                        hx-include="[name='search']"
                      >
                         <option value="">All Status</option>
                         <option value="Pending">🕒 Pending</option>
                         <option value="Processing">⚡ Processing</option>
                         <option value="Done">✅ Done</option>
                         <option value="Cancelled">❌ Cancelled</option>
                      </select>
                      
                      <a href="/dashboard/products" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/30 transition flex items-center gap-2">
                        <span>📦</span> Products
                      </a>
                   </div>
                </div>

                <!-- Table -->
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                      <thead class="bg-gray-950/50 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                            <th class="p-5">ID & Time</th>
                            <th class="p-5">Customer</th>
                            <th class="p-5">Item Details</th>
                            <th class="p-5">Payment</th>
                            <th class="p-5">Status</th>
                            <th class="p-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody id="table-body" hx-get="/orders/rows" hx-trigger="load" class="divide-y divide-gray-800/50">
                        <!-- Rows loaded via HTMX -->
                      </tbody>
                    </table>
                </div>
              </div>

            </div>
          </body>
        </html>
        `
      })

      // --- PRODUCT MANAGEMENT ---
      .get('/dashboard/products', () => `
        <!DOCTYPE html>
        <html lang="id">
          ${Head('Manage Products')}
          <body class="bg-gray-950 text-gray-100 min-h-screen font-sans selection:bg-cyan-500/30 grid-bg">
            
            <!-- Navbar Admin -->
            <nav class="glass border-b border-white/5 sticky top-0 z-50">
              <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-900/50">P</div>
                   <span class="font-bold text-xl tracking-wide">Manage<span class="text-purple-400">Products</span></span>
                </div>
                <div class="flex gap-4">
                    <a href="/dashboard" class="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition text-sm font-bold bg-cyan-900/20 px-4 py-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-900/40">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                        Back to Orders
                    </a>
                </div>
              </div>
            </nav>

            <div class="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
               
               <!-- Add Form -->
               <div class="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                 <div class="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                 
                 <div class="flex items-center gap-3 mb-6 relative z-10">
                    <div class="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
                    </div>
                    <h3 class="text-xl font-bold text-white">Add New Product</h3>
                 </div>

                 <form hx-post="/products" hx-target="#product-list" hx-swap="innerHTML" hx-on::after-request="this.reset()" class="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-10">
                    <div class="md:col-span-3">
                        <label class="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Category</label>
                        <select name="category" class="w-full bg-gray-950/50 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition cursor-pointer">
                            <option value="TOPUP">💎 TOPUP</option>
                            <option value="JOKI">⚡ JOKI</option>
                            <option value="ITEM">🎁 ITEM</option>
                        </select>
                    </div>
                    <div class="md:col-span-5">
                        <label class="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Item Name</label>
                        <input type="text" name="name" placeholder="e.g. 1000 Gems" class="w-full bg-gray-950/50 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition" required>
                    </div>
                    <div class="md:col-span-3">
                        <label class="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Price</label>
                        <input type="number" name="price" placeholder="IDR" class="w-full bg-gray-950/50 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition" required>
                    </div>
                    <div class="md:col-span-1 flex items-end">
                        <button class="w-full h-[50px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl shadow-lg shadow-purple-900/30 transition flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                        </button>
                    </div>
                 </form>
               </div>

               <!-- Product List -->
               <div class="space-y-4">
                  <h3 class="text-gray-400 font-bold ml-1 text-sm uppercase tracking-wider">Active Products</h3>
                  <div id="product-list" class="grid grid-cols-1 md:grid-cols-2 gap-4" hx-get="/products/list" hx-trigger="load">
                    <!-- Loaded via HTMX -->
                  </div>
               </div>
            </div>
          </body>
        </html>
      `)

      .get('/products/list', ({ db }) => {
        const prod = db.query('SELECT * FROM products ORDER BY category, price ASC').all() as any[]
        const catColors: any = { 'TOPUP': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', 'JOKI': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', 'ITEM': 'text-purple-400 bg-purple-400/10 border-purple-400/20' }
        
        return prod.map(p => `
          <div class="glass p-5 rounded-2xl flex items-center justify-between group hover:border-white/20 transition">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center border ${catColors[p.category]}">
                    ${p.category === 'TOPUP' ? '💎' : p.category === 'JOKI' ? '⚡' : '🎁'}
                </div>
                <div>
                    <div class="font-bold text-white text-lg">${p.name}</div>
                    <div class="text-xs text-gray-500 font-medium tracking-wider uppercase">${p.category}</div>
                </div>
             </div>
             <div class="text-right">
                <div class="font-mono text-xl text-white font-bold mb-1">Rp${p.price.toLocaleString('id-ID')}</div>
                <button hx-delete="/products/${p.id}" hx-target="#product-list" class="text-xs text-red-500 hover:text-red-400 hover:underline uppercase font-bold tracking-wide transition opacity-50 group-hover:opacity-100">Delete</button>
             </div>
          </div>
        `).join('')
      })

      .post('/products', ({ db, body }) => {
         const result = db.prepare('INSERT INTO products (category, name, price, description) VALUES ($cat, $name, $price, $desc) RETURNING *').get({
             $cat: body.category, $name: body.name, $price: body.price, $desc: body.description || ''
         }) as any
         
         // Return updated list
         const prod = db.query('SELECT * FROM products ORDER BY category, price ASC').all() as any[]
         const catColors: any = { 'TOPUP': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', 'JOKI': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', 'ITEM': 'text-purple-400 bg-purple-400/10 border-purple-400/20' }
        
        return prod.map(p => `
          <div class="glass p-5 rounded-2xl flex items-center justify-between group hover:border-white/20 transition">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center border ${catColors[p.category]}">
                    ${p.category === 'TOPUP' ? '💎' : p.category === 'JOKI' ? '⚡' : '🎁'}
                </div>
                <div>
                    <div class="font-bold text-white text-lg">${p.name}</div>
                    <div class="text-xs text-gray-500 font-medium tracking-wider uppercase">${p.category}</div>
                </div>
             </div>
             <div class="text-right">
                <div class="font-mono text-xl text-white font-bold mb-1">Rp${p.price.toLocaleString('id-ID')}</div>
                <button hx-delete="/products/${p.id}" hx-target="#product-list" class="text-xs text-red-500 hover:text-red-400 hover:underline uppercase font-bold tracking-wide transition opacity-50 group-hover:opacity-100">Delete</button>
             </div>
          </div>
        `).join('')
      }, { body: t.Object({ category: t.String(), name: t.String(), price: t.Numeric(), description: t.Optional(t.String()) }) })

      .delete('/products/:id', ({ db, params }) => {
         db.prepare('DELETE FROM products WHERE id = $id').run({ $id: params.id })
         
         const prod = db.query('SELECT * FROM products ORDER BY category, price ASC').all() as any[]
         const catColors: any = { 'TOPUP': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', 'JOKI': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', 'ITEM': 'text-purple-400 bg-purple-400/10 border-purple-400/20' }
        
        return prod.map(p => `
          <div class="glass p-5 rounded-2xl flex items-center justify-between group hover:border-white/20 transition">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center border ${catColors[p.category]}">
                    ${p.category === 'TOPUP' ? '💎' : p.category === 'JOKI' ? '⚡' : '🎁'}
                </div>
                <div>
                    <div class="font-bold text-white text-lg">${p.name}</div>
                    <div class="text-xs text-gray-500 font-medium tracking-wider uppercase">${p.category}</div>
                </div>
             </div>
             <div class="text-right">
                <div class="font-mono text-xl text-white font-bold mb-1">Rp${p.price.toLocaleString('id-ID')}</div>
                <button hx-delete="/products/${p.id}" hx-target="#product-list" class="text-xs text-red-500 hover:text-red-400 hover:underline uppercase font-bold tracking-wide transition opacity-50 group-hover:opacity-100">Delete</button>
             </div>
          </div>
        `).join('')
      })

      // --- ORDER MANAGEMENT API ---
      .get('/orders/rows', ({ db, query }) => {
        const q = query.search ? `%${query.search}%` : '%';
        const s = query.status || null;
        
        let sql = `SELECT * FROM orders WHERE (customer_name LIKE $q OR roblox_user LIKE $q OR id LIKE $q)`;
        let params: any = { $q: q };

        if (s) {
            sql += ` AND status = $s`;
            params.$s = s;
        }

        sql += ` ORDER BY id DESC`;

        const list = db.query(sql).all(params) as any[];

        if (list.length === 0) return `<tr><td colspan="6" class="p-8 text-center text-gray-500">No orders found.</td></tr>`;

        const statusColors: any = {
            'Pending': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            'Processing': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'Done': 'bg-green-500/10 text-green-500 border-green-500/20',
            'Cancelled': 'bg-red-500/10 text-red-500 border-red-500/20'
        };

        return list.map(order => `
          <tr class="border-b border-gray-800/50 hover:bg-white/5 transition">
            <td class="p-5">
                <div class="font-bold text-white">#${order.id}</div>
                <div class="text-xs text-gray-500">${new Date(order.created_at).toLocaleDateString()}</div>
            </td>
            <td class="p-5">
                <div class="font-bold text-white">${order.customer_name}</div>
                <div class="text-xs text-gray-400 font-mono text-[10px] bg-gray-800 px-1.5 py-0.5 rounded w-fit mt-1">${order.roblox_user}</div>
            </td>
            <td class="p-5">
                <div class="text-sm text-cyan-400 font-semibold">${order.item_name}</div>
                <div class="text-xs text-gray-500 uppercase tracking-wider">${order.service_type || 'Custom'}</div>
            </td>
            <td class="p-5">
                <div class="font-mono text-white">Rp${order.price.toLocaleString('id-ID')}</div>
                <div class="text-xs text-gray-500 mt-1">${order.payment_method}</div>
                ${order.proof_image ? `
                    <a href="/public/uploads/${order.proof_image}" target="_blank" class="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-400 bg-cyan-900/20 border border-cyan-500/30 px-2 py-1 rounded hover:bg-cyan-900/40 transition">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View Proof
                    </a>
                ` : ''}
            </td>
            <td class="p-5">
                <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusColors[order.status] || 'bg-gray-800 text-gray-400'}">
                    ${order.status}
                </span>
            </td>
            <td class="p-5 text-right space-x-2">
              ${order.status === 'Pending' ? `
                  <button hx-put="/orders/${order.id}/status?s=Processing" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition shadow-lg shadow-blue-900/30" title="Start Process">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </button>
              ` : ''}
              
              ${order.status === 'Processing' ? `
                  <button hx-put="/orders/${order.id}/status?s=Done" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition shadow-lg shadow-green-900/30" title="Mark Done">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </button>
              ` : ''}

              ${order.status !== 'Cancelled' && order.status !== 'Done' ? `
                  <button hx-put="/orders/${order.id}/status?s=Cancelled" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-500 p-2 rounded-lg transition" title="Cancel Order" onclick="return confirm('Cancel this order?')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                  </button>
              ` : ''}

              <button hx-delete="/orders/${order.id}" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="text-gray-500 hover:text-red-500 p-2 transition" title="Delete Permanently" onclick="return confirm('Delete permanently?')">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            </td>
          </tr>
        `).join('')
      })

      // Update Status Endpoint
      .put('/orders/:id/status', ({ db, params, query }) => {
         // Update status
         db.prepare('UPDATE orders SET status=$s WHERE id=$id').run({ $s: query.s, $id: params.id })
         
         // Trigger refresh of rows by redirecting or re-rendering rows
         // Re-using the logic from /orders/rows via internal call or just returning HTMX to trigger refresh would be best 
         // But HTMX expects HTML response. We can just call the /orders/rows logic again.
         // NOTE: For simplicity in this mono-file, I will just return an empty string with HX-Trigger header to refresh table? 
         // No, simpler to just return the new list to replace the body.
         
         // Trigger Search/Filter param preservation is tricky here without client-side help so we used hx-include.
         // To properly re-render, we need the query params. They are sent via hx-include!
         
         // Redirect to the rows handler (re-run logic)
         // Since we can't easily "redirect" internally with query params in this simple setup without code duplication
         // I will duplicate the rows fetch logic for now or refactor. 
         // Refactoring is cleaner. Let's redirect logic by calling a shared function if possible, but for now duplicate is safest for "Patch" tool.
         
         const q = query.search ? `%${query.search}%` : '%';
         const s = query.status || null;
         let sql = `SELECT * FROM orders WHERE (customer_name LIKE $q OR roblox_user LIKE $q OR id LIKE $q)`;
         let p: any = { $q: q };
         if (s) { sql += ` AND status = $s`; p.$s = s; }
         sql += ` ORDER BY id DESC`;
         const list = db.query(sql).all(p) as any[];

         // ... (Same Render Logic - omitted for brevity, will copy-paste the render functionality in the tool call)
         // Wait, to avoid massive code duplication, I will implement a helper function for rendering in the file?
         // Limitations of `replace_file_content` make adding a helper risky if I don't know where to put it safely.
         // I will duplicate the render logic. It's safe.
         // Or even better: Client side trigger! 
         // return Response with HX-Trigger: 'refresh-orders'. But the user wants immediate feedback.
         
         // Let's duplicate the render for safety and reliability.
         if (list.length === 0) return `<tr><td colspan="6" class="p-8 text-center text-gray-500">No orders found.</td></tr>`;

         const statusColors: any = {
            'Pending': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            'Processing': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'Done': 'bg-green-500/10 text-green-500 border-green-500/20',
            'Cancelled': 'bg-red-500/10 text-red-500 border-red-500/20'
         };

         return list.map(order => `
          <tr class="border-b border-gray-800/50 hover:bg-white/5 transition">
            <td class="p-5">
                <div class="font-bold text-white">#${order.id}</div>
                <div class="text-xs text-gray-500">${new Date(order.created_at).toLocaleDateString()}</div>
            </td>
            <td class="p-5">
                <div class="font-bold text-white">${order.customer_name}</div>
                <div class="text-xs text-gray-400 font-mono text-[10px] bg-gray-800 px-1.5 py-0.5 rounded w-fit mt-1">${order.roblox_user}</div>
            </td>
            <td class="p-5">
                <div class="text-sm text-cyan-400 font-semibold">${order.item_name}</div>
                <div class="text-xs text-gray-500 uppercase tracking-wider">${order.service_type || 'Custom'}</div>
            </td>
            <td class="p-5">
                <div class="font-mono text-white">Rp${order.price.toLocaleString('id-ID')}</div>
                <div class="text-xs text-gray-500 mt-1">${order.payment_method}</div>
                ${order.proof_image ? `
                    <a href="/public/uploads/${order.proof_image}" target="_blank" class="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-400 bg-cyan-900/20 border border-cyan-500/30 px-2 py-1 rounded hover:bg-cyan-900/40 transition">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View Proof
                    </a>
                ` : ''}
            </td>
            <td class="p-5">
                <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusColors[order.status] || 'bg-gray-800 text-gray-400'}">
                    ${order.status}
                </span>
            </td>
            <td class="p-5 text-right space-x-2">
              ${order.status === 'Pending' ? `
                  <button hx-put="/orders/${order.id}/status?s=Processing" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition shadow-lg shadow-blue-900/30" title="Start Process">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </button>
              ` : ''}
              
              ${order.status === 'Processing' ? `
                  <button hx-put="/orders/${order.id}/status?s=Done" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition shadow-lg shadow-green-900/30" title="Mark Done">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </button>
              ` : ''}

              ${order.status !== 'Cancelled' && order.status !== 'Done' ? `
                  <button hx-put="/orders/${order.id}/status?s=Cancelled" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-500 p-2 rounded-lg transition" title="Cancel Order" onclick="return confirm('Cancel this order?')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                  </button>
              ` : ''}

              <button hx-delete="/orders/${order.id}" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="text-gray-500 hover:text-red-500 p-2 transition" title="Delete Permanently" onclick="return confirm('Delete permanently?')">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            </td>
          </tr>
        `).join('')
      })

      .delete('/orders/:id', ({ db, params, query }) => {
        db.prepare('DELETE FROM orders WHERE id=$id').run({$id:params.id})
        // Reuse Query Logic
        const q = query.search ? `%${query.search}%` : '%';
         const s = query.status || null;
         let sql = `SELECT * FROM orders WHERE (customer_name LIKE $q OR roblox_user LIKE $q OR id LIKE $q)`;
         let p: any = { $q: q };
         if (s) { sql += ` AND status = $s`; p.$s = s; }
         sql += ` ORDER BY id DESC`;
         const list = db.query(sql).all(p) as any[];

         if (list.length === 0) return `<tr><td colspan="6" class="p-8 text-center text-gray-500">No orders found.</td></tr>`;

         const statusColors: any = {
            'Pending': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            'Processing': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'Done': 'bg-green-500/10 text-green-500 border-green-500/20',
            'Cancelled': 'bg-red-500/10 text-red-500 border-red-500/20'
         };

         return list.map(order => `
          <tr class="border-b border-gray-800/50 hover:bg-white/5 transition">
            <td class="p-5">
                <div class="font-bold text-white">#${order.id}</div>
                <div class="text-xs text-gray-500">${new Date(order.created_at).toLocaleDateString()}</div>
            </td>
            <td class="p-5">
                <div class="font-bold text-white">${order.customer_name}</div>
                <div class="text-xs text-gray-400 font-mono text-[10px] bg-gray-800 px-1.5 py-0.5 rounded w-fit mt-1">${order.roblox_user}</div>
            </td>
            <td class="p-5">
                <div class="text-sm text-cyan-400 font-semibold">${order.item_name}</div>
                <div class="text-xs text-gray-500 uppercase tracking-wider">${order.service_type || 'Custom'}</div>
            </td>
            <td class="p-5">
                <div class="font-mono text-white">Rp${order.price.toLocaleString('id-ID')}</div>
                <div class="text-xs text-gray-500 mt-1">${order.payment_method}</div>
                ${order.proof_image ? `
                    <a href="/public/uploads/${order.proof_image}" target="_blank" class="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-400 bg-cyan-900/20 border border-cyan-500/30 px-2 py-1 rounded hover:bg-cyan-900/40 transition">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View Proof
                    </a>
                ` : ''}
            </td>
            <td class="p-5">
                <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusColors[order.status] || 'bg-gray-800 text-gray-400'}">
                    ${order.status}
                </span>
            </td>
            <td class="p-5 text-right space-x-2">
              ${order.status === 'Pending' ? `
                  <button hx-put="/orders/${order.id}/status?s=Processing" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition shadow-lg shadow-blue-900/30" title="Start Process">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </button>
              ` : ''}
              
              ${order.status === 'Processing' ? `
                  <button hx-put="/orders/${order.id}/status?s=Done" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition shadow-lg shadow-green-900/30" title="Mark Done">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </button>
              ` : ''}

              ${order.status !== 'Cancelled' && order.status !== 'Done' ? `
                  <button hx-put="/orders/${order.id}/status?s=Cancelled" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-500 p-2 rounded-lg transition" title="Cancel Order" onclick="return confirm('Cancel this order?')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                  </button>
              ` : ''}

              <button hx-delete="/orders/${order.id}" hx-target="#table-body" hx-include="[name='search'], [name='status']" class="text-gray-500 hover:text-red-500 p-2 transition" title="Delete Permanently" onclick="return confirm('Delete permanently?')">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            </td>
          </tr>
        `).join('')
      })
  )

  // Public Order Submit
  .post('/orders', async ({ db, body }) => {
     try {
       console.log('📨 Received:', body);
       let itemName = body.item_name || '';
       let price = Number(body.price) || 0;
       let category = 'CUSTOM';
       
       // Get product details if product_id provided
       if(body.product_id && body.product_id !== 'CUSTOM') {
           const p = db.query('SELECT * FROM products WHERE id = $id').get({ $id: parseInt(body.product_id) }) as any
           if(p) {
               itemName = p.name;
               price = p.price;
               category = p.category;
               console.log('✅ Product found:', p.name);
           }
       }

       // INSERT with positional parameters
       const sql = `INSERT INTO orders (customer_name, roblox_user, service_type, item_name, price, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`
       const stmt = db.prepare(sql)
       stmt.run(body.customer_name, body.roblox_user, category, itemName || 'Custom Request', price, body.payment_method)
       
       const newOrder = db.query('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get() as any
       console.log('✅ Order inserted ID:', newOrder.id);

       const waMessage = `Halo Admin Fish It, saya sudah order *${itemName}* seharga Rp${price.toLocaleString('id-ID')}. (Order ID: #${newOrder.id}). Pembayaran via ${body.payment_method}. Mohon diproses.`
       const waLink = `https://wa.me/6285156850689?text=${encodeURIComponent(waMessage)}`

       return `
         <div class="bg-green-900/20 border border-green-500/50 rounded-2xl p-8 text-center animate-fadeIn">
           <div class="text-4xl mb-4">✅</div>
           <h3 class="text-2xl font-bold text-white mb-2">Order Berhasil!</h3>
           <p class="text-gray-400 mb-4">Order ID: <span class="text-cyan-400 font-bold">#${newOrder.id}</span></p>
           <p class="text-gray-400 mb-6">Data telah masuk ke admin panel. Admin akan segera memproses.</p>
           <a href="${waLink}" target="_blank" class="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg shadow-green-900/30">
              <span>Konfirmasi WhatsApp</span>
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
           </a>
         </div>
       `
     } catch (error: any) {
       console.error('❌ Error:', error.message);
       return `<div class="bg-red-900/20 border border-red-500/50 rounded-2xl p-8 text-center"><h3 class="text-red-400 font-bold">❌ Error: ${error.message}</h3></div>`
     }
  }, { body: t.Object({ customer_name: t.String(), roblox_user: t.String(), product_id: t.String(), price: t.String(), item_name: t.String(), payment_method: t.String() }) })

  .listen(3000)

console.log(`🦊 Fish It 2.1 (Rich Content Restored) running at http://${app.server?.hostname}:${app.server?.port}`)