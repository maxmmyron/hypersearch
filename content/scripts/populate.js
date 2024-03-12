const observer = new MutationObserver((mutations)=> {
  chrome.storage.local.get("hiddenDomains", (res) => {
    /**
     * @type {string[]}
     */
    let hiddenDomains = res.hiddenDomains || [];
    if (hiddenDomains.length > 0) hideResults(hiddenDomains);
  });

  parseResults();
});

let darkTheme = false;

window.addEventListener("load", () => {
  // attempt to determine if the current theme is light or dark. Search doesn't seem to use
  // prefers-color-scheme, so we have to parse a certain iframe's styles to determine the theme
  const darkThemeSpan = [...document.querySelectorAll("#appbar a span")].find((span) => span.innerText === "Dark theme");
  if (darkThemeSpan) {
    // get next sibling
    if(darkThemeSpan.nextSibling.innerText === "On") {
      darkTheme = true;
      document.documentElement.style.setProperty("--hypersearch-border-color", "#3c4043");
    } else {
      document.documentElement.style.setProperty("--hypersearch-border-color", "#dadce0");
    }
  }

  setTimeout(() => {
  chrome.storage.local.get("hiddenDomains", (res) => {
    /**
     * @type {string[]}
     */
    let hiddenDomains = res.hiddenDomains || [];
    if (hiddenDomains.length > 0) hideResults(hiddenDomains);
  });
  }, 500);

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
  Array.from(document.querySelectorAll(".g:not([data-hypersearch-hidden])")).forEach((result) => {
    const href = new URL(result.querySelector("a").href).hostname;

    if(hiddenDomains.includes(href)) {
      result.style.display = "none";
      result.setAttribute("data-hypersearch-hidden", "true");
    }
  });
};

const unhideResults = (hiddenDomains) => {
  Array.from(document.querySelectorAll(".g[data-hypersearch-hidden]")).forEach((result) => {
    const href = new URL(result.querySelector("a").href).hostname;

    if(!hiddenDomains.includes(href)) {
      if (result.classList.contains("hypersearch-result")) {
        result.style.display = "grid";
      } else {
        result.style.display = "block";
      }

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
  // - no data-hypersearch-hidden attribute: not already hidden
  // - no child elements with class "g" (i.e. find the leaf .g nodes)
  const results = Array.from(document.querySelectorAll(".g:not([data-hypersearch-opts]):not([data-hypersearch-hidden]):not(:has(.g))")).map((result) => {
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

  results.forEach(({type, result, optContainer, href}) => {
    result.setAttribute("data-hypersearch-opts", "true");

    const hideButton = document.createElement("button");
    hideButton.classList.add("hypersearch-opt");
    hideButton.setAttribute("data-hypersearch-action", "hide");
    hideButton.addEventListener("click", () => {
      addHiddenDomain(href);
      hideResults(href);

    });

    const pinButton = document.createElement("button");
    pinButton.classList.add("hypersearch-opt");
    pinButton.setAttribute("data-hypersearch-action", "pin");
    pinButton.addEventListener("click", () => {
      addPinnedDomain(href);
      pinResults(href);
    });

    const el = document.createElement("div");
    el.classList.add("hypersearch-opts");
    el.setAttribute("data-hypersearch-color", darkTheme ? "dark" : "light");
    el.appendChild(hideButton);
    el.appendChild(pinButton);

    optContainer.appendChild(el);
    // update from display: block -> grid
    optContainer.style.display = "grid";
    optContainer.classList.add("hypersearch-result");
  });
};

/**
 * Adds a domain to the hidden domains list
 * @param {string} domain
 */
const addHiddenDomain = (domain) => {
  chrome.storage.local.get("hiddenDomains", (res) => {
    /**
     * @type {string[]}
     */
    let hiddenDomains = res.hiddenDomains || [];

    if(hiddenDomains.includes(domain)) {
      console.warn(`Domain ${domain} already hidden.`);
      return;
    }

    hiddenDomains = [...hiddenDomains, domain];

    chrome.storage.local.set({ hiddenDomains });
  });
};

/**
 * Adds a domain to the pinned domains list
 * @param {string} domain
 */
const addPinnedDomain = (domain) => {
  chrome.storage.local.get("pinnedDomains", (res) => {
    /**
     * @type {string[]}
     */
    let pinnedDomains = res.pinnedDomains || [];

    if(pinnedDomains.includes(domain)) {
      console.warn(`Domain ${domain} already pinned.`);
      return;
    }

    pinnedDomains = [...pinnedDomains, domain];

    chrome.storage.local.set({ pinnedDomains });
  });
};