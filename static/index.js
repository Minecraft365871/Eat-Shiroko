// ==================== 全局变量初始化 ====================

// 检测设备类型：判断是否为桌面设备（非移动设备）
let isDesktop = navigator['userAgent'].match(/(ipad|iphone|ipod|android|windows phone)/i) ? false : true;

// 根据设备类型和设备宽度计算字体单位大小
let fontunit = isDesktop ? 20 : ((window.innerWidth > window.innerHeight ? window.innerHeight : window.innerWidth) / 320) * 10;

// 创建动态样式元素，设置 HTML 和 BODY 的字体大小
let styleEl = document.createElement('style');
styleEl.type = 'text/css';
styleEl.textContent = 'html,body {font-size:' + (fontunit < 30 ? fontunit : '30') + 'px;' +
    // 根据设备类型设置不同的定位方式
    (isDesktop ? '#welcome,#GameTimeLayer,#GameLayerBG,#GameScoreLayer.SHADE{position: absolute;}' :
        '#welcome,#GameTimeLayer,#GameLayerBG,#GameScoreLayer.SHADE{position:fixed;}@media screen and (orientation:landscape) {#landscape {display: box; display: -webkit-box; display: -moz-box; display: -ms-flexbox;}}');
document.head.appendChild(styleEl);

// 按键映射：d=1, f=2, j=3, k=4（默认四键模式）
let map = { 'd': 1, 'f': 2, 'j': 3, 'k': 4 };

// 监听 DOM 加载完成事件，确保在 DOM 就绪后执行初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// 自定义键型数组，默认为 ['!'] 表示随机位置
let key = ['!'];
// 特殊符号列表，用于定义不同的按键模式
let chs = ['@', '!', '#', '&', '+', '-', '%', '*'];
let len = key.length; // 键型长度
let hide = false; // 是否隐藏评价文字
let __Time = 20; // 游戏时间（秒）
let __k = 4; // 列数（默认 4 键）
let _close = false; // 是否关闭音效
let _fsj = false; // 是否开启分区模式（仅检测列区域，不检测具体位置）
var url = '/static/image/ClickBefore.png'; // 默认方块图片路径

// ==================== 游戏状态判断函数 ====================

/**
 * 判断游戏是否正在进行中
 * @returns {boolean} 游戏进行中返回 true，否则返回 false
 */
function isplaying() {
    return document.getElementById('welcome').style.display == 'none' &&
        document.getElementById('GameScoreLayer').style.display == 'none' &&
        document.getElementById("setting1").style.display == 'none';
}

/**
 * 清理和验证键型数组，过滤无效字符
 * 支持的符号：chs 数组中的特殊符号、数字 1-__k、感叹号（全角/半角）
 */
function gl() {
    let tmp = [];
    len = key.length;
    var i = 0;
    for (let i = 0; i < len; ++i) {
        // 保留有效字符：chs 中的特殊符号、数字 1-__k、感叹号
        if (chs.includes(key[i]) || (key[i] >= '1' && key[i] <= __k.toString())) {
            tmp.push(key[i]);
        }
        else if (key[i] == '！') {
            tmp.push('!');
        }
    }
    key = tmp;
    // 如果键型为空，恢复默认值
    if (key.length == 0) {
        key = ['!'];
    }
    len = key.length;
}

// ==================== 桌面端键盘事件处理 ====================

if (isDesktop) {
    // 创建游戏容器，将所有游戏元素包装在其中
    let gameBody = document.createElement('div');
    gameBody.id = 'gameBody';
    while (document.body.firstChild) {
        gameBody.appendChild(document.body.firstChild);
    }
    document.body.appendChild(gameBody);
    
    // 监听键盘按下事件，支持桌面端按键操作
    document.onkeydown = function (e) {
        let key = e.key.toLowerCase();
        // 如果按下的键在映射表中且游戏正在进行，触发点击事件
        if (Object.keys(map).indexOf(key) !== -1 && isplaying()) {
            click(map[key]);
        }
        // 如果按下 R 键且游戏已结束，重新开始游戏
        else if (key == 'r' && document.getElementById('GameScoreLayer').style.display != 'none') {
            gameRestart();
            document.getElementById('GameScoreLayer').style.display = 'none'
        }
    }
}

// ==================== 游戏核心变量声明 ====================

