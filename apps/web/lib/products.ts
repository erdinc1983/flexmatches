export type Category = "All" | "Supplements" | "Equipment" | "Apparel" | "Accessories";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: Exclude<Category, "All">;
  emoji: string;
  description: string;
  price: string;
  rating: number;
  affiliateUrl: string;
  badge?: string;
};

export const PRODUCTS: Product[] = [
  // Supplements
  {
    id: "1", name: "Whey Protein Isolate", brand: "Optimum Nutrition", category: "Supplements",
    emoji: "🥛", description: "25g protein per serving, low carb, fast-absorbing post-workout formula.",
    price: "$54.99", rating: 4.8, badge: "Best Seller",
    affiliateUrl: "https://www.amazon.com/s?k=optimum+nutrition+whey+protein+isolate",
  },
  {
    id: "2", name: "Creatine Monohydrate", brand: "Thorne", category: "Supplements",
    emoji: "💊", description: "NSF certified, 5g pure creatine per serving. Increases strength and power output.",
    price: "$39.99", rating: 4.7,
    affiliateUrl: "https://www.amazon.com/s?k=thorne+creatine+monohydrate",
  },
  {
    id: "3", name: "Pre-Workout Energy", brand: "C4 Original", category: "Supplements",
    emoji: "⚡", description: "150mg caffeine, beta-alanine, and NO3-T for explosive energy and pumps.",
    price: "$29.99", rating: 4.6, badge: "Popular",
    affiliateUrl: "https://www.amazon.com/s?k=c4+original+pre+workout",
  },
  {
    id: "4", name: "BCAA Recovery Powder", brand: "Scivation Xtend", category: "Supplements",
    emoji: "🧪", description: "7g BCAAs per serving, zero sugar, promotes muscle recovery and hydration.",
    price: "$34.99", rating: 4.5,
    affiliateUrl: "https://www.amazon.com/s?k=scivation+xtend+bcaa",
  },
  {
    id: "5", name: "Omega-3 Fish Oil", brand: "Nordic Naturals", category: "Supplements",
    emoji: "🐟", description: "1280mg omega-3s, anti-inflammatory, supports joint health for active lifestyles.",
    price: "$27.99", rating: 4.9,
    affiliateUrl: "https://www.amazon.com/s?k=nordic+naturals+omega+3",
  },

  // Equipment
  {
    id: "6", name: "Adjustable Dumbbells", brand: "Bowflex", category: "Equipment",
    emoji: "🏋️", description: "5–52.5 lbs per dumbbell, replaces 15 sets. Quick dial adjustment system.",
    price: "$399.99", rating: 4.8, badge: "Top Pick",
    affiliateUrl: "https://www.amazon.com/s?k=bowflex+adjustable+dumbbells",
  },
  {
    id: "7", name: "Resistance Bands Set", brand: "Fit Simplify", category: "Equipment",
    emoji: "🪢", description: "5 resistance levels (10–50 lbs), latex free, includes carry bag and guide.",
    price: "$14.99", rating: 4.7, badge: "Budget Pick",
    affiliateUrl: "https://www.amazon.com/s?k=fit+simplify+resistance+bands",
  },
  {
    id: "8", name: "Foam Roller", brand: "TriggerPoint", category: "Equipment",
    emoji: "🟠", description: "Multi-density surface for deep tissue massage. Reduces muscle soreness.",
    price: "$36.99", rating: 4.6,
    affiliateUrl: "https://www.amazon.com/s?k=triggerpoint+foam+roller",
  },
  {
    id: "9", name: "Pull-Up Bar", brand: "Iron Gym", category: "Equipment",
    emoji: "🏗️", description: "No screws needed, fits doors 24–36 inches wide. 300 lb capacity.",
    price: "$29.99", rating: 4.5,
    affiliateUrl: "https://www.amazon.com/s?k=iron+gym+pull+up+bar",
  },

  // Apparel
  {
    id: "10", name: "Compression Tights", brand: "Nike Pro", category: "Apparel",
    emoji: "🩱", description: "Dri-FIT technology, 4-way stretch, muscle support for high-intensity training.",
    price: "$45.00", rating: 4.7, badge: "Staff Pick",
    affiliateUrl: "https://www.amazon.com/s?k=nike+pro+compression+tights",
  },
  {
    id: "11", name: "Training Shoes", brand: "Nike Metcon 9", category: "Apparel",
    emoji: "👟", description: "Stable flat heel for lifting, flexible forefoot for running. CrossFit certified.",
    price: "$130.00", rating: 4.8,
    affiliateUrl: "https://www.amazon.com/s?k=nike+metcon+9+training+shoes",
  },
  {
    id: "12", name: "Performance Tank Top", brand: "Under Armour", category: "Apparel",
    emoji: "👕", description: "HeatGear fabric wicks sweat, ultra-light, anti-odor technology.",
    price: "$25.00", rating: 4.6,
    affiliateUrl: "https://www.amazon.com/s?k=under+armour+performance+tank+top",
  },

  // Accessories
  {
    id: "13", name: "Insulated Water Bottle", brand: "Hydro Flask", category: "Accessories",
    emoji: "🍶", description: "32 oz, keeps drinks cold 24h / hot 12h. Wide mouth, leakproof lid.",
    price: "$44.95", rating: 4.9, badge: "Fan Favorite",
    affiliateUrl: "https://www.amazon.com/s?k=hydro+flask+32+oz+water+bottle",
  },
  {
    id: "14", name: "Gym Duffel Bag", brand: "Nike Brasilia", category: "Accessories",
    emoji: "🎒", description: "60L capacity, separate shoe compartment, padded shoulder strap.",
    price: "$55.00", rating: 4.7,
    affiliateUrl: "https://www.amazon.com/s?k=nike+brasilia+gym+bag",
  },
  {
    id: "15", name: "Weightlifting Gloves", brand: "Harbinger", category: "Accessories",
    emoji: "🧤", description: "Full palm padding, wrist support strap, breathable spandex back.",
    price: "$19.99", rating: 4.5,
    affiliateUrl: "https://www.amazon.com/s?k=harbinger+weightlifting+gloves",
  },
];

export const CATEGORIES: Category[] = ["All", "Supplements", "Equipment", "Apparel", "Accessories"];

export const CATEGORY_EMOJI: Record<Category, string> = {
  All: "🛍️",
  Supplements: "💊",
  Equipment: "🏋️",
  Apparel: "👕",
  Accessories: "🎒",
};
