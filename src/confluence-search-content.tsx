import { ActionPanel, Action, Icon, List, Image } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useMemo, useCallback } from "react";
import { QueryProvider } from "./query-client";
import {
  useAvatar,
  useConfluenceSearchContent,
  useConfluenceUrls,
  useToggleFavorite,
  useConfluenceConfig,
} from "./hooks";
import {
  getContentIcon,
  writeToSupportPathFile,
  buildSearchQuery,
  processSpecialFilters,
  optimizeCQLQuery,
} from "./utils";
import { AVATAR_TYPES, CONFLUENCE_CONTENT_TYPE } from "./constants";
import { SearchFilters } from "./components/search-filters";
import { CQLWrapper } from "./components/cql-wrapper";
import { useSearchFilters } from "./hooks/use-search-filters";
import type { ConfluenceContentType, ConfluenceSearchContentResult } from "./types";

export default function ConfluenceSearchContent() {
  return (
    <QueryProvider>
      <SearchContent />
    </QueryProvider>
  );
}

function SearchContent() {
  const [searchText, setSearchText] = useState("");
  const { filters, setFilters } = useSearchFilters();
  const { getContentUrl, getAuthorAvatarUrl, getContentEditUrl } = useConfluenceUrls();
  const toggleFavorite = useToggleFavorite();
  const { searchPageSize } = useConfluenceConfig();

  // 分页状态管理
  const [currentPage, setCurrentPage] = useState(0);
  const [, setAllResults] = useState<ConfluenceSearchContentResult[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // 使用分页查询
  const { data, fetchNextPage, isFetchingNextPage, isLoading, error, isError } = useConfluenceSearchContent(
    searchText,
    filters,
    searchPageSize,
  );

  // 展平所有页面的结果
  const results = useMemo(() => data?.pages.flatMap((page) => page.results) ?? [], [data]);

  // 重置分页状态当搜索条件改变时
  useEffect(() => {
    setCurrentPage(0);
    setAllResults([]);
    setHasMore(true);
  }, [searchText, filters]);

  // 更新分页状态和数据
  useEffect(() => {
    if (data?.pages) {
      const latestPage = data.pages[data.pages.length - 1];
      if (latestPage) {
        // 更新 hasMore 状态
        const hasNextLink = !!latestPage._links?.next;
        const hasMoreBySize = latestPage.size === searchPageSize;
        setHasMore(hasNextLink || hasMoreBySize);

        // 更新所有结果
        const newResults = data.pages.flatMap((page) => page.results);
        setAllResults(newResults);
      }
    }
  }, [data, searchPageSize]);

  // 生成当前的 CQL 查询
  const currentCQL = useMemo(() => {
    if (!searchText || searchText.length < 2) {
      return "";
    }

    let cqlQuery = buildSearchQuery(searchText, filters);
    cqlQuery = processSpecialFilters(cqlQuery, filters);
    cqlQuery = optimizeCQLQuery(cqlQuery);

    return cqlQuery;
  }, [searchText, filters]);

  const avatarList = useMemo(() => {
    return results
      .map((item) => ({
        url: getAuthorAvatarUrl(item.history.createdBy.profilePicture.path) || "",
        filename: item.history.createdBy.userKey,
      }))
      .filter((avatar) => avatar.url);
  }, [results]);

  const avatarDir = useAvatar(avatarList, AVATAR_TYPES.CONFLUENCE);

  useEffect(() => {
    if (isError && error) {
      showFailureToast(error, { title: "Search Failed" });
    }
  }, [isError, error]);

  useEffect(() => {
    if (toggleFavorite.isError && toggleFavorite.error) {
      showFailureToast(toggleFavorite.error, { title: "Failed to Update Favorite Status" });
    }
  }, [toggleFavorite.isError, toggleFavorite.error]);

  // Raycast 分页处理函数
  const handleLoadMore = useCallback(() => {
    console.log("🔄 handleLoadMore called", { hasMore, isFetchingNextPage, currentPage });
    if (hasMore && !isFetchingNextPage) {
      console.log("📄 Fetching next page...");
      fetchNextPage();
    }
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  // TODO: 调试
  useEffect(() => {
    if (results.length > 0) {
      writeToSupportPathFile(JSON.stringify(results[0], null, 2), "temp.json");
    }
  }, [results]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Content..."
      searchBarAccessory={<SearchFilters filters={filters} onFiltersChange={setFilters} />}
      pagination={{
        onLoadMore: handleLoadMore,
        hasMore: hasMore,
        pageSize: searchPageSize,
      }}
      throttle
    >
      <CQLWrapper query={searchText}>
        {results.length === 0 && !isLoading && searchText.length >= 2 ? (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No results"
            description="Try adjusting your search filters or check your CQL syntax"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="Open CQL Documentation"
                  url="https://developer.atlassian.com/server/confluence/rest/v1010/intro/#advanced-searching-using-cql"
                />
                {currentCQL && (
                  <Action.CopyToClipboard
                    title="Copy CQL Query"
                    content={currentCQL}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ) : (
          results.map((item) => {
            const icon = getContentIcon(item.type as ConfluenceContentType);
            const contentUrl = getContentUrl(item) || "";
            const editUrl = getContentEditUrl(item) || "";
            const creator = item.history.createdBy.displayName;
            const updater = item.history.lastUpdated.by.displayName;
            const updatedAt = new Date(item.history.lastUpdated.when);
            const createdAt = new Date(item.history.createdDate);

            const isSingleVersion = item.history.lastUpdated?.when === item.history.createdDate;
            const isFavourited = item.metadata.currentuser.favourited?.isFavourite ?? false;
            const favouritedAt = item.metadata.currentuser.favourited?.favouritedDate
              ? new Date(item.metadata.currentuser.favourited.favouritedDate).toISOString()
              : null;

            const creatorAvatar = avatarDir
              ? `${avatarDir}/${item.history.createdBy.userKey}.png`
              : getAuthorAvatarUrl(item.history.createdBy.profilePicture.path);

            const accessories = [
              ...(isFavourited
                ? [
                    {
                      icon: Icon.Star,
                      tooltip: `Favourited at ${favouritedAt ? new Date(favouritedAt).toLocaleString() : ""}`,
                    },
                  ]
                : []),
              {
                date: updatedAt,
                tooltip: isSingleVersion
                  ? `Created at ${createdAt.toLocaleString()} by ${creator}`
                  : `Created at ${createdAt.toLocaleString()} by ${creator}\nUpdated at ${updatedAt.toLocaleString()} by ${updater}`,
              },
              ...(creatorAvatar
                ? [
                    {
                      icon: { source: creatorAvatar, mask: Image.Mask.Circle },
                      tooltip: `Created by ${creator}`,
                    },
                  ]
                : []),
            ];

            return (
              <List.Item
                key={item.id}
                icon={icon}
                title={item.title}
                subtitle={{ value: item.space.name, tooltip: `Space: ${item.space.name}` }}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Browser" url={contentUrl} />
                    <Action.CopyToClipboard title="Copy Link" content={contentUrl} />
                    {item.type !== CONFLUENCE_CONTENT_TYPE.ATTACHMENT && (
                      <Action.OpenInBrowser icon={Icon.Pencil} title="Edit in Browser" url={editUrl} />
                    )}
                    {currentCQL && (
                      <Action.CopyToClipboard
                        icon={Icon.Code}
                        title="Copy CQL Query"
                        content={currentCQL}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    )}
                    <Action
                      icon={isFavourited ? Icon.StarDisabled : Icon.Star}
                      title={isFavourited ? "Remove from Favorites" : "Add to Favorites"}
                      onAction={() => toggleFavorite.mutate({ contentId: item.id, isFavorited: isFavourited })}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </CQLWrapper>
    </List>
  );
}
