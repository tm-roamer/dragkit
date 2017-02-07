// 展示对象, 操作DOM
var view = {
    setContainerParam: function (opt, data, container) {
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
    searchUp: function (node, className) {
        if (!node || node === document.body || node === document) return undefined;   // 向上递归到顶就停
        if (node.classList.contains(className)) return node;
        return this.searchUp(node.parentNode, className);
    },
    getOffset: function (node, offset, parent) {
        if (!parent)
            return node.getBoundingClientRect();
        offset = offset || {top: 0, left: 0};
        if (node === null || node === parent) return offset;
        offset.top += node.offsetTop;
        offset.left += node.offsetLeft;
        return this.getOffset(node.offsetParent, offset, parent);
    },
    init: function (data, opt, container) {
        var self = this,
            elements = {},
            fragment = document.createDocumentFragment();
        if (data && data.length > 0) {
            data.forEach(function (node, idx) {
                var ele = self.create(node);
                elements[node.id] = ele;
                fragment.appendChild(ele);
            });
            this.setContainerParam(opt, data, container);
            container.appendChild(fragment);
        }
        return elements;
    },
    create: function (node, className) {
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
    remove: function (container, id, className) {
        className = className || DK_ITEM;
        var delElement = container.querySelector('div.' + className + '[' + DK_ID + '="' + id + '"]');
        delElement && container.removeChild(delElement);
    },
    render: function (opt, data, elements, container) {
        for(var id in elements) {
            if(elements.hasOwnProperty(id)) {
                var ele = elements[id];
                if (!ele.classList.contains(DK_GRAG_DROP_ITEM)) {
                    var node = data.filter(function (n) {
                        return n.id === ele.getAttribute(DK_ID)
                    })[0];
                    ele.style.cssText = this.setStyleTop(node.innerY);
                }
            }
        }
        this.setContainerParam(opt, data, container);
    },
    setStyleTop: function (top) {
        return ';top:' + top + 'px;';
    },
    appendDelIco: function (ele, id) {
        var delIco = document.createElement("div");
        delIco.className = DK_DELETE_ITEM_ICO;
        delIco.innerHTML = '\u2715';
        delIco.setAttribute(DK_ID, id);
        ele.appendChild(delIco);
    }
};