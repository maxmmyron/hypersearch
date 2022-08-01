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
  browser.storage.local.get("config").then(
    (item) => {
      /**
       * primary config for domains array, streamlining settings, and extension settings
       */
      const config = item.config;
      if (!config) return;

      // extract domain array and streamlining JSON object
      const domains = config.domains;
      const streamlining = config.streamlining;

      handleDomainsSetup(domains);

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
 * @param {Object} domainConfigs
 */
const handleDomainsSetup = (domainConfigs) => {
  // holds all search results available on page
  const searchResultsDOMElements = Array.from(document.querySelectorAll("#center_col .g"));

  // stores domain trimming regexp to remove extraneous filler
  const domainTrimmingRegexp = /(^\w+:|^)\/\/(w{3}\.)*/;

  // get current domanis on search results page
  const searchResultsDomains = searchResultsDOMElements.map((searchResultElement) => {
    // reset styling
    resetStyling(searchResultElement);
    // get cite element
    const searchResultCiteElement = searchResultElement.querySelector("cite");
    if (searchResultCiteElement) {
      // split innerText to retrieve topmost domains,
      // and trim away HTTP protocol
      return searchResultCiteElement.innerText.split(" ")[0].replace(domainTrimmingRegexp, "");
    }
  });

  const [lazyDomainConfigs, exactDomainConfigs, overrideDomainConfigs] = splitDomainConfigs(domainConfigs);

  const lazyDomainActions = buildDomainActionConfigs(lazyDomainConfigs, searchResultsDOMElements, searchResultsDomains);
  const exactDomainActions = buildDomainActionConfigs(exactDomainConfigs, searchResultsDOMElements, searchResultsDomains);
  const overrideDomainActions = buildDomainActionConfigs(overrideDomainConfigs, searchResultsDOMElements, searchResultsDomains);

  // perform domain actions for each domainActions array
  [lazyDomainActions, exactDomainActions, overrideDomainActions].forEach((domainActions) => domainActions.forEach((domainAction) => handleDomainAction(domainAction)));
};

/**
 * Splits domainConfigs JSON object into three subtypes based on domain settings
 * @param {JSON[]} domainConfigs JSON object array of domains and their settings
 * @returns array of three subarrays based on domainConfigs. This array is meant to be destructured to access each subarray.
 */
const splitDomainConfigs = (domainConfigs) => {
  const lazyConfigs = domainConfigs.filter((domainConfig) => !domainConfig.options.strict && !domainConfig.options.override);
  const exactConfigs = domainConfigs.filter((domainConfig) => domainConfig.options.strict && !domainConfig.options.override);
  const overrideConfigs = domainConfigs.filter((domainConfig) => domainConfig.options.override);

  return [lazyConfigs, exactConfigs, overrideConfigs];
};

/**
 * matches each HTMLElement in searchResults HTMLElement array to an
 * action specified in domainConfigs JSON object
 * @param {Object} domainConfigs JSON Object array of domains and their settings
 * @param {HTMLElement[]} searchResults HTMLElement array of search results
 * @param {string[]} searchDomains string array of domains. Corresponds 1-to-1 with searchResults length
 * @returns JSON Object of HTMLElements and string actions to perform.
 */
const buildDomainActionConfigs = (domainConfigs, searchResults, searchDomains) => {
  const searchMatches = [];

  // search for lazy/exact domain name matches between searchDomain array and domainConfig array,
  // and push matches into a new array for action matching
  domainConfigs.forEach((domainConfig) => {
    searchDomains.forEach((testedDomain, i) => {
      // continue if element already exists in searchMatches array
      //if(searchMatches.length > 0 && searchMatches.filter(searchMatch => searchMatch.searchElement === searchResults[i])) continue;

      // domain used for testing
      const testingDomain = domainConfig.domain;

      // represents domain to test, stripped of subdomains
      const lasyTestedDomain = psl.parse(testedDomain).domain;

      const isStrict = domainConfig.options.strict;

      console.log(`testing ${testedDomain} against ${testingDomain}; ${isStrict ? "should be exact match" : "exact match not necessary"}`);

      // check if isStrict is true so we can determine how to test our two domains
      if (isStrict) {
        // check for exact match
        if (testedDomain === testingDomain) {
          console.log(`🔬 ${testedDomain} exactly matches ${testingDomain}`);
          searchMatches.push({
            searchElement: searchResults[i],
            config: domainConfig
          });
        }
        // exact match not found
        else console.log(`⛔ ${testedDomain} does not exactly match ${testingDomain}`);
      } else {
        // check for lazy match, since isStrict is false
        if (lasyTestedDomain === testingDomain || testedDomain === testingDomain) {
          console.log(`✅ ${testedDomain} lazy matches ${testingDomain}`);
          searchMatches.push({
            searchElement: searchResults[i],
            config: domainConfig
          });
        }
        // lazy match not found
        else console.log(`⛔ ${testedDomain} does not match ${testingDomain}`);
      }
    });
  });

  const actionConfig = [];

  searchMatches.forEach((domainMatch) => {
    const searchElement = domainMatch.searchElement;
    const config = domainMatch.config;

    let action;

    if (!config.options.override) {
      // given that these config settings are not overriding anything,
      // we can either pin or remove the element from the search results
      config.options.pinned ? (action = ACTION_MAPPING_ENUM.PIN) : (action = ACTION_MAPPING_ENUM.REMOVE);
    } else {
      // because these config settings are overriding an existing config,
      // we might want to do nothing in the case we aren't also pinning
      // the overridden element
      config.options.pinned ? (action = ACTION_MAPPING_ENUM.PIN) : (action = ACTION_MAPPING_ENUM.NONE);
    }

    actionConfig.push({ element: searchElement, action: action });
  });

  console.log(actionConfig);

  return actionConfig;
};

/**
 * performs an action on an HTMLElement
 * @param {Object} actionConfig config consisting of HTMLelement to remove and action to perform
 * @param {HTMLElement} actionConfig.element HTMLElement to perform action on
 * @param {ACTION_MAPPING_ENUM} actionConfig.action action to perform
 */
const handleDomainAction = (actionConfig) => {
  // reset styling first, since some elements may be handled twice (bug as of now, check this later)
  resetStyling(actionConfig.element);
  // determine proper course of action for config
  switch (parseInt(actionConfig.action)) {
    case ACTION_MAPPING_ENUM.NONE:
      overrideDomain(actionConfig.element);
      break;
    case ACTION_MAPPING_ENUM.REMOVE:
      removeDomain(actionConfig.element);
      break;
    case ACTION_MAPPING_ENUM.PIN:
      pinDomain(actionConfig.element);
      break;
    default:
      break;
  }
};

/**
 * Overrides a searchResult HTMLElement's styling
 * @param {HTMLElement} searchResultElement element to override existing domain actions
 */
const overrideDomain = (searchResultElement) => resetStyling(searchResultElement);

/**
 * Removes a searchResult from the search page
 * @param {HTMLElement} searchResultElement element to remove from search results page
 */
const removeDomain = (searchResultElement) => searchResultElement.style.display = "none";

/**
 * Pins a searchResult to the top of the search page
 * @param {HTMLElement} searchResultElement element to pin to top of search page
 */
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

// const handleStreamlining = (streamliningConfig) => {
//   return null;
// };

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "update_page") {
    const config = message.payload;
    browser.storage.local.set({ config }).then(
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
