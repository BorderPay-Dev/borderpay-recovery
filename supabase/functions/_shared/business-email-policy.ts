import { FREE_EMAIL_DOMAINS } from "./free-email-domains.ts";
import { DISPOSABLE_EMAIL_DOMAINS } from "./disposable-email-domains.ts";

const FREE_OR_PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "mail.ee",
  "email.ee",
  "hot.ee",
  "online.ee",
  "solo.ee",
  "inbox.com",
  "inbox.eu",
  "inbox.lv",
  "inbox.lt",
  "fastmail.com",
  "hey.com",
  "tuta.com",
  "tutanota.com",
  "tutanota.de",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "bk.ru",
  "list.ru",
  "internet.ru",
  "rambler.ru",
  "ukr.net",
  "web.de",
  "freenet.de",
  "t-online.de",
  "gmx.de",
  "orange.fr",
  "laposte.net",
  "free.fr",
  "wanadoo.fr",
  "libero.it",
  "virgilio.it",
  "alice.it",
  "seznam.cz",
  "centrum.cz",
  "centrum.sk",
  "wp.pl",
  "onet.pl",
  "interia.pl",
  "abv.bg",
  "mail.bg",
  "qq.com",
  "163.com",
  "126.com",
  "naver.com",
  "daum.net",
  "rediffmail.com",
  "mailfence.com",
  "hushmail.com",
]);

// Product-blocked mailbox/forwarding services. A private corporate alias cannot
// reliably be identified from its address; never claim domain checks prove ownership.
const ALIAS_DOMAINS = new Set([
  "uberip.com", "simplelogin.com", "simplelogin.co", "simplelogin.fr",
  "aleeas.com", "slmail.me", "8alias.com", "8shield.net", "passmail.net",
  "passinbox.com", "mozmail.com", "relay.firefox.com", "duck.com",
  "anonaddy.com", "anonaddy.me", "addy.io", "appleid.com", "privaterelay.appleid.com",
  "33mail.com", "mail2world.com", "cyberdude.com", "artlover.com", "dr.com",
]);
function domainMatches(domain: string, domains: Set<string>): boolean {
  const labels = domain.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    if (domains.has(labels.slice(i).join("."))) return true;
  }
  return false;
}

const PERSONAL_DOMAIN_PREFIXES = ["yahoo.", "hotmail.", "live.", "gmx."];
const DISPOSABLE_DOMAIN_MARKERS = [
  "10minutemail",
  "dispostable",
  "fakeinbox",
  "getnada",
  "guerrillamail",
  "maildrop",
  "mailinator",
  "sharklasers",
  "tempmail",
  "throwawaymail",
  "yopmail",
];

export type BusinessEmailDecision = {
  allowed: boolean;
  domain: string | null;
  code: "allowed" | "blocked_identity" | "invalid_email" | "personal_email" | "disposable_email" | "reserved_domain" | "email_alias";
};

export function evaluateBusinessEmail(value: unknown, countryCode?: unknown): BusinessEmailDecision {
  const email = String(value || "").trim().toLowerCase();
  void countryCode;
  if (email === "tst@hacker.com" || /^loadtest_[^@]+@/i.test(email)) {
    return { allowed: false, domain: email.split("@")[1] || null, code: "blocked_identity" };
  }
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { allowed: false, domain: null, code: "invalid_email" };
  }

  const domain = parts[1];
  if (email.length > 254 || parts[0].length > 64 ||
      !/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(parts[0]) ||
      parts[0].startsWith(".") || parts[0].endsWith(".") || parts[0].includes("..")) {
    return { allowed: false, domain, code: "invalid_email" };
  }
  if (parts[0].includes("+") || domainMatches(domain, ALIAS_DOMAINS)) {
    return { allowed: false, domain, code: "email_alias" };
  }
  if (
    domain.length > 253 ||
    !domain.includes(".") ||
    !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) ||
    domain.includes("..") ||
    domain.split(".").some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  ) {
    return { allowed: false, domain, code: "invalid_email" };
  }

  if (
    domain === "example.com" ||
    domain === "example.org" ||
    domain === "example.net" ||
    domain.endsWith(".example") ||
    domain.endsWith(".invalid") ||
    domain.endsWith(".local") ||
    domain.endsWith(".test")
  ) {
    return { allowed: false, domain, code: "reserved_domain" };
  }

  if (domainMatches(domain, DISPOSABLE_EMAIL_DOMAINS) || DISPOSABLE_DOMAIN_MARKERS.some((marker) => domain === marker || domain.includes(marker))) {
    return { allowed: false, domain, code: "disposable_email" };
  }

  // Product exception: inbox.eu is the only public mailbox domain accepted
  // for direct business signup, regardless of incorporation country.
  const inboxEuException = domain === "inbox.eu";
  if ((!inboxEuException && (domainMatches(domain, FREE_OR_PERSONAL_DOMAINS) || domainMatches(domain, FREE_EMAIL_DOMAINS))) || PERSONAL_DOMAIN_PREFIXES.some((prefix) => domain.startsWith(prefix))) {
    return { allowed: false, domain, code: "personal_email" };
  }

  return { allowed: true, domain, code: "allowed" };
}
