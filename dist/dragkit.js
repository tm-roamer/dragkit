/**
 * 描述: 简易的拖拽小插件
 * 兼容性: ie11+
 * 支持: commonjs和requirejs与seajs
 */
;(function(parent, fun) {
    if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
        module.exports = fun();
    } else if (typeof define === 'function'
        && (typeof define.amd === 'object' || typeof define.cmd === 'object')) {
        define(fun);
    } else {
        parent.dragkit = fun();
    }
})(window, function(dk) {
    'use strict';

    // 配置对象 
    // 常量
    var THROTTLE_TIME = 14, // 节流函数的间隔时间单位ms, FPS = 1000 / THROTTLE_TIME
        DK_CONTAINER = 'dk-container', // 拖拽容器classname
        DK_START_CONTAINER = 'dk-start-container', // 跨容器拖拽时开始容器的classname
        DK_ID = 'data-dk-id', // 拖拽节点的数据标识id
        DK_NODE_INFO = 'data-dk-node-info', // 待新增拖拽节点携带的数据
        DK_ITEM = 'dk-item', // 拖拽节点classname
        DK_ANIMATE_ITEM = 'dk-animate-item', // 拖拽节点的动画效果classname
        DK_GRAG_DROP_ITEM = 'dk-dragdrop-item', // 正在拖拽的节点classname
        DK_ADD_ITEM = 'dk-add-item', // 拖入容器待添加节点的classname
        DK_CROSS_ITEM = 'dk-cross-item', // 跨容器待添加的节点classname
        DK_DELETE_ITEM = 'dk-delete-item', // 拖出容器待删除节点的classname
        DK_COVER_ITEM = 'dk-cover-item', // 节点被覆盖的样式classname
        DK_PLACEHOLDER_ITEM = 'dk-placeholder-item', // 拖拽节点的占位符
        DK_ITEM_CONTENT = 'dk-item-content', // 拖拽节点的展示内容区div的classname
        DK_ITEM_PROMPT_TEXT = 'dk-item-prompt-text', // 占位的提示文字
        DK_DELETE_ITEM_ICO = 'dk-delete-item-ico' // 节点悬停显示的删除图标classname

    // 默认设置
    var f = function() {},
        setting = {
            className: '', // 自定义换肤class
            maxNodeNum: 4, // 容器最多节点数量
            nodeH: 24, // 单个节点的宽高
            isCoverNode: true, // 是否可以覆盖节点
            containerInHitScale: 0.6, // 进入容器时碰撞重叠比例
            containerOutHitScale: 0.6, // 离开容器时碰撞重叠比例
            coverNodeScale: 0.7, // 节点覆盖重叠的比例值
            isShowPromptText: false, // 是否显示提示文字, 默认不显示
            padding: 5, // 节点块之间的间距, 默认都为5px
            distance: 5, // 触发拖拽的拖拽距离,默认5px
            editNode: f, // 回调函数, 更新节点
            addNode: f, // 回调函数, 添加节点
            deleteNode: f, // 回调函数, 删除节点
            onLoad: f, // 回调函数, 渲染触发
            onClick: f, // 回调函数, 点击事件
        };



    // 工具对象 
    // 工具类
    var utils = {
        // 属性拷贝
        extend: function(mod, opt) {
            if (!opt) return mod;
            var conf = {};
            for (var attr in mod)
                conf[attr] = typeof opt[attr] !== "undefined" ? opt[attr] : mod[attr];
            return conf;
        },
        // 克隆节点
        clone: function(node) {
            var obj = {};
            for (var attr in node)
                if (node.hasOwnProperty(attr))
                    obj[attr] = node[attr];
            return obj;
        },
        // 节流函数
        throttle: function(now) {
            var time = new Date().getTime();
            this.throttle = function(now) {
                if (now - time > THROTTLE_TIME) {
                    time = now;
                    return true;
                }
                return false;
            };
            this.throttle(now);
        },
        // 检测矩形碰撞(重叠)
        checkHit: function(container, node, state, scale) {

            if ((container.x + container.w > node.x) && (container.x < node.x + node.w)) {
                if ((container.y + container.h > node.y) && (container.y < node.y + node.h)) {

                    // if (container.x + container.w < node.x + node.w) {
                    //
                    // }
                    // else if (container.x + container.w < node.x + node.w) {
                    //
                    // }

                    return true;
                }
            }
            return false;
        },
        // 进行所有的容器的矩形碰撞(重叠)
        checkContainerHit: function(offsetX, offsetY, dragElement, state, event) {
            // 拖拽节点的当前坐标
            var node = {
                x: event.pageX - offsetX,
                y: event.pageY - offsetY,
                w: dragElement.clientWidth,
                h: dragElement.clientHeight
            };
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
                if (this.checkHit(containerCoord, node, state))
                    return {
                        isContainerHit: true,
                        currentDragkit: dragkit,
                        dragNodeCoord: node
                    };
            }
            return {
                isContainerHit: false,
                dragNodeCoord: node
            };
        },
        // 进行容器内所有节点的碰撞检测(点与线段的碰撞)
        checkNodeHit: function(arr, node, opt) {
            if (arr && arr.length > 0) {
                for (var i = 0; i < arr.length; i++) {
                    var n = arr[i];
                    var scale = parseInt(opt.nodeH * opt.coverNodeScale);
                    if ((n.innerY < node.y) && (node.y < n.innerY + scale)) {
                        return {
                            isNodeHit: true,
                            coveredNode: n
                        };
                    }
                }
            }
            return {
                isNodeHit: false,
                coveredNode: undefined
            };
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

    // 碰撞检测 
    var conllision = {

    };


    // 缓存对象 
    // 拖拽对象的缓存对象
    var cache = {
        init: function() {
            if (!this.arr)
                this.arr = [];
        },
        get: function(idx) {
            // 避免0的情况, if条件判断麻烦
            return this.arr[idx - 1];
        },
        set: function(obj) {
            this.arr.push(obj);
            return obj;
        },
        index: function() {
            return this.arr.length + 1;
        }
    };


    // 视图对象 
    // 展示对象, 操作DOM
    var view = {
        setContainerParam: function(opt, data, container) {
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
        searchUp: function(node, className) {
            if (!node || node === document.body || node === document) return undefined; // 向上递归到顶就停
            if (node.classList.contains(className)) return node;
            return this.searchUp(node.parentNode, className);
        },
        getOffset: function(node, offset, parent) {
            if (!parent)
                return node.getBoundingClientRect();
            offset = offset || {
                top: 0,
                left: 0
            };
            if (node === null || node === parent) return offset;
            offset.top += node.offsetTop;
            offset.left += node.offsetLeft;
            return this.getOffset(node.offsetParent, offset, parent);
        },
        init: function(data, opt, container) {
            var self = this,
                elements = {},
                fragment = document.createDocumentFragment();
            if (data && data.length > 0) {
                data.forEach(function(node, idx) {
                    var ele = self.create(node);
                    elements[node.id] = ele;
                    fragment.appendChild(ele);
                });
                this.setContainerParam(opt, data, container);
                container.appendChild(fragment);
            }
            return elements;
        },
        create: function(node, className) {
            var content = document.createElement("div"),
                ele = document.createElement("div");
            content.className = DK_ITEM_CONTENT;
            content.innerHTML = node.text;
            ele.appendChild(content);
            ele.className = className || DK_ITEM + ' ' + DK_ANIMATE_ITEM;
            ele.setAttribute(DK_ID, node.id || '');
            ele.style.cssText = this.setStyleTop(node.innerY);
            // 节点悬停时需要显示删除图标
            node.id && this.appendDelIco(ele, node.id);
            return ele;
        },
        remove: function(container, id, className) {
            className = className || DK_ITEM;
            var attrSelector = id ? '[' + DK_ID + '="' + (id || '') + '"]' : '';
            var delElement = container.querySelector('div.' + className + attrSelector);
            delElement && container.removeChild(delElement);
        },
        render: function(opt, data, elements, container) {
            for (var id in elements) {
                if (elements.hasOwnProperty(id)) {
                    var ele = elements[id];
                    if (!ele.classList.contains(DK_GRAG_DROP_ITEM)) {
                        var node = data.filter(function(n) {
                            return n.id === ele.getAttribute(DK_ID)
                        })[0];
                        ele.style.cssText = this.setStyleTop(node.innerY);
                    }
                }
            }
            this.setContainerParam(opt, data, container);
        },
        setStyleTop: function(top) {
            return ';top:' + top + 'px;';
        },
        appendDelIco: function(ele, id) {
            var delIco = document.createElement("div");
            delIco.className = DK_DELETE_ITEM_ICO;
            delIco.innerHTML = '\u2715';
            delIco.setAttribute(DK_ID, id);
            ele.appendChild(delIco);
        }
    };

    // 监听对象 
    // 事件处理对象
    var handleEvent = {
        init: function(isbind) {
            if (this.isbind) return;
            this.isbind = isbind;
            this.globalUnbind();
            this.globalBind();
        },
        globalBind: function() {
            document.addEventListener('mousedown', this.mouseDown, false);
            document.addEventListener('mousemove', this.mouseMove, false);
            document.addEventListener('mouseup', this.mouseUp, false);
            document.addEventListener('click', this.click, true);
            this.isbind = true;
        },
        globalUnbind: function() {
            document.removeEventListener('mousedown', this.mouseDown, false);
            document.removeEventListener('mousemove', this.mouseMove, false);
            document.removeEventListener('mouseup', this.mouseUp, false);
            document.removeEventListener('click', this.click, true);
            this.isbind = false;
        },
        mouseDown: function(event) {
            // 点击删除图标, 删除节点
            if (event.target.classList.contains(DK_DELETE_ITEM_ICO)) {
                this.isDragDeleteNode = true;
            }
            // 正在拖拽情况
            else {
                // 记录位置, 通过比较拖拽距离来判断是否是拖拽, 如果是拖拽则阻止冒泡. 不触发点击事件
                this.distanceX = event.pageX;
                this.distanceY = event.pageY;
                this.distance = dragdrop.dragStart(event);
            }
        },
        mouseMove: function(event) {
            dragdrop.drag(event);
        },
        mouseUp: function(event) {
            // 点击删除图标, 删除节点
            if (this.isDragDeleteNode) {
                var target = event.target,
                    dragkit = utils.getDom2Dragkit(target);
                if (dragkit) {
                    dragkit.remove({
                        id: target.getAttribute(DK_ID)
                    });
                    dragkit.layout();
                    this.isDragDeleteNode = undefined;
                }
            }
            // 正常拖拽情况
            else {
                dragdrop.dragEnd(event);
            }
        },
        click: function(event) {
            if (this.distance) {
                // 比较拖拽距离, 判断是否拖拽, 如果是拖拽则阻止冒泡. 不触发点击事件
                var distanceX = Math.abs(event.pageX - this.distanceX || 0),
                    distanceY = Math.abs(event.pageY - this.distanceY || 0);
                if ( (this.distance <= distanceX || this.distance <= distanceY) ) {
                    event.stopPropagation();
                    // 清理临时变量
                    this.distance = undefined;
                    this.distanceX = undefined;
                    this.distanceY = undefined;
                }
            }
        }
    };


    // 拖拽对象 
    // 拖拽的工具对象
    var dragdrop = {
        state: {},
        // 开始拖拽
        dragStart: function(event) {
            // 是否点击了拖拽节点
            var ele = view.searchUp(event.target, DK_ITEM);
            if (!ele) return;
            this.isDrag = true;
            // @fix 需支持子节点情况, 鼠标悬停位置与当前拖拽节点坐标的偏移
            this.offsetX = event.offsetX || 0;
            this.offsetY = event.offsetY || 0;
            // 容器外点击待新增节点
            if (ele.classList.contains(DK_ADD_ITEM)) {
                this.state.isDragAddNode = true; // 状态 新增节点
                this.state.inside = false; // 状态 容器外
                this.copyDragElement(event, true, ele);
            }
            // 容器内点击节点
            else {
                this.state.inside = true; // 状态 容器内
                // 获取拖拽对象
                var dragkit = utils.getDom2Dragkit(ele);
                dragkit.container.classList.add(DK_START_CONTAINER);
                this.startDragkit = this.dragkit = dragkit;
                this.copyDragElement(event, false, ele, dragkit);
                return dragkit.opt.distance;
            }
        },
        // 复制拖拽节点
        copyDragElement: function(event, isDragAddNode, ele, dragkit) {
            if (isDragAddNode) {
                this.dragNode = JSON.parse(ele.getAttribute(DK_NODE_INFO));
                if (this.dragNode) {
                    this.dragElement = view.create(this.dragNode);
                    this.dragElement.className = DK_ITEM + ' ' + DK_ADD_ITEM + ' ' + DK_GRAG_DROP_ITEM;
                }
            } else {
                var id = ele.getAttribute(DK_ID);
                // 被选中的节点
                dragkit.elements[id].classList.add(DK_PLACEHOLDER_ITEM);
                // 复制节点数据
                this.dragNode = utils.clone(dragkit.query(id));
                // 复制节点dom
                this.dragElement = dragkit.elements[id].cloneNode(true);
                this.dragElement.className = DK_ITEM + ' ' + DK_GRAG_DROP_ITEM;
            }
            // 移动复制节点
            this.moveDragElement(event);
            document.body.appendChild(this.dragElement);
        },
        // 移动拖拽节点
        moveDragElement: function(event) {
            var x = event.pageX - this.offsetX;
            var y = event.pageY - this.offsetY;
            this.dragElement && (this.dragElement.style.cssText = 'top:' + y + 'px;left:' + x + 'px;');
        },
        // 正在拖拽
        drag: function(event) {
            // 拖拽状态, 拖拽元素
            if (!this.isDrag && !this.dragNode) return;
            // 函数节流
            if (!utils.throttle(new Date().getTime())) return;
            // 移动拖拽节点
            this.moveDragElement(event);
            // 拖拽节点与容器的碰撞检测
            var hit = utils.checkContainerHit(this.offsetX, this.offsetY, this.dragElement, this.state, event);
            // @fix 临时
            this.dragNodeCoord = hit.dragNodeCoord;
            // 根据碰撞结果判断是否进入容器
            if (hit.isContainerHit) {
                // 判断进入
                if (!this.state.inside) {
                    this.dragEnterContainer(hit.currentDragkit);
                    this.dragkit = hit.currentDragkit;
                    this.state.inside = true;
                }
                this.dragStayContainer(this.dragkit);
            } else {
                // 判断离开
                if (this.state.inside) {
                    this.dragLeaveContainer(this.dragkit);
                    this.state.inside = false;
                }
            }
        },
        // 拖拽进入容器
        dragEnterContainer: function(currentDragkit) {
            // 隐藏删除图标
            this.state.isDragDeleteNode = false;
            this.dragElement.classList.remove(DK_DELETE_ITEM);
            // 检测是否切换容器
            this.state.isDragCrossNode = (this.startDragkit && this.startDragkit !== currentDragkit);
            if (this.state.isDragAddNode || this.state.isDragCrossNode) {
                // 容器没有超量的情况下, 才会添加
                if (currentDragkit.data.length < currentDragkit.opt.maxNodeNum) {
                    // 添加节点
                    currentDragkit.add(this.dragNode, this.dragElement);
                    currentDragkit.elements[this.dragNode.id].classList.add(DK_PLACEHOLDER_ITEM);
                    this.state.isPlaceHolderNode = true;
                } else {
                }
            }
            console.log('enter');
        },
        // 在容器内停留(反复触发)
        dragStayContainer: function(dragkit) {
            // 覆盖情况: 配置允许覆盖, 节点数量等于大于配置最大节点数, 且不是占位符, 且新增或跨容器添加
            if (dragkit.opt.isCoverNode
                && dragkit.data.length >= dragkit.opt.maxNodeNum
                && !this.state.isPlaceHolderNode
                && (this.state.isDragAddNode || this.state.isDragCrossNode)) {
                // 节点碰撞
                var containerTop = view.getOffset(dragkit.container).top;
                var y = this.dragNodeCoord.y - containerTop;
                var nodeHit = utils.checkNodeHit(dragkit.data, {
                    y: y
                }, dragkit.opt);
                if (nodeHit.isNodeHit) {
                    this.state.isDragCoverNode = true;
                    this.dragCoveredNode = nodeHit.coveredNode;
                    this.setCoverNodeStyle(dragkit, this.dragCoveredNode);
                } else {
                    this.state.isDragCoverNode = false;
                    return this.setCoverNodeStyle(dragkit);
                }
            }
            // @fix 应用布局
            this.applyLayout(this.dragNode, dragkit);
        },
        // 拖拽离开容器
        dragLeaveContainer: function(dragkit) {
            if (!this.state.isDragAddNode) {
                // 显示删除图标
                this.state.isDragDeleteNode = true;
                this.dragElement.classList.add(DK_DELETE_ITEM);
            }
            if (this.state.isDragAddNode || this.state.isDragCrossNode) {
                dragkit.remove(this.dragNode);
                dragkit.layout();
                this.state.isPlaceHolderNode = false;
            }
            if (this.state.isDragCoverNode) {
                this.state.isDragCoverNode = false;
                return this.setCoverNodeStyle(dragkit);
            }
            console.log('leave');
        },
        // 应用布局
        applyLayout: function(node, dragkit) {
            var containerTop = view.getOffset(dragkit.container).top;
            // 当鼠标位置转换成容器内排版坐标
            dragkit.layout(node, this.dragNodeCoord.y - containerTop);
        },
        setCoverNodeStyle: function(dragkit, coveredNode) {
            var elements = dragkit.elements;
            for (var id in elements) {
                if (elements.hasOwnProperty(id)) {
                    if (coveredNode && elements[id].getAttribute(DK_ID) === coveredNode.id) {
                        elements[id].classList.add(DK_COVER_ITEM)
                    } else {
                        elements[id].classList.remove(DK_COVER_ITEM)
                    }
                }
            }
        },
        // 结束拖拽
        dragEnd: function(event) {
            if (this.isDrag) {
                // 删除节点
                if (this.state.isDragDeleteNode) {
                    this.dragkit.remove(this.dragNode);
                    this.dragkit.layout();
                }
                // 清除占位符
                var id = this.dragNode && this.dragNode.id,
                    ele = id && this.dragkit.elements[id];
                ele && ele.classList.remove(DK_PLACEHOLDER_ITEM);
                // 覆盖节点
                if (this.state.isDragCoverNode) {
                    // console.log(this.dragCoveredNode, this.dragNode);
                    this.dragCoveredNode && this.dragkit.cover(this.dragCoveredNode, this.dragNode);
                    delete this.dragCoveredNode;
                }
                // 跨容器移动节点
                if (this.state.isDragCrossNode) {
                    // 删除之前容器的节点
                    this.startDragkit.remove(this.dragNode);
                    this.startDragkit.layout();
                }
                // 新增节点时没有设置id
                view.remove(document.body, (this.state.isDragAddNode ? '' : id), DK_GRAG_DROP_ITEM);
            }
            // 清理临时样式
            this.startDragkit && this.startDragkit.container.classList.remove(DK_START_CONTAINER);
            // 清理临时变量
            this.state = {};
            delete this.isDrag;
            delete this.dragkit;
            delete this.startDragkit;
            delete this.dragNode;
            delete this.dragElement;
            // 清理临时坐标
            delete this.offsetX;
            delete this.offsetY;
            delete this.dragNodeCoord;
        }
    };

    // api接口 
    // 拖拽对象
    function DragKit(options, container, originData, number) {
        this.init(options, container, originData, number);
    }

    // 拖拽对象原型
    DragKit.prototype = {
        constructor: DragKit,
        init: function(options, container, originData, number) {
            this.number = number; // 拖拽对象的编号
            this.autoIncrement = 0; // 节点的自增主键
            this.opt = utils.extend(setting, options); // 配置项
            this.container = container; // 容器DOM
            this.originData = originData; // 原始数据
            this.data = this.setData(originData); // 渲染数据
            this.elements = view.init(this.data, this.opt, this.container); // 缓存的节点DOM
        },
        destroy: function() {
            // 注销
        },
        setData: function(originData) {
            var data = [],
                opt = this.opt,
                self = this;
            originData.forEach(function(node, idx) {
                data[idx] = {
                    id: self.number + '-' + (++self.autoIncrement),
                    text: node.text,
                    innerY: idx * (opt.nodeH + opt.padding)
                };
            });
            return data;
        },
        resetData: function() {
            var opt = this.opt;
            this.data.forEach(function(node, idx) {
                node.innerY = idx * (opt.nodeH + opt.padding);
            });
            return this.data;
        },
        layout: function(dragNode, innerY) {
            var node = (dragNode && this.query(dragNode.id));
            node && (node.innerY = innerY);
            // 排序
            this.data.sort(function(n1, n2) {
                return n1.innerY - n2.innerY
            });
            // 重置
            this.resetData();
            // 重绘
            view.render(this.opt, this.data, this.elements, this.container);
        },
        query: function(id) {
            if (!id) return undefined;
            return this.data.filter(function(node) {
                return node.id === id
            })[0];
        },
        add: function(node) {
            var opt = this.opt;
            node.id = node.id || this.number + '-' + (++this.autoIncrement);
            node.innerY = node.innerY !== undefined ? node.innerY : this.data.length * (opt.nodeH + opt.padding);
            this.data.push(node);
            var ele = view.create(node);
            this.elements[node.id] = ele;
            this.container.appendChild(ele);
            return node;
        },
        remove: function(node) {
            if (!(node && node.id)) return;
            this.data.forEach(function(n, idx, arr) {
                n.id === node.id && arr.splice(idx, 1);
            });
            delete this.elements[node.id];
            view.remove(this.container, node.id);
        },
        update: function(oldNode, newNode) {},
        // 覆盖
        cover: function(oldNode, newNode) {
            newNode.innerY = oldNode.innerY; // 同步位置
            this.remove(oldNode);
            this.add(newNode);
            this.layout();
        },
        showPromptText: function(isShow, isDrag) {
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

    dk = {
        version: "1.1.0",
        instance: instance,
        destroy: destroy
    };

    return dk;
});