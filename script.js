// =============================================
//  AUTH — EMAIL + PASSWORD (localStorage)
// =============================================
let currentUser = null;

function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password)           { showToast('⚠️ Email மற்றும் Password enter பண்ணுங்க'); return; }
  if (!email.includes('@'))          { showToast('⚠️ சரியான Email enter பண்ணுங்க'); return; }
  const accounts = JSON.parse(localStorage.getItem('ebh_accounts') || '{}');
  if (!accounts[email])              { showToast('❌ Account இல்லை. Register பண்ணுங்க!'); return; }
  if (accounts[email].password !== password) { showToast('❌ Password தவறு. மீண்டும் try பண்ணுங்க'); return; }
  currentUser = { email, name: accounts[email].name, uid: 'user_' + btoa(email) };
  localStorage.setItem('ebh_user', JSON.stringify(currentUser));
  finishLogin();
}

function doRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!name)                         { showToast('⚠️ பெயர் enter பண்ணுங்க'); return; }
  if (!email || !email.includes('@')){ showToast('⚠️ சரியான Email enter பண்ணுங்க'); return; }
  if (!password || password.length < 6) { showToast('⚠️ Password minimum 6 characters வேணும்'); return; }
  const accounts = JSON.parse(localStorage.getItem('ebh_accounts') || '{}');
  if (accounts[email])               { showToast('⚠️ இந்த Email already registered. Login பண்ணுங்க!'); return; }
  accounts[email] = { name, password };
  localStorage.setItem('ebh_accounts', JSON.stringify(accounts));
  currentUser = { email, name, uid: 'user_' + btoa(email) };
  localStorage.setItem('ebh_user', JSON.stringify(currentUser));
  finishLogin();
}

function loginGuest() {
  currentUser = { name: 'Guest', email: '', isGuest: true };
  updateUserNav();
  showToast('👤 Guest-ஆ continue பண்றீங்க');
  go('shop');
}

function finishLogin() {
  updateUserNav();
  userProducts = loadUserProductsLocal();
  rebuildProducts();
  buildFilters();
  applyAllFilters();
  renderHorizontalSections();
  showToast('🎉 Welcome, ' + (currentUser.name || currentUser.email) + '!');
  go('shop');
}

function logout() {
  currentUser = null;
  localStorage.removeItem('ebh_user');
  userProducts = [];
  rebuildProducts();
  buildFilters();
  applyAllFilters();
  updateUserNav();
  showToast('👋 Logout successful');
  go('auth');
}

function requireAuth(cb) {
  if (currentUser) { cb(); return; }
  showToast('🔐 முதலில் Login பண்ணுங்க!');
  setTimeout(() => go('auth'), 500);
}

function updateUserNav() {
  const area    = document.getElementById('user-nav-area');
  const mobLink = document.getElementById('mob-auth-link');
  if (currentUser) {
    const displayName = currentUser.name || currentUser.email || 'User';
    const guestTag    = currentUser.isGuest ? ' <small style="color:var(--muted)">(Guest)</small>' : '';
    area.innerHTML = `
      <span class="user-pill">👤 ${displayName.split(' ')[0]}${guestTag}</span>
      <button class="nav-btn logout-btn" onclick="logout()" style="padding:7px 10px;display:inline-flex">🚪</button>`;
    mobLink.textContent = '🚪 Logout';
    mobLink.onclick = () => { logout(); closeMob(); };
  } else {
    area.innerHTML = `<button class="nav-btn" onclick="go('auth')">🔐 Login</button>`;
    mobLink.textContent = '🔐 Login / Register';
    mobLink.onclick = () => { go('auth'); closeMob(); };
  }
}

function switchAuthTab(tab, el) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(tab + '-form').classList.add('active');
}

// Restore session on load
(function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem('ebh_user') || 'null');
    if (saved) { currentUser = saved; updateUserNav(); }
  } catch(e) {}
})();

// =============================================
//  PRODUCT DATA
// =============================================
const noImgHtml = `<div class="pimg-placeholder">
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 16l5-5 4 4 3-3 4 4" stroke="#e8185f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="2" y="3" width="20" height="18" rx="2" stroke="#e8185f" stroke-width="1.5"/>
    <circle cx="8.5" cy="8.5" r="1.5" fill="#e8185f"/>
  </svg>
  <span>No Image</span>
</div>`;

const noImgCartHtml = `<div class="cimg-placeholder">
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 16l5-5 4 4 3-3 4 4" stroke="#c01a54" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="2" y="3" width="20" height="18" rx="2" stroke="#c01a54" stroke-width="1.5"/>
    <circle cx="8.5" cy="8.5" r="1.5" fill="#c01a54"/>
  </svg>
</div>`;

function prodImgHtml(p) {
  if (!p.dataUrl) return noImgHtml;
  if (!p.dataUrl.startsWith('data:')) {
    return `<img src="${p.dataUrl}" alt="${p.name}"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="pimg-placeholder" style="display:none">
        <svg viewBox="0 0 24 24" fill="none"><path d="M3 16l5-5 4 4 3-3 4 4" stroke="#e8185f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="3" width="20" height="18" rx="2" stroke="#e8185f" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="#e8185f"/></svg>
        <span>No Image</span>
      </div>`;
  }
  return `<img src="${p.dataUrl}" alt="${p.name}">`;
}

function cartImgHtml(i) {
  if (!i.dataUrl) return noImgCartHtml;
  return `<img src="${i.dataUrl}" alt="${i.name}"
    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div class="cimg-placeholder" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" style="width:28px;height:28px;opacity:.5">
        <path d="M3 16l5-5 4 4 3-3 4 4" stroke="#c01a54" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="2" y="3" width="20" height="18" rx="2" stroke="#c01a54" stroke-width="1.5"/>
      </svg>
    </div>`;
}

