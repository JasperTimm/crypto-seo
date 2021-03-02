const path = require('path')

module.exports = {
   entry: [
      'babel-regenerator-runtime',
      path.join(__dirname, 'src/js', 'index.js') // Our frontend will be inside the src folder
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