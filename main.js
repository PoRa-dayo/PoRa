"use strict";
/* 常量 */
const BlankPNG = `data:image/webp;base64,UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAAAFZQOCAYAAAAMAEAnQEqAQABAAFAJiWkAANwAP789AAA`;
const EBody = document.body;
const EElement = document.documentElement;
const RESPATH = `images/interface/`;
const dSurface = $('dSurface');
const PKindUpperLimit = 5;
const PKindTraverseOrder = [5,0,1,2,3,4];     //（用于GetAP）植物遍历顺序
const GrowSoilImg = "images/interface/GrowSoil.webp";
const WaterShadowImg = `images/Zombies/WaterShadow.webp`;
const WaterSplashImg =  `images/Zombies/Drop_Water.webp`;
/* 江南自定义事件注册 */
const EVENT_STARTGAME = new Event("jng-event-startgame");
const EVENT_ENDGAME = new Event("jng-event-endgame");
const EVENT_EXITGAME = new Event("jng-event-exitgame");
/* API */
let $User = {
    // oSym里的时间跨度，默认是1，值为1-5加速1-5倍
    NowStep: 1,
    // oSym里的计时间隔，默认是10；值为20,10,5，分别是减速一半，原速，加速一倍
    TimeStep: 10, 
    // 是否自动拾取阳光
    AutoSun: Number(localStorage['JNG_TR_AUTOSUN']) || false,
    // 用户标识
    Tag: localStorage.tag ? localStorage.tag : "local", 
    // 用户名
    Name: localStorage.name ? localStorage.name : "local", 
    // 是否开启低性能模式
    LowPerformanceMode: false, 
    // 是否启用blob动画
    Async_GIFS_Animate: true, 
    Coins: 0,
    // 记录用户获得成就
    Achievement: localStorage.JNG_TR_Achievement ? JSON.parse(localStorage.JNG_TR_Achievement) : {}, 
    // 是否启用坚果包扎术
    enabledWallNutFirstAid: isNullish(localStorage.JNG_TR_WallNutFirstAid) ? false : true,
    // 阳光铲
    enabledSunShovel: !isNullish(localStorage.JNG_TR_SunShovel) && localStorage.JNG_TR_EnabledItems && JSON.parse(localStorage.JNG_TR_EnabledItems).SunShovel === 1 ? true : false,
    // 强化初始阳光
    enabledMoreStartingSun: !isNullish(localStorage.JNG_TR_MoreStartingSun) && localStorage.JNG_TR_EnabledItems && JSON.parse(localStorage.JNG_TR_EnabledItems).MoreStartingSun === 1 ? true : false,
    // 池塘清洁车
    enabledPoolCleaner: isNullish(localStorage.JNG_TR_PoolCleaner) ? false : true,
    // 战术丢车
    enabledMowerLaunch: isNullish(localStorage.JNG_TR_MowerLaunch) ? false : true,
    // 宝马雕车
    enabledValuableMowers: isNullish(localStorage.JNG_TR_ValuableMowers) ? false : true,
    // 是否画血
    DrawBlood: localStorage.JNG_TR_DrawBlood ? JSON.parse(localStorage.JNG_TR_DrawBlood) : false, 
    //显示键盘快捷键
    ShowShortcuts: localStorage.JNG_TR_ShowShortcuts ? JSON.parse(localStorage.JNG_TR_ShowShortcuts) : false, 
    // 是否时间同步
    TaskForceTimeSync: localStorage.JNG_TR_TaskForceTimeSync ? JSON.parse(localStorage.JNG_TR_TaskForceTimeSync) : true,
    // 是否开启动态难度	
    OpenDynamicDifficulty: navigator.language?.includes("zh") ?? false, 
    // 是否开启剧情
    IS_PLOT_OPEN: localStorage.JNG_TR_IS_PLOT_OPEN ? JSON.parse(localStorage.JNG_TR_IS_PLOT_OPEN) : (!IsDevEnvi), 
    // 游戏音效音量百分比，默认100%
    AudioEffectVolumePercent: localStorage.JNG_TR_AudioPercent ? Number.parseFloat(localStorage.JNG_TR_AudioPercent) : 1,
    // 游戏bgm音量百分比，默认100%
    MusicVolumePercent: localStorage.JNG_TR_MusicPercent ? Number.parseFloat(localStorage.JNG_TR_MusicPercent) : 1,
    _tmpARCARD: {},
};
class __oSymTaskPool__ {
    constructor() {
        this.taskPool = [];
    }
    get(T, f, taskIndex, ar) {
        let taskObject = this.taskPool.pop() ?? {};
        taskObject.T = T;
        taskObject.f = f;
        taskObject.taskIndex = taskIndex;
        taskObject.ar = ar;
        return taskObject;
    }
    recycle(taskObject) {
        delete taskObject.f;
        delete taskObject.ar;
        this.taskPool.push(taskObject);
        return taskObject;
    }
};
const oSym = {
    ZMonitorRefresh: 100,
    BuMonitorRefresh: 10,
    Init(callback, arg = []) { //在每次关卡文件load的时候初始化
        const self = this;
        self.Rewrite(self);
        self.Now = 0; //系统时间
        self.Timer = null; //系统时间定时器
        self.TQ = [];
        self.TQSet = new Set();
        self.NowStep = 1; //oSym里的时间跨度，默认是1，值为1-5加速1-5倍
        self.TimeStep = 10; //oSym里的真实定时器计时间隔，默认是10，值为20,10,5，分别是减速一半，原速，加速一倍
        self.changed = Infinity; //是否改写了数组（保存的是最短的delayT）
        self.taskNum = 0; //数组任务个数
        self.taskTotal = 0; //目前是创建的第几个事件，目的是在排序的时候可以判断事件先后
        self.NowSpeed = 1;
        self.__IncreasedTime__ = null; //你在addTask里设置addTask需要拿现在的时间和理论上调用addTask的时间做差，减去你调用的偏差的时间。
        self.__pool__ = self.__pool ?? new __oSymTaskPool__();
        if ($User.NowSpeed) {
            CSpeed($User.NowSpeed, false);
        }
        self.addTask(0, callback, arg);
        self.Start(); //启动系统进程
    },
    CalcTimePassed(d) { //提供一个通用的方法计算应该经过了多少时间
        return Math.min(d, 100); //最多只能经过100ms，防止一下子过大的突变
    },
    //用重写的方式，避免每次执行的时候都要判断
    Rewrite(self) {
        if (!$User.TaskForceTimeSync) {
            self.Start = () => {
                if (self.Timer === null) {
                    let task, now, step = self.NowStep,
                        lastTime = Date.now(),
                        curTime, TQ = self.TQ;
                    const timeStep = self.TimeStep;
                    const stack = self.TQSet;
                    const pool = self.__pool__;
                    const process = () => {
                        now = self.Now += step;
                        if ((self.changed -= step) < 1) {
                            self.Resort(self);
                        }
                        for (let i = self.taskNum - 1; i >= -1; --i) {
                            task = TQ[i];
                            if (i === -1 || now < task.T) {
                                self.taskNum = i + 1;
                                break;
                            }
                            if (task.T === -Infinity) {
                                if(IsDevEnvi===true){
                                    console.warn("[PvZTR] -Infinity Task", Object.assign({}, task));
                                }
                                continue;
                            }
                            try {
                                task.f(...task.ar);
                                task.T = -Infinity;
                            } catch (err) {
                                console.error(err);
                            }
                        }
                        stack.forEach(task => {
                            if (now >= task.T) {
                                try {
                                    task.f(...task.ar);
                                } catch (err) {
                                    console.error(err);
                                }
                                stack.delete(pool.recycle(task));
                            }
                        });
                    };
                    self.Timer = setInterval(process, self.TimeStep);
                }
            };
            self.addTask = (delayT = 0, callback, arg = [], useSet = false) => {
                //因为游戏中的1相当于浏览器真实计时的10ms，所以传入的delayT（毫秒）要除以10
                const self = this;
                /*const task = {
                    T: self.Now + delayT, //执行时间（自定义的oSym时间）
                    f: callback, //执行函数  
                    taskIndex: self.taskTotal++,
                    ar: arg, //参数的数组形式，用于执行函数传递参数
                };*/
                const task = self.__pool__.get(self.Now + delayT, callback, self.taskTotal++, arg);
                if (delayT < 15 || useSet) { //如果反复写入，则使用集合
                    self.TQSet.add(task);
                } else { //如果为长时间冷却的，则使用数组
                    self.TQ.push(task);
                    self.changed = Math.min(self.changed, delayT);
                }
                return task;
            };
        } 
        else {
            self.Start = () => {
                if (self.Timer === null) {
                    let task, now, step,
                        lastTime = Date.now(),
                        curTime, TQ = self.TQ;
                    const stack = self.TQSet;
                    const pool = self.__pool__;
                    const process = () => {
                        //时间强同步
                        curTime = Date.now();
                        step = Math.max(self.CalcTimePassed(curTime - lastTime) * self.NowSpeed / 10, 0);
                        lastTime = curTime;
                        //时间强同步 End
                        now = self.Now += step;
                        if ((self.changed -= step) < 1) {
                            self.Resort(self);
                        }
                        for (let i = self.taskNum - 1; i >= -1; --i) {
                            task = TQ[i];
                            if (i === -1 || now < task.T) {
                                self.taskNum = i + 1;
                                break;
                            }
                            if (task.T === -Infinity) {
                                if(IsDevEnvi===true){
                                    console.warn("[PvZTR] -Infinity Task", Object.assign({}, task));
                                }
                                continue;
                            }
                            try {
                                //时间强同步
                                self.__IncreasedTime__ = task.T - self.Now;
                                //时间强同步 End
                                task.f(...task.ar);
                                task.T = -Infinity;
                            } catch (err) {
                                console.error(err);
                            }
                        }
                        stack.forEach(task => {
                            if (now >= task.T) {
                                try {
                                    //时间强同步
                                    self.__IncreasedTime__ = task.T - self.Now;
                                    //时间强同步 End
                                    task.f(...task.ar);
                                } catch (err) {
                                    console.error(err);
                                }
                                stack.delete(pool.recycle(task));
                            }
                        });
                        //时间强同步
                        self.__IncreasedTime__ = null;
                        //时间强同步 End
                    };
                    let loopid = self.Timer = Math.random();
                    requestAnimationFrame(function loop() {
                        if (self.Timer !== loopid) {
                            return;
                        }
                        process();
                        requestAnimationFrame(loop);
                    });
                }
            };
            self.addTask = (delayT = 0, callback, arg = [], useSet = false) => {
                //因为游戏中的1相当于浏览器真实计时的10ms，所以传入的delayT（毫秒）要除以10
                const self = this;
                delayT += self.__IncreasedTime__ ?? 0;
                const task = self.__pool__.get(self.Now + delayT, callback, self.taskTotal++, arg);
                if (delayT < 15 || useSet) { //如果反复写入，则使用集合
                    self.TQSet.add(task);
                } else { //如果为长时间冷却的，则使用数组
                    self.TQ.push(task);
                    self.changed = Math.min(self.changed, delayT);
                }
                return task;
            };
        }
    },
    Resort(self) {
        const TQ = self.TQ;
        const pool = self.__pool__;
        self.changed = Infinity;
        TQ.sort((a, b) => {
            return b.T - a.T || b.taskIndex - a.taskIndex; //按时间从大到小排，如果相等则按task的先后排序
        });
        self.taskNum = TQ.length;
        while (self.taskNum--) {
            if (TQ[self.taskNum].T !== -Infinity) {
                break;
            }
            pool.recycle(TQ.pop());
        }
        self.taskNum++;
    },
    removeTask(task) {
        if (!(this.TQSet.delete(task))) {
            task.T = -Infinity;
        }
    },
    Stop() { //中止系统进程
        clearInterval(oSym.Timer);
        oSym.Timer = null;
    },
    Clear() {
        this.TQ.length = 0;
        this.TQSet.clear();
        this.taskNum = 0;
        this.taskTotal = 0;
    },
    Sleep(keepTime) {
        return new Promise(resolve => oSym.addTask(keepTime, resolve));
    },
};
const LevelConfig = {  //关卡默认配置
    config: {
        'Tutorial': {
            backgroundMask: 'BgMask-Tutorial',
            SummonZombieArea:[undefined,undefined,150],
            LoadAccess(callback) {
                oAudioManager.playAudio('Bgm_Tutorial_Noise', 1);
                oSym.addTask(90, callback);
            },
        },
        'Forest': {
            backgroundImage: 'images/interface/Forest.webp',
            backgroundMask: 'BgMask-Forest',
            AllowUserCard:true,
            DynamicDifficulty:true,
            CoinRatio:1,
            SummonZombieArea:[undefined,160,100,370],
        },
        'Forestjx': {
            backgroundImage: 'images/interface/ForestJx.webp',
            backgroundMask: 'BgMask-Forest',
            AllowUserCard:true,
            CoinRatio:1.5,
            SummonZombieArea:[undefined,160,100,370],
            LoadAccess(callback) {
                oAudioManager.playAudio('Bgm_Marsh_Noise', 1,0.5);
                oSym.addTask(90, callback);
            },
        },
        'Marsh': {
            backgroundImage: 'images/interface/Marsh.webp',
            backgroundMask: 'BgMask-Marsh',
            LoadMusic: "Bgm_Marsh_Ready",
            StartGameMusic: "Bgm_Marsh_Fight",
            DKind: 0,
            DynamicDifficulty:true,
            AllowUserCard:true,
            CoinRatio:1,
            SpawnLevelLimit:0.6,
            LoadAccess(callback) {
                oAudioManager.playAudio('Bgm_Marsh_Noise', 1,0.5);
                oSym.addTask(90, callback);
            },
        },
        'Marshjx': {
            backgroundImage: 'images/interface/MarshJx.webp',
            backgroundMask: 'BgMask-Marsh',
            AllowUserCard:true,
            CoinRatio:2,
            LoadAccess(callback) {
                oAudioManager.playAudio('Bgm_Marsh_Noise_JX', 1);
                oSym.addTask(90, callback);
            },
        },
        'Polar': {
            backgroundMask: 'BgMask-Polar',
            get DKind(){
                return (oS.Lvl.replace(/[^0-9]/ig,"")<=15)?1:0;
            },
            get SunNum() {
                return oS.DKind ? 150 : 300;
            },
            get LoadMusic() {
                return `Bgm_Polar_Ready_${oS.DKind ? 1 : 2}`;
            },
            get StartGameMusic() {
                return `Bgm_Polar_Fight_${oS.DKind ? 1 : 2 + Math.round(Math.random()*2)}`;
            },
            get backgroundImage() {
                return `images/interface/Polar${oS.DKind ? '' : '2'}.webp`;
            },
            get LoadAccess() {
                return a=>{
                    oAudioManager.playAudio('Bgm_Polar_Noise', 1);
                    !oS.DKind && (NewEle('PolarFire2', "span", null, {className: 'PolarFire'}, $('tGround')), NewEle('PolarFire', "span", null, {className: 'PolarFire'}, $('tGround')));
                    oSym.addTask(90, a);
                }
            },
            DynamicDifficulty:true,
            AllowUserCard:true,
            CoinRatio:1,
            SummonZombieArea:[70,190,240,370],
        },
        'Polarjx': {
            backgroundMask: 'BgMask-Polar',
            get DKind(){
                return (oS.Lvl.replace(/[^0-9]/ig,"")<=15)?0:1;
            },
            get SunNum() {
                return oS.DKind ? 150 : 300;
            },
            get backgroundImage() {
                return `images/interface/Polar${oS.DKind ? '' : '2'}.webp`;
            },
            SummonZombieArea:[70,190,240,370],
            ZombieRandomSpeed:0,
            AllowUserCard:true,
            CoinRatio:2.5,
        },
        'Industry': {
            PicArr: (function() {
                let arr = ["images/interface/Industry.webp"];
                for (let i=0; i<4; i++) {
                    arr.push("images/interface/haze" + i + ".png");
                    arr.push("images/interface/fog" + i + ".png");
                }
                return arr;
            })(),
            backgroundImage: `images/interface/Industry.webp`,
            LoadMusic: `Bgm_Industry_Ready`,
            AllowUserCard:true,
            backgroundMask: "BgMask-Industry",
            get StartGameMusic(){
                return (oS.Lvl.replace(/[^0-9]/ig,"")<21)?`Bgm_Industry_Fight`:`Bgm_Industry_Fight_2`
            },
            LoadAccess(callback) {
                oAudioManager.playAudio('Bgm_Industry_Noise',1);
                oSym.addTask(90, callback);
            },
            get DynamicDifficulty(){
                return (oS.Lvl.replace(/[^0-9]/ig,"")<19)?true:false;
            },
            CoinRatio:1.5,
            SummonZombieArea:[undefined,undefined,150],
        },
        'Industryjx': {
            PicArr: [`images/interface/Industryjx.webp`],
            backgroundImage: `images/interface/Industryjx.webp`,
            LoadMusic: `Bgm_Industry_Ready_JX`,
            backgroundMask: "BgMask-IndustryJX",
            AllowUserCard:true,
            DKind:0,
            get StartGameMusic(){
                return `Bgm_Industry_Fight_JX`;
            },
            LoadAccess(callback) {
                oAudioManager.playAudio('Bgm_Industry_Noise_JX',1);
                oSym.addTask(90, callback);
            },
            CoinRatio:2.5,
            SummonZombieArea:[undefined,undefined,150],
        },
        'Mirage': {
            PicArr: [`images/interface/Mirage.webp`, `images/interface/Mirage_Night.webp`, 'images/Props/WaterPath/edgeMask.webp', 'images/Props/WaterPath/fullWater.webp', 'images/interface/Tombstone.webp'],
            LoadMusic: `Bgm_Mirage_Ready`,
            AllowUserCard:true,
            backgroundMask: "BgMask-Mirage",
            DKind:1,
            get StartGameMusic(){
                return `Bgm_Mirage_Fight`;
            },
            get backgroundImage() {
                return `images/interface/Mirage${oS.DKind ? '' : '_Night'}.webp`;
            },
            LoadAccess(callback) {
                oAudioManager.playAudio('Bgm_Mirage_Noise',1);
                oSym.addTask(90, callback);
            },
            CoinRatio:2,
            SpawnLevelLimit:0.7,
            SummonZombieArea:[undefined,undefined,150],
        },
        'SeasonA': {
            backgroundImage: 'images/interface/Fuben_Autumn.webp',
            backgroundMask: 'BgMask-Forest',
            LF: [0, 1, 1, 3, 1, 1],
            CoinRatio:1.2,
            LoadMusic: "Fuben_Autumn_Ready",
            AllowUserCard:true,
            StartGameMusic: "Fuben_Autumn_Fight",
            SummonZombieArea:[undefined,160,100,370],
        },  
        'SeasonW': {
            backgroundImage: 'images/interface/Fuben_Winter.webp',
            backgroundMask: 'BgMask-Polar',
            LoadMusic: "Fuben_Winter_Ready",
            StartGameMusic: "Fuben_Winter_Fight",
            SunNum: 200,
            CoinRatio:1.5,
            DKind: 0,
            AllowUserCard:true,
            SummonZombieArea:[70,180,240,370],
        },  
    },
    query() {
        let nLvl = (''+oS['Lvl']).replace(/[^a-zA-Z]+/g, '');
        if(this.config[nLvl]) {
            return this.config[nLvl];
        }
        return {};
    },
},
oS = {
    //静态数据，不会因为关卡以及游戏进程而改变，无需Init只在页面最初定义一次
    W: 1067,
    GroundW:900,
    EDAllScrollLeft:0,
    GroundPictureWidth:1400,
    FightingSceneLeft:115,
    H: 600,
    C: 9,
    LawnMowerX: 70,
    Lvl: 0,
    Silence: Number.parseFloat(localStorage.JNG_TR_AudioPercent) === 0,
    DefaultStartGame() {  //默认开始游戏初始化代码
        if (oS.StartGameMusic) oAudioManager.playMusic(oS.StartGameMusic);
        SetVisible($("tdShovel"), $("dFlagMeter"), $("dTop"));
        oS.ControlFlagmeter && oFlagContent.init({ fullValue: oP.FlagNum-1, curValue: 0 });  //显示进度条
        oS.InitLawnMover(); //剪草机
        PrepareGrowPlants(_ => {
            oP.Monitor();  //开启全局僵尸调度
            BeginCool();  //冷却
            oS.DKind && !oS.IZombie && AutoProduceSun(50);  //掉落阳光
            oSym.addTask(1500, _=>{
                oP.AddZombiesFlag();  //启动僵尸出场
                oS.ControlFlagmeter && oFlagContent.show();
            });
        })
    },
    DefaultFlagToEnd(gotoLevelString=null) {
        ShowWinItem(NewImg("imgSF", "images/interface/Clearance_reward.png", "left:535px;top:200px;width:116px;height:119px;", EDAll, {
            onclick: e=>oS.Lvl.indexOf('jx') < 0 ? 
                GetNewProp(e.target, 'Clearance_reward', '星星', '星星是闯关成功的象征。加油搜集更多星星吧！', gotoLevelString??NextLevel(), "30%", "387px") :
                GetWin(e.target, gotoLevelString??Exitlevel(oS.Lvl, 1))
        }));
    },
    GlobalVariables: {},  //储存重写前的暴露在window上的函数
    warmStart: 0,  //游戏是否已冷启动过了
    Init(rewrite_oS_Json, setting_oP_Json, rewrite_GlobalVariables_Json) {
        const self = this;
        /* 重写全局变量、函数开始 */
        for (let key in rewrite_GlobalVariables_Json) {
            self.GlobalVariables[key] = window[key];      //把重写前的一些公开函数储存进GlobalVariables
            window[key] = rewrite_GlobalVariables_Json[key];     //重写函数
        } 
        //储存选定卡片的普通数组。
        //格式{DID:卡牌dom的id,CDReady:是否冷却,SunReady:阳光充足,PName:植物之构造函数} 。
        //该数组在LetsGO函数执行时被写入数据。在选卡阶段请勿尝试调用本数组！
        window.ArCard = [];  
        //预选植物json数据，格式{${植物EName: {Select: 该植物卡牌是否被选择, PName: 对应植物的构造函数}}, SelNum}
        window.ArPCard = {SelNum: 0, $: {}};
        window.ArSun = {};  //场地上阳光数据
        window.$Z = {};  //场地上僵尸数据
        window.$P = {};  //场地上植物数据
        window.EDAll = $("dAll");
        window.EDAlloffsetLeft = EDAll.offsetLeft;
        window.FightingScene = $('dFightingScene');
        window.Ground = $('tGround');
        window.EDPZ = $("dPZ");
        window.EDPZ_Spare1 = $("dPZ_Spare1");
        window.EDPZ_Spare2 = $("dPZ_Spare2");
        window.EDNewAll = EDAll.cloneNode(true);        //用于调用 SelectModal时重置大舞台
        window.ESSunNum = $("sSunNum");
        /*
           检测是否处于关卡进行状态
           当deep=0时，为非严格检测，只要进入关卡就返回true
           当deep=1时，为严格检测，必须真正开始游戏后才返回true
        */
        window.IsGaming = deep => !!((deep ? oGd?.$['4_-2_1'] : oS.PName.length > 0) && oSym.Timer);
        /* 重写全局变量、函数结束 */
        /* 重写oS对象上挂载的变量开始 */
        const DefaultProperties = {
            /* 关卡常用配置如下 */
            PicArr: [],
            DynamicPicArr: [],
            AudioArr: [],
            MusicArr: [],
            VideoArr: [],
            Coord: 1,
            DeltaY: 100, //height of each tile, 100 for 5 lanes, 88 for 6 lanes
            LF: [0, 1, 1, 1, 1, 1],
            ZF: null,
            PName: [],
            LoadingPName: [],
            ZName: [],
            SunNum:150,
            backgroundImage: null,      //重置场景参数，以防延续上一关的场景
            backgroundMask: null,  
            isScroll: true,
            InitLawnMover: null,
            InitWaterPath: null,
            SummonZombieArea: [],     //生成僵尸预览的范围
            HaveFog: null,
            FixedProps: {},//固定携带的道具
            ProduceSun: true,  //是否允许生产类植物生产阳光
            AllowUserCard: false,   //是否允许用户携带自己获得的卡片
            SortCardType:1,//排序卡的方式，1是全部排序，0是只排序用户获得卡片，-1是不排序
            StaticCard: 1,      //控制卡的个数是否是固定的。0表示源源不断的随机给卡，每个卡用一次
            ScoreConditionNotMet: false, //in certain WinWithScore levels, score is used as an objective instead of a win condition, and this will be set to true at the start of the level. When you get enough score, this is set to false. If toWin is triggered but ScoreConditionNotMet is true, trigger toOver(2) instead
            DynamicDifficulty: false,//是否开启动态难度
            ZombieRandomSpeed: 0.15,//僵尸速度是否随机（表示僵尸的最大正负速度）
            ControlFlagmeter: true,  //是否授权底层自动控制关卡进度条
            CanSelectCard: true,  //是否允许玩家自由选卡，默认值为允许
            DKind: 1,  //控制白天或黑夜：1表示白天，0表示黑夜 (Note: oS.DKind is mostly to control natural sun drop. Some levels without a nighttime background still have oS.DKind = 0 (Last Stand). Use GetTrueDKind() to check day/night based on background)
            BowlingLimitC: Infinity,
            BonusWarnings: [], //warnings to manually add to the warning system in case the automatic system didn't recognize all the warnings
            EDAllScrollLeft:0,
            NoFinalWave: false, //if true then don't show the FINAL WAVE warning when it's the final wave
            UpsideDown: false,
            DisableUpgrades: false, //disable upgrades such as Sun Shovel, Sun Headstart, etc.
            PlantOrder: 1, //record the planting order for zombies that use this targeting mechanism, like Necromancer Zombie
            coolSpeed: 0.5, //multiplier for plant cards' cooldown speed (e.g. oStopwatch), 0.5 is default
            LoadAccess: null,
            /* 供函数内部调用的配置如下 */
            PicNum: 0,
            AccessNum: 0,
            MCID: null,  //玩家鼠标所指植物卡牌的ID
            Chose: 0,  //鼠标状态：0——无特殊状态，1——种植植物，-1——拖动铲子
            isStartGame: 0,  //关卡是否在进行,0未开始游戏，1开始游戏，2关卡结束
            CoinRatio: 0,
            MaxManualLawnCleaner: 1, // 玩家允许手动触发的小推车数量,当小推车手动触发时,该项会递减
            ChoseCard: "",  //选择的卡片ID
            TempChoseCard: -1, //navigate through plant card list with E, R shortcut key (for services.js)
            TempChoseProp: -1, //navigate through prop list with C shortcut key (for services.js)
            RestartType: null,
            //oS.RestartType: "Survival" if it's a survival level but the checkpoint is not yet reached (when retrying the level the player will start over from the first challenge of the level). "SurvivalCheckpoint" if it's a survival level but the checkpoint is reached (when retrying the player will start from the last checkpoint). All checkpoint progress will be lost if the player quits a Survival level. This property only affects the quit/restart prompt in services.js, you still have to manually change the oS.Lvl yourself. (example: Polar29jx and Industry24jx survival level series)
            MPID: "",  //鼠标所在植物的ID
            CardsType: {},
            SpawnLevelLimit:0,//生成下一波所需要的僵尸等级比例
            autoWaterFlowDirection: true,  //是否自动生成水道路径
            changeDKindConfig: {},
            TombConfig: null,
            __BalancedPlant__:false,//测试功能，平衡植物，目前已经替换完成，这个选项保留在这，如还有需要进行植物大改计划，开启即可
            // 是否开启僵尸图层自动调整功能，该功能适用于围歼战或水道关卡
            observeZombieLayer: false,  
            // 每次进入关卡都会有一个独一无二的token，可以利用其判断关卡是否退出或者重新开始
            LvlToken: '' + Math.random(), 
        };
        //记录挂载在oS上的变量，以便调用SelectModal时将其清除
        self.SelfVariables = new Set(Object.keys(rewrite_oS_Json).concat(Object.keys(DefaultProperties)));
        self.SunNum=null;
        Object.assign(self, rewrite_oS_Json);
        //这里需要分两步进行，两次使用不一样的方法
        Object.assignWithoutOverwrite(self, LevelConfig.query(),DefaultProperties);
        if(false&&self.__BalancedPlant__){//到时候手动设置为true来更改植物
            __TEST_REWRITE_BALANCED_PLANTS__();
            for(let i =0;i< oS.PName.length;i++) {
                oS.PName[i] = window[oS.PName[i].prototype.EName] ?? oS.PName[i];
            }
        }
        //oS.ZF如无配置的话默认与oS.LF一致
        ! self.ZF && (self.ZF = self.LF);
        //播放LoadMusic，并加载其他音频
        self.LoadMusic && self.warmStart && oAudioManager.playMusic(self.LoadMusic);
        self.MusicArr = (oS.StartGameMusic ? [oS.StartGameMusic] : []).concat(self.MusicArr);
        //处理普通关卡的选卡
        if (self.PName.length > 0 && self.StaticCard && self.CanSelectCard) {
            //选卡排序的准备
            let ori_value_json = {};
            for(let i =0;i<self.PName.length;i++){
                ori_value_json[self.PName[i].prototype.EName]=1e7+i;//一个非常大的整数，保证未在表中有的植物会被排在最后
            }
            let value_json = {};
            if (self.AllowUserCard) {
                let userGetStr = JSON.parse(localStorage.JNG_TR_GotPlants ?? "[]"),
                userGet = userGetStr.map(ename => window[ename]);
                
                self.PName = self.PName.concat(userGet).unique();
                if(self.SortCardType===0){
                    let valueKeyArray = AllPlantsENameArr.getValueIndexedJson();
                    let valueKeyUserGet = userGetStr.getValueIndexedJson();
                    for(let i =0;i<self.PName.length;i++){
                        let name = self.PName[i].prototype.EName;
                        if(valueKeyUserGet[name]){
                            value_json[name]=valueKeyArray[name]??1e7+i;
                        }else{
                            value_json[name]=valueKeyArray[name]??i;
                        }
                    }
                }
            }
            if(self.SortCardType===1){
                for(let i =0;i<AllPlantsENameArr.length;i++){
                    value_json[AllPlantsENameArr[i]]=i;
                }
            }
            if(self.SortCardType>=0){
                self.PName.sort((a,b)=>{
                    return (value_json[a.prototype.EName]??ori_value_json[a.prototype.EName])-(value_json[b.prototype.EName]??ori_value_json[b.prototype.EName]);
                });
            }
            //If the number of cards in PName exceeds the number of card slots allowed, allow free selection
            //If oS.Slots is not manually stated in the level file, in non-Mirror Adventure levels, the default number of card slots is 7 and can be purchased up to 10, and in other locations there will be 10 card slots
            let chklvl = /Forest|Marsh|Polar|Industry|Mirage/.test(oS.Lvl) && !/jx|Bonus_level/.test(oS.Lvl);
            self.CanSelectCard = self.PName.length > (oS.Slots || (chklvl ? JSON.parse(localStorage.JNG_TR_Slots || 7) : 10));
            
        }
        //check for plants that can only be used for a limited number of times
        self.PName.forEach((targetPlant) => {
            if (targetPlant.prototype.SpawnLimit) {
                targetPlant.spawntimes = 0;
                targetPlant.prototype.SpawnLimitReached = false;
            }
        });
        /* 重写oS对象上挂载的变量结束 */
        /* other开始 */
        oAudioManager.Init();
        if(IsGaming(false)){//如果是关卡，则清理不常用的audios
            oAudioManager.checkClearUnusedAudio();
        }
        oP.FlagToMonitor = setting_oP_Json?.FlagToMonitor || new Object();
        oP.FlagToEnd = setting_oP_Json?.FlagToEnd || self.DefaultFlagToEnd;
        // 分离oS.PName与oS.LoadingPName，便于选卡中不出现的植物的加载
        oS.LoadingPName.push(...oS.PName);  
        oCoord[self.Coord]();  //初始化战斗场地
        oP.Init(setting_oP_Json);
        oT.Init(self.R);  //初始化植物触发器系统
        oZ.Init(self.R);
        oGd.Init();
        oBu.Init();     //载入植物子弹系统
        oCoinContent.Init();    //初始化货币系统
        oTombstone.Init();
        self.LoadProgress();  //启动加载
        oZombieLayerManager.init();
        /* other结束 */
    },
    LoadProgress() {
        oS.LoadingStage = "LoadingRes";
        let PicArr = oS.PicArr;
        let DynamicPicArr = oS.DynamicPicArr;
        let AudioArr = oS.AudioArr.concat(CZombies.prototype.AudioArr);
        /* 加载植物资源 */
        for (let plant of oS.LoadingPName) {
            let proto = plant.prototype;
            proto.PicArr.forEach(pic => {
                oDynamicPic.checkOriginalURL(pic) ? DynamicPicArr.push(pic) : PicArr.push(oURL.removeParam(pic, "useDynamicPic"));
            });
            AudioArr = AudioArr.concat(proto.AudioArr);       
        }
        /* 加载僵尸资源 */
        const AppearX = GetX(11);
        const LF = oGd.$ZF;
        const MaxR = oS.R + 1;
        const Zombies = Array.from(oS.ZName);
        for (let zombie of Zombies) {
            let proto = zombie.prototype;
            proto.PicArr.forEach(pic => {
                oDynamicPic.checkOriginalURL(pic) ? DynamicPicArr.push(pic) : PicArr.push(oURL.removeParam(pic, "useDynamicPic"));
            });
            proto.Init(AppearX, proto, LF, MaxR);
            // 如果当前僵尸有绑定SubsidiaryZombies，则一并加入循环处理
            if (!isNullish(proto.SubsidiaryZombies)) Zombies.push(...proto.SubsidiaryZombies);
        }
        /* 需要列入加载监控的promise如下： */
        oS.PicArr = PicArr.unique().filter(pic => pic && !/^data:image\/\w+;base64/.test(pic));
        oS.DynamicPicArr = DynamicPicArr.unique();
        oS.MustLoadNum = oS.PicArr.length + oS.DynamicPicArr.length + oS.MusicArr.length + oS.VideoArr.length;
        oS.ResolveLoadNum = 0;
        oS.RejectLoadNum = 0;
        //向api提交加载普通图片请求
        const ImgProm = oLoadRes.loadImage({ 
            resourceArr: oS.PicArr,
            singleResolveCB: _ => (oS.ResolveLoadNum++),
            singleRejectCB: _ => (oS.RejectLoadNum++),
        });
        //向api提交加载动态url图片请求
        const DynamicImgProm = oDynamicPic.Init({
            singleResolveCB: _ => (oS.ResolveLoadNum++),
            singleRejectCB: _ => (oS.RejectLoadNum++),
        });
        //向api提交加载bgm请求
        const MusicProm = oLoadRes.loadAudio({
            resourceArr: oS.MusicArr,
            type: "music",
            singleResolveCB: _ => (oS.ResolveLoadNum++),
            singleRejectCB: _ => (oS.RejectLoadNum++),
        });
        //向api提交加载视频请求
        const VideoProm = oLoadRes.loadVideo({ resourceArr: oS.VideoArr,timeout:500000 });
        Promise.allSettled([ImgProm, DynamicImgProm, MusicProm, VideoProm]).then(_ => oS.LoadReady(oS));
        /* 不需要列入加载监控的promise如下： */
        //向api提交加载音效请求
        oLoadRes.loadAudio({ resourceArr: AudioArr });
    },
    LoadReady(_this) {
        if (oS.LoadingStage !== "LoadingRes") return;
        SetNone($("loading"));
        oS.LoadingStage = "Finished";
        //根据游戏调速设置系统对象的计时
        oSym.NowStep = $User.NowStep;
        oSym.TimeStep = $User.TimeStep;
        //恢复进度条状态
        $("sFlagMeterTitleF").innerHTML = _this.LevelName;
        SetHidden($("dFlagMeterContent"), $('dFlagMeter'));
        //设置背景
        SetVisible($("tGround"));
        ! isNullish(_this.backgroundImage) && ($("tGround_Image").style.background = "url(" + _this.backgroundImage + ") no-repeat");
        _this.backgroundMask && FightingScene.classList.add(_this.backgroundMask);  //设置背景蒙版
        oS?.changeDKindConfig?.background_sky && 
                ($("tGround_Sky").style.background = `url:(${oS.changeDKindConfig.background_sky})`);
        DisplayZombie(..._this.SummonZombieArea);
        const callback = function(StartTime) {
            NewEle("imgGrowSoil", 'img', "visibility:hidden;z-index:50", null, FightingScene);
            NewEle("dTitle", "div", 0, 0, EDAll);
            if ($User.enabledMoreStartingSun && $('dSunNum').style.visibility != 'hidden' && !oS.DisableUpgrades) oS.SunNum+=100;
            innerText(ESSunNum, _this.SunNum);
            oSelectCardGUI.Init();  //初始化选择卡片界面中
            if(oS.isScroll){
                oSym.addTask(!StartTime ? 90 : StartTime, oS.ScrollScreen);
            }else{
                oS.NoScroll();
            }
        };
        //如有需要可在关卡内定义LoadAccess，把回调作为参数上传
        //若是正常关卡，直接执行回调
        _this.LoadAccess ? _this.LoadAccess(callback) : callback();
    },
    NoScroll(){
        SetVisible($("dMenu"));
        const CardList =$("dCardList");
        EDAll.scrollLeft =oS.EDAllScrollLeft;
        CardList.style.left = `${oS.EDAllScrollLeft}px`;
        oSelectCardGUI.selectSeveralCards(oS.PName);
        oSym.addTask(90*oSym.NowSpeed, LetsGO);
    },
    ScrollScreen(time = 0, targetLeft = (oS.GroundPictureWidth-oS.W)) { //向右滚动，显示僵尸出场和选择卡片
        let totalTime = 130;
        const CardList =$("dCardList");
        
        if (time < totalTime) {
            EDAll.scrollLeft = Math.round(Math.Lerp(0, targetLeft, (Math.sin(time / totalTime * Math.PI - Math.PI / 2) + 1) / 2));
            let nowTime = new Date();
            requestAnimationFrame(() => {
                oS.ScrollScreen(time + (new Date() - nowTime) / 10 * oSym.NowSpeed, targetLeft);
                CardList.style.left = `${EDAll.scrollLeft}px`;
            });
        } else {
            EDAll.scrollLeft = targetLeft;
            CardList.style.left = `${targetLeft}px`;
            SetVisible($("dMenu"));
            if (oS.CanSelectCard) {
                //let mumDOM = NewEle("mum", "div", "position: absolute; width: 390px; height: 390px; left: 710px; top: 80px; background-image: url(images/interface/mum.webp);", {}, EDAll);
                {
                    //ClearChild(mumDOM);
                    oSelectCardGUI.show(_ => {
                        let tmpArCard = $User._tmpARCARD[oS.Lvl];
                        if (tmpArCard) {
                            let trueArCard = [];//上一次选过的卡，如果是不能选或者不推荐选的，那就不自动选
                            for (let plant of tmpArCard){
                                ![1,3].includes(oS.CardsType[plant.prototype.EName]) && trueArCard.push(plant);
                            }
                            oSelectCardGUI.selectSeveralCards(trueArCard);
                        }
                    });
                    if (!oPropSelectGUI.rerender) oPropSelectGUI.Init();
                    oPropSelectGUI.show();
                    oPropSelectGUI.rerender = 0;
                };
            } else {
                oSelectCardGUI.selectSeveralCards(oS.PName);
                oSym.addTask(90*oSym.NowSpeed, oS.ScrollBack, [LetsGO]);
            }
        }
    },
    ScrollBack(callback) {  //界面往左滚动
        const CardList =$("dCardList");
        const viewDOM = $("viewDOM");
        let oriScrollLeft = EDAll.scrollLeft;
                                                                // ↓130是上面的totalTime
        let totalTime = Math.round(Math.abs(oS.EDAllScrollLeft-oriScrollLeft)/500*130);//要乘以理论上的比例
        let time = 0;
        let dt = $User.LowPerformanceMode?4:2;
        if (oS.CanSelectCard && viewDOM) {
            viewDOM.style.left = `${-EDAll.scrollLeft}px`;
            viewDOM.style.visibility = `hidden`;
        }
        (function fun() {
            if(time<totalTime&&oriScrollLeft!=oS.EDAllScrollLeft) {
                let scrollLeft = Math.floor(Math.Lerp(oriScrollLeft,oS.EDAllScrollLeft,(Math.sin(time/totalTime*Math.PI-Math.PI/2)+1)/2));
                EDAll.scrollLeft = scrollLeft;
                CardList.style.left = `${scrollLeft}px`;
                oSym.Timer?loop():oSym.addTask(0,loop);
                function loop(){
                    let nowTime = new Date();
                    requestAnimationFrame(()=>{
                        time+=(new Date()-nowTime)/10*oSym.NowSpeed;
                        fun(callback);
                    });
                }
            } else {
                EDAll.scrollLeft = oS.EDAllScrollLeft;
                CardList.style.left = `${oS.EDAllScrollLeft}px`;
                oSym.addTask(0, callback);
            }
        })();
    }
},
oCoord = {
    ['1']() {
        //设定总行数
        oS.R = 5; 
        oS.DeltaY = 100;
        //根据鼠标坐标X范围确定中点X坐标和列C的数组，返回格式[X, C] 
        window.ChosePlantX = X => {
            let C = GetC(X-oS.FightingSceneLeft+oS.EDAllScrollLeft);
            return [GetX(C), C];
        };
        //根据鼠标坐标Y范围确定中点Y坐标和列R的数组，返回格式[Y, R] 
        window.ChosePlantY = Y => {
            let R = GetR(Y, true);
            return [GetY(R), R];
        };
        //根据横坐标X找列C
        {
            //let CList = $SSmlList([ - 50, 100, 140, 220, 295, 379, 460, 540, 625, 695, 775, 855, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            let CList = $SSmlList([ - 50, 100, 140, 225, 305, 385, 465, 545, 625, 705, 785, 865, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            window.GetC = X => {
                let C = $SEqlSml(Math.floor(X)-CList[1], CList[0], CList[2]);
                return C;
            }
        };
        //根据纵坐标Y找行R
        window.GetR = (Y, UpsideDownCounted = false) => {
            if (oS.UpsideDown && UpsideDownCounted) Y -= 40;
            let R = $SSml(Y, [86, 174, 270, 380, 470], [0, 1, 2, 3, 4, 5]);
            if (oS.UpsideDown && UpsideDownCounted) R = oS.R - R;
            return R;
        }
        //返回列C的格子水平方向中点X
        window.GetX = (C) => {
            let X = $SEql(C, {
                "-2": -50,
                "-1": 100,
                0 : 140,
                1 : 187,
                2 : 267,
                3 : 347,
                4 : 427,
                5 : 507,
                6 : 587,
                7 : 667,
                8 : 747,
                9 : 827,
                10 : 865,
                11 : 950,
                12 : 1050,
            });
            return X;
        }
        // 返回行R的僵尸/植物底部坐标Y
        window.GetY = (R, UpsideDownCounted = false) => {
            let Y = [75, 175, 270, 380, 470, 575][R];
            if (oS.UpsideDown && UpsideDownCounted) Y = oS.H - Y + oS.DeltaY;
            return Y;
        }
		//根据行返回Y范围,杨桃、保龄球用
        window.GetY1Y2 = R => $SEql(R, {
            0: [0, 75],
            1: [76, 175],
            2: [176, 270],
            3: [271, 380],
            4: [381, 470],
            5: [471, 575]
        });
        // 获取当前行的中点Y坐标
        window.GetMidY = R => {
            let [y1, y2] = window.GetY1Y2(R);
            return Math.round((y1 + y2) / 2);
        }
        //获取僵尸恰好超过3/4点的格子，僵尸水道方向切换用
        {
            let CList = $SSmlList([ - 50, 100, 140, 197, 277, 357, 437, 517, 597, 677, 757, 837, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            window.GetMidC = X => $SEqlSml(Math.floor(X)-CList[1], CList[0], CList[2]);
        };
        window.GetMidR = Y => $SSml(Y, [86, 162, 256, 362, 452, 560], [0, 1, 2, 3, 4, 5, 6]) - 1;
		window.GetRoofDelta = () => {return 0;};
        //生成小推车
        !oS.InitLawnMover && (oS.InitLawnMover = _ => {
            for(let R = 1; R < 6; R++) {
                let WaterLane = false;
                for (let C = 1; C <= oS.C; C++) {
                    if (oGd.$GdType[R][C] === 2) {
                        WaterLane = true;
                        break;
                    }
                }
                oSym.addTask(R*10, CustomSpecial, [($User.enabledPoolCleaner && WaterLane) ? oPoolCleaner : oLawnCleaner, R, -1]);
            }
        });
        //迷雾
        oS.HaveFog && oFog.init().firstRender();
        // 初始化僵尸容器
        oZombieLayerManager.initContainer();
        oP.ConfigureDeltaTop();
        //make sure that all rows beyond row 5 in oS.LF and oS.ZF are invalid
        oS.LF = oS.LF.slice(0,6);
        oS.ZF = oS.ZF.slice(0,6);
    },
    ['2'](){
        oS.R = 6;
        oS.DeltaY = 88;
         window.ChosePlantX = X => {
            let C = GetC(X-oS.FightingSceneLeft+oS.EDAllScrollLeft);
            return [GetX(C), C];
        };
        //根据鼠标坐标Y范围确定中点Y坐标和列R的数组，返回格式[Y, R] 
        window.ChosePlantY = Y => {
            let R = GetR(Y, true);
            return [GetY(R), R];
        };
        //根据横坐标X找列C
        {
            //let CList = $SSmlList([ - 50, 100, 140, 220, 295, 379, 460, 540, 625, 695, 775, 855, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            let CList = $SSmlList([ - 50, 100, 140, 225, 305, 385, 465, 545, 625, 705, 785, 865, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            window.GetC = X => $SEqlSml(Math.floor(X)-CList[1], CList[0], CList[2]);
        };
        //根据纵坐标Y找行R
        window.GetR = (Y, UpsideDownCounted = false) => {
            if (oS.UpsideDown && UpsideDownCounted) Y += 20;
            let R = $SSml(Y, [85, 170, 263, 367, 439, 531], [0, 1, 2, 3, 4, 5, 6]);
            if (oS.UpsideDown && UpsideDownCounted) R = oS.R - R;
            return R;
        };
        //返回列C的格子水平方向中点X
        window.GetX = C => $SEql(C, {
            "-2": -50,
            "-1": 100,
            0 : 140,
            1 : 187,
            2 : 267,
            3 : 347,
            4 : 427,
            5 : 507,
            6 : 587,
            7 : 667,
            8 : 747,
            9 : 827,
            10 : 865,
            11 : 950,
            12 : 1050,
        });
        window.GetY = (R, UpsideDownCounted = false) => {
            let Y = [75, 165, 253, 355, 430, 522, 587][R];
            if (oS.UpsideDown && UpsideDownCounted) Y = oS.H - Y + 100;
            return Y;
        }
        window.GetY1Y2 = (R) => $SEql(R, {
            0 : [0, 85],
            1 : [86, 170],
            2 : [171, 263],
            3 : [264, 367],
            4 : [368, 439],
            5 : [440, 531],
            6 : [532, 600]
        });
		window.GetRoofDelta = () => {return 0;};
        !oS.InitLawnMover && (oS.InitLawnMover = () => {
            for(let R = 1; R < 7; R++) {
                let WaterLane = false;
                for (let C = 1; C <= oS.C; C++) {
                    if (oGd.$GdType[R][C] === 2) {
                        WaterLane = true;
                        break;
                    }
                }
                oSym.addTask(R*10, CustomSpecial, [($User.enabledPoolCleaner && WaterLane) ? oPoolCleaner : oLawnCleaner, R, -1]);
            }
        });
        //迷雾
        oS.HaveFog && oFog.init().firstRender();
        // 初始化僵尸容器
        oZombieLayerManager.initContainer();
        oP.ConfigureDeltaTop();
        //make sure that row 6 in oS.LF and oS.ZF is valid
        if (!oS.LF[6]) oS.LF[6] = 1;
        if (!oS.ZF[6]) oS.ZF[6] = 1;
    },
	['3']() {
        oS.R = 5; 
        oS.DeltaY = 88;
        window.ChosePlantX = X => {
            let C = GetC(X-oS.FightingSceneLeft+oS.EDAllScrollLeft);
            return [GetX(C), C];
        };
        window.ChosePlantY = (Y, C=9) => {
            let R = GetR(Y, true, C);
            return [GetY(R, true, C), R];
        };
        {
            let CList = $SSmlList([ - 50, 100, 140, 225, 305, 385, 465, 545, 625, 705, 785, 865, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            window.GetC = X => {
                let C = $SEqlSml(Math.floor(X)-CList[1], CList[0], CList[2]);
                return C;
            }
        };
        window.GetR = (Y, UpsideDownCounted = false, C=9) => {
            if (oS.UpsideDown && UpsideDownCounted) Y -= 40;
			let delta = C > 5 ? 0 : (6-C)*20;
            let R = $SSml(Y, [89+delta, 171+delta, 258+delta, 339+delta, 423+delta], [0, 1, 2, 3, 4, 5]);
            if (oS.UpsideDown && UpsideDownCounted) R = oS.R - R;
            return R;
        }
        window.GetX = (C) => {
            let X = $SEql(C, {
                "-2": -50,
                "-1": 100,
                0 : 140,
                1 : 187,
                2 : 267,
                3 : 347,
                4 : 427,
                5 : 507,
                6 : 587,
                7 : 667,
                8 : 747,
                9 : 827,
                10 : 865,
                11 : 950,
                12 : 1050,
            });
            return X;
        }
        window.GetY = (R, UpsideDownCounted = false, C = 9) => {
			let delta = C > 5 ? 0 : (6-C)*20;
            let Y = [75+delta, 155+delta, 240+delta, 325+delta, 410+delta, 495+delta][R];
            if (oS.UpsideDown && UpsideDownCounted) Y = oS.H - Y + oS.DeltaY;
            return Y;
        }
        window.GetY1Y2 = (R, C=9) => {
			let delta = C > 5 ? 0 : (6-C)*20;
			return $SEql(R, {
				0: [0+delta, 89+delta],
				1: [90+delta, 171+delta],
				2: [172+delta, 258+delta],
				3: [259+delta, 339+delta],
				4: [340+delta, 423+delta],
				5: [424+delta, 520+delta],
			});
		};
        window.GetMidY = (R, C=9) => {
            let [y1, y2] = window.GetY1Y2(R, C);
            return Math.round((y1 + y2) / 2);
        }
        {
            let CList = $SSmlList([ - 50, 100, 140, 197, 277, 357, 437, 517, 597, 677, 757, 837, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            window.GetMidC = X => $SEqlSml(Math.floor(X)-CList[1], CList[0], CList[2]);
        };
        window.GetMidR = (Y, C=9) => {
			let delta = C > 5 ? 0 : (6-C)*20;
			$SSml(Y, [86+delta, 162+delta, 256+delta, 362+delta, 452+delta, 560+delta], [0, 1, 2, 3, 4, 5, 6]) - 1;
		};
		window.GetRoofDelta = function (X) {
			//get the difference between the roof's height at anywhere beyond 455, and X
			return Math.max(0,Math.floor((455-X)/80*20));
		};
        !oS.InitLawnMover && (oS.InitLawnMover = _ => {
            /*for(let R = 1; R < 6; R++) {
                let WaterLane = false;
                for (let C = 1; C <= oS.C; C++) {
                    if (oGd.$GdType[R][C] === 2) {
                        WaterLane = true;
                        break;
                    }
                }
                oSym.addTask(R*10, CustomSpecial, [($User.enabledPoolCleaner && WaterLane) ? oPoolCleaner : oLawnCleaner, R, -1]);
            }*/
        });
        oS.HaveFog && oFog.init().firstRender();
        oZombieLayerManager.initContainer();
        oP.ConfigureDeltaTop();
        //make sure that all rows beyond row 5 in oS.LF and oS.ZF are invalid
        oS.LF = oS.LF.slice(0,6);
        oS.ZF = oS.ZF.slice(0,6);
    },
},
//oP为负责全局监控的一些东西
oP = {
    MonitorZombiePosition(zombie) {
        if (zombie.ZX && zombie.R) {
            oP.LastDeathPosition = {
                x: zombie.ZX + oS.EDAllScrollLeft,
                y: GetY(zombie.R, false, zombie.C)
            };
        }
    },
    
    //triggered by oCoord
    ConfigureDeltaTop() {
        //for use in bullets.js and certain plants that shoot bullets in multiple lanes
        oP.deltaTopForChangingR = new Map();
        oP.pixelToparr = [];
        //Y pixels changed when switching from lane -> lane: [1->2, 2->3, 3->4, 4->5, 5->6] / [1->2, 2->3, 3->4, 4->5]
        for (let ro = 1; ro < oS.R; ro++) {
            oP.pixelToparr.push(GetY(ro+1) - GetY(ro));
        }
        oP.temR = oS.R || 5;
        for (let i = 1; i < oP.temR; ++i) {
            for (let j = i + 1; j <= oP.temR; ++j) {
                let base = oP.deltaTopForChangingR.get(`${i}_${j - 1}`) ?? 0;
                let delta = oP.pixelToparr[j - 2];
                oP.deltaTopForChangingR.set(`${i}_${j}`, base + delta);
            }
        }
    },
    
    Init(json) {
        oP.LastDeathPosition = {
            x: 535,
            y: 200
        }; //上一个僵尸死亡的地点
        oP.DefaultFlagTime = 1990;//默认的每波时间
        oP.SpecialJudgment = {};
        oP.currentWaveNumLevels = oP.NumLevels = oP.NumZombies = oP.FlagZombies = 0; //全局僵尸数目清零；当前波数重置
		oP.MonitorCalled = false;
        oP.arrZombiesSummonedInOneFlag = [];//刷怪专用随机数生成的东西
        {
            let minArr = [];
            let minIndex = 0;
            oP.randomGetLine=(arR,Lvl=1)=>{
                if(Math.random()<0.15){//有一定概率不参与最小值挑选
                    return arR.random();
                }
				//if it does not fall within that 15% chance, make sure the zombie spawns on the lane with the least total Lvl
				//make sure oP.arrZombiesSummonedInOneFlag only records one flag at a time. The flag number is recorded at oP.arrZombiesSummonedInOneFlag[oS.R+2]
                if(oP.arrZombiesSummonedInOneFlag[oS.R+2]!=oP.FlagZombies){
                    oP.arrZombiesSummonedInOneFlag = [];
                    oP.arrZombiesSummonedInOneFlag[oS.R+2]=oP.FlagZombies;
                    for(let i = 0;i<=oS.R+1;i++){
                        oP.arrZombiesSummonedInOneFlag[i]=0;
                    }
                }
				//oP.arrZombiesSummonedInOneFlag: from 1 -> oS.R is the total amount of Lvl recorded on each row
				//minNum: amount of Lvl on the lane with the least Lvl
				//minArr: an array that contains rows that are confirmed to have the least Lvl (amount of Lvl equal to minNum). This array is not reset every time a new zombie is checked, so only values from index 0 to minIndex-1 are valid.
				//minIndex: only select randomly from minArr from index 0 to minIndex-1
                let minNum = Infinity;
                for(let i = arR.length-1;i>=0;i--){
                    if(oP.arrZombiesSummonedInOneFlag[arR[i]]<minNum){
						//if the row is detected to have less Lvl than minNum, reset the entire minArr, and add the new row to the new minArr
                        minIndex = 1;
                        minArr[0] = arR[i];
                        minNum = oP.arrZombiesSummonedInOneFlag[arR[i]];
                    }else if(oP.arrZombiesSummonedInOneFlag[arR[i]]==minNum){
                        minArr[minIndex++] = arR[i];
                    }
                }
				//all the rows in minArr (up to minIndex-1) are already confirmed to have the least Lvl, so just pick randomly
                let rand = Math.floor(Math.random()*minIndex);
				//add the zombie's Lvl to its row
                oP.arrZombiesSummonedInOneFlag[minArr[rand]]+=Lvl/2+1;
                return minArr[rand];
            };
        };
        
        if (json) {
            Object.assign(oP, json);
            //特殊判定
            oP.SpecialJudgment = {
                //设定到达特定波数时，召唤僵尸相对于SelectFlagZombie被调用的延迟时间（单位10ms）
                //格式：{波数: 延迟时间}
                delays: {}, 
                //设定特定波数剩余僵尸达到一定数量，就直接启动下一波刷怪么
                //格式：{波数: 临界剩余数量}
                checks: {}, 
            };
            Object.assign(oP.SpecialJudgment, json.SpecialJudgment);
            let tmpEnd = oP.FlagToEnd; //在这里附加关卡通关存档以获取成就
            oP.FlagToEnd = _ => {
                let tmpLvl = oS.Lvl;
                tmpEnd.call(oP);
                if (oS.DynamicDifficulty) {
                    oP.operateDynamicDifficulty(1);
                }
                let __tmp = JSON.parse(localStorage["JNG_TR_WON"] ?? "{}");
                __tmp[tmpLvl] = 1;
                localStorage["JNG_TR_WON"] = JSON.stringify(__tmp);
                DataManager.CheckAchievement("lvl", __tmp);
            };
            //如果该关开启了动态难度，则调用方法计算新的a2数组
            if (oS.DynamicDifficulty&&$User.OpenDynamicDifficulty) {
                oP.createDynamicDifficultyArr(oP.FlagToSumNum.a1, oP.FlagToSumNum.a2);
            }
            //配置刷怪 AZ的格式为 [oZombie,weight,startShowFlag,mustShowFlags]
            //weight 可以写成数字或者对象{1:1,3:0.1}这样
            if (oP.AZ) {
                let originalAZ = oP.AZ.sort((a, b) => a[2] - b[2]), //进行根据出场波数从小到大的排序
                    len = originalAZ.length,
                    processedAZ = [],
                    MustShowAtFlag = {},
                    ZombieCurrentWeight={},
                    ZombieWeightNeededToChange = {},
                    ZombiesENameToZombieObj={};
                oP.ArZ = []; //当前波可以出场的僵尸对象数组,在每波刷新前在SelectFlagZombie里组合
                //按出场波数从大到小压入processedAZ
                while (len--) {
                    let arr = originalAZ[len],
                        zombie = arr[0],
                        weight = arr[1],
                        startShowFlag = arr[2],
                        mustShowFlags = arr[3];
                    if(typeof weight !=="number"){//如果不是数字，则是对象
                        for(let i in weight){
                            if(!ZombieWeightNeededToChange[i]){
                                ZombieWeightNeededToChange[i]=[];
                            }
                            ZombieWeightNeededToChange[i].push([zombie.prototype.EName,weight[i]]);
                            if(i<=1||!ZombieCurrentWeight[zombie.prototype.EName]){
                                ZombieCurrentWeight[zombie.prototype.EName] = weight[i];
                            }
                        }
                    }else{
                        ZombieCurrentWeight[zombie.prototype.EName] = weight;
                    }
                    ZombiesENameToZombieObj[zombie.prototype.EName] = zombie;
                    processedAZ.push([zombie, startShowFlag]);
                    mustShowFlags && mustShowFlags.forEach(flag =>
                        MustShowAtFlag[flag] ? MustShowAtFlag[flag].push(zombie) : (MustShowAtFlag[flag] = [zombie])
                    );
                }
                oP.AZ = processedAZ; //展开为[[僵尸2,6],[僵尸1,1],[僵尸1,1]...]
                oP.MustShowAtFlag = MustShowAtFlag; //在某波必须登场的僵尸列表，格式：{6:[oDuckyTubeZombie1]}
                oP.ZombieCurrentWeight = ZombieCurrentWeight;//僵尸当前的权重
                oP.ZombieWeightNeededToChange = ZombieWeightNeededToChange;//僵尸在某一波需要改的权重
                oP.ZombiesENameToZombieObj = ZombiesENameToZombieObj;//创建一个由EName指向僵尸的表
            }
        }
    },
    //oP.MonPrgs由僵尸死亡后被触发。
    //其承担杀死当前场地上最后一个僵尸后，自动调用oP.FlagPrgs刷出下一波僵尸
    //和进行关卡胜利判定的双重功能。
    //警告：isCounted为false的“僵尸傀儡”请勿调用oP.MonPrgs！！！
    MonPrgs(zombie) {
        --oP.NumZombies;
        oP.NumLevels -= (zombie?.Lvl) ?? 0;
		if (oP.FlagZombies <= 0) return;
        if (oP.NumZombies <= 0 || //僵尸数达到0
            (oP.FlagZombies < oP.FlagNum && oP.NumLevels <= oS.SpawnLevelLimit * oP.currentWaveNumLevels) || //如果不是最后一波，且僵尸目前等级数达到触发下一波的要求
            (oP.SpecialJudgment.checks[oP.FlagZombies] && (oP.NumZombies <= oP.SpecialJudgment.checks[oP.FlagZombies])) //特殊判断僵尸数达到要求
        ) {
            if (oP.NumZombies > 0) {
                if (oP.currentWaveNumLevels === -1) { //-1是一个暂时的值，用来记录当前波是否已经触发FlagPrgs
                    return;
                }
                oP.currentWaveNumLevels = -1;
            } else {
                if (oP.ReadyFlag > oP.FlagZombies) return;
            }
            let FlagZombies = oP.FlagZombies;
            /*
                检查是否已抵达最后一波
                如果没有抵达说明接下来还有下一波僵尸要进攻，触发oP.FlagPrgs刷怪
                如果已经抵达说明所有僵尸已被杀死，调用toWin()
            */
            if (FlagZombies < oP.FlagNum) {
                oP.ReadyFlag = ++FlagZombies;
                oSym.addTask(oP.NumZombies <= 0 ? 100 : 200, oP.FlagPrgs);
            } else {
                // 到达最后一波且僵尸被清零，启动胜利校验
                oP.CheckWin();
            }
        }
    },
    //启动僵尸出场
    //本函数在PrepareGrowPlants回调中被触发
    AddZombiesFlag() {
        oAudioManager.playAudio('awooga');
        oS.ControlFlagmeter && SetVisible($("dFlagMeterContent"));
        oP.ReadyFlag = 1;
        oP.FlagPrgs();
    },
    //刷怪和波数监控
    FlagPrgs() {
        let FlagZombies = oP.FlagZombies; //更新全局僵尸已进攻次数
        let FlagToSumNum = oP.FlagToSumNum; //关卡文件提供的刷怪数据
        let ZSum = $SSml(FlagZombies, FlagToSumNum.a1, FlagToSumNum.a2); //从FlagToSumNum.a2中取出当前波要刷僵尸的数量
        //当还有剩余波数
        if (oP.FlagNum > (FlagZombies = ++oP.FlagZombies)) {
            //检查当前波是否存在对应的FlagToMonitor回调，若存在则执行回调
            let callback = $SEql(FlagZombies, oP.FlagToMonitor);
            if (callback) {
                //NOTE: By default when a wave is called, it will take oP.DefaultFlagTime for zombies inside FlagToMonitor of that wave to spawn (Escalation zombies are not affected). To change this, put the delay number at parameter number 2 of the wave in FlagToMonitor
                //NOTE #2: If no zombies die during a wave, oP.DefaultFlagTime will be the delay time to trigger the next wave
                /*e.g.
                    FlagToMonitor: {
                        2: [() => {
                            PlaceZombie(oSkatingZombie,5,12);
                        }, null, 100],
                    }
                The Skating Zombie will spawn after 100 (*0.01s) after wave 2 is called
                    FlagToMonitor: {
                        3: [() => {
                            PlaceZombie(oSculptorZombie,1,12);
                        }],
                    }
                When wave 3 is called, Sculptor Zombie will spawn after oP.DefaultFlagTime. Which means, if wave 4 is not triggered earlier than default, oP.FlagToMonitor[3] should be called in sync with wave 4.
				It is generally more ideal to put the contents of the wave on a timer instead of setting the second parameter to 0, because wave contents can also have delays using oSym.addTask, like this:
					FlagToMonitor: {
						8: [() => {
							oSym.addTask(700,()=>{
								PlaceZombie(oGargantuar, 1, 12);
							});
						}],
						9: [() => { 
							PlaceZombie(oNecromancerZombie,5,12);
						}],
					}
				As the second parameter is oP.DefaultFlagTime by default, the Necromancer Zombie is always guaranteed to spawn after the Gargantuar, even if the player trigger the next waves early.*/
                let delayT = callback[2] ?? Math.max(0, oP.DefaultFlagTime);
                oSym.addTask(delayT, _ => {
                    if (callback.__jng_called__ !== true) {
                        const arg = callback[1];
                        if (!!arg && arg[Symbol.iterator]) {
                            callback[0](...callback[1]);
                        } else {
                            callback[0]();
                        }
                        //对callback进行标记，防止二次调用
                        Object.defineProperty(callback, "__jng_called__", {
                            value: true,
                            configurable: false,
                            enumerable: false,
                        });
                    }
                });
            }
            //在启动下一波僵尸的进攻以前，需要先校验oP.ReadyFlag
            //如果oP.ReadyFlag不再等于FlagZombies，则说明oP.FlagPrgs已经oP.MonPrgs被重新触发过
            //则此时不再主动调用oP.FlagPrgs刷下一波僵尸。反则就需要主动调用。
            oSym.addTask(oP.DefaultFlagTime, _ => {
                oP.ReadyFlag === FlagZombies && (oP.ReadyFlag++, oP.FlagPrgs());
            });
        } else {
            if (oP.FlagNum === FlagZombies) FinalWave();
        }
        //If the previous wave's oP.FlagToMonitor is not triggered, trigger it immediately. (For example if wave 4 arrives but oP.FlagToMonitor[3] is not triggered (because in MonPrgs the SpecialJudgment is satisfied or oP.NumZombies reaches 0 which triggers wave 4 early), trigger oP.FlagToMonitor[3] immediately and ignore the delay number)
        if (FlagZombies > 1) {
            let callback2 = $SEql(FlagZombies-1, oP.FlagToMonitor);
            if (callback2 && callback2.__jng_called__ !== true) {
                const arg = callback2[1];
                if (!!arg && arg[Symbol.iterator]) {
                    callback2[0](...callback2[1]);
                } else {
                    callback2[0]();
                }
                //对callback进行标记，防止二次调用
                Object.defineProperty(callback2, "__jng_called__", {
                    value: true,
                    configurable: false,
                    enumerable: false,
                });
            }
        }
        if (oP.ZombieWeightNeededToChange[FlagZombies]) { //更改僵尸的权重
            for (let arr of oP.ZombieWeightNeededToChange[FlagZombies]) {
                oP.ZombieCurrentWeight[arr[0]] = arr[1];
            }
        }
        oS.ControlFlagmeter && /NormalHead/.test(oFlagContent.__HeadEle__.className) && oFlagContent.update({
            curValue: FlagZombies - 1
        }); //更新进度条
        oP.SelectFlagZombie(ZSum, FlagZombies); //刷怪
        (function AutoCheckWin(times=0) {
            //This function is used as a LAST RESORT to check victory condition, this time based on $Z instead of oP.NumZombies
            if (oP.FlagZombies >= oP.FlagNum && oP.FlagZombies > 0) {
                let wait=0;
                for (let i of $Z) {
                    if (i.isCounted) wait++;
                }
                if (wait == 0) {
                    if (times < 7) {
                        oSym.addTask(200, () => {AutoCheckWin(++times)});
                    } else {
                        //If CheckWin takes too long to activate then this shows up
                        console.warn(`[PVZTR] AutoCheckWin activated`);
                        toWin();
                        for (let i of $Z) {
                            if (!i.isPuppet) i.ExplosionDie(1);
                        }
                    }
                } else {
                    oSym.addTask(500, () => {AutoCheckWin(0)});
                }
            }
        })();
    },
    // 延迟校验胜利
    CheckWin() {
        let FlagToSumNum = oP.FlagToSumNum;
        let zombieNumInLastFlag = $SSml(oP.FlagNum, FlagToSumNum.a1, FlagToSumNum.a2);
        let delayTime = zombieNumInLastFlag < 1 ? Math.max(500, oP.DefaultFlagTime - 1490) : 500;
        oSym.addTask(delayTime, () => {
            if (oP.NumZombies <= 0) {
                let wait = 0;
                for (let i of $Z) {
                    if (!i.isPuppet) {
                        wait++;
                        i.ExplosionDie(1);
                    }
                }
                oSym.addTask(wait ? 300 : 0, () => {toWin();});
            }
        });
    },
    /*
        生成进攻僵尸
        zSum：按关卡配置当前波要进攻的僵尸总数；后在代码中用于计量僵尸是否全部出完
        FlagZombies：当前第几波
    */
    SelectFlagZombie(zSum, FlagZombies) { //生成进攻僵尸
        let self = oP;
        let ArZ = self.ArZ; //需要接下去临时生成的可选僵尸池
        let AZ = self.AZ; //僵尸配置表，包含要进攻的各类僵尸，并按出场顺序从大到小排好
        let Weights = [];//权重
        let WeightsArrLength = 0;
        let constructors = []; //储存最终要刷僵尸的构造函数
        let delayT = self.SpecialJudgment.delays[FlagZombies] || 150; //刷怪相对于SelectFlagZombie被调用的延迟
        /* 更新ArZ */
        let hasNewZombieAdd = false;
        let lenAZ = AZ.length;
        let originalZSum = zSum;
        while (lenAZ--) { //从尾部开始遍历AZ，把能够出场的僵尸（带权重）全部压入ArZ中
            let zConfig = AZ[lenAZ];
            if (zConfig[1] > FlagZombies) { //碰到出场在当前波僵尸之后的，马上终止遍历
                break;
            } else {
                AZ.pop(); //从AZ池中弹出要出的僵尸
                ArZ.push(zConfig[0]); //将僵尸压入ArZ池，准备接受随机挑选和出怪
                hasNewZombieAdd = true;
            }
        }
        hasNewZombieAdd && ArZ.sort((a, b) => a.prototype.Lvl - b.prototype.Lvl); //如有新僵尸加入池中，则按强度从小到大重新排序池，便于生成constructors的时候进行lvl检查
        for(let i of ArZ){//向权重数组中添加ArZ的值，便于抽取
            Weights[WeightsArrLength++] = oP.ZombieCurrentWeight[i.prototype.EName];//ArZ与权重数组是一一对应的
            if(WeightsArrLength>1){
                Weights[WeightsArrLength-1]+=Weights[WeightsArrLength-2];
            }
        }
        function lower_bound(arr,st,ed,target){
            let mid;
            while(st<=ed){
                mid = Math.floor((st+ed)/2);
                if(target>arr[mid]){
                    st = mid+1;
                }else{
                    ed = mid-1;
                }
            }
            return st;
        }
        /* 处理必出僵尸 */
        let MustShowAtFlag = self.MustShowAtFlag[FlagZombies]; //尝试调取当前波必出僵尸（如果有的话）
        if (MustShowAtFlag) {
            for (let mustShowZombie of MustShowAtFlag) {
                constructors.push(mustShowZombie);
                zSum -= mustShowZombie.prototype.Lvl; //僵尸强度可以1:1抵消当前要刷僵尸的数量
            }
        }
        /* 生成constructors */
        let lenArZ = ArZ.length;
        if (lenArZ < 1) {
            return; //如果出了必出僵尸以外没有僵尸要出了，就直接返回，不然会出错
        }
        let indexArz = lenArZ - 1;
        let nowLvl = ArZ[indexArz].prototype.Lvl;
        while (zSum > 0) {
            //对ArZ从尾部开始对僵尸逐一进行lvl检查，以确定本轮递归有效僵尸池长度
            //若lvl大于当前总出怪强度zSum，且并未检测到头部，则放弃并继续向头部检测
            if (indexArz && nowLvl > zSum) {
                while (--indexArz && ArZ[indexArz].prototype.Lvl > zSum);
                lenArZ = indexArz + 1;
                nowLvl = ArZ[indexArz].prototype.Lvl;
            }
            let newZombie = ArZ[lower_bound(Weights,0,lenArZ,Math.random()*Weights[lenArZ-1])]; //根据每轮最终确定的有效僵尸池长度lenArZ来随机抽取出怪
            zSum -= newZombie.prototype.Lvl;
            constructors.push(newZombie);
        }
        /* 召唤僵尸 */
        self.NumZombies += constructors.length;
        self.NumLevels += originalZSum - zSum;
        self.currentWaveNumLevels = originalZSum - zSum;
        self.SetTimeoutZombie(constructors, delayT);
    },
    SetTimeoutZombie(constructors, delayT) {
        let _delayT = 0;
        constructors.forEach(constructor => {
            const zombie = new constructor();
            const htmlCode = zombie.prepareBirth(_delayT);
            const fragment = $n('template');
            fragment.innerHTML = htmlCode;
            const func = () => {
                oZombieLayerManager.$Containers[zombie.R]?.append(fragment.content);
                zombie.Birth();
            };
            requestIdleCallback(() => {
                if (oS.isStartGame === 1) { //if the player restarts the level while there are zombies still scheduled in requestidlecallback, those zombies won't spawn because oS.isStartGame is already 0
                    oSym.Timer ? func() : oSym.addTask(0, func);
                }
            }, {timeout: Math.floor(1000 + Math.random() * 3000)/oSym.NowSpeed});
            //NOTE: the timeout is a solution for 'zombie spawns being delayed until browser is idle' bug
            //僵尸出现实际的相对SelectFlagZombie调用延迟，会在预设的90%~110%之间波动
            _delayT += delayT * (Math.random() * 0.2 + 0.9);  
        });
    },
    AppearUP(zombie, R, C, animConfig, isSync, ignoreStartGameChk = false) {
        let {
            useEleBodyAnim,
            useDirtAnim
        } = animConfig;
        const isInWater = oGd.$GdType[R][C] === 2 && !zombie.isVehicle;
		const RoofDelta = oS.Coord != 3 ? 0 : GetRoofDelta(GetX(C)-80);
        const htmlCode = zombie.CustomBirth(R, C, useEleBodyAnim ? 31 : 0, 0);
        if (!htmlCode) return;
        const dirtAnimation = () => {
            const cnt = oZombieLayerManager.$Containers[R];
            const zIndex = zombie.zIndex_cont + 2;
            if (isInWater && !zombie.Ethereal) {
                oAudioManager.playAudio(`Rifter_Summon${1 + Math.floor(Math.random())}`, false, 0.3);
                oEffects.ImgSpriter({
                    ele: NewEle(`Dirt_${Math.random()}`, "div", `position:absolute;overflow:hidden;z-index:${zIndex};width:150px;height:184px;left:${770 - (9 - C)*82}px;top:${oS.DeltaY*(R-1) + 11 + RoofDelta}px;transform:scale(1.4);background:url(images/Props/Rifter/Drop_Water.png) no-repeat`, 0, cnt),
                    styleProperty: 'X',
                    changeValue: -150,
                    frameNum: 37,
                    interval: 4,
                    callback: ClearChild,
                });
            } else if (!zombie.Ethereal) {
                oAudioManager.playAudio('dirt_rise');
                oEffects.ImgSpriter({
                    ele: NewEle(`Dirt_${Math.random()}`, "div", `position:absolute;background:url(images/Zombies/dirt.png) no-repeat;z-index:${zIndex};left:${766 - (9 - C)*80}px;top:${oS.DeltaY*(R-1) + 25 + RoofDelta}px;height:162px;width:126px;`, 0, cnt),
                    styleProperty: 'X',
                    changeValue: -126,
                    frameNum: 22,
                    callback: ele => oEffects.fadeOut(ele, 'slow', ClearChild),
                });
            }
        };
        const fragment = $n('template');
        fragment.innerHTML = htmlCode;
        const func = () => {
            // 插入僵尸dom
            zombie.useTraditionalWrap ?
                EDPZ.append(fragment.content) :
                oZombieLayerManager.$Containers[zombie.R]?.append(fragment.content);
            // 调用Birth函数唤醒僵尸
            zombie.Birth(void 0, true);
            if (!zombie.Ele) return;
            SetBlock(zombie.Ele);
            // 处理动画
            let height = zombie.height;
            let EleBody = zombie.EleBody;
            let targetTop = (isInWater ? oGd.$WaterDepth[R][C] + zombie.extraDivingDepth : 0);
            if (zombie.Ethereal) EleBody.style.opacity = "0.5";
            // 如果僵尸在水中的话，给僵尸加上水波效果
            if (isInWater) {
                zombie.setWaterStyle_middleWare();
            }
            if (useEleBodyAnim) {
                let temp_altitude = zombie.Altitude;
                zombie.Altitude = 3;
                if ($User.LowPerformanceMode && zombie.EName !== 'oSpiritGuardian') {
                    EleBody.style.opacity = "0";
                    oSym.addTask(1 / oSym.NowSpeed, () => {
                        EleBody.style.opacity = "1";
                        SetStyle(EleBody, {
                            'top': targetTop + zombie.GetDTop + 'px',
                            'clip-path': `inset(0 0 calc(100% - ${height - targetTop}px) 0)`
                        });
                        if (!isInWater) {
                            SetStyle(EleBody, {
                                'clip-path': `inset(0 0 0 0)`
                            });
                        }
                    });
                } else {
                    EleBody.style.top = (height - zombie.GetBlankTop) + 'px';
                    SetStyle(EleBody, {
                        'clip-path': `inset(0 0 100% 0)`
                    });
                    oEffects.Animate(EleBody, {
                        top: targetTop + zombie.GetDTop + 'px',
                        // 计算clip的时候不能算上僵尸的GetDTop
                        // 不然可能会把僵尸动图最底部的部分给截掉
                        'clip-path': `inset(0 0 calc(100% - ${height - targetTop}px) 0)`,
                    }, (Math.abs(height-targetTop)/140*0.3) / oSym.NowSpeed, 'ease-out', () => {
                        if (!isInWater) {
                            SetStyle(EleBody, {
                                'clip-path': `inset(0 0 0 0)`
                            });
                        }
                    }, 0, 1, 'transition');
                }
                oSym.addTask(Math.abs(height-targetTop)/140*30, () => {
                    zombie.Altitude = temp_altitude;
                    if (isInWater) {
                        zombie.useSinkIntoWaterEffect(zombie, targetTop);
                        zombie.SetWater(targetTop, R, C, null, false, false);
                    }
                });
            } else if (isInWater) {
                zombie.useSinkIntoWaterEffect(zombie, targetTop);
                zombie.SetWater(targetTop, R, C, null, false, false);
            } else {
                SetStyle(EleBody, {
                    top: targetTop + zombie.GetDTop + 'px',
                    'clip-path': `inset(0 0 0 0)`
                });
            }
            if (useDirtAnim) dirtAnimation();
        };
        // 把僵尸纳入计数器
        // 这里改成同步，确保异步检测关卡结束的时候能把正准备要钻出来的僵尸给检测进去
        if (zombie.isCounted) {
            oP.NumZombies++;
            oP.NumLevels += zombie.Lvl;
        }
        if (isSync || zombie.isPuppet) {
            //since Puppets have their oGd.$LockingGrid registered immediately, it should not go through requestIdleCallback
            func();
        } else {
            requestIdleCallback(() => {
                if (oS.isStartGame !== 1) {
                    console.warn('[PvZTR] Can no longer spawn zombies before oS.isStartGame = 1, unless the ignoreStartGameChk parameter or isSync parameter is set to true');
                }
                if (oS.isStartGame === 1 && !ignoreStartGameChk) {  //if the player restarts the level while there are zombies still scheduled in requestidlecallback, those zombies won't spawn because oS.isStartGame is already 0
                    oSym.Timer ? func() : oSym.addTask(0, func);
                }
            }, {timeout: Math.floor(1000 + Math.random() * 3000)/oSym.NowSpeed});
            //NOTE: the timeout is a solution for 'zombie spawns being delayed until browser is idle' bug
        }
        return zombie;
    },
    Monitor(callback) {
		if (oP.MonitorCalled) return;
        callback && callback.f(...callback.ar);
		oP.MonitorCalled = true;
        const traversalOf = oZ.traversalOf;
        const zombieLayerRefresh = oZombieLayerManager.refresh.bind(oZombieLayerManager);
        const bulletsTraversalOf = oBu.traversalOf.bind(oBu);

        if($User.TaskForceTimeSync){
            let lastTime = Date.now(),lastTimeB = lastTime;
            let curTime = lastTime;
            let saver = null;
            let TimeBulletUpdate = $User.LowPerformanceMode?17:oSym.BuMonitorRefresh;
            let _tmp;
            requestAnimationFrame(function fun(){
                curTime = Date.now();
                if(saver){
                    lastTime+=curTime-saver;
                    lastTimeB+=curTime-saver;
                    saver=null;
                }
                if((_tmp=oSym.CalcTimePassed(curTime-lastTimeB)*oSym.NowSpeed)>=TimeBulletUpdate){
                    bulletsTraversalOf(_tmp/oSym.BuMonitorRefresh);
                    lastTimeB=curTime;
                }
                if((_tmp=oSym.CalcTimePassed(curTime-lastTime)*oSym.NowSpeed)>=oSym.ZMonitorRefresh){
                    traversalOf(_tmp/oSym.ZMonitorRefresh);
                    lastTime=curTime;
                    oS.observeZombieLayer && zombieLayerRefresh();
                }
                oSym.Timer?requestAnimationFrame(fun):(()=>{
                    saver = curTime;
                    oSym.addTask(1,fun);
                })();
            });
        }else{
            let t1 = oSym.ZMonitorRefresh/10,t2=oSym.BuMonitorRefresh/10;
            (function fun() {
                traversalOf();
                oS.observeZombieLayer && zombieLayerRefresh();
                oSym.addTask(t1, fun);
            })();
            if($User.LowPerformanceMode){
                (function fun2() {
                    bulletsTraversalOf(3);
                    oSym.addTask(3, fun2);
                })();
            }else{
                (function fun2() {
                    bulletsTraversalOf();
                    oSym.addTask(t2, fun2);
                })();
            }
        }
        if($User.DrawBlood){
            let ratio = $User.LowPerformanceMode?4/5:1;
            let canvas = NewEle("HPbarcanvas","canvas",`position:absolute;left:0;top:0;width:${oS.W}px;height:600px;pointer-events:none;z-index:${3*(oS.R+1)}`,{
                width:Math.floor(oS.W*ratio),
                height:Math.floor(600*ratio)
            },EDPZ);
            let ctx = canvas.getContext("2d");
            ctx.globalAlpha = 0.7;
            let box = {width:50,height:3};
            let blueBoxRelatvieY = -3;
            function fillRectRatio(x,y,width,height){
                ctx.fillRect(Math.round(x*ratio),Math.round(y*ratio),Math.round(width*ratio),Math.round(height*ratio));
            }
            const drawBlood = ()=>{
                ctx.clearRect(0,0,Math.floor(oS.W*ratio),Math.floor(600*ratio));
                let purpleDrawing = [];
                let redDrawing = [];
                let greenDrawing = [];
                let green2Drawing = [];
                let blueDrawing = [];
                let tmpOHP;
                ctx.fillStyle="#555555";
                for(let zombie of $Z){
                    if(zombie.CanDrawBlood){
                        let drawPosition = {
                            x:zombie.X+(zombie.beAttackedPointL+zombie.beAttackedPointR)/2,
                            y:zombie.pixelTop+(zombie.HeadTargetPosition[zombie.isAttacking]??zombie.HeadTargetPosition[0]).y-10-box.height,
                            HPRatio:Math.max(1, Math.min(3, (((zombie.OHP || zombie.constructor.prototype.HP)-zombie.BreakPoint)/500)**1/3 ) )
                        };
                        drawPosition.x -= box.width*drawPosition.HPRatio/2;
                        let blueTriggered = false;
                        if(zombie.ShieldHP>0&&zombie.ShieldHP<(tmpOHP=zombie.OShieldHP)){
                            let obj = Object.assign({
                                ratio:zombie.ShieldHP/tmpOHP,
                            },drawPosition);
                            obj.HPRatio = Math.max(1, Math.min(3, (((zombie.OHP || zombie.constructor.prototype.HP)-zombie.BreakPoint)/500)**1/3 ) );
                            obj.y-=6;
                            purpleDrawing.push(obj);
                            fillRectRatio(obj.x-2,obj.y-2,box.width*obj.HPRatio+4,box.height+4);
                        }
                        if(zombie.OrnHP>0&&zombie.OrnHP<(tmpOHP=zombie.constructor.prototype.OrnHP)&&zombie.OrnHP<Infinity){
                            let obj = Object.assign({
                                ratio:zombie.OrnHP/tmpOHP,
                            },drawPosition);
                            obj.HPRatio = Math.max(1, Math.min(3, (tmpOHP/500)**1/3 ) );
                            obj.y+=blueBoxRelatvieY;
                            blueDrawing.push(obj);
                            fillRectRatio(obj.x-2,obj.y-2,box.width*obj.HPRatio+4,box.height+4);
                            blueTriggered = true;
                        }
                        if(( (zombie.HP!=(tmpOHP=(zombie.OHP || zombie.constructor.prototype.HP))&&zombie.HP<Infinity) ||blueTriggered)&&zombie.HP>=zombie.BreakPoint){
                            let targarr = zombie.constructor.prototype.HP > 4500 || zombie.EName == 'oMembraneZombieSP' ? redDrawing : greenDrawing;
                            targarr.push(Object.assign({
                                ratio:Math.min(1,(zombie.HP-zombie.BreakPoint)/(tmpOHP-zombie.BreakPoint)),
                            },drawPosition));
                            if (zombie.HP > tmpOHP) {
                                let tem = Math.min(1,(zombie.HP-tmpOHP)/300);
                                for (let times=1; times<=(tem>=1?2:1); times++) {
                                    green2Drawing.push(Object.assign({
                                        ratio:tem,
                                    },drawPosition));
                                }
                            }
                            fillRectRatio(drawPosition.x-2,drawPosition.y-2,box.width*drawPosition.HPRatio+4,box.height+4);
                        }
                    }
                }
                for(let plant of $P){
                    if(plant.CanDrawBlood){
                        let drawPosition = {
                            x:plant.pixelLeft+plant.width/2,
                            y:GetY(plant.R,false,plant.C)-box.height-95+plant.BloodBarRelativeHeight,
                            HPRatio: Math.max(1,(((tmpOHP=plant.tempHP||plant.constructor.prototype.HP) - plant.BlueBarHP) / 1000)**1/4)
                        };
                        drawPosition.x-=box.width*drawPosition.HPRatio/2;
                        let BlueHP = plant.BlueBarHP-(tmpOHP-plant.HP);
                        if(plant.HP<tmpOHP&&BlueHP>0){
                            let obj = Object.assign({
                                ratio:BlueHP/plant.BlueBarHP,
                            },drawPosition);
                            obj.HPRatio = Math.max(1,(plant.BlueBarHP/1500)**1/4);
                            let deltaAddY = 0;
                            if(tmpOHP>plant.BlueBarHP){//如果不是全部都是蓝血
                                deltaAddY = blueBoxRelatvieY;
                            }
                            obj.y+=deltaAddY;
                            blueDrawing.push(obj);
                            fillRectRatio(drawPosition.x-2,drawPosition.y-2+deltaAddY,box.width*obj.HPRatio+4,box.height+4);
                        }
                        if(tmpOHP>plant.BlueBarHP&&plant.HP!=tmpOHP&&plant.HP>0&&plant.HP<100000){
                            drawPosition.ratio = Math.min(plant.HP/(tmpOHP-plant.BlueBarHP),1);
                            drawPosition.HPRatio= Math.max(1,((tmpOHP-plant.BlueBarHP)/1000)**1/4);
                            greenDrawing.push(drawPosition);
                            if (plant.HP > tmpOHP) {
                                let objg = Object.assign({},drawPosition);
                                objg.ratio = Math.min(1,(plant.HP-tmpOHP)/1000);
                                for (let times=1; times<=(objg.ratio>=1?2:1); times++) {
                                    green2Drawing.push(objg);
                                }
                            }
                            fillRectRatio(drawPosition.x-2,drawPosition.y-2,box.width*drawPosition.HPRatio+4,box.height+4);
                        }
                    }
                }
                ctx.fillStyle="#D210EE";
                for(let i = purpleDrawing.length-1;i>=0;i--){
                    fillRectRatio(purpleDrawing[i].x,purpleDrawing[i].y,box.width*purpleDrawing[i].ratio*purpleDrawing[i].HPRatio,box.height);
                }
                ctx.fillStyle="#ff6b6b";
                for(let i = redDrawing.length-1;i>=0;i--){
                    fillRectRatio(redDrawing[i].x,redDrawing[i].y,box.width*redDrawing[i].ratio*redDrawing[i].HPRatio,box.height);
                }
                ctx.fillStyle="#55FF55";
                for(let i = greenDrawing.length-1;i>=0;i--){
                    fillRectRatio(greenDrawing[i].x,greenDrawing[i].y,box.width*greenDrawing[i].ratio*greenDrawing[i].HPRatio,box.height);
                }
                ctx.fillStyle="#ffffff";
                for(let i = green2Drawing.length-1;i>=0;i--){
                    fillRectRatio(green2Drawing[i].x,green2Drawing[i].y,box.width*green2Drawing[i].ratio*green2Drawing[i].HPRatio,box.height);
                }
                ctx.fillStyle="#00CCFF";
                for(let i = blueDrawing.length-1;i>=0;i--){
                    fillRectRatio(blueDrawing[i].x,blueDrawing[i].y,box.width*blueDrawing[i].ratio*blueDrawing[i].HPRatio,box.height);
                }
                return Math.floor(($User.LowPerformanceMode?1.2:1)*oSym.NowSpeed*Math.Clamp((greenDrawing.length+blueDrawing.length+purpleDrawing.length+green2Drawing.length)*2/3,20,150));
            };
            (function fun(){
                oSym.addTask(drawBlood(),fun,void 0,true);
            })();
        }
    },
    /*
    关卡胜利：触发oP.operateDynamicDifficulty(1)
    关卡失败：触发oP.operateDynamicDifficulty(-1)
    关卡中途重新开始：若num>1则强制重置为1；若-4<num<-1则将num再降1
    */
    operateDynamicDifficulty(val = null, absolute = false, noCorrect = false) { //动态难度设置
        let num = Number.parseInt(localStorage["JNG_TR_DYNAMIC_DIFFICULTY_WINRATE"]) || 0;
        //如果val为空，则表明当前为读取数据，直接返回结果即可
        if (val === null) {
            return Math.round(num);
        }
        if (absolute) {
            num = val;
        } else {
            if (noCorrect) {
                num += val;
            } else {
                if (val < 0 && num + val >= 14) {
                    num = 13;
                } else if (val > 0 && num + val <= -4) {
                    num = -2;
                } else {
                    num += val;
                }
            }
        }
        num = Math.Clamp(num,-5,20);
        localStorage["JNG_TR_DYNAMIC_DIFFICULTY_WINRATE"] = num;
        return Math.round(num);
    },
    createDynamicDifficultyArr(a1, a2) {
        const _config_diff = oP.operateDynamicDifficulty();
        for (let i = 0; i < a2.length; i++) {
            if (a2[i] === 0) continue;
            a2[i] = Math.round(a2[i]*Math.sqrt(_config_diff*0.06+1));
        }
    },
    Destroy() {
        delete oP.AZ;
        delete oP.FlagToSumNum;
        delete oP.FlagToMonitor;
    },
},
oGd = {  //场地系统
    Init() {
        let self = this; 
        self.$ = {};  //植物对象和其位置的映射表
        /*
            $LockingGrid作为统一标记当前格被各种障碍物占用，无法种植植物，供CanGrow使用
            除此之外为方便不同障碍物之间的区分，再在oGd地下分设各障碍物自己的映射表
        */
        // 障碍物相关映射表 开始
        self.$LockingGrid = {};
        self.__LockGridType__ = [
            "$Sculpture",
            "$Obstacle",
            "$Tombstones",
            "$Crystal",
            "$Rifter",
            "$IceBlock",  // 冰块映射表。冰块出现在oMiniGames.IceStorm中
            "$Crater",  // 坑位置映射表，在原版jspvz中供毁灭菇使用，现在主要用于标记被冰道覆盖的格子
        ];
        self.__LockGridType__.forEach((type) => {
            if ( ["$Rifter", "$Crater"].includes(type) ) {
                self[type] = new Set();
            } else {
                self[type] = {};
            }
        });
        // 障碍物相关映射表 结束
        self.$Torch = {};  //火炬树桩映射表
        self.$TrafficLights = {};  //红绿灯映射表（红绿灯tmd也能照亮雾）
        self.$Plantern = {};  //路灯花映射表
        self.$Umbrella = {};  // 叶子保护伞映射表
        self.$Lava = {};
		self.$SpinningFans = {};
        self.$PortalsMap = {};
        self.$Link = new Set();
        self.$DeadLink = new Set();
        self.$RoofTiles = {};
        self.$Coins = {};
        self.$LF = oS.LF;
        self.$ZF = oS.ZF;
        self.$GdType = [];
        self.$WaterDepth = [];
        self.$JackinTheBox = 0;
        self.$WaterFlowDirection = [];
        self.$Portals = [];
        // 虽然冰道的代码已经分离出来，
        // 但考虑到冰道素材必须预加载才能画到canvas上，所以这里一并初始化
        oIceRoad.init();
        //需要多预留行/列作为哨兵
        for(let i = 0; i <= oS.R + 1; i++){
            self.$GdType[i] = [];
            self.$WaterDepth[i] = [];
            self.$WaterFlowDirection[i] = [];
            for(let j = 0; j <= oS.C + 1; j++){
                self.$GdType[i][j] = 1 <= j && j <= 9 ? self.$LF[i] : 0;
            }
        }
        oS.InitWaterPath && oWaterPath.init();
    },
    isValidCrood(crood) {
        // 这里利用了正则表达式test方法可以接收非字符串参数，
        // 之后会将其转换为字符串类型再检测这一特性。
        return /\d+_\d+/.test(crood);
    },
    add(newPlant, key) {  //添加植物到映射表
        let hash = this.$;
        let oldPlant = hash[key];
        oldPlant && oldPlant.Die && oldPlant.Die();  //清除格子原有的植物
        hash[key] = newPlant;
    },
    del(plant) {  //把某植物对象从映射表删除
        delete this.$[`${plant.R}_${plant.C}_${plant.PKind}`];
    },
    killAll(R, C, ticket='JNG_TICKET_ShovelPlant') {  //用铲子ticket杀死指定格子的所有植物
        const data = this.$;
        for(let i = 0; i <= PKindUpperLimit; i++) {
            let index = `${R}_${C}_${i}`;
            data[index] && data[index].Die(ticket);
        }
    },
    isLocked(R, C) {
        const key = oGd.isValidCrood(R) ? R : (R + "_" + C);
        return this.__LockGridType__.some(type => !isNullish(this[type][key]));
    },
    /* 
        当该格的所有障碍物清除之后成功解锁该格，或者该格本来就没锁定，返回true
        如该格还有障碍物还无法解锁，或者传入参数不合法，返回false
        支持的调用形式：unlockGrid(1, 1)   or   unlockGrid('1', '1')   or   unlockGrid("1_1")
    */
    unlockGrid(R, C) {
        const key = oGd.isValidCrood(R) ? R : (R + "_" + C);
        //Zomboni can create ice trail (Crater) beneath other lockinggrid objects, so it is necessary to check if there is still a crater before unlocking
        if (this.isLocked(key) || !oGd.isValidCrood(key) || oGd.$Crystal[key] || oGd.$Sculpture[key] || oGd.$IceBlock[key] || oGd.$Crater.has(key)) {
            return false;
        }
        return (delete this.$LockingGrid[key]);
    },
};
class __BulletPool__ {
    constructor() {
        this.pool = [];
    }
    get() {
        return this.pool.pop() ?? {};
    }
    recycle(bulletObject) {
        Object.keys(bulletObject).forEach((property) => {
            delete bulletObject[property];
        });
        this.pool.push(bulletObject);
    }
};
const oBu = {//子弹系统
    Init(){
        let self = this;
        self.$Bullets = {};
        self.__pool__ = self.__pool__ ?? new __BulletPool__();
    },
    createBullet(constructor, ...ar) {
        const bulletObject = this.__pool__.get();
        bulletObject.__proto__ = constructor.prototype;
        constructor.call(bulletObject);
        return bulletObject.Birth(...ar);
    },
    del(obj) {
        let self = this;
        let id = obj.id;
        let bullets = self.$Bullets;
        if (!isNullish(bullets[id])) {
            delete bullets[id];
            self.__pool__.recycle(obj);            
        } else {
            console.warn(`[PVZTR] Can't destroy a missing bullet ${id}.`);
        }
    },
    add(bullet,key){
        let self = this;
        self.$Bullets[key]=bullet;
    },
    traversalOf(times=1){
        let self = this;
        let bullets = self.$Bullets;
        // 更新子弹状态
        for (let bullet of bullets) {
            bullet.Update(bullet, times);
        }
    }
};
var oZ = {
	Init:function(r){//按左攻击点从小到大排序，给往左飞行的子弹等的僵尸序列数组按右检测点从大到小排序
		this.$=[];
        this.$R=[[]];
        for(let i=r;i;this.$[i]=[],this.$[i].__tmpLen__ = 0,this.$R[i--]=[]);
	},
	add(o) { //添加一个僵尸对象
        let rArr = oZ.$[o.R];
        if (isNullish(rArr)) {
            console.warn('[PVZTR] Attempt to spawn a zombie on an uninteractable lane');
            return;
        }
        rArr.__tmpLen__++;
		rArr.push(o);
		rArr.sort((a,b) => a.AttackedLX - b.AttackedLX);
		rArr.RefreshTime = oSym.Now;  //普通触发器数组的刷新时间属性
	},
    del(R, index) {
        const rArr = typeof R === 'number' ? oZ.$[R] : R;
        rArr.__tmpLen__--;
        rArr.splice(index, 1);
    },
	getZ0(x,r,custom=Z=>true) {
        //往右飞的子弹，根据一个点X坐标和R行返回满足僵尸左攻击点<=X && 右攻击点>=X 的第一个僵尸对象 
        //custom为自定义条件
		if( r<1 || r > oS.R) {
            return;
        }
		let i = 0;
        let aL = this.$[r];
        let Z;
        let len = aL.__tmpLen__;
		while(i < len && (Z=aL[i++])?.AttackedLX <= x) {
            if(Z.HP && Z.AttackedRX>=x && custom(Z)) {
                return Z;
            }
        } 
	},
    getZ0Spd(bul,r,custom=Z=>true,dt=0){//这里的deltaTime是子弹相对的，需要乘以子弹时间再除以僵尸时间
        if( r<1 || r > oS.R) {
            return;
        }
		let i = 0;
        let aL = this.$[r];
        let Z;
        let len = aL.__tmpLen__;
        let deltaTime = dt;
		while(i < len && (Z=aL[i++])?.AttackedLX <= bul.pixelLeft+bul.Width+bul.Speed*deltaTime) {
            if(Z.HP && One_Dimensional_Intersection(
                Z.AttackedLX,
                Z.AttackedRX,
                bul.pixelLeft,
                bul.pixelLeft+bul.Width+bul.Speed*deltaTime
            ) && custom(Z)) {
                return Z;
            }
        } 
    },
	getZ1: function(x, r, custom=Z=>true) {
        //往左飞的子弹，根据一个点X坐标和R行返回满足僵尸左攻击点<=X && 右攻击点>=X 的第一个僵尸对象
        if (r < 1 || r > oS.R){
            return;
        }
        let i = 0, aL = this.$[r], aR = this.$R[r], a, Z, t, len;
        if((t = aL.RefreshTime) === aR.RefreshTime){
            a = aR;
        }else{
            a = (this.$R[r] = aL.slice(0));
            a.sort(function(a, b) {
                return b.AttackedRX - a.AttackedRX
            });
            a.RefreshTime = t;
        }
        len = aL.__tmpLen__;
        while (i < len && (Z = a[i++])?.AttackedRX >= x){
            if (Z.HP && Z.AttackedLX <= x && custom(Z)){
                return Z;
            }
        }
    },
    getZ1Spd(bul, r, custom=Z=>true,dt=0){
        //往左飞的子弹，根据一个点X坐标和R行返回满足僵尸左攻击点<=X && 右攻击点>=X 的第一个僵尸对象
        if (r < 1 || r > oS.R){
            return;
        }
        let i = 0, aL = this.$[r], aR = this.$R[r], a, Z, t, len;
        let deltaTime = dt;
        if((t = aL.RefreshTime) === aR.RefreshTime){
            a = aR;
        }else{
            a = (this.$R[r] = aL.slice(0));
            a.sort(function(a, b) {
                return b.AttackedRX - a.AttackedRX
            });
            a.RefreshTime = t;
        }
        len = aL.__tmpLen__;
        while (i < len && (Z = a[i++])?.AttackedRX >= bul.pixelLeft-bul.Speed*deltaTime){
            if (Z.HP && One_Dimensional_Intersection(
                Z.AttackedLX-Z.getRealSpeedJudge(Z,1)*deltaTime*oSym.BuMonitorRefresh/oSym.ZMonitorRefresh,
                Z.AttackedRX,
                bul.pixelLeft-bul.Speed*deltaTime,
                bul.pixelLeft+bul.Width
            ) && custom(Z)){
                return Z;
            }
        }
    },
	getArZ(lx, rx, r,custom = Z=>true) { //根据一个攻击范围的左右点坐标返回所有满足在该范围的僵尸对象数组
        let arr = [];
        for(let zombie of this.$[r]) {
            const LX = zombie.AttackedLX;
            if(LX >= rx) break;
            zombie.HP && (zombie.AttackedRX > lx || zombie.AttackedLX > lx) && custom(zombie) && arr.push(zombie);
        }
		return arr;
	},
	getRangeLeftZ(lx, rx, r, isPitcher=false,BreakPointPicther=false,user) { //根据一个范围的左右坐标，返回区间内最靠左的一个僵尸
		if(r < 1 || r > oS.R) return;  //如果纵向返回越界则放弃搜索
        let zArr = this.$[r];
        let puppetZombie;
        //从左往右遍历僵尸数组
        for(let zombie of zArr) {
            const {AttackedLX, AttackedRX} = zombie;
            //如果僵尸盒子的左边界超出了最大右侧范围，则说明搜索结束
            if(AttackedLX > rx) break;
            //如果没有超过最大右范围的僵尸的边界超出了最小左范围
            if(zombie.HP && (lx < AttackedLX || lx < AttackedRX)) {
                // 子弹不会打中高空飞行的僵尸
                if (zombie.Altitude >= 3 || zombie.Ethereal) {
                    continue;
                }
                //投手优先绕开僵尸傀儡
                if(isPitcher && zombie.isPuppet) {
                    !puppetZombie && (puppetZombie = zombie);
                    continue;
                }
                //蔓越莓会绕开僵尸的临界值
                if(BreakPointPicther && zombie.HP<zombie.BreakPoint){
                    continue;
                }
                if(user&&!user(zombie)){//如果不满足用户函数的也continue
                    continue;
                }
                return zombie;
            }
        }
        //如果是投手且有类僵障碍物的话就返回障碍物
        return isPitcher ? puppetZombie : null;
	},
    //根据一个范围的左右坐标，返回区间内最靠右的一个僵尸
	getRangeRightZ(lx, rx, r, isPitcher=false) { 
        //如果纵向返回越界则放弃搜索
		if(r < 1 || r > oS.R) return;  
        let zArr = this.$[r];
        let puppetZombie;
        //从右往左遍历僵尸数组
        let length = zArr.__tmpLen__;
        for (let i = length - 1; i >= 0; i--) {
            const zombie = zArr[i];
            const {AttackedLX, AttackedRX} = zombie;
            //如果僵尸盒子的右边界超出了最大左侧范围，则说明搜索结束
            if(AttackedRX < lx) break;
            // 如果没有超过最大左侧范围的僵尸落在了区间内
            if(zombie.HP && (AttackedLX < rx || AttackedRX < rx)) {
                // 子弹不会打中高空飞行的僵尸
                if (zombie.Altitude >= 3 || zombie.Ethereal) {
                    continue;
                }
                // 投手优先绕开僵尸傀儡
                if(isPitcher && zombie.isPuppet) {
                    !puppetZombie && (puppetZombie = zombie);
                    continue;
                }
                return zombie;
            }            
        }
        return isPitcher ? puppetZombie : null;
	},
    moveTo(id,R1,R2) { //移动指定的僵尸对象到指定的序列行
		var $R1=this.$[R1],
              $R2=this.$[R2],
              i=$R1.__tmpLen__,
              Ar;
		while(i--) {
            let o=$R1[i];
			o && o.id==id && $R2 && (
                ($R1.__tmpLen__--),
				$R1.splice(i,1),
				o.R=R2,
                ($R2.__tmpLen__++),
				$R2.push(o),
				($R2.sort(function(a,b){return a.AttackedLX-b.AttackedLX})).RefreshTime=$R1.RefreshTime=oSym.Now,
				i=0
			);            
        }
	},
	traversalOf(stepRatio=1) { //遍历僵尸对象并进行移动操作
		let ar = oZ.$;
	    let Hooks = [
            zombieObject => {NeedRefresh = 1;},  //僵尸死亡hook
            zombieObject => {  //僵尸存活hook
                (nowLX = zombieObject.AttackedLX) > lastLX && (NeedResort = NeedRefresh = 1);  //检测是否僵尸的相对位置发生了变化
                lastLX = nowLX;
            },
        ];
        let NeedResort = 0,  //有僵尸的相对位置发生变化
        NeedRefresh = 0, //僵尸队列是否刷新
        lastLX,  //记录从右侧开始上一次检测到的僵尸的AttackedLX
        nowLX,  //记录本次检测到的僵尸的AttackedLX
        arR,index,zombieObject;
		for(let R = 1, len = ar.length; R < len; R++) {
			arR=ar[R], index = arR.__tmpLen__, lastLX = Infinity;
			while(index--) {  //从最右侧开始遍历当前行所有僵尸
				zombieObject = arR[index];
                if (
                    IsDevEnvi
                    && (Number.isNaN(zombieObject.ZX) || Number.isNaN(zombieObject.X) || Number.isNaN(zombieObject.AttackedLX) || Number.isNaN(zombieObject.AttackedRX))
                ) {
                    console.error(`[PVZTR] Find a zombie with abnormal crood:`, zombieObject);
                }
                if(zombieObject.HP) {  //若僵尸还处于存活状态
                    zombieObject.ZX<901 && oT[`chkD${zombieObject.WalkDirection}`](zombieObject, R, oT.$[R], oT.$L[R],stepRatio);  //检测该僵尸是否可以触发现有的任意植物触发器
                    let HookKey = zombieObject.ChkActs(zombieObject, R, arR, index,stepRatio);
					if (HookKey !== 0 && HookKey !== 1) { //unknown bug
						if (IsDevEnvi) debugger;
						HookKey = 0;
						zombieObject.DisappearDie();
					}
					Hooks[HookKey](zombieObject);  //触发僵尸移动，并调用hook
                } 
                //若僵尸实际HP已经为0
                else {  
                    //从队列中删除该僵尸
                    oZ.del(arR, index);
                    //刷新僵尸序列
                    Hooks[0](zombieObject);  
                }
			}
            if(NeedResort) {  //若有僵尸的相对位置发生变化，则当前行进行重排
                NeedResort = NeedRefresh = 0;
                arR.sort((a,b) => a.AttackedLX - b.AttackedLX);
                arR.RefreshTime = oSym.Now;
            } else {  //若没有僵尸的相对位置发生变化，则检查当前行有没有更新（有无僵尸死亡）
                NeedRefresh && (NeedRefresh = 0, arR.RefreshTime = oSym.Now);
            }
        }
	},
},
oT = { //植物触发器管理器
    //有几行就有几个行触发器，$[行]里保存的是[左检测点，右检测点，方向（右0左1），植物id]
    Init(maxR) {
        this.$ = []; //从左往右的触发器们
        this.$L = []; //从右往左的触发器们
        for (let R = maxR; R>0;--R) { //初始化每行的触发器容器
            this.$[R] = [];
            this.$[R].tmpLength = 0;
            this.$L[R] = [];
            this.$L[R].tmpLength = 0;
        }
    },
    //普通触发器数组按右检测点从大到小排序
    add(R, newTriggers, id) { //注册一个触发器
        if (R <= 0 || R > oS.R) return; //无效触发器不予注册
        let currentTriggers = this.$[R];
        for (let trigger of newTriggers) {
            currentTriggers.push([...trigger, id]);
        }
        currentTriggers.sort((a, b) => b[1] - a[1]); //注册完触发器后依向右最大延伸范围从大到小排序
        currentTriggers.tmpLength = currentTriggers.length;
        currentTriggers.RefreshTime = new Date; //普通触发器数组的刷新时间属性
    },
    chkD0(zombie, R, oTR, oTL, stepRatio) { //往左走的僵尸进行检测是否可以触发植物触发器
        let LX = zombie.AttackedLX; //僵尸的左攻击点
        let i = 0;
        let _tp;
        //从大到小遍历当前行触发器，搜索并触发所有有效触发器
        //有效触发器：触发器左监测点≤僵尸左攻击点≤触发器右监测点
        while (i < oTR.tmpLength && (_tp = oTR[i])[1] >= LX) {
            let plant = $P[_tp[3]];
            //I made portals call all plants' InitTrigger whenever they spawn. After portals spawn, when you dig up a plant it might trigger this error where 'plant' does not exist. What's weirder is that it only occurs for certain plants on certain positions and I have no idea what causes this, so i put the 'plant &&' below as a temporary solution.
            
            //若对应植物的触发器处于开启状态则触发
            plant && plant.canTrigger && _tp[0] <= LX+zombie.getRealSpeedJudge(zombie,stepRatio) && plant.TriggerCheck(zombie, _tp[2], i); 
            ++i;
        }
    },
    chkD1(o, R, oTR, oTL) { //往右走的僵尸进行检测进行检测是否可以触发
        let RX = o.AttackedRX;
        let i = 0;
        let _t = oTR.RefreshTime;
        let _r, _tp;
        //检查左触发器更新时间是否==右触发器更新时间
        //否则复制右触发器数组，按左监控点从小到大排序，并且更新左触发器更新时间
        if( _t === oTL.RefreshTime ) {
            _r = oTL;
        } else {
            oTL = this.$L[R] = oTR.slice(0);  //浅拷贝一份oTR触发器数组
            _r = oTL.sort( (a, b) => a[0] - b[0] );  //按照左检测点从小到大排序
            _r.RefreshTime = _t;
            _r.tmpLength=_r.length;
        }
        while (i < _r.tmpLength && (_tp = _r[i])[0] <= RX) {        
            //植物的触发器对象可用并且植物右监控点>=僵尸右攻击点>=植物左监控点
            let _p = $P[_tp[3]];
            //I made portals call all plants' InitTrigger whenever they spawn. After portals spawn, when you dig up a plant it might trigger this error where '_p' does not exist. What's weirder is that it only occurs for certain plants on certain positions and I have no idea what causes this, so i put the '_p &&' below as a temporary solution.
            
            if( _p && _p.canTrigger && _tp[1] >= RX ) {
                _p.TriggerCheck(o, _tp[2], i); 
            }
            ++i;
        }
    },
    delP(o) { //删除指定的植物对象的所有触发器
        let id = o.id;
        let allR = Object.keys(o.oTrigger),$R;
        for (let R of allR) {
            $R = this.$[R];
            for (let i = $R.tmpLength-1; i>=0; --i) {
                if($R[i][3] === id){
                    $R.splice(i, 1);
                }
            }
            $R.RefreshTime = new Date;
            $R.tmpLength = $R.length;
        }
    },
};
const oZombieLayerManager = {
    init() {
        this.observedZombies = new Set();
        this.preRowOfZombie = new Map();
    },
    initContainer() {
        this.$Containers = [];
        const totalRow = oS.R;
        for (let i = 1; i <= totalRow; i++) {
            this.$Containers[i] = NewEle(`dContainer_${i}`, 'div', `z-index:${3 * i };position:absolute;`, null, EDPZ);
        }
    },
    addZombie(zombie) {
        this.observedZombies.add(zombie);
        this.preRowOfZombie.set(zombie, zombie.R);
    },
    delZombie(zombie) {
		//NOTE: calling this can cause the zombie to be deleted from oZombieLayerManager.observedZombies before it is appended to the correct $Container if not timed correctly!
        this.observedZombies.delete(zombie);
        this.preRowOfZombie.delete(zombie);
    },
    refresh() {
        const preRows = this.preRowOfZombie;
        let curR,preR,ZI;
        for (let zombie of this.observedZombies) {
            if (!$Z[zombie.id]) {
                if (zombie.HP <=0) this.delZombie(zombie);
                //there can be a slight delay between the moment a zombie is summoned and the moment that zombie is added to $Z (requestidlecallback shenanigans), therefore it won't only rely on $Z, but also the zombie's HP to determine
                continue;
            }
            curR = zombie.R;
            preR = preRows.get(zombie);
            if (preR !== curR) {
                this.$Containers[curR].append(zombie.Ele);
                preRows.set(zombie, curR);
            }
            if (zombie.FangXiang === 'GoUp' || zombie.FangXiang === 'GoDown') {
                if((ZI=Math.round((zombie.pixelTop + zombie.height)/16)*16)!==zombie.zIndex_cont){
                    zombie.Ele.style.zIndex = zombie.zIndex_cont = ZI;
                }
            } else {
				this.delZombie(zombie);
			}
        }
    },
};
const oLoadRes = {
    loadImage({resourceArr, singleResolveCB, singleRejectCB, timeout = 1234567, resolveImgObject = false}) {
        let promiseArr = [];
        resourceArr.forEach((url) => {
            if (!url || /^data:image\/\w+;base64/.test(url)) return;
            let img = new Image();
            img.src = url;
            let myPromise = new Promise((resolve, reject) => {
                if (img.complete) {
                    resolve([resolveImgObject?[url,img]:url,null]);//timerId传入null
                } else {
                    let timerId = setTimeout(_ => reject([url, `[PVZTR] It's longer than the limit time to load the file ${url}`]), timeout);
                    img.onerror = _ => reject([url, `[PVZTR] Failing to load the file ${url}`, timerId]);
                    img.onload = _ => resolve([resolveImgObject?[url,img]:url, timerId]);
                }
            });
            myPromise.then(([url, timerId]) => {
                if(timerId){
                    clearTimeout(timerId);
                }
                singleResolveCB && singleResolveCB(url);
            }, ([url, msg, timerId]) => {
                clearTimeout(timerId);
                console.error(msg);
                singleRejectCB && singleRejectCB(url, msg);
            });
            promiseArr.push(myPromise);
        });
        return Promise.allSettled(promiseArr);
    },
    //事先需要把音频文件放在audio文件夹里，调用时只需传入不含后缀的文件名。
    //这么处理是为了便于与原先游戏中的其他代码兼容。
    loadAudio({resourceArr, type = "audio", singleResolveCB, singleRejectCB, timeout = 1234567, canUpdateMap = false}) {
        if (oS.Silence || (type === "audio" && oS.AudioSilence)) return -1;
        let promiseArr = [];
        resourceArr.forEach((url) => {
            if (!url) return;
            let media;
			let tempMedia = oAudioManager.resourceAudioMap.get(`audio/${url}.mp3`)?.dom;
			if (tempMedia) {
				media = tempMedia;
			} else if (!IsHowling || type !== "audio") {
                media = new Audio();
                media.src = `audio/${url}.mp3`;
            }else{
                media = new Howl({
                    src: [`audio/${url}.mp3`],
                    html5: (!IsHttpEnvi&&IsFileEnvi)
                });
            }
            let myPromise = new Promise((resolve, reject) => {
                //当readyState=4，或oncanplay被触发时，表示
                //iOS can't fire oncanplay before the audio is played
                //已加载数据足以开始播放 ，且预计如果网速得到保障，那么音视频可以一直播放到底。
                if (media.readyState === 4) {
                    if (IsHowling && type === 'audio' && media._state === 'loading') {
                        media.on('load', function(){
                            resolve([url, media]);
                        });
						media.on('loaderror', function(){
                            reject([url, media._state === 'unloaded' ? undefined : `[PVZTR] Failing to load the file ${url}`]);
                        });
                    } else {
                        resolve([url, media]);
                    }
                } else {
                    let timerId = setTimeout(_ => reject([url, `[PVZTR] It took longer than the limit time to load the file ${url}`]), timeout);
                    media.onerror = _ => reject([url, `[PVZTR] Failing to load the file ${url}`, timerId]);
                    if (IsMobile && IsIOS) media.onloadedmetadata = _ => resolve([url, media, timerId]);
                    media.oncanplay = _ => resolve([url, media, timerId]);
                }
            })
            .then(([url, media, timerId]) => {
                clearTimeout(timerId);
                oAudioManager.newAudio(url,type,canUpdateMap,media);
				media.onload = media.onloaderror = media.onerror = media.onloadedmetadata = media.oncanplay = null;
                return singleResolveCB && singleResolveCB(url, media);
            }, ([url, msg, timerId]) => {
                clearTimeout(timerId);
                if (msg) console.error(msg);
				media.onload = media.onloaderror = media.onerror = media.onloadedmetadata = media.oncanplay = null;
                return singleRejectCB && singleRejectCB(url, msg);
            });
            promiseArr.push(myPromise);
        });
        return Promise.allSettled(promiseArr);
    },
    loadVideo({resourceArr, singleResolveCB, singleRejectCB, timeout = 123456789}) {
        let promiseArr = [];
        resourceArr.forEach((url) => {
            if (!url) return;
            let media = document.createElement('video');
            media.src = url;
            let myPromise = new Promise((resolve, reject) => {
                if (media.readyState === 4) {
                    resolve(url);
                } else {
                    let timerId = setTimeout(_ => reject([url, `[PVZTR] It took longer than the limit time to load the file ${url}`]), timeout);
                    media.onerror = _ => reject([url, `[PVZTR] Failing to load the file ${url}`, timerId]);
                    if (IsMobile && IsIOS) media.onloadedmetadata = _ => resolve([url, media, timerId]);
                    media.oncanplay = _ => resolve([url, media, timerId]);
                }
            });
            myPromise.then(([url, media, timerId]) => {
                clearTimeout(timerId);
				media.onerror = media.onloadedmetadata = media.oncanplay = null;
                singleResolveCB && singleResolveCB(url, media);
            }, ([url, msg, timerId]) => {
                clearTimeout(timerId);
                console.error(msg);
				media.onerror = media.onloadedmetadata = media.oncanplay = null;
                singleRejectCB && singleRejectCB(url, msg);
            });
            promiseArr.push(myPromise);
        });
        return Promise.allSettled(promiseArr);
    },
    loadScript({resourceArr, singleResolveCB, singleRejectCB, timeout = 10000}) {
        let promiseArr = [];
        let docHead = document.getElementsByTagName("head")[0];
        resourceArr.forEach((url) => {
            if (!url) return;
            let ele = null;
            if (/.js$/.test(url) || /^blob:/.test(url)) {
                ele = NewEle(false, 'script', false, {src: url}, docHead);
            }
            else if (/.css$/.test(url)) {
                ele = NewEle(false, "link", false, { href: url, rel: 'stylesheet'}, docHead);
            }
            else {
                console.error(`[PVZTR] Can't load the unknown file ${url}`);
                return;
            }
            let myPromise = new Promise((resolve, reject) => {
                let timerId = setTimeout(_ => reject([url, `[PVZTR] It took longer than the limit time to load the file ${url}`]), timeout);
                ele.onerror = _ => reject([url, `[PVZTR] Failing to load the file ${url}`, timerId]);
                ele.onload = _ => resolve([url, timerId]);
            });
            myPromise.then(([url, timerId]) => {
                clearTimeout(timerId);
                singleResolveCB && singleResolveCB(url, ele);
            }, ([url, msg, timerId]) => {
                clearTimeout(timerId);
                console.error(msg);
                singleRejectCB && singleRejectCB(url, msg);
            });
            promiseArr.push(myPromise);
        });
        return Promise.allSettled(promiseArr);
    },
    loadBase64Image(url,resolveCB, rejectCB, timeout = 10000){
        let docHead = document.getElementsByTagName("head")[0];
        let ele = NewEle(false, 'script', false, {src: url}, docHead);
        let myPromise = new Promise((resolve, reject) => {
            let timerId = setTimeout(_ => reject([url, `[PVZTR] It took longer than the limit time to load the file ${url}`]), timeout);
            ele.onerror = _ => reject([url, `[PVZTR] Failing to load the file ${url}`, timerId]);
            ele.onload = _ => resolve([url, timerId]);
        });
        myPromise.then(([url, timerId]) => {
            clearTimeout(timerId);
            let res = window.__LOAD_BASE64_IMAGE_FUNCTION_TMP__(ele);//无论如何需要调用来删除自身
            resolveCB && (()=>{
                resolveCB(res);
            })();
        }, ([url, msg, timerId]) => {
            clearTimeout(timerId);
            console.error(msg);
            rejectCB && rejectCB(msg);
        });
    },
    // 等待元素加载的方法，主要供canvas等需要元素onload以后才能操作的情形使用
    loadElement(resourceArr, timeout = 30000) {
        let promiseArr = [];
        resourceArr.forEach((element) => {
            let myPromise = new Promise((resolve, reject) => {
                if (element.complete) {
                    resolve([null]);
                } else {
                    let timerId = setTimeout(_ => reject([element, `[PVZTR] It took longer than the limit time to load the element`]), timeout);
                    element.onerror = _ => reject([element, `[PVZTR] Failing to load the file ${element}`, timerId]);
                    element.onload = _ => resolve([timerId]);
                }
            });
            myPromise.then(([timerId]) => {
                clearTimeout(timerId);
				element.onerror = element.onload = null;
            }, ([element, msg, timerId]) => {
                clearTimeout(timerId);
				element.onerror = element.onload = null;
                console.error(msg);
                console.error(element);
            });
            promiseArr.push(myPromise);
        });
        return Promise.allSettled(promiseArr);
    },
};
const oDynamicPic = {
    __BlobImgStorage__: new Map(),
    __BlobUrlStorage__: new Map(),
    //在oS.LoadProgress时对图片资源进行批量请求和缓存
    //在oS.LoadProgress时对图片资源进行批量请求和缓存
    async Init({resArr = oS.DynamicPicArr, singleResolveCB, singleRejectCB, timeout = 30000, keepParam = false}) {
        if (!IsHttpEnvi) {
            singleResolveCB && resArr.forEach(originalUrl => singleResolveCB());
            return;
        } 
        const BlobImgStorage = this.__BlobImgStorage__;
        const testerFunc = this.testIfBlobIsImage;//使用测试函数来保证获取到的blob是image
        const PromArr = [];
        for (let originalUrl of resArr) {
            !keepParam && (originalUrl = oURL.removeParam(originalUrl));
            if (BlobImgStorage.has(originalUrl)) {
                singleResolveCB && singleResolveCB();
                continue;
            }
            let res = await getDataByKey(ResourcesDatabase, "images", originalUrl);
            if (res) {
                BlobImgStorage.set(originalUrl, res.data);
                singleResolveCB && singleResolveCB();
            } else {
                let timerId = null;
                let fetchProm = fetch(originalUrl).catch((err) => {
                    console.error(err);
                    singleRejectCB && singleRejectCB();
                });
                let timerProm = new Promise(resolve => {
                    timerId = setTimeout(resolve, timeout, `[PVZTR] This fetch is timed-out: ${originalUrl}`);
                });
                let finalProm = Promise.race([fetchProm, timerProm])
                .then((result) => {
                    if (result instanceof Response) {
                        clearTimeout(timerId);
                        BlobImgStorage.set(originalUrl, "loading");//设置为加载状态
                        result.blob().then(
                            (blob) => {
                                if(!testerFunc(blob)){
                                    throw `${originalUrl} isnt a image or video, which can't save to database.`;
                                    return;
                                }
                                BlobImgStorage.set(originalUrl, blob);
                                putDataByKey(ResourcesDatabase, "images", originalUrl, blob);
                                singleResolveCB && singleResolveCB();
                            }
                        ).catch((err)=>{
                            console.error(err);
                            BlobImgStorage.delete(originalUrl);
                            singleRejectCB && singleRejectCB();     
                        });
                    } else {
                        console.error(result);
                        singleRejectCB && singleRejectCB();             
                    }
                });
                PromArr.push(finalProm);
            }
        }
        await Promise.allSettled(PromArr);
    },
    //检测一个blob是否是图片类型
    testIfBlobIsImage(blob){
        return /^(image\/|video\/)/.test(blob?.type);
    },
    //require方法为同步方法，可放心调用！
    //调用require方法前原则上要求所有的图片blob已通过Init方法进行储存。
    //如果出现Init时图片加载失败的情况，在require方法处设置如下的兜底措施：
    //直接返回请求图片的originalUrl，同时再次尝试发送fetch请求，以期本次能够成功获取图片。
    require(originalUrl, containerDom = null, mustReload = false, keepParam = false) {          
        // 如果异步动画选项被关闭，或者传入参数是已经生成好的blob链接，则直接返回
        if (!$User.Async_GIFS_Animate || originalUrl.substring(0,5)==="blob:") {
            return originalUrl;
        }
        //默认去除原始链接自带的小尾巴
        !keepParam && (originalUrl = oURL.removeParam(originalUrl));
        //本地打开直接采用打时间戳的方式处理
        if (!IsHttpEnvi) {
            return oURL.setParam(originalUrl, "ts", Math.random());
        }
        const BlobImgStorage = this.__BlobImgStorage__;
        const BlobUrlStorage = this.__BlobUrlStorage__;
        const testerFunc = this.testIfBlobIsImage;
        //正常情况：BlobImgStorage中已有缓存的图片blob
        let blobObj = BlobImgStorage.get(originalUrl);
        if (blobObj&&blobObj!=="loading") {
            let blobUrl = null;
            let oldTimeStamp = null;
            let newTimeStamp = oSym.Now;
            //首先检测是否有未超时(50ms)的缓存可用。
            //如果可用则直接返回缓存的blob地址，否则则重建。
            let tempBlobUrl = BlobUrlStorage.get(originalUrl);
            if (!mustReload && tempBlobUrl && newTimeStamp - tempBlobUrl.ts < 5) {
                oldTimeStamp = tempBlobUrl.ts;
                blobUrl = tempBlobUrl.src;
            } else {
                //创建blob链接
                blobUrl = URL.createObjectURL(blobObj);
                //缓存blob链接
                BlobUrlStorage.set(originalUrl, {
                    ts: (oldTimeStamp = newTimeStamp),
                    src: blobUrl,
                });
            }
            //如果有传入containerDom，
            //则当dom被remove时，直接自动释放blobUrl
            if (containerDom) {
                const revokeFunc = () => {
                    BlobUrlStorage.delete(originalUrl);
                    setTimeout(() => {
                        URL.revokeObjectURL(blobUrl);
                    }, IsTestingEnvi ? 0 : 60000);
                };
                let oldRemoveMethod = containerDom.remove;
                containerDom.remove = function() {
                    let deltaTime = oSym.Now - oldTimeStamp;
                    if (deltaTime >= 5) {
                        revokeFunc();
                    } else {
                        oSym.addTask(5, () => BlobUrlStorage.has(originalUrl) && revokeFunc());
                    }
                    oldRemoveMethod.call(this);
                }
            }
            // 先初始化一下链接，避免某些植物/僵尸切图时出现闪烁的问题
            new Image().src = blobUrl;
            // 返回链接
            return blobUrl;
        }
        //兜底情况
        else if (!blobObj && BlobImgStorage.get(originalUrl) !== "loading") {
            BlobImgStorage.set(originalUrl, "loading");
            fetch(originalUrl)
            .then((resp) => resp.blob())
            .then((blob) => {
                if(!testerFunc(blob)){
                    throw `${originalUrl} isnt a image or video, which can't save to database.`;
                    return;
                }
                BlobImgStorage.set(originalUrl, blob);
                putDataByKey(ResourcesDatabase, "images", originalUrl, blob);
            })
            .catch((err) => {
                console.error(err);
                BlobImgStorage.delete(originalUrl);
            });
            return originalUrl;
        } else {
            return originalUrl;
        }
    },
	//移除单个blob链接
	remove(blobURL, originalURL) {
		const BlobUrlStorage = this.__BlobUrlStorage__;
		// 释放动态链接
        // 为了避免可能存在的问题，非测试环境下延时销毁链接
        // 预加载时候创建的Image对象可能还没被GC，所以在测试环境下也要异步一下
        setTimeout(() => {
            URL.revokeObjectURL(blobURL);
        }, IsTestingEnvi ? 0 : 60000);
        //清除BlobUrlStorage记录
		if (!originalURL) {
			for (let [o_url, json] of BlobUrlStorage) {
				if (json.src === blobURL) {
					BlobUrlStorage.delete(o_url);
				}
			}
		} else {
            if (BlobUrlStorage.get(originalURL) === blobURL) {
                BlobUrlStorage.delete(originalURL);
            }
		}
	},
    //清理前一关剩余的blob链接
    revokeGarbage() {
        this.__BlobUrlStorage__.forEach(value => URL.revokeObjectURL(value.src));
        this.__BlobUrlStorage__.clear();        
    },
    //粗略判断图片的url是否适合启用动态url
    checkOriginalURL(url) {
        if (
            url &&
            oURL.getParam(url, "useDynamicPic") !== "false" &&
            !/\/0\.(webp|gif|png)$/.test(url) &&
            !/^data:image\/\w+;base64/.test(url) &&
            !/\.(png|jpg)$/.test(url) &&
            !url.includes("images/Card/")
        ) {
            return true;
        }
        return false;
    },
};
const oAudioManager = {
    __null_audio__:new Audio(),
    resourceAudioMap: new Map(), //储存音效的原始dom及被引用次数
    resourceMusicMap: new Map(), //储存bgm的实际dom
    forcedPausedAudio: new Set(), //specific audio forced to be paused, won't be affected by AllResPause
    pausedAudio: new Set(), //all paused audio will be saved here, so that when playAudio checks for playbacknum these audio will be ignored
    curMusic: null, //当前游戏内的bgm
    isAllResPaused: false, //游戏内音频是否处于暂停状态
    isAllResMuted: false, //游戏当前是否处于静音状态
    Init() {
        //生成音频播放校验ticket
        this.refreshTicket();
        //设置游戏音效重音阈值
        //低性能模式下不允许重音播放
        this.maxSyncPlayBackNum = ($User.LowPerformanceMode) ? 1 : 3;
        //这里理论上应该不用清空实例吧…………？因为现在num代表实例数，只要有实例就可以播放，也不用重复加载
        for (let [key, json] of this.resourceAudioMap) {
            // 设置所有的lastPlayingTime，保证第一次音频能够播放得出来
            json.lastPlayingTime= -Infinity;
        }
    },
    //clear the audio instances from memory so that they don't lag the game, the original DOM inside resourceAudioMap won't be affected
    checkClearUnusedAudio(){
        console.log("checkClear");
        for (let [key, json] of this.resourceAudioMap) {
            if(json.idleInstances.top!==0){
                //使用更短的名字代替这个
                let maxTime = json.the_maximum_times_this_audio_instances_can_exist_in_memory_and_not_be_used_by_a_single_game_level;
                if(maxTime===void 0){//如果有实例，则添加计数器
                    maxTime = 3;//在进入这么多次关卡中没有用到的音频将被清空
                }else if(!isNaN(maxTime)&&(--maxTime)<=0&&json.busyInstances.size===0){
                    //防止因为加载失败等原因，导致同时播放音效数量没有清零
                    json.num = 0;
                    console.log("clear",json.dom.src);
                    json.idleInstances.clear();
                    maxTime = void 0;
                }
                //重新赋值回去
                json.the_maximum_times_this_audio_instances_can_exist_in_memory_and_not_be_used_by_a_single_game_level = maxTime;
            }
        }
    },
    refreshTicket() {
        this.__ticket__ = '' + Math.random();
    },
    getSourceSrc(url) {
        // 检查是否已经有文件扩展名
        if (!/\.[^.]+$/.test(url)) {
            url += '.mp3';
        }
        // 检查是否包含斜杠，如果没有则默认添加 audio/
        if (!/[\/\\]/.test(url)) {
            url = `audio/${url}`;
        }
        return url;
    },
    //获取原始表的dom
    getDom(source, type) {
        const self = oAudioManager;
        const AudioMap = self.resourceAudioMap;
        const MusicMap = self.resourceMusicMap;
        if (typeof source === 'string') {
            source = self.getSourceSrc(source);
        }
        if (type ?? false) {
            return type === "audio" ? AudioMap.get(source).dom : MusicMap.get(source);
        } else {
            if (AudioMap.has(source)) {
                return AudioMap.get(source).dom;
            } else if (MusicMap.has(source)) {
                return MusicMap.get(source);
            }
        }
    },
    newAudio(url, type = "audio", canUpdateMap = false,media=void 0) {
        url = oAudioManager.getSourceSrc(url);
		let tempMedia = oAudioManager.resourceAudioMap.get(url)?.dom;
        if(!media){
			if (tempMedia) {
				media = tempMedia;
			} else {
				if(!IsHowling || type !== "audio"){
					media = new Audio();
					media.src = url;
				}else{
					media = new Howl({
						src: [url],
						html5: (!IsHttpEnvi&&IsFileEnvi)
					});
				}
			}
        }
        if (type === "audio") {
			if (IsHowling || IsMobile || (!IsHttpEnvi&&IsFileEnvi)) {
				//only allow a limited number of audio files to exist in resourceMap
				let Cleaned = 0;
				let TotalSize = oAudioManager.resourceAudioMap.size;
				if (TotalSize >= 50) {
					oAudioManager.resourceAudioMap.forEach((aud, src) => {
						if (++Cleaned < TotalSize - 50 || aud._state == "unloaded") {
							let AudDom = aud.dom;
							setTimeout(() => {
								if ((IsHowling && !AudDom.playing() && !aud.busyInstances.size) || (!IsHowling && AudDom.paused && !aud.busyInstances.size) || (aud._state == "unloaded")) {
									oAudioManager.deleteAudio(AudDom);
									aud.idleInstances.clear();
									oAudioManager.resourceAudioMap.delete(src);
									if (AudDom.unload) AudDom.unload();
								}
							},0);
						}
					});
				}
			}
			
            if(canUpdateMap || !tempMedia){
				let dura = IsHowling?media._duration:media.duration;
                const _duration_ = isNaN(dura)?0:dura;
				dura = null;
                //the dom of each audio source (URL) will be assigned with the following properties in order to track all instances of audio of that source
                //神奇的音频最长不能重放时间拟合函数，可以自己试试，指的是从正在播放的音频里面拿出来一个，并重新播放
                const param = 1,maxShortTime=2;
                const shortTime = Math.min(Math.sqrt(param*(_duration_+param/4))-param/2,maxShortTime);
                oAudioManager.resourceAudioMap.set(url, {
                    dom: media,
                    num: 0,//num记录的是当前已经新建过多少个dom了
                    idleInstances:new Stack(),//这个是表示存有多少个可用音频实例
                    busyInstances:new Set(),//正在播放的音频实例
                    lastPlayingTime: -Infinity,
                    shortestTimeBusyMediaCanPlayback:shortTime,
                    the_maximum_times_this_audio_instances_can_exist_in_memory_and_not_be_used_by_a_single_game_level:void 0,//添加占据了内存多少次，在每次Init的时候会有计数
                });
                //console.log(url);
            }
        } else {
			if (IsMobile || (!IsHttpEnvi&&IsFileEnvi)) {
				//only allow a limited number of audio files to exist in resourceMap
				let Cleaned = 0;
				let TotalSize = oAudioManager.resourceMusicMap.size;
				if (TotalSize >= 5) {
					oAudioManager.resourceMusicMap.forEach((aud, src) => {
						if (++Cleaned < TotalSize - 4) {
							if (oAudioManager.curMusic != src) {
								setTimeout(() => {
									oAudioManager.resourceMusicMap.delete(src);
								},0);
							}
						}
					});
				}
			}
			
            (canUpdateMap || !oAudioManager.resourceMusicMap.get(url)) && oAudioManager.resourceMusicMap.set(url, media);
        }
		if (IsHowling && Howler._howls.length > 70) {
			setTimeout(() => {
				//as Howler audio only gets deleted from memory when aud.unload() is manually called it can cause some memory leaks
				for (let aud of Howler._howls) {
					let MusicDom = oAudioManager.resourceMusicMap.get(aud._src);
					let AudioDom = oAudioManager.resourceAudioMap.get(aud._src)?.dom;
					if (MusicDom != aud && AudioDom != aud && oAudioManager.curMusic != aud._src) {
						setTimeout(() => {
							if (aud.unload) aud.unload();
						},0);
					}
				}
			},0);
		}
        return media;
    },
    //对所有正在播放的音频执行某一个函数
    traverseAllAudios(func){
        const self = oAudioManager;
        const AudioMap = self.resourceAudioMap;
        for(let [key,record] of AudioMap){
            //console.log(record);
            for(let audio of record.busyInstances){
                func(audio);
            }
        }
    },
    //forcePlayIfFull:即使在可播放源满的时候也强制播放
    playAudio(source, loop = false, volume = 1, playbackRate = 1, forcePlayIfFull=false) {
        if (oS.Silence || oS.AudioSilence || $User.AudioEffectVolumePercent == 0) return -1;
        const self = oAudioManager;
        const myMap = self.resourceAudioMap;
        const myTicket = self.__ticket__;
        source = self.getSourceSrc(source);
        //查询记录
        let record = myMap.get(source);
        //音频播放回调
        const recordMedia = (media) => {
            //如果校验ticket失败则直接放弃播放
            if (self.__ticket__ !== myTicket) {
                return;
            }
            record.num++;
            playMedia(media);
        };
        const playMedia = (media)=>{
            //设置上次播放时间
            record.lastPlayingTime = oSym.Now;
            record.the_maximum_times_this_audio_instances_can_exist_in_memory_and_not_be_used_by_a_single_game_level=void 0;//只要播放，就置空计数器，因为代表常用资源，不会被清空
            // 缓存一份代码设定音量，再乘以用户设置的百分比作为真实音量
            // 调节音量的时候只要把media对象的volume设置为 代码设定音量 * 用户百分比即可
            media.__originalVolume__ = volume;
            if (!IsHowling) {
                media.playbackRate = playbackRate;
                media.currentTime = 0;
                media.volume = volume * $User.AudioEffectVolumePercent;
                media.loop = loop;
                media.muted = self.isAllResMuted;
            } else {
                media.rate(playbackRate);
                media.stop();
                media.volume(volume * $User.AudioEffectVolumePercent);
                media.loop(Boolean(loop));
                media.mute(self.isAllResMuted);
            }
            /*media.addEventListener("pause",()=>{
                console.log(233);
                media.play();
                
            },{once:true});
            media.pause();*/
            //登记音频信息
            record.busyInstances.add(media);
            let ended = false;
            function endMedia(use_pause=true) {
                if(ended){
                    return;
                }
                ended=true;
                record.idleInstances.push(media);
                record.busyInstances.delete(media);
                //console.log("pushback",media.src);
                if(use_pause && media.pause){
                    media.pause();
                }
                media.removeEventListener("canplay",_play_);
                media.removeEventListener("ended",endMedia);
            }
            media.__manualTriggerEnd__ = endMedia;
            if (!loop) {
                media.addEventListener('ended', endMedia, { once: true });
            }
            //自定义的播放函数
            media.$manualPlay = ()=>{
                if(media.readyState>2 || (IsMobile && IsIOS)){
                    _play_();
                }else{
                    //只保留一个这样的函数，避免重复调用
                    media.removeEventListener("canplay",_play_);
                    media.addEventListener("canplay",_play_,{once:true});
                }
            };
            media.$manualPlay();
            function _play_(){
                //如果暂停音频里面没有则尝试播放，如果已暂停则不播放
                if(!self.pausedAudio.has(media)){
                    if (!IsHowling) {
                        media.play().catch((err)=>{
                            console.log("play err",media.src,media.readyState);
                            console.error(err);
                            endMedia(false);//播放错误记得回栈里面
                        });
                    } else {
                        media.play();
                    }
                }
            }
        };

        if (isNullish(source)) {
            if (IsDevEnvi) debugger;
            return;
        }
        /*for (let audiosrc of self.pausedAudio) {
            if (self.getDom(source)?.src == audiosrc) {
                self.pausedAudio.delete(audiosrc);
                record.num--;
            }
        }*/
        if(!(record && record.dom)){
            let media = self.newAudio(source);
            record = myMap.get(source);
        }
        let audio = null;
        //如果已有缓存记录，则直接克隆音频节点并播放
        if (record && record.dom && (!oSym.Timer || Math.abs(record.lastPlayingTime - oSym.Now) > (forcePlayIfFull?0:20))) {//必须在一段时间后才能开始播放
            let stackEmpty = record.idleInstances.isEmpty();
            //console.log(record.dom.src,stackEmpty);
            if (record.num < self.maxSyncPlayBackNum && stackEmpty) {
                audio = record.dom.cloneNode();
                recordMedia(audio);
                //console.log("new",audio.src);
            } else if(!stackEmpty){
                audio = record.idleInstances.pop();
                playMedia(audio);
                //console.log("pop",audio.src);
            }else if(record.busyInstances.size>0){//必须大于可重新播放的时间才能重新播放
                //从正在播放的实例中拿出来第一个，重新播放，而因为相同record的音频实例一定是同一个，第一个播放的肯定是最老的（已播放时长最长的）
                //如果第一个音频不满足，则之后的音频必定不满足播放时长达到要求，必须达到要求才能触发busy
                //说明：自es6以来set实际的行为是会保留元素的插入顺序。这意味着当迭代一个Set时，元素会按照它们被添加到Set中的顺序出现。
                const first_audio = record.busyInstances.keys().next().value;
                if (first_audio) {
                    let shortestTime = forcePlayIfFull?0:record.shortestTimeBusyMediaCanPlayback;
                    if((IsHowling && (first_audio.seek() >= shortestTime || first_audio.seek() == 0)) || (!IsHowling && first_audio.currentTime >= shortestTime)){//如果已播放
                        self.__stopAudio__(first_audio,false);//让音频回到栈中
                        audio = record.idleInstances.pop();//从栈中弹出音频
                        playMedia(audio);
                        //console.log("busy",audio.src);
                    }
                }
            }
        }
        if(!audio){
            audio=self.__null_audio__;
            //console.log(record.dom.src,"trigger null audio");
        }
        return audio;
    },
    //使用自定义方法【停止】音频，如果是特殊音频，则会回到目标的stack里面
    __stopAudio__(audio,use_pause=true){
        const self = oAudioManager;
        audio.__manualTriggerEnd__ && audio.__manualTriggerEnd__(use_pause);
        if(audio.pause && use_pause){
            audio.pause();
        }
        //可能已经被暂停掉了，所以要尝试清空暂停状态
        self.forcedPausedAudio.delete(audio);
        self.pausedAudio.delete(audio);
    },
    playMusic(source = oAudioManager.curMusic, loop = true, volume = 1) {
        const self = oAudioManager;
        const myMap = self.resourceMusicMap;
        source = self.getSourceSrc(source);
        const dom = myMap.get(source);
        let oldcurmusic;
        // 采纳泠漪的建议，游戏内不会重复播放当前的music
        if (self.curMusic === source && !dom.paused) {
            return;
        }
        self.pauseMusic();
        self.curMusic = source;
        const func = (media) => {
            if (self.curMusic !== source) return;
            media.__originalVolume__ = volume;
            media.playbackRate = 1;
			media.currentTime = 0;
			media.volume = volume * $User.MusicVolumePercent;
			media.loop = loop;
			media.muted = self.isAllResMuted || (IsIOS && !(volume * $User.MusicVolumePercent));
            media.play();
        };
        if (dom) {
            func(dom);
            return dom;
        } else {
            let media = self.newAudio(source, "music", true);
            func(media);
            return media;
        }
    },
    //For pauseAudio, unpauseAudio and deleteAudio, the source can be a string with the name of the audio you want to pause, in this case it will pause every audio with that name.
    //Or you can also assign the entire oAudioManager.playAudio('name of audio') to a variable (check oGargantuar's NormalAttack for example), and use that variable as the source. In that case it will only pause the specific audio assigned to that variable, and will not pause anything else even if there's other audio with the same name.
    /*Example: 
        oAudioManager.playAudio('rain',1);
        oSym.addTask(100, () => {oAudioManager.pauseAudio('rain');});
        
        //and this will play 2 instances of 'rain', but only the one assigned to aud is paused (disable Low performance mode to test this)
        let aud = oAudioManager.playAudio('rain',1);
        oSym.addTask(100, () => {oAudioManager.playAudio('rain',1);});
        oSym.addTask(200, () => {oAudioManager.pauseAudio(aud);});
    */  
    
    //pauseAudio will pause the audio but its current time will still be saved in record.busyInstances, so you can unpause it later to make the audio continue from where it was paused.
    //If forced is false then the paused audio will be played again when the player clicks 'Back to Game' in the pause menu (allResPauseCanceled). If forced is true then the audio won't be affected by Back to Game (allResPauseCanceled) - you have to manually unpause the audio to make it play.
    pauseAudio(source, forced = true) {
        let ele = void 0, self = oAudioManager;
        let AudioMap = self.resourceAudioMap;
        if (typeof source === 'string') {
            let sourceURL = self.getSourceSrc(source);
            let record = AudioMap.get(sourceURL);//获取记录表
            let bePausedAudios = [];
            if(record){
                for (let audio of record.busyInstances) {//暂停音乐
                    bePausedAudios.push(self.pauseAudio(audio,forced));//递归暂停音乐
                }
            }
            return bePausedAudios;
        }
        if (source instanceof Audio || source instanceof Howl) {
            ele = source;
            //if (source.readyState === 4) {
                if (!(source instanceof Howl && source.seek() == 0)) {source.pause();}
            /*} else {
                let lPlayTime = source.currentTime;
                source.addEventListener("play", ()=>{
                    if(lPlayTime!==source.currentTime||!self.pausedAudio.has(source)){
                        return;
                    }
                    source.pause.bind(source);
                }, {
                    once: true
                });
            }*/
            self.pausedAudio.add(source);
            if (forced) {//如果强制则不可以重播放
                self.forcedPausedAudio.add(source);
            }
        } else if (source instanceof Promise) {
            console.log("oh shit promise",source);
            source.then((media) => {
                media.pause();
                self.pausedAudio.add(media);
                if (forced) {//如果强制则不可以重播放
                    self.forcedPausedAudio.add(media);
                }
                ele = media;
            });
        }
        return ele;
    },
    unpauseAudio(source) {
        if (oS.Silence || oS.AudioSilence || $User.AudioEffectVolumePercent == 0) {
            return -1;
        }
        let ele = void 0, self = oAudioManager, specific = 1;
        let AudioMap = self.resourceAudioMap;
        if (typeof source === 'string') {
            let sourceURL = self.getSourceSrc(source);
            let record = AudioMap.get(sourceURL);//获取记录表
            let resumedAudios = [];
            if(record){
                for (let audio of record.busyInstances) {//获取记录的所有音乐
                    if((IsHowling ? !audio.playing() : audio.paused)&&self.pausedAudio.has(audio)){//如果可继续播放，且被暂停
                        resumedAudios.push(self.unpauseAudio(audio));//递归播放音乐
                    }
                }
            }
            return resumedAudios;
        }
        if (source instanceof Audio || source instanceof Howl) {
            ele = source;
            self.forcedPausedAudio.delete(source);
            self.pausedAudio.delete(source);//先要删除，不然这个音频在表里面播放不出来
            if (!(source instanceof Howl && source.seek() == 0) && (IsHowling ? !source.playing() : source.paused)) {
                if(source.$manualPlay){
                    source.$manualPlay();
                }else{
                    source.play();
                }
            }
        } else if (source instanceof Promise) {
            source.then((media) => {
                self.forcedPausedAudio.delete(media);
                self.pausedAudio.delete(media);
                if (!(source instanceof Howl && source.seek() == 0) && (IsHowling ? !source.playing() : source.paused)) {
                    media.play();
                    ele = media;
                }
            });
        }
        return ele;
    },
    //Unlike pauseAudio, this function will pause and completely remove the audio from record.busyInstances. You can no longer unpause the deleted audio.
    //Note: all audio will be deleted when switching to a new page
    deleteAudio(source = 'all') {
        const self = oAudioManager, AudioMap = self.resourceAudioMap;
        if(source==='all'){
            self.traverseAllAudios((audio)=>{
                self.__stopAudio__(audio);
            });
            return;
        }else if (typeof source === 'string') {
            let sourceURL = self.getSourceSrc(source);
            let record = AudioMap.get(sourceURL);//获取记录表
            //console.log(sourceURL,record,AudioMap);
            if(record){
                for(let audio of record.busyInstances){
                    self.__stopAudio__(audio);
                }
            }
            return;
        }else{
            //剩下只能是音频
            self.__stopAudio__(source);
        }
    },
    pauseMusic() {
        const self = oAudioManager;
        const ele = self.resourceMusicMap.get(self.curMusic);
        if (ele) {
			//iOS can't fire oncanplay before the audio is played
            if (ele.readyState === 4 || IsIOS) {
                ele.pause();
            } else {
                ele.addEventListener("canplay", ele.pause.bind(ele), {
                    once: true
                });
            }
        }
        return ele;
    },
    //全局暂停
    allResPaused() {
        const self = oAudioManager;
        self.isAllResPaused = true;
        //暂停音效
        self.traverseAllAudios((audio)=>{
            self.pauseAudio(audio, false);
        });
        //暂停bgm
        self.pauseMusic();
    },
    //全局取消暂停
    allResPauseCanceled() {
        const self = oAudioManager;
        self.isAllResPaused = false;
        self.traverseAllAudios((audio)=>{
            if (!self.forcedPausedAudio.has(audio)){
                self.unpauseAudio(audio);
            }
        });
        let musicDom = self.getDom(self.curMusic, "music");
        musicDom && musicDom.play();
    },
    //全局静音
    allResMuted() {
        const self = oAudioManager;
        self.isAllResMuted = true;
        self.traverseAllAudios((audio)=>{
            audio.muted = true;
        });
        if (self.curMusic) {
            self.resourceMusicMap.get(self.curMusic).muted = true;
        }
    },
    //全局取消静音
    allResMutedCanceled() {
        const self = oAudioManager;
        self.isAllResMuted = false;
        self.traverseAllAudios((audio)=>{
            audio.muted = false;
        });
        if (self.curMusic) {
            self.resourceMusicMap.get(self.curMusic).muted = !IsIOS ? false : !($User.MusicVolumePercent);
        }
    },
    // 调节音量
    // 如果不传参数v表示用户设定的音量百分比发生调整，这时候音频的代码设定音量保持不变
    modifyAudioVolume(media, v) {
        if (oS.Silence || oS.AudioSilence || media == -1) return media;
        v = v ?? media.__originalVolume__;
        media.__originalVolume__ = v;
        if (!IsHowling) {
            media.volume = v * $User.AudioEffectVolumePercent;
        } else {
            media.volume(v * $User.AudioEffectVolumePercent);
        }
        return media;
    },
    modifyMusicVolume(v, media) {
        const self = oAudioManager;
        if (!media) media = self.resourceMusicMap.get(self.curMusic);
        v = v ?? media.__originalVolume__;
        media.__originalVolume__ = v;
		if (IsIOS) {
			media.muted = !(v * $User.MusicVolumePercent);
		}
		media.volume = v * $User.MusicVolumePercent;
        return media;
    },
};
const SelectModal = (lvl, path) => {
    if (oS.isStartGame === 1) oSym.Stop();
    setTimeout(() => {
        dispatchEvent(EVENT_EXITGAME);
        // 销毁所有注册的游戏事件
        ClearEventListeners(window,'jng-event-startgame');
        ClearEventListeners(window,'jng-event-endgame');
        ClearEventListeners(window,'jng-event-exitgame');
        oAudioManager.deleteAudio();
        oSelectionMap._lastMusic_ = oS.LoadMusic = oS.StartGameMusic = null;
        let GlobalVariables = oS.GlobalVariables,
             SelfVariables = oS.SelfVariables;
        for(let key in GlobalVariables) {  //恢复挂载在window上被重写的函数
            window[key] = GlobalVariables[key];
        }
        if (oS.UpsideDown) {
            oMiniGames.UpsideDown();
            delete oS.UpsideDown;
        }
        oS.GlobalVariables = {};
        for(let i of SelfVariables) {  //清除挂载在oS被重写过的数据
            oS[i] = void 0;
        }
        oDynamicPic.revokeGarbage();        //清除没被清除掉的垃圾blob图片
        oP.Destroy();
        oPropSelectGUI.rerender = 0;
        CancelShovel();
        SetBlock($("loading"));
        SetHidden($("dCardList"), $("tGround"), $("dSelectCard"), $("dTop"), $("dMenu"), $("dNewPlant"));
        SetNone($("Menu"), $("shade"), $('SelectionMap'), $('labMap'), );
        dSurface.style.display = lvl === 'Service/index.js' || (lvl === 'index' && path === 'Service') ? 'block' : 'none';
        if (jngAlert._dom.childNodes[1]) jngAlert._dom.childNodes[1].style.color = '';
        //top 10 reasons why rendering game visuals purely on DOMs is the worst idea of all time
        //DOM reference invalidating to allow garbage collection start
        let discardedDOMs = [FightingScene, dTop, dFlagMeter, dCoinContent, dPropsContent, Ground, dSelectCard, dCardList, dSelectProp, dZombiePreview, dCardList, Zimu, ZimuRQ, EDPZ, dPCard, dSVGContainers, EDAll];
        ClearThreeGens(discardedDOMs.concat(oZombieLayerManager.$Containers.concat(EDAll)));
        //DOM reference invalidating to allow garbage collection end

		//重置大舞台
		ClearChild(EDAll);
		EDAll = EDNewAll;
		EBody.insertBefore(EDAll,dAlmanac);
		LoadModal(lvl, path);  //启动新关卡

    }, oS.isStartGame === 1 ? 50 : 0);
};
const LoadModal = (lvl, path = 'Level') => {
    oS.Slots = undefined;
    if (oS.UpsideDown) {
        oMiniGames.UpsideDown();
        delete oS.UpsideDown;
    }
    let src = 'modal/' + (/\w+?\/\w+?.js$/.test(lvl) ? lvl : `${path}/${lvl}.js`);
    oS.Lvl = src.substring(src.lastIndexOf('/') + 1, src.indexOf('.js'));
    oS.LoadingStage = "LoadingScript";
    if (/blob/.test(lvl)) {
        src = lvl;
        oS.Lvl = "Fanmade";
        oS.OriginLvl = src;
    }
    oSym.Timer && oSym.Stop();
    oSym.Init(async () => {
        ClearChild($("JNG_PVZTR_Modal"));
        let scriptElement = await firstScreenLoadingScript(src, document.head);
        scriptElement.id = 'JNG_PVZTR_Modal';
    });
};
const ResetGame = function() {  //通用继续游戏
    if (oS.isStartGame === 2) return;
    oAudioManager.allResPauseCanceled();
    oSym.Start();
};
const PauseGame = function() {  //通用暂停游戏
    oAudioManager.allResPaused();
    oSym.Stop();
};
/* 本函数用于重写全局接口
funcs——传入一个json，包含要重写的所有接口
isSoft——硬重写开关，若开启将覆盖关卡已重写的接口，否则将只重写关卡文件没定义（oS.GlobalVariables无记录）的接口
请确保要重写的函数已用var挂载在window上！
*/
const RewriteGlobalVariables = function(funcs, isHard) {
    for (let name in funcs) {
       isHard ? 
            //硬重写
            (!oS.GlobalVariables[name] && (oS.GlobalVariables[name] = window[name]), window[name] = funcs[name]) :
            //软重写
            !oS.GlobalVariables[name] && (oS.GlobalVariables[name] = window[name], window[name] = funcs[name]);
    }
};
let CustomErrorBox = function(msg = "[PVZTR] <MISSING_ERROR_MESSAGE>") {
    let nowY = 0;
    let errorMsgs = {};
    let s = NewEle("error_"+Math.random(),"div",`cursor:pointer;z-index:3000;box-shadow:0 0 5px black;position:absolute;height:80px;transform:scaleX(0);width:300px;opacity:0;right:-150px;bottom:${nowY}px;background:white;margin:6px;border-radius:4px;font-size:0.75em;padding:10px;`,{
        ondblclick(){
            if(/zh/.test(localStorage.JNG_TR_USER_LANGUAGE)){
                window.open("http://jq.qq.com/?_wv=1027&k=2BznGEc","_blank");
            }else{
                window.open("https://discord.gg/5UZggBD3Uk","_blank");
            }
        }
    },document.body);
    let height = s.offsetHeight+Number.parseFloat(s.style.margin);
    errorMsgs[s.id]=s;
    s.innerText = msg + `\n\n它会对游戏正常运行有影响，请及时截图反馈至github或者粉丝群！双击就可以加群啦！`;
    if(IsMobile){
        s.style.cssText = `z-index:3000;box-shadow:0 0 5px black;position:absolute;height:30px;transform:translateX(-200px);line-height: 85%;width:400px;opacity:0;left:450px;bottom:-30px;background:white;margin:6px;border-radius:4px;font-size:0.7em;padding:3px;`
        oEffects.Animate(s,{opacity:0.8,bottom:0},0.5,'ease-out');
    }else{
        oEffects.Animate(s,{opacity:0.8,transform:"scaleX(1)",right:"0"},0.5,'ease-out');
    }
    setTimeout(function(){
        delete errorMsgs[s.id];
        oEffects.Animate(s,{opacity:0},0.3,false,ClearChild);
        if(Object.keys(errorMsgs).length==0){
            nowY = 0;
        }
    },8000);
};
/*
LoadModal支持两种传入文件路径的方法：
1.LoadModal('SelectionMap/Forest_SelectionMap_1.js')
2.LoadModal('Forest_SelectionMap_1', 'SelectionMap')
*/
const NewO = (proto, constructor) => {  //构造一个类
    let subClass = constructor || function() {};
    subClass.prototype = proto;
    Object.defineProperty(subClass.prototype, "constructor", {
        value: subClass,
        configurable: false,
        enumerable: false,
    });
    return subClass;
},
InheritO = function(superClass, newProto, staticProps = {}) {  //实现继承
    let subClass = function() {};
    subClass.prototype = new superClass();
    newProto && Object.assign(subClass.prototype, newProto);
    Object.defineProperty(subClass.prototype, "constructor", {
        value: subClass,
        configurable: false,
        enumerable: false,
    });
    // 为类设置静态属性
    for (let key in staticProps) {
        Object.defineProperty(subClass, key, {
            value: staticProps[key],
            enumerable: false,
        });
    }
    return subClass;
},
//查询某个属性是否存在于某个对象中，如果有则返回它；如果没有，返回该对象的default属性
//switch相等的简易写法
$SEql = (key, list)=>list[key] || list["default"],
//switch小于的简易写法
$SSml=function(num, aL, aR) {
	let index=0, len=aL.length;
	while(index < len) {
        if(num < aL[index]) break;
        index++;
    }
    return aR[index];
},
//把switch小于变成O1
$SSmlList = function(aL,aR){
    let X=aL[0]-1, OriX = X, XMax=aL[aL.length-1]+1;
    let index = 0;
    let list = new Int8Array(XMax-X);
	while(X<XMax) {
        if(X>=aL[index]){
            index++;
        }
        list[X-OriX]=aR[index];
        X++;
    }
    return [list,OriX,list.length];
},
$SEqlSml = function(key,list,length){
    key = Math.Clamp(key,0,length-1);
    return list[key];
};
