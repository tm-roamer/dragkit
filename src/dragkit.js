
// 拖拽对象
function DragKit(options, container, originData, number) {
    this.init(options, container, originData, number);
}

// 拖拽对象原型
DragKit.prototype = {
    constructor: DragKit,
    init: function(options, container, originData, number) {
        this.number = number;                           // 拖拽对象的编号
        this.autoIncrement = 0;                         // 节点的自增主键
        this.opt = utils.extend(setting, options);      // 配置项
        this.container = container;                     // 容器DOM
        if (originData) {
            this.originData = originData;               // 原始数据
            this.data = this.setData(originData);       // 渲染数据
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
    setData: function (originData) {
        var data = [], opt = this.opt, self = this;
        originData.forEach(function (node, idx) {
            data[idx] = {
                id: self.number + '-' + (++self.autoIncrement),
                innerY: idx * (opt.nodeH + opt.padding)
            };
            data[idx][opt.showFieldName] = node[opt.showFieldName];
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
        // @fix 只有真正坐标发生改变才会触发render 节流
        var node = (dragNode && this.query(dragNode.id));
        node && (node.innerY = innerY);
        // 排序
        this.data.sort(function (n1, n2) {
            return n1.innerY - n2.innerY
        });
        // 重置
        this.resetData();
        // 重绘
        view.render(this.opt, this.data, this.elements, this.container);
        // 回调函数
        this.opt.onLayout && this.opt.onLayout(this, this.data);
    },
    query: function (id) {
        if (!id) return undefined;
        return this.data.filter(function (node) {
            return node.id === id
        })[0];
    },
    add: function (node) {
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
        var delIco = ele.querySelector('.'+DK_DELETE_ITEM_ICO);
        delIco && delIco.setAttribute(DK_ID, newId || '');
        this.elements[newId] = ele;
        delete this.elements[oldId];
        // 回调函数
        this.opt.onEditNode && this.opt.onEditNode(this, newId);
        return node;
    },
    remove: function (node) {
        var rmNode = utils.clone(node);
        if (!(node && node.id)) return;
        this.data.forEach(function (n, idx, arr) {
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