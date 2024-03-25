const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const autoprefixer = require('autoprefixer');

const envKeys = {};

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  devServer: {
    static: path.resolve(__dirname, "dist"),
    compress: true,
    port: 8080,
    hot: true,
    historyApiFallback: true,
  },
  plugins: [
    new HtmlWebpackPlugin({ template: path.resolve(__dirname, "./index.html") }),
    new webpack.DefinePlugin(envKeys),
    new FaviconsWebpackPlugin({ logo: path.resolve(__dirname, "./public/assets/img/tmpProfile.png") }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      Popper: ['popper.js', 'default']
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "static/img",
            },
          },
        ],
      },
      {
        test: /\.json$/,
        type: "javascript/auto",
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "static/fonts",
            },
          },
        ],
      },
      {
        test: /\.mp3$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "static/sounds",
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(scss)$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [autoprefixer],
              },
            },
          },
          {
            loader: "sass-loader",
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".js"],
    mainFields: ["browser", "module", "main"],
  },
};
