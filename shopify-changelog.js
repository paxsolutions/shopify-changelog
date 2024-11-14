import fs from "fs/promises";
import axios from "axios";
import * as cheerio from "cheerio";
import RSS from "rss";

const scrapeAndGenerateRSS = async () => {
  try {
    const url = "https://shopify.dev/changelog";
    const response = await axios.get(url);
    const html = response.data;

    const $ = cheerio.load(html);
    const feedItems = [];

    $(".post-block__inner").each((i, element) => {
      const date = $(element)
        .find(".post-block__date .heading--5")
        .text()
        .trim();
      const heading = $(element).find(".block__heading a").text().trim();
      const link = $(element).find(".block__heading a").attr("href");
      const content = $(element)
        .find(".block__content.post__content p")
        .text()
        .trim();
      const feature = $(element).find(".status-tag").text().trim();
      const category = $(element).find(".text-minor").text().trim();

      feedItems.push({
        date,
        heading,
        link,
        content,
        feature,
        category,
      });
    });

    const feed = new RSS({
      title: "Shopify Changelog",
      description: "Custom RSS feed generated from the Shopify Changelog",
      feed_url: "",
      site_url: url,
      language: "en",
    });

    feedItems.forEach((item) => {
      feed.item({
        title: item.heading,
        description: `${item.content} <br><br> <strong>Feature:</strong> ${item.feature} <br> <strong>Category:</strong> ${item.category}`,
        url: item.link.startsWith("http") ? item.link : `${url}${item.link}`,
        date: new Date(item.date),
      });
    });

    const rssXML = feed.xml({ indent: true });
    console.log(rssXML);

    await fs.writeFile("rss.xml", rssXML);
  } catch (error) {
    console.error("Error scraping website or generating RSS feed:", error);
  }
};

scrapeAndGenerateRSS();
