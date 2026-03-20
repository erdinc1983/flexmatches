export type Category = "All" | "Supplements" | "Equipment" | "Apparel" | "Accessories" | "Recovery";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: Exclude<Category, "All">;
  emoji: string;
  description: string;
  price: string;
  priceNum: number; // for sorting
  rating: number;
  affiliateUrl: string;
  badge?: string;
  sports?: string[]; // for personalized recommendations
};

export const PRODUCTS: Product[] = [
  // Supplements
  {
    id: "1", name: "Whey Protein Isolate", brand: "Optimum Nutrition", category: "Supplements",
    emoji: "🥛", description: "25g protein per serving, low carb, fast-absorbing post-workout formula.",
    price: "$54.99", priceNum: 54.99, rating: 4.8, badge: "Best Seller",
    affiliateUrl: "https://www.amazon.com/s?k=optimum+nutrition+whey+protein+isolate",
    sports: ["Gym", "CrossFit", "Running"],
  },
  {
    id: "2", name: "Creatine Monohydrate", brand: "Thorne", category: "Supplements",
    emoji: "💊", description: "NSF certified, 5g pure creatine per serving. Increases strength and power output.",
    price: "$39.99", priceNum: 39.99, rating: 4.7,
    affiliateUrl: "https://www.amazon.com/s?k=thorne+creatine+monohydrate",
    sports: ["Gym", "CrossFit", "Football", "Basketball"],
  },
  {
    id: "3", name: "Pre-Workout Energy", brand: "C4 Original", category: "Supplements",
    emoji: "⚡", description: "150mg caffeine, beta-alanine, and NO3-T for explosive energy and pumps.",
    price: "$29.99", priceNum: 29.99, rating: 4.6, badge: "Popular",
    affiliateUrl: "https://www.amazon.com/s?k=c4+original+pre+workout",
    sports: ["Gym", "CrossFit", "Boxing"],
  },
  {
    id: "4", name: "BCAA Recovery Powder", brand: "Scivation Xtend", category: "Supplements",
    emoji: "🧪", description: "7g BCAAs per serving, zero sugar, promotes muscle recovery and hydration.",
    price: "$34.99", priceNum: 34.99, rating: 4.5,
    affiliateUrl: "https://www.amazon.com/s?k=scivation+xtend+bcaa",
    sports: ["Gym", "Running", "Cycling", "Swimming"],
  },
  {
    id: "5", name: "Omega-3 Fish Oil", brand: "Nordic Naturals", category: "Supplements",
    emoji: "🐟", description: "1280mg omega-3s, anti-inflammatory, supports joint health for active lifestyles.",
    price: "$27.99", priceNum: 27.99, rating: 4.9,
    affiliateUrl: "https://www.amazon.com/s?k=nordic+naturals+omega+3",
    sports: ["Gym", "Running", "Swimming", "Cycling", "Yoga"],
  },
  {
    id: "16", name: "Electrolyte Powder", brand: "Liquid I.V.", category: "Supplements",
    emoji: "🧃", description: "3x the electrolytes of sports drinks, non-GMO, 11 essential vitamins.",
    price: "$24.99", priceNum: 24.99, rating: 4.7, badge: "New",
    affiliateUrl: "https://www.amazon.com/s?k=liquid+iv+electrolyte+powder",
    sports: ["Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis"],
  },
  {
    id: "17", name: "Collagen Peptides", brand: "Vital Proteins", category: "Supplements",
    emoji: "🦴", description: "20g collagen per serving, supports joints, skin, and muscle recovery.",
    price: "$43.99", priceNum: 43.99, rating: 4.6,
    affiliateUrl: "https://www.amazon.com/s?k=vital+proteins+collagen+peptides",
    sports: ["Running", "Yoga", "Pilates", "Hiking"],
  },

  // Equipment
  {
    id: "6", name: "Adjustable Dumbbells", brand: "Bowflex", category: "Equipment",
    emoji: "🏋️", description: "5–52.5 lbs per dumbbell, replaces 15 sets. Quick dial adjustment system.",
    price: "$399.99", priceNum: 399.99, rating: 4.8, badge: "Top Pick",
    affiliateUrl: "https://www.amazon.com/s?k=bowflex+adjustable+dumbbells",
    sports: ["Gym", "CrossFit"],
  },
  {
    id: "7", name: "Resistance Bands Set", brand: "Fit Simplify", category: "Equipment",
    emoji: "🪢", description: "5 resistance levels (10–50 lbs), latex free, includes carry bag and guide.",
    price: "$14.99", priceNum: 14.99, rating: 4.7, badge: "Budget Pick",
    affiliateUrl: "https://www.amazon.com/s?k=fit+simplify+resistance+bands",
    sports: ["Gym", "Yoga", "Pilates", "Hiking"],
  },
  {
    id: "8", name: "Foam Roller", brand: "TriggerPoint", category: "Equipment",
    emoji: "🟠", description: "Multi-density surface for deep tissue massage. Reduces muscle soreness.",
    price: "$36.99", priceNum: 36.99, rating: 4.6,
    affiliateUrl: "https://www.amazon.com/s?k=triggerpoint+foam+roller",
    sports: ["Gym", "Running", "CrossFit", "Yoga", "Pilates"],
  },
  {
    id: "9", name: "Pull-Up Bar", brand: "Iron Gym", category: "Equipment",
    emoji: "🏗️", description: "No screws needed, fits doors 24–36 inches wide. 300 lb capacity.",
    price: "$29.99", priceNum: 29.99, rating: 4.5,
    affiliateUrl: "https://www.amazon.com/s?k=iron+gym+pull+up+bar",
    sports: ["Gym", "CrossFit", "Boxing"],
  },
  {
    id: "18", name: "Jump Rope", brand: "Crossrope", category: "Equipment",
    emoji: "🪃", description: "Weighted handles, interchangeable ropes, tracks jumps via app.",
    price: "$68.00", priceNum: 68.00, rating: 4.8, badge: "Popular",
    affiliateUrl: "https://www.amazon.com/s?k=crossrope+jump+rope",
    sports: ["CrossFit", "Boxing", "Running"],
  },
  {
    id: "19", name: "Yoga Mat (6mm)", brand: "Liforme", category: "Equipment",
    emoji: "🧘", description: "Alignment markers, eco-friendly natural rubber, non-slip GripForMe surface.",
    price: "$150.00", priceNum: 150.00, rating: 4.9,
    affiliateUrl: "https://www.amazon.com/s?k=liforme+yoga+mat",
    sports: ["Yoga", "Pilates"],
  },
  {
    id: "20", name: "Kettlebell (35 lb)", brand: "Rogue Fitness", category: "Equipment",
    emoji: "⚫", description: "Single-cast iron construction, smooth finish, color-coded by weight.",
    price: "$74.99", priceNum: 74.99, rating: 4.9,
    affiliateUrl: "https://www.amazon.com/s?k=rogue+fitness+kettlebell+35lb",
    sports: ["Gym", "CrossFit"],
  },

  // Apparel
  {
    id: "10", name: "Compression Tights", brand: "Nike Pro", category: "Apparel",
    emoji: "🩱", description: "Dri-FIT technology, 4-way stretch, muscle support for high-intensity training.",
    price: "$45.00", priceNum: 45.00, rating: 4.7, badge: "Staff Pick",
    affiliateUrl: "https://www.amazon.com/s?k=nike+pro+compression+tights",
    sports: ["Running", "Gym", "CrossFit", "Cycling"],
  },
  {
    id: "11", name: "Training Shoes", brand: "Nike Metcon 9", category: "Apparel",
    emoji: "👟", description: "Stable flat heel for lifting, flexible forefoot for running. CrossFit certified.",
    price: "$130.00", priceNum: 130.00, rating: 4.8,
    affiliateUrl: "https://www.amazon.com/s?k=nike+metcon+9+training+shoes",
    sports: ["Gym", "CrossFit"],
  },
  {
    id: "12", name: "Performance Tank Top", brand: "Under Armour", category: "Apparel",
    emoji: "👕", description: "HeatGear fabric wicks sweat, ultra-light, anti-odor technology.",
    price: "$25.00", priceNum: 25.00, rating: 4.6,
    affiliateUrl: "https://www.amazon.com/s?k=under+armour+performance+tank+top",
    sports: ["Gym", "Running", "CrossFit", "Basketball", "Football"],
  },
  {
    id: "21", name: "Running Shoes", brand: "ASICS Gel-Nimbus", category: "Apparel",
    emoji: "🏃", description: "Maximum cushioning, GEL technology for neutral runners, breathable mesh upper.",
    price: "$160.00", priceNum: 160.00, rating: 4.8, badge: "Top Rated",
    affiliateUrl: "https://www.amazon.com/s?k=asics+gel+nimbus+running+shoes",
    sports: ["Running", "Hiking"],
  },
  {
    id: "22", name: "Cycling Jersey", brand: "Rapha", category: "Apparel",
    emoji: "🚴", description: "Aero fit, UPF 50+ sun protection, 3 rear pockets, moisture-wicking fabric.",
    price: "$115.00", priceNum: 115.00, rating: 4.7,
    affiliateUrl: "https://www.amazon.com/s?k=rapha+cycling+jersey",
    sports: ["Cycling"],
  },
  {
    id: "23", name: "Boxing Gloves (14oz)", brand: "Everlast Pro Style", category: "Apparel",
    emoji: "🥊", description: "C3 foam for superior hand protection, synthetic leather, velcro closure.",
    price: "$39.99", priceNum: 39.99, rating: 4.6,
    affiliateUrl: "https://www.amazon.com/s?k=everlast+pro+style+boxing+gloves",
    sports: ["Boxing"],
  },

  // Accessories
  {
    id: "13", name: "Insulated Water Bottle", brand: "Hydro Flask", category: "Accessories",
    emoji: "🍶", description: "32 oz, keeps drinks cold 24h / hot 12h. Wide mouth, leakproof lid.",
    price: "$44.95", priceNum: 44.95, rating: 4.9, badge: "Fan Favorite",
    affiliateUrl: "https://www.amazon.com/s?k=hydro+flask+32+oz+water+bottle",
    sports: ["Running", "Cycling", "Hiking", "Gym"],
  },
  {
    id: "14", name: "Gym Duffel Bag", brand: "Nike Brasilia", category: "Accessories",
    emoji: "🎒", description: "60L capacity, separate shoe compartment, padded shoulder strap.",
    price: "$55.00", priceNum: 55.00, rating: 4.7,
    affiliateUrl: "https://www.amazon.com/s?k=nike+brasilia+gym+bag",
    sports: ["Gym", "Swimming", "CrossFit"],
  },
  {
    id: "15", name: "Weightlifting Gloves", brand: "Harbinger", category: "Accessories",
    emoji: "🧤", description: "Full palm padding, wrist support strap, breathable spandex back.",
    price: "$19.99", priceNum: 19.99, rating: 4.5,
    affiliateUrl: "https://www.amazon.com/s?k=harbinger+weightlifting+gloves",
    sports: ["Gym", "CrossFit"],
  },
  {
    id: "24", name: "Fitness Tracker", brand: "Garmin Forerunner 255", category: "Accessories",
    emoji: "⌚", description: "Advanced running dynamics, HRV stress tracking, up to 14 day battery life.",
    price: "$249.99", priceNum: 249.99, rating: 4.8, badge: "Editor's Choice",
    affiliateUrl: "https://www.amazon.com/s?k=garmin+forerunner+255",
    sports: ["Running", "Cycling", "Swimming", "Triathlon"],
  },
  {
    id: "25", name: "Lifting Belt", brand: "Rogue Ohio", category: "Accessories",
    emoji: "🪖", description: "10mm single-prong lever belt, premium leather, supports heavy compound lifts.",
    price: "$125.00", priceNum: 125.00, rating: 4.9,
    affiliateUrl: "https://www.amazon.com/s?k=rogue+ohio+lifting+belt",
    sports: ["Gym", "CrossFit"],
  },

  // Recovery
  {
    id: "26", name: "Massage Gun", brand: "Theragun Prime", category: "Recovery",
    emoji: "🔫", description: "16mm amplitude, 5 speeds, QuietForce technology, 4 attachments included.",
    price: "$299.00", priceNum: 299.00, rating: 4.8, badge: "Best Recovery",
    affiliateUrl: "https://www.amazon.com/s?k=theragun+prime+massage+gun",
    sports: ["Gym", "Running", "Cycling", "CrossFit", "Football", "Basketball"],
  },
  {
    id: "27", name: "Ice Bath Tub", brand: "Ice Barrel", category: "Recovery",
    emoji: "🧊", description: "Upright design, durable polyethylene, fits up to 6'5\". Cold therapy for athletes.",
    price: "$199.99", priceNum: 199.99, rating: 4.6,
    affiliateUrl: "https://www.amazon.com/s?k=ice+barrel+cold+therapy+tub",
    sports: ["Gym", "Running", "CrossFit", "Swimming"],
  },
  {
    id: "28", name: "Compression Boots", brand: "Normatec 3", category: "Recovery",
    emoji: "👢", description: "Dynamic air compression, 7 levels, Bluetooth app control. Used by pro athletes.",
    price: "$699.00", priceNum: 699.00, rating: 4.9, badge: "Pro Choice",
    affiliateUrl: "https://www.amazon.com/s?k=normatec+3+compression+boots",
    sports: ["Running", "Cycling", "Football", "Basketball", "Swimming"],
  },
  {
    id: "29", name: "Epsom Salt Soak", brand: "Dr Teal's", category: "Recovery",
    emoji: "🛁", description: "Pure epsom salt with lavender, relieves muscle aches and soreness post-workout.",
    price: "$8.99", priceNum: 8.99, rating: 4.7, badge: "Budget Pick",
    affiliateUrl: "https://www.amazon.com/s?k=dr+teals+epsom+salt+lavender",
    sports: ["Running", "Gym", "Yoga", "Pilates", "Swimming"],
  },
  {
    id: "30", name: "Sleep & Recovery Formula", brand: "Momentous", category: "Recovery",
    emoji: "😴", description: "Ashwagandha, magnesium glycinate, L-theanine for deep sleep and recovery.",
    price: "$49.00", priceNum: 49.00, rating: 4.7,
    affiliateUrl: "https://www.amazon.com/s?k=momentous+sleep+recovery+supplement",
    sports: ["Gym", "Running", "CrossFit", "Swimming"],
  },
];

export const CATEGORIES: Category[] = ["All", "Supplements", "Equipment", "Apparel", "Accessories", "Recovery"];

export const CATEGORY_EMOJI: Record<Category, string> = {
  All: "🛍️",
  Supplements: "💊",
  Equipment: "🏋️",
  Apparel: "👕",
  Accessories: "🎒",
  Recovery: "🔄",
};