let body, blockSize, GameLayer = [],
    GameLayerBG, touchArea = [],
    GameTimeLayer;
let transform, transitionDuration; // CSS 变换和过渡属性

// ==================== 初始化函数 ====================

/**
 * 游戏主初始化函数
 * 负责初始化 DOM 元素、事件监听、游戏层等
 */
function init() {
    showWelcomeLayer();
    body = document.getElementById('gameBody') || document.body;
    
    // 如果游戏背景层不存在，创建它
    let gameLayerBG = document.getElementById('GameLayerBG');
    if (!gameLayerBG) {
        body.appendChild(createGameLayerElement());
    }
    
    body.style.height = window.innerHeight + 'px';
    // 检测浏览器支持的 CSS 变换属性（兼容 WebKit、IE 和标准）
    transform = typeof (body.style.webkitTransform) != 'undefined' ? 'webkitTransform' : (typeof (body.style.msTransform) !=
        'undefined' ? 'msTransform' : 'transform');
    // 根据 transform 属性名推导 transitionDuration 属性名
    transitionDuration = transform.replace(/ransform/g, 'ransitionDuration');
    GameTimeLayer = document.getElementById('GameTimeLayer');
    // 获取两个游戏层的元素及其子元素
    GameLayer.push(document.getElementById('GameLayer1'));
    GameLayer[0].children = GameLayer[0].querySelectorAll('div');
    GameLayer.push(document.getElementById('GameLayer2'));
    GameLayer[1].children = GameLayer[1].querySelectorAll('div');
    GameLayerBG = document.getElementById('GameLayerBG');
    // 根据设备类型绑定触摸或鼠标事件
    if (GameLayerBG.ontouchstart === null) {
        GameLayerBG.ontouchstart = gameTapEvent;
    } else {
        GameLayerBG.onmousedown = gameTapEvent;
    }
    gameInit();
    initSetting();
    // 监听窗口大小变化事件
    window.addEventListener('resize', refreshSize, false);
    // 绑定开始按钮点击事件
    let btn = document.getElementById('ready-btn');
    btn.className = 'btn btn-primary btn-lg';
    btn.onclick = function () {
        closeWelcomeLayer();
    }
}

/**
 * 打开新窗口（用于分享功能）
 */
function winOpen() {
    window.open(location.href + '?r=' + Math.random(), 'nWin', 'height=500,width=320,toolbar=no,menubar=no,scrollbars=no');
    let opened = window.open('about:blank', '_self');
    opened.opener = null;
    opened.close();
}
let refreshSizeTime;

/**
 * 刷新窗口尺寸（带防抖处理）
 * 避免频繁触发 resize 事件导致性能问题
 */
function refreshSize() {
    clearTimeout(refreshSizeTime);
    refreshSizeTime = setTimeout(_refreshSize, 200);
}

/**
 * 实际执行窗口尺寸刷新
 * 重新计算方块大小并更新所有游戏层的位置
 */
function _refreshSize() {
    countBlockSize();
    // 遍历所有游戏层，更新每个方块的位置和尺寸
    for (let i = 0; i < GameLayer.length; i++) {
        let box = GameLayer[i];
        for (let j = 0; j < box.children.length; j++) {
            let r = box.children[j],
                rstyle = r.style;
            rstyle.left = (j % __k) * blockSize + 'px';
            rstyle.bottom = Math.floor(j / __k) * blockSize + 'px';
            rstyle.width = blockSize + 'px';
            rstyle.height = blockSize + 'px';
        }
    }
    let f, a;
    // 确定上下两个游戏层（f 为下方层，a 为上方层）
    if (GameLayer[0].y > GameLayer[1].y) {
        f = GameLayer[0];
        a = GameLayer[1];
    } else {
        f = GameLayer[1];
        a = GameLayer[0];
    }
    let y = ((_gameBBListIndex) % 10) * blockSize;
    f.y = y;
    f.style[transform] = 'translate3D(0,' + f.y + 'px,0)';
    a.y = -blockSize * Math.floor(f.children.length / __k) + y;
    a.style[transform] = 'translate3D(0,' + a.y + 'px,0)';
}

/**
 * 计算方块尺寸和触摸区域
 * 根据屏幕宽度动态调整方块大小
 */
