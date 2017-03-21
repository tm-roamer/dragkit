# dragkit
dragkit.js is a plugin for dragdrop 一个拖拽插件

### 先上图看效果
  
  ![github](https://github.com/tm-roamer/dragkit/blob/master/docs/dragkit.gif?raw=true "demo")
  ![github](https://github.com/tm-roamer/dragkit/blob/master/docs/dragkit2.gif?raw=true "demo")
  
### 使用说明

npm run build

gulp

./src/module.js 是入口文件

构建的时候只做了一件事, 就是将代码片段合并了. 因为自己调试代码修改一个大文件, 感觉很累. 所以将源码拆开写了. 

### 更新日志

#### v1.1.3

1.  补充回调函数 onLayout 重新布局
2.  补充 cache.remove 方法
3.  补充 cache.list 方法
4.  修正dom2obj时, 重新初始化设置, data和elements没有重新赋初值

#### v1.1.2

1.  补充拖拽距离, 区分点击和拖拽. 
2.  补充回调函数 onInit  初始化

#### v1.1.1

1. 解决 当节点还有子元素点击拖拽定位不准.
2. 拖拽进行中, 在body标签动态绑定class="dk-user-select", 防止拖拽过程中文本选中

#### v1.1.0

1. 补充 destroy 方法
2. 补充 update 方法
3. 补充 get 方法
4. 补充 list 方法

### 版权
  MIT