const baseProducts = [
  {id:1,  name:"Velvet Matte Lipstick",      brand:"Lakme",            cat:"Lipstick", dataUrl:"images/lipstick.jpeg",         price:599,  original:999,  rating:4.8, reviews:"2.1k", badge:"Bestseller", userAdded:false},
  {id:2,  name:"Satin Rouge Lipstick",       brand:"Maybelline",       cat:"Lipstick", dataUrl:"images/satin.jpg",             price:449,  original:699,  rating:4.6, reviews:"1.4k", badge:"Hot",        userAdded:false},
  {id:3,  name:"Berry Lip Gloss Set",        brand:"NYX",              cat:"Lipstick", dataUrl:"images/berry.jpg",             price:399,  original:649,  rating:4.5, reviews:"876",  badge:"Value",      userAdded:false},
  {id:4,  name:"Rose Glow Serum",            brand:"Minimalist",       cat:"Skincare", dataUrl:"images/roseglowserum.jpeg",    price:1299, original:1899, rating:4.9, reviews:"3.4k", badge:"New",        userAdded:false},
  {id:5,  name:"Hydra Boost Moisturizer",    brand:"Cetaphil",         cat:"Skincare", dataUrl:"images/moisturizer.jpeg",      price:749,  original:1099, rating:4.8, reviews:"2.7k", badge:"Bestseller", userAdded:false},
  {id:6,  name:"Vitamin C Cream",            brand:"Dot & Key",        cat:"Skincare", dataUrl:"images/vitamincream.jpg",      price:899,  original:1299, rating:4.7, reviews:"1.9k", badge:"Trending",   userAdded:false},
  {id:7,  name:"Sunscreen SPF 50",           brand:"Minimalist",       cat:"Skincare", dataUrl:"images/sunscreen.jpeg",        price:549,  original:799,  rating:4.8, reviews:"4.1k", badge:"Bestseller", userAdded:false},
  {id:8,  name:"Smoky Eye Palette",          brand:"NYX",              cat:"Eye",      dataUrl:"images/smokypallete.jpg",      price:899,  original:1499, rating:4.7, reviews:"1.8k", badge:"Sale",       userAdded:false},
  {id:9,  name:"Liquid Highlighter",         brand:"Lakme",            cat:"Eye",      dataUrl:"images/liquidhighlighter.jpg", price:649,  original:899,  rating:4.7, reviews:"1.3k", badge:"Trending",   userAdded:false},
  {id:10, name:"Waterproof Kajal",           brand:"Maybelline",       cat:"Eye",      dataUrl:"images/kajal.jfif",            price:249,  original:399,  rating:4.6, reviews:"3.2k", badge:"Bestseller", userAdded:false},
  {id:11, name:"Glitter Nail Polish",        brand:"OPI",              cat:"Nail",     dataUrl:"images/glitter.jfif",          price:299,  original:449,  rating:4.6, reviews:"956",  badge:"Hot",        userAdded:false},
  {id:12, name:"French Manicure Kit",        brand:"Colorbar",         cat:"Nail",     dataUrl:"images/manicure2.jfif",        price:499,  original:799,  rating:4.5, reviews:"712",  badge:"New",        userAdded:false},
  {id:13, name:"Bloom Eau de Parfum",        brand:"Chanel",           cat:"Perfume",  dataUrl:"images/bloom.jpg",             price:1799, original:2499, rating:4.9, reviews:"4.2k", badge:"Luxury",     userAdded:false},
  {id:14, name:"Rose Oud Attar",             brand:"Forest Essentials", cat:"Perfume", dataUrl:"images/attar2.jfif",           price:1299, original:1899, rating:4.8, reviews:"2.1k", badge:"Premium",    userAdded:false},
  {id:15, name:"Midnight Musk Spray",        brand:"Chanel",           cat:"Perfume",  dataUrl:"images/midnightmusk.jfif",     price:999,  original:1499, rating:4.7, reviews:"1.6k", badge:"Trending",   userAdded:false},
  {id:16, name:"Nourishing Hair Serum",      brand:"Dot & Key",        cat:"Skincare", dataUrl:"images/nourishing.jpeg",       price:699,  original:999,  rating:4.6, reviews:"1.1k", badge:"New",        userAdded:false},
  {id:17, name:"Aloe Vera Face Wash",        brand:"Mamaearth",        cat:"Skincare", dataUrl:"images/aloevera.jfif",         price:349,  original:499,  rating:4.5, reviews:"1.8k", badge:"Trending",   userAdded:false},
  {id:18, name:"Charcoal Face Mask",         brand:"WOW Skin Science", cat:"Skincare", dataUrl:"images/charcoalmask.jfif",     price:499,  original:699,  rating:4.6, reviews:"1.2k", badge:"Hot",        userAdded:false},
  {id:19, name:"Gold Facial Kit",            brand:"VLCC",             cat:"Skincare", dataUrl:"images/goldfacialkit.jfif",    price:899,  original:1299, rating:4.7, reviews:"2.3k", badge:"Bestseller", userAdded:false},
  {id:20, name:"Matte Foundation",           brand:"Lakme",            cat:"Face",     dataUrl:"images/MatteFoundation.jfif",  price:699,  original:999,  rating:4.8, reviews:"3.1k", badge:"Bestseller", userAdded:false},
  {id:21, name:"Compact Powder",             brand:"Maybelline",       cat:"Face",     dataUrl:"images/compactpowder.jfif",    price:399,  original:599,  rating:4.6, reviews:"2.0k", badge:"Hot",        userAdded:false},
  {id:22, name:"Blush Glow Palette",         brand:"Colorbar",         cat:"Face",     dataUrl:"images/blushpalette.jfif",     price:799,  original:1199, rating:4.7, reviews:"1.4k", badge:"Trending",   userAdded:false},
  {id:23, name:"Curl Defining Mascara",      brand:"Maybelline",       cat:"Eye",      dataUrl:"images/mascara.jfif",          price:499,  original:699,  rating:4.8, reviews:"3.6k", badge:"Bestseller", userAdded:false},
  {id:24, name:"Eyebrow Pencil",             brand:"Lakme",            cat:"Eye",      dataUrl:"images/eyebrowpencil.jfif",    price:299,  original:449,  rating:4.5, reviews:"1.1k", badge:"New",        userAdded:false},
  {id:25, name:"Gel Eyeliner",               brand:"L'Oreal",          cat:"Eye",      dataUrl:"images/geleyeliner.jfif",      price:549,  original:799,  rating:4.7, reviews:"1.7k", badge:"Trending",   userAdded:false},
  {id:26, name:"Long Stay Nail Paint",       brand:"Colorbar",         cat:"Nail",     dataUrl:"images/nailpaint.jfif",        price:249,  original:399,  rating:4.6, reviews:"1.3k", badge:"Sale",       userAdded:false},
  {id:27, name:"Nail Art Stickers",          brand:"Faces Canada",     cat:"Nail",     dataUrl:"images/nailstickers.jfif",     price:199,  original:299,  rating:4.4, reviews:"789",  badge:"New",        userAdded:false},
  {id:28, name:"Jasmine Body Mist",          brand:"The Body Shop",    cat:"Perfume",  dataUrl:"images/bodymist.jfif",         price:899,  original:1299, rating:4.7, reviews:"2.2k", badge:"Popular",    userAdded:false},
  {id:29, name:"Vanilla Dream Perfume",      brand:"Bella Vita",       cat:"Perfume",  dataUrl:"images/vanilladream.jfif",     price:799,  original:1199, rating:4.6, reviews:"1.5k", badge:"Trending",   userAdded:false},
  {id:30, name:"Hair Growth Oil",            brand:"Indulekha",        cat:"Haircare", dataUrl:"images/hairoil.jfif",          price:499,  original:699,  rating:4.7, reviews:"3.8k", badge:"Bestseller", userAdded:false},
  {id:31, name:"Keratin Shampoo",            brand:"Tresemme",         cat:"Haircare", dataUrl:"images/keratinshampoo.jfif",   price:649,  original:899,  rating:4.6, reviews:"2.5k", badge:"Popular",    userAdded:false},
  {id:32, name:"Hair Spa Cream",             brand:"L'Oreal",          cat:"Haircare", dataUrl:"images/hairspacream.jfif",     price:799,  original:1199, rating:4.8, reviews:"1.9k", badge:"Premium",    userAdded:false}
];

