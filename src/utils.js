
// 工具类
var utils = {
    // 属性拷贝
    extend: function (mod, opt) {
        if (!opt) return mod;
        var conf = {};
        for (var attr in mod)
            conf[attr] = typeof opt[attr] !== "undefined" ? opt[attr] : mod[attr];
        return conf;
    },
    // 克隆节点
    clone: function (node) {
        var obj = {};
        for (var attr in node)
            if (node.hasOwnProperty(attr))
                obj[attr] = node[attr];
        return obj;
    },
    // 节流函数
    throttle: function (now) {
        var time = new Date().getTime();
        this.throttle = function (now) {
            if (now - time > THROTTLE_TIME) {
                time = now;
                return true;
            }
            return false;
        };
        this.throttle(now);
    },
    getDom2Dragkit: function(dom) {
        // 获取容器
        var container = view.searchUp(dom, DK_CONTAINER);
        if (container) {
            // 获取拖拽对象
            return cache.get(container.getAttribute(DK_ID));
        }
    }
};