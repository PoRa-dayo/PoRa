"use strict";
var CZombies = NewO({
        EName: "Zombies",//在继承的僵尸对象中，EName必须严格等于变量名
        HP: 270,
        Lvl: 1, //僵尸强度级别，普通为1路障2铁桶4撑杆2
        NormalGif: 2,
        CardGif: 0,
        CanDisplay: 1,
        StaticGif: 2,
        AttackGif: 3,
        LostHeadGif: 4,
        LostHeadAttackGif: 5,
        HeadGif: 6,
        DieGif: 7,
        width: 166,
        height: 144,
        beAttackedPointL: 82,
        beAttackedPointR: 156,
        BreakPoint: 90,
        // 僵尸防具类型
        // 0表示僵尸无防具；1表示I类防具僵尸，如路障铁桶橄榄球；2表示II类防具僵尸，如读报、铁栅门
        Ornaments: 0,
        OrnHP: 0,
        OShieldHP: 0,
        ShieldHP: 0,
        OSpeed: 1.6,
        Speed: 1.6,
        PZ: 1,
        SpeedCoefficient: 1, //僵尸速度系数，默认为1，越低僵尸走的越慢（这个东西不受减速或亢奋效果影响，比如减速则最终速度是在减速的速度基础上乘上这个系数
        extraDivingDepth: 0,  //除了格子默认深度，僵尸额外潜下去（浮上来）的深度
        DivingDepth: 0, //僵尸潜下去的实际深度
        AKind: 0, //普通僵尸的攻击是0直接啃食，1巨人是秒杀，2篮球车冰车碾压，3篮球车丢篮球,以及其他远程.撑杆第一次是跳跃第二次是啃食
        ResistInsta:0.2778,//抵抗爆炸的程度 
        //是否可以被攻击，为以防万一，尽量不要滥用该属性来判断僵尸是否垂死！
        // 实际上囧姨设计该属性的用意是僵尸是否可以触发某些短距离植物（地刺、土豆雷、胆小菇...）的攻击判定
        // 而非标记僵尸不可被子弹打中
        beAttacked: 1,
        isAttacking: 0,
        isGoingDie: 0, //僵尸是否垂死
        OAttack: 100,
        Attack: 100,
        LivingArea: 1, //目前所在格子的类型
        CanGoThroughWater: true, //可不可以跟着水走
        CanAppearFromTomb: true,  // 可不可以从墓碑里钻出来
        Altitude: 1, // //海拔位置：-1潜地 0潜水 1行走 2跳跃 3植物子弹无法到达的高空飞行
        WalkDirection: 0, //僵尸行走方向，0表示向左，1表示向右
        FreeSlowTime: 0, //用于标记僵尸是否处于减速状态
        FreeVertigoTime: 0,
        FreeExcitedTime: 0,
        isFloating: 0, //标记僵尸是否处于浮空状态，即是否受战术风扇影响
        isCounted: 1, //是否需要纳入死亡统计
        isPuppet: 0, //是否是傀儡(非僵尸的僵尸)
        CanDiaplay: 1,
        DiyConfigs: {}, //后期由其他需要的因素中途添加的变量
        WaterShadowGif: null,
        CanDrawBlood:true,
        // 为僵尸绑定子僵尸，以便在进入关卡的时候一并加载，而不需要再在oS.ZName里添加
        // 比如说为巨人绑定抛出去专用的小鬼
        // 注意，此属性使用的时候千万要小心，防止出现循环绑定
        SubsidiaryZombies: null,
        Almanac: {
            Dom: null,
            Tip: "无",
            Weakness: "无",
            Speed: "慢",
            Story: "无。",
        },
        AudioArr: ["splat1", "splat2", "splat3", "ignite", "frozen", "chomp", "chomp2", "chompsoft", 'awooga', "zombiesplash", "zombie_entering_water"],
        AccessiblePath: (() => { //可由某道路转向某道路
            let arr = {};
            arr["1_3"] = 1;
            for (let i in arr) {
                arr[i.reverse()] = 1;
            }
            for (let i = 0; i < 4; i++) {
                arr[`${i}_${i}`] = 1;
            }
            return arr;
        })(),
        //获取卡片图片
        GetCardImg() {
            let self = this;
            return "images/Card/" + self.EName.substr(1) + ".webp";
        },
        //判定僵尸能否走某行
        CanPass(R, LF) {
            let self = this;
            return LF && self.AccessiblePath[oGd.$LF[R] + "_" + LF];
        },
        //检查当前格子类型不同切换事件
        ChkCell_GdType(self) {
            let R = self.R;
            let C = GetC(self.ZX - (self.beAttackedPointR - self.beAttackedPointL) / 2 * (self.WalkDirection * 2 - 1));
            let gdType = oGd.$GdType[R][C];
            let oldGdType = self.LivingArea;
            let canChangeType = true;
            if (oldGdType != gdType) {
                if (gdType == 0 || gdType == 1 || gdType == 3) {
                    if (self.DivingDepth > 0 && self.Altitude != 3) {
                        self.SetWater(0, R, C, oldGdType);
                        // 一旦出水，僵尸不再受到水道规则约束
                        self.ChkActs = self.__proto__.ChkActs;
                        // 把僵尸从图层实时调整名单中删除 
                        oS.observeZombieLayer && oZombieLayerManager.delZombie(self);
                    }else{
                        canChangeType=false;
                    }
                } else if (gdType == 2) {
                    if (self.DivingDepth<=0 && self.Altitude != 3) {
                        self.SetWater(oGd.$WaterDepth[R][C] + self.extraDivingDepth, R, C, oldGdType);
                    }else{
                        canChangeType=false;
                    }
                }
                if(canChangeType){
                    self.LivingArea = gdType;
                }
            }
        },
        /*
            当useAnim=false时，该函数为同步函数，不需要考虑异步的问题！
            R, C, oldGdType这几个参数在useAnim=false，或者确保僵尸一定不会被bounce的情况下可以不传！
        */
        async SetWater(depth, R, C, oldGdType, useAnim = true, toSetWaterStyle = true) {
            let self = this;
            let oldDepth = self.DivingDepth;
            let height = self.height;
            const callback_intoWater = () => {
                //如果水超过了最高处则潜水
                if (depth > self.height) {
                    self.Altitude = 0;
                }
                if (depth > self.height / 2) {
                    self.SpeedCoefficient = 0.7;
                }
                return true;
            };
            const callback_outWater = () => {
                if (toSetWaterStyle && self.EleShadow.dataset.hasOwnProperty("tmp_cssText")) {
                    self.EleShadow.style.cssText = self.EleShadow.dataset.tmp_cssText;
                    delete self.EleShadow.dataset.tmp_cssText;
                }
                self.SpeedCoefficient = 1;
                if (self.Altitude == 0) {
                    self.Altitude = Number(self.Ele.dataset.tmp_Altitude) ?? 1;
                }
                delete self.Ele.dataset.tmp_Altitude;
                return true;
            };
            self.DivingDepth = depth;
            // 僵尸潜入水中的情况
            if (depth > 0) {
                // 考虑到从外部调用SetWater的情况，还是手工设置一下僵尸的LivingArea
                self.LivingArea = 2;
                self.Ele.dataset.tmp_Altitude = self.Altitude;
                toSetWaterStyle && self.setWaterStyle_middleWare();
                if (useAnim) {
                    let msg = await self.sinkIntoWaterAnim(self, depth, oldDepth, height);
                    if (msg) {
                        return callback_intoWater();
                    } else {
                        self.DivingDepth = oldDepth;
                        self.LivingArea = oldGdType;
                        self.EleShadow.style.cssText = self.EleShadow.dataset.tmp_cssText;
                        SetStyle(self.EleBody, {
                            top: oldDepth,
                            clip: `rect(0,auto,auto,0)`,
                            '-webkit-mask-image': ""
                        });
                    }
                } else {
                    self.useSinkIntoWaterEffect(self, depth);
                    return callback_intoWater();
                }
            }
            // 僵尸浮出水中的情况 
            else if (depth === 0) {
                if (useAnim) {
                    let msg = await self.sinkIntoWaterAnim(self, depth, oldDepth, height);
                    if (msg) {
                        return callback_outWater();
                    } 
                    // 如果浮出水面的动画被中断（例如僵尸死亡或者被弹起）
                    // 则立即恢复僵尸原本的状态
                    else {
                        self.DivingDepth = oldDepth;
                        self.LivingArea = oldGdType;
                        self.useSinkIntoWaterEffect(self, oldDepth);
                    }
                } else {
                    self.useSinkIntoWaterEffect(self, depth);
                    return callback_outWater();
                }
            }
            return false;
        },
        setWaterStyle_middleWare() {
            const self = this;
            const shadowEle = self.EleShadow;
            if (!self.WaterShadowGif) {
                self.WaterShadowGif = oDynamicPic.require(WaterShadowImg, self.Ele);
            }
            if (!shadowEle.dataset.hasOwnProperty("tmp_cssText")) {
                shadowEle.dataset.tmp_cssText = self.EleShadow.style.cssText;
            }
            shadowEle.style.cssText = self.EleShadow.dataset.tmp_cssText +
                `background:url(${self.WaterShadowGif});`;
            self.setWaterStyle(self, shadowEle);
            return self;
        },
        setWaterStyle(self, shadowEle) {
            EditCompositeStyle({
                ele: shadowEle,
                addFuncs: [
                    ["translate", "4px, 20px"]
                ],
                option: 2
            });
            SetStyle(shadowEle, {
                height: "10.625px",
                width: "84.375px",
                'background-size': "100% 100%",
                'z-index': 300
            });            
        },
        sinkIntoWaterAnim(self, newDepth, oldDepth, height) {
            const id = self.id;
            self.isSinkAnimFinished = false;
            if (self.EName=="oSnorkelerZombie" && newDepth < oldDepth) oAudioManager.playAudio("snorkel_rise" + Math.floor(1 + Math.random() * 3));
            if (newDepth > oldDepth) oAudioManager.playAudio("zombie_entering_water");
            return new Promise((resolve) => {
                oSym.addTask(1, function d(npx = 1) {
                    // 这个根号是实现先快后慢的效果   ↓
                    let delta = Math.sqrt(npx / 50) * (newDepth - oldDepth) + oldDepth;
                    // 如果发现僵尸被弹起或被取消注册，则立即放弃操作并使僵尸复原
                    if (self.isFloating || self.HP <= 0) {
                        return resolve(false);
                    }
                    self.useSinkIntoWaterEffect(self, delta);
                    npx < 50 ? oSym.addTask(1, d, [npx + 1]) : resolve(self.isSinkAnimFinished = true);
                });
            });
        },
        // top值表示僵尸下沉/上浮的程度
        useSinkIntoWaterEffect(self, top) {
            let bottom = self.height - top;
            if ($User.LowPerformanceMode) {
                SetStyle(self.EleBody, {
                    top: `${top}px`,
                    clip: `rect(0,auto,${bottom}px,0)`,
                });
            } else {
                SetStyle(self.EleBody, {
                    top: `${top}px`,
                    clip: `rect(0,auto,${bottom + 4}px,0)`,
                    '-webkit-mask-image': `linear-gradient(black 0px ${bottom - 11}px, transparent ${bottom + 10}px)`
                });
            }
        },
        //判定僵尸能否走某个格
        CanPassCell: (R, C) => {
            let self = this;
            let DR = self?.R ?? R;
            let DC = self.ZX ? GetC(self.ZX) : C;
            return self.AccessiblePath[`${oGd.$GdType[R][C]}_${oGd.$GdType[DR][DC]}`];
        },
        FangXiang: 'GoLeft',
        ChkActs: (o, R, arR, i,stepRatio=1) => o[o.FangXiang](o, R, arR, i,stepRatio), //默认向左走
        DeltaDirectionSpeed: { //Speed*这个等于真实速度
            'GoLeft': 1,
            'GoRight': -1,
            'GoUp': 0,
            'GoDown': 0
        },
        HeadTargetPosition: [{
            x: 70,
            y: 50
        }, {
            x: 70,
            y: 50
        }], //头的位置数据
        getRealSpeed(self,stepRatio=1){
            return self.Speed * self.SpeedCoefficient * stepRatio;
        },
        getRealSpeedJudge(self,stepRatio,horizontal=1){//horizontal是是否获取水平速度，必须填数字
            let speed = self.getRealSpeed(self,stepRatio);
            if(self.isAttacking||!(self.DeltaDirectionSpeed[self.FangXiang]*horizontal)){
                speed=0;
            }
            return speed;
        },
        GoThroughWater(self, R, arR, i,stepRatio=1) {
            let C, directions;
            if (self.EleBody.style.transform.includes("rotateY(180deg)")) {
                C = GetC(self.AttackedRX - (self.beAttackedPointR - self.beAttackedPointL) / 1.1);
            } else {
                C = Math.Clamp(GetMidC(self.ZX - (self.WalkDirection * 2 - 1) * 50), 0, oS.C + 1);
            }
            if (self.FangXiang === "GoUp") {
                R = Math.Clamp(GetR(self.pixelTop + self.height + 10), 1, oS.R);
            } else if (self.FangXiang === "GoDown") {
                R = Math.Clamp(GetMidR(self.pixelTop + self.height - 5), 1, oS.R);
            }
            directions = oGd.$WaterFlowDirection[R][C].split(" ");
             // 为防止僵尸在某些特殊水道中出现来回振荡的现象，需要设置岔路口方向的优先级
             // Left : Right : Up : Down = 3 : 2 : 1 : 1
            directions.includes("Left") && (directions = directions.concat("Left", "Left"));
            directions.includes("Right") && (directions = directions.concat("Right"));
            let randomDir = directions.random();
            if ((R != self.DiyConfigs["Water_CurPos"]?.[0] || C != self.DiyConfigs["Water_CurPos"]?.[1]) && randomDir !== "Static" && randomDir !== "NoWater" && "Go" + randomDir !== self.FangXiang) {
                let funs = {
                    GoLeft() {
                        self.WalkDirection = 0;
                        self.EleBody['style']['transform'] = 'rotateY(0deg)';
                        self.EleBody['style']['transform-origin'] = `0px 0px`;
                    },
                    GoRight() {
                        self.WalkDirection = 1;
                        SetStyle(self.EleBody, {
                            'transform': 'rotateY(180deg)',
                            'transform-origin': `${self.AttackedRX - (self.beAttackedPointR - self.beAttackedPointL) / 3 - self.X}px 0px`,
                        });
                    },
                    GoUp() {
                    },
                    GoDown() {
                    }                    
                };
                funs[self.FangXiang = "Go" + randomDir]();
            }
            self.DiyConfigs["Water_CurPos"] = [R, C];
            return self[self.FangXiang](self, self.R, arR, i, stepRatio, true);
        },
        JudgeAttack(stepRatio=1) {
            let self = this;
            let ZX = self.ZX;
            let crood = self.R + "_";
            let C = GetC(ZX);
            let G = oGd.$;
            let arr = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
            if(stepRatio*self.Speed>12&&!self.isAttacking&&self.Altitude===1&&self.DeltaDirectionSpeed[self.FangXiang]&&!arr){
                arr = self.JudgeLong(self,crood,C,ZX,G,stepRatio);
            }
            if (arr && self.Altitude === 1) { //地上的僵尸才能检测攻击
                !self.isAttacking && (self.isAttacking = 1, self.EleBody.src = self.PicArr[self.AttackGif]); //如果是首次触发攻击，需要更新到攻击状态
                self.NormalAttack(...arr); //实施攻击
            } else {
                //撤销攻击状态
                self.isAttacking && (self.isAttacking = 0, self.EleBody.src = self.PicArr[self.NormalGif]);
            }
        },
        //离线判定
        JudgeLong(self, R_crood, C, ZX, G,stepRatio=1,diyCheck=null){
            let direction = -self.DeltaDirectionSpeed[self.FangXiang];
            let Velocity = self.getRealSpeed(self,stepRatio) * direction;
            let oriC = GetC(ZX - Velocity);
            let curC = oriC;
            let tarC = C;
            let step = Math.sign(tarC-oriC);
            let __flag;
            if(tarC>oS.C){
                return;
            }
            do{
                if(curC>oS.C){//这个相当于近程判定
                    curC+=step;
                    continue;
                }
                let crood = R_crood + curC + "_";
                let z = PKindUpperLimit;
                while (z >= 0) {
                    let plant = G[crood + z];
                    if (plant && plant.canEat && (diyCheck?diyCheck(self,plant):true)) {
                        if(direction>0){//向右走
                            __flag = One_Dimensional_Intersection(self.X + self.beAttackedPointL - Velocity, self.X + self.beAttackedPointR,
                                plant.AttackedLX, plant.AttackedRX);
                        }else{
                            __flag = One_Dimensional_Intersection(self.X + self.beAttackedPointL, self.X + self.beAttackedPointR - Velocity,
                                plant.AttackedLX, plant.AttackedRX);
                        }
                        if(__flag){
                            if(direction>0){
                                self.MoveZombieX(self,plant.AttackedLX+0.1 - self.AttackedRX,false);
                            }else{
                                self.MoveZombieX(self,-(plant.AttackedRX-0.1 - self.ZX));//向左走是反着的，要加个负号
                            }
                            return [self.id, plant.id];
                        }
                    }
                    z--;
                }
                if(tarC===curC){
                    return false;
                }
                curC+=step;
            }while(true);
        },
        JudgeLR(self, crood, C, ZX, G) { //远程判定，普通僵尸的远程是自己前面一格
            if (C > 10 || C < 1) {
                return;
            }
            crood += C - 1 + '_';
            let z = PKindUpperLimit;
            while (z >= 0) {
                let plant = G[crood + z];
                if (plant && plant.canEat) {
                    return (One_Dimensional_Intersection(self.X + self.beAttackedPointL, self.X + self.beAttackedPointR,
                            plant.AttackedLX, plant.AttackedRX) || plant.AttackedRX >= ZX && plant.AttackedLX <=
                        ZX) ? [self.id, plant.id] : false;
                }
                z--;
            }
        },
        JudgeSR(self, crood, C, ZX, G) { //近程判定，普通僵尸的近程是自己所在一格
            if (C > 9) {
                return;
            }
            crood += C + "_";
            let z = PKindUpperLimit;
            while (z >= 0) {
                let plant = G[crood + z];
                if (plant && plant.canEat) {
                    return (One_Dimensional_Intersection(self.X + self.beAttackedPointL, self.X + self.beAttackedPointR,
                            plant.AttackedLX, plant.AttackedRX) || plant.AttackedRX >= ZX && plant.AttackedLX <=
                        ZX) ? [self.id, plant.id] : false;
                }
                z--;
            }
        },
        NormalAttack(zid, pid) {
            oAudioManager.playAudio(["chomp", "chompsoft", 'chomp2'].random());
            oSym.addTask(50, _ => {
                let self;
                if (self = $Z[zid]) {
                    oAudioManager.playAudio(["chomp", "chompsoft", 'chomp2'].random());
                }
            });
            oSym.addTask(100, _ => {
                let self = $Z[zid];
                if (self && !self.isGoingDie && self.isNotStaticed()) {
                    //这里需要再检测一次，否则可能会出现莫名穿过的现象，或者啃的植物不对的现象
                    let ZX = self.ZX;
                    let crood = self.R + "_";
                    let C = GetC(ZX);
                    let G = oGd.$;
                    let arr = (self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G));
                    if (arr) {
                        [zid, pid] = arr;
                        let plant = $P[pid];
                        plant && plant.getHurt(self, self.AKind, self.Attack);
                    }
                    self.JudgeAttack();
                }
            });
        },
        MoveZombieX(self,x,left=true){
            if(left){
                self.AttackedRX -= x;
                self.AttackedLX -= x;
                self.ZX = self.AttackedLX;
                self.X -= x;
            }else{
                self.AttackedRX += x;
                self.AttackedLX += x;
                self.ZX = self.AttackedRX;
                self.X += x;
            }
        },
        Paint(o){
            SetStyle(o.Ele, {
                left: `${o.X}px`
            });
        },
        GoLeft(o, R, arR, i,stepRatio=1) { //向左走
            let Speed = o.getRealSpeed(o,stepRatio);
            let hookKey = 1;
            if (o.isNotStaticed()) { //如果僵尸没有处于冰冻或者等待出场状态
                    //未临死，未攻击，进行攻击判断
                !o.isAttacking && !o.isGoingDie && o.JudgeAttack(stepRatio);
                if (!o.isAttacking) { 
                    o.MoveZombieX(o,Speed);
                    //向左走出屏幕，算作直接死亡，不排序只更新
                    if (o.AttackedRX < -50) { 
                        oZ.del(arR, i);
                        o.DisappearDie();
                        hookKey = 0;
                    } else { //正常移动僵尸
                        o.Paint(o);
                    }
                }
            }
            //检查场地事件
            o.ChkCell_GdType(o);
            // hookKey的作用：
            // hookKey=1, 表示僵尸现在正常存活，需要系统重排oZ.$
            // hookKey = 0, 表示僵尸死亡，不需要系统重排oZ.$
            return hookKey;
        },
        GoRight(o, R, arR, i,stepRatio=1) { //往右走的僵尸行动
            let Speed;
            let rV = 1;
            let id = o.id;
            if (o.isNotStaticed()) {
                //未临死，未攻击，进行攻击判断
                !o.isGoingDie && !o.isAttacking && o.JudgeAttack(stepRatio); 
                if (!o.isAttacking) {
                    //向右走出屏幕，算作直接死亡，不排序只更新
                    if (o.X > oS.W) {
                        oZ.del(arR, i);
                        o.DisappearDie(); 
                        rV = 0;
                    } else {
                        o.MoveZombieX(o,(Speed = o.getRealSpeed(o,stepRatio)),false);
                        o.Paint(o);
                    }
                }
            }
            //检查场地事件
            o.ChkCell_GdType(o);
            return rV;
        },
        GoDown(o, R, arR, i, stepRatio=1, isInWaterPath = false) { //向下走
            let rV = 1;
            let newR = o.R + 1;
            let id = o.id;
            if (o.isNotStaticed()) {
                !o.isGoingDie && !o.isAttacking && o.JudgeAttack(stepRatio);
                if (!o.isAttacking) {
                    SetStyle(o.Ele, {
                        top: (o.pixelTop += o.getRealSpeed(o,stepRatio)) + 'px',
                    });
                    // 这里需要针对围歼战和水道采用两套判定，原因有二：
                    // 1. 原先挨炮画的地图和严格按数值对位画出来的镜花水月地图之间是存在一定误差的。
                    // 2. 围歼战拐弯和水道拐弯的判定实现方式有所差异。
                    if (
                        isInWaterPath ? 
                            (o.pixelTop + o.height - (isInWaterPath ? 35 : -10) >= GetY(R)) :
                            (o.pixelTop + o.height - o.GetDY() >= GetY(newR))
                    ) {
                        oZ.moveTo(id, o.R, newR);
                    }
                }
            }
            o.ChkCell_GdType(o);
            return rV;
        },
        GoUp(o, R, arR, i, stepRatio=1, isInWaterPath = false) {
            let rV = 1;
            let newR = o.R - 1;
            let id = o.id;
            if (o.isNotStaticed()) {
                !o.isGoingDie && !o.isAttacking && o.JudgeAttack(stepRatio);
                if (!o.isAttacking) {
                    SetStyle(o.Ele, {
                        top: (o.pixelTop -= o.getRealSpeed(o,stepRatio)) + 'px',
                    });
                    if (o.pixelTop + o.height <= GetY(newR) + (isInWaterPath ? 0 : o.GetDY())) {
                        oZ.moveTo(id, o.R, newR);
                    }
                }
            }
            o.ChkCell_GdType(o);
            return rV;
        },
        GetDY: _ => -10, //返回僵尸相对于格子中点的纵坐标偏移
        GetDTop: 0, //僵尸gif跟div的顶部坐标偏移
        ChangeR: function(e) { //换行
            var h = e.R,
                g = e.ar || [],
                j = e.CustomTop,
                d = this,
                q = h - 1,
                l,
                k = d.id,
                m = -1,
                f = d.Ele,
                n = d.EleBody,
                i = GetC(d.ZX),
                c;
            !g.length && ( //如果没有指定移动行数组，则默认使用上下两行
                d.CanPassCell(q, i) && (g[++m] = q), //只有地形跟本行一样才能移动
                d.CanPassCell(q += 2, i) && (g[++m] = q)
            );
            g.length ? ( //可以换行
                l = !d.WalkDirection ? -5 : 5,
                d.ZX += l,
                d.AttackedLX += l,
                d.AttackedRX += l,
                d.X += l,
                q = g[Math.floor(Math.random() * g.length)],
                SetStyle(f, {
                    left: d.X + "px",
                    top: (d.pixelTop = j == undefined ? GetY(q) - d.height + d.GetDY() : j) + "px",
                    'z-index': d.zIndex = 3 * q + 1
                }),
                d.isAttacking && (n.src = d.PicArr[d.NormalGif]),
                oZ.moveTo(k, h, q)
            ) : (
                n.src = d.PicArr[d.NormalGif]
            );
            d.isAttacking = 0;
        },
        getShadow: self => `left:${self.beAttackedPointL-10}px;top:${self.height-22}px;`,
        getDisplayShadow: self => self.getShadow(self),
        getCharredCSS(self) {
            const body = self.EleBody;
            return {
                left: self.beAttackedPointL + 6,
                top: self.height / 3 + self.DivingDepth / 2,
                clip: self.DivingDepth > 0 ? "rect(0px, auto, 95px, 0px)" : "",
            };
        },
        //初始化僵尸的prototype
        Init(AppearX, pro, LF, MaxR) {
            /*
            初始化僵尸的坐标相关数据
            o.R:行;o.pixelTop:顶部Y坐标;o.X:左边X坐标（相对于FightingScene）;o.ZX:确定僵尸位置的点X坐标，通常是AttackedLX
            o.AttackedLX,o.AttackedRX:僵尸左右受攻击点判定坐标;o.beAttackedPointL,o.beAttackedPointR:僵尸左右受攻击点判定坐标距离o.X的偏移距离，受攻击点判定坐标即可根据o.X和偏移距离计算得出
            */
            let len = 0;
            let o = this;
            let ArR = [];
            pro.ZX = pro.AttackedLX = AppearX;
            pro.X = pro.ZX - pro.beAttackedPointL;
            pro.AttackedRX = pro.X + pro.beAttackedPointR;
            //能够出现的行数数组ArR
            for (let i = 0; i <= MaxR; i++) {
                pro.CanPass(i, LF[i]) && ArR.push(i);
            }
            pro.ArR = ArR; //僵尸能够出现的行数组
            //初始化HTML字符数组
            pro.ArHTML = [
                `<div id="`, //0
                `" data-jng-constructor="`, //1
                `" style="width:${pro.width}px;height:${pro.height}px;position:absolute;display:`, //2
                `;left:`, //3
                `px;top:`, //4
                `px;z-index:`, //5
                `"><div class='Shadow' style="${pro.getShadow(pro)}"></div><img style="position:absolute;clip:rect(0,auto,`, //6
                `,0);top:`, //7
                `px" src="`, //8
                `"></div>` //9
            ];
            Object.hasOwn(pro, 'Almanac') && o.getAlmanacDom(pro);
        },
        getAlmanacDom(pro) {
            if (!pro.Almanac.Dom) {
                let ClassAlmanac = CZombies.prototype.Almanac;
                for (let i in ClassAlmanac) {
                    if (!pro.Almanac[i]) {
                        pro.Almanac[i] = ClassAlmanac[i];
                    }
                }
                let _width = pro.displayWidth ?? pro.width;
                let _height = pro.displayHeight ?? pro.height;
                pro.Almanac.Dom = pro.getDisplayHTML("", 170 - _width / 2, 450 - _height, "1;height:" + _height + "px;width:" + _width + "px", "block", "auto", pro.GetDTop, pro.PicArr[pro.StandGif]);
            }
        },
        getHTML(id, wrapLeft, wrapTop, zIndex, display, clip, top, img) { //渲染僵尸html代码
            const self = this,
                T = self.ArHTML;
            return T[0] + id + T[1] + self.EName + T[2] + display + T[3] + wrapLeft + T[4] + wrapTop + T[5] + zIndex + T[6] + clip + T[7] + top + T[8] + img + T[9];
        },
        getDisplayHTML(id, wrapLeft, wrapTop, zIndex, display, clip, top, img) {
            const self = this;
            return `<div id="${id}" data-jng-constructor="${self.EName}" style="width:${self.displayWidth ?? self.width}px;height:${self.displayHeight ?? self.height}px;position:absolute;left:${wrapLeft}px;top:${wrapTop}px;z-index:${zIndex};display:${display};"><div class='Shadow' style="${self.getDisplayShadow(self)}"></div><img style="position:absolute;clip:rect(0,auto,${clip},0);top:${top}px" src="${img}"></div>`;
        },
        //普通诞生事件,由程序自动调用,在每波刷新 
        //初始化僵尸样式，编译僵尸html代码
        prepareBirth(delayT) {
            let self = this;
            let id = self.id = "Z_" + Math.random();
            let R = self.R = oP.randomGetLine(self.ArR,self.Lvl); //生成僵尸所在行数随机
            let top = self.pixelTop = GetY(R) + self.GetDY() - self.height; //计算僵尸顶部坐标
            self.zIndex = 3 * R + 1;
            self.zIndex_cont = Math.round(self.pixelTop + self.height);
            //设置延迟出场时间
            if (self.delayT = delayT) {
                self.getStatic({
                    time: Infinity,
                    type: "SetBody",
                    forced: true,
                    useStaticCanvas: false,
                    usePolling: false,
                });
            }
            return self.getHTML(id, self.X, top, self.zIndex_cont, "none", "auto", self.GetDTop, self.PicArr[self.NormalGif]);
        },
        //特殊诞生事件，传递自定义的坐标，比如从坟墓出生
        CustomBirth(R, C, delayT, clipH) {
            const self = this;
            const bottomY = GetY(R) + self.GetDY(); //僵尸脚部坐标=当前行下边缘坐标+（-自定义向上偏移）
            const pixelTop = bottomY - self.height, //僵尸图像顶端坐标=僵尸脚部坐标-僵尸图片高度
                id = self.id = "Z_" + Math.random(),
                beAttackedPointL = self.beAttackedPointL,
                beAttackedPointR = self.beAttackedPointR;
            self.ZX = self.AttackedLX = GetX(C) - (beAttackedPointR - beAttackedPointL) * 0.5;
            self.X = self.ZX - beAttackedPointL;
            self.AttackedRX = self.X + beAttackedPointR;
            self.R = R;
            self.pixelTop = pixelTop;
            self.zIndex = 3 * R + 1;
            self.zIndex_cont = Math.round(self.pixelTop + self.height);
            if (self.delayT = delayT) {
                // SetBody由于是供底层代码控制僵尸延时出场的，比较特殊
                // 所以为了保险起见，定身状态需要手工解除
                self.getStatic({
                    time: Infinity,
                    type: "SetBody",
                    useStaticCanvas: false,
                    forced: true,
                    usePolling: false,
                });
            }
            return self.getHTML(id, self.X, pixelTop, self.zIndex_cont, "none", clipH || 0, self.GetDTop, self.PicArr[self.NormalGif]);
        },
        Birth(json = {}) { //唤醒僵尸，注册$Z和oZ
            let self = this;
            if (!json.dont_set_original_value) { //不设置原始数据，例如OAttack,OSpeed之类，否则默认备份OAttack,OSpeed
                self.OAttack = self.Attack;
                self.OSpeed = self.Speed;
            }
            self.HeadTargetPosition = JSON.parse(JSON.stringify(self.HeadTargetPosition)); //深拷贝头部坐标，避免改的时候直接改成prototype的
            self.PicArr = self.PicArr.slice(); //复制一份数组，避免中途更改PicArr
            self.DiyConfigs = {};
            $Z[self.id] = self;
            oZ.add(self);
            let id = self.id;
            let ele = self.Ele = $(id);
            self.EleShadow = ele.firstChild;
            self.EleBody = ele.childNodes[1];
            if(self.ShieldHP > 0){
                self.OShieldHP = self.ShieldHP;
                let scl = 0.75+0.03*self.OShieldHP;
                NewImg(`buff_shield_${Math.random()}`, "images/Zombies/buff_shield.png", (self.getShieldCSS ? self.getShieldCSS(self) : "left:65px;top:"+(60+self.OShieldHP)+"px;") + "z-index:5; transform: scale(" + scl + ");", ele, {
                    className: 'buff_shield'
                });
            }
            if(oS.ZombieRandomSpeed && !self.isPuppet){
                let delta = Math.Clamp(Math.Grandom(0,oS.ZombieRandomSpeed/3),-oS.ZombieRandomSpeed/3,oS.ZombieRandomSpeed/3);
                self.Speed+=delta;
                self.OSpeed+=delta;
            }
            self.BirthCallBack(self);
            if (self.CanGoThroughWater && oGd.$GdType[self.R][Math.Clamp(GetC(self.ZX), 1, oS.C)] === 2) {
                self.ChkActs = self.GoThroughWater;
                oS.observeZombieLayer && oZombieLayerManager.addZombie(self);
            }
            oSym.addTask(self.delayT, _ => {
                self.PicArr = self.PicArr.map(pic => oDynamicPic.checkOriginalURL(pic) ? oDynamicPic.require(pic, null, true) : oURL.removeParam(pic, "useDynamicPic"));
                IsHttpEnvi && ele.addEventListener("DOMNodeRemoved", (event) => {
                    if (event.target === ele && (!ele.id || !$(ele.id))) {
                        setTimeout(self.RemoveDynamicPic.bind(self), 1);
                    }
                });
                self.EleBody.src = self.PicArr[self.NormalGif];
            });
        },
        BirthCallBack(self) {
            let delayT = self.delayT;
            let id = self.id;
            let ele = self.Ele = $(id);
            self.EleShadow = ele.firstChild;
            self.EleBody = ele.childNodes[1];
            if (delayT) {
                oSym.addTask(delayT, () => {
                    self.freeStaticEffect(self, "SetBody");
                    $Z[id] && SetBlock(ele);
                });
            } else {
                SetBlock(ele);
            }
        },
        RemoveDynamicPic() {
            const self = this;
            const BlobUrlStorage = oDynamicPic.__BlobUrlStorage__;
            const ProtoPicArr = self.__proto__.PicArr;
            self.PicArr.forEach((pic, idx) => {
                let originalURL = ProtoPicArr[idx];
                if (/^blob:/.test(pic) && oURL.getParam(originalURL, "forbidRemoving") !== "true") {
                    oDynamicPic.remove(pic, oURL.removeParam(originalURL));
                }
            });
        },
        getCrushed: function(c) {
            return true
        },
        getRaven: function() {
            return this.DisappearDie(),
                1
        },
        getShield(self, HP) {
            if (self.ShieldHP > 0) return;
            self.ShieldHP=self.ShieldHP+HP;
            self.OShieldHP = self.ShieldHP;
            let ele = self.Ele;
            let scl = 0.75 + 0.03 * self.OShieldHP;
            NewImg(`buff_shield_${Math.random()}`, "images/Zombies/buff_shield.png", (self.getShieldCSS ? self.getShieldCSS(self) : "left:65px;top:"+(60+self.OShieldHP)+"px;") + "z-index:5; opacity:0; transform: scale(" + (scl * 2) + ");", ele, {
                className: 'buff_shield'
            });
            oEffects.Animate(ele.querySelector('.buff_shield'), {
                opacity: 1,
                transform: "scale(" + scl + ")"
            }, 0.3 / oSym.NowSpeed);
            oAudioManager.playAudio("shield_get");
            // 兴奋buff可以抵消僵尸的削弱/定身效果
            self.freeStaticEffect(self, "All");
            if (self.FreeSlowTime || self.FreeVertigoTime || !self.isNotStaticed()) {
                self.Speed = self.OSpeed;
                self.Attack = self.OAttack;
                self.FreeSlowTime = 0;
                self.FreeVertigoTime = 0;
                ClearChild(...ele.querySelectorAll('.buff_freeze,.buff_vertigo'));
                !$User.LowPerformanceMode && EditCompositeStyle({
                    ele: self.EleBody,
                    styleName: 'filter',
                    delFuncs: [
                        ['url', oSVG.getSVG('getSnowPea')]
                    ],
                    option: 2
                });
                return;
            }
        },
        getShieldHit(self) {
            self.ShieldHP--;
            let ele = self.Ele;
            let scl = 0.75 + 0.03 * self.OShieldHP;
            if (self.ShieldHP <= 0) {
                oSym.addTask(100, () => {
                    oAudioManager.playAudio("shield_dispel");
                    oEffects.Animate(ele.querySelector('.buff_shield'), {
                        opacity: 0,
                        transform: "scale(" + (scl * 1.5) + ")"
                    }, 0.3 / oSym.NowSpeed, null, ClearChild);
                });
            } else if (Math.ceil(self.ShieldHP) === Math.ceil(self.OShieldHP / 2)) {
                ClearChild(ele.querySelector('.buff_shield'));
                NewImg(`buff_shield_${Math.random()}`, "images/Zombies/buff_shield_2.png", (self.getShieldCSS ? self.getShieldCSS(self) : "left:65px;top:" + (60 + self.OShieldHP) + "px;") + "z-index:5; transform: scale(" + scl + ");", ele, {
                    className: 'buff_shield'
                });
            }
        },
        /* 如果僵尸血量大于1800，则扣除血量1800
            如果僵尸血量小于1800，则可被炸弹直接炸死 */
        getExplosion: function() {
            let self = this,
                dmg = Math.round(500/self.ResistInsta);
            if (self.ShieldHP > 0) {
                self.getShieldHit(self);
            }
            else {self.HP > dmg ? self.HP -= dmg : $Z[self.id] && !self.isGoingDie && self.ExplosionDie();}
        },
        getThump: function() {
            this.DisappearDie()
        },
        PlayNormalballAudio: function() {
            oAudioManager.playAudio("splat" + Math.floor(1 + Math.random() * 3))
        },
        PlayFireballAudio: function() {
            oAudioManager.playAudio("ignite");
        },
        PlaySlowballAudio: function() {
            oAudioManager.playAudio("frozen")
        },
        /* 僵尸定身效果封装代码 开始 */
        // 创建定身用的静态canvas
        createStaticCanvas(self, body) {
            const Width = body.width;
            const Height = body.height;
            let canvas = NewEle(self.id + "_StaticBody", "canvas", body.style.cssText, {
                "width": Width,
                "height": Height,
            }, self.Ele);
            let ctx = canvas.getContext("2d");
            ctx.drawImage(body, 0, 0, Width, Height);
            SetNone(body);
            self.__TMP_ELEBODY__ = body;
            self.EleBody = canvas;
            for (let { nodeName, nodeValue } of self.__TMP_ELEBODY__.attributes) {
                if (!/id|width|height|style|src/.test(nodeName)) {
                    canvas.setAttribute(nodeName, nodeValue);
                }
            }
            return canvas;
        },
        // 定时轮询，实时监控僵尸状态
        // 一方面在僵尸死亡时及时强制触发freeStaticEffect（垂死不需要额外监控，通过GoingDie方法触发即可）
        // 另一方面，控制canvas贴图和僵尸真正的EleBody（即参数中的bodyElement）同步
        pollStaticStation(self, id, bodyElement, lastSrc) {
            const draw = (token, canvas) => {
                // 如果有更加新的贴图被更新过来，则放弃当前的绘制操作
                if (!$Z[id] || token !== self.ChangeBodyImageToken) return;
                let ctx = canvas.getContext("2d");
                let [width, height] = [canvas.width, canvas.height];
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(bodyElement, 0, 0, width, height);
            }
            if (self.isNotStaticed()) return;
            if (!$Z[id]) {
                self.freeStaticEffect(self, "All");
            } else if ($Z[id] && !self.isGoingDie) {
                let newSrc = lastSrc;
                let canvas = self.__CanvasBody__;
                if (canvas) {
                    // 如果canvas的src属性被更新，则需要进行同步
                    if (canvas.src && canvas.src !== lastSrc) {
                        // 取得更新到canvas元素的src值，将其应用到真正的EleBody上
                        newSrc = bodyElement.src = canvas.src;
                        canvas.src = "";
                        // 监控真正的EleBody的加载状态，以便加载完成后将新贴图绘制到canvas上
                        let token = self.ChangeBodyImageToken = oSym.Now;
                        bodyElement.complete ?
                            draw(token, canvas) :
                            bodyElement.addEventListener("load", draw.bind(null, token, canvas), {
                                once: true
                            });
                    }                    
                }
                // 调用自定义函数更新僵尸糊脸图案（如黄油）的css信息（如有需要的话）
                for (let effect of self.StaticEffectList) {
                    let func = self.__UpdateImgFuncs__[effect];
                    func && func(self, $(`${id}_StaticEffect_${effect}`), canvas);
                }
                // 递归实现轮询监控    
                oSym.addTask($User.LowPerformanceMode ? 3 : 2,
                    self.pollStaticStation, [self, id, bodyElement, newSrc]);
            }
        },
        // 解除僵尸定身效果
        freeStaticEffect(self, type, isNormal = false) {
            const list = self.StaticEffectList;
            const freeEffect = (type) => {
                list.delete(type);
                oSym.removeTask(self.__NormalTask__[type]);
                ClearChild($(`${self.id}_StaticEffect_${type}`));
                self[`Free${type}Time`] = 0;
            };
            if (self.isNotStaticed() || type !== "All" && !list.has(type)) {
                return;
            }
            if (type === "All") {
                for (let _type of list) freeEffect(_type);
            } else {
                freeEffect(type);
            }
            // 如果僵尸的所有定身效果都已经解除
            // 则清除canvas，恢复僵尸原本的EleBody
            let canvas = self.__CanvasBody__;
            if (list.size <= 0) {
                // 重新显示EleBody
                if ($Z[self.id] && canvas) {
                    let body = self.EleBody = self.__TMP_ELEBODY__;
                    canvas.src && canvas.src !== body.src && (body.src = canvas.src);
                    body.style.cssText = canvas.style.cssText;
                    for (let { nodeName, nodeValue } of canvas.attributes) {
                        if (!/id|width|height|style|src/.test(nodeName)) {
                            body.setAttribute(nodeName, nodeValue);
                        }
                    }
                    SetBlock(body);
                    ClearChild(canvas);
                }
                delete self.__TMP_ELEBODY__;
                delete self.__CanvasBody__;
                delete self.__NormalTask__;
            }
            // 考虑到游戏设计的灵活性，不再对回调函数进行进一步封装！
            // 请自行根据需要编写僵尸解除定身后的代码！
            let callback = self.__NormalCallback__[type];
            callback && callback(self, list.size <= 0, isNormal, list);
        },
        // 注：imgConfig包含{ src, render, update }
        getStatic({time, type, callback, forced = false, usePolling = true, useStaticCanvas = true, imgConfig}) {
            let self = this;
            let id = self.id;
            let body = self.__TMP_ELEBODY__ || self.EleBody;
            // StaticEffectList用于标记僵尸处于定身状态
            let list = self.StaticEffectList ?? (self.StaticEffectList = new Set());
            if (!forced && (!$Z[id] || self.HP < self.BreakPoint || self.isPuppet || self.isGoingDie)) {
                return;
            }
            // 生成canvas，绘制僵尸静态图片
            if (!self.__CanvasBody__ && useStaticCanvas) {
                self.__CanvasBody__ = self.createStaticCanvas(self, body);
            }
            // 如果当前僵尸原先未应用定身效果，则需要进行一些初始化
            if (list.size <= 0) {
                // 初始化属性
                self.__UpdateImgFuncs__ = {};
                self.__NormalCallback__ = {};
                self.__NormalTask__ = {};
                // 异步启动监控
                usePolling && oSym.addTask(0, self.pollStaticStation, [self, id, body, body.src]);
            }
            // 如果僵尸当前没有应用这种定身特效
            if (!list.has(type)) {
                if (imgConfig) {
                    let {src, render, update} = imgConfig;
                    render(self, NewImg(`${id}_StaticEffect_${type}`, src, "", self.Ele, {
                        className: "StaticEffect",
                    }), body);
                    self.__UpdateImgFuncs__[type] = update;
                }
                self.__NormalCallback__[type] = callback;
                self.StaticEffectList.add(type);
            }
            // 设置时间戳
            let expectedTime = self[`Free${type}Time`] = oSym.Now + time;
            // 设置解除定身的定时器
            self.__NormalTask__[type] = oSym.addTask(time, (self, type, expectedTime) => {
                if ($Z[self.id] && self[`Free${type}Time`] <= expectedTime) {
                    self.freeStaticEffect(self, type, true);
                }
            }, [self, type, expectedTime]);
        },
        isNotStaticed() {
            return !this.StaticEffectList || this.StaticEffectList.size <= 0;
        },
        /* 僵尸定身效果封装代码 结束 */
        getButter(time = 400) {
            if (this.ShieldHP > 0) return;
            let picSize = [40, 40];
            let src = "images/Plants/KernelPult/butter_spilt.webp";
            this.getStatic({
                time,
                type: "Butter",
                imgConfig: {
                    src,
                    render(self, imgEle, body) {
                        let position = self.HeadTargetPosition.length > self.isAttacking ?
                                self.HeadTargetPosition[self.isAttacking] :
                                self.HeadTargetPosition[0];
                        let topPos = GetStyle(body, "top", true) + position.y;
                        let leftPos = self.FangXiang === "GoRight"  ? 
                                (self.width - position.x - picSize[0] / 2) : position.x;
                        SetStyle(imgEle, {
                            "transform": self.FangXiang === "GoRight" ? 'rotateY(180deg)' : "",
                            "left": leftPos,
                            "top": topPos,
                            "width": picSize[0],
                            "height": picSize[1],
                        });
                    },
                    update(self, imgEle, body) {
                        let position = self.HeadTargetPosition.length > self.isAttacking ?
                                self.HeadTargetPosition[self.isAttacking] :
                                self.HeadTargetPosition[0];
                        let topPos = GetStyle(body, "top", true) + position.y;
                        let leftPos = self.FangXiang === "GoRight"  ? 
                                (self.width - position.x - picSize[0] / 2) : position.x;
                        if (leftPos != GetStyle(imgEle, "left", true) || topPos != GetStyle(imgEle, "top", true)) {
                            SetStyle(imgEle, {
                                "left": leftPos,
                                "top": topPos,
                            });
                        }
                    }
                },
                callback(self, isNotStaticed, staticList) {
                    if (isNotStaticed && !self.isGoingDie) {
                        self.isAttacking === 1 && self.JudgeAttack();                        
                    }
                }
            });
        },
        getFreeze(freezeKeepTime = 400, slowKeepTime = 1500) {
            const self = this;
            if (!$Z[self.id] || self.ShieldHP > 0 || self.isGoingDie || self.Altitude === 3) {
                return;
            }
            self.getPea(self, 20, 0);
            self.getSlow(self, freezeKeepTime + slowKeepTime);
            self.getStatic({
                time: freezeKeepTime,
                type: "Freeze",
                imgConfig: {
                    src: "images/Zombies/buff_freeze.png",
                    render(self, imgEle, body) {
                        imgEle.style.cssText = (self.getFreezeCSS ? self.getFreezeCSS(self) : self.getShadow(self))
                                + `z-index:5;transform: scale(1);`;
                    }
                },
                callback(self, isNotStaticed, isNormal, staticList) {
                    // 第一种情况：定身时间到，僵尸没有其他定身效果
                    // 如果僵尸是定时到了自动解除，而非火豌豆等外力强制解除，则为僵尸应用减速效果
                    // 第二种情况：定身时间到，僵尸还有其他定身效果，则不做任何操作
                    if (isNotStaticed && !self.isGoingDie) {
                        self.isNormal && self.getSlow(self, slowKeepTime);
                        // isAttacking=true的正常僵尸啃食时JudgeAttack和NormalAttack会递归循环调用
                        // 给僵尸定身会中断这一过程，导致僵尸卡住既不前进又不啃食
                        // 所以当僵尸定身结束后需要手工重新触发JudgeAttack
                        self.isAttacking === 1 && self.JudgeAttack();
                    }
                }
            });
        },
        getSlow(self, keepTime = 1000) {
            if (self.isGoingDie || self.ShieldHP > 0) {
                return;
            }
            let ele = self.Ele;
            let oldTimeStamp = self.FreeSlowTime;
            let newTimeStamp = oSym.Now + keepTime; //预期的解除冰冻的时间戳
            if (self.FreeExcitedTime) { //解除僵尸兴奋状态
                self.Speed = self.OSpeed;
                self.Attack = self.OAttack;
                self.FreeExcitedTime = 0;
                ClearChild(ele.querySelector('.buff_excited'));
                !$User.LowPerformanceMode && EditCompositeStyle({
                    ele: self.EleBody,
                    styleName: 'filter',
                    delFuncs: [
                        ['url', oSVG.getSVG('getExcited')]
                    ],
                    option: 2
                });
                return;
            }
            /* 僵尸减速与攻击削弱效果 */
            if (oldTimeStamp === 0) {
                self.Speed = 0.5 * self.OSpeed;
                self.Attack = self.OAttack * 0.5;
                $User.LowPerformanceMode && NewImg(`buff_freeze_${Math.random()}`, "images/Zombies/buff_freeze.png",
                    `${self.getFreezeCSS ? self.getFreezeCSS(self) : self.getShadow(self)};z-index:5;transform: scale(1);`, ele, {
                        className: 'buff_freeze'
                    });
                !$User.LowPerformanceMode && EditCompositeStyle({
                    ele: self.EleBody,
                    styleName: 'filter',
                    addFuncs: [
                        ['url', oSVG.getSVG('getSnowPea')]
                    ],
                    option: 2,
                });
            }
            /* 
                僵尸解除冰冻定时器设置
                如果僵尸先前设定的解除冰冻的时间戳早于本次冰冻预计解除冰冻的时间戳
                则说明僵尸的冰冻时间需要延长或先前未被冰冻
                因此作废原先时间戳，重新设定时间戳与解除冰冻的定时器
            */
            if (oldTimeStamp < newTimeStamp) {
                self.FreeSlowTime = newTimeStamp;
                oSym.addTask(keepTime, () => {
                    //时间到后需要重新校验时间戳，确认僵尸未被重新冰冻
                    if ($Z[self.id] && self.FreeSlowTime === newTimeStamp) {
                        self.FreeSlowTime = 0;
                        $User.LowPerformanceMode && ClearChild(ele.querySelector('.buff_freeze'));
                        !$User.LowPerformanceMode && EditCompositeStyle({
                            ele: self.EleBody,
                            styleName: 'filter',
                            delFuncs: [
                                ['url', oSVG.getSVG('getSnowPea')]
                            ],
                            option: 2
                        });
                        if (self.FreeVertigoTime === 0) {
                            self.Speed = self.OSpeed;
                            self.Attack = self.OAttack;
                        }
                    }
                });
            }
        },
        getVertigo(self, attackPower, dir, style, keepTime = 1000) {
            if (self.isGoingDie) {
                return;
            }
            if (self.ShieldHP>0) {
                self.getShieldHit(self);
                return;
            }
            self.getHit2(self, attackPower, dir);
            if (self.EName=="oZomboni" || self.EName=="oBeetleCarZombie") {
                return;
            }
            let ele = self.Ele;
            let oldTimeStamp = self.FreeVertigoTime;
            let newTimeStamp = oSym.Now + keepTime;
            if (self.FreeExcitedTime) {
                self.Speed = self.OSpeed;
                self.Attack = self.OAttack;
                self.FreeExcitedTime = 0;
                ClearChild(ele.querySelector('.buff_excited'));
                !$User.LowPerformanceMode && EditCompositeStyle({
                    ele: self.EleBody,
                    styleName: 'filter',
                    delFuncs: [
                        ['url', oSVG.getSVG('getExcited')]
                    ],
                    option: 2
                });
                return;
            }
            if (oldTimeStamp === 0) {
                self.Speed = 0.5 * self.OSpeed;
                self.Attack = self.OAttack * 0.5;
                style = style ?? `left:${self.beAttackedPointL-15}px;top:{self.height-115}px;`;
                NewImg(`buff_vertigo_${Math.random()}`, "images/Zombies/buff_vertigo.webp", style, ele, {className: 'buff_vertigo'});
            }
            if (oldTimeStamp < newTimeStamp) {
                self.FreeVertigoTime = newTimeStamp;
                oSym.addTask(keepTime, () => {
                    if ($Z[self.id] && self.FreeVertigoTime === newTimeStamp) {
                        self.FreeVertigoTime = 0;
                        ClearChild(ele.querySelector('.buff_vertigo'));
                        if (self.FreeSlowTime === 0) {
                            self.Speed = self.OSpeed;
                            self.Attack = self.OAttack;
                        }
                    }
                });
            }
        },
        getExcited(intensity, duration_ = undefined) {
            let self = this;
            let ele = self.Ele;
            let duration = duration_ ?? 1200;
            let oldTimeStamp = self.FreeExcitedTime;
            let newTimeStamp = oSym.Now + duration;
            // 兴奋buff可以抵消僵尸的削弱/定身效果
            if (self.FreeSlowTime || self.FreeVertigoTime || !self.isNotStaticed()) {
                self.freeStaticEffect(self, "All");
                self.Speed = self.OSpeed;
                self.Attack = self.OAttack;
                self.FreeSlowTime = 0;
                self.FreeVertigoTime = 0;
                ClearChild(...ele.querySelectorAll('.buff_freeze,.buff_vertigo'));
                !$User.LowPerformanceMode && EditCompositeStyle({
                    ele: self.EleBody,
                    styleName: 'filter',
                    delFuncs: [
                        ['url', oSVG.getSVG('getSnowPea')]
                    ],
                    option: 2
                });
                return;
            }
            // 如果僵尸没有不利buff，则正常对僵尸进行强化
            self.Speed *= intensity;
            self.Attack *= intensity;
            if (!oldTimeStamp) {
                NewImg(`buff_excited_${Math.random()}`, "images/Zombies/buff_excited.gif", self.getShadow(
                    self) + "z-index:5;transform: scale(1);", ele, {
                    className: 'buff_excited'
                });
                !$User.LowPerformanceMode && EditCompositeStyle({
                    ele: self.EleBody,
                    styleName: 'filter',
                    addFuncs: [
                        ['url', oSVG.getSVG('getExcited')]
                    ],
                    option: 2,
                });
            }
            if (oldTimeStamp < newTimeStamp) {
                self.FreeExcitedTime = newTimeStamp;
                oSym.addTask(duration, () => {
                    if ($Z[self.id] && self.FreeExcitedTime === newTimeStamp) {
                        ClearChild(ele.querySelector('.buff_excited'));
                        self.FreeExcitedTime = 0;
                        self.Attack = self.OAttack;
                        self.Speed && (self.Speed = self.OSpeed);
                        !$User.LowPerformanceMode && EditCompositeStyle({
                            ele: self.EleBody,
                            styleName: 'filter',
                            delFuncs: [
                                ['url', oSVG.getSVG('getExcited')]
                            ],
                            option: 2
                        });
                    }
                });
            }
        },
        NormalDie() {
            let self = this;
            let ele = self.Ele;
            self.freeStaticEffect(self, "All");
            self.PrivateDie && self.PrivateDie(self);
            self.EleBody.src = self.PicArr[self.DieGif];
            oSym.addTask(300, oEffects.fadeOut, [ele, 'fast', _ => ClearChild(ele)]);
            self.HP = 0;
            delete $Z[self.id];
            oP.MonitorZombiePosition(self);
            self.PZ && oP.MonPrgs(self);
        },
        //灰烬死亡
        ExplosionDie() {
            let self = this;
            let eleWrap = self.Ele;
            let explosionEle = NewImg(self.id + '_BoomDieGif', self.PicArr[self.BoomDieGif], null, eleWrap);
            self.freeStaticEffect(self, "All");
            SetStyle(explosionEle, self.getCharredCSS(self, self.R, GetC(self.ZX)));
            // 修复被黄油定住的僵尸被炸死时显示异常的问题
            ClearChild(self.EleBody);
            self.PrivateDie && self.PrivateDie(self);
            oSym.addTask(300, oEffects.fadeOut, [eleWrap, 0.7, _ => {
                ClearChild(eleWrap);
            }]);
            self.HP = 0;
            delete $Z[self.id];
            oP.MonitorZombiePosition(self);
            self.PZ && oP.MonPrgs(self);
        },

        //死亡，直接移除
        DisappearDie: function() {
            let self = this;
            self.PrivateDie && self.PrivateDie(self);
            ClearChild(self.Ele);
            self.HP = 0;
            delete $Z[self.id];
            oP.MonitorZombiePosition(self);
            self.PZ && oP.MonPrgs(self);
        },
        //压死，小推车
        CrushDie: function(rotateTime = 0.15) {
            let self = this,
                id = self.id;
            self.freeStaticEffect(self, "All");
            self.PrivateDie && self.PrivateDie(self);
            self.GoingDieHead(id, self.PicArr, self);
            self.HP = 0;
            self.EleBody.src = self.PicArr[self.LostHeadGif];
            delete $Z[id];
            self.DieRotate(self, rotateTime);
            oP.MonitorZombiePosition(self);
            self.PZ && oP.MonPrgs(self);
        },
        DieRotate(self, time = 0.1) {
            if (self.AKind != 0) {
                ClearChild(self.Ele);
                return;
            }
            let TrueWidth = self.beAttackedPointR - self.beAttackedPointL;
            oEffects.Animate(self.EleBody, {
                transform: "rotate(90deg) rotateY(45deg)",
                top: (self.height - TrueWidth - 20) + "px",
                left: "30px"
            }, time / oSym.NowSpeed, 'cubic-bezier(0.4, 0.0, 0.6, 1)', _ => {
                oEffects.Animate(self.Ele, {
                    opacity: 0
                }, 0.05 / oSym.NowSpeed, false, _ => {
                    ClearChild(self.Ele);
                });
            });
        },
        //被三叶草吹飞死亡，即战术风扇
        FloatingDie(self) {
            const id = self.id;
            if (!$Z[id] || !self.isFloating) return;
            self.HP = 0;
            delete $Z[id];
            oP.MonitorZombiePosition(self);
            self.PZ && oP.MonPrgs(self);
            oEffects.Animate(self.Ele, {
                left: '1290px'
            }, 'fast', 'cubic-bezier(0.4, 0.0, 0.6, 1)', _ => {
                ClearChild(self.Ele);
            });
        },
        GoingDieHead(id, PicArr, self) {
            let ele = NewImg(`${id}_Head`, PicArr[self.HeadGif], `left:${self.AttackedLX}px;top:${self.pixelTop - 20}px;z-index:${3 * self.R + 1};`, EDPZ);
            if (oGd.$GdType[self.R][GetC(self.ZX)] === 2) {
                oSym.addTask(90, _ => {
                    oAudioManager.playAudio("zombiesplash");
                    let src = oDynamicPic.require(WaterSplashImg,ele);
                    ele.src = src;
                    SetStyle(ele, {
                        width: "100px",
                        height: "122px",
                        top: GetY(self.R) - 110 + "px",
                        left: self.AttackedLX + 80 + "px",
                    });
                    oSym.addTask(113, _ => {
                        ClearChild(ele);
                    });
                });
            } else {
                oSym.addTask(200, oEffects.fadeOut, [ele, 'fast', ClearChild]);
            }
            let url = EditCompositeStyle({
                ele: self.EleBody,
                styleName: 'filter',
                targetFunc: 'url'
            });
            EditCompositeStyle({
                ele,
                styleName: 'filter',
                addFuncs: [
                    ["url", url]
                ],
                option: 2
            });
        },
        GoingDieHeadNew(id, PicArr, self, config = {}) { //通过旋转图片来达到掉头
            let bca, topa = self.pixelTop + (Number.parseInt(self.EleBody.style.top) || 0),
                lefta = self.AttackedLX; //默认数据
            let R = self.R;
            bca = GetY(R);
            let rand = (Math.random() >= 0.5 ? 1 : -1);
            let {
                vy = -3,
                    ay = 0.4,
                    vx = rand * (-Math.random() * 1 - 1),
                    rotate = 0,
                    bc = bca,
                    top = topa,
                    left = lefta,
                    times = 0,
                    rotateSpeed = rand * (Math.random() * 1.5 + 1.5),
                    scale = 1,
            } = config;
            top += self.DivingDepth;
            const cont = oZombieLayerManager.$Containers[self.R];
            const zIndex = self.zIndex_cont + 1;
            const ele = NewImg(`${id}_Head`, PicArr[self.HeadGif], `left:${left}px;top:${top}px;z-index:${zIndex};transform:rotate(${-rotate}deg) scale(${scale})`, cont);
            oSym.addTask(3, function loop() {
                left += vx;
                top += (vy += ay);
                ele.setAttribute('style',  `left:${left}px;top:${top}px;z-index:${zIndex};transform:rotate(${-rotate}deg) scale(${scale});`);
                rotate += rotateSpeed;
                while (rotate < 0) {
                    rotate = (360 + rotate) % 360;
                }
                if (top <= bc) {
                    oSym.addTask(3, loop);
                } else {
                    if (times > 3) {
                        oSym.addTask(50, oEffects.fadeOut, [ele, 'fast', ClearChild]);
                    } else if (oGd.$GdType[R][GetC(left)] !== 2) {
                        top = bc;
                        vy = -vy / 3;
                        times++;
                        oSym.addTask(3, loop);
                    } else {
                        ClearChild(ele);
                        let tmp = NewImg(0, null, `position:absolute;left:${left}px;top:${top}px;z-index:${self.zIndex_cont + 2};width:100px;height:122px;transform:translateX(-50%) translateY(-50%);`, cont);
                        tmp.src = oDynamicPic.require(WaterSplashImg,tmp);
                        oAudioManager.playAudio("zombiesplash");
                        oSym.addTask(113, ClearChild, [tmp]);
                    }
                }
            });
            let url = EditCompositeStyle({
                ele: self.EleBody,
                styleName: 'filter',
                targetFunc: 'url'
            });
            EditCompositeStyle({
                ele: ele,
                styleName: 'filter',
                addFuncs: [
                    ["url", url]
                ],
                option: 2
            });
        },
        ChanceThrowCoin(self) {
            if (oS.CoinRatio === 0 || self.isPuppet || !oS.isStartGame) {
                return;
            }
            let rand = Math.random() * 10000;
            if (rand < 70 * oS.CoinRatio) {
                new oCoin("gold").throwIt({
                    x: self.ZX,
                    y: self.pixelTop + self.height / 2
                });
            } else if (rand < 500 * oS.CoinRatio) {
                new oCoin("silver").throwIt({
                    x: self.ZX,
                    y: self.pixelTop + self.height / 2
                });
            }
        },
        GoingDie(img) {
            let self = this,
                id = self.id;
            self.EleBody.src = img;
            self.GoingDieHead(id, self.PicArr, self);
            self.beAttacked = 0;
            self.isGoingDie = 1;
            self.FreeSlowTime = 0;
            self.freeStaticEffect(self, "All");
            self.AutoReduceHP(id);
            self.ChanceThrowCoin(self);
        },
        AutoReduceHP(id) { //垂死僵尸持续减血
            let self = this;
            oSym.addTask(100, _ => {
                $Z[id] && ((self.HP -= 60) < 1 ? self.NormalDie() : self.AutoReduceHP(id));
            });
        },
        SetBrightness(self, ele, deep) {
            if ($User.LowPerformanceMode) {
                return;
            }
            ele && EditCompositeStyle({
                ele,
                styleName: 'filter',
                delFuncs: ['brightness'],
                addFuncs: [
                    ['brightness', deep ? '110%' : '100%']
                ],
                option: 2,
            });
        },
        Bounce(config = {}) { //僵尸弹起效果，会触发战术风扇
            /* config调用说明{
                distance: 弹出距离（单位：格）
                velocity: 竖直方向初速度（单位：px）
                canBeAttacked：是否标记为飞行状态（是否允许攻击），默认允许
            }*/
            const self = this;
            const {
                distance = 1.1, velocity = -5, canBeAttacked = false
            } = config;
            const {
                Speed: oldSpeed,
                Altitude: oldAltitude,
                id: zid
            } = self;
            if (!self.isFloating && ! self.isPuppet && oldAltitude !== 3) { //被弹起的和高空飞行状态的僵尸不能触发再弹起
                self.Speed = 0; //标记僵尸静止
                self.isFloating = true; //标记僵尸浮空
                !canBeAttacked && (self.Altitude = 3); //标记僵尸高空飞行，不可被攻击
                let wrapEle = this.Ele;
                let bodyEle = this.EleBody;
                let s = 80 * distance;
                let zx = self.ZX - (self.beAttackedPointR - self.beAttackedPointL) / 2 * (self.WalkDirection * 2 - 1);
                let isInWater = (self.LivingArea === 2 && self.isSinkAnimFinished === true )
                        || (self.LivingArea === 1 && self.isSinkAnimFinished === false);
                //let isInWater = self.LivingArea === 2 && self.isSinkAnimFinished
                //        || self.LivingArea === 1 && !self.isSinkAnimFinishe;
                if (self.FangXiang === "GoUp" || self.FangXiang === "GoDown") {
                    s = 0;
                } else if (isInWater) {
                    let C = GetC(zx) + (self.LivingArea === 2 ? 0 : 1);
                    while (oGd.$GdType[self.R][C] === 2) {
                        C++;
                    }
                    s = Math.min(s, GetX(C - 1) - zx);
                }
                // 僵尸被弹离的距离不能超过C=10
                s = Math.min(s, GetX(10) - zx);
                if(distance>0&&s<0){
                    s=0;
                }
                let gravity = 0.24;
                let deltaY = 0;
                let vy = velocity;
                let vx = -(gravity * s) / (2 * vy);
                let outWaterFlag = 0;
                requestAnimationFrame(function () {
                    if (!$Z[zid]) return;
                    let x = Number.parseFloat(wrapEle.style.left);
                    let y = Number.parseFloat(bodyEle.style.top);
                    let oldTop = bodyEle.style.top;
                    (function drawFrame() {
                        if ($Z[zid]) {
                            vy += gravity;
                            wrapEle.style.left = (x += vx) + 'px';
                            self.AttackedLX += vx;
                            self.AttackedRX += vx;
                            self.ZX += vx;
                            self.X += vx;
                            deltaY += vy;
                            bodyEle.style.top = (y += vy) + 'px';
                            if (isInWater) {
                                self.useSinkIntoWaterEffect(self, y);
                                if (deltaY <= -self.DivingDepth && !outWaterFlag) {
                                    outWaterFlag = 1;
                                    self.EleShadow.style.cssText = self.EleShadow.dataset.tmp_cssText;
                                } else if (deltaY >= -self.DivingDepth && outWaterFlag) {
                                    self.EleShadow.style.cssText = self.EleShadow.dataset.tmp_cssText + `background:url(${self.WaterShadowGif});`;
                                    self.setWaterStyle(self, self.EleShadow);
                                }
                            }
                            if (y - self.DivingDepth >= 0) { //检查僵尸是否落地，否则继续回调
                                self.isFloating = false;
                                bodyEle.style.top = oldTop; //上次自己做关卡时还是出bug，这里修正()
                                if(!canBeAttacked){
                                    self.Altitude = oldAltitude;
                                }
                                self.Speed = oldSpeed;
                                return;
                            }
                            oSym.addTask(2, drawFrame);
                        }                        
                    })();
                });
            }
        },
}),
OrnNoneZombies = function() {
    let getHit = function(self, attack) {
        if(self.ShieldHP > 0) {self.getShieldHit(self);}
        else{
            if((self.HP -= attack) < self.BreakPoint) {
            self.GoingDie(self.PicArr[[self.LostHeadGif, self.LostHeadAttackGif][self.isAttacking]]);
            self.getHit0 = self.getHit1 = self.getHit2 = function() {};
            return;
            }
        }
        self.SetBrightness(self, self.EleBody, 1);
        oSym.addTask(10, _ => $Z[self.id] && self.SetBrightness(self, self.EleBody, 0));
    };
    return InheritO(CZombies, {
        EName: 'OrnNoneZombies',
        getHit,
        getHit0: getHit,
        getHit1: getHit,
        getHit2: getHit,
        getPea(self, attack, direction) {  //direction表示触发器侦测方向，0为水平自左向右，1为水平自右向左
            self.PlayNormalballAudio();
            self.getHit0(self, attack, direction);
        },
        getFirePea(self, attackPower, dir) {
            self.PlayFireballAudio();
            // 强制解除僵尸的冰冻减速、原地冰封效果
            if(self.FreeSlowTime || self.FreeFreezeTime || self.FreeVertigoTime) {
                self.freeStaticEffect(self, "Freeze");
                self.FreeSlowTime = 0;
                self.FreeVertigoTime = 0;
                self.Attack = self.OAttack;
                // 定身效果不会因僵尸的速度变化而被消除，可以放心修改
                self.Speed = self.OSpeed;
                ClearChild(self.Ele.querySelector('.buff_freeze,.buff_vertigo'));
                !$User.LowPerformanceMode && EditCompositeStyle({ ele: self.EleBody, styleName: 'filter', delFuncs: ['url'], option: 2 });
            }
            const LX = self.AttackedLX;
            oZ.getArZ(LX, LX + 40, self.R).forEach(zombie => zombie.getFirePeaSputtering());
            self.getHit0(self, attackPower, dir);
        },
        getFirePeaSputtering() {
            this.getHit0(this, 13);
        },
        getSnowPea(self, attackPower, dir, keepTime = 1000) {
            if(self.FreeSlowTime===0) {
                self.PlaySlowballAudio();
            }else{
                self.PlayNormalballAudio();
            }
            self.getSlow(self, keepTime);
            self.getHit0(self, attackPower, dir);
        },
    })
} (),
OrnIZombies = function() {
    var a = function(f, b) {
        var d = f.OrnHP,
        c = f.HP,
        e = OrnNoneZombies.prototype;
        if((f.OrnHP - b) < 1){
            d = f.OrnHP -= b;
            f.HP += d;
            f.Ornaments = 0;
            f.EleBody.src = f.PicArr[[f.NormalGif = f.OrnLostNormalGif,f.AttackGif = f.OrnLostAttackGif][f.isAttacking]];
            (!f.NormalballAudioTT && (f.PlayNormalballAudio = e.PlayNormalballAudio));  //是否使用默认打击音乐开关 
            f.PlayFireballAudio = e.PlayFireballAudio;
            f.PlaySlowballAudio = e.PlaySlowballAudio;
            f.getHit = f.getHit0 = f.getHit1 = f.getHit2 = e.getHit;
            f.getHit(f,0);
        }else{
            if (f.ShieldHP>0) {f.getShieldHit(f);}
            else{
            d = f.OrnHP -= b;
            f.SetBrightness(f, f.EleBody, 1);
            oSym.addTask(10,
            function(h, g) { (g = $Z[h]) && g.SetBrightness(g, g.EleBody, 0)
            },
            [f.id]);}
        }
    };
    return InheritO(OrnNoneZombies, {
        EName: 'OrnIZombies',
        Ornaments: 1,
        OrnLostNormalGif: 8,
        OrnLostAttackGif: 9,
        getHit: a,
        getHit0: a,
        getHit1: a,
        getHit2: a,
    })
} (),
OrnIIZombies = InheritO(OrnNoneZombies, {
    EName: 'OrnIIZombies',
    Ornaments: 2,
    BreakPoint: 91,
    NormalGif: 2,
    AttackGif: 3,
    LostHeadGif: 4,
    LostHeadAttackGif: 5,
    OrnLostNormalGif: 6,
    OrnLostAttackGif: 7,
    OrnLostHeadNormalGif: 8,
    OrnLostHeadAttackGif: 9,
    HeadGif: 10,
    DieGif: 11,
}),
//庭院僵尸从以下开始
oZombie = InheritO(OrnNoneZombies, {
    EName: "oZombie",
    CName: "普通僵尸",
    StandGif: 8,
    BoomDieGif: 9,
    width: 216,
    height: 164,
    beAttackedPointL: 70,
    beAttackedPointR: 140,
    CardStars: 1,
    Almanac:{
        Tip:"在旅途中一般路过的普通僵尸",
        Story:"普通——这个词语概括他一生的悲剧，他的名字与故事在这场以戴夫和僵尸博士为主的宏大叙事中无处可寻，哪怕在出生时做出一点小小的改变——比如捡个什么东西戴在头上——就可以让他的本质产生根本性的改变。但是嘿，他只是个僵尸。这些事情对他而言无关紧要，甚至不如博士用豆类做的仿造脑子更值得他深思。",
    },
    getShadow: self => "left:75px;top:" + (self.height - 25) + "px;",
    PicArr: (a => ["images/Card/Zombie.webp?useDynamicPic=false", "", a + "Zombie.webp", a + "ZombieAttack.webp", a + "ZombieLostHead.webp", a + "ZombieLostHeadAttack.webp", a + "ZombieHead.webp?useDynamicPic=false", a + "ZombieDie.webp", a + "1.webp", 'images/Zombies/BoomDie.webp'])("images/Zombies/Zombie/"),
    GoingDieHead(id, PicArr, self){
        CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
            top: self.pixelTop + 44,
            left: self.X + 80,
            bc: self.pixelTop + 118,
        });
    },
}),
oConeheadZombie = InheritO(OrnIZombies, {
    EName: "oConeheadZombie",
    CName: "路障僵尸",
    OrnHP: 370,
    Lvl: 2,
    StandGif: 10,
    BoomDieGif: 11,
    width: 216,
    height: 164,
    beAttackedPointL: 70,
    beAttackedPointR: 140,
    CardStars: 2,
    Almanac:{
        Tip:"带上了路障，让自己变得稍微抗揍了一些的僵尸",
        Story:"路障僵尸在世界各地旅游过，森林，沼泽，沙滩…他也许说不出这些地方具体的地名，但在那里他过的十分快乐，虽然在那里的经历并没给他留下特别深的印象——直到他到了中国，被一群孩童吵着闹着叫做智障僵尸以后",
    },
    getShadow: function(a) {
        return "left:75px;top:" + (a.height - 25) + "px;"
    },
    PicArr: (function() {
        var b = "images/Zombies/ConeheadZombie/",
        a = "images/Zombies/Zombie/";
        return ["images/Card/ConeheadZombie.webp?useDynamicPic=false", "", b + "ConeheadZombie.webp", b + "ConeheadZombieAttack.webp", a + "ZombieLostHead.webp", a + "ZombieLostHeadAttack.webp", a + "ZombieHead.webp?useDynamicPic=false", a + "ZombieDie.webp", a + "Zombie.webp", a + "ZombieAttack.webp", b + "1.webp", 'images/Zombies/BoomDie.webp']
    })(),
    AudioArr: ["plastichit", 'plastichit2'],
    PlayNormalballAudio: function() {
        oAudioManager.playAudio(["plastichit", 'plastichit2'][Math.round(Math.random() * 1)]);
    },
    GoingDieHead(id, PicArr, self){
        CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
            top: self.pixelTop + 44,
            left: self.X + 80,
            bc: self.pixelTop + 118,
        });
    },
}),
oBucketheadZombie = InheritO(oConeheadZombie, {
    EName: "oBucketheadZombie",
    CName: "铁桶僵尸",
    OrnHP: 1100,
    Lvl: 4,
    width: 216,
    height: 164,
    beAttackedPointL: 70,
    beAttackedPointR: 140,
    CardStars: 3,
    Almanac:{
        Tip:"带上了铁桶，让自己变得十分耐揍的僵尸",
        Story:"他头上戴着一个铁桶，是的，铁桶。这个标志让他一度在这个冷漠的世界独一无二，这个防具让他一度在一众僵尸眼中成为了他们中的天才，但如今，在僵尸们窃窃私语他是否已经江郎才尽的当下，在带铁桶这件事随着防具种类的发展与数目的增加逐渐反潮流的当下，这个铁桶似乎除了实用价值外再无意义，这时他才想起来头上原来还有这么一个东西，而这曾经只是因为在经济不景气时他没有更好的选择。",
    },
    getShadow: function(a) {
        return "left:75px;top:" + (a.height - 25) + "px;"
    },
    AudioArr: ["shieldhit", "shieldhit2"],
    PlayNormalballAudio: function() {
        oAudioManager.playAudio(["shieldhit", "shieldhit2"][Math.floor(Math.random() * 2)])
    },
    PicArr: (function() {
        var b = "images/Zombies/BucketheadZombie/",
        a = "images/Zombies/Zombie/";
        return ["images/Card/BucketheadZombie.webp?useDynamicPic=false", "", b + "BucketheadZombie.webp", b + "BucketheadZombieAttack.webp", a + "ZombieLostHead.webp", a + "ZombieLostHeadAttack.webp", a + "ZombieHead.webp?useDynamicPic=false", a + "ZombieDie.webp", a + "Zombie.webp", a + "ZombieAttack.webp", b + "1.webp", 'images/Zombies/BoomDie.webp']
    })(),
}),
//森林僵尸从以下开始
oNewspaperZombie = InheritO(OrnIIZombies, {
    EName: "oNewspaperZombie",
    CName: "读报僵尸",
    OrnHP: 300,
    Lvl: 2,
    LostPaperGif: 12,
    StandGif: 13,
    BoomDieGif: 14,
    width: 216,
    height: 164,
    beAttackedPointL: 60,
    beAttackedPointR: 130,
    LostPaperSpeed: 4.8,
    LostPaperAttack: 200,
    CardStars: 2,
    Almanac:{
        Tip:"他的报纸能提供有限的防御",
        get Story(){
            let strB = "在纸质传统媒体已经不再兴盛的当下，";
            let strC = "那些伦敦本地发生的新闻反倒不怎么引起他的注意，";
            let strD = "尽管他已经给女儿买了手机，但读报僵尸仍然执迷于报纸上的数独谜题与填字游戏。";
            let strA = strB+strD+strC;
            let json = localStorage.JNG_TR_WON?JSON.parse(localStorage.JNG_TR_WON):{};
            if(json["Industry23"]){
                return strA+"哪怕是首相竞选者坠湖这种爆炸性的新闻。";
            }else if(json["Industry20"]){
                return strA+"虽然大多数都是一个小家子坠湖之类的消费别人苦难的无聊东西。";
            }else if(json["Industry17"]){
                return strB+"那些报纸急需为某些荒诞猎奇的事件来做独家报道，以提升自己的销量。比如这次，卡车司机因撞死一只猫而受到当地法院审判——这也许是唯一一次，报纸僵尸没有去关注报纸上的数独谜题与填字游戏。";
            }else if(json["Industry13"]){
                return strA+"毕竟他们连卡车撞死一只猫这件事都能当回事地去报道。";
            }else{
                return strB+strD+"比如第23号纵行上的“brains”。";
            }
        },
        Speed:"慢，打破报纸时快"
    },
    GetCardImg(){
        let self = this;
        return "images/Card/"+self.EName.substr(1).split("_")[0]+".webp";
    },
    PicArr: (function() {
        var a = "images/Zombies/NewspaperZombie/";
        return ["", "", a + "walk_newspaper.webp", a + "eat_newspaper.webp", a + "walk_newspaper_withoutHead.webp", a + "eat_newspaper_withoutHead.webp", a + "walk.webp", a + "eat.webp", a + "walk_withoutHead.webp", a + "eat_withoutHead.webp", a + "head.webp", a + "die.webp", a + "newspaper_defeat.webp", a + "idle_newspaper.webp", 'images/Zombies/BoomDie.webp']
    })(),
    AudioArr: ["newspaper_rarrgh2", "newspaper_rarrgh2", "newspaper_rip"],
    getShadow: function(a) {
        return "left:75px;top:" + (a.height - 25) + "px;"
    },
    GoingDieHead(id, PicArr, self){
        CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
            left: self.X + 76,
            top: self.pixelTop + 51,
            bc: self.pixelTop + 118,
        });
    },
    getSnowPea: function(c, a, b) {
        oAudioManager.playAudio("splat" + Math.floor(1 + Math.random() * 3));
        c.getHit0(c, a, b)
    },
    getPea(self, attack, direction=0) {
        if(/^Polar\d+jx$/.test(oS.Lvl)) {  //泠漪:冰原镜像的读报可以直接被射手击中本体
            return self.getHit2(self, attack);
        }
        self.PlayNormalballAudio();
        self.getHit0(self, attack, direction);
    },
    getFirePea(self, attackPower, dir) {
        self.PlayFireballAudio();
        if(self.FreeSlowTime || self.FreeFreezeTime || self.FreeVertigoTime) {
            self.Attack = self.OAttack;
            self.FreeSlowTime = 0;
            self.FreeVertigoTime = 0;
            ClearChild(self.Ele.querySelector('.buff_freeze,.buff_vertigo'));
            !$User.LowPerformanceMode && EditCompositeStyle({ ele: self.EleBody, styleName: 'filter', delFuncs: ['url'], option: 2 });
             // 只有在僵尸没有其他定身效果的前提下，才能恢复原速
            if (self.isNotStaticed()) {
                self.Speed = self.OSpeed;
            }
        }
        const LX = self.AttackedLX;
        oZ.getArZ(LX, LX + 40, self.R).forEach(zombie => zombie !== self && zombie.getFirePeaSputtering());
        if((self.HP -= attackPower) < self.BreakPoint) {
            self.getFirePea = OrnNoneZombies.prototype.getFirePea;
            self.GoingDie(self.PicArr[[self.LostHeadGif, self.LostHeadAttackGif][self.isAttacking]]);
            self.getHit = self.getHit0 = self.getHit1 = self.getHit2 = () => {};
        } else {
            self.CheckOrnHP(self, self.id, self.OrnHP, attackPower, self.PicArr, self.isAttacking, 0);
            self.SetBrightness(self, self.EleBody, 1);
            oSym.addTask(10, () => $Z[self.id] && self.SetBrightness(self, self.EleBody, 0));
        }
    },
    //碰撞类攻击（坚果保龄球，各种普通子弹）
    getHit0: function(c, a, b) {
        if (c.ShieldHP>0) {
            c.getShieldHit(c);
            return;
        }
        b == c.WalkDirection ? (
            c.CheckOrnHP(c, c.id, c.OrnHP, a, c.PicArr, c.isAttacking, 1),
            c.SetBrightness(c, c.EleBody, 1),
            oSym.addTask(10, (e, d)=> { (d = $Z[e]) && d.SetBrightness(d, d.EleBody, 0)}, [c.id])
        ) : (c.HP -= a) < c.BreakPoint && (
            c.GoingDie(c.PicArr[[c.LostHeadGif, c.LostHeadAttackGif][c.isAttacking]]),
            c.getFirePea = OrnNoneZombies.prototype.getFirePea,
            c.getSnowPea = OrnNoneZombies.prototype.getSnowPea,
            c.getHit = c.getHit0 = c.getHit1 = c.getHit2 = function() {}
        )
    },
    //穿透类攻击（大喷菇）
    getHit1: function(b, a) {
        if (b.ShieldHP>0) {
            b.getShieldHit(b);
            return;
        }
        (b.HP -= a) < b.BreakPoint ? (
            b.GoingDie(b.PicArr[[b.LostHeadGif, b.LostHeadAttackGif][b.isAttacking]]),
            b.getFirePea = OrnNoneZombies.prototype.getFirePea,
            b.getSnowPea = OrnNoneZombies.prototype.getSnowPea,
            b.getHit = b.getHit0 = b.getHit1 = b.getHit2 = function() {}
        ) : (
            b.CheckOrnHP(b, b.id, b.OrnHP, a, b.PicArr, b.isAttacking, 0),
            b.SetBrightness(b, b.EleBody, 1),
            oSym.addTask(10, (d, c)=>{ (c = $Z[d]) && c.SetBrightness(c, c.EleBody, 0)}, [b.id])
        )
    },
    //投弹类攻击
    getHit2: function(b, a) {
        if (b.ShieldHP>0) {
            b.getShieldHit(b);
            return;
        }
        (b.HP -= a) < b.BreakPoint ? (
            b.GoingDie(b.PicArr[[b.LostHeadGif, b.LostHeadAttackGif][b.isAttacking]]),
            b.getFirePea = OrnNoneZombies.prototype.getFirePea,
            b.getSnowPea = OrnNoneZombies.prototype.getSnowPea,
            b.getHit = b.getHit0 = b.getHit1 = b.getHit2 = function() {}
        ) : (
            b.SetBrightness(b, b.EleBody, 1), oSym.addTask(10, function(d, c) {
                (c = $Z[d]) && c.SetBrightness(c, c.EleBody, 0)
            }, [b.id])
        )
    },
    CheckOrnHP(self, id, OrnHP, power, PicArr, isAttacking) {
        const pro = OrnNoneZombies.prototype;
        if ((self.OrnHP  -= power) < 1) {
            oAudioManager.playAudio("newspaper_rip");
            const temp_ChkActs = self.ChkActs;
            const newImageSrc = PicArr[[self.NormalGif = self.OrnLostNormalGif, self.AttackGif = self.OrnLostAttackGif][isAttacking]];
            self.ChkActs =  _=> 1;
            self.EleBody.src = PicArr[self.LostPaperGif];
            self.Ornaments = 0; 
            self.LostHeadGif = 8; 
            self.LostHeadAttackGif = 9; 
            self.getFirePea = pro.getFirePea; 
            self.getSnowPea = pro.getSnowPea; 
            self.getHit = self.getHit0 = self.getHit1 = self.getHit2 = pro.getHit;
            new Image().src = newImageSrc;
            oSym.addTask(140, () => {
                if (!$Z[self.id]) {
                    return;
                }
                let pro2 = CZombies.prototype;
                let speed = self.OSpeed = self.LostPaperSpeed;
                self.ChkActs = temp_ChkActs;
                self.Attack = self.LostPaperAttack;
                self.OAttack = self.Attack;
                self.Speed && (self.Speed = !self.FreeSlowTime ? speed : 0.5 * speed);
                if (self.beAttacked) {
                    oAudioManager.playAudio(["newspaper_rarrgh", "newspaper_rarrgh2"][Math.round(Math.random() * 1)]);
                    self.EleBody.src = newImageSrc;
                    self.JudgeAttack();    
                }
            });
        }
    },
}),
oBalloonZombie = InheritO(OrnNoneZombies, {
    EName: "oBalloonZombie",
    CName: "气球僵尸",
    Lvl: 2,
    getShieldCSS: _ => "left:60px;top:195px;",
    width: 280,
    height: 320,
    beAttackedPointL: 100,
    beAttackedPointR: 143,
    OSpeed: 1.5,
    Speed: 2.5,
    StandGif: 0,
    StaticGif: 0,
    NormalGif: 0,
    LostHeadGif: 7,
    JumpGif: 1,
    AttackGif: 3,
    LostHeadAttackGif: 9,
    HeadGif: 10,
    DieGif: 5,
    BoomDieGif: 6,
    isFloating: true,
    isPrivateFlying: true,
    TargetLX: null,
    CanAppearFromTomb: false,
    CanGoThroughWater: false,
    CardStars: 1,
    getShadow: self => `left:${self.beAttackedPointL - 20}px;top:${self.height-30}px;`,
    HeadTargetPosition: [{x: 67,y: 186}],
    // 从水里冒出来的气球僵尸不用调整EleBody的top值
    extraDivingDepth: -oWaterPath.defaultDepth,
    getCharredCSS(self, R, C) {
        return self.isPrivateFlying ? {
            left: 6,
            top: 4,
            '-webkit-mask-image': oGd.$GdType[R][C] === 2 ?
                "linear-gradient(black 0px 296px, transparent 305px)" : "",
        } : {
            left: 82,
            top: 205 + self.DivingDepth / 2,
            clip: self.DivingDepth > 0 ? "rect(0px, auto, 95px, 0px)" : "",
        };
    },
    AudioArr: ["balloon_pop", 'ballooninflate'],
    PicArr: ["fly.webp", "fly_end.webp", "walk.webp", "eat.webp", "die.webp", "die_balloon_zombie.webp", "fly_boom.webp", "fly_losthead.webp", "walk_losthead.webp", "eat_losthead.webp", "head.webp"].map(url => "images/Zombies/BalloonZombie/" + url).concat("images/Zombies/BoomDie.webp"),
    Almanac: {
        Tip: "气球僵尸可以飞越一般高度的植物，但之后气球就会爆炸",
        Speed: "中",
        Story: "也许，只要再多一个气球，他就可以在飞过一棵植物后再多飞一阵——气球僵尸这样想着，即使对于其他僵尸来说，他们甚至未曾领略过从高处向下看到的风景。",
    },
    getAlmanacDom(pro) {
        if (!pro.Almanac.Dom) {
            let ClassAlmanac = CZombies.prototype.Almanac;
            for (let i in ClassAlmanac) {
                if (!pro.Almanac[i]) {
                    pro.Almanac[i] = ClassAlmanac[i];
                }
            }
            let _width = pro.displayWidth ?? pro.width;
            let _height = pro.displayHeight ?? pro.height;
            pro.Almanac.Dom = pro.getDisplayHTML("", 200 - _width / 2, 475 - _height, "1;height:" + _height + "px;width:" + _width + "px", "block", "auto", pro.GetDTop, pro.PicArr[pro.StandGif]);
        }
    },
    BirthCallBack(self) {
        oAudioManager.playAudio("ballooninflate");
        OrnNoneZombies.prototype.BirthCallBack(self);
    },
    PrivateDie(self) {
        const proto = CZombies.prototype;
        if (self.LivingArea === 2) {
            self.extraDivingDepth = 0;
            self.setWaterStyle_middleWare = proto.setWaterStyle_middleWare;
            self.setWaterStyle = proto.setWaterStyle;
            self.useSinkIntoWaterEffect = proto.useSinkIntoWaterEffect;
            self.SetWater(oWaterPath.defaultDepth, null, null, null, false);
        }
    },
    GoingDieHead(id, PicArr, self) {
        return CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
            top: self.pixelTop + 169,
            left: self.X + 75,
            bc: self.pixelTop + 290,
        });
    },
    ChkCell_GdType(self) {
        let R = self.R;
        let C = GetC(self.ZX - (self.beAttackedPointR - self.beAttackedPointL) / 2 * (self.WalkDirection * 2 - 1));
        let gdType = oGd.$GdType[R][C];
        let oldGdType = self.LivingArea;
        if (oldGdType != gdType) {
            self.LivingArea = gdType;
        }
    },
    setWaterStyle_middleWare() {},
    setWaterStyle() {},
    useSinkIntoWaterEffect() {},
    GoLeft(o, R, arR, i, stepRatio=1) { //向左走
        let Speed = o.getRealSpeed(o,stepRatio);
        let hookKey = 1;
        if (o.isNotStaticed()) { //如果僵尸没有处于冰冻或者等待出场状态
            !o.isAttacking && !o.isGoingDie && o.JudgeAttack(stepRatio); //未临死，未攻击，进行攻击判断
            if (!o.isAttacking) {
                o.MoveZombieX(o,Speed);
                if (o.AttackedRX < -50) { //向左走出屏幕，算作直接死亡，不排序只更新
                    oZ.del(arR, i);
                    o.DisappearDie();
                    hookKey = 0;
                } else { //正常移动僵尸
                    o.Paint(o);
                    //检测到僵尸飞跃碰到的第一个植物，就降落
                    if (o.TargetLX !== null && o.X <= o.TargetLX && !o.isGoingDie && o.HP > o.BreakPoint && o.isNotStaticed()) {
                        o.NormalAttack(o.id);
                    }
                }
            }
        }
        //检查场地事件
        o.ChkCell_GdType(o);
        return hookKey;
    },
    JudgeAttack(stepRatio=1) {
        let self = this;
        let ZX = self.ZX;
        let crood = self.R + "_";
        let zombieC = GetC(ZX);
        let G = oGd.$;
        if (self.TargetLX !== null || self.isGoingDie || self.HP <= self.BreakPoint) return;
        for (let possC = zombieC; possC >= Math.max(zombieC - 2, 1); possC--) {
            let possPKind = 3;
            while (possPKind >= 0) {
                let plant = G[crood + possC + "_" + possPKind--];
                if (plant && plant.AttackedLX < ZX && ZX <= plant.AttackedRX && plant.canEat) {
                    if (plant.EName === "oBrains") {
                        self.JudgeAttack = CZombies.prototype.JudgeAttack;
                        self.NormalAttack = CZombies.prototype.NormalAttack;
                        self.NormalAttack(self.id, plant.id);
                    }
                    //处理高坚果，巨型坚果保龄球的情况
                    else if (plant.Stature > 0) {
                        self.NormalAttack(self.id);
                    }
                    //处理普通植物的情况
                    else {
                        self.TargetLX = plant.AttackedLX - self.beAttackedPointR;
                    }
                    return;
                }
            }
        }
    },
    NormalAttack(zid) {
        const proto = CZombies.prototype;
        const self = $Z[zid];
        const ele = self.Ele;
        const eleBody = self.EleBody;
        const R = self.R;
        const C = GetC(Math.floor(self.ZX) - (self.beAttackedPointR - self.beAttackedPointL) / 2 * (self.WalkDirection * 2 - 1));
        const isInWater = oGd.$GdType[R][C] === 2;
        let targetTop = 
            oGd.$WaterDepth[R][C] + (self.extraDivingDepth = CZombies.prototype.extraDivingDepth);
        eleBody.src = self.PicArr[self.JumpGif];
        self.isAttacking = 2;
        self.isFloating = false;
        self.Altitude = 3;
        self.beAttacked = false;
        self.getFreeze = _ => self.getSnowPea(self, 20);
        self.GoLeft = proto.GoLeft;
        self.JudgeAttack = proto.JudgeAttack;
        new Image().src = self.PicArr[2];
        oSym.addTask(53, _ => {
            if (!$Z[zid]) return;
            oAudioManager.playAudio("balloon_pop");
            if (isInWater) {
                oAudioManager.playAudio(`Rifter_Summon${1 + Math.round(Math.random())}`, false, 0.3);
                self.setWaterStyle_middleWare = proto.setWaterStyle_middleWare;
                self.setWaterStyle = proto.setWaterStyle;
                self.useSinkIntoWaterEffect = proto.useSinkIntoWaterEffect;
                self.setWaterStyle_middleWare();
                self.useSinkIntoWaterEffect(self, targetTop);
                self.SetWater(targetTop, R, C, null, false, false);
                oEffects.ImgSpriter({
                    ele: NewEle(`DropWater_${Math.random()}`, "div", `position:absolute;overflow:hidden;z-index:${self.zIndex_cont + 2};width:150px;height:184px;left:${self.X + (self.beAttackedPointL + self.beAttackedPointR) / 2 - 73}px;top:${100*(R-1) + 21}px;transform:scale(1.25);background:url(images/Props/Rifter/Drop_Water.png) no-repeat`, 0, oZombieLayerManager.$Containers[R]),
                    styleProperty: 'X',
                    changeValue: -150,
                    frameNum: 37,
                    interval: 4,
                    callback: ClearChild,
                });
            }
        });
        oSym.addTask(133, () => {
            if (!$Z[zid]) return;
            self.NormalGif = 2;
            eleBody.src = self.PicArr[self.NormalGif];
            self.isAttacking = 0;
            self.Altitude = 1;
            self.beAttacked = true;
            self.OSpeed = 1.6;
            self.Speed = self.OSpeed * (self.FreeSlowTime ? 0.5 : 1);
            self.LostHeadGif = 8;
            self.DieGif = 4;
            self.BoomDieGif = 11;
            self.NormalAttack = proto.NormalAttack;
            self.getCrushed = proto.getCrushed;
            self.CrushDie = proto.CrushDie;
            self.getFreeze = proto.getFreeze;
            self.Bounce = proto.Bounce;
            self.setWaterStyle_middleWare = proto.setWaterStyle_middleWare;
            self.setWaterStyle = proto.setWaterStyle;
            self.useSinkIntoWaterEffect = proto.useSinkIntoWaterEffect;
            self.ChkCell_GdType = proto.ChkCell_GdType;
            self.isPrivateFlying = false;
            self.HeadTargetPosition = [{x: 76,y: 209}];
        });
        // 处理僵尸正好掉水里的情况
        if (isInWater) {
            oEffects.Animate(eleBody, {
                top: targetTop + 'px',
                clip: `rect(0px, auto, ${self.height - targetTop}px, 0px)`,
            }, 1, 'linear');
        }
    },
    getVertigo(self, attackPower, dir) {
        OrnNoneZombies.prototype.getVertigo(self, attackPower, dir, `left:${self.beAttackedPointL-50}px;top:${self.height-120}px`);
    },
    getCrushed(plant) {
        if (plant.Stature > 0) {
            return true;
        } else {
            this.NormalAttack(this.id);
            return false;
        }
    },
    CrushDie() {
        const self = this;
        CZombies.prototype.NormalDie.call(self);
        self.GoingDieHead(self.id, self.PicArr, self);
    },
    Bounce() {},
}),
oStrollZombie = InheritO(OrnNoneZombies, {
    EName: "oStrollZombie",
    CName: "漫步僵尸",
    OSpeed: 4.8,
    Speed: 4.8,
    HP: 130,
    AttackGif: 2,
    HeadGif: 3,
    DieGif: 4,
    StandGif: 5,
    BoomDieGif: 6,
    width: 166,
    height: 144,
    beAttackedPointL: 40,
    beAttackedPointR: 120,
    getShieldCSS: _ => "left:55px;top:65px;",
    CardStars: 2,
    Almanac:{
        Tip:"漫步僵尸快速行进，冲击你的防线，它碰到的植物都会被秒杀。",
        Weakness:"穿透类植物",
        Story:"虽然名叫“漫步僵尸”，但他向来都是比较容易着急上火的那个。走路急匆匆，吃饭急匆匆，甚至连玩游戏都要把调速的滑动条拉到最右，然后一遍速通。这也许就是为什么，他特别讨厌玩《植物大战僵尸旅行》。",
        Speed:"快",
    },
    PicArr: (() => {
        let a = "images/Zombies/StrollZombie/";
        return ["", "", a + "Zombie.webp", a + "ZombieHead.webp", a + "ZombieDie.webp", a + "1.webp", 'images/Zombies/BoomDie.webp'];
    })(),
    AudioArr: ["StrollZombie_Coming1", "StrollZombie_Coming2", "StrollZombie_Coming3"],
    getShadow: self => `left:55px;top:${self.height-30}px;`,
    getCharredCSS: self => ({
        left: 55,
        top: self.height * 0.2 + self.DivingDepth / 2,
        clip: self.DivingDepth > 0 ? "rect(0px, auto, 95px, 0px)" : "",
    }),
    NormalAttack: (zid, pid) => oSym.addTask(100, () => {
        const zombie = $Z[zid], plant = $P[pid];
        zombie && !zombie.isGoingDie && zombie.isNotStaticed() && (plant && plant.EName !== "oLSP1" && plant.Die(), zombie.JudgeAttack());
    }),
    BirthCallBack(self) {
        oAudioManager.playAudio("StrollZombie_Coming" + Math.floor(1 + Math.random() * 3), false, 0.4);
        OrnNoneZombies.prototype.BirthCallBack(self);
    },
    GoingDie() {
        let self = this, id = self.id;
        self.GoingDieHead(id, self.PicArr, self);
        self.beAttacked = 0;
        self.isGoingDie = 1;
        self.freeStaticEffect(self, "All");
        self.FreeSlowTime = 0;
        self.NormalDie();
        self.ChanceThrowCoin(self);
    },
    NormalDie() {   
        let self = this;
        self.PrivateDie && self.PrivateDie(self);
        self.EleBody.src = self.PicArr[self.DieGif];
        oSym.addTask(200, oEffects.fadeOut, [self.Ele, 'fast', ClearChild]);
        self.HP = 0;
        delete $Z[self.id];
        oP.MonitorZombiePosition(self);
        self.PZ && oP.MonPrgs(self);
    },
}),
oFootballZombie = InheritO(oConeheadZombie, {
    EName: "oFootballZombie",
    CName: "橄榄球僵尸",
    OrnHP: 1400,
    Lvl: 7,
    SunNum: 175,
    StandGif: 10,
    BoomDieGif: 11,
    width: 216,
    height: 164,
    beAttackedPointL: 70,
    beAttackedPointR: 130,
    OSpeed: 3.2,
    Speed: 3.2,
    CardStars: 3,
    getCharredCSS: self => ({
        left: 90,
        top: self.height / 3 + self.DivingDepth / 2,
        clip: self.DivingDepth > 0 ? "rect(0px, auto, 95px, 0px)" : "",
    }),
    Almanac:{
        Tip:"橄榄球僵尸通过其高血量和矫健的步伐帮助僵尸吃脑子。",
        Speed:"快",
        Story:"最初他只是一个带着钢盔铁甲，虽抱着十一分热情但并不是很懂橄榄球是什么的傻小子。但随着他橄榄球技艺的不断精进，他逐渐成为了队里的“全明星”，并打出了三届获选新秀的优秀成绩。但在他向队里提出涨薪的消息被发到网上引起网暴，并不堪压力退圈之后，他就又什么都不是了，只是一个带着钢盔铁甲，虽抱着十一分热情但并不是很懂橄榄球是什么的傻小子。",
    },
    HeadTargetPosition:[{x:60,y:45},{x:80,y:45}],//头的位置数据
    PicArr: (function() {
        var a = "images/Zombies/FootballZombie/";
        return ["", "", a + "run.webp", a + "eat.webp", a + "run_withoutHead.webp", a + "eat_withoutHead.webp", "images/Zombies/Zombie/ZombieHead.webp", a + "die.webp", a + "run_withoutHelmet.webp", a + "eat_withoutHelmet.webp", a + "idle.webp", 'images/Zombies/BoomDie.webp']
    })(),
    getShadow: function(a) {
        return "left:" + (a.beAttackedPointL + 15) + "px;top:" + (a.height - 25) + "px;"
    },
    getVertigo(self, attackPower, dir) {
        OrnNoneZombies.prototype.getVertigo(self, attackPower, dir, `left:${self.beAttackedPointL+5}px;top:${self.height-130}px`);
    },
    NormalAttack(zid, pid) {
        oAudioManager.playAudio(["chomp", "chompsoft", 'chomp2'].random());
        oSym.addTask(75, _ => {
            let self = $Z[zid];
            if (self && !self.isGoingDie && self.isNotStaticed()) {
                oAudioManager.playAudio(["chomp", "chompsoft", 'chomp2'].random());
                //这里需要再检测一次，否则可能会出现莫名穿过的现象，或者啃的植物不对的现象
                let ZX = self.ZX;
                let crood = self.R + "_";
                let C = GetC(ZX);
                let G = oGd.$;
                let arr = (self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G));
                if (arr) {
                    [zid, pid] = arr;
                    let plant = $P[pid];
                    plant && plant.getHurt(self, self.AKind, self.Attack);
                }
                self.JudgeAttack();
            }
        });
    },
}),
oCigarZombie = InheritO(OrnNoneZombies, {
    EName: "oCigarZombie",
    CName: "雪茄僵尸",
    HP: 300,
    Status: 1,
    AttackGif: 2,
    DieGif: 3,
    StandGif: 4,
    NormalGif: 5,
    OpenBoxGif: 6,
    LostHeadGif: 8,
    LostHeadAttackGif: 9,
    HeadGif: 10,
    BoomDieGif: 11,
    canBoom: 1,
    beAttackedPointL: 72,
    AudioArr: ["cherrybomb", "squash_hmm"],
    BombTime: 100, //爆炸的倒计时
    CardStars: 3,
    Lvl: 3,
    HeadTargetPosition: [{
        x: 75,
        y: 30
    }, {
        x: 90,
        y: 30
    }],
    PicArr: (function() {
        var a = "images/Zombies/CigarZombie/";
        return ["", "", a + "Attack.webp", a + "Die.webp", a + "1.webp", a + "Walk.webp", a + "OpenBox.webp", "images/Zombies/Boom.png", a + "LostHead.webp", a + "LostHeadAttack.webp", a + "Head.webp", 'images/Zombies/BoomDie.webp']
    })(),
    Almanac: {
        Tip: "雪茄僵尸在场地行进时会随机爆炸。经过短暂的延迟后会炸死周围大约3×3的植物。",
        Weakness: "冰冻植物",
        Story: "雪茄僵尸生前混迹英国政治圈，除了抽雪茄外并无其他嗜好。他的政治生涯本一帆风顺，直到他在去交通局就任局长的的路上抽了一支搀着火药的雪茄。",
    },
    getShadow: _ => `left:85px;top:120px;`,
    getCharredCSS: (self) => ({
        left: 85,
        top: 35 + self.DivingDepth / 2,
        clip: self.DivingDepth > 0 ? "rect(0px, auto, 95px, 0px)" : "",
    }),
    getSnowPea(self, attackPower, dir) {
        self.canBoom = false; //被冰系植物攻击就失去了爆炸能力
        OrnNoneZombies.prototype.getSnowPea.call(self, self, attackPower, dir);
    },
    getFirePea(self, attackPower, dir) {
        //被火系植物攻击，切不处于水道中，则恢复爆炸能力
        self.canBoom = self.LivingArea !== 2;
        OrnNoneZombies.prototype.getFirePea.call(self, self, attackPower, dir);
    },
    async SetWater(depth, R, C, oldGdType, useAnim = true, toSetWaterStyle = true) {
        this.canBoom = false;
        return CZombies.prototype.SetWater.call(this, depth, R, C, oldGdType, useAnim, toSetWaterStyle);
    },
    JudgeAttack(stepRatio=1) {
        let self = this;
        let ZX = self.ZX;
        let crood = self.R + "_";
        let C = GetC(ZX);
        let G = oGd.$;
        let arr = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
        if (arr && self.Altitude === 1) { //地上的僵尸才能检测攻击
            !self.isAttacking && (self.isAttacking = 1, self.EleBody.src = self.PicArr[self.AttackGif]); //如果是首次触发攻击，需要更新到攻击状态
            self.NormalAttack(...arr); //实施攻击
        } else {
            //撤销攻击状态
            self.isAttacking && (self.isAttacking = 0, self.EleBody.src = self.PicArr[self.NormalGif]);
        }
        if (self.LivingArea == 2) {
            self.canBoom = 0;
        }
    },
    RandomOpenBox: function(a) {
        oSym.addTask(1,
            function run(c) {
                var b = $Z[c];
                if (!b) {
                    return;
                }
                if (b.BombTime <= 0) {
                    b && !b.isGoingDie && b.canBoom && b.OpenBox(c)
                    b.BombTime = Infinity;
                } else if (b.isNotStaticed()) { //如果还在任何的定身状态下，则时间不会减少
                    $Z[c].BombTime--;
                }
                if ($Z[c]) {
                    oSym.addTask(1, run, [c]);
                }
            },
            [a])
    },
    OpenBox: function(b) {
        oAudioManager.playAudio("squash_hmm");
        var a = $Z[b];
        a.EleBody.src = a.PicArr[a.OpenBoxGif];
        a.ChkActs = a.ChkActs1 = function() {
            return 1
        };
        a.JudgeAttack = function() {
            var g = this,
                d = g.ZX,
                e = g.R + "_",
                f = GetC(d),
                h = oGd.$,
                c;
            (c = g.JudgeLR(g, e, f, d, h) || g.JudgeSR(g, e, f, d, h)) ? (!g.isAttacking && (g.isAttacking = 1, g.EleBody.src = g.PicArr[g.AttackGif]), g.NormalAttack(c[0], c[1])) : g.isAttacking && (g.isAttacking = 0)
        };
        a.getPea = a.getSnowPea = a.getFirePeaSputtering = a.getFirePea = a.getHit = a.getHit0 = a.getHit1 = a.getHit2 = a.ChangeR = a.bedevil = function() {};
        oSym.addTask(50, c => {
            $Z[c] && (a.Status = 0, oSym.addTask(90, f => {
                var e = $Z[f],
                    d;
                e && (
                    (e.PlayBoomEffect(e.X, e.pixelTop - 80)),
                    (function(k, g) {
                        oEffects.ScreenShake();
                        var w = Math,
                            q = w.max(1, k - 1),
                            o = w.min(oS.R, k + 1),
                            n = w.max(1, g - 1),
                            h = w.min(oS.C, g + 1),
                            r = oGd.$,
                            l, j = "",
                            m;
                        do {
                            g = n;
                            do {
                                j = q + "_" + g + "_";
                                for (var l = 0, len = PKindUpperLimit; l < len; l++) {
                                    (m = r[j + l]) && m.Die("JNG_TICKET_CigarZombie");
                                }
                            } while (g++ < h)
                        } while (q++ < o)
                    })(e.R, GetC(e.ZX)), e.DisappearDie())
            }, [c]))
        }, [b]);
    },
    BirthCallBack(self) {
        let delayT = self.delayT;
        let id = self.id;
        let ele = self.Ele = $(id);
        const func = () => {
            ++oGd.$JackinTheBox;
            SetBlock(ele);
            self.RandomOpenBox(id);
        };
        self.EleShadow = ele.firstChild;
        self.EleBody = ele.childNodes[1];
        self.BombTime = Math.floor(Math.random() * 100) > 4 ?
            Math.floor(1325 + Math.random() * 976) :
            Math.floor(450 + Math.random() * 301);
        if (!delayT) {
            func();
        } else {
            oSym.addTask(delayT, () => {
                self.freeStaticEffect(self, "SetBody");
                $Z[id] && func();
            });
        }
    },
    PrivateDie: self => self.Status && !--oGd.$JackinTheBox,
    PlayBoomEffect(left, top) {
        oAudioManager.playAudio("ZombieBoom");
        let self = this;
        oEffects.ImgSpriter({
            ele: NewEle(self.id + '_Boom', "div",
                `position:absolute;overflow:hidden;z-index:${self.zIndex+1};width:196px;height:259px;left:${left}px;top:${top}px;background:url(images/Zombies/Boom.png) no-repeat;`,
                0, EDPZ),
            styleProperty: 'X',
            changeValue: -196,
            frameNum: 19,
        });
    },
}),
//沼泽僵尸从以下开始
oCaskZombie = (function() {
    const getHit0 = (self, power, dir)=>{
        const id = self.id;
        if (self.ShieldHP>0) {
            self.getShieldHit(self);
            return;
        }
        self.CheckOrnHP(self, id, power, self.PicArr, self.isAttacking);
        self.SetBrightness(self, self.EleBody, 1);
        oSym.addTask(10, _=>$Z[id] && self.SetBrightness(self, self.EleBody, 0));
    };
    const getHit1 = function(self, attack) {
        if (self.ShieldHP>0) {
            self.getShieldHit(self);
            return;
        }
        if ((self.HP -= Math.round(attack/2)) <= 0) {
            self.GoingDieHead(self.id, self.PicArr, self);
            self.NormalDie();
        } else {
            self.CheckOrnHP(self, self.id, attack, self.PicArr, self.isAttacking);
            self.SetBrightness(self, self.EleBody, 1);
            oSym.addTask(10, _ => $Z[self.id] && self.SetBrightness(self, self.EleBody, 0));  
        }
    };
    const getHit2 = function(self, attack) {
        if (self.ShieldHP>0) {
            self.getShieldHit(self);
            return;
        }
        if ((self.HP -= Math.round(attack/1.5)) <= 0) {
            self.GoingDieHead(self.id, self.PicArr, self);
            self.NormalDie();
        } else {
            self.SetBrightness(self, self.EleBody, 1);
            oSym.addTask(10, _ => $Z[self.id] && self.SetBrightness(self, self.EleBody, 0));  
        }
    };
    const getHitBody = function(self, attack) {
        if (self.ShieldHP>0) {
            self.getShieldHit(self);
            return;
        }
        if ((self.HP -= attack) <= 0) {
            self.GoingDieHead(self.id, self.PicArr, self);
            self.NormalDie();
        } else {
            self.SetBrightness(self, self.EleBody, 1);
            oSym.addTask(10, _ => $Z[self.id] && self.SetBrightness(self, self.EleBody, 0));  
        }
    };
    return InheritO(CZombies, {
        EName: "oCaskZombie",
        CName: "酒桶僵尸",
        OrnHP: 800,
        HP: 320,
        width: 365,
        height: 178,
        beAttackedPointL: 131,
        beAttackedPointR: 213,
        StandGif: 1,
        NormalGif: 2,
        NormalGif_WithoutOrna: 3,
        AttackGif: 4,
        AttackGif_WithoutOrna: 5,
        ExplodeGif: 6,
        TransitionGif: 7,
        DieGif: 8,
        BoomDieGif: 9,
        HeadGif:10,
        Ornaments: 1,  // 防具类型
        CardStars: 2,
        Lvl:3,
        ExplodeSpeed: 5.9,
        ExplodeAttack: 300,
        OSpeed: 4.1,
        Speed: 4.1,
        getShieldCSS: _ => 'left:145px;top:80px;',
        Almanac:{
            Tip:"免疫一切穿透攻击。必须打破酒桶才能攻击本体。",
            Weakness:"冰冻植物",
            Speed:"慢，打碎后快",
            Story:"酒桶僵尸从制酒的生产链中搞到了这些酒桶，他穿上它们以抵御植物带来的伤害。但这也让他的身上有很大的酒味。这一度让僵尸们猜忌他是否酗酒，直到僵尸博士帮他做了鉴定，确定他体内不含有酒精成分以后。"
        },
        PicArr: (function() {
            const src = "images/Zombies/CaskZombie/";
            return ['images/Card/CaskZombie.webp?useDynamicPic=false', src + 'idle.webp', src + 'walk.webp', src + 'fastWalk.webp', src + 'eat.webp', src + 'eatNaked.webp', src + 'explode.webp', src + 'transitionFastWalk.webp', src + 'die.webp', 'images/Zombies/BoomDie.webp',src + 'head.webp'];
        })(),
        AudioArr: ["Cask"],
        getShadow: self => `left: 147px;top: 150px;`,
        getCharredCSS() {
            return {left: '153px', top: '65px'};
        },
        HeadTargetPosition:[{x:138,y:65},{x:138,y:65}],//头的位置数据
        // getHit0: 直线非穿透攻击，只扣木桶的血
        getHit0: getHit0,  
        // getHit1:直线穿透攻击、投掷群体攻击，木桶和本体的血都扣
        getHit1: getHit1,  
        // getHit2：投手单体攻击，只扣本体的血
        getHit2: getHit2,  
        getPea(self, attack, direction=0) {
            // 冰原镜像特供
            if(/^Polar\d+jx$/.test(oS.Lvl)) {
                return self.getHit2(self, attack);
            }
            self.PlayNormalballAudio();
            self.getHit0(self, attack, direction);
        },
        getSnowPea(self, attackPower, dir) {
            oAudioManager.playAudio("splat" + Math.floor(1 + Math.random() * 3));
            self.getHit0(self, attackPower, dir);
        },
        getFirePea(self, attackPower, dir) {
            self.PlayFireballAudio();
            if(self.FreeSlowTime || self.FreeFreezeTime || self.FreeVertigoTime) {
                self.Attack = self.OAttack;
                self.FreeSlowTime = 0;
                self.FreeVertigoTime = 0;
                self.freeStaticEffect(self, "Freeze");
                ClearChild(...self.Ele.querySelectorAll('.buff_freeze,.buff_vertigo'));
                !$User.LowPerformanceMode && EditCompositeStyle({ ele: self.EleBody, styleName: 'filter', delFuncs: ['url'], option: 2 });
                if (self.isNotStaticed()) {
                    self.Speed = self.OSpeed;
                }
            }
            const LX = self.AttackedLX;
            oZ.getArZ(LX, LX + 40, self.R).forEach(zombie => zombie !== self && zombie.getFirePeaSputtering());
            self.getHit0(self, attackPower, dir);
        },
        getFirePeaSputtering() {
            this.getHit0(this, 13);
        },
        CheckOrnHP(self, id, power, PicArr, isAttacking = 0) {
            const pro = OrnNoneZombies.prototype;
            if ((self.OrnHP -= power) < 1) {
                oAudioManager.playAudio("Cask");
                const temp_ChkActs = self.ChkActs;
                const temp_Altitude = self.Altitude;
                const EleBody = self.EleBody;
                self.ChkActs = _ => 1;
                self.Ornaments = 0;
                self.getFirePea = pro.getFirePea;
                self.getSnowPea = pro.getSnowPea;
                // 标记僵尸正在播放过渡动画，防止此时JudgeAttack修改僵尸的isAttacking状态
                self.isExploding = true;
                // 恢复僵尸受攻击处理函数
                self.getHit = self.getHit0 = self.getHit1 = self.getHit2 = getHitBody;
                // 更新行走、攻击动画下标
                let NormalGif = self.NormalGif = self.NormalGif_WithoutOrna;
                let AttackGif = self.AttackGif = self.AttackGif_WithoutOrna;
                // 切换到木桶散架的动画
                EleBody.src = PicArr[self.ExplodeGif];
                // 预加载
                new Image().src = PicArr[self.TransitionGif];
                new Image().src = PicArr[self.AttackGif];
                new Image().src = PicArr[self.NormalGif];
                // 解除带着桶移动时候的锁定
                //self.freeStaticEffect(self, 'oCaskZombie_Static');
                oSym.addTask(93, _ => {
                    if (!$Z[id]) return;
                    let speed;
                    const recover = () => {
                        if (!$Z[id]) return;
                        self.isExploding = false;
                        self.ChkActs = temp_ChkActs;
                        // 刷新攻击状态
                        isAttacking = self.JudgeAttack();
                        // 确保贴图更新
                        let pic = PicArr[isAttacking ? AttackGif : NormalGif];
                        EleBody.src !== pic && (EleBody.src = pic);
                    };
                    // 更新僵尸攻击数值
                    self.Attack = self.OAttack = self.ExplodeAttack;
                    // 更新僵尸速度
                    speed = self.OSpeed = self.ExplodeSpeed;
                    self.Speed && (self.Speed = speed * (self.FreeSlowTime ? 0.5 : 1));
                    // 彩蛋：如果僵尸处于isAttacking=0的状态，则先播放TransitionGif再切回行走动画
                    if (!isAttacking) {
                        EleBody.src = PicArr[self.TransitionGif];
                        oSym.addTask(63, recover);
                    } else {
                        recover();
                    }
                });
            }
        },
        getVertigo(self, attackPower, dir) {
            OrnNoneZombies.prototype.getVertigo(self, attackPower, dir, `left:${self.beAttackedPointL+2}px;top:${self.height-130}px`);
        },
        MovingAnimationControl() {
            const self = this;
            let operateId = self.DiyConfigs.__MovingOperateId = Math.random();
            if (!$Z[self.id] || self.isAttacking || !self.Ornaments) {
                return;
            }
            if(!self.DiyConfigs.__CASKOSPEED){
                self.DiyConfigs.__CASKOSPEED=self.OSpeed;
            }
            {
                let ratio = self.Speed/self.OSpeed;
                self.OSpeed = self.DiyConfigs.__CASKOSPEED;
                self.Speed = self.OSpeed*ratio;
            };
            const id = self.id;
            const period = 300;
            const keepMovingTime = 60;
            let waitingTime = 240;
            const setStatic = () => {
                /*self.getStatic({
                     time: waitingTime,
                     type: 'oCaskZombie_Static',
                     useStaticCanvas: false,
                     usePolling: true,
                });*/
                let OSpeed = self.OSpeed;
                self.Speed=0.001*self.Speed/self.OSpeed;
                self.OSpeed = 0.001;
                oSym.addTask(waitingTime,()=>{
                    if (operateId!==self.DiyConfigs.__MovingOperateId || !$Z[self.id] || !self.Ornaments) {
                        return;
                    }
                    self.Speed = self.Speed/self.OSpeed*OSpeed;
                    self.OSpeed=OSpeed;
                });
            };
            function loop(){
                if (operateId!==self.DiyConfigs.__MovingOperateId || !$Z[id] || self.isAttacking || !self.Ornaments) return;
                setStatic();
            }
            for(let i = 0;i<3;i++){
                oSym.addTask(keepMovingTime+i*period,loop);
            }
            oSym.addTask(3*period,()=>{
                if (operateId!==self.DiyConfigs.__MovingOperateId || !$Z[id] || self.isAttacking || !self.Ornaments) return;
                self.MovingAnimationControl();
            });
            self.EleBody.src = self.PicArr[self.NormalGif];
        },
        BirthCallBack(self) {
            let delayT = self.delayT;
            let id = self.id;
            let ele = self.Ele = $(id);
            self.EleShadow = ele.firstChild;
            self.EleBody = ele.childNodes[1];
            if (delayT) {
                oSym.addTask(delayT, () => {
                    self.freeStaticEffect(self, "SetBody");
                    $Z[id] && SetBlock(ele);
                    self.MovingAnimationControl();
                });
            } else {
                SetBlock(ele);
                self.MovingAnimationControl();
            }
        },
        JudgeAttack(stepRatio=1) {
            let self = this;
            let ZX = self.ZX;
            let crood = self.R + "_";
            let C = GetC(ZX);
            let G = oGd.$;
            let EleBody = self.EleBody;
            let PicArr = self.PicArr;
            let arr = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
            let isAttacking = self.isAttacking;
            if (arr && self.Altitude === 1) { //地上的僵尸才能检测攻击
                if (!self.isAttacking) {
                    let pic = PicArr[self.AttackGif];
                    isAttacking = self.isAttacking = 1;
                    EleBody.src !== pic && (EleBody.src = pic);
                }
                self.NormalAttack(...arr); //实施攻击
            } 
            // 撤销攻击状态
            else if (self.isAttacking && !self.isExploding) {
                let pic = PicArr[self.NormalGif];
                isAttacking = self.isAttacking = 0;
                if (self.Ornaments) {
                    self.MovingAnimationControl();
                } else {
                    EleBody.src !== pic && (EleBody.src = pic);
                }
            }
            return isAttacking;
        },
        CrushDie(rotateTime = 0.15) {
            let self = this,
                id = self.id;
            self.freeStaticEffect(self, "All");
            self.PrivateDie && self.PrivateDie(self);
            self.HP = 0;
            delete $Z[id];
            self.DieRotate(self, rotateTime);
            self.GoingDieHead(self.id, self.PicArr, self);
            oP.MonitorZombiePosition(self);
            self.PZ && oP.MonPrgs(self);
        },
        GoingDieHead(id, PicArr, self){
            CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
                top: self.pixelTop + 50,
                left: self.X+self.HeadTargetPosition[self.isAttacking??0].x+20,
                bc: self.pixelTop + 118,
                vx:!self.Ornaments?(Math.random()*2.4+3):(Math.random()*1-1),
                vy:-5,
            });
        },
    });
})(),
oSadakoZombie = InheritO(oZombie, {
    EName: "oSadakoZombie",
    CName: "贞子僵尸",
    OSpeed: 1.5,
    Speed: 1.5,
    width: 216,
    height: 164,
    beAttackedPointL: 60,
    beAttackedPointR: 130,
    LostHeadGif: 2,
    getShadow: _=>"display:none;",
    getShieldCSS: _=>"display:none;",
    AudioArr: ['sadako'],
    CanDrawBlood:false,
    CardStars: 2,
    Lvl:2,
    Almanac:{
        Tip:"只有在啃食植物时才现身。在行进过程中隐形，玩家无法看到。但植物子弹可以正常攻击。",
        Story:"有些鬼魂没法被超度，去不了阴间，只能在人间恶作剧。自从僵尸出现后，这些怨灵也兴奋了起来，如同找到了自家人。不过他们还是和从前一样爱啃植物。",
    },
    PicArr: (_=>{
        var a = "images/Zombies/SadakoZombie/";
        return ["", "", BlankPNG, a + "ZombieAttack.webp", BlankPNG, a + "ZombieLostHeadAttack.webp", '', a + "ZombieDie.webp", a + "1.webp", 'images/Zombies/BoomDie.webp']
    })(),
    HeadTargetPosition:[{x:70,y:50},{x:65,y:50}],//头的位置数据
    BirthCallBack(o) {
        oAudioManager.playAudio("sadako");
        OrnNoneZombies.prototype.BirthCallBack(o);
    },
    GoingDieHead() {},
}),
oImp = InheritO(oZombie, {
    EName: "oImp",
    CName: "小鬼僵尸",
    OSpeed: 2,
    Speed: 2,
    HP: 220,
    width: 85,
    height: 101,
    getShieldCSS: _ => "left:0px;top:20px;",
    beAttackedPointL: 18,
    beAttackedPointR: 55,
    ThrowGif:9,
    LandGif:10,
    BoomDieGif: 11,
    CardStars: 1,
    Almanac:{
        Tip:"小鬼僵尸通过其矮小的身躯，快速冲破你的防线。",
        Speed:"稍快",
        Story:"小鬼僵尸曾经因为自己攻击距离的不足而不受僵尸的关注。他最初企图通过过激的恶作剧吸引其他僵尸的注意，但却没有任何成效。他随后选择提升自己，在不上战场的时候通过自学精通了僵尸哲学，获得了哲学的博士学位。并且在业余时间学习了僵尸功夫，僵尸空手道和僵尸跆拳道，当然，还有吹口琴。但即使他已经超越了原先的自己，在战场上，他还是因为自己攻击距离的不足而不受僵尸的关注。",
    },
    getShadow: _=>`top:76px;`,
    getCharredCSS: self => ({
        top: self.DivingDepth / 2,
        left: 10,
        clip: self.DivingDepth > 0 ? "rect(0px, auto, 86px, 0px)" : "",
    }),
    PicArr: (function() {
        var a = "images/Zombies/Imp/";
        return ["", "", a + "Zombie.webp", a + "ZombieAttack.webp", a + "ZombieLostHead.webp", a + "ZombieLostHeadAttack.webp", a + "ZombieHead.webp", a + "ZombieDie.webp", a + "1.webp", a + "ZombieThrowing.webp",a+"ZombieLand.webp", a+'BoomDie.webp']
    })(),
    AudioArr: (function(){
        let arr = [];
        for(let i = 1;i<15;i++){
            arr.push("imp_"+i);
        }
        return arr;
    })(),
    HeadTargetPosition:[{x:5,y:15}],//头的位置数据
    BirthCallBack: function(self) {
        let delayT = self.delayT;
        let id = self.id;
        let ele = self.Ele = $(id);
        const callback = () => {
            SetBlock(ele);
            oAudioManager.playAudio(self.AudioArr[Math.floor(Math.random()*10+1)]);
        };
        self.EleShadow = ele.firstChild;
        self.EleBody = ele.childNodes[1];
        if(delayT) {
            oSym.addTask(delayT, _ => {
                self.freeStaticEffect(self, "SetBody");
                $Z[id] && callback();
            });
        } else {
            callback();
        }
    },
    JudgeLR(self, crood, C, ZX, G) { //远程判定，普通僵尸的远程是自己前面一格
        if (C > 10 || C < 1) return;
        crood += C - 1 + '_';
        let z = PKindUpperLimit;
        while (z >= 0) {
            let plant = G[crood + z];
            if (plant && plant.canEat&&!(self.LivingArea===2&&plant.FlyingPlant)) {
                return (One_Dimensional_Intersection(self.X + self.beAttackedPointL, self.X + self.beAttackedPointR,
                        plant.AttackedLX, plant.AttackedRX) || plant.AttackedRX >= ZX && plant.AttackedLX <=
                    ZX) ? [self.id, plant.id] : false;
            }
            z--;
        }
    },
    JudgeSR(self, crood, C, ZX, G) { //近程判定，普通僵尸的近程是自己所在一格
        if (C > 9) return;
        crood += C + "_";
        let z = PKindUpperLimit;
        while (z >= 0) {
            let plant = G[crood + z];
            if (plant && plant.canEat&&!(self.LivingArea===2&&plant.FlyingPlant)) {
                return (One_Dimensional_Intersection(self.X + self.beAttackedPointL, self.X + self.beAttackedPointR,
                        plant.AttackedLX, plant.AttackedRX) || plant.AttackedRX >= ZX && plant.AttackedLX <=
                    ZX) ? [self.id, plant.id] : false;
            }
            z--;
        }
    },
    JudgeAttack(stepRatio=1) {
        let self = this;
        let ZX = self.ZX;
        let crood = self.R + "_";
        let C = GetC(ZX);
        let G = oGd.$;
        let arr = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
        if(arr && self.Altitude === 1) {  //地上的僵尸才能检测攻击
            !self.isAttacking && (self.isAttacking = 1, self.EleBody.src = self.PicArr[self.AttackGif]);  //如果是首次触发攻击，需要更新到攻击状态
            self.NormalAttack(...arr);  //实施攻击
        } else {
            //撤销攻击状态
            self.isAttacking && (self.isAttacking = 0, self.EleBody.src = self.PicArr[self.NormalGif]);
        }
    },
    GoingDieHead(id,PicArr,self){
        let bca,topa = self.pixelTop + 10;
        bca = topa+40;
        CZombies.prototype.GoingDieHeadNew(id,PicArr,self,{top:topa,bc:bca});
    }
}),
oImp2 = InheritO(oImp, { //供巨人抛射的小鬼
    EName: "oImp2",
    CanGoThroughWater: false,
    BirthCallBack: function(a) {
        OrnNoneZombies.prototype.BirthCallBack(a);
    },
    prepareToFly(gargZombie) {
        const self = this;
        const wrapEle = self.Ele;
        const delta = gargZombie.ZX - 36 - self.ZX;
        self.oldHP = self.HP + 30;
        self.HP = Infinity;
        self.isAttacking = 2;
        self.Altitude = 3;
        self.AttackedLX += delta;
        self.AttackedRX += delta;
        self.ZX += delta;
        self.X += delta;
        SetStyle(wrapEle, {
            "left": Number.parseFloat(self.Ele.style.left) + delta + 'px',
            "display": "none",
        });
    },
    fly(r) {
        const self = this;
        const {
            id: zid,
            AttackedLX: oldLX,
            AttackedRX: oldRX,
            ZX: oldZX,
            X: oldX
        } = self;
        const wrapEle = self.Ele;
        const bodyEle = self.EleBody;
        const oldTop = GetStyle(bodyEle, "top");
        let deltaY = 162; // 小鬼抛出时距离地面高度
        let gravity = 0.2;
        let vy = -3;
        let x = self.X;
        let y = GetStyle(bodyEle, "top", true) - deltaY;
        let position = GetX(Math.floor(r)) + (r - Math.floor(r)) * 80 + self.beAttackedPointL;
        let distance = position - x;
        let vx = (gravity ** 2 * distance) / (gravity * (Math.sqrt(vy ** 2 + 2 * deltaY * gravity) - vy));
        let lastTime = 0;
        let checkY = -100; // 探测叶子保护伞的阈值
        let R = self.R;
        let targetC = GetC(position + (self.beAttackedPointL + self.beAttackedPointR) / 2);
        self.hasCheckedUmbr = false;
        self.isFloating = true;
        self.EleBody.src = self.PicArr[self.ThrowGif];
        SetBlock(wrapEle);
        requestAnimationFrame(function drawFrame() {
            if ($Z[zid]) {
                vy += gravity;
                self.AttackedLX += vx;
                self.AttackedRX += vx;
                self.ZX += vx;
                self.X += vx;
                wrapEle.style.left = (x += vx) + 'px';
                bodyEle.style.top = (y += vy) + 'px';
                if (y >= checkY && !self.hasCheckedUmbr) {
                    self.checkUmbrella(R, targetC);
                    self.hasCheckedUmbr = true;
                }
                if (y >= 0) { //检查僵尸是否落地，否则继续回调
                    self.isFloating = false;
                    self.AttackedLX = oldLX + distance;
                    self.AttackedRX = oldRX + distance;
                    self.ZX = oldZX + distance;
                    self.X = oldX + distance;
                    bodyEle.style.top = oldTop; //上次自己做关卡时还是出bug，这里修正()
                    // 解决巨人丢小鬼到水道没有适配的问题
                    if (oGd.$GdType[R][targetC] === 2) {
                        self.SetWater(oGd.$WaterDepth[R][targetC], null, null, null, false);
                    }
                    self.EleBody.src = self.PicArr[self.LandGif];
                    oSym.addTask(97, function() {
                        if ($Z[zid] && !self.isGoingDie) {
                            self.HP = self.oldHP;
                            self.isAttacking = 0;
                            self.Altitude = 1;
                            self.EleBody.src = self.PicArr[self.NormalGif];
                        }
                    });
                    return;
                }
                let currTime = Date.now();
                let timeToCall = Math.max(0, 50 / 3 - (currTime - lastTime)) / 10;
                oSym.addTask(timeToCall + 1, drawFrame);
                lastTime = currTime + timeToCall + 1;
            }
        });
        oAudioManager.playAudio(self.AudioArr.random());
    },
    checkUmbrella(R, targetC) {
        const self = this;
        const umbr = oUmbrellaLeaf.checkUmbrella(R, targetC);
        if (umbr) {
            umbr.PlayAttackAnim();
            oSym.addTask(20, () => {
                if ($P[umbr.id] && $Z[self.id]) {
                    self.DieByUmbrella(targetC);
                }
            });
        }
    },
    DieByUmbrella(targetC) {
        const self = this;
        const wrapEle = self.Ele;
        const bodyEle = self.EleBody;
        let left = self.X;
        let top = GetStyle(bodyEle, "top", true);
        let vy = -6;
        let gravity = 0.2;
        let pos = oS.W;
        let dis = pos - left;
        let vx = Math.abs(dis * gravity / (2 * vy)) + 15 * Math.random();
        const drawFrame = () => {
            vy += gravity;
            wrapEle.style.left = (left += vx) + "px";
            bodyEle.style.top = (top += vy) + "px";
            if (left >= pos) {
                self.DisappearDie(self);
                return;
            }
            requestAnimationFrame(drawFrame);
        };
        delete $Z[self.id];
        drawFrame();
    },
}),
oBossA = (() => {
    let getHit = function (self, attack) {
        if ((self.HP -= attack) < self.BreakPoint) {
            self.GoingDie(self.PicArr[[self.LostHeadGif, self.LostHeadAttackGif][self.isAttacking]]);
            self.getHit0 = self.getHit1 = self.getHit2 = function () {};
            return;
        }
        self.SetBrightness(self, self.EleBody, 1);
        oSym.addTask(10, _ => $Z[self.id] && self.SetBrightness(self, self.EleBody, 0));
        oFlagContent.__HeadEle__.className.includes("BOSSHead") && oFlagContent.update({ curValue: self.HP });
    };
    return InheritO(OrnNoneZombies, {
        EName: "oBossA",
        CName: "僵王博士-装甲火车",
        AttackGif: 2,
        LostHeadGif: 2,
        LostHeadAttackGif: 2,
        LostHeadGif: 2,
        DieGif: 5,
        BoomDieGif: 5,
        StandGif: 1,
        HP: 8000,
        HPT: 8000,
        OSpeed: 0.5,
        Speed: 0.5,
        width: 704,
        height: 410,
        beAttackedPointL: 88,
        beAttackedPointR: 700,
        AudioArr: ["Zomboss1", "Zomboss2", "Zomboss3", "hydraulic1", "hydraulic2","trainchugs","trainwhistle","missileshoot","missilefall","machineExplosion"],
        Bounce() {},
        ChanceThrowCoin() {},
        CanAppearFromTomb: false,
        CanDrawBlood: true,
        CardStars: 6,
        Almanac: {
            Tip: `僵尸博士在萤火沼泽和鸟语森林秋季的座驾。碰到植物必定秒杀，对爆炸伤害有一定抗性，免疫冰冻等不良状态。
        
        技能1：向场地上投掷炮弹，炮弹落入随机位置，该位置植物会被炸死。
        技能2：在场地最右侧召唤5只橄榄球僵尸。`,
            Speed: "很慢",
            get Story() {
                let json = localStorage.JNG_TR_WON ? JSON.parse(localStorage.JNG_TR_WON) : {};
                let man = json["Industry25"] ? "Job" : "戴夫（身份存疑）";
                let strA = "在这个程序设定注定要出现精英怪的一天，出于" + man +
                    "的意志，装甲列车在冰原凭空出现，又驶向他们所在的沼泽，一如曾经的那次旅行中他所坐的交通工具。僵尸博士如同接受宿命一般，登上了这辆列车，让这辆火车成为了迄今为止";
                let strB = "僵尸机械。它坚固耐造，隐忍而坚韧，一从铁轨上脱落便一刻不停地不断前进，";
                let FstrC = function (description) {
                    return "直至戴夫抱着对卡车司机" + description + "的恨意，把这列火车当作发泄的出口彻底毁灭为止。";
                }
                if (json["Industry25"]) {
                    return strA + "最弱的" + strB + "直至Job幼稚的把这列火车当作发泄的出口彻底毁灭为止。";
                } else if (json["Polar30"]) {
                    return strA + "第二强的" + strB + FstrC("莫名其妙");
                } else if (json["Marsh25"]) {
                    return strA + "最强的" + strB + FstrC("极大");
                } else {
                    return "这列火车不畏任何地形，即使下了轨道在泥泞的沼泽中也能依旧轰隆隆地行驶。无论是锋利的装甲，还是轰鸣的汽笛都让沼泽中的僵众们胆战心惊。顺带一提，它的涂装由小明完成。";
                }
            },
        },
        getAlmanacDom(pro) {
            if (!pro.Almanac.Dom) {
                //pro.Almanac = Object.assign({},pro.Almanac);
                let ClassAlmanac = CZombies.prototype.Almanac;
                for (let i in ClassAlmanac) {
                    if (!pro.Almanac[i]) {
                        pro.Almanac[i] = ClassAlmanac[i];
                    }
                }
                pro.Almanac.Dom = pro.getHTML("", 300 - pro.width / 2, 520 - pro.height,
                    "1;transform:scale(0.7);height:" + pro.height + "px;width:" + pro.width + "px",
                    "block", "auto", pro.GetDTop, pro.PicArr[pro.NormalGif]);
            }
        },
        PlayNormalballAudio: function () {
            oAudioManager.playAudio(["shieldhit", "shieldhit2"][Math.floor(Math.random() * 2)])
        },
        prepareBirth(delayT) {
            let self = this;
            let id = self.id = "Z_" + Math.random();
            let R = self.R = 3;
            let top = self.pixelTop = GetY(R) + self.GetDY() - self.height; //计算僵尸顶部坐标
            let zIndex = self.zIndex = 3 * R + 1;
            self.zIndex_cont = Math.round(self.pixelTop + self.height);
            //设置延迟出场时间
            if (self.delayT = delayT) {
                self.getStatic({
                    time: delayT,
                    type: "SetBody",
                    useStaticCanvas: false,
                    forced: true,
                    usePolling: false,
                });
            }
            return self.getHTML(id, self.X, top, self.zIndex_cont, "none", "auto", self.GetDTop, self.PicArr[self.NormalGif]);
        },
        //获取卡片图片
        GetCardImg() {
            let self = this;
            return "images/Card/Boss.webp";
        },
        GoLeft: function (o, R, arR, i, stepRatio = 1) { //向左走
            oAudioManager.playAudio("trainchugs");
            var Speed, AttackedRX, rV, id = o.id;
            (o.isNotStaticed()) ? (
                !o.isGoingDie && !o.isAttacking && o.JudgeAttack(stepRatio), //未临死，未攻击，进行攻击判断
                !o.isAttacking ? (
                    o.MoveZombieX(o,(Speed = o.getRealSpeed(o,stepRatio))),
                    (AttackedRX = o.AttackedRX) < -50 ?
                    (oZ.del(arR, i), o.DisappearDie(), rV = 0) : (
                        AttackedRX < 160 && toOver(1),
                        o.Paint(o),
                        rV = 1
                    )
                ) : rV = 1
            ) : rV = 1;
            return rV;
        },
        BirthCallBack(self) {
            let delayT = self.delayT;
            let id = self.id;
            let ele = self.Ele = $(id);
            self.EleShadow = ele.firstChild;
            self.EleBody = ele.childNodes[1];
            oFlagContent
            .hide()
            .init({
                MeterType: 'LeftBar RedBar',
                HeadType: 'BOSSHead',
                fullValue: self.HP,
                curValue: 0,
            })
            oAudioManager.playAudio("trainwhistle");
            oAudioManager.playAudio("Zomboss" + Math.floor(1 + Math.random() * 3));
            oAudioManager.playAudio("Zomboss_Coming");
            oAudioManager.playMusic("Boss");
            oSym.addTask(60, _ => {
                oFlagContent.show()
                .update({
                    curValue: self.HP,
                    animConfig: {
                        duration: 1/oSym.NowSpeed,
                        ease: "ease-out",
                    },
                });              
            });
            oSym.addTask(120, _ => {
                self.freeStaticEffect(self, "SetBody");
                if($Z[id]) {
                    SetBlock(ele);
                }
            });
        },
        PicArr: (function () {
            var b = "images/Zombies/BossA/";
            return [BlankPNG, BlankPNG, b + "Zombie.webp", b + "Gun.webp", b + "radar.webp", b +
                "Die.webp", b + "Die.png"]
        })(),
        getRaven: function () {},
        getShadow: function (b) {
            return "display:none;"
        },
        getSlow(){},
        getButter() {},
        getHit0: getHit,
        getHit1: getHit,
        getHit2: getHit,
        getExplosion: function (b, e) {
            var a = this;
            if (a.HP > 250) {
                a.EleBody.src = a.PicArr[3];
                !a.isAttacking && (a.isAttacking = 1);
                a.HP -= 250;
                oAudioManager.playAudio("Zomboss" + Math.floor(1 + Math.random() * 3));
                oAudioManager.playAudio("missileshoot");
                oSym.addTask(60,_=>{
                        oAudioManager.playAudio("missilefall");
                });
                oFlagContent.update({
                    curValue: a.HP
                });
                oSym.addTask(100,
                    function (d) {
                        var arrP = hasPlants(true);
                        var c = oMissile;
                        for (var is = 0; is < 2; is++) {
                            var Select = parseInt(Math.random() * arrP.length);
                            var ssd = 0;
                            for (var i of arrP) {
                                if (ssd == Select) {
                                    CustomSpecial(c, i.R, i.C);
                                }
                                ssd++;
                            }
                        }
                        d.EleBody.src = d.PicArr[2];
                        d.isAttacking && (d.isAttacking = 0)
                    },
            [a])
            } else {
                a.HP = 0;
                oFlagContent.update({
                    curValue: a.HP
                });
                a.NormalDie();
            }
        },
        JudgeAttack: function () {
            var b = this,
                k = b.ZX,
                j = b.R + "_",
                i = GetC(k),
                a = oGd.$,
                l;
            (l = b.JudgeLR(b, j, i, k, a) || b.JudgeSR(b, j, i, k, a)) ? (!b.isAttacking && (b.isAttacking =
                1), b.NormalAttack(l[0], l[1])) : b.isAttacking && (b.isAttacking = 0)
        },
        NormalAttack: function (a, b) {
            oAudioManager.playAudio("Zomboss" + Math.floor(1 + Math.random() * 3));
            oAudioManager.playAudio("hydraulic" + Math.floor(1 + Math.random() * 2));
            this.EleBody.src = this.PicArr[4];
            oSym.addTask(300,
                function (j, k) {
                    for (var c = 1; c <= 5; c++) {
                        PlaceZombie(oFootballZombie, c, 9)
                    }
                    var d = $Z[j],
                        i;
                    d && d.beAttacked && d.isNotStaticed() && ((i = $P[k]) &&
                        i.Die(), d.JudgeAttack(), d.EleBody.src = d.PicArr[2])
                },
        [a, b])
        },
        GoingDieHead: function () {},
        SetWater(){},
        NormalDie: function () {
            oAudioManager.playAudio("machineExplosion");
            let self = this,
                id = self.id;
            for (let i in $Z) $Z[i] && $Z[i].getRaven();
            self.EleBody.src = self.PicArr[self.DieGif];
            self.HP = 0;
            oEffects.fadeOut(self.Ele, 1.6, ClearChild);
            oEffects.ImgSpriter({
                ele: NewEle(id + "_Die", "div",
                    `position:absolute;z-index:10;width:1016px;height:350px;left:${self.X}px;top:${self.pixelTop}px;background:url(images/Zombies/BossA/Die.png) no-repeat;`,
                    0, EDPZ),
                data: ["0 0", "0 -700px", "0 -1050px", "0 -1400px", "0 -1750px",
                    "0 -2100px", "0 -2450px", "0 -2800px", "0 -3150px", "0 -3500px",
                    "0 -3850px", "0 -4200px", "0 -4550px", "0 -4900px", "0 -5250px",
                    "0 -5600px"],
                frameNum: 16,
                interval: 10,
                callback: ele => {
                    ClearChild(ele);
                    delete $Z[id];
                    oP.MonitorZombiePosition(self);
                    self.PZ && oP.MonPrgs(self);
                    if (oS.Lvl!=="Marsh25") toWin();
                    for (let i of $Z) i.ExplosionDie();
                },
            });
        }
    })
})(),
//极地僵尸从以下开始
oMembraneZombie = InheritO(OrnNoneZombies, {
    EName: "oMembraneZombie",
    CName: "魔法师僵尸",
    StandGif: 8,
    width: 235,
    height: 213,
    beAttackedPointL: 154,
    beAttackedPointR: 210,
    OSpeed: 0.8,
    Speed: 0.8,
    HP: 500,
    getShieldCSS: _ => 'left:138px;top:109px;',
    ConjureGif: 9,
    BoomDieGif: 12,
    LostHeadGif: 4,
    LostHeadAttackGif: 5,
    LostHeadConjureGif: 10,
    LightningGif:13,
    ElectricShockGif:15,
    CardStars: 3,
    Lvl:9,
    Almanac:{
        Tip:`每行走大约一格的距离，施放一次魔法，把场地上任意一株植物变成挨炮。`,
        Speed:"很慢",
        Weakness:"防御类植物",
        Story:"僵尸们对于魔法师僵尸能力之令僵印象深刻意见一致，但他们不明白…为什么要把植物变成挨炮？每个僵尸都知道，如果魔法师用他的能力把植物变成，比如说，更多的僵尸，或者哪怕只是绵羊，都会更有帮助。但很明显，没人会当着他的面这么说。",
    },
    HeadTargetPosition:[{x:115,y:100}],//头的位置数据
    PicArr: (function() {
        const a = "images/Zombies/MembraneZombie/";
        let b =["", "", a + "Zombie.webp", a + "ZombieAttack.webp", a + "ZombieLostHead.webp", a + "ZombieLostHeadAttack.webp", a + "ZombieHead.webp", a + "ZombieDie.webp", a + "1.webp", a+'conjure.webp', a + 'ZombieLostHeadConjure.webp', a + 'effect.png', 'images/Zombies/BoomDie.webp',a+"lightning1.png",a+"lightning2.png"];
        let c = [];
        for(let i = 1;i<=4;i++){
            c.push(a+"effect"+i+".webp");
        }
        return b.concat(c);
    })(),
    AudioArr: ['conjure'],
    Pianyi: 0,
    getCharredCSS: (self)=>({
        top: 102 + self.DivingDepth / 1.5,
        left: 142,
        clip: self.DivingDepth > 0 ? "rect(0px, auto, 95px, 0px)" : "",
    }),
    HeadTargetPosition: [{x: 145,y: 100}, {x: 145,y: 100}, {x: 145,y: 100}],
    GoingDie() {
        const self = this;
        const id = self.id;
        self.EleBody.src = [
            self.PicArr[self.LostHeadGif],
            self.PicArr[self.LostHeadAttackGif],
            self.PicArr[self.LostHeadConjureGif]
        ][self.isAttacking];
        self.GoingDieHead(id, self.PicArr, self);
        self.beAttacked = 0;
        self.isGoingDie = 1;
        self.freeStaticEffect(self, "All");
        self.FreeSlowTime = 0;
        self.AutoReduceHP(id);
        self.ChanceThrowCoin(self);
    },
    GoingDieHead(id,PicArr,self){
        return CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
            top: self.pixelTop + 90,
            left: self.X + 144,
            bc: self.pixelTop + 160,
        });
    },
    BirthCallBack(self) {
        self.ElecPic = [new Image(),new Image()];
        self.ElecPic[0].src=self.PicArr[self.LightningGif];
        self.ElecPic[1].src=self.PicArr[self.LightningGif+1];
        OrnNoneZombies.prototype.BirthCallBack(self);
    },
    NormalAttack(zid, pid) {
        oSym.addTask(96.67, _ => {
            oAudioManager.playAudio(["chomp", "chompsoft", 'chomp2'].random());
            let self = $Z[zid];
            if(self && !self.isGoingDie && self.isNotStaticed()) {
                //这里需要再检测一次，否则可能会出现莫名穿过的现象，或者啃的植物不对的现象
                let ZX = self.ZX;
                let crood = self.R + "_";
                let C = GetC(ZX);
                let G = oGd.$;
                let arr = (self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G));
                if(arr){
                    [zid,pid] = arr;
                    let plant = $P[pid];
                    plant && plant.getHurt(self, self.AKind, self.Attack);
                }
                self.JudgeAttack();
            }
        });
    },
    GoLeft(o,R,arR,i,stepRatio=1){ //往左走的僵尸行动
        var Speed,
              AttackedRX,
              rV,
              id=o.id;
        (o.isNotStaticed())?(
            !o.isGoingDie&&!o.isAttacking&&o.JudgeAttack(stepRatio), //未临死，未攻击，进行攻击判断
            !o.isAttacking?(
                o.MoveZombieX(o,(Speed=o.getRealSpeed(o,stepRatio))),
                (AttackedRX=o.AttackedRX)<-50?
                    (oZ.del(arR, i),o.DisappearDie(),rV=0) : ( //向左走出屏幕，算作直接死亡，不排序只更新
                     //未走出屏幕，当右攻击点小于100的时候，进行移动判断
                    o.Paint(o),
                    rV=1,
                    o.Conjure(stepRatio)  //施法回调
                )
            ):rV=1
        ):rV=1;
        //检查场地事件
        o.ChkCell_GdType(o);
        return rV;
    },
    getPlants(){
        return hasPlants(true, v => v.C>0&&!v.Tools&&v.PKind===1);
    },
    drawALink(obj,R,C,oldCanvas=null){
        let pos = [obj.ZX,obj.pixelTop+50];
        let currentPos = pos;
        let targetPos = [GetX(C),GetY(R)-20];
        let theta = Math.atan2((targetPos[1]-currentPos[1]),(targetPos[0]-currentPos[0]));
        let delta = [Math.cos(theta),Math.sin(theta)];
        let canvas = oldCanvas??NewEle("Canvas_Magician"+Math.random(),"canvas","position:absolute;z-index:"+3*(oS.R+1)+";pointer-events:none;left:0;top:0;widht:100%;height:100%;"+(!$User.LowPerformanceMode?"filter:brightness(220%);":""),{
            width:900,
            height:600,
        },FightingScene);
        let ctx = canvas.getContext("2d");
        let kk=0;
        function RotatePaint(pic,x,y,width,height,rotate=0,mirror=0){
            let dist = [x+width/2,y+height/2];
            ctx.save(); // 保存状态，以免影响其它物体
            ctx.translate(dist[0], dist[1]); // 将画布偏移到物体中心
            ctx.rotate(rotate); // 旋转角度
            ctx.translate(-dist[0], -dist[1]);// 将画布偏移回来
            if(mirror){
                let mx = x + width / 2;
                ctx.translate(mx, 0);
                ctx.scale(-1, 1);
                ctx.translate(-mx, 0);
            }
            ctx.fillStyle=["#000","#fff"][kk^=1];
            ctx.drawImage(pic,x, y, width, height);
            // 坐标参考还原
            ctx.restore();// 恢复状态
        }
        let distance = Math.sqrt(Math.pow(targetPos[1]-currentPos[1],2)+Math.pow(targetPos[0]-currentPos[0],2));
        let times = Math.max(2,Math.floor(distance/80));
        let k = distance/times;
        let picPos = [];
        while(times-->0){
            let randLength = k;
            distance-=randLength;
            picPos.push({
                x:currentPos[0],
                y:currentPos[1],
                width:randLength,
                rotate:theta
            });
            currentPos[1]+=delta[1]*randLength;
            currentPos[0]+=delta[0]*randLength;
        }
        for(let t=0;t< picPos.length;t++){
            let i = picPos[t];
            //想改的时候自己根据数学推导一下，a里面的那个-i.width/2和37.5/2为宽度和高度的一半，帮忙把旋转原点和锚点变成坐标中心点用的，然后10*delta[1/0]是因为闪电图片的中心不在中间，需要增加一个偏移量
            //然后delta[0]*i.width/2为把图片的锚点挪到图片(中心，顶端)用的
            let a = [-i.width/2+10*delta[1],-37.5/2-10*delta[0]];
            if(t===0){
                RotatePaint(obj.ElecPic[1],i.x+delta[0]*i.width/2+a[0],i.y+delta[1]*i.width/2+a[1],i.width,37.5,i.rotate,0);
            }else{
                RotatePaint(obj.ElecPic[0],i.x+delta[0]*i.width/2+a[0],i.y+delta[1]*i.width/2+a[1],i.width,37.5,i.rotate,Math.floor(Math.random()*2));
            }
        }
        return canvas;
    },
    Conjure(stepRatio=1) {
        let obj = this;
        const id = obj.id;
        
        if(!$Z[id]) return;
        let arrPlants = obj.getPlants();
        obj.Pianyi+=stepRatio;  //更新偏移
        if(obj.AttackedLX<=oS.W+80 && !obj.isAttacking && !obj.isGoingDie && obj.Pianyi >= 190 && arrPlants.length > 0) {  //判定是否释放膜法
            obj.Pianyi -= 190;  //重置计数器
            obj.isAttacking = 2;  //标记正在施法，确保僵尸停止运动
            obj.EleBody.src = obj.PicArr[obj.ConjureGif];
            oAudioManager.playAudio('conjure');
            oSym.addTask(300, _ => {//300
                //随机变一株植物为挨炮
                let aPlant = arrPlants.random(), {R, C} = aPlant;
                if($P[aPlant.id]?.Immediately === false && $Z[id]) {
                    aPlant.Die('JNG_TICKET_MembraneZombie');
                    CustomSpecial(oApple, R, C);
                    let canvas = obj.drawALink(obj,R,C),
                    ctx = canvas.getContext("2d");
                    if(!$User.LowPerformanceMode){
                        for(let i =0;i<3;i++){
                            oSym.addTask(2*i,()=>{
                                if(!$(canvas.id)){
                                    return;
                                }
                                ctx.clearRect(0,0,900,600);
                                obj.drawALink(obj,R,C,canvas);
                            });
                        }
                    }
                    let img_index = Math.floor(Math.random()*4);
                    let elecEffect = NewEle("","img",`position:absolute;z-index:${3*R+2};left:${GetX(C)}px;top:${GetY(R)}px;transform: translate(-50%, -65%) scale(0.5);`,{
                        src:obj.PicArr[obj.ElectricShockGif+img_index]
                    },FightingScene);
                    if(!$User.LowPerformanceMode){
                        elecEffect.style.filter="brightness(200%)";
                    }
                    oSym.addTask(80,ClearChild,[elecEffect]);
                    {
                        let json = $User.LowPerformanceMode?{opacity:0}:{filter:"",opacity:0};
                        oEffects.Animate(canvas,json,0.3/oSym.NowSpeed,"linear",ClearChild,0.1/oSym.NowSpeed);
                    };
                    oEffects.ImgSpriter({
                        ele: NewEle(id+'_Effect', "div", `position:absolute;z-index:${R*3+2};width:208px;height:198px;left:${80*C}px;top:${30+100*(R-1)}px;background:url(images/Zombies/MembraneZombie/effect.png) no-repeat;`, 0, EDPZ),
                        styleProperty: 'X',
                        changeValue: -209,
                        frameNum: 13,
                        interval: 9,
                    });
                }
            });
            oSym.addTask(390, _=>  //恢复 390
                $Z[id] && !obj.isGoingDie && (obj.isAttacking = 0, obj.EleBody.src = obj.PicArr[obj.NormalGif])
            );
        }
    },
    DieRotate(self,time){
        let TrueWidth = self.beAttackedPointR-self.beAttackedPointL;
        oEffects.Animate(self.EleBody,{transform:"rotate(90deg) rotateY(45deg)",opacity:0,top:(self.height-TrueWidth-80)+"px",left:"30px"},time/oSym.NowSpeed,'cubic-bezier(0.4, 0.0, 0.6, 1)',_=>{
            oEffects.Animate(self.Ele,{opacity:0},0.05/oSym.NowSpeed,0,_=>{
                ClearChild(self.Ele);
            });
        });
    },
}),
oMakeRifterZombie = InheritO(OrnNoneZombies, {
    EName: "oMakeRifterZombie",
    CName: "开窟僵尸",
    StandGif: 8,
    BoomDieGif: 9,
    width: 200,
    AudioArr: ['icecutter'],
    height: 153,
    beAttackedPointL: 85,
    beAttackedPointR: 165,
    HP: 500,
    HeadTargetPosition: [{
        x: 77,
        y: 35
    }], //头的位置数据
    CardStars: 2,
    Lvl:3,
    Almanac: {
        Tip: "对当前格植物（包括液态保护膜）具有秒杀效果。攻击植物后会在地上留下冰窟。",
        Weakness: "地刺",
        Story: "他的切冰手艺曾让他在图多尔一夜暴富，一度占领了美国北部的市场。而之后为了让公司扩张至英国伦敦，他不惜北上极地，从冰原厚厚的冰层上切冰来满足娇贵的英国老爷们，并千方百计的向他们推销诸如冰镇薄荷酒、鸡尾酒之类的“波士顿想法”。切冰给他带来的好日子直到19世纪90年代才逐渐被南方佬们的“毫无品质的浑浊的机制冰”打破，毁灭，以至于亏得倾家荡产。而到生命最后一刻，他都固守着自己手中的工艺，即使他已经忘记为什么切冰，只知道不断地向前切下去。",
    },
    PicArr: (function() {
        var a = "images/Zombies/MakeRifterZombie/";
        return ["", "", a + "Zombie.webp", a + "ZombieAttack.webp", a + "ZombieLostHead.webp", a + "ZombieLostHeadAttack.webp", a + "ZombieHead.webp", a + "ZombieDie.webp", a + '1.webp', 'images/Zombies/BoomDie.webp']
    })(),
    getShadow(c) {
        return "left:" + c.beAttackedPointL + "px;top:" + (c.height - 22) + "px;"
    },
    getCharredCSS(self) {
        return {
            top: 45 + self.DivingDepth / 1.8,
            left: 90,
            clip: self.DivingDepth > 0 ? "rect(0px, auto, 95px, 0px)" : "",
        }
    },
    setWaterStyle(self, ele) {
        EditCompositeStyle({
            ele,
            addFuncs: [
                ["translate", "5px, 20px"]
            ],
            option: 2
        });
        SetStyle(ele, {
            height: "10.625px",
            width: "84.375px",
            'background-size': "100% 100%",
            'z-index': 300
        });
    },
    NormalAttack: function(d, c) {
        oSym.addTask(50,
            function(e) {
                $Z[e] && oAudioManager.playAudio("icecutter")
            },
            [d]);
        oSym.addTask(100,
            function(f, e) {
                var h = $Z[f],
                    g;
                h && !h.isGoingDie && h.isNotStaticed() && ((g = $P[e]) && h.MakeRifter(g), h.JudgeAttack())
            },
            [d, c])
    },
    MakeRifter: function(aPlant) {
        if (aPlant) {
            let [R, C] = [aPlant.R, aPlant.C];
            oGd.killAll(R, C, 'JNG_TICKET_MakeRifterZombie');
            for (let i = 0; i <= PKindUpperLimit; i++) {
                if (oGd.$[`${R}_${C}_${i}`]) return;
            }
            // 判断僵尸的LivingArea不准确，这里修正
            if (oGd.$GdType[R][C] !== 2) {
                CustomSpecial(oRifter, R, C); //创建冰窟
            }
        }
    },
}),
oSkatingZombie = InheritO(OrnNoneZombies, {
    EName: "oSkatingZombie",
    CName: "滑冰僵尸",
    StandGif: 2,
    BoomDieGif: 8,
    width: 122,
    height: 152,
    getShieldCSS:  _ => "left:20px;top:40px;",
    beAttackedPointL: 48,
    beAttackedPointR: 130,
    CardStars: 2,
    Lvl:3,
    HeadTargetPosition:[{x:25,y:20},{x:20,y:20}],//头的位置数据
    Almanac:{
        Tip:"当经过冰窟时会加速，往前快速滑行3格（滑行时无视前方植物，但仍然可以被植物子弹等打击）。",
        Speed:"慢，滑行时极快",
        Weakness:"冰封海棠",
        Story:"滑冰僵尸最擅长的是单脚滑冰，但其实大家都不知道她的溜冰鞋里其实装载了小型的推进装置。",
    },
    PicArr: (function() {
        var a = "images/Zombies/SkatingZombie/",
        b = "images/Zombies/";
        return ["", "", a + "Zombie.webp", a + "ZombieAttack.webp", a + "ZombieLostHead.webp", a + "ZombieLostHeadAttack.webp", a + "ZombieHead.webp", a + "ZombieDie.webp", 'images/Zombies/BoomDie.webp']
    })(),
    getCharredCSS: self => ({
        top: 45 + self.DivingDepth / 1.8,
        left: 40,
        clip: self.DivingDepth > 0 ? "rect(0px, auto, 95px, 0px)" : "",
    }),
    Skating(self) {
        let x = 0;
        let id = self.id;
        let ele = $(id);
        let delta = self.FangXiang == "GoRight" ? -1 : 1;
        let [_JudgeAttack, _JudgeLR, _JudgeSR] = [self.JudgeAttack, self.JudgeLR, self.JudgeSR];
        if ($Z[self.id] && (delta == 1 ? GetC(self.ZX) > 4: GetC(self.ZX) < 6)) {
            self.JudgeLR = self.JudgeSR = self.JudgeAttack = ()=>{};
            (function func() {
                x++;
                self.AttackedLX -= 4 * delta;
                self.AttackedRX -= 4 * delta;
                self.ZX -= 4 * delta;
                self.X -= 4 * delta;
                let C = GetC(self.ZX - (self.beAttackedPointR - self.beAttackedPointL) / 2 * (self.WalkDirection * 2 - 1));
                if ($Z[id] && x < 68 && oGd.$GdType[self.R][C] !== 2) {
                    ele.style.left = self.X + 'px';
                    oSym.addTask(3.33, func);
                } else {
                    [self.JudgeAttack, self.JudgeLR, self.JudgeSR] = [_JudgeAttack, _JudgeLR, _JudgeSR];
                }        
            })();
        }
    },
    JudgeLR: function(f, d, e, c, g) {
        return e > 10 || e < 1 ? false: function() {
            d += --e + "_";
            var h = PKindUpperLimit,
            i;
            while (h>=0) {
                if ((i = g[d + h])) {
                    if(i.canEat) {  //普通植物
                        return i.AttackedRX >= c && i.AttackedLX <= c ? [f.id, i.id] : false;
                    } else if(i.EName === 'oRifter' && i.AttackedRX >= c && i.AttackedLX <= c) {  //冰窟
                        f.Skating(f);  //调用滑动
                        return false;
                    }
                }
                h--;
            }
        } ()
    },
    JudgeSR: function(f, d, e, c, g) {
        return e > 9 ? false: function() {
            d += e + "_";
            var h = PKindUpperLimit,
            i;
            while (h>=0) {
                if ((i = g[d + h])) {
                    if(i.canEat) {  //普通植物
                        return i.AttackedRX >= c && i.AttackedLX <= c ? [f.id, i.id] : false;
                    } else if(i.EName === 'oRifter' && i.AttackedRX >= c && i.AttackedLX <= c) {  //冰窟
                        f.Skating(f);  //调用滑动
                        return false;
                    }
                }
                h--;
            }
        } ()
    },
}),
oPushIceImp = InheritO(oZombie, {
    EName: "oPushIceImp",
    CName: "推冰小鬼",
    OSpeed: 2.5,
    Speed: 2.5,
    width: 100,
    height: 140,
    beAttackedPointL: 30,
    beAttackedPointR: 70,
    HP: 450,
    getShieldCSS: _ => 'left:10px;top:50px;',
    AttackGif: 1,
    LostHeadGif: 2,
    LostHeadAttackGif: 3,
    HeadGif: 4,
    DieGif: 5,
    StandGif: 6,
    NormalGif: 6,
    FillGif: 7,
    BoomDieGif: 8,
    CanAppearFromTomb: false,
    CardStars: 3,
    Lvl:4,
    HeadTargetPosition:[{x:10,y:50}],//头的位置数据
    PicArr: ((a) => [a + "zombie.webp", a + "ZombieAttack.webp", a + "ZombieLostHead.webp", a +"ZombieLostHeadAttack.webp", a + "ZombieHead.webp", a + "ZombieDie.webp", a + "zombie2.webp", a +'filling.webp', 'images/Zombies/Imp/BoomDie.webp'])("images/Zombies/PushIceImp/"),
    getShadow: self => `left:${self.beAttackedPointL-15}px;top:${self.height-29}px;`,
    getCharredCSS: () => ({top: `35px`,left: `20px`}),
    Almanac:{
        Tip:"推冰小鬼推着冰块入场。碾压其接触的植物，但当它撞上冰窟时就无法继续推冰前进，同时该格冰窟消失。",
        Speed:"中",
        Story:"尽管名字叫做推冰小鬼，但通常僵尸们很少见到他去推那个冰块。鉴于这块仿佛能一直向前行进的冰违反了一切能量定律，他们一致认为他应该在冰旁，不应该在冰上，为此他们甚至在植乎上开了一个问题。但无论网上的人怎么说，他依旧我行我素。",
    },
    NormalAttack(zid, pid) {
        //无事件循环延迟，故无需手工判定植物和僵尸死活
        $P[pid].getHurt($Z[zid], 2, 50);
    },
    JudgeAttack(stepRatio=1) {
        let self = this;
        let ZX = self.ZX;
        let crood = self.R + "_";
        let C = GetC(ZX);
        let G = oGd.$;
        let data = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
        data && self.NormalAttack(...data);
    },
    JudgeLR(self, crood, C, ZX, G) { //远程判定，普通僵尸的远程是自己前面一格
        if (C > 10 || C < 1) return;
        crood += C - 1 + '_';
        let z = PKindUpperLimit;
        while (z >= 0) {
            if (oGd.$GdType[self.R][C] === 2) {
                let plant = CustomSpecial(oBegonia, self.R, C); 
                return self.Fill(self, plant);
            }
            let plant = G[crood + z];
            if (plant && plant.AttackedRX >= ZX && plant.AttackedLX <= ZX) {
                if (plant.canEat) return [self.id, plant.id];
                if (plant.EName === 'oRifter') return self.Fill(self, plant);
            }
            z--;
        }
    },
    JudgeSR(self, crood, C, ZX, G) { //近程判定，普通僵尸的近程是自己所在一格
        if (C > 9) return;
        crood += C + "_";
        let z = PKindUpperLimit;
        while (z >= 0) {            
            if (oGd.$GdType[self.R][C] === 2) {
                let plant = CustomSpecial(oBegonia, self.R, C); 
                return self.Fill(self, plant);
            }
            let plant = G[crood + z];
            if (plant && plant.AttackedRX >= ZX && plant.AttackedLX <= ZX) {
                if (plant.canEat) return [self.id, plant.id];
                if (plant.EName === 'oRifter') return self.Fill(self, plant);
            }
            z--;
        }
    },
    Fill(obj, bingku) {
        if (bingku.EName !== 'oBegonia') CustomSpecial(oBegonia, bingku.R, bingku.C); //调用冰封海棠填冰
        obj.isAttacking = 1; //禁用前进
        obj.Altitude = 3; //禁用受攻击
        obj.EleBody.src = obj.PicArr[obj.FillGif]; //切换贴图
        oSym.addTask(450, function () { //切换至正常状态
            if ($Z[obj.id] && !obj.isGoingDie) {
                [obj.NormalGif, obj.Altitude, obj.isAttacking, obj.OSpeed, obj.Speed, obj.HP] = [0, 1, 0, 2, 2, 250];
                obj.EleBody.src = obj.PicArr[obj.NormalGif];
                for (let i of ['NormalAttack', 'JudgeAttack', 'JudgeLR', 'JudgeSR']) { //重写接口
                    obj[i] = oZombie.prototype[i];
                }
            }
        });
    },
    GoingDieHead: CZombies.prototype.GoingDieHead,
}),
oZomboni = function () {
    var a = function (obj, attack) {
        if(obj.ShieldHP > 0) {
            obj.getShieldHit(obj);
        }
        else{
            let hp = obj.HP;
            if ((obj.HP = hp - attack) < 200) { //垂死
                obj.getHit0 = obj.getHit1 = obj.getHit2 = function () {};
                obj.GoingDie();
                return;
            }
            obj.SetBrightness(obj, obj.EleBody, 1);
            oSym.addTask(10,
                function (id, e) {
                    (e = $Z[id]) && e.SetBrightness(e, e.EleBody);
                },
            [obj.id]);
        }
    };
    return InheritO(OrnNoneZombies, {
        EName: "oZomboni",
        CName: "冰车僵尸",
        HP: 1350,
        StandGif: 0,
        NormalGif: 0,
        DieGif: 2,
        FlatTireGif: 1,
        width: 225,
        height: 220,
        GetDTop: 10,
        beAttackedPointL: 0,
        beAttackedPointR: 175,
        OSpeed: 2.5,
        Speed: 2.5,
        AKind: 2, //汽车类僵尸
        CanGoThroughWater:false,
        Attack: 50,
        Ornaments: 1,
        BoomDieGif: 7,
        CanAppearFromTomb: false,
        CardStars: 3,
        Lvl:6,
        HeadTargetPosition:[{x:65,y:90},{x:65,y:90}],//头的位置数据
        PicArr: (function () {
            let b = "images/Zombies/Zomboni/";
            return [b + "1.webp", b + 'FlatTire.webp', b + "Die.webp", b + "ice_n.webp", b +
                "ice_m.webp", b + "ice_cap_n.webp", b + "ice_cap_m.webp", b+'BoomDie.webp'];
        })(),
        Almanac:{
            Tip:"雪橇车僵尸会在经过之处留下冰道，冰道上不可种植，冰道经过一段时间后消失。雪橇车僵尸遇到冰窟时会填补冰窟。",
            Speed:"中",
            Weakness:"地刺",
            Story:"尽管一眼看上去，他就是个坐在冰车上的僵尸。但如果你仔细看，你就会发现他似乎没有脖子。有的人说这是因为他的后颈曾经被玻璃碎片割开过，虽然他们关于什么时候怎么发生尚无定论。也有的人说这是因为他是妖怪oni的转世，虽然他们从来没有摘下过他的毛线帽子来看他脑袋上有没有角。但无论原因到底是什么，网民对于这件事的讨论都给他旗下的冰车公司Frank J. Zamboni＆Co.Inc带来了流量。",
        },
        getShadow(self){
            return `left:${self.beAttackedPointL-10}px;top:${self.height-20}px;width:210px;background-size:210px 38px;height:38px;`;
        },
        getShieldCSS: _ => 'left:55px;top:85px;',
        AudioArr: ["zamboni", "machineExplosion"],
        getButter(){},
        Bounce() {},
        CanPass(R, LF) {
            let self = this;
            return LF && self.AccessiblePath[oGd.$LF[R] + "_" + LF] && oGd.$GdType[R][oS.C] !== 2;
        },
        BirthCallBack(self) {
            let delayT = self.delayT;
            let id = self.id;
            let ele = self.Ele = $(id);
            let R = self.R;
            let $Ice = oGd.$Ice;
            self.EleShadow = ele.firstChild;
            self.EleBody = ele.childNodes[1];
            //如果此行不存在冰道数据
            if (!$Ice[R] || !$("dIceCar" + R)) {
                let wrap = NewEle("dIceCar" + R, "div",
                    `position:absolute;z-index:1;left:145px;top:${GetY(R) - 80}px;width:800px;height:72px`,
                    0, EDPZ);
                NewEle(`Ice_${R}`, 'div',
                    `position:absolute;width:800px;height:72px;left:5px;clip:rect(0,auto,auto,800px);background:url(images/Zombies/Zomboni/ice_${oS.DKind ? 'm' : 'n'}.webp) repeat-x`,
                    null, wrap);
                NewImg(`Ice_Cap_${R}`, `images/Zombies/Zomboni/ice_cap_${oS.DKind ? 'm' : 'n'}.webp`,
                    "position:absolute;left:956px;", wrap);
                $Ice[R] = [1, 11,self.X + 150];//第二个参数为制冰点X坐标，并不是AttackedLX，这里做出修改
            } else {
                ++$Ice[R][0];
            }
            const callback = () => {
                SetBlock(ele);
                oAudioManager.playAudio("zamboni");
            };
            if (delayT) {
                oSym.addTask(delayT, () => {
                    self.freeStaticEffect(self, "SetBody");
                    $Z[id] && callback();
                });
            } else {
                callback();
            }
        },
        getRealSpeed(self,stepRatio=1){
            return (self.Speed+(self.DiyConfigs?.__ZomboniLSpeed__||self.Speed))/2*self.SpeedCoefficient*stepRatio;
        },
        ChkActs: function (self, R, arR, i,stepRatio=1) {
            if(oGd.$GdType[R][GetC(self.AttackedLX+40)]==2){
                self.NormalDie();
                return 1;
            }
            if (self.isNotStaticed()) {
                let Speed, AttackedRX, rV, BigDiv,
                    ArIce = oGd.$Ice[R], //当前行的冰道数据
                    X, X1, X2, C,
                    dIceCar = $('dIceCar' + R);
                self.JudgeAttack(stepRatio); //无论是否临死均有碾压        这里把加速度算上
                (AttackedRX = self.AttackedRX -= (Speed = self.getRealSpeed(self,stepRatio))) < -50 ? (
                    oZ.del(arR, i),
                    self.DisappearDie(),
                    rV = 0
                ) : (
                    self.ZX = self.AttackedLX -= Speed,
                    self.Ele.style.left = Math.floor(self.X -= Speed) + 'px',
                    rV = 1
                );
                X = self.X;
                X1 = X + 150; //制冰点的X坐标
                X2 = X; //裁剪距离
                C = GetC(X1 + 19);
                if (C > -1 && ArIce && C < ArIce[1]) {
                    //当冰车的列比冰道小，则锁定当前列的格子
                    oGd.$Crater[R + '_' + C] = true;
                    oGd.$LockingGrid[R + "_" + C] = true;
                    let PData;
                    for(let i = 0;i<=PKindUpperLimit;i++){
                        if(PData=oGd.$[`${R}_${C}_${i}`]){
                            PData.getHurt(self, 2, self.Attack);
                        }
                    }
                    ArIce[1] = C; //保存当前行的冰车道最左到达了哪一列                    
                }
                if (X1 > 120 && ArIce && X1 < ArIce[2]) {
                    ArIce[2] = X1;
                    dIceCar && (dIceCar.firstChild.style['clip'] = "rect(0,auto,auto," + X2 + "px)",
                        dIceCar.childNodes[1].style.left = Math.max(0, X2) + 'px');
                }
                //前4格减速
                GetC(self.AttackedLX) > 5 && (self.OSpeed = Math.min(self.OSpeed,self.DiyConfigs.__ZomboniLSpeed__=(self.Speed -= 0.005*stepRatio)));
                return rV;
            }
            return 1;
        },
        getPea: function (c, b) {
            oAudioManager.playAudio(["shieldhit", "shieldhit2"][Math.floor(Math.random() * 2)]);
            c.getHit0(c, b);
        },
        getFirePea: function (c, b) {
            oAudioManager.playAudio(["shieldhit", "shieldhit2"][Math.floor(Math.random() * 2)]);
            c.getHit0(c, b);
        },
        getSnowPea: function (c, b) {
            oAudioManager.playAudio(["shieldhit", "shieldhit2"][Math.floor(Math.random() * 2)]);
            c.getHit0(c, b);
        },
        getSlow(){},
        getFirePeaSputtering: function () {},
        getFreeze() { //原地冰冻效果
            this.getHit0(this, 20)
        },
        getCharredCSS: _ => ({}),
        getHit: a,
        getHit0: a,
        getHit1: a,
        getHit2: a,
        getExcited(intensity,duration_=undefined) {
            let self = this;
            let ele = self.Ele;
            let duration = duration_??1200;
            let oldTimeStamp = self.FreeExcitedTime;
            let newTimeStamp = oSym.Now + duration;
            self.Speed *= intensity;
            self.Attack *= intensity;
            if(!oldTimeStamp){
                NewImg(`buff_excited_${Math.random()}`, "images/Zombies/buff_excited.gif", "left:50px;top:200px;height:38px;z-index:5;", ele, {className: 'buff_excited'});
                !$User.LowPerformanceMode && EditCompositeStyle({
                    ele: self.EleBody,
                    styleName: 'filter',
                    addFuncs: [['url', oSVG.getSVG('getExcited')]],
                    option: 2,
                });
            }
            if(oldTimeStamp < newTimeStamp) {  
                self.FreeExcitedTime = newTimeStamp;
                oSym.addTask(duration, () => {
                    if($Z[self.id] && self.FreeExcitedTime === newTimeStamp){
                        ClearChild(ele.querySelector('.buff_excited'));
                        self.FreeExcitedTime = 0;
                        self.Attack = self.OAttack;
                        self.Speed && (self.Speed = self.OSpeed);
                        !$User.LowPerformanceMode && EditCompositeStyle({
                            ele: self.EleBody,
                            styleName: 'filter',
                            delFuncs: [['url',oSVG.getSVG('getExcited')]],
                            option: 2
                        });
                    }
                });
            }  
        },
        GoingDie: function () {
            let b = this;
            b.beAttacked = 0;
            b.AutoReduceHP(b.id);
            //抖动特效
            (function fun() {
                oSym.addTask(2, () => {
                    b.EleBody.style['marginLeft'] = '-1px';
                    oSym.addTask(2, () => {
                        b.EleBody.style['marginLeft'] = '2px';
                        $Z[b.id] && fun();
                    })
                });
            })();
            b.ChanceThrowCoin(b);
        },
        NormalDie: function () { //正常死亡
            oAudioManager.playAudio("machineExplosion");
            let self = this;
            let wrap = self.Ele;
            let effect = NewEle(self.id + "godie", "div",`position:absolute;z-index:${self.zIndex+1};width:225px;height:220px;left:${self.X}px;top:${self.pixelTop}px;background:url(${self.PicArr[self.DieGif]});`,0, EDPZ);
            self.PrivateDie && self.PrivateDie(self);
            self.HP = 0;
            oEffects.fadeOut(wrap, 1.3, _ => ClearChild(wrap, effect));
            delete $Z[self.id];
            oP.MonitorZombiePosition(self);
            self.PZ && oP.MonPrgs(self);
        },
        PrivateDie: self => self.JudgeIce(),
        CrushDie: function () { //被剪草机压死
            this.NormalDie();
        },
        getThump: function () { //被窝瓜压死
            this.NormalDie();
        },
        JudgeIce: function () { //冰道后续机制
            let R = this.R,
                dIceCar = $("dIceCar" + R),
                $Ice = oGd.$Ice[R],
                $Crater = oGd.$Crater;
            //如果现在当前行已经没冰车了，激活清除程序
            $Ice && (--$Ice[0]) <= 0 && oSym.addTask(3000, _ => {
                let leftBorderC = $Ice[1];
                $Ice = oGd.$Ice[R];
                if ($Ice && $Ice[0] <= 0 && dIceCar) {
                    oEffects.fadeOut(dIceCar, 'fast', ClearChild);
                    while (leftBorderC < 11) {
                        delete $Crater[R + "_" + leftBorderC];
                        oGd.unlockGrid(R, leftBorderC);
                        leftBorderC++;
                    }
                    delete oGd.$Ice[R];
                }
            });
        },
        flatTire() { //被地刺扎到
            let self = this;
            self.EleBody.src = self.PicArr[self.FlatTireGif];
            self.beAttacked = self.HP = 0;
            self.getHit0 = self.getHit1 = self.getHit2 = self.ChkActs = self.ChkActs1 = ()=>{};
            oSym.addTask(290, () => $Z[self.id] && self.NormalDie());
        },
        JudgeAttack: function () {
            var f = this,
                c = f.ZX,
                d = f.R + "_",
                e = GetC(c),
                g = oGd.$,
                b;
            (b = f.JudgeLR(f, d, e, c, g) || f.JudgeSR(f, d, e, c, g)) && f.NormalAttack(b[0], b[1])
        },
        JudgeLR(self, crood, C, ZX, G) { //远程判定，普通僵尸的远程是自己前面一格
            if (C > 10 || C < 1) return;
            crood += C - 1 + '_';
            let z = PKindUpperLimit;
            while (z >= 0) {
                let plant = G[crood + z];
                if (plant && plant.AttackedRX >= ZX && plant.AttackedLX <= ZX) {
                    if(plant.EName === 'oRifter') return CustomSpecial(oBegonia, plant.R, plant.C);
                    if(plant.isPlant) return [self.id, plant.id];
                }
                z--;
            }
        },
        JudgeSR(self, crood, C, ZX, G) { //近程判定，普通僵尸的近程是自己所在一格
            if (C > 9) return;
            crood += C + "_";
            let z = PKindUpperLimit;
            while (z >= 0) {
                let plant = G[crood + z];
                if (plant && plant.AttackedRX >= ZX && plant.AttackedLX <= ZX) {
                    if(plant.EName === 'oRifter') return CustomSpecial(oBegonia, plant.R, plant.C);
                    if(plant.isPlant) return [self.id, plant.id];
                }
                z--;
            }
        },
        NormalAttack: function (zid, pid) {
            let zombie = $Z[zid],
                plant = $P[pid];
            zombie && plant && plant.getHurt(zombie, 2, zombie.Attack)
        },
    })
}(),
oBossB = InheritO(oBossA, {
    EName: "oBossB",
    CName: "僵王博士-雪鸮一号",
    HP: 8000,
    Stage:1,
    width: 488,
    height: 420,
    CanSummonZomboni:0,
    SummonLevel: 0,
    beAttackedPointL: 120,
    beAttackedPointR: 326,
    SummonZombieDifficulty:0.65,
    useTraditionalWrap: true,
    AudioArr: ["Zomboss1", "Zomboss2", "Zomboss3", "flappyappear", "flappybird1", "flappybird2", "flappydisappear", "missileshoot", "missilefall", "vanish", "owlscream1", "owlscream2", "owlscream3", "machineExplosion"],
    ChanceThrowCoin(){},
    CanAppearFromTomb: false,
    CanDrawBlood: true,
    CardStars: 6,
    Almanac:{
        Tip:"僵尸博士在极光冰原的座驾，碰到植物一定秒杀，免疫冰冻等不良状态。<br/><br/>技能1：从地上召唤僵尸<br/>技能2：射出导弹，摧毁植物和僵尸<br/>技能3：召唤寒风，摧毁植物并制造冰块<br/>技能4：有几率能使僵尸隐身。",
        Speed:"静止",
        Weakness:"爆炸类植物",
        get Story(){
            let a = "雪鸮一号是僵尸博士爱的结晶，他从凌晨一直工作到黑夜，他对末日的抗寒机制的每一个细节都很着迷，他亲手制作了雪鸮那几乎无法穿透的皮肤。他用手把他的喙削尖。他煞费苦心地在机器身体的两旁安装了这个致命的可以扇起冰风的翅膀。当他的杰作完成时，博士不止流下了喜悦的眼泪。不管你怎么评价这个邪恶的天才，他对自己的项目都很有激情。";
            let json = localStorage["JNG_TR_WON"]?JSON.parse(localStorage["JNG_TR_WON"]):{};
            let man = json["Industry25"]?"Job":"戴夫（身份存疑）";
            let word1 = `在这个程序设定注定要出现精英怪的一天，出于${man}的意志，雪鸮一号以其似乎要扫清一切的姿态在冰原凭空出现，腾空而起。`;
            let b = "他在创造这台机器时，";
            let d = "增加了每一个零件的公差，让它";
            let e = "受到了6天前他从网上得知这件事的前因后果的影响：他看到的，网络上人们自诩的所谓正义的大旗铸就了它似乎是正面的形象；他看到的，网民们不负责任的言论铸就了它尖锐锋利的喙；他看到的，人们在风暴中的集体无意识与狂热铸就了它煽风点火的翼。但就像网络上树起的虚假的正义一样，他";
            let f = "几乎一触即碎。";
            let c = function(str="人们间"){
                return `仿佛这个雪鸮生来就是为了${str}屠杀与被屠杀之娱乐，全然不顾有一个生命仍被牢牢地束缚在这个机器的驾驶座上。`;
            }
            if(!json["Marsh25"]){
                return a;
            }else{
                if(json["Industry25"]||json["Industry20"]){
                    return word1+b+e+d+f+c();
                }else if(json["Polar30"]){
                    return word1+b+"把一切心中的愤懑、不满与癫狂都注入进这台疯狂机械的每一个细节之中。但与此同时却又刻意的"+d+"难以经受爆炸所形成的冲击波。"+c("");
                }else{
                    return word1+"但对于这个隐于冰风中的巨型机械，我们还有很多东西尚未搞清楚。";
                }
            }
        },
    },
    getAlmanacDom(pro){
        if(!pro.Almanac.Dom){
            let ClassAlmanac = CZombies.prototype.Almanac;
            for(let i in ClassAlmanac){
                if(!pro.Almanac[i]){
                    pro.Almanac[i] = ClassAlmanac[i];
                }
            }
            pro.Almanac.Dom=pro.getHTML("",  190-pro.width/2,  550- pro.height, "1;transform:scale(0.7);height:"+pro.height+"px;width:"+pro.width+"px", "block", "auto", pro.GetDTop, pro.PicArr[0]);
        }
    },
    PicArr: (function() {
        var b = "images/Zombies/BossB/";
        return [b + "0.webp", b + "move1.webp", b + "move2.webp", b + "call.webp", b + "icewind.webp", b + 'missiles.webp', b + 'die.png'];
    })(),
    GetDY: _=>40,
    getButter(){},
    Bounce() {},
    RenderEleBody(url, callback) {
        let self = this;
        let oldBody = self.EleBody;
        let newBody = oldBody.cloneNode();
        newBody.src = url;
        newBody.onload = _=> {
            self.Ele.replaceChild(newBody, oldBody);
            self.EleBody = newBody;
            newBody.onload = null;
            callback && callback();
        };
    },
    CustomBirth(R, C, delayT, clipH) {
        const self = this,
        bottomY = GetY(R) + self.GetDY(),
        pixelTop = bottomY - self.height, 
        zIndex = 3 * R + 1,
        id = self.id = "Z_" + Math.random(),
        beAttackedPointL = self.beAttackedPointL,
        beAttackedPointR = self.beAttackedPointR;
        self.ZX = self.AttackedLX = GetX(C) - beAttackedPointL;
        self.X = self.ZX - beAttackedPointL ;
        self.AttackedRX = self.X + beAttackedPointR;
        self.R = R;
        self.pixelTop = pixelTop;
        self.zIndex = zIndex;
        if (self.delayT = delayT) {
            // SetBody由于是供底层代码控制僵尸延时出场的，比较特殊
            // 所以为了保险起见，定身状态需要手工解除
            self.getStatic({
                time: Infinity,
                type: "SetBody",
                useStaticCanvas: false,
                forced: true,
                usePolling: false,
            });
        }
        self.Activites = self.Activites.bind(self);
        return self.getHTML(id, self.X, pixelTop, zIndex, "block", clipH || 0, self.GetDTop, 'images/Zombies/BossB/move2.webp');
    },
    RestoreAction(delay) {
        oSym.addTask(delay, _=>{
            this.EleBody.src = 'images/Zombies/BossB/0.webp';
            this.Activites();            
        });
    },
    Move(R, C = 8) {
        let self = this, ele = self.EleBody,
        LX=self.X, LY=self.pixelTop,
        targetX = GetX(C) - self.beAttackedPointL,
        targetY = GetY(R) - self.height + self.GetDY();
        if(R === self.R) {
            self.Activites();
            return;
        }
        oAudioManager.playAudio("flappydisappear");
        ele.src = `images/Zombies/BossB/move1.webp`;
        oSym.addTask(40, oEffects.Animate, [ele, {opacity: 0}, 'slow', 'ease-in', _=>{
            self.ZX = self.AttackedLX = targetX;
            self.X = targetX - self.beAttackedPointL;
            self.AttackedRX = self.X + self.beAttackedPointR;
            self.pixelTop = targetY;
            self.beAttacked = 0;
            oZ.moveTo(self.id, self.R, R);
        }]);
        oSym.addTask(200, _=>{
            oAudioManager.playAudio("flappyappear");
            ele.src = 'images/Zombies/BossB/move2.webp';
            SetStyle(self.Ele, {
                left: self.X+'px',
                top: targetY+'px',
                'z-index': 3*R + 2,
            });
            oEffects.Animate(ele, {opacity: 1}, 1.1/oSym.NowSpeed, 'ease-in', _=>self.RenderEleBody('images/Zombies/BossB/0.webp', _=>{
                self.beAttacked = 1;
                self.Activites();             
            }));
        });
    },
    Activites() {
        let time, random, self=this, ele = self.EleBody,sound=Math.floor(Math.random()*11)+1;
        if(!$Z[self.id]){
            return;
        }
        if(sound<4){
            oAudioManager.playAudio("Zomboss"+sound);
        }
        switch(self.Stage) {
            case 1:
                time = Math.random()*600+600;
                random = Math.random()*5;
                if(random>=3.5 || oP.NumZombies<3*self.SummonZombieDifficulty) {
                    self.PlaceZombies(time, Math.floor(Math.random()*4+4), [oZombie,oConeheadZombie,oImp,oBalloonZombie]);
                } else if(random>=2) {
                    if(oP.NumZombies>10) {
                        oSym.addTask(time, self.Activites);
                    } else {
                        self.Move(Math.floor(Math.random()*5+1));
                    }
                } else if(random>=1.25) {
                    self.PlaceMissiles(2,0);
                } else if(random>=0.5) {
                    self.IceStorm(self.R-1, self.R, Math.floor(Math.random()*3+1));
                } else {
                    oSym.addTask(time/6, self.Activites);
                }
                break;
            case 2:
                time = Math.random()*600+800;
                random = Math.random()*5;
                if(random>=3.5 || oP.NumZombies<4*self.SummonZombieDifficulty) {
                    self.PlaceZombies(time,Math.floor(Math.random()*(8+(self.SummonLevel+=Math.random()+0.4))+12),[oZombie,oConeheadZombie,oBucketheadZombie,oStrollZombie,oMakeRifterZombie,oSkatingZombie,oNewspaperZombie,oCaskZombie]);
                }else if(random<=1.5){
                    if(oP.NumZombies>23){
                        oSym.addTask(time,self.Activites);
                    }else{
                        self.Move(Math.floor(Math.random()*5+1));
                    }
                }else if(random>2.5){
                    self.PlaceMissiles(3,0);
                }else if(random<2){
                    self.IceStorm(self.R-1,self.R+1,Math.floor(Math.random()*5+2));
                }else{
                    oSym.addTask(time/2,self.Activites);
                }
                break;
            case 3:
                time = Math.random()*700+900;
                random = Math.random()*5;
                if(random>=3.5 || oP.NumZombies<17*self.SummonZombieDifficulty){
                    self.PlaceZombies(time,Math.floor(Math.random()*(15+(self.SummonLevel+=Math.random()+0.6))+17),[oImp,oConeheadZombie,oZombie,oCigarZombie,oPushIceImp,oMembraneZombie,oSadakoZombie,oNewspaperZombie,oStrollZombie,oMakeRifterZombie]);
                }else if(random>=2.7){
                    if(oP.NumZombies>45){
                        self.SelfCantBeAttack(time/2);
                        oSym.addTask(time,self.Activites);
                    }else{
                        self.Move(Math.floor(Math.random()*5+1),Math.floor(Math.random()*2+7),1.2);
                    }
                }else if(random>2.3){
                    self.PlaceMissiles(2,0);
                }else if(random>=1.9){
                    self.IceStorm(self.R-1,self.R+1,Math.floor(Math.random()*3+3));
                }else if(random>=1){
                    self.SelfCantBeAttack(time/3);
                    self.ZombieInvisible(self.R,self.R);
                    oSym.addTask(time/3,self.Activites);
                }else{
                    self.SelfCantBeAttack(time/2);
                    oSym.addTask(time/3,self.Activites);
                }
                break;
            case 4:
                time = Math.random()*650+600;
                random = Math.random()*5;
                if(random>=3.5||oP.NumZombies<11*self.SummonZombieDifficulty){
                    let arr = [oImp,oConeheadZombie,oImp,oConeheadZombie,oZombie,oCigarZombie,oPushIceImp,oMakeRifterZombie];
                    self.CanSummonZomboni&&(arr[arr.length]=oZomboni);
                    self.PlaceZombies(time,Math.floor(Math.random()*(6+(self.SummonLevel+=Math.random()+0.4))+6),arr);
                }else if(random<=1.5){
                    if(oP.NumZombies>45){
                        oSym.addTask(time,self.Activites);
                        self.SelfCantBeAttack(time/3);
                    }else{
                        self.Move(Math.floor(Math.random()*5+1),Math.floor(Math.random()*2+7),1.4);
                    }
                }else if(random>2.5){
                    self.PlaceMissiles(1);
                }else if(random<2){
                    self.IceStorm(self.R-1,self.R+1,Math.floor(Math.random()*3+4));
                }else {
                    self.SelfCantBeAttack(time/4);
                    oSym.addTask(time/3,self.Activites);
                }
                break;
            default:
                time = Math.random()*300+500;
                random = Math.random()*7;
                if(random>6||oP.NumZombies<((4466-self.HP)%25+13)*self.SummonZombieDifficulty){
                    self.SelfCantBeAttack(time/1.3);
                    let arr = [oZombie,oZombie,oZombie, oConeheadZombie, oStrollZombie, oBucketheadZombie, oBalloonZombie, oNewspaperZombie, oStrollZombie, oCigarZombie,oSkatingZombie,oMakeRifterZombie, oFootballZombie, oImp, oCaskZombie, oSadakoZombie,oPushIceImp, oMembraneZombie, oCigarZombie,oSkatingZombie,oMakeRifterZombie, oFootballZombie, oImp, oCaskZombie, oSadakoZombie,oPushIceImp, oMembraneZombie];
                    self.CanSummonZomboni&&(arr[arr.length]=oZomboni);
                    self.PlaceZombies(time,Math.floor(Math.random()*(13+(self.SummonLevel+=Math.random()+0.8))+15),arr);
                }else if(random>5.5){
                    self.PlaceMissiles();
                    self.SelfCantBeAttack(time/7.5);
                }else if(random>4&&random<5){
                    self.IceStorm(1,5,Math.floor(Math.random()*5+5));
                    self.SelfCantBeAttack(time/5.4);
                }else if(random>3){
                    self.ZombieInvisible(self.R-1,self.R+1);
                    self.Move(Math.floor(Math.random()*5+1),Math.floor(Math.random()*2+7),1.5);
                }else{
                    oSym.addTask(time/3,self.Activites);
                    self.SelfCantBeAttack(time/4);
                }
        }
    },
    ZombieInvisible(Up,Down) {
        oAudioManager.playAudio("vanish");
        for(let zom of $Z){
            if(zom.R>=Up && zom.R<=Down && !zom.isPuppet && zom.id !== this.id) {
                oEffects.Animate($(zom.id), {opacity:'0'}, 1/oSym.NowSpeed, 'linear', _=>
                   $Z[zom.id] && ($(zom.id).style.visibility = `hidden`)
                );
            }
        }
    },
    SelfCantBeAttack(time) {
        this.HP+=5*(time/100);
        oFlagContent.update({ curValue: this.HP });
    },
    PlaceZombies(time, num, zombies) {
        oSym.addTask(100/oSym.NowSpeed,_=>{
            oAudioManager.playAudio("owlscream" + Math.floor(1 + Math.random() * 3));
            oAudioManager.playAudio("flappybird" + Math.floor(1 + Math.random() * 2));
        });
        this.EleBody.src = 'images/Zombies/BossB/call.webp';
        this.RestoreAction(380);
        num=Math.floor(num*this.SummonZombieDifficulty);
        while(num--) {
            oSym.addTask(Math.random()*(time/2), _=>{
                    if(!$Z[this.id]){
                        return;
                    }
                    let obj=zombies[Math.floor(Math.random()*zombies.length)];
                    PlaceZombie(obj ,Math.floor(Math.random()*5+1) ,(obj.prototype.EName=="oZomboni"?11:GetC(this.X)+1) );
                }
            );
        }
    },
    IceStorm(a, b, number) {
        oSym.addTask(100/oSym.NowSpeed,_=>{
            oAudioManager.playAudio("owlscream" + Math.floor(1 + Math.random() * 3));
            oAudioManager.playAudio("flappybird" + Math.floor(1 + Math.random() * 2));
        });
        this.EleBody.src = 'images/Zombies/BossB/icewind.webp';
        this.RestoreAction(380);
        oSym.addTask(100, oMiniGames.IceStorm, [a, b, number]);
        oSym.addTask(200,_=>{
            for(let i of $Z){
                if($Z[i.id]&&i.id!=this.id&&((i.R>=a&&i.R<=b)||(i.R>=b&&i.R<=a))){
                    i.getHit0(i,60);
                }
            }
        });
    },
    BirthCallBack(self) {
        oAudioManager.playAudio("Zomboss" + Math.floor(1 + Math.random() * 3));
        oAudioManager.playAudio("flappyappear");
        let ele = self.Ele = $(self.id),
        eleBody = self.EleBody = ele.childNodes[1];
        self.EleShadow = ele.firstChild;
        ele.style.opacity = 0;
        oEffects.Animate(ele, {opacity: 1}, 1, 'ease-in', _=>
            self.RenderEleBody('images/Zombies/BossB/0.webp', _=>oSym.addTask(100, self.Activites))
         );
    },
    ChkActs: _=>1,
    ChkStage() {
        let self = this, HP = self.HP, oHP = self.__proto__.HP;
        switch(true) {
            case HP < oHP/5*4.3 && self.Stage<2:
                self.Stage=2;
                self.SummonLevel=0;
                break;
            case HP < oHP/5*3 && self.Stage<3:
                self.Stage=3;
                self.SummonLevel=0;
                break;
            case HP < oHP/5*2.5 && self.Stage<4:
                self.Stage=4;
                self.SummonLevel=0;
                break;
            case HP < oHP/5 && self.Stage<5:
                self.Stage=5;
                self.SummonLevel=0;
                break;
        }
    },
    NormalGetAttack(self, a) {
        if((self.HP -= a) < 0) {
            self.NormalDie();
            self.getHit0 = self.getHit1 = self.getHit2 = _=>{};
            return;
        }
        self.ChkStage();
        self.SetBrightness(self, self.EleBody, 1);
        oSym.addTask(10, _=>$Z[self.id] && self.SetBrightness(self, self.EleBody, 0));
        oFlagContent.__HeadEle__.className.includes("BOSSHead") && oFlagContent.update({ curValue: self.HP });
    },
    getRaven() {},
    getCrushed() {
        this.NormalGetAttack(this,40);//撞到车给僵王造成约1/10血量的伤害
    },
    getHit0(d, a) {
        this.NormalGetAttack(d,a);
    },
    getHit1(d, a) {
        this.NormalGetAttack(d,a);
    },
    getHit2(d, a) {
        this.NormalGetAttack(d,a);
    },
    getSlow(){},
    getExplosion() {
        let self = this;
        if(self.HP > 400) {
            self.HP -= 400;
            self.ChkStage();
        } else {
            self.HP = 0;            
            self.NormalDie();
        }
        oFlagContent.__HeadEle__.className.includes("BOSSHead") && oFlagContent.update({ curValue: self.HP });
    },
    PlaceMissiles(Numbers=2, PlaceRifter=1, a=this) {
        oSym.addTask(30/oSym.NowSpeed,function(){
            oAudioManager.playAudio("missileshoot");
        });
        oSym.addTask(100/oSym.NowSpeed,function(){
            oAudioManager.playAudio("missilefall");
        });
        a.EleBody.src = 'images/Zombies/BossB/missiles.webp';
        a.RestoreAction(200);
        ! a.isAttacking && (a.isAttacking = 1);
        oSym.addTask(150, function(d) {
            var posArr = [];
            var arrP = hasPlants(true);
            var c = oMissile;
            for (var is = 0; is < Numbers&&arrP.length>0; is++) {
                var Select = parseInt(Math.random() * arrP.length);
                CustomSpecial(c, arrP[Select].R, arrP[Select].C);
                posArr.push([arrP[Select].R, arrP[Select].C]);
                arrP.splice(Select,1);
            }
            oSym.addTask(40,function(){
                for(let i =0;i<posArr.length;i++){
                    for(let z of $Z){
                        if($Z[z.id]){
                            let dist=Math.distance([z.X,GetY(z.R)],[GetX(posArr[i][1]),GetY(posArr[i][0])]);
                            if(z.id!=a.id&&dist<=120){
                                if(z.R==posArr[i][0]&&GetC(z.X)==posArr[i][1]){
                                    z.getExplosion();
                                }else{
                                    if(z.HP+z.OrnHP<640-Math.floor(dist*2.7)){
                                        z.getExplosion();
                                    }else{
                                        z.getHit0(z,640-Math.floor(dist*2.7));
                                    }
                                }
                            }
                        }
                    }
                }
            });
            d.isAttacking && (d.isAttacking = 0)
        },[a])  
    },
    NormalDie() {
        oAudioManager.playAudio("machineExplosion");
        let self = this, id = self.id;
        self.EleBody.src = self.PicArr[0];
        self.HP = 0;
        oEffects.fadeOut(self.Ele, 3, _=>{ClearChild(self.Ele)});
        delete $Z[id];
        oEffects.ImgSpriter({
            ele: NewEle(id + "_Die", "div", `position:absolute;z-index:${self.zIndex+3};height:420px;width:488px;left:${self.X}px;top:${self.pixelTop}px;background:url(images/Zombies/BossB/die.png) no-repeat;`, 0, EDPZ),
            styleProperty: 'X',
            changeValue: -488,
            frameNum: 24,
            interval: 9,
        });
        oEffects.ScreenShake();
        oP.MonitorZombiePosition(self);
        oSym.addTask(200, _ => {
            toWin();
            for (let i of $Z) i.ExplosionDie();
        });
        for (let i of $Z) i.ExplosionDie();
    }
}),
oWinterBoss = InheritO(oBossB,{
        EName: "oWinterBoss",
        CName: "冬boss",
        HP: 10000,
        SummonZombieDifficulty:0.8,
        CanSummonZomboni:1,
}),
//雾都僵尸从以下开始
oSculptorZombie = InheritO(oZombie, {
    EName: "oSculptorZombie",
    CName: "雕塑家僵尸",
    width: 230,
    height: 185,
    beAttackedPointL: 126,
    beAttackedPointR: 190,
    NormalGif: 0,
    AttackGif: 1,
    LostHeadGif: 2,
    LostHeadAttackGif: 3,
    HeadGif: 4,
    DieGif: 5,
    StandGif: 6,
    PushGif: 7,
    LostHeadPushGif: 8,
    GetDY: _ => 5,
    HP: 670,
    getShieldCSS: _ => 'left:110px;top:70px;',
    BreakPoint: 224,
    OSpeed: 0.6,
    Speed: 0.6,
    BoomDieGif: 9,
    CanGoThroughWater: false,
    CardStars: 4,
    Lvl:5,
    Almanac: {
        Tip: "雕塑家僵尸会从外推入雕像，并在遇到雕像时将其向前推一格。",
        Speed: "很慢",
        Weakness: "穿透类植物",
        Story: "从他记事起，雕塑家僵尸就日复一日地在伦敦的一个小工房里雕刻着雕塑。鉴于卖家并不对雕像的质量做什么要求，只要求尽快雕出那些英国历史上的权贵们，这实在是一个毫无艺术性的累人活计。说实话，他已经有打算要休假了，也许是北上看看冰原的极光，也许是南下看看那片沼泽与森林的自然风光，但在他达到卖家所要求的惊人数目前，他只有一日一日的重复性的雕刻雕像，并且把它们经桥运送到那个广场上。",
    },
    HeadTargetPosition: [{
        x: 95,
        y: 50
    }], //头的位置数据
    getShadow: _ => `left:115px;top:144px;`,
    PicArr: (path => ['ZombieWalk.webp', 'ZombieAttack.webp', 'ZombieLostHeadWalk.webp', "ZombieLostHeadAttack.webp", "ZombieHead.webp", "ZombieDie.webp", "ZombieStand.webp", 'ZombiePush.webp', 'ZombieLostHeadPush.webp'].map(s => path + s))("images/Zombies/SculptorZombie/").concat('images/Zombies/BoomDie.webp'),
    AudioArr: ['sculptorZombie1', 'sculptorZombie2', 'sculptorZombiePush'],
    getCharredCSS: self => ({
        top: 58 + self.DivingDepth / 1.8,
        left: 115,
        clip: self.DivingDepth > 0 ? "rect(0px, auto, 95px, 0px)" : "",
    }),
    getHTML(id, wrapLeft, wrapTop, zIndex, display, clip, top, img) {
        const self = this,
            T = self.ArHTML;
        self?.zIndex && (self.zIndex += 1, zIndex++);
        return T[0] + id + T[1] + self.EName + T[2] + display + T[3] + wrapLeft + T[4] + wrapTop + T[5] + zIndex + T[6] + clip + T[7] + top + T[8] + img + T[9];
    },
    BirthCallBack(self) {
        oAudioManager.playAudio(`sculptorZombie${1+Math.round(Math.random())}`);
        // 僵尸出场时自动携带的雕像数目
        self.SummonBlockCount = Math.floor(Math.random() * 3);
        OrnNoneZombies.prototype.BirthCallBack(self);
    },
    JudgeAttack(stepRatio=1) {
        let self = this;
        let ZX = self.ZX;
        let crood = self.R + "_";
        let C = GetC(ZX);
        let G = oGd.$;
        let arr = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
        if (arr && self.Altitude === 1) {
            !self.isAttacking && (self.isAttacking = 1, self.EleBody.src = self.PicArr[self.AttackGif]);
            self.NormalAttack(...arr);
        } else {
            self.isAttacking && (self.isAttacking = 0, self.EleBody.src = self.PicArr[self.NormalGif]);
        }
        self.JudgePush(self, self.R, C);
    },
    JudgePush(self, R, C, G = oGd.$Sculpture) { //判定推雕塑
        if (!self.isAttacking) {
            if (self.SummonBlockCount > 0 && !G[R + '_' + 11] && C >= 11) {
                PlaceZombie(oSculpture, R, 11, 0);
                self.SummonBlockCount--;
            }
            let sp = G[R + '_' + C] || G[R + '_' + C - 1];
            if (sp && !sp.isMoving && self.CanPush(sp)) {
                self.isAttacking = 2; //推的时候不能动
                self.EleBody.src = self.PicArr[self.PushGif]; //替换图片
                let tempX = self.ZX;
                oSym.addTask(190, _ => {
                    //这里设置延时推，所以要再判断一次
                    if ($Z[self.id] && self.isNotStaticed() && !self.isGoingDie && !self.isFloating && Math.abs(self.ZX - tempX) <= 1) { //僵尸未死亡、未垂死、未被弹起、未脱离原先位置
                        if ((sp = G[R + '_' + C] || G[R + '_' + C - 1]) && !sp.isMoving && self.CanPush(sp)) {
                            oAudioManager.playAudio('sculptorZombiePush');
                            sp.Move();
                        }
                    }
                });
                oSym.addTask(403, _ => { //无论推雕塑是否成功，动画播放完成后僵尸恢复正常状态
                    if ($Z[self.id] && !self.isGoingDie) { //防止僵尸在推雕像的过程中被植物打死
                        self.isAttacking = 0; //结束推雕像状态
                        self.EleBody.src = self.PicArr[self.NormalGif];
                    }
                });
            }
        }
    },
    getButter(time) {
        if (this.isAttacking === 2) {
            return;
        }
        CZombies.prototype.getButter.call(this, time);
    },
    CanPush(sp) {
        return sp.AllCheck(sp.R, Math.min(sp.C - 1, 9)) !== false && sp.C > 1 && sp.Altitude === 1;
    },
    GoingDie() {
        let self = this,
            id = self.id;
        self.EleBody.src = self.PicArr[[self.LostHeadGif, self.LostHeadAttackGif, self.LostHeadPushGif][self.isAttacking]];
        self.GoingDieHead(id, self.PicArr, self);
        self.beAttacked = 0;
        self.isGoingDie = 1;
        self.freeStaticEffect(self, "All");
        self.FreeSlowTime = 0;
        self.AutoReduceHP(id);
        self.ChanceThrowCoin(self);
    },
    GoingDieHead(id, PicArr, self){
        CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
            left: self.X + 103,
            top: self.pixelTop + 25,
            bc: self.pixelTop + 118,
        });
    },
    NormalDie() {
        let self = this,
            ele = self.Ele;
        self.PrivateDie && self.PrivateDie(self);
        self.EleBody.src = self.PicArr[self.DieGif];
        oSym.addTask(250, oEffects.fadeOut, [ele, 'fast', ClearChild]);
        self.HP = 0;
        delete $Z[self.id];
        oP.MonitorZombiePosition(self);
        self.PZ && oP.MonPrgs(self);
    },
    useSinkIntoWaterEffect(self, top) {
        let bottom = self.height - top;
        SetStyle(self.EleBody, {
            top: `${top}px`,
            clip: `rect(0,auto,${bottom-15}px,0)`,
            '-webkit-mask-image': !$User.LowPerformanceMode ? `linear-gradient(black 0px ${bottom-25}px, transparent ${bottom-15}px)` : '',
        });
    },
}),
oBeetleCarZombie = (() => {
    const _getHit = oZomboni.prototype.getHit;
    const _Die = function(isFlatTire) {
        oAudioManager.playAudio('beetleCarDie');
        let self = this;
        self.HP = 0;
        self.Speed = 0;
        self.EleBody.src = self.PicArr[self.DieGif];
        self.PrivateDie && self.PrivateDie(self);
        oEffects.fadeOut(self.Ele, 2, ClearChild, 1);
        delete $Z[self.id];
        oP.MonitorZombiePosition(self);
        self.PZ && oP.MonPrgs(self);
    };
    const _getPea = (self, attack) => {
        oAudioManager.playAudio(["shieldhit", "shieldhit2"][Math.floor(Math.random() * 2)]);
        self.getHit0(self, attack);
    };
    return InheritO(OrnNoneZombies, {
        EName: "oBeetleCarZombie",
        CName: "甲壳虫车僵尸",
        HP: 1000,
        width: 260,
        height: 202,
        beAttackedPointL: 60,
        beAttackedPointR: 234,
        OSpeed: 1.8,
        Speed: 1.8,
        Lvl: 4,
        AKind: 2,
        StandGif: 0,
        NormalGif: 1,
        ReleaseGif: 2,
        FlatTireGif: 3,
        DieGif: 4,
        isReleasing: 0,
        changingX: 0,
        getCharredCSS: _ => ({}),
        getShieldCSS: _ => 'left:65px;top:75px;',
        CanGoThroughWater:false,
        CanAppearFromTomb: false,
        getButter(){},
        Bounce() {},
        CardStars: 4,
        getShadow: self => `position: absolute;width: 231px;height: 44px;left: 15px;background:url(images/Zombies/BeetleCarZombie/Shadow.png);top: 166px;background-size: 100% 120%;`,
        PicArr: (path => [path + "Idle.webp", path + 'Walk.webp', path + 'Release.webp', path + 'FlatTire.webp', path + 'Die.webp', path + 'Exhaust.png', path + 'Shadow.png'])("images/Zombies/BeetleCarZombie/"),
        AudioArr: ["zamboni", "shieldhit", "shieldhit2", "beetle", 'beetleCarDie'],
        Almanac:{
            Tip:"甲壳虫车僵尸一段时间会往后发出毒气，会让后面的所有僵尸亢奋。",
            Speed:"慢",
            Weakness:"地刺",
            get Story(){
                let json = localStorage["JNG_TR_WON"]?JSON.parse(localStorage["JNG_TR_WON"]):{};
                let man = json["Industry25"]?"Job":"戴夫（身份存疑）";
                let a = "甲壳虫车僵尸原本有一辆说不上精致，但也十分可靠的48年产甲壳虫车。直到有一天，";
                let aa = `也许是程序出于${man}对他家那辆被撞下湖的甲壳虫的忌讳，将`;
                let b = "原本的甲壳虫车突然变成了“甲壳虫”车。“原来的那辆英军产的甲壳虫挺好的，你为什么把它变了？现在好了，原先的甲壳虫虽然紧凑但好歹低低头能开，现在这个是要搞怎样，躺下来开吗？！”但即使他这么说了，";
                let c = "在财富上躺平，也比肉身上场拼命强了不知道多少。";
                if(json["Industry6"]||json["Industry25"]){
                    return a+aa+b+c;
                }else{
                    return a+"不知怎么地，"+b+"躺平开车，也比走上战场强了不知道多少。";
                }
            },
        },
        BirthCallBack(self) {
            oAudioManager.playAudio('zamboni');
            let delayT = self.delayT;
            let id = self.id;
            let ele = self.Ele = $(id);
            self.EleShadow = ele.firstChild;
            self.EleBody = ele.childNodes[1];
            if (delayT) {
                oSym.addTask(delayT, () => {
                    self.freeStaticEffect(self, "SetBody");
                    $Z[id] && SetBlock(ele);
                });
            } else {
                SetBlock(ele);
            }
        },
        GoLeft(o, R, arR, i,stepRatio = 1) {
            if(oGd.$GdType[R][GetC(o.AttackedLX+40)]==2){
                o.NormalDie();
                return 1;
            }
            let Speed = o.getRealSpeed(o,stepRatio);
            let hookKey = 1;
            if((o.isNotStaticed())) {
                if(!o.isReleasing) {
                    !o.isGoingDie && o.JudgeAttack(stepRatio);
                    o.MoveZombieX(o,Speed);
                    if((o.AttackedRX) < -50) {
                        oZ.del(arR, i);
                        o.DisappearDie();
                        hookKey=0;
                    } else {
                        o.Paint(o)
                        o.Release(o, o.Speed);
                    }
                }
            }
            //检查场地事件
            o.ChkCell_GdType(o);
            return hookKey;
        },
        Release(self, speed) {
            const id = self.id;
            const X = self.X
            self.changingX += speed;
            if(GetC(X) >= 9) {
                return self.changingX = 0;
            }
            if(self.changingX >= 150) {
                self.changingX = 0;
                self.isReleasing = 1;
                oAudioManager.playAudio('beetle');
                self.EleBody.src = self.PicArr[self.ReleaseGif];
                oSym.addTask(100, () => {
                    if(!$Z[id]) return;
                    oEffects.ImgSpriter({
                        ele: NewEle(self.id+'_Exhaust', "div", `pointer-events:none;position:absolute;z-index:${self.zIndex+2};width:255px;height:216px;left:${self.X+230}px;top:${self.pixelTop+23}px;background:url(images/Zombies/BeetleCarZombie/Exhaust.png) no-repeat;`, 0, EDPZ),
                        changeValue: -255,
                        frameNum: 58,
                    });
                    let zombieArr = oZ.getArZ(self.AttackedRX + 5, 880, self.R);
                    //傀儡不加速
                    zombieArr.forEach(zombie => !zombie.isPuppet && zombie.getExcited(1.2));
                });
                oSym.addTask(204, () => {
                    if ($Z[id]) {
                        self.isReleasing = 0;
                        self.EleBody.src = self.PicArr[self.NormalGif];
                    }
                });
            }
        },
        flatTire() { //被地刺扎到
            let self = this;
            self.EleBody.src = self.PicArr[self.FlatTireGif];
            self.beAttacked = self.HP = self.Speed = 0;
            self.getHit0 = self.getHit1 = self.getHit2 = self.ChkActs = self.ChkActs1 = ()=>{};
            oSym.addTask(47, () => $Z[self.id] && self.NormalDie(true));            
        },
        getPea: _getPea,
        getFirePea: _getPea,
        getSnowPea: _getPea,
        getFreeze() {
            this.getHit0(this, 20);
        },
        getHit: _getHit,
        getHit0: _getHit,
        getHit1: _getHit,
        getHit2: _getHit,
        GoingDie: oZomboni.prototype.GoingDie,
        NormalDie: _Die,
        CrushDie: _Die,
        getThump: _Die,
        ExplosionDie: _Die,
        getSlow(){},
        getExcited(intensity,duration_=undefined) {
            let self = this;
            let ele = self.Ele;
            let duration = duration_??1200;
            let oldTimeStamp = self.FreeExcitedTime;
            let newTimeStamp = oSym.Now + duration;
            self.Speed *= intensity;
            self.Attack *= intensity;
            if(!oldTimeStamp){
                NewImg(`buff_excited_${Math.random()}`, "images/Zombies/buff_excited.gif", "left:75px;transform:scale(1.25);top:170px;height:38px;z-index:5;", ele, {className: 'buff_excited'});
                !$User.LowPerformanceMode && EditCompositeStyle({
                    ele: self.EleBody,
                    styleName: 'filter',
                    addFuncs: [['url', oSVG.getSVG('getExcited')]],
                    option: 2,
                });
            }
            if(oldTimeStamp < newTimeStamp) {  
                self.FreeExcitedTime = newTimeStamp;
                oSym.addTask(duration, () => {
                    if($Z[self.id] && self.FreeExcitedTime === newTimeStamp){
                        ClearChild(ele.querySelector('.buff_excited'));
                        self.FreeExcitedTime = 0;
                        self.Attack = self.OAttack;
                        self.Speed && (self.Speed = self.OSpeed);
                        !$User.LowPerformanceMode && EditCompositeStyle({
                            ele: self.EleBody,
                            styleName: 'filter',
                            delFuncs: [['url',oSVG.getSVG('getExcited')]],
                            option: 2
                        });
                    }
                });
            }  
        },
        JudgeAttack: oZomboni.prototype.JudgeAttack,
        JudgeLR(self, crood, C, ZX, G) { //远程判定，普通僵尸的远程是自己前面一格
            if (C > 10 || C < 1) return;
            crood += C - 1 + '_';
            let z = PKindUpperLimit;
            while (z >= 0) {
                let plant = G[crood + z];
                if (plant && plant.AttackedRX >= ZX && plant.AttackedLX <= ZX) {
                    if(plant.isPlant) return [self.id, plant.id];
                }
                z--;
            }
        },
        JudgeSR(self, crood, C, ZX, G) { //近程判定，普通僵尸的近程是自己所在一格
            if (C > 9) return;
            crood += C + "_";
            let z = PKindUpperLimit;
            while (z >= 0) {
                let plant = G[crood + z];
                if (plant && plant.AttackedRX >= ZX && plant.AttackedLX <= ZX) {
                    if(plant.isPlant) return [self.id, plant.id];
                }
                z--;
            }
        },
        NormalAttack: oZomboni.prototype.NormalAttack,
    });
})(),
oThiefZombie = InheritO(OrnNoneZombies, {
    EName: "oThiefZombie",
    CName: "盗贼僵尸",
    HP: 700,
    oHP: 700,
    width: 160,
    height: 570,
    beAttackedPointL: 50,
    beAttackedPointR: 89,
    Lvl: 5,
    CanAppearFromTomb: false,
    CardStars: 4,
    Almanac: {
        Tip: "盗贼僵尸从天而降偷走你的植物并逃跑。",
        Speed: "快",
        Weakness: "拟南芥散射手",
        Story: "盗贼僵尸曾经只是一个过着不错的中产生活的日子人，直到他投资的摩瓦多尔的红酒生意的崩溃让他彻底破产。他最初企图寻求政府的救济来勉强维持生活，但在多次被官员以“你失败只是因为你不够努力”拒绝，并因为四处打工奔波却仍无法维持家庭搞的妻离子散后，他彻底失去了以一种体面或正当的方式继续生活的希望。如今的他只是一个热爱冒险，常常从空而降洗劫一切然后全部用来换酒的疯子，毕竟，如果你不再能活着，再次向死又有何妨？",
    },
    StealPlantRequirement: function(p) {
        return p.Tools != true && p.canEat == true;
    },
    ForcePKind: -1,
    FullPackage: 0,
    Speed: 3.2,
    Altitude: 3,
    beAttacked: 0,
    isAttacking: 3,
    isFloating: true,
    FangXiang: 'GoRight',
    WalkDirection: 1,
    IZombieMode:false,
    AudioArr: ["ThiefZombie"],
    HeadTargetPosition: [{
        x: 24,
        y: 461
    }, {
        x: 21,
        y: 458
    }], //头的位置数据
    StandGif: 1,
    Drop1Gif: 2,
    Drop2Gif: 3,
    NormalGif: 4,  // 僵尸跑路（未偷时）
    Normal2Gif: 5,  // 僵尸跑路（偷成功）
    StealGif: 6,
    AttackGif: 7,
    DieGif: 8,
    HeadGif: 9,
    LostHeadGif: 10,
    LostHead2Gif: 11,
    LostHeadAttackGif: 12,
    LostHeadAttack2Gif: 13,
    BoomDieGif: 14,
    PicArr: (path => ["", path + "idle.webp", path + 'drop1.webp', path + "drop2.webp", path + 'walk_nosack.webp', path + 'walk.webp', path + 'capture.webp', path + 'eat.webp', path + 'die.webp', path + 'head.webp', path + 'walk_nosack_nohead.webp', path + 'walk_nohead.webp', path + 'capture_nohead.webp', path + 'eat_nohead.webp'
    ])(
        "images/Zombies/ThiefZombie/").concat('images/Zombies/BoomDie.webp'),
    getDisplayShadow: self => `left: 27px;top: 548px;`,
    getCharredCSS: self => ({
        left: self.beAttackedPointL,
        top: self.height - 106,
        transform: 'rotateY(180deg)',
    }),
    //普通诞生事件,由程序自动调用,在每波刷新 
    //初始化僵尸样式，编译僵尸html代码
    prepareBirth(delayT, r, c) {
        let self = this;
        self.ArHTML = [
            `<div id="`, //0
            `" data-jng-constructor="`, //1
            `" style="position:absolute;pointer-events:none;display:`, //2
            `;left:`, //3
            `px;top:`, //4
            `px;z-index:`, //5
            `"><div class='Shadow' style="${self.getShadow(self)}"></div><img style="transform:rotateY(180deg);clip:rect(0,auto,`, //6
            `,0);top:`, //7
            `px" src="`, //8
            `"></div>` //9
        ];
        let id = self.id = "Z_" + Math.random();
        let [R, C] = [r, c];
        if (!r || !c) {
            let plant = hasPlants(true, self.StealPlantRequirement);
            if (plant.length > 0 && Math.random() > 0.05) {
                let random = plant.random();
                [R, C] = [random.R, random.C];
            } else {
                R = oP.randomGetLine(self.ArR,self.Lvl);
                C = Math.floor(Math.random() * 9 + 1);
            }
        }
        self.HP = Infinity;
        self.R = R;
        self.originalC = C;
        let top = self.pixelTop = GetY(R) + self.GetDY() - self.height; //计算僵尸顶部坐标
        let zIndex = self.zIndex = 3 * R + 1;
        self.zIndex_cont = Math.round(self.pixelTop + self.height);
        // 计算僵尸水平坐标
        let AttackedLX = self.AttackedLX = (GetX(C) - 20) - (self.beAttackedPointR - self.beAttackedPointL) * 0.5;
        self.AttackedLX = AttackedLX;  // 左攻击点
        self.X = AttackedLX - self.beAttackedPointL;  // 贴图坐标
        self.AttackedRX = self.X + self.beAttackedPointR; // 右攻击点
        // 因为盗贼僵尸是向右跑的，所以ZX应当以AttackedRX为准
        self.ZX = self.AttackedRX;
        if (self.delayT = delayT) {
            self.getStatic({
                time: Infinity,
                type: "SetBody",
                useStaticCanvas: false,
                forced: true,
                usePolling: false,
            });
        }
        return self.getHTML(id, self.X, top, self.zIndex_cont, "none", "auto", self.GetDTop, self.PicArr[self.NormalGif]);
    },
    Birth(json = {}, isCustomizedBirth = false) { //唤醒僵尸，注册$Z和oZ
        let self = this;
        if (!json.dont_set_original_value) { //不设置原始数据，例如OAttack,OSpeed之类，否则默认备份OAttack,OSpeed
            self.OAttack = self.Attack;
            self.OSpeed = self.Speed;
        }
        self.PicArr = self.PicArr.slice(); //复制一份数组，避免中途更改PicArr
        self.DiyConfigs = {};
        $Z[self.id] = self;
        oZ.add(self);
        self.HeadTargetPosition = JSON.parse(JSON.stringify(self.HeadTargetPosition)); //深拷贝头部坐标，避免改的时候直接改成prototype的
        //在callback里添加僵尸避免僵尸被提前识别死亡
        let id = self.id;
        let ele = self.Ele = $(id);
        self.EleShadow = ele.firstChild;
        self.EleBody = ele.childNodes[1];
        self.PicArr = self.PicArr.map(pic => oDynamicPic.checkOriginalURL(pic) ? oDynamicPic.require(pic, null, true) : oURL.removeParam(pic, "useDynamicPic"));
        IsHttpEnvi && ele.addEventListener("DOMNodeRemoved", (event) => {
            if (event.target === ele) {
                setTimeout(self.RemoveDynamicPic.bind(self), 1);
            }
        });
        self.BirthCallBack(self, isCustomizedBirth);
    },
    CustomBirth(R, C, delayT, clipH) {
        return this.prepareBirth(delayT, R, C);
    },
    BirthCallBack(self, isCustomizedBirth) {
        let delayT = self.delayT;
        let id = self.id;
        let ele = self.Ele = $(id);
        self.EleShadow = ele.firstChild;
        self.EleBody = ele.childNodes[1];
        if (delayT) {
            oSym.addTask(delayT, () => {
                self.freeStaticEffect(self, "SetBody");
                $Z[id] && oSym.Timer && self.privateBirthCallBack(self, ele, isCustomizedBirth);
            });
        } else {
            self.privateBirthCallBack(self, ele, isCustomizedBirth);
        }
    },
    privateBirthCallBack(self, ele, isCustomizedBirth) {
        let [R, C] = [self.R, self.originalC];
        let isInWater = oGd.$GdType[R][C] === 2;
        let eleBody = self.EleBody;
        let targetTop = oGd.$WaterDepth[R][C] + self.extraDivingDepth;
        oAudioManager.playAudio("ThiefZombie");
        self.EleBody.src = self.PicArr[self.Drop1Gif];
        SetBlock(ele);
        // 不加这句切换动图时会出现神秘闪烁：Drop2Gif突然重新播放，再立即切到NormalGif
        new Image().src = self.PicArr[self.NormalGif];
        // 检测叶子保护伞
        self.checkUmbrella(self.originalC, 19.9);
        oSym.addTask(20, function() {
            if (self.HP <= 0) return;
            self.isFloating = 0;
            self.EleBody.src = self.PicArr[self.Drop2Gif];
            oSym.addTask(116, function() {
                if (self.HP <= 0) return;
                self.isAttacking = 0;
                self.beAttacked = 1;
                self.Altitude = 1;
                self.HP = self.oHP;
                self.EleBody.src = self.PicArr[self.NormalGif];
                self.CrushDie = CZombies.prototype.CrushDie;
            });
            if (isInWater && !isCustomizedBirth) {
                oEffects.Animate(eleBody, {
                    top: targetTop + 'px',
                    clip: `rect(0px, auto, ${self.height - targetTop}px, 0px)`,
                }, 1, 'linear');
                self.setWaterStyle_middleWare();
                self.useSinkIntoWaterEffect(self, targetTop);
                self.SetWater(targetTop, R, C, null, false, false);
            }
        });
    },
    checkUmbrella(targetC, delayT) {
        const self = this;
        const umbr = oUmbrellaLeaf.checkUmbrella(self.R, targetC);
        if (umbr) {
            umbr.PlayAttackAnim();
            oSym.addTask(delayT, () => {
                if ($P[umbr.id] && $Z[self.id]) {
                    self.DieByUmbrella(self, targetC);
                }
            });
        }
    },
    DieByUmbrella(self) {
        delete $Z[self.id];
        oEffects.Animate(self.EleBody, {
            top: - self.height - self.pixelTop + 'px',
        }, 0.4, "ease-in", self.DisappearDie.bind(self));
    },
    JudgeAttack(stepRatio=1) {
        let self = this;
        let ZX = self.ZX;
        let crood = self.R + "_";
        let C = GetC(ZX);
        let G = oGd.$;
        let arr = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
        if (arr && self.Altitude === 1 && self.HP > 350) { //地上的僵尸才能检测攻击
            !self.isAttacking && (self.isAttacking = 1, self.EleBody.src = self.PicArr[self.AttackGif]); //如果是首次触发攻击，需要更新到攻击状态
            self.NormalAttack(...arr); //实施攻击
        } else {
            //撤销攻击状态
            self.isAttacking && (self.isAttacking = 0, self.EleBody.src = self.PicArr[self.NormalGif]);
        }
    },
    JudgeLR(self, crood, C, ZX, G) { //远程判定，盗贼僵尸偷能铲掉的植物且不为道具
        if (C > 10 || C < 1) return;
        crood += C - 1 + '_';
        let z = PKindUpperLimit;
        while (z >= 0) {
            let plant = G[crood + z];
            if (plant && plant.isPlant && !plant.Tools) {
                return (One_Dimensional_Intersection(self.X + self.beAttackedPointL, self.X + self.beAttackedPointR,
                        plant.AttackedLX, plant.AttackedRX) || plant.AttackedRX >= ZX && plant.AttackedLX <=
                    ZX) ? [self.id, plant.id] : false;
            }
            z--;
        }
    },
    JudgeSR(self, crood, C, ZX, G) { //近程判定
        if (C > 9) return;
        crood += C + "_";
        let z = PKindUpperLimit;
        while (z >= 0) {
            let plant = G[crood + z];
            if (plant && plant.isPlant && !plant.Tools) {
                return (One_Dimensional_Intersection(self.X + self.beAttackedPointL, self.X + self.beAttackedPointR,
                        plant.AttackedLX, plant.AttackedRX) || plant.AttackedRX >= ZX && plant.AttackedLX <=
                    ZX) ? [self.id, plant.id] : false;
            }
            z--;
        }
    },
    //离线判定
    JudgeLong(self, R_crood, C, ZX, G,stepRatio=1){
        let direction = -self.DeltaDirectionSpeed[self.FangXiang];
        let Velocity = self.getRealSpeed(self,stepRatio) * direction;
        let oriC = GetC(ZX - Velocity);
        let curC = oriC;
        let tarC = C;
        let step = Math.sign(tarC-oriC);
        let __flag;
        if(tarC>oS.C){
            return;
        }
        do{
            if(curC>oS.C){//这个相当于近程判定
                curC+=step;
                continue;
            }
            let crood = R_crood + curC + "_";
            let z = PKindUpperLimit;
            while (z >= 0) {
                let plant = G[crood + z];
                if (plant && plant.isPlant && !plant.Tools) {
                    if(direction>0){//向右走
                        __flag = One_Dimensional_Intersection(self.X + self.beAttackedPointL - Velocity, self.X + self.beAttackedPointR,
                            plant.AttackedLX, plant.AttackedRX);
                    }else{
                        __flag = One_Dimensional_Intersection(self.X + self.beAttackedPointL, self.X + self.beAttackedPointR - Velocity,
                            plant.AttackedLX, plant.AttackedRX);
                    }
                    if(__flag){
                        if(direction>0){
                            self.MoveZombieX(self,plant.AttackedLX+0.1 - self.AttackedRX,false);
                        }else{
                            self.MoveZombieX(self,-(plant.AttackedRX-0.1 - self.ZX));//向左走是反着的，要加个负号
                        }
                        return [self.id, plant.id];
                    }
                }
                z--;
            }
            if(tarC===curC){
                return false;
            }
            curC+=step;
        }while(true);
    },
    NormalAttack(zid, pid) {
        let self = $Z[zid];
        if (self && !self.isGoingDie && self.isNotStaticed()) {
            self.StealPlant($P[pid].R, $P[pid].C);
        }
    },
    StealPlant(r = 0, c = 0) {
        let self = this;
        self.EleBody.src = self.PicArr[self.StealGif];
        let [R, C] = [r ? r : self.R, c ? c : GetC(self.ZX)];
        const data = oGd.$;
        let val = -Infinity;
        let selectPKind = self.ForcePKind;
        let selectIndex = `${R}_${C}_${self.ForcePKind}`;
        if (self.ForcePKind === -1) {
            for (let i = 0; i <= PKindUpperLimit; i++) {
                let index = `${R}_${C}_${i}`;
                if (!data[index] || data[index].Tools) {
                    continue;
                }
                let obj = data[index];
                let plantValue = (obj.Attack ? obj.Attack * 180 : 180) * obj.HP * obj.SunNum * (obj.C / 5 + 1) * (obj.CanSpawnSun ? 15 : 1);
                // 如果盗贼僵尸当前锁定的是花盆类植物，且上面有其他植物
                // 则一定不偷花盆，换作偷其他植物
                if (plantValue > val || selectPKind === 0) {
                    val = plantValue;
                    selectIndex = index;
                    selectPKind = i;
                }
            }
        }
        let plant;
        if (selectIndex && (plant = data[selectIndex])) {
            oSym.addTask(70, () => {
                if ($Z[self.id] && $P[plant.id]?.Immediately === false) {
                    self.StolenPlant = plant["__proto__"].constructor;
                    self.deltaHP = plant["__proto__"].constructor.prototype.HP - plant.HP;
                    plant.Die("JNG_TICKET_ThiefZombie");
                    self.FullPackage = 1;
                    self.NormalGif = self.Normal2Gif;
                    self.LostHeadAttackGif = self.LostHeadAttack2Gif;
                    //重置攻击
                    self.NormalAttack = oZombie.prototype.NormalAttack;
                    self.JudgeLR = oZombie.prototype.JudgeLR;
                    self.JudgeSR = oZombie.prototype.JudgeSR;
                }
            });
        }
        oSym.addTask(220, function() {
            if ($Z[self.id]) {
                self.isAttacking = 0;
                self.EleBody.src = self.PicArr[self.NormalGif];
            }
        });
    },
    StolenPlant: null,
    deltaHP: null,
    throwPlant(plant, pos, hurt) {
        if (!plant) {
            return;
        }
        let self = this;
        if(self.IZombieMode){
            let data = [],R=self.R,C = GetC(pos[0]);
            for(let f = 0, _$ = oGd.$; f <= PKindUpperLimit; f++) {
                data.push(_$[R + "_" + C + "_" + f]);
            }
            if(plant.prototype.CanGrow(data, R, C)){
                let p = CustomSpecial(plant,R,C);
                let bc = p.SetBrightness;
                p.SetBrightness = function() {};
                p.getHurt(null, 0, hurt); //造成伤害
                p.SetBrightness = bc;
            }
        }else{
            ThrowACard(plant, pos, function(p) {
                let bc = p.SetBrightness;
                p.SetBrightness = function() {};
                p.getHurt(null, 0, hurt); //造成伤害
                p.SetBrightness = bc;
            });
        }
    },
    CrushDie: CZombies.prototype.DisappearDie,
    ExplosionDie(...arr) {
        let self = this;
        self.throwPlant(self.StolenPlant, [self.ZX, self.pixelTop + self.height - 30], self.deltaHP);
        return OrnNoneZombies.prototype.ExplosionDie.bind(self)();
    },
    GoingDie(img) {
        const self = this;
        self.throwPlant(self.StolenPlant, [self.ZX, self.pixelTop + self.height - 30], self.deltaHP);
        return OrnNoneZombies.prototype.GoingDie.bind(self)(img);
    },
    GoingDieHead(id, PicArr, self) {
        CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
            top: self.pixelTop + self.height - 112,
            vx: -Math.random() * 1 - 1,
            bc: GetY(self.R) - 60,
            rotateSpeed: Math.random() * 1.5 + 1.5
        });
    },
}),
oGargantuar = function() {
    let HPx = 3600;
    let getHit = function(self, attack) {
        if(self.ShieldHP > 0) {
            self.getShieldHit(self);
        }
        else {
            if ((self.HP -= attack) < self.BreakPoint) {
                self.GoingDie(self.PicArr[[self.LostHeadGif, self.LostHeadAttackGif][self.isAttacking]]);
                self.getHit0 = self.getHit1 = self.getHit2 = function() {};
                return;
            }
            if (self.HP <= HPx / 2 && !self.isAttacking && !self.throwedImp && self.hasChanceToThrow && self.isNotStaticed()) {
                self.throwImp();
            }
            self.SetBrightness(self, self.EleBody, 1);
            oSym.addTask(10, _ => $Z[self.id] && self.SetBrightness(self, self.EleBody, 0));
        }
    };
    return InheritO(oZombie, {
        EName: "oGargantuar",
        CName: "巨人僵尸",
        OSpeed: 1.6,
        Speed: 1.6,
        Lvl: 13,
        AKind: 1,
        HPx,
        HP: HPx,
        height: 398,
        width: 485,
        DieGif: 5,
        StandGif: 7,
        beAttackedPointL: 200,
        beAttackedPointR: 310,
        ThrowGif: 4,
        EffectGif:12,
        GetDTop: 0,
        CardStars: 4,
        getShadow: _ => "left:220px;top:350px;transform:scale(2.1);",
        getFreezeCSS: _ => 'left:220px;top:370px;',
        getShieldCSS: _ => 'left:220px;top:250px;',
        CanAppearFromTomb: false,
        SubsidiaryZombies: [oImp2],
        Almanac: {
            Tip: "巨人僵尸用电线杆敲击植物，耐久低于生命总值的1/2时投掷小鬼。",
            Speed: "慢",
            Weakness: "爆炸类植物",
            Story: "那个如同推土机一样巨大威猛的，被男性僵尸们奉为偶像的巨人僵尸，虽然看似力量无穷，无植可挡，但其实一直有两样东西束缚着他KEEP ATTACKING。一个是他身上XXXXXL号的被撑爆的t恤，另一个则是他家里人对他成家的期许。前者也许他没有办法，但后者，他之前已经联系上了一个很好的姑娘，并且已经通过手里的电话杆把这件事告诉了他的家长，而现在，他所需要做的只是静静等待那个姑娘的回电。",
        },
        getAlmanacDom(pro) {
            if (!pro.Almanac.Dom) {
                let ClassAlmanac = CZombies.prototype.Almanac;
                for (let i in ClassAlmanac) {
                    if (!pro.Almanac[i]) {
                        pro.Almanac[i] = ClassAlmanac[i];
                    }
                }
                pro.Almanac.Dom = pro.getHTML("", 170 - pro.width / 2, 470 - pro.height, "1;height:" + pro.height + "px;width:" + pro.width + "px", "block", "auto", pro.GetDTop, pro.PicArr[pro.StandGif]);
            }
        },
        AudioArr: (_ => {
            return ["Gargantuar_walk", "lowgroan", "lowgroan2", "gargantuar_thump"].concat(oImp.prototype.AudioArr);
        })(),
        PicArr: (path => {
            return ["", "", path + "walk.webp", path + 'crush.webp', path + "throw.webp", path + 'die.webp', path + 'Head.webp', path + 'idle.webp'].concat([path + "walk0.webp", path + 'crush0.webp', "", path + 'die0.webp', 'images/Plants/SporeShroom/Effect.webp']).concat(oImp.prototype.PicArr);
        })("images/Zombies/Gargantuar/"),
        HeadTargetPosition: [{
            x: 174,
            y: 225
        }],
        inNarrowWaterPath: false,
        CanGoThroughWater: false,
        ChkCell_GdType(self) {
            let R = self.R;
            let C = GetC(self.ZX - (self.beAttackedPointR - self.beAttackedPointL) / 2 * (self.WalkDirection * 2 - 1));
            let gdType = oGd.$GdType[R][C];
            let nextGdType = oGd.$GdType[R][C + (this.WalkDirection ? 1 : -1)];
            let lastGdType = oGd.$GdType[R][C + (this.WalkDirection ? -1 : 1)];
            if (self.LivingArea == 2 && (gdType === 1 || gdType === 3) && self.Altitude !== 3) {
                self.SetWater(0, R, C);
                this.inNarrowWaterPath = false;
            } else if (gdType === 2 && self.Altitude != 3) {
                if (nextGdType !== 2 && lastGdType !== 2) {
                    let shadow = self.EleShadow;
                    this.inNarrowWaterPath = true;
                    if (!self.WaterShadowGif) {
                        self.WaterShadowGif = oDynamicPic.require(WaterShadowImg,self.Ele);
                    }
                    if (!shadow.dataset.hasOwnProperty("tmp_cssText")) {
                        shadow.dataset.tmp_cssText = shadow.style.cssText;
                    }
                    shadow.style.cssText = (shadow.dataset.tmp_cssText ?? "") +
                        `background:url(${self.WaterShadowGif});`;
                    EditCompositeStyle({
                        ele: shadow,
                        addFuncs: [
                            ["translate", "-5px, 17px"],
                            ["scale", "0.48"],
                        ],
                        option: 2
                    });
                    SetStyle(shadow, {
                        height: "10.625px",
                        width: "84.375px",
                        'background-size': "100% 100%",
                        'z-index': 300
                    });
                } else if (!this.inNarrowWaterPath && self.DivingDepth != oGd.$WaterDepth[R][C]) {
                    self.SetWater(oGd.$WaterDepth[R][C], R, C);
                }
            }
            self.LivingArea = gdType;
        },
        setWaterStyle(self, ele) {
            EditCompositeStyle({
                ele,
                addFuncs: [
                    ["translate", "-30px, 15px"],
                    ["scale", "0.5"],
                ],
                option: 2
            });
            SetStyle(ele, {
                height: "25px",
                width: "199px",
                'background-size': "100% 100%",
                'z-index': 300
            });
        },
        throwedImp: false,
        hasChanceToThrow: 1, //不管如何巨人只能又一次throwImp函数的调用机会，如果没了就不可能再扔小鬼
        getHit,
        getHit0: getHit,
        getHit1: getHit,
        getHit2: getHit,
        GoingDie() {
            let self = this,
                id = self.id;
            self.GoingDieHead(id, self.PicArr, self);
            self.beAttacked = 0;
            self.isGoingDie = 1;
            self.freeStaticEffect(self, "All");
            self.FreeSlowTime = 0;
            self.NormalDie();
            self.ChanceThrowCoin(self);
        },
        NormalDie: function() {
            let self = this,
                ele = self.Ele;
            self.PrivateDie && self.PrivateDie(self);
            self.changePic(self, self.DieGif);
            oSym.addTask(250, oEffects.fadeOut, [ele, 'fast', ClearChild]);
            oSym.addTask(130, oAudioManager.playAudio, ["gargantuar_thump"]);
            self.HP = 0;
            delete $Z[self.id];
            oP.MonitorZombiePosition(self);
            self.PZ && oP.MonPrgs(self);
        },
        GoingDieHead(id, PicArr, self) {
            CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
                top: self.pixelTop + 180.5,
                left: self.X + 194.5,
                bc: self.pixelTop + 320.5,
            });
        },
        ExplosionDie() {
            this.GoingDie();
        },
        getVertigo(self, attackPower, dir,style,keepTime=1000) {
            OrnNoneZombies.prototype.getVertigo(self, attackPower, dir, `left:${self.beAttackedPointL-20}px;top:${self.height-218}px;`);
        },
        BirthCallBack(self) {
            let delayT = self.delayT;
            let id = self.id;
            let ele = self.Ele = $(id);
            self.EleShadow = ele.firstChild;
            self.EleBody = ele.childNodes[1];
            self.EleShadow.style = self.getShadow(self);
            if (delayT) {
                oSym.addTask(delayT, _ => {
                    self.freeStaticEffect(self, "SetBody");
                    $Z[id] && callback();
                });
            } else {
                callback();
            }

            function callback() {
                let p = self.PicArr[3].split(".");
                p = (p[p.length - 2] += "0", p.join("."));
                SetBlock(ele);
                oDynamicPic.require(p, self.EleBody);
                self.changePic(self, self.NormalGif);
                oSym.addTask(80, function a(times = 0) {
                    if ($Z[self.id] && !self.isGoingDie && times <= 10) {
                        if (!self.isAttacking && self.isNotStaticed()) {
                            let walkAudio = oAudioManager.playAudio("Gargantuar_walk", false, Math.max(0, Math.min(10 / times - 1, 1)));
                            times++;
                            oSym.addTask(93, a, [times]);
                        }
                    }
                });
            }
        },
        //改变图片同时改变坐标
        changePic(self, id) {
            let p = (!self.throwedImp ? self.PicArr[id] : self.PicArr[id + 6]);
            self.EleBody.src = p;
        },
        throwImp() {
            let self = this;
            if (self.throwedImp || !self.hasChanceToThrow || self.ZX < 115) {
                return;
            }
            self.hasChanceToThrow--;
            let r = [1.8, 2.3, 2.7, 3.2].random();
            if (self.ZX < 370 && self.ZX >= 115) {
                if (Math.random() < 0.1) {
                    r = [0.3, 0.5].random();
                } else {
                    return;
                }
            }
            let zombie = PlaceZombie(oImp2, self.R, 12, 0, 1);
            zombie.prepareToFly(self);
            self.isAttacking = 2;
            self.changePic(self, self.ThrowGif);
            oSym.addTask(75, _ => {
                if (!self.isNotStaticed() || self.isGoingDie || !$Z[self.id]) {
                    self.isAttacking = 0;
                    self.throwedImp = false;
                    zombie.DisappearDie();
                    return;
                }
                self.throwedImp = true;
                zombie.fly(r);
            });
            oSym.addTask(130, _ => { //无论扔小鬼是否成功，动画播放完成后僵尸恢复正常状态
                if ($Z[self.id] && !self.isGoingDie) { //防止僵尸在扔小鬼的过程中被植物打死
                    self.isAttacking = 0;
                    self.JudgeAttack();
                    if (self.isAttacking == 0) {
                        self.changePic(self, self.NormalGif);
                    }
                }
            });
        },
        getExplosion: function() {
            let self = this,
                dmg = Math.round(500/self.ResistInsta);
            if (self.ShieldHP > 0) {
                self.getShieldHit(self);
            }
            else {self.HP > dmg ? (self.HP -= dmg, self.HP > self.BreakPoint && self.throwImp()) : $Z[self.id] && !self.isGoingDie && self.ExplosionDie();}
        },
        JudgeAttack(stepRatio=1) {
            let self = this;
            let ZX = self.ZX;
            let crood = self.R + "_";
            let C = GetC(ZX);
            let G = oGd.$;
            let arr = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
            if (arr && self.Altitude === 1) { //地上的僵尸才能检测攻击
                if (self.HP <= self.HPx / 2 && !self.isAttacking && !self.throwedImp && self.hasChanceToThrow && self.isNotStaticed()) {
                    self.throwImp();
                } else {
                    !self.isAttacking && (self.isAttacking = 1, self.changePic(self, self.AttackGif)); //如果是首次触发攻击，需要更新到攻击状态
                    self.NormalAttack(...arr); //实施攻击
                }
            } else {
                //撤销攻击状态
                self.isAttacking && (self.isAttacking = 0, self.changePic(self, self.NormalGif));
            }
        },
        JudgeLR(self, crood, C, ZX, G) { //远程判定，巨人僵尸只吃能铲掉的植物
            if (C > 10 || C < 1) return;
            crood += C - 1 + '_';
            let z = PKindUpperLimit;
            while (z >= 0) {
                let plant = G[crood + z];
                if(plant&&plant.isPlant) {
                    return (One_Dimensional_Intersection(self.X+self.beAttackedPointL-30,self.X+self.beAttackedPointR,plant.AttackedLX,plant.AttackedRX) || plant.AttackedRX >= ZX && plant.AttackedLX <= ZX) ? [self.id, plant.id] : false;
                }
                z--;
            }
        },
        JudgeSR(self, crood, C, ZX, G) { //近程判定
            let tmp = crood;
            for (let i = 0; i < 3 && C + i < 10; i++) {
                crood = tmp + (C + i) + "_";
                let z = PKindUpperLimit;
                while (z >= 0) {
                    let plant = G[crood + z];
                    if(plant&&plant.isPlant) {
                        return (One_Dimensional_Intersection(self.X+self.beAttackedPointL-30,self.X+self.beAttackedPointR,plant.AttackedLX,plant.AttackedRX) || plant.AttackedRX >= ZX && plant.AttackedLX <= ZX) ? [self.id, plant.id] : false;
                    }
                    z--;
                }
            }
        },
        Bounce() {},
        NormalAttack: function(d, c) {
            let aud = "lowgroan" + ["", 2].random();
            let aud_prom = oAudioManager.playAudio(aud);
            let successCrush = false;
            oSym.addTask(100, function() {
                let g, self = $Z[d];
                if (self && self.isAttacking === 1) {
                    if (g = $P[c]) {
                        self.CrushPlant(g, self);
                    }
                    successCrush = true;
                }
            });
            oSym.addTask(250,
                function(f, e) {
                    if (successCrush) {
                        var h = $Z[f];
                        oAudioManager.pauseAudio(aud_prom);
                        if (h && !h.isGoingDie && h.isNotStaticed() && h.isAttacking === 1) {
                            h.isAttacking = 0;
                            h.changePic(h, h.NormalGif);
                        }
                    }
                },
                [d, c]);
        },
        CrushPlant: function(aPlant, self) {
            if (aPlant && self.isNotStaticed()) {
                let [R, C] = [aPlant.R, aPlant.C];
                let z = PKindUpperLimit,p;
                while(z>=0) {
                    p=oGd.$[`${R}_${C}_${z}`];
                    if(p&&p.isPlant){
                        p.getHurt(self, 1, self.Attack);
                    }
                    z--;
                }
                oGd.killAll(R, C, 'JNG_TICKET_Gargantuar');
                oAudioManager.playAudio("Gargantuar_crush");
                const effect = NewEle(self.id + "Effect", "div", `position:absolute;z-index:${self.zIndex - 1};width:631px;height:481px;left:${self.ZX-365.5}px;top:${self.pixelTop+self.height-370.5}px;background:url(${self.PicArr[self.EffectGif]});`, 0, EDPZ);
                oSym.addTask(20, ClearChild, [effect]);
            }
        },
    });
}(),
oZomboss_Industry = (function(){
    let DoorIndexs = [-1];//DoorIndexs不仅作为当前门图片的第一个索引也作为门到下一个门的临界值
    let DoorPicArr = (function() {
        var b = "images/Zombies/Zomboss_Industry/Doors/",suffix="png";
        let arr = [];
        for(let i = 1;i<6;i++){
            DoorIndexs.push(arr.length);
            for(let j = 1;j<9;j++){
                arr.push(b+`door${i}000${j}.${suffix}`);
            }
        }
        DoorIndexs.push(arr.length);
        return arr;
    })();
    let PicArr = (function() {
        var b = "images/Zombies/Zomboss_Industry/",suffix="png";
        let arr = [BlankPNG, BlankPNG, b + "Boss_Idle."+suffix,b+"aim.webp",b + "Belt.webp"];
        for(let j = 1;j<6;j++){
            arr.push(b+`Door_R${j}.${suffix}`);
        }
        return arr.concat(DoorPicArr);
    })();
    return InheritO(OrnNoneZombies,{
        EName:"oZomboss_Industry",
        CName:"僵王博士-楔木陶厂",
        isHard:false,
        DarkRainMasks:[],
        AttackGif: 2,
        LostHeadGif: 2,
        LostHeadAttackGif: 2,
        LostHeadGif: 2,
        DieGif: 5,
        BoomDieGif: 5,
        StandGif: 1,
        AimGif:3,
        BeltGif:4,
        HP: 21000,
        HPT: 21000,
        OSpeed: 0,
        Speed: 0,
        width: 451,
        NextAttackTime:0,
        AttackTimes:0,
        Stages:[],
        currentStage:0,
        height: 611,
        beAttackedPointL: 20,
        beAttackedPointR: 400,
        isPuppet:true,
        useTraditionalWrap: true,
        AudioArr: ["Zomboss1", "Zomboss2", "Zomboss3", "metaldoor1", "metaldoor2", "targeting", "missilefall", "sculpturefall", "conveyor", "machineExplosion"],
        Bounce() {},
        ChanceThrowCoin(){},
        //这里复制一份
        doorPicState:[].concat(DoorIndexs),
        doorState:[0,0,0,0,0,0],
        HeadTargetPosition:[{x:70,y:300},{x:80,y:300}],
        getRaven: function() {},
        getShadow: function(b) {
            return "display:none;"
        },
        getSlow(){},
        getButter(){},
        Bounce() {},
        DoorIndexs,
        DoorPicArr,
        PicArr:PicArr,
        CanAppearFromTomb: false,
        CanDrawBlood: false,
        PlayNormalballAudio: function() {
            oAudioManager.playAudio(["shieldhit", "shieldhit2"][Math.floor(Math.random() * 2)])
        },
        CardStars: 6,
        Almanac:{
            Tip:"僵尸博士在浓雾弃都的建筑，通过传送带向场地内源源不断地传送各种各样的罐子来针对/帮助玩家。免疫一切不良状态。<br/><br/>技能1:向随机位置发射雕像，直接杀死雕像击中的植物，并且以雕像取而代之。<br/>技能2:用传送带传送随机罐子、巨人罐子、车类罐子与植物罐子，这些罐子在传送带末端会倾倒碎裂，释放里面的植物或僵尸。同时罐子在经受爆炸后会直接碎裂。<br/>技能3:从工厂的出入口向外排雾，当打至濒死状态时还会在场地内召唤冰窟、让伦敦变成雷雨天。<br/>技能4:召唤盗贼僵尸。",
            Speed:"静止",
            get Story(){
                let a = "当僵尸博士安稳地坐在可以监控这个工厂里所有僵尸的一举一动的办公室里的时候，他几乎都要觉得自己很难再变得像以前那么邪恶了。但当他一看到那草坪上快乐的植物时，他就又立刻回到了自己所应该扮演的角色中——饥渴且邪恶的反派。";
                let json = localStorage["JNG_TR_WON"]?JSON.parse(localStorage["JNG_TR_WON"]):{};
                let man = json["Industry25"]?"Job":"戴夫（身份存疑）";
                let word1 = `在这个程序设定注定要出现精英怪的一天，出于${man}的意志，这座工厂从空地上拔地而起。`;
                if(json["Industry25"]){
                    return word1+"他对这个世界上仍然活得安稳甚至安逸的人的一致的愤怒铸就了它的墙壁与屋顶，他对「卡巴拉生命之树」中获取到的游戏API的充分调用铸就了机器与传送带，他用自己的全部精力与残破的生命驱动起这个摩登时代的怪物。他让罐子一刻不停的在流水线上被生产，他让工厂内的污染经大门与僵尸一起排出，他企图让被绑上工厂高层座位的僵王博士麻木而不觉自己的邪恶，即使草坪上那些快乐的植物也无法不受这个由痛苦、愤怒与批判铸就的怪物的影响。";
                }else if(json["Marsh25"]){
                    return word1+"没有人知道那些铸就墙壁屋顶的砖瓦，那些铸就机器与传送带的钢铁，那些驱动这个摩登怪物的电力从哪里来，它隐于雾都的层层迷雾中，随时可能会对我们造成威胁，而我们对它一无所知。";
                }else{
                    return a;
                }
            },
            Dom: `<img id='oZomboss_Industry_Display' src='images/Zombies/Zomboss_Industry/display.webp'   style='width:280px;height:232px;position:absolute;left:60px;top:269px;'>`,
            Weakness: "爆炸类植物",
        },
        //获取卡片图片
        GetCardImg(){
            let self = this;
            return "images/Card/Boss.webp";
        },
        setBossBlood(self) {
            oFlagContent.init({
                MeterType: 'LeftBar RedBar',
                HeadType: 'BOSSHead',
                fullValue: self.HP,
                curValue: 0,
            }).show().update({
                curValue: self.HP,
                animConfig: {
                    duration: 1/oSym.NowSpeed,
                    ease: "ease-out"
                },
            });
        },
        //特殊诞生事件，传递自定义的坐标，比如从坟墓出生
        CustomBirth(R, C, delayT, clipH) {
            const self = this,
                      pixelTop = -27, 
                      bottomY = pixelTop+self.height, 
                      zIndex = 25,
                      id = self.id = "Z_" + Math.random(),
                      beAttackedPointL = self.beAttackedPointL,
                      beAttackedPointR = self.beAttackedPointR;
            self.X = 741;
            self.ZX = self.AttackedLX = self.X+beAttackedPointL;
            self.AttackedRX = self.X + beAttackedPointR;
            self.R = R;
            self.pixelTop = pixelTop;
            self.zIndex = zIndex;
            if (self.delayT = delayT) {
                self.getStatic({
                    time: Infinity,
                    type: "SetBody",
                    useStaticCanvas: false,
                    forced: true,
                    usePolling: false,
                });
            }
            return self.getHTML(id, self.X, pixelTop, zIndex, "none", clipH || 0, self.GetDTop, self.PicArr[self.NormalGif]);
        },
        JudgeDoor(self){
            if(self.isGoingDie||!$Z[self.id]){
                return;
            }
            for(let i = 1;i<=5;i++){
                if(self.doorCloseTime[i]<=oSym.Now&&self.doorPicState[i]>self.DoorIndexs[i]){
                    oAudioManager.playAudio("metaldoor" + Math.floor(1 + Math.random() * 2));
                    self.doorPicState[i]-=1;
                    if($User.LowPerformanceMode){
                        self.doorPicState[i]=self.DoorIndexs[i];
                    }
                    EditEle(self.doorsDom[i],{
                        src:self.DoorPicArr[self.doorPicState[i]]
                    });
                    self.doorState[i]=0;
                }else if(self.doorCloseTime[i]>oSym.Now&&self.doorPicState[i]<self.DoorIndexs[i+1]-1){
                    self.doorPicState[i]+=1;
                    if($User.LowPerformanceMode){
                        self.doorPicState[i]=self.DoorIndexs[i+1]-1;
                    }
                    EditEle(self.doorsDom[i],{
                        src:self.DoorPicArr[self.doorPicState[i]]
                    });
                    self.doorState[i]=1;
                }
            }
            oSym.addTask(4,self.JudgeDoor,[self]);
        },
        JudgeAttack(stepRatio=1) {
            let self = this;
            let Attack = [
                _=>{
                    let RandomCoefficient=Math.random();
                    if(self.AttackTimes%16==0){
                        self.SummonFog(Math.min(self.AttackTimes/16+1,5));
                        self.NextAttackTime = oSym.Now+500;
                    }else if(RandomCoefficient<0.05&&oGd.$Sculpture.length<3){
                        let q = Math.floor(Math.random()*2+1);
                        let p = hasPlants(true,p=>{
                            return p.C>1;
                        }).shuffle().slice(-q);
                        let arr = [];
                        for(let i of p){
                            arr.push([i.R,i.C]);
                        }
                        self.SummonSculpture(arr);
                        self.NextAttackTime=oSym.Now+500;
                    }else{
                        //SummonVases(type,imgType,obj,R=undefined)
                        let pArr = [oPuffShroom,oRepeater];
                        let zArr = [oZombie,oConeheadZombie];
                        let mpArr = [],mzArr=[];
                        let probabilityPlant = Math.max(0.7-self.AttackTimes/100,0.4);
                        let attReduce = self.isHard?3:0;
                        if(self.AttackTimes>8-attReduce){
                            zArr.push(oMembraneZombie,oBucketheadZombie,oBalloonZombie);
                            pArr.push(oSnowPea);
                        }
                        if((self.AttackTimes<36-attReduce&&self.AttackTimes>32-attReduce)||self.AttackTimes>200){
                            zArr = [oBucketheadZombie,oConeheadZombie];
                            probabilityPlant = 0;
                        }
                        if(self.AttackTimes%(7+attReduce)==0){
                            self.NextAttackTime+=200;
                            probabilityPlant = 1;
                            pArr.push(oCherryBomb,oXshooter,oXshooter,oSnowPea);
                        }
                        for(let i of pArr){
                            mpArr.push([0,[0,1,1,1].random(),i]);
                        }
                        if(self.AttackTimes>4-attReduce&&self.AttackTimes>1){
                            for(let i of zArr){
                                mzArr.push([1,1,i]);
                            }
                        }
                        if(Math.random()<probabilityPlant||!mzArr.length){
                            self.SummonVases(...(mpArr.random()));
                        }else{
                            self.SummonVases(...(mzArr.random()));
                        }
                        self.NextAttackTime=oSym.Now+Math.random()*300+150;
                        if(self.AttackTimes%5==0){
                            self.NextAttackTime+=200;
                        }
                    }
                },
                //2阶段
                _=>{
                    if(self.AttackTimes%50==0){
                        //SummonVases(type,imgType,obj,R=undefined)
                        self.SummonFog(0);
                        oAudioManager.playAudio("Zomboss" + Math.floor(1 + Math.random() * 3));
                        for(let i = 1;i<6;i++){
                            self.SummonVases(1,3,oGargantuar,i);
                        }
                        for(let i = 1;i<4;i++){
                            oSym.addTask(Math.random()*300+i*60,_=>{
                                self.SummonVases(0,0,oCherryBomb);
                            });
                            oSym.addTask(Math.random()*300+800,_=>{
                                self.SummonVases(1,1,oBucketheadZombie);
                            });
                            oSym.addTask(Math.random()*500+600,_=>{
                                self.SummonVases(1,1,oFootballZombie);
                            });
                        }
                        oSym.addTask(400+Math.random()*300,_=>{
                            self.SummonVases(0,0,oDoomShroom);
                        });
                        oSym.addTask(1500,_=>{
                            self.SummonVases(0,0,oDoomShroom);
                        });
                        for(let i = 1;i<=10;i++){
                            oSym.addTask(1700+1200*Math.random(),_=>{
                                if(Math.random()>0.7){
                                    self.SummonVases(0,0,[oXshooter,oCherryBomb,oFumeShroom].random());
                                }else{
                                    self.SummonVases(1,1,[oBucketheadZombie,oNewspaperZombie,oConeheadZombie].random());
                                }
                            });
                        }
                        oSym.addTask(3800,_=>{
                            oAudioManager.playAudio("Zomboss" + Math.floor(1 + Math.random() * 3));
                            for(let i = 1;i<6;i++){
                                self.SummonVases(1,3,oGargantuar,i);
                            }
                            oSym.addTask(400+Math.random()*300,_=>{
                                self.SummonVases(0,0,oDoomShroom);
                            });
                        });
                        self.NextAttackTime = oSym.Now+5700;
                    }else{
                        let RandomCoefficient=Math.random();
                        if(self.AttackTimes%16==1){
                            self.SummonFog(Math.floor(Math.min(self.AttackTimes/16+3,7)),"strongFog");
                            self.NextAttackTime = oSym.Now+500;
                        }else if(RandomCoefficient<0.15&&oGd.$Sculpture.length<6){
                            let q = 1;
                            let p = hasPlants(true,p=>{
                                return p.C>1;
                            }).shuffle().slice(-q);
                            let arr = [[[1,2,3,4,5].random(),8],[[1,2,3,4,5].random(),8]];
                            for(let i of p){
                                arr.push([i.R,i.C]);
                            }
                            self.SummonSculpture(arr);
                            self.NextAttackTime=oSym.Now+400;
                        }else{
                            //SummonVases(type,imgType,obj,R=undefined)
                            let pArr = [oPuffShroom,oRepeater,oElecTurnip,oSporeShroom,oFumeShroom,oRadish,oXshooter];
                            let zArr = [oSculptorZombie,oZombie,oConeheadZombie,oMembraneZombie,oMakeRifterZombie,oCaskZombie,oNewspaperZombie,oSadakoZombie];
                            let mpArr = [],mzArr=[];
                            let probabilityPlant = Math.max(0.7-self.AttackTimes/100,0.4);
                            if(self.AttackTimes%7==0){
                                self.NextAttackTime+=100;
                                probabilityPlant = 0.8;
                                pArr.push(oCherryBomb,oElecTurnip,oElecTurnip,oDoomShroom);
                            }
                            if(self.AttackTimes%4==0){
                                pArr.push(oElecTurnip);
                            }
                            for(let i of pArr){
                                mpArr.push([0,[0,1,1,1].random(),i]);
                            }
                            for(let i of zArr){
                                mzArr.push([1,1,i]);
                            }
                            let wantto = Math.random()*2+1;
                            for(let q = 1;q<=wantto;q++){
                                oSym.addTask(300*Math.random(),_=>{
                                    if(Math.random()<probabilityPlant||!mzArr.length){
                                        self.SummonVases(...(mpArr.random()));
                                        if(Math.random()<0.2){
                                            oSym.addTask(Math.random()*400,_=>{
                                                self.SummonVases(...(mpArr.random()));
                                            });
                                        }
                                    }else{
                                        if(Math.random()>0.2){
                                            let random=Math.random()*3+2;
                                            for(let i = 1;i<random;i++){
                                                oSym.addTask(Math.random()*200,_=>{
                                                    self.SummonVases(...(mzArr.random()));
                                                });
                                            }
                                        }else{
                                            self.SummonVases(1,2,oBeetleCarZombie);
                                        }
                                    }
                                });
                            }
                            self.NextAttackTime=oSym.Now+Math.max(150,Math.random()*300+240-self.AttackTimes*5);
                            if(self.AttackTimes%15==0){
                                self.NextAttackTime+=100;
                            }
                        }
                    }
                },
                //3阶段
                _=>{
                    let specialAttacks = [_=>{
                        oSym.addTask(800,_=>{
                            let r = [1,2,3,4,5].random();
                            for(let i = 1;i<4;i++){
                                oSym.addTask(300*i,_=>{
                                    self.SummonVases(1,1,oFootballZombie,r);
                                });
                            }
                        });
                        self.NextAttackTime = oSym.Now+1500;
                    }];
                    if(self.AttackTimes==0){
                        self.SummonFog(9,"Fog");
                        oSym.addTask(200,_=>{
                            let plants = hasPlants().shuffle();
                            //高难度僵尸增加
                            let hardAdd = self.isHard?5:0;
                            let l = Math.min(3+hardAdd,plants.length);
                            for(let i = 0;i<l;i++){
                                oSym.addTask(150*Math.random(),_=>{PlaceZombie(oThiefZombie,plants[i].R,plants[i].C,0);});
                            }
                        });
                        oSym.addTask(1300,_=>{
                            self.SummonFog(2,"Fog");
                        });
                        self.NextAttackTime=oSym.Now+1400;
                    }else if(self.AttackTimes%15==7){
                        specialAttacks.random()();
                    }else{
                        let hardZombies = self.isHard?5:0;//增加的僵尸容纳量
                        let random = Math.random();
                        if(random>4/7&&oGd.$Sculpture.length<12){
                            let low = Math.random()*4+2;
                            let arr = [];
                            for(let i =1;i<low;i++){
                                arr.push([[1,2,3,4,5].random(),[8,7,6,5,4].random()]);
                            }
                            self.SummonSculpture(arr);
                            self.NextAttackTime = oSym.Now+200;
                        }else if($Z.length<25+hardZombies){
                            let x = Math.min(Math.max(self.AttackTimes,1),105);
                            let zNum = Math.floor(((x*4+8)**(0.8)-x**(1.03)+(x)/(4)-5)/3*2);
                            let pNum = Math.min(8,Math.floor((6 / x**0.3 + 2 + Math.abs(x - 105)**0.3) / 2 + 2**(1 / (0.2*x))));
                            let z = [oMakeRifterZombie,oPushIceImp,oSculptorZombie,oSculptorZombie,oSculptorZombie,oMembraneZombie,oMembraneZombie,oGargantuar];
                            let p = [oElecTurnip,oXshooter,oXshooter,oRadish,oPuffShroom,oRadish,oFumeShroom];
                            let gargantuarNum = 0,elecTurnipNum=0;
                            for(let i of $Z){
                                if(i.EName=="oGargantuar"){
                                    gargantuarNum++;
                                }
                            }
                            for(let i of $P){
                                if(i.EName=="oElecTurnip"){
                                    elecTurnipNum++;
                                }
                            }
                            let elecAdd = 4*(self.isHard^1);
                            //easy的话增加芜菁容纳量
                            if(elecTurnipNum>=3+elecAdd){
                                p.splice(0,1,oPeashooter,oPeashooter,oRepeater,oTorchwood);
                            }
                            if(self.AttackTimes%17==16){
                                self.SummonVases(0,0,oDoomShroom);
                            }
                            if(gargantuarNum>1){
                                z.splice(z.length-1,1);
                            }
                            for(let i = 0;i<zNum;i++){
                                oSym.addTask(1200*Math.random(),_=>{
                                    let obj = z.random();
                                    self.SummonVases(1,obj!==oGargantuar?1:3,obj);
                                    if(obj===oGargantuar){
                                        gargantuarNum++;
                                    }
                                    if(gargantuarNum>1){
                                        z.splice(z.length-1,1);
                                    }
                                });
                            }
                            for(let i = 0;i<pNum;i++){
                                oSym.addTask(1200*Math.random(),_=>{
                                    let obj = p.random();
                                    self.SummonVases(0,[0,1,1].random(),obj);
                                });
                            }
                            self.NextAttackTime = oSym.Now+700+Math.random()*400;
                            if(self.AttackTimes%15==0){
                                self.NextAttackTime+=800;
                            }
                        }else if(oFog.leftBorder<7){
                            self.SummonFog(oFog.leftBorder+1,"Fog");
                            self.NextAttackTime = oSym.Now+800;
                        }else{
                            self.NextAttackTime = oSym.Now+500;
                        }
                    }
                },
                //4阶段
                _=>{
                    if(self.AttackTimes==0){
                        self.SummonFog(2);
                        let arr = [];
                        for(let i = 1;i<6;i++){
                            arr.push([i,7]);
                            if(self.isHard){
                                arr.push([i,6]);
                            }
                        }
                        self.SummonSculpture(arr);
                        self.NextAttackTime = oSym.Now+700;
                    }else{
                        let specialAttacks = [_=>{
                            let vases = [];
                            self.SummonFog(9,"strongFog");
                            for(let i = 0;i<10;i++){
                                oSym.addTask(Math.random()*600,_=>{
                                    vases.push(self.SummonVases(0,1,[oSporeShroom,oCherryBomb,oElecTurnip].random()));
                                });
                            }
                            oSym.addTask(1000,_=>{
                                self.SummonFog(2);
                                for(let i of vases){
                                    if($Z[i.id]){
                                        i.configs={type:1,obj:[oFootballZombie,oBucketheadZombie].random()};
                                    }
                                }
                                for(let i = 1;i<6;i++){
                                    self.SummonVases(1,2,oZomboni,i);
                                }
                            });
                            self.NextAttackTime = oSym.Now+1700;
                        },_=>{
                            let p = hasPlants();
                            let mn = Math.min(6,p.length);
                            for(let i = 0;i<mn;i++){
                                let k = Math.floor(Math.random()*p.length);
                                let [R,C] = [p[k].R,p[k].C];
                                oSym.addTask(Math.random()*200,_=>{
                                    PlaceZombie(oThiefZombie,R,C,0);
                                });
                                p.splice(k,1);
                            }
                            self.SummonVases(0,1,oXshooter);
                        }];
                        if(self.AttackTimes%35==7){
                            specialAttacks.random()();
                        }else{
                            let hardZombies = self.isHard?7:0;//增加的僵尸容纳量
                            let random = Math.random();
                            if(random>7/9&&oGd.$Sculpture.length<10){
                                let low = Math.random()*4+2;
                                let arr = [];
                                for(let i =1;i<low;i++){
                                    arr.push([[1,2,3,4,5].random(),[8,7,6].random()]);
                                }
                                self.SummonSculpture(arr);
                                self.NextAttackTime = oSym.Now+500;
                            }else if($Z.length<20+hardZombies){
                                let x = Math.min(Math.max(self.AttackTimes,1),105);
                                //如果不是困难模式就减少僵尸
                                let zNum = Math.floor(((x * 4 + 8)**0.8 - x**1.03 + x / 4 - 4) / (2+(self.isHard?-0.5:0.5)));
                                let pNum = Math.round(8-self.AttackTimes/35);
                                let z = [oMakeRifterZombie,oPushIceImp,oSculptorZombie,oSculptorZombie,oSculptorZombie,oConeheadZombie,oImp,oCigarZombie];
                                z = z.concat(z).concat(z).concat(oBeetleCarZombie,oZomboni);
                                let p = [oElecTurnip,oXshooter,oSporeShroom,oFumeShroom,oFumeShroom,oCabbage];
                                let elecTurnipNum=0;
                                for(let i of $P){
                                    if(i.EName=="oElecTurnip"){
                                        elecTurnipNum++;
                                    }
                                }
                                if(elecTurnipNum>=5){
                                    p.splice(0,1,oKernelPult,oKernelPult,oCabbage,oCabbage,oMelonPult,oMelonPult,oMelonPult,oSpikeweed,oSpikeweed);
                                }
                                for(let i = 0;i<zNum;i++){
                                    oSym.addTask(1200*Math.random(),_=>{
                                        let obj = z.random();
                                        self.SummonVases(1,obj!==oBeetleCarZombie&&obj!==oZomboni?1:2,obj);
                                    });
                                }
                                for(let i = 0;i<pNum;i++){
                                    oSym.addTask(1200*Math.random(),_=>{
                                        let obj = p.random();
                                        self.SummonVases(0,[0,1,1].random(),obj);
                                    });
                                }
                                self.NextAttackTime = oSym.Now+700+Math.random()*400;
                                if(self.AttackTimes%15==0){
                                    self.NextAttackTime+=500;
                                }
                            }else{
                                self.NextAttackTime = oSym.Now+300;
                            }
                        }
                    }
                },
                //5阶段
                _=>{
                    if(self.AttackTimes==0){
                        self.SummonFog(0,"Fog");
                        let e = NewEle("effect"+Math.random(), "div", "pointer-events:none;position:absolute;z-index:31;width:1500px;height:600px;background:#000;opacity:0;", 0, EDAll);
                        oEffects.Animate(e,{
                            opacity:1
                        },1.5/oSym.NowSpeed,"linear",_=>{ClearChild(e);});
                        oSym.addTask(70,_=>{
                            oAudioManager.playAudio('Zomboss2');
                            self.DarkRainMasks = oMiniGames.DarkRain(5,5,4);
                            let pos = [
                                [2,1],[3,1],[4,1],
                                [1,2],[3,2],[5,2],
                                [1,3],[2,3],[4,3],[5,3],
                                [1,4],[3,4],[5,4],
                                [2,5],[3,5],[4,5]
                            ];
                            let SculpturePos = [
                                [1,1],[1,5],
                                [2,2],[2,4],
                                [3,3],
                                [4,2],[4,4],
                                [5,1],[5,5]
                            ];
                            pos.forEach(position=>{
                                CustomSpecial(oRifterAnimate,...position);
                            });
                            self.SummonSculpture(SculpturePos);
                            for(let i = 0;i<3;i++){
                                oSym.addTask(Math.random()*500,_=>{
                                    self.SummonVases(0,0,oBegonia);
                                });
                                oSym.addTask(Math.random()*500,_=>{
                                    self.SummonVases(0,0,oDoomShroom);
                                });
                            }
                        });
                        self.NextAttackTime = oSym.Now+1400;
                    }else{
                        let Attacks = [
                        //攻击1
                            _=>{
                                //增加的炸弹个数
                                let bombAdd = self.isHard^1;
                                for(let i = 1;i<4+bombAdd;i++){
                                    oSym.addTask(i*300,_=>{
                                        self.SummonVases(0,0,oCherryBomb);
                                    });
                                }
                                oSym.addTask(800,_=>{
                                    self.SummonVases(0,0,oDoomShroom);
                                });
                                oSym.addTask(500,_=>{
                                    for(let i = 1;i<=5;i++){
                                        self.SummonVases(1,3,oGargantuar,i);
                                    }
                                });
                                for(let i = 0;i<4;i++){
                                    oSym.addTask(1200*Math.random(),_=>{
                                        self.SummonVases(0,0,[oCabbage,oKernelPult,oCabbage,oKernelPult,oMelonPult,oFumeShroom].random());
                                    });
                                }
                                if(self.AttackTimes>5){
                                    for(let i = 1;i<=5;i++){
                                        oSym.addTask(1200*Math.random(),_=>{self.SummonVases(1,1,[oImp,oZombie,oStrollZombie].random())});
                                    }
                                }
                            },
                        //攻击2
                            _=>{
                                for(let i = 0;i<3;i++){
                                    oSym.addTask(1200*Math.random(),_=>{
                                        self.SummonVases(0,0,[oCabbage,oKernelPult,oCabbage,oKernelPult,oMelonPult,oFumeShroom].random());
                                    });
                                }
                                for(let i = 1;i<3;i++){
                                    oSym.addTask(Math.random()*300,_=>{
                                        self.SummonVases(0,0,oCherryBomb);
                                    });
                                }
                                oSym.addTask(500,_=>{
                                    for(let i = 1;i<=5;i++){
                                        self.SummonVases(1,2,oBeetleCarZombie,i);
                                    }
                                });
                                oSym.addTask(800,_=>{
                                    for(let i = 1;i<=5;i++){
                                        self.SummonVases(1,1,oBucketheadZombie,i);
                                    }
                                });
                                let pos = [];
                                for(let i = 1;i<=3;i++){
                                    pos.push([[2,3,4].random(),[6,7,8,9].random()]);
                                }
                                self.SummonSculpture(pos);
                            },
                        //攻击3
                            _=>{
                                for(let i = 0;i<3;i++){
                                    oSym.addTask(1200*Math.random()+1200,_=>{
                                        self.SummonVases(0,0,[oCabbage,oKernelPult,oCabbage,oKernelPult,oMelonPult,oFumeShroom].random());
                                    });
                                }
                                oSym.addTask(500+Math.random()*400,()=>{
                                    self.SummonVases(0,0,oCherryBomb);
                                });
                                oSym.addTask(500,_=>{
                                    for(let i = 2;i<=4;i++){
                                        self.SummonVases(1,2,oZomboni,i);
                                    }
                                });
                                oSym.addTask(800,_=>{
                                    for(let i = 1;i<=5;i++){
                                        self.SummonVases(1,1,oConeheadZombie,i);
                                    }
                                });
                                for(let i = 0;i<3;i++){
                                    oSym.addTask(500*Math.random(),_=>{
                                        self.SummonVases(0,0,oSpikeweed);
                                    });
                                }
                                oSym.addTask(800,_=>{
                                    for(let i = 2;i<=4;i++){
                                        self.SummonVases(1,2,oBeetleCarZombie,i);
                                    }
                                });
                            },
                        //攻击4
                            _=>{
                                for(let i = 1;i<=3;i++){
                                    oSym.addTask(200+Math.random()*400,()=>{
                                        self.SummonVases(0,0,oMelonPult);
                                    });
                                }
                                oSym.addTask(400,_=>{
                                    for(let i = 1;i<=5;i++){
                                        self.SummonVases(1,1,oSculptorZombie,i);
                                    }
                                });
                                oSym.addTask(300,()=>{
                                    self.SummonVases(0,0,oCherryBomb);
                                    
                                });
                                oSym.addTask(1100,()=>{
                                    self.SummonVases(0,0,oCherryBomb);
                                });
                                oSym.addTask(1200,_=>{
                                    let p = hasPlants();
                                    let hardZombies = self.isHard?0:1;//减少的僵尸生成量
                                    let mn = Math.min(3-hardZombies,p.length);
                                    for(let i = 0;i<mn;i++){
                                        let k = Math.floor(Math.random()*p.length);
                                        let [R,C] = [p[k].R,p[k].C];
                                        oSym.addTask(Math.random()*200,_=>{
                                            PlaceZombie(oThiefZombie,R,C,0);
                                        });
                                        p.splice(k,1);
                                    }
                                });
                                let pos = [];
                                for(let i = 1;i<=5;i++){
                                    pos.push([[2,3,4].random(),[8,9].random()]);
                                }
                                self.SummonSculpture(pos);
                            },
                        //攻击5
                            _=>{
                                self.SummonVases(0,0,oDoomShroom);
                                oSym.addTask(200,()=>{
                                    for(let i = 0;i<6;i++){
                                        oSym.addTask(400*Math.random()+200,_=>{
                                            self.SummonVases(0,0,[oWallNut,oPeashooter,oPotatoMine].random());
                                        });
                                    }
                                });
                                for(let i = 1;i<4;i++){
                                    oSym.addTask(250*i,()=>{
                                        for(let j = i%2+1;j<6;j+=2){
                                            let z=oZombie;
                                            self.SummonVases(1,1,z,j);
                                        }
                                    });
                                }
                                oSym.addTask(900,()=>{
                                    for(let i = 1;i<=5;i++){
                                        let zombie = oGargantuar;
                                        //如果为简单难度换僵尸
                                        if(!self.isHard){
                                            zombie = oBucketheadZombie;
                                        }
                                        self.SummonVases(1,3,zombie,i);
                                    }
                                });
                                oSym.addTask(1100,()=>{
                                    self.SummonVases(0,0,oDoomShroom);
                                });
                            }
                        ];
                        if(self.AttackTimes%6==5){
                            for(let i = 0;i<2;i++){
                                oSym.addTask(Math.random()*500,_=>{
                                    self.SummonVases(0,0,oBegonia);
                                });
                            }
                        }
                        let WavesSum = (self.isHard?4:6);
                        if(self.AttackTimes>WavesSum){
                            let hardMuti = self.isHard?1.7:1.3;
                            let num = Math.min(19,Math.floor(((self.AttackTimes-(WavesSum-2))*3)**(1/2)*hardMuti));
                            for(let i = 1;i<=num;i++){
                                oSym.addTask(1000*Math.random(),_=>{
                                    self.SummonVases(1,1,[oZombie,oConeheadZombie,oBucketheadZombie,oZombie,oConeheadZombie,oBucketheadZombie,oImp,oMakeRifterZombie].random());
                                });
                            }
                            if(self.isHard)
                            self.getPea(self,0);
                            //self.getPea(self,500);
                        }
                        if(!self.isHard){
                            self.HP-=300;
                        }else{
                            self.HP-=450;
                        }
                        if(self.AttackTimes-1<Attacks.length){
                            Attacks[self.AttackTimes-1]();
                        }else{
                            Attacks.random()();
                        }
                        self.NextAttackTime = oSym.Now+1800;
                    }
                }
            ];
            if(self.NextAttackTime<=oSym.Now){
                if(self.HP<self.Stages[self.currentStage]){
                    self.AttackTimes=0;
                    self.currentStage++;
                }
                Attack[Math.min(Attack.length-1,self.currentStage)]();
                self.AttackTimes++;
            }
        },
        SummonSculpture(positions){
            let self = this;
            let sculps=[0,0,0,0,0,0];
            let limit = (self.isHard?5:3);
            for(let i in $Z){
                let tmp = $Z[i];
                if(tmp.EName==="oSculpture"){
                    sculps[tmp.R]++;
                }
            }
            let placeScu = (R,C)=>{
                if(oGd.$Sculpture[R + '_' + C]){
                    return;
                }
                let cnt = 0;
                for(let i in $Z){
                    let tmp = $Z[i];
                    if(tmp.EName==="oSculpture"){
                        if(tmp.R==R){
                            cnt++;
                        }
                    }
                }
                if(cnt>=limit){
                    return;
                }
                let z = PlaceZombie(oSculpture,R,C,0,1);
                EditCompositeStyle({ ele: z.EleBody, delFuncs: ['translateY'], addFuncs: [["translateY","-600px"]], option: 2 });
                oEffects.Animate(z.EleBody,{
                    transform: EditCompositeStyle({ ele: z.EleBody, delFuncs: ['translateY'] }),
                },0.2/oSym.NowSpeed);
            };
            oSym.addTask(100,_=>{
                if(self.isGoingDie||!$Z[self.id]){
                    return;
                }
                for(let i of positions){
                    if(!oGd.$Sculpture[i[0] + '_' + i[1]]){
                        if(sculps[i[0]]>=limit){
                            return;
                        }
                        sculps[i[0]]++;
                        oSym.addTask(Math.random()*150,()=>{
                            oAudioManager.playAudio("targeting");
                            let aim = NewEle("","img",`position:absolute;left:${GetX(i[1])-60}px;top:${GetY(i[0])-90}px;z-index:${i[0]*3};`,{},EDPZ);
                            aim.src = oDynamicPic.require(self.PicArr[self.AimGif],aim);
                            oSym.addTask(160,_=>{
                                oAudioManager.playAudio("missilefall");
                                oSym.addTask(40/oSym.NowSpeed,_=>{
                                    oAudioManager.playAudio("sculpturefall");
                                });
                                placeScu(...i);
                                ClearChild(aim);
                            });
                        });
                    }
                }
            });
        },
        JudgeZombies(self){
            if(self.isGoingDie||!$Z[self.id]){
                return;
            }
            for(let i in $Z){
                let z = $Z[i];
                if(!z.isPuppet||/Sculpture/.test(z.EName)){
                    if(GetC(z.AttackedLX)>=6){
                        if(z.OSpeed==0){
                            z.Speed=1.8;
                        }else{
                            z.SpeedCoefficient = 1.2;
                        }
                    }else{
                        if(z.OSpeed==0){
                            z.Speed=0;
                        }else{
                            z.SpeedCoefficient = 1;
                        }
                    }
                }
            }
            oSym.addTask(70,self.JudgeZombies,[self]);
        },
        OpenDoor(time){
            let self = this;
            if(!self.doorsDom){
                return;
            }
            for(let i = 1;i<=5;i++){
                oAudioManager.playAudio("metaldoor" + Math.floor(1 + Math.random() * 2));
                self.doorCloseTime[i]=Math.max(oSym.Now+(time[i]||0),self.doorCloseTime[i]);
            }
        },
        SummonFog(leftBorder,type="Fog"){
            let self = this;
            if($("dFog")){
                oEffects.fadeOut($("dFog"),1/oSym.NowSpeed,e=>{
                    ClearChild(e);
                    leftBorder>0?fog():(oFog.hasLeftStage=true,oFog.leftBorder=0);
                });
            }else{
                fog();
            }
            function fog(){
                self.OpenDoor([0,200,200,200,200,200]);
                oAudioManager.playAudio('Zomboss' + Math.floor(1 + Math.random()*3));
                Object.assign(oFog,{leftBorder:leftBorder,type:type});
                let innerHTML = "";
                let imgY = 0;
                let MaxFogCId = 2 * leftBorder-2;
                let ids = [];
                let left = GetX(oS.C - leftBorder) + 60;
                let createImg = (id, x, y) => `<img id='Fog${id}' class='${type} show' src='images/interface/fog${Math.floor(Math.random() * 4)}.png' style='left:${x-115}px;top:${y}px;transform:translateX(${-x+GetX(12)-left+10}px) scale(0.5)'>`;
                //从上至下，从左至右绘制迷雾
                for(let idY = 1; idY < oS.R+1; idY++) {
                    for(let idX = 0, imgX = 0; idX <= MaxFogCId; idX++, imgX += 35) {
                        let id = idY + "_" + idX;
                        ids.push(`Fog${id}`);
                        innerHTML += createImg(id, imgX-15, imgY-15);
                    }
                    imgY += 540/oS.R;
                }
                let ele = NewEle("dFog", "div", `left:${left}px`, {innerHTML}, FightingScene);
                ele.className = type+"Div";
                oFog.hasLeftStage = false;
                oFog.refreshTP();
                type === 'strongFog' && oFog.attackPlants();
                for(let i of ids){
                    oEffects.Animate($(i),{
                        transform: "initial",
                    },(Math.random()*1+1)/oSym.NowSpeed,"ease-out");
                }
            }
        },
        SummonVases(type,imgType,obj,R=undefined,HP=0){
            let self = this;
            if(self.isGoingDie||!$Z[self.id]){
                return;
            }
            if(R===undefined){
                R = [1,2,3,4,5].random();
            }
            let times = [];
            times[R] = 400;
            let z = PlaceZombie(oZombossVase,R,10,0,1);
            if(self.currentStage>=2){
                z.Speed=4.2+(self.currentStage-2)/2;
                z.tSpeed = 2.5+(self.currentStage-2)/2;
            }
            z.HP = Math.floor(Math.random()*200+60+HP);
            z.configs={type:type,obj:obj};
            z.SetImg(imgType);
            z.DieX = GetX(5);
            self.OpenDoor(times);
            return z;
        },
        SetBrightness: function(zhizhen, dom, k) {
            if($User.LowPerformanceMode){
                return;
            }
            let self = this;
            if(dom){
                let s = `brightness(1${!k^1}0%)`;
                if(self.doorsDom){
                    for(let i=1;i<=5;i++){
                        self.doorsDom[i].style['filter'] = s;
                    }
                }
                dom.style['filter'] = s;
            }
        },
        Birth(json={}) {  //唤醒僵尸，注册$Z和oZ
            let self = this;
            if(!json.dont_set_original_value){//不设置原始数据，例如OAttack,OSpeed之类，否则默认备份OAttack,OSpeed
                self.OAttack = self.Attack;
                self.OSpeed = self.Speed;
            }
            self.HeadTargetPosition = JSON.parse(JSON.stringify(self.HeadTargetPosition));//深拷贝头部坐标，避免改的时候直接改成prototype的
            self.PicArr = self.PicArr.slice();//复制一份数组，避免中途更改PicArr
            self.DiyConfigs = {};
            $Z[self.id] = self;
            for(let i = 1;i<=oS.R;i++){
                self.R = i;
                oZ.add(self);
            }
            self.doorState =[0,0,0,0,0,0];
            self.doorCloseTime = [0,0,0,0,0,0];
            self.Stages = [19000,15000,10000,3000,-1000];
            self.R = 3;
            self.NextAttackTime = oSym.Now+500;
            self.setBossBlood(self);
            let id = self.id;
            let ele = self.Ele = $(id);
            self.EleShadow = ele.firstChild;
            self.EleBody = ele.childNodes[1];
            //画传送带dom
            {
                let doorsX = [0,637,637,637,637,637];
                let doorsY = [0,78,174, 277,379, 475];
                for(let i = 1;i<=5;i++){
                    NewImg("",self.PicArr[self.BeltGif],`position:absolute;top:${doorsY[i]}px;left:${doorsX[i]-856+self.X}px;z-index:${3*i-1};`,EDPZ);
                }
            };
            //画洞洞dom
            {
                let doorsX = [0,884,883,886,881,882];
                let doorsY = [0,12,86,181,280,373];
                for(let i = 1;i<=5;i++){
                    NewImg("",self.PicArr[self.BeltGif+i],`position:absolute;top:${doorsY[i]}px;left:${doorsX[i]-856+self.X}px;z-index:${3*i-1};`,EDPZ);
                }
            };
            //画铁皮门dom
            let doms = [];
            let doorsX = [0,895,895,895,895,895];
            let doorsY = [0,43,118,218,318,418];
            for(let i = 1;i<=5;i++){
                doms[i] = NewImg("",self.DoorPicArr[self.DoorIndexs[i]],`position:absolute;top:${doorsY[i]}px;left:${doorsX[i]-856+self.X}px;z-index:${3*i};`,EDPZ);
            }
            self.doorsDom = doms;
            self.BirthCallBack(self);
            oSym.addTask(self.delayT,_=>{
                ele.addEventListener("unload",self.RemoveRandomPic,{once:true});
                self.EleBody.src = self.PicArr[self.NormalGif];
            });
            self.JudgeDoor(self);
            self.JudgeZombies(self);
            oAudioManager.playAudio("conveyor",1);
        },
        NormalGetAttack(self, a) {
            self.SetBrightness(self, self.EleBody, 1);
            oSym.addTask(10, _=>$Z[self.id] && self.SetBrightness(self, self.EleBody, 0));
            if(self.HP<self.Stages[self.currentStage]){
                return;
            }
            if(self.currentStage==4){
                a=Math.floor(a/3);
            }
            if((self.HP -= a) < 0) {
                self.NormalDie();
                self.getHit0 = self.getHit1 = self.getHit2 = _=>{};
                return;
            }
            oFlagContent.__HeadEle__.className.includes("BOSSHead") && oFlagContent.update({ curValue: self.HP });
        },
        getHit0(d, a) {
            d.NormalGetAttack(d,a);
        },
        getHit1(d, a) {
            d.NormalGetAttack(d,a);
        },
        getHit2(d, a) {
            d.NormalGetAttack(d,a);
        },
        getSnowPea:OrnNoneZombies.prototype.getPea,
        getExplosion() {},
        getCrushed(q) {
            q.PlayBirthEffect(q);
            q.Die();
            let self = this;
            self.NormalGetAttack(self,Math.floor(self.HP/5));
        },
        NormalDie() {
            let self = this, id = self.id;
            //self.EleBody.src = self.PicArr[0];
            self.HP = 0;
            //oEffects.fadeOut(self.Ele, 3, self.Ele);
            for(let i = 0;i<2;i++){
          	oSym.addTask(i*200, () => {
                    oAudioManager.playAudio('machineExplosion');
                });
            }
            delete $Z[id];
            oEffects.ImgSpriter({
                ele: NewEle(id + "_Die", "div", `position:absolute;z-index:${self.zIndex+3};height:420px;width:488px;left:${self.X}px;top:${self.pixelTop}px;background:url(images/Zombies/BossB/die.png) no-repeat;`, 0, EDPZ),
                styleProperty: 'X',
                changeValue: -488,
                frameNum: 24,
                interval: 9,
            });
            if(self.DarkRainMasks){
                let e = NewEle("effect"+Math.random(), "div", "pointer-events:none;position:absolute;z-index:31;width:1500px;height:600px;background:#000;opacity:0;", 0, EDAll);
                oEffects.Animate(e,{
                    opacity:1
                },1.5/oSym.NowSpeed,"linear",_=>{
                    oSym.addTask(2,()=>{
                        oEffects.Animate(e,{
                            opacity:0
                        },1.5/oSym.NowSpeed,"linear",ClearChild);
                    });
                    ClearChild(...self.DarkRainMasks);
                });
            }
            oEffects.ScreenShake();
            oP.MonitorZombiePosition(self);
            for (let i of $Z) {
                if(i.EName=="oZombossVase"){
                    i.DisappearDie();
                }else{
                    i.ExplosionDie();
                }
            }
            oSym.addTask(400, () => {
                toWin();
            });
        }
    });
})(),
//雾都僵尸镜像从以下开始
oMembraneZombieSP = InheritO(oMembraneZombie, {
    EName: "oMembraneZombieSP",
    CName: "魔法变装者",
    Speed: 1,
    HP: 1800,
    ResistInsta: 1,
    OAttack: 600,
    Attack: 600,
    height: 235,
    CardStars: 5,
    Lvl: 20,
    CanAppearFromTomb: false,  
    Almanac:{
        Tip:"为浓雾弃都庆典活动盛装的进阶僵尸。通常待在大后方，把植物变成南瓜。常优先锁定最右侧的植物。攻击力高。",
        Story:"又到了一年一度的浓雾弃都嘉年华！只有被伟大的僵王博士选中的少数精英才可以带领游行的队伍，而魔法变装者就被选中了！虽然他不知道该穿万圣节还是圣诞节的服饰好，但是僵王给了他一套有着万圣节能力的圣诞节服饰。",
    },
    getAlmanacDom(pro) {
        if (!pro.Almanac.Dom) {
            let ClassAlmanac = CZombies.prototype.Almanac;
            for (let i in ClassAlmanac) {
                if (!pro.Almanac[i]) {
                    pro.Almanac[i] = ClassAlmanac[i];
                }
            }
            let _width = pro.displayWidth ?? pro.width;
            let _height = pro.displayHeight ?? pro.height;
            pro.Almanac.Dom = pro.getDisplayHTML("", 140 - _width / 2, 420 - _height, "1;height:" + _height + "px;width:" + _width + "px", "block", "auto", pro.GetDTop, pro.PicArr[pro.StandGif]);
        }
    },
    getShadow(self) {
        return `left:${self.beAttackedPointL-30}px;top:${self.height-20}px;width:150px;background-size:150px 38px;height:38px;`;
    },
    GoingDieHead(id, PicArr, self) {
        return CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
            top: self.pixelTop + 90,
            left: self.X + 144,
            bc: self.pixelTop + 160,
            scale: 1.25,
        });
    },
    getExcited(intensity, duration_ = undefined) {
        let self = this;
        let ele = self.Ele;
        let duration = duration_ ?? 1200;
        let oldTimeStamp = self.FreeExcitedTime;
        let newTimeStamp = oSym.Now + duration;
        self.Speed *= intensity;
        self.Attack *= intensity;
        if (!oldTimeStamp) {
            NewImg(`buff_excited_${Math.random()}`, "images/Zombies/buff_excited.gif", "left:155px;top:205px;height:38px;z-index:5;", ele, {
                className: 'buff_excited'
            });
            !$User.LowPerformanceMode && EditCompositeStyle({
                ele: self.EleBody,
                styleName: 'filter',
                addFuncs: [
                    ['url', oSVG.getSVG('getExcited')]
                ],
                option: 2,
            });
        }
        if (oldTimeStamp < newTimeStamp) {
            self.FreeExcitedTime = newTimeStamp;
            oSym.addTask(duration, () => {
                if ($Z[self.id] && self.FreeExcitedTime === newTimeStamp) {
                    ClearChild(ele.querySelector('.buff_excited'));
                    self.FreeExcitedTime = 0;
                    self.Attack = self.OAttack;
                    self.Speed && (self.Speed = self.OSpeed);
                    !$User.LowPerformanceMode && EditCompositeStyle({
                        ele: self.EleBody,
                        styleName: 'filter',
                        delFuncs: [
                            ['url', oSVG.getSVG('getExcited')]
                        ],
                        option: 2
                    });
                }
            });
        }
    },
    getPlants() {
        let maxC = 0;
        //more likely to target rightmost plants
        //can target oApple
        for (let i of hasPlants(false, v => v.EName !== 'oBrains' && v.EName !== 'oLawnCleaner' && v.isPlant && v.PKind === 1)) {
            if (i.C > maxC) {
                maxC = i.C;
            }
        }
        return hasPlants(false, v => ((Math.random() < 0.85) ? v.C >= maxC : v.C > 0) && v.EName !== 'oBrains' && v.EName !== 'oLawnCleaner' && !v.Tools && v.isPlant && v.PKind === 1);
    },
    getDisplayHTML(id, wrapLeft, wrapTop, zIndex, display, clip, top, img) {
        const self = this;
        return `<div id="${id}" data-jng-constructor="${self.EName}" style="width:${self.displayWidth ?? self.width}px;height:${self.displayHeight ?? self.height}px;position:absolute;left:${wrapLeft}px;top:${wrapTop}px;z-index:${zIndex};display:${display};transform:scale(1.25)"><div class='Shadow' style="${self.getDisplayShadow(self)}"></div><img style="position:absolute;clip:rect(0,auto,${clip},0);top:30px;left:15px;" src="${img}"></div>`;
        //add scale(1.25) to enlarge
    },
    getFreezeCSS: _ => 'left:175px;top:215px;',
    Birth(json = {}) { //唤醒僵尸，注册$Z和oZ
        let self = this;
        if (!json.dont_set_original_value) { //不设置原始数据，例如OAttack,OSpeed之类，否则默认备份OAttack,OSpeed
            self.OAttack = self.Attack;
            self.OSpeed = self.Speed;
        }
        self.HeadTargetPosition = JSON.parse(JSON.stringify(self.HeadTargetPosition)); //深拷贝头部坐标，避免改的时候直接改成prototype的
        self.PicArr = self.PicArr.slice(); //复制一份数组，避免中途更改PicArr
        self.DiyConfigs = {};
        $Z[self.id] = self;
        oZ.add(self);
        let id = self.id;
        let ele = self.Ele = $(id);
        self.EleShadow = ele.firstChild;
        self.EleBody = ele.childNodes[1];
        if (self.ShieldHP > 0) {
            self.OShieldHP = self.ShieldHP;
            NewImg(`buff_shield_${Math.random()}`, "images/Zombies/buff_shield.png", self.getShadow(
                self) + "z-index:5;left:65px;top:60px;transform: scale(1);", ele, {
                className: 'buff_shield'
            });
        }
        if (oS.ZombieRandomSpeed && !self.isPuppet) {
            let delta = Math.Clamp(Math.Grandom(0, oS.ZombieRandomSpeed / 3), -oS.ZombieRandomSpeed / 3, oS.ZombieRandomSpeed / 3);
            self.Speed += delta;
            self.OSpeed += delta;
        }
        self.BirthCallBack(self);
        if (self.CanGoThroughWater && oGd.$GdType[self.R][Math.Clamp(GetC(self.ZX), 1, oS.C)] === 2) {
            self.ChkActs = self.GoThroughWater;
        }
        oSym.addTask(self.delayT, _ => {
            self.PicArr = self.PicArr.map(pic => oDynamicPic.checkOriginalURL(pic) ? oDynamicPic.require(pic, null, true) : oURL.removeParam(pic, "useDynamicPic"));
            IsHttpEnvi && ele.addEventListener("DOMNodeRemoved", (event) => {
                if (event.target === ele && (!ele.id || !$(ele.id))) {
                    setTimeout(self.RemoveDynamicPic.bind(self), 1);
                }
            });
            self.EleBody.src = self.PicArr[self.NormalGif];
            self.EleBody['style']['transform'] = 'scale(1.25)';
        });
    },
    GoLeft(o, R, arR, i,stepRatio=1) { //往左走的僵尸行动
        var Speed,
            AttackedRX,
            rV,
            id = o.id;
        if (o.X <= 645 && o.X > 630 && o.Speed < 1.4 && o.Speed != 0) {
            o.Speed = 0;
            $Z[id] && !o.isGoingDie && (o.isAttacking = 0, o.EleBody.src = o.PicArr[o.StandGif]);
            if (!o.isGoingDie && !o.isAttacking) {
                for (let conjtime = 0; conjtime < 9; conjtime++) { //stand still, conjure 8 times with 15s interval before moving again at 1.5 speed
                    oSym.addTask(1500 * conjtime, function() {
                        o.Conjure();
                        if (conjtime >= 8) {
                            o.Speed = 1.5;
                            $Z[id] && !o.isGoingDie && (o.isAttacking = 0, o.EleBody.src = o.PicArr[o.NormalGif]);
                        }
                    });
                }
            }
        }
        (o.isNotStaticed()) ? (
            !o.isGoingDie && !o.isAttacking && o.JudgeAttack(), //未临死，未攻击，进行攻击判断
            !o.isAttacking ? (
                (AttackedRX = o.AttackedRX -= (Speed = o.getRealSpeed(o,stepRatio))) < -50 ?
                (oZ.del(arR, i), o.DisappearDie(), rV = 0) : ( //向左走出屏幕，算作直接死亡，不排序只更新
                    //未走出屏幕，当右攻击点小于100的时候，进行移动判断
                    o.ZX = o.AttackedLX -= Speed,
                    $(id) != null && SetStyle($(id), {
                        left: (o.X -= Speed) + 'px'
                    }), //不知道为啥会出现没有$(id)的bug
                    rV = 1,
                    o.Conjure() //施法回调
                )
            ) : rV = 1
        ) : rV = 1;
        //检查场地事件
        o.ChkCell_GdType(o);
        return rV;
    },
    Conjure() {
        let obj = this;
        const id = obj.id;

        function drawALink(R, C, oldCanvas = null) {
            let pos = [obj.ZX, obj.pixelTop + 25];
            let currentPos = pos;
            let targetPos = [GetX(C), GetY(R) - 20];
            let theta = Math.atan2((targetPos[1] - currentPos[1]), (targetPos[0] - currentPos[0]));
            let delta = [Math.cos(theta), Math.sin(theta)];
            let canvas = oldCanvas ?? NewEle("Canvas_Magician" + Math.random(), "canvas", "position:absolute;z-index:" + 3 * (oS.R + 1) + ";pointer-events:none;left:0;top:0;widht:100%;height:100%;" + (!$User.LowPerformanceMode ? "filter:brightness(220%);" : ""), {
                width: 900,
                height: 600,
            }, FightingScene);
            let ctx = canvas.getContext("2d");
            let kk = 0;

            function RotatePaint(pic, x, y, width, height, rotate = 0, mirror = 0) {
                let dist = [x + width / 2, y + height / 2];
                ctx.save(); // 保存状态，以免影响其它物体
                ctx.translate(dist[0], dist[1]); // 将画布偏移到物体中心
                ctx.rotate(rotate); // 旋转角度
                ctx.translate(-dist[0], -dist[1]); // 将画布偏移回来
                if (mirror) {
                    let mx = x + width / 2;
                    ctx.translate(mx, 0);
                    ctx.scale(-1, 1);
                    ctx.translate(-mx, 0);
                }
                ctx.fillStyle = ["#000", "#fff"][kk ^= 1];
                ctx.drawImage(pic, x, y, width, height);
                // 坐标参考还原
                ctx.restore(); // 恢复状态
            }
            let distance = Math.sqrt(Math.pow(targetPos[1] - currentPos[1], 2) + Math.pow(targetPos[0] - currentPos[0], 2));
            let times = Math.max(2, Math.floor(distance / 80));
            let k = distance / times;
            let picPos = [];
            while (times-- > 0) {
                let randLength = k;
                distance -= randLength;
                picPos.push({
                    x: currentPos[0],
                    y: currentPos[1],
                    width: randLength,
                    rotate: theta
                });
                currentPos[1] += delta[1] * randLength;
                currentPos[0] += delta[0] * randLength;
            }
            for (let t = 0; t < picPos.length; t++) {
                let i = picPos[t];
                //想改的时候自己根据数学推导一下，a里面的那个-i.width/2和37.5/2为宽度和高度的一半，帮忙把旋转原点和锚点变成坐标中心点用的，然后10*delta[1/0]是因为闪电图片的中心不在中间，需要增加一个偏移量
                //然后delta[0]*i.width/2为把图片的锚点挪到图片(中心，顶端)用的
                let a = [-i.width / 2 + 10 * delta[1], -37.5 / 2 - 10 * delta[0]];
                if (t === 0) {
                    RotatePaint(obj.ElecPic[1], i.x + delta[0] * i.width / 2 + a[0], i.y + delta[1] * i.width / 2 + a[1], i.width, 37.5, i.rotate, 0);
                } else {
                    RotatePaint(obj.ElecPic[0], i.x + delta[0] * i.width / 2 + a[0], i.y + delta[1] * i.width / 2 + a[1], i.width, 37.5, i.rotate, Math.floor(Math.random() * 2));
                }
            }
            return canvas;
        }
        if (!$Z[id]) return;
        let arrPlants = obj.getPlants();
        obj.Pianyi++; //更新偏移
        if (obj.AttackedLX <= oS.W + 80 && !obj.isAttacking && !obj.isGoingDie && obj.Pianyi >= 190 && arrPlants.length > 0) { //判定是否释放膜法
            obj.Pianyi = 0; //重置计数器
            obj.isAttacking = 2; //标记正在施法，确保僵尸停止运动
            obj.EleBody.src = obj.PicArr[obj.ConjureGif];
            oAudioManager.playAudio('conjure');
            oSym.addTask(300, _ => { //300
                //随机变一株植物为挨炮
                let aPlant = arrPlants.random(),
                    {
                        R,
                        C
                    } = aPlant;
                if ($P[aPlant.id]?.Immediately === false && $Z[id]) {
                    aPlant.Die('JNG_TICKET_MembraneZombie');
                    CustomSpecial(oPumpkinHead, R, C);
                    let canvas = drawALink(R, C),
                        ctx = canvas.getContext("2d");
                    if (!$User.LowPerformanceMode) {
                        for (let i = 0; i < 3; i++) {
                            oSym.addTask(2 * i, () => {
                                if (!$(canvas.id)) {
                                    return;
                                }
                                ctx.clearRect(0, 0, 900, 600);
                                drawALink(R, C, canvas);
                            });
                        }
                    }
                    let img_index = Math.floor(Math.random() * 4);
                    let elecEffect = NewEle("", "img", `position:absolute;z-index:${3*R+2};left:${GetX(C)}px;top:${GetY(R)}px;transform: translate(-50%, -65%) scale(0.5);`, {
                        src: obj.PicArr[obj.ElectricShockGif + img_index]
                    }, FightingScene);
                    if (!$User.LowPerformanceMode) {
                        elecEffect.style.filter = "brightness(200%)";
                    }
                    oSym.addTask(80, ClearChild, [elecEffect]);
                    {
                        let json = $User.LowPerformanceMode ? {
                            opacity: 0
                        } : {
                            filter: "initial",
                            opacity: 0
                        };
                        oEffects.Animate(canvas, json, 0.3 / oSym.NowSpeed, "linear", ClearChild, 0.1 / oSym.NowSpeed);
                    };
                    oEffects.ImgSpriter({
                        ele: NewEle(id + '_Effect', "div", `position:absolute;z-index:${R*3+2};width:208px;height:198px;left:${80*C}px;top:${30+100*(R-1)}px;background:url(images/Zombies/MembraneZombie/effect.png) no-repeat;`, 0, EDPZ),
                        styleProperty: 'X',
                        changeValue: -209,
                        frameNum: 13,
                        interval: 9,
                    });
                }
            });
            oSym.addTask(390, _ => //恢复 390
                $Z[id] && !obj.isGoingDie && (obj.isAttacking = 0, obj.EleBody.src = obj.PicArr[(obj.Speed != 0) ? obj.NormalGif : obj.StandGif])
            );
        }
    },
    Bounce() {},
    getCharredCSS: (self) => ({
        top: 112 + self.DivingDepth / 1.5,
        left: 158,
        transform: "scale(1.25)",
        clip: self.DivingDepth > 0 ? "rect(0px, auto, 95px, 0px)" : "",
    }),
    JudgeAttack(stepRatio=1) {
        let self = this;
        let ZX = self.ZX;
        let crood = self.R + "_";
        let C = GetC(ZX);
        let G = oGd.$;
        let arr = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
        if (arr && self.Altitude === 1) { //地上的僵尸才能检测攻击
            !self.isAttacking && (self.isAttacking = 1, self.EleBody.src = self.PicArr[self.AttackGif]); //如果是首次触发攻击，需要更新到攻击状态
            self.NormalAttack(...arr); //实施攻击
        } else {
            //撤销攻击状态
            self.isAttacking && (self.isAttacking = 0, self.EleBody.src = self.PicArr[(self.Speed != 0) ? self.NormalGif : self.StandGif]);
        }
    },
}),
oBeetleCarZombieSP = InheritO(oBeetleCarZombie, {
    EName: "oBeetleCarZombieSP",
    CName: "甲壳虫女王",
    HP: 6500,
    ResistInsta: 1,
    height: 220,
    Speed: 4,
    OSpeed: 4,
    skilltime: 0,
    CardStars: 5,
    getShadow: self => `position: absolute;width: 231px;height: 44px;left: 15px;background:url(images/Zombies/BeetleCarZombie/Shadow.png);top: 190px;background-size: 100% 120%;`,
    beAttackedPointL: 20,
    beAttackedPointR: 200,
    BackwardsGif: 7,
    Lvl: 50,
    PicArr: (function() {
        let path = "images/Zombies/BeetleCarZombie/",
            b = "images/Zombies/Zomboni/";
        return [path + "Idle.webp", path + 'Walk.webp', path + 'Release.webp', path + 'FlatTire.webp', path + 'Die.webp', path + 'Exhaust.png', path + 'Shadow.png', path + 'Backwards.webp', b + "ice_n.webp", b +
            "ice_m.webp", b + "ice_cap_n.webp", b + "ice_cap_m.webp", b + 'BoomDie.webp'
        ];
    })(),
    AudioArr: ["zamboni", "cucaracha", "beetle_crash", "shieldhit", "shieldhit2", "beetle", 'beetleCarDie'],
    flatTire() {},
    Almanac:{
        Tip:"带领浓雾弃都游行队伍的升级版甲壳虫车僵尸。拥有着冰车僵尸的特性以及无法被刺穿的加固车轮。<br/><br/>技能1：高速冲向你的防线。每用前轮撞到植物就会减速。要倒车后才能再次加速，同时回血。<br/>技能2：发射导弹摧毁植物，同时生成僵尸。<br/>技能3：在后方生成僵尸。产生气体，立即使后面及在附近线上的僵尸加速并冲前。",
        Speed:"快",
        Story:"甲壳虫车僵尸很喜欢4个一组行动，由甲壳虫女王领队。他们管自己叫“蚾头四”，整晚用着大喇叭播老歌。",
    },
    getAlmanacDom(pro) {
        if (!pro.Almanac.Dom) {
            let ClassAlmanac = CZombies.prototype.Almanac;
            for (let i in ClassAlmanac) {
                if (!pro.Almanac[i]) {
                    pro.Almanac[i] = ClassAlmanac[i];
                }
            }
            let _width = pro.displayWidth ?? pro.width;
            let _height = pro.displayHeight ?? pro.height;
            pro.Almanac.Dom = pro.getDisplayHTML("", 200 - _width / 2, 450 - _height, "1;height:" + _height + "px;width:" + _width + "px", "block", "auto", pro.GetDTop, pro.PicArr[pro.StandGif]);
        }
    },
    getDisplayHTML(id, wrapLeft, wrapTop, zIndex, display, clip, top, img) {
        const self = this;
        return `<div id="${id}" data-jng-constructor="${self.EName}" style="width:${self.displayWidth ?? self.width}px;height:${self.displayHeight ?? self.height}px;position:absolute;left:${wrapLeft}px;top:${wrapTop}px;z-index:${zIndex};display:${display};transform:scale(1.25)"><div class='Shadow' style="${self.getDisplayShadow(self)}"></div><img style="position:absolute;clip:rect(0,auto,${clip},0);top:20px" src="${img}"></div>`;
        //add scale(1.25) to enlarge
    },
    getCrushed() { //reduces damage received by lawn mower
        this.getHit(this,50);
    },
    Birth(json = {}) { //唤醒僵尸，注册$Z和oZ
        let self = this;
        if (!json.dont_set_original_value) { //不设置原始数据，例如OAttack,OSpeed之类，否则默认备份OAttack,OSpeed
            self.OAttack = self.Attack;
            self.OSpeed = self.Speed;
        }
        self.HeadTargetPosition = JSON.parse(JSON.stringify(self.HeadTargetPosition)); //深拷贝头部坐标，避免改的时候直接改成prototype的
        self.PicArr = self.PicArr.slice(); //复制一份数组，避免中途更改PicArr
        self.DiyConfigs = {};
        $Z[self.id] = self;
        oZ.add(self);
        let id = self.id;
        let ele = self.Ele = $(id);
        self.EleShadow = ele.firstChild;
        self.EleBody = ele.childNodes[1];
        if (self.ShieldHP > 0) {
            self.OShieldHP = self.ShieldHP;
            NewImg(`buff_shield_${Math.random()}`, "images/Zombies/buff_shield.png", self.getShadow(
                self) + "z-index:5;left:65px;top:60px;transform: scale(1);", ele, {
                className: 'buff_shield'
            });
        }
        if (oS.ZombieRandomSpeed && !self.isPuppet) {
            let delta = Math.Clamp(Math.Grandom(0, oS.ZombieRandomSpeed / 3), -oS.ZombieRandomSpeed / 3, oS.ZombieRandomSpeed / 3);
            self.Speed += delta;
            self.OSpeed += delta;
        }
        self.BirthCallBack(self);
        if (self.CanGoThroughWater && oGd.$GdType[self.R][Math.Clamp(GetC(self.ZX), 1, oS.C)] === 2) {
            self.ChkActs = self.GoThroughWater;
        }
        oSym.addTask(self.delayT, _ => {
            self.PicArr = self.PicArr.map(pic => oDynamicPic.checkOriginalURL(pic) ? oDynamicPic.require(pic, null, true) : oURL.removeParam(pic, "useDynamicPic"));
            IsHttpEnvi && ele.addEventListener("DOMNodeRemoved", (event) => {
                if (event.target === ele && (!ele.id || !$(ele.id))) {
                    setTimeout(self.RemoveDynamicPic.bind(self), 1);
                }
            });
            self.EleBody.src = self.PicArr[self.NormalGif];
            self.EleBody['style']['transform'] = 'scale(1.25)'; //add scale(1.25) to enlarge
        });
    },
    JudgeIce: function() { //冰道后续机制
        let R = this.R,
            dIceCar = $("dIceCar" + R),
            $Ice = oGd.$Ice[R],
            $Crater = oGd.$Crater;
        //如果现在当前行已经没冰车了，激活清除程序
        $Ice && (--$Ice[0]) <= 0 && oSym.addTask(3000, _ => {
            let leftBorderC = $Ice[1];
            $Ice = oGd.$Ice[R];
            if ($Ice && $Ice[0] <= 0 && dIceCar) {
                oEffects.fadeOut(dIceCar, 'fast', ClearChild);
                while (leftBorderC < 11) {
                    delete $Crater[R + "_" + leftBorderC];
                    oGd.unlockGrid(R, leftBorderC);
                    leftBorderC++;
                }
                delete oGd.$Ice[R];
            }
        });
    },
    JudgeAttack: function() {
        var f = this,
            c = f.ZX,
            d = f.R + "_",
            e = GetC(c),
            g = oGd.$,
            b;
        if (b = f.JudgeLR(f, d, e, c, g) || f.JudgeSR(f, d, e, c, g)) {
            f.NormalAttack(b[0], b[1]);
            if (GetC(f.X) <= 7) { //the charging attack
                oAudioManager.playAudio('beetle_crash');
                if (f.Speed - 1.4 >= 1) {
                    f.Speed -= 1.4;
                } //when a plant is crushed by its front wheels, lower speed by 1.4
                else { //after speed is lowered too much, speed becomes 0
                    f.EleBody.src = f.PicArr[f.StandGif];
                    f.Speed = 0;
                }
            }
        }
    },
    ChkActs: function(self, R, arR, i,stepRatio=1) {
        if (oGd.$GdType[R][GetC(self.AttackedLX + 40)] == 2) {
            self.NormalDie();
            return 1;
        }
        if (self.isNotStaticed()) {
            let Speed, AttackedRX, rV, BigDiv,
                ArIce = oGd.$Ice[R], //当前行的冰道数据
                X, X1, X2, C,
                dIceCar = $('dIceCar' + R);
            if ((AttackedRX = self.AttackedRX -= (Speed = self.Speed * self.SpeedCoefficient*stepRatio)) < -50) {
                oZ.del(arR, i);
                self.DisappearDie();
                rV = 0;
            } else {
                self.ZX = (self.AttackedLX -= Speed);
                SetStyle(self.Ele, {
                    left: (self.X -= Speed) + 'px'
                });
                rV = 1;
            }
            if (!self.isReleasing) {
                !self.isGoingDie && self.Speed && self.JudgeAttack();
                X = self.X;
                X1 = X + 170; //制冰点的X坐标
                X2 = X + 40; //裁剪距离
                C = GetC(X1 + 19);
                if (C > -1 && ArIce && C < ArIce[1]) {
                    //当冰车的列比冰道小，则锁定当前列的格子
                    oGd.$Crater[R + '_' + C] = true;
                    oGd.$LockingGrid[R + "_" + C] = true;
                    let PData;
                    for (let i = 0; i <= PKindUpperLimit; i++) {
                        if (PData = oGd.$[`${R}_${C}_${i}`]) {
                            PData.getHurt(self, 2, self.Attack);
                        }
                    }
                    ArIce[1] = C; //保存当前行的冰车道最左到达了哪一列                    
                }
                if (X1 > 120 && ArIce && X1 < ArIce[2]) {
                    ArIce[2] = X1;
                    dIceCar && (dIceCar.firstChild.style['clip'] = "rect(0,auto,auto," + X2 + "px)",
                        dIceCar.childNodes[1].style.left = Math.max(0, X2) + 'px');
                }
                if (self.skilltime < 3) {
                    if (GetC(X) <= 7) {
                        self.Release(self, self.Speed);
                    }
                } else {
                    if (GetC(X) < 12) { //after skill is activated 3 times, go backwards until it reaches column 12
                        if (self.Speed > -1) self.EleBody.src = self.PicArr[self.BackwardsGif];
                        self.Speed = -3;
                    } else { //then restores HP and repeats the charging attack
                        self.HP+=1000;
                        oAudioManager.playAudio('beetle');
                        oAudioManager.playAudio('cucaracha');
                        self.Speed = 4;
                        self.EleBody.src = self.PicArr[self.NormalGif];
                        self.skilltime = 0;
                    }
                }
            }
            //检查场地事件
            self.ChkCell_GdType(self);
            return rV;
        }
        return 1;
    },
    BirthCallBack(self) {
        oAudioManager.playAudio('zamboni');
        oAudioManager.playAudio('cucaracha');
        let delayT = self.delayT;
        let id = self.id;
        let ele = self.Ele = $(id);
        let R = self.R;
        let $Ice = oGd.$Ice;
        self.EleShadow = ele.firstChild;
        self.EleBody = ele.childNodes[1];
        //如果此行不存在冰道数据
        if (!$Ice[R] || !$("dIceCar" + R)) {
            let wrap = NewEle("dIceCar" + R, "div",
                `position:absolute;z-index:1;left:145px;top:${GetY(R) - 80}px;width:800px;height:72px`,
                0, EDPZ);
            NewEle(`Ice_${R}`, 'div',
                `position:absolute;width:800px;height:72px;left:5px;clip:rect(0,auto,auto,800px);background:url(images/Zombies/Zomboni/ice_${oS.DKind ? 'm' : 'n'}.webp) repeat-x`,
                null, wrap);
            NewImg(`Ice_Cap_${R}`, `images/Zombies/Zomboni/ice_cap_${oS.DKind ? 'm' : 'n'}.webp`,
                "position:absolute;left:956px;", wrap);
            $Ice[R] = [1, 11, self.X + 150]; //第二个参数为制冰点X坐标，并不是AttackedLX，这里做出修改
        } else {
            ++$Ice[R][0];
        }
        if (delayT) {
            oSym.addTask(delayT, () => {
                self.freeStaticEffect(self, "SetBody");
                $Z[id] && SetBlock(ele);
            });
        } else {
            SetBlock(ele);
        }
    },
    Release(self, speed) {
        const id = self.id;
        const X = self.X;
        self.changingX += 1; //every time this function is called, changingX gets increased
        if (self.changingX >= 80 && self.skilltime < 3 && speed < 3) { //once changingX reaches 80 and the boss isn't fully charging, activate skill and reset changingX
            self.isReleasing = 1;
            self.changingX = 0;
            self.Speed = 0;
            if (1 + Math.round(Math.random() * 2) !== 2) { //randomly selects between shooting missiles and speeds up zombies
                for (let tem = 0; tem < 2; tem++) {
                    PlaceZombie([oConeheadZombie, oBucketheadZombie, oFootballZombie, oCaskZombie, oNewspaperZombie, oMakeRifterZombie, oCigarZombie, oSadakoZombie, oMembraneZombie, oSculptorZombie, oPushIceImp].random(), [1, 2, 3, 4, 5].random(), 9, 1);
                }
                oAudioManager.playAudio('beetle');
                self.EleBody.src = self.PicArr[self.ReleaseGif];
                oSym.addTask(100, () => {
                    if (!$Z[id]) return;
                    oEffects.ImgSpriter({
                        ele: NewEle(self.id + '_Exhaust', "div", `pointer-events:none;position:absolute;z-index:${self.zIndex+2};width:255px;height:216px;left:${self.X+230}px;top:${self.pixelTop+23}px;background:url(images/Zombies/BeetleCarZombie/Exhaust.png) no-repeat;`, 0, EDPZ),
                        changeValue: -255,
                        frameNum: 58,
                    });
                    let zombieArr = [];
                    for (let ro = self.R - 1; ro <= self.R + 1; ro++) {
                        if (ro > 0 && ro < 6) zombieArr = zombieArr.concat(oZ.getArZ(self.AttackedRX + 5, 880, ro));
                    }
                    zombieArr.forEach(zombie => zombie.Bounce({
                        distance: -1,
                        velocity: -2,
                    }));
                    //傀儡不加速
                    zombieArr.forEach(zombie => !zombie.isPuppet && zombie.getExcited(1.4));
                });
            } else {
                if (speed > 0) self.EleBody.src = self.PicArr[self.StandGif];
                let R = self.R,
                    pos = 1,
                    pixelTop = self.pixelTop + 50,
                    zIndex = self.zIndex - 1,
                    upele = NewEle(0, "div", "position:absolute;");
                NewImg(0, "images/Props/Missile/Missile.webp", "transform:rotate(180deg)", upele);
                EditEle(upele, {
                    id: id
                }, {
                    left: (self.X + 85) + "px",
                    top: pixelTop + "px",
                    'z-index': zIndex
                }, EDPZ);
                oAudioManager.playAudio("missileshoot");
                oSym.addTask(70, function move() {
                    if (pixelTop > -100) {
                        upele.style.top = (pixelTop = pixelTop - (pos++)) + 'px';
                        oSym.addTask(1, move);
                    } else {
                        ClearChild(upele);
                    }
                });
                oSym.addTask(90, _ => {
                    oAudioManager.playAudio("missilefall");
                });
                oSym.addTask(120,
                    function(d) {
                        let arrZ = [oZombie, oBalloonZombie, oSkatingZombie, oStrollZombie, oConeheadZombie];
                        let arrP = hasPlants(true, v => v.C > 3 && v.C < 7);
                        if (arrP.length < 2) {
                            let R1 = [1, 3, 5].random();
                            let R2 = [2, 4].random();
                            let C = [4, 5, 6].random();
                            CustomSpecial(oMissile, R1, C);
                            CustomSpecial(oMissile, R2, C);
                            oSym.addTask(150, _ => {
                                PlaceZombie(arrZ.random(), R1, C, 1);
                                PlaceZombie(arrZ.random(), R2, C, 1);
                            });
                        } else {
                            for (let is = 0; is < 2; is++) {
                                let Select = parseInt(Math.random() * arrP.length);
                                let ssd = 0;
                                for (let i of arrP) {
                                    if (ssd == Select) {
                                        CustomSpecial(oMissile, i.R, i.C);
                                        oSym.addTask(150, _ => {
                                            PlaceZombie(arrZ.random(), i.R, i.C, 1);
                                        });
                                    }
                                    ssd++;
                                }
                            }
                        }
                    }
                );
            }
            oSym.addTask(204, () => {
                if ($Z[id]) {
                    self.Speed = speed;
                    self.EleBody.src = self.PicArr[(self.Speed != 0) ? self.NormalGif : self.StandGif];
                    self.skilltime++;
                    self.isReleasing = 0;
                }
            });
        }
    },
    PrivateDie: self => self.JudgeIce(),
}),
oGargantuarSP = InheritO(oGargantuar, {
    EName: "oGargantuarSP",
    CName: "市郊矮人",
    CardStars: 5,
    HP: 10000,
    changingX: 0,
    height: 330,
    getShadow: _ => "left:220px;top:295px;transform:scale(1.5);",
    getFreezeCSS: _ => 'left:220px;top:308px;',
    throwedImp: true,
    SubsidiaryZombies: [],
    ResistInsta: 1,
    skillno: 1,
    OSpeed: 2.5,
    Speed: 2.5,
    AudioArr: (_ => {
        return ["Gargantuar_walk", "lowgroan", "lowgroan2", "gargantuar_thump", "gargantuar_charging"];
    })(),
    PicArr: (path => {
        return ["", "", path + "walk0.webp", path + 'crush0.webp', path + "throw.webp", path + 'die0.webp', path + 'Head.webp', path + 'idle0.webp'].concat([path + "walk0.webp", path + 'crush0.webp', "", path + 'die0.webp', 'images/Plants/SporeShroom/Effect.webp', path + 'shieldingrange.webp']);
    })("images/Zombies/Gargantuar/"),
    GoingDieHead(id, PicArr, self) {
        CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
            top: self.pixelTop + 90,
            left: self.X + 194.5,
            bc: self.pixelTop + 320.5,
            scale: 0.65,
        });
    },
    getDisplayHTML(id, wrapLeft, wrapTop, zIndex, display, clip, top, img) {
        const self = this;
        return `<div id="${id}" data-jng-constructor="${self.EName}" style="width:${self.displayWidth ?? self.width}px;height:${self.displayHeight ?? self.height}px;position:absolute;left:${wrapLeft}px;top:${wrapTop}px;z-index:${zIndex};display:${display};transform:scale(0.65)"><div class='Shadow' style="left:220px;top:380px;transform:scale(1.5);"></div><img style="position:absolute;clip:rect(0,auto,${clip},0);top:20px" src="${img}"></div>`;
        //add scale(0.65) to make it smol
    },
    getCrushed() { //reduces damage received by lawn mower
        this.getHit(this, 50);
    },
    getButter() {},
    getFreeze(freezeKeepTime = 0, slowKeepTime = 1500) { //the only change here is freezeKeepTime is always 0
        const self = this;
        if (!$Z[self.id] || self.ShieldHP > 0 || self.isGoingDie || self.Altitude === 3) {
            return;
        }
        self.getPea(self, 20, 0);
        self.getSlow(self, freezeKeepTime + slowKeepTime);
    },
    BirthCallBack(self) {
        let delayT = self.delayT;
        let id = self.id;
        let ele = self.Ele = $(id);
        self.EleShadow = ele.firstChild;
        self.EleBody = ele.childNodes[1];
        self.EleShadow.style = self.getShadow(self);
        if (delayT) {
            oSym.addTask(delayT, _ => {
                self.freeStaticEffect(self, "SetBody");
                $Z[id] && callback();
            });
        } else {
            callback();
        }

        function callback() {
            let p = self.PicArr[3].split(".");
            p = (p[p.length - 2] += "0", p.join("."));
            SetBlock(ele);
            oDynamicPic.require(p, self.EleBody);
            self.changePic(self, self.NormalGif);
            //add scale(0.65) to make it smol
            self.EleBody['style']['transform'] = 'scale(0.65)';
            oSym.addTask(80, function a(times = 0) {
                if ($Z[self.id] && !self.isGoingDie && times <= 10) {
                    if (!self.isAttacking && self.isNotStaticed()) {
                        let walkAudio = oAudioManager.playAudio("Gargantuar_walk", false, Math.max(0, Math.min(10 / times - 1, 1)));
                        times++;
                        oSym.addTask(93, a, [times]);
                    }
                }
            });
        }
    },

    //The only change to all of these 4 Go functions is the o.Skill being called every time the zombie manages to walk
    GoLeft(o, R, arR, i, stepRatio = 1) { //向左走
        let Speed = o.getRealSpeed(o, stepRatio);
        let hookKey = 1;
        if (o.isNotStaticed()) { //如果僵尸没有处于冰冻或者等待出场状态
            //未临死，未攻击，进行攻击判断
            !o.isAttacking && !o.isGoingDie && o.JudgeAttack(stepRatio);
            if (!o.isAttacking) {
                o.MoveZombieX(o, Speed);
                //向左走出屏幕，算作直接死亡，不排序只更新
                if (o.AttackedRX < -50) {
                    oZ.del(arR, i);
                    o.DisappearDie();
                    hookKey = 0;
                } else { //正常移动僵尸
                    o.Paint(o);
                    o.Skill(o, o.Speed);
                }
            }
        }
        //检查场地事件
        o.ChkCell_GdType(o);
        // hookKey的作用：
        // hookKey=1, 表示僵尸现在正常存活，需要系统重排oZ.$
        // hookKey = 0, 表示僵尸死亡，不需要系统重排oZ.$
        return hookKey;
    },
    GoRight(o, R, arR, i, stepRatio = 1) { //往右走的僵尸行动
        let Speed;
        let rV = 1;
        let id = o.id;
        if (o.isNotStaticed()) {
            //未临死，未攻击，进行攻击判断
            !o.isGoingDie && !o.isAttacking && o.JudgeAttack(stepRatio);
            if (!o.isAttacking) {
                //向右走出屏幕，算作直接死亡，不排序只更新
                if (o.X > oS.W) {
                    oZ.del(arR, i);
                    o.DisappearDie();
                    rV = 0;
                } else {
                    o.MoveZombieX(o, (Speed = o.getRealSpeed(o, stepRatio)), false);
                    o.Paint(o);
                    o.Skill(o, o.Speed);
                }
            }
        }
        //检查场地事件
        o.ChkCell_GdType(o);
        return rV;
    },
    GoDown(o, R, arR, i, stepRatio = 1, isInWaterPath = false) { //向下走
        let rV = 1;
        let newR = o.R + 1;
        let id = o.id;
        if (o.isNotStaticed()) {
            !o.isGoingDie && !o.isAttacking && o.JudgeAttack(stepRatio);
            if (!o.isAttacking) {
                SetStyle(o.Ele, {
                    top: (o.pixelTop += o.getRealSpeed(o, stepRatio)) + 'px',
                });
                // 这里需要针对围歼战和水道采用两套判定，原因有二：
                // 1. 原先挨炮画的地图和严格按数值对位画出来的镜花水月地图之间是存在一定误差的。
                // 2. 围歼战拐弯和水道拐弯的判定实现方式有所差异。
                if (
                    isInWaterPath ?
                    (o.pixelTop + o.height - (isInWaterPath ? 35 : -10) >= GetY(R)) :
                    (o.pixelTop + o.height - o.GetDY() >= GetY(newR))
                ) {
                    oZ.moveTo(id, o.R, newR);
                }
                o.Skill(o, o.Speed);
            }
        }
        o.ChkCell_GdType(o);
        return rV;
    },
    GoUp(o, R, arR, i, stepRatio = 1, isInWaterPath = false) {
        let rV = 1;
        let newR = o.R - 1;
        let id = o.id;
        if (o.isNotStaticed()) {
            !o.isGoingDie && !o.isAttacking && o.JudgeAttack(stepRatio);
            if (!o.isAttacking) {
                SetStyle(o.Ele, {
                    top: (o.pixelTop -= o.getRealSpeed(o, stepRatio)) + 'px',
                });
                if (o.pixelTop + o.height <= GetY(newR) + (isInWaterPath ? 0 : o.GetDY())) {
                    oZ.moveTo(id, o.R, newR);
                }
                o.Skill(o, o.Speed);
            }
        }
        o.ChkCell_GdType(o);
        return rV;
    },

    Skill(self, speed) {
        const id = self.id;
        const X = self.ZX,
            R = self.R,
            C = GetC(X);
        self.changingX += speed;
        if (C > 9) {
            return self.changingX = 0;
        }
        if (self.changingX >= 100) {
            let aud = "lowgroan" + ["", 2].random();
            let aud_prom = oAudioManager.playAudio(aud);
            self.changingX = 0;
            self.isAttacking = 1;

            switch (self.skillno) {
                case 1:
                    self.changePic(self, self.AttackGif);
                    oSym.addTask(100, function() {
                        if (self && self.isAttacking === 1) {
                            let z = PKindUpperLimit,
                                p;
                            while (z >= 0) {
                                p = oGd.$[`${R}_${C}_${z}`];
                                if (p && p.isPlant) {
                                    p.getHurt(self, 1, self.Attack);
                                    if (oGd.$GdType[R][C] !== 2) {
                                        CustomSpecial(oRifter, R, C); //创建冰窟
                                        const effect = NewEle(self.id + "Effect", "div", `position:absolute;z-index:${self.zIndex - 1};width:631px;height:481px;left:${self.ZX-365.5}px;top:${self.pixelTop+self.height-370.5}px;background:url(${self.PicArr[self.EffectGif]});`, 0, EDPZ);
                                        oSym.addTask(20, ClearChild, [effect]);
                                    }
                                }
                                z--;
                            }
                            oGd.killAll(R, C, 'JNG_TICKET_Gargantuar');
                            oEffects.ScreenShake();
                            for (let row = (R == 1 ? R : R - 1); row <= (R == 5 ? R : R + 1); row++) {
                                let arr = hasPlants(true, v => (self.WalkDirection ? v.C >= C : v.C < C) && v.R == row && !v.Tools && v.PKind != 5);
                                let plant = arr[Math.floor(Math.random() * arr.length)];
                                if (plant && oGd.$GdType[row][plant.C] !== 2) { //prioritize tiles with plants
                                    if (Math.random() < 0.5 || plant.C < 4) {
                                        CustomSpecial(oRifterAnimate, row, plant.C);
                                    } else {
                                        PlaceZombie(oSculpture, row, plant.C);
                                    }
                                } else {
                                    let arrc = [];
                                    for (let co = (self.WalkDirection ? 9 : 1);
                                        (self.WalkDirection ? co >= C : co <= C);
                                        (self.WalkDirection ? co-- : co++)) { //check for valid columns
                                        if (oGd.$GdType[row][co] !== 2 && !oGd.$LockingGrid[row + "_" + co]) {
                                            arrc.push(co);
                                        }
                                    }
                                    let col = arrc[Math.floor(Math.random() * arrc.length)];
                                    if (Math.random() < 0.5 || col < 4) {
                                        col && CustomSpecial(oRifterAnimate, row, col);
                                    } else {
                                        col && PlaceZombie(oSculpture, row, col);
                                    }
                                }
                            }
                            oAudioManager.playAudio("Gargantuar_crush");
                        }
                    });
                    break;

                case 2:
                    self.EleBody.src = self.PicArr[7];
                    let loop = 1,
                        rangeele = NewImg(`shieldingrange_${Math.random()}`, self.PicArr[13], `left:${self.AttackedLX - 160}px;top:${self.R*100-125}px;opacity:0;z-index:-1`, EDPZ);
                    animloop();

                    function animloop() {
                        oSym.addTask(70 * oSym.NowSpeed, _ => {
                            oAudioManager.playAudio("gargantuar_charging");
                            oEffects.Animate(rangeele, {
                                opacity: 0.5,
                            }, 0.5, null, ((!self.isGoingDie && loop) ? null : ClearChild(rangeele)));
                        });
                        rangeele && oSym.addTask(140 * oSym.NowSpeed, _ => {
                            oEffects.Animate(rangeele, {
                                opacity: 0,
                            }, 1, null, ((!self.isGoingDie && loop) ? animloop() : ClearChild(rangeele)));
                        });
                    }
                    oSym.addTask(1250, _ => {
                        loop--;
                        !self.isGoingDie && self.changePic(self, self.AttackGif);
                        oSym.addTask(100, function() {
                            if (self && self.isAttacking === 1 && !self.isGoingDie) {
                                let z = PKindUpperLimit,
                                    p;
                                while (z >= 0) {
                                    p = oGd.$[`${R}_${C}_${z}`];
                                    if (p && p.isPlant) {
                                        p.getHurt(self, 1, self.Attack);
                                        if (oGd.$GdType[R][C] !== 2) {
                                            CustomSpecial(oRifter, R, C); //创建冰窟
                                            const effect = NewEle(self.id + "Effect", "div", `position:absolute;z-index:${self.zIndex - 1};width:631px;height:481px;left:${self.ZX-365.5}px;top:${self.pixelTop+self.height-370.5}px;background:url(${self.PicArr[self.EffectGif]});`, 0, EDPZ);
                                            oSym.addTask(20, ClearChild, [effect]);
                                        }
                                    }
                                    z--;
                                }
                                oGd.killAll(R, C, 'JNG_TICKET_Gargantuar');
                                oAudioManager.playAudio("Gargantuar_crush");
                                let arrz = [],
                                    floorR = R > 1 ? R - 1 : 1,
                                    ceilingR = R < oS.R ? R + 1 : oS.R,
                                    leftBorder = self.AttackedLX - 160,
                                    rightBorder = self.AttackedRX + 160;
                                do {
                                    arrz = arrz.concat(oZ.getArZ(leftBorder, rightBorder, floorR));
                                } while (floorR++ < ceilingR);

                                for (let i = 1; i <= 3; i++) { //gives hit shields to 3 random zombies in range
                                    let success = 0;
                                    while (success < 1 && arrz) {
                                        let rand = Math.floor(Math.random() * arrz.length),
                                            zombie = arrz[rand];
                                        if (!zombie) break;
                                        if (!zombie.isPuppet && zombie.EName != "oGargantuarSP") {
                                            zombie.getShield(zombie, 10);
                                            success++;
                                        }
                                        arrz.splice(rand, 1);
                                    }
                                }
                            }
                        });
                    });
                    break;

                case 3:
                    self.changePic(self, self.AttackGif);
                    oSym.addTask(100, function() {
                        if (self && self.isAttacking === 1) {
                            let z = PKindUpperLimit,
                                p;
                            while (z >= 0) {
                                p = oGd.$[`${R}_${C}_${z}`];
                                if (p && p.isPlant) {
                                    p.getHurt(self, 1, self.Attack);
                                    if (oGd.$GdType[R][C] !== 2) {
                                        CustomSpecial(oRifter, R, C); //创建冰窟
                                        const effect = NewEle(self.id + "Effect", "div", `position:absolute;z-index:${self.zIndex - 1};width:631px;height:481px;left:${self.ZX-365.5}px;top:${self.pixelTop+self.height-370.5}px;background:url(${self.PicArr[self.EffectGif]});`, 0, EDPZ);
                                        oSym.addTask(20, ClearChild, [effect]);
                                    }
                                }
                                z--;
                            }
                            oGd.killAll(R, C, 'JNG_TICKET_Gargantuar');
                            let time = 0;
                            for (let row = (R == 1 ? R : R - 1); row <= (R == oS.R ? R : R + 1); row++) {
                                let col = [C - 1, C, C + 1].shuffle();
                                for (let i = 0; i < 2; i++) {
                                    if ((Math.random() > 0.5 || row == R + 1) && time < (C>3?4:2)) {
                                        let z = PlaceZombie([oZombie, oSkatingZombie, oImp, oSadakoZombie, oBalloonZombie].random(), row, col[i]);
                                        z.ShieldHP += 5;
                                        time++;
                                    }
                                }
                            }
                            oAudioManager.playAudio("shield_get");
                            oAudioManager.playAudio("Gargantuar_crush");
                        }
                    });
                    break;

                default:
                    self.skillno = 1;
                    break;
            }
        }
        if (self && !self.isGoingDie && self.isNotStaticed() && self.isAttacking === 1) {
            oSym.addTask((self.skillno == 2 ? 1500 : 250), _ => {
                self.isAttacking = 0;
                self.changePic(self, self.NormalGif);
                self.skillno++;
                if (self.skillno > 3) self.skillno = 1;
            });
        }
    },
    CrushPlant: function(aPlant, self) {
        if (aPlant && self.isNotStaticed()) {
            let [R, C] = [aPlant.R, aPlant.C];
            let z = PKindUpperLimit,
                p;
            while (z >= 0) {
                p = oGd.$[`${R}_${C}_${z}`];
                if (p && p.isPlant) {
                    p.getHurt(self, 1, self.Attack);
                }
                z--;
            }
            oGd.killAll(R, C, 'JNG_TICKET_Gargantuar');
            // 判断僵尸的LivingArea不准确，这里修正
            if (oGd.$GdType[R][C] !== 2) {
                CustomSpecial(oRifter, R, C); //创建冰窟
            }
            oAudioManager.playAudio("Gargantuar_crush");
            const effect = NewEle(self.id + "Effect", "div", `position:absolute;z-index:${self.zIndex - 1};width:631px;height:481px;left:${self.ZX-365.5}px;top:${self.pixelTop+self.height-370.5}px;background:url(${self.PicArr[self.EffectGif]});`, 0, EDPZ);
            oSym.addTask(20, ClearChild, [effect]);
        }
    },
}),
// 镜花水月僵尸从下面开始
oSnorkelerZombie = InheritO(oZombie, {
    EName: "oSnorkelerZombie",
    CName: "潜水僵尸",
    StandGif: 8,
    BoomDieGif: 9,
    width: 216,
    height: 164,
    beAttackedPointL: 70,
    beAttackedPointR: 140,
    extraDivingDepth: 55,
    HP: 540,
    Lvl: 3,
    CardStars: 2,
    HeadTargetPosition: [{
        x: 80,
        y: 37
    }, {
        x: 80,
        y: 37
    }],
    Almanac: {
        Tip: "潜水僵尸能够在水下深潜，以躲避植物的直线子弹。",
        Story: "自从父亲的摩瓦多尔红酒生意破产，潜水僵尸原有的现充生活也随着家里的破产而彻底崩塌：他被迫从自己就读的大学退学，被迫放弃了自己曾经最爱的潜水，卖掉了一切昂贵的设备来补上欠下的外债，只留下了一副装饰性的眼镜。他的女朋友因为她觉得这副眼镜很蠢看不清他的脸而找借口选择了分手，他的母亲也带着愿意改成她姓氏的小孩远走高飞。在他的父亲最终放弃了希望，选择靠偷盗度日并把所有钱财换成酒精直至酒精中毒死去后，最终，他选择了带上这个有点滑稽的潜水眼镜进行人生最后一次潜水。而在这次潜水里，他无需再在意自己需要吸多少气呼多少气，也不需要再考虑水下的呼吸，他所想的只有无限的下潜，离开水上所有的一切带给他的压力，直到变成僵尸，完全不需氧气为止。",
    },
    getShadow: self => "left:98px;top:131px;",
    getFreezeCSS: self => "left:98px;top:136px;",
    PicArr: (a => ["", "", a + "walk.webp", a + "eat.webp", a + "walk_losthead.webp", a + "eat_losthead.webp", a + "head.webp?useDynamicPic=false", a + "die.webp", a + "idle.webp", 'images/Zombies/BoomDie.webp'])("images/Zombies/SnorkelerZombie/"),
    prepareBirth(delayT) {
        let self = this;
        let id = self.id = "Z_" + Math.random();
        // 据as介绍，关卡编辑器制作的关卡中途水道会发生改变
        // 所以需要在潜水僵尸出生时才进行所在行的生成
        let ArR = self.ArR = [];
        let LF = oS.LF;
        for (let i = 0; i <= oS.R; i++) {
            self.CanPass(i, LF[i]) && self.ArR.push(i);
        }
        let R = self.R = oP.randomGetLine(ArR,self.Lvl);
        let top = self.pixelTop = GetY(R) + self.GetDY() - self.height;
        let zIndex = self.zIndex = 3 * R + 1;
        self.zIndex_cont = Math.round(self.pixelTop + self.height);
        //设置延迟出场时间
        if (self.delayT = delayT) {
            self.getStatic({
                time: Infinity,
                type: "SetBody",
                forced: true,
                useStaticCanvas: false,
                usePolling: false,
            });
        }
        return self.getHTML(id, self.X, top, self.zIndex_cont, "none", "auto", self.GetDTop, self.PicArr[self.NormalGif]);
    },
    getCharredCSS(self) {
        const body = self.EleBody;
        return {
            left: self.DivingDepth > 0 ? (self.beAttackedPointL + 6) : 104,
            top: self.DivingDepth > 0 ? (self.Altitude > 0 ? 58 : 126) : 46,
            clip: self.DivingDepth > 0 ? (self.Altitude > 0 ? "rect(0px, auto, 106px, 0px)" : "rect(0px, auto, 40px, 0px)") : "",
        };
    },
    CanPass(R, LF) {
        let self = this;
        return LF && self.AccessiblePath[oGd.$LF[R] + "_" + LF] && oGd.$GdType[R][oS.C] === 2;
    },
    GoingDieHead(id, PicArr, self) {
        CZombies.prototype.GoingDieHeadNew(id, PicArr, self, {
            top: self.pixelTop + 8,
            left: self.X + 78,
            bc: self.pixelTop + 140,
        });
    },
    async SetWater(depth, R, C, oldGdType, useAnim = true, toSetWaterStyle = true) {
        let defaultDepth = oGd.$WaterDepth[R][C];
        this.Altitude = 1 * (depth < this.extraDivingDepth + defaultDepth);
        return CZombies.prototype.SetWater.call(this, depth, R, C, oldGdType, useAnim, toSetWaterStyle);
    },
    setWaterStyle(self, ele) {
        EditCompositeStyle({
            ele,
            addFuncs: [
                ["translate", "-27px, 27px"]
            ],
            option: 2
        });
        SetStyle(ele, {
            height: "10.625px",
            width: "84.375px",
            'background-size': "100% 100%",
            'z-index': 300
        });
    },
    async JudgeAttack(stepRatio=1) {
        let self = this;
        let ZX = self.ZX;
        let crood = self.R + "_";
        let C = GetC(ZX);
        let R = self.R
        let G = oGd.$;
        let defaultDepth = oGd.$WaterDepth[R][C];
        let isInWater = self.DivingDepth > 0;
        let arr = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
        if (arr && (self.Altitude === 1 || self.Altitude === 0)) {
            if (!self.isAttacking) {
                self.isAttacking = 1;
                isInWater && (await self.SetWater(defaultDepth, R, C, 2));
                self.EleBody.src = self.PicArr[self.AttackGif];
            }
            self.NormalAttack(...arr);
        } else if (self.isAttacking) {
            self.isAttacking = 0;
            isInWater && (await self.SetWater(defaultDepth + self.extraDivingDepth, R, C, 2));
            self.EleBody.src = self.PicArr[self.NormalGif];
        }
    },
}),
oPeashooterZombie = InheritO(oZombie, {
    EName: "oPeashooterZombie",
    CName: "豌豆射手僵尸",
    PicArr: (
        (a, b) => [
            "",
            "",
            a + "walk.webp",
            a + "eat.webp",
            b + "ZombieLostHead.webp", b + "ZombieLostHeadAttack.webp", BlankPNG, b + "ZombieDie.webp", a + "idle.webp", 'images/Zombies/BoomDie.webp'
        ]
    )("images/Zombies/PeashooterZombie/", "images/Zombies/Zombie/"),
    CardStars: 2,
    Lvl:2,
    Almanac: {
        Tip: "头戴豌豆射手面具的普通僵尸",
        Story: "在成为豌豆射手僵尸之前，他也曾经只是一个默默无闻的普通僵尸，但只因为他有幸被卡巴拉生命之树选中并修改，他便成为了向植物们发射着火热的豌豆子弹的，僵尸们的前线战士。如今的他过着每天喝喝热茶，早上还能吃到健康且食材配比均衡的有阳光和高纤维的二氧化合物的早餐，忙于商业合同的充实努力的生活。天佑我卡巴拉生命之树，永垂不朽，愿Job的宗教改革改变我们这个世界，让这个蛮荒的游戏之地建立起全新的更为人道，自由平等的秩序！<br>“呵，扯淡。”豌豆射手僵尸看着报纸，吃着和原来一样的豆制脑子如是说。",
    },
    MonitorTimes: 0,
    MonitorAction(self, ActionTime = 300) {
        self.MonitorTimes++;
        let mTimes = self.MonitorTimes;
        let lastTime = 0;
        let timer = 0;
        let loopTime = 0;
        (function loop() {
            if (mTimes !== self.MonitorTimes || !$Z[self.id] || self.HP < self.BreakPoint || !self.isNotStaticed()) {
                return;
            }
            let newTime = new Date();
            timer += (newTime - lastTime - ActionTime * 10);
            if (Math.abs(timer) >= 10 || loopTime++ % 3 == 0) {
                timer = 0;
                //重置动画
                self.EleBody.src = self.EleBody.src;
            }
            lastTime = newTime;
            setShoot();
            oSym.addTask(ActionTime, loop);
        })();

        function setShoot() {
            for (let i = 20; i <= ActionTime; i += 150) {
                oSym.addTask(i, () => {
                    if (mTimes !== self.MonitorTimes || !$Z[self.id] || self.HP < self.BreakPoint || !self.isNotStaticed()) {
                        return;
                    }
                    let pos = (self.HeadTargetPosition[self.isAttacking] ?? self.HeadTargetPosition[0]);
                    let bul = oBu.createBullet(oZombiePeaBullet, [oPeashooter.prototype.PicArr[oPeashooter.prototype.BulletGif]], self.ZX, pos.y + self.pixelTop + 20 + self.DivingDepth, self.R);
                    bul.deltaStature = self.DivingDepth >= 30 ? -1 : 0;
                    if (self.FreeSlowTime > 0) {
                        bul.Speed /= 1.5;
                        bul.Attack /= 2;
                        if (!$User.LowPerformanceMode) {
                            EditCompositeStyle({
                                ele: bul.Ele,
                                styleName: 'filter',
                                addFuncs: [
                                    ['url', oSVG.getSVG('getSnowPea')]
                                ],
                                option: 2
                            });
                        }
                    }
                });
            }
        }
    },
    JudgeAttack(stepRatio=1) {
        let self = this;
        let ZX = self.ZX;
        let crood = self.R + "_";
        let C = GetC(ZX);
        let G = oGd.$;
        let arr = self.JudgeLR(self, crood, C, ZX, G) || self.JudgeSR(self, crood, C, ZX, G);
        if (arr && self.Altitude === 1) { //地上的僵尸才能检测攻击
            !self.isAttacking && (self.isAttacking = 1, self.EleBody.src = self.PicArr[self.AttackGif], self.MonitorAction(self, 900)); //如果是首次触发攻击，需要更新到攻击状态
            self.NormalAttack(...arr); //实施攻击
        } else {
            //撤销攻击状态
            self.isAttacking && (self.isAttacking = 0, self.EleBody.src = self.PicArr[self.NormalGif], self.MonitorAction(self, 300));
        }
    },
    GoingDieHead() {},
    BirthCallBack(self) {
        let delayT = self.delayT;
        let id = self.id;
        let ele = self.Ele = $(id);
        self.EleShadow = ele.firstChild;
        self.EleBody = ele.childNodes[1];
        if (delayT) {
            oSym.addTask(delayT, () => {
                self.freeStaticEffect(self, "SetBody");
                $Z[id] && SetBlock(ele);
                self.MonitorAction(self, 300);
            });
        } else {
            SetBlock(ele);
            self.MonitorAction(self, 300);
        }
    },
}),
oWallNutZombie = (function() {
    const getHit = (self, attackPower) => {
        if (self.ShieldHP>0) {
            self.getShieldHit(self);
            return;
        }
        const curHP = self.HP -= attackPower;
        const changeState = (state) => {
            self.HurtStatus = state;
            self.NormalGif = self["NormalGif" + state];
            self.AttackGif = self["AttackGif" + state];
            self.EleBody.src = self.PicArr[self.isAttacking ? self.AttackGif : self.NormalGif];
        };
        if (curHP < self.BreakPoint) {
            self.GoingDie(self.PicArr[[self.LostHeadGif, self.LostHeadAttackGif][self.isAttacking]]);
            self.getHit0 = self.getHit1 = self.getHit2 = function() {};
            return;
        }
        if (curHP < 457 && self.HurtStatus < 2) {
            changeState(2);
        } else if (curHP < 913 && self.HurtStatus < 1) {
            changeState(1);
        }
        self.SetBrightness(self, self.EleBody, 1);
        oSym.addTask(10, () => $Z[self.id] && self.SetBrightness(self, self.EleBody, 0));
    };
    return InheritO(oZombie, {
        EName: "oWallNutZombie",
        CName: "坚果墙僵尸",
        HP: 1170,
        HurtStatus: 0,
        NormalGif1: 10,
        NormalGif2: 11,
        AttackGif1: 12,
        AttackGif2: 13,
        CardStars: 2,
        Lvl:3,
        Almanac:{
            Tip:"头戴坚果墙面具的普通僵尸",
            Story:"在成为坚果墙僵尸以前，他也曾经只是一个默默无闻的普通僵尸，但只因为他有幸被卡巴拉生命之树选中并修改，他便有了……更多的血量、对打过来的子弹所传递的痛觉的顿感、以及上前线为其他僵尸做防御的愿望，还有……因里面的核桃仁而略微提高的智商？<br>“True,dude,true.”穷尽了毕生所学英语的坚果墙僵尸在直播里如是说道",
        },
        PicArr: (() => {
            let url1 = "images/Zombies/Zombie/";
            let url2 = "images/Zombies/WallNutZombie/";
            return ["", "", url2 + "walk.webp", url2 + "eat.webp", url1 + "ZombieLostHead.webp", url1 + "ZombieLostHeadAttack.webp", "", url1 + "ZombieDie.webp", url2 + "idle.webp", 'images/Zombies/BoomDie.webp', url2 + "walk_hurt1.webp", url2 + "walk_hurt2.webp", url2 + "eat_hurt1.webp", url2 + "eat_hurt2.webp"];
        })(),
        getHit: getHit,
        getHit0: getHit,
        getHit1: getHit,
        getHit2: getHit,
        GoingDieHead() {},
    })
})(),
oJalapenoZombie = InheritO(oZombie, {
    EName: "oJalapenoZombie",
    CName: "火爆辣椒僵尸",
    BoomGif: 10,
    canBoom: true,
    CardStars: 3,
    Lvl:5,
    PicArr: (() => {
        let url1 = "images/Zombies/Zombie/";
        let url2 = "images/Zombies/JalapenoZombie/";
        return ["", "", url2 + "walk.webp", url2 + "eat.webp", url1 + "ZombieLostHead.webp", url1 + "ZombieLostHeadAttack.webp", "", url1 + "ZombieDie.webp", url2 + "idle.webp", 'images/Zombies/BoomDie.webp', url2 + "boom.webp", "images/Plants/Jalapeno/JalapenoAttack.webp"];
    })(),
    Almanac:{
        Tip:"头戴火爆辣椒面具的普通僵尸",
        Weakness: "冰系植物",
        Story:"在成为火爆辣椒僵尸以前，他也曾经只是一个默默无闻的普通僵尸，但只因为他有幸被卡巴拉生命之树选中并修改，他便过上了与以往不同的传奇人生：白天，他可以是僵尸界炙手可热的明星，而在晚上他便成为了佐罗，凭借写Z字母的第一个笔画这一秘密武器在草坪上行侠仗义。天佑我卡巴拉生命之树，永垂不朽，愿Job的宗教改革改变我们这个世界，让这个蛮荒的游戏之地建立起全新的更为仁义，道德凌驾于财产与权力以上的秩序！<br>“呵，扯淡。”火爆辣椒僵尸看着报纸，在感觉到了他自己爆头之日将至却还没有爆炸的时候如是说。",
    },
    AudioArr: ["jalapeno"],
    ChkActs(o, R, arR, i,stepRatio=1) {
        return o.GoLeft(o, R, arR, i,stepRatio);
    },
    ChkCell_GdType(self) {
        let R = self.R;
        let C = GetC(self.ZX - (self.beAttackedPointR - self.beAttackedPointL) / 2 * (self.WalkDirection * 2 - 1));
        if (self.HP > 0 && !self.isGoingDie && !self.isAttacking && self.canBoom && C <= 6) {
            self.Boom(self, R);
            return;
        }
        return CZombies.prototype.ChkCell_GdType.call(self, self);
    },
    GoingDieHead() {},
    getSlow(self, keepTime = 1000) {
        if (self.isGoingDie) {
            return;
        }
        let ele = self.Ele;
        let oldTimeStamp = self.FreeSlowTime;
        let newTimeStamp = oSym.Now + keepTime;
        self.canBoom = false;
        if (self.FreeExcitedTime) {
            self.Speed = self.OSpeed;
            self.Attack = self.OAttack;
            self.FreeExcitedTime = 0;
            ClearChild(ele.querySelector('.buff_excited'));
            !$User.LowPerformanceMode && EditCompositeStyle({
                ele: self.EleBody,
                styleName: 'filter',
                delFuncs: [
                    ['url', oSVG.getSVG('getExcited')]
                ],
                option: 2
            });
            return;
        }
        if (oldTimeStamp === 0) {
            self.Speed = 0.5 * self.OSpeed;
            self.Attack = self.OAttack * 0.5;
            $User.LowPerformanceMode && NewImg(`buff_freeze_${Math.random()}`, "images/Zombies/buff_freeze.png",
                `${self.getFreezeCSS ? self.getFreezeCSS(self) : self.getShadow(self)};z-index:5;transform: scale(1);`, ele, {
                    className: 'buff_freeze'
                });
            !$User.LowPerformanceMode && EditCompositeStyle({
                ele: self.EleBody,
                styleName: 'filter',
                addFuncs: [
                    ['url', oSVG.getSVG('getSnowPea')]
                ],
                option: 2,
            });
        }
        if (oldTimeStamp < newTimeStamp) {
            self.FreeSlowTime = newTimeStamp;
            oSym.addTask(keepTime, () => {
                if ($Z[self.id] && self.FreeSlowTime === newTimeStamp) {
                    self.FreeSlowTime = 0;
                    self.canBoom = true;
                    $User.LowPerformanceMode && ClearChild(ele.querySelector('.buff_freeze'));
                    !$User.LowPerformanceMode && EditCompositeStyle({
                        ele: self.EleBody,
                        styleName: 'filter',
                        delFuncs: [
                            ['url', oSVG.getSVG('getSnowPea')]
                        ],
                        option: 2
                    });
                    self.Attack = self.OAttack;
                    self.Speed && (self.Speed = self.OSpeed);
                }
            });
        }
    },
    getFirePea(self, attackPower, dir) {
        self.canBoom = true;
        return OrnNoneZombies.prototype.getFirePea.call(self, self, attackPower, dir);
    },
    Boom(self, R) {
        const id = self.id;
        self.HP = Infinity;
        self.isAttacking = 1;
        self.EleBody.src = self.PicArr[self.BoomGif];
        oSym.addTask(80, () => {
            if ($Z[id]) {
                let effect = NewImg(self.id + "_Fire",null,
                    `position: absolute;left:130px;top:${self.pixelTop + self.height - 83}px;z-index:${self.zIndex};width:752px;height:103px;`,
                    EDPZ);
                effect.src = oDynamicPic.require("images/Plants/Jalapeno/JalapenoAttack.webp",effect);
                for (let C = 1; C <= oS.C; C++) {
                    oGd.killAll(R, C);
                }
                self.ExplosionDie();
                oAudioManager.playAudio("jalapeno");
                oSym.addTask(160, ClearChild, [effect]);
            }
        });
    },
});
