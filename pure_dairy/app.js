/* app.js
 - Shared dataset + UI logic for multi-page static site
 - No server required; uses query param `?id=` to show company detail.
*/

/* ===== sample data =====
   You can replace/add companies here.
   Each company has: id, name, region, products, description, established, website, certifications
*/
const COMPANIES = [
  {
    id: "alpine-farms",
    name: "Alpine Farms Dairy",
    region: "Alps Region",
    products: ["Milk", "Cheese", "Yogurt"],
    description: "Family-run dairy known for alpine-grazed cows and traditional cheese-making.",
    established: 1986,
    website: "https://example.com/alpine-farms",
    certifications: ["Organic", "Geo-Trace"],
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "greenmeadow",
    name: "Green Meadow Co-op",
    region: "Midwest",
    products: ["Milk", "Butter"],
    description: "Cooperative of small farms focused on sustainable pasture-raised milk.",
    established: 1972,
    website: "https://example.com/greenmeadow",
    certifications: ["Grass-Fed", "ISO 22000"],
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "ocean-milk",
    name: "Ocean Milk Ltd.",
    region: "Coastal",
    products: ["UHT Milk", "Milk Powder"],
    description: "Large-scale processor supplying retail chains with long-life milk and powder.",
    established: 1998,
    website: "https://example.com/ocean-milk",
    certifications: ["HACCP"],
    image: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "mountain-creme",
    name: "Mountain Crème",
    region: "Highlands",
    products: ["Cream", "Cheese", "Yogurt"],
    description: "Artisanal cream and specialty cheeses with seasonal offerings.",
    established: 2005,
    website: "https://example.com/mountain-creme",
    certifications: [],
    image: "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=600&q=80"
  }
];

/* ===== Utilities ===== */
function el(sel) { return document.querySelector(sel); }
function els(sel) { return Array.from(document.querySelectorAll(sel)); }
function setYears() {
  const y = new Date().getFullYear();
  els("#year, #year-2, #year-3, #year-4, #year-5").forEach(node => {
    if (node) node.textContent = y;
  });
}

