const SHOW_SQUIGGLES = false;

const observer = new MutationObserver((mutations)=> {
  browser.storage.local.get("hiddenDomains", (res) => {
    /**
     * @type {string[]}
     */
    let hiddenDomains = res.hiddenDomains || [];
    if (hiddenDomains.length > 0) hideResults(hiddenDomains);
  });

  parseResults();
  parseCards();
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

  parseResults();

  observer.observe(document.querySelector("#center_col"), {
    subtree: true,
    childList: true,
  });
});

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
    const res = await fetch(chrome.runtime.getURL('/src/content/hypersearch-template.html'));
    const template = await res.text();
    optContainer.insertAdjacentHTML("beforeend", template);

    // set the theme of the options container
    const opts = optContainer.querySelector(".hypersearch-opts");
    opts.setAttribute("data-hypersearch-theme", darkTheme ? "dark" : "light");

    optContainer.querySelector("[data-hypersearch-action=hide]").addEventListener("click", () => {
      addHiddenDomain(href).then(() => hideResults(href));
    });

    optContainer.querySelector("[data-hypersearch-action=pin]").addEventListener("click", () => {
      addPinnedDomain(href).then(() => { /** TODO: implement pinResults(href) */});
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
const addHiddenDomain = async (domain) => {
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
const addPinnedDomain = async (domain) => {
  let res = await browser.storage.local.get("pinnedDomains");
  let pinnedDomains = res.pinnedDomains || [];

  if(pinnedDomains.includes(domain)) {
    console.warn(`Domain ${domain} already pinned.`);
    return;
  }

  pinnedDomains = [...pinnedDomains, domain];
  await browser.storage.local.set({ pinnedDomains });
};

const parseCards = () => {
  // search for definition cards
  const defintions = Array.from(document.querySelectorAll("div[data-corpus]:has(div[data-attrid='SenseDefinition']"));
  const related = Array.from(document.querySelectorAll("div[data-abe]"));
  const pae = Array.from(document.querySelectorAll("div[jsaction][data-initq][data-miif]")).map((el) => el.parentElement.parentElement);
  const news = Array.from(document.querySelectorAll("div[jsdata][data-ved]:has(div[aria-level='2'][role='heading'])")).filter(el => el.querySelector("div[aria-level='2'][role='heading'])").innerText === "Top stores")


};

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "log":
      console.log(message.payload);
      break;
    case "update_hidden":
      unhideResults(message.payload || []);
      hideResults(message.payload || []);
      break;
    case "update_pinned":
      console.log("update_pinned is unimplemented");
      // unpinResults(message.payload || []);
      // pinResults(message.payload || []);
      break;
  }
});
