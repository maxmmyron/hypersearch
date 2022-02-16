// TODO: error checking and logging ✅
// TODO: streamlined/refactored code ✅
// TODO: documentation ✅
// TODO: settings functionality
// TODO: totally resetting config ability
// TODO: refactor to utilize DocumentFragment when creating domain elements

/**
 * configuration for domain list and settings
 */
let config = null;

/**************** */
// helper functions
/**************** */

/**
 * DEBUG - logs a message to the console via content script if debug is true
 * @param {*} message string to log to console
 */
const logDebugMessage = (message) => {
  console.log(message);
  config.settings.debug && updateContentScript("log_message", message);
};

/**************** */
// header input handling
/**************** */

/**
 * parses domain input to ensure validity
 * if valid, creates new domain JSON object and updates page
 * @param {*} e
 */
const parseDomain = (e) => {
  const domain = document.getElementById("input").value;

  // validate domain structure
  if (!psl.get(domain)) {
    logDebugMessage("domain is not valid");
    return null;
  }

  // validate domain does not already exist in config
  if (!config.domains.some((domainObj) => domainObj.domain === domain)) {
    // create a new JSON object with new domain data
    const newDomainJSON = {
      domain: domain,
      options: {
        strict: false,
        pinned: false,
        override: false
      }
    };

    // push to domain array, and update storage and front-end
    config.domains.push(newDomainJSON);
    // update page, storage, and popup
    updateContentScript("update_page", config, updatePopup);
  } else logDebugMessage("domain already exists");
};

document.getElementById("input").addEventListener("keyup", (e) => {
  e.key === "Enter" && parseDomain(e);
});

document.getElementById("confirm-input").addEventListener("click", parseDomain);

// toggles between content frames (domain list frame & settings frame)
document.getElementById("settings-toggle").addEventListener("click", () => {
  document.getElementById("domains-frame").classList.toggle("frame-invisible");
  document.getElementById("settings-frame").classList.toggle("frame-invisible");
});

/**************** */
// domain parsing and handling
/**************** */

/**
 * Creates a new HTMLElement based on domainObject and existing HTML5 template in DOM.
 * @param {Object} domainObject JSON object to fill in domain element content
 * @returns HTMLElement
 */
const createDomainElement = (domainObject) => {
  // get template container & clone
  const domainTemplate = document.getElementById("domain-template");
  const domainContainer = domainTemplate.content.firstElementChild.cloneNode(true);

  domainContainer.querySelector(".domain").innerText = domainObject.domain;

  //const settingsButtonContainer = Array.from(domainContainer.querySelector(".domain-settings"));

  for (const option in domainObject.options) {
    if (domainObject.options[option]) domainContainer.querySelector(`button[data-settings-type="${option}"]`).classList.add("button-toggled");
  }

  // Array.from(domainContainer.querySelector(".domain-settings > button[data-settings-type]")).forEach((settingsButton, i) => {
  //   // check if domain JSON object has any settings toggled, and add respective class if so
  //   logDebugMessage(domainObject.options);
  //   if (domainObject.options[settingsButton.getAttribute("data-settings-type")]) settingsButton.classList.add("button-toggled");
  // });

  // return new HTMLElement
  return domainContainer;
};

/**
 * handles domain settings change
 * @param {*} event
 */
const handleDomainSettingsClick = (event) => {
  const domainContainer = event.target.closest(".domain-container");
  const domainText = domainContainer.children[0].innerText;
  const settingsName = event.target.getAttribute("data-settings-type");

  event.target.classList.toggle("button-toggled");

  // retrieve domain from config array to toggle settings
  config.domains.find((domain) => {
    if (domain.domain === domainText) {
      domain.options[settingsName] = !domain.options[settingsName];
    }
  });

  // update page, storage, and popup
  updateContentScript("update_page", config, updatePopup);
};

/**
 * handles removal of domain elements
 * @param {*} event
 */
const handleDomainRemoveClick = (event) => {
  const domainContainer = event.target.closest(".domain-container");
  const domainText = domainContainer.children[0].innerText;

  // remove domain container from DOM
  domainContainer.remove();

  // remove domain from current config list
  config.domains = config.domains.filter((domain) => domain.domain !== domainText);

  // update page, storage, and popup
  updateContentScript("update_page", config, updatePopup);
};

/**
 * iteratively fills in popup with existing domains
 */
const updatePopup = () => {
  const domainContainer = document.getElementById("frame-content-domain-wrapper");

  // ensure domainContainer is emptied so we don't add duplicate elements
  domainContainer.textContent = "";

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
  domainContainer.appendChild(documentFragment);
};

/**************** */
// settings methods
/**************** */

/**************** */
// browser storage methods
/**************** */

// updates JSON data with most up-to-date data from browser storage on DOM load, then updates popup
document.addEventListener("DOMContentLoaded", () => {
  // get config from storage
  browser.storage.local.get("config").then(
    (item) => {
      if (item.config) {
        // set config to current storage value & update page
        config = item.config;
      } else {
        // set config to default config, since this should only fire if item.config is set to null
        config = {
          domains: [],
          settings: {
            debug: "true"
          },
          streamlining: {
            hide_shopping: false,
            hide_graph: false,
            hide_snippets: false,
            hide_questions: false,
            hide_related: false,
            hide_images: false,
            hide_videos: false,
            hide_definitions: false
          }
        };
      }

      updateContentScript("update_page", config, updatePopup);
    },
    (err) => {
      logDebugMessage(err.message);
    }
  );
});

/**
 * sends a new payload to content script
 * @param {string} type - payload type, specifies function to exec once recieved
 * @param {*} payload - payload data
 * @param {*} func - optional : function to executue after successful response
 */
const updateContentScript = (type, payload, func = null) => {
  // query for active tab
  browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      // send a new message to content script
      browser.tabs
        .sendMessage(tabs[0].id, {
          type: type, // message type
          payload: payload // message data
        })
        .then(() => func && func()) // optionally run function, if specified
        .catch(
          (err) =>
            // only send message if not log_message type to prevent infinite loop
            type != "log_message" && logDebugMessage(err.message)
        );
    })
    .catch((err) => {
      logDebugMessage(err.message);
    });
};