function loadUserProductsLocal() {
  try { return JSON.parse(localStorage.getItem('ebh_products') || '[]'); } catch(e) { return []; }
}
function saveUserProductsLocal(p) {
  try { localStorage.setItem('ebh_products', JSON.stringify(p)); } catch(e) {}
}

let userProducts = loadUserProductsLocal();
let products     = [...baseProducts];
let nextId       = baseProducts.length + 1;
let cart = [], wishlist = [];
let state = { cat:'All', brands:[], maxPrice:5000, minRating:0, minDisc:0, sort:'default', view:'grid', search:'' };
let checkoutStep = 1, selectedAddr = 's1', selectedPay = 'upi', buyNowItem = null;
let delProductId = null;

// CROP STATE
let cropImg = null, cropRawDataUrl = null, cropFinalDataUrl = null;
let cropRatio = {w:1,h:1}, cropBox = {x:0,y:0,w:0,h:0};
let isDragging = false, isResizing = false, activeHandle = null;
let dragStart = {x:0,y:0}, dragBoxStart = {x:0,y:0,w:0,h:0};
let canvasScale = 1;

function disc(p) { return Math.round((1 - p.price / p.original) * 100); }

function rebuildProducts() {
  products = [...baseProducts, ...userProducts];
  nextId   = products.reduce((m,p) => Math.max(m, p.id), 0) + 1;
}

// =============================================
//  HORIZONTAL SCROLL SECTIONS
// =============================================
function hcardImgHtml(p) {
  if (!p.dataUrl) return `<div class="hcard-img-placeholder">🛍️</div>`;
  if (p.dataUrl.startsWith('data:')) {
    return `<img src="${p.dataUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;display:block">`;
  }
  return `<img src="${p.dataUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;display:block"
    onerror="this.parentElement.innerHTML='<div class=\\'hcard-img-placeholder\\'>🛍️</div>'">`;
}

