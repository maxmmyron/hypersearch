// injects new HTML content into each result element to facilitate
// domain settings

const observer = new MutationObserver((mutations)=> updateResults());

window.addEventListener("load", () => {
  // attempt to determine if the current theme is light or dark. Search doesn't seem to use
  // prefers-color-scheme, so we have to parse a certain iframe's styles to determine the theme
  const darkThemeSpan = [...document.querySelectorAll("#appbar a span")].find((span) => span.innerText === "Dark theme");
  if (darkThemeSpan) {
    // get next sibling
    if(darkThemeSpan.nextSibling.innerText === "On") {
      document.documentElement.style.setProperty("--hypersearch-border-color", "#3c4043");
    } else {
      document.documentElement.style.setProperty("--hypersearch-border-color", "#dadce0");
    }
  }

  updateResults();

  observer.observe(document.querySelector("#center_col"), {
    subtree: true,
    childList: true,
  });
});

const updateResults = () => {
  // find those elements with:
  // - class "g"
  // - no data-hypersearch-opts attribute
  // - no child elements with class "g" (i.e. find the leaf .g nodes)
  const results = Array.from(document.querySelectorAll(".g:not([data-hypersearch-opts]):not(:has(.g))")).map((result) => {
    if (result.querySelector(":scope > [jsslot]")) {
      // if the result element has a direct child with the jsslot attribute, it's a video
      return {
        type: "video",
        result,
        optContainer: result.querySelector(":scope > [jsslot]"),
        href: result.querySelector("a").href,
      }
    } else if (result.querySelector(":scope > g-section-with-header")) {
      // if the result element has a direct child with the g-section-with-header tag, it's a twitter result
      return {
        type: "twitter",
        result,
        optContainer: result.querySelector(":scope > g-section-with-header > div:first-of-type"),
        href: result.querySelector("a").href,
      }
    } else {
      // otherwise, it's a default search result
      return {
        type: "default",
        result,
        optContainer: result,
        href: result.querySelector("a").href,
      }
    }
  });

  results.forEach(({type, result, optContainer, href}) => {
    result.setAttribute("data-hypersearch-opts", "true");

    const hideButton = document.createElement("button");
    hideButton.classList.add("hypersearch-opt");
    hideButton.setAttribute("data-hypersearch-action", "hide");
    hideButton.innerText = "❌";
    hideButton.addEventListener("click", () => {
      addHiddenDomain(href);
    });

    const pinButton = document.createElement("button");
    pinButton.classList.add("hypersearch-opt");
    pinButton.setAttribute("data-hypersearch-action", "pin");
    pinButton.innerText = "📌";
    pinButton.addEventListener("click", () => {
      addPinnedDomain(href);
    });

    const el = document.createElement("div");
    el.classList.add("hypersearch-opts");
    el.appendChild(hideButton);
    el.appendChild(pinButton);

    optContainer.appendChild(el);
    optContainer.classList.add("hypersearch-result");
  });
};


const addHiddenDomain = (href) => {
  console.log("addHiddenDomain", href);
};

const addPinnedDomain = (href) => {
  console.log("addPinnedDomain", href);
};
