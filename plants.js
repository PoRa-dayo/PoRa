"use strict";
var CPlants = NewO({
    /*
        上次和囧姨请教了几个关于植物定位属性的区分，就记录在这里了
        pixel：图片某个边缘到舞台边缘的距离
        beAttackedPoint：植物图像左下角（原点0）向某个方向，能触发僵尸攻击的范围
        Attacked：相对于整个场景，植物能触发僵尸攻击的范围
    */
    EName: "CPlants",
    HP: 300,
    /* PKind调用说明：0（花盆容器）、1（普通植物）、2（保护容器）、3（I类重叠植物，如花椒）、4（II类重叠植物，如液态保护膜）、5（可重叠型地形容器，如瓷砖） */
    PKind: 1,
    beAttackedPointL: 20,
    CardGif: 0,
    StaticGif: 1,
    NormalGif: 2,
    AlmanacGif: null,
    canEat: 1,
    zIndex: 0,
    AudioArr: [],
    coolTime: 7.5,
    isPlant: 1,
    canShovel: 1,
    ImgStyle:{},//植物的style属性
    canTrigger: 1,  //默认触发器能够被触发，在原版中蘑菇类白天睡眠时不触发
    Stature: 0,  // 设置植物的身高，0表示普通植物，-1表示小喷菇等矮个子植物
    Sleep: 0,
    Tooltip: "",
    SunNum: 0,
    CanSpawnSun: false,//是否为阳光类植物
    Tools:false,//是否为道具
    Immediately:false,//是否为即刻触发的植物
    FlyingPlant:false,//是否为飞行植物
    UndergroundPlant:false,//是否为地底植物（如土豆雷，地刺）
    PicArr: ["", "", BlankPNG],
    BloodBarRelativeHeight:0,
    BlueBarHP:0,
    CanGrow(data, R, C) {
        let flatCoord = `${R}_${C}`;
        let self = this;
        // 当前格被锁定则一票否决
        if (oGd.$LockingGrid[flatCoord]) {
            return false;
        }
        // 假定植物直接种植的情形
        if (
            (
                oGd.$GdType[R][C] === 1  // 要确保植物种在可种植的草坪
                || self.FlyingPlant  // 飞行植物忽略地形
                || (oGd.$GdType[R][C] === 2 && oGd.$WaterDepth[R][C] === 0)
            )
            && oGd.$GdType[R][C] !== 0  // 荒地强制禁止种植植物
        ) {
            return (
                !(
                    C < 1 || C > 9  // 要确保植物种在可种植列以内
                    || data[self.PKind]  // 要确保当前格没有相同种类植物
                ) && (!data[1] || data[1].isPlant)  // 要确保当前格没有「植物假扮的」障碍物
            );
        } 
        // 假定植物种在容器中的情形
        else { 
            return (
                !(
                    // 如果是地底植物则种不了水路
                    self.UndergroundPlant && oGd.$GdType[R][C] === 2  
                ) && data[0] && !data[self.PKind]  // 容器必须存在，且容器为空            
            )
        }
    },
    GetDX: self => -Math.floor(self.width * 0.5),
    GetDY: (R, C, arg) => arg[0] ? -21 : -15,  //返回植物底座相对格子中点的偏移量，默认可根据是否种在花盆容器中调整
    GetDBottom: self => self.height,  //返回植物底部相对于其pt的偏移量。默认是植物的身高，若碰到咖啡豆、花椒等悬空植物需要作专门调整！
    getShadow: self => `left:${self.width*0.5-48}px;top:${self.height-22}px;`,
    Birth(X, Y, R, C, plantsArg) {  //植物初始化方法
        let self = this;
        let id = "P_" + Math.random();
        //默认植物相对于FightingScene左侧的距离=格子中点坐标-0.5*植物图像宽度
        let pixelLeft = X + self.GetDX(self);  
        //默认植物顶部相对于FS顶部的距离=格子中点坐标+底座偏移-植物身高
        let pixelTop = Y + self.GetDY(R, C, plantsArg, true) - self.height; 
        let ele = NewEle(null, "div", "position:absolute;");
        self.Ele = ele;
        self.id = id;
        self.pixelLeft = pixelLeft;
        self.pixelRight = pixelLeft + self.width;
        self.pixelTop = pixelTop;
        self.pixelBottom = pixelTop + self.GetDBottom(self);  //默认植物底部相对距离=pt+植物身高
        self.zIndex_cont = self.zIndex + GetMidY(R) + 30;
        self.zIndex += 3 * R;
        self.InitTrigger(self, id,
            self.R = R,
            self.C = C,
            self.AttackedLX = pixelLeft + self.beAttackedPointL,  //植物左检测点
            self.AttackedRX = pixelLeft + self.beAttackedPointR  //植物右检测点
        );
        self.LivingArea = oGd.$GdType[self.R][self.C];
        //直接利用map方法初始化单株植物对象的动态图片。
        //这里不用担心会污染该植物类的prototype。
        //因为更改特定对象在prototype上已有的属性，会在该对象上直接重建该属性。
        self.PicArr = self.PicArr.map(pic => oDynamicPic.checkOriginalURL(pic) ? oDynamicPic.require(pic, null, true) : oURL.removeParam(pic, "useDynamicPic"));
        $P[id] = self;  //在植物池中注册
        self.EleShadow = NewEle(`${id}_Shadow`, 'div', self.getShadow(self), {className: 'Shadow'}, ele);  //绘制植物影子
        self.EleBody = NewImg(0, self.PicArr[self.NormalGif], null, ele);  //绘制植物本体
        // 为植物Ele容器设置样式
        self.BirthStyle(self, id, ele, Object.assign({
            left: pixelLeft,
            top: pixelTop,
            zIndex: self.zIndex_cont,
        }, self.ImgStyle));
        // 为植物EleBody本体设置样式
        self.BirthStyle_EleBody(self, id, self.EleBody);
        oGd.add(self, `${R}_${C}_${self.PKind}`);  //在场景注册
        //只有在游戏关卡开始后privatebirth才会执行
        let callback = _=> {
            const PrivateBirth = self.PrivateBirth;
            if($P[id]) {
                PrivateBirth && PrivateBirth.call(self, self);
                removeEventListenerRecord('jng-event-startgame', callback);
            }
        };
        oS.isStartGame===1 ? callback() : addEventListenerRecord('jng-event-startgame', callback);
        return self;
    },
    RemoveDynamicPic(_this=null) {
        const self = _this||this;
        const BlobUrlStorage = oDynamicPic.__BlobUrlStorage__;
        const ProtoPicArr = self.__proto__.PicArr;
        self.PicArr.forEach((pic, idx) => {
			let originalURL = ProtoPicArr[idx];
            if (/^blob:/.test(pic) && oURL.getParam(originalURL, "forbidRemoving") !== "true") {
                oDynamicPic.remove(pic, oURL.removeParam(originalURL));
            }
        });
    },
    BirthStyle: (self, id, ele, style) => EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R]),
    BirthStyle_EleBody() {},
    getHurt(zombie, AKind, Attack) {
        const o = this, id = o.id, ele = $(id).childNodes[1];
        o.SetBrightness(o, ele, 1);
        oSym.addTask(10, _=>$P[id] && o.SetBrightness(o, ele, 0));
        !(AKind % 3) ? (o.HP -= Attack) < 1 && o.Die() : o.Die();  //针对不同的僵尸承受不同的攻击
    },
    NormalAttack: function() {},
    //返回在本行的触发器
    //默认是本行LX-900，方向为右
    //某些植物（如裂荚射手）可能有多个触发器，因此要在外面再嵌套一个数组
    getTriggerRange: (R, LX, RX) => [[LX, oS.W, 0]],
    //传递触发器行上下限,返回格式是[小数行，大数行]
    getTriggerR: selfR => [selfR, selfR],
    InitTrigger(self, id, R, C, AttackedLX, AttackedRX) {  //初始化植物自身触发器并注册全局触发器
        let trigger = {};
        let [minR, maxR] = self.getTriggerR(R);
        for(; minR <= maxR; minR++) {  //逐行注册全局触发器
            let _trigger = trigger[minR] = self.getTriggerRange(minR, AttackedLX, AttackedRX);
            oT.add(minR, _trigger, id);
        }
        self.oTrigger = trigger;  //备份在植物自身的触发器副本，用于非外部触发的植物自主追踪
    },
    TriggerCheck(zombie, direction) {  //用于检测和触发自身植物的攻击
        const self = this;
        if(self.AttackCheck2(zombie)&&oS.isStartGame===1) {  //检测僵尸海拔
            self.canTrigger = 0;  //将植物的触发器关闭，使得外部僵尸在攻击阶段无法重复触发
            self.CheckLoop(zombie.id, direction);
        }
    },
    CheckLoop(zid, direction) {  //开始攻击，并且循环检查攻击条件1,2
        let self = this;
        let pid = self.id;
        if($P[pid]) {
            self.NormalAttack(zid);  //触发植物攻击，并传入触发者僵尸之id
            oSym.addTask(140, _=>$P[pid] && self.AttackCheck1(zid, direction));            
        }
    }, 
    //传递之前触发攻击的僵尸之id，再次检测是否符合触发攻击条件
    //若符合，则触发下一次攻击；若不符合，则解锁植物触发器，继续接受外部僵尸触发攻击
    AttackCheck1(zid) {
        let self = this;
        let oTrigger = self.oTrigger;
        let zombie = $Z[zid];
        //储存僵尸所在行的触发器们
        //为了防止僵尸换行，下头还要再检测一遍目前僵尸所在行有没有注册该植物的触发器
        let availableTriggers;
        if(zombie && zombie.PZ && (availableTriggers = oTrigger[zombie.R])) {
            let ZX = zombie.ZX;  //僵尸左攻击点
            //搜索植物在本行注册的所有触发器，只要有触发器被触发，则进行下一次攻击
            for(let trigger of availableTriggers) {
                if(trigger[0] <= ZX && trigger[1] >= ZX && self.AttackCheck2(zombie)) {
                    self.CheckLoop(zid, trigger[2]);
                    return;
                }                
            }
        }
        self.canTrigger = 1;
    },
    AttackCheck2: zombie=>zombie.Altitude < 3 && zombie.Altitude > 0,  //攻击先决条件检测：检测僵尸海拔
    PrivateDie: function(a) {},
    Die: function(ticket=undefined) {
        var self = this,
        c = self.id;
        self.oTrigger && oT.delP(self);
        self.HP = 0;
        delete $P[c];
        delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
        ClearChild($(c));
        IsHttpEnvi && self.RemoveDynamicPic(self);
        self.PrivateDie(self,ticket);
    },
    BoomGIF(left, top) {
        oAudioManager.playAudio("cherrybomb");
        let self = this;
        oEffects.ImgSpriter({
            ele: NewEle(self.id+'_Boom', "div", `position:absolute;overflow:hidden;z-index:${self.zIndex + 2};width:216px;height:164px;left:${left}px;top:${top}px;background:url(images/Plants/CherryBomb/Boom.png) no-repeat;`, 0, EDPZ),
            styleProperty: 'X',
            changeValue: -216,
            frameNum: 25,
        });
    },
    SetBrightness(self, ele, deep) {
        if($User.LowPerformanceMode){
            return;
        }
        ele && EditCompositeStyle({
            ele,
            styleName: 'filter',
            delFuncs: ['brightness'],
            addFuncs: [['brightness', deep ? '110%' : '100%']],
            option: 2,
        });
    },
}),
oLawnCleaner = InheritO(CPlants, {
    EName: "oLawnCleaner",
    CName: "小推车",
    width: 71,
    height: 57,
    isPlant: false,
    beAttackedPointL: 0,
    beAttackedPointR: 60,
    WaterSplashGif: 3,
    PicArr: ["images/interface/LawnCleaner.png", "images/Card/LawnCleaner.webp?useDynamicPic=false", 'images/Plants/SporeShroom/Effect.webp', WaterSplashImg],
    AudioArr: ["lawnmower", "Rifter_Summon1", "Rifter_Summon2"],
    NormalGif: 0,
    CardGif: 1,
    canEat: 0,
    Stature: -3,
    HP: Infinity,
    Birth(X, Y, R, C, plantsArg) { //植物初始化方法
        let self = this,
            id = "P_" + Math.random(),
            pixelLeft = X + self.GetDX(self), //默认植物相对于FightingScene左侧的距离=格子中点坐标-0.5*植物图像宽度
            pixelTop = Y + self.GetDY(R, C, plantsArg) - self.height, //默认植物顶部相对于FS顶部的距离=格子中点坐标+底座偏移-植物身高
            ele = NewEle(null, "div", "position:absolute;");
        self.id = id;
        self.pixelLeft = pixelLeft;
        self.pixelRight = pixelLeft + self.width;
        self.pixelTop = pixelTop;
        self.pixelBottom = pixelTop + self.GetDBottom(self); //默认植物底部相对距离=pt+植物身高
        self.zIndex = 3 * R;
        self.zIndex_cont = GetMidY(R) + 30;
        self.PicArr = self.PicArr.map(pic => oDynamicPic.checkOriginalURL(pic) ? oDynamicPic.require(pic, null, true) : oURL.removeParam(pic, "useDynamicPic"));
        IsHttpEnvi && ele.addEventListener("DOMNodeRemoved", (event) => {
            if (event.target === ele) {
                setTimeout(self.RemoveDynamicPic.bind(self), 1);
            }
        });
        $P[id] = self; //在植物池中注册
        NewEle(`${id}_Shadow`, 'div', self.getShadow(self), {
            className: 'Shadow'
        }, ele); //绘制植物影子
        NewImg(0, self.PicArr[self.NormalGif], null, ele); //绘制植物本体
        self.InitTrigger(self, id,
            self.R = R,
            self.C = C,
            self.AttackedLX = pixelLeft + self.beAttackedPointL, //植物左检测点
            self.AttackedRX = pixelLeft + self.beAttackedPointR //植物右检测点
        );
        self.BirthStyle(self, id, ele, {
            left: pixelLeft + "px",
            top: pixelTop + "px",
            zIndex: self.zIndex_cont,
        });
        oGd.add(self, `${R}_${C}_${self.PKind}`); //在场景注册
        self.PrivateBirth(self);
        return self;
    },
    PlayBirthEffect(obj) {
        const ele = NewEle(obj.id + "Effect", "div", `position:absolute;z-index:${obj.zIndex - 1};width:631px;height:481px;left:${obj.pixelLeft-270}px;top:${obj.pixelTop-260}px;transform:scale(0.5,0.5);background:url(${obj.PicArr[2]}) no-repeat;`, 0, EDPZ);
        oSym.addTask(20, ClearChild, [ele]);
    },
    PrivateBirth(obj) {
        obj.PlayBirthEffect(obj);
    },
    getShadow(self) {
        return "left:" + (self.width * 0.5 - 38) + "px;top:" + (self.height - 22) + "px"
    },
    getTriggerRange(R, LX, RX) {
        return [[LX, RX, 0]];
    },
    TriggerCheck(zombie) {
        if (zombie.beAttacked && zombie.Altitude) {
            this.canTrigger = 0;
            this.NormalAttack(this);
            if(zombie.constructor===oBalloonZombie&&zombie.isFloating){
                let ps = function(name,ach,type="成就"){
                    if($User.Achievement[ach]){
                        return;
                    }
                    PlaySubtitle(`解锁${type}：${name}`);
                    oSym.addTask(500,function(){
                        PlaySubtitle();
                    });
                    DataManager.SetAchievement(ach,1);
                };
                ps("犯罪高手","The_oLawnCleaner_Egg");
            }
            localStorage.JNG_DEV !== 'true' && CSpeed(1);
        }
    },
    NormalAttack(self) {
        const W = oS.W;
        const R = self.R;
        const id = self.id;
        const ele = $(id);
        oAudioManager.playAudio(self.AudioArr[0]);
        (function fun(AttackedLX, AttackedRX) {
            if (!$P[id]) {
                return;
            }
            oZ.getArZ(AttackedLX, AttackedRX, R).forEach((zombie) => {
                zombie.getCrushed(self) && zombie.CrushDie();
            });
            let C = GetC(self.AttackedRX);
            if (AttackedLX > W) {
                self.Die();
            } 
            else if (oGd.$GdType[R][C] === 2) {
                oEffects.Animate(ele, {
                    transform: "rotate(45deg)",
                    left: self.pixelLeft + 100 + "px",
                }, 0.1 / oSym.NowSpeed);
                oSym.addTask(10, () => {
                    let eff = NewImg(0, null, `width:160px;height:195px;top:${GetY(self.R)-170}px;left:${self.AttackedRX - 25}px;z-index:${3 * self.R + 1}`, EDPZ);
                    eff.src = oDynamicPic.require(WaterSplashImg,eff);
                    oSym.addTask(50, () => {oAudioManager.playAudio("Rifter_Summon" + [1,2].random()).volume = 0.5;});
                    oSym.addTask(113, ClearChild, [eff]);
                    self.Die();
                });
            } 
            else {
                self.pixelRight += 10;
                self.AttackedLX = AttackedLX += 10;
                self.AttackedRX = AttackedRX += 10;
                ele.style.left = (self.pixelLeft += 10) + "px";
                oSym.addTask(1, fun, [AttackedLX, AttackedRX]);
            }
        })(self.AttackedLX, self.AttackedRX);
    }
}),
oBrains = InheritO(CPlants, {
    EName: "oBrains",
    CName: "脑子",
    width: 32,
    height: 31,
    beAttackedPointL: 0,
    beAttackedPointR: 32,
    NormalGif: 0,
    HP: 1,
    InitTrigger: _=>{},
    GetDX: _=>-40,
    PrivateDie: _=>oSym.Timer && toOver(1),
}),
//庭院植物从以下开始
oPeashooter = InheritO(CPlants, {
    EName: "oPeashooter",
    CName: "豌豆射手",
    width: 75,
    height: 75,
    beAttackedPointR: 51,
    SunNum: 100,
    AttackGif: 5,
    BulletGif: 3,
    AudioArr: ["splat1", "splat2", "splat3", "plastichit", "shieldhit", "shieldhit2", 'throw', 'throw2'],
    PicArr: (function() {
        var a = "images/Plants/Peashooter/";
        var b = "images/Plants/";
        return ["images/Card/Peashooter.webp", a + "0.webp", a + "Peashooter.webp", b + "PB00.webp?useDynamicPic=false", b + "PeaBulletHit0.webp", a + "PeashooterAttack.webp"]
    })(),
    Tooltip: "向敌人射出豌豆",
    Story:"在每天一顿的阳光和高纤维碳水早餐的加持下，他多年的努力且专注的工作取得了成效，虽然有些人认为他不过是射出了豌豆，但是很少有人能像他那样，从2009年开始，持续7年从未停止。",
    NormalAttack() {
        let self = this,
        id = self.id,
        dom = $(id);
        dom.childNodes[1].src = self.PicArr[self.AttackGif];
        oSym.addTask(100, _ => {
            $(id) && (dom.childNodes[1].src = self.PicArr[self.NormalGif]);
        });
        oSym.addTask(60, _ => {
            oAudioManager.playAudio(['throw', 'throw2'][Math.round(Math.random() * 1)]);
            CustomBullet(oPeaBullet,[self.PicArr[self.BulletGif]],self.AttackedLX,self.pixelTop+15,self.R);
        });
    }
}),
oSunFlower = InheritO(CPlants, {
    EName: "oSunFlower",
    CName: "向日葵",
    width: 73,
    height: 74,
    beAttackedPointR: 40,
    SunNum: 50,
    CanSpawnSun:true,
    ProduceGif:3,
    IZombieMode:false,//是否是我是僵尸模式的向日葵
    IZSunProduced:0,//在我是僵尸中产生了多少阳光
    IZSunTotal:6,//向日葵在我是僵尸中一共有多少阳光
    PicArr: (function() {
        let a = "images/Plants/SunFlower/";
        return ["images/Card/SunFlower.webp", a + "0.webp", a + "idle.webp",a + "produce.webp"]
    })(),
    Tooltip: "向日葵，为你生产更多阳光的基础作物。尽可能多地种植吧！",
    Story: "《向日葵炫舞秀》因后期制作的问题【加入进阶宝物，搞pvp】，导致小向一怒之下炒掉了不称职的追秒草和小豌豌。并另起炉灶：请挨炮招募新的小伙伴，让叶子伞葛格奏乐，找小玉米伴舞。现在她马上就要去举行《Zombie on your lawn》的巡回演唱会了——只要500钻石，不仅可以抽得十株植物，而且首抽必得演唱会门票……",
    ChangePosition: function(c, a) {
        let self = this;
        const ele = c.childNodes[1];
        ele.src = self.PicArr[a?self.ProduceGif:self.NormalGif];
    },
    PrivateBirth: function(self) {
        if(oS.ProduceSun&&!self.IZombieMode) {
            let id = self.id, ele = $(id);
            oSym.addTask(500, function fun(X, Y) {  //出生5秒之后初次生产阳光，之后每34秒生产一次
                $P[id] && ( //植物还存在
                    self.ChangePosition(ele, 1),  //播放动画
                    oSym.addTask(75, _=>{
                        if($P[id]) {
                            AppearSun(X-30, Y-50, 50, 0,50-Math.random()*10);  //生产阳光
                            oSym.addTask(100, _=>$P[id] && self.ChangePosition(ele, 0));  //切回动画
                            oSym.addTask(3425, fun, [X, Y]);//35s产一次
                        }
                    })
                );
            }, [GetX(self.C) + 75, GetY(self.R)]);                
        };
    },
    getHurt(zombie, AKind, Attack) {
        let self = this;
        self.tmpGetHurt(zombie,AKind,Attack);
        if(self.IZombieMode){
            let currentNeedToSummon = Math.floor(self.IZSunTotal - self.HP/(self.constructor.prototype.HP/self.IZSunTotal));
            for(let i = self.IZSunProduced;i<currentNeedToSummon;i++){
                AppearSun(GetX(self.C) + 45, GetY(self.R) - 50, 50, 0, 50-Math.random()*10);
            }
            self.IZSunProduced = currentNeedToSummon;
        }
    },
    PrivateDie: function(self,ticket=undefined) {
        if(self.IZombieMode&&!["JNG_TICKET_MakeRifterZombie","JNG_TICKET_ThiefZombie"].includes(ticket)){
            for(let i = self.IZSunProduced;i<self.IZSunTotal;i++){
                AppearSun(GetX(self.C) + 45, GetY(self.R) - 50, 50, 0, 50-Math.random()*10);
            }
            self.IZSunProduced = Infinity;
        }
    },
    tmpGetHurt:CPlants.prototype.getHurt,
    InitTrigger: _=>{},
}),
oPotatoMine = InheritO(CPlants, {
    EName: "oPotatoMine",
    CName: "土豆雷",
    width: 143,
    height: 200,
    beAttackedPointL: 40,
    beAttackedPointR: 100,
    SunNum: 25,
    Stature: -1,
    HP: 2400,
    UndergroundPlant:true,
    firstCoolTime: 20,
    BloodBarRelativeHeight:30,
    coolTime: 30,
    AlmanacGif: 3,
    PicArr: (function() {
        var a = "images/Plants/PotatoMine/";
        return ["images/Card/PotatoMine.webp", a + "0.gif", a + "PotatoMineNotReady.png", a + "PotatoMine.gif", a + "Boom.png", a + "PotatoMineOut.gif"]
    })(),
    Tooltip: "敌人接触后爆炸<br>需要时间安放",
    Story: "有人问我，我的根须到底有多大？”他清了清嗓子，并吞了一大块冰淇淋，“并不像某些盗版漫画里画得那么臃肿，也不像我某个崛起的兄弟那么肥硕。事实上，我身材很苗条，娇小玲珑，S形身材；所以有人给我起了个雅号，叫【赛贾玲】。",
    Status: 0,
    AudioArr: ["cherrybomb"],
    getShadow: self => `left:27px;top:170px;`,
    canTrigger: 0,
    getHurt2: function(d, b, a) {
        var c = this;
        b > 2 ? (c.HP -= a) < 1 && c.Die() : c.NormalAttack(c.pixelLeft, c.pixelRight, c.R)
    },
    PrivateBirth(self) {
        let id = self.id;
        let ele = $(id).childNodes[1];
        let arr = self.PicArr;
        oSym.addTask(1500, _ => {
            if($P[id]) {
                ele.src = arr[5]; 
                self.Status = 1; 
                self.canTrigger = 1; 
                self.getHurt = self.getHurt2;
                self.canEat = 0;
                oSym.addTask(100, _ => $P[id] && (ele.src = arr[3]));
            }
        });
    },
    getTriggerRange: function(a, b, c) {
        return [[b, c-20, 0]]
    },
    TriggerCheck(zombie) {
        let self = this;
        /* 土豆地雷触发的条件：
            1.僵尸处于可攻击状态，所处海拔正常，且不处于浮空状态
            2.土豆地雷没有被南瓜套包裹
        */
        zombie.beAttacked && zombie.Altitude < 2 && !zombie.isFloating && !oGd.$[self.R + "_" + self.C + "_2"] && self.NormalAttack(self.pixelLeft, self.pixelRight, self.R);
    },
    NormalAttack: function(lx, rx, r) {
        oAudioManager.playAudio("cherrybomb");
        let self = this, id = self.id, zombies = oZ.getArZ(lx, rx, r);
        zombies.forEach(zombie => zombie.Altitude < 2 && zombie.getExplosion());
        self.Die();
		oEffects.ScreenShake();
        oEffects.ImgSpriter({
            ele: NewEle(id + '_Boom', "div", `position:absolute;overflow:hidden;z-index:${self.zIndex+2};width:213px;height:210px;left:${self.pixelLeft-50}px;top:${self.pixelTop-10}px;background:url(images/Plants/PotatoMine/Boom.png) no-repeat;`, 0, EDPZ),
            styleProperty: 'X',
            changeValue: -213,
            frameNum: 15,
            interval: 8,
        });
    },
}),
oPotatoMine2 = InheritO(oPotatoMine, {
    EName: "oPotatoMine2",
    CName: "冷却减少-土豆雷",
    coolTime: 5,
    Tooltip: "敌人接触后爆炸且需要时间安放<br>优化：冷却减少。"
}),
oWallNut = InheritO(CPlants, {
    EName: "oWallNut",
    CName: "坚果墙",
    width: 65,
    height: 73,
    beAttackedPointR: 45,
    SunNum: 50,
    HP: 4000,
    coolTime: 20,
    Cracked1Gif: 3,
    Cracked2Gif: 4,
    PicArr: (function() {
        var a = "images/Plants/WallNut/";
        return ["images/Card/WallNut.webp", a + "0.webp", a + "WallNut.webp", a + "Wallnut_cracked1.webp", a + "Wallnut_cracked2.webp"]
    })(),
    Tooltip: "坚果墙拥有足以保护其它植物的坚硬外壳。",
    Story: "在粉丝的千呼万唤之下，坚果终于重回保龄球赛场。面对萌萌的保龄球茎一次次的挑战，他毫不畏惧——“他也不过就是只荸荠！”。保龄球茎在薇博上回应道：“如果你还不太清楚我俩的实力差距话，建议你看看清楚你我在中文版的卡牌颜色。",
    CanGrow: function(c, b, f) {
        var a = b + "_" + f,
            d = c[1],
            e = oS.ArP;
        return e ? oGd.$GdType[b][f] == 1 ? f > 0 && f < e.ArC[1] && !(oGd.$LockingGrid[a] || d) : c[0] && !d : d && d.HP <= 2667 && d.EName == "oWallNut" ? 1 : (oGd.$GdType[b][f] == 1 || (oGd.$GdType[b][f] === 2 && oGd.$WaterDepth[b][f] === 0)) ? !(f < 1 || f > 9 || oGd.$LockingGrid[a] || d) : c[0] && !d
    },
    InitTrigger() {},
    /* 
        HurtStatus表示坚果损伤状态
        HurtStatus为0，表示坚果无伤
        HurtStatus为1，表示坚果轻度损伤
        HurtStatus为2，表示坚果高度损伤
    */
    HurtStatus: 0,
    getHurt(zombie, AKind, Attack) {
        const self = this;
        const id = self.id;
        const ele = $(id).childNodes[1];
        //设置植物受攻击高亮
        self.SetBrightness(self, ele, 1);
        oSym.addTask(10, () => $P[id] && self.SetBrightness(self, ele, 0));
        //扣血
        let hp = (self.HP -= Attack);
        //状态变化
        //首先要判断受到的是普通攻击，还是汽车类僵尸/巨人僵尸的秒杀
        if (!(AKind % 3)) {
            if (hp < 1) {
                self.Die();
            }
            else if (hp < 1334 && self.HurtStatus < 2) {
                 self.HurtStatus = 2;
                 ele.src = self.PicArr[self.Cracked2Gif];
            } 
            else if (hp < 2667 && self.HurtStatus < 1) {
                self.HurtStatus = 1;
                ele.src = self.PicArr[self.Cracked1Gif];
            }
        } else {
           self.Die();
        }
    }
}),
//森林植物从以下开始
oStoneFlower = InheritO(CPlants, {
    EName: "oStoneFlower",
    CName: "朝鲜蓟",
    width: 155,
    height: 130,
    beAttackedPointL: 63,
    beAttackedPointR: 75,
    SunNum: 100,
    HP: 5500,
    canEat: 1,
    coolTime: 20,
    AudioArr: ["Artichoke_Attack"],
    PicArr: (function() {
        var a = "images/Plants/StoneFlower/";
        return ["images/Card/StoneFlower.webp", a + "0.gif", a + "Spikeweed.gif", a + "Attack.gif"]
    })(),
    Attack: 12,
    Tooltip: "阻挡僵尸前进的同时，对啃食它的僵尸造成伤害",
    Story: "“从远处看，他青葱的叶片上下摆动，郁郁葱葱青翠欲滴；但如果从近处啃，NO！！！”——一只普僵的遗言",
    PrivateBirth: function(o) {
        o.ArZ = {};
    },
    NormalAttack: function(zid) {
        oAudioManager.playAudio("Artichoke_Attack");
        let zombie = $Z[zid],
             o = this,
             pid = o.id;
        !o.isAttacking && ($(pid).childNodes[1].src = o.PicArr[3], o.isAttacking = 1, oSym.addTask(50, function fun(){
            if($P[pid]) {
                o.ArZ.length < 1 ? ($(pid).childNodes[1].src = o.PicArr[2], o.isAttacking = 0) : oSym.addTask(50, fun);
            }
        }));
        zombie.getHit2(zombie, o.Attack, 0);
    },
    getTriggerRange: function(a, b, c) {
        return [[this.pixelLeft - 80, this.pixelRight + 80, 0]]
    },
    TriggerCheck: function(i, h) {
        var c = i.id,
        g = this.ArZ,
        a, b, e, f;
        i.PZ && !g[c] && (a = i.AttackedLX, b = i.AttackedRX, e = this.AttackedLX, f = this.AttackedRX, a <= f && a >= e || b <= f && b >= e || a <= e && b >= f) && this.AttackCheck2(i) && (
            g[c] = 1,  //把当前僵尸标注为已检查过
            this.NormalAttack(c),
            oSym.addTask(100, function(d, j) {
                var k = $P[d];
                k && delete k.ArZ[j];
            }, [this.id, c])
        );
    },
    AttackCheck2: function(a) {  //触发特殊条件检查器
        return a.Altitude == 1 && a.beAttacked;
    }
}),
oRadish = InheritO(CPlants, {
    EName: "oRadish",
    CName: "飞旋萝卜",
    width: 155,
    height: 130,
    beAttackedPointL: 63,
    beAttackedPointR: 75,
    SunNum: 200,
    coolTime: 20,
    AudioArr: ["Radish"],
    AttackGif: 3,
    BulletGif: 4,
    FlyingPlant:true,
    PicArr: (function() {
        const a = "images/Plants/Radish/";
        return ["images/Card/Radish.webp", a + "0.webp", a + "Radish.webp", a + "Attack.webp", a + "Bullet.png"];
    })(),
    Tooltip: "在僵尸离它比较近时，对其发射能飞跃四格的穿透弹。",
    Story: "“有人说，我的叶片毫无用处。”他转了下身，对僵尸发射了一颗子弹，然后接着说：“但只有不停地旋转叶片，才可以给予子弹穿透僵尸的速度与力量。”",
    getTriggerRange: function(a, b, c) {
        return [[b, Math.min(c + 330, oS.W), 0]]
    },
    NormalAttack() {
        let self = this,
        id = self.id,
        dom = $(id);
        dom.childNodes[1].src = self.PicArr[self.AttackGif];
        oSym.addTask(87.5, _ => {
            $(id) && (dom.childNodes[1].src = self.PicArr[self.NormalGif]);
        });
        oSym.addTask(62.5, _ => {
            oAudioManager.playAudio("Radish");
            CustomBullet(oRadishBullet, [self.PicArr[self.BulletGif]], self.AttackedLX, self.pixelTop + 30, self.R);
        });
    }
}),
oSnowPea = InheritO(oPeashooter, {
    EName: "oSnowPea",
    CName: "寒冰射手",
    SunNum: 175,
    AttackGif: 5,
    Attack:40,//伪数值，总攻击力
    PicArr: (function() {
        var a = "images/Plants/SnowPea/";
        var b = "images/Plants/";
        return ["images/Card/SnowPea.webp", a + "0.webp", a + "SnowPea.webp", b + "PB-10.webp?useDynamicPic=false", b + "PeaBulletHit1.webp", a + "PeashooterAttack.webp"]
    })(),
    AudioArr: ["frozen", "splat1", "splat2", "splat3", "shieldhit", "shieldhit2", "plastichit", 'throw', 'throw2'],
    Tooltip: "寒冰射手可造成伤害, 同时又有减速效果",
    Story: "事实上，他一直在暗恋火焰豌豆射手，但却一直犹豫不决，不清楚是否该表白。他不太清楚，他和火焰豌豆，生出来的，会是什么。毕竟，他不想重蹈双发射手与豌豆射手生出裂荚射手的悲剧。",
    NormalAttack: function() {
        let self = this,
        id = self.id,
        dom = $(id);
        dom.childNodes[1].src = self.PicArr[self.AttackGif];
        oSym.addTask(100,function() {
            $(id) && (dom.childNodes[1].src = self.PicArr[self.NormalGif]);
        });
        oSym.addTask(60,function() {
            oAudioManager.playAudio(['throw', 'throw2'][Math.round(Math.random() * 1)]);
            CustomBullet(oSnowPeaBullet,[self.PicArr[self.BulletGif]],self.AttackedLX,self.pixelTop+15,self.R);
        });
    }
}),
oRepeater = InheritO(oPeashooter, {
    EName: "oRepeater",
    CName: "双发射手",
    width: 73,
    height: 71,
    beAttackedPointR: 53,
    SunNum: 175,
    firstCoolTime: 7.5,
    Attack:40,//总攻击力
    PicArr: (function() {
        var a = "images/Plants/Repeater/";
        var b = "images/Plants/";
        return ["images/Card/Repeater.webp", a + "0.webp", a + "Repeater.webp", b + "PB00.webp?useDynamicPic=false", b + "PeaBulletHit0.webp", a + "RepeaterAttack.webp"]
    })(),
    Tooltip: "双发射手能对僵尸造成成倍伤害！",
    Story:"“啊，双发，你比一发多~一~发~啊，双发，你比寒冰多~一~发~啊，双发，你比三发少~一~发~终于有一天，你会~变成八千儿~发~”。自从这首得瑟神曲《双发之歌》上传在bilibili后，便迅速吸引了一大批网友的目光，其中包括一个姓岳的僵尸。",
    NormalAttack1: oPeashooter.prototype.NormalAttack,
    NormalAttack: function(a) {
        this.NormalAttack1();
        oSym.addTask(75, function(c) {
            let b = $P[c];
            b && CustomBullet(oPeaBullet,[b.PicArr[b.BulletGif]],b.AttackedLX,b.pixelTop+15,b.R);
        },
        [this.id])
    }
}),
oCherryBomb = InheritO(CPlants, {
    EName: "oCherryBomb",
    CName: "樱桃炸弹",
    width: 216,
    height: 164,
    beAttackedPointL: 60,
    beAttackedPointR: 130,
    SunNum: 150,
    coolTime: 30,
    Immediately: true,
    HP: Infinity,
    PicArr: (function(){
        const a = "images/Plants/CherryBomb/";
        return ["images/Card/CherryBomb.webp", a + "0.gif", a + "CherryBomb.gif", a + "Boom.png"];
    })(),
    AudioArr: ["cherrybomb"],
    Tooltip: "炸掉一定区域内的所有僵尸",
    Story: "“咱俩合作，将会爆发强劲的力量！”一个樱桃说。“是啊，不像裂荚射手，为了抢眉毛而自相残杀；我们虽然只有一个叶片，但我们永远不会分裂；尽管这叶片归我…”，“咋是你的？是我的…”，“不，是我的…”，“你……信不信我炸了把你炸没…”，“我先爆，看谁先没…”。于是嘛，樱桃炸弹就爆炸了…...",
    InitTrigger: _=>{},
    getHurt: _=>{},
    Die(ticket) {
        let self = this;
        let id = self.id;
        if(['JNG_TICKET_SuperPower', 'JNG_TICKET_ShovelPlant'].includes(ticket)) {
            self.oTrigger && oT.delP(self);
            self.HP = 0;
            delete $P[id];
            delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
            ClearChild($(id));
            IsHttpEnvi && self.RemoveDynamicPic(self);
        }
    },
    DisappearDie: _ => {},
    PrivateBirth(self) {
        oSym.addTask(119, id=>{
            if($P[id]) {
                let ele = $(id), R = self.R,
                floorR = R > 1 ? R - 1 : 1,
                ceilingR = R < oS.R ? R + 1 : oS.R,
                leftBorder = self.pixelLeft - 80,
                rightBorder = self.pixelRight + 80;
                do {
                    oZ.getArZ(leftBorder, rightBorder, floorR).forEach(zombie=>zombie.getExplosion());
                } while (floorR++ < ceilingR);
                self.Die('JNG_TICKET_SuperPower');
                self.BoomGIF(self.pixelLeft, self.pixelTop);
                oEffects.ScreenShake();
            }
        }, [self.id]);
    },
}),
oCherryBomb2 = InheritO(oCherryBomb, {
    EName: "oCherryBomb2",
    CName: "减少冷却-樱桃炸弹",
    coolTime: 10,
    Tooltip: "炸掉一定区域内的所有僵尸<br>优化：冷却减少。"
}),
oTallNut = InheritO(oWallNut, {
    EName: "oTallNut",
    CName: "高坚果",
    width: 83,
    height: 119,
    beAttackedPointR: 63,
    SunNum: 125,
    HP: 12000,
    coolTime: 25,
    BloodBarRelativeHeight:-30,
    BlueBarHP:8000,
    PicArr: (function() {
        var a = "images/Plants/TallNut/";
        return ["images/Card/TallNut.webp", a + "0.gif", a + "TallNut.gif", a + "TallnutCracked1.gif", a + "TallnutCracked2.gif"]
    })(),
    Tooltip: "不会被逾越的坚实壁垒",
    Story: "当他的兄弟坚果墙在保龄球赛场混的风生水起的时候，他自己却选择坚守防御战线。“勿忘初心。”他说，“防御，是我们的本职...”但据坊间传闻称，高坚果之所以不参与保龄球运动只是因为它太方了……",
    CanGrow: function(c, b, f) {
        var a = b + "_" + f,
        d = c[1],
        e = oS.ArP;
        return e ? oGd.$GdType[b][f] == 1 ? f > 0 && f < e.ArC[1] && !(oGd.$LockingGrid[a] || d) : c[0] && !d: d && d.HP <=8000 && d.EName == "oTallNut" ? 1 : (oGd.$GdType[b][f] == 1 || (oGd.$GdType[b][f]===2&&oGd.$WaterDepth[b][f]===0)) ? !(f < 1 || f > 9 || oGd.$LockingGrid[a] || d) : c[0] && !d
    },
    Stature: 1,
    getHurt(zombie, AKind, Attack) {
        const self = this;
        const id = self.id;
        const ele = $(id).childNodes[1];
        //设置植物受攻击高亮
        self.SetBrightness(self, ele, 1);
        oSym.addTask(10, () => $P[id] && self.SetBrightness(self, ele, 0));
        //扣血
        let hp = (self.HP -= Attack);
        //状态变化
        //首先要判断受到的是普通攻击，还是汽车类僵尸/巨人僵尸的秒杀
        if (!(AKind % 3)) {
            if (hp < 1) {
                self.Die();
            }
            else if (hp < 4000 && self.HurtStatus < 2) {
                 self.HurtStatus = 2;
                 ele.src = self.PicArr[self.Cracked2Gif];
            } 
            else if (hp < 8000 && self.HurtStatus < 1) {
                self.HurtStatus = 1;
                ele.src = self.PicArr[self.Cracked1Gif];
            }
        } else {
           self.Die();
        }
    }
}),
//沼泽植物从以下开始
oSunShroom = InheritO(CPlants, {
    EName: "oSunShroom",
    CName: "阳光菇",
    width: 77,
    height: 94,
    beAttackedPointL: 8,
    beAttackedPointR: 20,
    SunNum: 25,
    Stature: -1,
    Status: 0,
    CanSpawnSun: true,
    AlmanacGif: 3,
    AudioArr: ['plantgrow'],
    PicArr: (function() {
        var a = "images/Plants/SunShroom/";
        return ["images/Card/SunShroom.webp", a + "0.webp", a + "SunShroom2.webp", a + "SunShroom.webp", a + "SunShroomGrow.webp", a + "ProduceSun.webp"]
    })(),
    Tooltip: "阳光菇开始提供少量阳光，稍后提供正常数量阳光。",
    Story: "有植物向她请教：使她随时保持萌态并永远有着蒙娜丽莎般的微笑的秘诀是什么？阳光菇甜甜地回答道：“只要心灵阳光，不管是面对漫漫黑夜，还是目睹丧尸围攻，都可以永远有着阳光般的心态与笑容。”。这时，从植群里传来声音：“你不是特别讨厌阳光，身子里有一点点，就恨不得全吐出来的吗？”",
    InitTrigger: function() {},
    BirthStyle: function(c, d, b, a) {
        let self = this;
        b.childNodes[1].src = this.PicArr[2];
        EditEle(b, {
            id: d,
            'data-jng-constructor': self.EName
        }, a, oZombieLayerManager.$Containers[self.R]);
        function fun(_this, c, d, b, a) {
            oSym.addTask(600, (h, g, f) => {
                let e = $P[h];
                e && e.ProduceSun(e, g, f)
            }, [d, GetX(c.C) - 40, GetY(c.R) - 60]);
            oSym.addTask(12000, f => {
                oAudioManager.playAudio('plantgrow');
                let e = $P[f];
                e && (e.Stature = 0, e.Sleep = 0, $(f).childNodes[1].src = e.PicArr[4], e.Status = 1);
                oSym.addTask(233, f => {
                    let e = $P[f];
                    e && ($(f).childNodes[1].src = e.PicArr[3]);
                }, [d]);
            }, [d]);
        }
        if (oS.isStartGame === 0) { //修复阳光菇在LoadAccess产阳光bug
            addEventListenerRecord("jng-event-startgame", function sd() {
                fun(self, c, d, b, a);
                removeEventListenerRecord("jng-event-startgame", sd);
            });
        } else {
            fun(self, c, d, b, a);
        }
    },
    ProduceSun: function(a, c, b) {
        (a && a.Status) && a.ChangePosition(a.id, 1);
        oSym.addTask(80, () => {
            $P[a.id] && AppearSun(c + 65, b, !a.Status ? 25 : 50, 0, 30 - Math.random() * 10, 10);
        });
        oSym.addTask(250,
            function() {
                (a && a.Status) && a.ChangePosition(a.id, 0);
            })
        oSym.addTask(2100,
            function(g, f, e) {
                var d = $P[g];
                d && d.ProduceSun(d, f, e)
            },
            [a.id, c, b])
    },
    ChangePosition: function(id, a) {
        if ($P[id]) {
            let obj = $P[id],
                dom = $(id);
            obj.beAttackedPointR = 40;
            dom.childNodes && (a ? dom.childNodes[1].src = obj.PicArr[5] : dom.childNodes[1].src = obj.PicArr[3]);
        }
    }
}),
oPuffShroom = InheritO(CPlants, {
    EName: "oPuffShroom",
    CName: "小喷菇",
    width: 59,
    height: 61,
    beAttackedPointL: 15,
    beAttackedPointR: 44,
    Attack:20,
    Stature: -1,
    AttackGif: 3,
    BulletGif: 4,
    SplashGif: 5,
    PicArr: ((url1, url2) => 
        ["images/Card/PuffShroom.webp", url1 + "0.webp", url1 + "PuffShroom.webp", url1 + "PuffShroomAttack.webp", url2 + "ShroomBullet.png", url2 + "ShroomBulletHit.webp?useDynamicPic=false"]
    )("images/Plants/PuffShroom/", "images/Plants/"),
    AudioArr: ["puff"],
    Tooltip: "向敌人发射短程孢子的免费植物",
    Story: "“有人说，我很懒，懒得只能喷那么点距离。”小喷菇严肃地说，“我只想说，再说我懒的话，我就消失给你看，我还要江南，做个保护可以消失的我的关卡，把你坑个昏天黑地，等着……”",
    getTriggerRange(R, LX, RX) {
        return [[LX - 10, Math.min(RX + 250, oS.W), 0]];
    },
    NormalAttack() {
        let self = this,
        id = self.id,
        dom = $(id);
        dom.childNodes[1].src = self.PicArr[self.AttackGif];
        oSym.addTask(20, _ => {
            const bullet = CustomBullet(oShroomBullet, [self.PicArr[self.BulletGif], self.PicArr[self.SplashGif]], self.AttackedLX + 22, self.pixelTop + 46, self.R, null, null, 20);
            bullet.MaxDistance = 320;
            oAudioManager.playAudio("puff");
        });
        oSym.addTask(50, _ => {
            $(id) && (dom.childNodes[1].src = self.PicArr[self.NormalGif]);
        });
    },
}),
oScaredyShroom = InheritO(CPlants, {
    EName: "oScaredyShroom",
    CName: "胆小菇",
    width: 216,
    height: 164,
    beAttackedPointL: 60,
    beAttackedPointR: 130,
    SunNum: 75,
    isCrying: false,
    isAttacking: false,
    AttackGif: 3,
    CryingGif: 4,
    BulletGif: 5,
    SplashGif: 6,
    Attack: 30,
    AudioArr: ["puff"],
    PicArr: ((url1, url2) => 
        ["images/Card/ScaredyShroom.webp", url1 + "0.webp", url1 + "ScaredyShroom.webp", url1 + "ScaredyShroomAttack.webp", url1 + "ScaredyShroomCry.webp", url2 + "ShroomBullet.png", url2 + "ShroomBulletHit.webp?useDynamicPic=false"]
    )("images/Plants/ScaredyShroom/", "images/Plants/"),
    Tooltip: "远程射手, 但敌人靠近时会蜷缩不动",
    Story: "也许，他是故作胆小，只是为了和阳光菇菇凉挤在一张床上就寝。或者，他是真的胆小，一旦有什么东西向他靠近，他便会四处躲窜。可能，他需要的，只是距离。",
    getTriggerR(selfR) {
        let minR = this.MinR = Math.max(1, selfR - 1);
        let maxR = this.MaxR = Math.min(selfR + 1, oS.R);
        return [minR, maxR];
    },
    TriggerCheck(zombie) {
        let self = this;
        let id = self.id;
        let pic = $(id).childNodes[1];
        let ArZ = self.ArZ;
        if (zombie.PZ && !zombie.isPuppet && Math.abs(zombie.ZX - self.MX) < 121 && zombie.beAttacked) {
            ArZ.add(zombie);
            if (!self.isCrying) {
                self.isCrying = true;
                pic.src = self.PicArr[self.CryingGif];
                self.CryCheck(id, pic, ArZ);
            }
        }
        else if (zombie.R === self.R && !self.isCrying && !self.isAttacking && zombie.Altitude > 0 && zombie.Altitude < 3) {
            self.NormalAttack(self, pic, id);
        }
        if (self.isCrying && !pic.src.includes(self.PicArr[self.CryingGif])) {
            pic.src = self.PicArr[self.CryingGif];
        } else if (!self.isAttacking && !self.isCrying && !pic.src.includes(self.PicArr[self.NormalGif])) {
            pic.src = self.PicArr[self.NormalGif];
        }
    },
    PrivateBirth(self) {
        self.ArZ = new Set();
        self.MX = self.AttackedLX + 9;
    },
    NormalAttack(self, pic, id) {
        self.isAttacking = true;
        pic.src = self.PicArr[self.AttackGif];
        oSym.addTask(8, _ => {
            if ($P[id]) {
                oAudioManager.playAudio("puff");
                CustomBullet(oShroomBullet, [self.PicArr[self.BulletGif], self.PicArr[self.SplashGif]], self.pixelLeft + 114, self.pixelTop + 125, self.R, null, null, self.Attack);
            }
        });
        oSym.addTask(42, _ => {
            if ($P[id]&&pic.src===self.PicArr[self.AttackGif]) {
                pic.src = self.PicArr[self.NormalGif];
            }
        });
        oSym.addTask(140,()=>{
            if($P[id]){
                self.isAttacking = false;
            }
        });
    },
    CryCheck(pid, pic, ArZ) {
        oSym.addTask(140, _ => {
            let self = $P[pid];
            if (!self) return;
            for (let zombie of ArZ) {
                if (!$Z[zombie.id] || !zombie.PZ || Math.abs(zombie.ZX - self.MX) > 120) {
                    ArZ.delete(zombie);
                }
            }
            if (ArZ.size > 0) {
                self.CryCheck(pid, pic, ArZ);
            } else {
                self.isCrying = false;
                pic.src = self.PicArr[self.NormalGif];
            }
        });
    },
}),
oFumeShroom = InheritO(oRadish, {
    EName: "oFumeShroom",
    CName: "大喷菇",
    SunNum: 125,
    coolTime: 7.5,
    width: 216,
    height: 164,
    FlyingPlant:false,
    beAttackedPointL: 60,
    beAttackedPointR: 130,
    Attack:20,
    PicArr: (function() {
        var a = "images/Plants/FumeShroom/";
        return ["images/Card/FumeShroom.webp", a + "0.webp", a + "FumeShroom.webp", a + "FumeShroomAttack.webp", a + "FumeShroomBullet.webp?useDynamicPic=false"]
    })(),
    AudioArr: ["fume"],
    Tooltip: "喷射可以穿过僵尸遮挡物的气液",
    Story: "自从飞旋萝卜学会了穿弹术后，大喷菇就逐渐淡出了战场。他在禅境花园里深修佛法，学习瑜伽，培养花鸟鱼虫，练习琴棋书画......“我的心里从未如此平静，阿弥陀佛~”大喷菇淡淡地说道。这时，植群里突然传来一声“气球菇！”，而后，一块砖头便向植群飞了过去！",
    PrivateBirth: function(b) {
        var a = b.id;
        NewEle(a + "_Bullet", "div", "position:absolute;visibility:hidden;width:406px;height:48px;left:" + b.AttackedRX + "px;top:" + (b.pixelTop + 90) + "px;background:url(images/Plants/FumeShroom/FumeShroomBullet.webp);z-index:" + (b.zIndex + 1), 0, EDPZ)
    },
    NormalAttack: function() {
        oAudioManager.playAudio("fume");
        let self = this, 
        id = self.id,
        ele = $(id).childNodes[1],
        bullet = $(id + "_Bullet"),
        PicArr = self.PicArr,
        NormalGif = PicArr[self.NormalGif],
        // 修复大喷菇会打到身后僵尸/雕像的bug
        zombies = oZ.getArZ((self.AttackedLX + self.AttackedRX) / 2, Math.min(self.AttackedRX + 330, oS.W), self.R,Z=>{
            return (Z.height-(Z.HeadTargetPosition[Z.isAttacking]?.y??0)-Z.DivingDepth)>(50);
        });
        ele.src = PicArr[self.AttackGif];
        SetVisible(bullet);
        oEffects.ImgSpriter({
            ele: bullet,
            data: ["0 0", "0 -96px", "0 -240px", "0 -336px", "0 -432px", "0 -528px", "0 -624px", "0 -720px", "0 -816px", "0 -864px", "0 -912px"],
            frameNum: 11,
            interval: 9,
            callback: SetHidden,
        });
        zombies.forEach(zombie=>zombie.Altitude < 2 && zombie.getHit1(zombie, self.Attack));
        oSym.addTask(345, _=>$P[id] && !ele.src.includes(NormalGif) && (ele.src = NormalGif));
    },
}),
oSporeShroom = InheritO(CPlants, {
    EName: "oSporeShroom",
    CName: "孢子菇",
    width: 216,
    height: 164,
    beAttackedPointL: 60,
    beAttackedPointR: 130,
    SunNum: 100,
    AudioArr: ["puff"],
    coolTime: 15,
    Attack: 20,
    AttackGif: 3,
    BulletGif: 4,
    SplashGif: 5,
    PicArr: ((url1, url2) => 
        ["images/Card/SporeShroom.webp", url1 + "0.webp", url1 + "SporeShroom.webp", url1 + "SporeShroomAttack.webp", url2 + "ShroomBullet.png", url2 + "ShroomBulletHit.webp?useDynamicPic=false", url1 + "Effect.webp"]
    )("images/Plants/SporeShroom/", "images/Plants/"),
    Tooltip: "在身边召唤小喷菇护卫，同时自己也会主动攻击僵尸。",
    Story: "孢子菇十分时尚，他一直走在时尚的前沿。他是植物界将Hip-hop，Rap与重金属三个音乐完美融合在一起的第一植。时尚的作风使孢子菇的植气扶摇直上，以至于他周围经常会包围着一圈忠实的脑残粉。",
    CheckCanGrow(R, C) {
        let data = [];
        for(let f = 0, _$ = oGd.$; f <= PKindUpperLimit; f++) {
            data.push(_$[R + "_" + C + "_" + f]);
        }
        return oPuffShroom.prototype.CanGrow(data, R, C);
    },
    CreatePawns(self) {
        let R1 = Math.max(self.R - 1, 1);
        let C1 = Math.max(self.C - 1, 1);
        let MaxR = Math.min(self.R + 1, oS.R);
        let MaxC = Math.min(self.C + 1, oS.C);
        for (; R1 <= MaxR; R1++) {
            for (let C2 = C1; C2 <= MaxC; C2++) {
                self.CheckCanGrow(R1, C2) && CustomSpecial(oPuffShroom, R1, C2);
            }
        }
    },
    PrivateBirth(obj) {
        const id = obj.id;
        const effect = NewEle(obj.id + "Effect", "div", `position:absolute;z-index:${obj.zIndex + 1};width:631px;height:481px;left:${obj.pixelLeft-200}px;top:${obj.pixelTop-216}px;background:url(${obj.PicArr[6]}) no-repeat;`, 0, EDPZ);
        oSym.addTask(18, _=>$P[id] && obj.CreatePawns(obj));
        oSym.addTask(20, ClearChild, [effect]);
    },
    NormalAttack() {
        let self = this;
        let id = self.id;
        let pic = $(id).childNodes[1];
        pic.src = self.PicArr[self.AttackGif];
        oSym.addTask(17, _ => {
            oAudioManager.playAudio("puff");
            CustomBullet(oShroomBullet, [self.PicArr[self.BulletGif], self.PicArr[self.SplashGif]], self.pixelLeft + 132, self.pixelTop + 110, self.R, null, null, self.Attack);
        });
        oSym.addTask(37.5, _ => {
            $P[id] && (pic.src = self.PicArr[self.NormalGif]);
        });
    },
}),
oBambooUncle = InheritO(CPlants, {
    EName: "oBambooUncle",
    CName: "爆竹爷",
    width: 216,
    height: 164,
    beAttackedPointL: 40,
    beAttackedPointR: 130,
    SunNum: 200,
    coolTime: 15,
    PicArr: ["images/Card/BambooUncle.webp", "images/Plants/BambooUncle/0.gif", "images/Plants/BambooUncle/BambooUncle.gif", "images/Plants/CherryBomb/Boom.png"],
    AudioArr: ["cherrybomb"],
    Tooltip: "一旦僵尸接近，爆竹爷即会自爆！",
    Story: "慈祥的爆竹爷是禅境花园里最年长的一位。他常常给植物们讲起过去的事情：“当年啊，人们要抵御年兽的侵袭；当时啊，也没有豌豆射手之类的植物，人们就种下我……如今可不一样了，我们不再被拿来抵御年兽，而是被用来观赏。人们常常看我们炸裂，然后指着我们说：“看，他炸了。”",
    getTriggerRange: (R, LX, RX) => [[LX, RX, 0]],
    TriggerCheck(zombie) {
        zombie.beAttacked && zombie.Altitude > 0 && (this.canTrigger = 0, this.NormalAttack(this));
    },
    NormalAttack: self => self.Die(),
	Die(ticket) {
        let self = this;
        let id = self.id;
		self.oTrigger && oT.delP(self);
		self.HP = 0;
		delete $P[id];
		delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
		ClearChild($(id));
        IsHttpEnvi && self.RemoveDynamicPic(self);
        if(!['JNG_TICKET_SuperPower', 'JNG_TICKET_ShovelPlant'].includes(ticket)) {
            self.PrivateDie(self);
        }
    },
    PrivateDie(self) {
        let R = self.R,
        floorR = R > 1 ? R - 1 : 1,
        ceilingR = R < oS.R ? R + 1 : oS.R,
        leftBorder = self.pixelLeft - 80,
        rightBorder = self.pixelRight + 80;
        do {
            oZ.getArZ(leftBorder, rightBorder, floorR).forEach(zombie=>zombie.getExplosion());
        } while (floorR++ < ceilingR);
        self.BoomGIF(self.pixelLeft, self.pixelTop);
        oEffects.ScreenShake();
    },
}),
oBambooUncle1 = InheritO(oBambooUncle, {
    EName: "oBambooUncle1",
    CName: "冷却减少-爆竹爷",
    CoolTime: 3,
    Tooltip: "僵尸接近后爆竹爷会启动自爆程序！<br>优化：冷却减少。"
}),
oDoomShroom = InheritO(oCherryBomb, {
    EName: "oDoomShroom",
    CName: "毁灭菇",
    width: 102,
    height: 91,
    beAttackedPointR: 80,
    coolTime: 35,
    SunNum: 250,
    AudioArr: ["doomshroom"],
    PicArr: (function() {
        const a = "images/Plants/DoomShroom/";
        return ["images/Card/DoomShroom.webp", a + "0.gif", a + "DoomShroom.gif", a + "Boom.webp?useDynamicPic=false"]
    })(),
    Tooltip: "可以对僵尸造成大规模打击, 但冷却时间却很长",
    Story: "毁灭菇虽然外表看起来十分凶悍，但是他内心其实是十分温柔的。他喜欢小猫，喜欢看着它们匍匐在自己脚旁喵喵地叫着，这让他感觉无比温馨。至于，他抢了战术黄瓜的饭碗一事，那完全是分子原子层次上的一场意外。",
    PrivateBirth: function(o) {
        oSym.addTask(80, function(id) {
            let obj = $P[id],
            boomImgId = id + "_Boom", 
            boomDivId = boomImgId + 'Div';
            if (obj) {
                oAudioManager.playAudio("doomshroom");
                let R = o.R,
                floorR = R > 3 ? R - 2 : 1,  //如果毁灭菇所在行在第四五行就从第二三行开始搜索，否则直接从第一行开始搜索
                ceilingR = Math.min(oS.R, R + 2);  //搜索至第几行
                let borders = [
                    [-72,72],
                    [-125,125],
                    [-150,150]
                ];
                do {
                    let range = borders[2-Math.abs(floorR-o.R)];
                    oZ.getArZ(obj.pixelLeft+range[0], obj.pixelRight + range[1], floorR).forEach(o=>o.getExplosion());
                } while (floorR ++< ceilingR);
                oEffects.ScreenShake();
                obj.Die('JNG_TICKET_SuperPower');
                oEffects.ImgSpriter({
                    ele: NewEle(boomImgId, "div", `position:absolute;overflow:hidden;z-index:${obj.zIndex + 2};width:283px;height:324px;left:${obj.pixelLeft - 80}px;top:${obj.pixelTop - 220}px;background:url(images/Plants/DoomShroom/Boom.webp) no-repeat;`, 0, EDPZ),
                    styleProperty: 'X',
                    changeValue: -283,
                    frameNum: 10,
                    interval: 10,
                    callback: ele => oEffects.fadeOut(ele, undefined, ClearChild),
                });
                oSym.addTask(20, ClearChild, [
                    NewEle(boomDivId, "div", "position:absolute;z-index:256;width:900px;height:600px;left:115px;top:0;background:#FFF;pointer-events:none;", 0, EDAll)
                ]);
            }
        }, [o.id]);
    }
}),
oDoomShroom1 = InheritO(oDoomShroom, {
    EName: "oDoomShroom1",
    CName: "冷却减少-毁灭菇",
    coolTime: 12,
    Tooltip: "可以对僵尸造成大规模打击, 但冷却时间却很长<br>优化：冷却减少。"
}),
oNutBowling = InheritO(CPlants, {
    EName: "oNutBowling",
    CName: "坚果保龄球",
    width: 65,
    height: 69,
    beAttackedPointR: 45,
    canEat: 0,
    Immediately: true,
    PicArr: ["images/Card/WallNut.webp", "images/Plants/WallNut/0.webp", "images/Plants/WallNut/0.webp"],
    AudioArr: ["bowling", "bowlingimpact", "bowlingimpact2"],
    CanAttack: 1,
    traditionalTypeCollide: false, //传统的碰撞模式，类似pvz1，不能像旅行那样连续撞很多下
    InitTrigger() {},
    getHurt() {},
    radius: 64.5, //坚果平均半径
    PrivateBirth(self) {
        oAudioManager.playAudio("bowling");
        let ele = $(self.id);
        let subEle = ele.childNodes[1];
        let dir = 0; //坚果的上下移动方向，0为不移动，1为向下，-1为向上
        let minY = GetY1Y2(1)[0] + 40; //坚果可以运动到的上边界坐标
        let maxY = GetY1Y2(oS.R)[1]; //坚果可以运动到的下边界坐标
        let updateFrame = $User.LowPerformanceMode ? 10 : 6; //更新图片的时间
        let nowFrame = 0; //当前运行时间
        let nowDistance = 0; //坚果在这段运行时间内走了多少距离
        let currentRad = 0; //当前坚果转了多少角度
        let realHeight = 69;
        let realWidth = 60;
        let drawingFrame = $User.LowPerformanceMode ? 4 : 2; //改变坚果位置的时间间隔
        let _save_drawingFrame = drawingFrame;
        const containers = oZombieLayerManager.$Containers;
        (function fun() {
            let R = self.R;
            let C = self.C;
            if (!$P[self.id]) {
                return;
            }
            let targZombie = oZ.getZ0(self.AttackedRX, R, (Z) => Z.beAttacked && ! Z.isGoingDie && Z.Altitude >= 1 && Z.Altitude <= 2);
            if (self.CanAttack && targZombie && targZombie.getCrushed(self)) {
                oAudioManager.playAudio(["bowlingimpact", "bowlingimpact2"].random());
                switch (targZombie.Ornaments) {
                    case 0: //无防具僵尸
                        if (targZombie.HP < 900) {
                            if (!targZombie.isNotStaticed()) {
                                targZombie.freeStaticEffect(targZombie, "All");
                            }
                            targZombie.NormalDie();
                        } else {
                            targZombie.getHit0(targZombie, 900, 0);
                        }
                        break;
                    case 1: //I类防具僵尸，如路障铁桶橄榄球
                        targZombie.getHit0(targZombie, Math.min(targZombie.OrnHP || targZombie.HP, 900), 0);
                        break;
                    default: //II类防具僵尸，如读报
                        targZombie.CheckOrnHP(targZombie, targZombie.id, targZombie.OrnHP, 400, targZombie.PicArr, 0, 0, 0);
                }
                self.CanAttack = 0;
                //下面计算坚果的上下移动方向
                dir = oNutBowling.changeDir(R, dir);
            } else {
                let flag = false; //用于标记坚果的坐标位置是否发生变化
                //处理保龄球超越上下边界的情况
                switch (dir) {
                    case 1: //向下运动
                        self.pixelBottom + 2 > maxY && (dir = -1);
                        break;
                    case -1: //向上运动
                        self.pixelBottom - 2 < minY && (dir = 1);
                        break;
                }
                if (self.AttackedLX > oS.W) {
                    self.Die();
                } else {
                    self.AttackedLX += 2;
                    self.AttackedRX += 2;
                    let curR = 0,
                        bottomR = 0;
                    if (self.traditionalTypeCollide) {
                        if (dir === 1) {
                            curR = Math.Clamp(GetR((self.pixelTop + dir * 2) + 20), 1, oS.R); //计算坚果处在行, 20是一个魔法数字，代表坚果的实际高度
                            bottomR = GetR(self.pixelBottom += dir * 2);
                        } else {
                            bottomR = curR = GetR(self.pixelBottom += dir * 2); //计算坚果处在行
                        }
                    } else {
                        if (dir === 1) {
                            curR = Math.Clamp(GetR((self.pixelBottom + dir * 2) - 10), 1, oS.R);
                            bottomR = GetR(self.pixelBottom += dir * 2);
                        } else {
                            bottomR = curR = GetR(self.pixelBottom += dir * 2); //计算坚果处在行
                        }
                    }
                    let curC = GetC(self.pixelRight += 2); //计算坚果处在列
                    let deltaTop = dir * 2;
                    self.pixelLeft += 2;
                    self.pixelTop += deltaTop;
                    self.zIndex = 3 * bottomR;
                    self.zIndex_cont += deltaTop;
                    if (drawingFrame-- == 0) {
                        SetStyle(ele, {
                            left: self.pixelLeft + "px",
                            top: self.pixelTop + "px",
                            zIndex: self.zIndex_cont,
                        });
                        drawingFrame = _save_drawingFrame;
                    }
                    if (dir * (curR - R) > 0) {
                        self.R = curR;
                        flag = true;
                        !self.CanAttack && (self.CanAttack = 1);
                        containers[curR].append(ele);
                    }
                    curC !== C && (
                        self.C = curC,
                        flag = true
                    );
                    if (flag) {
                        let id = curR + "_" + curC + "_1";
                        let obj = oGd.$[`${R}_${C}_1`];
                        if (obj === self) { //这个R和C是老的R和C
                            oGd.del({
                                R,
                                C,
                                PKind: 1
                            });
                        }
                        dir = self.HitGdObjectHook(self, dir, R, C, curR, curC);
                        if (!oGd.$[id]) {
                            oGd.add(self, id);
                        }
                    }
                }
            }
            nowDistance += 2; //如果不等于0就是斜着走，距离是根二倍
            //更新图片的旋转角
            if ((nowFrame++) >= updateFrame) {
                currentRad += nowDistance / self.radius * 2;
                EditCompositeStyle({
                    ele: subEle,
                    delFuncs: ["rotate", "translateY"],
                    addFuncs: [
                        ["translateY", `${(Math.Lerp(realHeight,realWidth,(Math.cos(currentRad*2)+1)/2)-realHeight)/2}px`],
                        ["rotate", `${currentRad}rad`],
                    ],
                    option: 2
                });
                nowDistance = nowFrame = 0;
            }
            oSym.addTask(1, fun);
        })();
    },
    // 该接口供关卡中自定义坚果墙撞类植物障碍物（例如罐子）的接口
    // 该接口调用后要求返回坚果撞完后的方向
    HitGdObjectHook(self, dir, R, C, curR, curC) {
        return dir;
    },
    Die(ticket) {
        const list = new Set(['JNG_TICKET_Sculpture']);
        if (!list.has(ticket)) { //只有接收到特定标示才【不会!!!!!】死亡
            CPlants.prototype.Die.call(this);
        }
    },
}, {
    changeDir(R, dir) {
        let dirMap = {
            [oS.R]: -1,
            1: 1
        };
        return dirMap[R] ?? (dir === 1 ? -1 : (dir === -1 ? 1 : (Math.random() > 0.5 ? 1 : -1)));
    },
}),
oNutBowlingPay = InheritO(oNutBowling, {
    EName:"oNutBowlingPay",
    SunNum:50,
    coolTime:5,
}),
oBigWallNutPay = InheritO(oNutBowling, {
    EName:"oBigWallNutPay",
    SunNum:225,
    coolTime:5,
    CName:"巨大坚果保龄球",
    radius:129,
    PicArr: (function() {
        var a = "images/Plants/WallNut/";
        return ["images/Card/BigWallNut.webp", a + "0.webp", a + "0.webp"]
    })(),
    PrivateBirth: function(self) {
        self.height=146;
        let d = $(self.id);
        let subEle = d.childNodes[1];
        subEle.style.transform="translateX(13px)";
        let updateFrame = $User.LowPerformanceMode?10:6;//更新图片的时间
        let nowFrame = 0;//当前运行时间
        let nowDistance = 0;//坚果在这段运行时间内走了多少距离
        let currentRad = 0;//当前坚果转了多少角度
        let realHeight = 138;
        let realWidth = 120;
        let drawingFrame = $User.LowPerformanceMode?4:2;//改变坚果位置的时间间隔
        let _save_drawingFrame = drawingFrame;
        oAudioManager.playAudio("bowling");
        oGd.del({ R: self.R, C: self.C, PKind: 1 });
        (function fun(){
            let z = oZ.getArZ(self.pixelLeft, self.pixelRight, self.R);
            for(let i =z.length-1;i>=0;i--){
                if($Z[z[i].id]){
                    (z[i].HP+z[i].OrnHP)>3000?z[i].getHit0(z[i],3000):z[i].CrushDie(0.15);
                }
            }
            if(z.length>0){
                oEffects.ScreenShake(2);
                oAudioManager.playAudio(["bowlingimpact", "bowlingimpact2"].random());
            }
            self.pixelLeft+=2;
            if(drawingFrame--==0){
                SetStyle(d,{
                    left:(self.pixelLeft)+"px",
                });
                drawingFrame=_save_drawingFrame;
            }
            self.pixelRight+=2;
            if(self.pixelLeft>oS.W){
                self.Die();
                return;
            }
            nowDistance+=2;
            //更新图片的旋转角
            if((nowFrame++)>=updateFrame){
                //console.log(subEle);
                currentRad += nowDistance/self.radius*2;
                EditCompositeStyle({ele:subEle, delFuncs:["rotate","translateY"], addFuncs:[
                    ["translateY",`${(Math.Lerp(realHeight,realWidth,(Math.cos(currentRad*2)+1)/2)-realHeight)/2+10}px`],
                    ["rotate",`${currentRad}rad`],
                ], option:2});
                nowDistance = nowFrame = 0;
            }
            oSym.addTask(1,fun);
        })();
    },
    width: 130,
    height: 73,
    ImgStyle:{
        transform:"scale(2)",
    },
    getShadow: self => `top:50px;`,
    GetDX: self => -Math.floor(self.width * 0.5),
    GetDY: (R, C, arg, birthed) => (birthed?-73:-30)+(arg[0] ? -21 : -15),  //返回植物底座相对格子中点的偏移量，默认可根据是否种在花盆容器中调整
}),
oBigWallNut = InheritO(oBigWallNutPay, {
    EName:"oBigWallNut",
    SunNum:0,
    PicArr: (function() {
        var a = "images/Plants/WallNut/";
        return ["images/Card/BigWallNut.webp", a + "0.webp", a + "0.webp"]
    })(),
}),
oBoomNutBowling = InheritO(oNutBowling, {
    EName: "oBoomNutBowling",
    CName: "爆炸坚果",
    height:72,
    width:82,
    radius:68,
    PicArr: (function() {
        var a = "images/Plants/WallNut/";
        return ["images/Card/BoomNutBowling.webp", a + "1.gif", a + "1.gif", "images/Plants/CherryBomb/Boom.png"]
    })(),
    AudioArr: ["cherrybomb", "bowling"],
    PrivateBirth: function(self) {
        let subEle = $(self.id).childNodes[1];
        let updateFrame = $User.LowPerformanceMode?10:6;//更新图片的时间
        let nowFrame = 0;//当前运行时间
        let nowDistance = 0;//坚果在这段运行时间内走了多少距离
        let currentRad = 0;//当前坚果转了多少角度
        let realHeight = 72;
        let realWidth = 64;
        let drawingFrame = $User.LowPerformanceMode?4:2;//改变坚果位置的时间间隔
        let _save_drawingFrame = drawingFrame;
        oAudioManager.playAudio("bowling");
        (function fun(self, GroundWidth, AttackedLX, AttackedRX, dom) {
            var oldR = self.R,
            oldC = self.C,
            t, curC;
            if ((t = oZ.getZ0(AttackedRX, oldR)) && t.getCrushed(self)) {
                var j = oldR > 2 ? oldR - 1 : 1,
                g = oldR < oS.R ? oldR + 1 : oS.R,
                u = self.pixelLeft - 80,
                r = self.pixelLeft + 160,
                e,
                k,
                i = Math.random();
                oAudioManager.playAudio("cherrybomb");
                do {
                    k = (e = oZ.getArZ(u, r, j)).length;
                    while (k--) {
                        e[k].getExplosion(i);
                    }
                } while ( j ++< g );
                self.Die();
                ClearChild(dom);
                self.BoomGIF(self.pixelLeft, (self.pixelTop - 100));
            } else {
                if(AttackedLX>GroundWidth){
                    self.Die();
                }else{
                    curC = GetC(self.pixelRight += 2);
                    self.AttackedLX = AttackedLX += 2;
                    self.AttackedRX = AttackedRX += 2;
                    self.pixelLeft+=2;
                    if(drawingFrame--==0){
                        SetStyle(dom,{
                            left:(self.pixelLeft)+"px",
                        });
                        drawingFrame=_save_drawingFrame;
                    }
                    if(curC!=oldC){
                        self.C = curC;
                        let id = oldR + "_" + curC + "_1";
                        if(oGd.$[`${oldR}_${oldC}_1`]==self){
                            oGd.del({ R:oldR, C:oldC, PKind: 1 });
                        }
                        if(oGd.$[id]){
                            oGd.$[id].Die("JNG_TICKET_Sculpture");
                        }
                        if(!oGd.$[id]){
                            oGd.add(self, id);
                        }
                    }
                    nowDistance+=2;
                    //更新图片的旋转角
                    if((nowFrame++)>=updateFrame){
                        //console.log(subEle);
                        currentRad += nowDistance/self.radius*2;
                        EditCompositeStyle({ele:subEle, delFuncs:["rotate","translateY"], addFuncs:[
                            ["translateY",`${(Math.Lerp(realHeight,realWidth,(Math.cos(currentRad*2)+1)/2)-realHeight)/2}px`],
                            ["rotate",`${currentRad}rad`],
                        ], option:2});
                        nowDistance = nowFrame = 0;
                    }
                    oSym.addTask(1, fun, [self, GroundWidth, self.AttackedLX, self.AttackedRX, dom]);
                }
            }
        })(self, oS.W, self.AttackedLX, self.AttackedRX, $(self.id))
    }
}),
oBoomNutBowlingPay = InheritO(oBoomNutBowling, {
    EName:"oBoomNutBowlingPay",
    SunNum:150,
    coolTime:5,
    PicArr: (function() {
        var a = "images/Plants/WallNut/";
        return ["images/Card/BoomNutBowling.webp", a + "1.gif", a + "1.gif", "images/Plants/CherryBomb/Boom.png"]
    })(),
}),
//极光冰原植物
oBegonia = InheritO(CPlants, {
    EName: "oBegonia",
    CName: "冰封海棠",
    width: 77,
    height: 88,
    beAttackedPointR: 45,
    SunNum: 25,
    HP: 1000,
    coolTime: 15,
    NormalGif: 1,
    EffectGif: 3,
    PicArr: (function() {
        var a = "images/Plants/Begonia/";
        return ["images/Card/Begonia.webp", a + "0.png", a + "cracked.gif", a + 'Frozen.webp?forbidRemoving=true']
    })(),
    Tooltip: "可以填补冰窟。若种在平地上，将会成为防线上的肉盾。",
    Story: "挨炮一再声明，虽然冰封海棠从科学的角度来说是苹果属，但它与挨炮无半毛钱关系。对此，冰封海棠回《七步诗》一首。",
    getShadow: self => `left:${self.width*0.5-44}px;top:${self.height-28}px;`,
    CanGrow(data, R, C) {
        let flatCoord = `${R}_${C}`;
        let [d0, d1] = data;
        if(d1 && (d1.EName === 'oRifter' || (d1.EName === 'oBegonia' && d1.HurtStatus > 0))) {
            return true;
        }
        if(oGd.$GdType[R][C] === 1 || (oGd.$GdType[R][C]===2) || d0) {
            return !(C < 1 || C > 9 || oGd.$LockingGrid[flatCoord] || d1);
        }
    },
    Birth(X, Y, R, C, plantsArg) {  //植物初始化方法
        let self = this;
        let test = oGd.$[`${R}_${C}_1`];
        if(test && test.EName === "oRifter") {  //判断当前地形是否为冰窟
            self.isRifter = test;
        }
        if(oGd.$GdType[R][C]===2&&!oGd.$[`${R}_${C}_0`]){
            self.isFreezeWater = true;
        }
        let id = "P_" + Math.random(),
        pixelLeft = X + self.GetDX(self),  //默认植物相对于FightingScene左侧的距离=格子中点坐标-0.5*植物图像宽度
        pixelTop = Y + self.GetDY(R, C, plantsArg) - self.height,  //默认植物顶部相对于FS顶部的距离=格子中点坐标+底座偏移-植物身高
        ele = NewEle(null, "div", "position:absolute;");
        self.id = id;
        self.pixelLeft = pixelLeft;
        self.pixelRight = pixelLeft + self.width;
        self.pixelTop = pixelTop;
        self.pixelBottom = pixelTop + self.GetDBottom(self);  //默认植物底部相对距离=pt+植物身高
        self.zIndex = 3 * R;
        self.zIndex_cont = GetMidY(R) + 30;
        self.PicArr = self.PicArr.map(pic => oDynamicPic.checkOriginalURL(pic) ? oDynamicPic.require(pic, null, true) : oURL.removeParam(pic, "useDynamicPic"));
        IsHttpEnvi && ele.addEventListener("DOMNodeRemoved", (event) => {
            if (event.target === ele) {
                setTimeout(self.RemoveDynamicPic.bind(self), 1);
            }
        });
        $P[id] = self;  //在植物池中注册
        NewEle(`${id}_Shadow`, 'div', self.getShadow(self), {className: 'Shadow'}, ele);  //绘制植物影子
        NewImg(0, self.PicArr[self.NormalGif], null, ele);  //绘制植物本体
        self.InitTrigger(self, id,
            self.R = R,
            self.C = C,
            self.AttackedLX = pixelLeft + self.beAttackedPointL,  //植物左检测点
            self.AttackedRX = pixelLeft + self.beAttackedPointR  //植物右检测点
        );
        self.BirthStyle(self, id, ele, {
            left: pixelLeft + "px",
            top: pixelTop + "px",
            zIndex: self.zIndex_cont,
        });
        oGd.add(self, `${R}_${C}_${self.PKind}`);  //在场景注册
        self.PrivateBirth(self);
        return self;
    },
    PrivateBirth(self) {
        if(self && (self.isRifter||self.isFreezeWater)) {  //补洞逻辑
            let effect = NewImg(`${self.id}_Frozen`, self.PicArr[self.EffectGif], `position:absolute;z-index:${self.zIndex + 2};width:198px;height:113px;left:${self.pixelLeft-65}px;top:${self.pixelTop}px;`, EDPZ);
            oSym.addTask(50, ClearChild, [effect]);
            if(self.isRifter){
                self['isRifter']._Die();
            }else if(self.isFreezeWater){
                let directions = [[0,1],[1,0],[-1,0],[0,-1]];
                let visited = [];
                for(let i = 0;i<oS.R+1;i++){
                    visited.push([]);
                }
                let R=self.R,
                    C=self.C;
                (function dfs(){
                    if(R<1||R>oS.R||C<1||C>oS.C||visited[R][C]||oGd.$GdType[R][C]!==2){
                        return;
                    }
                    visited[R][C]=true;
                    let x = GetX(C);
                    oZ.getArZ(x-40,x+40,R,(z)=>{
                        return z.DivingDepth+z.extraDivingDepth>0;
                    }).forEach(z=>{
                        z.getSlow(z,500);
                    });
                    for(let i = 0;i<4;i++){
                        R+=directions[i][0];
                        C+=directions[i][1];
                        dfs();
                        R-=directions[i][0];
                        C-=directions[i][1];
                    }
                })();
            }
            self.Die();
        }
    },
    InitTrigger: ()=>{},
    HurtStatus: 0,
    getHurt: function(e, b, a) {
        let c = this,
             id = c.id,
             d = $(id).childNodes[1];
        c.SetBrightness(c, d, 1);
        oSym.addTask(10, ()=>{
            $P[id] && c.SetBrightness(c, d, 0);
        });
        if(e?.EName==="oZomboni"){
            c.HP=0;
        }
        (c.HP -= a) < 1 ? c.Die() : 
        c.HP < 500 && c.HurtStatus < 1 && (c.HurtStatus = 1, d.src = "images/Plants/Begonia/cracked.gif");
    }
}),
oIceAloe = InheritO(oPeashooter, {
    EName: "oIceAloe",
    CName: "冰冻芦荟",
    width: 160,
    height: 126,
    beAttackedPointR: 80,
    SunNum: 225,
    AttackGif: 5,
    RestGif: 6,
    coolTime: 22.5,
    Attack:160,
    AudioArr: ["CabbageAttack1", "CabbageAttack2"],
    PicArr: (path => ["images/Card/IceAloe.webp", path + "0.webp", path + "IceAloe.webp", path + "Bullet.webp?useDynamicPic=false", path + "BulletHit.webp", path + "Attack.webp", path + 'rest.webp'])("images/Plants/IceAloe/"),
    Tooltip: "对当前行的最后一只僵尸给予高杀伤的冰冻攻击。",
    Story: '外植听到这个名字，总会觉得这是个外表好冷内心歹毒的家伙。但其实，冰冻芦荟是治愈系的，每当植们受伤，无论是身体还是心灵，她总是第一个出现去帮助植物们，一看见她看似高冷却流淌着温柔的脸庞，植物们总会……担心自己钱包里的钱不够付她的医药费。',
    AttackCheck2: zombie=>zombie.Altitude < 3 && zombie.Altitude >= 0,  
    BirthStyle: (self, id, ele, style) => {EditEle(ele.childNodes[1],{},{top:"15px"}); EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R])},
    CheckLoop(zid, direction) {
        let self = this;
        let pid = self.id;
        if($P[pid]) {
            self.NormalAttack(zid);
            oSym.addTask(700, _ => {
                $P[pid] && (
                    $(pid).childNodes[1].src = self.PicArr[self.NormalGif],
                    oSym.addTask(100, _ => self.AttackCheck1(zid, direction))  //此处务必箭头函数，以免this指针丢失
                )
            });
        }
    }, 
    getAngle: (x, y, lastX, lastY) => Math.atan((y-lastY)/(x-lastX)),
    //获取水平距离与水平速度
    //originalPos&targetPos [x,y]坐标
    //vy 竖直方向初速度
    //targetXSpeed 目标坐标的横速度
    get_S_Vx(originalPos,targetPos,vy,gravity,targetXSpeed){
        let [x,y] = originalPos;
        let [zX,zY] = targetPos;
        let t1 = Math.abs(vy/gravity); //上行时间
        let topPosition = y-1/2*gravity*(t1**2);//最高点坐标
        let relativeY = zY - topPosition;//相对最高点坐标僵尸的高度
        let t2 = Math.sqrt(2*Math.abs(relativeY)/gravity);//下落时间
        let speedX = targetXSpeed * (t1+t2)/10;//僵尸走动而影响的距离差
        let s = zX - speedX - x;  //水平位移，即投手到僵尸的距离
        let vx = Math.abs(s/(t1+t2));//水平速度
        return [s,vx];
    },
    NormalAttack(zid) {
        let self = this;
        let ele = $(self.id);
        let zombieTarget = oZ.getRangeRightZ((self.AttackedLX + self.AttackedRX) / 2, GetX(10), self.R, true);
        if(!zombieTarget) return;
        ele.childNodes[1].src = self.PicArr[self.AttackGif];
        oSym.addTask(241, _ => $P[self.id] && (ele.childNodes[1].src = self.PicArr[self.RestGif]));
        oSym.addTask(91,()=>{
            oAudioManager.playAudio(['CabbageAttack1', 'CabbageAttack2'].random());
            CustomBullet(oAloeBullet,null,self.pixelLeft+119,self.pixelTop+25,self.R,null,null,zombieTarget,self.Attack);
        });
    },
}),
oPepper = InheritO(oPeashooter, {
    EName: "oPepper",
    CName: "花椒",
    width: 85,
    height: 117,
    SunNum: 50,
    coolTime: 12.5,
    PKind: 3,
    FlyingPlant: true,
    PicArr: (function() {
        var a = "images/Plants/Pepper/";
        return ["images/Card/Pepper.webp", a + "0.webp", a + "Pepper.webp", a + "Bullet.png", a + "BulletHit.webp?useDynamicPic=false", a + "Attack.webp"]
    })(),
    Tooltip: "能与其他植物种在一起，并向敌人射出子弹。",
    Story: '当被问起为何不想与其他植物共处时，花椒感到十分气愤：“我早已厌烦了当食材的生活。”的确，那些被王公贵族当做香料，甚至精心地抹在墙壁上的美好日子一去不复返了。',
    // 修复水中花椒打不中僵尸的问题
    GetDY: (R, C, arg, birthed) => -15,
    Birth(X, Y, R, C, plantsArg) { //植物初始化方法
        let self = this,
            id = "P_" + Math.random(),
            //默认植物相对于FightingScene左侧的距离=格子中点坐标-0.5*植物图像宽度
            pixelLeft = X + self.GetDX(self), 
            //默认植物顶部相对于FS顶部的距离=格子中点坐标+底座偏移-植物身高
            pixelTop = Y + self.GetDY(R, C, plantsArg) - self.height;
        let ele = self.Ele = NewEle(null, "div", "position:absolute;");
        self.isAttacking = false;
        self.id = id;
        self.pixelLeft = pixelLeft;
        self.pixelRight = pixelLeft + self.width;
        self.pixelTop = pixelTop;
        self.pixelBottom = pixelTop + self.GetDBottom(self); //默认植物底部相对距离=pt+植物身高
        self.zIndex = 3 * R;
        self.zIndex_cont = GetMidY(R) + 30;
        self.PicArr = self.PicArr.map(pic => oDynamicPic.checkOriginalURL(pic) ? oDynamicPic.require(pic, null, true) : oURL.removeParam(pic, "useDynamicPic"));
        IsHttpEnvi && ele.addEventListener("DOMNodeRemoved", (event) => {
            if (event.target === ele) {
                setTimeout(self.RemoveDynamicPic.bind(self), 1);
            }
        });
        $P[id] = self; //在植物池中注册
        NewEle(`${id}_Shadow`, 'div', self.getShadow(self), {
            className: 'Shadow'
        }, ele); //绘制植物影子
        self.EleBody = NewImg(0, self.PicArr[self.NormalGif], null, ele); //绘制植物本体
        self.InitTrigger(self, id,
            self.R = R,
            self.C = C,
            self.AttackedLX = pixelLeft + self.beAttackedPointL, //植物左检测点
            self.AttackedRX = pixelLeft + self.beAttackedPointR //植物右检测点
        );
        self.BirthStyle(self, id, ele, {
            left: pixelLeft + "px",
            top: pixelTop + "px",
            zIndex: self.zIndex_cont,
        });
        oGd.add(self, `${R}_${C}_${self.PKind}`); //在场景注册
        //只有在游戏关卡开始后privatebirth才会执行
        let callback = _ => {
            const PrivateBirth = self.PrivateBirth;
            if ($P[id]) {
                PrivateBirth && PrivateBirth.call(self, self);
                removeEventListenerRecord('jng-event-startgame', callback);
            }
        };
        oS.isStartGame === 1 ? callback() : addEventListenerRecord('jng-event-startgame', callback);
        return self;
    },
    getShadow: self => `left:${self.width*0.5-38}px;top:${self.height-22}px;transform:scale(0.5);`,
    GetDBottom: function() {
        return 82;
    },
    getTriggerRange: (R, LX, RX) => [
        [GetX(-2) - 10, oS.W, 0]
    ],
    NormalAttack(zid) {
        let self = this;
        let direction = 0;
        if (self.isAttacking === true) {
            return;
        }
        // 默认检测的是最右边僵尸，但是我还是需要获取最左边僵尸
        let leftZombie = oZ.getRangeLeftZ(GetX(-2) - 10, oS.W, self.R, false, false); 
        if (!leftZombie) {
            return;
        }
        let rightZombie = oZ.getRangeLeftZ(self.AttackedLX + 20, oS.W, self.R, false, false);
        self.isAttacking = true;
        self.EleBody.src = self.PicArr[self.AttackGif];
        if (leftZombie?.AttackedRX < self.AttackedLX && leftZombie.Altitude != 3) {
            direction = 1;
            EditCompositeStyle({
                ele: self.EleBody,
                delFuncs: ["rotateY"],
                addFuncs: [
                    ["rotateY", "180deg"]
                ],
                option: 2
            });
            SetStyle(self.EleBody, {
                left: "20px"
            });
        } else if (!(rightZombie && rightZombie.Altitude != 3)) {
            return;
        } else {
            EditCompositeStyle({
                ele: self.EleBody,
                delFuncs: ["rotateY"],
                option: 2
            });
            SetStyle(self.EleBody, {
                left: "0"
            });
        }
        oSym.addTask(133, function() {
            self.isAttacking = false;
            oAudioManager.playAudio(['throw', 'throw2'][Math.round(Math.random() * 1)]);
            let bullet = CustomBullet(oPepperBullet, [self.PicArr[self.BulletGif], self.PicArr[4]], self.AttackedLX - direction * 27, self.pixelTop + 49, self.R);
            bullet.Direction = direction;
            if (direction == 1) {
                EditCompositeStyle({
                    ele: bullet.Ele,
                    delFuncs: ["rotateY"],
                    addFuncs: [
                        ["rotateY", "180deg"]
                    ],
                    option: 2
                });
            }
        });
        oSym.addTask(175, () => {
            $P[self.id] && !self.isAttacking &&(self.EleBody.src = self.PicArr[self.NormalGif])
        });
    }
}),
oImitater = InheritO(CPlants, {
    EName: "oImitater",
    CName: "模仿者",
    SunNum: 100,
    width: 66,
    height: 93,
    beAttackedPointL: 5,
    beAttackedPointR: 50,
    coolTime: 20,
    Immediately:true,
    PicArr: (function() {
        let a = "images/Plants/Imitater/";
        return ["images/Card/Imitater.webp", a + "0.png", a + "Imitater.webp"];
    })(),
    AudioArr: ["Imitater"],
    Tooltip: "模仿者可以在原地随机模仿玩家携带卡牌中的一种植物。",
    Story: '模仿者表演魔术已有很多年了，他原先一直尽心尽力，无偿地做着大变活植的工作，直到它被“苟活在0阳光不思进取的‘茄’麻子”之类的话激怒的时候。',
    InitTrigger: function() {},
    BirthStyle(self, e, b, a) {
        let d = b.childNodes[1];
        d.src = this.PicArr[2];
        EditEle(b, {
            id: e,
            'data-jng-constructor': self.EName
        }, a, oZombieLayerManager.$Containers[self.R]);
    },
    Imitat() {
        let arr = oS.StaticCard ? ArCard.map(card => card.PName) : oS.PName;
        if(arr.length < 2) {
            this.toPlant = oApple;
            return;
        }
        this.toPlant = arr.filter(plant => plant.prototype.EName !== 'oImitater').random();
    },
    PrivateBirth: function() {
        let zhizhen = this;
        zhizhen.Imitat();
        oSym.addTask(600, function() {
            if($P[zhizhen.id]) {
                oAudioManager.playAudio("Imitater");
                zhizhen.canEat = 0;
            }
        });
        oSym.addTask(700,
            function() {
                if($P[zhizhen.id]) {
                    zhizhen.Die();
                    let plant;
                    zhizhen.toPlant && (plant = CustomSpecial(zhizhen.toPlant, zhizhen.R, zhizhen.C));
                    if(!$User.LowPerformanceMode){
                        EditCompositeStyle({
                            ele:$(plant.id),
                            styleName:"filter",
                            addFuncs:[["grayscale","100%"]],
                            option:2
                        });
                    }
                }
            }
        );
    },
}),
oMonotropa = InheritO(oPeashooter, {
    EName: "oMonotropa",
    CName: "水晶兰射手",
    SunNum: 100,
    coolTime: 15,
    AttackGif: 3,
    BulletGif: 4,
    width: 91,
    height: 90,
    CanSpawnSun:true,
    PicArr: (function() {
        var a = "images/Plants/Monotropa/";
        return ["images/Card/Monotropa.webp", a + "0.webp", a + "idle.webp", a + "attack.webp", a + 'Bullet.png']
    })(),
    Tooltip: "攻击僵尸的同时可以制造阳光。",
    Story: "为什么水晶兰没有叶绿素，是一个腐生植物，却可以制造阳光呢？唔，你得先问清楚，这个老兄的“马蹄科”背景可不是盖的……作为马蹄科的二把手，他背后的boss可！是！河！马！",
    NormalAttack() {
        let self = this,
        id = self.id,
        dom = $(id);
        dom.childNodes[1].src = self.PicArr[self.AttackGif];
        oSym.addTask(24, _ => {
            oAudioManager.playAudio(['throw', 'throw2'][Math.round(Math.random() * 1)]);
            const bullet = CustomBullet(oMonotropaBullet, [self.PicArr[self.BulletGif]], self.pixelLeft + 71, self.pixelTop + 41, self.R);
            bullet.SunPower = 5;
        });
        oSym.addTask(37, _ => {
            $(id) && (dom.childNodes[1].src = self.PicArr[self.NormalGif]);
        });
    },
}),
oSpikeweed = InheritO(oStoneFlower, {
    EName: "oSpikeweed",
    CName: "地刺",
    width: 85,
    height: 31,
    beAttackedPointL: 10,
    beAttackedPointR: 75,
    SunNum: 100,
    coolTime: 7.5,
    Stature : -1,
	canEat : 0,
    UndergroundPlant:true,
    Attack: 20,
    BloodBarRelativeHeight:50,
    Tooltip: "伤害走在上面的僵尸，并能扎破橡胶轮胎。",
    Story: "地刺小时候想成为一名司机，但他没当成，出于报复心理……说实话，他身旁没有一个植物开车没翻过，甚至还包括戴夫这样的老司机。",
    PicArr: (function() {
        var a = "images/Plants/Spikeweed/";
        return ["images/Card/Spikeweed.webp", a + "0.png", a + "Spikeweed.gif", a + "Attack.gif"]
    })(),
    GetDX: self => -Math.floor(self.width * 0.5) - 10,
    getShadow: self => `left:5px;top:6.5px;`,
    PrivateBirth: function(o) {
        o.ArZ = {};
        let z = oZ.getArZ(o.AttackedLX,o.AttackedRX,o.R,(Z)=>{
            return Z.AKind===2;
        });
        if(z.length>0){
            z[0].flatTire();
            o.Die();
        }
    },
    getHurt: function(d, b, a) {
        let c = this;
        switch (b) {
        case 2:  //汽车类僵尸调用爆胎回调
            d&&d.flatTire();
            c.Die();
            break;
        case 1:
            d&&d.getHit2(d, 20, 0);
            c.Die();
            break;
        default:
            (c.HP -= a) < 1 && c.Die();
        }
    },
}),
oTorchwood = InheritO(CPlants, {
    EName: "oTorchwood",
    CName: "火炬树桩",
    width: 84,
    height: 141,
    beAttackedPointR: 53,
    SunNum: 175,
    PicArr: ["images/Card/Torchwood.webp", "images/Plants/Torchwood/0.webp", "images/Plants/Torchwood/Torchwood.webp", "images/Plants/PB10.webp?useDynamicPic=false", "images/Plants/PeaBulletHit1.webp"],
    AudioArr: ["firepea", "ignite"],
    Tooltip: "火炬树桩可以把穿过他的豌豆变成火球，让豌豆造成两倍伤害。",
    Story: '火炬树桩致力于遗传图谱研究，他凭借谨慎的思考，严谨的研究，不到小学学历的文化水平和一肚子火，成功地研究出……将寒冰射手与火焰豌豆射手这两个虐死人的情侣拆开的最佳理由。',
    PrivateBirth() {
        let {R, C, id} = this;
        oGd.$Torch[R + "_" + C] = id;
        oS.HaveFog && oFog.update(R, C, 0, 0, 0);
    },
    InitTrigger() {},
    PrivateDie() {
        let {R, C} = this;
        delete oGd.$Torch[R + "_" + C];
        oS.HaveFog && oFog.update(R, C, 0, 0, 1);
    },
}),
oKiwibeastStrong = InheritO(CPlants, {
    EName: "oKiwibeastStrong",
    CName: "猕猴桃",
    width: 140,
    height: 196,
    beAttackedPointL: 30,
    beAttackedPointR: 80,
    SunNum: 175,
    HP: 2000,
    canEat: 1,
    coolTime: 30,
    restTime: 110,
    Attack: 40,
    HurtStatus: 0,
    AlmanacGif: 6,
    //猕猴桃第一阶段
    Idle0Gif: 2,
    Attack0Gif: 3,
    //猕猴桃第二阶段
    Grow1Gif: 8,
    Idle1Gif: 4,
    Attack1Gif: 5,
    //猕猴桃第三阶段
    Grow2Gif: 9,
    Idle2Gif: 6,
    Attack2Gif: 7,
    Tooltip: "原地跳起砸向地面，对范围内僵尸造成伤害，会随血量的不断减少而成长。",
    Story: "她的单曲《不想长大》一度火遍大江南北。但尽管她出了这样火爆的神曲，她也无法避免自己没有男朋友的事实。她最后悔的事：没有在自己还很青涩（或者说长的还很萌）的时候找个男朋友。",
    AudioArr: ['KiwibeastAttack', 'KiwibeastGrow1', 'KiwibeastGrow2'],
    PicArr: (function() {
        let a = "images/Plants/Kiwibeast/";
        return ["images/Card/Kiwibeast.webp", a + "0.webp", a + "Kiwibeast_0.webp", a + "Kiwibeast_0_attack.webp", a + "Kiwibeast_1.webp", a + "Kiwibeast_1_attack.webp", a + "Kiwibeast_2.webp", a + "Kiwibeast_2_attack.webp", a + 'Kiwibeast_growup_1.webp', a + 'Kiwibeast_growup_2.webp'];
    })(),
    BirthStyle: (self, id, ele, style) => {EditEle(ele.childNodes[1],{},{top:"10px"}); EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R])},
    PrivateBirth(o) {
        o.MinR = o.MaxR = o.R;
    },
    getHurt(objZ, AKind, point) {
        let t = this;
        if(AKind%3) {  //致命性攻击
            t.Die();
        } else {
            let _HP = (t.HP -= point);
            switch(true) {
                case _HP < 1650 && t.HurtStatus < 1:
                    t.UpDate();
                    t.Attack = 50;
                    t.restTime = 200;
                    t.AttackEffect = (left, top) => oEffects.ImgSpriter({
                        ele: NewEle(t.id+'_Effect', "div", `position:absolute;overflow:hidden;z-index:${this.zIndex + 2};height:65px;width:106px;left:${left+6}px;top:${top+146}px;background:url(images/Plants/Kiwibeast/Effect1.png) no-repeat;`, 0, EDPZ),
                        styleProperty: 'X',
                        changeValue: -106,
                        frameNum: 3,
                        interval: 9,
                    });
                break;
                case _HP < 1000 && t.HurtStatus < 2:
                    t.UpDate();
                    t.Attack = 70;
                    t.restTime = 240;
                    t.AttackEffect = (left, top) => oEffects.ImgSpriter({
                        ele: NewEle(t.id+'_Effect', "div", `position:absolute;overflow:hidden;z-index:${this.zIndex + 2};height:86px;width:183px;left:${left-22}px;top:${top+136}px;background:url(images/Plants/Kiwibeast/Effect2.png) no-repeat;`, 0, EDPZ),
                        styleProperty: 'X',
                        changeValue: -183,
                        frameNum: 4,
                        interval: 9,
                    });
                break;
                case _HP < 0:
                    t.Die();
                break;
            }
        }
    },
    UpDate() {
        let self = this, id = self.id, HurtStatus = ++self.HurtStatus, ele = $(id).childNodes[1];
        oAudioManager.playAudio(`KiwibeastGrow${HurtStatus}`);
        self.isAttacking = 0;
        ele.src = self.PicArr[self[`Grow${HurtStatus}Gif`]];
        //更新触发器
        Object.assign(self, self.GrowUpFun[HurtStatus]);
        self.oTrigger && oT.delP(self);
        self.InitTrigger(self, id, self.R, self.C, self.AttackedLX, self.AttackedRX);
        //切图，重新触发攻击判定
        oSym.addTask(100, _=>$P[id] && (ele.src = self.PicArr[self[`Idle${HurtStatus}Gif`]], self.cAttackCheck()));
    },
    GrowUpFun: [
        //第二阶段
        {
            getTriggerRange() {
                let X = GetX(this.C),
                MinX = this.MinX = X - 120,
                MaxX = this.MaxX = X + 120;
                return [[MinX, MaxX, 0]];
            },
            getTriggerR(R) {
                let MinR = this.MinR = R > 1 ? R - 1 : 1,
                MaxR = this.MaxR = R < oS.R ? R + 1 : oS.R;
                return [MinR, MaxR];
            },
        },
        //第三阶段
        {
            getTriggerRange() {
                let X = GetX(this.C),
                MinX = this.MinX = X - 200,
                MaxX = this.MaxX = X + 200;
                return [[MinX, MaxX, 0]];
            },
            getTriggerR(R) {
                let MinR = this.MinR = R > 2 ? R - 2 : 1,
                MaxR = this.MaxR = R < oS.R - 1 ? R + 2 : oS.R;
                return [MinR, MaxR];
            },
        },
    ],
    /* 幼年触发器 */
    getTriggerRange() {  //返回在本行的触发器范围
        let X = GetX(this.C),
        MinX = this.MinX = X - 20,
        MaxX = this.MaxX = X + 20;
        return [[MinX, MaxX, 0]];
    },
    getTriggerR: R=>[R, R],  //传递行返回触发器行上下限,返回格式是[下限，上限]
    NormalAttack() {
        let o = this, MaxR = o.MaxR, MinX = o.MinX, MaxX = o.MaxX,
        id = o.id, Attack = o.Attack, ele = $(id).childNodes[1],
        canBounce = Math.random() > 0.92 && o.HurtStatus === 2;
        oSym.addTask(130, _=>{
            if($P[id]) {
                oAudioManager.playAudio(`KiwibeastAttack`);
                o.AttackEffect(o.pixelLeft, o.pixelTop);
                for (let _R = o.MinR; _R <= MaxR; _R++) {  //遍历所有有效行,查询所有进入触发范围的僵尸并攻击
                    oZ.getArZ(MinX, MaxX, _R).forEach(zombie=>
                        zombie.Altitude < 2 && (zombie.getHit1(zombie, Attack), canBounce && !zombie.isPuppet && zombie.Bounce())
                    );
                }
                canBounce && oEffects.ScreenShake(4);
            }
        });
        o.isAttacking = 2;
        ele.src = o.PicArr[o[`Attack${o.HurtStatus}Gif`]];
        oSym.addTask(o.restTime, _=>
            $P[id] && o.isAttacking && (ele.src = o.PicArr[o[`Idle${o.HurtStatus}Gif`]], o.isAttacking = 0, o.cAttackCheck())
        );
    },
    AttackEffect(left, top) {
        oEffects.ImgSpriter({
            ele: NewEle(this.id+'_Effect', "div", `position:absolute;overflow:hidden;z-index:${this.zIndex + 2};height:64px;width:118px;left:${left+8}px;top:${top+146}px;background:url(images/Plants/Kiwibeast/Effect0.png) no-repeat;`, 0, EDPZ),
            styleProperty: 'X',
            changeValue: -118,
            frameNum: 5,
            interval: 9,
        });
    },
    CheckLoop(zid) {
        const self = this, id=self.id;
        self.cAttackCheck = _=>$P[id] && self.AttackCheck1(zid);
        $P[id] && self.NormalAttack();
    }, 
}),
oKiwibeast = InheritO(oKiwibeastStrong,{
    EName:"oKiwibeast",
    HP:1600,
    UpDate() {
        let self = this, id = self.id, HurtStatus = ++self.HurtStatus, ele = $(id).childNodes[1];
        oAudioManager.playAudio(`KiwibeastGrow${HurtStatus}`);
        self.isAttacking = 0;
        ele.src = self.PicArr[self[`Grow${HurtStatus}Gif`]];
        //更新触发器
        Object.assign(self, self.GrowUpFun[HurtStatus-1]);
        self.oTrigger && oT.delP(self);
        self.InitTrigger(self, id, self.R, self.C, self.AttackedLX, self.AttackedRX);
        //切图，重新触发攻击判定
        oSym.addTask(100, _=>$P[id] && (ele.src = self.PicArr[self[`Idle${HurtStatus}Gif`]], self.cAttackCheck()));
    },
    getHurt(objZ, AKind, point) {
        let t = this;
        if(AKind%3) {  //致命性攻击
            t.Die();
        } else {
            let _HP = (t.HP -= point);
            switch(true) {
                case _HP < 1350 && t.HurtStatus < 1:
                    t.UpDate();
                    t.Attack = 50;
                    t.restTime = 200;
                    t.AttackEffect = (left, top) => oEffects.ImgSpriter({
                        ele: NewEle(t.id+'_Effect', "div", `position:absolute;overflow:hidden;z-index:${this.zIndex + 2};height:65px;width:106px;left:${left+6}px;top:${top+146}px;background:url(images/Plants/Kiwibeast/Effect1.png) no-repeat;`, 0, EDPZ),
                        styleProperty: 'X',
                        changeValue: -106,
                        frameNum: 3,
                        interval: 9,
                    });
                break;
                case _HP < 700 && t.HurtStatus < 2:
                    t.UpDate();
                    t.Attack = 70;
                    t.restTime = 240;
                    t.AttackEffect = (left, top) => oEffects.ImgSpriter({
                        ele: NewEle(t.id+'_Effect', "div", `position:absolute;overflow:hidden;z-index:${this.zIndex + 2};height:86px;width:183px;left:${left-22}px;top:${top+136}px;background:url(images/Plants/Kiwibeast/Effect2.png) no-repeat;`, 0, EDPZ),
                        styleProperty: 'X',
                        changeValue: -183,
                        frameNum: 4,
                        interval: 9,
                    });
                break;
                case _HP < 0:
                    t.Die();
                break;
            }
        }
    },
    GrowUpFun: [
        //第二阶段
        {
            getTriggerRange() {
                let X = GetX(this.C),
                MinX = this.MinX = X - 100,
                MaxX = this.MaxX = X + 100;
                return [[MinX, MaxX, 0]];
            },
            getTriggerR(R) {
                let MinR = this.MinR = R > 1 ? R - 1 : 1,
                MaxR = this.MaxR = R < oS.R ? R + 1 : oS.R;
                return [MinR, MaxR];
            },
        },
        //第三阶段
        {
            getTriggerRange() {
                let X = GetX(this.C),
                MinX = this.MinX = X - 160,
                MaxX = this.MaxX = X + 160;
                return [[MinX, MaxX, 0]];
            },
            getTriggerR(R) {
                let MinR = this.MinR = R > 2 ? R - 2 : 1,
                MaxR = this.MaxR = R < oS.R - 1 ? R + 2 : oS.R;
                return [MinR, MaxR];
            },
        },
    ],
}),
//浓雾弃都
oCabbage = InheritO(oPeashooter, {
    EName: "oCabbage",
    CName: "卷心菜投手",
    width: 115,
    height: 103,
    beAttackedPointL: 35,
    beAttackedPointR: 90,
    SunNum: 100,
    AttackGif: 5,
    Attack:40,
    AudioArr: ["CabbageAttack1", "CabbageAttack2"],
    PicArr: (function() {
        var a = "images/Plants/Cabbage/";
        return ["images/Card/Cabbage.webp", a + "0.webp", a + "Cabbage.webp", a + "Bullet.png", a + "BulletHit.webp", a + "CabbageAttack.webp"]
    })(),
    Tooltip: "向敌人抛出卷心菜",
    getShadow: self => `left:18px;top:75px;`,
    Story: '尽管他已经通过在屋顶打僵尸賺得了第一桶金，但他眼界高远。“我想去屋顶以外的世界，想去打更多地方的僵尸。”当然，尽管见识增加，和不知道僵尸是怎么爬上房顶一样 ，他也不明白怎么会有人给僵尸做雕塑。',
    getAngle(x,y,lastX,lastY){
        return 180/Math.PI*Math.atan2((y-lastY),(x-lastX));
    },
    AttackCheck2: zombie=>zombie.Altitude < 3 && zombie.Altitude >= 0,  
    CheckLoop(zid, direction) {
        let self = this;
        let pid = self.id;
        if($P[pid]) {
            self.NormalAttack(zid);
            oSym.addTask(290+Math.random()*10-5, _ => {$P[pid]&&self.AttackCheck1(zid, direction)});
        }
    }, 
    HitZombie(zombieTarget,self){
        zombieTarget.getPea(zombieTarget,0);//为了放出声音，所以假装攻击下
        zombieTarget.getHit2(zombieTarget, self.Attack);
    },
    AttackAnim(ele,self){
        ele.childNodes[1].src = self.PicArr[self.AttackGif];
    },
    get_S_Vx:oIceAloe.prototype.get_S_Vx,
    NormalAttack(zid) {
        let self = this;
        let ele = $(self.id);
        let zombieTarget = oZ.getRangeLeftZ(self.pixelLeft + self.beAttackedPointR, oS.W, self.R, true, true);
        if(!zombieTarget) return;
        self.AttackAnim(ele,self);
        oSym.addTask(42, _ => {
            oAudioManager.playAudio(self.AudioArr.slice(0,2).random());
            CustomBullet(oCabbageBullet,null,self.pixelLeft+30,self.pixelTop+10,self.R,null,null,zombieTarget,self.Attack);
        });
        oSym.addTask(100, _ => $P[self.id] && (ele.childNodes[1].src = self.PicArr[self.NormalGif]));
    },
}),
oKernelPult = InheritO(oCabbage,{
    EName:"oKernelPult",
    CName:"玉米投手",
    Attack:20,
    ButterAttack:40,
    AttackGif:3,
    width: 170,
    height: 131,
    SunNum:100,
    ButterChance:0.25,
    beAttackedPointR: 80,
    beAttackedPointL: 50,
    Tooltip:"向敌人投掷玉米粒和黄油",
    Story:"“我原本是投手家族里的老大，却因为记错了所有植物的生日而失去了植心，最终众叛亲离，甚至险些被植买凶刺杀。好在有儿子保护，他也帮我刺杀了两名幕后主谋。但他也不得不为了避风头离开了美国，回到了老家蘑西哥去避避风头。而我……也隐姓埋名，成了一名电影院的引座员。”玉米投手慢条斯理地对旁植说着，就在这时，他儿子在蘑西哥相恋成婚的妻子被人在车里炸成了爆米花。",
    getShadow: self => `left:${self.width*0.5-48}px;top:${self.height-22}px;`,
    PicArr: (function() {
        var a = "images/Plants/KernelPult/";
        return ["images/Card/KernelPult.webp", a + "kernelpult.webp", a + "idle.webp", a + "attack1.webp", a + "attack2.webp", a + "corn.webp?useDynamicPic=false", a + "butter.webp?useDynamicPic=false", a + "corn_hit.webp", a + "butter_hit.webp"]
    })(),
    CheckLoop(zid, direction) {
        let self = this;
        let pid = self.id;
        if($P[pid]) {
            self.NormalAttack(zid);
            oSym.addTask(290+Math.random()*20-10, _ => {$P[pid]&&self.AttackCheck1(zid, direction)});
        }
    }, 
    PrivateBirth(a) {
        a.ButterChance+=Math.random()*0.4-0.1;
    },
    HitZombie(zombieTarget,self,isButter){
        if(zombieTarget.Altitude!=1){
            return;
        }
        if(isButter){
            oAudioManager.playAudio("butter");
            zombieTarget.getButter();
            zombieTarget.getHit2(zombieTarget,self.ButterAttack);
        }else{
            oAudioManager.playAudio(`kernelpult${Math.floor(Math.random()*2+1)}`);
            zombieTarget.getHit2(zombieTarget,self.Attack);
        }
    },
    AttackAnim(ele,self,isButter){
        ele.childNodes[1].src = self.PicArr[self.AttackGif+isButter];
    },
    NormalAttack(zid) {
        let self = this;
        let ele = $(self.id);
        let isButter = Math.random()<self.ButterChance?1:0;
        let zombieTarget = oZ.getRangeLeftZ(self.pixelLeft + self.beAttackedPointR, oS.W, self.R, true);
        if(!zombieTarget) return;
        //let bullet = EditEle(isButter?self.ButterEle.cloneNode():self.BulletEle.cloneNode(), {id: "KB" + Math.random()}, 0, EDPZ);
        if(self.ButterChance>self.__proto__.ButterChance){
            self.ButterChance=Math.max(self.ButterChance-Math.random()*0.02,self.__proto__.ButterChance);
        }else if(self.ButterChance<self.__proto__.ButterChance){
            self.ButterChance=Math.min(self.ButterChance+Math.random()*0.02,self.__proto__.ButterChance);
        }
        self.AttackAnim(ele,self,isButter);
        oSym.addTask(180, _ => $P[self.id] && (ele.childNodes[1].src = self.PicArr[self.NormalGif]));
        oSym.addTask(55, _ => {
            oAudioManager.playAudio(self.AudioArr.slice(0,2).random());
            CustomBullet(isButter?oButterBullet:oKernelBullet,null,self.pixelLeft+50,self.pixelTop+10,self.R,null,null,zombieTarget);
        });
    },
}),
oPlantern = InheritO(CPlants, {
    EName: "oPlantern",
    CName: "路灯花",
    width: 110,
    height: 115,
    beAttackedPointL: 14,
    beAttackedPointR: 60,
    SunNum: 25,
    PicArr: ["images/Card/Plantern.webp", "images/Plants/Plantern/0.webp", "images/Plants/Plantern/idle.webp"],
    AudioArr: ['plantern'],
    Tooltip: "照亮一片区域, 让玩家可以看穿战场迷雾",
    Story: '路灯花一向蔑视科学，但在遇见投身于科学事业的火炬树桩之后，他的观念发生了变化。路灯花在第一届植物科学技术大赛中坦言，“他就如同正道的光，照在了大地上，祛除了那些诸如巫术魔法啊黑暗原力之类的疯狂想法。”路灯花在第一届植物科学技术大赛中如此坦言，说完，他便开始展示自己最新的科研成果：由双份岩化夸克，一份铯与水制成的浓缩暗物质燃料。',
    InitTrigger() {},
    BirthStyle(self, id, ele, style) {
        ele.childNodes[1].style.cssText += `left:-8px;top:6px;`;
        EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R]);
    },
    PrivateBirth() {
        oAudioManager.playAudio('plantern');
        let {R, C, id} = this;
        oGd.$Plantern[R + "_" + C] = id;
        oS.HaveFog && oFog.update(R, C, 1, 1, 0);
        for(let i = -1;i<2;i++){
            for(let j = -1;j<2;j++){
                if(oGd.$[`${R+i}_${C+j}_1`]&&oGd.$[`${R+i}_${C+j}_1`].XRay){
                    oGd.$[`${R+i}_${C+j}_1`].Update();
                }
            }
        }
    },
    PrivateDie(c) {
        let {R, C} = this;
        delete oGd.$Plantern[R + "_" + C];
        oS.HaveFog && oFog.update(R, C, 1, 1, 1);
        for(let i = -1;i<2;i++){
            for(let j = -1;j<2;j++){
                if(oGd.$[`${R+i}_${C+j}_1`]&&oGd.$[`${R+i}_${C+j}_1`].XRay){
                    oGd.$[`${R+i}_${C+j}_1`].Update();
                }
            }
        }
    },
}),
oBlover = InheritO(oCherryBomb, {
    EName: "oBlover",
    CName: "三叶草",
    SunNum: 50,
    coolTime: 5,
    width: 149,
    height: 109,
    Immediately:true,
    beAttackedPointL: 20,
    beAttackedPointR: 80,
    PicArr: ["images/Card/Blover.webp", "images/Plants/Blover/0.webp", "images/Plants/Blover/Blover.webp"],
    AudioArr: ["Blover"],
    Tooltip: "三叶草能吹退雾霾和身处空中的僵尸。",
    Story: '其他植物总是觉得三叶草十分高“冷”，认为他是一个自带风的植物，很不好接近。但实际上，三叶草十分希望融入其他植物，他总是默默地为其他植物吹起阵阵凉风，不管春夏秋冬——这也就是他一直没什么朋友的原因。',
    PrivateBirth(self) {
        const id = self.id;
        //播放音效
        oSym.addTask(74, _ => $P[id] && oAudioManager.playAudio('Blover'));
        //动画播放一半的时候吹去雾霾和僵尸
        oSym.addTask(120, _ => {  
            if($P[id]) {
                self.isBlowing = true;
                self.canEat = false;
                oS.HaveFog && !oFog.hasLeftStage && oFog.moveRight();
                self.KillFloatingZombie(self);
            }
        });
        //动画结束，死亡
        oSym.addTask(173, _ => $P[id] && self.Die('JNG_TICKET_SuperPower'));
    },
    KillFloatingZombie(self) {  //战术风扇
        for(let zombie of $Z) zombie.isFloating && zombie.FloatingDie(zombie);
        self.isBlowing && $P[self.id] && oSym.addTask(25, self.KillFloatingZombie, [self]);
    },
    Die(ticket) {
        if(!['JNG_TICKET_SuperPower', 'JNG_TICKET_ShovelPlant'].includes(ticket)) {
            return;
        }
        let self = this, id = self.id, shadow = self.id + "_Shadow";
        self.HP = 0;
        delete $P[id];
        delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
        oEffects.fadeOut($(id), 'fast', (d)=>{ClearChild(d);IsHttpEnvi && self.RemoveDynamicPic(self);});
        oEffects.fadeOut($(shadow), 'fast', ClearChild);
    },
}),
oShiitake = InheritO(oPeashooter, {
    EName: "oShiitake",
    CName: "载弹花菇",
    SunNum: 250,
    coolTime: 15,
    width: 130,
    height: 106,
    beAttackedPointL: 50,
    beAttackedPointR: 81,
    AttackGif: 3,
    BulletGif: 4,
    BulletHitGif: 5,
    PicArr: (path => ["images/Card/Shiitake.webp", path + "0.webp", path + "idle.webp", path + "attack.webp", path + "bullet.webp?useDynamicPic=false", path + "bulletHit.webp"])("images/Plants/Shiitake/"),
    AudioArr: ['shiitake', 'shiitakeHit'],
    Tooltip: '发生冲击弹对僵尸造成巨大伤害，并将僵尸击退一定距离。',
    Story: '是什么造就了载弹花菇精致的裂纹？没人能知道，除了他自己，当他尝试喷出一颗子弹的时候，那种强而有力的声音、那种皮开肉绽的感觉……是的，除了他自己，谁都不会知道。',
    CheckLoop(zid, direction) {  //开始攻击，并且循环检查攻击条件1,2
        let self = this;
        let pid = self.id;
        if($P[pid]) {
            self.NormalAttack(zid);  //触发植物攻击，并传入触发者僵尸之id
            oSym.addTask(580, _=>$P[pid] && self.AttackCheck1(zid, direction));            
        }
    }, 
    NormalAttack() {
        const self = this;
        const id = self.id;
        const ele = $(id);
         //生产一个子弹img对象
        ele.childNodes[1].src = self.PicArr[self.AttackGif];  //切换攻击动画
        oSym.addTask(40, () => {
            if(!$P[id]) return;
            oAudioManager.playAudio('shiitake');
            CustomBullet(oShiitakeBullet, [self.PicArr[self.BulletGif]],self.pixelLeft, self.pixelTop, self.R);
        });
        oSym.addTask(100, () => $P[id] && (ele.childNodes[1].src = self.PicArr[self.NormalGif]));
    },
}),
oElecTurnip = InheritO(oSpikeweed, {
    EName: "oElecTurnip",
    CName: "电磁芜菁",
    width: 118,
    height: 155,
    beAttackedPointL: 10,
    beAttackedPointR: 75,
    coolTime: 10,
    Stature: -3,
    canEat: 0,
    PKind:5,
    UndergroundPlant: true,
    Attack: 40,
    isPlant: false,
    HP: Infinity,
    SunNum: 125,
    SpawnGif: 3,
    BlockGif: 4,
    AttackGif: 5,
    EleBody: null,
    AttackTime: 0,
    BlockPicDom: null,
    Tooltip: "在地面上生成不会被碾压的电磁地砖",
    Story: "电磁芜菁原本只是因推广免费供电而被开除的一个默默无闻的下岗电工，因为生活贫困只能挖个坑睡在地里。他原以为自己永远没有出头之日，直到一部叫《战狼二》的电影莫名其妙把他带火。",
    AudioArr: ["turnip1", "turnip2", "turnip3", "turniptile1", "turniptile2", "electurnip"],
    PicArr: (function() {
        var a = "images/Plants/ElecTurnip/";
        return ["images/Card/ElecTurnip.webp", a + "0.png", a + "idle.webp", a + "Spawn.webp", a + "block.png", a + "Attack.webp"]
    })(),
    getShadow: self => `display:none;`,
    getHurt: function(d, b, a) {},
    CanGrow(data, R, C) {
        let flatCoord = `${R}_${C}`;
        let self = this;
        // 当前格被锁定,且不是雕像、冰块等可以被攻击的障碍物，则一票否决
        if (
            oGd.$LockingGrid[flatCoord]
            && !oGd.$Crystal[flatCoord]
            && !oGd.$Sculpture[flatCoord]
            && !oGd.$IceBlock[flatCoord]
        ) {
            return false;
        }
        // 假定植物直接种植的情形
        if (
            (
                oGd.$GdType[R][C] === 1  // 要确保植物种在可种植的草坪
                || self.FlyingPlant  // 飞行植物忽略地形
                || (oGd.$GdType[R][C] === 2 && oGd.$WaterDepth[R][C] === 0)
            )
            && oGd.$GdType[R][C] !== 0  // 荒地强制禁止种植植物
        ) {
            return (
                !(
                    C < 1 || C > 9  // 要确保植物种在可种植列以内
                    || data[self.PKind]  // 要确保当前格没有相同种类植物
                ) && (!data[1] || data[1].isPlant)  // 要确保当前格没有「植物假扮的」障碍物
            );
        } 
        // 假定植物种在容器中的情形
        else { 
            return (
                !(
                    // 如果是地底植物则种不了水路
                    self.UndergroundPlant && oGd.$GdType[R][C] === 2  
                ) && data[0] && !data[self.PKind]  // 容器必须存在，且容器为空            
            )
        }
    },
    PrivateBirth: function(self, dd = $(self.id)) {
        self.ArZ = {};
        dd.style.zIndex = 3 * self.R + 2;
        let R = self.R,
            C = self.C;
        self.EleBody = dd.childNodes[1];
        oSym.addTask(150, _ => {
            oAudioManager.playAudio("turnip" + [1, 2, 3].random());
            self.EleBody.src = self.PicArr[self.SpawnGif];
            oSym.addTask(190, _ => {
                oAudioManager.playAudio("turniptile" + [1, 2].random());
                self.BlockPicDom = NewImg("", self.PicArr[self.BlockGif], `position:absolute;left:${self.pixelLeft+15}px;top:${self.pixelTop+80}px;z-index:0;`, EDPZ);
                oEffects.Animate(self.BlockPicDom, 'TurnipBlink', 5, null, null, null, 'infinite');
            });
            oSym.addTask(213, _ => {
                EditCompositeStyle({
                    ele: self.EleBody,
                    delFuncs: ["translate"],
                    addFuncs: [
                        ["translate", "20.5px,62px"]
                    ],
                    option: 2
                });
                SetStyle(self.EleBody, {
                    display: "none"
                });
                self.CanAttack = true;
            });
        });
    },
    SetBrightness: _ => {},
    AttackCheck2: function(a) { //触发特殊条件检查器
        return a.beAttacked;
    },
    TriggerCheck: function(zombie, h) {
        let self = this;
        var id = zombie.id,
            ZLX, ZRX, PLX, PRX;
        if (!self.CanAttack) {
            return;
        }
        if (zombie.PZ) {
            ZLX = zombie.AttackedLX;
            ZRX = zombie.AttackedRX;
            PLX = self.AttackedLX;
            PRX = self.AttackedRX;
            if ((ZLX <= PRX && ZLX >= PLX || ZRX <= PRX && ZRX >= PLX || ZLX <= PLX && ZRX >= PRX) && self.AttackCheck2(zombie)) {
                if (self.AttackTime <= oSym.Now) {
                    self.NormalAttack(id);
                }
            }
        }
    },
    NormalAttack: function(zid) {
        let zombie = $Z[zid],
            self = this,
            pid = self.id,
            allPlantsThisCell=[];
        for(let i = 0;i<=PKindUpperLimit;i++){
            if(i!=self.PKind && oGd.$[`${self.R}_${self.C}_${i}`]){
                allPlantsThisCell.push(oGd.$[`${self.R}_${self.C}_${i}`]);
            }
        }
        if (!self.CanAttack || !zombie || !self.CanGrow(allPlantsThisCell,self.R,self.C)) {
            return;
        }
        self.AttackTime = oSym.Now + 290;

        function stopAttack() {
            return (SetStyle(self.EleBody, {
                display: "none"
            }), SetStyle(self.BlockPicDom, {
                animationName: "TurnipBlink"
            }), self.EleBody.src = self.PicArr[self.NormalGif]);
        }
        if (!isNullish(oGd.$Crater[self.R + '_' + self.C])) {
            stopAttack();
            return;
        }
        oAudioManager.playAudio("electurnip");
        let G = oGd.$;
        let att = 0;
        let tmp = self.EName;
        self.EName = ""; //不让它检测到自己
        for (let R = 1; R < oS.R; R++) {
            for (let C = 1; C < oS.C; C++) {
                if (G[`${R}_${C}_${self.PKind}`]?.EName == "oElecTurnip") {
                    att += 45;
                }
            }
        }
        self.EName = tmp; //不让它检测到自己
        att = Math.floor(Math.pow(att, 0.7));
        let totalAttack = 0;
        let AllZombies = oZ.getArZ(self.pixelLeft - 80, self.pixelLeft + 80, self.R);
        for (let z of AllZombies) {
            let attack = 33;
            if (z.isPuppet) {
                attack = 45;
            }
            attack += att;
            attack = Math.min(attack, 165);
            totalAttack += attack;
            z.getHit2(z, attack, 0);
        }
        SetStyle(self.BlockPicDom, {
            animationName: ""
        });
        self.EleBody.src = self.PicArr[self.AttackGif];
        let sc = ((totalAttack / Math.max(1, AllZombies.length)) / 33 - 1) * 2 / 3 + 1;
        SetStyle(self.EleBody, {
            display: "",
            transformOrigin: "center bottom"
        });
        EditCompositeStyle({
            ele: self.EleBody,
            delFuncs: ["scale"],
            addFuncs: [
                ["scale", sc]
            ],
            option: 2
        });
        oSym.addTask(58, function fun() {
            if ($P[pid]) {
                stopAttack();
            }
        });
    },
    Die: function(ticket = "NONE_TICKET") {
        const list = new Set(['NONE_TICKET', 'JNG_TICKET_Tombstone', 'JNG_TICKET_ShovelPlant', 'JNG_TICKET_MakeRifterZombie', 'JNG_TICKET_Gargantuar', 'JNG_TICKET_SuperPower']);
        let self = this;
        if (list.has(ticket)) { //只有接收到特定标示才会死亡
            ClearChild(self.BlockPicDom);
            CPlants.prototype.Die.call(self);
        } else {
            SetAlpha($(self.id).childNodes[1], 1);
        }
    },
}),
oCranberry = InheritO(CPlants, {
    EName: "oCranberry",
    CName: "蔓越莓",
    width: 85,
    height: 77,
    beAttackedPointL: 10,
    beAttackedPointR: 50,
    SunNum: 50,
    HP:600,
    coolTime: 7.5,
    Attack: 0,
    AttackedLX:40,
    BerryNum:1,
    StaticGif:6,
    NormalGif:1,
    coolTime:5,
    AlmanacGif: 5,
    Tooltip: "双击蔓越莓发射浆果攻击前方僵尸，死亡时对僵尸造成伤害",
    Story: "蔓越莓一生根发芽，所有生长的植物便都看着他笑，有的叫道，“鹤莓儿，你蔓上又结新果子了！”他睁大眼睛说，“你怎么这样凭空污人清白……”“什么清白？我前天亲眼见你又生了几个果儿，连着生。”蔓越莓便涨红了脸，接连便是难懂的话，什么“鹤莓是因为花朵像鹤头和嘴”，什么“和送子鹤毫无关系”之类，引得众植都哄笑起来：草坪内外充满了快活的空气。",
    PicArr: (function() {
        var a = "images/Plants/Cranberry/";
        return ["images/Card/Cranberry.webp", a + "1.webp", a + "2.webp", a + "3.webp", a + "4.webp", a + "5.webp",a+"static.webp?useDynamicPic=false",a+"Bullet.webp?useDynamicPic=false",a+"BulletHit.webp",a+"Die.webp"]
    })(),
    getShadow: self => `left:${self.width*0.5-48}px;top:${self.height-30}px;`,
    PrivateBirth(self) {
        const id = self.id;
        self.growBigger(id,self);
        $(id).childNodes[1].src = self.PicArr[1];
        self.BulletEle = NewImg(0, self.PicArr[7], "left:" + self.AttackedLX + "px;top:" + (self.pixelTop + 15) + "px;visibility:hidden;z-index:" + (self.zIndex + 2))
        self.EleBody = $(id).childNodes[1];
        let date=null;
        self.EleClickArea=NewEle("clicking_cran"+Math.random(),"div",`opacity:0;position:absolute;height:60px;width:60px;top:${self.pixelTop+25}px;left:${self.pixelLeft+self.beAttackedPointL}px;background:blue;z-index:30;`,{},EDPZ);
        self.EleClickArea.onmousedown=function(){
            if(!oS.Chose&&oSym.Timer&&$P[id]&&self.BerryNum>=2){
                date=new Date();
                oEffects.Animate(self.EleBody,{filter:"brightness(120%)"},0.2,0);
            }
        };
        self.EleClickArea.onmouseup=function(){
            self.EleBody.style.filter="";
            if(date&&new Date()-date>=200){
                check();
            }
        };
        self.EleClickArea.ondblclick=check;
        function check(){
            if(!oS.Chose&&oSym.Timer&&$P[id]&&self.BerryNum>=2){
                oEffects.Animate(self.EleBody,{transform:"scaleY(0.8)"},0.1/oSym.NowSpeed);
                oSym.addTask(10,function(){
                    oEffects.Animate(self.EleBody,{transform:"scaleY(1)"},0.1/oSym.NowSpeed);
                    oSym.addTask(2,function(){
                        self.Shoot(self,1);
                        self.EleBody.src = self.PicArr[1];
                        self.growBigger(id,self);
                    });
                });
            }
        }
        self.EleClickArea.onmouseout=function(){
            self.EleBody.style.filter="";
        };
    },
    PrivateDie(c,type=0,dom) {
        if(!type){return;}
        oSym.addTask(100/24*5,_=>{
            ClearChild(dom);
            oAudioManager.playAudio("cherrybomb");
            let self = c, id = self.id,thisX = GetX(self.C), zombies = oZ.getArZ(thisX-40, thisX+40, self.R);
            zombies.forEach(zombie=>zombie.Altitude < 2 && zombie.getHit1(zombie, 200));
            oEffects.ScreenShake();
            let eff = NewImg(0, self.PicArr[9], "left:" + c.pixelLeft + "px;top:" + (c.pixelTop) + "px;z-index:" + (c.zIndex - 2), EDPZ);
            oSym.addTask(100/24*19,_=>{
                ClearChild(eff);
                IsHttpEnvi && self.RemoveDynamicPic(self);
            });
            self.Shoot(self);
        });
        self.HP = 0;
    },
    Shoot(self,min=0){
        (function LoopF(left){
            if(left<=3){
                return;
            }
            self.ThrowAttack([20,45][left-4],(left-3));
            oSym.addTask(5,LoopF,[left-1]);
        })(self.BerryNum);
        (function LoopF(left){
            if(left<=min){
                return;
            }
            let attack = left*15;
            if(left==1){
                attack=60;
            }
            self.BulletAttack(attack,5+left*1.2);
            oSym.addTask(5,LoopF,[left-1]);
        })(Math.min(self.BerryNum,3));
        self.BerryNum = min;
    },
    Die: function(ticket) {
        ClearChild(this.EleClickArea);
        const list = new Set(['JNG_TICKET_MakeRifterZombie','JNG_TICKET_Gargantuar','JNG_TICKET_ThiefZombie','JNG_TICKET_SuperPower']);
        if(list.has(ticket)) {  //只有接收到特定标示才会不爆炸死亡
            CPlants.prototype.Die.call(this);
            return;
        }
        var b = this,
        c = b.id;
        b.oTrigger && oT.delP(b);
        delete $P[c];
        delete oGd.$[b.R + "_" + b.C + "_" + b.PKind];
        let dom = $(c);
        oEffects.Animate(dom,{filter:"brightness(120%)"},5/24/oSym.NowSpeed);
        b.PrivateDie(b,1,dom)
    },
    BulletAttack: function(attackV,spd) {
        var a = this,
        b = "CB_" + Math.random(),
        w = a.id;
        EditEle(a.BulletEle.cloneNode(false), {  //生产一个子弹img对象
            id: b
        },
        0, EDPZ);
        $(b).style.opacity=0;
        $(b).style.filter="brightness(120%)";
        oEffects.Animate($(b),{opacity:1,filter:""},0.5/oSym.NowSpeed,0);
        oSym.addTask(5,
        function(d) {
            oAudioManager.playAudio(['throw', 'throw2'][Math.round(Math.random() * 1)]);
            var c = $(d);
            c && SetVisible(c)
        },
        [b]);
        oSym.addTask(10,
        function fun(f, j, h, c, n, i, m /*豌豆属性：普通豌豆传0、寒冰豌豆传-1、火焰豌豆传1*/ , k, o, g, u) {
            var l,
            e = GetC(n),
            d = oZ["getZ" + c](n+3, i);  //获取要攻击的僵尸对象
            if(u[i + "_" + e] && k != e){
                ClearChild(j);
            }else{ 
                d && !d.isGoingDie && d.Altitude == 1 ? (d["getPea"](d, h, c), (SetStyle(j, {
                    left: o + 10 + "px"
                })).src = a.PicArr[8], oSym.addTask(30, ClearChild, [j])) : (n += (l = !c ? spd : -spd)) < oS.W && n > 100 ? (j.style.left = (o += l) + "px", oSym.addTask(1, fun, [f, j, h, c, n, i ,m, k, o, g, u])) : ClearChild(j)
            }
        },
        [b, $(b), attackV, 0, a.AttackedLX+30, a.R, 0, 0, a.AttackedLX, oGd.$Torch, oGd.$Obstacle]);
    },
    growBigger: function(id,self){
        let ele = $(id);
        oSym.addTask(500,function loopF(index = self.BerryNum+1){
            if($P[id]&&index<6){
                if(self.BerryNum+1!=index){
                    return;
                }
                self.BerryNum++;
                if(self.BerryNum>1){
                    self.EleClickArea.style.cursor = "pointer";
                }else{
                    self.EleClickArea.style.cursor = "";
                }
                ele.childNodes[1].src = self.PicArr[index];
                oSym.addTask(500,loopF,[index+1]);
            }
        });
    },
    get_S_Vx:oIceAloe.prototype.get_S_Vx,
    ThrowAttack(deltaM=30,deltaAtt=0) {
        let self = this;
        let ele = $(self.id);
        let zombieTarget = oZ.getRangeLeftZ(self.pixelLeft + self.beAttackedPointR, oS.W, self.R, true, true);
        if(!zombieTarget) return;
        let bullet = EditEle(self.BulletEle.cloneNode(), {id: "CB" + Math.random()}, 0, EDPZ);
        oSym.addTask(1, _ => {
            oAudioManager.playAudio(self.AudioArr.slice(0,2).random());
            SetVisible(bullet);
            bullet.style.opacity=0;
            bullet.style.filter="brightness(120%)";
            oEffects.Animate(bullet,{opacity:1,filter:""},0.1/oSym.NowSpeed,0);
            let x = self.pixelLeft + deltaM;  //子弹横坐标
            let y = self.pixelTop + 10;  //子弹纵坐标
            //子弹宽高
            let width = 12;
            let height = 20;
            let gravity = 0.2;  //重力加速度，定值
            let vy = -10;  //竖直方向速度，初速度为定值
            let zomRelativePos = zombieTarget.HeadTargetPosition[zombieTarget.isAttacking]?zombieTarget.HeadTargetPosition[zombieTarget.isAttacking]:zombieTarget.HeadTargetPosition[0];//僵尸和僵尸头部坐标
            let zY = Number.parseInt(zombieTarget.Ele.style.top)+zombieTarget.DivingDepth+zomRelativePos.y-height;//僵尸绝对纵坐标
            let zX = Number.parseInt(zombieTarget.Ele.style.left)+zomRelativePos.x-width;//投出时僵尸横坐标
            let zSpeed = !zombieTarget.isAttacking * zombieTarget.Speed * zombieTarget.DeltaDirectionSpeed[zombieTarget.FangXiang];
            let [s,vx] = self.get_S_Vx([x,y],[zX,zY],vy,gravity,zSpeed);//获取距离和水平速度
            let x2 = x + s;  //落点坐标
            let dt = 2;//更新时间
            let [lastX,lastY]=[x,y];
            let defAngle = Math.atan2(y+vy+gravity-lastY,x+vx-lastX);
            let bulletShadow = NewEle(`${self.id}_B_${Math.random()}_Shadow`, 'div', `opacity:0.5;background-size:29px;background-repeat: no-repeat;width:29px;left:${x}px;top:${self.pixelTop+self.height-10}px;`, {className: 'Shadow'}, EDPZ);
            (function drawFrame() {
                vy += gravity*dt;  //竖直方向的速度受重力加速度影响
                bullet.style.left = (x += vx*dt) + 'px';
                bulletShadow.style.left = x + 'px';
                bullet.style.top = (y += vy*dt) + 'px';
                bullet.style.transform = `rotate(${Math.atan2(y-lastY,x-lastX)}rad)`;
                if(!$Z[zombieTarget.id]){//僵尸死亡的时候改变下落坐标
                    zY = GetY(self.R)-70;
                }
                if((x>=x2&&y>=zY&&vy>0)||s<40){//僵尸距离太小的情况
                    bullet && (bullet.src = self.PicArr[8],  oSym.addTask(30, ClearChild, [bullet]));
                    $Z[zombieTarget.id] && zombieTarget.getHit0(zombieTarget,35+deltaAtt*10);
                    oEffects.fadeOut(bulletShadow, (1/oSym.NowSpeed), ClearChild);//影子消失
                    return;
                }
                oSym.addTask(dt, drawFrame);
                [lastX,lastY] = [x,y];//重设上一个x,y
            })();
        });
    },
}),
oMelonPult = InheritO(oCabbage, {
    EName: "oMelonPult",
    CName: "西瓜投手",
    width: 190,
    height: 112,
    beAttackedPointR: 60,
    SunNum: 300,
    AttackGif: 4,
    coolTime:5,
    Attack: 80,
    AudioArr: ["CabbageAttack1", "CabbageAttack2","melonimpact1","melonimpact2"],
    PicArr: (function() {
        var b="images/Plants/MelonPult/",arr=[];
        for(let i = 1;i<=7;i++){
            arr.push(b+"piece"+i+".webp?useDynamicPic=false");
        }
        return ["images/Card/MelonPult.webp", b + "0.webp", b + "static.webp", b + "bullet.webp?useDynamicPic=false", b + "attack.webp"].concat(arr)
    })(),
    Tooltip: "向敌人抛出带有溅射的西瓜瓣",
    Story: `戴夫时不时会进入他自家的花园，抱走一个西瓜放进冰箱冰镇后准备大快口福。但有时他会不小心拿到了西瓜投手还长在藤蔓上的生瓜蛋子。“非常抱歉，我并不是有意给你生瓜蛋子的。”西瓜投手对着持刀过来的戴夫瑟瑟发抖，“毕竟我的头也是瓜蛋子，我的子弹也是瓜蛋子，挺难区分哪个是熟的……”
这就是为什么西瓜投手再没有投过一个完整的西瓜。`,
    getShadow: self => `left:${self.width*0.5-48}px;top:${self.height-22}px;`,
    CheckLoop(zid, direction) {
        let self = this;
        let pid = self.id;
        if($P[pid]) {
            self.NormalAttack(zid);
            oSym.addTask(270+Math.random()*10-5, _ => {$P[pid]&&self.AttackCheck1(zid, direction)});
        }
    },
    AttackAnim(ele,self){
        ele.childNodes[1].src = self.PicArr[self.AttackGif];
    },
    NormalAttack(zid) {
        let self = this;
        let ele = $(self.id);
        let zombieTarget = oZ.getRangeLeftZ(self.pixelLeft + self.beAttackedPointR, oS.W, self.R, true);
        if(!zombieTarget) return;
        self.AttackAnim(ele,self);
        oSym.addTask(43, _ => {
            oAudioManager.playAudio(self.AudioArr.slice(0,2).random());
            CustomBullet(oMelonBullet,null,self.pixelLeft+50,self.pixelTop+10,self.R,null,null,zombieTarget,self.Attack);
        });
        oSym.addTask(124, _ => $P[self.id] && (ele.childNodes[1].src = self.PicArr[self.NormalGif]));
    },
}),
//实验室
oAbutilonHybriden = InheritO(CPlants, {
    EName: "oAbutilonHybriden",
    CName: "实验室-金铃花",
    SunNum: 25,
    canEat: 0,
    coolTime: 20,
    width: 216,
    height: 164,
    Immediately:true,
    FlyingPlant:true,
    beAttackedPointL: 60,
    beAttackedPointR: 130,
    PicArr: (function() {
        var a = "images/Plants/AbutilonHybriden/";
        return ["images/Card/AbutilonHybriden.webp", a + "0.gif", a + "AbutilonHybriden.gif", 'images/Zombies/buff_vertigo.webp', a + "Firefly.gif", a + "shadow.png"]
    })(),
    AudioArr: ["AbutilonHybriden"],
    Tooltip: "金铃花可以在原地制造一个持续30秒的萤火虫格子。",
    Story:"金铃花喜欢漂浮在空中，轻轻摇晃自己来发出悦耳的铃声。这铃声常常会吸引一群萤火虫，虽可怜他无法驻足与萤火虫共舞，但至少在生的时候，他把悦耳的铃声带到了沼泽的每一个角落。",
    InitTrigger: function() {},
    PrivateBirth: function(a) {
        oSym.addTask(400,
        function(b) {
            var e = $P[b],
            d,
            f;
            e && (d = e.R, f = e.C, e.Die(),
                 oAudioManager.playAudio("AbutilonHybriden"),
                 !oGd.$[d + "_" + f + "_1"] && CustomSpecial(oFirefly,d,f)
            )
        },
        [a.id])
    }
}),
oFirefly = InheritO(oStoneFlower, {  //金铃花产物
    EName: "oFirefly",
    canEat: 0,
    width: 216,
    height: 164,
    beAttackedPointL: 60,
    beAttackedPointR: 130,
    Attack: 20,
    coolTime:30,
    getShadow: function(a) {
        return "display:none"
    },
    PicArr: ["", "", "images/Plants/AbutilonHybriden/Firefly.gif"],
    HP: 300,
    PrivateBirth: function(self) {
        self.ArZ = {};
        oSym.addTask(3000, _=>{  //死亡倒计时
            let obj = $P[self.id];
            obj && obj.Die();
        });
    },
    BirthStyle(self, d, b, a) {
        b.childNodes[1].src = this.PicArr[2];
        EditEle(b, {
            id: d,
            'data-jng-constructor': self.EName
        },
        a, oZombieLayerManager.$Containers[self.R]);
        NewImg(d + "_shadow", "images/Plants/AbutilonHybriden/shadow.png", "left:" + self.pixelLeft + "px;top:" + (self.pixelTop + 20) + "px;z-index:" + (self.zIndex - 2), EDPZ)
    },
    NormalAttack: function(b, a) {
        oAudioManager.playAudio("Artichoke_Attack");
        var c = $Z[b];
        c.getVertigo(c, this.Attack, 0);
    },
    Die: function() {
        let self = this, id = self.id, shadow = self.id + "_shadow";
        self.oTrigger && oT.delP(self);  //注销侦测器
        self.HP = 0;
        delete $P[id];
        delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
        oEffects.fadeOut($(id), 'fast', (d)=>{ClearChild(d);IsHttpEnvi && self.RemoveDynamicPic(self);});
        oEffects.fadeOut($(shadow), 'fast', ClearChild);
    },
}),
oPumpkinHead = InheritO(CPlants, {
    EName: "oPumpkinHead",
    CName: "实验室-南瓜罩",
    width: 97,
    height: 67,
    beAttackedPointL: 15,
    beAttackedPointR: 82,
    SunNum: 125,
    PKind: 2,
    HP: 4000,
    BlueBarHP:4000,
    BloodBarRelativeHeight:-6,
    coolTime: 25,
    zIndex: 1,
    BackId:null,
    AlmanacGif: 5,
    PicArr: (function() {
        var a = "images/Plants/PumpkinHead/";
        return ["images/Card/PumpkinHead.webp", a + "0.gif", a + "Pumpkin_back.gif", a + "pumpkin_damage1.gif", a + "Pumpkin_damage2.gif", a + "PumpkinHead1.gif"]
    })(),
    Tooltip: "南瓜罩 ，可以用他的外壳保护其他植物。",
    Story:"南瓜罩看似空心，但其实他的内心有着丰富的情感：比如他对那个成了明星的海外表弟雷内菲尔德的思念，比如他对自己十分坚固这件事的确信不疑，以及对于这个世界的悲观主义态度。",
    getShadow: self => `left: 3.5px;top: 34px;`,
    CanGrow(data, R, C) {
        let flatCoord = `${R}_${C}`;
        let [d0, d1, d2] = data;
        if(d2 && d2.EName === 'oPumpkinHead' && d2.HurtStatus > 0) {
            return true;
        }
        if((oGd.$GdType[R][C] === 1  || (oGd.$GdType[R][C]===2&&oGd.$WaterDepth[R][C]===0) || d0) && !(d2 || C < 1 || C > 9 || oGd.$LockingGrid[flatCoord])) {
            return d1 ? d1.isPlant : true;
        }
    },
    GetDY: function(b, c, a) {
        return a[0] ? -12 : -5
    },
    HurtStatus: 0,
    RefreshImg(self, ele) {  //修复背面动画不同步Bug
        let url = oDynamicPic.require("images/Plants/PumpkinHead/Pumpkin_back.gif", ele, true);
        $(self.BackId).src = url;
    },
    getHurt(zombie, AKind, Attack) {
        const self = this;
        const id = self.id;
        const ele = $(id).childNodes[1];
        self.SetBrightness(self, ele, 1);
        oSym.addTask(10, _ => $P[id] && self.SetBrightness(self, ele, 0));
        self.HP -= Attack;
        switch (true) {
            //巨人、车辆直接秒杀
            case AKind && AKind < 3 : {
                self.Die();
                break;
            }
            case self.HP < 1 : {
                self.Die();
                break;                
            }
            case self.HP < 1334 && self.HurtStatus < 2 : {
                self.HurtStatus = 2;
                ele.src = self.PicArr[4];
                self.RefreshImg(self, ele);
                break;                
            } 
            case self.HP < 2667 && self.HurtStatus < 1 : {
                self.HurtStatus = 1;
                ele.src = self.PicArr[3];
                self.RefreshImg(self, ele);
            }
        }
    },
    InitTrigger() {},
    BirthStyle(self, id, wrap, style) {
        const ele = wrap.childNodes[1];
        ele.src = self.PicArr[5];
        EditEle(wrap, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R]);
        self.BackId = "PBack_"+Math.random();
        let dom = NewImg(self.BackId, self.PicArr[2], null, oZombieLayerManager.$Containers[self.R]);  
        //在生成完后复制所有样式不然可能会有样式没有复制
        oSym.addTask(1, () => {
            dom.style = ele.style.cssText;
            SetStyle(dom, {
                "left": self.pixelLeft+"px",
                "top": self.pixelTop + "px",
                "zIndex": (self.zIndex_cont - 2)
            });
        });
    },
    PrivateDie: function(a) {
        ClearChild($(a.BackId));
    }
}),
oMiracleImitater = InheritO(oStoneFlower, {
    EName: "oMiracleImitater",
    CName: "实验室-奇迹模仿者",
    width: 109,
    height: 124,
    beAttackedPointL: 23,
    beAttackedPointR: 60,
    SunNum: 75,
    HP: 2000,
    coolTime: 20,
    AudioArr: ["Imitater"],
    PicArr: (function() {
        var a = "images/Plants/MiracleImitater/";
        return ["images/Card/MiracleImitater.webp", a + "0.png", a + "MiracleImitater.gif", a + "Die.gif"]
    })(),
    Attack: 20,
    Tooltip: "阻挡僵尸前进的同时，对啃食它的僵尸造成伤害。死亡后会在原地生成一株其他任意实验室植物。",
    Story: "很多植物都问过，为何他会从一群茄子中脱颖而出，成为奇迹？唔，在向日葵的访谈里他如实透露：“我的老伙计，哦，我向上帝发誓，那可是因为我留学多年，学得的高超画技，精妙绝伦的创意……而不是某些人所说的，哦我的上帝啊，那像隔壁艾草做的茄子煲一样恶心的斗地主只出王炸的变态外挂……”",
    NormalAttack: function(b, a) {
        oAudioManager.playAudio("Artichoke_Attack");
        var c = $Z[b],
        y = this;
        c.getHit2(c, y.Attack, 0);
    },
    Die: function(ticket) {
        const self = this,
        whitelist = new Set([`JNG_TICKET_MembraneZombie`, `JNG_TICKET_IceStorm`,'JNG_TICKET_Gargantuar', 'JNG_TICKET_MakeRifterZombie', 'JNG_TICKET_ThiefZombie',"JNG_TICKET_SuperPower"]);
        if(whitelist.has(ticket)) {  //特殊情况直接死亡
            CPlants.prototype.Die.call(self);
        } else {
            oAudioManager.playAudio("Imitater");
            let id = self.id, r = self.R, c = self.C;
            self.oTrigger && oT.delP(self);
            self.HP = 0;
            $(id).childNodes[1].src = self.PicArr[3];
            delete oGd.$[r + "_" + c + "_" + self.PKind];
            oEffects.fadeOut($(id).childNodes[1], 1.5, function() {
                !oGd.$[r + "_" + c + "_1"] && CustomSpecial(AllExpPlantsArr.random(), r, c);
                ClearChild($(id));
                IsHttpEnvi && self.RemoveDynamicPic(self);
                delete $P[id];
            });
        }
    },
}),
oJalapeno = InheritO(oCherryBomb, {
    EName: "oJalapeno",
    CName: "实验室-火爆辣椒",
    width: 76,
    height: 105,
    beAttackedPointR: 48,
    SunNum: 125,
    coolTime: 30,
    PicArr: ["images/Card/Jalapeno.webp", "images/Plants/Jalapeno/0.webp", "images/Plants/Jalapeno/Jalapeno.webp", "images/Plants/Jalapeno/JalapenoAttack.webp"],
    AudioArr: ["jalapeno"],
    Tooltip: "消灭整行的敌人",
    Story: '火爆辣椒的自画像《火爆辣椒的微笑》在被佳柿得高价拍卖后，被“那些不懂得欣赏美的家伙”（他的原话）做成了表情包，每天他刷薇博，看见自己的笑被做成花稽并广泛传播的时候，他总会哀嚎一句：“我和萌娜莉莎比哪里差了？！”',
    PrivateBirth(self) {
        oSym.addTask(80, id => {
            let obj = $P[id];
            if(obj) {
                oAudioManager.playAudio("jalapeno");
                let ele = $(id), R = obj.R, $Ice = oGd.$Ice[R],
                     fireId = `${id}_Fire`,
                     ima = 0;
                let rememberZombies = {};
                //烧僵尸（火的灼烧会持续一段时间）
                (function burn() {
                    let zombieArr = oZ.getArZ(100, 880, R);
                    zombieArr.forEach(zombie=>{if(!rememberZombies[zombie.id]){zombie.getExplosion();rememberZombies[zombie.id]=true;}});
                    ima<3 && (ima++, oSym.addTask(50, burn));                    
                })();
                //除冰道
                ClearChild($("dIceCar" + R));
                if($Ice) {
                    for (let leftBorder = $Ice[1], $Crater = oGd.$Crater; leftBorder < 11; leftBorder++) {
                        delete $Crater[R + "_" + leftBorder];
                        oGd.unlockGrid(R, leftBorder);
                    }
                }
                obj.Die('JNG_TICKET_SuperPower');
                let effect = NewImg(fireId, null, `position: absolute;left:130px;top:${obj.pixelBottom-83}px;z-index:${GetY(self.R)}`, oZombieLayerManager.$Containers[self.R], {
                    width: 752,
                    height: 103,
                });
                effect.src = oDynamicPic.require("images/Plants/Jalapeno/JalapenoAttack.webp", effect);
                oSym.addTask(160, ClearChild, [effect]);
            }
        },
        [self.id]);
    }
}),
oXshooter = InheritO(oPeashooter,{
    EName:"oXshooter",
    CName:"实验室-拟南芥散射手",
    SunNum:225,
    HP:500,
    StaticGif:1,
    NormalGif:2,
    AttackGif:3,
    FlowerGif:4,
    LeafGif:6,
    height:92,
    width:77,
    beAttackedPointL:30,
    beAttackedPointR:35,
    Tooltip:"对僵尸发射追踪性高伤害子弹，对近程僵尸造成高伤害",
    Story:"在玩了《东方Project》系列之后，它决定练习射击子弹的技巧。所以，它现在成功发射了一些特殊的子弹了，我们叫这些子弹——...特殊的子弹。",
    getTriggerRange: (R, LX, RX) => [[0, oS.W, 0]],
    PicArr: (function() {
        var a = "images/Plants/Xshooter/";
        return ["images/Card/Xshooter.webp", a + "idle.webp?useDynamicPic=false", a + "Normal.webp", a + "Attack.webp",a +"Bullet_Flower.webp?useDynamicPic=false",a +"Bullet_Flower_Splash.webp?useDynamicPic=false",a +"Bullet_Leaf.webp?useDynamicPic=false",a +"Bullet_Leaf_Splash.webp?useDynamicPic=false"]
    })(),
    getShadow: self => `left:${self.width*0.5-48}px;top:${self.height-22}px;transform:scale(0.75);`,
    BirthStyle: (self, id, ele, style) => {EditEle(ele.childNodes[1],{},{left:"-7px",top:"5px"}); EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R])},
    PrivateBirth: function(a) {
        a.FlowerEle = NewImg(0, a.PicArr[a.FlowerGif], "left:" + a.AttackedLX + "px;top:" + (a.pixelTop + 15) + "px;visibility:hidden;z-index:" + (a.zIndex + 2));
        a.BulletEle = NewImg(0, a.PicArr[a.LeafGif],"left:" + a.AttackedLX + "px;top:" + (a.pixelTop + 15) + "px;visibility:hidden;z-index:" + (a.zIndex + 2))
    },
    getTriggerR: selfR => [(selfR!=1?selfR-1:selfR),(selfR!=oS.R?selfR+1:selfR)],
    getHurt: function(zombie, AKind, Attack) {
        const o = this, id = o.id, ele = $(id).childNodes[1];
        o.SetBrightness(o, ele, 1);
        oSym.addTask(10, _=>$P[id] && o.SetBrightness(o, ele, 0));
        !(AKind % 3) ? (zombie&&zombie.getHit1(zombie, 80),(o.HP -= (Attack/2)) < 1 && o.Die()) : o.Die();
    },
    CheckLoop: function(b, c) {
        var a = this.id;
        if($P[a]) {
            this.NormalAttack(b);
            oSym.addTask(280,
            function(e, f, h) {
                var g; (g = $P[e]) && g.AttackCheck1(f, h)
            },
            [a, b, c])            
        }
    },
    getPosition(x,distance=900,pi=Math.PI){
        return Math.sin(x*(((distance>400)?4:2)*pi/distance))*4;
    },
    SpecialBullet(g,f,d,b,c,e,point,a,theZ,type,dist=100){
        let AttackType = 0;
        if(theZ.ZX<d){
            AttackType=1;
        };
        (function(h) {
            oSym.addTask(1,
            function(j) {
                var i = $(j);
                i && SetVisible(i);
            },
            [h]);
            
            oSym.addTask(1,
            function shoot(n, l, m, k, i, j,speed=4*dist/100,moveType=1,distance=false,hig=false) {
                let tmpX = m,tmpY = k;
                if(n > 1000 || k < -40) { 
                    ClearChild(i);
                    hig=true;
                }else{
                    if((type===0?(k<b-dist||k<50):(k>b+dist||k>590))&&moveType<2){
                        moveType=2;
                    }
                    if(moveType===1){
                        let g = (Math.sqrt(Math.abs(m-f)));
                        SetStyle(i, {
                            left: (m += (speed=Math.max(speed-0.1,1.5))) + "px",
                            top: (k=b+(type===1?g:-g)*10) + "px"
                        });
                    }else if(moveType===2){
                        let g = (Math.sqrt(Math.abs(m-f)));
                        if(theZ&&$Z[theZ.id]){
                            SetStyle(i, {
                                left: (m += (speed=Math.max(speed-0.03,0.08))) + "px",
                                top: (k=b+(type===1?g:-g)*10) + "px"
                            });
                            if(speed==0.08){
                                moveType=3;
                            }
                        }else{
                            SetStyle(i, {
                                left: (m += (speed+=0.2)) + "px",
                                top: k + "px"
                            });
                            !j(oZ.getZ0(n, l), 0, i,0,80)&&(hig=true);
                        }
                    }else{
                        if(theZ&&$Z[theZ.id]){
                            speed=Math.min(speed+0.2,7);
                            if(theZ.ZX>m){
                                m += speed;
                            }else{
                                m -= speed;
                            }
                            if(!distance){
                                distance = Math.abs(theZ.ZX-m);
                                hig = Math.abs(theZ.pixelTop+theZ.height/2-k);
                            }
                            let deltaX = Math.abs(theZ.ZX-m),deltah = hig*(deltaX/distance),zhig = theZ.pixelTop+theZ.height/2;
                            SetStyle(i, {
                                left: m + "px",
                                top: (k=zhig+(k>=zhig?deltah:-deltah)) + "px"
                            });
                            if(deltaX<10){
                                m=theZ.ZX;
                                k=zhig;
                                !j(theZ, AttackType, i)&&(hig=true,i.src = g.PicArr[g.FlowerGif+1]);
                                
                            }
                        }else{
                            if(theZ.ZX<m){
                                speed=-speed;
                                moveType=2;
                            }else{
                                moveType=2;
                            }
                        }
                    }
                    if(hig!==true){
                        SetStyle(i,{
                            transform:$User.LowPerformanceMode?"":`rotate(${Math.atan2(k-tmpY,m-tmpX)}rad)`,
                        });
                        oSym.addTask(1, shoot, [m, GetR(k + 15), m, k, i, j,speed,moveType,distance,hig]);
                    }
                }
            },
            [f, c, d, b, EditEle(g.FlowerEle.cloneNode(false), {
                id: h
            },
            0, EDPZ), a])
        })("NiBulletB" + Math.random());
    },
    NormalAttack(){
        var g = this,
        f = g.pixelLeft,
        d = f+10,
        b = g.pixelTop + 20,
        c = g.R,
        e = f + 15,
        point=17,
        a = function(j, i, h,time=15,p=point) {
            return (j && j.Altitude == 1 ? (j.getPea(j, p, i), oSym.addTask(time,ClearChild,[h]), false) : true)
        }; 
        function zombieF(z){
            return z.Altitude>0&&z.Altitude<3;
        }
        let theZ = oZ.getRangeLeftZ(e,900,g.R,false,false,zombieF);
        if(!theZ){
            theZ = oZ.getRangeLeftZ(0,900,g.R,false,false,zombieF);
        }
        $(g.id).childNodes[1].src = g.PicArr[g.AttackGif];
        oSym.addTask(50,_=>{
            if(theZ&&$Z[theZ.id]&&$P[g.id]){
                oAudioManager.playAudio("throw"+["",2].random());
                //sin
                if(theZ.ZX-e>0){
                    (function(h) {
                        oSym.addTask(15,
                        function(j) {
                            var i = $(j);
                            i && SetVisible(i);
                        },
                        [h]);
                        oSym.addTask(1,
                        function shoot(n, l, m, k, i, j,tmp) {
                            theZ.ZX&&(tmp=theZ.ZX);
                            let [tmpX,tmpY] = [m,k];
                            j(oZ.getZ0(n, l), 0, i,15,20) ? (n > 900 || k < -40 ? ClearChild(i) : (SetStyle(i, {
                                left: (m += 4) + "px",
                                top: (k=k+g.getPosition(m-d,(tmp-d))) + "px",
                                transform:$User.LowPerformanceMode?"":`rotate(${Math.atan2(k-tmpY,m-tmpX)}rad)`
                            }), oSym.addTask(1, shoot, [m+8, GetR(k + 15), m, k, i, j,tmp]))):(i.src=g.PicArr[g.LeafGif+1])
                        },
                        [f, c, d, b, EditEle(g.BulletEle.cloneNode(false), {
                            id: h
                        },
                        0, EDPZ), a])
                    })("NiBulletB" + Math.random());
                    (function(h) {
                        oSym.addTask(15,
                        function(j) {
                            var i = $(j);
                            i && SetVisible(i);
                        },
                        [h]);
                        oSym.addTask(1,
                        function shoot(n, l, m, k, i, j,tmp) {
                            theZ.ZX&&(tmp=theZ.ZX);
                            let [tmpX,tmpY] = [m,k];
                            j(oZ.getZ0(n, l), 0, i,15,20) ? (n > 900 || k < -40 ? ClearChild(i) : (SetStyle(i, {
                                left: (m += 4) + "px",
                                top: (k=k-g.getPosition(m-d,(tmp-d))) + "px",
                                transform:$User.LowPerformanceMode?"":`rotate(${Math.atan2(k-tmpY,m-tmpX)}rad)`
                            }), oSym.addTask(1, shoot, [m+8, GetR(k + 15), m, k, i, j,tmp]))):(i.src=g.PicArr[g.LeafGif+1])
                        },
                        [f, c, d, b, EditEle(g.BulletEle.cloneNode(false), {
                            id: h
                        },
                        0, EDPZ), a])
                    })("NiBulletB" + Math.random());
                }
                //自机狙
                g.SpecialBullet(g,f,d,b,c,e,point,a,theZ,0);
                g.SpecialBullet(g,f,d,b,c,e,point,a,theZ,1);
            }
            {
                //全屏自机狙
                let z,triggerR = g.getTriggerR(g.R);
                let rand = [[triggerR[0],triggerR[1],1],[triggerR[1],triggerR[0],-1]].random();
                for(let i=rand[0];(rand[2]==1?i<=rand[1]:i>=rand[1]);i+=rand[2]){
                    let tmp = oZ.getRangeLeftZ(0,900,i,false,false,zombieF);
                    if(tmp&&(!z||tmp.ZX<z.ZX)){
                        z=tmp;
                    }
                }
                if(z&&$Z[z.id]){
                    g.SpecialBullet(g,f,d,b,c,e,15,a,z,0,50);
                    g.SpecialBullet(g,f,d,b,c,e,15,a,z,1,50);
                }
            }
        });
        oSym.addTask(130,function(){
            if($P[g.id]){
                $(g.id).childNodes[1].src=g.PicArr[g.NormalGif];
            }
        });
    }
}),
oMacintosh = InheritO(oWallNut, {
    EName: "oMacintosh",
    CName: "实验室-麦金塔挨炮",
    HP: 3700,
    coolTime:10,
    SunNum:125,
    width:82,
    Tooltip:"每隔一段时间向前产生8bit挨炮攻击僵尸",
    Story:`<br/>---Untitled---<br/>人们天天吐槽我内存只有128k说我内存太小打字打到第十页就无法再打字了可恶为什么要这么吐槽呢内存小又不是我的错是造我那堆人欠造再说谁让那个叫leobai的天天用我打那么老长的一个剧<br/><br/>Almost out of memory! Is it OK if you can’t Undo this command?<br/>Go Ahead Cancel`,
    height:108,
    Sons:[],
    BirthStyle: (self, id, ele, style) => {EditEle(ele.childNodes[1],{},{top:"5px",left:"-5px"}); EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R])},
    CanGrow(data, R, C) {
        let flatCoord = `${R}_${C}`;
        if(oGd.$GdType[R][C] === 1 || (oGd.$GdType[R][C]===2&&oGd.$WaterDepth[R][C]===0)) {  //如果是草地地形
            return !(C < 1 || C > 9 || oGd.$LockingGrid[flatCoord] || data[1]);
        } else {  //如果是非草地地形则检测有无空容器
            return data[0] && !data[1];
        }
    },
    CheckLoop(){return false;},
    Check: function(R, C) {
        let data = [];
        for(let f = 0, _$ = oGd.$; f <= PKindUpperLimit; f++) {
            data.push(_$[R + "_" + C + "_" + f]);
        }
        return o8BitApple.prototype.CanGrow(data, R, C);
    },
    PicArr: (function() {
        var a = "images/Plants/Macintosh/";
        return ["images/Card/Macintosh.webp", a + "Static.webp", a + "Normal.webp", a + "Summon.webp"]
    })(),
    getHurt:CPlants.prototype.getHurt,
    PrivateBirth(self) {
        self.Sons=[];
        self.EleBody = $(self.id).childNodes[1];
        oSym.addTask(150,function d(){
            if(!$P[self.id]){
                return;
            }
            self.SummonApple(self);
            oSym.addTask(950,d);
        });
    },
    SummonApple(self){
        const r = self.R;
        let c = -3;
        for(let i = self.C+1;i<=oS.C;i++){
            if(!self.Check(r,i)){
                continue;
                //break;
            }
            let obj = oGd.$[r + "_" + i + "_" + 4];
            if(obj&&obj.EName=="o8BitApple"){
                continue;
            }
            if(!obj){
                c=i;
                break;
            }else if(obj.HP<o8BitApple.prototype.HP&&obj.isPlant){
                c=i;
                break;
            }
        }
        if(c>0){
            self.Sons.push(CustomSpecial(o8BitApple,r,c));
            self.EleBody.src = self.PicArr[3];
            oSym.addTask(137,function(){
                if(!$P[self.id]){
                    return;
                }
                for(let i=0;i<self.Sons.length;i++){
                    !$P[self.Sons[i].id]&&(self.Sons.splice(i,1));
                }
                self.EleBody.src = self.PicArr[2];
            });
        }
    },
    PrivateDie(self){
        for(let i of self.Sons){
            if($P[i.id]){
                i.Die("JNG_TICKET_8BitApple");
            }
        }
    },
}),
// 镜花水月植物从下面开始
oLilyPad = InheritO(CPlants, {
    EName: "oLilyPad",
    CName: "莲叶",
    beAttackedPointR: 52,
    SunNum: 25,
    Tooltip: "莲叶允许你在水上种植植物。",
    Story: "莲叶，作为一个既经历过三叠纪入侵大水漫天，又能跟上当下流行节奏跳广场舞的又老又新的植物，他如今已不再对他的人生再有过多的追求。他现在只想静静的在水上躺平，即使有不知道从哪里来的植物给他的生活以莫名其妙的重压，他也只想把自己经历过所有的这一切后所有的感受全部埋在心里。",
    HP: 250,
    NormalGif:1,
    StaticGif:1,
    width: 80,
    height: 43,
    getShadow(){return "display:none;"},
    PicArr: ["images/Card/LilyPad.webp", "images/Plants/LilyPad/idle.webp", "images/Plants/LilyPad/idle2.webp", "images/Plants/LilyPad/idle3.webp", "images/Plants/LilyPad/idle4.webp", "images/Plants/LilyPad/idle5.webp"],
    PKind: 0,
    Stature: -1,
    CanGrow(plantArgs, R, C) {
        let flatCoord = R + "_" + C;
        return !(oGd.$GdType[R][C]!=2 || C < 1 || C > 9 || plantArgs[0] || oGd.$LockingGrid[flatCoord]);
    },
    BirthStyle: (self, id, ele, style) => {
        self.zIndex -= 1;
        style.zIndex = (self.zIndex_cont -= 1);
        EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R]);
    },
    InitTrigger: function() {},
    PrivateBirth(self) {
        let animTimes = [null, 0, 30, 217, 310, 323];
        let dom = $(self.id).getElementsByTagName("img")[0];
        let check = () => {
            for(let i = 1;i<=PKindUpperLimit;i++){
                if(oGd.$[`${self.R}_${self.C}_${i}`]){
                    return false;
                }
            }
            return true;
        };
        oSym.addTask(Math.random() * 1000, function func() {
            if ($(self.id)) {
                let rand = 2 + Math.floor(Math.random() * 4);
                dom.src = self.PicArr[rand];
                oSym.addTask(animTimes[rand], () => {
                    if ($(self.id)) {
                        dom.src = self.PicArr[self.NormalGif];
                        check() && oSym.addTask(Math.random() * 1000, func);
                    }
                });
            }
        });
    },
}),
oIceShroom = InheritO(oCherryBomb, {
    EName: "oIceShroom",
    CName: "寒冰菇",
    width: 107,
    height: 90,
    beAttackedPointL: 23,
    beAttackedPointR: 82,
    SunNum: 75,
    coolTime: 35,
    AlmanacGif: 2,
    PicArr: ["images/Card/IceShroom.webp", "images/Plants/IceShroom/0.webp", "images/Plants/IceShroom/idle.webp", "images/Zombies/buff_freeze.png"],
    AudioArr: ["frozen"],
    Tooltip: "暂时使画面里的所有敌人停止行动",
    Story: '在小时候与表弟冰寒菇玩耍却因意外导致面瘫后，他因为愤怒而离开了他们家族所居住的北极，在走了很久，企图离他们越远以后，他最终到达了南极，并在这里开始了新的生活。在南极打拼许久后，他终于成家立业，生活安定下来，但因那次童年意外而导致的面瘫却将愤怒永远的固定在了脸上，即使他的内心早已忘记愤怒到底是什么滋味。',
    PrivateBirth(self) {
        const id = self.id;
        oSym.addTask(200, function() {
            if ($P[id]) {
                oAudioManager.playAudio("frozen");
                let effect = NewEle(`${id}_Freeze`, "div", "position:absolute;z-index:256;width:900px;height:600px;left:115px;top:0;background:#A0FDFF;opacity:0.5;pointer-events:none;", 0, EDAll);
                for (let zombie of $Z) {
                    zombie.ZX <= oS.W && zombie.getFreeze();
                }
                oSym.addTask(20, ClearChild, [effect]);
                self.Die('JNG_TICKET_SuperPower');
            }
        });
    }
}),
oGraveBuster = InheritO(CPlants, {
    EName: "oGraveBuster",
    CName: "噬碑藤",
    SunNum: 25,
    coolTime: 10,
    width: 181,
    height: 123,
    canShovel: false,  // 与PVZ2国际版保持一致，无法铲除
    Immediately: true,
    beAttackedPointL: 50,
    beAttackedPointR: 133,
    PKind:5,
    PicArr: ["images/Card/GraveBuster.webp", "images/Plants/GraveBuster/0.webp", "images/Plants/GraveBuster/attack.webp"],
    Tooltip: "噬碑藤能够就地吞噬墓碑",
    Story: "噬碑藤虽然在别人眼里像一条盘起来的浑身长满刺的，凶神恶煞的蛇，但他其实一直想要被拥抱，想要获得那种不需要证明自己有异于常人的能力也可以享受的真心的拥抱，即使被当成一条狗也无所谓。但当他原本信赖的人为了更好地利用他而杀掉了他所有亲近的植物，甚至没有放过他的朋友养的猫以后，他现在只想摧毁所有墓碑，直到彻底黑化，在墓地和那人对决并且把它彻底吞掉为止。",
    InitTrigger() {},
    BirthStyle(self, id, ele, style) {
        self.zIndex += 1;
        EditEle(ele, {id, 'data-jng-constructor': self.EName}, {
            ...style,
            zIndex: (self.zIndex_cont += 1),
        }, oZombieLayerManager.$Containers[self.R]);
    },
    getShadow() {
        return "display:none;";
    },
    CanGrow(data, R, C) {
        return !!oGd.$Tombstones[`${R}_${C}`]||!!oGd.$Sculpture[`${R}_${C}`]||oGd.$Crystal[`${R}_${C}`]||(oGd.$[`${R}_${C}_1`]?.constructor===oFruitBasket&&oGd.$[`${R}_${C}_1`].HasFruits===true);
    },
    Die() {
        const self = this;
        const crood = self.R + "_" + self.C;
        CPlants.prototype.Die.call(self);
        // 让被啃食的墓碑重新长出来
        const tombConfig = oGd.$Tombstones[crood];
        if (tombConfig) {
            oTombstone.disappearSingle(crood, null, false);
            oTombstone.appearSingle(self.R, self.C, tombConfig);            
        }
    },
    PrivateBirth(self) {
        const id = self.id;
        let obj = oGd.$[`${self.R}_${self.C}_1`];
        if(obj?.constructor===oFruitBasket){
            let ps = function(name,ach,type="成就"){
                if($User.Achievement[ach]){
                    return;
                }
                PlaySubtitle(`解锁${type}：${name}`);
                oSym.addTask(500,function(){
                    PlaySubtitle();
                });
                DataManager.SetAchievement(ach,1);
            };
            ps("跨界美食家","The_oGraveBuster_Egg");
            $(id).childNodes[1].style.transform = "translateX(-10px) translateY(20px)";
            oSym.addTask(100, () => {
                if ($P[id]&&obj?.constructor===oFruitBasket) {
                    $(obj.id).childNodes[1].src = obj.PicArr[obj.EmptyGif];
                    obj.HasFruits=false;
                }
            });
            oSym.addTask(290, () => {
                if ($P[id]) {
                    CPlants.prototype.Die.call(self);
                }
            });
        }else if(!!(obj=oGd.$Sculpture[`${self.R}_${self.C}`])||!!(obj=oGd.$Crystal[`${self.R}_${self.C}`])){
            oSym.addTask(100, () => {
                if ($P[id]&&(!!(obj=oGd.$Sculpture[`${self.R}_${self.C}`])||!!(obj=oGd.$Crystal[`${self.R}_${self.C}`]))) {
                    console.log(obj);
                    oEffects.Animate($(id).childNodes[1],{transform:"scale(1.5) translateY(-25%)",opacity:0},0.2/oSym.NowSpeed,"ease-out");
                    obj.getHit0(obj,400);
                }
            });
            oSym.addTask(120, () => {
                if ($P[id]) {
                    CPlants.prototype.Die.call(self);
                }
            });
        }else{
            const tombElement = $(`Tomb_${self.R}_${self.C}`);
            oSym.addTask(100, () => {
                if ($P[id]) {
                    SetNone(tombElement);
                }
            });
            oSym.addTask(290, () => {
                if ($P[self.id]) {
                    let [R, C] = [self.R, self.C];
                    CPlants.prototype.Die.call(self);
                    oGd.$Tombstones[R + "_" + C] && oTombstone.destroy(R, C);
                }
            });
        }
    },
}),
oUmbrellaLeaf = InheritO(CPlants, {
    EName: "oUmbrellaLeaf",
    CName: "莴苣伞",
    width: 289,
    height: 195,
    SunNum: 100,
    coolTime: 15,
    beAttackedPointL: 126,
    beAttackedPointR: 154,
    AttackBodyGif: 3,
    AttackHeadGif: 4,
    PicArr: (_ => {
        let url = "images/Plants/UmbrellaLeaf/";
        return ["images/Card/UmbrellaLeaf.webp", url + "0.webp", url + "idle.webp", url + "attack_body.webp", url + "attack_umbrella.webp"];
    })(),
    AudioArr: ["polevault"],
    Tooltip: "莴苣伞保护着邻近的植物不被从天而降的僵尸和投掷物所伤害。",
    Story: "尽管莴苣伞乐于顶走那些影响到周围植物的各种各样奇怪的东西——从天而降的僵尸，从远处飞过来的篮球，或者是从不应该来的方向来的子弹——并且它的伞状叶片也不会受到它们的摧残。这叶片看起来简直是无敌的，至少在它的叶片没有沾上水滴让它破大防的的时候是这样。",
    InitTrigger() {},
    PrivateBirth(self) {
        self.isAttacking = false;
        oGd.$Umbrella[self.R + "_" + self.C] = self;
    },
    PrivateDie(self) {
        ClearChild($(self.id + "_head"));
        delete oGd.$Umbrella[self.R + "_" + self.C];
    },
    PlayAttackAnim() {
        let self = this;
        let id = self.id;
        let element = $(id);
        if (!$P[id] || self.isAttacking) return;
        let headImg = NewImg(id + "_head", self.PicArr[self.AttackHeadGif], `z-index:${self.R * 3 + 4};left:${115 + self.pixelLeft}px;top:${self.pixelTop}px;`, EDAll);
        oAudioManager.playAudio("polevault");
        self.isAttacking = true;
        element.childNodes[1].src = self.PicArr[self.AttackBodyGif];
        oSym.addTask(70, () => {
            if (!$P[id]) return;
            self.isAttacking = false;
            ClearChild(headImg);
            element.childNodes[1].src = self.PicArr[self.NormalGif];
        });
    }
}, {
    // 检测当前格子是否在某一株叶子保护伞的防范范围内
    checkUmbrella(R, C) {
        const map = oGd.$Umbrella;
        let val;
        // 首先检查当前格子有没有保护伞，如没有再检查周围的8个格子
        if (val = map[R + "_" + C]) return val;
        for (let r = Math.max(1, R - 1); r <= Math.min(5, R + 1); r++) {
            for (let c = Math.max(1, C - 1); c <= Math.min(oS.C, C + 1); c++) {
                if (!isNullish(val = map[r + "_" + c])) {
                    return val;
                }
            }
        }
        return null;
    },
}),
oEichhornia = InheritO(CPlants, {
    EName: "oEichhornia",
    CName: "水葫芦",
    ProduceTime: 17,
    SunNum: 225,
    coolTime: 5,
    firstCoolTime: 20,
    maxHP: 1200,
    Attack: 80,
    HP: 300,
    LoopAttackTime: 290,
    NormalGif: 1,
    AlmanacGif: 2,
    IdleGif: 2,
    AttackGif_Water: 3,
    AttackGif_Land: 4,
    MultiGif: 5,
    StaticGif: 6,
    width: 160,
    height: 120,
    beAttackedPointL: 56,
    beAttackedPointR: 101,
    WaterShadowGif:7,
    AudioArr: ["CabbageAttack1", "CabbageAttack2", "eichhornia_spawn", "eichhornia_multiply"],
    PicArr: (function() {
        var a = "images/Plants/Eichhornia/";
        return ["images/Card/Eichhornia.webp", a + "appear.webp", a + "idle.webp", a + "attack1.webp", a + "attack2.webp", a + "multiply.webp", a + "0.webp", WaterShadowImg]
    })(),
    CanGrow(data, R, C) {
        let flatCoord = `${R}_${C}`;
        let self = this;
        if ((oGd.$GdType[R][C] === 1 || oGd.$GdType[R][C] === 2) && oGd.$GdType[R][C] !== 0) { //如果是草地地形或无视地形的飞行植物，荒地强制禁止种植
            return !(C < 1 || C > 9 || (oGd.$LockingGrid[flatCoord] && self.PKind != 5) || data[self.PKind]) && (!data[1] || data[1].isPlant);
            //     在可种植列以内        非坑洞                       非锁定格子且不是瓷砖                         没有当前种类植物    其他植物要种植时需保证没有不是障碍物的植物或者没有种类为1的植物
        } else { //如果是非草地地形则检测有无空容器，如果是地底植物则种不了水路
            return (oGd.$GdType[R][C] !== 2 && data[0]) && !data[self.PKind];
        }
    },
    Tooltip: "具备繁衍能力的两栖植物",
    Story: '尽管水葫芦对治理污水很有心得，植物们也对他吸收走那些有害成分的事非常感激，但没有植物愿意接近他。他们总说水葫芦身上有一股……沼气味儿。但有的僵尸倒是想方设法地接近他，这样好摘点叶片回去喂僵尸鸡。',
    InitTrigger() {},
    getShadow(self) {
        let cssText;
        if (self.LivingArea === 2 && !oGd.$[self.R + '_' + self.C + '_0']) {
            cssText = `z-index:1;height:11px;width:84px;left:44px;top: 117px;background:url(${self.PicArr[self.WaterShadowGif]}) 0% 0% / 100% 100%;`;
        } else {
            cssText = `left:${self.width*0.5-48}px;top:${self.height-22}px;`;
        }
        return cssText;
    },
    BirthStyle_EleBody(self, id, EleBody) {
        if (self.LivingArea === 2 && !oGd.$[self.R + '_' + self.C + '_0']) {
            SetStyle(EleBody, {
                'top': 5,
                'clip': 'rect(0,auto, 120px, auto)',
            });
        }
    },
    PrivateBirth(self) {
        const id = self.id;
        self.isAttacking = false;
        if(oP.FlagZombies>0){
            oAudioManager.playAudio("eichhornia_spawn");
        }
        // 如果不是水生的话，重写攻击方法
        if (self.LivingArea !== 2) {
            self.ProduceTime = 26;
            self.HP = 1200;
            self.maxHP = 4800;
            self.LoopAttackTime = 100;
            self.X = GetX(self.C);
            self.getTriggerRange = self.getTriggerRange_Land;
            self.NormalAttack = self.NormalAttack_Land;
        }
        // 出生动画播放完成之后切回idle动画
        new Image().src = self.PicArr[self.IdleGif];
        oSym.addTask(100, () => {
            if (!$P[id]) return;
            self.EleBody.src = self.PicArr[self.IdleGif];
            CPlants.prototype.InitTrigger.apply(self, [self, id, self.R, self.C, self.AttackedLX, self.AttackedRX]);
        });
        // 其他地方的代码会改变ProduceTime，所以要等一等
        oSym.addTask(30, () => {
            oSym.addTask(self.ProduceTime * 100 + Math.random() * 30 - 15, function produce() {
                if ($P[id]) {
                    self.Reproduction(self);
                    oSym.addTask(self.ProduceTime * 100 + Math.random() * 30 - 15, produce);
                }
            });
        });
    },
    CheckCanGrow(R, C) {
        let data = [];
        for (let f = 0, _$ = oGd.$; f <= PKindUpperLimit; f++) {
            data.push(_$[R + "_" + C + "_" + f]);
        }
        return oEichhornia.prototype.CanGrow(data, R, C);        
    },
    Reproduction(self, times = 0) {
        let id = self.id;
        const multiply = (posArr) => {
            for (let pos of posArr) {
                let newPlant = CustomSpecial(oEichhornia, ...pos);
                newPlant.ProduceTime = self.ProduceTime + (posArr.length ** 2);
                newPlant.Attack = Math.max(self.Attack - Math.round((posArr.length + 0.3) ** 1.15 * 4), 40);
            }
        };
        const checkPos = (possiblePosArr) => {
            let ans = [];
            possiblePosArr.forEach(pos => {
                if (oGd.$GdType?.[pos[0]]?.[pos[1]] === 2 && self.CheckCanGrow(...pos)) {
                    ans.push(pos);
                }
            });
            return ans;
        };
        let posArr = checkPos([[self.R + 0, self.C + 1], [self.R + 1, self.C + 0], [self.R - 1, self.C + 0], [self.R + 0, self.C - 1]]);
        // 没有可以生成的位置就直接退出
        if (posArr.length <= 0) {
            return;
        }
        // 经过和挨炮的友好协商，现决定当水葫芦正在攻击时，不播放繁殖动画，直接生成
        if (self.isAttacking) {
            multiply(posArr);
        } else {
            self.isAttacking = true;
            oAudioManager.playAudio("eichhornia_multiply");
            self.EleBody.src = self.PicArr[self.MultiGif];
            oSym.addTask(50, () => {
                if (!$P[id]) return;
                // 因为是异步，所以需要再检查一遍可种植的位置
                posArr = checkPos(posArr);
                multiply(posArr);
            });
            oSym.addTask(157, () => {
                if (!$P[id]) return;
                self.isAttacking = false;
                self.EleBody.src = self.PicArr[self.IdleGif];
            });            
        }
    },
    CheckLoop(zid, direction) {
        let self = this;
        let pid = self.id;
        if ($P[pid]) {
            self.NormalAttack(zid);
            oSym.addTask(self.LoopAttackTime + Math.random() * 10 - 5, _ => {
                $P[pid] && self.AttackCheck1(zid, direction)
            });
        }
    },
    HitZombie(zombieTarget, self) {
        zombieTarget.getPea(zombieTarget, 0); //为了放出声音，所以假装攻击下
        zombieTarget.getHit2(zombieTarget, self.Attack);
    },
    NormalAttack(zid) {
        let self = this;
        let id = self.id;
        let zombieTarget = oZ.getRangeLeftZ(self.pixelLeft + self.beAttackedPointR, oS.W, self.R, true);
        if (!zombieTarget || self.isAttacking) return;
        // 标记攻击状态
        self.isAttacking = true;
        // 切动画到攻击状态
        self.EleBody.src = self.PicArr[self.AttackGif_Water];
        // 切回动画到待机状态
        oSym.addTask(135, _ => {
            if ($P[self.id]) {
                self.EleBody.src = self.PicArr[self.IdleGif];
                self.isAttacking = false;
            }
        });
        // 放出子弹
        oSym.addTask(43.3, _ => {
            oAudioManager.playAudio(self.AudioArr.slice(0, 2).random());
            CustomBullet(oEichhorniaBullet, null, self.pixelLeft + 30, self.pixelTop + 10, self.R, null, null, zombieTarget, self.Attack).OwnerPlant = self;
        });
    },
    NormalAttack_Land(zid) {
        const self = this;
        const X = self.X;
        const [MinX, MaxX] = self.getTriggerRange();
        const playAnim = (dir) => {
            self.isAttacking = true;
            self.EleBody.src = self.PicArr[self.AttackGif_Land];
            self.EleBody.style.transform = `rotateY(${dir ? 180 : 0}deg)`;
            oSym.addTask(100, () => {
                if ($P[self.id]) {
                    self.EleBody.src = self.PicArr[self.IdleGif];
                    self.EleBody.style.transform = `rotateY(0deg)`;
                    self.isAttacking = false;
                }
            });
        };
        if (self.isAttacking) {
            return;
        }
        let zombieTarget = oZ.getRangeLeftZ(self.pixelLeft + self.beAttackedPointR, oS.W, self.R, true);
        // 前面有僵尸就优先打前面
        if (zombieTarget && zombieTarget.AttackedLX > X) {
            let searchZombies = oZ.getArZ(X, MaxX, self.R);
            let len = searchZombies.length;
            playAnim(0);
            searchZombies.forEach(zombie => {
                if (zombie.Altitude === 1) {
                    //这里不能替换为self.Attack因为繁殖需要用
                    if (zombie.FreeSlowTime + zombie.FreeFreezeTime > 0) {
                        self.HP = Math.min(self.HP + Math.max(40 - len * 3, 10), self.maxHP);
                    }
                    zombie.getHit0(zombie, Math.ceil(Math.max(50 / len, 18)));
                }
            });
            return;
        }
        // 前面没僵尸尝试后面
        let searchZombies = oZ.getArZ(MinX, X, self.R);
        let len = searchZombies.length;
        if (len >= 0) {
            playAnim(1);
            searchZombies.forEach(zombie => {
                if (zombie.Altitude === 1) {
                    //这里不能替换为self.Attack因为繁殖需要用
                    if (zombie.FreeSlowTime + zombie.FreeFreezeTime > 0) {
                        self.HP = Math.min(self.HP + Math.max(40 - len * 3, 10), self.maxHP);
                    }
                    zombie.getHit0(zombie, Math.ceil(Math.max(50 / len, 18)));
                }
            });            
        }
    },
    getTriggerRange_Land() {
        return [[this.X - 100, this.X + 80, 1]];
    },
}),
//其他
oSquash=InheritO(oStoneFlower,{
    EName:"oSquash",
    CName:"窝瓜",
    StaticGif:1,
    NormalGif:2,
    AttackGif:3,
    DropGif:4,
    TurnGif:5,
    HP:10000,
    coolTime:20,
    Stat:0,
    SunNum:75,
    width:163,
    height:139,
    Tooltip:"窝瓜会杀死靠近他的第一个僵尸。",
    Story: "尽管人们看着窝瓜的脸总觉得窝瓜是不是内心窝了火，但实际上窝瓜非常希望与其他植物更好的相处，甚至有点过激了——他不分场合的向别人说自己只是面瘫，不管别人在聊什么话题；也毫无保留地向别人分享自己本名是小明，这种努力虽然收效甚微，但不算毫无回报——至少，在他将朋友作为生日礼物送给他的会喊出Squash来报时的时钟砸碎之前是这样。",
    HmmAudioNum:6,
    AudioArr:(function() {
        let arr = [];
        for(let i = 1;i<=6;i++){
            arr.push("squash_hmm"+i);
        }
        for(let i = 1;i<=5;i++){
            arr.push("squash_crash"+i);
        }
        return arr;
    })(),
    PicArr: (function() {
        let a = "images/Plants/Squash/Normal/";
        let b = "images/Plants/Squash/Smile/";
        return ["images/Card/Squash.webp",a + "static.webp", a + "idle.webp", a + "jump.webp",a+"squash.webp",a+"turn.webp", b + "idle.webp", b + "jump.webp",b+"squash.webp",b+"turn.webp"]
    })(),
    BirthStyle: (self, id, ele, style) => {
        if(Math.random()<0.33){
            self.NormalGif+=4;
            self.AttackGif+=4;
            self.DropGif+=4;
            self.TurnGif+=4;
            ele.childNodes[1].src=self.PicArr[self.NormalGif];
        }
        EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R]);
    },
    getTriggerRange: function(a, b, c) {
        return [[this.pixelLeft+this.width/2 - 150, this.pixelLeft+this.width/2 +  70, 0]]
    },
    TriggerCheck:CPlants.prototype.TriggerCheck,
    CheckLoop(zid, direction) {  //开始攻击，并且循环检查攻击条件1,2
        let self = this;
        let pid = self.id;
        if($P[pid]) {
            self.NormalAttack(zid);  //触发植物攻击，并传入触发者僵尸之id
            //oSym.addTask(140, _=>$P[pid] && self.AttackCheck1(zid, direction));            
        }
    },
    NormalAttack: function(zid) {
        let zombie = $Z[zid],
            self = this;
            if(zombie.ZX>self.pixelLeft+self.width/2){
                let arr = oZ.getArZ(self.pixelLeft+self.width/2, self.pixelLeft+self.width/2+200, self.R,z=>{
                    if(zombie.HP<=zombie.BreakPoint){
                        return false;
                    }
                    return true;
                });
                arr.sort((a,b)=>{
                    return a.ZX-b.ZX;
                });
                zombie = arr[0]||zombie;
            }
        let pid = self.id,
            ele = $(pid),
            body = ele.childNodes[1],
            shadow = ele.childNodes[0],
            oriX = self.pixelLeft,
            oriY = self.pixelTop,
            shadowRelativeX = Number.parseFloat(shadow.style.left),
            curX = 0,
            curY = 0,
            zombieX = (zombie.AttackedLX+zombie.AttackedRX)/2,
            zombieY = GetY(zombie.R)-self.height,
            jumpHeight = 150,
            ZR = zombie.R;
        ele.style.zIndex = Number(ele.style.zIndex)+1;
        if(zombieX<oriX+self.width/2){
            body.src = self.PicArr[self.TurnGif];
            oSym.addTask(77,startJump);
        }else{
            startJump();
        }
        function startJump(){
            let __tmpLastX__ = 0;
            function setDirection(deltaX){
                if(__tmpLastX__!==(deltaX=Math.sign(deltaX))&&deltaX!==0){
                    EditCompositeStyle({ 
                        ele: body,
                        delFuncs: ["rotateY"],
                        addFuncs: [["rotateY",-((__tmpLastX__ = deltaX)-1)*90+"deg"]],
                        option: 2
                    });
                }
            }
            SetStyle(ele,{
                zIndex:(self.zIndex+=2),
            });
            setDirection(zombieX-oriX-self.width/2);
            body.src = self.PicArr[self.AttackGif];
            self.Stat=1;
            oAudioManager.playAudio(self.AudioArr[Math.floor(Math.random()*self.HmmAudioNum)]);
            oSym.addTask(33,function loop(t=0){
                if(!$Z[zombie.id]&&t===0){
                    SetStyle(ele,{
                        zIndex:(self.zIndex-=2),
                    });
                    setDirection(1);
                    body.src = self.PicArr[self.NormalGif];
                    $P[self.id] && self.AttackCheck1(zombie.id);
                    return;
                }
                if(t>=45){
                    curX = zombieX + self.GetDX(self)-oriX;
                    curY = zombieY-jumpHeight-oriY;
                    SetStyle(body,{
                        left:curX+"px",
                        top:curY+"px",
                    });
                    SetStyle(shadow,{
                        left:curX+shadowRelativeX+"px",
                    });
                    attack();
                    return;
                }
                let time = (Math.sin((Math.Clamp(t,0,30)/30-0.5)*Math.PI)+1)/2;
                curX = Math.Lerp(oriX,zombieX + self.GetDX(self),time)-oriX;
                curY = Math.Lerp(oriY,zombieY-jumpHeight,1-(time-1)**2)-oriY;
                setDirection(zombieX+self.GetDX(self)-curX-oriX);
                SetStyle(body,{
                    left:curX+"px",
                    top:curY+"px",
                });
                SetStyle(shadow,{
                    left:curX+shadowRelativeX+"px",
                });
                if($Z[zid]){
                    zombieX = (zombie.AttackedLX+zombie.AttackedRX)/2;
                    zombieY = GetY(zombie.R)-self.height;
                    ZR=zombie.R;
                }
                if($User.LowPerformanceMode){
                    oSym.addTask(4,loop,[t+4]);
                }else{
                    oSym.addTask(2,loop,[t+2]);
                }
            });
        }
        function attack(){
            let checkX= self.pixelLeft+curX+self.width/2;
            let [R,C] = [ZR,GetC(checkX)];
            let tarTop = GetY(R)+self.GetDY(R, C, [], true)-self.height;
            body.src = self.PicArr[self.DropGif];
            (function loop(t=0){
                if(t>=20){
                    SetStyle(body,{
                        top:tarTop-oriY+"px",
                    });
                    oZ.getArZ(checkX-45, checkX+45, R).forEach(z=>{
                        z.getHit2(z,Math.round(500/z.ResistInsta));
                    });
                    oAudioManager.playAudio(self.AudioArr[Math.floor(Math.random()*(self.AudioArr.length-self.HmmAudioNum))+self.HmmAudioNum]);
                    if(oGd.$GdType[R][C]!=2){
                        oEffects.ScreenShake();
                    }
                    self.Die("JNG_TICKET_Squash");
                    return;
                }
                curY = Math.Lerp(zombieY-jumpHeight,tarTop,(t/20)**2)-oriY;
                SetStyle(body,{
                    top:curY+"px",
                });
                if($User.LowPerformanceMode){
                    oSym.addTask(4,loop,[t+4]);
                }else{
                    oSym.addTask(2,loop,[t+2]);
                }
            })();
        }
    },    
    Die: function(ticket) {
        var self = this,
        c = self.id;
        if(self.Stat===1&&!['JNG_TICKET_SuperPower', 'JNG_TICKET_Squash'].includes(ticket)){
            return;
        }
        self.oTrigger && oT.delP(self);
        self.HP = 0;
        delete $P[c];
        delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
        if(ticket==="JNG_TICKET_Squash"){
            oSym.addTask(50,()=>{
                ClearChild($(c));
                IsHttpEnvi && self.RemoveDynamicPic(self);
            });
        }else{
            ClearChild($(c));
            IsHttpEnvi && self.RemoveDynamicPic(self);
        }
        self.PrivateDie(self);
    },
}),
//一些道具
oFlowerPot = InheritO(oLilyPad, {
    EName: "oFlowerPot",
    CName: "花盆",
    width: 82,
    height: 58,
    beAttackedPointR: 52,
    SunNum: 25,
    Stature:0,
    Tooltip: "花盆允许你在复杂地形中种植植物。",
    Story: "很多人都认为他不是一株植物。但是呢，事实证明他就是一棵植物。据说花盆先辈盆敬明在他的有生之年，还创作了《盆时代》、《盆迹》等著名影视作品，受到了许多脑残粉的一致好评。",
    HP: 1000,
    PicArr: ["images/Card/FlowerPot.webp", "images/Plants/FlowerPot/FlowerPot.png", "images/Plants/FlowerPot/FlowerPot.png"],
    CanGrow(plantArgs, R, C) {
        let flatCoord = R + "_" + C;
        return oGd.$GdType[R][C]!=2&&!(!oGd.$GdType[R][C] || C < 1 || C > 9 || plantArgs[1] || plantArgs[2] || plantArgs[0] || oGd.$LockingGrid[flatCoord]);
    },
    PrivateBirth(self) {
        if(oGd.$GdType[self.R][self.C]===1){
            let ps = function(name,ach,type="成就"){
                if($User.Achievement[ach]){
                    return;
                }
                PlaySubtitle(`解锁${type}：${name}`);
                oSym.addTask(500,function(){
                    PlaySubtitle();
                });
                DataManager.SetAchievement(ach,1);
            };
            ps("真是个陶艺家，邻居！","The_oFlowerPot_Egg");
        }
    },
}),
oLight = InheritO(CPlants, {
    EName: "oLight",
    CName: "特殊道具-日光灯",
    SunNum: 0,
    canEat: 0,
    coolTime: 40,
    width: 71,
    height: 71,
    Immediately:true,
    FlyingPlant:false,
    beAttackedPointR: 51,
    PicArr: (function() {
        var a = "images/Props/Light/";
        return ["images/Card/Light.webp", a + "p.gif", a + "Light.gif"]
    })(),
    Tooltip: "日光灯可以为你一次性提供300阳光!",
    Story:"在暗无天日的沼泽，一个日光灯是极好的照明用具，尽管它没有任何装置给它供电，也明显违反了能量定律，但它很好用。",
    GetDY: function(b, c, a) {
        return - 30
    },
    InitTrigger: function() {},
    PrivateBirth: function(a) {
        oSym.addTask(40,
        function(b) {
            var e = $P[b],
            c,
            d,
            f;
            e && (d = e.R, f = e.C, e.Die(), oS.StaticCard && AppearSun(GetX(f) - (Math.random() * 41), GetY(d), 300, 0))
        },
        [a.id])
    }
}),
oLightCS = InheritO(oLight, {
     coolTime: 7.5
}),
olSPCase = InheritO(CPlants, {  //保护膜实例
    EName: "olSPCase",
    width: 67,
    height: 87,
    beAttackedPointL: 15,
    beAttackedPointR: 60,
    PKind: 4,
    HP: Infinity,
    zIndex: 2,
    Tools:true,
	getShadow: () => "display:none",
    GetDBottom: () => 72,
    CanGrow(data, R, C) {
        let flatCoord = `${R}_${C}`;
        //如果当前格为草坪（或有花盆容器）且未越界，那么判定当前格[1]位置（常规植物）的情况
        //如果当前格存在不可铲除的障碍物，不允许种植；否则即刻种植
        if((oGd.$GdType[R][C] === 1  || (oGd.$GdType[R][C]===2&&oGd.$WaterDepth[R][C]===0) || data[0]) && !(C < 1 || C > 9 || oGd.$LockingGrid[flatCoord])) {
            return data[1] ? data[1].isPlant : true;
        }
    },
    BirthStyle(self, id, ele, style) {
        ele.childNodes[1].src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAABIBAMAAABVf/vRAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAASUExURdbW2MjJy+fo6UxpcdXV1svLzT6ksp4AAAAGdFJOU8zMzAA8imZsnvsAAAHySURBVEjHvZXNTuswEEa/seh+LGBv5QluVboH2u5Bun7/V2H+7DghrRAInC7SOT4zY7tpcLg18AV6Pp/m0NP8DYeny9s0FejYVWDSUZBrrSehz5MH5JqHzuV7oS/wcAJSClgsl1MJt/lBE0Zq4dKpq0afMeBQ00BZwkWzI31yX+0uJW0pjar1/OoTkXrHQdFpQtER0Chh4UptgyXKBjVZ7RR5jfKibvGt0vYSCWtuiq4QiylaFOzrLVFW60p2y8xg7+pf7yrZB5KLFDqNPTe7aG/WUnMnoGPV5SIZWFHL6ztBxLyksWydYnDt9kFZrjUt7UYghsw0t91c4OFK5pzV7ZRoTZurufiqG+fFS8q87TKRUJoz6+q7TOZKJ0HtvG66ubctSca6Es/6WwlMo7vvbtTOSnWuU4JBO1NmAXlwNaeeiZgSkyq2VdHzXgKSyib4jGyZgbvuKrakWiRcp5njO6uTHceK9qRtWCd5vtMlmkst4PXiXtxdd9eDZHd3S3eBydzjJuXIfLzieuZj9s254uYfufiBSzdd+mM3KNPWGTE3ik2XjMJ+vuu6TvexGf4ItGGPk9JZ04eosXBfeFXO3k/6oNIJh/et88v2N6x0a7XaF6B0DNX6X1+v5/OlSrzTx1oXL2F7Dwu9+PRvv9l/g34AN7WqFkcqQWsAAAAASUVORK5CYII=';
        EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R]);
    },
	PrivateBirth(self) {
      oSym.addTask(1500, () => {
            const o = $P[self.id];
            o && o.Die('JNG_TICKET_lSPCase');
        });
    },
    InitTrigger() {},
    Die(ticket) {
        const list = new Set(['JNG_TICKET_lSPCase',"JNG_TICKET_ThiefZombie", 'JNG_TICKET_ShovelPlant', 'JNG_TICKET_IceStorm','JNG_TICKET_Gargantuar','JNG_TICKET_MakeRifterZombie',"JNG_TICKET_SuperPower"]);
        if(list.has(ticket)) {  //只有接收到特定标示才会死亡
            CPlants.prototype.Die.call(this);
        }
    },
}),
oBatStaff = InheritO(oKiwibeast, {
    EName: "oBatStaff",
    CName: "特殊道具-蝙蝠法杖",
    coolTime: 45,
    canEat: 1,
    Attack: 5,
    width: 110,
    height: 118,
    Tools:true, //cannot be transformed by oMembraneZombie
    HP: 300,
    getHurt:CPlants.prototype.getHurt,
    getShadow: self => `left:10px;top:100px;`,
    AudioArr: ["bats","Artichoke_Attack"],
    PicArr: (function() {
        var a = "images/Props/BatStaff/";
        return ["images/Card/Light.webp", a + "BatStaff.webp", a + "BatStaff.webp", a + "bats.webp"]
    })(),
    Tooltip: "9*3范围内的植物和僵尸血量减半，无视盔甲与限击盾牌。使5*3范围内所有僵尸减速及受持续伤害。Boss不受影响。不能被铲子移除。",
    PrivateBirth(self) {
        self.EleBody = $(self.id).childNodes[1];
        self.EleBody.src = self.PicArr[1];
        oAudioManager.playAudio("bats");
        //RANGE: 9x3
        let num=0;
        for (let row=(self.R-1>0?self.R-1:1); row<=(self.R+1<6?self.R+1:5); row++) {
            for (let col=self.C-4; col<=self.C+4; col++) {
                oEffects.ImgSpriter({
                    ele: NewEle(self.id+'_Exhaust', "div", `pointer-events:none;position:absolute;z-index:${self.zIndex-1};width:255px;height:216px;left:${self.pixelLeft+(col-self.C-1)*80}px;top:${self.pixelTop+(row-self.R)*80-30}px;background:url(images/Zombies/BeetleCarZombie/Exhaust.png) no-repeat;`, 0, EDPZ),
                    changeValue: -255,
                    frameNum: 58,
                });
                //bats only appear in 5x3 and cannot appear outside the lawn
                if (col>=self.C-2 && col<=self.C+2 && col>0 && col<10) {
                    let ele = NewImg(self.id+'_bats'+num, self.PicArr[3], `left:${self.pixelLeft+(col-self.C)*80-10}px;top:${self.pixelTop+(row-self.R)*100+45}px;opacity:0;transform:scale(1.25);z-index:${self.zIndex};`, EDPZ);
                    oEffects.Animate(ele, {
                        opacity: 1,
                    }, 0.3);
                    num++;
                }
            }
            let leftborder = self.pixelLeft-400,
                rightborder = self.pixelRight+400;
            let ArrZ=oZ.getArZ(leftborder,rightborder,row);
            for (var zom of ArrZ) {
                let half=Math.round((zom.HP-zom.BreakPoint)/2);
                if (!zom.isPuppet && zom.ResistInsta<1) {
                    if (zom.HP-half>=zom.BreakPoint+1) zom.HP-=half;
                }
            }
        }
        for (let plant of hasPlants(false, v => v.C<=self.C+4 && v.C>=self.C-4 && v.R>=self.R-1 && v.R<=self.R+1 && v.EName!== 'oBatStaff' && v.EName !== 'oBrains' && v.EName !== 'oLawnCleaner' && v.HP > 1 && v.isPlant && v.PKind === 1)) {
            let half=Math.round(plant.HP/2);
            if (plant.HP-half>=1) plant.HP-=half;
        }
    },
    //TRIGGERRANGE: 5x3 (Cannot appear outside lawn)
    getTriggerRange() {
        let X = GetX(this.C),
        MinX = this.MinX = X - 180,
        MaxX = this.MaxX = X + 180;
        return [[Math.max(GetX(1)+20,MinX), Math.min(GetX(9)-20,MaxX), 0]];
    },
    getTriggerR(R) {
        let MinR = this.MinR = R > 1 ? R - 1 : 1,
        MaxR = this.MaxR = R < oS.R ? R + 1 : oS.R;
        return [MinR, MaxR];
    },
    CheckLoop(zid, direction) {  //开始攻击，并且循环检查攻击条件1,2
        let self = this;
        let pid = self.id;
        if($P[pid]) {
            self.NormalAttack(zid);  //触发植物攻击，并传入触发者僵尸之id
            oSym.addTask(70, _=>$P[pid] && self.AttackCheck1(zid, direction));            
        }
    }, 
    NormalAttack() {
        let o = this, MaxR = o.MaxR, MinX = o.MinX, MaxX = o.MaxX,
        id = o.id, Attack = o.Attack;
        oSym.addTask(130, _=>{
            if($P[id]) {
                o.AttackEffect(o.pixelLeft, o.pixelTop);
                for (let _R = o.MinR; _R <= MaxR; _R++) {  //遍历所有有效行,查询所有进入触发范围的僵尸并攻击
                    oZ.getArZ(MinX, MaxX, _R).forEach(zombie=>{
                        if (!zombie.isPuppet && zombie.ResistInsta<1) {
                            zombie.getVertigo(zombie, o.Attack, 0);
                            oAudioManager.playAudio("Artichoke_Attack");
                        }
                    });
                }
            }
        });
    },
    AttackEffect(left, top) {},
    Die: function(ticket=undefined) {
        if (ticket == 'JNG_TICKET_ShovelPlant') {
            SetAlpha($(this.id).childNodes[1],1);
            return;
        }
        var self = this,
        c = self.id;
        for (let t=0; t<15; t++) {
            if($(c+'_bats'+t)) {
                oEffects.Animate($(c+'_bats'+t), {
                    opacity: 0,
                }, 0.3);
            }
        }
        self.oTrigger && oT.delP(self);
        self.HP = 0;
        delete $P[c];
        delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
        ClearChild($(c));
        IsHttpEnvi && self.RemoveDynamicPic(self);
    },
}),
o8BitApple = InheritO(oStoneFlower,{
    EName:"o8BitApple",
    HP:700,
    Attack:15,
    width:82,
    height:106,
    PKind:4,
    FlyingPlant:true,
    Tools:true,
    getShadow:_=>{return "display:none"},
    BirthStyle(self, id, ele, style) {
        style.opacity=0.5;
        style.zIndex++;
        EditEle(ele, {id, 'data-jng-constructor': self.EName,}, style, oZombieLayerManager.$Containers[self.R]);
    },
    PicArr:(function() {
        let a = "images/Plants/Macintosh/";
        return ["", a+"Little_Born.webp", a + "Little_Normal.webp",a+"Little_Attack.webp",a+"Little_Die.webp"]
    })(),
    AudioArr:["8BitAppleAttack","8BitAppleSummon","8BitAppleDie"],
    NormalAttack: function(zid) {
        oAudioManager.playAudio("8BitAppleAttack");
        let zombie = $Z[zid],
             o = this,
             pid = o.id;
        !o.isAttacking && ($(pid).childNodes[1].src = o.PicArr[3], o.isAttacking = 1, oSym.addTask(128, function fun(){
            if($P[pid]) {
                o.ArZ.length < 1 ? ($(pid).childNodes[1].src = o.PicArr[2], o.isAttacking = 0) : oSym.addTask(128, fun);
            }
        }));
        zombie.getHit2(zombie, o.Attack, 0);
    },
    GetDX: self => -Math.floor(self.width * 0.5)-10,
    GetDY: (R, C, arg) => 0,
    GetDBottom: function() {
        return 50;
    },
    PrivateBirth(self) {
        self.ArZ={};
        self.EleBody = $(self.id).childNodes[1];
        self.EleBody.src = self.PicArr[1];
        oAudioManager.playAudio("8BitAppleSummon");
        oSym.addTask(79,function(){
            $P[self.id]&&(self.EleBody.src = self.PicArr[self.isAttacking?3:2]);
        });
    },
    Die(ticket) {
        let self = this,
        c = self.id;
        self.oTrigger && oT.delP(self);
        self.HP = 0;
        delete $P[c];
        delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
        self.PrivateDie(self);
        self.EleBody.src = self.PicArr[4];
        oAudioManager.playAudio("8BitAppleDie");
        oSym.addTask(100,function(){
            let id = self.id, zombies = oZ.getArZ(self.pixelLeft-40, self.pixelRight + 80, self.R);
            zombies.forEach(zombie=>zombie.Altitude < 2 && zombie.getHit1(zombie, self.Attack*8, 0));
        });
        oSym.addTask(154,function(){
            ClearChild($(c));
            IsHttpEnvi && self.RemoveDynamicPic(self);
        });
    },
    getTriggerRange: function(a, b, c) {
        return [[this.pixelLeft - 80, this.pixelRight + 80, 0]]
    },
    TriggerCheck: function(i, h) {
        var c = i.id,
        g = this.ArZ,
        a, b, e, f;
        i.PZ && g && !g[c] && (a = i.AttackedLX, b = i.AttackedRX, e = this.AttackedLX, f = this.AttackedRX, a <= f && a >= e || b <= f && b >= e || a <= e && b >= f) && this.AttackCheck2(i) && (
            g[c] = 1,  //把当前僵尸标注为已检查过
            this.NormalAttack(c),
            oSym.addTask(100, function(d, j) {
                var k = $P[d];
                k && delete k.ArZ[j];
            }, [this.id, c])
        );
    },
    CanGrow(data, R, C) {
        let flatCoord = `${R}_${C}`;
        //如果当前格为草坪（或有花盆容器）且未越界，那么判定当前格[1]位置（常规植物）的情况
        //如果当前格存在不可铲除的障碍物，不允许种植；否则即刻种植
        if((oGd.$GdType[R][C] === 1|| (oGd.$GdType[R][C]===2&&oGd.$WaterDepth[R][C]===0) || data[0]) && !(C < 1 || C > 9 || oGd.$LockingGrid[flatCoord])) {
            return data[1] ? data[1].isPlant : true;
        }
    },
}),
oLSP = InheritO(CPlants, {
    EName: "oLSP",
    CName: "特殊道具-液态保护膜",
    width: 216,
    height: 164,
    beAttackedPointL: 60,
    beAttackedPointR: 130,
    SunNum: 0,
    coolTime: 20,
    PKind: 4,
    Immediately:true,
    PicArr: ["images/Card/LSP.webp", "images/Props/LSP/LSP.gif?useDynamicPic=false"],
    Tooltip: "液态保护膜可以为你提供3x3的保护!",
    Story: "那么问题来了，包装膜算是植物吗？--答案是肯定的：不是。这种包装膜效果低廉，过一段时间就会脱落。",
    CanGrow: olSPCase.prototype.CanGrow,
    BirthStyle(self, id, ele, style) {
        ele.childNodes[1].src = self.PicArr[1];
        EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, oZombieLayerManager.$Containers[self.R]);
    },
    Check(R, C) {
        let data = [];
        for(let pkind = 0, G = oGd.$; pkind <= PKindUpperLimit; pkind++) {
            data.push(G[R + "_" + C + "_" + pkind]);
        }
        return olSPCase.prototype.CanGrow(data, R, C);
    },
    PrivateBirth(self) {
        let R = self.R;
        let C = self.C;
        let R2 = Math.min(R + 1, oS.R);
        let C2 = Math.min(C + 1, oS.C);
        for (let R1 = Math.max(R - 1, 0); R1 <= R2; R1++) {
            for (let C1 = Math.max(C - 1, 0); C1 <= C2; C1++) {
                self.Check(R1, C1) && requestAnimationFrame(()=>CustomSpecial(olSPCase, R1, C1));
            }
        }
        self.Die();
    },
}),
//常用的障碍物及傀儡
oApple = InheritO(CPlants, {
    EName: "oApple",
    CName: "挨炮",
    HP: 500,
    width: 155,
    height: 130,
    beAttackedPointL: 63,
    beAttackedPointR: 75,
    NormalGif: 1,
    AudioArr: ["Rifter_Summon1", "Rifter_Summon2"],
    PicArr: ["images/Card/Apple.webp", "images/Plants/Apple/Apple.webp"],
    InitTrigger: function() {},
    PrivateBirth(self) {
        if (self.LivingArea === 2 && !oGd.$[self.R + '_' + self.C + '_0']) {
            const effect = NewImg(self.id + '_splash', null, `left:${GetX(self.C)-69}px;top:${GetY(self.R)-146}px;width:145px;height:176px;z-index:${self.R * 3 + 1}`, EDPZ);
            effect.src = oDynamicPic.require(WaterSplashImg,effect);
            oSym.addTask(50, () => {oAudioManager.playAudio("Rifter_Summon" + [1,2].random()).volume = 0.5;});
            oSym.addTask(113, ClearChild, [effect]);
            self.Die();
            return;
        }
    }
}),
oObstacle = InheritO(CPlants, {  //占位障碍物
    EName: "oObstacle",
    isPlant: false,
    canEat: false,
    Stature: -1,//占位障碍物没有高度
    HP: 1,
    zIndex: 0,
    width: 40,
    Tools:true,
    beAttackedPointL: 0,
    beAttackedPointR: 10,
    Die: function(){},
    InitTrigger: function() {},
    getShadow: function(a) {return "display:none"},
}),
oObstacle2 = InheritO(oObstacle, {  //啃食监视障碍物 高度为低矮
    EName: "oObstacle2",
    canEat: 1,
    PKind: 0,
    Die: CPlants.prototype.Die
}), 
oObstacle3 = InheritO(oObstacle, {  //挡子弹障碍物
    EName: "oObstacle3",
    canEat: 0,
    zIndex: 0,
    Stature: 0,//挡子弹障碍物的高度应该和正常植物一样
    PrivateBirth: function(c) {
        var a = c.R,
        b = c.C;
        oGd.$Obstacle[a + "_" + b] = c.id;
    },
    InitTrigger: function() {},
    PrivateDie: function(c) {
        var a = c.R,
        b = c.C;
        delete oGd.$Obstacle[a + "_" + b];
    }
}),
oInvisibleFlowerPot = InheritO(oFlowerPot, {
    EName: "oInvisibleFlowerPot",
    CName: "隐形花盆",
    PicArr: ["", "", BlankPNG],
    canEat: 0,
    isPlant: 0,
    Tools:true,
    Die: ()=>{},
    getShadow: function(a) {return "display:none"},
}),
oMissile = InheritO(oLight, {
    EName: "oMissile",
    width: 53,
    height: 104,
    zIndex: 3,  //防止导弹掉落时被其他植物遮住
    coolTime: 0,
    canEat: 0,
    Tools:true,
    isPlant: 0,
    PicArr: (function() {
        let a = "images/Props/Missile/";
        return ["", "", a + "Missile.webp?useDynamicPic=false", 'images/Zombies/Boom.png'];
    })(),
    Birth: function(x, y, R, C) {
        let self = this, pixelTop, pixelLeft, targetTop;
        let id = self.id = "P_" + Math.random();
        let zIndex = self.zIndex += 3 * R;
        let ele = NewEle(0, "div", "position:absolute;");
        self.pixelLeft = pixelLeft = x + self.GetDX(self),
        self.pixelTop = pixelTop = 0 - self.height;
        self.targetTop = targetTop = y - 15 - self.height;
        self.R = R;
        self.C= C;
        NewImg(0, self.PicArr[self.NormalGif], "", ele);
        EditEle(ele, {id: id}, {left: pixelLeft + "px", top: pixelTop + "px", zIndex}, EDPZ);
        $P[id] = self;
        const callback = _=>{
            self.PrivateBirth(self, id, ele, pixelTop, targetTop)
            removeEventListenerRecord('jng-event-startgame', callback);
        }
        oS.isStartGame===1 ? callback() : addEventListenerRecord('jng-event-startgame', callback);
        return self;
    },
    Boom: function(obj) {
        oAudioManager.playAudio("ZombieBoom");
        let gd = oGd.$, key = obj.R + "_" + obj.C + "_", plant;
        for(let pkind = 0; pkind < 4; pkind++) {
            (plant = gd[key+pkind]) && plant.Die();
        }
		oEffects.ScreenShake();
        oEffects.ImgSpriter({
            ele: NewEle(obj.id+'_Boom', "div", `position:absolute;overflow:hidden;z-index:${obj.zIndex};width:196px;height:259px;left:${obj.pixelLeft - 78}px;top:${obj.pixelTop - 120}px;background:url(images/Zombies/Boom.png) no-repeat;`, 0, EDPZ),
            styleProperty: 'X',
            changeValue: -196,
            frameNum: 19,
            interval: 9,
        });
    },
    PrivateBirth: function(obj, id, ele, pixelTop, targetTop) {
        let cv = 1;
        (function move() {
            pixelTop < targetTop ? $P[id] && (
                ele.style.top = (pixelTop = obj.pixelTop = pixelTop + (cv++)) + 'px',
                oSym.addTask(1, move)
            ) : $P[id] && (
                oGd.add(obj, obj.R + "_" + obj.C + "_" + obj.PKind),
                obj.Boom(obj)
            );
        })();
    },
}),
oSummonZombieObs = InheritO(CPlants, {
    EName: "oSummonZombieObs",
    CName: "力量瓷砖",
    width: 61,
    height: 78,
    beAttackedPointL: 1,
    beAttackedPointR: 60,
    canEat: 0,
	isPlant: 0,
    Stature: -1,//高度为低矮
    zIndex: -1,
    Tools:true,
    Die: ()=>{},
    getShadow: ()=>'display:none',
    AudioArr: ["zombieobs"],
    PicArr: ["images/Props/MarshOrgan/SummonZombieObstacle.webp?useDynamicPic=false"],
    BirthStyle(self, id, wrap, styles) {
        let ele = wrap.childNodes[1];
        ele.src = this.PicArr[0];
        ele.style.clip = "rect(0,auto,76px,0)";
        ele.style.height = "156px";
        styles.zIndex = this.zIndex = this.zIndex_cont = 0;
        EditEle(wrap, {
            id,
            'data-jng-constructor': self.EName
        }, styles, EDPZ);
    },
    PrivateBirth: function(o) {
        o.ArZ = {};  //在实例上创建僵尸列表
        NewImg(o.id + "_Light", o.PicArr[0], `clip: rect(78px,auto,auto,auto); top: -81px; left: -2.5px; opacity: 0;`, $(o.id));  //初始化发光特效
    },
	NormalAttack : function(id) {
        let o = this;
        let zombie = $Z[id];
        if(!o.ArZ[id]&&!zombie.isPuppet&&zombie.Speed>0) {  //如果没有在僵尸列表里查询到该僵尸
	    	const r = o.R;
	    	const c = o.C;
            o.MyEffect(o);
	   	    PlaceZombie(oZombie, r, c);
	        oSym.addTask(30, PlaceZombie, [oConeheadZombie, r, c]);
	        oSym.addTask(60, PlaceZombie, [oBucketheadZombie, r, c]);
            o.ArZ[id] = true;
        }
	},
    MyEffect: function(o) {
        oAudioManager.playAudio("zombieobs");
        oEffects.Animate($(o.id + "_Light"), {
            opacity: 1,
        }, 0.3 / oSym.NowSpeed);
        oSym.addTask(100, () => {
            oEffects.Animate($(o.id + "_Light"), {
                opacity: 0,
            }, 0.3 / oSym.NowSpeed);
        });
    },
    getTriggerRange: function(a, b, c) {
        return [[this.pixelLeft + 40, this.pixelRight + 40, 0]]
    },
    TriggerCheck: function(i, h) {
        var c = i.id,
        g = this.ArZ,
        a, b, e, f;
        i.PZ && !g[c] && (a = i.AttackedLX, b = i.AttackedRX, e = this.AttackedLX, f = this.AttackedRX, a <= f && a >= e || b <= f && b >= e || a <= e && b >= f) && this.AttackCheck2(i) && this.NormalAttack(c);
    },
    AttackCheck2: function(a) {  //触发特殊条件检查器
        return a.Altitude == 1 && a.beAttacked;
    },
}),
oZombiePlusBloodObs = InheritO(oSummonZombieObs, {
	EName : "oZombiePlusBloodObs",
	CName : "生命瓷砖",
	Tooltip : "僵尸加100血",
	PicArr: ["images/Props/MarshOrgan/ZombiePlusBloodObs.webp?useDynamicPic=false"],
	NormalAttack : function(id, a) {
		let zombie = $Z[id],
	    o = this;
        if(!o.ArZ[id]&&!zombie.isPuppet&&zombie.Speed>0) {
            o.MyEffect(o);
            zombie.HP+=Number.parseInt(Math.random()*75)+126;
		    o.ArZ[id]=true;
		}
	},
	GetDY : function(b, c, a) {
		return -2
	},
	getTriggerRange : function(a, b, c) {
		return [[this.pixelLeft-40, this.pixelRight + 40, 0]]
	},
}),
oZombieComeOnObs = InheritO(oSummonZombieObs, {
	EName : "oZombieComeOnObs",
	CName : "加速瓷砖",
	Tooltip : "僵尸前进1.5格",
	PicArr: ["images/Props/MarshOrgan/ZombieComeOnObs.webp?useDynamicPic=false"],
	NormalAttack : function(id, a) {
		let zombie = $Z[id],
	    o = this;
        if(!o.ArZ[id]&&!zombie.isPuppet&&zombie.Speed>0) {
            o.MyEffect(o);
            zombie.OSpeed = zombie['__proto__'].Speed;
			zombie.OAttack = zombie['__proto__'].Attack;
		    zombie.Speed = zombie.Speed+0.3;
			zombie.Attack = zombie.Attack+300;
			oSym.addTask(300, ()=>{
               o.ArZ[id]=true;
               zombie.Speed = zombie.OSpeed;
			   zombie.Attack = zombie.OAttack;
            });
		}
	},
	GetDY : function(b, c, a) {
		return -2
	},
	getTriggerRange : function(a, b, c) {
		return [[this.pixelLeft-40, this.pixelRight + 40, 0]]
	},
}),
oRifter = InheritO(oObstacle, {  //冰窟
    EName: "oRifter",
    CName:"冰窟",
    height: 80,
    width: 90,
    beAttackedPointL: 63,
    beAttackedPointR: 75,
    Die: function(ticket){
        if(ticket==="JNG_TICKET_SuperPower"){
            this._Die();
        }
    },
    _Die: function() {
        let self = this;
        let c = self.id;
        let R = self.R;
        let C = self.C;
        self.oTrigger && oT.delP(self);
        self.HP = 0;
        delete $P[c];
        delete oGd.$[R + "_" + C + "_" + self.PKind];
        delete oGd.$Rifter[R + "_" + C];
        oGd.unlockGrid(R, C);
        ClearChild($(c));
        IsHttpEnvi && self.RemoveDynamicPic(self);
    },
    InitTrigger: function() {},
    getShadow: ()=>"display:none",
    PicArr: function() {
        let arr = [];
        for(let j = 1; j < 3; j++) {
            for(let i = 1; i < 5; i++) {
                arr.push(`images/Props/Rifter/${i}${j%2 ? 'dark' : ''}.png`);
            }            
        }
        return arr;
    }(),
    Birth(X, Y, R, C, plantsArg, isTyped=false) { //最后一个参数是生成冰块动画使用的
        let self = this,
        id = "P_" + Math.random(),
        pixelLeft = X + self.GetDX(self),  //默认植物相对于FightingScene左侧的距离=格子中点坐标-0.5*植物图像宽度
        pixelTop = Y + self.GetDY(R, C, plantsArg) - self.height,  //默认植物顶部相对于FS顶部的距离=格子中点坐标+底座偏移-植物身高
        ele = NewEle(null, "div", "position:absolute;");
        self.id = id;
        self.pixelLeft = pixelLeft;
        self.pixelRight = pixelLeft + self.width;
        self.pixelTop = pixelTop;
        self.pixelBottom = pixelTop + self.GetDBottom(self);  //默认植物底部相对距离=pt+植物身高
        $P[id] = self;  //在植物池中注册
        NewEle(`${id}_Shadow`, 'div', self.getShadow(self), {className: 'Shadow'}, ele);  //绘制植物影子
        NewImg(0, `images/Props/Rifter/${isTyped!==false?isTyped:(1 + Math.round(Math.random()*3))}${oS.DKind ? '' : 'dark'}.png`, 'clip:rect(auto, 80px, auto, auto);', ele);
        self.InitTrigger(self, id,
            self.R = R,
            self.C = C,
            self.AttackedLX = pixelLeft + self.beAttackedPointL,  //植物左检测点
            self.AttackedRX = pixelLeft + self.beAttackedPointR  //植物右检测点
        );
        self.BirthStyle(self, id, ele, {
            left: pixelLeft + "px",
            top: pixelTop + "px",
        });
        oGd.add(self, `${R}_${C}_${self.PKind}`);  //在场景注册
        oGd.$Rifter[R + "_" + C] = true;
        oGd.$LockingGrid[R + "_" + C] = true;  //锁住该格子，让墓碑生成的时候绕开
        //只有在游戏关卡开始后privatebirth才会执行
        let callback = _=> {
            const PrivateBirth = self.PrivateBirth;
            if($P[id]) {
                PrivateBirth && PrivateBirth.call(self, self);
                removeEventListenerRecord('jng-event-startgame', callback);
            }
        };
        oS.isStartGame===1 ? callback() : addEventListenerRecord('jng-event-startgame', callback);
        return self;
    },
    BirthStyle(self, id, ele, style) {
        style.zIndex = self.zIndex = self.zIndex_cont = 0;
        EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, EDPZ);
    },
    PrivateBirth({id}) {
        let img = $(id).children[1];
	    oSym.addTask(9000, _=>{
            if($P[id]) {
                img.style.left = `-80px`;
		        img.style.clip = `rect(auto, 160px, auto, 80px)`;  //切换样式         
		    	oSym.addTask(9000, _=>$P[id] && this._Die());                
            }
		});
    },
    getHurt: () => {},
}),
oRifterAnimate = InheritO(oObstacle, {  //冰窟
    EName: "oRifterAnimate",
    height: 80,
    width: 90,
    beAttackedPointL: 63,
    beAttackedPointR: 75,
    PKind: 2,
    HP:Infinity,
    EffectGif: 0,
    InitTrigger: function() {},
    getShadow: ()=>"display:none",
    CanGrow: function(c, b, d) {
        let a = b + "_" + d;
        return c[2] ? 1 : oGd.$GdType[b][d] == 1 ? !(d < 1 || d > 9) && (c[1] ? c[1].isPlant : true) : c[0];
    },
    PicArr: function() {
        let arr = ['images/Plants/Begonia/Frozen.webp'];
        for(let j = 1; j < 3; j++) {
            for(let i = 1; i < 5; i++) {
                arr.push(`images/Props/Rifter/${i}${j%2 ? 'dark' : ''}.png`);
            }            
        }
        return arr;
    }(),
    Die:CPlants.prototype.Die,
    iceType:0,
    GoDie:false,
    Pepper:true,
    Birth(X, Y, R, C, plantsArg) {  //植物初始化方法
        let self = this,
        id = "P_" + Math.random(),
        pixelLeft = X + self.GetDX(self),  //默认植物相对于FightingScene左侧的距离=格子中点坐标-0.5*植物图像宽度
        pixelTop = Y + self.GetDY(R, C, plantsArg) - self.height,  //默认植物顶部相对于FS顶部的距离=格子中点坐标+底座偏移-植物身高
        ele = NewEle(null, "div", "position:absolute;");
        self.id = id;
        self.pixelLeft = pixelLeft;
        self.pixelRight = pixelLeft + self.width;
        self.pixelTop = pixelTop;
        self.pixelBottom = pixelTop + self.GetDBottom(self);  //默认植物底部相对距离=pt+植物身高
        $P[id] = self;  //在植物池中注册
        NewEle(`${id}_Shadow`, 'div', self.getShadow(self), {className: 'Shadow'}, ele);  //绘制植物影子
        NewImg(0, `images/Props/Rifter/${self.iceType=1 + Math.round(Math.random()*3)}${oS.DKind ? '' : 'dark'}.png`, 'opacity:0.6;left:-80px;clip:rect(auto, 160px, auto, 80px);', ele);
        self.InitTrigger(self, id,
            self.R = R,
            self.C = C,
            self.AttackedLX = pixelLeft + self.beAttackedPointL,  //植物左检测点
            self.AttackedRX = pixelLeft + self.beAttackedPointR  //植物右检测点
        );
        self.BirthStyle(self, id, ele, {
            left: pixelLeft + "px",
            top: pixelTop + "px",
        });
        if((self.Pepper&&oGd.$[`${R}_${C}_3`])||oGd.$Crater[R + '_' + C]||(oGd.$[`${R}_${C}_1`]&&(!oGd.$[`${R}_${C}_1`].isPlant))){
            self.GoDie  = true;
        }else{
            oGd.add(self, `${R}_${C}_${self.PKind}`);  //在场景注册
        }
        //只有在游戏关卡开始后privatebirth才会执行
        let callback = _=> {
            const PrivateBirth = self.PrivateBirth;
            if($P[id]) {
                PrivateBirth && PrivateBirth.call(self, self);
                removeEventListenerRecord('jng-event-startgame', callback);
            }
        };
        oS.isStartGame===1 ? callback() : addEventListenerRecord('jng-event-startgame', callback);
        return self;
    },
    BirthStyle(self, id, ele, style) {
        style.zIndex = self.zIndex = self.zIndex_cont = 0;
        EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, EDPZ);
    },
    audioTimes:[0,376,376,295,188,206,206,271,222],
    PrivateBirth({id}) {
        let img = $(id).children[1];
        let self = this;
        if(self.GoDie){
            self.Die();
            return;
        }
        (function Stage(num=0){
            let cas;
            let Audioname = `Rifter_break${cas=Math.floor(Math.random()*3)+1+num*3}`;
            let audio = oAudioManager.playAudio(Audioname);
            oSym.addTask((self.audioTimes[cas]+Math.floor(Math.random()*100)-50),_=>{
                if($P[id]) {
                    if(!num){
                        img.style.opacity="0.9";
                        oAudioManager.pauseAudio(audio);
                        Stage(1);
                    }else{
                        let obj = self,hasP;
                        let effect = NewImg(`${obj.id}_Frozen`, obj.PicArr[obj.EffectGif], `position:absolute;z-index:${obj.R * 3 + 2};width:198px;height:113px;left:${obj.pixelLeft-65}px;top:${obj.pixelTop}px;`, EDPZ);
                        oSym.addTask(50, ClearChild, [effect]);
                        if((hasP=oGd.$[`${self.R}_${self.C}_1`])){
                            oAudioManager.playAudio(`Rifter_Summon1`);
                            if(oGd.$[`${self.R}_${self.C}_1`].EName!="oBegonia"){
                                oEffects.ImgSpriter({
                                    ele: NewEle(`${obj.id}_Drop`, "div", `position:absolute;overflow:hidden;z-index:${obj.R * 3 + 2};width:150px;height:184px;left:${obj.pixelLeft-30}px;top:${obj.pixelTop-60}px;transform:scale(1.3);background:url(images/Props/Rifter/Drop_Water.png) no-repeat`, 0, EDPZ),
                                    styleProperty: 'X',
                                    changeValue: -150,
                                    frameNum: 37,
                                    interval: 3,
                                });
                            }
                        }else{
                            oAudioManager.playAudio(`Rifter_Summon2`);
                        }
                        if((hasP&&oGd.$[`${self.R}_${self.C}_1`].EName!="oBegonia")||!hasP){
                            oGd.killAll(self.R, self.C);
                            new oRifter().Birth(GetX(self.C), GetY(self.R), self.R, self.C, [],self.iceType);
                        }else if(hasP){
                            hasP.Die();
                        }
                        let audio_break1 = oAudioManager.playAudio(`Rifter_break1`);
                        oSym.addTask(100,oAudioManager.pauseAudio,[audio_break1]);
                        self.Die();
                    }              
                }
            }); 
        })();
    }
}),
oLavaFloor = InheritO(oInvisibleFlowerPot, {
        EName: "oLavaFloor",
        HP: Infinity,
        zIndex: 0,
        InitTrigger: function() {},
        width: 85,
        height: 31,
        Die: CPlants.prototype.Die,
        beAttackedPointL: 10,
        beAttackedPointR: 75,
        getShadow: function(a) {
            return "display:none"
        },
        PrivateBirth(self) {
            (function Burn() {
                let {
                    R,
                    C,
                    id
                } = self;
                for (let plant of $P) plant.C == self.C && plant.R == self.R && plant.getHurt && plant.getHurt(null, 0, 60);
                oSym.addTask(300, Burn);
            })();
        },
}),
oGoUpIce = InheritO(oSummonZombieObs, {
    EName: "oGoUpIce",
    CName: "向上浮冰",
    Tooltip: "向上浮冰，僵尸向上",
    CantGo: 1,
    height: 80,
    width: 80,
    UserBirth: 0,
    EleBody: null,
    NormalGif: 0,
    StaticGif: 0,
    PicArr: ["images/Props/GoIce/2.webp?useDynamicPic=false", "images/Props/GoIce/1.webp?useDynamicPic=false"],
    PrivateBirth: function(d, dd = $(d.id)) {
        d.ArZ = {}; //在实例上创建僵尸列表
        d.AnotherBirth && (d.AnotherBirth(d));
        dd.style.zIndex = "1";
        d.EleBody = dd.childNodes[1];
        d.EleBody2 = d.EleBody.cloneNode(false);
        d.EleBody2.src = d.PicArr[1];
        EditEle(d.EleBody2, {}, {
            "opacity": "0"
        }, dd);
    },
    BirthStyle(self, id, wrap, styles) {
        let ele = wrap.childNodes[1];
        ele.src = this.PicArr[0];
        ele.style.clip = "rect(0,auto,81px,0)";
        ele.style.height = "81px";
        styles.zIndex = this.zIndex = this.zIndex_cont = 0;
        EditEle(wrap, {
            id,
            'data-jng-constructor': self.EName
        }, styles, EDPZ);
    },
    SetBrightness: _ => {},
    MoveZombie: function(id, zombie) {
        oZ.moveTo(id, zombie.R, zombie.R - 1);
        return zombie.R;
    },
    NormalAttack: function(id, a) {
        let zombie = $Z[id],
            o = this;
        if (zombie.R != o.CantGo && zombie.AKind != 2 && oGd.$Crater[o.R + '_' + o.C] != 1) {
            oAudioManager.playAudio("IceButtonTouch");
            const zombieDOM = zombie.Ele;
            const selfBody = o.EleBody2;
            let newR = o.MoveZombie(id, zombie);
            let newTop = zombie.pixelTop = GetY(newR) - zombie.height + zombie.GetDY();
            let newIndex = newTop + zombie.height;
            // 播放地砖自身的动画
            oEffects.Animate(selfBody, {
                opacity: 1,
            }, 0.2 / oSym.NowSpeed);
            // 移动僵尸
            oZombieLayerManager.$Containers[newR].append(zombieDOM);
            oEffects.Animate(zombieDOM, {
                top: `${zombie.pixelTop}px`,
                zIndex: newIndex,
            }, 0.4 / oSym.NowSpeed, 'ease', _ => {
                zombie.pixelTop = newTop;
                zombie.zIndex = 3 * newR + 1;
                zombie.zIndex_cont = newIndex;
                oEffects.Animate(selfBody, {
                    opacity: 0,
                }, 0.2 / oSym.NowSpeed);
            });
            (o.UseBirth && o.AnotherBirth) && (o.AnotherBirth(o));
        }
    },
    GetDY: function(b, c, a) {
        return -2
    },
    getTriggerRange: function(a, b, c) {
        return [
            [this.pixelLeft - 20, this.pixelRight - 28, 0]
        ]
    },
}),
oGoDownIce = InheritO(oGoUpIce, {
    EName : "oGoDownIce",
    CName : "向下浮冰",
    Tooltip : "向下浮冰，僵尸向下",
    CantGo:5,
    height:80,
    PicArr:["images/Props/GoIce/4.webp?useDynamicPic=false","images/Props/GoIce/3.webp?useDynamicPic=false"],
    MoveZombie:function(id,zombie){
        oZ.moveTo(id, zombie.R, zombie.R+1);
        return zombie.R;
    },
}),
oRandomIce = InheritO(oGoUpIce, {
    EName : "oRandomIce",
    CName : "随机浮冰",
    Tooltip:"随便走",
    Type:1,//0向上，1向下
    CantGo:1,
    UseBirth:1,
    height:100,
    PicArr:["images/Props/GoIce/5.webp?useDynamicPic=false","images/Props/GoIce/6.webp?useDynamicPic=false"],
    AnotherBirth:function(o){
        o.Type = o.R==oS.R?0:(o.R==1?1:Number.parseInt(Math.random()*2));
        o.CantGo = o.Rand*4+1;
        o.First = o.Type;
    },
    MoveZombie:function(id,zombie){
        let s = this;
        if(s.Type){
            oZ.moveTo(id, zombie.R, zombie.R+1);
        }else{
            oZ.moveTo(id, zombie.R, zombie.R-1);
        }
        return zombie.R;
    },
}),
oGoDown = InheritO(oStoneFlower, {
    EName: "oGoDown",
    CName: "僵尸向下走",
    width: 85,
    height: 1,
    Tools:true,
    Stature: -1,
    canEat: 0,
    isPlant: 0,
    ArZ: {},
    getShadow: ()=>"display:none",
    HP: 1,
    PicArr: ["", "", BlankPNG],
    IfTurnPossible(zombie){
        return true;
    },
    TriggerCheck(zombie) {
        if(zombie.FangXiang !== 'GoDown'&&this.IfTurnPossible(zombie)) {
            zombie.ChkActs = zombie.GoDown;
            zombie.FangXiang = 'GoDown';
        }
    },
    getTriggerRange(R, LX, RX) {
        return [[GetX(this.C) - 50, GetX(this.C)-40, 0]]
    },
    Die: ()=>{},
}),
oGoDownFixed = InheritO(oGoDown, {
    EName: "oGoUpFixed",
    CName: "僵尸向下走，适用于从左向右的僵尸",    
    getTriggerRange(R, LX, RX) {
        return [[GetX(this.C)+30, GetX(this.C)+35, 0]]
    },
}),
oGoUp = InheritO(oGoDown, {
    EName: "oGoUp",
    CName: "僵尸向上走，适用于从右向左的僵尸",    
    TriggerCheck(zombie) {
        if(zombie.FangXiang !== 'GoUp'&&this.IfTurnPossible(zombie)) {
            zombie.ChkActs = zombie.GoUp;
            zombie.FangXiang = 'GoUp';
        }
    },
}),
oGoUpFixed = InheritO(oGoUp, {
    EName: "oGoUpFixed",
    CName: "僵尸向上走，适用于从左向右的僵尸",    
    getTriggerRange(R, LX, RX) {
        return [[GetX(this.C)+30, GetX(this.C)+35, 0]]
    },
}),
oGoUp2 = InheritO(oGoUp, {
    EName: "oGoUp2",
    TriggerCheck(zombie) {
        if(zombie.FangXiang !== 'GoUp' && Math.random() < 0.5 && this.IfTurnPossible(zombie)) {
            zombie.ChkActs = zombie.GoUp;
            zombie.FangXiang = 'GoUp';
        }
    },
}),
oGoLeft = InheritO(oGoDown, {
    EName: "oGoLeft",
    CName: "僵尸向左走",
    TriggerCheck(zombie) {
        if(zombie.FangXiang !== 'GoLeft'&&this.IfTurnPossible(zombie)) {
            zombie.ChkActs = zombie.GoLeft;
            zombie.YiZengjia = 0;
            zombie.FangXiang = 'GoLeft';  //完成标记
            zombie.WalkDirection = 0;
            zombie.EleBody['style']['transform'] = 'rotateY(0deg)';
            zombie.EleBody['style']['transform-origin'] = `0px 0px`;
        }
    },
}),
oGoLeftFixed = InheritO(oGoLeft, {
    EName: "oGoLeft",
    CName: "僵尸向左走，适用于从左向右的僵尸",
    getTriggerRange(R, LX, RX) {
        return [[GetX(this.C)+30, GetX(this.C)+35, 0]]
    },
}),
oGoRight = InheritO(oGoDown, {
    EName: "oGoRight",
    CName: "僵尸向右走",
    TriggerCheck(zombie) {
        if(zombie.FangXiang !== 'GoRight'&&this.IfTurnPossible(zombie)) {
            zombie.ChkActs = zombie.GoRight;
            zombie.YiZengjia = 0;
            zombie.FangXiang = 'GoRight';
            zombie.WalkDirection = 1;
            zombie.EleBody['style']['transform'] = 'rotateY(180deg)';  //切换方向
            zombie.EleBody['style']['transform-origin'] = `${(zombie.beAttackedPointL+zombie.beAttackedPointR)/2}px 0px`;
        }
    },
}),
oGoRightFixed = InheritO(oGoRight, {
    EName: "oGoRight",
    CName: "僵尸向右走，适用于从左向右的僵尸",
    getTriggerRange(R, LX, RX) {
        return [[GetX(this.C)+30, GetX(this.C)+35, 0]]
    },
}),
oVase = InheritO(oObstacle,{
    EName:"oVase",
    height:112,
    width:140,
    ImgStyle:{"display":"none"},
    WaterGif:5,
    Stature:0,//高度为普通
    getShadow: self => `left:${self.width*0.5-48}px;top:${self.height-22}px;`,
    CardEle:null,
    Ele:null,
    EleBody:null,
    EleShadow:null,
    EleClickArea:null,
    EleCard:null,
    getHurt(zombie, AKind, Attack) {
        const o = this, id = o.id, ele = $(id).childNodes[1];
        o.SetBrightness(o, ele, 1);
        oSym.addTask(10, _=>$P[id] && o.SetBrightness(o, ele, 0));
        if(AKind===2){
            o.Die("JNG_TICKET_BREAKVASE");
        }else{
            !(AKind % 3) ? (o.HP -= Attack) < 1 && o.Die() : o.Die();  //针对不同的僵尸承受不同的攻击
        }
    },
    Die(ticket){
        let self = this,
        c = self.id;
        if(new Set(["JNG_TICKET_BREAKVASE","JNG_TICKET_Sculpture"]).has(ticket)&&self === $P[c]){//如果是这两种令其死亡，且罐子存在，则破坏罐子
            self.Break_Vase(self);
        }
        const list = new Set(['JNG_TICKET_VASE',"JNG_TICKET_SuperPower"]);
        if(!list.has(ticket)) {  //只有接收到特定标示才会死亡
            return;
        }
        self.oTrigger && oT.delP(self);
        self.HP = 0;
        ClearChild(self.EleClickArea);//确保删除点击框成功
        delete $P[c];
        if(oGd.$[self.R + "_" + self.C + "_" + self.PKind]==self){
            delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
        }
        ClearChild($(c));
        self.PrivateDie(self);
        IsHttpEnvi && self.RemoveDynamicPic(self);
    },
    beAttackedPointL:30,
    XRaying:0,
    setCardAttempt:null,
    getCardStyle:function(type){
        let self = this;
        return [
            //植物卡牌
            `pointer-events:none;clip:rect(auto,auto,60px,auto);position:absolute;height:120px;width:100px;top:30px;left:${self.beAttackedPointL-10}px;z-index:4;transform:scale(0.75);`,
            //僵尸卡牌
            `pointer-events:none;position:absolute;height:83px;width:112px;top:30px;left:${self.beAttackedPointL-15}px;z-index:4;transform:scale(0.7);`,
        ][type];
    },
    PicArr: (function(){
        let arr = ["",""];
        for(let i = 0;i<3;i++){
            arr.push("images/Props/Vase_Breaker/Vase_Q"+i+".webp");
        }
        arr.push(WaterShadowImg);
        return arr;
    })(),
    Update(){
        let self=this;
        let {R,C} = self;
        let flag = 0;
        for(let i = -1;i<2;i++){
            for(let j = -1;j<2;j++){
                if(oGd.$[`${R+i}_${C+j}_1`]&&oGd.$[`${R+i}_${C+j}_1`].EName=="oPlantern"){
                    flag=1;break;
                }
            }
        }
        flag!=self.XRaying&&self.XRay(flag);
    },
    configs:{type:null,pic:null,obj:null},
    Birth(X, Y, R, C, plantsArg) {  //植物初始化方法
        let self = this,
        id = "P_" + Math.random(),
        pixelLeft = X + self.GetDX(self),  //默认植物相对于FightingScene左侧的距离=格子中点坐标-0.5*植物图像宽度
        pixelTop = Y + self.GetDY(R, C, plantsArg, true) - self.height,  //默认植物顶部相对于FS顶部的距离=格子中点坐标+底座偏移-植物身高
        ele = NewEle(null, "div", "position:absolute;");
        self.Ele = ele;
        self.id = id;
        self.pixelLeft = pixelLeft;
        self.pixelRight = pixelLeft + self.width;
        self.pixelTop = pixelTop;
        self.pixelBottom = pixelTop + self.GetDBottom(self);  //默认植物底部相对距离=pt+植物身高
        self.zIndex_cont = self.zIndex + GetMidY(R) + 30;
        self.zIndex += 3 * R;
        self.PicArr = self.PicArr.map(pic => oDynamicPic.checkOriginalURL(pic) ? oDynamicPic.require(pic, null, true) : oURL.removeParam(pic, "useDynamicPic"));
        IsHttpEnvi && ele.addEventListener("DOMNodeRemoved", (event) => {
            if (event.target === ele) {
                setTimeout(self.RemoveDynamicPic.bind(self), 1);
            }
        });
        $P[id] = self;  //在植物池中注册
        self.EleShadow = NewEle(`${id}_Shadow`, 'div', self.getShadow(self,R,C), {className: 'Shadow'}, ele);  //绘制植物影子
        self.EleBody=NewImg(0, self.PicArr[self.NormalGif], null, ele);  //绘制植物本体
        self.InitTrigger(self, id,
            self.R = R,
            self.C = C,
            self.AttackedLX = pixelLeft + self.beAttackedPointL,  //植物左检测点
            self.AttackedRX = pixelLeft + self.beAttackedPointR  //植物右检测点
        );
        self.BirthStyle(self, id, ele, Object.assign({
            left: pixelLeft + "px",
            top: pixelTop + "px",
            zIndex: self.zIndex_cont,
        }, self.ImgStyle));
        self.EleBodyXRay = self.EleBody.cloneNode(false);
        self.EleBodyXRay.src = self.PicArr[3];
        self.EleCard = NewEle("vase_showCard"+Math.random(),"img",`opacity:0`,{},self.Ele);
        oGd.add(self, `${R}_${C}_${self.PKind}`);  //在场景注册
        //只有在游戏关卡开始后privatebirth才会执行
        let callback = _=> {
            const PrivateBirth = self.PrivateBirth;
            if($P[id]) {
                PrivateBirth && PrivateBirth.call(self, self);
            }
        };
        callback();
        return self;
    },
    PrivateBirth: function(self) {
        SetBlock(self.Ele);
        self.FallDown(self,callback);
        function callback(){
            self.EleClickArea=NewEle("clicking"+Math.random(),"div",`cursor:pointer;opacity:0;position:absolute;height:80px;width:70px;top:${self.pixelTop+30}px;left:${self.pixelLeft+self.beAttackedPointL+5}px;background:blue;z-index:30;`,{},EDPZ);
            self.EleClickArea.addEventListener("click",function(){
                oS.isStartGame===1&&self.Break_Vase(self);
            });
            //console.log(self);
            //self.EleBody.style="";
            EditEle(self.EleBodyXRay,{},{cssText:self.EleBody.style.cssText+"opacity:0;"},self.Ele);
            self.setCardAttempt&&self.setCardAttempt();
            self.XRaying==1&&self.XRay(1);
        }
    },
    XRay(turnOn){
        let self=this;
        let aimOpacity = turnOn*1;
        self.XRaying = aimOpacity;
        if(!self.EleClickArea){
            return;
        }
        oEffects.Animate(self.EleBodyXRay,{
            opacity:aimOpacity,
        },0.5/oSym.NowSpeed);
        oEffects.Animate(self.EleCard,{
            opacity:aimOpacity
        },0.5/oSym.NowSpeed);
    },
    Break_Vase(self){
        oEffects.ImgSpriter({
            ele: NewEle(`${self.id}_Break`, "div", `position:absolute;overflow:hidden;z-index:${self.zIndex};width:141px;height:136px;left:${self.pixelLeft}px;top:${self.pixelTop}px;background:url(images/Props/Vase_Breaker/Pop_Effect.webp) no-repeat`, 0, EDPZ),
            styleProperty: 'X',
            changeValue: -141,
            frameNum: 18,
            interval: 3,
        });
        oAudioManager.playAudio("vase");
        delete $P[self.id];
        delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
        ClearChild(self.EleClickArea);
        ClearChild(self.EleCard);
        ClearChild(self.EleBodyXRay);
        self.EleBody.src = oDynamicPic.require(self.PicArr[4],self.EleBody);
        self.PlaceThing(self,self.configs.type,self.configs.obj);
        oSym.addTask(160,function(){
            self.Die("JNG_TICKET_VASE");
        });
    },
    PlaceThing(self,type,obj){
        switch(type){
            case 0:
                ThrowACard(obj,[GetX(self.C)-50,GetY(self.R)-100],false,{
                    delta:30,
                    vy:-4,
                });
            break;
            case 1:
                let z = PlaceZombie(obj,self.R,self.C,0,1);
                let pro = obj.prototype;
                if(pro.height>=200||pro.beAttackedPointR-pro.beAttackedPointL>=150){
                    z.Altitude = 3;
                    (function f(){
                        let oriT = z.EleBody.style.transform,oriTOri = z.EleBody.style.transformOrigin;
                        z.EleBody.style.transform="scale(0) " + oriT;
                        z.EleBody.style.transformOrigin = "center bottom";
                        oEffects.Animate(z.EleBody,{
                            transform:"scale(1) "+oriT,
                        },0.3/oSym.NowSpeed,false,function(){
                            z.Altitude = 1;
                            z.EleBody.style.transform = oriT;
                            z.EleBody.style.transformOrigin = oriTOri;
                        });
                    })();
                }
            break;
        }
    },
    SetCard(config={}){
        let self = this;
        let pro = config.obj.prototype;
        self.EleClickArea ? callback() : (self.setCardAttempt=callback);
        function callback(){
            self.configs = config;
            self.EleCard.src = !config.type?pro.PicArr[pro.CardGif]:"images/Card/"+pro.EName.substring(1).split("_")[0]+".webp";
            self.EleCard.style = self.getCardStyle(config.type)+"opacity:0;";
            self.XRay(self.XRaying);
        }
    },
    FallDown:function(self,callback){
        let oy=-Number.parseFloat(self.Ele.style.top)-self.height;
        let nowY=oy;
        let vy = 20;
        let ay = 5;
        let times = 0;
        let random = "throw"+["","2"].random();
        let AudioDom = oAudioManager.playAudio(random);
        ((dom) => {
            dom.currentTime = 0.1;
        })(AudioDom);
        (function loop(){
            if(times<1){
                SetStyle(self.EleBody,{
                    position:"relative",
                    top:nowY+"px",
                    transform:"scaleY(1.1) scaleX("+(0.8-0.3*(1-nowY/oy))+")",
                });
                EditCompositeStyle({ ele: self.EleShadow, delFuncs: ["scale"], addFuncs: [["scale", 0.5*(1-nowY/oy)]], option: 2 });
            }
            if(nowY<0){
                nowY+=vy+=ay;
                oSym.addTask(3,loop);
            }else if(nowY>0){
                if(times>=1){
                    nowY = 0;
                    return;
                }
                nowY = 0;
                vy = -3;
                ay=0.8;
                nowY+=vy+=ay;
                times++;
                stop();
                oSym.addTask(3,loop);
            }
        })();
        function stop(){
            let nowRY = 1;
            let vRY = -0.18;
            let aRY = 0.04;
            let t = 2*Math.abs(vRY/aRY);
            let nowRX = 0.5;
            let nowVX = 0.225;
            let nowAX = 0.002;
            let flag = false;
            let nowSc = 0.5;
            let deltaSc = (1-nowSc)/(t/5);
            let deltaY = 0;
            if(oGd.$GdType[self.R][self.C]===2){
                self.EleShadow.style.cssText+=`background:url(${self.PicArr[self.WaterGif]});height:91px;width:260.5px;background-size:100% 100%;z-index:300;`;
                EditCompositeStyle({ ele: self.EleShadow, addFuncs: [["translate","-87.25px,-25px"]], option: 2 });
                SetStyle(self.EleBody,{
                    position:"absolute",
                    clip:`rect(0,auto,${self.height-15}px,0)`
                });
                deltaY = 15;
            }else{
                SetStyle(self.EleBody,{
                    position:"absolute",
                });
            }
            (function loop(){
                SetStyle(self.EleBody,{
                    transform:"scaleY("+(nowRY)+") scaleX("+(nowRX)+")",
                    top:((1-nowRY)*self.height/2+nowY)+deltaY+"px",
                });
                EditCompositeStyle({ ele: self.EleShadow, delFuncs: ["scale"], addFuncs: [["scale",nowSc]], option: 2 });
                nowRY+=vRY+=aRY;
                nowRX+=nowVX+=nowAX;
                nowRX = Math.min(nowRX,1);
                nowRY = Math.min(nowRY,1);
                nowSc=Math.min(deltaSc+nowSc,1);
                if(nowRY!=1||nowRX!=1||nowSc!=1||nowY!=0){
                    oSym.addTask(1,loop);
                }else{
                    SetStyle(self.EleBody,{
                        transform:"",
                        top:deltaY+"px",
                    });
                    EditCompositeStyle({ ele: self.EleShadow, delFuncs: ["scale"], option: 2 });
                    callback&&callback();
                }
            })();
        }
    },
}),
oVaseP = InheritO(oVase,{
    EName:"oVaseP",
    PicArr: (function(){
        let arr = ["",""];
        for(let i = 0;i<3;i++){
            arr.push("images/Props/Vase_Breaker/Vase_P"+i+".webp");
        }
        arr.push(WaterShadowImg);
        return arr;
    })(),
}),
oVaseZ = InheritO(oVase,{
    EName:"oVaseZ",
    PicArr: (function(){
        let arr = ["",""];
        for(let i = 0;i<3;i++){
            arr.push("images/Props/Vase_Breaker/Vase_Z"+i+".webp");
        }
        arr.push(WaterShadowImg);
        return arr;
    })(),
}),
oTrafficLight=InheritO(oElecTurnip,{
    EName:"oTrafficLight",
    PKind:0,
    HP:Infinity,
    isPlant:0,
    Tools:true,//是否为道具
    Tooltip:"红绿灯",
    ColorsGif:[1,2,3],
    getShadow: _ => `left: 5px;top: 100px;`,
    //ZombieStop:{},
    color:2,
    zIndex:-1,
    height:125,
    width:80,
    autoChangeTime:-1,
    PicArr: ["images/Card/AbutilonHybriden.webp", "images/Props/TrafficLight/red.png", "images/Props/TrafficLight/green.png","images/Props/TrafficLight/close.png"],
    PrivateBirth(self) {
        let {R, C, id} = self;
        delete oGd.$TrafficLights[R + "_" + C]; 
        //self.ZombieStop = {};
        oGd.$TrafficLights[R + "_" + C] = id;
        self.AutoChangeColor();
        self.ChangeColorPic();
    },
    AutoChangeColor(){//默认不启用
        let self = this;
        function loop(){
            if(!$P[self.id]||self.autoChangeTime<=0){
                return;
            }
            self.color!==2&&self.SetColor(self.color^1,self);
            oSym.addTask(self.autoChangeTime+Math.random()*self.autoChangeTime/3-self.autoChangeTime/6,loop);
        }
        loop();
    },
    Die(ticket = "NONE_TICKET") {
        let self = this;
        let id = self.id;
        const list = new Set(['JNG_TICKET_MakeRifterZombie', 'JNG_TICKET_CigarZombie', 'JNG_TICKET_Gargantuar', 'JNG_TICKET_Sculpture', 'JNG_TICKET_Tombstone', 'JNG_TICKET_IceStorm']);
        if(!list.has(ticket)) {
            self.SetColor(2,self);
            self.oTrigger && oT.delP(self);
            self.HP = 0;
            delete $P[id];
            delete oGd.$TrafficLights[self.R + "_" + self.C]; 
            delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
            ClearChild($(id));
            IsHttpEnvi && self.RemoveDynamicPic(self);
        }
    },
    ChangeColorPic(){
        let self = this;
        let dom = $(self.id);
        oSym.addTask(Math.random()*100+10,function loop(){
            if(!$P[self.id]){
                return;
            }
            dom.childNodes[1].src = self.PicArr[self.ColorsGif[2]];
            oSym.addTask(10,_=>{
                if(!$P[self.id]){
                    return;
                }
                dom.childNodes[1].src = self.PicArr[self.ColorsGif[self.color]];
            });
            if(Math.random()<0.1){
                oSym.addTask(Math.random()*50+20,loop);
            }else{
                oSym.addTask(Math.random()*1500+300,loop);
            }
        });
    },
    SetColor(color,_self=null){
        let self = _self;
        if(!_self){
            self = this;
        }
        self.color = color;
        oS.isStartGame===1 ? st() : addEventListenerRecord('jng-event-startgame', st);
        function st(){
            if(oS.HaveFog){
                if(color!==2){
                    oFog.update(self.R, self.C, 1, 1, 0);
                }else{
                    oFog.update(self.R, self.C, 1, 1, 1);
                }
            }
            removeEventListenerRecord('jng-event-startgame', st);
        }
        $(self.id).childNodes[1].src = self.PicArr[self.ColorsGif[color]];
        self.Func(self);
    },
    Func(self){
        switch(self.color){
            case 0:
                self.StopLoop(self);
            break;
            case 1:
                self.ExciteLoop(self);
            break;
        }
    },
    StopLoop(self){
        if($P[self.id]&&self.color===0){
            let id = self.id;
            let R = self.R,
            floorR = R > 1 ? R - 1 : 1,
            ceilingR = R < oS.R ? R + 1 : oS.R,
            leftBorder = self.pixelLeft,
            rightBorder = self.pixelRight + 90;
            floorR = ceilingR = R;
            do {
                oZ.getArZ(leftBorder, rightBorder-Math.abs(R-floorR)*40, floorR).forEach(zombie=>{
                    zombie.getStatic({
                        type: "TrafficLight",
                        time: 230,
                        callback(self) {
                            if (self.isNotStaticed() && !self.isGoingDie) {
                                self.isAttacking === 1 && self.JudgeAttack();                        
                            }
                        },
                    });
                });
            } while (floorR++ < ceilingR);
            oSym.addTask(230,self.StopLoop.bind(self),[self]);
        }
    },
    ExciteLoop(self){
        if($P[self.id]&&self.color===1){
            let id = self.id;
            let R = self.R,
            floorR = R > 1 ? R - 1 : 1,
            ceilingR = R < oS.R ? R + 1 : oS.R,
            leftBorder = self.pixelLeft,
            rightBorder = self.pixelRight + 90;
            floorR = ceilingR = R;
            do {
                oZ.getArZ(leftBorder, rightBorder-Math.abs(R-floorR)*40, floorR).forEach(zombie=>{
                    if(!zombie.isPuppet){
                        if(zombie.Speed<3 && zombie.EName=="oGargantuar"){
                            zombie.getExcited(1.4,230-Math.abs(R-floorR)*40);
                        }else if(zombie.Speed<5.5 && zombie.EName!="oSculptorZombie"){
                            zombie.getExcited(1.4,230-Math.abs(R-floorR)*40);
                        }else if (zombie.Speed<0.8 && zombie.EName=="oSculptorZombie"){
                            zombie.getExcited(1.3,600-Math.abs(R-floorR)*40);
                        }else if (zombie.EName!="oSculptorZombie"){
                            if (zombie.EName=="oGargantuar") {
                                zombie.Speed=3;
                            } else {
                                zombie.Speed=5.5;
                            }
                            zombie.getExcited(1,230-Math.abs(R-floorR)*40);
                        }
                    }
                });
            } while (floorR++ < ceilingR);
            oSym.addTask(230,self.ExciteLoop.bind(self),[self]);
        }
    },
}),
oFruitBasket = InheritO(oObstacle3, {  
    PicArr: ["","","images/Props/Terrains/FruitBasket.png","images/Props/Terrains/EmptyFruitBasket.png"],
    EmptyGif:3,
    height:76,
    width:90,
    HasFruits:true,
}),
oHeatFloor = InheritO(oSpikeweed, {
    EName: "oHeatFloor",
    HP: Infinity,
    isPlant: 0,
    zIndex: 0,
    PicArr: ["", "", "", BlankPNG],
    Attack: 20,
    PKind: 0,
    Tools: true,
    getShadow: function(a) {
        return "display:none"
    },
    PrivateBirth: function(o) {
        let bcheck = 1;
        (function HeatBurn() {
            if (bcheck == 1) {
                for (let plant of $P) plant.C == o.C && plant.R == o.R && plant.getHurt && !plant.Tools && plant.getHurt(null, 0, 45);
                oSym.addTask(700, HeatBurn);
            }
        })();
        o.ArZ = {};
        let z = oZ.getArZ(o.AttackedLX, o.AttackedRX, o.R, (Z) => {
            return Z.AKind === 2;
        });
        oSym.addTask(3600, _ => {
            o.Die();
            bcheck = 0;
        });
    },
    NormalAttack: function(zid) {
        oAudioManager.playAudio("ignite");
        let zombie = $Z[zid],
            o = this,
            pid = o.id;
        !o.isAttacking && ($(pid).childNodes[1].src = o.PicArr[3], o.isAttacking = 1, oSym.addTask(50, function fun() {
            if ($P[pid]) {
                o.ArZ.length < 1 ? ($(pid).childNodes[1].src = o.PicArr[2], o.isAttacking = 0) : oSym.addTask(50, fun);
            }
        }));
        zombie.getFirePea(zombie, o.Attack, 0);
    },
}),
//僵尸公敌
oIBrains = InheritO(oBrains, {
    EName: "oIBrains",
    CName: "脑子",
    width: 32,
    height: 40,
    NormalGif: 0,
    isPlant:0,
    Tools:true,
    PicArr: (function() {
        return ["images/Plants/Brain.webp"]
    })(),
    getShadow: self => `left:-15px;top:23px;`,
    PrivateDie: _=>{},
}),
oIZombie=InheritO(oImitater, {
    EName:'oIZombie',
    CName: "普通僵尸",
    isPlant: 0,
    PKind: 5,
    width: 200,
    height: 150,
    SunNum: 25,
    coolTime: 1,
    Obj:"oZombie",
    Tooltip: "一只普通的僵尸。",
    PicArr: (function() {
        return ["images/Card/IZombie.webp", "images/Zombies/Zombie/1.webp", "images/Card/Zombie.webp"]
    })(),
    CanGrow(data, R, C) {	
        let flatCoord = `${R}_${C}`;
        let self = this;
        // 当前格被锁定,且不是雕像、冰块等可以被攻击的障碍物，则一票否决
        if (
            oGd.$LockingGrid[flatCoord]
            && ((!oGd.$Crystal[flatCoord]
            && !oGd.$Sculpture[flatCoord]
            && !oGd.$IceBlock[flatCoord])
            || oGd.$Crater[flatCoord])
        ) {
            return false;
        }
        // 假定植物直接种植的情形
        if (
            (
                oGd.$GdType[R][C] === 1  // 要确保植物种在可种植的草坪
                || self.FlyingPlant  // 飞行植物忽略地形
            )
            && oGd.$GdType[R][C] !== 0  // 荒地强制禁止种植植物
        ) {
            return (
                !(
                    C < 1 || C > 9  // 要确保植物种在可种植列以内
                    || data[self.PKind]  // 要确保当前格没有相同种类植物
                ) && (!data[1] || data[1].isPlant)  // 要确保当前格没有「植物假扮的」障碍物
            );
        } 
    },
    PrivateBirth: function() {
        let self=this;
        let z = PlaceZombie(window[self.Obj], self.R, self.C, 0);
        if(z?.IZombieMode===false){
            z.IZombieMode=true;
        }
        self.Die();
    }
}),
oICaskZombie=InheritO(oIZombie, {
    EName:'oICaskZombie',
    CName: "酒桶僵尸",
    SunNum: 100,
    coolTime: 5,
    Tooltip: "当酒桶被破坏时加速。 ",
    Obj:"oCaskZombie",
    PicArr: (function() {
        return ["images/Card/ICaskZombie.webp", "images/Zombies/CaskZombie/1.webp", "images/Card/CaskZombie.webp"]
    })(),
}),
oIConeheadZombie=InheritO(oIZombie, {
    EName:'oIConeheadZombie',
    CName: "路障僵尸",
    SunNum: 75,
    coolTime: 3,
    Obj:"oConeheadZombie",
    Tooltip: "有着一般的防御。",
    PicArr: (function() {
        return ["images/Card/IConeheadZombie.webp", "images/Zombies/ConeheadZombie/1.webp", "images/Card/ConeheadZombie.webp"]
    })(),
}),
oISkatingZombie=InheritO(oIZombie, {
    EName:'oISkatingZombie',
    CName: "滑冰僵尸",
    SunNum: 50,
    width: 150,
    height: 130,
    firstCoolTime: 0,
    coolTime: 2,
    Tooltip: "遭遇冰窟会滑过防线。",
    Obj:"oSkatingZombie",
    PicArr: (function() {
        return ["images/Card/ISkatingZombie.webp", "images/Zombies/SkatingZombie/Zombie.webp", "images/Card/SkatingZombie.webp"]
    })(),
}),
oIBucketheadZombie=InheritO(oIZombie, {
    EName:'oIBucketheadZombie',
    CName: "铁桶僵尸",
    SunNum: 125,
    firstCoolTime: 0,
    coolTime: 10,
    Tooltip: "有着强化的防御。",
    Obj:"oBucketheadZombie",
    PicArr: (function() {
        return ["images/Card/IBucketheadZombie.webp", "images/Zombies/BucketheadZombie/1.webp", "images/Card/BucketheadZombie.webp"]
    })(),
}),
oIThiefZombie=InheritO(oIZombie, {
    EName:'oIThiefZombie',
    CName: "盗贼僵尸",
    SunNum: 200,
    width: 150,
    height: 555,
    firstCoolTime: 0,
    coolTime: 30,
    Obj:"oThiefZombie",
    Tooltip: "可放置在草坪上任何地方。能偷走植物，然后向后方逃跑，死亡后原地掉落所偷植物。",
    PicArr: (function() {
        return ["images/Card/IThiefZombie.webp", "images/Zombies/ThiefZombie/idle.webp", "images/Card/ThiefZombie.webp"]
    })(),
    
}),
oICigarZombie=InheritO(oIZombie, {
    EName:'oICigarZombie',
    CName: "雪茄僵尸",
    SunNum: 100,
    firstCoolTime: 0,
    coolTime: 60,
    Tooltip: "随时自爆，摧毁附近植物。",
    Obj:"oCigarZombie",
    PicArr: (function() {
        return ["images/Card/ICigarZombie.webp", "images/Zombies/CigarZombie/1.webp", "images/Card/CigarZombie.webp"]
    })(),
}),
oIFootballZombie=InheritO(oIZombie, {
    EName:'oIFootballZombie',
    CName: "橄榄球僵尸",
    SunNum: 175,
    firstCoolTime: 0,
    coolTime: 25,
    Tooltip: "有着很高的防御和很快的速度。",
    Obj:"oFootballZombie",
    PicArr: (function() {
        return ["images/Card/IFootballZombie.webp", "images/Zombies/FootballZombie/1.webp", "images/Card/FootballZombie.webp"]
    })(),
}),
//活动用特殊植物
oPeashooter2 = InheritO(oPeashooter, {
    EName:"oPeashooter2",
    coolTime:0,
    SunNum:100,
    CheckLoop(zid, direction) {  //开始攻击，并且循环检查攻击条件1,2
        let self = this;
        let pid = self.id;
        if($P[pid]) {
            self.NormalAttack(zid);  //触发植物攻击，并传入触发者僵尸之id
            oSym.addTask(23, _=>$P[pid] && self.AttackCheck1(zid, direction));       
        }
    }, 
}),
oRepeater2=InheritO(oXshooter,{
    EName:"oRepeater2",
    SunNum:250,
    CheckLoop(zid, direction) {  //开始攻击，并且循环检查攻击条件1,2
        let self = this;
        let pid = self.id;
        if($P[pid]) {
            self.NormalAttack(zid);  //触发植物攻击，并传入触发者僵尸之id
            oSym.addTask(23, _=>$P[pid] && self.AttackCheck1(zid, direction));       
        }
    },
});
//预保留替换植物的函数
function __TEST_REWRITE_BALANCED_PLANTS__(){
}
