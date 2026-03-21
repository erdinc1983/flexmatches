export type Category = "All" | "Supplements" | "Equipment" | "Apparel" | "Accessories" | "Recovery" | "Shoes" | "Gloves & Wraps";
export type Brand = "All Brands" | "Nike" | "Adidas" | "Puma" | "Gymshark" | "Under Armour" | "Myprotein" | "Optimum Nutrition" | "Rogue" | "Theragun" | "Garmin" | "Other";

export type Product = {
  id: string;
  name: string;
  brand: string;
  brandKey?: Brand;
  category: Exclude<Category, "All">;
  emoji: string;
  description: string;
  price: string;
  priceNum: number;
  rating: number;
  affiliateUrl: string;
  affiliateProgram?: "amazon" | "nike" | "adidas" | "puma" | "gymshark" | "myprotein" | "garmin";
  badge?: string;
  sports?: string[];
  highlights?: string[]; // bullet points for detail modal
};

export const BRAND_LOGOS: Partial<Record<Brand, string>> = {
  Nike: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
  Adidas: "https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg",
  Puma: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Puma_logo.svg",
};

export const PRODUCTS: Product[] = [

  // ─── SUPPLEMENTS ────────────────────────────────────────────────────
  {
    id: "s1", name: "Gold Standard Whey Protein", brand: "Optimum Nutrition", brandKey: "Optimum Nutrition", category: "Supplements",
    emoji: "🥛", price: "$54.99", priceNum: 54.99, rating: 4.8, badge: "Best Seller",
    description: "24g protein per serving, 5.5g BCAAs, low sugar. The most trusted protein on the market.",
    highlights: ["24g protein per serving", "5.5g naturally occurring BCAAs", "3–4g carbs", "Available in 20+ flavors"],
    affiliateUrl: "https://www.amazon.com/s?k=optimum+nutrition+gold+standard+whey",
    affiliateProgram: "amazon",
    sports: ["Gym", "CrossFit", "Running"],
  },
  {
    id: "s2", name: "Creatine Monohydrate", brand: "Myprotein", brandKey: "Myprotein", category: "Supplements",
    emoji: "💊", price: "$19.99", priceNum: 19.99, rating: 4.8, badge: "Top Value",
    description: "Pure micronized creatine monohydrate. 5g per serving. Proven to increase strength and power.",
    highlights: ["100% pure creatine", "5g per serving", "Unflavored — mixes easily", "Third-party tested"],
    affiliateUrl: "https://www.myprotein.com/sports-nutrition/creatine-monohydrate/10530050.html",
    affiliateProgram: "myprotein",
    sports: ["Gym", "CrossFit", "Football", "Basketball"],
  },
  {
    id: "s3", name: "THE Pre-Workout", brand: "Myprotein", brandKey: "Myprotein", category: "Supplements",
    emoji: "⚡", price: "$29.99", priceNum: 29.99, rating: 4.6, badge: "Popular",
    description: "200mg caffeine, beta-alanine, citrulline malate. Clean energy without the crash.",
    highlights: ["200mg caffeine", "3g beta-alanine", "6g citrulline malate", "No artificial colors"],
    affiliateUrl: "https://www.myprotein.com/sports-nutrition/the-pre-workout/12490052.html",
    affiliateProgram: "myprotein",
    sports: ["Gym", "CrossFit", "Boxing"],
  },
  {
    id: "s4", name: "BCAA Amino Recovery", brand: "Myprotein", brandKey: "Myprotein", category: "Supplements",
    emoji: "🧪", price: "$24.99", priceNum: 24.99, rating: 4.5,
    description: "7g BCAAs 2:1:1 ratio, added electrolytes, zero sugar. Supports muscle recovery.",
    highlights: ["7g BCAAs per serving", "2:1:1 leucine ratio", "Added electrolytes", "Zero sugar"],
    affiliateUrl: "https://www.myprotein.com/sports-nutrition/impact-bcaa/10530145.html",
    affiliateProgram: "myprotein",
    sports: ["Gym", "Running", "Cycling", "Swimming"],
  },
  {
    id: "s5", name: "Omega-3 Fish Oil", brand: "Optimum Nutrition", brandKey: "Optimum Nutrition", category: "Supplements",
    emoji: "🐟", price: "$27.99", priceNum: 27.99, rating: 4.9,
    description: "1280mg omega-3s per serving. Anti-inflammatory, supports joint health for active athletes.",
    highlights: ["1280mg omega-3 per serving", "EPA + DHA", "Enteric coated — no fishy taste", "60 softgels"],
    affiliateUrl: "https://www.amazon.com/s?k=optimum+nutrition+omega+3",
    affiliateProgram: "amazon",
    sports: ["Gym", "Running", "Swimming", "Cycling", "Yoga"],
  },
  {
    id: "s6", name: "Electrolyte Powder", brand: "Liquid I.V.", brandKey: "Other", category: "Supplements",
    emoji: "🧃", price: "$24.99", priceNum: 24.99, rating: 4.7, badge: "New",
    description: "3x electrolytes of sports drinks. Non-GMO, 11 essential vitamins. Hydrates faster.",
    highlights: ["3x electrolytes vs sports drinks", "11 essential vitamins", "Non-GMO", "16 servings"],
    affiliateUrl: "https://www.amazon.com/s?k=liquid+iv+electrolyte+powder",
    affiliateProgram: "amazon",
    sports: ["Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis"],
  },

  // ─── SHOES ──────────────────────────────────────────────────────────
  {
    id: "sh1", name: "Air Zoom Pegasus 41", brand: "Nike", brandKey: "Nike", category: "Shoes",
    emoji: "👟", price: "$130.00", priceNum: 130.00, rating: 4.8, badge: "Staff Pick",
    description: "Nike's iconic daily trainer. Cushioned for long runs, responsive for speed days.",
    highlights: ["React foam midsole", "Air Zoom unit in forefoot", "Engineered mesh upper", "Ideal for daily training"],
    affiliateUrl: "https://www.nike.com/t/air-zoom-pegasus-41-mens-road-running-shoes",
    affiliateProgram: "nike",
    sports: ["Running", "Gym"],
  },
  {
    id: "sh2", name: "Metcon 9", brand: "Nike", brandKey: "Nike", category: "Shoes",
    emoji: "🏋️", price: "$130.00", priceNum: 130.00, rating: 4.8,
    description: "Built for cross-training. Stable flat heel for lifting, flexible forefoot for sprints.",
    highlights: ["Flat stable heel for lifting", "Rope wrap outsole", "Flexible forefoot", "CrossFit certified"],
    affiliateUrl: "https://www.nike.com/t/metcon-9-mens-workout-shoes",
    affiliateProgram: "nike",
    sports: ["Gym", "CrossFit"],
  },
  {
    id: "sh3", name: "Ultraboost 22", brand: "Adidas", brandKey: "Adidas", category: "Shoes",
    emoji: "🏃", price: "$190.00", priceNum: 190.00, rating: 4.9, badge: "Editor's Choice",
    description: "Incredible energy return. BOOST midsole makes every step feel effortless.",
    highlights: ["BOOST midsole — maximum energy return", "Primeknit upper adapts to foot shape", "Continental rubber outsole", "Linear energy push system"],
    affiliateUrl: "https://www.adidas.com/us/ultraboost-22-shoes/GX5460.html",
    affiliateProgram: "adidas",
    sports: ["Running"],
  },
  {
    id: "sh4", name: "Adizero Adios Pro 3", brand: "Adidas", brandKey: "Adidas", category: "Shoes",
    emoji: "⚡", price: "$250.00", priceNum: 250.00, rating: 4.8, badge: "Race Day",
    description: "The shoe of marathon world records. Carbon rods, LIGHTSTRIKE Pro foam, race-ready.",
    highlights: ["5 carbon-infused rods", "LIGHTSTRIKE Pro foam", "Sub-200g weight", "Marathon world record shoe"],
    affiliateUrl: "https://www.adidas.com/us/adizero-adios-pro-3-shoes/GY9484.html",
    affiliateProgram: "adidas",
    sports: ["Running"],
  },
  {
    id: "sh5", name: "Deviate NITRO 2", brand: "Puma", brandKey: "Puma", category: "Shoes",
    emoji: "💨", price: "$175.00", priceNum: 175.00, rating: 4.7,
    description: "NITRO foam + carbon plate. Puma's fastest shoe for race day performance.",
    highlights: ["NITROFOAM midsole", "Carbon fiber plate", "PWRTAPE for lace lockdown", "Best for half marathon & marathon"],
    affiliateUrl: "https://us.puma.com/en/pd/deviate-nitro-2-running-shoes/37558501",
    affiliateProgram: "puma",
    sports: ["Running"],
  },
  {
    id: "sh6", name: "Magnify NITRO 2", brand: "Puma", brandKey: "Puma", category: "Shoes",
    emoji: "🦶", price: "$130.00", priceNum: 130.00, rating: 4.6,
    description: "Maximum cushion daily trainer. NITRO foam with extra stack height for long runs.",
    highlights: ["Maximum NITRO foam stack", "Ideal for easy and long runs", "Breathable mesh upper", "Durable outsole"],
    affiliateUrl: "https://us.puma.com/en/pd/magnify-nitro-2-running-shoes/37748701",
    affiliateProgram: "puma",
    sports: ["Running"],
  },

  // ─── GLOVES & WRAPS ─────────────────────────────────────────────────
  {
    id: "g1", name: "Pro Lifting Gloves", brand: "Nike", brandKey: "Nike", category: "Gloves & Wraps",
    emoji: "🧤", price: "$30.00", priceNum: 30.00, rating: 4.6, badge: "Popular",
    description: "Leather palm with wrist support strap. Reduces calluses, improves grip on bars.",
    highlights: ["Leather palm protection", "Velcro wrist strap", "Machine washable", "Open-finger design for feel"],
    affiliateUrl: "https://www.nike.com/w/training-gloves",
    affiliateProgram: "nike",
    sports: ["Gym", "CrossFit"],
  },
  {
    id: "g2", name: "Essential Gym Gloves", brand: "Adidas", brandKey: "Adidas", category: "Gloves & Wraps",
    emoji: "💪", price: "$25.00", priceNum: 25.00, rating: 4.5,
    description: "Full palm padding with wrist wrap. Adidas AEROREADY fabric keeps hands dry.",
    highlights: ["AEROREADY moisture-wicking", "Full palm padding", "Adjustable wrist wrap", "Unisex sizing"],
    affiliateUrl: "https://www.adidas.com/us/gloves",
    affiliateProgram: "adidas",
    sports: ["Gym", "CrossFit"],
  },
  {
    id: "g3", name: "Power Lifting Gloves", brand: "Puma", brandKey: "Puma", category: "Gloves & Wraps",
    emoji: "🏋️", price: "$22.00", priceNum: 22.00, rating: 4.4,
    description: "Half-finger design with padded knuckles. dryCELL technology for sweat control.",
    highlights: ["dryCELL sweat control", "Padded palm and knuckles", "Hook-and-loop closure", "Half-finger design"],
    affiliateUrl: "https://us.puma.com/en/pd/puma-training-gloves/04131901",
    affiliateProgram: "puma",
    sports: ["Gym"],
  },
  {
    id: "g4", name: "Training Gloves (Pro)", brand: "Gymshark", brandKey: "Gymshark", category: "Gloves & Wraps",
    emoji: "🔥", price: "$35.00", priceNum: 35.00, rating: 4.7, badge: "Best Grip",
    description: "Silicone grip strips, wrist wrap, open-back breathable mesh. Built for heavy lifts.",
    highlights: ["Silicone grip strips", "Wrist wrap support", "Open-back mesh", "Machine washable"],
    affiliateUrl: "https://www.gymshark.com/collections/gym-accessories",
    affiliateProgram: "gymshark",
    sports: ["Gym", "CrossFit"],
  },
  {
    id: "g5", name: "Boxing Gloves 14oz", brand: "Adidas", brandKey: "Adidas", category: "Gloves & Wraps",
    emoji: "🥊", price: "$65.00", priceNum: 65.00, rating: 4.7,
    description: "Speed Pro boxing gloves. IMF foam padding, hook-and-loop closure, pre-curved design.",
    highlights: ["IMF foam multi-layer padding", "Pre-curved anatomic fit", "Climacool lining", "14oz for sparring"],
    affiliateUrl: "https://www.amazon.com/s?k=adidas+boxing+gloves+14oz",
    affiliateProgram: "amazon",
    sports: ["Boxing"],
  },
  {
    id: "g6", name: "Hand Wraps 180\"", brand: "Nike", brandKey: "Nike", category: "Gloves & Wraps",
    emoji: "🩹", price: "$18.00", priceNum: 18.00, rating: 4.6,
    description: "180-inch Mexican-style wraps. Protects knuckles and wrist in training.",
    highlights: ["180-inch length", "Thumb loop + velcro", "Comfortable stretch cotton", "Machine washable"],
    affiliateUrl: "https://www.amazon.com/s?k=nike+hand+wraps+boxing",
    affiliateProgram: "amazon",
    sports: ["Boxing"],
  },
  {
    id: "g7", name: "Harbinger WristWrap Gloves", brand: "Other", brandKey: "Other", category: "Gloves & Wraps",
    emoji: "🤜", price: "$24.99", priceNum: 24.99, rating: 4.6, badge: "Best Value",
    description: "Extended wrist wraps, full palm leather padding. The gym standard for decades.",
    highlights: ["Extended 2.5\" wrist wrap", "Leather palm", "Spandex back for breathability", "True to size"],
    affiliateUrl: "https://www.amazon.com/s?k=harbinger+wristwrap+gloves",
    affiliateProgram: "amazon",
    sports: ["Gym", "CrossFit"],
  },
  {
    id: "g8", name: "Lifting Straps", brand: "Gymshark", brandKey: "Gymshark", category: "Gloves & Wraps",
    emoji: "🔗", price: "$20.00", priceNum: 20.00, rating: 4.5,
    description: "Cotton lifting straps for deadlifts and rows. Never let grip be the limiting factor.",
    highlights: ["Extra-long 24\" strap", "Anti-slip loop", "Padded wrist cushion", "Works with any bar"],
    affiliateUrl: "https://www.gymshark.com/collections/gym-accessories",
    affiliateProgram: "gymshark",
    sports: ["Gym", "CrossFit"],
  },

  // ─── APPAREL ────────────────────────────────────────────────────────
  {
    id: "a1", name: "Dri-FIT ADV Shorts", brand: "Nike", brandKey: "Nike", category: "Apparel",
    emoji: "🩳", price: "$55.00", priceNum: 55.00, rating: 4.7, badge: "Staff Pick",
    description: "Advanced Dri-FIT fabric, sweat-activated zones, 7-inch inseam. For any intensity.",
    highlights: ["Dri-FIT ADV sweat-activated", "7\" inseam", "Side zipper pocket", "Stretchy waistband"],
    affiliateUrl: "https://www.nike.com/w/mens-training-shorts",
    affiliateProgram: "nike",
    sports: ["Gym", "Running", "CrossFit"],
  },
  {
    id: "a2", name: "Techfit Compression Top", brand: "Adidas", brandKey: "Adidas", category: "Apparel",
    emoji: "👕", price: "$35.00", priceNum: 35.00, rating: 4.6,
    description: "TECHFIT muscle support compression. 4-way stretch, moisture-wicking, anti-odor.",
    highlights: ["TECHFIT muscle support", "4-way stretch", "AEROREADY moisture management", "Flatlock seams"],
    affiliateUrl: "https://www.adidas.com/us/techfit-shirts",
    affiliateProgram: "adidas",
    sports: ["Gym", "Running", "CrossFit", "Football"],
  },
  {
    id: "a3", name: "Gymshark Flex Leggings", brand: "Gymshark", brandKey: "Gymshark", category: "Apparel",
    emoji: "🩱", price: "$50.00", priceNum: 50.00, rating: 4.8, badge: "Fan Favorite",
    description: "4-way stretch, contour seaming, squat-proof. The most popular gym legging in the UK.",
    highlights: ["4-way stretch", "Squat-proof fabric", "Contour seaming", "High-rise waistband"],
    affiliateUrl: "https://www.gymshark.com/collections/womens-leggings",
    affiliateProgram: "gymshark",
    sports: ["Gym", "Yoga", "Pilates", "CrossFit"],
  },
  {
    id: "a4", name: "Gymshark Crest Hoodie", brand: "Gymshark", brandKey: "Gymshark", category: "Apparel",
    emoji: "🧥", price: "$60.00", priceNum: 60.00, rating: 4.7,
    description: "Oversized fit, brushed fleece interior, kangaroo pocket. The gym-to-street staple.",
    highlights: ["Brushed fleece interior", "Oversized fit", "Kangaroo pocket", "Ribbed cuffs and hem"],
    affiliateUrl: "https://www.gymshark.com/collections/mens-hoodies",
    affiliateProgram: "gymshark",
    sports: ["Gym", "CrossFit"],
  },
  {
    id: "a5", name: "AEROREADY Training Tee", brand: "Adidas", brandKey: "Adidas", category: "Apparel",
    emoji: "👔", price: "$28.00", priceNum: 28.00, rating: 4.5,
    description: "AEROREADY moisture management, recycled materials, relaxed fit for unrestricted movement.",
    highlights: ["AEROREADY technology", "Made with recycled content", "Relaxed fit", "Crew neck"],
    affiliateUrl: "https://www.adidas.com/us/training-shirts",
    affiliateProgram: "adidas",
    sports: ["Gym", "Running", "Basketball"],
  },
  {
    id: "a6", name: "Train Essentials Tank", brand: "Puma", brandKey: "Puma", category: "Apparel",
    emoji: "🎽", price: "$25.00", priceNum: 25.00, rating: 4.4,
    description: "dryCELL moisture-wicking tank. Lightweight and breathable for heavy sessions.",
    highlights: ["dryCELL technology", "Lightweight mesh", "Regular fit", "4 color options"],
    affiliateUrl: "https://us.puma.com/en/pd/train-essentials-aop-tank-top/52290401",
    affiliateProgram: "puma",
    sports: ["Gym", "CrossFit", "Running"],
  },

  // ─── ACCESSORIES ────────────────────────────────────────────────────
  {
    id: "ac1", name: "Brasilia 9.5 Duffel (Medium)", brand: "Nike", brandKey: "Nike", category: "Accessories",
    emoji: "🎒", price: "$45.00", priceNum: 45.00, rating: 4.7,
    description: "41L capacity, separate shoe compartment, padded shoulder strap. The gym bag standard.",
    highlights: ["41L main compartment", "Separate shoe compartment", "Padded shoulder strap", "Interior zipper pocket"],
    affiliateUrl: "https://www.nike.com/t/brasilia-95-training-duffel-bag-medium",
    affiliateProgram: "nike",
    sports: ["Gym", "Swimming", "CrossFit"],
  },
  {
    id: "ac2", name: "Team Training Bag", brand: "Adidas", brandKey: "Adidas", category: "Accessories",
    emoji: "🏋️", price: "$40.00", priceNum: 40.00, rating: 4.6,
    description: "Large duffel with ventilated shoe pocket, AEROREADY lining. Fits everything.",
    highlights: ["Ventilated shoe pocket", "AEROREADY lining", "Side water bottle pocket", "Adjustable strap"],
    affiliateUrl: "https://www.adidas.com/us/bags-sport-bags",
    affiliateProgram: "adidas",
    sports: ["Gym", "Football", "Basketball"],
  },
  {
    id: "ac3", name: "Fitness Tracker (Forerunner 255)", brand: "Garmin", brandKey: "Garmin", category: "Accessories",
    emoji: "⌚", price: "$249.99", priceNum: 249.99, rating: 4.8, badge: "Editor's Choice",
    description: "Advanced running dynamics, HRV stress tracking, VO2 Max, 14-day battery life.",
    highlights: ["Advanced running dynamics", "HRV stress tracking", "VO2 Max estimate", "14-day battery"],
    affiliateUrl: "https://www.garmin.com/en-US/p/780139",
    affiliateProgram: "garmin",
    sports: ["Running", "Cycling", "Swimming"],
  },
  {
    id: "ac4", name: "Insulated Water Bottle 32oz", brand: "Other", brandKey: "Other", category: "Accessories",
    emoji: "🍶", price: "$44.95", priceNum: 44.95, rating: 4.9, badge: "Fan Favorite",
    description: "Hydro Flask. Keeps drinks cold 24h, hot 12h. Wide mouth, leakproof lid.",
    highlights: ["TempShield insulation", "Cold 24h / hot 12h", "Wide mouth opening", "Durable powder coat"],
    affiliateUrl: "https://www.amazon.com/s?k=hydro+flask+32+oz+wide+mouth",
    affiliateProgram: "amazon",
    sports: ["Running", "Cycling", "Hiking", "Gym"],
  },
  {
    id: "ac5", name: "Ohio Lifting Belt", brand: "Rogue", brandKey: "Rogue", category: "Accessories",
    emoji: "🪖", price: "$125.00", priceNum: 125.00, rating: 4.9,
    description: "10mm premium leather, single-prong lever. The belt serious lifters use.",
    highlights: ["10mm thickness", "Single-prong lever", "Premium leather", "Velcro meets metal buckle"],
    affiliateUrl: "https://www.amazon.com/s?k=rogue+ohio+lifting+belt",
    affiliateProgram: "amazon",
    sports: ["Gym", "CrossFit"],
  },

  // ─── EQUIPMENT ──────────────────────────────────────────────────────
  {
    id: "eq1", name: "Adjustable Dumbbells 5–52.5lb", brand: "Other", brandKey: "Other", category: "Equipment",
    emoji: "🏋️", price: "$399.99", priceNum: 399.99, rating: 4.8, badge: "Top Pick",
    description: "Bowflex SelectTech. Replaces 15 sets of dumbbells. Dial to change weight in seconds.",
    highlights: ["5–52.5 lbs per dumbbell", "Replaces 15 sets", "Dial select mechanism", "2-year warranty"],
    affiliateUrl: "https://www.amazon.com/s?k=bowflex+selecttech+552+adjustable+dumbbells",
    affiliateProgram: "amazon",
    sports: ["Gym", "CrossFit"],
  },
  {
    id: "eq2", name: "Resistance Bands Set", brand: "Other", brandKey: "Other", category: "Equipment",
    emoji: "🪢", price: "$14.99", priceNum: 14.99, rating: 4.7, badge: "Budget Pick",
    description: "5 resistance levels (10–50 lbs), latex free, includes carry bag. Best starter set.",
    highlights: ["5 bands: 10, 15, 25, 30, 50 lbs", "Latex-free", "Includes carry bag", "Workout guide included"],
    affiliateUrl: "https://www.amazon.com/s?k=fit+simplify+resistance+bands+set",
    affiliateProgram: "amazon",
    sports: ["Gym", "Yoga", "Pilates", "Hiking"],
  },
  {
    id: "eq3", name: "Foam Roller (13\")", brand: "Other", brandKey: "Other", category: "Equipment",
    emoji: "🟠", price: "$36.99", priceNum: 36.99, rating: 4.6,
    description: "TriggerPoint multi-density surface. Deep tissue massage, reduces DOMS.",
    highlights: ["Multi-density surface", "Grid pattern for deep tissue", "Hollow core for durability", "13\" standard size"],
    affiliateUrl: "https://www.amazon.com/s?k=triggerpoint+grid+foam+roller",
    affiliateProgram: "amazon",
    sports: ["Gym", "Running", "CrossFit", "Yoga"],
  },
  {
    id: "eq4", name: "Jump Rope (Weighted)", brand: "Other", brandKey: "Other", category: "Equipment",
    emoji: "🪃", price: "$68.00", priceNum: 68.00, rating: 4.8, badge: "Popular",
    description: "Crossrope. Interchangeable weighted ropes, app tracking, ergonomic handles.",
    highlights: ["Interchangeable rope weights", "App-connected tracking", "Ergonomic handles", "Available 1/4–2 lb ropes"],
    affiliateUrl: "https://www.amazon.com/s?k=crossrope+jump+rope+set",
    affiliateProgram: "amazon",
    sports: ["CrossFit", "Boxing", "Running"],
  },
  {
    id: "eq5", name: "Pull-Up Bar (Door Frame)", brand: "Other", brandKey: "Other", category: "Equipment",
    emoji: "🏗️", price: "$29.99", priceNum: 29.99, rating: 4.5,
    description: "Iron Gym. No screws. 300 lb capacity. Multiple grip positions.",
    highlights: ["No installation needed", "300 lb capacity", "3 grip widths", "Fits 24–36\" door frames"],
    affiliateUrl: "https://www.amazon.com/s?k=iron+gym+pull+up+bar",
    affiliateProgram: "amazon",
    sports: ["Gym", "CrossFit"],
  },

  // ─── RECOVERY ───────────────────────────────────────────────────────
  {
    id: "r1", name: "Theragun Prime", brand: "Theragun", brandKey: "Theragun", category: "Recovery",
    emoji: "🔫", price: "$299.00", priceNum: 299.00, rating: 4.8, badge: "Best Recovery",
    description: "16mm amplitude, 5 speeds, QuietForce tech. Trusted by pro athletes worldwide.",
    highlights: ["16mm amplitude", "5 speeds (1750–2400 PPM)", "QuietForce technology", "4 attachments included"],
    affiliateUrl: "https://www.amazon.com/s?k=theragun+prime+massage+gun",
    affiliateProgram: "amazon",
    sports: ["Gym", "Running", "Cycling", "CrossFit"],
  },
  {
    id: "r2", name: "Normatec 3 Legs", brand: "Other", brandKey: "Other", category: "Recovery",
    emoji: "👢", price: "$699.00", priceNum: 699.00, rating: 4.9, badge: "Pro Choice",
    description: "Dynamic air compression, 7 pressure levels, Bluetooth app. Used by elite athletes.",
    highlights: ["7 pressure levels", "Bluetooth app control", "ZoneBoost technology", "Fits up to US men's 14"],
    affiliateUrl: "https://www.amazon.com/s?k=normatec+3+leg+compression+system",
    affiliateProgram: "amazon",
    sports: ["Running", "Cycling", "Football", "Basketball"],
  },
  {
    id: "r3", name: "Sleep & Recovery Formula", brand: "Other", brandKey: "Other", category: "Recovery",
    emoji: "😴", price: "$49.00", priceNum: 49.00, rating: 4.7,
    description: "Momentous. Ashwagandha, magnesium glycinate, L-theanine for deep sleep.",
    highlights: ["Ashwagandha KSM-66", "Magnesium glycinate", "L-theanine", "Third-party NSF tested"],
    affiliateUrl: "https://www.amazon.com/s?k=momentous+sleep+recovery",
    affiliateProgram: "amazon",
    sports: ["Gym", "Running", "CrossFit", "Swimming"],
  },
  {
    id: "r4", name: "Epsom Salt (3 lb)", brand: "Other", brandKey: "Other", category: "Recovery",
    emoji: "🛁", price: "$8.99", priceNum: 8.99, rating: 4.7, badge: "Budget Pick",
    description: "Dr Teal's pure epsom salt with lavender. Relieves muscle aches post-workout.",
    highlights: ["Pure epsom salt + lavender", "Relieves DOMS", "3 lb bag", "Works for baths and soaks"],
    affiliateUrl: "https://www.amazon.com/s?k=dr+teals+epsom+salt",
    affiliateProgram: "amazon",
    sports: ["Running", "Gym", "Yoga", "Swimming"],
  },
];

