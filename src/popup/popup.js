document.addEventListener("DOMContentLoaded", async () => {
  await rerenderPopup();
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
  domainContainer.querySelector(".remove-button").addEventListener("click", (e) => removeDomain(e, domain, type));

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
    const res = await browser.storage.local.get("hiddenDomains");
    let hiddenDomains = res.hiddenDomains || [];
    hiddenDomains = hiddenDomains.filter((d) => d !== domain);
    await browser.storage.local.set({ hiddenDomains });

    let tabs = await browser.tabs.query({ active: true, currentWindow: true });
    browser.tabs.sendMessage(tabs[0].id, { type: "update_hidden_results", payload: hiddenDomains });
  } else {
    // FIXME: remove early return once pinned results are implements
    return;
    const res = await browser.storage.local.get("pinnedDomains");
    let pinnedDomains = res.pinnedDomains || [];
    pinnedDomains = pinnedDomains.filter((d) => d !== domain);
    await browser.storage.local.set({ pinnedDomains });

    let tabs = await browser.tabs.query({ active: true, currentWindow: true });
    browser.tabs.sendMessage(tabs[0].id, { type: "update_pinned_results", payload: pinnedDomains });
  }
};

/**
 * Rerenders the current popup's domain lists
 */
const rerenderPopup = async () => {
  const hiddenDomainWrapper = document.querySelector("#domain-main");
  hiddenDomainWrapper.innerHTML = "";
  let hiddenDocumentFragment = new DocumentFragment();

  let hiddenRes = await browser.storage.local.get("hiddenDomains");
  let hiddenDomains = hiddenRes.hiddenDomains || [];
  hiddenDomains.forEach((domain) => {
    const domainEl = createDomainElement(domain, "hidden");
    hiddenDocumentFragment.appendChild(domainEl);
  });

  hiddenDomainWrapper.appendChild(hiddenDocumentFragment);

  // FIXME: remove early return once pinned results are implements
  return;

  const pinnedDomainWrapper = document.querySelector("#pinned-domains-frame > .domain-wrapper");
  pinnedDomainWrapper.innerHTML = "";
  let pinnedDocumentFragment = new DocumentFragment();

  let pinnedRes = await browser.storage.local.get("pinnedDomains");
  let pinnedDomains = res.pinnedDomains || [];
  pinnedDomains.forEach((domain) => {
    const domainEl = createDomainElement(domain, "pinned");
    pinnedDocumentFragment.appendChild(domainEl);
  });

  pinnedDomainWrapper.appendChild(pinnedDocumentFragment);
};