/* ===== Home page: render featured companies ===== */
function renderFeatured() {
  const target = el("#featured-list");
  if (!target) return;
  // pick first 3 as featured
  const featured = COMPANIES.slice(0, 3);
  target.innerHTML = featured.map(c => `
    <article class="company" tabindex="0">
      ${c.image ? `<img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.name)}" class="company-img" loading="lazy"/>` : `<div class="logo-pill" aria-hidden="true">${escapeHtml(c.name.split(" ").map(w=>w[0]).slice(0,2).join(""))}</div>`}
      <div class="name">${escapeHtml(c.name)}</div>
      <div class="meta">${escapeHtml(c.region)} • ${escapeHtml(c.products.join(", "))}</div>
      <div class="actions">
        <a class="btn" href="company.html?id=${encodeURIComponent(c.id)}">View profile</a>
      </div>
    </article>
  `).join("");
}

/* ===== Companies page: search, filters, list ===== */
function initCompaniesPage() {
  const list = el("#companies-list");
  if (!list) return;

  const searchInput = el("#search");
  const regionFilter = el("#region-filter");
  const productFilter = el("#product-filter");

  // populate region & product options
  const regions = Array.from(new Set(COMPANIES.map(c => c.region))).sort();
  const products = Array.from(new Set(COMPANIES.flatMap(c => c.products))).sort();

  regions.forEach(r => {
    const opt = document.createElement("option"); opt.value = r; opt.textContent = r; regionFilter.appendChild(opt);
  });
  products.forEach(p => {
    const opt = document.createElement("option"); opt.value = p; opt.textContent = p; productFilter.appendChild(opt);
  });

  function render(listItems) {
    if (listItems.length === 0) {
      list.innerHTML = `<p class="muted">No companies match your search.</p>`;
      return;
    }
    list.innerHTML = listItems.map(c => `
      <article class="company" aria-label="${escapeHtml(c.name)}">
        ${c.image ? `<img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.name)}" class="company-img" loading="lazy"/>` : `<div class="logo-pill" aria-hidden="true">${escapeHtml(c.name.split(" ").map(w=>w[0]).slice(0,2).join(""))}</div>`}
        <div class="name">${escapeHtml(c.name)}</div>
        <div class="meta">${escapeHtml(c.region)}</div>
        <div class="muted">${escapeHtml(c.products.join(", "))}</div>
        <div class="actions">
          <a class="btn" href="company.html?id=${encodeURIComponent(c.id)}">View profile</a>
          <a class="btn" href="${escapeHtml(c.website)}" target="_blank" rel="noopener">Visit site</a>
        </div>
      </article>
    `).join("");
  }

  function getFiltered() {
    const q = searchInput.value.trim().toLowerCase();
    const region = regionFilter.value;
    const product = productFilter.value;
    return COMPANIES.filter(c => {
      if (region && c.region !== region) return false;
      if (product && !c.products.includes(product)) return false;
      if (!q) return true;
      const hay = (c.name + " " + c.region + " " + c.products.join(" ") + " " + c.description).toLowerCase();
      return hay.includes(q);
    });
  }

  function update() { render(getFiltered()); }

  // events
  searchInput.addEventListener("input", debounce(update, 200));
  regionFilter.addEventListener("change", update);
  productFilter.addEventListener("change", update);

  // initial render
  render(COMPANIES);
}

/* ===== Company detail page ===== */
function initCompanyDetailPage() {
  const container = el("#company-detail");
  if (!container) return;

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) {
    container.innerHTML = `<p class="muted">No company selected. Go back to the <a href="companies.html">companies list</a>.</p>`;
    return;
  }
  const company = COMPANIES.find(c => c.id === id);
  if (!company) {
    container.innerHTML = `<p class="muted">Company not found. <a href="companies.html">View all companies</a>.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="company-detail">
      <div class="header">
        ${company.image ? `<img src="${escapeHtml(company.image)}" alt="${escapeHtml(company.name)}" class="company-img" style="width:110px;height:110px;object-fit:cover;border-radius:14px;margin-right:10px;" loading="lazy"/>` : `<div class="logo-pill" aria-hidden="true">${escapeHtml(company.name.split(" ").map(w=>w[0]).slice(0,2).join(""))}</div>`}
        <div>
          <h1>${escapeHtml(company.name)}</h1>
          <div class="meta">${escapeHtml(company.region)} • Established ${escapeHtml(String(company.established))}</div>
          <div class="muted">${escapeHtml(company.products.join(", "))}</div>
        </div>
      </div>

      <div class="detail-grid">
        <div>
          <h2>About</h2>
          <p>${escapeHtml(company.description)}</p>

          <h3>Certifications</h3>
          <p class="muted">${company.certifications.length ? escapeHtml(company.certifications.join(", ")) : "None listed"}</p>

          <h3>Website</h3>
          <p><a href="${escapeHtml(company.website)}" target="_blank" rel="noopener">${escapeHtml(company.website)}</a></p>
        </div>

        <aside>
          <div class="card">
            <h4>Quick facts</h4>
            <p><span class="kv">Region:</span> ${escapeHtml(company.region)}</p>
            <p><span class="kv">Products:</span> ${escapeHtml(company.products.join(", "))}</p>
            <p><span class="kv">Established:</span> ${escapeHtml(String(company.established))}</p>
            <div style="margin-top:12px">
              <a class="btn" href="companies.html">Back to list</a>
              <a class="btn primary" href="${escapeHtml(company.website)}" target="_blank" rel="noopener">Visit site</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

/* ===== Contact form handling (front-end only) ===== */
function initContactForm() {
  const form = el("#contact-form");
  if (!form) return;
  const feedback = el("#contact-feedback");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = el("#contact-name").value.trim();
    const email = el("#contact-email").value.trim();
    const message = el("#contact-message").value.trim();

    if (!name || !email || !message) {
      feedback.textContent = "Please fill in all fields.";
      feedback.style.color = "var(--danger, #d9534f)";
      return;
    }

    // simple email check
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      feedback.textContent = "Please enter a valid email.";
      feedback.style.color = "var(--danger, #d9534f)";
      return;
    }

    // front-end “send” simulation
    feedback.textContent = "Thanks! Your message has been recorded (demo only).";
    feedback.style.color = "var(--accent, #0f766e)";
    form.reset();
  });
}

/* ===== small helpers ===== */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'", "&#39;");
}
function debounce(fn, wait=150){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
}

/* ===== Init on DOM ready ===== */
document.addEventListener("DOMContentLoaded", () => {
  setYears();
  renderFeatured();
  initCompaniesPage();
  initCompanyDetailPage();
  initContactForm();
});