// ─── Metadata ──────────────────────────────────────────────────────────────

export const CATEGORIES: Category[] = ["All", "Shoes", "Gloves & Wraps", "Apparel", "Supplements", "Equipment", "Accessories", "Recovery"];

export const CATEGORY_EMOJI: Record<Category, string> = {
  All: "🛍️",
  Shoes: "👟",
  "Gloves & Wraps": "🧤",
  Apparel: "👕",
  Supplements: "💊",
  Equipment: "🏋️",
  Accessories: "🎒",
  Recovery: "🔄",
};

export const FEATURED_BRANDS: { name: Brand; emoji: string; color: string }[] = [
  { name: "Nike", emoji: "✔", color: "#e8e8e8" },
  { name: "Adidas", emoji: "⁂", color: "#e8e8e8" },
  { name: "Puma", emoji: "🐆", color: "#e8e8e8" },
  { name: "Gymshark", emoji: "🦈", color: "#00d4ff" },
  { name: "Myprotein", emoji: "💊", color: "#FF4500" },
  { name: "Garmin", emoji: "⌚", color: "#00d4ff" },
];

export const AFFILIATE_PROGRAM_LABELS: Partial<Record<string, string>> = {
  amazon: "Shop on Amazon",
  nike: "Shop on Nike.com",
  adidas: "Shop on Adidas.com",
  puma: "Shop on Puma.com",
  gymshark: "Shop on Gymshark.com",
  myprotein: "Shop on Myprotein.com",
  garmin: "Shop on Garmin.com",
};
