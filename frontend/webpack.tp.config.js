const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const autoprefixer = require('autoprefixer');
const CopyPlugin = require("copy-webpack-plugin");

// 환경 변수 설정
const envKeys = {}; // 환경 변수 객체

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
    new HtmlWebpackPlugin({ template: path.resolve(__dirname, "./index.html") }), // HTML 템플릿을 기반으로 HTML 파일 생성
    new webpack.DefinePlugin(envKeys), // 환경 변수 전달
    // FaviconsWebpackPlugin은 favicons 생성 (필요 시 사용)
    // new FaviconsWebpackPlugin({ logo: path.resolve(__dirname, "./public/assets/img/tmpProfile.png") }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      Popper: ['popper.js', 'default']
    }),
    // 정적 자산 복사
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "public/assets"),
          to: path.resolve(__dirname, "dist/public/assets"),
          globOptions: {
              ignore: ["**/index.html"], 
          },
        },
      ],
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
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(scss)$/,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [autoprefixer],
              },
            },
          },
          "sass-loader",
        ],
      },
    ],
  },
  resolve: {
    modules: [
      'node_modules',
      './src' // 사용자 정의 모듈 경로 추가
    ],
    extensions: [".js", ".jsx", ".json"], // 확장자 추가
    mainFields: ["browser", "module", "main"],
  },
};
