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
})(window, function (dragkit) {
    'use strict';
    // 常量
    var THROTTLE_TIME = 14,                              // 节流函数的间隔时间单位ms, FPS = 1000 / THROTTLE_TIME
        DK_CONTAINER = 'dk-container',                   // 拖拽容器classname
        DK_CONTAINER_START = 'dk-container-start',       // 跨容器拖拽的classname
        DK_ID = 'data-dk-id',                            // 拖拽数据标识
        DK_NODE_INFO = 'data-dk-node-info',              // 拖拽节点携带的数据
        DK_ITEM = 'dk-item',                             // 拖拽块classname
        DK_ITEM_ANIMATE = 'dk-item-animate',             // 拖拽块classname 动画效果
        DK_ITEM_CONTENT = 'dk-item-content',             // 拖拽块的展示内容区div的classname
        DK_ITEM_GRAG_DROP = 'dk-item-dragdrop',          // 正在拖拽的块classname
        DK_ITEM_DELETE = 'dk-item-delete',               // 拖出容器待删除块的classname
        DK_ITEM_COVER = 'dk-item-cover',                 // 节点被覆盖的样式classname
        DK_ITEM_DELETE_ICO = 'dk-item-delete-ico',       // 节点悬停显示的删除图标classname
        DK_ITEM_ADD = 'dk-item-add',                     // 拖入容器待添加块的classname
        DK_ITEM_PLACEHOLDER = 'dk-item-placeholder',     // 拖拽块的占位符
        DK_ITEM_PROMPT_TEXT = 'dk-item-prompt-text',     // 占位的提示文字
        PLACEHOLDER = 'placeholder'                      // 占位符

    // 默认设置
    var f = function () {
        },
        setting = {
            className: '',                                   // 自定义换肤class
            maxNodeNum: 4,                                   // 容器最多节点数量
            nodeH: 24,                                       // 单个节点的宽高
            isCoverNode: true,                               // 是否可以覆盖节点
            coverNodeScale: 0.7,                             // 节点覆盖重叠的比例值
            isShowPromptText: false,                         // 是否显示提示文字, 默认不显示
            padding: 5,                                      // 节点块之间的间距, 默认都为5px
            distance: 5,                                     // 触发拖拽的拖拽距离,默认5px
            editNode: f,                                     // 回调函数, 更新节点
            addNode: f,                                      // 回调函数, 添加节点
            deleteNode: f,                                   // 回调函数, 删除节点
            onLoad: f,                                       // 回调函数, 渲染触发
            onClick: f,                                      // 回调函数, 点击事件
        };

    // 拖拽对象的缓存对象
    var cache = {
        init: function () {
            if (!this.arr) this.arr = [];
        },
        get: function (idx) {
            // 避免0的情况, if条件判断麻烦
            return this.arr[idx - 1];
        },
        set: function (obj) {
            this.arr.push(obj);
            return obj;
        },
        index: function () {
            return this.arr.length + 1;
        }
    };

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
        }
    };

    // 展示对象, 操作DOM
    var view = {
        setContainerParam: function (opt, data, container) {
            var text = container.querySelector('.' + DK_ITEM_PROMPT_TEXT);
            var height = data.length * (opt.nodeH + opt.padding);
            if (data.length < opt.maxNodeNum && opt.isShowPromptText) {
                height = height + (opt.nodeH);
                text.style.cssText = 'display:block;';
            } else {
                text.style.cssText = 'display:none;';
            }
            container.style.cssText = 'height:' + height + 'px';
        },
        searchUp: function (node, className) {
            if (!node || node === document.body || node === document) return undefined;   // 向上递归到顶就停
            if (node.classList.contains(className)) return node;
            return this.searchUp(node.parentNode, className);
        },
        getOffset: function (node, offset, parent) {
            if (!parent)
                return node.getBoundingClientRect();
            offset = offset || {top: 0, left: 0};
            if (node === null || node === parent) return offset;
            offset.top += node.offsetTop;
            offset.left += node.offsetLeft;
            return this.getOffset(node.offsetParent, offset, parent);
        },
        init: function (data, opt, container) {
            var self = this,
                elements = [],
                fragment = document.createDocumentFragment();
            if (data && data.length > 0) {
                data.forEach(function (node, idx) {
                    var ele = self.create(node);
                    elements.push(ele);
                    fragment.appendChild(ele);
                });
                this.setContainerParam(opt, data, container);
                container.appendChild(fragment);
            }
            return elements;
        },
        create: function (node, className) {
            var content = document.createElement("div"),
                ele = document.createElement("div");
            content.className = DK_ITEM_CONTENT;
            content.innerHTML = node.text;
            ele.appendChild(content);
            ele.className = className || DK_ITEM + ' ' + DK_ITEM_ANIMATE;
            node.type == PLACEHOLDER && ele.classList.add(DK_ITEM_PLACEHOLDER);
            ele.setAttribute(DK_ID, node.id || '');
            ele.style.cssText = this.setStyleTop(node.innerY);
            // 正常容器内显示的节点悬停时需要显示删除图标
            if (node.type !== PLACEHOLDER && node.id !== undefined) {
                this.appendDelIco(ele, node.id);
            }
            return ele;
        },
        remove: function (container, id, className) {
            className = className || DK_ITEM;
            var delElement = container.querySelector('div.' + className + '[' + DK_ID + '="' + id + '"]');
            delElement && container.removeChild(delElement);
        },
        render: function (opt, data, elements, container) {
            for (var i = 0; i < elements.length; i++) {
                var ele = elements[i];
                if (!ele.classList.contains(DK_ITEM_GRAG_DROP)) {
                    var node = data.filter(function (n) {
                        return n.id === ele.getAttribute(DK_ID)
                    })[0];
                    ele.style.cssText = this.setStyleTop(node.innerY);
                }
            }
            this.setContainerParam(opt, data, container);
        },
        setStyleTop: function (top) {
            return ';top:' + top + 'px;';
        },
        appendDelIco: function (ele, id) {
            var delIco = document.createElement("div");
            delIco.className = DK_ITEM_DELETE_ICO;
            delIco.innerHTML = '\u2715';
            delIco.setAttribute(DK_ID, id);
            ele.appendChild(delIco);
        }
    };

    // 事件处理对象
    var handleEvent = {
        init: function (isbind) {
            if (this.isbind) return;
            this.isbind = isbind;
            this.unbindEvent();
            this.bindEvent();
        },
        bindEvent: function () {
            document.addEventListener('mousedown', this.mouseDown, false);
            document.addEventListener('mousemove', this.mouseMove, false);
            document.addEventListener('mouseup', this.mouseUp, false);
            document.addEventListener('click', this.click, true);
            this.isbind = true;
        },
        unbindEvent: function () {
            document.removeEventListener('mousedown', this.mouseDown, false);
            document.removeEventListener('mousemove', this.mouseMove, false);
            document.removeEventListener('mouseup', this.mouseUp, false);
            document.removeEventListener('click', this.click, true);
            this.isbind = false;
        },
        mouseDown: function (event) {
            // 记录位置, 比较拖拽距离, 判断是否拖拽, 如果是拖拽则阻止冒泡. 不触发点击事件
            this.distanceX = event.pageX;
            this.distanceY = event.pageY;
            this.distance = dragdrop.dragStart(event);
        },
        mouseMove: function (event) {
            dragdrop.drag(event);
        },
        mouseUp: function (event) {
            dragdrop.dragEnd(event);
        },
        click: function (event) {
            if (this.distance) {
                // 比较拖拽距离, 判断是否拖拽, 如果是拖拽则阻止冒泡. 不触发点击事件
                var distanceX = Math.abs(event.pageX - this.distanceX || 0),
                    distanceY = Math.abs(event.pageY - this.distanceY || 0);
                if ((this.distance <= distanceX || this.distance <= distanceY)) {
                    event.stopPropagation();
                    // 清理临时变量
                    this.distance = undefined;
                    this.distanceX = undefined;
                    this.distanceY = undefined;
                }
            }
        }
    };

    // 拖拽的工具对象
    var dragdrop = {
        // 开始拖拽
        dragStart: function (event) {
            // 获取节点
            var ele = view.searchUp(event.target, DK_ITEM);
            if (ele) {
                if (event.target.classList.contains(DK_ITEM_DELETE_ICO)) {
                    this.isDragDeleteNode = true;
                } else {
                    this.isDrag = true;
                }
                // 鼠标悬停位置与当前拖拽节点坐标的偏移(支持子节点情况)
                var offset = this.getNodeOffset(ele, event);
                this.offsetX = offset.x;
                this.offsetY = offset.y;
                // 获取容器
                var container = view.searchUp(ele, DK_CONTAINER);
                if (container) {
                    // 获取拖拽网格
                    var dragkit = cache.get(container.getAttribute(DK_ID));
                    if (dragkit) {
                        this.dragkit = dragkit;
                        // 非删除情况
                        if (!this.isDragDeleteNode) {
                            this.dragStartCrossMoveNode(event);
                            this.dragStartMoveNode(ele, dragkit, event);
                        }
                        return dragkit.opt.distance;
                    }
                }
                // 新增节点的情况
                else {
                    this.dragStartAddNode(ele, event);
                }
            }
        },
        dragStartMoveNode: function (ele, dragkit, event) {
            // 取得当前拖拽节点
            var node = utils.clone(dragkit.query(ele.getAttribute(DK_ID)));
            if (node) {
                this.dragNode = node;
                this.dragElement = ele;
                this.dragElement.className = DK_ITEM + ' ' + DK_ITEM_GRAG_DROP;
                // 移动拖拽节点
                this.moveDragElement(event);
                // 新增占位符
                dragkit.addPlaceHolder(node);
            }
        },
        dragStartCrossMoveNode: function (event) {
            this.startDragkit = this.dragkit;
            this.startDragkit.container.classList.add(DK_CONTAINER_START);
        },
        dragStartAddNode: function (ele, event) {
            this.dragNode = JSON.parse(ele.getAttribute(DK_NODE_INFO));
            if (this.dragNode) {
                this.isDragAddNode = true;
                this.dragElement = view.create(this.dragNode);
                // 移动拖拽节点
                this.moveDragElement(event);
                this.dragElement.className = DK_ITEM + ' ' + DK_ITEM_ADD + ' ' + DK_ITEM_GRAG_DROP;
                document.body.appendChild(this.dragElement);
            }
        },
        // 正在拖拽
        drag: function (event) {
            // 拖拽状态, 拖拽元素
            if (!this.isDrag && !this.dragNode) return;
            // 函数节流
            if (!utils.throttle(new Date().getTime())) return;
            // 计算当前坐标
            this.dragNodeCoord = {
                x: event.pageX - this.offsetX, y: event.pageY - this.offsetY,
                w: this.dragElement.clientWidth, h: this.dragElement.clientHeight
            };
            // 移动拖拽节点
            this.moveDragElement(event);
            // 检查是否在附近容器拖拽(碰撞检测), 返回拖拽对象
            var containerHit = utils.checkContainerHit(this.dragNodeCoord);
            // 拖拽对象不存在, 或者 切换容器了修改拖拽对象
            if (containerHit.obj && this.dragkit !== containerHit.obj) {
                this.prevDragkit = this.dragkit;        // 缓存上一个拖拽对象
                this.dragkit = containerHit.obj;
            }
            // 判断是否是新增节点
            if (this.isDragAddNode) {
                this.dragAddNode(containerHit.isContainerHit, event)
            }
            // 判断是否跨域容器
            else if (this.startDragkit !== this.dragkit) {
                this.dragCrossMoveNode(containerHit.isContainerHit, event);
            }
            else {
                if (containerHit.isContainerHit) {
                    this.dragMoveNode(event);
                } else {
                    this.dragDeleteNode(event);
                }
                // 特殊处理: 容器离得近的时候, 拖动过快, 容易切换容器, 导致切换了拖拽对象, 删除临时节点
                this.removeTempNode(this.startDragkit, this.dragkit, this.dragNode);
            }
        },
        dragMoveNode: function (event) {
            this.isDragDeleteNode = false;
            this.dragElement.classList.remove(DK_ITEM_DELETE);
            this.applyLayout(this.dragNode);
        },
        dragCrossMoveNode: function (isContainerHit, event) {
            this.isDragDeleteNode = false;
            this.isDragCrossContainer = true;
            if (isContainerHit) {
                this.dragElement.classList.remove(DK_ITEM_DELETE);
            } else {
                this.dragElement.classList.add(DK_ITEM_DELETE);
            }
            this.dragAddNode(isContainerHit, event, true);
        },
        dragAddNode: function (isContainerHit, event, isCross) {
            var dragkit = this.dragkit;
            if (!dragkit) return;
            this.isDragAddNodeHit = isContainerHit;
            // 是否发生碰撞
            if (isContainerHit) {
                // 特殊处理: 容器离得近的时候, 拖动过快, 容易切换容器, 导致切换了拖拽对象.
                if (!isCross && this.prevDragkit && this.prevDragkit !== dragkit) {
                    this.isDragAddData = undefined;
                    this.prevDragkit.remove(this.dragNode);
                    this.prevDragkit.removePlaceHolder(this.dragNode);
                    this.setCoverElementStyle(undefined, this.prevDragkit.elements);
                    this.prevDragkit.layout();
                }
                // 容器没有超量的情况下, 才会添加
                if (dragkit.data.length < dragkit.opt.maxNodeNum) {
                    if (this.isDragAddData === undefined) {
                        // 添加节点 this.isDragAddData === this.dragNode
                        this.isDragAddData = dragkit.add(this.dragNode, this.dragElement);
                        // 添加占位符
                        dragkit.addPlaceHolder(this.isDragAddData);
                    }
                }
                // 容器超量的情况会执行覆盖
                else {
                    // 允许覆盖, 并且无法再添加节点时
                    if (dragkit.opt.isCoverNode && !this.isDragAddData) {
                        var containerTop = view.getOffset(dragkit.container).top;
                        var y = this.dragNodeCoord.y - containerTop;
                        var nodeHit = utils.checkNodeHit(dragkit.data, {y: y}, dragkit.opt);
                        this.isDragCoverNode = nodeHit.isNodeHit;
                        this.dragCoveredNode = nodeHit.coveredNode;
                        if (nodeHit.isNodeHit) {
                            this.setCoverElementStyle(nodeHit.coveredNode);
                        }
                    }
                }
            } else {
                this.isDragAddData = undefined;
                dragkit.remove(this.dragNode);
                dragkit.removePlaceHolder(this.dragNode);
                // 覆盖情况,清除样式
                this.setCoverElementStyle(undefined);
            }
            // 碰撞仅在边界处, 可以无数次在容器外或容器内移动, 故需要每次都要应用布局
            this.applyLayout(this.isDragAddData);
        },
        dragDeleteNode: function (event) {
            this.isDragDeleteNode = true;
            this.dragElement.classList.add(DK_ITEM_DELETE)
        },
        // 结束拖拽
        dragEnd: function (event) {
            // 删除节点
            if (this.isDragDeleteNode) {
                this.dragEndDeleteNode(event);
            }
            else if (this.isDrag) {
                // 添加节点
                if (this.isDragAddNode) {
                    // 替换的情况
                    if (this.isDragCoverNode) {
                        this.dragEndCoverNode(event);
                    } else {
                        this.dragEndAddNode(event);
                    }
                }
                // 跨容器移动节点
                else if (this.isDragCrossContainer) {
                    // 替换的情况
                    if (this.isDragCoverNode) {
                        this.dragEndCoverNode(event);
                    } else {
                        this.dragEndCrossMoveNode(event);
                    }
                }
                // 移动节点
                else {
                    this.dragEndMoveNode(event);
                }
            }
            // 清理临时变量
            this.isDrag = false;
            this.prevDragkit = null;
            this.dragkit = null;
            this.dragNode = null;
            // 清理临时坐标
            this.offsetX = undefined;
            this.offsetY = undefined;
            this.dragNodeCoord = undefined;
        },
        dragEndMoveNode: function (event, dragkit) {
            dragkit = dragkit || this.dragkit;
            // 移除占位符
            dragkit.removePlaceHolder(this.dragNode);
            // 清理样式(替换拖拽ClassName)
            this.setDragElementStyle(dragkit);
        },
        dragEndCrossMoveNode: function (event) {
            // 判断是否跨域容器
            if (this.startDragkit !== this.dragkit) {
                // 删除之前容器的节点
                this.startDragkit.removePlaceHolder(this.dragNode);
                this.startDragkit.remove(this.dragNode);
                this.startDragkit.layout();
                // 节点添加到现在容器
                this.dragEndAddNode(event);
            } else {
                this.dragEndMoveNode(this.startDragkit);
            }
            this.startDragkit.container.classList.remove(DK_CONTAINER_START);
            this.startDragkit = undefined;
            this.isDragCrossContainer = undefined;
        },
        dragEndCoverNode: function (event) {
            // debugger;
            this.dragNode.innerY = this.dragCoveredNode.innerY;
            // 删除被覆盖节点
            this.dragkit.remove(this.dragCoveredNode);
            // 添加覆盖节点
            this.dragkit.add(this.dragNode, this.dragElement);
            // 插入DOM
            this.dragElement.setAttribute(DK_ID, this.dragNode.id);
            this.dragkit.container.appendChild(this.dragElement);
            // 添加删除图标
            view.appendDelIco(this.dragElement, this.dragNode.id);
            // 清理样式(替换拖拽ClassName)
            this.setDragElementStyle();
            // 重新布局
            this.dragkit.layout();
            // 判断是否跨域容器
            if (this.startDragkit && this.startDragkit !== this.dragkit) {
                // 删除之前容器的节点
                this.startDragkit.removePlaceHolder(this.dragNode);
                this.startDragkit.remove(this.dragNode);
                this.startDragkit.layout();
                this.startDragkit.container.classList.remove(DK_CONTAINER_START);
                this.startDragkit = undefined;
                this.isDragCrossContainer = undefined;
            }
            this.isDragCoverNode = undefined;
            this.dragCoveredNode = undefined;
            this.isDragAddNode = undefined;
            this.isDragAddData = undefined;
            this.isDragAddNodeHit = undefined;
        },
        dragEndAddNode: function (event) {
            var dragkit = this.dragkit;
            // 发生碰撞, 且容器节点数满了(当id=undefined也就是容器满了)
            if ((this.isDragAddNodeHit && this.dragNode.id)) {
                dragkit.removePlaceHolder(this.dragNode);
                // 插入DOM
                this.dragElement.setAttribute(DK_ID, this.dragNode.id);
                dragkit.container.appendChild(this.dragElement);
                // 添加删除图标
                view.appendDelIco(this.dragElement, this.dragNode.id);
                // 清理样式(替换拖拽ClassName)
                this.setDragElementStyle();
            } else {
                view.remove(document.body, '', DK_ITEM_ADD);
            }
            this.isDragAddNode = undefined;
            this.isDragAddData = undefined;
            this.isDragAddNodeHit = undefined;
        },
        dragEndDeleteNode: function (event) {
            // 如果拖出容器删除节点, 或者悬停点击删除图标
            if (this.dragNode) {
                // 移除占位符
                this.dragkit.removePlaceHolder(this.dragNode);
                this.dragkit.remove(this.dragNode);
            } else {
                var id = event.target.getAttribute(DK_ID);
                this.dragkit.remove({id: id});
            }
            this.dragkit.layout();
            this.isDragDeleteNode = undefined;
        },
        // 辅助方法
        moveDragElement: function (event) {
            var x = event.pageX - this.offsetX;
            var y = event.pageY - this.offsetY;
            this.dragElement.style.cssText = 'top:' + y + 'px;left:' + x + 'px;';
        },
        getNodeOffset: function (ele, event) {
            // var node = event.target,
            var offset = {x: 0, y: 0};
            // if (node.classList.contains(DK_ITEM)) {
            offset.x = event.offsetX;
            offset.y = event.offsetY;
            // } else {
            //     var coord = view.getOffset(node, undefined, ele);
            //     offset.x = coord.left - event.offsetX;
            //     offset.y = coord.top - event.offsetY;
            // }
            return offset;
        },
        applyLayout: function (node) {
            if (this.dragkit) {
                var containerTop = view.getOffset(this.dragkit.container).top;
                // 当鼠标位置转换成容器内排版坐标
                this.dragkit.layout(node, this.dragNodeCoord.y - containerTop);
            }
        },
        setDragElementStyle: function (dragkit) {
            var dragkit = dragkit || this.dragkit;
            // 确认拖拽添加到容器内, 修改替换样式(替换拖拽ClassName)
            var node = this.dragkit.query(this.dragNode.id);
            if (node) {
                var styleTop = view.setStyleTop(node && node.innerY);
                this.dragElement.style.cssText = styleTop + ';position:absolute;';
                var self = this;
                setTimeout(function () {
                    self.dragElement.className = DK_ITEM + ' ' + DK_ITEM_ANIMATE;
                    self.dragElement.style.cssText = styleTop;
                    self.dragElement = null;
                }, 0);
            }
        },
        setCoverElementStyle: function (coveredNode, elements) {
            elements = elements || this.dragkit.elements;
            elements.forEach(function (ele) {
                if (coveredNode && ele.getAttribute(DK_ID) === coveredNode.id) {
                    ele.classList.add(DK_ITEM_COVER)
                } else {
                    ele.classList.remove(DK_ITEM_COVER)
                }
            });
        },
        removeTempNode: function(startDragkit, currentDragkit, node) {
            var arr = cache.arr;
            for (var i = 0; i < arr.length; i++) {
                var dragkit = dragkit = arr[i];
                if (dragkit !== startDragkit && dragkit !== currentDragkit && dragkit.query(node.id)) {
                    this.isDragAddData = undefined;
                    dragkit.remove(node);
                    dragkit.removePlaceHolder(node);
                    dragkit.layout();
                }
            }
        }
    };

    // 拖拽对象
    function DragKit(options, container, originData, number) {
        this.number = number;                           // 拖拽对象的编号
        this.autoIncrement = 0;                         // 节点的自增主键
        this.opt = utils.extend(setting, options);      // 配置项
        this.container = container;                     // 容器DOM
        this.originData = originData;                   // 原始数据
        this.data = this.setData(originData);           // 渲染数据
        this.elements = view.init(this.data, this.opt, this.container); // 缓存的节点DOM
    }

    // 拖拽对象原型
    DragKit.prototype = {
        constructor: DragKit,
        setData: function (originData) {
            var data = [], opt = this.opt, self = this;
            originData.forEach(function (node, idx) {
                data[idx] = {
                    id: self.number + '-' + (++self.autoIncrement),
                    text: node.text,
                    innerY: idx * (opt.nodeH + opt.padding)
                };
            });
            return data;
        },
        resetData: function () {
            var opt = this.opt;
            this.data.forEach(function (node, idx) {
                node.innerY = idx * (opt.nodeH + opt.padding);
            });
            return this.data;
        },
        layout: function (dragNode, innerY) {
            dragNode && (this.query(dragNode.id).innerY = innerY);
            // 排序
            this.data.sort(function (n1, n2) {
                return n1.innerY - n2.innerY
            });
            // 重置数据
            this.resetData();
            // 重绘
            view.render(this.opt, this.data, this.elements, this.container);
        },
        query: function (id) {
            if (!id) return undefined;
            return this.data.filter(function (node) {
                return node.id === id
            })[0];
        },
        add: function (node, ele) {
            var opt = this.opt;
            node.id = node.id || this.number + '-' + (++this.autoIncrement);
            this.data.push(node);
            this.elements.push(ele);
            node.innerY = node.innerY !== undefined ? node.innerY : this.data.length * (opt.nodeH + opt.padding);
            return node;
        },
        remove: function (node) {
            if (!node) return;
            this.data.forEach(function (n, idx, arr) {
                n.id === node.id && arr.splice(idx, 1);
            });
            this.elements.forEach(function (ele, idx, arr) {
                var id = ele.getAttribute(DK_ID);
                if (id === "" || id === node.id) {
                    arr.splice(idx, 1);
                }
            });
            view.remove(this.container, node.id);
        },
        addPlaceHolder: function (node) {
            if (!node) return;
            var placeholder = utils.clone(node);
            placeholder.type = PLACEHOLDER;
            var element = view.create(placeholder);
            this.elements.push(element);
            this.container.appendChild(element);
        },
        removePlaceHolder: function (node) {
            if (!node) return;
            this.elements.forEach(function (ele, idx, arr) {
                ele.classList.contains(DK_ITEM_PLACEHOLDER) && arr.splice(idx, 1);
            });
            view.remove(this.container, node.id, DK_ITEM_PLACEHOLDER);
        },
        showPromptText(isShow, isDrag) {
            this.opt.isShowPromptText = (isShow && isDrag) || false;
            view.setContainerParam(this.opt, this.data, this.container);
        }
    };

    // 构建实例
    function instance(options, container, originData) {
        if (container && !container.hasAttribute(DK_ID)) {
            // 初始化监听
            handleEvent.init(true, document.body);
            // 初始化缓存
            cache.init();
            // 初始化实例
            var index = cache.index();
            container.setAttribute(DK_ID, index);
            return cache.set(new DragKit(options, container, originData, index));
        }
    }

    // 销毁实例
    function destroy(dragkit) {
        delete cache[dragkit.opt.container.getAttribute(DK_ID)];
        dragkit.destroy();
        dragkit = null;
    }

    dragkit = {
        version: "1.0.0",
        instance: instance,
        destroy: destroy
    };

    return dragkit;
});
