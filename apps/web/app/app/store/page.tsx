"use client";
import { useState } from "react";
import { PRODUCTS, CATEGORIES, CATEGORY_EMOJI, type Category } from "../../../lib/products";

export default function StorePage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [selectedProduct, setSelectedProduct] = useState<typeof PRODUCTS[0] | null>(null);

  const filtered = activeCategory === "All"
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === activeCategory);

  function renderStars(rating: number) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  }

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5, margin: 0 }}>Fitness Store</h1>
        <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Gear up with top-rated products</p>
      </div>

      {/* Category Filter */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 20, scrollbarWidth: "none" }}>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 999, fontWeight: 700, fontSize: 12,
              border: `1px solid ${activeCategory === cat ? "#FF4500" : "#2a2a2a"}`,
              background: activeCategory === cat ? "#FF4500" : "transparent",
              color: activeCategory === cat ? "#fff" : "#888",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>
            {CATEGORY_EMOJI[cat]} {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {filtered.map((product) => (
          <div key={product.id} onClick={() => setSelectedProduct(product)}
            style={{ background: "#1a1a1a", borderRadius: 16, overflow: "hidden", border: "1px solid #2a2a2a", cursor: "pointer", position: "relative" }}>
            {product.badge && (
              <div style={{ position: "absolute", top: 8, left: 8, background: "#FF4500", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 6, padding: "2px 7px", zIndex: 1 }}>
                {product.badge}
              </div>
            )}
            {/* Product image area */}
            <div style={{ background: "#111", height: 110, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
              {product.emoji}
            </div>
            <div style={{ padding: "10px 12px 12px" }}>
              <div style={{ fontSize: 11, color: "#FF4500", fontWeight: 700, marginBottom: 3 }}>{product.brand}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 6 }}>{product.name}</div>
              <div style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 1, marginBottom: 6 }}>
                {"★".repeat(Math.floor(product.rating))}{"☆".repeat(5 - Math.floor(product.rating))}
                <span style={{ color: "#555", marginLeft: 4 }}>{product.rating}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{product.price}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div onClick={() => setSelectedProduct(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "85dvh", overflowY: "auto", border: "1px solid #1a1a1a" } as React.CSSProperties}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />

            {/* Product header */}
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
              <div style={{ width: 80, height: 80, background: "#1a1a1a", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, flexShrink: 0, border: "1px solid #2a2a2a" }}>
                {selectedProduct.emoji}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#FF4500", fontWeight: 700, marginBottom: 4 }}>{selectedProduct.brand}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>{selectedProduct.name}</div>
                {selectedProduct.badge && (
                  <span style={{ fontSize: 10, background: "#FF4500", color: "#fff", borderRadius: 6, padding: "2px 8px", fontWeight: 700, display: "inline-block", marginTop: 6 }}>
                    {selectedProduct.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Rating */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ color: "#f59e0b", fontSize: 16, letterSpacing: 2 }}>
                {"★".repeat(Math.floor(selectedProduct.rating))}{"☆".repeat(5 - Math.floor(selectedProduct.rating))}
              </span>
              <span style={{ color: "#888", fontSize: 13 }}>{selectedProduct.rating} / 5.0</span>
            </div>

            {/* Description */}
            <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{selectedProduct.description}</p>

            {/* Category tag */}
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 12, color: "#888", background: "#1a1a1a", borderRadius: 8, padding: "4px 12px", border: "1px solid #2a2a2a" }}>
                {CATEGORY_EMOJI[selectedProduct.category]} {selectedProduct.category}
              </span>
            </div>

            {/* Price + CTA */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{selectedProduct.price}</div>
              <a href={selectedProduct.affiliateUrl} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, padding: 14, borderRadius: 14, border: "none", background: "#FF4500", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", textAlign: "center", textDecoration: "none", display: "block" }}>
                Shop on Amazon →
              </a>
            </div>

            <p style={{ fontSize: 11, color: "#333", textAlign: "center", marginTop: 12 }}>
              * Affiliate link — we earn a small commission at no cost to you
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
