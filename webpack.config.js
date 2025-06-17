const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');


module.exports = {
  mode: "development",
  entry: "./src/index.tsx",
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
      languages: ['javascript', 'typescript', 'json'], // add more as needed
    }),
  ],
  devServer: {
    static: {
      directory: path.resolve(__dirname, "build"),
    },
    port: 8080,
    hot: true,
    open: false
  }
};
