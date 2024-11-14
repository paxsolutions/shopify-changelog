const axios = require("axios");
const cheerio = require("cheerio");
const RSS = require("rss");

exports.handler = async (event) => {
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
      title: "Custom RSS Feed",
      description: "A custom RSS feed generated from a website",
      feed_url:
        "https://fjq6hqfqe72ctpotuo6awkoi5a0oelmj.lambda-url.us-east-1.on.aws",
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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/xml" },
      body: rssXML,
    };
  } catch (error) {
    console.error("Error scraping website or generating RSS feed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to scrape the website or generate the RSS feed.",
        error: error.message,
      }),
    };
  }
};
