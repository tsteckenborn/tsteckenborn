import * as Schema from "@effect/schema/Schema";
import { identity } from "@effect/data/Function";
export const PaginationLinksSchema = Schema.struct({
  self: Schema.string,
});
export type PaginationLinks = Schema.From<typeof PaginationLinksSchema>;

export const ItemSchema = Schema.struct({
  creator: Schema.string,
  title: Schema.string,
  link: Schema.string,
  pubDate: Schema.string,
  "content:encoded": Schema.string,
  "content:encodedSnippet": Schema.string,
  "dc:creator": Schema.string,
  comments: Schema.string,
  content: Schema.string,
  contentSnippet: Schema.string,
  guid: Schema.string,
  categories: Schema.optional(
    Schema.union(Schema.array(Schema.string), Schema.null),
  ),
  isoDate: Schema.string,
});
export type Item = Schema.From<typeof ItemSchema>;

export const ImageSchema = Schema.struct({
  link: Schema.string,
  url: Schema.string,
  title: Schema.string,
  width: Schema.string,
  height: Schema.string,
});
export type Image = Schema.From<typeof ImageSchema>;

export const BlogRssSchema = Schema.struct({
  items: Schema.array(Schema.lazy(() => ItemSchema)),
  feedUrl: Schema.string,
  image: Schema.lazy(() => ImageSchema),
  paginationLinks: Schema.lazy(() => PaginationLinksSchema),
  title: Schema.string,
  description: Schema.string,
  link: Schema.string,
  language: Schema.string,
  lastBuildDate: Schema.string,
});
export type BlogRss = Schema.From<typeof BlogRssSchema>;

const GetBlogPostsError_ = Schema.struct({
  _tag: Schema.literal("GetBlogPostsError"),
});
export interface GetBlogPostsError
  extends Schema.To<typeof GetBlogPostsError_> {}
export const GetBlogPostsError: Schema.Schema<GetBlogPostsError> =
  Schema.to(GetBlogPostsError_);

import * as Effect from "@effect/io/Effect";

import Parser from "rss-parser";

export const getLatestBlogPostsMarkdown = (numberOfEntries: number) =>
  Effect.gen(function* (_) {
    const rssParser = yield* _(Effect.try(() => new Parser()));
    const latestBlogPosts = (yield* _(
      Schema.parse(BlogRssSchema)(
        yield* _(
          Effect.tryPromise({
            try: () => rssParser.parseURL("https://www.consolvis.de/en/feed/"),
            catch: () =>
              identity<GetBlogPostsError>({ _tag: "GetBlogPostsError" }),
          }),
        ),
        { errors: "all" },
      ),
    )).items;

    return latestBlogPosts
      .slice(0, numberOfEntries)
      .map(
        ({ title, link, isoDate }) =>
          `| **[${title}](${link})** | ${new Date(isoDate).toDateString()} |`,
      )
      .join("\n");
  });
