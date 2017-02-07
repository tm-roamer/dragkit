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

    // 插入

});