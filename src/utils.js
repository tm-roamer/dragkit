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
    // 检测矩形碰撞(重叠)
    checkHit: function (container, node) {
        if ((container.x + container.w > node.x) && (container.x < node.x + node.w))
            if ((container.y + container.h > node.y) && (container.y < node.y + node.h))
                return true;
        return false;
    },
    // 进行所有的容器的矩形碰撞(包裹)
    checkContainerHit: function (node) {
        var arr = cache.arr;
        for (var i = 0; i < arr.length; i++) {
            var obj = arr[i];
            var containerOffset = view.getOffset(obj.container);
            var containerCoord = {
                x: containerOffset.left,
                y: containerOffset.top,
                w: containerOffset.width,
                h: containerOffset.height
            };
            if (this.checkHit(containerCoord, node))
                return {isContainerHit: true, obj: obj};
        }
        return {isContainerHit: false, obj: undefined};
    },
    // 进行容器内所有节点的碰撞检测(点与线段的碰撞)
    checkNodeHit: function (arr, node, opt) {
        if (arr && arr.length > 0) {
            for (var i = 0; i < arr.length; i++) {
                var n = arr[i];
                var scale = parseInt(opt.nodeH * opt.coverNodeScale);
                if ((n.innerY < node.y) && (node.y < n.innerY + scale)) {
                    return {isNodeHit: true, coveredNode: n};
                }
            }
        }
        return {isNodeHit: false, coveredNode: undefined};
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