function countBlockSize() {
    blockSize = body.offsetWidth / __k;
    body.style.height = window.innerHeight + 'px';
    GameLayerBG.style.height = window.innerHeight + 'px';
    touchArea[0] = window.innerHeight - blockSize * 0; // 触摸区域上边界
    touchArea[1] = window.innerHeight - blockSize * 3; // 触摸区域下边界
}

// ==================== 游戏状态变量 ====================

let _gameBBList = [],      // 待点击的方块列表
    _gameBBListIndex = 0,  // 当前应点击的方块索引
    _gameOver = false,     // 游戏是否结束
    _gameStart = false,    // 游戏是否开始
    _gameTime,             // 计时器 ID
    _gameTimeNum,          // 剩余时间
    _gameScore,            // 得分
    _date1,                // 游戏开始时间
    deviation_time;        // 游戏持续时间

// ==================== 游戏初始化函数 ====================

/**
 * 初始化游戏
 * 注册音效文件并开始游戏
 */
function gameInit() {
    createjs.Sound.registerSound({
        src: "./static/music/err.mp3",
        id: "err"
    });
    createjs.Sound.registerSound({
        src: "./static/music/end.mp3",
        id: "end"
    });
    createjs.Sound.registerSound({
        src: "./static/music/tap.mp3",
        id: "tap"
    });
    gameRestart();
}

let last = 0, lkey = 0;

function gameRestart() {
    last = 0;
    lkey = 0;
    _gameBBList = [];
    _gameBBListIndex = 0;
    _gameScore = 0;
    _gameOver = false;
    _gameStart = false;
    _gameTimeNum = __Time;
    GameTimeLayer.innerHTML = creatTimeText(_gameTimeNum);
    countBlockSize();
    refreshGameLayer(GameLayer[0]);
    refreshGameLayer(GameLayer[1], 1);
}

function gameStart() {
    _date1 = new Date();
    _gameStart = true;
    _gameTimeNum = __Time;
    _gameTime = setInterval(gameTime, 1000);
}

let date2 = new Date();

function gameOver() {
    date2 = new Date();
    _gameOver = true;
    clearInterval(_gameTime);
    setTimeout(function () {
        GameLayerBG.className = '';
        showGameScoreLayer();
    }, 1500);
}

function gameTime() {
    _gameTimeNum--;
    if (_gameTimeNum <= 0) {
        GameTimeLayer.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;时间到！';
        gameOver();
        GameLayerBG.className += ' flash';
        if (!_close) {
            createjs.Sound.play("end");
        }
    } else {
        GameTimeLayer.innerHTML = creatTimeText(_gameTimeNum);
    }
}

/**
 * 创建时间显示文本
 * @param {number} n - 剩余秒数
 * @returns {string} 格式化后的时间文本
 */
function creatTimeText(n) {
    return '&nbsp;剩余时间:' + n;
}

// ==================== 正则表达式和工具函数 ====================

let _ttreg = / t{1,2}(\d+)/,           // 匹配方块上的时间等级类名
    _clearttClsReg = / t{1,2}\d+| bad/; // 匹配需要清除的类名

/**
 * 生成指定范围内的随机整数（四舍五入）
 * @param {number} Min - 最小值
 * @param {number} Max - 最大值
 * @returns {number} 随机整数
 */
function Randomfrom(Min, Max) {
    let Range = Max - Min;
    let Rand = Math.random();
    let num = Min + Math.round(Rand * Range); // 四舍五入
    return num;
}

/**
 * 根据键型配置生成下一个方块的位置
 * 支持多种特殊符号模式：
 * - '!': 完全随机
 * - '@': 随机但不与上一列相同
 * - '#': 与上一列相同
 * - '&': 与上一列对称
 * - '+n': 向右偏移 n 列
 * - '-n': 向左偏移 n 列
 * - '%ab': 在 a 到 b 列之间随机
 * - '*nabc': 从指定 n 个列中随机选择一个
 * - '1-4': 直接指定列号
 * @returns {number} 生成的列索引 (0 到__k-1)
 */
