import path from 'path';

export default {
  entry: {
    content: "./src/content-scripts/content.js",
    background: "./src/background.js",
  },
  output: {
    path: path.resolve("dist"),
    filename: "[name].js",
    clean: true,
  },

  resolve: {
    extensions: [".js"],
  },
};