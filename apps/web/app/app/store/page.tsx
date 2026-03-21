"use client";
import { useEffect, useState, useMemo } from "react";
import {
  PRODUCTS, CATEGORIES, CATEGORY_EMOJI, FEATURED_BRANDS, AFFILIATE_PROGRAM_LABELS,
  type Category, type Brand, type Product,
} from "../../../lib/products";
import { supabase } from "../../../lib/supabase";

type SortOption = "rating" | "price-asc" | "price-desc";

export default function StorePage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [activeBrand, setActiveBrand] = useState<Brand>("All Brands");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("rating");
  const [userSports, setUserSports] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("users").select("sports").eq("id", user.id).single();
      if (data?.sports) setUserSports(data.sports);
    });
  }, []);

  const recommended = useMemo(() => {
    if (userSports.length === 0) return [];
    return PRODUCTS
      .filter((p) => p.sports?.some((s) => userSports.includes(s)))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8);
  }, [userSports]);

  const filtered = useMemo(() => {
    let result = PRODUCTS;
    if (activeCategory !== "All") result = result.filter((p) => p.category === activeCategory);
    if (activeBrand !== "All Brands") result = result.filter((p) => p.brandKey === activeBrand || p.brand === activeBrand);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    if (sort === "rating") result = [...result].sort((a, b) => b.rating - a.rating);
    else if (sort === "price-asc") result = [...result].sort((a, b) => a.priceNum - b.priceNum);
    else if (sort === "price-desc") result = [...result].sort((a, b) => b.priceNum - a.priceNum);
    return result;
  }, [activeCategory, activeBrand, search, sort]);

  function trackClick(product: Product) {
    // Log affiliate click to Supabase for analytics
    if (userId) {
      supabase.from("affiliate_clicks").insert({
        user_id: userId,
        product_id: product.id,
        product_name: product.name,
        brand: product.brand,
        affiliate_program: product.affiliateProgram ?? "amazon",
        price_usd: product.priceNum,
      }).then(() => {});
    }
  }

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5, margin: 0 }}>Fitness Store</h1>
        <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Nike, Adidas, Puma, Gymshark & more</p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--text-faint)" }}>🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Nike, gym gloves, protein..."
          style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "10px 12px 10px 36px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
        />
        {search && (
          <button onClick={() => setSearch("")}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-faint)", fontSize: 16, cursor: "pointer", padding: 0 }}>✕</button>
        )}
      </div>

      {/* Sort */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {([
          { key: "rating", label: "⭐ Top Rated" },
          { key: "price-asc", label: "💰 Price ↑" },
          { key: "price-desc", label: "💎 Price ↓" },
        ] as { key: SortOption; label: string }[]).map((s) => (
          <button key={s.key} onClick={() => setSort(s.key)}
            style={{ flexShrink: 0, padding: "7px 12px", borderRadius: 10, fontWeight: 700, fontSize: 11, border: `1px solid ${sort === s.key ? "var(--accent)" : "var(--bg-input)"}`, background: sort === s.key ? "#FF450022" : "transparent", color: sort === s.key ? "var(--accent)" : "var(--text-faint)", cursor: "pointer" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Featured Brands */}
      {!search && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", marginBottom: 10, letterSpacing: 0.5 }}>SHOP BY BRAND</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            <button
              onClick={() => setActiveBrand("All Brands")}
              style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${activeBrand === "All Brands" ? "var(--accent)" : "var(--border-medium)"}`, background: activeBrand === "All Brands" ? "#FF450022" : "var(--bg-card-alt)", color: activeBrand === "All Brands" ? "var(--accent)" : "var(--text-muted)" }}>
              All Brands
            </button>
            {FEATURED_BRANDS.map((b) => (
              <button key={b.name}
                onClick={() => setActiveBrand(b.name)}
                style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${activeBrand === b.name ? "var(--accent)" : "var(--border-medium)"}`, background: activeBrand === b.name ? "#FF450022" : "var(--bg-card-alt)", color: activeBrand === b.name ? "var(--accent)" : "var(--text-muted)" }}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 20, scrollbarWidth: "none" }}>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => { setActiveCategory(cat); setActiveBrand("All Brands"); }}
            style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 999, fontWeight: 700, fontSize: 12,
              border: `1px solid ${activeCategory === cat ? "var(--accent)" : "var(--bg-input)"}`,
              background: activeCategory === cat ? "var(--accent)" : "transparent",
              color: activeCategory === cat ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>
            {CATEGORY_EMOJI[cat]} {cat}
          </button>
        ))}
      </div>

      {/* Personalized Recommendations */}
      {recommended.length > 0 && !search && activeCategory === "All" && activeBrand === "All Brands" && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            🎯 Recommended for you
            <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>based on your sports</span>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
            {recommended.map((product) => (
              <div key={product.id} onClick={() => setSelectedProduct(product)}
                style={{ flexShrink: 0, width: 140, background: "var(--bg-card-alt)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--accent-faint)", cursor: "pointer" }}>
                <div style={{ background: "var(--bg-card)", height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
                  {product.emoji}
                </div>
                <div style={{ padding: "8px 10px 10px" }}>
                  <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, marginBottom: 2 }}>{product.brand}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 4 }}>{product.name}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)" }}>{product.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>
        {filtered.length} {filtered.length === 1 ? "product" : "products"}
        {activeBrand !== "All Brands" && <span> from <span style={{ color: "var(--accent)" }}>{activeBrand}</span></span>}
        {search && <span> for "<span style={{ color: "var(--accent)" }}>{search}</span>"</span>}
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 48 }}>🔍</div>
          <p style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginTop: 16 }}>No products found</p>
          <p style={{ color: "var(--text-faint)", fontSize: 14, marginTop: 8 }}>Try a different search or category.</p>
          <button onClick={() => { setSearch(""); setActiveCategory("All"); setActiveBrand("All Brands"); }}
            style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {filtered.map((product) => (
            <div key={product.id} onClick={() => setSelectedProduct(product)}
              style={{ background: "var(--bg-card-alt)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--border-medium)", cursor: "pointer", position: "relative" }}>
              {product.badge && (
                <div style={{ position: "absolute", top: 8, left: 8, background: "var(--accent)", color: "var(--text-primary)", fontSize: 9, fontWeight: 800, borderRadius: 6, padding: "2px 7px", zIndex: 1 }}>
                  {product.badge}
                </div>
              )}
              <div style={{ background: "var(--bg-card)", height: 110, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                {product.emoji}
              </div>
              <div style={{ padding: "10px 12px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginBottom: 3 }}>{product.brand}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 6 }}>{product.name}</div>
                <div style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 1, marginBottom: 6 }}>
                  {"★".repeat(Math.floor(product.rating))}{"☆".repeat(5 - Math.floor(product.rating))}
                  <span style={{ color: "var(--text-faint)", marginLeft: 4 }}>{product.rating}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)" }}>{product.price}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div onClick={() => setSelectedProduct(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "85dvh", overflowY: "auto", border: "1px solid var(--border)" } as React.CSSProperties}>

            {/* Close */}
            <button onClick={() => setSelectedProduct(null)}
              style={{ float: "right", background: "none", border: "none", color: "var(--text-faint)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>

            {/* Product header */}
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
              <div style={{ width: 80, height: 80, background: "var(--bg-card-alt)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, flexShrink: 0, border: "1px solid var(--border-medium)" }}>
                {selectedProduct.emoji}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>{selectedProduct.brand}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3 }}>{selectedProduct.name}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {selectedProduct.badge && (
                    <span style={{ fontSize: 10, background: "var(--accent)", color: "var(--text-primary)", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>
                      {selectedProduct.badge}
                    </span>
                  )}
                  <span style={{ fontSize: 10, background: "var(--bg-card-alt)", color: "var(--text-muted)", borderRadius: 6, padding: "2px 8px", border: "1px solid var(--border-medium)" }}>
                    {CATEGORY_EMOJI[selectedProduct.category]} {selectedProduct.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ color: "#f59e0b", fontSize: 16, letterSpacing: 2 }}>
                {"★".repeat(Math.floor(selectedProduct.rating))}{"☆".repeat(5 - Math.floor(selectedProduct.rating))}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{selectedProduct.rating} / 5.0</span>
            </div>

            {/* Description */}
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>{selectedProduct.description}</p>

            {/* Highlights */}
            {selectedProduct.highlights && selectedProduct.highlights.length > 0 && (
              <div style={{ marginBottom: 16, background: "var(--bg-card-alt)", borderRadius: 12, padding: "12px 16px" }}>
                {selectedProduct.highlights.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < selectedProduct.highlights!.length - 1 ? 8 : 0 }}>
                    <span style={{ color: "var(--accent)", fontWeight: 800, flexShrink: 0 }}>✓</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.4 }}>{h}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Best for sports */}
            {selectedProduct.sports && selectedProduct.sports.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, marginBottom: 8 }}>BEST FOR</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedProduct.sports.map((s) => (
                    <span key={s} style={{ fontSize: 11, color: "var(--accent)", background: "#1a0800", borderRadius: 999, padding: "3px 10px", border: "1px solid var(--accent-faint)", fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Price + CTA */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary)" }}>{selectedProduct.price}</div>
              <a
                href={selectedProduct.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick(selectedProduct)}
                style={{ flex: 1, padding: 14, borderRadius: 14, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 800, fontSize: 15, cursor: "pointer", textAlign: "center", textDecoration: "none", display: "block" }}>
                {AFFILIATE_PROGRAM_LABELS[selectedProduct.affiliateProgram ?? "amazon"] ?? "Shop Now"} →
              </a>
            </div>

            <p style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 12 }}>
              Affiliate link — we may earn a small commission at no extra cost to you.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