function randomPos() {
    let x = 0;
    if (key[last] == '!') {
        // 完全随机位置
        x = Math.floor(Math.random() * 1000) % __k;
        let pos = last - 1;
        if (pos == -1) {
            pos = len - 1;
        }
    }
    else if (key[last] == '@') {
        // 随机位置，但不与上一列相同
        x = Math.floor(Math.random() * 1000) % __k;
        if (x == lkey) {
            x++;
            if (x == __k) {
                x = 0;
            }
        }
    }
    else if (key[last] == '#') {
        // 与上一列相同
        x = lkey;
    }
    else if (key[last] == '&') {
        // 与上一列对称（镜像）
        x = __k - 1 - lkey;
    }
    else if (key[last] == '+') {
        // 向右偏移指定列数
        let num = parseInt(key[last + 1]);
        last++;
        x = (lkey + num) % __k;
    }
    else if (key[last] == '-') {
        // 向左偏移指定列数
        let num = parseInt(key[last + 1]);
        last++;
        x = (lkey - num + __k) % __k;
    }
    else if (key[last] == '%') {
        // 在指定范围内随机
        let num1 = parseInt(key[last + 1]) - 1;
        let num2 = parseInt(key[last + 2]) - 1;
        if (num2 < num1) {
            num2 += __k;
        }
        x = Randomfrom(num1, num2) % __k;
        last += 2;
    }
    else if (key[last] == '*') {
        // 从指定列表中随机选择一个
        let l = parseInt(key[last + 1]);
        let nums = [];
        for (let i = 1; i <= l; ++i) {
            nums.push(parseInt(key[last + i + 1]) - 1);
        }
        last += l + 1;
        x = nums[Randomfrom(0, l - 1)];
    }
    else {
        // 直接指定列号
        x = parseInt(key[last]) - 1;
    }
    lkey = x;
    last++;
    if (last == len) {
        last = 0;
    }
    return x;
}

// ==================== 游戏层刷新函数 ====================

/**
 * 刷新游戏层，生成新的方块
 * @param {HTMLElement} box - 游戏层元素
 * @param {boolean} loop - 是否为循环刷新（用于双层的无缝切换）
 * @param {number} offset - Y 轴偏移量
 */
function refreshGameLayer(box, loop, offset) {
    let i = randomPos() + (loop ? 0 : __k);
    for (let j = 0; j < box.children.length; j++) {
        let r = box.children[j],
            rstyle = r.style;
        rstyle.left = (j % __k) * blockSize + 'px';
        rstyle.bottom = Math.floor(j / __k) * blockSize + 'px';
        rstyle.width = blockSize + 'px';
        rstyle.height = blockSize + 'px';
        rstyle.backgroundImage = "none";
        r.className = r.className.replace(_clearttClsReg, '');
        if (i == j) {
            _gameBBList.push({
                cell: i % __k,
                id: r.id
            });
            rstyle.backgroundImage = "url(" + url + ")";
            rstyle.backgroundSize = 'cover';
            r.className += ' t' + (Math.floor(Math.random() * 1000) % (__k + 1) + 1);
            r.notEmpty = true;
            if (j < box.children.length - __k) {
                i = randomPos() + (Math.floor(j / __k) + 1) * __k;
            }
        } else {
            r.notEmpty = false;
        }
    }
    if (loop) {
        box.style.webkitTransitionDuration = '0ms';
        box.style.display = 'none';
        box.y = -blockSize * (Math.floor(box.children.length / __k) + (offset || 0)) * loop;
        setTimeout(function () {
            box.style[transform] = 'translate3D(0,' + box.y + 'px,0)';
            setTimeout(function () {
                box.style.display = 'block';
            }, 0);
        }, 0);
    } else {
        box.y = 0;
        box.style[transform] = 'translate3D(0,' + box.y + 'px,0)';
    }
    box.style[transitionDuration] = '180ms';
}

// ==================== 游戏层移动函数 ====================

/**
 * 游戏层向下移动一行
 * 当移动到边界时触发刷新
 */
function gameLayerMoveNextRow() {
    for (let i = 0; i < GameLayer.length; i++) {
        let g = GameLayer[i];
        g.y += blockSize;
        if (g.y > blockSize * (Math.floor(g.children.length / __k))) {
            refreshGameLayer(g, 1, -1);
        } else {
            g.style[transform] = 'translate3D(0,' + g.y + 'px,0)';
        }
    }
}

// ==================== 触摸/点击事件处理 ====================

