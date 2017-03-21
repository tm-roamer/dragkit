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
        DK_USER_SELECT = "dk-user-select", // 拖拽进行中, 在body标签动态绑定, 防止文本选中
        DK_CONTAINER = 'dk-container', // 拖拽容器classname
        DK_START_CONTAINER = 'dk-start-container', // 跨容器拖拽时开始容器的classname
        DK_ID = 'data-dk-id', // 拖拽节点的数据标识id
        DK_TEXT = 'data-dk-text', // 拖拽节点的显示字段
        DK_NODE_INFO = 'data-dk-node-info', // 待新增拖拽节点携带的数据
        DK_ITEM = 'dk-item', // 拖拽节点classname
        DK_SHOW_ITEM = 'dk-show-item', // 拖拽节点显示classname
        DK_HIDE_ITEM = 'dk-hide-item', // 拖拽节点隐藏classname
        DK_ANIMATE_ITEM = 'dk-animate-item', // 拖拽节点的动画效果classname
        DK_GRAG_DROP_ITEM = 'dk-dragdrop-item', // 正在拖拽的节点classname
        DK_ADD_ITEM = 'dk-add-item', // 拖入容器待添加节点的classname
        DK_CROSS_ITEM = 'dk-cross-item', // 跨容器待添加的节点classname
        DK_DELETE_ITEM = 'dk-delete-item', // 拖出容器待删除节点的classname
        DK_COVER_ITEM = 'dk-cover-item', // 节点被覆盖的样式classname
        DK_PLACEHOLDER_ITEM = 'dk-placeholder-item', // 拖拽节点的占位符
        DK_ITEM_CONTENT = 'dk-item-content', // 拖拽节点的展示内容区div的classname
        DK_ITEM_PROMPT_TEXT = 'dk-item-prompt-text', // 占位的提示文字
        DK_DELETE_ITEM_ICO = 'dk-delete-item-ico'; // 节点悬停显示的删除图标classname

    // 默认设置
    var f = function() {},
        setting = {
            className: '', // 自定义换肤class
            showFieldName: 'text', // 节点默认显示字段的属性名
            maxNodeNum: 4, // 容器最多节点数量
            nodeH: 24, // 单个节点的宽高
            isCoverNode: true, // 是否可以覆盖节点
            hitScale: 0.6, // 容器碰撞的面积重叠比例
            coverNodeScale: 0.7, // 节点覆盖重叠的比例值
            isShowPromptText: false, // 是否显示提示文字, 默认不显示
            padding: 5, // 节点块之间的间距, 默认都为5px
            distance: 5, // 触发拖拽的拖拽距离,默认5px
            onEditNode: f, // 回调函数, 更新节点
            onCoverNode: f, // 回调函数, 覆盖节点
            onAddNode: f, // 回调函数, 添加节点
            onDeleteNode: f, // 回调函数, 删除节点
            onInit: f, // 回调函数, 初始化的回调
            onLoad: f, // 回调函数, mouseup触发
            onLayout: f // 回调函数, 重新布局触发
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
        checkHit: function(container, node, inside, scale) {
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
                    // 默认包含
                    var w = n1.w,
                        h = n1.h;

                    // 左边部分接触
                    if (n1.x < n2.x)
                        w = n1.xw - n2.x;
                    // 右边部分接触
                    if (n2.xw < n1.xw)
                        w = n2.xw - n1.x;
                    // 上边部分接触
                    if (n1.y < n2.y)
                        h = n1.yh - n2.y;
                    // 下边部分接触
                    if (n2.yh < n1.yh)
                        h = n2.yh - n1.y;

                    isHit = w * h / n1.area >= scale;
                }
            }
            return isHit;
        },
        // 进行所有的容器的矩形碰撞(重叠)
        checkContainerHit: function(node, inside, scale) {
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
        // 进行容器内节点的碰撞检测(针对覆盖节点)
        checkNodeHit: function(container, arr, elements, node, coverNodeScale) {

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
        }
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
        remove: function(dk) {
            this.arr.forEach(function(obj, i, arr) {
                dk === obj && arr.splice(i, 1);
            });
        },
        index: function() {
            return this.arr.length + 1;
        },
        list: function() {
            return this.arr;
        }
    };


    // 视图对象 
    // 展示对象, 操作DOM
    var view = {
        // 转换初始化, 将初始dom转换成js对象
        dom2obj: function(container, dragkit) {
            var j = 0,
                arr = [],
                opt = dragkit.opt,
                elements = container.children;
            dragkit.elements = {};
            for (var i = 0, len = elements.length; i < len; i++) {
                var ele = elements[i];
                if (ele.classList.contains(DK_ITEM)) {
                    var temp = j++,
                        id = ele.getAttribute(DK_ID);
                    arr[temp] = {
                        id: id
                    };
                    arr[temp][opt.showFieldName] = ele.getAttribute(DK_TEXT);
                    dragkit.elements[id] = ele;
                }
            }
            return arr;
        },
        setContainerParam: function(opt, data, container) {
            var prompt = container.querySelector('.' + DK_ITEM_PROMPT_TEXT);
            var height = data.length * (opt.nodeH + opt.padding);
            if (data.length < opt.maxNodeNum && opt.isShowPromptText) {
                height = height + (opt.nodeH);
                prompt.style.cssText = 'display:block;';
            } else {
                prompt.style.cssText = 'display:none;';
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
                    var ele = self.create(node, opt);
                    elements[node.id] = ele;
                    fragment.appendChild(ele);
                });
                this.setContainerParam(opt, data, container);
                container.appendChild(fragment);
            }
            return elements;
        },
        create: function(node, opt, className) {
            var content = document.createElement("div"),
                ele = document.createElement("div");
            content.className = DK_ITEM_CONTENT;
            content.innerHTML = node[opt && opt.showFieldName] || '';
            ele.appendChild(content);
            ele.className = className || DK_ITEM + ' ' + DK_ANIMATE_ITEM;
            ele.setAttribute(DK_ID, node.id || '');
            ele.style.cssText = this.setStyleTop(node.innerY);
            // 节点悬停时需要显示删除图标(拖拽节点和待删除节点不会显示删除图标)
            node.id && this.appendDelIco(ele, node.id);
            return ele;
        },
        update: function(node, ele, opt, className) {
            if (!node) return;
            var content = ele.querySelector('.' + DK_ITEM_CONTENT);
            content.innerHTML = node[opt.showFieldName] || '';
            ele.className = className || DK_ITEM + ' ' + DK_ANIMATE_ITEM;
            ele.setAttribute(DK_ID, node.id || '');
            ele.style.cssText = this.setStyleTop(node.innerY);
            // 节点悬停时需要显示删除图标(拖拽节点和待删除节点不会显示删除图标)
            node.id && this.appendDelIco(ele, node.id);
            return ele;
        },
        show: function(ele) {
            ele.classList.remove(DK_HIDE_ITEM);
        },
        hide: function(ele) {
            ele.classList.add(DK_HIDE_ITEM);
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
            dragdrop.init();
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
            // 点击删除图标
            if (event.target.classList.contains(DK_DELETE_ITEM_ICO)) {
                return;
            }
            handleEvent.dragStart = true;
            // 记录位置, 通过比较拖拽距离来判断是否是拖拽, 如果是拖拽则阻止冒泡. 不触发点击事件
            handleEvent.distance = setting.distance;
            handleEvent.distanceX = event.pageX;
            handleEvent.distanceY = event.pageY;
            handleEvent.offsetX = event.offsetX || 0;
            handleEvent.offsetY = event.offsetY || 0;
        },
        mouseMove: function(event) {
            if (handleEvent.dragStart && handleEvent.isDrag(event)) {
                handleEvent.dragStart = false;
                document.body.classList.add(DK_USER_SELECT);
                // 是否点击了拖拽节点
                var ele = view.searchUp(event.target, DK_ITEM);
                if (!ele) return;
                dragdrop.dragStart(event, handleEvent.offsetX, handleEvent.offsetY, ele);
                return;
            }
            dragdrop.drag(event);
        },
        mouseUp: function(event) {
            document.body.classList.remove(DK_USER_SELECT);
            dragdrop.dragEnd(event);
            // 清理临时变量
            delete handleEvent.distance;
            delete handleEvent.distanceX;
            delete handleEvent.distanceY;
            delete handleEvent.offsetX;
            delete handleEvent.offsetY;
        },
        click: function(event) {
            // 点击删除图标
            if (event.target.classList.contains(DK_DELETE_ITEM_ICO)) {
                var dragkit = utils.getDom2Dragkit(event.target),
                    nodeId = event.target.getAttribute(DK_ID);
                if (!dragkit) return;
                dragkit.remove({
                    id: nodeId
                });
                dragkit.layout();
            } else {
                if (!handleEvent.dragStart && handleEvent.dragStart !== undefined) {
                    // event.preventDefault();
                    event.stopPropagation();
                    delete handleEvent.dragStart
                }
            }
        },
        isDrag: function(event) {
            var distanceX = Math.abs(event.pageX - handleEvent.distanceX || 0),
                distanceY = Math.abs(event.pageY - handleEvent.distanceY || 0);
            if (handleEvent.distance < distanceX || handleEvent.distance < distanceY) {
                return true;
            }
        }
    };


    // 拖拽对象 
    // 拖拽的工具对象
    var dragdrop = {
        state: {},
        init: function() {
            this.dragNode = null;
            this.dragElement = view.create({}, {}, DK_HIDE_ITEM);
            document.body.appendChild(this.dragElement);
        },
        // 开始拖拽
        dragStart: function(event, offsetX, offsetY, ele) {
            this.isDrag = true;
            // @fix 需支持子节点情况, 鼠标悬停位置与当前拖拽节点坐标的偏移
            var targetOffset = view.getOffset(event.target);
            var eleOffset = view.getOffset(ele);
            this.offsetX = targetOffset.left - eleOffset.left + offsetX || 0;
            this.offsetY = targetOffset.top - eleOffset.top + offsetY || 0;
            // 缓存被点击的节点
            this.ele = ele;
            // 容器外点击待新增节点
            if (ele.classList.contains(DK_ADD_ITEM)) {
                this.state.isDragAddNode = true; // 状态 新增节点
                this.state.inside = false; // 状态 容器外
                this.copyDragElement(ele);
            }
            // 容器内点击节点
            else {
                this.state.inside = true; // 状态 容器内
                // 获取拖拽对象
                var dragkit = utils.getDom2Dragkit(ele);
                dragkit.container.classList.add(DK_START_CONTAINER);
                this.startDragkit = this.dragkit = dragkit;
                this.copyDragElement(ele);
            }
            // 移动复制节点
            this.moveDragElement(event);
        },
        // 复制拖拽节点
        copyDragElement: function(ele) {
            var className;
            if (this.state.isDragAddNode) {
                className = DK_ITEM + ' ' + DK_ADD_ITEM + ' ' + DK_GRAG_DROP_ITEM;
                this.dragNode = JSON.parse(ele.getAttribute(DK_NODE_INFO));
            } else {
                className = DK_ITEM + ' ' + DK_GRAG_DROP_ITEM;
                var id = ele.getAttribute(DK_ID);
                // 被选中的节点
                this.dragkit.elements[id].classList.add(DK_PLACEHOLDER_ITEM);
                // 复制节点数据
                this.dragNode = utils.clone(this.dragkit.query(id));
            }
            var opt = this.dragkit ? this.dragkit.opt : {
                showFieldName: setting.showFieldName
            };
            view.update(this.dragNode, this.dragElement, opt, className);
            view.show(this.dragElement);
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
            // 拖拽节点的当前坐标
            var node = this.getDragElementCoord(event);
            var hit = conllision.checkContainerHit(node, this.state.inside);
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
        },
        // 在容器内停留(反复触发)
        dragStayContainer: function(dragkit) {
            // 覆盖情况: 配置允许覆盖, 节点数量等于大于配置最大节点数, 且不是占位符, 且新增或跨容器添加
            if (dragkit.opt.isCoverNode
                && dragkit.data.length >= dragkit.opt.maxNodeNum
                && !this.state.isPlaceHolderNode
                && (this.state.isDragAddNode || this.state.isDragCrossNode)) {
                // 拖拽节点的当前坐标
                var node = this.getDragElementCoord(event);
                var nodeHit = conllision.checkNodeHit(dragkit.container,
                    dragkit.data, dragkit.elements, node, dragkit.opt.coverNodeScale);
                if (nodeHit.isNodeHit) {
                    this.state.isDragCoverNode = true;
                    this.dragCoveredNode = nodeHit.coveredNode;
                    this.setCoverNodeStyle(dragkit, this.dragCoveredNode);
                } else {
                    this.state.isDragCoverNode = false;
                    return this.setCoverNodeStyle(dragkit);
                }
            }
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
        // 拖拽节点的当前坐标
        getDragElementCoord: function(event) {
            return {
                x: event.pageX - this.offsetX,
                y: event.pageY - this.offsetY,
                w: this.dragElement.clientWidth,
                h: this.dragElement.clientHeight
            };
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
                    ele = id && this.dragkit && this.dragkit.elements[id];
                ele && ele.classList.remove(DK_PLACEHOLDER_ITEM);
                // 覆盖节点
                if (this.state.isDragCoverNode) {
                    this.dragCoveredNode && this.dragkit.cover(this.dragCoveredNode, this.dragNode);
                    delete this.dragCoveredNode;
                }
                // 跨容器移动节点
                if (this.state.isDragCrossNode) {
                    // 删除之前容器的节点
                    this.startDragkit.remove(this.dragNode);
                    this.startDragkit.layout();
                }
                // 隐藏拖拽节点
                view.hide(this.dragElement);
                // 回调函数
                this.dragkit && this.dragkit.opt.onLoad && this.dragkit.opt.onLoad(this.dragkit)
            }
            // 清理临时样式
            this.startDragkit && this.startDragkit.container.classList.remove(DK_START_CONTAINER);
            // 清理临时变量
            this.state = {};
            delete this.ele;
            delete this.isDrag;
            delete this.dragkit;
            delete this.startDragkit;
            delete this.dragNode;
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
            if (originData) {
                this.originData = originData; // 原始数据
                this.data = this.setData(originData); // 渲染数据
                this.elements = view.init(this.data, this.opt, this.container); // 缓存的节点DOM
            } else {
                this.data = [];
                this.elements = {};
                var arr = view.dom2obj(container, this);
                if (arr && arr.length > 0) {
                    this.data = this.setData(arr);
                    view.render(this.opt, this.data, this.elements, this.container);
                    // 回调函数
                    this.opt.onInit && this.opt.onInit(this, this.data);
                }
            }
        },
        destroy: function() {
            delete this.number;
            delete this.autoIncrement;
            delete this.opt;
            delete this.data;
            delete this.elements;
            delete this.container;
        },
        setData: function(originData) {
            var data = [],
                opt = this.opt,
                self = this;
            originData.forEach(function(node, idx) {
                data[idx] = {
                    id: self.number + '-' + (++self.autoIncrement),
                    innerY: idx * (opt.nodeH + opt.padding)
                };
                data[idx][opt.showFieldName] = node[opt.showFieldName];
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
            // @fix 只有真正坐标发生改变才会触发render 节流
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
            // 回调函数
            this.opt.onLayout && this.opt.onLayout(this, this.data);
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
            var ele = view.create(node, opt);
            this.elements[node.id] = ele;
            this.container.appendChild(ele);
            // 回调函数
            this.opt.onAddNode && this.opt.onAddNode(this, node);
            return node;
        },
        update: function(oldId, newId) {
            var node = this.query(oldId);
            node.id = newId;
            var ele = this.elements[oldId];
            ele.setAttribute(DK_ID, newId);
            var delIco = ele.querySelector('.' + DK_DELETE_ITEM_ICO);
            delIco && delIco.setAttribute(DK_ID, newId || '');
            this.elements[newId] = ele;
            delete this.elements[oldId];
            // 回调函数
            this.opt.onEditNode && this.opt.onEditNode(this, newId);
            return node;
        },
        remove: function(node) {
            var rmNode = utils.clone(node);
            if (!(node && node.id)) return;
            this.data.forEach(function(n, idx, arr) {
                n.id === node.id && arr.splice(idx, 1);
            });
            delete this.elements[node.id];
            view.remove(this.container, node.id);
            // 回调函数
            this.opt.onDeleteNode && this.opt.onDeleteNode(this, rmNode);
        },
        // 覆盖
        cover: function(oldNode, newNode) {
            newNode.innerY = oldNode.innerY; // 同步位置
            this.remove(oldNode);
            this.add(newNode);
            this.layout();
            // 回调函数
            this.opt.onCoverNode && this.opt.onCoverNode(this);
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
        if (dragkit) {
            dragkit.container.removeAttribute(DK_ID);
            cache.remove(dragkit);
            dragkit.destroy();
            dragkit = null;
        }
    }

    dk = {
        version: "1.1.3",
        instance: instance,
        destroy: destroy,
        get: function(dom) {
            return utils.getDom2Dragkit(dom);
        },
        list: function() {
            return cache.list();
        }
    };

    return dk;
});