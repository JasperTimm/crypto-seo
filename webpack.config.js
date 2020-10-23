const path = require('path')
module.exports = {
   watch: true,
   entry: path.join(__dirname, 'src/js', 'index.js'), // Our frontend will be inside the src folder
   output: {
      path: path.join(__dirname, 'dist'),
      filename: 'build.js' // The final file will be created in dist/build.js
   },
   module: {
      rules: [
        // { test: /\.json$/, use: ['json-loader'] },
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
                presets: ['@babel/preset-env', '@babel/preset-react']
                }
            }
        }]
   },
//    target: 'node',
//    externals: {
//        "request": "request"
//    }
   node: {
    console: true,
    // child_process: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
   }
}