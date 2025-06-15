const { DateTime } = require("luxon");
const CleanCSS = require("clean-css");
const { minify } = require("terser");
const htmlmin = require("html-minifier-terser");
const yaml = require("js-yaml");
const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const Image = require("@11ty/eleventy-img");
const path = require("path");

module.exports = function(eleventyConfig) {

  // https://www.11ty.dev/docs/plugins/image/
  eleventyConfig.addShortcode("generateImage", async function(src, alt, sizes) {
    // Handle relative paths
    if (src.startsWith('./')) {
      src = src.substring(2);
    }
    if (src.startsWith('/')) {
      src = src.substring(1);
    }
    
    let imagePath = path.join(process.cwd(), src);
    
    try {
      let metadata = await Image(imagePath, {
        widths: [500, 1000, "auto"],
        formats: ["avif", "jpeg"],
        urlPath: "/assets/img/",
        outputDir: "./_site/assets/img/"
      });

      let imageAttributes = {
        alt,
        sizes,
        loading: "lazy",
        decoding: "async",
      };
      
      return Image.generateHTML(metadata, imageAttributes);
    } catch (e) {
      console.log(`Image processing error for ${src}: ${e.message}`);
      return `<img src="${src}" alt="${alt}" loading="lazy">`;
    }
  });

  // Eleventy Navigation https://www.11ty.dev/docs/plugins/navigation/
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // Add support for YAML data files with .yml extension
  eleventyConfig.addDataExtension("yml", contents => yaml.load(contents));

  // Merge data instead of overriding
  // https://www.11ty.dev/docs/data-deep-merge/
  eleventyConfig.setDataDeepMerge(true);

  // Swedish collections - updated to point to content directory
  eleventyConfig.addCollection("blogg", collection => {
    return collection.getFilteredByGlob("content/blogg/*.md");
  });

  eleventyConfig.addCollection("platser", collection => {
    return collection.getFilteredByGlob("content/platser/*.md");
  });
  
  eleventyConfig.addCollection("sidor", collection => {
    return collection.getFilteredByGlob("content/sidor/*.md");
  });
  
  eleventyConfig.addCollection("forfattare", collection => {
    return collection.getFilteredByGlob("content/forfattare/*.md");
  });

  // Add support for post authors
  eleventyConfig.addCollection("myAuthors", collection => {
    const blogs = collection.getFilteredByGlob("content/blogg/*.md");
    return blogs.reduce((coll, post) => {
      const author = post.data.author;
      if (!author) {
        return coll;
      }
      if (!coll.hasOwnProperty(author)) {
        coll[author] = [];
      }
      coll[author].push(post);
      return coll;
    }, {});
  });

  // Date formatting (human readable)
  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj).toFormat("LLL d yyyy");
  });

  // Date formatting (machine readable)
  eleventyConfig.addFilter("machineDate", dateObj => {
    return DateTime.fromJSDate(dateObj).toFormat("yyyy-MM-dd");
  });

  // Swedish pluralization (simplified)
  eleventyConfig.addFilter("swedishPluralize", function (term, count = 1) {
    if (count === 1) return term;
    // Very basic pluralization - would need to be more sophisticated for real Swedish
    if (term.endsWith('a')) return `${term}r`;
    return `${term}`;  // Most Swedish nouns don't change in plural
  });

  // Minify CSS
  eleventyConfig.addFilter("cssmin", function(code) {
    return new CleanCSS({}).minify(code).styles;
  });

  // Minify JS
  eleventyConfig.addFilter("jsmin", async function(code) {
    try {
      let minified = await minify(code);
      return minified.code;
    } catch (error) {
      console.log("Terser error: ", error);
      return code;
    }
  });

  // Minify HTML output
  eleventyConfig.addTransform("htmlmin", function(content, outputPath) {
    if (outputPath.indexOf(".html") > -1) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true
      });
      return minified;
    }
    return content;
  });

  // Don't process folders with static assets e.g. images
  eleventyConfig.addPassthroughCopy("assets/img"); // don't process the image folder
  eleventyConfig.addPassthroughCopy("admin/"); // don't process the CMS folder

  // Disable 11ty dev server live reload when using CMS locally
  eleventyConfig.setServerOptions({
    liveReload: false
  });

  return {
    templateFormats: ["md", "njk", "liquid"],

    // If your site lives in a different subdirectory, change this.
    // Leading or trailing slashes are all normalized away, so don't worry about it.
    // If you don't have a subdirectory, use "" or "/" (they do the same thing)
    // This is only used for URLs (it does not affect your file structure)
    pathPrefix: "/",

    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    dir: {
      input: ".",
      includes: "templates",
      data: "_data",
      output: "_site"
    }
  };
};
