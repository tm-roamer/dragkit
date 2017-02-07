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
        // 取得当前拖拽节点
        var node = utils.clone(dragkit.query(ele.getAttribute(DK_ID)));
        if (node) {
            this.dragNode = node;
            this.dragElement = ele;
            this.dragElement.className = DK_ITEM + ' ' + DK_GRAG_DROP_ITEM;
            // 移动拖拽节点
            this.moveDragElement(event);
            // 新增占位符
            dragkit.addPlaceHolder(node);
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
            dragkit.removePlaceHolder(this.dragNode);
            // 插入DOM
            this.dragElement.setAttribute(DK_ID, this.dragNode.id);
            dragkit.container.appendChild(this.dragElement);
            // 添加删除图标
            view.appendDelIco(this.dragElement, this.dragNode.id);
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
        this.dragkit.removePlaceHolder(this.dragNode);
        this.dragkit.remove(this.dragNode);
        this.dragkit.layout();
        this.isDragDeleteNode = undefined;
    },
    // // 拖拽进入容器
    // dragEnterContainer: function(container, event) {
    //     console.log('enter');
    //     if (this.isDrag) {
    //         this.isDragDeleteNode = false;
    //         this.dragElement.classList.remove(DK_DELETE_ITEM);
    //         this.applyLayout(this.dragNode);
    //     }
    // },
    // // 拖拽离开容器
    // dragLeaveContainer: function(container, event) {
    //     console.log('leave');
    //     if (this.isDrag) {
    //         this.isDragDeleteNode = true;
    //         this.dragElement.classList.add(DK_DELETE_ITEM)
    //     }
    // },
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
        var dragkit = dragkit || this.dragkit;
        // 确认拖拽添加到容器内, 修改替换样式(替换拖拽ClassName)
        var node = this.dragkit.query(this.dragNode.id);
        if (node) {
            var styleTop = view.setStyleTop(node && node.innerY);
            this.dragElement.style.cssText = styleTop + ';position:absolute;';
            var self = this;
            setTimeout(function () {
                self.dragElement.className = DK_ITEM + ' ' + DK_ANIMATE_ITEM;
                self.dragElement.style.cssText = styleTop;
                self.dragElement = null;
            }, 0);
        }
    },
    setCoverElementStyle: function (coveredNode, elements) {
        elements = elements || this.dragkit.elements;
        elements.forEach(function (ele) {
            if (coveredNode && ele.getAttribute(DK_ID) === coveredNode.id) {
                ele.classList.add(DK_COVER_ITEM)
            } else {
                ele.classList.remove(DK_COVER_ITEM)
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