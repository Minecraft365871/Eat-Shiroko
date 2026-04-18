/**
 * 主逻辑文件
 */

// 检测设备类型：如果是 iPad、iPhone、iPod、Android 或 Windows Phone 则视为移动设备
let isDesktop = navigator['userAgent'].match(/(ipad|iphone|ipod|android|windows phone)/i) ? false : true;
// 根据设备类型和设备宽度计算字体单位
let fontunit = isDesktop ? 20 : ((window.innerWidth > window.innerHeight ? window.innerHeight : window.innerWidth) / 320) * 10;
// 动态注入 CSS 样式，根据设备类型设置元素定位方式
document.write('<style type="text/css">' +
    'html,body {font-size:' + (fontunit < 30 ? fontunit : '30') + 'px;}' +
    (isDesktop ? '#welcome,#GameTimeLayer,#GameLayerBG,#GameScoreLayer.SHADE{position: absolute;}' :
        '#welcome,#GameTimeLayer,#GameLayerBG,#GameScoreLayer.SHADE{position:fixed;}@media screen and (orientation:landscape) {#landscape {display: box; display: -webkit-box; display: -moz-box; display: -ms-flexbox;}}') +
    '</style>');
// 键盘映射：d,f,j,k 分别对应 1,2,3,4 号位置
let map = { 'd': 1, 'f': 2, 'j': 3, 'k': 4 };
// 自定义键型序列，默认包含 '!'（随机位置）
let key = ['!'];
// 特殊符号数组，用于定义不同的按键模式
let chs = ['@', '!', '#', '&', '+', '-', '%', '*'];
// 键型序列长度
let len = key.length;
// 是否隐藏分数显示
let hide = false;
// 游戏时间（秒）
let __Time = 20;
// 列数（默认 4 列）
let __k = 4;
// 是否关闭音效
let _close = false;
// 是否启用非精准区判定（放宽点击区域）
let _fsj = true;
// 方块点击图片路径
var url = '/static/image/ClickBefore.png';

/**
 * 判断游戏是否正在进行中
 * @returns {boolean} 游戏进行中返回 true
 */
function isplaying() {
    return document.getElementById('welcome').style.display == 'none' &&
        document.getElementById('GameScoreLayer').style.display == 'none' &&
        document.getElementById("setting1").style.display == 'none';
}

/**
 * 处理键型序列，过滤有效字符并重置 key 数组
 */
function gl() {
    let tmp = [];
    len = key.length;
    var i = 0;
    for (let i = 0; i < len; ++i) {
        // 保留特殊符号或数字范围内的字符
        if (chs.includes(key[i]) || (key[i] >= '1' && key[i] <= __k.toString())) {
            tmp.push(key[i]);
        }
        // 将中文感叹号转换为英文
        else if (key[i] == '！') {
            tmp.push('!');
        }
    }
    key = tmp;
    // 如果键型为空，则使用默认值
    if (key.length == 0) {
        key = ['!'];
    }
    len = key.length;
}

// 桌面设备键盘事件监听
if (isDesktop) {
    document.write('<div id="gameBody">');
    document.onkeydown = function (e) {
        let key = e.key.toLowerCase();
        // 如果按下的是映射键且游戏进行中，触发点击
        if (Object.keys(map).indexOf(key) !== -1 && isplaying()) {
            click(map[key]);
        }
        // 如果按下 R 键且游戏结束界面显示中，重新开始游戏
        else if (key == 'r' && document.getElementById('GameScoreLayer').style.display != 'none') {
            gameRestart();
            document.getElementById('GameScoreLayer').style.display = 'none'
        }
    }
}

// 游戏相关 DOM 元素和变量声明
let body, blockSize, GameLayer = [],
    GameLayerBG, touchArea = [],
    GameTimeLayer;
let transform, transitionDuration;

/**
 * 初始化游戏，设置事件监听和 UI 状态
 */
function init() {
    showWelcomeLayer();
    body = document.getElementById('gameBody') || document.body;
    body.style.height = window.innerHeight + 'px';
    // 检测浏览器支持的变换属性
    transform = typeof (body.style.webkitTransform) != 'undefined' ? 'webkitTransform' : (typeof (body.style.msTransform) !=
        'undefined' ? 'msTransform' : 'transform');
    transitionDuration = transform.replace(/ransform/g, 'ransitionDuration');
    GameTimeLayer = document.getElementById('GameTimeLayer');
    // 获取两个游戏层及其子元素
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
    // 监听窗口大小变化
    window.addEventListener('resize', refreshSize, false);
    let btn = document.getElementById('ready-btn');
    btn.className = 'btn btn-primary btn-lg';
    btn.onclick = function () {
        closeWelcomeLayer();
    }
}

