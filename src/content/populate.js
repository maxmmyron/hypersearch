const SHOW_SQUIGGLES = false;

const DEFINITIONS = 1;
const RELATED_QUESTIONS = 2;
const RELATED_RESULTS = 4;
const NEWS = 8;

/**
 * A mapping between card type ints and their respective query selectors
 */
const cardMap = new Map([
  [DEFINITIONS, "div[data-corpus]:has(div[data-attrid='SenseDefinition'])"],
  [RELATED_QUESTIONS, "div[jsaction][data-initq][data-miif]"],
  [RELATED_RESULTS, "div[data-abe]"],
])

const observer = new MutationObserver((mutations)=> {
  parseResults();
  parseCards();

  browser.storage.local.get("hiddenDomains", (res) => {
    /**
     * @type {string[]}
     */
    let hiddenDomains = res.hiddenDomains || [];
    if (hiddenDomains.length > 0) hideResults(hiddenDomains);
  });

  browser.storage.local.get("hiddenCards", (res) => {
    /**
     * @type {number}
     */
    let hiddenCards = res.hiddenCards || 0;
    hideCards(hiddenCards);
  });
});

let darkTheme = false;

window.addEventListener("load", async () => {
  // attempt to determine if the current theme is light or dark. Search doesn't seem to use
  // prefers-color-scheme, so we have to parse a certain iframe's styles to determine the theme
  const darkThemeSpan = [...document.querySelectorAll("#appbar a span")].find((span) => span.innerText === "Dark theme");
  if (darkThemeSpan) {
    // get next sibling
    if(darkThemeSpan.nextSibling.innerText === "On") {
      darkTheme = true;
    } else if (darkThemeSpan.nextSibling.innerText === "Off") {
      darkTheme = false;
    } else {
      // check with window
      let matchesDark = window.matchMedia("(prefers-color-scheme: dark)")
      darkTheme = matchesDark.matches;
    }

    if (darkTheme)
      document.documentElement.style.setProperty("--hypersearch-border-color", "#3c4043");
    else
      document.documentElement.style.setProperty("--hypersearch-border-color", "#dadce0");
  }

  let res = await browser.storage.local.get("hiddenDomains");
  let hiddenDomains = res.hiddenDomains || [];
  if (hiddenDomains.length > 0) hideResults(hiddenDomains);

  res = await browser.storage.local.get("hiddenCards");
  let hiddenCards = res.hiddenCards || 0;
  hideCards(hiddenCards);

  parseResults();
  parseCards();

  observer.observe(document.querySelector("#center_col"), {
    subtree: true,
    childList: true,
  });
});

/**
 * Parses new search results by type, and injects new HTML content into each
 * result element to facilitate domain settings
 */
const parseResults = () => {
  // find those elements with:
  // - class "g": search results
  // - no data-hypersearch-opts attribute: not already parsed
  // - no child elements with class "g" (i.e. find the leaf .g nodes)
  const results = Array.from(document.querySelectorAll("div.g:not([data-hypersearch-opts]):not(:has(.g))")).map((result) => {
    if (result.querySelector(":scope > [jsslot]")) {
      // if the result element has a direct child with the jsslot attribute, it's a video
      return {
        type: "video",
        result,
        optContainer: result.querySelector(":scope > [jsslot]"),
        href: new URL(result.querySelector("a").href).hostname,
      }
    } else if (result.querySelector(":scope > g-section-with-header")) {
      // if the result element has a direct child with the g-section-with-header tag, it's a twitter result
      return {
        type: "twitter",
        result,
        optContainer: result.querySelector(":scope > g-section-with-header > div:first-of-type"),
        href: new URL(result.querySelector("a").href).hostname,
      }
    } else {
      // otherwise, it's a default search result
      return {
        type: "default",
        result,
        optContainer: result,
        href: new URL(result.querySelector("a").href).hostname,
      }
    }
  });

  results.forEach(async ({type, result, optContainer, href}) => {
    result.setAttribute("data-hypersearch-opts", "true");

    // fetch the template and inject it into the result element
    // FIXME: this fetch runs every time a result is parsed
    const res = await fetch(chrome.runtime.getURL('/src/content/hypersearch-result-template.html'));
    const template = await res.text();
    optContainer.insertAdjacentHTML("beforeend", template);

    // set the theme of the options container
    const opts = optContainer.querySelector(".hypersearch-opts");
    opts.setAttribute("data-hypersearch-theme", darkTheme ? "dark" : "light");

    optContainer.querySelector("[data-hypersearch-action=hide]").addEventListener("click", () => {
      storeHiddenDomain(href).then(() => hideResults(href));
    });

    optContainer.querySelector("[data-hypersearch-action=pin]").addEventListener("click", () => {
      storePinnedDomain(href).then(() => { /** TODO: implement pinResults(href) */});
    });

    // remove any set display property
    optContainer.style.display = null;
    optContainer.classList.add("hypersearch-result");
  });
};

