import { promises as fs } from "fs";
import fetch from "node-fetch";
import Parser from "rss-parser";

import { PLACEHOLDERS, NUMBER_OF } from "./constants.js";

const parser = new Parser();

const { YOUTUBE_API_KEY } = process.env;

const getLatestArticlesFromBlog = () =>
  parser.parseURL("https://www.consolvis.de/en/feed/").then((data) => data.items);

const getLatestYoutubeVideos = () => fetch(
  `https://www.googleapis.com/youtube/v3/channels?id=UCBBAshw8YGzhF54lbNrmtUQ&key=${YOUTUBE_API_KEY}&part=contentDetails`
)
  .then((res) => res.json())
  .then((jsonData) => {
    return Promise.all(
      jsonData.items.map((channel) => {


        return fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${channel.contentDetails.relatedPlaylists.uploads}&key=${YOUTUBE_API_KEY}`).then(res => res.json());
      })
  );
})
.then(jsonData => {
  return jsonData.reduce((result, data) => {
    if (data) {
      data.items.forEach(items => {
        result.push(items);
      });
    }
    return result;
  }, []);
});

const generateYoutubeHTML = ({ title, videoId }) => `
<a href='https://youtu.be/${videoId}' target='_blank'>
  <img width='30%' src='https://img.youtube.com/vi/${videoId}/mqdefault.jpg' alt='${title}' />
</a>`;

(async () => {
  const [template, articles, videos] = await Promise.all([
    fs.readFile("./src/README.md.tpl", { encoding: "utf-8" }),
    getLatestArticlesFromBlog(),
    getLatestYoutubeVideos(),
  ]);

  // create latest articles markdown
  const latestArticlesMarkdown = articles
    .slice(0, NUMBER_OF.ARTICLES)
    .map(({ title, link }) => `- [${title}](${link})`)
    .join("\n");

  // create latest youtube videos channel
  const latestYoutubeVideos = videos
    .map(({ snippet }) => {
      const { title, resourceId } = snippet;
      const { videoId } = resourceId;
      return generateYoutubeHTML({ videoId, title });
    })
    .join("");

  // replace all placeholders with info
  const newMarkdown = template
    .replace(PLACEHOLDERS.LATEST_ARTICLES, latestArticlesMarkdown)
    .replace(PLACEHOLDERS.LATEST_YOUTUBE, latestYoutubeVideos);

  await fs.writeFile("README.md", newMarkdown);
})();
