/**
 * The dealer programs in the Retailer Dashboard (client task list, November
 * 2026, item 21: the SPIF program and the brand images), from Surreal's own
 * dashboard pages on the old site (/dashboard/spif-program/ and
 * /dashboard/social-media-program/, read 25 Nov 2026).
 *
 * SPIF: the sales incentive program runs on Jewelry Rewards. Registration and
 * sales submissions live on their site, so the page explains the program and
 * links out to it.
 *
 * Brand assets: previews of the brand assets this site already holds (the
 * client's social posts and web banners, product renders, turntable videos
 * and the logo), with Surreal's shared folders for the full libraries.
 * Checked on 25 Nov 2026: the two Dropbox folders open; the logo folder and
 * the campaign folder on Google Drive return 404, and both YouTube videos are
 * gone, so the logo and the videos held here stand in for them. The "We're a
 * Grower" campaign is left out on purpose (grower claims were removed at the
 * client's request).
 */

export const SPIF = {
  partner: "Jewelry Rewards",
  register: "https://jewelryrewards.net/registration",
  login: "https://jewelryrewards.net/login",
  steps: [
    { title: "Register", line: "Each store associate registers with Jewelry Rewards and gives a tax ID, which goes directly to the banking partner that issues the cards." },
    { title: "Manager approval", line: "Your store manager approves each associate before they take part." },
    { title: "Your card", line: "A debit card with Surreal's branding, your name and its own number is mailed to your home." },
    { title: "Submit your sales", line: "Add and manage your Surreal sales submissions in the Jewelry Rewards dashboard." },
    { title: "Loaded monthly", line: "Each month, the spiffs for your qualifying sales are loaded onto your card." },
  ],
  facts: [
    { title: "When incentives are paid", line: "An incentive payment is issued only after the underlying Surreal invoice has been paid." },
    { title: "Who takes part", line: "Store associates, once registered and approved by their store manager." },
    { title: "Your tax ID", line: "It goes directly to the banking partner that supplies the rechargeable debit cards." },
  ],
} as const;

/** Surreal's shared folders, linked exactly as Surreal shared them. */
export const BRAND_LIBRARIES = {
  /** "Banners & Social": the general social media campaign, updated monthly. */
  social: "https://www.dropbox.com/scl/fo/3qd9dvvumijdkz58scq7e/AEgR8w3vJ7hJb9FSezKgHPA?rlkey=fn6cok6328knk92g9rw6nfeap&st=w5warz1f&dl=0",
  /** "Product Images for Website". */
  products: "https://www.dropbox.com/scl/fo/70ixsr337e1snzbsvoc81/AHhVNZwvtRo0wS8Ltc5o_C8?rlkey=x62a5hdqiy6x7atqq8a90szug&st=fqiqr871&dl=0",
} as const;

/** Posting on autopilot, from the old page. */
export const JEWELPOST = { network: "JewelPost Network", contact: "Larry Chasin", agency: "Chasin'Dreams", email: "larry@chasindreams.us" } as const;

export interface BrandImage {
  src: string;
  title: string;
  w: number;
  h: number;
}

/** The client's social posts (Banners/Social Media), a few to preview. */
export const SOCIAL_POSTS: BrandImage[] = [
  { src: "/media/banners/social-1.webp", title: "Emerald band, botanical", w: 1600, h: 1600 },
  { src: "/media/banners/social-7.webp", title: "Hoops with a bloom", w: 1600, h: 1600 },
  { src: "/media/banners/social-2.webp", title: "Rings and earrings, portrait", w: 1600, h: 1600 },
  { src: "/media/banners/social-c.webp", title: "Circle pendant in light", w: 1600, h: 1600 },
  { src: "/media/banners/social-h.webp", title: "Layered necklaces", w: 1600, h: 1600 },
  { src: "/media/banners/social-a.webp", title: "Pendant on lavender", w: 1600, h: 1600 },
  { src: "/media/banners/social-i.webp", title: "Gold stacking rings", w: 1600, h: 1600 },
];

/** The client's web banners (Banners/Website Banner), for a store's own site. */
export const WEB_BANNERS: BrandImage[] = [
  { src: "/media/banners/web-2.webp", title: "Dream bigger", w: 1920, h: 640 },
  { src: "/media/banners/web-5.webp", title: "Circle pendant", w: 1920, h: 633 },
  { src: "/media/banners/web-4.webp", title: "Rings and line mark", w: 1920, h: 640 },
  { src: "/media/banners/web-8.webp", title: "Halo in the spotlight", w: 1907, h: 639 },
];

export interface LogoFile {
  id: string;
  title: string;
  line: string;
  src: string;
  /** Saved under this name. A .jpg name converts the WebP to JPG in the browser. */
  file: string;
  format: string;
  ground: "white" | "light" | "dark";
  w: number;
  h: number;
}

export const LOGO_FILES: LogoFile[] = [
  { id: "lockup", title: "Logo on white", line: "The full logo with SURREAL by JB Bhanderi, from Surreal's artwork.", src: "/media/banners/social-5.webp", file: "surreal-logo-on-white.jpg", format: "JPG", ground: "white", w: 1524, h: 1524 },
  { id: "mark", title: "Line mark", line: "For light grounds, at any size, with a clear background.", src: "/media/logo/mark.svg", file: "surreal-line-mark.svg", format: "SVG", ground: "light", w: 822, h: 1293 },
  { id: "mark-ivory", title: "Line mark, reversed", line: "For dark grounds and photographs.", src: "/media/logo/mark-ivory.svg", file: "surreal-line-mark-reversed.svg", format: "SVG", ground: "dark", w: 822, h: 1293 },
];

/** Product renders on white to preview; the full library is the Dropbox folder. */
export const PRODUCT_PREVIEWS = [
  { slug: "le2003w440-final-11679", title: "Cathedral Solitaire" },
  { slug: "lgbrdl2665-eng-wg-lgbrdl2665-band-wg", title: "Halo Bridal Set" },
  { slug: "lgerfa4373-14k-wg", title: "Arch Drops" },
  { slug: "ca24ap0011-8899", title: "Double Row Huggies" },
  { slug: "branding-images8025", title: "Round Bezel Pendant" },
  { slug: "lgbd70162-bz-wg", title: "Bezel Tennis Bracelet" },
  { slug: "ca24mr0090-9644", title: "Bloom Pendant" },
  { slug: "lw2001w440-11733", title: "Chevron Band" },
] as const;