/**
 * Adds a domain to the hidden domains list
 * @param {string} domain
 */
const storeHiddenDomain = async (domain) => {
  let res = await browser.storage.local.get("hiddenDomains");
  let hiddenDomains = res.hiddenDomains || [];

  if(hiddenDomains.includes(domain)) {
    console.warn(`Domain ${domain} already hidden.`);
    return;
  }

  hiddenDomains = [...hiddenDomains, domain];
  await browser.storage.local.set({ hiddenDomains });
};

/**
 * Adds a domain to the pinned domains list
 * @param {string} domain
 */
const storePinnedDomain = async (domain) => {
  let res = await browser.storage.local.get("pinnedDomains");
  let pinnedDomains = res.pinnedDomains || [];

  if(pinnedDomains.includes(domain)) {
    console.warn(`Domain ${domain} already pinned.`);
    return;
  }

  pinnedDomains = [...pinnedDomains, domain];
  await browser.storage.local.set({ pinnedDomains });
};

/**
 * parses through new search results and removes any that are hidden.
 * @param {string[]} hiddenDomains
 */
const hideResults = (hiddenDomains) => {
  Array.from(document.querySelectorAll("div.g[data-hypersearch-opts]:not([data-hypersearch-hidden])")).forEach((result) => {
    const href = new URL(result.querySelector("a").href).hostname;

    if(hiddenDomains.includes(href)) {
      result.classList.add("hypersearch-result-closing");
      result.setAttribute("data-hypersearch-hidden", "true");
    }
  });
};

const unhideResults = (hiddenDomains) => {
  Array.from(document.querySelectorAll("div.g[data-hypersearch-opts][data-hypersearch-hidden]")).forEach((result) => {
    const href = new URL(result.querySelector("a").href).hostname;

    if(!hiddenDomains.includes(href)) {
      result.removeAttribute("data-hypersearch-hidden");
    }
  });
};

const parseCards = () => {
  const defintions = Array.from(document.querySelectorAll(`${cardMap.get(DEFINITIONS)}:not([data-hypersearch-opts])`));
  const relatedQuestions = Array.from(document.querySelectorAll(`${cardMap.get(RELATED_QUESTIONS)}:not([data-hypersearch-opts])`));
  const relatedResults = Array.from(document.querySelectorAll(`${cardMap.get(RELATED_RESULTS)}:not([data-hypersearch-opts])`));
  // FIXME: this is a bit shaky! news requires an extra identifier to be sure
  const potentialNews = Array.from(document.querySelectorAll(`div[jsdata][data-ved]:has(div[aria-level="2"][role="heading"]):not([data-hypersearch-opts])`));

  defintions.forEach(el => {
    el.classList.add("hypersearch-card");
    el.setAttribute("data-hypersearch-opts", "true");
    el.setAttribute("data-hypersearch-type", DEFINITIONS);

    const headerParent = el.querySelector("[data-attrid='DictionaryHeader']");
    if(!headerParent) return;
    wrapHeader(headerParent, DEFINITIONS);
  });

  relatedQuestions.forEach(el => {
    el.classList.add("hypersearch-card");
    el.setAttribute("data-hypersearch-opts", "true");
    el.setAttribute("data-hypersearch-type", RELATED_QUESTIONS);

    const headerParent = el.children[0];
    if(!headerParent) return;
    wrapHeader(headerParent, RELATED_QUESTIONS);
  });

  relatedResults.forEach(el => {
    el.classList.add("hypersearch-card");
    el.setAttribute("data-hypersearch-opts", "true");
    el.setAttribute("data-hypersearch-type", RELATED_RESULTS);

    const headerParent = el.children[0];
    if(!headerParent) return;
    wrapHeader(headerParent, RELATED_RESULTS);
  });

  // potentialNews.forEach(el => {
  //   const heading = el.querySelector("[aria-level='2'][role='heading']");
  //   if (!heading) return;
  //   if (el.querySelector("[aria-level='2'][role='heading']").innerText === "Top stories") {
  //     el.setAttribute("data-hypersearch-opts", "true");
  //     el.setAttribute("data-hypersearch-type", "news");
  //     el.style.backgroundColor = "yellow";
  //   }
  // });
};

