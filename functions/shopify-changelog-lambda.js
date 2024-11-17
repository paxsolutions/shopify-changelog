const axios = require("axios");
const cheerio = require("cheerio");
const RSS = require("rss");
const selectors = require("./helpers/selectors.json");

const wrapper_selector = selectors.wrapper;
const date_selector = selectors.date;
const header_and_link_selector = selectors.header_and_link;
const content_selector = selectors.content;
const status_label_selector = selectors.status_label;
const category_label_selector = selectors.category_label;
const feedUrl = "https://changelog.shopify.com";

// Define the day and month names for formatting the date
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatPubDate = (date) => {
  // Re-format the date to match the RFC 822 date-time format
  const dayName = dayNames[date.getUTCDay()];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const monthName = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${dayName}, ${day} ${monthName} ${year} ${hours}:${minutes}:${seconds} +0000`;
};

let lastProcessedDate = new Date();

const inferYear = (month, day) => {
  // Infer the year of the entry based on the last processed date
  const currentYear = lastProcessedDate.getUTCFullYear();
  const entryMonth = monthNames.indexOf(month);
  const entryDate = new Date(Date.UTC(currentYear, entryMonth, day));

  if (entryDate > lastProcessedDate) {
    entryDate.setUTCFullYear(currentYear - 1);
  }

  lastProcessedDate = entryDate;
  return entryDate;
};

exports.handler = async (event) => {
  try {
    const url = feedUrl;
    const response = await axios.get(url);
    const html = response.data;

    const $ = cheerio.load(html);
    const feedItems = [];

    // Scrape the changelog.shopify.com for posts
    $(wrapper_selector).each((i, element) => {
      // Extract the month and day from the date text
      const dateText = $(element).find(date_selector).text().trim();
      const [monthName, day] = dateText.split(" ");
      const inferredDate = inferYear(monthName, parseInt(day, 10));
      const pubDate = formatPubDate(inferredDate);

      // Extract the heading, link, content, feature, and category from the post
      const heading = $(element).find(header_and_link_selector).text().trim();
      const link = $(element).find(header_and_link_selector).attr("href");
      const content = $(element).find(content_selector).text().trim();

      const feature = $(element).find(status_label_selector).text().trim();
      const category = $(element).find(category_label_selector).text().trim();

      const absoluteLink = link.startsWith("http")
        ? link
        : `https://changelog.shopify.com${link}`;

      // Add the post to the RSS feed items
      feedItems.push({
        title: heading,
        description: content,
        link: absoluteLink,
        pubDate: pubDate,
        categories: [feature, category].filter(Boolean),
      });
    });

    // Generate an RSS feed from the scraped posts
    const feed = new RSS({
      title: "Shopify Changelog",
      description: "What’s New at Shopify?",
      feed_url: feedUrl,
      site_url: feedUrl,
      language: "en-us",
      ttl: 40,
      pubDate: new Date().toUTCString(),
      lastBuildDate: new Date().toUTCString(),
      category: "Changelog",
    });

    // Add each post as an item in the RSS feed
    feedItems.forEach((item) => {
      feed.item({
        title: item.title,
        description: `${item.description}`,
        url: item.link,
        date: item.pubDate,
        categories: item.categories,
      });
    });

    // Generate the XML for the RSS feed
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