/**
 * 处理游戏区域的触摸或点击事件
 * @param {Event} e - 触摸或鼠标事件对象
 * @returns {boolean} 返回 false 阻止默认行为
 */
function gameTapEvent(e) {
    if (_gameOver) {
        return false;
    }
    let tar = e.target;
    let y = e.clientY || e.targetTouches[0].clientY,
        x = (e.clientX || e.targetTouches[0].clientX) - body.offsetLeft,
        p = _gameBBList[_gameBBListIndex];

    if (!_fsj && (y > touchArea[0] || y < touchArea[1])) {
        return false;
    }
    if (((p.id == tar.id || (_fsj && p.id % __k == tar.id % __k)) && tar.notEmpty) || (p.cell == 0 && x < blockSize) || (x > p.cell * blockSize && x < (p.cell + 1) *
        blockSize) || (p.cell == (__k - 1) && x > (__k - 1) * blockSize)) {
        if (!_gameStart) {
            gameStart();
        }
        if (!_close) {
            createjs.Sound.play("tap");
        }
        tar = document.getElementById(p.id);
        tar.className = tar.className.replace(_ttreg, ' tt$1');
        tar.style.backgroundImage = "none";
        _gameBBListIndex++;
        _gameScore++;
        gameLayerMoveNextRow();
    } else if (_gameStart && !tar.notEmpty) {
        // 点击了空白区域，判定为失误
        if (!_close) {
            createjs.Sound.play("err");
        }
        gameOver();
        tar.className += ' bad';
    }
    return false;
}

// ==================== 创建游戏层 HTML 结构 ====================

/**
 * 创建游戏层的 HTML 结构字符串
 * @returns {string} 游戏层 HTML 代码
 */
function createGameLayer() {
    let html = '<div id="GameLayerBG">';
    for (let i = 1; i <= 2; i++) {
        let id = 'GameLayer' + i;
        html += '<div id="' + id + '" class="GameLayer">';
        for (let j = 0; j < (__k * 2 >= 10 ? __k * 2 : __k * 3); j++) {
            for (let k = 0; k < __k; k++) {
                html += '<div id="' + id + '-' + (k + j * __k) + '" num="' + (k + j * __k) + '" class="block' + (k ? ' bl' : '') +
                    '"></div>';
            }
        }
        html += '</div>';
    }
    html += '</div>';
    html += '<div id="GameTimeLayer"></div>';
    return html;
}

// ==================== 欢迎界面控制函数 ====================

/**
 * 关闭欢迎界面
 */
function closeWelcomeLayer() {
    let l = document.getElementById('welcome');
    l.style.display = 'none';
}

/**
 * 显示欢迎界面
 */
function showWelcomeLayer() {
    let l = document.getElementById('welcome');
    l.style.display = 'block';
}

// ==================== 结算界面控制函数 ====================

/**
 * 显示游戏结算界面
 * 展示得分、评价和历史最佳等信息
 */
function showGameScoreLayer() {
    let l = document.getElementById('GameScoreLayer');
    let c = document.getElementById(_gameBBList[_gameBBListIndex - 1].id).className.match(_ttreg)[1];
    l.className = l.className.replace(/bgc\d/, 'bgc' + c);
    document.getElementById('GameScoreLayer-text').innerHTML = hide ? '' : "<span style='color:red;'>" + shareText(_gameScore) + "</span>";
    let score_text = '您坚持了 ';
    score_text += "<span style='color:red;'>" + (deviation_time / 1000).toFixed(2) + "</span>" + ' 秒哦！<br>您的得分为 ';
    score_text += "<span style='color:red;'>" + _gameScore + "</span>";
    score_text += '<br>您平均每秒点击了 ';
    score_text += "<span style='color:red;'>" + (_gameScore * 1000 / deviation_time).toFixed(2);
    score_text += "</span>" + ' 次哦！';
    score_text += "<br>相当于 <span style='color:red;'>" + (_gameScore * 15000 / deviation_time).toFixed(2) + "</span> BPM 下的十六分音符哦！"
    document.getElementById('GameScoreLayer-score').innerHTML = score_text;
    let bast = cookie('bast-score');
    if (!bast || _gameScore > bast) {
        bast = _gameScore;
        cookie('bast-score', bast, 100);
    }

    document.getElementById('GameScoreLayer-bast').innerHTML = '历史最佳得分 ' + "<span style='color:red;'>" + bast + "</span>";
    let now = '您的自定义键型为：' + "<span style='color:red;'>" + key.join('')
        + "</span>";
    document.getElementById('now').innerHTML = now;
    l.style.display = 'block';
}

