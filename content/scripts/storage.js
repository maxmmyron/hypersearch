/**
 *
 * @returns {Config}
 */
const generateConfig = () => ({
  domains: [],
  opts: {
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
})


chrome.runtime.onMessage.addListener(async (message) => {
  /**
   * @type {string}
   */
  let domain = message.payload;

  /**
   * @type {Config}
   */
  let config = await chrome.storage.local.get("config");

  if (!config) {
    config = generateConfig();
  }

  switch (message.type) {
    case "hide_domain":
      if(config.domains.includes(domain)) {
        console.warn(`Domain ${domain} already hidden.`);
        break;
      }

      config.domains.push({
        domain,
        opts: {
          strict: false,
          override: false,
          pinned: false,
        }
      });

      await chrome.storage.local.set({ config });
      break;
    case "unhide_domain":
      config.domains = config.domains.filter((d) => d.domain !== domain);

      await chrome.storage.local.set({ config });
      break;
    case "pin_domain":
      if(config.domains.includes(domain) && config.domains.find((d) => d.domain === domain).opts.pinned) {
        console.warn(`Domain ${domain} already pinned.`);
        break;
      }

      config.domains.push({
          domain,
          opts: {
            strict: false,
            override: false,
            pinned: true,
          }
        });

      await chrome.storage.local.set({ config });
      break;
    case "unpin_domain":
      config.domains = config.domains.filter((d) => d.domain !== domain || !d.opts.pinned);

      await chrome.storage.local.set({ config });
      break;
  }
});
