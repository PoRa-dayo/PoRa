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
const EVENT_STARTGAME = new Event("jng-event-startgame"),
EVENT_ENDGAME = new Event("jng-event-endgame");
/* API */
let $User = {
    NowStep: 1,  //oSym里的时间跨度，默认是1，值为1-5加速1-5倍
    TimeStep: 10,  //oSym里的计时间隔，默认是10；值为20,10,5，分别是减速一半，原速，加速一倍
    AutoSun: Number(localStorage['JNG_TR_AUTOSUN']) || 0,  //是否自动拾取阳光
    Tag: localStorage.tag ? localStorage.tag : "local",//用户标识
    Name: localStorage.name ? localStorage.name : "local",//用户名
    LowPerformanceMode: false,  //是否开启低性能模式
    Async_GIFS_Animate: true,  //是否启用blob动画
    Coins: 0,
    Achievement: localStorage.JNG_TR_Achievement?JSON.parse(localStorage.JNG_TR_Achievement):{},  //记录用户获得成就
    DrawBlood: localStorage.JNG_TR_DrawBlood ? JSON.parse(localStorage.JNG_TR_DrawBlood) : false,//是否画血
    TaskForceTimeSync: localStorage.JNG_TR_TaskForceTimeSync ? JSON.parse(localStorage.JNG_TR_TaskForceTimeSync) : false,//是否时间同步
    OpenDynamicDifficulty:navigator.language?.includes("zh")??false,//是否开启动态难度
    IS_PLOT_OPEN:localStorage.JNG_TR_IS_PLOT_OPEN ? JSON.parse(localStorage.JNG_TR_IS_PLOT_OPEN) : true,//是否开启剧情
    _tmpARCARD: {},
},
oSym = {
    Init(callback, arg = []) { //在每次关卡文件load的时候初始化
        const self = this;
        self.Now = 0;    //系统时间
        self.Timer = null;   //系统时间定时器
        self.TQ = [];
        self.TQSet = new Set();
        self.NowStep = 1;  //oSym里的时间跨度，默认是1，值为1-5加速1-5倍
        self.TimeStep = 10;  //oSym里的真实定时器计时间隔，默认是10，值为20,10,5，分别是减速一半，原速，加速一倍
        self.changed = Infinity;//是否改写了数组（保存的是最短的delayT）
        self.taskNum = 0;//数组任务个数
        self.taskTotal = 0;//目前是创建的第几个事件，目的是在排序的时候可以判断事件先后
        self.NowSpeed = 1;
        if($User.NowSpeed){
            CSpeed($User.NowSpeed,false);
        }
        self.addTask(0, callback, arg);
        self.Start();  //启动系统进程
    },
    Start() {
        const self = this;
        if(self.Timer === null) {
            let task,now,step=self.NowStep,lastTime=Date.now(),curTime;
            const TimeSync = $User.TaskForceTimeSync,timeStep = self.TimeStep;
            const stack = self.TQSet;
            const process = () => {
                if(TimeSync){
                    curTime=Date.now();
                    step=self.NowStep+Math.max((curTime-lastTime)/timeStep-self.NowStep,0);
                    lastTime=curTime;
                }
                now = self.Now+=step;
                if((self.changed-=step)<1){
                    self.Resort(self);
                }
                for(let i = self.taskNum-1;i>=-1;--i){
                    task = self.TQ[i];
                    if(i===-1||now<task.T){
                        self.taskNum=i+1;
                        break;
                    }
                    try {
                        task.f(...task.ar);
                        task.T=-Infinity;
                    } catch(err) {
                        console.error(err);
                    }
                }
                stack.forEach(task => {
                    if(now >= task.T) {
                        try {
                            task.f(...task.ar);
                        } catch(err) {
                            console.error(err);
                        }
                        stack.delete(task);
                    }
                });
            };
            self.Timer = setInterval(process, self.TimeStep);
        }
    },
    Resort(self){
        self.changed=Infinity;
        self.TQ.sort((a,b)=>{
            return b.T-a.T||b.taskIndex-a.taskIndex;//按时间从大到小排，如果相等则按task的先后排序
        });
        self.taskNum=self.TQ.length;
        while(--self.taskNum){
            if(self.TQ[self.taskNum].T!==-Infinity){
                break;
            }
            self.TQ.pop();
        }
        self.taskNum++;
    },
    addTask(delayT=0, callback, arg = [], useSet=false) {
        //因为游戏中的1相当于浏览器真实计时的10ms，所以传入的delayT（毫秒）要除以10
        const self = this;
        const task = {
            T: self.Now + delayT,  //执行时间（自定义的oSym时间）
            f: callback,  //执行函数  
            taskIndex:self.taskTotal++,
            ar: arg,  //参数的数组形式，用于执行函数传递参数
        };
        if(delayT<11||useSet){//如果反复写入，则使用集合
            self.TQSet.add(task);
        }else{//如果为长时间冷却的，则使用数组
            self.TQ.push(task);
            self.changed=Math.min(self.changed,delayT);
        }
        return task;
    },
    Stop() {  //中止系统进程
        clearInterval(oSym.Timer);
        oSym.Timer = null;
    },
    Clear() {
        this.TQ.length=0;
        this.TQSet.clear();
        this.taskNum=0;
        this.taskTotal=0;
    },
},
LevelConfig = {  //关卡默认配置
    config: {
        'Tutorial': {
            backgroundMask: 'BgMask-Tutorial',
        },
        'Forest': {
            backgroundImage: 'images/interface/Forest.webp',
            backgroundMask: 'BgMask-Forest',
            AllowUserCard:true,
            DynamicDifficulty:true,
            CoinRatio:1,
        },
        'Forestjx': {
            backgroundImage: 'images/interface/ForestJx.webp',
            backgroundMask: 'BgMask-Forest',
            AllowUserCard:true,
            CoinRatio:1.5,
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
        },
        'Marshjx': {
            backgroundImage: 'images/interface/MarshJx.webp',
            backgroundMask: 'BgMask-Marsh',
            AllowUserCard:true,
            CoinRatio:1.5,
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
            CoinRatio:1.5,
        },
        'Industry': {
            PicArr: [`images/interface/Industry.webp`],
            backgroundImage: `images/interface/Industry.webp`,
            LoadMusic: `Bgm_Industry_Ready`,
            AllowUserCard:true,
            backgroundMask: "BgMask-Industry",
            get StartGameMusic(){
                return (oS.Lvl.replace(/[^0-9]/ig,"")<21)?`Bgm_Industry_Fight`:`Bgm_Industry_Fight_2`
            },
            LoadAccess(callback) {
                oSym.addTask(90, callback);
            },
            CoinRatio:1.5,
            SummonZombieArea:[undefined,undefined,150],
        },
        'Industryjx': {
            PicArr: [`images/interface/Industry.webp`],
            backgroundImage: `images/interface/Industry.webp`,
            LoadMusic: `Bgm_Industry_Ready_JX`,
            backgroundMask: "BgMask-Industry",
            AllowUserCard:true,
            DKind:0,
            get StartGameMusic(){
                return `Bgm_Industry_Fight_JX`;
            },
            LoadAccess(callback) {
                
                oSym.addTask(90, callback);
            },
            CoinRatio:1.7,
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
        },  
        'SeasonW': {
            backgroundImage: 'images/interface/Fuben_Winter.webp',
            LoadMusic: "Fuben_Winter_Ready",
            StartGameMusic: "Fuben_Winter_Fight",
            SunNum: 200,
            CoinRatio:1.2,
            DKind: 0,
            AllowUserCard:true,
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
    W: 900,
    H: 600,
    C: 9,
    LawnMowerX: 70,
    Lvl: 0,
    DefaultStartGame() {  //默认开始游戏初始化代码
        oAudioManager.playMusic(oS.StartGameMusic);
        SetVisible($("tdShovel"), $("dFlagMeter"), $("dTop"));
        oS.ControlFlagmeter && oFlagContent.init({ fullValue: oP.FlagNum-1, curValue: 0 });  //显示进度条
        oS.InitLawnMover(); //剪草机
        PrepareGrowPlants(_ => {
            oP.Monitor();  //开启全局僵尸调度
            BeginCool();  //冷却
            AutoProduceSun(50);  //掉落阳光
            oSym.addTask(1500, _=>{
                oP.AddZombiesFlag();  //启动僵尸出场
                oS.ControlFlagmeter && oFlagContent.show();
            });
        })
    },
    DefaultFlagToEnd() {
        ShowWinItem(NewImg("imgSF", "images/interface/Clearance_reward.png", "left:535px;top:200px;width:116px;height:119px;", EDAll, {
            onclick: e=>oS.Lvl.indexOf('jx') < 0 ? 
                GetNewProp(e.target, 'Clearance_reward', '星星', '星星是闯关成功的象征。加油搜集更多星星吧！', NextLevel(), "30%", "43%") :
                GetWin(e.target, Exitlevel(oS.Lvl, 1))
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
            LF: [0, 1, 1, 1, 1, 1],
            ZF: null,
            PName: [],
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
            DynamicDifficulty: false,//是否开启动态难度
            ZombieRandomSpeed: 0.15,//僵尸速度是否随机（表示僵尸的最大正负速度）
            ControlFlagmeter: true,  //是否授权底层自动控制关卡进度条
            CanSelectCard: true,  //是否允许玩家自由选卡，默认值为允许
            DKind: 1,  //控制白天或黑夜：1表示白天，0表示黑夜
            LoadAccess: null,
            /* 供函数内部调用的配置如下 */
            PicNum: 0,
            AccessNum: 0,
            MCID: null,  //玩家鼠标所指植物卡牌的ID
            Chose: 0,  //鼠标状态：0——无特殊状态，1——种植植物，-1——拖动铲子
            isStartGame: 0,  //关卡是否在进行,0未开始游戏，1开始游戏，2关卡结束
            CoinRatio: 0,
            ChoseCard: "",  //选择的卡片ID
            MPID: "",  //鼠标所在植物的ID
            CardsType: {},
            SpawnLevelLimit:0,//生成下一波所需要的僵尸等级比例
            autoWaterFlowDirection: true,  //是否自动生成水道路径
            changeDKindConfig: {},
            TombConfig: null,
            __BalancedPlant__:false,//测试功能，平衡植物，目前已经替换完成，这个选项保留在这，如还有需要进行植物大改计划，开启即可
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
        self.LoadMusic && oAudioManager.playMusic(self.LoadMusic);
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
            //如果PName中卡牌数目超过10个，则一律设置为允许自由选卡
            self.CanSelectCard = self.PName.length > 10;            
        }
        /* 重写oS对象上挂载的变量结束 */
        /* other开始 */
        oAudioManager.Init();
        oP.FlagToMonitor = setting_oP_Json?.FlagToMonitor || new Object();
        oP.FlagToEnd = setting_oP_Json?.FlagToEnd || self.DefaultFlagToEnd;
        // 分离oS.PName与oS.LoadingPName，便于选卡中不出现的植物的加载
        oS.LoadingPName = Array.from(oS.PName);  
        oCoord[self.Coord]();  //初始化战斗场地
        oP.Init(setting_oP_Json);
        oT.Init(self.R);  //初始化植物触发器系统
        oZ.Init(self.R);
        oGd.Init();
        oBu.Init();     //载入植物子弹系统
        oCoinContent.Init();    //初始化货币系统
        oTombstone.Init();
        self.LoadProgress();  //启动加载
        /* other结束 */
    },
    LoadProgress() {
        oS.LoadingStage = "LoadingRes";
        let PicArr = oS.PicArr;
        let DynamicPicArr = oS.DynamicPicArr;
        let AudioArr = oS.AudioArr;
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
        for (let zombie of oS.ZName) {
            let proto = zombie.prototype;
            proto.PicArr.forEach(pic => {
                oDynamicPic.checkOriginalURL(pic) ? DynamicPicArr.push(pic) : PicArr.push(oURL.removeParam(pic, "useDynamicPic"));
            });
            proto.Init(AppearX, proto, LF, MaxR);
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
        $("tGround_Image").style.background = "url(" + _this.backgroundImage + ") no-repeat";
        _this.backgroundMask && FightingScene.classList.add(_this.backgroundMask);  //设置背景蒙版
        oS?.changeDKindConfig?.background_sky && 
                ($("tGround_Sky").style.background = `url:(${oS.changeDKindConfig.background_sky})`);
        const callback = function(StartTime) {
            NewEle("imgGrowSoil", 'img', "visibility:hidden;z-index:50", null, FightingScene);
            NewEle("dTitle", "div", 0, 0, EDAll);
            innerText(ESSunNum, _this.SunNum);
            oSelectCardGUI.Init();  //初始化选择卡片界面中
            DisplayZombie(..._this.SummonZombieArea);
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
        oSelectCardGUI.selectSeveralCards(oS.PName);
        const CardList =$("dCardList");
        EDAll.scrollLeft = 115;
        CardList.style.left = `115px`;
        oSym.addTask(30, LetsGO);
    },
    ScrollScreen(time=0,targetLeft=500) {  //向右滚动，显示僵尸出场和选择卡片
        let totalTime = 130;
        if(time<totalTime) {
            EDAll.scrollLeft = Math.floor(Math.Lerp(0,targetLeft,(Math.sin(time/totalTime*Math.PI-Math.PI/2)+1)/2));
            oSym.Timer?loop():oSym.addTask(0,loop);
            function loop(){
                let nowTime = new Date();
                requestAnimationFrame(()=>{
                    oS.ScrollScreen(time+(new Date()-nowTime)/10*oSym.NowSpeed,targetLeft);
                });
            }
        } else {
            EDAll.scrollLeft = targetLeft;
            SetVisible($("dMenu"));
            if(oS.CanSelectCard) {
                oSelectCardGUI.show(_ => {
                    if($User._tmpARCARD[oS.Lvl]){
                        oSelectCardGUI.selectSeveralCards($User._tmpARCARD[oS.Lvl]);
                    }
                });
                oPropSelectGUI.Init().show();
            } else {
                oSelectCardGUI.selectSeveralCards(oS.PName);
                oSym.addTask(200, oS.ScrollBack, [LetsGO]);
            }
        }
    },
    ScrollBack(callback) {  //界面往左滚动
        const CardList =$("dCardList");
        let oriScrollLeft = EDAll.scrollLeft;
                                                                // ↓上面的totalTime
        let totalTime = Math.round(Math.abs(115-oriScrollLeft)/500*130);//要乘以理论上的比例
        let time = 0;
        let dt = $User.LowPerformanceMode?4:2;
        (function fun() {
            if(time<totalTime&&oriScrollLeft!=115) {
                let scrollLeft = Math.floor(Math.Lerp(oriScrollLeft,115,(Math.sin(time/totalTime*Math.PI-Math.PI/2)+1)/2));
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
                EDAll.scrollLeft = 115;
                CardList.style.left = `115px`;
                oSym.addTask(0, callback);
            }
        })();
    }
},
oCoord = {
    ['1']() {
        //设定总行数
        oS.R = 5;  
        //根据鼠标坐标X范围确定中点X坐标和列C的数组，返回格式[X, C] 
        window.ChosePlantX = X => {
            let C = GetC(X);
            return [GetX(C), C];
        };
        //根据鼠标坐标Y范围确定中点Y坐标和列R的数组，返回格式[Y, R] 
        window.ChosePlantY = Y => {
            let R = GetR(Y);
            return [GetY(R), R];
        };
        //根据横坐标X找列C
        {
            //let CList = $SSmlList([ - 50, 100, 140, 220, 295, 379, 460, 540, 625, 695, 775, 855, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            let CList = $SSmlList([ - 50, 100, 140, 225, 305, 385, 465, 545, 625, 705, 785, 865, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            window.GetC = X => $SEqlSml(Math.floor(X)-CList[1], CList[0], CList[2]);
        };
        //根据纵坐标Y找行R
        window.GetR = Y => $SSml(Y, [86, 174, 270, 380, 470], [0, 1, 2, 3, 4, 5]);
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
        //返回行R的格子竖直方向中点Y
        //根据囧姨说明，这个应该是返回行R的僵尸/植物底部坐标Y
        window.GetY = R => [75, 175, 270, 380, 470, 575][R];
		//根据行返回Y范围,杨桃、保龄球用
		window.GetY1Y2 = R => $SEql(R,{0:[0,75],1:[76,180],2:[181,280],3:[281,385],4:[386,475],5:[476,568]});
        //获取僵尸恰好超过3/4点的格子，僵尸水道方向切换用
        {
            let CList = $SSmlList([ - 50, 100, 140, 197, 277, 357, 437, 517, 597, 677, 757, 837, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            window.GetMidC = X => $SEqlSml(Math.floor(X)-CList[1], CList[0], CList[2]);
        };
        window.GetMidR = Y => $SSml(Y, [86, 162, 256, 362, 452, 560], [0, 1, 2, 3, 4, 5, 6]) - 1;
        //生成小推车
        !oS.InitLawnMover && (oS.InitLawnMover = _ => {
            for(let R = 1; R < 6; R++) oSym.addTask(R*10, CustomSpecial, [oLawnCleaner, R, -1]);
        });
        //迷雾
        oS.HaveFog && oFog.init().render();
    },
    ['2'](){
        oS.R = 6;
        let Compare = (e, b, a, c, d) => (d = (e < b ? b: (e > a ? a: e)), c ? [c(d), d] : [d]);
        
        window.ChosePlantX = (X) => Compare(GetC(X), 1, oS.C, GetX);
        window.ChosePlantY = (Y) => $SSml(Y, [86, 171, 264, 368, 440, 532], [[75, 0], [161, 1], [254, 2], [358, 3], [430, 4], [524, 5], [593, 6]]);
        //window.GetC = (X) => $SSml(X, [-50, 100, 140, 220, 295, 379, 460, 540, 625, 695, 775, 855, 935, 1031], [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        {
            let CList = $SSmlList([ - 50, 100, 140, 220, 295, 379, 460, 540, 625, 695, 775, 855, 935, 1031], [ - 2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            window.GetC = X => $SEqlSml(Math.floor(X)-CList[1], CList[0], CList[2]);
        };
        window.GetR = (Y) =>  $SSml(Y, [86, 171, 264, 368, 440, 532], [0, 1, 2, 3, 4, 5, 6]);
        window.GetX = (C) => $SEql(C, {
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
        window.GetY = (R) => [75, 165, 253, 355, 430, 522, 587][R];
        window.GetY1Y2 = (R) => $SEql(R, {0 : [0, 85],1 : [86, 170],2 : [171, 263],3 : [264, 367],4 : [368, 439],5 : [440, 531],6 : [532, 600]});
        !oS.InitLawnMover && (oS.InitLawnMover = () => {
            for(let R = 1; R < 7; R++) oSym.addTask(R*10, CustomSpecial, [R>2&&R<5&&window.oPoolCleaner?oPoolCleaner:oLawnCleaner, R, -1]);
        });
        oS.HaveFog && oFog.init().render();
    }
},
//oP为负责全局监控的一些东西
oP = {
    MonitorZombiePosition(zombie) {
        if (zombie.ZX && zombie.R) {
            oP.LastDeathPosition = {
                x: zombie.ZX + 115,
                y: GetY(zombie.R)
            };
        }
    },
    Init(json) {
        oP.LastDeathPosition = {
            x: 535,
            y: 200
        }; //上一个僵尸死亡的地点
        oP.SpecialJudgment = {};
        oP.currentWaveNumLevels = oP.NumLevels = oP.NumZombies = oP.FlagZombies = 0; //全局僵尸数目清零；当前波数重置
        oP.arrZombiesSummonedInOneFlag = [];//刷怪专用随机数生成的东西
        {
            let minArr = [];
            let minIndex = 0;
            oP.randomGetLine=(arR,Lvl=1)=>{
                if(Math.random()<0.15){//有一定概率不参与最小值挑选
                    return arR.random();
                }
                if(oP.arrZombiesSummonedInOneFlag[oS.R+2]!=oP.FlagZombies){
                    oP.arrZombiesSummonedInOneFlag = [];
                    oP.arrZombiesSummonedInOneFlag[oS.R+2]=oP.FlagZombies;
                    for(let i = 0;i<=oS.R+1;i++){
                        oP.arrZombiesSummonedInOneFlag[i]=0;
                    }
                }
                let minNum = Infinity;
                for(let i = arR.length-1;i>=0;i--){
                    if(oP.arrZombiesSummonedInOneFlag[arR[i]]<minNum){
                        minIndex = 1;
                        minArr[0] = arR[i];
                        minNum = oP.arrZombiesSummonedInOneFlag[arR[i]];
                    }else if(oP.arrZombiesSummonedInOneFlag[arR[i]]==minNum){
                        minArr[minIndex++] = arR[i];
                    }
                }
                let rand = Math.floor(Math.random()*minIndex);
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
        oP.NumLevels-=(zombie?.Lvl)??0;
        if (oP.NumZombies <= 0 || //僵尸数达到0
           (oP.FlagZombies < oP.FlagNum && oP.NumLevels <= oS.SpawnLevelLimit*oP.currentWaveNumLevels) || //如果不是最后一波，且僵尸目前等级数达到触发下一波的要求
           (oP.SpecialJudgment.checks[oP.FlagZombies] && (oP.NumZombies <= oP.SpecialJudgment.checks[oP.FlagZombies]))//特殊判断僵尸数达到要求
        ) {
            if(oP.currentWaveNumLevels===-1){//-1是一个暂时的值，用来记录当前波是否已经触发FlagPrgs
                return;
            }
            oP.currentWaveNumLevels=-1;
            let FlagZombies = oP.FlagZombies;
            /*
                检查是否已抵达最后一波
                如果没有抵达说明接下来还有下一波僵尸要进攻，触发oP.FlagPrgs刷怪
                如果已经抵达说明所有僵尸已被杀死，调用toWin()
            */
            if (FlagZombies < oP.FlagNum) {
                oP.ReadyFlag = ++FlagZombies;
                oSym.addTask(oP.NumZombies<=0?500:200, oP.FlagPrgs);
            } else {
                // 先让场上没放完的动画再放一会儿
                oSym.addTask(350, toWin);
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
        let FlagZombies = oP.FlagZombies;     //更新全局僵尸已进攻次数
        let FlagToSumNum = oP.FlagToSumNum;     //关卡文件提供的刷怪数据
        let ZSum = $SSml(FlagZombies, FlagToSumNum.a1, FlagToSumNum.a2); //从FlagToSumNum.a2中取出当前波要刷僵尸的数量
        //当还有剩余波数
        if (oP.FlagNum > (FlagZombies = ++oP.FlagZombies)) {
            //检查当前波是否存在对应的FlagToMonitor回调，若存在则执行回调
            let callback = $SEql(FlagZombies, oP.FlagToMonitor);
            if (callback) {
                let delayT = callback[2] ?? 1690;
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
            oSym.addTask(1990, _ => {
                oP.ReadyFlag === FlagZombies && (oP.ReadyFlag++, oP.FlagPrgs());
            });
        }else if(oS.ControlFlagmeter&&FlagZombies===oP.FlagNum){//如果波数到了最后一波，主动检查是否胜利，没有进度条的肯定是有什么神秘任务，所以不检查
            let t = 1990;
            if(ZSum<1){
                t=1000;
            }
            oSym.addTask(t,function loop(){
                oP.NumZombies++;//因为oP.MonPrgs会将僵尸数量减少1，所以预先加上模拟僵尸死亡
                oP.MonPrgs();
                oSym.addTask(500,loop);
            });
        }
        if(oP.ZombieWeightNeededToChange[FlagZombies]){//更改僵尸的权重
            for(let arr of oP.ZombieWeightNeededToChange[FlagZombies]){
                oP.ZombieCurrentWeight[arr[0]]=arr[1];
            }
        }
        oS.ControlFlagmeter && oFlagContent.update({ curValue: FlagZombies - 1 });      //更新进度条
        oP.SelectFlagZombie(ZSum, FlagZombies);     //刷怪
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
        let instanceArr = [],
            htmlArr = [],
            _delayT = 0;
        constructors.forEach((constructor, index) => {
            htmlArr[index] = (instanceArr[index] = new constructor()).prepareBirth(_delayT);
            _delayT += delayT * (Math.random() * 0.2 + 0.9);  //僵尸出现实际的相对SelectFlagZombie调用延迟，会在预设的90%~110%之间波动
        });
        asyncInnerHTML(htmlArr.reverse().join(""), fragment => {
            EDPZ.insertBefore(fragment, EDPZ.firstChild); //绘制僵尸dom
            instanceArr.forEach(instance => instance.Birth()); //唤醒僵尸
        });
    },
    AppearUP(htmlArr, instanceArr, animation = true, sync = false) {
        instanceArr.forEach(instance => {
            if(instance.isCounted){
                oP.NumZombies++;
                oP.NumLevels+=instance.Lvl;
                //这里不需要更新当前波僵尸总数
            }
        });
        let birthFunc = zombie => {
            zombie.Birth();
            let height = zombie.height,
                EleBody = zombie.EleBody;
            if (animation) {
                EleBody.style.top = height + 'px';
                oEffects.Animate(EleBody, {
                    top: '0px',
                    clip: `rect(0,auto,${height}px,0)`
                }, 'slow', 'ease-out', (ele) => {
                    ele.style.clip = `rect(0,auto,auto,0)`;
                });
            } else {
                SetStyle(EleBody, {
                    clip: `rect(0,auto,auto,0)`
                });
            }
        };
        if (sync) {
            syncInnerHTML(htmlArr.join(""), frag => {
                EDPZ.appendChild(frag);
                instanceArr.forEach(birthFunc);
            });
        } else {
            asyncInnerHTML(htmlArr.join(""), frag => {
                EDPZ.appendChild(frag);
                instanceArr.forEach(birthFunc);
            });
        }
    },
    Monitor(callback) {
        callback && callback.f(...callback.ar);
        const traversalOf = oZ.traversalOf;
        const bulletsTraversalOf = oBu.traversalOf.bind(oBu);
        (function fun() {
            traversalOf();
            oSym.addTask(10, fun);
        })();
        if($User.LowPerformanceMode){
            (function fun2() {
                bulletsTraversalOf(3);
                oSym.addTask(3, fun2);
            })();
        }else{
            (function fun2() {
                bulletsTraversalOf();
                oSym.addTask(1, fun2);
            })();
        }
        if($User.DrawBlood){
            let ratio = $User.LowPerformanceMode?4/5:1;
            let canvas = NewEle("","canvas",`position:absolute;left:0;top:0;width:900px;height:600px;pointer-events:none;z-index:${3*(oS.R+1)}`,{
                width:Math.floor(900*ratio),
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
                ctx.clearRect(0,0,Math.floor(900*ratio),Math.floor(600*ratio));
                let greenDrawing = [];
                let blueDrawing = [];
                ctx.fillStyle="#555555";
                let tmpOHP;
                for(let zombie of $Z){
                    if(zombie.CanDrawBlood){
                        let drawPosition = {
                            x:zombie.X+(zombie.beAttackedPointL+zombie.beAttackedPointR)/2,
                            y:zombie.pixelTop+(zombie.HeadTargetPosition[zombie.isAttacking]??zombie.HeadTargetPosition[0]).y-10-box.height,
                            HPRatio:Math.max(1,((zombie.constructor.prototype.HP-zombie.BreakPoint)/500)**1/3)
                        };
                        drawPosition.x -= box.width*drawPosition.HPRatio/2;
                        let blueTriggered = false;
                        if(zombie.OrnHP>0&&zombie.OrnHP<(tmpOHP=zombie.constructor.prototype.OrnHP)){
                            let obj = Object.assign({
                                ratio:zombie.OrnHP/tmpOHP,
                            },drawPosition);
                            obj.HPRatio = Math.max(1,(tmpOHP/500)**1/3);
                            obj.y+=blueBoxRelatvieY;
                            blueDrawing.push(obj);
                            fillRectRatio(obj.x-2,obj.y-2,box.width*obj.HPRatio+4,box.height+4);
                            blueTriggered = true;
                        }
                        if((zombie.HP<(tmpOHP=zombie.constructor.prototype.HP)||blueTriggered)&&zombie.HP>=zombie.BreakPoint){
                            greenDrawing.push(Object.assign({
                                ratio:(zombie.HP-zombie.BreakPoint)/(tmpOHP-zombie.BreakPoint),
                            },drawPosition));
                            fillRectRatio(drawPosition.x-2,drawPosition.y-2,box.width*drawPosition.HPRatio+4,box.height+4);
                        }
                    }
                }
                for(let plant of $P){
                    let drawPosition = {
                        x:plant.pixelLeft+plant.width/2,
                        y:GetY(plant.R)-box.height-95+plant.BloodBarRelativeHeight,
                        HPRatio: Math.max(1,(((tmpOHP=plant.constructor.prototype.HP) - plant.BlueBarHP) / 1000)**1/4)
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
                    if(tmpOHP>plant.BlueBarHP&&plant.HP<tmpOHP&&plant.HP>0){
                        drawPosition.ratio = Math.min(plant.HP/(tmpOHP-plant.BlueBarHP),1);
                        drawPosition.HPRatio= Math.max(1,((tmpOHP-plant.BlueBarHP)/1000)**1/4)
                        greenDrawing.push(drawPosition);
                        fillRectRatio(drawPosition.x-2,drawPosition.y-2,box.width*drawPosition.HPRatio+4,box.height+4);
                    }
                }
                ctx.fillStyle="#55FF55";
                for(let i = greenDrawing.length-1;i>=0;i--){
                    fillRectRatio(greenDrawing[i].x,greenDrawing[i].y,box.width*greenDrawing[i].ratio*greenDrawing[i].HPRatio,box.height);
                }
                ctx.fillStyle="#00CCFF";
                for(let i = blueDrawing.length-1;i>=0;i--){
                    fillRectRatio(blueDrawing[i].x,blueDrawing[i].y,box.width*blueDrawing[i].ratio*blueDrawing[i].HPRatio,box.height);
                }
                return Math.floor(($User.LowPerformanceMode?1.2:1)*oSym.NowSpeed*Math.Clamp((greenDrawing.length+blueDrawing.length)*2/3,20,150));
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
            return Math.round(num / 2);
        }
        if (absolute) {
            num = val;
        } else {
            if (noCorrect) {
                num += val;
            } else {
                if (val < 0 && num + val >= 7) {
                    num = 6;
                } else if (val > 0 && num + val <= -7) {
                    num = -6;
                } else {
                    num += val;
                }
            }
        }
        num = Math.Clamp(num,-10,10);
        localStorage["JNG_TR_DYNAMIC_DIFFICULTY_WINRATE"] = num;
        return Math.round(num / 2);
    },
    createDynamicDifficultyArr(a1, a2) {
        const _config_diff = oP.operateDynamicDifficulty();
        for (let i = 0; i < a2.length; i++) {
            if (a2[i] === 0) continue;
            a2[i] = Math.round(a2[i]*Math.sqrt(_config_diff*0.05+1));
        }
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
            self[type] = {};
        });
        // 障碍物相关映射表 结束
        self.$Torch = {};  //火炬树桩映射表
        self.$TrafficLights = {};  //红绿灯映射表（红绿灯tmd也能照亮雾）
        self.$Plantern = {};  //路灯花映射表
        self.$Umbrella = {};  // 叶子保护伞映射表
        self.$LF = oS.LF;
        self.$ZF = oS.ZF;
        self.$Ice = [];
        self.$GdType = [];
        self.$WaterDepth = [];
        self.$JackinTheBox = 0;
        self.$WaterFlowDirection = [];
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
        if (this.isLocked(key) || !oGd.isValidCrood(key)) {
            return false;
        }
        return (delete this.$LockingGrid[key]);
    },
},
oBu = {//子弹系统
    Init(){
        let self = this;
        self.$Bullets = {};
        self.deleteList = [];
        self.BulletKeys= [];//所有子弹的id
    },
    del(obj){
        let self = this;
        self.deleteList.push(obj.id);
    },
    add(bullet,key){
        let self = this;
        self.$Bullets[key]=bullet;
        self.BulletKeys = Object.keys(self.$Bullets);
    },
    traversalOf(times=1){
        let self = this;
        let bullets = self.$Bullets,
        list = self.deleteList,
        keys = self.BulletKeys,
        len;
        for(let i =keys.length-1;i>=0;--i){
            bullets[keys[i]]?.Update(bullets[keys[i]],times);
        }
        //len必须在此才能赋值
        for(let i = (len=list.length)-1;i>=0;i--){
            delete bullets[list[i]];
        }
        if(len>0){
            self.BulletKeys = Object.keys(self.$Bullets);
            self.deleteList = [];
        }
    }
},
/*
oBu = {//子弹系统
    Init(){
        let self = this;
        self.$Bullets = {};
        self.deleteList = [];
    },
    del(obj){
        let self = this;
        self.deleteList.push(obj.id);
    },
    add(bullet,key){
        let self = this;
        self.$Bullets[key]=bullet;
    },
    traversalOf(times=1){
        let self = this;
        let bullets = self.$Bullets,
        list = self.deleteList,
        keys = self.BulletKeys;
        for(let i of bullets){
            i.Update(i,times);
        }
        if(list.length>0){
            for(let i of list){
                delete bullets[i];
            }
            self.deleteList = [];
        }
    }
},*/
oZ = {
	Init:function(r){//按左攻击点从小到大排序，给往左飞行的子弹等的僵尸序列数组按右检测点从大到小排序
		this.$=[];this.$R=[];var i;for(i=r;i;this.$[i]=[],this.$R[i--]=[]);
	},
	add(o) { //添加一个僵尸对象
        let rArr = oZ.$[o.R];
		rArr.push(o);
		rArr.sort((a,b) => a.AttackedLX - b.AttackedLX);
		rArr.RefreshTime = oSym.Now;  //普通触发器数组的刷新时间属性
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
        let len = aL.length;
		while(i < len && (Z=aL[i++]).AttackedLX <= x) {
            if(Z.PZ && Z.HP && Z.AttackedRX>=x && custom(Z)) {
                return Z;
            }
        } 
	},
	getZ1:function(x,r,custom=Z=>true){ //往左飞的子弹，根据一个点X坐标和R行返回满足僵尸左攻击点<=X && 右攻击点>=X 的第一个僵尸对象
		if(r<1||r>oS.R)return;
		var i=0,aL=this.$[r],aR=this.$R[r],a,Z,t,len;
		(t=aL.RefreshTime)==aR.RefreshTime?
			a=aR:(a=(this.$R[r]=aL.slice(0)).sort(function(a,b){return b.AttackedRX-a.AttackedRX})).RefreshTime=t;
		len=a.length;
		while(i<len&&(Z=a[i++]).AttackedRX>=x)if(Z.PZ&&Z.HP&&Z.AttackedLX<=x&&custom(Z))return Z;
	},
	getArZ(lx, rx, r,custom = Z=>true) { //根据一个攻击范围的左右点坐标返回所有满足在该范围的僵尸对象数组
        let arr = [];
        for(let zombie of this.$[r]) {
            const LX = zombie.AttackedLX;
            if(LX >= rx) break;
            zombie.PZ && zombie.HP && (zombie.AttackedRX > lx || zombie.AttackedLX > lx) && custom(zombie) && arr.push(zombie);
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
            if(zombie.PZ && zombie.HP && (lx < AttackedLX || lx < AttackedRX)) {
                // 子弹不会打中高空飞行的僵尸
                if (zombie.Altitude >= 3) {
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
        let length = zArr.length;
        for (let i = length - 1; i >= 0; i--) {
            const zombie = zArr[i];
            const {AttackedLX, AttackedRX} = zombie;
            //如果僵尸盒子的右边界超出了最大左侧范围，则说明搜索结束
            if(AttackedRX < lx) break;
            // 如果没有超过最大左侧范围的僵尸落在了区间内
            if(zombie.PZ && zombie.HP && (AttackedLX < rx || AttackedRX < rx)) {
                // 子弹不会打中高空飞行的僵尸
                if (zombie.Altitude >= 3) {
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
              i=$R1.length,
              Ar;
		while(i--) {
            let o=$R1[i];
			o && o.id==id && $R2 && (
				$R1.splice(i,1),
				o.R=R2,
				$R2.push(o),
				($R2.sort(function(a,b){return a.AttackedLX-b.AttackedLX})).RefreshTime=$R1.RefreshTime=oSym.Now,
				i=0
			);            
        }
	},
	traversalOf() { //遍历僵尸对象并进行移动操作
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
			arR=ar[R], index = arR.length, lastLX = Infinity;
			while(index--) {  //从最右侧开始遍历当前行所有僵尸
				zombieObject = arR[index];
                if (
                    IsDevEnvi
                    && (Number.isNaN(zombieObject.ZX) || Number.isNaN(zombieObject.X) || Number.isNaN(zombieObject.AttackedLX) || Number.isNaN(zombieObject.AttackedRX))
                ) {
                    console.error(`[PVZTR] Find a zombie with abnormal crood:`, zombieObject);
                }
                if(zombieObject.HP) {  //若僵尸还处于存活状态
                    zombieObject.PZ && zombieObject.ZX<901 && oT[`chkD${zombieObject.WalkDirection}`](zombieObject, R, oT.$[R], oT.$L[R]);  //检测该僵尸是否可以触发现有的任意植物触发器
                    Hooks[zombieObject.ChkActs(zombieObject, R, arR, index)](zombieObject);  //触发僵尸移动，并调用hook
                } else {  //若僵尸实际HP已经为0
			    	arR.splice(index, 1);  //从队列中删除该僵尸
					Hooks[0](zombieObject);  //刷新僵尸序列
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
    chkD0(zombie, R, oTR, oTL) { //往左走的僵尸进行检测是否可以触发植物触发器
        let LX = zombie.AttackedLX; //僵尸的左攻击点
        let i = 0;
        let _tp;
        //从大到小遍历当前行触发器，搜索并触发所有有效触发器
        //有效触发器：触发器左监测点≤僵尸左攻击点≤触发器右监测点
        while (i < oTR.tmpLength && (_tp = oTR[i])[1] >= LX) {
            let plant = $P[_tp[3]];
            //若对应植物的触发器处于开启状态则触发
            plant.canTrigger && _tp[0] <= LX && plant.TriggerCheck(zombie, _tp[2], i); 
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
            if( _p.canTrigger && _tp[1] >= RX ) {
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
                    break;
                }
            }
            $R.RefreshTime = new Date;
            $R.tmpLength = $R.length;
        }
    },
};
const oLoadRes = {
    loadImage({resourceArr, singleResolveCB, singleRejectCB, timeout = 30000 ,resolveImgObject = false}) {
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
    loadAudio({resourceArr, type = "audio", singleResolveCB, singleRejectCB, timeout = 30000, canUpdateMap = false}) {
        let promiseArr = [];
        resourceArr.forEach((url) => {
            if (!url) return;
            let media = new Audio();
            media.src = `audio/${url}.mp3`;
            let myPromise = new Promise((resolve, reject) => {
                //当readyState=4，或oncanplay被触发时，表示
                //已加载数据足以开始播放 ，且预计如果网速得到保障，那么音视频可以一直播放到底。
                if (media.readyState === 4) {
                    resolve(url);
                } else {
                    let timerId = setTimeout(_ => reject([url, media, `[PVZTR] It's longer than the limit time to load the file ${url}`]), timeout);
                    media.onerror = _ => reject([url, media, `[PVZTR] Failing to load the file ${url}`, timerId]);
                    media.oncanplay = _ => resolve([url, media, timerId]);
                }
            })
            .then(([url, media, timerId]) => {
                clearTimeout(timerId);
                if (type === "audio") {
                    (canUpdateMap||!oAudioManager.resourceAudioMap.get(url)) && oAudioManager.resourceAudioMap.set(url, {
                        dom: media,
                        num: 0,
                    });
                } else {
                    (canUpdateMap||!oAudioManager.resourceMusicMap.get(url)) && oAudioManager.resourceMusicMap.set(url, media);
                }
                return singleResolveCB && singleResolveCB(url, media);
            }, ([url, media, msg, timerId]) => {
                clearTimeout(timerId);
                console.error(msg);
                return singleRejectCB && singleRejectCB(url, media, msg);
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
                    let timerId = setTimeout(_ => reject([url, media, `[PVZTR] It's longer than the limit time to load the file ${url}`]), timeout);
                    media.onerror = _ => reject([url, media, `[PVZTR] Failing to load the file ${url}`, timerId]);
                    media.oncanplay = _ => resolve([url, media, timerId]);
                }
            });
            myPromise.then(([url, media, timerId]) => {
                clearTimeout(timerId);
                singleResolveCB && singleResolveCB(url, media);
            }, ([url, media, msg, timerId]) => {
                clearTimeout(timerId);
                console.error(msg);
                singleRejectCB && singleRejectCB(url, media, msg);
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
            if (/.js$/.test(url)) {
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
                let timerId = setTimeout(_ => reject([url, `[PVZTR] It's longer than the limit time to load the file ${url}`]), timeout);
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
            let timerId = setTimeout(_ => reject([url, `[PVZTR] It's longer than the limit time to load the file ${url}`]), timeout);
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
                    let timerId = setTimeout(_ => reject([element, `[PVZTR] It's longer than the limit time to load the element`]), timeout);
                    element.onerror = _ => reject([element, `[PVZTR] Failing to load the file ${url}`, timerId]);
                    element.onload = _ => resolve([timerId]);
                }
            });
            myPromise.then(([timerId]) => {
                clearTimeout(timerId);
            }, ([element, msg, timerId]) => {
                clearTimeout(timerId);
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
    async Init({resArr = oS.DynamicPicArr, singleResolveCB, singleRejectCB, timeout = 30000, keepParam = false}) {
        if (!IsHttpEnvi) {
            singleResolveCB && resArr.forEach(originalUrl => singleResolveCB());
            return;
        } 
        const BlobImgStorage = this.__BlobImgStorage__;
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
                    timerId = setTimeout(resolve, timeout, `[PVZTR] This fetch is time-out: ${originalUrl}`);
                });
                let finalProm = Promise.race([fetchProm, timerProm])
                .then((result) => {
                    if (result instanceof Response) {
                        clearTimeout(timerId);
                        BlobImgStorage.set(originalUrl, "loading");//设置为加载状态
                        result.blob().then(
                            (blob) => {
                                BlobImgStorage.set(originalUrl, blob);
                                putDataByKey(ResourcesDatabase, "images", originalUrl, blob);
                                singleResolveCB && singleResolveCB();
                            },
                            (err) => {
                                console.error(err);
                                BlobImgStorage.delete(originalUrl, blob);
                                singleRejectCB && singleRejectCB();      
                            }
                        );
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
            return oURL.setParam(originalUrl, "ts", oSym.Now);
        }
        const BlobImgStorage = this.__BlobImgStorage__;
        const BlobUrlStorage = this.__BlobUrlStorage__;
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
                    oSym.addTask(IsTestingEnvi?0:6000,()=>{URL.revokeObjectURL(blobUrl);});             
                };
                containerDom.addEventListener("DOMNodeRemoved", function fun(event){
                    if (event.target !== containerDom) {
                        return;
                    }
                    let deltaTime = oSym.Now - oldTimeStamp;
                    if (deltaTime >= 5) {
                        revokeFunc();
                    } else {
                        oSym.addTask(5, () => BlobUrlStorage.has(originalUrl) && revokeFunc());
                    }
                    containerDom.removeEventListener("DOMNodeRemoved",fun);
                });
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
            .then((resp) => resp.blob(), (err) => {
                console.error(err);
                BlobImgStorage.delete(originalUrl);
            })
            .then((blob) => {
                BlobImgStorage.set(originalUrl, blob);
                putDataByKey(ResourcesDatabase, "images", originalUrl, blob);
            });
            return originalUrl;
        } else {
            return originalUrl;
        }
    },
	//移除单个blob链接
	remove(blobURL, originalURL) {
		const BlobUrlStorage = this.__BlobUrlStorage__;
		//释放动态链接
		oSym.addTask(IsTestingEnvi?0:6000,()=>{URL.revokeObjectURL(blobURL);});
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
    resourceAudioMap: new Map(),  //储存音效的原始dom及被引用次数
    resourceMusicMap: new Map(),  //储存bgm的实际dom
    playingAudioDomSet: new Set(),  //储存音效的实际dom
    curMusic: null,  //当前游戏内的bgm
    isAllResPaused: false, //游戏内音频是否处于暂停状态
    isAllResMuted: false,  //游戏当前是否处于静音状态
    Init() {
        //生成音频播放校验ticket
        this.refreshTicket();
        //设置游戏音效重音阈值
        //低性能模式下不允许重音播放
        this.maxSyncPlayBackNum = $User.LowPerformanceMode ? 1 : 3;
        //防止因为加载失败等原因，导致同时播放音效数量没有清零
        for (let [key, json] of this.resourceAudioMap) {
            json.num = 0;
        }
    },
    refreshTicket() {
        this.__ticket__ = '' + Math.random();
    },
    getDom(source, type) {
        const self = oAudioManager;
        const AudioMap = self.resourceAudioMap;
        const MusicMap = self.resourceMusicMap;
        if (type ?? false) {
            return type === "audio" ? AudioMap.get(source).dom : MusicMap.get(source);
        } else {
            if (AudioMap.has(source)) {
                return AudioMap.get(source).dom;
            }
            else if (MusicMap.has(source)) {
                return MusicMap.get(source);
            }
        }
    },
    newAudio(url,type = "audio",canUpdateMap=false){
        let media = new Audio();
        media.src = `audio/${url}.mp3`;
        if (type === "audio") {
            (canUpdateMap||!oAudioManager.resourceAudioMap.get(url)?.dom) && oAudioManager.resourceAudioMap.set(url, {
                dom: media,
                num: 0,
                lastPlayingInstance:null,
                lastPlayingTime:-Infinity,
            });
        } else {
            (canUpdateMap||!oAudioManager.resourceMusicMap.get(url)) && oAudioManager.resourceMusicMap.set(url, media);
        }
        return media;
    },
    playAudio(source, loop = false, volume = 1, playbackRate = 1) {
        const self = oAudioManager;
        const myMap = self.resourceAudioMap;
        const myTicket = self.__ticket__;
        //查询记录
        let record = myMap.get(source);
        //音频播放回调
        const func = (media) => {
            //如果校验ticket失败则直接放弃播放
            if (self.__ticket__ !== myTicket){
                return;
            }
            record.num++;
            record.lastPlayingInstance = media;
            record.lastPlayingTime = oSym.Now;
            //参数设置
            media.playbackRate = playbackRate;
            media.currentTime = 0;
            media.volume = volume; 
            media.loop = loop; 
            media.muted = self.isAllResMuted;
            media.play();
            //登记音频信息
            self.playingAudioDomSet.add(media);
            media.onended = () => {
                !loop && (record.num--, self.playingAudioDomSet.delete(media));
            };
        };
        
        //如果已有缓存记录，则直接克隆音频节点并播放
        if (record && record.dom) {
            if (record.num < self.maxSyncPlayBackNum&&(!record.lastPlayingInstance||Math.abs(record.lastPlayingTime-oSym.Now)>20)) {
                let newAudio = record.dom.cloneNode();
                func(newAudio);
                return newAudio;
            }else{
                return record.lastPlayingInstance;
            }
        }
        //否则则需先加载，再调用播放回调
        else {
            let media = self.newAudio(source);
            record = myMap.get(source);
            let isntNumFull = record.num < self.maxSyncPlayBackNum;
            if(isntNumFull&&(!record.lastPlayingInstance||Math.abs(record.lastPlayingTime-oSym.Now)>20)){
                let newAudio = record.dom.cloneNode(); 
                func(newAudio);
                return newAudio;
            }else{
                return record.lastPlayingInstance;
            }
        }
    },
    playMusic(source = oAudioManager.curMusic, loop = true, volume = 1) {
        const self = oAudioManager;
        const myMap = self.resourceMusicMap;
        const dom = myMap.get(source);
        // 采纳泠漪的建议，游戏内不会重复播放当前的music
        if (self.curMusic === source && !dom.paused) {
            return;
        }
        self.pauseMusic();
        self.curMusic = source;
        const func = (media) => {
            if (self.curMusic !== source) return;
            media.playbackRate = 1;
            media.currentTime = 0;
            media.volume = volume; 
            media.loop = loop; 
            media.muted = self.isAllResMuted;
            media.play();
        };
        if (dom) {
            func(dom);
            return dom;
        } else {
            let media = self.newAudio(source,"music",true);
            func(media);
            return media;
        }
    },
    pauseAudio(source) {
        let ele;
        if (source instanceof Audio) {
            ele = source;
            if (source.readyState === 4) {
                source.pause();
            } else {
                source.addEventListener("canplaythrough", source.pause.bind(source), {once: true});  
            }
        }
        else if (source instanceof Promise) {
            source.then((media) => {
                if (media.readyState === 4) {
                    media.pause(); 
                } else {
                    media.addEventListener("canplaythrough", media.pause.bind(media), {once: true});  
                }
                ele = media;
            });
        }
        return ele;
    },
    pauseMusic() {
        const self = oAudioManager;
        const ele = self.resourceMusicMap.get(self.curMusic);
        if (ele) {
            if (ele.readyState === 4) {
                ele.pause();
            } else {
                ele.addEventListener("canplaythrough", ele.pause.bind(ele), {once: true});  
            }
        }
        return ele;
    },
    //全局暂停
    allResPaused() {
        const self = oAudioManager;
        self.isAllResPaused = true;
        //暂停音效
        for (let audio of self.playingAudioDomSet) {
            self.pauseAudio(audio);
        }
        //暂停bgm
        self.pauseMusic();
    },
    //全局取消暂停
    allResPauseCanceled() {
        const self = oAudioManager;
        self.isAllResPaused = false;
        for (let audio of self.playingAudioDomSet) {
            audio.play();
        }
        let musicDom = self.getDom(self.curMusic, "music");
        musicDom && musicDom.play();
    },
    //全局静音
    allResMuted() {
        const self = oAudioManager;
        self.isAllResMuted = true;
        for (let audio of self.playingAudioDomSet) {
            audio.muted = true;
        }
        self.curMusic && (self.resourceMusicMap.get(self.curMusic).muted = true);
    },
    //全局取消静音
    allResMutedCanceled() {
        const self = oAudioManager;
        self.isAllResMuted = false;
        for (let audio of self.playingAudioDomSet) {
            audio.muted = false;
        }
        self.curMusic && (self.resourceMusicMap.get(self.curMusic).muted = false);
    },
};
const SelectModal = (lvl, path) => {
    ClearEventListeners(window,'jng-event-startgame');
    ClearEventListeners(window,'jng-event-endgame');
    oAudioManager.playingAudioDomSet.clear();
    oSelectionMap._lastMusic_ = oS.LoadMusic = oS.StartGameMusic = null;
    let GlobalVariables = oS.GlobalVariables,
         SelfVariables = oS.SelfVariables;
    for(let key in GlobalVariables) {  //恢复挂载在window上被重写的函数
        window[key] = GlobalVariables[key];
    }
    oS.GlobalVariables = {};
    for(let i of SelfVariables) {  //清除挂载在oS被重写过的数据
        oS[i] = void 0;
    }
    oDynamicPic.revokeGarbage();        //清除没被清除掉的垃圾blob图片
    CancelShovel();
    SetBlock($("loading"));
    SetHidden($("dCardList"), $("tGround"), $("dSelectCard"), $("dTop"), $("dMenu"), $("dNewPlant"));
    SetNone($("Menu"), $("shade"), $('SelectionMap'), $('labMap'), );
    dSurface.style.display = lvl === 'Service/index.js' || (lvl === 'index' && path === 'Service') ? 'block' : 'none';
    EDAll = EBody.replaceChild(EDNewAll, EDAll);  //重置大舞台
    LoadModal(lvl, path);  //启动新关卡
};
const LoadModal = function(lvl, path = 'Level') {
    let src = 'modal/' + (/\w+?\/\w+?.js$/.test(lvl) ? lvl : `${path}/${lvl}.js`);
    oS.Lvl = src.substring(src.lastIndexOf('/')+1, src.indexOf('.js'));
    oS.LoadingStage = "LoadingScript";
    if(/blob/.test(lvl)){
        src = lvl;
        oS.Lvl = "Fanmade";
        oS.OriginLvl = src;
    }
    oSym.Timer && oSym.Stop();
    oSym.Init(_=>{
        ClearChild($("JSPVZ"));
        NewEle("JSPVZ", "script", null, {src}, document.querySelector("head"));
    });
};
const ResetGame = function() {  //通用继续游戏
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
