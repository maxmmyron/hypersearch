# Hypersearch

power-user search

## Features

### Blacklisting

Remove all results that point to a specific domain. Especially useful to remove SEO spam.

### Pinning

Pin certain results to the top of page. Useful for frequently visited sites that are not SEO optimized.

### Streamlining

Removes irrelevant page content, including: knowledge graphs, featured snippets, "people also ask" sections, etc.

## How it works

Hypersearch is simple in design, yet powerful in execution. Hypersearch tracks changes to the DOM tree, and queries the DOM for relevant elements based on some heuristic rules (i.e. imperfect, but pretty good nonetheless).

The following heuristic selectors are used to identify search results:

| Result Element  | Selector                                                   |
| --------------- | ---------------------------------------------------------- |
| Generic Result  | `div.g:not(:has(.g))`                                      |
| Video Result    | `div.g:not(:has(.g)) > [jsslot]`                           |
| Twitter Result  | `div.g:not(:has(.g)) > g-section-with-header`              |
| Definition Card | `div[data-corpus]:has(div[data-attrid="SenseDefinition"])` |