/**
 * 隐藏游戏结算界面
 */
function hideGameScoreLayer() {
    let l = document.getElementById('GameScoreLayer');
    l.style.display = 'none';
}

// ==================== 按钮事件处理函数 ====================

/**
 * 重新开始游戏按钮点击事件
 */
function replayBtn() {
    gameRestart();
    hideGameScoreLayer();
}

/**
 * 返回主菜单按钮点击事件
 */
function backBtn() {
    gameRestart();
    hideGameScoreLayer();
    showWelcomeLayer();
}

// ==================== 评价文本生成函数 ====================

/**
 * 根据得分生成评价文本
 * @param {number} score - 游戏得分
 * @returns {string} 评价文本
 */
function shareText(score) {

    deviation_time = (date2.getTime() - _date1.getTime())
    if (score <= 2.5 * __Time) return '加油！我相信您可以的！';
    if (score <= 5 * __Time) return '^_^ 加把劲，底力大王就是您！';
    if (score <= 7.5 * __Time) return '您！';
    if (score <= 10 * __Time) return '太 您 了！';
    return '您是外星人嘛？';
}

// ==================== 工具函数 ====================

/**
 * 将对象转换为字符串
 * @param {any} obj - 输入对象
 * @returns {string} 转换后的字符串
 */
function toStr(obj) {
    if (typeof obj == 'object') {
        return JSON.stringify(obj);
    } else {
        return obj;
    }
}

// ==================== Cookie 操作函数 ====================

/**
 * Cookie 读写操作函数
 * @param {string} name - Cookie 名称
 * @param {any} value - Cookie 值（可选，不提供则为读取）
 * @param {number} time - Cookie 有效期（天数，可选）
 * @returns {any} 读取时返回 Cookie 值，写入时返回布尔值
 */
function cookie(name, value, time) {
    if (name) {
        if (value) {
            if (time) {
                let date = new Date();
                date.setTime(date.getTime() + 864e5 * time), time = date.toGMTString();
            }
            return document.cookie = name + "=" + escape(toStr(value)) + (time ? "; expires=" + time + (arguments[3] ?
                "; domain=" + arguments[3] + (arguments[4] ? "; path=" + arguments[4] + (arguments[5] ? "; secure" : "") : "") :
                "") : ""), !0;
        }
        return value = document.cookie.match("(?:^|;)\\s*" + name.replace(/([-.*+?^${}()|[\]\/\\])/g, "\\$1") + "=([^;]*)"),
            value = value && "string" == typeof value[1] ? unescape(value[1]) : !1, (/^(\{|\[).+\}|\]$/.test(value) ||
                /^[0-9]+$/g.test(value)) && eval("value=" + value), value;
    }
    let data = {};
    value = document.cookie.replace(/\s/g, "").split(";");
    for (let i = 0; value.length > i; i++) name = value[i].split("="), name[1] && (data[name[0]] = unescape(name[1]));
    return data;
}

/**
 * 创建游戏层 DOM 元素
 * @returns {HTMLElement} 游戏层根元素
 */
function createGameLayerElement() {
    let el = document.createElement('div');
    el.innerHTML = createGameLayer();
    return el.firstElementChild;
}

// ==================== 设置初始化函数 ====================

/**
 * 从 Cookie 加载用户设置并初始化游戏
 */