function renderHCard(p) {
  const d = disc(p);
  const safeName = p.name.replace(/'/g,"\\'");
  return `<div class="hcard" onclick="addCart(${p.id});showToast('🛒 ${safeName} added!')">
    <div class="hcard-img">
      ${hcardImgHtml(p)}
      <span class="hcard-badge">${p.badge}</span>
      <span class="hcard-disc">${d}% OFF</span>
    </div>
    <div class="hcard-info">
      <div class="hcard-brand">${p.brand}</div>
      <div class="hcard-name">${p.name}</div>
      <div class="hcard-price">
        <span class="hcard-curr">₹${p.price}</span>
        <span class="hcard-orig">₹${p.original}</span>
      </div>
      <button class="hcard-btn" onclick="event.stopPropagation();addCart(${p.id})">🛒 Add to Cart</button>
    </div>
  </div>`;
}

function renderHorizontalSections() {
  const trending   = [...products].filter(p => ['Trending','Hot','Bestseller'].includes(p.badge)).sort((a,b)=>b.rating-a.rating).slice(0,12);
  const skincare   = [...products].filter(p => p.cat === 'Skincare').sort((a,b)=>b.rating-a.rating).slice(0,12);
  const bestseller = [...products].sort((a,b)=>b.rating-a.rating).slice(0,12);

  const empty = '<p style="color:var(--muted);padding:20px;font-size:13px">No products yet</p>';
  const trendEl = document.getElementById('htrack-trending');
  const skinEl  = document.getElementById('htrack-skincare');
  const bestEl  = document.getElementById('htrack-bestseller');

  if (trendEl) trendEl.innerHTML = trending.length   ? trending.map(renderHCard).join('')   : empty;
  if (skinEl)  skinEl.innerHTML  = skincare.length   ? skincare.map(renderHCard).join('')   : '<p style="color:var(--muted);padding:20px;font-size:13px">No skincare products</p>';
  if (bestEl)  bestEl.innerHTML  = bestseller.length ? bestseller.map(renderHCard).join('') : empty;
}

function scrollHTrack(trackId, dir) {
  const el = document.getElementById('htrack-' + trackId);
  if (el) el.scrollBy({ left: dir * 600, behavior: 'smooth' });
}

// =============================================
//  MOBILE FILTER DRAWER
// =============================================
function openFilterDrawer() {
  document.getElementById('filter-drawer').classList.add('open');
  document.getElementById('filter-drawer-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeFilterDrawer() {
  document.getElementById('filter-drawer').classList.remove('open');
  document.getElementById('filter-drawer-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function onMobPriceRange(v) {
  state.maxPrice = parseInt(v);
  document.getElementById('mob-price-val').textContent = 'Up to ₹' + v;
  const desktopRange = document.getElementById('price-range');
  if (desktopRange) { desktopRange.value = v; document.getElementById('price-val').textContent = 'Up to ₹' + v; }
  applyAllFilters();
}

// =============================================
//  FILTERS
// =============================================
function buildFilters() {
  const cats = ['All','Lipstick','Skincare','Eye','Nail','Perfume','Other'];

  function catHtml(forId) {
    return cats.map(c => {
      const cnt = c === 'All' ? products.length : products.filter(p => p.cat === c).length;
      if (cnt === 0 && c !== 'All') return '';
      return `<label class="chk-item">
        <input type="checkbox" value="${c}" ${c==='All'?'checked':''} onchange="onCatCheck(this)">
        <label>${c} <span class="chk-count">${cnt}</span></label>
      </label>`;
    }).join('');
  }

  document.getElementById('cat-filters').innerHTML     = catHtml('cat-filters');
  document.getElementById('mob-cat-filters').innerHTML = catHtml('mob-cat-filters');

  const allBrands = [...new Set(products.map(p => p.brand))];
  function brandHtml() {
    return allBrands.map(b => {
      const cnt = products.filter(p => p.brand === b).length;
      return `<label class="chk-item">
        <input type="checkbox" value="${b}" onchange="onBrandCheck(this)">
        <label>${b} <span class="chk-count">${cnt}</span></label>
      </label>`;
    }).join('');
  }
  document.getElementById('brand-filters').innerHTML     = brandHtml();
  document.getElementById('mob-brand-filters').innerHTML = brandHtml();
}

function onCatCheck(el) {
  if (el.value === 'All') {
    document.querySelectorAll('#cat-filters input, #mob-cat-filters input').forEach(i => i.checked = (i.value === 'All'));
    state.cat = 'All';
  } else {
    state.cat = el.value;
    document.querySelectorAll('#cat-filters input, #mob-cat-filters input').forEach(i => {
      if (i.value === 'All') i.checked = false;
      if (i.value === el.value) i.checked = el.checked;
    });
  }
  document.querySelectorAll('.chip').forEach(c => {
    const t = c.textContent.trim().replace(/^[^\w]+/,'').trim();
    c.classList.toggle('on', (state.cat === 'All' && t === 'All') || t === state.cat || c.textContent.includes(state.cat));
  });
  applyAllFilters();
}
function onBrandCheck(el) {
  if (el.checked) { state.brands.push(el.value); }
  else            { state.brands = state.brands.filter(b => b !== el.value); }
  applyAllFilters();
}
function onPriceRange(v) {
  state.maxPrice = parseInt(v);
  document.getElementById('price-val').textContent = 'Up to ₹' + v;
  const mobRange = document.getElementById('mob-price-range');
  if (mobRange) { mobRange.value = v; document.getElementById('mob-price-val').textContent = 'Up to ₹' + v; }
  applyAllFilters();
}
function setRating(r, el) {
  state.minRating = r;
  document.querySelectorAll('.star-opt').forEach(s => s.classList.remove('on'));
  el.classList.add('on');
  applyAllFilters();
}
function setChip(cat, el) {
  state.cat = cat;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
  if (el) { el.classList.add('on'); }
  else {
    document.querySelectorAll('.chip').forEach(c => {
      const t = c.textContent.trim();
      if ((cat === 'All' && t === 'All') || c.textContent.includes(cat)) c.classList.add('on');
    });
  }
  applyAllFilters();
}
function clearAllFilters() {
  state = {...state, cat:'All', brands:[], maxPrice:5000, minRating:0, minDisc:0};
  document.getElementById('price-range').value = 5000;
  document.getElementById('price-val').textContent = 'Up to ₹5000';
  document.getElementById('mob-price-range').value = 5000;
  document.getElementById('mob-price-val').textContent = 'Up to ₹5000';
  document.querySelectorAll('#cat-filters input, #brand-filters input, #mob-cat-filters input, #mob-brand-filters input').forEach(i => i.checked = false);
  document.querySelectorAll('#disc-filters input, #mob-disc-filters input').forEach(i => i.checked = false);
  document.querySelectorAll('.star-opt').forEach((s,i) => s.classList.toggle('on', i === 0));
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.textContent.trim() === 'All'));
  applyAllFilters();
}

// =============================================
//  SEARCH
// =============================================
function onSearch() {
  state.search = document.getElementById('search-inp').value.toLowerCase();
  showSuggestions(); applyAllFilters();
}
function onMobSearch() {
  state.search = document.getElementById('mob-search-inp').value.toLowerCase();
  applyAllFilters();
}
function showSuggestions() {
  const q   = document.getElementById('search-inp').value.toLowerCase().trim();
  const sug = document.getElementById('search-suggestions');
  if (!q) { sug.classList.remove('open'); return; }
  const matches = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.cat.toLowerCase().includes(q)
  ).slice(0, 6);
  if (!matches.length) { sug.classList.remove('open'); return; }
  sug.innerHTML = matches.map(p => {
    const thumb = p.dataUrl
      ? `<img src="${p.dataUrl}" style="width:28px;height:28px;object-fit:cover;border-radius:6px" onerror="this.style.display='none'">`
      : '🛍️';
    return `<div class="sug-item" onmousedown="selectSuggestion('${p.name.replace(/'/g,"\\'")}')">
      <div class="sug-emoji">${thumb}</div>
      <div class="sug-info"><div class="sug-name">${p.name}</div><div class="sug-brand">${p.brand} · ${p.cat}</div></div>
      <div class="sug-price">₹${p.price}</div>
    </div>`;
  }).join('');
  sug.classList.add('open');
}
function hideSuggestions() { setTimeout(() => document.getElementById('search-suggestions').classList.remove('open'), 200); }
function selectSuggestion(name) {
  document.getElementById('search-inp').value = name;
  state.search = name.toLowerCase();
  document.getElementById('search-suggestions').classList.remove('open');
  applyAllFilters(); go('shop');
}