/**
 *
 * @param {HTMLDivElement} headerParent
 * @param {string} type - The type of card to hide from search results.
 * @returns
 */
const wrapHeader = async (headerParent, type) => {
  /**
   * @type {HTMLDivElement | null}
   */
  const header = headerParent.children[0];

  if(!header) {
    console.warn("Error parsing card: No header found");
    return;
  }

  header.style.width = "100%";

  const headerWrapper = document.createElement("div");
  headerWrapper.classList.add("hypersearch-card-header");
  headerWrapper.appendChild(header);

  // FIXME: this fetch runs every time a card is parsed
  const res = await fetch(chrome.runtime.getURL('/src/content/hypersearch-result-template.html'));
  const template = await res.text();
  headerWrapper.insertAdjacentHTML("beforeend", template);

  // setup template data
  const opts = headerWrapper.querySelector(".hypersearch-opts");
  opts.setAttribute("data-hypersearch-theme", darkTheme ? "dark" : "light");
  headerWrapper.querySelector("[data-hypersearch-action=hide]").addEventListener("click", () => {
    storeHiddenCardType(type).then(() => hideCardType(type));
  });

  headerParent.insertBefore(headerWrapper, headerParent.firstChild);
};

/**
 *
 * @param {string} type - The type of card to hide from search results.
 */
const storeHiddenCardType = async (type) => {
  let res = await browser.storage.local.get("hiddenCards");
  let hiddenCards = res.hiddenCards || 0;

  hiddenCards |= type;

  await browser.storage.local.set({ hiddenCards });
};

/**
 * @param {number} type - The type of card to hide from search results. This is
 * equivalent to a 32-bit bitmask with a single bit set.
 */
const hideCardType = (type) => {
  const query = cardMap.get(type) + ":not([data-hypersearch-hidden])";
  const cards = Array.from(document.querySelectorAll(query));

  cards.forEach(card => {
    card.classList.add("hypersearch-result-closing");
    card.setAttribute("data-hypersearch-hidden", "true");
  });
};

/**
 * @param {number} type - The type of card to unhide from search results. This
 * is equivalent to a 32-bit bitmask with a single bit set.
 */
const unhideCardType = (type) => {
  const query = cardMap.get(type) + "[data-hypersearch-hidden]";
  const cards = Array.from(document.querySelectorAll(query));

  cards.forEach(card => {
    card.removeAttribute("data-hypersearch-hidden");
  });
};

/**
 * Hides all cards that are flagged in the provided bitmask
 *
 * @param {number} types a bitmask of card types to hide
 * @param {boolean} isSingle whether type is a single card type or an aggregate of multiple card types
 */
const hideCards = (types) => {
  if (isSingle) {
    hideCardType(types);
  } else {
    // iterate through each bit in the types bitmask and hide the card type if it exists
    for (let i = 0; i < 32; i++) {
      if (types & (1 << i) && cardMap.has(1 << i)) {
        hideCardType(1 << i);
      }
    }
  }
};

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "log":
      console.log(message.payload);
      break;
    case "update_hidden_results":
      unhideResults(message.payload || []);
      hideResults(message.payload || []);
      break;
    case "update_hidden_cards":
      unhideCards(message.payload || 0);
      hideCards(message.payload || 0);
      break;
    case "update_pinned_results":
      console.log("update_pinned is unimplemented");
      // unpinResults(message.payload || []);
      // pinResults(message.payload || []);
      break;
  }
});