function initSetting() {
    if (cookie('k')) {
        let tsmp = parseInt(cookie('k'));
        if (tsmp != __k) {
            __k = tsmp;
            var el = document.getElementById('GameLayerBG');
            let fa = el.parentNode;
            fa.removeChild(el);
            fa.removeChild(GameTimeLayer);
            fa.appendChild(createGameLayerElement());
            let newTimeLayer = document.createElement('div');
            newTimeLayer.id = 'GameTimeLayer';
            fa.appendChild(newTimeLayer);
            GameTimeLayer = document.getElementById("GameTimeLayer");
            GameLayer = [];
            GameLayer.push(document.getElementById('GameLayer1'));
            GameLayer[0].children = GameLayer[0].querySelectorAll('div');
            GameLayer.push(document.getElementById('GameLayer2'));
            GameLayer[1].children = GameLayer[1].querySelectorAll('div');
            GameLayerBG = document.getElementById('GameLayerBG');
            if (GameLayerBG.ontouchstart === null) {
                GameLayerBG.ontouchstart = gameTapEvent;
            } else {
                GameLayerBG.onmousedown = gameTapEvent;
            }
        }
    }
    if (cookie('time')) {
        __Time = parseInt(cookie('time'));
        GameTimeLayer.innerHTML = creatTimeText(__Time);
    }
    if (cookie('key')) {
        var str = cookie('key');
        map = {};
        for (let i = 0; i < __k; ++i) {
            map[str.charAt(i).toLowerCase()] = i + 1;
        }
    }
    if (cookie('note')) {
        var note = cookie('note');
        key = note.split('');
        gl();
    }
    if (cookie("hide")) {
        if (cookie("hide").toString() == '1') {
            hide = true;
        }
    }
    if (cookie("fsj")) {
        if (cookie("fsj").toString() == '1') {
            _fsj = true;
        }
    }
    if (cookie("close")) {
        if (cookie("close").toString() == '1') {
            _close = true;
        }
    }
    gameRestart();
}

function show_btn(i) {
    document.getElementById("tt").style.display = "block";
    document.getElementById("ttt").style.display = "block";
    document.getElementById("btn_group").style.display = "block";
    document.getElementById("btn_group2").style.display = "block";
    document.getElementById("setting" + i.toString()).style.display = "none";
}

function nxtpage(i) {
    document.getElementById("setting" + i.toString()).style.display = "none";
    document.getElementById("setting" + (i + 1).toString()).style.display = "block";
}

function lstpage(i) {
    document.getElementById("setting" + i.toString()).style.display = "none";
    document.getElementById("setting" + (i - 1).toString()).style.display = "block";
}


/**
 * 显示设置界面，填充当前配置值
 */
function show_setting() {
    var str = [];
    for (var i = 1; i <= __k; ++i) {
        str.push('a');
    }
    for (var ke in map) {
        str[map[ke] - 1] = ke.charAt(0);
    }
    document.getElementById("k").value = __k.toString();
    document.getElementById("keyboard").value = str.join('');
    document.getElementById("timeinput").value = __Time.toString();
    document.getElementById("note").value = key.join('');
    document.getElementById("hide").checked = hide;
    document.getElementById("close").checked = _close;
    document.getElementById("fsj").checked = _fsj;
    document.getElementById("btn_group").style.display = "none";
    document.getElementById("btn_group2").style.display = "none";
    document.getElementById("tt").style.display = "none";
    document.getElementById("ttt").style.display = "none";
    document.getElementById("setting1").style.display = "block";
}


/**
 * 保存用户设置到 Cookie
 */
function save_cookie() {
    let str = document.getElementById("keyboard").value;
    let Time = document.getElementById("timeinput").value;
    let note = document.getElementById("note").value;
    hide = document.getElementById("hide").checked;
    _close = document.getElementById("close").checked;
    _fsj = document.getElementById("fsj").checked

    let tsmp = parseInt(document.getElementById("k").value);
    if (tsmp != __k) {
        __k = tsmp;
        var el = document.getElementById('GameLayerBG');
        let fa = el.parentNode;
        fa.removeChild(el);
        fa.removeChild(GameTimeLayer);
        fa.appendChild(createGameLayerElement());
        let newTimeLayer = document.createElement('div');
        newTimeLayer.id = 'GameTimeLayer';
        fa.appendChild(newTimeLayer);
        GameTimeLayer = document.getElementById("GameTimeLayer");
        GameLayer = [];
        GameLayer.push(document.getElementById('GameLayer1'));
        GameLayer[0].children = GameLayer[0].querySelectorAll('div');
        GameLayer.push(document.getElementById('GameLayer2'));
        GameLayer[1].children = GameLayer[1].querySelectorAll('div');
        GameLayerBG = document.getElementById('GameLayerBG');
        if (GameLayerBG.ontouchstart === null) {
            GameLayerBG.ontouchstart = gameTapEvent;
        } else {
            GameLayerBG.onmousedown = gameTapEvent;
        }
    }

    map = {};
    for (let i = 0; i < __k; ++i) {
        map[str.charAt(i).toLowerCase()] = i + 1;
    }

    __Time = parseInt(Time);
    GameTimeLayer.innerHTML = creatTimeText(__Time);

    key = note.split('');
    gl();
    cookie('k', __k.toString(), 100);
    cookie('note', key.join(''), 100);
    cookie('time', Time, 100);
    cookie('key', str, 100);
    if (_close) {
        cookie("close", "1", 100);
    }
    else {
        cookie('close', '0', 100);
    }
    if (hide) {
        cookie('hide', '1', 100);
    }
    else {
        cookie('hide', '0', 100);
    }
    if (_fsj) {
        cookie('fsj', '1', 100);
    }
    else {
        cookie('fsj', '0', 100);
    }
    gameRestart();
}

