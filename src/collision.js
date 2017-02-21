
// 碰撞检测对象
var conllision = {

    /**
     * 检测矩形碰撞
     * 矩形发生重叠, 并拖拽节点的重叠面积大于scale规定的比例才认定为碰撞
     * @param container 容器
     * @param node  拖拽节点
     * @param inside 状态, true=里面, false=外面
     * @param scale 比例, 碰撞重叠比例
     * @return {boolean} 是否碰撞
     */
     checkHit: function (container, node, inside, scale) {
        var n1 = {
                x: node.x,
                y: node.y,
                w: node.w,
                h: node.h,
                xw: node.x + node.w,
                yh: node.y + node.h,
                area: node.w * node.h
            },
            n2 = {
                x: container.x,
                y: container.y,
                w: container.w,
                h: container.h,
                xw: container.x + container.w,
                yh: container.y + container.h
            },
            isHit = false,
            // 离开和进入的比例相对的
            scale = inside ? 1 - scale : scale;
        // 重叠
        if (n2.xw > n1.x && n2.x < n1.xw) {
            if (n2.yh > n1.y && n2.y < n1.yh) {
                // 左边接触
                if (n1.x < n2.x) {
                    // 三种情况, 左上角重叠, 左下角重叠, 正常重叠
                    var h = n1.h;
                    if (n1.y < n2.y) {
                        h = n1.yh - n2.y
                    } else if (n2.xw < n1.xw) {
                        h = n2.yh - n1.y;
                    }
                    isHit = (n1.xw - n2.x) * h / n1.area >= scale;
                    // console.log('left', (n1.xw - n2.x) * n1.h / n1.area >= scale);
                }
                // 上边接触
                else if (n1.y < n2.y) {
                    // 三种情况, 左上角重叠, 右上角重叠, 正常重叠
                    var w = n1.w;
                    if (n1.x < n2.x) {
                        w = n1.xw - n2.x
                    } else if (n2.xw < n1.xw) {
                        w = n2.xw - n1.x;
                    }
                    isHit = (n1.yh - n2.y) * w / n1.area >= scale;
                    // console.log('up', (n1.yh - n2.y) * n1.w / n1.area >= scale);
                }
                // 右边接触
                else if (n2.xw < n1.xw) {
                    // 三种情况, 右上角重叠, 右下角重叠, 正常重叠
                    var h = n1.h;
                    if (n1.y < n2.y) {
                        h = n1.yh - n2.y
                    } else if (n2.xw < n1.xw) {
                        h = n2.yh - n1.y;
                    }
                    isHit = (n2.xw - n1.x) * h / n1.area >= scale;
                    // console.log('right', (n2.xw - n1.x) * n1.h / n1.area >= scale);
                }
                // 下边接触
                else if (n2.yh < n1.yh) {
                    // 三种情况, 左下角重叠, 右下角重叠, 正常重叠
                    var w = n1.w;
                    if (n1.x < n2.x) {
                        w = n1.xw - n2.x
                    } else if (n2.xw < n1.xw) {
                        w = n2.xw - n1.x;
                    }
                    isHit = (n2.yh - n1.y) * w / n1.area >= scale;
                    // console.log('down', (n2.yh - n1.y) * n1.w, n1.h, (n2.yh - n1.y) * n1.w / n1.area >= scale);
                }
                // 包含
                else {
                    isHit = true;
                }
            }
        }
        return isHit;
    },
    // 进行所有的容器的矩形碰撞(重叠)
    checkContainerHit: function (node, inside, scale) {
        var arr = cache.arr;
        for (var i = 0; i < arr.length; i++) {
            var dragkit = arr[i];
            // 容器坐标
            var containerOffset = view.getOffset(dragkit.container);
            var containerCoord = {
                x: containerOffset.left,
                y: containerOffset.top,
                w: containerOffset.width,
                h: containerOffset.height
            };
            if (this.checkHit(containerCoord, node, inside, dragkit.opt.hitScale))
                return {isContainerHit: true, currentDragkit: dragkit, dragNodeCoord: node};
        }
        return {isContainerHit: false, dragNodeCoord: node};
    },
    // 进行容器内节点的碰撞检测(针对覆盖节点)
    checkNodeHit: function (container, arr, elements, node, coverNodeScale) {

        if (Array.isArray(arr)) {
            // 容器坐标
            var containerOffset = view.getOffset(container);
            var n1 = {
                x: node.x - containerOffset.left,
                y: node.y - containerOffset.top,
                w: node.w,
                h: node.h
            };
            for (var i = 0; i < arr.length; i++) {
                var n = arr[i];
                var n2 = {
                    x: 0,
                    y: n.innerY,
                    w: elements[n.id].clientWidth,
                    h: elements[n.id].clientHeight
                };
                // 碰撞
                if (this.checkHit(n2, n1, undefined, coverNodeScale)) {
                    console.log('----------');
                    this.checkHit(n2, n1, undefined, coverNodeScale);
                    return {isNodeHit: true, coveredNode: n};
                }
            }
        }
        return {isNodeHit: false, coveredNode: undefined};
    }
};
