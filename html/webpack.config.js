const webpack = require('webpack')

module.exports = {
  entry: {
    index: './html/index',
    vendor: './html/vendor'
  },
  output: {
    path: __dirname,
    filename: '[name].bundle.js'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      output: {
        comments: false
      },
      exclude: [
      ]
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: ['index', 'vendor']
    })
  ],
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.min.js'
    }
  }
}