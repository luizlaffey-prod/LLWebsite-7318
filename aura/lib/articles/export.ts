import type { ArticleBlock } from '@/lib/db/schema';

export interface ExportableArticle {
  title: string;
  lede: string | null;
  body: ArticleBlock[];
  imageUrl: string | null;
  imageCredit: string | null;
  sourceName: string | null;
  sourceArticleUrl: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders an article to a self-contained HTML fragment suitable for
 * pasting into a CMS or wrapping in a page. Includes the lead image
 * (with a visible credit line) and the source attribution.
 */
export function articleToHtml(a: ExportableArticle): string {
  const parts: string[] = [];
  parts.push(`<h1>${escapeHtml(a.title)}</h1>`);
  if (a.lede) parts.push(`<p class="lede"><strong>${escapeHtml(a.lede)}</strong></p>`);
  if (a.imageUrl) {
    const credit = a.imageCredit
      ? `<figcaption>${escapeHtml(a.imageCredit)}</figcaption>`
      : '';
    parts.push(
      `<figure><img src="${escapeHtml(a.imageUrl)}" alt="${escapeHtml(a.title)}" />${credit}</figure>`
    );
  }
  for (const block of a.body) {
    if (block.type === 'heading') {
      parts.push(`<h2>${escapeHtml(block.text)}</h2>`);
    } else {
      parts.push(`<p>${escapeHtml(block.text)}</p>`);
    }
  }
  if (a.sourceName) {
    const link = a.sourceArticleUrl
      ? `<a href="${escapeHtml(a.sourceArticleUrl)}">${escapeHtml(a.sourceName)}</a>`
      : escapeHtml(a.sourceName);
    parts.push(`<p class="source"><em>Source: ${link}</em></p>`);
  }
  return parts.join('\n');
}

/** Renders an article to Markdown. */
export function articleToMarkdown(a: ExportableArticle): string {
  const parts: string[] = [];
  parts.push(`# ${a.title}`);
  if (a.lede) parts.push(`**${a.lede}**`);
  if (a.imageUrl) {
    parts.push(`![${a.title}](${a.imageUrl})`);
    if (a.imageCredit) parts.push(`*${a.imageCredit}*`);
  }
  for (const block of a.body) {
    parts.push(block.type === 'heading' ? `## ${block.text}` : block.text);
  }
  if (a.sourceName) {
    const src = a.sourceArticleUrl
      ? `[${a.sourceName}](${a.sourceArticleUrl})`
      : a.sourceName;
    parts.push(`*Source: ${src}*`);
  }
  return parts.join('\n\n');
}
