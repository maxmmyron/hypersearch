/**
 * @file popup.js
 */

/**
 * @typedef {{
 *  debug: boolean,
 *  streamlining: {
 *    shopping: boolean,
 *    graph: boolean,
 *    snippets: boolean,
 *    questions: boolean,
 *    related: boolean,
 *    images: boolean,
 *    videos: boolean,
 *    definitions: boolean,
 *  }
 * }} Settings
 */

/**
 * @typedef {{domains: Domain[], settings: Settings}} Config
 */

/**
 * @typedef Domain
 * @property {string} domain - the domain to match with
 * @property {Object} options - settings for the domain
 * @property {boolean} options.pinned - whether the domain is pinned to the top
 * of the search results. If this is checked, the domain will not be removed.
 * @property {boolean} options.strict - whether the domain should match exactly.
 * For example, if this is checked, "example.com" will not match
 * "sub.example.com".
 * @property {boolean} options.override - whether this domain and its settings
 * should override the settings of other domains. For example, if
 * sub.example.com has override and pinned checked, it will override the
 * settings described in example.com and will not be removed.
 */

/**
 * configuration for domain list and settings
 *
 * @type {Config}
 */
let config = {
  domains: [],
  settings: {
    debug: true,
    streamlining: {
      shopping: true,
      graph: true,
      snippets: true,
      questions: true,
      related: true,
      images: true,
      videos: true,
      definitions: true
    }
  }
};

// update the page with the most up-to-date config when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  browser.storage.local.get("config").then(
    (item) => {
      if (item.config) config = item.config;
      updatePage("update", config, rerenderPopup);
    },
    (err) => log(err.message)
  );
});

/**
 * sends a new payload to content script
 * @param {"update" | "log"} type - payload type, specifies function to exec once received
 * @param {*} payload - payload data
 * @param {(() => void) | null} cb - optional : function to execute after successful response
 */
const updatePage = (type, payload, cb = null) => {
  // query for active tab
  browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      // send a message to the content script
      browser.tabs
        .sendMessage(tabs[0].id, {type, payload})
        .then(() => {
          // if a callback is provided, execute it after successful response
          if(cb) cb()
        })
        .catch((err) => {
          if(type != "log") log(err.message);
        });
    })
    .catch((err) => {
      log(err.message);
    });
};

/**************** */
// header input handling
/**************** */

/**
 * parses domain input to ensure validity
 * if valid, creates new domain JSON object and updates page
 * @param {*} e - unused
 */
const parseDomain = (e) => {
  const domain = document.getElementById("input").value;

  if (!psl.get(domain)) {
    log("domain is not valid");
    return;
  }

  if (config.domains.some((domainObj) => domainObj.domain === domain)) {
    log("domain already exists");
    return;
  }

  config.domains.push({
    domain,
    options: {
      strict: false,
      pinned: false,
      override: false
    }
  });

  updatePage("update", config, rerenderPopup);
};

document.getElementById("input").addEventListener("keyup", (e) => {
  if(e.key === "Enter") parseDomain(e);
});

document.getElementById("confirm-input").addEventListener("click", parseDomain);

// toggles between content frames (domain list frame & settings frame)
document.getElementById("settings-toggle").addEventListener("click", () => {
  document.getElementById("domains-frame").classList.toggle("frame-invisible");
  document.getElementById("settings-frame").classList.toggle("frame-invisible");
});

// *****************************
// Popup handlers
// *****************************

/**
 * Creates a new HTMLElement based on domainObject and existing HTML5 template in DOM.
 * @param {Domain} domain JSON object to fill in domain element content
 * @returns HTMLElement
 */
const createDomainElement = (domain) => {
  /**
   * @type {HTMLTemplateElement}
   */
  const template = document.getElementById("domain-template");
  const domainContainer = template.content.firstElementChild.cloneNode(true);

  domainContainer.querySelector(".domain").innerText = domain.domain;

  for (const option in domain.options) {
    if (domain.options[option]) domainContainer.querySelector(`button[data-settings-type="${option}"]`).classList.add("button-toggled");
  }

  return domainContainer;
};

/**
 * handles domain settings change
 * @param {*} event
 */
const updateDomainSetting = (event) => {
  const container = event.target.closest(".domain-container");
  const href = container.children[0].innerText;
  const setting = event.target.getAttribute("data-settings-type");

  event.target.classList.toggle("button-toggled");

  // retrieve domain from config array to toggle settings
  config.domains.find((domain) => {
    if (domain.domain === href) {
      domain.options[setting] = !domain.options[setting];
    }
  });

  // update page, storage, and popup
  updatePage("update", config, rerenderPopup);
};

/**
 * Removes a domain from the list, and updates the page.
 * @param {MouseEvent} event
 */
const removeDomain = (event) => {
  const container = event.target.closest(".domain-container");
  const href = container.children[0].innerText;

  container.remove();
  config.domains = config.domains.filter((domain) => domain.domain !== href);

  updatePage("update", config, rerenderPopup);
};

/**
 * Rerenders the popup with updated domain list and settings.
 */
const rerenderPopup = () => {
  const domainsContainer = document.getElementById("frame-content-domain-wrapper");
  // clear out existing domain elements, if any
  domainsContainer.textContent = "";

  // create a DocumentFragment so we don't need to repaint the DOM like 100 times
  let documentFragment = new DocumentFragment();

  // iteratively append domain elements to documentFragment
  config.domains.forEach((domain) => {
    const domainElement = createDomainElement(domain);
    Array.from(domainElement.querySelectorAll(".button[data-settings-type]")).forEach((settingsButton) => {
      settingsButton.addEventListener("click", handleDomainSettingsClick);
    });
    domainElement.querySelector(".button-remove").addEventListener("click", handleDomainRemoveClick);
    documentFragment.appendChild(domainElement);
  });

  // append fragment to domain container
  domainsContainer.appendChild(documentFragment);
};

/**
 * DEBUG - logs a message to the console via content script if debug is true
 * @param { string } message string to log to console
 */
const log = (message) => {
  console.log(message);
  config.settings.debug && updatePage("log_message", message);
};
