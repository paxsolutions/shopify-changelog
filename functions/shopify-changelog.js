const axios = require("axios");
const cheerio = require("cheerio");
const RSS = require("rss");

const formatPubDate = (date) => {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayName = dayNames[date.getUTCDay()];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const monthName = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${dayName}, ${day} ${monthName} ${year} ${hours}:${minutes}:${seconds} +0000`;
};

const scrapeAndGenerateRSS = async () => {
  try {
    const url = "https://changelog.shopify.com";
    const response = await axios.get(url);
    const html = response.data;

    const $ = cheerio.load(html);
    const feedItems = [];

    $(".block.post-block.gutter-bottom--reset.changelog-post").each(
      (i, element) => {
        const dateText = $(element)
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

        const absoluteLink = link.startsWith("http")
          ? link
          : `https://changelog.shopify.com${link}`;

        const rawDate = new Date(`${dateText} ${new Date().getFullYear()}`);
        const pubDate = formatPubDate(rawDate);

        feedItems.push({
          title: heading,
          description: content,
          link: absoluteLink,
          pubDate: pubDate,
          categories: [feature, category].filter(Boolean),
        });
      }
    );

    const feed = new RSS({
      title: "Changelog",
      description: "What’s New at Shopify?",
      feed_url:
        "https://fjq6hqfqe72ctpotuo6awkoi5a0oelmj.lambda-url.us-east-1.on.aws",
      site_url: "https://changelog.shopify.com",
      language: "en-us",
      ttl: 40,
      pubDate: new Date().toUTCString(),
      lastBuildDate: new Date().toUTCString(),
      category: "Changelog",
    });

    feedItems.forEach((item) => {
      feed.item({
        title: item.title,
        description: `${item.description}`,
        url: item.link,
        date: item.pubDate,
        categories: item.categories,
      });
    });

    const rssXML = feed.xml({ indent: true });
    console.log(rssXML);

    return rssXML;
  } catch (error) {
    console.error("Error scraping website or generating RSS feed:", error);
    throw error;
  }
};

scrapeAndGenerateRSS();