// =============================================
//  FILTER + SORT + RENDER
// =============================================
function applyAllFilters() {
  const sort = document.getElementById('sort-sel').value;
  state.sort = sort;
  const discChecks = [...document.querySelectorAll('#disc-filters input:checked, #mob-disc-filters input:checked')].map(i => parseInt(i.value));
  state.minDisc = discChecks.length ? Math.min(...discChecks) : 0;

  let list = [...products];
  if (state.cat !== 'All')  list = list.filter(p => p.cat === state.cat);
  if (state.brands.length)  list = list.filter(p => state.brands.includes(p.brand));
  list = list.filter(p => p.price <= state.maxPrice);
  if (state.minRating > 0)  list = list.filter(p => p.rating >= state.minRating);
  if (state.minDisc > 0)    list = list.filter(p => disc(p) >= state.minDisc);
  if (state.search)         list = list.filter(p =>
    p.name.toLowerCase().includes(state.search) ||
    p.brand.toLowerCase().includes(state.search) ||
    p.cat.toLowerCase().includes(state.search)
  );

  if (sort === 'price-low')  list.sort((a,b) => a.price - b.price);
  else if (sort === 'price-high') list.sort((a,b) => b.price - a.price);
  else if (sort === 'rating')     list.sort((a,b) => b.rating - a.rating);
  else if (sort === 'discount')   list.sort((a,b) => disc(b) - disc(a));
  else if (sort === 'name')       list.sort((a,b) => a.name.localeCompare(b.name));

  renderGrid(list);
  document.getElementById('results-info').innerHTML = `<strong>${list.length}</strong> product${list.length !== 1 ? 's' : ''}`;
}

function renderGrid(list) {
  const grid = document.getElementById('shop-grid');
  grid.className = 'pgrid' + (state.view === 'list' ? ' list-view' : '');
  if (!list.length) {
    grid.innerHTML = '<div class="no-results">😔 No products found. Try adjusting filters.</div>';
    return;
  }
  grid.innerHTML = list.map(p => {
    const w       = wishlist.includes(p.id);
    const d       = disc(p);
    const isOwner = p.userAdded && currentUser && !currentUser.isGuest &&
      (p.ownerUid === currentUser.uid || !p.ownerUid);
    const delBtn  = isOwner
      ? `<button class="btn-del" onclick="event.stopPropagation();openDelModal(${p.id},'${p.name.replace(/'/g,"\\'")}')">🗑️</button>`
      : '';
    return `<div class="pcard" id="pc-${p.id}">
      <div class="pimg-wrap">
        ${prodImgHtml(p)}
        <span class="pbadge">${p.badge}</span>
        <span class="pdisc">${d}% OFF</span>
        <button class="pwish ${w?'on':''}" onclick="event.stopPropagation();toggleWish(${p.id})">${w?'❤️':'🤍'}</button>
      </div>
      <div class="pinfo">
        <div class="pbrand">${p.brand}${p.userAdded?'<span class="my-product-badge">MY PICK</span>':''}</div>
        <div class="pname">${p.name}</div>
        <div class="prating">
          <span class="stars">${'★'.repeat(Math.floor(p.rating))}${'☆'.repeat(5-Math.floor(p.rating))}</span>
          <span>${p.rating} (${p.reviews})</span>
        </div>
        <div class="pprice"><span class="pcurr">₹${p.price}</span><span class="porig">₹${p.original}</span></div>
        <div class="pcard-btns">
          <button class="btn-cart" onclick="event.stopPropagation();addCart(${p.id})">🛒 Cart</button>
          <button class="btn-buy"  onclick="event.stopPropagation();buyNow(${p.id})">Buy Now</button>
          ${delBtn}
        </div>
      </div>
    </div>`;
  }).join('');
}

function setView(v) {
  state.view = v;
  document.getElementById('vg').classList.toggle('on', v === 'grid');
  document.getElementById('vl').classList.toggle('on', v === 'list');
  applyAllFilters();
}

// =============================================
//  DELETE
// =============================================
function openDelModal(id, name) {
  delProductId = id;
  document.getElementById('del-product-name').textContent = name;
  document.getElementById('del-modal').classList.add('open');
}
function closeDelModal() {
  document.getElementById('del-modal').classList.remove('open');
  delProductId = null;
}
function confirmDelete() {
  if (!delProductId) return;
  userProducts = userProducts.filter(p => p.id !== delProductId);
  saveUserProductsLocal(userProducts);
  cart = cart.filter(c => c.id !== delProductId);
  updateCartCount();
  rebuildProducts(); buildFilters(); applyAllFilters(); renderHorizontalSections();
  closeDelModal();
  showToast('🗑️ Product removed successfully');
}

// =============================================
//  CART
// =============================================
function addCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const ex = cart.find(x => x.id === id);
  ex ? ex.qty++ : cart.push({...p, qty:1});
  updateCartCount();
  showToast('✅ Added to cart!');
  renderCart();
}
function toggleWish(id) {
  if (wishlist.includes(id)) { wishlist = wishlist.filter(x => x !== id); }
  else                       { wishlist.push(id); }
  const on = wishlist.includes(id);
  document.querySelectorAll(`#pc-${id} .pwish`).forEach(b => {
    b.textContent = on ? '❤️' : '🤍';
    on ? b.classList.add('on') : b.classList.remove('on');
  });
  showToast(on ? '❤️ Wishlisted!' : '💔 Removed from wishlist');
}
function updateCartCount() {
  document.getElementById('cart-count').textContent = cart.reduce((s,i) => s + i.qty, 0);
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
function changeQty(id, d) {
  const it = cart.find(x => x.id === id);
  if (!it) return;
  it.qty += d;
  if (it.qty <= 0) cart = cart.filter(x => x.id !== id);
  updateCartCount(); renderCart();
}
function removeCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCartCount(); renderCart();
}

