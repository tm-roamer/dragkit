/**
 * 描述: 简易的拖拽小插件
 * 兼容性: ie11+
 * 支持: commonjs和requirejs与seajs
 */
;(function (parent, fun) {
    if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
        module.exports = fun();
    } else if (typeof define === 'function'
        && (typeof define.amd === 'object' || typeof define.cmd === 'object')) {
        define(fun);
    } else {
        parent.dragkit = fun();
    }
})(window, function (dk) {
    'use strict';

    // 配置对象 @@include('./config.js')

    // 工具对象 @@include('./utils.js')

    // 碰撞检测 @@include('./collision.js')

    // 缓存对象 @@include('./cache.js')

    // 视图对象 @@include('./view.js')

    // 监听对象 @@include('./handleEvent.js')

    // 拖拽对象 @@include('./dragdrop.js')

    // api接口 @@include('./dragkit.js')

    return dk;
});