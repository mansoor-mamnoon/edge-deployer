const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const CopyWebpackPlugin = require("copy-webpack-plugin");


module.exports = {
  mode: "development", // ✅ this fixes the warning
  entry: "./src/index.tsx", // ✅ webpack starts here
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "build"),
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/, // NEW: for CSS files
        use: ['style-loader', 'css-loader'],
      },
    ],


  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new MonacoWebpackPlugin({
      languages: ['javascript', 'typescript', 'json'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "public/preview.html", to: "preview.html" }, // ✅
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'), // ✅ serve public/ folder
    },
    compress: true,
    port: 8080,
  },
  
};
