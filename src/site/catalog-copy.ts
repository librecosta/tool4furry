export const catalogCopy = {
  zh: {
    all: '全部工具', roles: '创作身份', categories: '功能分类', filters: '分类与筛选', close: '关闭筛选',
    search: '搜索工具', placeholder: '搜索名称、功能或格式', clearSearch: '清空搜索', searchAll: '搜索全部工具', clear: '清除全部',
    selected: '当前筛选', results: '工具结果', noCategories: '分类随可用工具开放。', draft: '未发布 · DEV',
    drafts: '当前仅有未发布工具，仅供本地开发预览。', noMatch: '没有匹配的工具', noMatchDetail: '试试其他关键词，或清除筛选条件。',
    noJS: '搜索与筛选需要 JavaScript。下方显示本地区全部可用工具，可直接打开。',
    pagination: '结果分页', previous: '上一页', next: '下一页', jump: '跳转页码', go: '跳转',
    page: '第 {page} 页', count: '{count} 个工具', countOne: '1 个工具', range: '{start}–{end} / {total} 个工具', jumpError: '请输入 1–{total} 的整数页码。',
    expand: '展开 {name}', collapse: '收起 {name}', remove: '移除 {name}', keyword: '关键词：{name}',
  },
  en: {
    all: 'All tools', roles: 'Creative roles', categories: 'Categories', filters: 'Categories & filters', close: 'Close filters',
    search: 'Search tools', placeholder: 'Search names, features or formats', clearSearch: 'Clear search', searchAll: 'Search all tools', clear: 'Clear all',
    selected: 'Active filters', results: 'Tool results', noCategories: 'Categories appear as tools become available.', draft: 'Unpublished · DEV',
    drafts: 'Only unpublished tools are available, for local development preview.', noMatch: 'No matching tools', noMatchDetail: 'Try another keyword or clear your filters.',
    noJS: 'Search and filters require JavaScript. All available tools for this region are shown below and can be opened directly.',
    pagination: 'Result pages', previous: 'Previous', next: 'Next', jump: 'Go to page', go: 'Go',
    page: 'Page {page}', count: '{count} tools', countOne: '1 tool', range: '{start}–{end} of {total} tools', jumpError: 'Enter a whole page number from 1 to {total}.',
    expand: 'Expand {name}', collapse: 'Collapse {name}', remove: 'Remove {name}', keyword: 'Keyword: {name}',
  },
} as const;
