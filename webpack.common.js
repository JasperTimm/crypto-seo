const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = {
   entry: [
      'babel-regenerator-runtime',
      path.join(__dirname, 'src/js', 'index.js') // Our frontend will be inside the src folder
   ],
   output: {
      path: process.env.OUTPUT_DIR || path.join(__dirname, 'dist'),
      filename: 'build.js', // The final file will be created in dist/build.js
      sourceMapFilename: "[name].js.map"
     },    
   plugins: [
      new webpack.EnvironmentPlugin(['SEARCH_URL']),
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        template: 'src/html/index.html'
      }),
    ],    
   module: {
      rules: [
        // { test: /\.json$/, use: ['json-loader'] },
        {
            test: /\.(png|svg|jpg|jpeg|gif)$/i,
            use: [
               {
                 loader: 'file-loader',
               },
             ],
        },
        {
            test: /\.css$/, // To load the css in react
            use: ['style-loader', 'css-loader']
        }, 
        {
            test: /\.m?js$/,
            exclude: /(node_modules|bower_components)/,
            use: {
                loader: 'babel-loader',
                options: {
                presets: ['@babel/preset-env', '@babel/preset-react',
                  {
                     'plugins': ['@babel/plugin-proposal-class-properties']
                  }]
                }
            }
        }]
   },
}