function renderCart() {
  const el = document.getElementById('cart-content');
  if (!el) return;
  if (!cart.length) {
    el.innerHTML = `<div class="cart-empty">
      <div class="ei">🛒</div>
      <h2>Cart is empty!</h2>
      <p>Go explore our amazing products.</p>
      <button class="btn-next" style="max-width:200px;margin:0 auto;display:block" onclick="go('shop')">Shop Now 💄</button>
    </div>`;
    return;
  }
  const sub   = cart.reduce((s,i) => s + i.price * i.qty, 0);
  const ship  = sub >= 999 ? 0 : 99;
  const total = sub + ship;
  el.innerHTML = `<div class="cart-layout">
    <div class="cart-list">${cart.map(i => `
      <div class="citem">
        <div class="cimg">${cartImgHtml(i)}</div>
        <div class="cdetails">
          <h3>${i.name}</h3>
          <div class="cvar">${i.brand} · ${i.cat}</div>
          <div class="cprice">₹${i.price}</div>
        </div>
        <div class="cqty">
          <button class="qbtn" onclick="changeQty(${i.id},-1)">−</button>
          <span class="qnum">${i.qty}</span>
          <button class="qbtn" onclick="changeQty(${i.id},1)">+</button>
        </div>
        <button class="cremove" onclick="removeCart(${i.id})">🗑️</button>
      </div>`).join('')}</div>
    <div class="csummary">
      <h3>Order Summary</h3>
      <div class="srow"><span>Subtotal (${cart.reduce((s,i)=>s+i.qty,0)} items)</span><span>₹${sub}</span></div>
      <div class="srow"><span>Shipping</span><span>${ship===0?'<span style="color:#16a34a;font-weight:700">FREE</span>':'₹'+ship}</span></div>
      <div class="coupon">
        <input placeholder="Coupon code">
        <button class="cbtn" onclick="showToast('🎉 Coupon applied!')">Apply</button>
      </div>
      <div class="srow total"><span>Total</span><span class="amt">₹${total}</span></div>
      ${sub < 999 ? `<p style="font-size:11px;color:var(--muted);margin-top:5px;text-align:center">Add ₹${999-sub} more for free shipping</p>` : ''}
      <button class="btn-checkout" onclick="openCheckout(null)">Proceed to Checkout →</button>
      <p style="text-align:center;font-size:11px;color:var(--muted);margin-top:8px">🔒 Secure · Free 7-day returns</p>
    </div>
  </div>`;
}

function buyNow(id) {
  buyNowItem = products.find(x => x.id === id);
  openCheckout(buyNowItem);
}

