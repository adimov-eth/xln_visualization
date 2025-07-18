const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/d3-app/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src/d3-app'),
      '@components': path.resolve(__dirname, 'src/d3-app/components'),
      '@services': path.resolve(__dirname, 'src/d3-app/services'),
      '@utils': path.resolve(__dirname, 'src/d3-app/utils'),
      '@types': path.resolve(__dirname, 'src/d3-app/types'),
      '@hooks': path.resolve(__dirname, 'src/d3-app/hooks'),
      '@contexts': path.resolve(__dirname, 'src/d3-app/contexts'),
      '@styles': path.resolve(__dirname, 'src/d3-app/styles'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/d3-app/index.html',
      title: 'XLN Network Visualization',
    }),
  ],
  devServer: {
    static: './dist',
    port: 4000,
    hot: true,
    open: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        d3: {
          test: /[\\/]node_modules[\\/]d3/,
          name: 'd3',
          priority: 20,
        },
        three: {
          test: /[\\/]node_modules[\\/]three/,
          name: 'three',
          priority: 20,
        },
      },
    },
  },
};