import * as Schema from "@effect/schema/Schema";
import { pipe } from "@effect/data/Function";
import { identity } from "@effect/data/Function";

export const PageInfoSchema = Schema.struct({
  totalResults: Schema.number,
  resultsPerPage: Schema.number,
});
export type PageInfo = Schema.From<typeof PageInfoSchema>;

export const RelatedPlaylistsSchema = Schema.struct({
  likes: Schema.string,
  uploads: Schema.string,
});
export type RelatedPlaylists = Schema.From<typeof RelatedPlaylistsSchema>;

export const ContentDetailsSchema = Schema.struct({
  relatedPlaylists: Schema.lazy(() => RelatedPlaylistsSchema),
});
export type ContentDetails = Schema.From<typeof ContentDetailsSchema>;

export const ItemSchema = Schema.struct({
  kind: Schema.string,
  etag: Schema.string,
  id: Schema.string,
  contentDetails: Schema.lazy(() => ContentDetailsSchema),
});
export type Item = Schema.From<typeof ItemSchema>;

export const YoutubeChannelPlaylistSchema = Schema.struct({
  kind: Schema.string,
  etag: Schema.string,
  pageInfo: Schema.lazy(() => PageInfoSchema),
  items: Schema.array(Schema.lazy(() => ItemSchema)),
});
export type YoutubeChannelPlaylist = Schema.From<
  typeof YoutubeChannelPlaylistSchema
>;

export const DefaultSchema = Schema.struct({
  url: Schema.string,
  width: Schema.number,
  height: Schema.number,
});
export type Default = Schema.From<typeof DefaultSchema>;

export const ThumbnailsSchema = Schema.struct({
  default: Schema.lazy(() => DefaultSchema),
  medium: Schema.lazy(() => DefaultSchema),
  high: Schema.lazy(() => DefaultSchema),
  standard: Schema.lazy(() => DefaultSchema),
  maxres: Schema.lazy(() => DefaultSchema),
});
export type Thumbnails = Schema.From<typeof ThumbnailsSchema>;

export const ResourceIdSchema = Schema.struct({
  kind: Schema.string,
  videoId: Schema.string,
});
export type ResourceId = Schema.From<typeof ResourceIdSchema>;

export const SnippetSchema = Schema.struct({
  publishedAt: Schema.string,
  channelId: Schema.string,
  title: Schema.string,
  description: Schema.string,
  thumbnails: Schema.lazy(() => ThumbnailsSchema),
  channelTitle: Schema.string,
  playlistId: Schema.string,
  position: Schema.number,
  resourceId: Schema.lazy(() => ResourceIdSchema),
  videoOwnerChannelTitle: Schema.string,
  videoOwnerChannelId: Schema.string,
});
export type Snippet = Schema.From<typeof SnippetSchema>;

export const YoutubePlaylistItemElementSchema = Schema.struct({
  kind: Schema.string,
  etag: Schema.string,
  nextPageToken: Schema.string,
  items: Schema.array(Schema.lazy(() => PlaylistItemSchema)),
  pageInfo: Schema.lazy(() => PageInfoSchema),
});
export type YoutubePlaylistItemElement = Schema.From<
  typeof YoutubePlaylistItemElementSchema
>;

import * as Effect from "@effect/io/Effect";

import * as Config from "@effect/io/Config";
export const PlaylistItemSchema = Schema.struct({
  kind: Schema.string,
  etag: Schema.string,
  id: Schema.string,
  snippet: Schema.lazy(() => SnippetSchema),
});

const GetYouTubeVideosError_ = Schema.struct({
  _tag: Schema.literal("GetYouTubeVideosError"),
});

const YouTubeChannelError_ = Schema.struct({
  _tag: Schema.literal("YouTubeChannelError"),
});
export interface YouTubeChannelError
  extends Schema.To<typeof YouTubeChannelError_> {}
export const YouTubeChannelError: Schema.Schema<YouTubeChannelError> =
  Schema.to(YouTubeChannelError_);

const YouTubePlaylistItemsError_ = Schema.struct({
  _tag: Schema.literal("YouTubePlaylistItemsError"),
});
export interface YouTubePlaylistItemsError
  extends Schema.To<typeof YouTubePlaylistItemsError_> {}
export const YouTubePlaylistItemsError: Schema.Schema<YouTubePlaylistItemsError> =
  Schema.to(YouTubePlaylistItemsError_);

export const getLatestYouTubePlaylistVideosMarkdown = (
  numberOfEntries: number,
) =>
  Effect.gen(function* (_) {
    const YOUTUBE_API_KEY = yield* _(
      Effect.config(Config.string("YOUTUBE_API_KEY")),
    );

    const channel = yield* _(
      Schema.parse(YoutubeChannelPlaylistSchema)(
        yield* _(
          Effect.tryPromise({
            try: () =>
              fetch(
                `https://www.googleapis.com/youtube/v3/channels?id=UCBBAshw8YGzhF54lbNrmtUQ&key=${YOUTUBE_API_KEY}&part=contentDetails`,
              ).then((response) => response.json()),

            catch: () =>
              identity<YouTubeChannelError>({ _tag: "YouTubeChannelError" }),
          }),
        ),
        { errors: "all" },
      ),
    );

    const playlist = yield* _(
      Effect.forEach(
        channel.items,
        (item) =>
          pipe(
            Effect.tryPromise({
              try: () =>
                fetch(
                  `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${item.contentDetails.relatedPlaylists.uploads}&key=${YOUTUBE_API_KEY}`,
                ).then((response) => response.json()),
              catch: () =>
                identity<YouTubePlaylistItemsError>({
                  _tag: "YouTubePlaylistItemsError",
                }),
            }),
            Effect.flatMap((response) =>
              Schema.parse(YoutubePlaylistItemElementSchema)(response, {
                errors: "all",
              }),
            ),
          ),
        { concurrency: "unbounded" },
      ),
    );

    const playlistItems = playlist.flat().flatMap((items) => items.items);

    return playlistItems
      .map(({ snippet }) => {
        const { title, resourceId } = snippet;
        const { videoId } = resourceId;
        return `
<a href='https://youtu.be/${videoId}' target='_blank'>
<img width='30%' src='https://img.youtube.com/vi/${videoId}/mqdefault.jpg' alt='${title}' />
</a>`;
      })
      .join("");
  });
