import type { Dictionary } from "../dictionary";

export const privacy: Dictionary["privacy"] = {
  title: "Privacy",
  intro: "Quits has no accounts. Here is what is stored, where, for how long and how to delete it.",
  storedH: "What is stored",
  stored: [
    "What you enter in a trip: the trip name, the participants' names, expenses with amounts, descriptions, categories and dates, and payments.",
    "An anonymous device id, written into every change. It holds no personal data and only tells the devices of one trip apart.",
    "On the server the trip link is stored only as a fingerprint (a SHA-256 hash), never in clear.",
    "On this device stay your trips, who you are in each, the language, the theme and the changes not yet sent. This is technical data the app needs to work, which is why there is no cookie banner.",
    "Fonts are hosted by Quits: no request goes to Google Fonts. Only the front page may measure visits, with Cloudflare Web Analytics, which uses no cookies. There is no analytics inside the app.",
  ],
  whereH: "Where",
  where:
    "Trips are stored in Cloudflare Durable Objects in the EU jurisdiction. Every request still goes through the Cloudflare network closest to you, which may be outside the EU.",
  howLongH: "For how long",
  howLong:
    "A trip stays until someone in the trip deletes it, closed ones included: nothing is deleted automatically. A deleted trip can be restored for 30 days, then it is deleted for good. After that, technical copies may remain for up to 30 more days in Cloudflare's point-in-time recovery.",
  deleteH: "How to delete",
  delete:
    "Anyone with the link can delete the trip from the app. To leave a trip without deleting it, rename yourself: the changes you already made stay in the trip's history.",
  exportH: "How to export",
  export: "From the Trip tab you download the expenses as CSV and a JSON backup of all the trip's operations.",
  logsH: "Logs and the link",
  logs:
    "Quits' code records no IP addresses and no trip link. Server logs hold only errors, without headers and without the contents of operations. The link lives in the fragment of the address, which the browser never sends to the server, and travels only in the Authorization header.",
  cloudflareH: "Cloudflare",
  cloudflare:
    "Cloudflare, as the infrastructure provider, processes technical request metadata (for example the IP address) under its own privacy policy.",
  cloudflareLink: "Cloudflare's privacy policy",
  contactH: "Contact",
  contact: "To ask for a trip to be deleted, or for anything else, write to",
};
