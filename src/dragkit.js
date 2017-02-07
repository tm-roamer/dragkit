// 拖拽对象
function DragKit(options, container, originData, number) {
    this.init(options, container, originData, number);
    // handleEvent.unbind(this.container);
    // handleEvent.bind(this.container);
}

// 拖拽对象原型
DragKit.prototype = {
    constructor: DragKit,
    init: function(options, container, originData, number) {
        this.number = number;                           // 拖拽对象的编号
        this.autoIncrement = 0;                         // 节点的自增主键
        this.opt = utils.extend(setting, options);      // 配置项
        this.container = container;                     // 容器DOM
        this.originData = originData;                   // 原始数据
        this.data = this.setData(originData);           // 渲染数据
        this.elements = view.init(this.data, this.opt, this.container); // 缓存的节点DOM
    },
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
            ele.classList.contains(DK_PLACEHOLDER_ITEM) && arr.splice(idx, 1);
        });
        view.remove(this.container, node.id, DK_PLACEHOLDER_ITEM);
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

var dragkit = {
    version: "1.0.0",
    instance: instance,
    destroy: destroy
};
