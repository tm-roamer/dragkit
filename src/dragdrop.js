// 拖拽的工具对象
var dragdrop = {
    // 开始拖拽
    dragStart: function (event) {
        // 获取节点
        var ele = view.searchUp(event.target, DK_ITEM);
        if (ele) {
            this.isDrag = true;
            // @fix 需支持子节点情况
            // 鼠标悬停位置与当前拖拽节点坐标的偏移
            this.offset = this.getNodeOffset(ele, event);
            // 获取拖拽对象
            var dragkit = utils.getDom2Dragkit(ele);
            if (dragkit) {
                this.dragkit = dragkit;
                this.dragStartCrossMoveNode(event);
                this.dragStartMoveNode(ele, dragkit, event);
                return dragkit.opt.distance;
            } else {
                // 新增节点的情况
                this.dragStartAddNode(ele, event);
            }
        }
    },
    dragStartMoveNode: function (ele, dragkit, event) {
        // 取得当前拖拽节点id
        var id = ele.getAttribute(DK_ID);
        if (id) {
            // 被选中的节点
            dragkit.elements[id].classList.add(DK_PLACEHOLDER_ITEM);
            // 复制节点数据
            this.dragNode = utils.clone(dragkit.query(id));
            // 复制节点dom
            this.dragElement = dragkit.elements[id].cloneNode(true);
            this.dragElement.className = DK_ITEM + ' ' + DK_GRAG_DROP_ITEM;
            // 移动复制节点
            this.moveDragElement(event);
            document.body.appendChild(this.dragElement);
        }
    },
    dragStartCrossMoveNode: function (event) {
        this.startDragkit = this.dragkit;
        this.startDragkit.container.classList.add(DK_START_CONTAINER);
    },
    dragStartAddNode: function (ele, event) {
        this.dragNode = JSON.parse(ele.getAttribute(DK_NODE_INFO));
        if (this.dragNode) {
            this.isDragAddNode = true;
            this.dragElement = view.create(this.dragNode);
            // 移动拖拽节点
            this.moveDragElement(event);
            this.dragElement.className = DK_ITEM + ' ' + DK_ADD_ITEM + ' ' + DK_GRAG_DROP_ITEM;
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
            x: event.pageX - this.offset.x,
            y: event.pageY - this.offset.y,
            w: this.dragElement.clientWidth,
            h: this.dragElement.clientHeight
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
            // 特殊处理: 容器离得近的时候, 拖动过快, 容易切换容器, 导致切换了拖拽对象, 删除临时节点
            this.removeTempNode(this.startDragkit, this.dragkit, this.dragNode);

            if (containerHit.isContainerHit) {
                this.dragMoveNode(event);
            } else {
                this.dragDeleteNode(event);
            }

        }
    },
    dragMoveNode: function (event) {
        this.isDragDeleteNode = false;
        this.dragElement.classList.remove(DK_DELETE_ITEM);
        this.applyLayout(this.dragNode);
    },
    dragCrossMoveNode: function (isContainerHit, event) {
        this.isDragDeleteNode = false;
        this.isDragCrossContainer = true;
        if (isContainerHit) {
            this.dragElement.classList.remove(DK_DELETE_ITEM);
        } else {
            this.dragElement.classList.add(DK_DELETE_ITEM);
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
                this.setCoverElementStyle(undefined, this.prevDragkit.elements);
                this.prevDragkit.layout();
            }
            // 容器没有超量的情况下, 才会添加
            if (dragkit.data.length < dragkit.opt.maxNodeNum) {
                if (this.isDragAddData === undefined) {
                    // 添加节点 this.isDragAddData === this.dragNode
                    this.isDragAddData = dragkit.add(this.dragNode, this.dragElement);
                    dragkit.elements[this.dragNode.id].classList.add(DK_PLACEHOLDER_ITEM);
                }
            }
            // 容器超量的情况会执行覆盖
            else {
                // 允许覆盖, 并且无法再添加节点时
                if (dragkit.opt.isCoverNode && !this.isDragAddData && !dragkit.query(this.dragNode.id)) {
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
            // 覆盖情况,清除样式
            this.setCoverElementStyle(undefined);
        }
        // 碰撞仅在边界处, 可以无数次在容器外或容器内移动, 故需要每次都要应用布局
        this.applyLayout(this.isDragAddData || this.dragNode);
    },
    dragDeleteNode: function (event) {
        this.isDragDeleteNode = true;
        this.dragElement.classList.add(DK_DELETE_ITEM)
    },
    // 结束拖拽
    dragEnd: function (event) {
        if (this.isDrag) {
            // 添加节点
            if (this.isDragAddNode) {
                // 替换的情况
                if (this.isDragCoverNode) {
                    this.dragEndCoverNode(event);
                } else {
                    this.dragEndAddNode(event);
                }
            }
            // 删除节点
            else if (this.isDragDeleteNode) {
                this.dragEndDeleteNode(event);
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
        this.offset = undefined;
        this.dragNodeCoord = undefined;
    },
    dragEndMoveNode: function (event, dragkit) {
        // 清理样式(替换拖拽ClassName)
        this.setDragElementStyle();
    },
    dragEndCrossMoveNode: function (event) {
        // 判断是否跨域容器
        if (this.startDragkit !== this.dragkit) {
            // 删除之前容器的节点
            this.startDragkit.remove(this.dragNode);
            this.startDragkit.layout();
            // 节点添加到现在容器
            this.dragEndAddNode(event);
        } else {
            this.dragEndMoveNode(this.startDragkit);
        }
        this.startDragkit.container.classList.remove(DK_START_CONTAINER);
        this.startDragkit = undefined;
        this.isDragCrossContainer = undefined;
    },
    dragEndCoverNode: function (event) {
        // debugger;
        this.dragNode.innerY = this.dragCoveredNode.innerY;
        // 删除被覆盖节点
        this.dragkit.remove(this.dragCoveredNode);
        // 添加覆盖节点
        this.dragkit.add(this.dragNode);
        // 清理样式(替换拖拽ClassName)
        this.setDragElementStyle();
        // 重新布局
        this.dragkit.layout();
        // 判断是否跨域容器
        if (this.startDragkit && this.startDragkit !== this.dragkit) {
            // 删除之前容器的节点
            this.startDragkit.remove(this.dragNode);
            this.startDragkit.layout();
            this.startDragkit.container.classList.remove(DK_START_CONTAINER);
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
            // 清理样式(替换拖拽ClassName)
            this.setDragElementStyle();
        } else {
            view.remove(document.body, '', DK_ADD_ITEM);
        }
        this.isDragAddNode = undefined;
        this.isDragAddData = undefined;
        this.isDragAddNodeHit = undefined;
    },
    dragEndDeleteNode: function (event) {
        // 如果拖出容器删除节点
        document.body.removeChild(this.dragElement);
        this.dragkit.remove(this.dragNode);
        this.dragkit.layout();
        this.isDragDeleteNode = undefined;
    },
    // 拖拽进入容器
    dragEnterContainer: function() {
        console.log('enter');
    },
    // 拖拽离开容器
    dragLeaveContainer: function() {
        console.log('leave');
    },
    // 辅助方法
    moveDragElement: function (event) {
        var x = event.pageX - this.offset.x;
        var y = event.pageY - this.offset.y;
        this.dragElement.style.cssText = 'top:' + y + 'px;left:' + x + 'px;';
    },
    getNodeOffset: function (ele, event) {
        var offset = {x: 0, y: 0};
        offset.x = event.offsetX;
        offset.y = event.offsetY;
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
        var id = this.dragNode.id;
        if (id) {
            (dragkit || this.dragkit).elements[id].classList.remove(DK_PLACEHOLDER_ITEM);
            view.remove(document.body, '', DK_GRAG_DROP_ITEM);
        }
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
    },
    removeTempNode: function(startDragkit, currentDragkit, node) {
        var arr = cache.arr;
        for (var i = 0; i < arr.length; i++) {
            var dragkit = dragkit = arr[i];
            if (dragkit !== startDragkit && dragkit !== currentDragkit && dragkit.query(node.id)) {
                this.isDragAddData = undefined;
                dragkit.remove(node);
                dragkit.layout();
            }
        }
    }
};