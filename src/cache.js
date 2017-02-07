// 拖拽对象的缓存对象
var cache = {
    init: function () {
        if (!this.arr) this.arr = [];
    },
    get: function (idx) {
        // 避免0的情况, if条件判断麻烦
        return this.arr[idx - 1];
    },
    set: function (obj) {
        this.arr.push(obj);
        return obj;
    },
    index: function () {
        return this.arr.length + 1;
    }
};