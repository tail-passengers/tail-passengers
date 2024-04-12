const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");
const autoprefixer = require("autoprefixer");
const CopyPlugin = require("copy-webpack-plugin");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, "./.env");
const env = dotenv.config({ path: envPath }).parsed;
const envKeys = Object.keys(env).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(env[next]);
    return prev;
}, {});

module.exports = {
    mode: "development",
    entry: "./src/index.js",
    output: {
        publicPath: "/",
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
    },
    devtool: "source-map",
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "./index.html"),
            inject: false,
        }),
        new webpack.DefinePlugin(envKeys),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
            Popper: ["popper.js", "default"],
            Chart: "chart.js/auto",
        }),
        // 정적 자산 복사
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, "public/assets"),
                    to: path.resolve(__dirname, "dist/public/assets"),
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
        modules: ["node_modules", "./src"],
        extensions: [".js", ".jsx", ".json"],
        mainFields: ["browser", "module", "main"],
    },
};
