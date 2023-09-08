const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
    plugins: [
    new HtmlWebpackPlugin({
      title: 'WASP Three.js',
      template: './src/index.html'
    }),
  ],
  devtool: 'inline-source-map',
  devServer: {
    static: './dist',
    hot: true,
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  ignoreWarnings: [
    {
      module: /three-csm/
    },
    {
      module: /index\.js/,
      message: /export 'CSM'/
    }
  ]
};
