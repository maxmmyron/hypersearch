// injects new HTML content into each result element to facilitate
// domain settings

const observer = new MutationObserver((mutations)=>{
  console.log("mutations!");
  setTimeout(updateResults, 1000);
  // for (const mutation of mutations) {
  //   injectIntoResult([...mutation.addedNodes.values()].filter((node) => node.classList.contains("g")));
  // }
});

window.addEventListener("load", () => {

  setTimeout(updateResults, 1000);

  observer.observe(document.querySelector("#center_col"), {
    subtree: true,
    childList: true,
  });
});

const updateResults = () => {
  let results = Array.from(document.querySelectorAll(".g:not([data-hypersearch-opts]):not(:has(> [jsslot])):not(:has(.g))"));
  let videoResults = results.filter((result) => result.querySelector(".g > [jsslot]:not([data-hypersearch-opts])"));

  console.log("results", results);
  console.log("videoResults", videoResults);

  [...results, ...videoResults].forEach((result) => {
    const el = document.createElement("div");
    el.classList.add("hypersearch-opts");
    result.appendChild(el);
    result.setAttribute("data-hypersearch-opts", "true");
  });
};