/**
 * 打开新窗口（用于分享或重新开始）
 */
function winOpen() {
    window.open(location.href + '?r=' + Math.random(), 'nWin', 'height=500,width=320,toolbar=no,menubar=no,scrollbars=no');
    let opened = window.open('about:blank', '_self');
    opened.opener = null;
    opened.close();
}
let refreshSizeTime;

/**
 * 刷新游戏尺寸（防抖处理）
 */
function refreshSize() {
    clearTimeout(refreshSizeTime);
    refreshSizeTime = setTimeout(_refreshSize, 200);
}

/**
 * 实际执行尺寸刷新，重新计算方块位置和大小
 */
function _refreshSize() {
    countBlockSize();
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
    // 确定上下层
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
 */
function countBlockSize() {
    blockSize = body.offsetWidth / __k;
    body.style.height = window.innerHeight + 'px';
    GameLayerBG.style.height = window.innerHeight + 'px';
    touchArea[0] = window.innerHeight - blockSize * 0;
    touchArea[1] = window.innerHeight - blockSize * 3;
}
// 游戏状态变量
let _gameBBList = [],        // 待点击的方块列表
    _gameBBListIndex = 0,    // 当前需要点击的方块索引
    _gameOver = false,       // 游戏是否结束
    _gameStart = false,      // 游戏是否开始
    _gameTime, _gameTimeNum, _gameScore, _date1, deviation_time;  // 时间、分数相关变量

/**
 * 游戏初始化，注册音效
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

let last = 0, lkey = 0;  // 键型序列当前位置和上一个位置

/**
 * 重新开始游戏，重置所有状态
 */
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

/**
 * 开始游戏，启动计时器
 */
function gameStart() {
    _date1 = new Date();
    _gameStart = true;
    _gameTimeNum = __Time;
    _gameTime = setInterval(gameTime, 1000);
}

let date2 = new Date();

/**
 * 游戏结束处理
 */
function gameOver() {
    date2 = new Date();
    _gameOver = true;
    clearInterval(_gameTime);
    setTimeout(function () {
        GameLayerBG.className = '';
        showGameScoreLayer();
    }, 1500);
}

/**
 * 游戏计时器，每秒更新剩余时间
 */
function gameTime() {
    _gameTimeNum--;
    if (_gameTimeNum <= 0) {
        GameTimeLayer.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;时间到了喵！';
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

// 正则表达式：匹配时间类型和清除时间类名
let _ttreg = / t{1,2}(\d+)/,
    _clearttClsReg = / t{1,2}\d+| bad/;

/**
 * 生成指定范围内的随机整数
 * @param {number} Min - 最小值
 * @param {number} Max - 最大值
 * @returns {number} 随机整数
 */
function Randomfrom(Min, Max) {
    let Range = Max - Min;
    let Rand = Math.random();
    let num = Min + Math.round(Rand * Range); //四舍五入
    return num;
}

/**
 * 根据键型序列生成下一个按键的位置
 * @returns {number} 方块列索引 (0 到 __k-1)
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
        // 随机但不同于上一个位置
        x = Math.floor(Math.random() * 1000) % __k;
        if (x == lkey) {
            x++;
            if (x == __k) {
                x = 0;
            }
        }
    }
    else if (key[last] == '#') {
        // 与上一个位置相同
        x = lkey;
    }
    else if (key[last] == '&') {
        // 对称位置
        x = __k - 1 - lkey;
    }
    else if (key[last] == '+') {
        // 向右偏移指定格数
        let num = parseInt(key[last + 1]);
        last++;
        x = (lkey + num) % __k;
    }
    else if (key[last] == '-') {
        // 向左偏移指定格数
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
        // 直接指定位置（数字 1-__k）
        x = parseInt(key[last]) - 1;
    }
    lkey = x;
    last++;
    if (last == len) {
        last = 0;
    }
    return x;
}

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
        if (!_close) {
            createjs.Sound.play("err");
        }
        gameOver();
        tar.className += ' bad';
    }
    return false;
}

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

function closeWelcomeLayer() {
    let l = document.getElementById('welcome');
    l.style.display = 'none';
}

function showWelcomeLayer() {
    let l = document.getElementById('welcome');
    l.style.display = 'block';
}

/**
 * 显示游戏得分界面
 */
function showGameScoreLayer() {
    let l = document.getElementById('GameScoreLayer');
    let c = document.getElementById(_gameBBList[_gameBBListIndex - 1].id).className.match(_ttreg)[1];
    l.className = l.className.replace(/bgc\d/, 'bgc' + c);
    document.getElementById('GameScoreLayer-text').innerHTML = hide ? '' : "<span style='color:red;'>" + shareText(_gameScore) + "</span>";
    let score_text = '您坚持了 ';
    score_text += "<span style='color:red;'>" + (deviation_time / 1000).toFixed(2) + "</span>" + ' 秒喵！<br>您的得分为 ';
    score_text += "<span style='color:red;'>" + _gameScore + "</span>";
    score_text += '<br>您平均每秒点击了 ';
    score_text += "<span style='color:red;'>" + (_gameScore * 1000 / deviation_time).toFixed(2);
    score_text += "</span>" + ' 次喵！';
    score_text += "<br>相当于 <span style='color:red;'>" + (_gameScore * 15000 / deviation_time).toFixed(2) + "</span> BPM 下的十六分音符喵！"
    document.getElementById('GameScoreLayer-score').innerHTML = score_text;
    // 更新历史最高分
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
 * 隐藏游戏得分界面
 */
function hideGameScoreLayer() {
    let l = document.getElementById('GameScoreLayer');
    l.style.display = 'none';
}

/**
 * 重新开始游戏按钮
 */
function replayBtn() {
    gameRestart();
    hideGameScoreLayer();
}

/**
 * 返回主菜单按钮
 */
function backBtn() {
    gameRestart();
    hideGameScoreLayer();
    showWelcomeLayer();
}

/**
 * 根据分数生成评价文本
 * @param {number} score - 游戏得分
 * @returns {string} 评价文本
 */
function shareText(score) {
    deviation_time = (date2.getTime() - _date1.getTime())
    if (score <= 2.5 * __Time) return '加油喵！我相信您可以的喵！';
    if (score <= 5 * __Time) return '^_^ 再加把劲喵，底力大王就是您喵！';
    if (score <= 7.5 * __Time) return '您！';
    if (score <= 10 * __Time) return '龙逼！';
    return '您是外星人喵？';
}

/**
 * 将对象转换为字符串
 * @param {any} obj - 输入对象
 * @returns {string} 字符串表示
 */
function toStr(obj) {
    if (typeof obj == 'object') {
        return JSON.stringify(obj);
    } else {
        return obj;
    }
}

/**
 * Cookie 操作函数：设置或获取 cookie
 * @param {string} name - cookie 名称（可选，不提供则返回所有 cookie）
 * @param {any} value - cookie 值（可选，提供则设置 cookie）
 * @param {number} time - 过期时间（天）
 * @returns {any} 设置时返回 true，获取时返回 cookie 值
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

// 动态生成游戏层 HTML
document.write(createGameLayer());

/**
 * 初始化设置，从 cookie 加载用户配置
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
            fa.appendChild(parseElement(createGameLayer()));
            fa.appendChild(parseElement("<div id = \"GameTimeLayer\"></div>"));
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

function parseElement(htmlString) {
    return new DOMParser().parseFromString(htmlString, 'text/html').body.childNodes[0]
}

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
        fa.appendChild(parseElement(createGameLayer()));
        fa.appendChild(parseElement("<div id = \"GameTimeLayer\"></div>"));
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

function isnull(val) {
    let str = val.replace(/(^\s*)|(\s*$)/g, '');
    if (str == '' || str == undefined || str == null) {
        return true;
    } else {
        return false;
    }
}

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

function GetCookieVal(offset) {
    var endstr = document.cookie.indexOf(";", offset);
    if (endstr == -1)
        endstr = document.cookie.length;
    return decodeURIComponent(document.cookie.substring(offset, endstr));
}

function DelCookie(name) {
    var exp = new Date();
    exp.setTime(exp.getTime() - 1);
    var cval = GetCookie(name);
    document.cookie = name + "=" + cval + "; expires=" + exp.toGMTString();
}

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

function autoset(asss) {
    key = asss.split('');
    len = key.length;
    gameRestart();
}

function showImg(input) {
    var file = input.files[0];
    url = window.URL.createObjectURL(file);
}

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
