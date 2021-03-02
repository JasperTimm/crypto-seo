const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  devtool: "source-map",
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: 'src/html/index.html'
    }),
  ],  
  output: {
   path: process.env.OUTPUT_DIR || path.join(__dirname, 'dist'),
   filename: 'build.js', // The final file will be created in dist/build.js
   sourceMapFilename: "[name].js.map"
  },    
});