/**
 * 检查字符串是否为空
 * @param {string} val - 待检查的字符串
 * @returns {boolean} 为空返回 true，否则返回 false
 */
function isnull(val) {
    let str = val.replace(/(^\s*)|(\s*$)/g, '');
    if (str == '' || str == undefined || str == null) {
        return true;
    } else {
        return false;
    }
}

/**
 * 模拟点击指定列的方块（用于桌面端键盘操作）
 * @param {number} index - 列索引 (1-based)
 */
function click(index) {
    let p = _gameBBList[_gameBBListIndex];
    let base = parseInt(document.getElementById(p.id).getAttribute("num")) - p.cell;
    let num = base + index - 1;
    let id = p.id.substring(0, 11) + num;

    let fakeEvent = {
        clientX: ((index - 1) * blockSize + index * blockSize) / 2 + body.offsetLeft,
        // Make sure that it is in the area
        clientY: (touchArea[0] + touchArea[1]) / 2,
        target: document.getElementById(id),
    };

    gameTapEvent(fakeEvent)
}

function foreach() {
    var strCookie = document.cookie;
    var arrCookie = strCookie.split("; "); // 将多cookie切割为多个名/值对
    for (var i = 0; i < arrCookie.length; i++) { // 遍历cookie数组，处理每个cookie对
        var arr = arrCookie[i].split("=");
        if (arr.length > 0)
            DelCookie(arr[0]);
    }
}

/**
 * 从指定位置获取 Cookie 值
 * @param {number} offset - 起始位置
 * @returns {string} Cookie 值
 */
function GetCookieVal(offset) {
    var endstr = document.cookie.indexOf(";", offset);
    if (endstr == -1)
        endstr = document.cookie.length;
    return decodeURIComponent(document.cookie.substring(offset, endstr));
}

/**
 * 删除指定名称的 Cookie
 * @param {string} name - Cookie 名称
 */
function DelCookie(name) {
    var exp = new Date();
    exp.setTime(exp.getTime() - 1);
    var cval = GetCookie(name);
    document.cookie = name + "=" + cval + "; expires=" + exp.toGMTString();
}

/**
 * 获取指定名称的 Cookie 值
 * @param {string} name - Cookie 名称
 * @returns {string|null} Cookie 值，不存在返回 null
 */
function GetCookie(name) {
    var arg = name + "=";
    var alen = arg.length;
    var clen = document.cookie.length;
    var i = 0;
    while (i < clen) {
        var j = i + alen;
        if (document.cookie.substring(i, j) == arg)
            return GetCookieVal(j);
        i = document.cookie.indexOf(" ", i) + 1;
        if (i == 0) break;
    }
    return null;
}

/**
 * 自动设置键型并重新开始游戏
 * @param {string} asss - 键型字符串
 */
function autoset(asss) {
    key = asss.split('');
    len = key.length;
    gameRestart();
}

/**
 * 处理图片上传，更新方块背景图
 * @param {HTMLInputElement} input - 文件输入元素
 */
function showImg(input) {
    var file = input.files[0];
    url = window.URL.createObjectURL(file);
}

/**
 * 设置阶梯型键型（1-__k-1 循环）并重新开始游戏
 */
function stair() {
    key = [];
    for (var i = 1; i < __k; ++i) {
        key.push(i.toString());
    }
    for (var i = __k; i > 1; --i) {
        key.push(i.toString());
    }
    len = (__k - 1) * 2;
    gameRestart();
}
