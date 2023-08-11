const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'development',
  output: {
    path: '/',
    filename: 'app.js'
  },
  devServer: {
    hot: true,
    open: true,
    static: {
      directory: path.join(__dirname, 'assets'),
      publicPath: '/assets'
    }
  },
  entry: './src/index.ts',
  resolve: {
    extensions: ['.js', '.ts']
  },
  module: {
    rules: [
      {
        test: /.ts$/,
        loader: 'ts-loader'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    })
  ]
}