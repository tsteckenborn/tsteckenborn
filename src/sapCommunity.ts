import * as Schema from "@effect/schema/Schema";
import * as cheerio from "cheerio";
import * as Effect from "@effect/io/Effect";
import { identity } from "@effect/data/Function";
export const ObjectTypeSchema = Schema.enums({
  blogpost: "blogpost",
  primaryTag: "primaryTag",
  secondaryTag: "secondaryTag",
});
export type ObjectType = Schema.From<typeof ObjectTypeSchema>;

export const PageSchema = Schema.struct({
  size: Schema.number,
  number: Schema.number,
  totalPages: Schema.number,
  totalElements: Schema.number,
  maxElements: Schema.number,
  took: Schema.number,
});
export type Page = Schema.From<typeof PageSchema>;

export const FirstSchema = Schema.struct({
  href: Schema.string,
});
export type First = Schema.From<typeof FirstSchema>;

export const LinksSchema = Schema.struct({
  self: Schema.lazy(() => FirstSchema),
  first: Schema.lazy(() => FirstSchema),
  last: Schema.lazy(() => FirstSchema),
});
export type Links = Schema.From<typeof LinksSchema>;

export const TagSchema = Schema.struct({
  id: Schema.string,
  count: Schema.number,
  displayName: Schema.string,
});
export type Tag = Schema.From<typeof TagSchema>;

export const RootSchema = Schema.struct({
  id: Schema.string,
  objectType: Schema.lazy(() => ObjectTypeSchema),
  url: Schema.string,
  displayName: Schema.optional(Schema.union(Schema.null, Schema.string)),
});
export type Root = Schema.From<typeof RootSchema>;

export const AuthorSchema = Schema.struct({
  userName: Schema.string,
  displayName: Schema.string,
});
export type Author = Schema.From<typeof AuthorSchema>;

export const ContentSchema = Schema.struct({
  id: Schema.string,
  author: Schema.lazy(() => AuthorSchema),
  comments: Schema.number,
  content: Schema.string,
  created: Schema.string,
  displayName: Schema.string,
  engaged: Schema.number,
  likes: Schema.number,
  moderated: Schema.boolean,
  modified: Schema.string,
  objectType: Schema.lazy(() => ObjectTypeSchema),
  prettyUrl: Schema.string,
  root: Schema.lazy(() => RootSchema),
  serverTimestamp: Schema.string,
  source: Schema.string,
  status: Schema.string,
  target: Schema.lazy(() => RootSchema),
  updated: Schema.string,
  url: Schema.string,
  primaryTag: Schema.string,
  tags: Schema.array(Schema.lazy(() => RootSchema)),
  accepted: Schema.boolean,
  published: Schema.string,
});
export type Content = Schema.From<typeof ContentSchema>;

export const EmbeddedSchema = Schema.struct({
  contents: Schema.array(Schema.lazy(() => ContentSchema)),
  tags: Schema.array(Schema.lazy(() => TagSchema)),
});
export type Embedded = Schema.From<typeof EmbeddedSchema>;

export const SapCommunitySchema = Schema.struct({
  _embedded: Schema.lazy(() => EmbeddedSchema),
  page: Schema.lazy(() => PageSchema),
  _links: Schema.lazy(() => LinksSchema),
});
export type SapCommunity = Schema.From<typeof SapCommunitySchema>;

const GetSapCommunityPostsError_ = Schema.struct({
  _tag: Schema.literal("GetSapCommunityPostsError"),
});
export interface GetSapCommunityPostsError
  extends Schema.To<typeof GetSapCommunityPostsError_> {}
export const GetSapCommunityPostsError: Schema.Schema<GetSapCommunityPostsError> =
  Schema.to(GetSapCommunityPostsError_);

const GetSapCommunityPostViewCountError_ = Schema.struct({
  _tag: Schema.literal("GetSapCommunityPostViewCountError"),
});
export interface GetSapCommunityPostViewCountError
  extends Schema.To<typeof GetSapCommunityPostViewCountError_> {}
export const GetSapCommunityPostViewCountError: Schema.Schema<GetSapCommunityPostViewCountError> =
  Schema.to(GetSapCommunityPostViewCountError_);

export const getLatestSapCommunityPostsMarkdown = (numberOfEntries: number) =>
  Effect.gen(function* (_) {
    const sapCommunityBlogPostSearchResults = yield* _(
      Schema.parse(SapCommunitySchema)(
        yield* _(
          Effect.tryPromise({
            try: () =>
              fetch(
                `https://content.services.sap.com/cse/search/user?name=tobias_steckenborn&types=blogpost&sort=published:desc&size=${numberOfEntries}&page=0`,
              ).then((response) => response.json()),
            catch: () =>
              identity<GetSapCommunityPostsError>({
                _tag: "GetSapCommunityPostsError",
              }),
          }),
        ),
        { errors: "all" },
      ),
    );

    const sapCommunityBlogPostWithExtractedViewCount = yield* _(
      Effect.forEach(
        sapCommunityBlogPostSearchResults._embedded.contents,
        (item) =>
          Effect.tryPromise({
            try: async () => {
              const htmlString = await (await fetch(item.prettyUrl)).text();
              const $ = cheerio.load(htmlString);

              const views = $(".ds-social-stats >span:last-child");

              const viewCount = (views ? views.last().text() : "0").trim();

              return {
                title: item.displayName,
                date: new Date(item.published).toDateString(),
                likes: item.likes,
                comments: item.comments,
                prettyUrl: item.prettyUrl,
                views: viewCount,
              };
            },
            catch: () =>
              identity<GetSapCommunityPostViewCountError>({
                _tag: "GetSapCommunityPostViewCountError",
              }),
          }),
        { concurrency: "unbounded" },
      ),
    );

    return sapCommunityBlogPostWithExtractedViewCount
      .map(
        ({ title, prettyUrl, date, likes, comments, views }) =>
          `| **[${title}](${prettyUrl})** | ${date} | 👍 ${likes} ・ 💬 ${comments} ・ 👁️ ${views} |`,
      )
      .join("\n");
  });
