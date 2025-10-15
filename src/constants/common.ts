export const APP_TYPE = {
  CONFLUENCE: "confluence",
  JIRA: "jira",
} as const;

export const COMMAND_NAME = {
  CONFLUENCE_SEARCH_CONTENT: "confluence-search-content",
  CONFLUENCE_SEARCH_USER: "confluence-search-user",
  CONFLUENCE_SEARCH_SPACE: "confluence-search-space",
  JIRA_SEARCH_ISSUE: "jira-search-issue",
  JIRA_MANAGE_FIELD: "jira-manage-field",
} as const;

export const CONFLUENCE_API = {
  SEARCH: "/rest/api/search",
  SEARCH_CONTENT: "/rest/api/content/search",
  CONTENT_FAVOURITE: "/rest/experimental/relation/user/current/favourite/toContent/",
  CURRENT_USER: "/rest/api/user/current",
} as const;

export const JIRA_API = {
  SEARCH: "/rest/api/2/search",
  FIELD: "/rest/api/2/field",
  PROJECT: "/rest/api/2/project",
  CURRENT_USER: "/rest/api/2/myself",
} as const;
