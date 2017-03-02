
// 拖拽的工具对象
var dragdrop = {
    state: {},
    init: function() {
        this.dragNode = null;
        this.dragElement = view.create({}, {}, DK_HIDE_ITEM);
        document.body.appendChild(this.dragElement);
    },
    // 开始拖拽
    dragStart: function (event, ele, ck) {
        this.isDrag = true;
        // @fix 需支持子节点情况, 鼠标悬停位置与当前拖拽节点坐标的偏移
        this.offsetX = event.offsetX || 0;
        this.offsetY = event.offsetY || 0;
        // 容器外点击待新增节点
        if (ele.classList.contains(DK_ADD_ITEM)) {
            this.state.isDragAddNode = true;    // 状态 新增节点
            this.state.inside = false;          // 状态 容器外
            this.copyDragElement(ele);
        }
        // 容器内点击节点
        else {
            this.state.inside = true;           // 状态 容器内
            // 获取拖拽对象
            var dragkit = utils.getDom2Dragkit(ele);
            dragkit.container.classList.add(DK_START_CONTAINER);
            this.startDragkit = this.dragkit = dragkit;
            this.copyDragElement(ele);
            ck && ck(dragkit.opt.distance);
        }
        // 移动复制节点
        this.moveDragElement(event);
    },
    // 复制拖拽节点
    copyDragElement: function (ele) {
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
        var opt = this.dragkit ? this.dragkit.opt : {showFieldName: setting.showFieldName};
        view.update(this.dragNode, this.dragElement, opt, className);
        view.show(this.dragElement);
    },
    // 移动拖拽节点
    moveDragElement: function (event) {
        var x = event.pageX - this.offsetX;
        var y = event.pageY - this.offsetY;
        this.dragElement && (this.dragElement.style.cssText = 'top:' + y + 'px;left:' + x + 'px;');
    },
    // 正在拖拽
    drag: function (event) {
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
    dragEnterContainer: function (currentDragkit) {
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
    dragLeaveContainer: function (dragkit) {
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
    applyLayout: function (node, dragkit) {
        var containerTop = view.getOffset(dragkit.container).top;
        // 当鼠标位置转换成容器内排版坐标
        dragkit.layout(node, this.dragNodeCoord.y - containerTop);
    },
    setCoverNodeStyle: function (dragkit, coveredNode) {
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
    dragEnd: function (event) {
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