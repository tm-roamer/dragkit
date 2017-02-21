
// 常量
var THROTTLE_TIME = 14,                              // 节流函数的间隔时间单位ms, FPS = 1000 / THROTTLE_TIME
    DK_CONTAINER = 'dk-container',                   // 拖拽容器classname
    DK_START_CONTAINER = 'dk-start-container',       // 跨容器拖拽时开始容器的classname
    DK_ID = 'data-dk-id',                            // 拖拽节点的数据标识id
    DK_NODE_INFO = 'data-dk-node-info',              // 待新增拖拽节点携带的数据
    DK_ITEM = 'dk-item',                             // 拖拽节点classname
    DK_SHOW_ITEM = 'dk-show-item',                   // 拖拽节点显示classname
    DK_HIDE_ITEM = 'dk-hide-item',                   // 拖拽节点隐藏classname
    DK_ANIMATE_ITEM = 'dk-animate-item',             // 拖拽节点的动画效果classname
    DK_GRAG_DROP_ITEM = 'dk-dragdrop-item',          // 正在拖拽的节点classname
    DK_ADD_ITEM = 'dk-add-item',                     // 拖入容器待添加节点的classname
    DK_CROSS_ITEM = 'dk-cross-item',                 // 跨容器待添加的节点classname
    DK_DELETE_ITEM = 'dk-delete-item',               // 拖出容器待删除节点的classname
    DK_COVER_ITEM = 'dk-cover-item',                 // 节点被覆盖的样式classname
    DK_PLACEHOLDER_ITEM = 'dk-placeholder-item',     // 拖拽节点的占位符
    DK_ITEM_CONTENT = 'dk-item-content',             // 拖拽节点的展示内容区div的classname
    DK_ITEM_PROMPT_TEXT = 'dk-item-prompt-text',     // 占位的提示文字
    DK_DELETE_ITEM_ICO = 'dk-delete-item-ico';       // 节点悬停显示的删除图标classname

// 默认设置
var f = function () {
    },
    setting = {
        className: '',                                   // 自定义换肤class
        maxNodeNum: 4,                                   // 容器最多节点数量
        nodeH: 24,                                       // 单个节点的宽高
        isCoverNode: true,                               // 是否可以覆盖节点
        containerInHitScale: 0.6,                        // 进入容器时碰撞重叠比例
        containerOutHitScale: 0.6,                       // 离开容器时碰撞重叠比例
        coverNodeScale: 0.7,                             // 节点覆盖重叠的比例值
        isShowPromptText: false,                         // 是否显示提示文字, 默认不显示
        padding: 5,                                      // 节点块之间的间距, 默认都为5px
        distance: 5,                                     // 触发拖拽的拖拽距离,默认5px
        // editNode: f,                                     // 回调函数, 更新节点
        onCoverNode: f,                                  // 回调函数, 覆盖节点
        onAddNode: f,                                    // 回调函数, 添加节点
        onDeleteNode: f,                                 // 回调函数, 删除节点
        onLoad: f,                                       // 回调函数, 渲染触发
    };

