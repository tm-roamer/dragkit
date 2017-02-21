
// 事件处理对象
var handleEvent = {
    init: function (isbind) {
        if (this.isbind) return;
        this.isbind = isbind;
        this.globalUnbind();
        this.globalBind();
        dragdrop.init();
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
        // 点击删除图标
        if (event.target.classList.contains(DK_DELETE_ITEM_ICO)) {
            return;
        }
        // 是否点击了拖拽节点
        var ele = view.searchUp(event.target, DK_ITEM);
        if (!ele) return;
        // 记录位置, 通过比较拖拽距离来判断是否是拖拽, 如果是拖拽则阻止冒泡. 不触发点击事件
        handleEvent.distanceX = event.pageX;
        handleEvent.distanceY = event.pageY;
        dragdrop.dragStart(event, ele, function(distance) {
            handleEvent.distance = distance;
        });
    },
    mouseMove: function (event) {
        dragdrop.drag(event);
    },
    mouseUp: function (event) {
        dragdrop.dragEnd(event);
    },
    click: function (event) {
        // 点击删除图标
        if (event.target.classList.contains(DK_DELETE_ITEM_ICO)) {
            var dragkit = utils.getDom2Dragkit(event.target),
                nodeId = event.target.getAttribute(DK_ID);
            if (!dragkit) return;
            dragkit.remove({id: nodeId});
            dragkit.layout();
        } else {
            var distanceX = Math.abs(event.pageX - handleEvent.distanceX || 0),
                distanceY = Math.abs(event.pageY - handleEvent.distanceY || 0);
            if (handleEvent.distance <= distanceX || handleEvent.distance <= distanceY) {
                event.stopPropagation(); // event.preventDefault();
                // 清理临时变量
                delete handleEvent.distance;
                delete handleEvent.distanceX;
                delete handleEvent.distanceY;

            }
        }
    }
};
