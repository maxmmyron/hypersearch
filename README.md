<p align="center">
  <picture>
    <source srcset="./docs/logo_dark.png" media="(prefers-color-scheme: dark)">
    <source srcset="./docs/logo_light.png" media="(prefers-color-scheme: light), (prefers-color-scheme: no-preference)">
    <img src="/docs/logo_light.png" alt="Hypersearch Logo" />
  </picture>
</p>

# Hypersearch

Hypersearch is a browser extension that provides powerful search result filtering.

## Current Features

### Domain Blacklisting

Remove all results that point to a specific domain. Especially useful to remove SEO spam.

## Feature Roadmap

These features are currently planned for future releases:

- [ ] domain editing UI: UI elements to add and edit hidden domains from the extension popup.
- [ ] domain pinning: pin certain results to the top of page. Useful for frequently visited sites that are not SEO optimized.
- [ ] streamlining: Removes irrelevant page content, including: knowledge graphs, featured snippets, "people also ask" sections, etc.
- [ ] Expanded search engine support: Hypersearch only supports Google search at the moment. Support for other search engines (Bing, etc.) is planned.

## How it works

Hypersearch is simple in design, yet powerful in execution. Hypersearch tracks changes to the DOM tree, and queries the DOM for relevant elements based on some heuristic rules (i.e. imperfect, but pretty good nonetheless).

The following heuristic selectors are used to identify search results:

| Result Element | Selector                                      |
| -------------- | --------------------------------------------- |
| Generic Result | `div.g:not(:has(.g))`                         |
| Video Result   | `div.g:not(:has(.g)) > [jsslot]`              |
| Twitter Result | `div.g:not(:has(.g)) > g-section-with-header` |

We likewise use the following heuristic selectors to identify different cards:

### Top Stories

- Selector: `div[jsdata][data-ved]:has(div[aria-level="2"][role=heading])`
- Parsing: `(div[aria-level="2"][role=heading]).innerHTML === "Top Stories"`

### Definition Card

- Selector: `div[data-corpus]:has(div[data-attrid="SenseDefinition"])`

### Releated Search Card

- Selector: `div[data-abe]`

### "People also ask" Card

- Selector: `div[jsaction][data-initq][data-miif]`

### Knowledge Card (?)

- Selector: `div[data-corpus]:has(div[data-attrid="title"])`

### People Card (?)

- Selector: `div:has(#center-col) > div:has(div[aria-label="Featured results"][role=complimentary])`