// =============================================
//  CHECKOUT
// =============================================
function openCheckout(item) {
  buyNowItem = item; checkoutStep = 1;
  selectedAddr = 's1'; selectedPay = 'upi';
  // Reset step-indicator display
  const si = document.getElementById('step-indicator');
  if (si) si.style.display = '';
  document.getElementById('modal-foot').style.display = '';
  document.getElementById('checkout-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  updateModal();
}
function closeModal() {
  document.getElementById('checkout-modal').classList.remove('open');
  document.body.style.overflow = '';
}
function updateModal() {
  ['step-1','step-2','step-3','step-success'].forEach(s => document.getElementById(s).classList.remove('active'));
  const stepEl = document.getElementById('step-' + checkoutStep);
  if (stepEl) stepEl.classList.add('active');

  for (let i = 1; i <= 3; i++) {
    const si = document.getElementById('si-' + i);
    if (!si) continue;
    si.classList.remove('active','done');
    if (i < checkoutStep) si.classList.add('done');
    if (i === checkoutStep) si.classList.add('active');
  }

  const titles = {1:'📍 Delivery Address',2:'💳 Payment Method',3:'📦 Review Order'};
  document.getElementById('modal-title').textContent = titles[checkoutStep] || '✅ Order Confirmed!';
  document.getElementById('btn-back').style.visibility = checkoutStep === 1 ? 'hidden' : 'visible';
  document.getElementById('modal-foot').style.display  = checkoutStep >= 4 ? 'none' : '';
  document.getElementById('btn-next').textContent      = checkoutStep === 3 ? '✅ Place Order' : 'Continue →';
}
function selectAddr(v) {
  selectedAddr = v;
  document.querySelectorAll('.addr-saved').forEach(a => a.classList.toggle('on', a.id === 'addr-' + v));
}
function modalNext() {
  if (checkoutStep === 3) { placeOrder(); return; }
  if (checkoutStep === 2) buildReview();
  checkoutStep++; updateModal();
}
function modalBack() {
  if (checkoutStep > 1) { checkoutStep--; updateModal(); }
}

function buildReview() {
  const addrMap = {
    s1: '12/3 Rose Street, T. Nagar, Chennai - 600017, Tamil Nadu',
    s2: '45 Park Avenue, Anna Nagar, Chennai - 600040, Tamil Nadu'
  };
  const addrName = (document.getElementById('addr-name').value || '').trim();
  let finalAddr;
  if (addrName) {
    const line1  = document.getElementById('addr-line1').value || '';
    const line2  = document.getElementById('addr-line2').value || '';
    const city   = document.getElementById('addr-city').value  || '';
    const pin    = document.getElementById('addr-pin').value   || '';
    const state_ = document.getElementById('addr-state').value || '';
    finalAddr = `${addrName}\n${line1}, ${line2}\n${city} - ${pin}, ${state_}`;
  } else {
    finalAddr = addrMap[selectedAddr] || addrMap.s1;
  }
  document.getElementById('review-addr').innerHTML = `<strong>Delivery To:</strong>${finalAddr.split('\n').join('<br>')}`;

  const items = buyNowItem ? [{...buyNowItem, qty:1}] : cart;
  document.getElementById('review-items').innerHTML = items.map(i => {
    const imgHtml = i.dataUrl
      ? `<img src="${i.dataUrl}" onerror="this.style.display='none'">`
      : `<svg viewBox="0 0 24 24" fill="none" style="width:22px;height:22px"><path d="M3 16l5-5 4 4 3-3 4 4" stroke="#c01a54" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="3" width="20" height="18" rx="2" stroke="#c01a54" stroke-width="1.5"/></svg>`;
    return `<div class="oi">
      <div class="oi-img">${imgHtml}</div>
      <div class="oi-name">${i.name} × ${i.qty}</div>
      <div class="oi-price">₹${i.price * i.qty}</div>
    </div>`;
  }).join('');

  const sub  = items.reduce((s,i) => s + i.price * i.qty, 0);
  const ship = sub >= 999 ? 0 : 99;
  const payLabels = {upi:'UPI', card:'Card', netbank:'Net Banking', cod:'Cash on Delivery'};
  document.getElementById('review-total').innerHTML = `
    <div class="review-row"><span>Subtotal</span><span>₹${sub}</span></div>
    <div class="review-row"><span>Shipping</span><span>${ship===0?'FREE':'₹'+ship}</span></div>
    <div class="review-row"><span>Payment</span><span>${payLabels[selectedPay]||selectedPay}</span></div>
    <div class="review-row total"><span>Total</span><span>₹${sub+ship}</span></div>`;
}

function placeOrder() {
  const orderId = 'EBH' + Date.now().toString().slice(-8);
  document.getElementById('order-id-display').textContent = 'Order ID: #' + orderId;
  checkoutStep = 4;
  ['step-1','step-2','step-3'].forEach(s => document.getElementById(s).classList.remove('active'));
  document.getElementById('step-success').classList.add('active');
  const si = document.getElementById('step-indicator');
  if (si) si.style.display = 'none';
  document.getElementById('modal-foot').style.display = 'none';
  document.getElementById('modal-title').textContent  = '✅ Order Confirmed!';
  if (!buyNowItem) { cart = []; updateCartCount(); renderCart(); }
  buyNowItem = null;
}

function selPay(val, el) {
  selectedPay = val;
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('upi-section').style.display  = val === 'upi'  ? '' : 'none';
  document.getElementById('card-section').style.display = val === 'card' ? '' : 'none';
}
function selUpiApp(app) {
  document.querySelectorAll('.upi-app').forEach(a => a.classList.remove('sel'));
  const el = document.getElementById('upi-' + app);
  if (el) el.classList.add('sel');
}

// =============================================
//  ADD PRODUCT
// =============================================
function openAddProduct() {
  document.getElementById('add-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  resetAddForm();
}
function closeAddProduct() {
  document.getElementById('add-modal').classList.remove('open');
  document.body.style.overflow = '';
}
function resetAddForm() {
  ['prod-name','prod-brand','prod-price','prod-original','prod-rating'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('prod-cat').value   = '';
  document.getElementById('prod-badge').value = 'New';
  document.getElementById('img-required-note').classList.remove('show');
  resetImageUpload();
}
function resetImageUpload() {
  document.getElementById('upload-hint').style.display  = 'block';
  document.getElementById('img-preview-el').style.display = 'none';
  document.getElementById('crop-toolbar').classList.remove('show');
  document.getElementById('crop-container').classList.remove('show');
  document.getElementById('crop-confirm-row').style.display = 'none';
  cropImg = null; cropRawDataUrl = null; cropFinalDataUrl = null;
  document.getElementById('prod-img-inp').value = '';
}

function onImageSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('img-required-note').classList.remove('show');
  const reader = new FileReader();
  reader.onload = ev => { cropRawDataUrl = ev.target.result; cropFinalDataUrl = null; initCrop(cropRawDataUrl); };
  reader.readAsDataURL(file);
}
function initCrop(dataUrl) {
  document.getElementById('upload-hint').style.display    = 'none';
  document.getElementById('img-preview-el').style.display = 'none';
  document.getElementById('crop-toolbar').classList.add('show');
  document.getElementById('crop-container').classList.add('show');
  document.getElementById('crop-confirm-row').style.display = 'flex';
  const canvas    = document.getElementById('crop-canvas');
  const container = document.getElementById('crop-container');
  const img = new Image();
  img.onload = function() {
    cropImg = img;
    const maxW   = container.clientWidth || 460;
    canvasScale  = Math.min(1, maxW / img.width);
    canvas.width  = img.width  * canvasScale;
    canvas.height = img.height * canvasScale;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const size = Math.min(canvas.width, canvas.height) * 0.8;
    cropBox = {x:(canvas.width-size)/2, y:(canvas.height-size)/2, w:size, h:size};
    if (cropRatio.w && cropRatio.h) enforceCropRatio();
    updateCropBox();
  };
  img.src = dataUrl;
}
function setCropRatio(w, h, btn) {
  document.querySelectorAll('.crop-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  cropRatio = {w, h};
  if (w && h && cropImg) {
    const canvas = document.getElementById('crop-canvas');
    const maxW = canvas.width * .8, maxH = canvas.height * .8;
    let bw = maxW, bh = maxW * (h/w);
    if (bh > maxH) { bh = maxH; bw = maxH * (w/h); }
    cropBox.w = bw; cropBox.h = bh;
    cropBox.x = (canvas.width - bw) / 2;
    cropBox.y = (canvas.height - bh) / 2;
    updateCropBox();
  }
}
function enforceCropRatio() {
  if (!cropRatio.w || !cropRatio.h) return;
  cropBox.h = cropBox.w / (cropRatio.w / cropRatio.h);
  const canvas = document.getElementById('crop-canvas');
  if (cropBox.y + cropBox.h > canvas.height) {
    cropBox.h = canvas.height - cropBox.y;
    cropBox.w = cropBox.h * (cropRatio.w / cropRatio.h);
  }
}
function updateCropBox() {
  const box     = document.getElementById('crop-box');
  const canvas  = document.getElementById('crop-canvas');
  const overlay = document.getElementById('crop-overlay');
  overlay.style.width  = canvas.width  + 'px';
  overlay.style.height = canvas.height + 'px';
  box.style.left   = cropBox.x + 'px';
  box.style.top    = cropBox.y + 'px';
  box.style.width  = cropBox.w + 'px';
  box.style.height = cropBox.h + 'px';
}

// Crop drag / resize events (set up after DOM ready)
function initCropEvents() {
  const cropBoxEl = document.getElementById('crop-box');
  if (!cropBoxEl) return;

  cropBoxEl.addEventListener('mousedown', e => {
    if (e.target.classList.contains('crop-handle')) return;
    isDragging = true; isResizing = false;
    dragStart = {x:e.clientX, y:e.clientY}; dragBoxStart = {...cropBox};
    e.preventDefault();
  });
  cropBoxEl.addEventListener('touchstart', e => {
    if (e.target.classList.contains('crop-handle')) return;
    isDragging = true; isResizing = false;
    const t = e.touches[0];
    dragStart = {x:t.clientX, y:t.clientY}; dragBoxStart = {...cropBox};
    e.preventDefault();
  }, {passive:false});

  document.querySelectorAll('.crop-handle').forEach(h => {
    h.addEventListener('mousedown', e => {
      isResizing = true; isDragging = false;
      activeHandle = e.target.dataset.h;
      dragStart = {x:e.clientX, y:e.clientY}; dragBoxStart = {...cropBox};
      e.preventDefault(); e.stopPropagation();
    });
    h.addEventListener('touchstart', e => {
      isResizing = true; isDragging = false;
      activeHandle = e.target.dataset.h;
      const t = e.touches[0];
      dragStart = {x:t.clientX, y:t.clientY}; dragBoxStart = {...cropBox};
      e.preventDefault(); e.stopPropagation();
    }, {passive:false});
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging && !isResizing) return;
    handleCropMove(e.clientX - dragStart.x, e.clientY - dragStart.y);
  });
  document.addEventListener('touchmove', e => {
    if (!isDragging && !isResizing) return;
    const t = e.touches[0];
    handleCropMove(t.clientX - dragStart.x, t.clientY - dragStart.y);
    e.preventDefault();
  }, {passive:false});
  document.addEventListener('mouseup',  () => { isDragging = false; isResizing = false; activeHandle = null; });
  document.addEventListener('touchend', () => { isDragging = false; isResizing = false; activeHandle = null; });
}

function handleCropMove(dx, dy) {
  const canvas = document.getElementById('crop-canvas');
  if (isDragging) {
    cropBox.x = Math.max(0, Math.min(canvas.width  - cropBox.w, dragBoxStart.x + dx));
    cropBox.y = Math.max(0, Math.min(canvas.height - cropBox.h, dragBoxStart.y + dy));
  } else if (isResizing) {
    let {x,y,w,h} = dragBoxStart;
    const minS   = 30;
    const aspect = (cropRatio.w && cropRatio.h) ? cropRatio.h / cropRatio.w : null;
    if (activeHandle === 'br') { w=Math.max(minS,w+dx); h=aspect?w*aspect:Math.max(minS,h+dy); }
    else if (activeHandle === 'bl') { w=Math.max(minS,w-dx); x=dragBoxStart.x+dragBoxStart.w-w; h=aspect?w*aspect:Math.max(minS,h+dy); }
    else if (activeHandle === 'tr') { w=Math.max(minS,w+dx); h=aspect?w*aspect:Math.max(minS,h-dy); y=dragBoxStart.y+dragBoxStart.h-h; }
    else if (activeHandle === 'tl') { w=Math.max(minS,w-dx); h=aspect?w*aspect:Math.max(minS,h-dy); x=dragBoxStart.x+dragBoxStart.w-w; y=dragBoxStart.y+dragBoxStart.h-h; }
    w = Math.min(w, canvas.width  - x);
    h = Math.min(h, canvas.height - y);
    x = Math.max(0, x); y = Math.max(0, y);
    cropBox = {x, y, w, h};
  }
  updateCropBox();
}

function applyCrop() {
  if (!cropImg) { showToast('⚠️ No image to crop'); return; }
  const off  = document.createElement('canvas');
  const sx   = cropImg.width  / document.getElementById('crop-canvas').width;
  const sy   = cropImg.height / document.getElementById('crop-canvas').height;
  off.width  = cropBox.w * sx;
  off.height = cropBox.h * sy;
  off.getContext('2d').drawImage(cropImg, cropBox.x*sx, cropBox.y*sy, off.width, off.height, 0, 0, off.width, off.height);
  cropFinalDataUrl = off.toDataURL('image/jpeg', 0.9);
  document.getElementById('crop-container').classList.remove('show');
  document.getElementById('crop-toolbar').classList.remove('show');
  document.getElementById('crop-confirm-row').style.display = 'none';
  const prev = document.getElementById('img-preview-el');
  prev.src = cropFinalDataUrl; prev.style.display = 'block';
  document.getElementById('upload-hint').style.display = 'none';
  showToast('✅ Image cropped!');
}
function resetCrop() { initCrop(cropRawDataUrl); }

function saveProduct() {
  const name     = document.getElementById('prod-name').value.trim();
  const brand    = document.getElementById('prod-brand').value.trim();
  const cat      = document.getElementById('prod-cat').value;
  const price    = parseInt(document.getElementById('prod-price').value);
  const original = parseInt(document.getElementById('prod-original').value);
  const rating   = parseFloat(document.getElementById('prod-rating').value) || 4.5;
  const badge    = document.getElementById('prod-badge').value;
  const dataUrl  = cropFinalDataUrl || cropRawDataUrl || null;

  if (!dataUrl) {
    document.getElementById('img-required-note').classList.add('show');
    showToast('⚠️ Product image upload பண்ணுங்க');
    document.getElementById('upload-area').scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  if (!name)                        { showToast('⚠️ Product name required'); return; }
  if (!brand)                       { showToast('⚠️ Brand name required'); return; }
  if (!cat)                         { showToast('⚠️ Category select பண்ணுங்க'); return; }
  if (!price || price < 1)          { showToast('⚠️ Valid selling price required'); return; }
  if (!original || original < 1)    { showToast('⚠️ Valid original price required'); return; }
  if (price >= original)            { showToast('⚠️ Selling price must be less than original price'); return; }

  const id = nextId++;
  const newProd = {
    id, name, brand, cat, dataUrl,
    price, original,
    rating: Math.min(5, Math.max(0, rating)),
    reviews:'0', badge, userAdded:true,
    ownerUid: currentUser?.uid || null
  };
  userProducts.push(newProd);
  saveUserProductsLocal(userProducts);
  rebuildProducts(); buildFilters(); applyAllFilters(); renderHorizontalSections();
  closeAddProduct();
  showToast('🎉 Product added successfully!');
  setTimeout(() => {
    const el = document.getElementById('pc-' + id);
    if (el) el.scrollIntoView({behavior:'smooth', block:'center'});
  }, 400);
}

// =============================================
//  MISC
// =============================================
function toggleFaq(item) {
  item.classList.toggle('open');
  item.querySelector('.faq-a').classList.toggle('open');
}

// =============================================
//  NAVIGATION
// =============================================
function go(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
  if (page === 'cart') renderCart();
  closeMob();
}
function toggleMob() { document.getElementById('mobNav').classList.toggle('open'); }
function closeMob()  { document.getElementById('mobNav').classList.remove('open'); }

// Close modals on backdrop click
document.getElementById('checkout-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
document.getElementById('add-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeAddProduct(); });
document.getElementById('del-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeDelModal(); });

// ESC key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeAddProduct(); closeDelModal(); closeMob(); closeFilterDrawer(); }
});

// =============================================
//  INIT
// =============================================
rebuildProducts();
buildFilters();
applyAllFilters();
renderHorizontalSections();
updateUserNav();
initCropEvents();  // init crop drag events after DOM is ready