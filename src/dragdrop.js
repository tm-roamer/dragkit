// 拖拽的工具对象
var dragdrop = {
    state: {},
    // 开始拖拽
    dragStart: function (event) {
        // 是否点击了拖拽节点
        var ele = view.searchUp(event.target, DK_ITEM);
        if (!ele) return;
        this.isDrag = true;
        // @fix 需支持子节点情况, 鼠标悬停位置与当前拖拽节点坐标的偏移
        this.offsetX = event.offsetX || 0;
        this.offsetY = event.offsetY || 0;
        // 容器外点击待新增节点
        if (ele.classList.contains(DK_ADD_ITEM)) {
            this.state.isDragAddNode = true;    // 状态 新增节点
            this.state.inside = false;          // 状态 容器外
            this.copyDragElement(event, true, ele);
        }
        // 容器内点击节点
        else {
            this.state.inside = true;           // 状态 容器内
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
    moveDragElement: function (event) {
        var x = event.pageX - this.offsetX;
        var y = event.pageY - this.offsetY;
        this.dragElement.style.cssText = 'top:' + y + 'px;left:' + x + 'px;';
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
        var hit = utils.checkContainerHit(this.offsetX, this.offsetY, this.dragElement, this.state, event);
        // @fix 临时
        this.dragNodeCoord  = hit.dragNodeCoord;
        // 根据碰撞结果判断是否进入容器
        if (hit.isContainerHit) {
            // 判断进入
            if (!this.state.inside) {
                this.dragEnterContainer(hit.currentDragkit);
                this.dragkit = hit.currentDragkit;
                this.state.inside = true;
            }
        } else {
            // 判断离开
            if (this.state.inside) {
                this.dragLeaveContainer(this.dragkit);
                this.state.inside = false;
            }
        }
        // @fix 应用布局
        if (hit.isContainerHit) {
            this.applyLayout(this.dragNode, this.dragkit);
            // // 容器超量的情况会执行覆盖
            // else {
            //     // 允许覆盖, 并且无法再添加节点时
            //     if (dragkit.opt.isCoverNode && !dragkit.query(this.dragNode.id)) {
            //         var containerTop = view.getOffset(dragkit.container).top;
            //         var y = this.dragNodeCoord.y - containerTop;
            //         var nodeHit = utils.checkNodeHit(dragkit.data, {y: y}, dragkit.opt);
            //         this.state.isDragCrossNode = nodeHit.isNodeHit;
            //         this.dragCoveredNode = nodeHit.coveredNode;
            //         if (nodeHit.isNodeHit) {
            //             this.setCoverElementStyle(nodeHit.coveredNode);
            //         }
            //     }
            // }
        }
    },
    // 拖拽进入容器
    dragEnterContainer: function(currentDragkit) {
        // 隐藏删除图标
        this.state.isDragDeleteNode = false;
        this.dragElement.classList.remove(DK_DELETE_ITEM);

        // if (this.state.isDragAddNode) {
        // } else {
        // }

        // 检测是否切换容器
        this.state.isDragCrossNode = (this.startDragkit && this.startDragkit !== currentDragkit);
        if (this.state.isDragAddNode || this.state.isDragCrossNode) {
            // 容器没有超量的情况下, 才会添加
            if (currentDragkit.data.length < currentDragkit.opt.maxNodeNum) {
                // 添加节点
                currentDragkit.add(this.dragNode, this.dragElement);
                currentDragkit.elements[this.dragNode.id].classList.add(DK_PLACEHOLDER_ITEM);
            }
        }
        console.log('enter');
    },
    // 拖拽离开容器
    dragLeaveContainer: function(currentDragkit) {
        if (this.state.isDragAddNode) {
        } else {
            // 显示删除图标
            this.state.isDragDeleteNode = true;
            this.dragElement.classList.add(DK_DELETE_ITEM);
        }
        if (this.state.isDragCrossNode) {
            currentDragkit.remove(this.dragNode);
            currentDragkit.layout();
        }
        console.log('leave');
    },
    // 结束拖拽
    dragEnd: function (event) {
        if (this.isDrag) {
            var id = this.dragNode && this.dragNode.id;
            id && this.dragkit.elements[id].classList.remove(DK_PLACEHOLDER_ITEM);
            // 删除节点
            if (this.state.isDragDeleteNode) {
                this.dragkit.remove(this.dragNode);
                this.dragkit.layout();
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
        delete this.currentDragkit;
        delete this.dragNode;
        // 清理临时坐标
        delete this.offsetX;
        delete this.offsetY;
        delete this.dragNodeCoord;
    },
    dragEndCoverNode: function (event) {
        // debugger;
        this.dragNode.innerY = this.dragCoveredNode.innerY;
        // 删除被覆盖节点
        this.dragkit.remove(this.dragCoveredNode);
        // 添加覆盖节点
        this.dragkit.add(this.dragNode);
        // 清理样式(替换拖拽ClassName)
        var id = this.dragNode.id;
        if (!id) return;
        dragkit.elements[id].classList.remove(DK_PLACEHOLDER_ITEM);
        view.remove(document.body, id, DK_GRAG_DROP_ITEM);
        // 重新布局
        this.dragkit.layout();
        // 判断是否跨域容器
        if (this.startDragkit && this.startDragkit !== this.dragkit) {
            // 删除之前容器的节点
            this.startDragkit.remove(this.dragNode);
            this.startDragkit.layout();
            this.startDragkit.container.classList.remove(DK_START_CONTAINER);
            this.startDragkit = undefined;
            this.state.isDragCrossContainer = undefined;
        }
        this.dragCoveredNode = undefined;
    },
    applyLayout: function (node, dragkit) {
        var containerTop = view.getOffset(dragkit.container).top;
        // 当鼠标位置转换成容器内排版坐标
        dragkit.layout(node, this.dragNodeCoord.y - containerTop);
    },
    setCoverElementStyle: function (coveredNode, elements) {
        elements = elements || this.dragkit.elements;
        for(var id in elements) {
            if (elements.hasOwnProperty(id)) {
                if (coveredNode && elements[id].getAttribute(DK_ID) === coveredNode.id) {
                    elements[id].classList.add(DK_COVER_ITEM)
                } else {
                    elements[id].classList.remove(DK_COVER_ITEM)
                }
            }
        }
    }
};