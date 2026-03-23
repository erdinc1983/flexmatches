import { getDemoUser } from "./seed-data";

// ─── Intent detection ────────────────────────────────────────────────────────

type Intent =
  | "greeting"
  | "asking_workout_type"
  | "asking_gym_location"
  | "asking_preferred_time"
  | "suggesting_meetup"
  | "confirming_plan"
  | "declining"
  | "rescheduling"
  | "asking_fitness_level"
  | "asking_goals"
  | "compliment"
  | "asking_how_are_you"
  | "farewell"
  | "generic";

const INTENT_PATTERNS: { intent: Intent; patterns: RegExp[] }[] = [
  {
    intent: "greeting",
    patterns: [/\bhey\b/i, /\bhi\b/i, /\bhello\b/i, /\bwhat'?s up\b/i, /\bwassup\b/i, /\byo\b/i, /^hey!?$/i, /^hi!?$/i],
  },
  {
    intent: "asking_how_are_you",
    patterns: [/how are you/i, /how'?s it going/i, /how have you been/i, /you doing/i, /how do you do/i],
  },
  {
    intent: "asking_workout_type",
    patterns: [/what.*(sport|workout|train|exercise|do you (do|play|like))/i, /what kind of (workout|training)/i, /do you (lift|run|gym|swim|cycle|box|do yoga|do crossfit)/i, /what.*(sports|activities)/i],
  },
  {
    intent: "asking_gym_location",
    patterns: [/which gym/i, /what gym/i, /where do you (work ?out|train|go)/i, /what('?s| is) your gym/i, /near(by| me)/i, /location/i, /where are you/i],
  },
  {
    intent: "asking_preferred_time",
    patterns: [/what time/i, /when do you (usually|normally|like to|prefer to|work out|train)/i, /morning|afternoon|evening|night/i, /what'?s your schedule/i, /available/i, /availability/i],
  },
  {
    intent: "suggesting_meetup",
    patterns: [/want to (meet|work ?out|train|gym) together/i, /let'?s (meet|work ?out|train|gym)/i, /wanna (meet|work ?out|train|gym)/i, /session together/i, /partner (up|workout|session)/i, /could we/i, /shall we/i],
  },
  {
    intent: "confirming_plan",
    patterns: [/sounds good/i, /that works/i, /i'?m (in|down)/i, /perfect/i, /confirmed/i, /see you/i, /deal/i, /yes.*meet/i, /sure.*meet/i, /\byes\b/i, /\bsure\b/i, /\bokay\b/i, /\bok\b/i, /\byep\b/i],
  },
  {
    intent: "declining",
    patterns: [/can'?t (make it|come|meet|today|this week)/i, /won'?t (be able|work)/i, /not (available|free|able)/i, /busy/i, /sorry.*can'?t/i, /unfortunately/i, /maybe another/i, /don'?t think so/i],
  },
  {
    intent: "rescheduling",
    patterns: [/reschedule/i, /different (day|time|date)/i, /another (day|time|date)/i, /how about (next|tomorrow|this)/i, /what about (next|tomorrow|this)/i, /can we (do|move|change)/i],
  },
  {
    intent: "asking_fitness_level",
    patterns: [/how long.*(been|training|working out)/i, /how fit/i, /experience level/i, /beginner|intermediate|advanced/i, /fitness level/i, /newbie/i, /how experienced/i],
  },
  {
    intent: "asking_goals",
    patterns: [/what.*goal/i, /why do you (work ?out|train|gym)/i, /what are you (working|training) (for|toward)/i, /lose weight|build muscle|get fit|get in shape|tone/i, /what.*(looking|trying) to (achieve|do)/i],
  },
  {
    intent: "compliment",
    patterns: [/great (profile|photos?|pic|look)/i, /you look (fit|great|amazing|awesome)/i, /impressive/i, /nice profile/i, /cool/i, /awesome/i, /love your/i],
  },
  {
    intent: "farewell",
    patterns: [/\bbye\b/i, /\bgoodbye\b/i, /\bttyl\b/i, /\btalk (to you |ya )?later\b/i, /\bgotta go\b/i, /\btake care\b/i, /\bsee ya\b/i],
  },
];

export function detectIntent(message: string): Intent {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(message))) return intent;
  }
  return "generic";
}

// ─── Response templates ──────────────────────────────────────────────────────

type Personality = "direct" | "friendly" | "reserved" | "hype";

type ResponseTemplate = Record<Personality, string[]>;

const RESPONSES: Record<Intent, ResponseTemplate> = {
  greeting: {
    direct: ["Hey.", "Sup.", "Hey, what's up?"],
    friendly: ["Hey! How's it going? 😊", "Hi! Nice to match with you!", "Hey there! 👋"],
    reserved: ["Hi.", "Hello.", "Hey."],
    hype: ["YOOO 🔥", "Hey hey hey! What's good?! 💪", "Ayyyy what's up!"],
  },
  asking_how_are_you: {
    direct: ["Good, thanks. You?", "Doing well. Just got back from the gym actually.", "Fine. You?"],
    friendly: ["Doing great, thanks for asking! Just finished a workout! How about you? 😄", "Really good! Had an awesome session this morning. How are you?", "Pretty good! Can't complain. You?"],
    reserved: ["Fine, thanks.", "Good.", "Doing okay."],
    hype: ["AMAZING, just crushed a PR 💪🔥 You?!", "On fire today honestly! How about you?!", "Living the best life fr! You?"],
  },
  asking_workout_type: {
    direct: [
      "Mostly {sports}. You?",
      "I do {sports}. Pretty much my main thing.",
      "{sports} is what I focus on. You into that?",
    ],
    friendly: [
      "I love {sports}! It's my main thing right now. What about you? 😊",
      "Big into {sports} these days! What do you like to do?",
      "Mostly {sports} — I'm kind of obsessed honestly 😄 What about you?",
    ],
    reserved: [
      "I do {sports} mainly.",
      "{sports}.",
      "Mostly {sports}.",
    ],
    hype: [
      "{sports} ALL DAY 💪 Nothing better honestly!",
      "BRO {sports} is life!! What about you?! 🔥",
      "{sports} is my jam! Absolutely love it!",
    ],
  },
  asking_gym_location: {
    direct: [
      "I go to {gym} in {city}. You nearby?",
      "{gym} mainly. You?",
      "Usually {gym}. It's close to where I am.",
    ],
    friendly: [
      "I usually go to {gym} in {city}! It's pretty convenient. Where do you go? 😊",
      "My go-to is {gym}! Love it there. What about you?",
      "I'm at {gym} most of the time. It's near {city}. You're close by?",
    ],
    reserved: [
      "{gym} in {city}.",
      "I go to {gym}.",
      "{gym} usually.",
    ],
    hype: [
      "{gym} is my second home no cap 🏋️ You know it?!",
      "ALWAYS at {gym}!! It's the best honestly 🔥 You?",
      "{gym} gang!! Where do you go?!",
    ],
  },
  asking_preferred_time: {
    direct: [
      "I usually go {times}. You?",
      "{times} is when I train. Does that work?",
      "Mostly {times}. Schedule's pretty set.",
    ],
    friendly: [
      "I'm usually free {times}! Does that work for you? 😊",
      "I tend to work out {times} — it fits my schedule best. You?",
      "{times} works best for me! What about you?",
    ],
    reserved: [
      "{times} usually.",
      "I train {times}.",
      "Mornings mostly." ],
    hype: [
      "{times} let's GOOO 🔥 That's when I'm most hyped!",
      "I'm all about {times} workouts!! Energy is unmatched 💪",
      "{times} grind never stops!! You free then?!",
    ],
  },
  suggesting_meetup: {
    direct: [
      "Yeah I'm down. {gym}, {times}?",
      "Sure. When works for you?",
      "Works for me. Pick a day.",
    ],
    friendly: [
      "That sounds awesome! I'd love to work out together 😊 When are you free?",
      "Yes! Let's do it! How does {gym} on {times} sound?",
      "Oh I'm totally in! Would be so fun to train together 🙌",
    ],
    reserved: [
      "Maybe. When were you thinking?",
      "Could work. I'd have to check my schedule.",
      "Possibly. What did you have in mind?",
    ],
    hype: [
      "LET'S GOOO 🔥🔥 I'm SO down!! When?!",
      "YESSS finally!! Let's make it happen!! 💪",
      "BRO I've been waiting for someone to ask!! ABSOLUTELY 🔥",
    ],
  },
  confirming_plan: {
    direct: [
      "Cool. See you then.",
      "Done. I'll be there.",
      "Works. See you.",
    ],
    friendly: [
      "Amazing! Can't wait! See you then! 😊🙌",
      "Perfect! So excited to meet up! See you there!",
      "Awesome, it's a plan! See you! 🎉",
    ],
    reserved: [
      "Okay.",
      "Alright, see you.",
      "Sure.",
    ],
    hype: [
      "LETTTTS GOOOOO 🔥🔥🔥 See you there!!",
      "YESSS it's on!! This is gonna be EPIC 💪🔥",
      "IT'S HAPPENING!! See you there, let's CRUSH IT!!",
    ],
  },
  declining: {
    direct: [
      "Can't do it this week. Another time.",
      "That doesn't work for me. Maybe next week?",
      "Not available then.",
    ],
    friendly: [
      "Ahh that's too bad! I'm not free then, but could we do another time? 😊",
      "Oh no, I can't make that work right now. But I'd still love to meet up! Maybe next week?",
      "I'm so sorry, I can't do that time! Can we reschedule? 🙏",
    ],
    reserved: [
      "Sorry, I can't.",
      "Not available.",
      "Maybe another time.",
    ],
    hype: [
      "Nooo way I hate I can't!! Can we do another day tho?? 😭",
      "AW MAN I can't do that one!! But we HAVE to figure something out!!",
      "Dang that doesn't work for me 😭 Give me another option!",
    ],
  },
  rescheduling: {
    direct: [
      "What else works for you?",
      "Give me another day and I'll check.",
      "Next week is better for me.",
    ],
    friendly: [
      "No worries! How about a different day? I'm pretty flexible 😊",
      "Of course! What works better for you? I can move things around!",
      "Yeah let's find something that works! I'm free most days next week.",
    ],
    reserved: [
      "What day works for you?",
      "Let me know when you're free.",
      "Maybe later in the week?",
    ],
    hype: [
      "We WILL make this happen, just tell me when!! 🔥",
      "NO WORRIES we'll find a time!! What works for you?!",
      "We're getting that session in regardless!! What else works?! 💪",
    ],
  },
  asking_fitness_level: {
    direct: [
      "Been training {streak} days straight. {level} level, been at it a few years.",
      "{level} I'd say. Been consistent lately.",
      "Pretty {level}. Not a beginner anymore.",
    ],
    friendly: [
      "I'd say {level}! I've been training for a while and loving it 😊 What about you?",
      "Probably {level} at this point! I've been really consistent lately. How about you?",
      "I'm at a {level} level I think! Always trying to improve though 💪 You?",
    ],
    reserved: [
      "{level}.",
      "About {level} I think.",
      "Somewhere between {level} and advanced.",
    ],
    hype: [
      "BRO I'm {level} and LOVING every second 🔥💪 You?!",
      "{level} and still going UP!! No ceiling!! What about you?!",
      "GRINDED to {level} and not stopping 💪🔥",
    ],
  },
  asking_goals: {
    direct: [
      "{goal}. Simple as that.",
      "Mainly focused on {goal}.",
      "{goal} is the priority right now.",
    ],
    friendly: [
      "I'm really focused on {goal} right now! It keeps me motivated 😊 What about you?",
      "My main goal is {goal}! I find having a clear goal helps so much. What about yours?",
      "Honestly {goal} is what drives me lately! What are your goals?",
    ],
    reserved: [
      "{goal} mostly.",
      "Mostly {goal}.",
      "Just trying to stay consistent and work toward {goal}.",
    ],
    hype: [
      "{goal} IS THE MISSION 🔥 Nothing else matters rn!!",
      "ALL about {goal} no cap!! Every single day!! 💪",
      "{goal} and I will NOT stop until I get there!! 🔥🔥",
    ],
  },
  compliment: {
    direct: [
      "Thanks.",
      "Appreciate it.",
      "Thanks, same.",
    ],
    friendly: [
      "Aw thank you so much! That's really sweet 😊",
      "Thanks! That made my day honestly! 😄",
      "Thank you! You're so nice 🥰",
    ],
    reserved: [
      "Thanks.",
      "Oh, thank you.",
      "Appreciated.",
    ],
    hype: [
      "THANK YOU that means everything!! 🔥😭",
      "AWWW you're the best!! 🙌🙌",
      "You just made my whole day no cap!! 🔥💪",
    ],
  },
  farewell: {
    direct: [
      "Later.",
      "See you.",
      "Bye.",
    ],
    friendly: [
      "Bye! Talk soon! 😊",
      "Take care! Hope to see you at the gym! 🙌",
      "Bye bye! Was great talking! 👋",
    ],
    reserved: [
      "Bye.",
      "See you.",
      "Take care.",
    ],
    hype: [
      "LATEERRR 🔥 Stay GRINDING!!",
      "BYE!! Keep CRUSHING IT!! 💪🔥",
      "PEACE!! Can't wait to train together!! 🔥",
    ],
  },
  generic: {
    direct: [
      "Yeah.",
      "Interesting. Tell me more.",
      "Got it.",
      "Makes sense.",
    ],
    friendly: [
      "That's cool! Tell me more 😊",
      "Oh nice! What else are you into?",
      "Interesting! How long have you been doing that?",
      "Love it! 😄",
    ],
    reserved: [
      "I see.",
      "Okay.",
      "Sure.",
      "Hmm, interesting.",
    ],
    hype: [
      "YOOO that's actually wild 🔥",
      "No way that's so cool!! 🔥🔥",
      "BRO really?? That's awesome!!",
      "LET'S GO!! Keep it up!! 💪",
    ],
  },
};

// ─── Template variable replacement ──────────────────────────────────────────

function fillTemplate(template: string, userId: string): string {
  const user = getDemoUser(userId);
  if (!user) return template;

  const sports = user.sports.slice(0, 2).join(" & ") || "working out";
  const gym = user.gym_name || "the gym";
  const city = user.city || "my area";
  const times = user.preferred_times.length > 0
    ? user.preferred_times.join(" or ")
    : "mornings";
  const level = user.fitness_level || "intermediate";
  const goal = user.main_goal || "staying consistent";
  const streak = String(user.current_streak || 0);

  return template
    .replace(/\{sports\}/g, sports)
    .replace(/\{gym\}/g, gym)
    .replace(/\{city\}/g, city)
    .replace(/\{times\}/g, times)
    .replace(/\{level\}/g, level)
    .replace(/\{goal\}/g, goal)
    .replace(/\{streak\}/g, streak);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type GenerateReplyInput = {
  demoUserId: string;
  incomingMessage: string;
};

export type GenerateReplyOutput = {
  text: string;
  delayMs: number;
};

export function generateDemoReply(input: GenerateReplyInput): GenerateReplyOutput {
  const { demoUserId, incomingMessage } = input;
  const user = getDemoUser(demoUserId);
  if (!user) {
    return { text: "Hey!", delayMs: 2000 };
  }

  const personality = user.personality as Personality;
  const intent = detectIntent(incomingMessage);

  const templates = RESPONSES[intent][personality];
  const rawTemplate = pick(templates);
  const text = fillTemplate(rawTemplate, demoUserId);

  const delayMs =
    user.response_speed === "fast" ? 1500 :
    user.response_speed === "slow" ? 6000 :
    3000;

  // Add a little human jitter ±500ms
  const jitter = Math.floor(Math.random() * 1000) - 500;

  return { text, delayMs: Math.max(800, delayMs + jitter) };
}
