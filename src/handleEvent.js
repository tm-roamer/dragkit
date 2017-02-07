// 事件处理对象
var handleEvent = {
    init: function (isbind) {
        if (this.isbind) return;
        this.isbind = isbind;
        this.globalUnbind();
        this.globalBind();
    },
    globalBind: function () {
        document.addEventListener('mousedown', this.mouseDown, false);
        document.addEventListener('mousemove', this.mouseMove, false);
        document.addEventListener('mouseup', this.mouseUp, false);
        document.addEventListener('click', this.click, true);
        this.isbind = true;
    },
    globalUnbind: function () {
        document.removeEventListener('mousedown', this.mouseDown, false);
        document.removeEventListener('mousemove', this.mouseMove, false);
        document.removeEventListener('mouseup', this.mouseUp, false);
        document.removeEventListener('click', this.click, true);
        this.isbind = false;
    },
    mouseDown: function (event) {
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
    mouseMove: function (event) {
        dragdrop.drag(event);
    },
    mouseUp: function (event) {
        // 点击删除图标, 删除节点
        if (this.isDragDeleteNode) {
            var target = event.target,
                dragkit = utils.getDom2Dragkit(target);
            if (dragkit) {
                dragkit.remove({id: target.getAttribute(DK_ID)});
                dragkit.layout();
                this.isDragDeleteNode = undefined;
            }
        }
        // 正常拖拽情况
        else {
            dragdrop.dragEnd(event);
        }
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