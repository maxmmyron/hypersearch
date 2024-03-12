/**
 * Enum for possible actions to perform against an HTMLElement
 * @enum {String}
 */
const ACTION_MAPPING_ENUM = {
  NONE: 0,
  REMOVE: 1,
  PIN: 2
};

/**
 * Updates results of search page
 */
const updatePageResults = () => {
  // retrieve updated list from localStorage
  chrome.storage.local.get("config").then(
    (item) => {
      /**
       * primary config for domains array, streamlining settings, and extension settings
       */
      const config = item.config;
      console.log("config", config);
      if (!config) return;

      // extract domain array and streamlining JSON object
      const domainConfigs = config.domains;
      const streamliningConfig = config.streamlining;

      handleDomainsSetup(domainConfigs);

      // handleStreamlining(streamlining);
    },
    (err) => {
      console.error(`Error attempting to get local storage: ${err}`);
    }
  );
};

/**
 * handles domain matching, removing, and pinning
 * given domainConfigs object
 * @param {import("../../popup/popup.js").Domains[]} domainConfigs - JSON Object array of domains and their settings
 */
const handleDomainsSetup = (domainConfigs) => {
  const results = Array.from(document.querySelectorAll("#center_col .g"));
  const resultURLS = results.map((result) => {
    resetStyling(result);

    const href = result.querySelector("span > a");
    if(!href) {
      // TODO: handle err
    }
    return new URL(href.href).hostname;
  })

  // split config into subtypes, based on domain settings
  const lazyConfigs = domainConfigs.filter((domainConfig) => !domainConfig.options.strict && !domainConfig.options.override);
  const exactConfigs = domainConfigs.filter((domainConfig) => domainConfig.options.strict && !domainConfig.options.override);
  const overrideConfigs = domainConfigs.filter((domainConfig) => domainConfig.options.override);

  const [lazyRemovedElements, lazyPinnedElements] = buildResultsActions(lazyConfigs, results, resultURLS);
  const [exactRemovedElements, exactPinnedElements] = buildResultsActions(exactConfigs, results, resultURLS);
  const [overrideRemovedElements, overridePinnedElements] = buildResultsActions(overrideConfigs, results, resultURLS);

  // handle lazy and exact matches first, since they are not overriding anything
  [...lazyRemovedElements, ...exactRemovedElements].forEach((element) => hideDomain(element));
  [...lazyPinnedElements, ...exactPinnedElements].forEach((element) => pinDomain(element));

  // override configs should be handled last, since they are overriding other configs
  [...overrideRemovedElements, ...overridePinnedElements].forEach((element) => resetStyling(searchResultElement));
  overrideRemovedElements.forEach((element) => hideDomain(element));
  overridePinnedElements.forEach((element) => pinDomain(element));
};

/**
 * matches each HTMLElement in searchResults HTMLElement array to an
 * action specified in domainConfigs JSON object
 * @param {DomainConfig[]} domainConfigs JSON Object array of domains and their settings
 * @param {Element[]} results HTMLElement array of search results
 * @param {string[]} resultURLs string array of domains. Corresponds 1-to-1 with searchResults length
 * @returns {[HTMLElement[], HTMLElement[]]} - array of removedElements and pinnedElements
 */
const buildResultsActions = (domainConfigs, results, resultURLS) => {
  /**
   * @type {{searchElement: HTMLElement, config: DomainConfig}[]}
   */
  const resultMatches = [];

  domainConfigs.forEach((domainConfig) => {
    resultURLS.forEach((resultURL, i) => {
      const parsedURL = psl.parse(resultURL).domain;

      // exact match
      if(resultURL === domainConfig.domain) {
        resultMatches.push({
          searchElement: results[i],
          config: domainConfig
        })
      }
      // lazy match
      else if (parsedURL === domainConfig.domain && !domainConfig.options.strict) {
        resultMatches.push({
          searchElement: results[i],
          config: domainConfig
        })
      }
    });
  });

  /**
   * @type {{element: HTMLElement, action: ACTION_MAPPING_ENUM}[]}
   */
  const actionConfig = [];

  resultMatches.forEach((resultMatch) => {
    /**
     * @type {ACTION_MAPPING_ENUM}
     */
    let action;

    if (!resultMatch.config.options.override) {
      // given that these config settings are not overriding anything,
      // we can either pin or remove the element from the search results
      resultMatch.config.options.pinned ? (action = ACTION_MAPPING_ENUM.PIN) : (action = ACTION_MAPPING_ENUM.REMOVE);
    } else {
      // because these config settings are overriding an existing config,
      // we might want to do nothing in the case we aren't also pinning
      // the overridden element
      resultMatch.config.options.pinned ? (action = ACTION_MAPPING_ENUM.PIN) : (action = ACTION_MAPPING_ENUM.NONE);
    }

    actionConfig.push({ element: resultMatch.searchElement, action: action });
  });

  const removedElements = actionConfig.filter((action) => action.action === ACTION_MAPPING_ENUM.REMOVE).map((action) => action.element);
  const pinnedElements = actionConfig.filter((action) => action.action === ACTION_MAPPING_ENUM.PIN).map((action) => action.element);

  return [removedElements, pinnedElements];
};

const hideDomain = (searchResultElement) => searchResultElement.style.display = "none";

const pinDomain = (searchResultElement) => {
  searchResultElement.style.backgroundColor = "rgba(127,255,127,0.05)";
  searchResultElement.style.borderRadius = "4px";
};

/**
 * Resets the styling for a particular element.
 * @param {HTMLElement} searchResultElement element to remove all styling for
 */
const resetStyling = (searchResultElement) => {
  searchResultElement.style.display = "block";
  searchResultElement.style.padding = "4px";
  searchResultElement.style.backgroundColor = "initial";
  searchResultElement.style.borderRadius = "initial";
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "update") {
    const config = message.payload;
    chrome.storage.local.set({ config }).then(
      () => {
        updatePageResults();
      },
      (err) => console.error(`Error attempting to set local storage: ${err}`)
    );
  } else {
    console.log(message.payload);
  }
});

// automatically update page results on page load
updatePageResults();
