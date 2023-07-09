import * as Effect from "@effect/io/Effect";
import { identity } from "@effect/data/Function";
import { getLatestSapCommunityPostsMarkdown } from "./sapCommunity";
import { getLatestYouTubePlaylistVideosMarkdown } from "./youtube";
import { getLatestBlogPostsMarkdown } from "./blog";
import * as Schema from "@effect/schema/Schema";

const ReadFileError_ = Schema.struct({ _tag: Schema.literal("ReadFileError") });
export interface ReadFileError extends Schema.To<typeof ReadFileError_> {}
export const ReadFileError: Schema.Schema<ReadFileError> =
  Schema.to(ReadFileError_);

const WriteFileError_ = Schema.struct({
  _tag: Schema.literal("WriteFileError"),
});
export interface WriteFileError extends Schema.To<typeof WriteFileError_> {}
export const WriteFileError: Schema.Schema<WriteFileError> =
  Schema.to(WriteFileError_);

const program = Effect.gen(function* (_) {
  const [
    template,
    latestBlogPostsMarkdown,
    latestSapCommunityPostsMarkdown,
    latestYouTubePlaylistVideosMarkdown,
  ] = yield* _(
    Effect.all(
      [
        Effect.tryPromise({
          try: () => Bun.file("./src/README.md.tpl").text(),
          catch: () => identity<ReadFileError>({ _tag: "ReadFileError" }),
        }),
        getLatestBlogPostsMarkdown(5),
        getLatestSapCommunityPostsMarkdown(5),
        getLatestYouTubePlaylistVideosMarkdown(5),
      ],
      {
        concurrency: "unbounded",
      },
    ),
  );

  const updatedReadme = yield* _(
    Effect.try(() =>
      template
        .replace("%{{latestBlogPosts}}%", latestBlogPostsMarkdown)
        .replace(
          "%{{latestSapCommunityPosts}}%",
          latestSapCommunityPostsMarkdown,
        )
        .replace("%{{latest_youtube}}%", latestYouTubePlaylistVideosMarkdown),
    ),
  );

  yield* _(
    Effect.tryPromise({
      try: () => Bun.write("README.md", updatedReadme),
      catch: () => identity<WriteFileError>({ _tag: "WriteFileError" }),
    }),
  );
});

Effect.runPromise(program);
