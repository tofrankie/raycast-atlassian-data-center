import { jiraRequest, writeResponseFile } from "@/utils";
import { JIRA_API, COMMAND_NAME, SEARCH_PAGE_SIZE, JIRA_BASE_URL } from "@/constants";
import type { JiraSearchIssueResponse, JiraField, JiraProject } from "@/types";

type JiraSearchIssueParams = {
  jql: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
  validateQuery?: boolean;
};

export async function searchJiraIssue(params: JiraSearchIssueParams): Promise<JiraSearchIssueResponse> {
  const data = await jiraRequest<JiraSearchIssueResponse>("GET", JIRA_API.SEARCH, params);

  if (data) {
    writeResponseFile(JSON.stringify(data, null, 2), COMMAND_NAME.JIRA_SEARCH_ISSUE);
  }

  return data;
}

export async function getJiraField(): Promise<JiraField[]> {
  const data = await jiraRequest<JiraField[]>("GET", JIRA_API.FIELD);

  if (data) {
    writeResponseFile(JSON.stringify(data, null, 2), COMMAND_NAME.JIRA_MANAGE_FIELD);
  }

  return data || [];
}

export async function getJiraProject(): Promise<JiraProject[]> {
  const data = await jiraRequest<JiraProject[]>("GET", JIRA_API.PROJECT);

  if (data) {
    writeResponseFile(JSON.stringify(data, null, 2), "jira-project");
  }

  return data || [];
}

export function getJiraIssueUrl(issueKey: string): string {
  return `${JIRA_BASE_URL}/browse/${issueKey}`;
}
