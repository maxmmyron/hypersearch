document.addEventListener("DOMContentLoaded", () => {
  rerenderPopup();
});
/**************** */
// header input handling
/**************** */

// toggles between content frames (domain list frame & settings frame)
document.getElementById("settings-toggle").addEventListener("click", () => {
  document.getElementById("hidden-domains-frame").classList.toggle("frame-invisible");
  // FIXME: implement pinned results
  // document.getElementById("pinned-domains-frame").classList.toggle("frame-invisible");
  document.getElementById("settings-frame").classList.toggle("frame-invisible");
});

// *****************************
// Popup handlers
// *****************************

/**
 * Creates a new HTMLElement based on a domain string
 * @param {string} domain
 * @param {"hidden" | "pinned"} type
 * @returns {Node}
 */
const createDomainElement = (domain, type) => {
  /**
   * @type {HTMLTemplateElement}
   */
  const template = document.getElementById("domain-template");
  const domainContainer = template.content.firstElementChild.cloneNode(true);

  domainContainer.querySelector(".domain").innerText = domain;
  domainContainer.querySelector(".button-remove").addEventListener("click", (e) => removeDomain(e, domain, type));

  return domainContainer;
};

/**
 * Removes a domain from the list, and updates the page.
 * @param {MouseEvent} event
 * @param {string} domain
 * @param {"hidden" | "pinned"} type
 */
const removeDomain = async (event, domain, type) => {
  const container = event.target.closest(".domain-container");
  container.remove();
  if (type === "hidden") {
    const res = await chrome.storage.local.get("hiddenDomains");
    let hiddenDomains = res.hiddenDomains || [];
    hiddenDomains = hiddenDomains.filter((d) => d !== domain);
    await chrome.storage.local.set({ hiddenDomains });

    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: "update_hidden", payload: hiddenDomains });
    });
  } else {
    // FIXME: remove early return once pinned results are implements
    return;
    const res = await chrome.storage.local.get("pinnedDomains");
    let pinnedDomains = res.pinnedDomains || [];
    pinnedDomains = pinnedDomains.filter((d) => d !== domain);
    await chrome.storage.local.set({ pinnedDomains });

    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: "update_pinned", payload: pinnedDomains });
    });
  }
};

/**
 * Rerenders the current popup's domain lists
 */
const rerenderPopup = () => {
  const hiddenDomainWrapper = document.querySelector("#hidden-domains-frame > .domain-wrapper");
  hiddenDomainWrapper.innerHTML = "";
  let hiddenDocumentFragment = new DocumentFragment();

  chrome.storage.local.get("hiddenDomains").then((res) => {
    let hiddenDomains = res.hiddenDomains || [];
    hiddenDomains.forEach((domain) => {
      const domainEl = createDomainElement(domain, "hidden");
      hiddenDocumentFragment.appendChild(domainEl);
    });

    hiddenDomainWrapper.appendChild(hiddenDocumentFragment);
  });

  // FIXME: remove early return once pinned results are implements
  return;

  const pinnedDomainWrapper = document.querySelector("#pinned-domains-frame > .domain-wrapper");
  pinnedDomainWrapper.innerHTML = "";
  let pinnedDocumentFragment = new DocumentFragment();

  chrome.storage.local.get("pinnedDomains").then((res) => {
    let pinnedDomains = res.pinnedDomains || [];
    pinnedDomains.forEach((domain) => {
      const domainEl = createDomainElement(domain, "pinned");
      pinnedDocumentFragment.appendChild(domainEl);
    });

    pinnedDomainWrapper.appendChild(pinnedDocumentFragment);
  });
};
