// =============================================================================
// Query Extraction — Dictionaries
//
// Every mapping here is deterministic and local. Nothing in this file (or
// anywhere else under src/lib/queryExtraction/) calls an external API, LLM,
// or translation service. Extending recognition for a new phrase or alias
// means adding an entry here, not touching extraction logic.
// =============================================================================

/** Known destination names -> their canonical form, including common Vietnamese-language variants and casual English aliases. Matching is case-insensitive and diacritic-insensitive (see normalizeText). */
export const DESTINATION_ALIASES: Record<string, string> = {
  "hanoi": "Hanoi",
  "ha noi": "Hanoi",
  "hà nội": "Hanoi",
  "halong bay": "Halong Bay",
  "halong": "Halong Bay",
  "ha long": "Halong Bay",
  "hạ long": "Halong Bay",
  "ho chi minh city": "Ho Chi Minh City",
  "ho chi minh": "Ho Chi Minh City",
  "hcmc": "Ho Chi Minh City",
  "saigon": "Ho Chi Minh City",
  "sài gòn": "Ho Chi Minh City",
  "da nang": "Da Nang",
  "danang": "Da Nang",
  "đà nẵng": "Da Nang",
  "hoi an": "Hoi An",
  "hoian": "Hoi An",
  "hội an": "Hoi An",
  "hue": "Hue",
  "huế": "Hue",
  "nha trang": "Nha Trang",
  "phu quoc": "Phu Quoc",
  "phú quốc": "Phu Quoc",
  "sapa": "Sapa",
  "sa pa": "Sapa",
  "mekong delta": "Mekong Delta",
  "mekong": "Mekong Delta",
  "cu chi tunnels": "Cu Chi Tunnels",
  "bana hills": "Bana Hills",
  "ba na hills": "Bana Hills",
  "ninh binh": "Ninh Binh",
  "ninh bình": "Ninh Binh",
};

/** Known bookable activities — matched as substrings against normalized input. Extend this list from the Activities inventory at call sites where a live repository is available (see extractActivities in extractors.ts). */
export const ACTIVITY_KEYWORDS = [
  "halong bay cruise", "cruise", "city tour", "food tour", "cu chi tunnels",
  "bana hills", "golden bridge", "mekong delta tour", "spa", "golf",
  "shopping tour", "sightseeing", "cooking class", "trekking", "island hopping",
  "water puppet show", "temple tour", "market tour", "cycling tour",
];

/** Special-requirement keywords -> normalized label stored in notes. */
export const SPECIAL_REQUIREMENT_KEYWORDS: Record<string, string> = {
  "honeymoon": "Honeymoon",
  "family": "Family friendly",
  "child friendly": "Family friendly",
  "senior citizen": "Senior citizens",
  "senior citizens": "Senior citizens",
  "vegetarian": "Vegetarian meals",
  "wheelchair": "Wheelchair accessible",
  "early check-in": "Early check-in",
  "early check in": "Early check-in",
  "late checkout": "Late checkout",
  "late check-out": "Late checkout",
  "private tour": "Private tour",
  "luxury": "Luxury",
  "budget": "Budget-conscious",
};

/** English + Vietnamese keyword -> canonical concept, used by the language detector and several extractors. Not a translator — only recognizes these specific known terms. */
export const KEYWORD_DICTIONARY: { term: string; concept: "adults" | "children" | "infants" | "nights" | "days" | "hotel" | "rooms"; lang: "en" | "vi" }[] = [
  { term: "adults", concept: "adults", lang: "en" },
  { term: "adult", concept: "adults", lang: "en" },
  { term: "pax", concept: "adults", lang: "en" },
  { term: "people", concept: "adults", lang: "en" },
  { term: "persons", concept: "adults", lang: "en" },
  { term: "person", concept: "adults", lang: "en" },
  { term: "guests", concept: "adults", lang: "en" },
  { term: "người lớn", concept: "adults", lang: "vi" },
  { term: "khách", concept: "adults", lang: "vi" },
  { term: "người", concept: "adults", lang: "vi" },

  { term: "children", concept: "children", lang: "en" },
  { term: "child", concept: "children", lang: "en" },
  { term: "kids", concept: "children", lang: "en" },
  { term: "kid", concept: "children", lang: "en" },
  { term: "trẻ em", concept: "children", lang: "vi" },

  { term: "infant", concept: "infants", lang: "en" },
  { term: "infants", concept: "infants", lang: "en" },
  { term: "em bé", concept: "infants", lang: "vi" },

  { term: "nights", concept: "nights", lang: "en" },
  { term: "night", concept: "nights", lang: "en" },
  { term: "đêm", concept: "nights", lang: "vi" },

  { term: "days", concept: "days", lang: "en" },
  { term: "day", concept: "days", lang: "en" },
  { term: "ngày", concept: "days", lang: "vi" },

  { term: "hotel", concept: "hotel", lang: "en" },
  { term: "khách sạn", concept: "hotel", lang: "vi" },

  { term: "rooms", concept: "rooms", lang: "en" },
  { term: "room", concept: "rooms", lang: "en" },
  { term: "phòng", concept: "rooms", lang: "vi" },
];

/** Vietnamese function words/diacritic-bearing terms common enough in travel messages to reliably flag the message as Vietnamese even after diacritics are stripped for matching. */
export const VIETNAMESE_MARKER_WORDS = [
  "nguoi", "lon", "tre em", "em be", "khach", "dem", "ngay", "khach san",
  "va", "voi", "can", "yeu cau", "chuyen", "san bay", "don", "tra",
];
