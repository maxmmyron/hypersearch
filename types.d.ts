type DomainConfig = {
  domain: string;
  opts: {
    /**
     * whether the domain should match exactly. For example, if this is checked,
     * "example.com" will not match "sub.example.com".
     */
    strict: boolean;
    /**
     * whether the domain is pinned to the top of the search results. If this is
     * checked, the domain will not be removed.
     */
    pinned: boolean;
    /**
     * whether this domain and its settings should override the settings of
     * other domains. For example, if sub.example.com has override and pinned
     * checked, it will override the settings described in example.com and will
     * not be removed.
     */
    override: boolean;
  };
}

type StreamliningConfig = {
  shopping: boolean;
  graph: boolean;
  snippets: boolean;
  questions: boolean;
  related: boolean;
  images: boolean;
  videos: boolean;
  definitions: boolean;
}

type PopupConfig = {
  domains: DomainConfig[];
  opts: {
    debug: boolean;
    streamlining: StreamliningConfig;
  }
}
