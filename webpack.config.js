var webpack = require('webpack');
var path = require('path');
var node_modules = path.resolve(__dirname, 'node_modules');

module.exports = {
    //插件项
    plugins: [new webpack.optimize.MinChunkSizePlugin({
            compress: {
                warnings: false
            }
        })
    ],
    //页面入口文件配置
    entry: {
        index: './src/index.js'
    },
    //入口文件输出配置
    output: {
        path: path.join(__dirname, './dist'),
        filename: '[name].js'
    },
    // entry: {
    //     index: './src/js/Autocomplete.js'
    // },
    // output: {//umd
    //     path: path.resolve(__dirname, 'umd'),
    //     filename: 'Autocomplete.js', // 注意我们使用了变量
    //     library: ["Autocomplete"],
    //     libraryTarget: "umd"
    // },
    module: {
        //加载器配置
        loaders: [{
            test: /\.(js|jsx)$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        },{
            test: /\.css$/,
            exclude: /node_modules/,
            loader: 'style-loader!css-loader!autoprefixer-loader'
        }]
    },
    //其它解决方案配置
    resolve: {
        extensions: ['', '.js', '.json', '.scss', '.jsx']
    }
};
