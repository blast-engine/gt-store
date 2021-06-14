const path = require('path')
const ProgressPlugin = require('webpack/lib/ProgressPlugin')

// hack for react-app babel preset. 
process.env.BABEL_ENV = 'development'

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  cache: true,
  context: __dirname,
  stats: {
    colors: true,
    reasons: true,
  },

  entry: './src/index.js',

  watchOptions: {
    poll: true
  },

  output: {
    libraryTarget: 'commonjs',
    path: path.resolve('./dist'),
    filename: 'gt-store.js',
    sourceMapFilename: 'gt-store.js.map',
  },

  resolve: {
    extensions: ['.js', '.json'],
    modules: ['./node_modules'],
  },

  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
}