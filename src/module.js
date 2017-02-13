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
})(window, function () {
    'use strict';

    // 配置对象 config

    // 工具对象 utils

    // 碰撞检测 collision

    // 缓存对象 cache

    // 视图对象 view

    // 监听对象 handleEvent

    // 拖拽对象 dragdrop 

    // api接口 dragkit

});