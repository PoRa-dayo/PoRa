"use strict";
var oMiniGames = {
    /* 
        游戏开局前在场地上摆好植物，然后又如下两种调用方法可以选择：
        【方法一】指定植物数量，系统自动选取要保护的植物
        这种方法的缺点在于如果场地上有同种植物，但有的要保护有的不需要，则这种方法失效
        oMiniGames.ProtectPlants({
            'oApple': 1,
            'oSunFlower': 3,
        })
        【方法二】指定植物位置，系统自动选取要保护的植物
        oMiniGames.ProtectPlants(void 0, [1, 2], [2, 3])
    */
    ProtectPlants(sheet = {},sheetPos=[],callStartGame=true) { //保卫植物关卡
        let recordIds = new Set();
        let alrdead = false;
        //let AppleKillCount = 0;
        //事先扫描植物的id并记录
        for (let plant of $P) {
            if (sheet.hasOwnProperty(plant.EName) || plant.sos) {
                plant.sos = 1;
                recordIds.add(plant.id);
                let tmp = plant.Die;
                plant.Die = function(...sth){
                    let {R, C} = plant;
                    tmp.call(plant, ...sth);
                    if (!$P[plant.id]) {
                        /*if (plant.EName === 'oApple') AppleKillCount++;
                        if (AppleKillCount >= 5) console.log('Enter the Holy Apple secret boss fight');*/
                        alrdead = true;
                        oSym.addTask(150, toOver, [2, R, C]);
                    }
                };
            }
        }
        //自定义坐标表的采入
        for (let i in sheetPos){
            for(let pkind = 0, G = oGd.$; pkind <= PKindUpperLimit; pkind++) {
                let p;
                if(p=G[sheetPos[i][0]+"_"+sheetPos[i][1]+"_"+pkind]){
                    p.sos = 1;
                    let tmp = p.Die;
                    p.Die = function(...sth){
                        let {R, C} = p;
                        tmp.call(p, ...sth);
                        if (!$P[p.id]) {
                            alrdead = true;
                            oSym.addTask(150, toOver, [2, R, C]);
                        }
                    };
                }
            }
        }
    
        function fun() {
            let tempSet = new Set(recordIds);
            for (let o of $P) {
                tempSet.has(o.id) && tempSet.delete(o.id);
            }
            if (tempSet.size > 0 && !alrdead) {
                return toOver(2);
            }
            if (!alrdead) oSym.addTask(500, fun);
        }
        if(callStartGame){
            oAudioManager.playMusic(oS.StartGameMusic);
            SetVisible($("tdShovel"), $("dFlagMeter"), $("dTop"));
            oS.InitLawnMover();
            oS.ControlFlagmeter && oFlagContent.init({ fullValue: oP.FlagNum-1, curValue: 0 });  //显示进度条
            PrepareGrowPlants(function () {
                oP.Monitor(oS.Monitor);
                BeginCool();
                AutoProduceSun(50);
                fun();
                oSym.addTask(1500, _ => {
                    oP.AddZombiesFlag();
                    oS.ControlFlagmeter && oFlagContent.show();
                })
            });
        }else{
            addEventListenerRecord('jng-event-startgame', fun,{once:true});
        }
    },
    /* 传送带接口调用说明
    arrP：自定义的植物池，默认oS.PName。系统会从中随机抽取植物生成。植物池权重请在此处设置。
    createTime：生成卡牌的时间间隔，默认600
    moveTime：卡牌每次移动时间间隔，默认5
    PriorityP：优先植物顺序数组，"random"代表当前随机，"null"代表当前不出卡牌。如果设置，那么系统将优先按照该顺序来出卡牌。
    maxCard：最多可以在传送带上保留多少张卡牌
    numLimit (e.g. {'oPeashooter': 5, 'oPuffShroom': 2}): 某个植物最多限制多少张 (equivalent to maxCount in PvZ2 with maxCount Weight Factor = 0), default is Infinity
    maxCardCD: when maxCard is reached, wait for a maxCardCD amount of time before allowing the next card to be given (or when the number of cards on conveyor decrease below maxCard)
    numLimitCD (e.g. {'oPeashooter': 1500, 'oPuffShroom': 1200}): when numLimit is reached, wait for a numLimitCD amount of time before allowing that plant to appear on the conveyor again (or when the number of plants decrease below numLimit), default is 114514
    */
    ConveyorBelt(arrP = oS.PName, createTime = 600, moveTime = 3, priorityP = [], maxCard=10, numLimit = {}, maxCardCD = Infinity, numLimitCD = {}) {
        /* 一些初始化 */
        let bgDom = NewImg("ConveyorBelt", "images/interface/ConveyorBelt.webp", "z-index:0", $(
            'dCardList'));
        let conveyorDom = NewImg("Belt", "images/interface/ConveyorInterior.webp", "z-index:-1;left:-160px", $(
            'dCardList'));
        oEffects.Animate(bgDom,{
            left:"0"
        },0.2/oSym.NowSpeed,"ease-out");
        oEffects.Animate(conveyorDom,{
            left:"0"
        },0.2/oSym.NowSpeed,"ease-out");
        let top = 0;
        (function moveBelt() {
            if (top > -596) {
                conveyorDom.style.top = top-- + "px";
            } else {
                conveyorDom.style.top = top += 597;
            }
            oSym.addTask(moveTime, moveBelt);
        })();
        oAudioManager.playMusic(oS.StartGameMusic);
        SetVisible($("tdShovel"), $("dFlagMeter"), $("dTop"));
        SetHidden($("dSunNum"));
        oS.InitLawnMover();
        oS.ControlFlagmeter && oFlagContent.init({ fullValue: oP.FlagNum-1, curValue: 0 });  //显示进度条
        /* 重写全局函数 */
        let objFun = {
            GetChoseCard(b) {
                if (oS.Chose > 0) {
                    return;
                }
                var a = ArCard.length;
                while (a--) {
                    ArCard[a].DID == b && (oS.ChoseCard = a, a = 0)
                }
                return oS.ChoseCard
            },
            ChosePlant(evt, index = null, NavigateOnly = false) {
                if(oS.Chose===-1){
                    CancelShovel();
                }
                if(oS.Chose===1 || $("MovePlant")){
                    CancelPlant();
                    return;
                }
                oPropUseGUI.navigateProp();
                if(index !== null) {
                    index === -1 && (index = 9);    //按0键可以选取第10个植物
                    if(index + 1 > ArCard.length || index < 0) {
                        return;
                    }
                    if (NavigateOnly) {
                        oAudioManager.deleteAudio('tap');
                        oAudioManager.playAudio('tap');
                        NewImg("CardNavigated", "images/Card/CardNavigated.webp", "width: 100px; height: 120px; top:0px; pointer-events: none;", $(ArCard[index].DID));
                        return;
                    }
                    oS.ChoseCard = index;
                }
                oS.Chose = 1;
                $("MovePlant") && ClearChild($("MovePlant"));
                oAudioManager.playAudio("seedlift");
                let AC = ArCard[oS.ChoseCard],
                    evtX = evt.clientX - EDAlloffsetLeft || 60,
                    evtY = evt.clientY || ArCard[oS.ChoseCard].PixelTop,
                    pro = AC.PName.prototype;
                let MovePlant = NewImg("MovePlant", pro.PicArr[pro.StaticGif],
                    `left:${evtX}px;top:${evtY + 20 - pro.height}px;z-index:258;`,
                    EDAll);
                SetStyle(MovePlant, pro.ImgStyle);
                EditImg(MovePlant.cloneNode(false), "MovePlantAlpha", "", { //克隆一份作为半透图
                    visibility: "hidden",
                    opacity: 0.4,
                    'z-index': 30,
                }, FightingScene);
                EditCompositeStyle({
                    ele: MovePlant,
                    addFuncs: [["translateX", oS.EDAllScrollLeft - pro.width / 2 + "px"]],
                    option: 2,
                });
                NewImg("CardSelected", "images/Card/CardSelected.webp", "width: 100px; height: 120px; top:0px; pointer-events: none;", $(AC.DID));
                SetAlpha($(AC.DID + 'img'), 0.5); //标记卡牌被选择
                SetHidden($("dTitle"));
                GroundOnmousemove = GroundOnmousemove1;
            },
            CancelPlant(navigating = false) {
                ClearChild($("MovePlant"), $("MovePlantAlpha"), $("HighlightLane"), $("HighlightColumn"), $("CardSelected"));
                if (navigating) ClearChild($("CardNavigated"));
                oS.Chose = 0;
                let AC = ArCard[oS.ChoseCard];
                if (AC) {
                    $(AC.DID).style.backgroundImage = '';
                    SetAlpha($(AC.DID + 'img'), 100, 1);
                }
                oS.ChoseCard = "";
                GroundOnmousemove = function () {}
            },
            GrowPlant(data, X, Y, R, C) {
                (ZimuRQ.style.display === 'block') && PlaySubtitle();
                let index = oS.ChoseCard;
                let card = ArCard[index];
                let plant = card.PName;
                let proto = plant.prototype;
                let cardID = card.DID;
                if (C > oS.BowlingLimitC && ['oNutBowling', 'oBoomNutBowling', 'oBigWallNut', 'oNutBowlingPay', 'oBoomNutBowlingPay', 'oBigWallNutPay', 'oNutBowling2____'].includes(proto.EName)) {
                    oAudioManager.playAudio("buzzer");
                    if(IsMobile||R<1||C<1||C>9){
                        CancelPlant();
                    } else {
                        PlaySubtitle('请把坚果放在分界线左侧！', 700);
                    }
                    return false;
                }
                if (oS.BowlingLimitC < Infinity && C <= oS.BowlingLimitC && plant.prototype.Obj && plant.prototype.EName!="oIThiefZombie") {
                    oAudioManager.playAudio("buzzer");
                    if(IsMobile||R<1||C<1||C>9){
                        CancelPlant();
                    } else {
                        PlaySubtitle('把僵尸放置在线的右边！', 700);
                    }
                    return false;
                }
                if (proto.CanGrow(data, R, C)) {
                    oAudioManager.playAudio(
                        oGd.$GdType[R][C] === 2 ? "plant_water" : `plant${Math.floor(1+Math.random()*2)}`
                    );
                    new plant().Birth(X, Y, R, C, data);
                    if (!proto.Obj) {
                        const effectElement = $("imgGrowSoil");
                        effectElement.src = GrowSoilImg;
                        SetStyle(effectElement, {
                            left: X + 85 + "px",
                            top: Y - 45 + "px",
                            'z-index': 3 * R + 1,
                            visibility: "visible",
                        });
                        oSym.addTask(100, SetHidden, [effectElement]);
                    }
                    ArCard.splice(index, 1);
                    BeginCardKey();
                    oS.ChoseCard = "";
                    oS.Chose = 0;
                    GroundOnmousemove = () => {}
                    ClearChild($("MovePlant"), $("MovePlantAlpha"), $(cardID));
                    CancelPlant();
                } else {
                    oAudioManager.playAudio("buzzer");
                    if (!proto.UndergroundPlant && proto.EName !== 'oLilyPad' && oGd.$GdType[R][C] === 2 && !oGd.$[R + '_' + C + '_0'] && ZimuRQ.style.display !== 'block')
                        PlaySubtitle("先种一片莲叶",150);
                    if (!['oLilyPad', 'oFlowerPot'].includes(proto.EName) && oGd.$GdType[R][C] === 3 && !oGd.$[R + '_' + C + '_0'] && ZimuRQ.style.display !== 'block')
                        PlaySubtitle("先种一个花盆",150);
                    if(IsMobile||R<1||C<1||C>9){
                        CancelPlant();
                    }
                }
            },
            ViewPlantTitle() {},
        };
        RewriteGlobalVariables(objFun);
        /* 传送带逻辑 */
        PrepareGrowPlants(() => {
            let tmpCardDoms = new Map();
            //处理优先植物队列
            let index = 0;
            //if maxCard is reached, wait until maxCardTimer reaches maxCardCD before allowing the next card to be given
            //if numLimit is reached, wait until numLimitTimer reaches numLimitCD before allowing that plant to appear on conveyor again
            let maxCardTimer = 0, numLimitTimer = {};
            const _priorityP = priorityP.map(o => o === 'random' ? arrP.random() : o);
            //生成植物卡牌
            (function createNewCard() {
                const len = ArCard.length;
                if (len < maxCard || maxCardTimer > maxCardCD) { 
                    //一次性最多可以生成十张卡牌
                    //首先检查优先植物数组中有没有对应项，如果没有就用random随机生成
                    maxCardTimer = 0;
                    let ENameStrArr = [];
                    let availableJson = (()=>{
                        let tmp = {};
                        arrP.forEach((i)=>{
                            ENameStrArr.push(i.prototype.EName);
                            tmp[i.prototype.EName]=i;
                        });
                        return tmp;
                    })();
                    
                    //check numLimit of each plant
                    let json = {}, limitedPlants = new Set();
                    function StartLimitTimer(plantName) {
                        if (!numLimitTimer[plantName]) return;
                        numLimitTimer[plantName]++;
                        oSym.addTask(1, StartLimitTimer, [plantName]);
                    };
                    //check amount of each plant on the lawn
                    for(let i of $P){
                        if(!numLimit[i.EName]){continue;}
                        json[i.EName]=(json[i.EName]??0)+1;
                        if(!numLimitTimer[i.EName]) numLimitTimer[i.EName] = 0;
                        if(!numLimitCD[i.EName]) numLimitCD[i.EName] = 114514;
                        if(json[i.EName]>=numLimit[i.EName] && numLimitTimer[i.EName]<=numLimitCD[i.EName]){
                            if (!limitedPlants.has(i.EName)) limitedPlants.add(i.EName);
                        }
                    }
                    //continue adding the amount of each plant on the conveyor and check
                    for(let k=0;k<len;k++){
                        let i = ArCard[k].PName.prototype;
                        if(!numLimit[i.EName]){continue;}
                        json[i.EName]=(json[i.EName]??0)+1;
                        if(!numLimitTimer[i.EName]) numLimitTimer[i.EName] = 0;
                        if(!numLimitCD[i.EName]) numLimitCD[i.EName] = 114514;
                        if(json[i.EName]>=numLimit[i.EName] && numLimitTimer[i.EName]<=numLimitCD[i.EName]){
                            if (!limitedPlants.has(i.EName)) limitedPlants.add(i.EName);
                        }
                    }
                    
                    for (let plantName in availableJson) {
                        if (limitedPlants.has(plantName)) {
                            delete availableJson[plantName];
                            ENameStrArr = ENameStrArr.filter((TheName) => TheName !== plantName);
                            if (!numLimitTimer[plantName]) {
                                numLimitTimer[plantName]++;
                                oSym.addTask(1, StartLimitTimer, [plantName]);
                            }
                        } else {
                            numLimitTimer[plantName] = 0;
                        }
                    }
                    
                    let obj = _priorityP[index] ? _priorityP[index] : availableJson[ENameStrArr.random()];
                    if(obj){
                        let proto = obj.prototype;
                        if (proto) {
                            let id = "dCard" + Math.random();
                            ArCard[len] = {
                                DID: id,
                                PName: obj,
                                PixelTop: 600, 
                            };
                            let idele = NewEle(id, "div", `position: absolute; top: 600px; width: 100px; height: 120px; cursor: pointer; background-size:100%; clip-path: inset(0 0 60px 0);`, 0, $("dCardList"));
                            let idimg = NewEle(id + 'img', "div", `background-image:url(${proto.PicArr[proto.CardGif]});background-size:100px 120px;`, 
                            {
                                onmousedown: event => {
                                    GetChoseCard(id);
                                    ChosePlant(event);
                                    event.stopPropagation();
                                    if (event.cancelable) event.preventDefault();
                                }
                            }, idele);
                            SetEvent(idimg, 'touchstart', event => {
                                GetChoseCard(id);
                                ChosePlant(event);
                                event.stopPropagation();
                                if (event.cancelable) event.preventDefault();
                            });
                            BeginCardKey();
                        }
                    }
                    index++;
                } else if (!maxCardTimer) {
                    function StartTimer() {
                        if (!maxCardTimer) return;
                        maxCardTimer++;
                        oSym.addTask(1, StartTimer);
                    };
                    maxCardTimer++;
                    oSym.addTask(1, StartTimer);
                }
                oSym.addTask(createTime, createNewCard);
            })();
            {
                let tmp__;
                (function moveCard() {
                    let len = ArCard.length;
                    while (len--) {
                        let card = ArCard[len];
                        // 卡牌没有到达顶端
                        // 卡牌没有超过最顶端
                        if (card.PixelTop > 60 * len+5 && card.PixelTop >= 5) {
                            if(!(tmp__=tmpCardDoms.get(card))){
                                tmpCardDoms.set(card,tmp__=$(card.DID));
                            }
                            tmp__.style.top = 
                                    (card.PixelTop = Math.max(7, 60 * len + 7, card.PixelTop - 1)) + "px";
                        }
                    }
                    if(tmpCardDoms.size>150){
                        tmpCardDoms.clear();
                    }
                    oSym.addTask(moveTime, moveCard);
                })();
            }
            ShortcutInstructions();
            oP.Monitor();
            oP.AddZombiesFlag();
            oS.ControlFlagmeter && oFlagContent.show();
        });
    },
    //countdownTime: time before the card disappears
    RainWithSeeds(arrP = oS.PName, createTime = 600, moveTime = 5, priorityP = [],countdownTime = 700, autoRainEffect = true,maxCard = 9, numLimit = {}, maxCardCD = Infinity, numLimitCD = {}) {
        /* 一些初始化 */
        oAudioManager.pauseMusic();
        oAudioManager.playMusic(oS.StartGameMusic);
        oAudioManager.deleteAudio('rain');
        let RainAudio = oAudioManager.playAudio("rain",true, 0.5);
        
            oSym.addTask(1,function l(){
                if(RainAudio.currentTime>RainAudio.duration-0.4){
                    RainAudio.currentTime=0;
                }
                oSym.addTask(3,l);
            }); 
        SetVisible($("tdShovel"), $("dFlagMeter"), $("dTop"));
        SetHidden($("dSunNum"));
        oS.InitLawnMover();
        oS.ControlFlagmeter && oFlagContent.init({ fullValue: oP.FlagNum-1, curValue: 0 });  //显示进度条
        oS.ChoseCardObj = void 0;
        const getChoseCardIndex = () => {
            let len = ArCard.length;
            while(len--) {
                if(ArCard[len] === oS.ChoseCardObj) {
                    return len;
                }
            }
        };
        /* 重写全局函数 */
        let objFun = {
            GroundOnmousemove1(event) {
                let plant = oS.ChoseCardObj.PName;
                let evtX = event.clientX - EDAlloffsetLeft;
                let evtY = event.clientY;
                if (IsMobile && event.targetTouches) {
                    let finger = event.targetTouches[0];
                    [evtX, evtY] = [finger.clientX - 60, finger.clientY];
                }
                let [[X, C], [Y, R]] = [ChosePlantX(evtX), ChosePlantY(evtY)];
                let [data] = GetAP(evtX, evtY, R, C);
                let proto = plant.prototype;
                let imgAlpha = $("MovePlantAlpha");
                SetStyle($("MovePlant"), {
                    left: `${evtX}px`,
                    top: `${evtY + 20 - proto.height}px`,
                });
                if(proto.CanGrow(data, R, C)) {
                    SetStyle(imgAlpha, {
                        visibility: "visible",
                        left: X + 115 + proto.GetDX(proto) + "px",
                        top: Y - proto.height + proto.GetDY(R, C, data) + "px",
                    });
                    PosHighlight(R,C);
                } else {
                    SetHidden(imgAlpha);
                    ClearChild($("HighlightLane"), $("HighlightColumn"));
                }
            },
            ChosePlant(evt, obj) {
                if(typeof obj !== 'object') {
                    return;
                }
                if(oS.Chose===-1){
                    CancelShovel();
                }
                if((oS.Chose===1&&!oS.ChoseCardObj)){
                    CancelPlant();
                    return;
                }
                if(oS.ChoseCardObj) return;
                evt.stopPropagation();
                if (evt.cancelable) evt.preventDefault();
                ClearChild($("MovePlant"));
                oAudioManager.playAudio("seedlift");
                let card = oS.ChoseCardObj = obj;
                let evtX = evt.clientX - EDAlloffsetLeft || card.PixelLeft;
                let evtY = evt.clientY || card.PixelTop;
                let pro = card.PName.prototype;
                oS.Chose = 1;
                card.hasAnim = false;
                card.Ele.style.cssText += 'animation-fill-mode:forwards;animation-iteration-count:0;';
                let MovePlant=NewImg("MovePlant", pro.PicArr[pro.StaticGif],
                    `left:${evtX}px;top:${evtY + 20 - pro.height}px;z-index:258;`,
                    EDAll);
                SetStyle(MovePlant, pro.ImgStyle);
                EditImg(MovePlant.cloneNode(false), "MovePlantAlpha", "", { //克隆一份作为半透图
                    visibility: "hidden",
                    opacity: 0.4,
                    'z-index': 30,
                }, FightingScene);
                EditCompositeStyle({
                    ele: MovePlant,
                    addFuncs: [["translateX", oS.EDAllScrollLeft - pro.width / 2 + "px"]],
                    option: 2,
                });
                NewImg("CardSelected", "images/Card/CardSelected.webp", "width: 100px; height: 120px; top:0px; pointer-events: none;", card.Ele);
                SetAlpha(card.Eleimg, 0.5); //标记卡牌被选择
                card.Appeared=true;
                SetHidden($("dTitle"));
                GroundOnmousemove = GroundOnmousemove1;
            },
            GrowPlant(data, X, Y, R, C) {
                let card = oS.ChoseCardObj;
                let plant = card.PName;
                let proto = plant.prototype;
                let cardID = card.DID;
                if (C > oS.BowlingLimitC && ['oNutBowling', 'oBoomNutBowling', 'oBigWallNut', 'oNutBowlingPay', 'oBoomNutBowlingPay', 'oBigWallNutPay', 'oNutBowling2____'].includes(proto.EName)) {
                    oAudioManager.playAudio("buzzer");
                    if(IsMobile||R<1||C<1||C>9){
                        CancelPlant();
                    } else {
                        PlaySubtitle('请把坚果放在分界线左侧！', 700);
                    }
                    return false;
                }
                if (oS.BowlingLimitC < Infinity && C <= oS.BowlingLimitC && plant.prototype.Obj && plant.prototype.EName!="oIThiefZombie") {
                    oAudioManager.playAudio("buzzer");
                    if(IsMobile||R<1||C<1||C>9){
                        CancelPlant();
                    } else {
                        PlaySubtitle('把僵尸放置在线的右边！', 700);
                    }
                    return false;
                }
                if (proto.CanGrow(data, R, C)) {
                    oAudioManager.playAudio(
                        oGd.$GdType[R][C] === 2 ? "plant_water" : `plant${Math.floor(1+Math.random()*2)}`
                    );
                    new plant().Birth(X, Y, R, C, data);
                    if (!proto.Obj) {
                        const effectElement = $("imgGrowSoil");
                        effectElement.src = GrowSoilImg;
                        SetStyle(effectElement, {
                            left: X + 85 + "px",
                            top: Y - 45 + "px",
                            'z-index': 3 * R + 1,
                            visibility: "visible",
                        });
                        oSym.addTask(100, SetHidden, [effectElement]);
                    }
                    ArCard.splice(getChoseCardIndex(), 1);
                    delete oS.ChoseCardObj;
                    oS.Chose = 0;
                    GroundOnmousemove = () => {};
                    ClearChild($("MovePlant"), $("MovePlantAlpha"), card.Ele);
                    CancelPlant();
                } else {
                    oAudioManager.playAudio("buzzer");
                    if (!proto.UndergroundPlant && proto.EName !== 'oLilyPad' && oGd.$GdType[R][C] === 2 && !oGd.$[R + '_' + C + '_0'] && ZimuRQ.style.display !== 'block')
                        PlaySubtitle("先种一片莲叶",150);
                    if (!['oLilyPad', 'oFlowerPot'].includes(proto.EName) && oGd.$GdType[R][C] === 3 && !oGd.$[R + '_' + C + '_0'] && ZimuRQ.style.display !== 'block')
                        PlaySubtitle("先种一个花盆",150);
                    if(IsMobile||R<1||C<1||C>9){
                        CancelPlant();
                    }
                }
            },
            CancelPlant() {
                let card = oS.ChoseCardObj;
                oS.Chose = 0;
                delete oS.ChoseCardObj;
                ClearChild($("MovePlant"), $("MovePlantAlpha"), $("HighlightLane"), $("HighlightColumn"), $("CardSelected"));
                if (card) SetAlpha(card.Eleimg, 100, 1);
                GroundOnmousemove = () => {};
            },
            ViewPlantTitle() {},
        };
        RewriteGlobalVariables(objFun);
        PrepareGrowPlants(() => {
            autoRainEffect&&oEffects.BgParticle({style:"z-index:21",url: "images/Props/Effect/Rain.png",timeout:4,move:function(i){
                i.left-=4.5*oSym.NowSpeed;
                i.top+=6*oSym.NowSpeed;
            },size:{
                width:140,height:140
            }});
            //处理优先植物队列
            let index = 0;
            let maxCardTimer = 0, numLimitTimer = {};
            const _priorityP = priorityP.map(o => o === 'random' ? arrP.random() : o);
            //生成植物卡牌
            (function createNewCard() {
                const len = ArCard.length;
                if (len < maxCard || maxCardTimer > maxCardCD) {
                    maxCardTimer = 0;
                    let ENameStrArr = [];
                    let availableJson = (()=>{
                        let tmp = {};
                        arrP.forEach((i)=>{
                            ENameStrArr.push(i.prototype.EName);
                            tmp[i.prototype.EName]=i;
                        });
                        return tmp;
                    })();
                    
                    //check numLimit of each plant
                    let json = {}, limitedPlants = new Set();
                    function StartLimitTimer(plantName) {
                        if (!numLimitTimer[plantName]) return;
                        numLimitTimer[plantName]++;
                        oSym.addTask(1, StartLimitTimer, [plantName]);
                    };
                    //check amount of each plant on the lawn
                    for(let i of $P){
                        if(!numLimit[i.EName]){continue;}
                        json[i.EName]=(json[i.EName]??0)+1;
                        if(!numLimitTimer[i.EName]) numLimitTimer[i.EName] = 0;
                        if(!numLimitCD[i.EName]) numLimitCD[i.EName] = 114514;
                        if(json[i.EName]>=numLimit[i.EName] && numLimitTimer[i.EName]<=numLimitCD[i.EName]){
                            if (!limitedPlants.has(i.EName)) limitedPlants.add(i.EName);
                        }
                    }
                    //continue adding the amount of each plant on the conveyor and check
                    for(let k=0;k<len;k++){
                        let i = ArCard[k].PName.prototype;
                        if(!numLimit[i.EName]){continue;}
                        json[i.EName]=(json[i.EName]??0)+1;
                        if(!numLimitTimer[i.EName]) numLimitTimer[i.EName] = 0;
                        if(!numLimitCD[i.EName]) numLimitCD[i.EName] = 114514;
                        if(json[i.EName]>=numLimit[i.EName] && numLimitTimer[i.EName]<=numLimitCD[i.EName]){
                            if (!limitedPlants.has(i.EName)) limitedPlants.add(i.EName);
                        }
                    }
                    
                    for (let plantName in availableJson) {
                        if (limitedPlants.has(plantName)) {
                            delete availableJson[plantName];
                            ENameStrArr = ENameStrArr.filter((TheName) => TheName !== plantName);
                            if (!numLimitTimer[plantName]) {
                                numLimitTimer[plantName]++;
                                oSym.addTask(1, StartLimitTimer, [plantName]);
                            }
                        } else {
                            numLimitTimer[plantName] = 0;
                        }
                    }
                    
                    if(_priorityP?.[index]==="null"){
                        index++;
                    }else{
                        const obj = _priorityP[index] ? _priorityP[index] : availableJson[ENameStrArr.random()];
                        if (obj) {
                            const proto = obj.prototype;
                            const id = "dCard" + Math.random();
                            const pxleft = 215+Math.random()*600;
                            const styles = `top:-60px;left:${pxleft}px;width:100px;height:120px;cursor:pointer;clip-path:inset(0 0 60px 0);z-index:253;`;
                            const Ele = NewEle(id, "div", styles + `position: absolute; background-size:100%;`, 0, EDAll);
                            const Eleimg = NewEle(id + 'img', 'div', `width:100px;height:120px;background-image:url(${proto.PicArr[proto.CardGif]});background-size:100px 120px;`, {
                                onmousedown: event => {ChosePlant(event, card);}
                            }, Ele);
                            SetEvent(Eleimg, 'touchstart', event => {ChosePlant(event, card);});
                            const card = ArCard[len] = {
                                DID: id,
                                PName: obj,
                                hasAnim: false,
                                PixelTop: -60,
                                EndTop: 110 + Math.random()*440,
                                Ele,
                                PixelLeft: pxleft,
                                Eleimg
                            };
                        }
                        index++;
                    }
                } else if (!maxCardTimer) {
                    function StartTimer() {
                        if (!maxCardTimer) return;
                        maxCardTimer++;
                        oSym.addTask(1, StartTimer);
                    };
                    maxCardTimer++;
                    oSym.addTask(1, StartTimer);
                }
                oSym.addTask(createTime, createNewCard);
            })();
            (function moveCard() {
                ArCard.forEach(card => {
                    if(card.PixelTop <= card.EndTop) {
                        card.Ele.style.top = (card.PixelTop += Math.max((75-card.PixelTop)/20,1)) + "px";
                        if(!card.Appeared){
                            card.Eleimg.style.opacity =  Math.min(card.PixelTop/60,1);
                            if(card.Eleimg.style.opacity==1){
                                card.Appeared = true;
                            }
                        }
                        return;
                    }
                    if(card.hasOwnProperty('countdown')) {
                        if(oS?.ChoseCardObj?.DID !== card.DID) {
                            card.countdown -= moveTime;
                            card.countdown <= 300 && !card.hasAnim && (oEffects.Animate(card.Eleimg, 'CardBlink', 'slow', null, null, null, 'infinite'), card.hasAnim = true);
                            if(card.countdown <= 0) {
                                card.Ele.onmousedown = null;
                                card.Ele.ontouchstart = null;
                                oEffects.Animate(card.Ele, {transform: 'scale(0)'}, 0.1, 'linear', ClearChild);
                                ArCard.delete(card, true);   
                            }
                        }
                    } else {
                        card.countdown = countdownTime;
                    }
                });
                oSym.addTask(moveTime, moveCard);
            })();
            oP.Monitor();
            oP.AddZombiesFlag();
            oS.ControlFlagmeter && oFlagContent.show();
        });
    },
    DarkRain(time=12,randomRange=10,thunderDelay=4){//黑暗暴雨
        let openThundering = true;//用来做是否结束的标志
        let FlashMask = NewEle(`DarkRain_Flash_Mask`, "div", "pointer-events:none;position:absolute;z-index:31;left:0px;width:1600px;height:600px;background:#000;opacity:0.4;", 0, EDAll);
        let flash_on = 1;
        let Mask = NewEle(`DarkRain_Mask`, "div", "pointer-events:none;position:absolute;z-index:31;left:0px;width:1600px;height:600px;background:#000;opacity:0.5;", 0, EDAll);
        let canvas = oEffects.BgParticle({style:"z-index:21",url: "images/Props/Effect/Rain.png",timeout:4,move:function(i){
            i.left-=4.5*oSym.NowSpeed;
            i.top+=6*oSym.NowSpeed;
        },size:{
            width:140,height:140
        }});
        if(!$User.LowPerformanceMode){
            oSym.addTask(3,function f(){
                if(!FlashMask||!openThundering){
                    return;
                }
                flash_on^=1;
                FlashMask.style.opacity = flash_on*(Math.random()*0.4+0.1);
                oSym.addTask(Math.random()*20+3,f);
            });
        }else{
            ClearChild(FlashMask);
        }
        let RainAudio = oAudioManager.playAudio("rain",true, 0.5);
        
            oSym.addTask(1,function l(){
                if(!openThundering){
                    return;
                }
                if(RainAudio.currentTime>RainAudio.duration-0.4){
                    RainAudio.currentTime=0;
                }
                oSym.addTask(3,l);
            });
        oEffects.Animate(Mask,{opacity:1},1.5/oSym.NowSpeed,"linear");
        oSym.addTask(150,function(){
            if(!openThundering){
                return;
            }
            Bright(Math.floor(Math.random()*2)+1);
            let thunderStart=function(){
                if(!openThundering){
                    return;
                }
                oSym.addTask(100*(Math.random()*randomRange+time-randomRange/2),function(){
                    Bright(Math.floor(Math.random()*2)+1);
                    thunderStart();
                });
                removeEventListenerRecord('jng-event-startgame', thunderStart);
            }
            thunderStart();
        });
        function Bright(type){
            oEffects.Animate(Mask,"bright_thunder"+type,thunderDelay/oSym.NowSpeed,"ease-out");
            if(type==2){
                let ThunderAudio = oAudioManager.playAudio("thunder", false, 1);
                    oSym.addTask(thunderDelay*60,function(){
                        ThunderAudio = oAudioManager.playAudio("thunder");
                        oAudioManager.modifyAudioVolume(ThunderAudio, 0.5);
                    });
            }else{
                let ThunderAudio = oAudioManager.playAudio("thunder", false, 1);
            }
        }
        function closeFunction(){
            openThundering = false;
            oEffects.StopAllAnims(Mask,true);
            FlashMask.style.opacity=0;
            oSym.addTask(1,()=>{
                oEffects.AudioFadeOut("rain",0,1/oSym.NowSpeed);
                oEffects.Animate(canvas,{"opacity":0},1/oSym.NowSpeed,"linear");
                oEffects.Animate(Mask,{"opacity":0},1/oSym.NowSpeed,"linear");
            });
            oSym.addTask(100,()=>{
                ClearChild(Mask,FlashMask,canvas);
            });
        }
        return [FlashMask,Mask,closeFunction];
    },
    //争分夺秒  参数：限时（单位0.01s），惩罚措施，时间和进度条函数关系
    LimitedTimeNoCool( time=Infinity, fun, timerBar = null, harderOnTimeout = true) {
        if(time!==Infinity){
            /* 初始化进度条 */
            oFlagContent.init({
                fullValue: 1,
                curValue: 0,
                MeterType: 'LeftBar GreenBar', 
                HeadType: 'NoneHead', 
            }).show().update({ curValue: 1, animConfig: {duration: 2} });
        }
        /* 开屏字幕控制 */
        {
            let text = [["准备...",60,"80px"], ["布置...",40,"60px"], ["阵型！",100,"90px"]];
            let dom = NewEle("","div","left: 507.5px; top: 300px; transform: translateX("+oS.EDAllScrollLeft+"px) translate(-50%, -50%);color:red;font-size:80px;opacity:0;", {
                innerText:text[0][0],
                id:"dReadySetPlant",
                className:"2px_shadow_with_shadow"
            },EDAll);
            const callback = function(){
                let time = 0;
                oAudioManager.playAudio("readysetplant");
                for(let i = 0;i<text.length;i++){
                    oSym.addTask(time,()=>{
                        dom.innerText = text[i][0];
                        dom.style.opacity = "";
                        dom.style.fontSize =text[i][2];
                        EditCompositeStyle({ ele: dom, delFuncs: ['scale'], addFuncs: [["scale", 0.95]], option: 2 });
                        oSym.addTask(1,()=>{
                            oEffects.Animate(dom,{
                                transform: EditCompositeStyle({ele: dom, delFuncs: ['scale'], addFuncs: [["scale", 1.1]]})
                            },0.3/oSym.NowSpeed,"ease-out");
                        });
                    });
                    time+=text[i][1];
                }
                oSym.addTask(time,()=>{
                    ClearChild(dom);
                });
            };
            callback();
        };
        /* Other */
        oAudioManager.playMusic(oS.StartGameMusic);
        SetVisible($("tdShovel"), $("dFlagMeter"), $("dTop"));
        oS.InitLawnMover();
        let clicked = false;
        let oldTime = time;
        let btn;
        RewriteGlobalVariables({
            ViewPlantTitle: function(index) {  //战斗界面植物标签绘制
                if(index === null) return; 
                let ele = $("dTitle");
                let card = ArCard[index];
                let plant = card.PName.prototype;
                let str;
                if (!plant.SpawnLimitReached) {
                    let speedMultiplier = oS.coolSpeed/0.5 || 1;
                    str = `${plant.CName}<br>冷却时间:${Math.round(plant.coolTime/speedMultiplier * 10) / 10}秒<br>${plant.Tooltip}`;
                } else {
                    str = `${plant.CName}<br><span style="color:#F00">不能使用</span><br>${plant.Tooltip}`;
                }
                if(card.Forbidden){
                    str += '<br><span style="color:#F00">该植物暂不可种植！</span>'
                }else{
                    !card.CDReady && !plant.SpawnLimitReached && (str += '<br><span style="color:#F00">植物正在冷却中...</span>');
                    !card.SunReady && (str += '<br><span style="color:#F00">你的阳光不足!</span>');
                }
                ele.innerHTML = str;
                SetStyle(ele, {
                    top: 60 * index + "px",
                    left: (100+oS.EDAllScrollLeft)+"px",
                })
            },
            ShovelPlant : function(data) {//阳光铲
                oAudioManager.playAudio("plant2");
                let [plantsArg, pointedPlant] = data;
                if(pointedPlant && pointedPlant.isPlant && pointedPlant.canShovel) {  //鼠标有指向植物，且植物允许被铲除
                    //如果指向的是普通植物，或者是没有搭载其他植物的植物容器，则允许铲除
                    if(pointedPlant.PKind || !(plantsArg[1] || plantsArg[2])) {
                        let sunNum = pointedPlant.SunNum;
                        let [r,c]=[pointedPlant.R,pointedPlant.C];
                        pointedPlant.Die('JNG_TICKET_SuperPower');
                        if(!$P[pointedPlant.id]){
                            while(sunNum>50){
                                let tmp=AppearSun(GetX(c),GetY(r),50,0);
                                oSym.addTask(100,function(){ClickSun(tmp.id);});
                                sunNum-=50;
                            }
                            let tmp = AppearSun(GetX(c),GetY(r),sunNum,0);
                            oSym.addTask(100,function(){ClickSun(tmp.id);});
                        }
                        oS.MPID = "";  //注销鼠标指向植物
                    }
                }
                CancelShovel();
            },
        });
        oMiniGames.GrowWithoutSun(false,function(){
            oSym.addTask(30,function(){
                btn = NewEle("startFightButton","div",0,{
                    onclick(){
                        clicked=true;
                        FIGHT();
                    },
                    innerText:"开始战斗",
                    onmouseover(){
                        btn.style.filter = "brightness(110%)";
                    },
                    onmouseout(){
                        btn.style.filter = "";
                    },
                    onmousedown(){
                        btn.style.filter = "brightness(90%)";
                    }
                }, EDAll);
                oSym.addTask(200,function(){
                    SetStyle(btn,{
                        'pointer-events':"auto",
                        opacity:"1",
                    });
                    //默认所有植物没有任何冷却
                    for (let obj of ArCard) {
                        let p = obj.PName.prototype;
                        p.SunNum <= oS.SunNum && (obj.SunReady = 1, $(obj.DID).childNodes[0].style.top ="0");
                        obj.CDReady = 1; //标记冷却完成
                        if(p.Immediately||!p.SunNum){//不许在开局被种植的植物
                            obj.Forbidden = 1;
                            $(obj.DID).childNodes[0].style.top ="-60px";
                        }
                    }
                    if(time !== Infinity) {
                        oSym.addTask(1, function loop() {
                            time-=2;  //刷新时间
                            let curValue = timerBar ? timerBar(time/oldTime) : (time/oldTime)**1.1;
                            if(curValue <= 1/3) {
                                oFlagContent.update({ MeterType: 'LeftBar RedBar', curValue, animConfig: {disabled: true} });
                            } else if (curValue <= 2/3) { 
                                oFlagContent.update({ MeterType: 'LeftBar BlueBar', curValue, animConfig: {disabled: true} });
                            } else {
                                oFlagContent.update({ curValue, animConfig: {disabled: true} });
                            }
                            if(time<0) {
                                FIGHT(true,harderOnTimeout);
                            } else {
                                if(!clicked){
                                    oSym.addTask(2,loop);
                                }
                            }
                        });
                    }
                });
            });
        });
        function FIGHT(timeLimited=false,harderOnTimeout=true) {
            if(time!==Infinity){
                oFlagContent.hide();  //隐藏进度条
            }
            let gVar = oS.GlobalVariables;
            switch(oS.Chose){
                case 1:
                    CancelPlant();
                break;
                case -1:
                    CancelShovel();
            }
            let names = ["ChosePlant","GrowPlant","MonitorCard"];
            for (let name of names) {
                if(gVar[name]){
                    window[name] = gVar[name];
                    delete gVar[name];
                }
            }
            ShovelPlant = gVar.ShovelPlant;
            delete gVar.ShovelPlant;
            //恢复植物冷却
            for (let obj of ArCard) {
                obj.PName.prototype.SunNum > oS.SunNum && (obj.SunReady = 0, $(obj.DID).childNodes[0].style.top ="60px");
                obj.CDReady = 0; 
                if(obj.Forbidden){
                    delete obj.Forbidden;
                }
            }
            BeginCool();
            if(timeLimited){
                fun&&fun();//惩罚措施
                if (harderOnTimeout) {
                    oEffects.flash();
                    for(let i in oP.FlagToSumNum.a2){
                        oP.FlagToSumNum.a2[i]*=2//大波僵尸进攻
                    }
                }
            }
            oSym.addTask(100, _=> {
                oFlagContent.init({ fullValue: oP.FlagNum-1, curValue: 0 });
                oP.Monitor(oS.Monitor, oS.UserDefinedFlagFunc);
                PrepareGrowPlants(_ => {
                    oP.AddZombiesFlag();
                    oS.ControlFlagmeter && oFlagContent.show();
                    oS.ControlFlagmeter && SetVisible($("dFlagMeterContent"));
                },false);
            });
            ClearChild(btn);
        }
    },
    GrowWithoutSun(AutoControl=true,prepareFun) { //一植千金 争分夺秒的禁用冷却系统
        if(AutoControl){
            oAudioManager.playMusic(oS.StartGameMusic);
            SetVisible($("tdShovel"), $("dFlagMeter"), $("dTop"));
            oS.ControlFlagmeter && oFlagContent.init({ fullValue: oP.FlagNum-1, curValue: 0 });  //显示进度条
            oS.InitLawnMover();
            oS.coolSpeed = Infinity; //change the cooldown to 0s in the title display when hovering a plant card
            PrepareGrowPlants(_ => {
                oP.Monitor(oS.Monitor, oS.UserDefinedFlagFunc);
                //默认所有植物没有任何冷却
                for (let obj of ArCard) {
                    obj.PName.prototype.SunNum <= oS.SunNum && (obj.SunReady = 1, $(obj.DID).childNodes[0].style.top ="0");
                    obj.CDReady = 1; //标记冷却完成
                }
                AutoProduceSun(50);
                oSym.addTask(1200, _ => {
                    oP.AddZombiesFlag();
                    oS.ControlFlagmeter && oFlagContent.show();
                });
            });
        }else{
            prepareFun&&prepareFun();
        }
        BeginCardKey();
        ShortcutInstructions();
        let objFun = {
            ChosePlant: (() => {
                let tempfunc = window.ChosePlant;
                return (evt, index, NavigateOnly = false) => {
                    if(index + 1 > ArCard.length) return;
                    index === -1 && (index = 9);
                    if(ArCard[index].Forbidden) return;     //在争分夺秒里被禁用则无法种植
                    tempfunc(evt, index, NavigateOnly);
                };
            })(),
            GrowPlant(data, X, Y, R, C){
                let index = oS.ChoseCard;
                let card = ArCard[index];
                let plant = card.PName;
                let proto = plant.prototype;
                let coolTime = proto.coolTime;
                if (C > oS.BowlingLimitC && ['oNutBowling', 'oBoomNutBowling', 'oBigWallNut', 'oNutBowlingPay', 'oBoomNutBowlingPay', 'oBigWallNutPay', 'oNutBowling2____'].includes(proto.EName)) {
                    oAudioManager.playAudio("buzzer");
                    if(IsMobile||R<1||C<1||C>9){
                        CancelPlant();
                    } else {
                        PlaySubtitle('请把坚果放在分界线左侧！', 700);
                    }
                    return false;
                }
                if (oS.BowlingLimitC < Infinity && C <= oS.BowlingLimitC && plant.prototype.Obj && plant.prototype.EName!="oIThiefZombie") {
                    oAudioManager.playAudio("buzzer");
                    if(IsMobile||R<1||C<1||C>9){
                        CancelPlant();
                    } else {
                        PlaySubtitle('把僵尸放置在线的右边！', 700);
                    }
                    return false;
                }
                if(proto.CanGrow(data, R, C)) {
                    oAudioManager.playAudio(
                        oGd.$GdType[R][C] === 2 ? "plant_water" : `plant${Math.floor(1+Math.random()*2)}`
                    );
                    new plant().Birth(X, Y, R, C, data);
                    oS.SunNum -= proto.SunNum;  //更新阳光
                    //certain plants can only be used for a limited amount of times (e.g. oINecromancerZombie)
                    if (plant.prototype.SpawnLimit) { 
                        plant.spawntimes++;
                        if (plant.spawntimes >= plant.prototype.SpawnLimit) {
                            plant.prototype.SpawnLimitReached = true;
                            card.CDReady = 0;
                            $(card.DID).childNodes[0].style.top = "-60px";
                            card.NoNeedToMonitor = true;
                        }
                    } 
                    if (!proto.Obj) {
                        // 显示泥土动画
                        const effectElement = $("imgGrowSoil");
                        effectElement.src = GrowSoilImg;
                        SetStyle(effectElement, {
                            left: X + 85 + "px",
                            top: Y - 45 + "px",
                            'z-index': 3 * R + 1,
                            visibility: "visible",
                        });
                        oSym.addTask(100, SetHidden, [effectElement]);
                    }
                    CancelPlant();
                } else {
                    oAudioManager.playAudio("buzzer");
                    if (!proto.UndergroundPlant && proto.EName !== 'oLilyPad' && oGd.$GdType[R][C] === 2 && !oGd.$[R + '_' + C + '_0'] && ZimuRQ.style.display !== 'block')
                        PlaySubtitle("先种一片莲叶",150);
                    if (!['oLilyPad', 'oFlowerPot'].includes(proto.EName) && oGd.$GdType[R][C] === 3 && !oGd.$[R + '_' + C + '_0'] && ZimuRQ.style.display !== 'block')
                        PlaySubtitle("先种一个花盆",150);
                    if(IsMobile||R<1||C<1||C>9){
                        CancelPlant();
                    }
                }
            },
            MonitorCard: function (d) {
                var b = ArCard.length,c;
                if (oS.Chose < 1) {
                    while (b--) {
                        if(!(d = ArCard[b]).Forbidden && !d.NoNeedToMonitor){//没有在争分夺秒里被禁用的植物
                            (c = d.PName.prototype).SunNum > oS.SunNum && !d.Forbidden ? (d.SunReady && (d.SunReady =
                            0), $(d.DID).childNodes[0].style.top = "-60px") : (!d.SunReady && (d.SunReady =
                            1), $(d.DID).childNodes[0].style.top = 0)
                        }
                    }
                } else {
                    while (b--) {
                        if(!(d = ArCard[b]).Forbidden){//没有在争分夺秒里被禁用的植物
                            (c = d.PName.prototype).SunNum > oS.SunNum ? d.SunReady && (d.SunReady = 0) : !d.SunReady && (d.SunReady = 1)
                        }
                    }
                }
                ArCard.length > 0 && ViewPlantTitle(oS.MCID);
            },
        };
        RewriteGlobalVariables(objFun);
    },
    HeatWave(duration = 3600) {
        PlaySubtitle("热浪！",700);
        var _ele = NewEle("effect" + Math.random(), "div", "pointer-events:none;position:absolute;z-index:257;width:1900px;height:600px;background:rgb(0,0,0);opacity:0;", 0, EDAll);
        (function AnimLoop() {
            if (!_ele) return;
            oEffects.Animate(_ele, {
                background: "rgb(200,0,0)",
                opacity: 0.08
            }, 0.2, "ease-out", _ => {
                oSym.addTask(100, _ => {
                    if (!_ele) return;
                    oEffects.Animate(_ele, {
                        opacity: 0
                    }, 0.4, "linear", AnimLoop);
                });
            });
        })();
        for (let y = 1; y < 6; y++) {
            for (let x = 1; x < 10; x++) {
                let floor = CustomSpecial(oHeatFloor, y, x).SetDuration(duration);
            }
        }
        oSym.addTask(duration, _ => {
            ClearChild(_ele);
        });
    },
    AutumnGust(mincol, col){
        if (!col) return;
        const type = ["images/Props/Effect/wind.webp", "images/Props/Effect/leaf_small.webp",
            "images/Props/Effect/leaf_big.webp"];
        const sizeData = [[1500,531],[100,100],[200,200]];
        let after = [];
        for (let i = 0; i < type.length; i++) {
            after[i] = new Image();
            after[i].src = type[i];
        }
        (function a() {
            let isLoaded = true;
            for (let i = 0; i < after.length; i++) {
                if (!after[i].complete) {
                    isLoaded = false;
                    break;
                }
            }
            if (!isLoaded) {
                oSym.addTask(100, a);
            } else {
                for (let i = 0; i < type.length; i++) {
                    delete after[i];
                }
                run();
            }
        })();
        function run() {
            for (let i = 0, len = 5 * 15; i < len; i++) {
                let h = 6 * (Math.random() * 10 + 5);
                h < 25 && (h = Math.random() * 15 + 25);
                let rand = Math.floor(Math.random()*type.length);
                let obj = NewImg(`oWindEffect${Math.random()}`, type[rand],
                    `position: absolute;transform:translateX(${col < 0 ? oS.W : -500}px) rotate(${rand > 0 && !$User.LowPerformanceMode ? 180 : 0}deg);top:${Math.random()*(5.5)*100+100*1-20}px;z-index:25;height:${h}px;`
                );
                let wid = (sizeData[rand][0] * h / sizeData[rand][1]);
                obj.style.width = wid + "px";
                requestAnimationFrame(_ => {
                    EDAll.append(obj);
                    let trans = `translateX(${col < 0 ? -wid : wid+oS.W}px)`;
                    let speedMulti = 0.5;
                    oSym.addTask(100*Math.random(),()=>{
                        if (rand > 0) {
                            trans += ` translateY(${[wid,-wid].random() + Math.random()*400*[1,-1].random()}px)`;
                            speedMulti = 1;
                        }
                        oEffects.Animate(obj, {
                            transform: trans
                        }, (Math.random() / 2 + 0.5)/oSym.NowSpeed*speedMulti, "ease-out", ClearChild);
                    });
                });
            }
            oAudioManager.playAudio('Blover');
            PlaySubtitle("狂劲秋风！",700);
            for (let i in $Z) {
                let zom = $Z[i];
                if (GetC(zom.X) >= mincol && GetC(zom.X) < 10 && zom.R != 3) {
                    zom.Bounce({
                        distance: col,
                        velocity: -2,
                    });
                }
            }
        }
    },
    IceStorm(a, b, number = 0) {
        oAudioManager.playAudio('frostbite');
        //开始行 结束行 生成冰块数量
        const juli = Math.abs(a - b); //一共生成的行数
        const type = ["images/Props/Effect/snow-small.png", "images/Props/Effect/snow-medium.png",
            "images/Props/Effect/snow-large.png"];
        const sizeData = [[1500,619],[1500,623],[1500,531]];
        let after = [];
        for (let i = 0; i < type.length; i++) {
            after[i] = new Image();
            after[i].src = type[i];
        }
        (function a() {
            let isLoaded = true;
            for (let i = 0; i < after.length; i++) {
                if (!after[i].complete) {
                    isLoaded = false;
                    break;
                }
            }
            if (!isLoaded) {
                oSym.addTask(100, a);
            } else {
                for (let i = 0; i < type.length; i++) {
                    delete after[i];
                }
                run();
            }
        })();
        function run() {
            //开始行 结束行 生成冰块数量
            for (let i = 0, len = (juli + 1) * 25; i < len; i++) {
                let h = (juli + 1) * (Math.random() * 10 + 5);
                h < 25 && (h = Math.random() * 15 + 25);
                let rand = Math.floor(Math.random()*type.length);
                let obj = NewImg(`oSnowEffect${Math.random()}`, type[rand],
                    `position: absolute;transform:translateX(${oS.W}px);top:${Math.random()*(juli+0.5)*100+100*(Math.min(a,b))-20}px;z-index:25;height:${h}px;`
                );
                let wid = (sizeData[rand][0] * h / sizeData[rand][1]);
                obj.style.width = wid + "px";
                requestAnimationFrame(_ => {
                    EDAll.append(obj);
                    oSym.addTask(200*Math.random(),()=>{
                        oEffects.Animate(obj, {
                            transform: `translateX(-${wid}px)`
                        }, (Math.random() / 2 + 0.5)/oSym.NowSpeed, "ease-out", ClearChild);
                    });
                });
            }
            for (let i = 9; i > 1 && number > 0; i--) {
                let plants = hasPlants(true, function (plant) {
                    if (plant.R >= Math.min(a, b) && plant.R <= Math.max(a, b) && plant.C == i) {
                        return true;
                    }
                    return false;
                });
                for (let j = 0; j < plants.length && number > 0; j++) {
                    let rand = Math.floor(Math.random() * plants.length);
                    let plant = plants[rand];
                    if(!plant){
                        plants.splice(rand, 1);
                        continue;
                    }
                    PlaceZombie(oIceBlock, plant.R, plant.C, 0);
                    oGd.killAll(plant.R, plant.C,'JNG_TICKET_IceStorm');
                    plants.splice(rand, 1);
                    number--;
                }
            }
        }
    },
    Frostbite(apartTime, hurt, autoStartGame = true) {
        /* 低温损害start */
        function _Frostbite() {
            let realApartTime = 
                    (typeof apartTime === 'function') ? apartTime() : apartTime;
            let realHurtValue = 
                    (typeof hurt === 'function') ? hurt() : hurt;
            oAudioManager.playAudio('frostbite');
            oEffects.Animate(
                NewEle(`Frostbite${Math.random()}`, "div",
                    "z-index: 20;position: absolute;width: 200px;height: 600px;left: -200px;background: -webkit-linear-gradient(left, rgba(16, 234, 194, 0) 0px, #00a1ff52 50%, rgba(255, 255, 255, 0) 100%);transform: skewX(-25deg);",
                    0, EDAll), {
                    left: oS.W + 'px'
                }, 'slow', 'ease-in', ClearChild
            );
            hasPlants(false, plant => {
                return plant.getHurt && plant.EName !== 'oBrains' && plant.EName !== 'oLawnCleaner' && plant.isPlant;
            }).forEach(plant => {
                plant.getHurt(null, 3, realHurtValue);
            });
            oSym.addTask(realApartTime, _Frostbite);
        };
        /* 低温损害end */

        if (autoStartGame) {
            oAudioManager.playMusic(oS.StartGameMusic);
            SetVisible($("tdShovel"), $("dFlagMeter"), $("dTop"));
            oS.InitLawnMover();
            oS.ControlFlagmeter && oFlagContent.init({
                fullValue: oP.FlagNum - 1,
                curValue: 0
            }); //显示进度条
            PrepareGrowPlants(function() {
                oP.Monitor(oS.Monitor, oS.UserDefinedFlagFunc);
                BeginCool();
                _Frostbite();
                PlaySubtitle("注意冰风！它会减少植物的血量！");
                oSym.addTask(1200, function() {
                    PlaySubtitle();
                    oP.AddZombiesFlag();
                    oS.ControlFlagmeter && oFlagContent.show();
                });
            })
        } else {
            _Frostbite();
        }
    },
    /* 有完没完，调用示例如下：
        oMiniGames.WinWithScore({
            scoreMax: 15000,
            //如果开启附加分，则specialList为附加分，其与func结果之和为总加(扣)分
            useZombieExtraScore: true,
            usePlantExtraScore: false,
            specialZombiesList: {
                '500': ['oGargantuar'],
                '140': ['oZomboni', 'oBeetleCarZombie'],
                '80': ['oSculptorZombie', 'oFootballZombie', 'oBucketheadZombie','oSculpture'],
                '60': ['oCaskZombie'],
            },
            specialPlantsList: {
                '5000': ['oLawnCleaner'],
                '-50': ['AllP']
            },
        });
    */
    //'AllP' applies to all plants (those with .isPlant = 1) and can stack with other individual plant scores
    //useZombieExtraScore: if false, then the score of zombies listed in specialZombiesList will be replaced entirely with the score in the list. If true, then the score in the list will be added to the zombie's default score.
    //useTournamentMultiplier: use the special multiplier from Skill Tournament mode (技巧赛) in Angel Shadow's Hut
    //scoreIsObjective: in certain WinWithScore levels, score is used as an objective instead of a win condition, and oS.ScoreConditionNotMet will be set to true at the start of the level. When you get enough score, this is set to false. If toWin is triggered but ScoreConditionNotMet is true, trigger toOver(2) instead
    WinWithScore({scoreMax, specialZombiesList = [], specialPlantsList = [], zombieFunc, plantFunc, useZombieExtraScore = false, usePlantExtraScore = false, useTournamentMultiplier = false, scoreIsObjective = false}) {
        if (scoreIsObjective) oS.ScoreConditionNotMet = oS.IZombie ? false : true;
        /* 初始化hook */
        zombieFunc = zombieFunc || ( z => Math.floor((z.HP + z.OrnHP)/13) );
        plantFunc = plantFunc || ( p => oS.IZombie ? (p.EName === 'oIBrains' ? -200 : 0) : (!p.isPlant ? 0 : 50) );
        const tempZHook = new Map();
        const tempPHook = new Map();
        for(let _score in specialZombiesList) {
            for(let _zombie of specialZombiesList[_score]) {
                tempZHook.set(_zombie, Number.parseFloat(_score));
            }
        }
        for(let _score in specialPlantsList) {
            for(let _plant of specialPlantsList[_score]) {
                tempPHook.set(_plant, Number.parseFloat(_score));
            }
        }
        /* 初始化进度条 */
        oS.ControlFlagmeter = false;
        oFlagContent.init({
            MeterType: `LeftBar ${oS.IZombie ? "RedBar" : "GreenBar"}`,
            HeadType: 'NoneHead',
            canMoveHead: false,
            fullValue: scoreMax,
        }).show();
        if (oS.IZombie) {
            NewEle("DeathZombieHead","div","position:absolute;right:-25px;background-image: url(images/interface/Topbar.webp);",{
                className: 'NormalHead',
            },dFlagMeterContent);
            NewEle("RedNo","div","position:absolute;right:-37px;background-image: url(images/interface/wrong.webp);background-size: cover;height: 30px;width: 55px;top: -7px;",{
            },dFlagMeterContent);
        }
        SetBlock($('dGameScore'));
        /* 监听oS.GameScore */
        let $score = 0;
        let Text_ScoreNum = $('scoreNum');
        $('scoreMax').innerText = scoreMax;
        Object.defineProperty(oS, 'GameScore', {
            get: _ => $score,
            set : x => {
                x = Math.max( Math.min(x, scoreMax), 0 );  //屏蔽负分和超分
                Text_ScoreNum.innerText = $score = x;
                oFlagContent.update({ curValue: x });
                if($score === Number(scoreMax)) {
                    if (scoreIsObjective) {
                        oS.ScoreConditionNotMet = oS.IZombie ? true : false;
                        return;
                    }
                    delete oS.GameScore;
                    for(let v of $Z) v.ExplosionDie(1);
                    if (!oS.IZombie) {
                        toWin();
                    } else {
                        oSym.addTask(100, toOver, [2, 0, 5]);
                    }
                } else {
                    if (scoreIsObjective) {
                        oS.ScoreConditionNotMet = oS.IZombie ? false : true;
                        return;
                    }
                }
            },
            configurable: true,
        });
        function formatZero(num,length){
            var numstr = num;
            var l=numstr.length;
            if (numstr.length>=length) {return numstr;}
            for(var  i = 0 ;i<length - l;i++){
                numstr = "0" + numstr;  
            }
            return numstr; 
        }
        let rate = 1;
        let reduceTime = oSym.Now;
        let reduceloops = 0;
        function GiveScore(delta, color = '#ffff00', zombR, zombC, zombTopPosition, zombLeftPosition, zIndex = 255, Multipliable = true) {
            if (delta === 0) return;
            let ScoreTile = oGd.$[`${zombR}_${zombC}_8`];
            let multi;
            if (isNaN(zombTopPosition)) zombTopPosition = GetY(zombR);
            if (isNaN(zombLeftPosition)) zombLeftPosition = GetX(zombC);
            zombLeftPosition = Math.min(1000,zombLeftPosition);
            if (oS.UpsideDown) zombTopPosition = oS.H - zombTopPosition;
            if (Multipliable && ScoreTile?.EName === 'oScoreTile') {
                color = ScoreTile.MultiplierColors[ScoreTile.Multiplier];
                delta *= ScoreTile.Multiplier;
                multi = ScoreTile.Multiplier;
                ScoreTile.TextEle.style.opacity='1';
                ScoreTile.Ele.style.transform='scale(1.5)';
                oEffects.Animate(ScoreTile.TextEle,{
                    opacity:0.5,
                },0.5);
                oEffects.Animate(ScoreTile.Ele,{
                    transform:'scale(1)',
                },0.5);
            }
            oS.GameScore+=delta;
            if (delta === 0 && !multi && multi != 0) return;
            let dom=NewEle("",`a`,`position:absolute;color:${color};font-weight:bold;transform:scale(1);opacity:1;left:${zombLeftPosition+'px'};z-index:${zIndex};pointer-events:none;top:${zombTopPosition+"px"};font-size:${Math.min(Math.max(delta/1000,1.5),4)}em;text-shadow:0 0 2px #000,0 0 3px #000,0 0 4px #000;`,{
                innerText:delta
            },EDAll);
            oEffects.Animate(dom,{
                top:(zombTopPosition - 100)+"px",
                opacity:0,
                transform:`scale(${1.5 + (multi ? multi*0.25 : 0)})`
            },2,`ease-out`,ClearChild);
        }
        /* 分数处理器 */
        function markScore(ele) {
            let id = ele.id;
            if (/Tomb_/.test(id)) {
                let name = 'oTombstone';
                let delta = 0;
                if(tempPHook.has(name)) {
                    let plantLeftPosition = Number.parseInt(ele.style.left)+25+oS.EDAllScrollLeft+115;
                    let plantTopPosition = Number.parseInt(ele.style.top) + 125 - 50;
                    let plantR = GetR(plantTopPosition), plantC = GetC(plantLeftPosition-80);
                    delta += tempPHook.get(name);
                    GiveScore(delta, "#ffff00", plantR, plantC, plantTopPosition, plantLeftPosition, ele.style.zIndex);
                }
            }
            let constructor = window[ele.dataset['jngConstructor']];
            if(!constructor) return;
            let pt = constructor.prototype;
            let name = pt.EName;
            if (name === "oPoolCleaner") name = "oLawnCleaner";
            if(id.includes('Z_0.') && Number.parseFloat(ele.style.left) < oS.W && Number.parseInt(ele.style.left) > -100 && (!$Z[id] || $Z[id].HP <= 0)) {
                let delta = 0, color = '#FFFF00';
                if(useZombieExtraScore && tempZHook.has(name)) {
                    delta += tempZHook.get(name) + zombieFunc(pt);
                } else {
                    delta += tempZHook.has(name) ? tempZHook.get(name) : zombieFunc(pt);
                }
                if (useTournamentMultiplier) {
                    delta = Number.parseInt(rate*GetC(Number.parseInt(ele.style.left)+Number.parseInt(ele.offsetWidth)/2)*delta);
                    rate+=0.1;
                    reduceTime=oSym.Now+500;
                    oSym.addTask(500,function redu(){
                        if(reduceTime>oSym.Now && reduceloops > 20){
                            oSym.addTask(reduceTime-oSym.Now,redu);
                            reduceloops++;
                            return;
                        }
                        rate-=0.1;
                        reduceloops = 0;
                    });
                    let r = 255;
                    let g = 255;//ffff00
                    if(rate<2.5){
                        g = g*(1-(rate-1)/1.5);
                    }else{
                        g = 0;
                        r = Math.max(0,r*(1-(rate-2.5)/2.5));
                    }
                    color = "#"+formatZero(Number.parseInt(r).toString(16),2)+formatZero(Number.parseInt(g).toString(16),2)+"00";
                    //console.log(color);
                }
                let zombLeftPosition = Number.parseInt(ele.style.left)+constructor.prototype.beAttackedPointL+oS.EDAllScrollLeft+115;
                let zombTopPosition = Number.parseInt(ele.style.top) + pt.height - 50;
                let zombR = GetR(zombTopPosition), zombC = GetC(zombLeftPosition-80);
                GiveScore(delta, color, zombR, zombC, zombTopPosition, zombLeftPosition, ele.style.zIndex);
                
            } else if(id.includes('P_0.') && name !== 'oRifterAnimate' && !/Vase/.test(name) && !pt.Obj) { //.Obj is for the I Zombie "plant-likes" that later spawn zombies
                let plantLeftPosition = Number.parseInt(ele.style.left)+constructor.prototype.beAttackedPointL+oS.EDAllScrollLeft+115;
                let plantTopPosition = Number.parseInt(ele.style.top) + pt.height - 50;
                let plantR = GetR(plantTopPosition), plantC = GetC(plantLeftPosition-80);
                if (name === 'oLawnCleaner' && plantC <= 0) return;
                let delta = 0;
                if(usePlantExtraScore && tempPHook.has(name)) {
                    delta += tempPHook.get(name) + plantFunc(pt);
                } else {
                    delta += tempPHook.has(name) ? tempPHook.get(name) : plantFunc(pt);
                }
                if(tempPHook.has("AllP") && pt.isPlant) {
                    delta += tempPHook.get("AllP");
                }
                GiveScore(delta, "#ffff00", plantR, plantC, plantTopPosition, plantLeftPosition, ele.style.zIndex, !pt.isPlant);
            }
        }
        /* 监听页面元素变化 */
        addEventListenerRecord('jng-event-startgame', () => {
            const callback = (mutations) => {
                IsGaming(1) && mutations.forEach(MutationRecord => 
                    MutationRecord.removedNodes.forEach(markScore)
                );
            };
            // 开启childList只能监控DOM树根节点（EDPZ）的子节点情况
            // 所以这里需要增开subtree开关用于监控DOM树的后代节点的变动情况
            new MutationObserver(callback).observe(EDPZ, {childList:true, subtree:true});    
        });
    },
    IZombie(callback = toWin) {
        /* 初始化进度条 */
    	let Brains=hasPlants(false, plant=>{return plant.EName === "oIBrains"});
    	let TotalBrainsNum = Brains.length, BrainsNum=TotalBrainsNum;
        oS.ControlFlagmeter = false;
        oFlagContent.init({
            MeterType: 'LeftBar GreenBar',
            HeadType: 'NoneHead',
            canMoveHead: false,
            fullValue: TotalBrainsNum,
        }).show();
        SetBlock($('dGameScore'));
        let Text_ScoreNum = $('scoreNum');
        $('scoreMax').innerText = TotalBrainsNum;
        function updateScore(){
            if (oFlagContent['__MeterEle__'].classList.value === 'LeftBar GreenBar') {
                oFlagContent.update({ 
                    curValue: (Text_ScoreNum.innerText = TotalBrainsNum-BrainsNum)
                });
            }
            if(BrainsNum<=0) {
                callback();
            }
        }
    	for(let i=TotalBrainsNum-1;i>=0;i--){
            let oriPrivateDie = Brains[i]?.oriPrivateDie;
            Brains[i].PrivateDie=(...arr)=>{
                oriPrivateDie&&oriPrivateDie.bind(Brains[i])(...arr);
                BrainsNum--;
                updateScore();
            };
        }
    },
    oMirrorGame(){
        let canvas = NewEle("","canvas","position:absolute;left:"+oS.FightingSceneLeft+"px;top:0;width:"+oS.W+"px;height:600px;pointer-events:none;",{
            width:oS.W,
            height:600,
        },FightingScene);
        let mirrorRad = 0;
        let ctx = canvas.getContext("2d");
        let mirroredPlant = new Map();
        let centerPos = [GetX(5),GetMidY(3)];
        let cos_sin = [Math.cos(mirrorRad),Math.sin(mirrorRad)];
        let locked = true;
        draw();
        let arrowLeft = NewEle("arrowLeft","div","display:block;width:58px;height:55px;top: 300px;position: absolute;cursor: pointer;z-index: 255;background: url(images/interface/Map_Turn.webp);left:150px;transform: scaleX(-1);",{
            className: 'jngButton',
        },EDAll);
        let arrowRight = NewEle("arrowRight","div","display:block;width:58px;height:55px;top: 300px;position: absolute;cursor: pointer;z-index: 255;background: url(images/interface/Map_Turn.webp);right:1px;",{
            className: 'jngButton',
        },EDAll);
        let lockEle = NewEle("lockEle","div","display:block;width:61px;height:59px;top: 300px;position: absolute;cursor: pointer;z-index: 255;background: url(images/interface/lock.webp) no-repeat;left:590px;transform:scale(1.2)",{
            className: 'jngButton',
        },FightingScene);
        arrowLeft.onclick = function() {rotateMirror(-0.1);};
        arrowRight.onclick = function() {rotateMirror(0.1);};
        lockEle.onclick = function() {changeLock();};
        function rotateMirror(ang){
            let bc = [mirrorRad,cos_sin];
            mirrorRad+=ang;
            cos_sin = [Math.cos(mirrorRad),Math.sin(mirrorRad)];
            if(!intersect()&&!reMirror()){
                oAudioManager.playAudio('click3');
                draw();
            }else{
                oAudioManager.playAudio('buzzer');
                mirrorRad = bc[0];
                cos_sin = bc[1];
            }
        }
        function draw(){
            ctx.clearRect(0,0,oS.W,600);
            ctx.beginPath();

            ctx.strokeStyle = "black";

            ctx.lineWidth = 10;

            ctx.lineCap = "round";

            ctx.moveTo(centerPos[0]-cos_sin[0]*1000,centerPos[1]-cos_sin[1]*1000);

            ctx.lineTo(centerPos[0]+cos_sin[0]*1000,centerPos[1]+cos_sin[1]*1000);

            ctx.stroke();

            ctx.closePath();
        }
        function getMirrorPos(R,C){
            let [oX,oY] = [GetX(C),GetMidY(R)];
            let [x,y] = [centerPos[0]-oX,centerPos[1]-oY];
            let dis2 = -(x*cos_sin[0]+y*cos_sin[1]);
            [x,y] = [x+dis2*cos_sin[0],y+dis2*cos_sin[1]];
            let [tX,tY] = [x*2+oX,y*2+oY];
            return GetR(tY)*100+GetC(tX);
        }
        function check_kill(X,Y){
            if((centerPos[0]-X)**2+(centerPos[1]-Y)**2-Math.abs((centerPos[0]-X)*cos_sin[0]+(centerPos[1]-Y)*cos_sin[1])**2<=1600){
                return true;
            }
            return false;
        }
        function intersect(){
            let p;
            let killedRC = new Set();
            let jump = false;
            mirroredPlant.forEach((v,k)=>{
                if(jump){
                    return;
                }
                p = $P[k];
                if(killedRC.has(v.R*100+v.C)||!p){//被删掉了肯定就已经没有了
                    mirroredPlant.delete(k);
                    return;
                }
                if(check_kill(GetX(p.C),GetMidY(p.R))){
                    if (locked) {
                        console.log('INTERSECT_',p.R,p.C);
                        showTileWarning(p.R,p.C);
                        showTileWarning(v.R,v.C);
                        jump=true;
                        return;
                    } else {
                        oGd.killAll(p.R,p.C,"JNG_TICKET_MembraneZombie");
                        killedRC.add(v.R*100+v.C);
                        mirroredPlant.delete(k);
                    }
                }
            });
            if(jump){
                PlaySubtitle("存在镜子与植物相交",200);
            }
            return jump;
        }
        function reMirror(){
            let positions = new Set(),tmp;
            let jump = 0;
            mirroredPlant.forEach((v,k)=>{
                if(jump>0){return;}
                tmp=getMirrorPos($P[k].R,$P[k].C);
                let R = Math.Clamp(Math.floor(tmp/100),1,oS.R);
                let C = Math.Clamp(tmp%100,1,oS.C);
                let [X,Y] = [GetX(C),GetMidY(R)];
                if(!positions.has(tmp+"_")){
                    positions.add(tmp+"_");
                }
                
                let canGrow = !oGd.$Sculpture[R + '_' + C] && !oGd.$Tombstones[R + '_' + C];
                //let canGrow = $P[k].CanGrow(GetAP(X,Y,R,C)[0],R,C);
                
                if(($P[v.id]&&(R!==v.R||C!==v.C)&&!canGrow) && locked) {
                    console.log(`CAN'T GROW `,R,C);
                    showTileWarning(R,C);
                    showTileWarning(v.R,v.C);
                    showTileWarning($P[k].R,$P[k].C);
                    jump=2;
                    return;
                }
            });
            if(jump>0){
                if(jump===1){
                    PlaySubtitle("存在植物镜像超出边界！",200);
                }else{
                    PlaySubtitle("存在植物镜像重叠！",200);
                }
                return true;
            }
            mirroredPlant.forEach((v,k)=>{
                let pos = getMirrorPos($P[k].R,$P[k].C);
                let cloneR = Math.Clamp(Math.floor(pos/100),1,oS.R);
                let cloneC = Math.Clamp(pos%100,1,oS.C);
                if(!v||v.R!==cloneR||v.C!==cloneC){
                    let clone;
                    if(!v){
                        clone = createMirrorPlant(k,$P[k].constructor,cloneR,cloneC);
                    }else{
                        clone = v.moveTo(cloneR,cloneC,{},true);
                    }
                    if(!clone){
                        $P[k].Die("JNG_TICKET_MembraneZombie");
                        console.log(v);
                    }else{
                        mirroredPlant.set(k,clone);
                        console.log("set");
                    }
                }
            });
            return false;
        }
        function createMirrorPlant(oid,constructor,R,C){
            R = Math.Clamp(R,1,oS.R);
            C = Math.Clamp(C,1,oS.C);
            let plant = CustomSpecial(constructor,R,C,"none");
            plant.isPlant = 0;
            plant.canEat = 0;
            plant.Stature = -Infinity;
            plant.canShovel=false;
            plant.BlockAllPKind = false;
            let filters = [["opacity","0.6"]];
            if (!$User.LowPerformanceMode) {
                filters.push(["hue-rotate","90deg"]);
            }
            EditCompositeStyle({
                ele:plant.Ele,
                styleName:"filter",
                addFuncs:filters,
                option:2
            });
            let oldDIE = plant.Die;
            plant.Die=function(...arr){
                oldDIE.bind(plant)(...arr);
                if(!$P[plant.id]&&$P[oid]){
                    $P[oid].Die(...arr);
                    mirroredPlant.delete(oid);
                }
            };
            plant.oldDie=function(...arr){
                oldDIE.bind(plant)(...arr);
            };
            return plant;
        }
        function isANormalPlant(id,pt){
            return $P[id]&&!pt.Tools&&pt.isPlant;
        }
        function changeLock() {
            oAudioManager.playAudio('pause');
            console.log(locked ? "unlocked" : "locked");
            locked = locked ? false : true;
            PlaySubtitle(("Plant Safety Lock: " + (locked ? "ON" : "OFF")), 500);
            SetStyle(lockEle, {
                background: "url(images/interface/"+ (locked ? "lock" : "unlock") + ".webp) no-repeat",
                left: (locked ? "590px" : "570px"),
            });
        }
        function showTileWarning(R=1, C=1) {
            let warningTile = NewEle("warningTile_" + R + "_" + C,  'div', `position:absolute;z-index:0;height:100px;width:80px;background:red;opacity:0.8;pointer-events:none;`,{},FightingScene);
            SetStyle(warningTile, {
                top: (100 + oS.DeltaY*(R-1) - 30) + "px",
                left: (80*C + 170) + "px",
            });
            oEffects.fadeOut(warningTile,'slow',ClearChild);
        }
        function addPlant(ele) {
            let id = ele.id;
            let constructor = window[ele.dataset['jngConstructor']];
            if(!constructor) return;
            let pt = constructor.prototype;
            let name = pt.EName;
            let clone,self = $P[id];
            if(isANormalPlant(id,self)&&pt?.PKind!==undefined){
                let pos = getMirrorPos(self.R,self.C);
                clone = createMirrorPlant(id,constructor,Math.floor(pos/100),pos%100);
                mirroredPlant.set(id,clone);//如果没有创建成功clone为false
                if (pt.EName === 'oPricklyRose') {
                    self.CanGrow = clone.CanGrow = CPlants.prototype.CanGrow;
                    delete oGd.$[clone.R + "_" + clone.C + "_1"];
                }
                let oldDIE = self.Die;
                let oldMoveTo = self.moveTo;
                self.Die=function(...arr){
                    oldDIE.bind(self)(...arr);
                    if(!$P[id]){
                        if(mirroredPlant.get(id)){
                            mirroredPlant.get(id).Die(...arr);//这里不能用clone，因为clone可能会被换掉
                        }
                        mirroredPlant.delete(id);
                    }
                };
                self.moveTo = function(...arr){
                    let [R,C] = arr;
                    let mirrorPoint = getMirrorPos(R,C);
                    let RC = [Math.Clamp(Math.floor(mirrorPoint/100),1,oS.R), Math.Clamp(mirrorPoint%100,1,oS.C)];
                    let [X,Y] = [GetX(C),GetMidY(R)];
                    if(-(X-centerPos[0])*cos_sin[1]+(Y-centerPos[1])*cos_sin[0]<0||check_kill(X,Y)){
                        return false;
                    }
                    if(mirroredPlant.get(id)){
                        mirroredPlant.get(id).oldDie("JNG_TICKET_MembraneZombie");//这里不能用clone，因为clone可能会被换掉
                    }
                    mirroredPlant.delete(id);
                    return oldMoveTo.bind(self)(...arr);
                };
                console.log("PLANT ADDED");
            }
        }
        /* 监听页面元素变化 */
        addEventListenerRecord('jng-event-startgame', () => {
            const callback = (mutations) => {
                IsGaming(1) && mutations.forEach(MutationRecord =>{ 
                        MutationRecord.addedNodes.forEach(addPlant);
                    }
                );
            };
            // 开启childList只能监控DOM树根节点（EDPZ）的子节点情况
            // 所以这里需要增开subtree开关用于监控DOM树的后代节点的变动情况
            new MutationObserver(callback).observe(EDPZ, {childList:true, subtree:true});    
            addEventListenerRecord("keydown",(e)=>{
                if(IsGaming(1)){
                    if(e.key==="ArrowLeft"||e.key==="a"){
                        rotateMirror(-0.1);
                    }else if(e.key==="ArrowRight"||e.key==="d"){
                        rotateMirror(0.1);
                    }else if(e.key==="ArrowUp"||e.key==="w") {
                        changeLock();
                    }
                }
            });
            let oldGP=GrowPlant;
            RewriteGlobalVariables({
                GrowPlant(data, X, Y, R, C) {
                    console.log(-(X-centerPos[0])*cos_sin[1],(Y-centerPos[1])*cos_sin[0],X,Y);
                    let mirrorPoint = getMirrorPos(R,C);
                    let RC = [Math.Clamp(Math.floor(mirrorPoint/100),1,oS.R), Math.Clamp(mirrorPoint%100,1,oS.C)];
                    if(-(X-centerPos[0])*cos_sin[1]+(Y-centerPos[1])*cos_sin[0]<0){
                        console.log("MIRROR IMAGE BEYOND LAWN BORDERS ",R,C);
                        PlaySubtitle("镜像植物会超过边界！",200);
                        if(IsMobile){
                            CancelPlant();
                        }
                        showTileWarning(R,C);
                        oAudioManager.playAudio('buzzer');
                        return;
                    }
                    let [checkX,checkY] = [GetX(C),GetMidY(R)];
                    if(check_kill(checkX,checkY) || check_kill(X,Y)){
                        console.log("MIRROR IMAGE AND REALITY OVERLAP ",RC[0],RC[1]);
                        PlaySubtitle("Mirror plants and real plants cannot overlap!",200);
                        if(IsMobile){
                            CancelPlant();
                        }
                        showTileWarning(R,C);
                        showTileWarning(RC[0],RC[1]);
                        oAudioManager.playAudio('buzzer');
                        return;
                    }
                    let plant = ArCard[oS.ChoseCard]?.PName||oS.ChoseCardObj?.PName;
                    let pro = plant.prototype;
                    let [data2] = GetAP(GetX(RC[1]),GetY(RC[0]),RC[0],RC[1]);
                    let canGrow = (pro.EName === 'oPricklyRose' && oGd.$[R + '_' + C + '_1']?.isPlant) || /*pro.CanGrow(data2,RC[0],RC[1])*/ (!oGd.$Sculpture[RC[0] + '_' + RC[1]] && !oGd.$Tombstones[RC[0] + '_' + RC[1]]);
                    if((RC[0] === R && RC[1] === C) || !canGrow){
                        if (!pro.CanGrow(data2,RC[0],RC[1])) console.log("CAN'T GROW ",data2,RC[0],RC[1]);
                        PlaySubtitle("镜像植物不可被种植！",200);
                        if(IsMobile){
                            CancelPlant();
                        }
                        showTileWarning(R,C);
                        showTileWarning(RC[0],RC[1]);
                        oAudioManager.playAudio('buzzer');
                        return;
                    }
                    if (pro.EName === 'oPricklyRose') {
                        let dupeSacrifice = mirroredPlant.get(oGd.$[R + '_' + C + '_1']?.id);
                        if (dupeSacrifice) {
                            dupeSacrifice.PKind = 1;
                            dupeSacrifice.isPlant = true;
                            oGd.$[RC[0] + '_' + RC[1] + '_1'] = dupeSacrifice;
                        }
                    }
                    console.log("GROW");
                    oldGP(data,X,Y,R,C);
                },
            },true);
        });
    },
    UpsideDown(bg=tGround_Image.style.background){
        if (!oS.UpsideDown) {
            oAudioManager.playAudio('glitch' + Math.floor(Math.random()*2+1));
            let glitchLayer = oEffects.glitchyLawn(bg);
            let glitchLayer2;
            oSym.addTask(50, () => {
                glitchLayer2 = oEffects.glitchyLawn(bg);
            });
            oSym.addTask(70, () => {
                ClearChild(glitchLayer2);
                SetStyle(dFightingScene,{
                    transform: `rotate(180deg) scaleX(-1)`,
                });
                SetStyle($("tGround_Image"),{
                    transform: `rotate(180deg) scaleX(-1)`,
                });
                SetStyle(dSVGContainers,{
                    transform: `rotate(180deg) scaleX(-1)`,
                });
                SetStyle(dPropsContent,{
                    transform: `rotate(180deg)`,
                    top: `0px`,
                });
                SetStyle(dTop,{
                    top: `540px`,
                });
                SetStyle(dMenu,{
                    top: `540px`,
                });
                SetStyle(dFlagMeter,{
                    top: `545px`,
                });
                if (IsMobile) {
                    SetStyle(dFlagMeter,{
                        top: `530px`,
                    });
                    SetStyle(tdShovel,{
                        top: `-530px`,
                    });
                    SetStyle(dTop,{
                        top: `530px`,
                    });
                }
                oS.UpsideDown = true;
                oSym.addTask(80, () => {
                    ClearChild(glitchLayer);
                });
            });
        } else {
            let Flip = function() {
                SetStyle(dFightingScene,{
                    transform: ``,
                });
                SetStyle($("tGround_Image"),{
                    transform: ``,
                });
                SetStyle(dSVGContainers,{
                    transform: ``,
                });
                SetStyle(dPropsContent,{
                    transform: ``,
                    top: `600px`,
                });
                SetStyle(dTop,{
                    top: `0px`,
                });
                SetStyle(dMenu,{
                    top: `0px`,
                });
                SetStyle(dFlagMeter,{
                    top: `0px`,
                });
                if (IsMobile) {
                    SetStyle(tdShovel,{
                        top: `540px`,
                    });
                }
                oS.UpsideDown = false;
            };
            if (oSym.Timer) {
                oAudioManager.playAudio('glitch' + Math.floor(Math.random()*2+1));
                let glitchLayer = oEffects.glitchyLawn(bg);
                let glitchLayer2;
                oSym.addTask(50, () => {
                    glitchLayer2 = oEffects.glitchyLawn(bg);
                });
                oSym.addTask(70, () => {
                    ClearChild(glitchLayer2);
                    Flip();
                    oSym.addTask(80, () => {
                        ClearChild(glitchLayer);
                    });
                });
            } else {
                Flip();
            }
        }
    },
    WrathSquash(earlyEnd = false, multiInput = false){
        function movePlant(self, R, C) {
            if (!$P[self.id]) return;
            self.oTrigger && oT.delP(self);
            delete oGd.$[self.R + "_" + self.C + "_" + self.PKind];
            let X = GetX(C);
            let Y = GetY(R);
            let plantsArg = GetAP(X, Y, R, C)[0];
            let ele = $(self.id);
            let pixelLeft = X + self.GetDX(self), //默认植物相对于FightingScene左侧的距离=格子中点坐标-0.5*植物图像宽度
                pixelTop = Y + self.GetDY(R, C, plantsArg, true) - self.height; //默认植物顶部相对于FS顶部的距离=格子中点坐标+底座偏移-植物身高
            self.pixelLeft = pixelLeft;
            self.pixelRight = pixelLeft + self.width;
            self.pixelTop = pixelTop;
            self.pixelBottom = pixelTop + self.GetDBottom(self); //默认植物底部相对距离=pt+植物身高
            self.zIndex = self.constructor.prototype.zIndex;
            self.zIndex_cont = self.zIndex + GetMidY(R) + 30;
            self.zIndex += 3 * R;
            self.InitTrigger(self, self.id,
                self.R = R,
                self.C = C,
                self.AttackedLX = pixelLeft + self.beAttackedPointL, //植物左检测点
                self.AttackedRX = pixelLeft + self.beAttackedPointR //植物右检测点
            );
            self.BirthStyle(self, self.id, ele, Object.assign({
                left: pixelLeft + "px",
                top: pixelTop + "px",
                'z-index': self.zIndex_cont,
            }, self.ImgStyle));
            if (self.PKind !== 'none') oGd.add(self, `${R}_${C}_${self.PKind}`); //在场景注册
            oZombieLayerManager.$Containers[R].append(ele);
        }
        let canvas;
        let ctx;
        let theSquash;
        let jumping = false;
        function drawArrow(fromX, fromY, toX, toY,theta=30,headlen=30,width=10,color='#000') {
         
            // 计算各角度和对应的P2,P3坐标
            let angle = Math.atan2(fromY - toY, fromX - toX) * 180 / Math.PI,
                angle1 = (angle + theta) * Math.PI / 180,
                angle2 = (angle - theta) * Math.PI / 180,
                topX = headlen * Math.cos(angle1),
                topY = headlen * Math.sin(angle1),
                botX = headlen * Math.cos(angle2),
                botY = headlen * Math.sin(angle2);
         
            ctx.save();
            ctx.beginPath();
         
            let arrowX = fromX - topX,
                arrowY = fromY - topY;
         
            ctx.moveTo(arrowX, arrowY);
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            arrowX = toX + topX;
            arrowY = toY + topY;
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(toX, toY);
            arrowX = toX + botX;
            arrowY = toY + botY;
            ctx.lineTo(arrowX, arrowY);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
            ctx.restore();
        }
        
        
        let oSquash_SpFes2023=InheritO(oSquash,{
            EName:"oSquash_SpFes2023",
            HP:1000,
            CheckLoop() {},
            NormalGif:6,
            AttackGif:7,
            DropGif:8,
            TurnGif:9,
            __Birthed:false,
            tempPlant:false,
            BirthStyle: (self, id, ele, style) => {
                EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, !self.__Birthed?oZombieLayerManager.$Containers[self.R]:null);
                SetStyle(ele,{
                    'pointer-events':'none'
                });
                self.__Birthed=true;
            },
            PrivateDie: () => {
                ClearChild(canvas, $("HighlightLane"), $("HighlightColumn"));
            },
            NormalAttack: function(speed) {
                jumping = true;
                let self = this;
                let pid = self.id,
                    ele = $(pid),
                    body = ele.childNodes[1],
                    shadow = ele.childNodes[0],
                    oriX = self.pixelLeft,
                    oriY = self.pixelTop,
                    curX = 0,
                    curY = 0,
                    customR = Math.Clamp(speed.R,1,oS.R),
                    shadowRelativeX = Number.parseFloat(shadow.style.left),
                    shadowRelativeY = Number.parseFloat(shadow.style.top);
                if(speed.y>=0){
                    speed.y=-speed.y/1.2;
                }
                if(speed.x<0){
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
                    setDirection(speed.x);
                    body.src = self.PicArr[self.AttackGif];
                    self.Stat=1;
                    oAudioManager.playAudio(self.AudioArr[Math.floor(Math.random()*self.HmmAudioNum)]);
                    let targetX = Math.Clamp(oriX+speed.x,GetX(1)+self.GetDX(self),GetX(oS.C)+self.GetDX(self));
                    let targetY = Math.min(oriY-50,GetY(customR)+self.GetDY(customR, GetC(targetX), [], true)-self.height-150);
                    let trueTargetY = GetY(customR)+self.GetDY(customR, GetC(targetX), [], true)-self.height;
                    let FlyingT = 30;
                    oSym.addTask(33,function loop(t=0){
                        if(self.Stat===2){
                            attack(customR);
                            return;
                        }
                        if(t>=FlyingT+30){
                            curX = targetX-oriX;
                            curY = targetY-oriY;
                            SetStyle(body,{
                                left:curX+"px",
                                top:curY+"px",
                            });
                            SetStyle(shadow,{
                                left:curX+shadowRelativeX+"px",
                                top:shadowRelativeY+trueTargetY-oriY+"px"
                            });
                            attack(customR);
                            return;
                        }
                        let time = Math.Clamp(t,0,FlyingT)/FlyingT;
                        curX = Math.Lerp(oriX,targetX,time)-oriX;
                        curY = Math.Lerp(oriY,targetY,1-(time-1)**2)-oriY;
                        SetStyle(body,{
                            left:curX+"px",
                            top:curY+"px",
                        });
                        SetStyle(shadow,{
                            left:curX+shadowRelativeX+"px",
                            top:shadowRelativeY+(Math.Lerp(oriY,trueTargetY,time)-oriY)+"px"
                        });
                        if($User.LowPerformanceMode){
                            oSym.addTask(2,loop,[t+2]);
                        }else{
                            oSym.addTask(1,loop,[t+1]);
                        }
                    });
                }
                function attack(tarR){
                    self.Stat=2;
                    let checkX= self.pixelLeft+curX+self.width/2;
                    let [R,C] = [tarR,Math.Clamp(speed.C,1,oS.C)];
                    let nowY = oriY+curY;
                    let nowX = oriX+curX;
                    let tarTop = GetY(R)+self.GetDY(R, C, [], true)-self.height;
                    let tarLeft = GetX(C)+self.GetDX(self);
                    body.src = self.PicArr[self.DropGif];
                    (function loop(t=0){
                        if(t>=20){
                            movePlant(self, R, C);
                            SetStyle(body,{
                                left:0,
                                top:0,
                                'z-index':3*R,
                            });
                            SetStyle(shadow,{
                                left:shadowRelativeX+"px",
                                top:shadowRelativeY+"px",
                            });
                            oZ.getArZ(tarLeft-70, tarLeft+130, R).forEach(z=>{
                                z.getHit2(z,1800);
                            });
                            oSym.addTask(33,()=>{
                                self.Stat=0;
                                body.src=self.PicArr[self.NormalGif];
                            });
                            oAudioManager.playAudio(self.AudioArr[Math.floor(Math.random()*(self.AudioArr.length-self.HmmAudioNum))+self.HmmAudioNum]);
                            if(oGd.$GdType[R][C]!=2){
                                oEffects.ScreenShake();
                            }
                            jumping = false;
                            if (self.tempPlant) self.Die("JNG_TICKET_Squash");
                            return;
                        }
                        curY = Math.Lerp(nowY,tarTop,(t/20)**2)-oriY;
                        curX = Math.Lerp(nowX,tarLeft,(t/20))-oriX;
                        SetStyle(body,{
                            top:curY+"px",
                            left:curX+"px",
                        });
                        SetStyle(shadow,{
                            left:curX+shadowRelativeX+"px",
                        });
                        if($User.LowPerformanceMode){
                            oSym.addTask(4,loop,[t+4]);
                        }else{
                            oSym.addTask(2,loop,[t+2]);
                        }
                    })();
                }
            }, 
        });
        let oSquash_Temp=InheritO(oSquash_SpFes2023,{
            EName:"oSquash_Temp",
            tempPlant:true,
            OccupyPKind:false,
            PKind:'none',
            BirthStyle: (self, id, ele, style) => {
                EditEle(ele, {id, 'data-jng-constructor': self.EName}, style, !self.__Birthed?oZombieLayerManager.$Containers[self.R]:null);
                SetStyle(ele,{
                    'pointer-events':'none',
                    'opacity':'0.5'
                });
                self.__Birthed=true;
            },
            PrivateDie:()=>{},
        });
        canvas = NewEle("","canvas","position:absolute;left:0;top:0;width:"+oS.W+"px;height:600px;z-index:30;",{
            width:oS.W,
            height:600,
        },EDPZ);
        ctx = canvas.getContext("2d");
        theSquash = CustomSpecial(oSquash_SpFes2023,3,5);
        
        let TouchOffsetX, TouchOffsetY;
        addEventListenerRecord("jng-event-startgame",function (){
            (function checkMove(){
                let state = 0;
                let oriPos = {x:-114,y:-514};
                let MouseDown = function(e){
                    if(!$P[theSquash.id]){
                        return;
                    }
                    if(theSquash.Stat===0){
                        oriPos.x = e.offsetX;
                        oriPos.y = e.offsetY;
                        if (IsMobile && e.targetTouches) {
                            oriPos.x = TouchOffsetX = e.touches[0].pageX - e.touches[0].target.offsetLeft;
                            oriPos.y = TouchOffsetY = e.touches[0].pageY - e.touches[0].target.offsetTop;
                        }
                        state=1;
                    }else if(earlyEnd && theSquash.Stat===1){
                        theSquash.Stat=2;
                    }
                };
                canvas.onmousedown = e => MouseDown(e);
                SetEvent(canvas, 'touchstart', event => {MouseDown(event);});
                let MouseMove = function (e){
                    if(!$P[theSquash.id]){
                        return;
                    }
                    if(state===1 && (multiInput || !jumping)){
                        ctx.clearRect(0,0,oS.W,600);
                        if (!IsMobile) drawArrow(oriPos.x,oriPos.y,e.offsetX,e.offsetY);
                        
                        let [offsetX, offsetY] = [e.offsetX,e.offsetY];
                        if (IsMobile && e.targetTouches) {
                            let finger = e.targetTouches[0];
                            offsetX = TouchOffsetX = e.touches[0].pageX - e.touches[0].target.offsetLeft;
                            offsetY = TouchOffsetY = e.touches[0].pageY - e.touches[0].target.offsetTop;
                            drawArrow(oriPos.x - 175,oriPos.y,TouchOffsetX-175,TouchOffsetY);
                        }
                        let [evtX, evtY] = [(offsetX-oriPos.x)+theSquash.pixelLeft+theSquash.width*1.2, (offsetY-oriPos.y)+theSquash.pixelTop+theSquash.height/1.2];
                        let [[X, C], [Y, R]] = [ChosePlantX(evtX), ChosePlantY(evtY)];
                        evtX = X, evtY = Y;
                        R = Math.Clamp(R,1,oS.R);
                        C = Math.Clamp(C,1,oS.C);
                        let [data] = GetAP(evtX, evtY, R, C);
                        let proto = oSquash.prototype;
                        if(proto.CanGrow(data, R, C) || (theSquash.R == R && theSquash.C == C)) {
                            PosHighlight(R,C);
                        } else {
                            ClearChild($("HighlightLane"), $("HighlightColumn"));
                        }
                    }
                };
                canvas.onmousemove= e => MouseMove(e);
                SetEvent(canvas, 'touchmove', event => {MouseMove(event);});
                let MouseUp = function (e){
                    if(!$P[theSquash.id]){
                        return;
                    }
                    if(state===1 && (multiInput || !jumping)){
                        ctx.clearRect(0,0,oS.W,600);
                        ClearChild($("HighlightLane"), $("HighlightColumn"));
                        state=0;
                        let offsetX = IsMobile ? TouchOffsetX : e.offsetX;
                        let offsetY = IsMobile?TouchOffsetY:e.offsetY;
                        let [evtX, evtY] = [(offsetX-oriPos.x)+theSquash.pixelLeft+theSquash.width*1.2, (offsetY-oriPos.y)+theSquash.pixelTop+theSquash.height/1.2];
                        let [[X, evtC], [Y, evtR]] = [ChosePlantX(evtX), ChosePlantY(evtY)];
                        evtX = X, evtY = Y;
                        evtR = Math.Clamp(evtR,1,oS.R);
                        evtC = Math.Clamp(evtC,1,oS.C);
                        let [data] = GetAP(evtX, evtY, evtR, evtC);
                        if (!oSquash.prototype.CanGrow(data, evtR, evtC) && !(theSquash.R == evtR && theSquash.C == evtC)) {
                            oAudioManager.playAudio('buzzer');
                            return;
                        }
                        if (jumping) {
                            if (!(theSquash.R == evtR && theSquash.C == evtC)) {
                                let tempSquash = CustomSpecial(oSquash_Temp,theSquash.R,theSquash.C);
                                tempSquash.NormalAttack({x:(offsetX-oriPos.x),y:(offsetY-oriPos.y),R:evtR,C:evtC});
                            } else {
                                oAudioManager.playAudio('buzzer');
                            }
                        } else {
                            theSquash.NormalAttack({x:(offsetX-oriPos.x),y:(offsetY-oriPos.y),R:evtR,C:evtC});
                        }
                    }
                }
                canvas.onmouseup = e => MouseUp(e);
                SetEvent(canvas, 'touchend', event => {MouseUp(event);});
            })();
        });
        return theSquash;
    },
    oStg:{
        canvas:null,
        tmpCanvas:null,
        tmpCtx:null,
        cid:null,
        offscreen:null,
        ctx:null,
        bullets:{},
        hero:null,
        boss:null,
        screenRatio:2/3,//低性能模式绘制比例设置在下面
        sq2:Math.sqrt(2),
        key:[],
        
        SlowSpeed:0,//是否有处理落
        DrawMode:1,//是否采用putImageData
        checkTrigger(trigger1,trigger2){//圆形判定
            return Math.pow(trigger1.x-trigger2.x,2)+Math.pow(trigger1.y-trigger2.y,2)<=Math.pow(trigger1.r+trigger2.r,2);
        },
        publicRGB:{
            "purple":[100,0,100],
            "blueWhite":[0,100,100],
            "darkBlue":[0,0,100],
            "green":[0,100,0],
            "red":[100,0,0],
            "orange":[100,50,0],
            "yellow":[100,100,0],
        },
        publicPic:{
            "ball":"images/Props/Bullets/ball.png",
            "rice":"images/Props/Bullets/rice.png",
            "big":"images/Props/Bullets/Big.png",
        },
        Variables:{},
        publicImg:{},
        inited:false,
        drawing:false,
        mousePos:[0,0],
        mouseMovePos:[0,0],
        heroPos:[0,0],
        drawInterval:1,
        //flagDrawTime:-100,//下一次绘制时间
        Init0(){
            let self = this;
            self.inited=true;
            for (let key in self) {
                if(key!="Variables"){
                    self.Variables[key]=self[key];
                }
            }
        },
        Init(){
            let self = this;
            if(!self.inited){
                self.Init0();
            }else{
                for (let key in self) {
                    if(key!="Variables"){
                        self[key]=self.Variables[key];
                    }
                }
                self.bullets={};
            }
            if($User.LowPerformanceMode){
                self.screenRatio=1/2;
            }
            const id = `stg_${Math.random()}`;
            self.cid=id;
            self.canvas = NewEle(id, 'canvas', "left:"+oS.FightingSceneLeft+"px;width:"+oS.W+"px;height:600px", {height: 600*self.screenRatio, width: oS.W*self.screenRatio, className: 'BgParticle'}, EDAll);
            self.tmpCanvas = NewEle(id+"_tmp", 'canvas', "", {height: 600*self.screenRatio, width: oS.W*self.screenRatio});
            self.tmpCtx = self.tmpCanvas.getContext("2d",{willReadFrequently:true});
            if(self.canvas.transferControlToOffscreen){
                self.offscreen = self.canvas.transferControlToOffscreen();
                self.ctx = self.offscreen.getContext("2d");
            }else{
                self.ctx = self.canvas.getContext("2d");
            }
            if($User.LowPerformanceMode){
                self.drawInterval=2;
                self.tmpCtx.imageSmoothingEnabled = false;
                self.ctx.imageSmoothingEnabled = false;
                self.canvas.style['image-rendering'] = 'pixelated';
                self.tmpCanvas.style['image-rendering'] = 'pixelated';
            }
            
            EBody.onkeydown=e=>{
                self.key[e.key]=true;
            };
            EBody.onkeyup=e=>{
                self.key[e.key]=false;
            };
            SetEvent($("dFightingScene"), "touchstart", handleTouchEvent);
            SetEvent($("dFightingScene"), "touchmove", handleTouchEvent);
            SetEvent($("dFightingScene"), "touchend", handleTouchEvent);
            function handleTouchEvent(e){
                let finger = e.targetTouches[0];
                if (e.cancelable) e.preventDefault();
                switch(e.type){
                    case "touchstart":
                        if(e.targetTouches.length==1){
                            self.key[1]=true;
                            self.mousePos=[finger.clientX,finger.clientY];
                            self.mouseMovePos=[finger.clientX,finger.clientY];
                        }
                        if(self.hero&&self.hero.CanDie&&e.targetTouches.length>1){
                            self.key["x"]=true;
                        }
                        break;
                    case "touchmove":
                        if(self.key[1]&&self.hero){
                            self.mouseMovePos=[finger.clientX,finger.clientY];
                        }
                        break;
                    case "touchend":
                        if(e.targetTouches.length==0){
                            self.key[1]=false;
                        }
                }
            }
            if(!IsHttpEnvi&&IsFileEnvi){
                self.DrawMode=0;
            }
            for(let i of self.publicPic){
                self.publicImg[i] = new Image();
                self.publicImg[i].src = i;
            }
            self.taskStart();
        },
        getAngle(x1, y1,  x2, y2,type=0){
            let x = x1 - x2;
            let y = y1 - y2;
            let z = Math.sqrt(x*x + y*y);
            return  type===0?-(Math.asin(y / z) / Math.PI*180):Math.asin(y / z);
        },
        getAngle2(px,py,mx,my){//获得人物中心和鼠标坐标连线，与y轴正半轴之间的夹角
            let x = mx-px;
            let y = my-py;
            let rad = Math.atan2(y,x);
            return rad/Math.PI*180;
        },
        paintTask(){
            let self = this;
            let frameNum = 0;
            self.drawing=true;
            function draw(){
                //let currTime = Date.now();
                //let timeToCall = Math.max(0, 50 / 3 - (currTime - lastTime)) / 10;
                //oSym.addTask(timeToCall, draw);
                //lastTime = currTime + timeToCall;
                if(oSym.Timer){
                    if(++frameNum>=self.drawInterval){
                        frameNum=0;
                        self.ctx.setTransform(1,0,0,1,0,0);
                        self.ctx.clearRect(0,0,oS.W*self.screenRatio,600*self.screenRatio);
                        if(self.hero){
                            self.hero.paint(self.hero);
                        }
                        for(let id in self.bullets){
                            self.bullets[id].paint();
                        }
                    }
                    oSym.addTask(2,draw);
                }else{
                    self.drawing=false;
                }
            }
            draw();
        },
        taskStart(self){
            if(!self){
                self = this;
            }
            if(!self.drawing){
                self.paintTask();
            }
            if(self.hero){
                self.hero.update();
            }
            {
                for(let id in self.bullets){
                    self.bullets[id].update();
                }
            };
            oSym.addTask(1,self.taskStart,[self]);
        },
        getImg(img,width,height,rgb=false){//传入img是字符串 获取一个图片对象否则填rgb获取带颜色图片
            let self = this;
            if(rgb===false){
                if(self.publicImg[img]){
                    return self.publicImg[img];
                }
                self.publicImg[img] = new Image();
                self.publicImg[img].src = img;
                return self.publicImg[img];
            }
            //比例尺缩放
            width*=self.screenRatio;
            height*=self.screenRatio;
            let saveWH = {
                width:Math.round(width/5),
                height:Math.round(height/5),
            };//超过5px差距才使用另一张更大的图片
            if(self.publicImg[`${img}_${saveWH.width}_${saveWH.height}_${rgb}`]){
                return self.publicImg[`${img}_${saveWH.width}_${saveWH.height}_${rgb}`];
            }
            if(!self.publicImg[img]){
                self.publicImg[img] = new Image();
                self.publicImg[img].src = img;
            }
            img = self.publicImg[img];
            self.tmpCtx.clearRect(0,0,width,height);
            self.tmpCtx.drawImage(img,0,0,width,height);
            let imgData = self.tmpCtx.getImageData(0, 0, width, height);
            let data = imgData.data;//每个像素的data是个数组（红，绿，蓝，透明度）
            //遍历每个像素
            for (let i = 0; i < data.length; i += 4) {
                //console.log(data[i+3]);
                if(data[i+3]!=0){
                    data[i + 0] = data[i + 0]+rgb[0];
                    data[i + 1] = data[i + 1]+rgb[1];
                    data[i + 2] = data[i + 2]+rgb[2];
                }
                //这里只改变颜色，不管透明度
            }
            
            let imgCanvas =  NewEle("", 'canvas', "", {height: height, width: width});
            imgCanvas.getContext("2d").putImageData(imgData,0,0);
            self.publicImg[`${img.src}_${saveWH.width}_${saveWH.height}_${rgb}`]=imgCanvas;
            return imgCanvas;
        },
        RotatePaint(pic,x,y,width,height,rotate=0,alpha=1,mirror=1){
            let self = this;
            let dist = [Math.round((x+width/2)*self.screenRatio),Math.round((y+height/2)*self.screenRatio)];
            let ctx = self.ctx;
            //ctx.save(); // 保存状态，以免影响其它物体
            if(alpha!=1){
                ctx.globalAlpha = alpha;
            }
            /*ctx.translate(dist[0], dist[1]); // 将画布偏移到物体中心
            ctx.rotate(rotate); // 旋转角度
            ctx.translate(-dist[0], -dist[1]);// 将画布偏移回来*/
            ctx.setTransform(1, 0, 0, 1, dist[0], dist[1]);
            ctx.rotate(rotate);
            ctx.drawImage(pic,Math.round(-width/2*self.screenRatio), Math.round(-height/2*self.screenRatio), Math.round(width*self.screenRatio), Math.round(height*self.screenRatio));
            if(alpha!=1){
                ctx.globalAlpha = 1;
            }
            // 坐标参考还原
            //ctx.restore();// 恢复状态
        },
        Obj:{
            CTrigger:NewO({
                Birth(x,y,r){
                    this.x = x;
                    this.y = y;
                    this.r = r;
                },
            }),
            CHero:NewO({
                x:0,
                y:0,
                CanDie:true,
                width:0,height:0,
                dom:null,
                bomb:false,
                Birth(dom,x,y,width,height,r,bomb=false){
                    let self = this;
                    bomb===true&&(bomb=75);
                    if (bomb) {
                        let BombCard = NewEle(`BombCard`, 'img', `cursor:pointer;left:${50+oS.EDAllScrollLeft}px;top:539px;z-index:202;width:100px;height:60px;object-fit:cover;object-position:top;`, { src: "images/Card/DoomShroom.webp" }, EDAll);
                        NewEle("", "span", `left:${47+oS.EDAllScrollLeft}px;top:568px;width:98px;z-index:203;pointer-events:none;`, { className: "cardSunNum2", innerText: bomb }, EDAll);
                        BombCard.onclick = () => {self.ThrowBomb(self)};
                    }
                    [self.x,self.y,self.width,self.height,self.dom,self.bomb]=[x,y,width,height,dom,bomb];
                    self.Trigger = new oMiniGames.oStg.Obj.CTrigger;
                    self.GrazeTrigger = new oMiniGames.oStg.Obj.CTrigger;
                    self.GrazeTrigger.Birth(self.x+self.width/2,self.y+self.height/2,15*r);
                    self.Trigger.Birth(self.x+self.width/2,self.y+self.height/2,r);
                    oGd.del($P[dom.id]);
                    oMiniGames.oStg.hero=self;
                    return self;
                },
                move(self){
                    let P;
                    if(!(P=$P[self.dom.id])){
                        return;
                    }
                    let f = oMiniGames.oStg;
                    let spd = f.key["Shift"]?2:4;
                    let dx = [-1,0,1,0];
                    let dy = [0,-1,0,1];
                    let dirs = ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"];
                    let delta = [0,0];
                    for(let i = 0;i<4;i++){
                        if(f.key[dirs[i]]){
                            delta[0] += dx[i]*spd;
                            delta[1] += dy[i]*spd;
                        }
                    }
                    if((f.key["x"]||f.key["X"])&&self.bomb){
                        self.ThrowBomb(self);
                    }
                    if(delta[0]*delta[1]!=0){
                        delta[0]/=f.sq2;
                        delta[1]/=f.sq2;
                    }
                    if(f.key[1]){
                        delta[0]=(f.mouseMovePos[0]-f.mousePos[0]);
                        delta[1]=(f.mouseMovePos[1]-f.mousePos[1]);
                        if(delta[0]!=0||delta[1]!=0){
                            f.mousePos=f.mouseMovePos;
                        }
                    }
                    if(self.x+delta[0]<GetX(1)+10-self.width){
                        delta[0] = GetX(1)+10-self.width-self.x;
                    }
                    if(self.x+delta[0]>GetX(9)-self.width){
                        delta[0]=GetX(9)-self.width-self.x;
                    }
                    if(self.y+delta[1]<GetY(1)-30-self.height){
                        delta[1] = GetY(1)-30-self.height-self.y;
                    }
                    if(self.y+delta[1]>GetY(oS.R)-self.height){
                        delta[1]=GetY(oS.R)-self.height-self.y;
                    }
                    self.x+=delta[0];
                    self.Trigger.x+=delta[0];
                    self.y+=delta[1];
                    self.Trigger.y+=delta[1];
                    [self.GrazeTrigger.x,self.GrazeTrigger.y]=[self.Trigger.x,self.Trigger.y];
                    self.dom.style.left=`${self.x}px`;
                    self.dom.style.top=`${self.y}px`;
                    {
                        P.pixelLeft+=delta[0];
                        P.pixelRight+=delta[0];
                        P.pixelTop+=delta[1];
                        P.pixelBottom+=delta[1];
                        P.R = GetR(P.pixelBottom);
                        P.C = GetC(P.pixelRight);
                        P.zIndex = 3 * P.R;
                        P.oTrigger && oT.delP(P);
                        P.InitTrigger(P, P.id,P.R,P.C,P.AttackedLX = P.pixelLeft + P.beAttackedPointL,P.AttackedRX = P.pixelLeft + P.beAttackedPointR);
                        self.dom.style.zIndex = P.zIndex;
                        
                    }
                },
                ThrowBomb(self){
                    let f = oMiniGames.oStg;
                    if(!self.CanDie){
                        return;
                    }
                    f.key["x"]=false;
                    if(oS.SunNum<(isNaN(self.bomb)?75:self.bomb)){
                        SunNumWarn();
                        return;
                    }
                    CustomSpecial(oDoomShroom2,3,6);
                    oS.SunNum-=(isNaN(self.bomb)?75:self.bomb);
                    self.CanDie=false;
                    self.dom.style.filter="brightness(50%)";
                    oMiniGames.oStg.canvas.style.filter="brightness(120%)";
                    let BombCard = $("BombCard");
                    if (BombCard) SetStyle(BombCard, {
                        filter:'brightness(0.5)',
                    });
                    oSym.addTask(30,function(){
                        oMiniGames.oStg.bullets={};
                        oMiniGames.oStg.canvas.style.filter="";
                    });
                    oSym.addTask(300,function(){
                        self.CanDie=true;
                        self.dom.style.filter="";
                        if (BombCard) SetStyle(BombCard, {
                            filter:'',
                        });
                    });
                },
                paint(self){
                    let ratio = oMiniGames.oStg.screenRatio;
                    let ctx = oMiniGames.oStg.ctx;
                    ctx.lineWidth = 2*ratio;
                    ctx.strokeStyle = "red";
                    ctx.beginPath();
                    ctx.arc(Math.round(self.Trigger.x*ratio), Math.round(self.Trigger.y*ratio), self.Trigger.r*ratio, 0, Math.PI*2, true);
                    ctx.closePath();
                    ctx.fillStyle = "white";
                    ctx.fill();
                    ctx.stroke();
                },
                update(){
                    let self = this;
                    self.move(self);
                },
                Die(){
                    let self = this;
                    oSym.addTask(10,_=>{
                        if(!self.CanDie){
                            return;
                        }
                        oAudioManager.playAudio("BulletDie");
                        self.CanDie=false;
                        self.dom.style.filter="brightness(50%)";
                        oMiniGames.oStg.canvas.style.filter="brightness(120%)";
                        let BombCard = $("BombCard");
                        if (BombCard) SetStyle(BombCard, {
                            filter:'brightness(0.5)',
                        });
                        oSym.addTask(30,function(){
                            oMiniGames.oStg.bullets={};
                            oMiniGames.oStg.canvas.style.filter="";
                        });
                        oSym.addTask(300,function(){
                            self.CanDie=true;
                            self.dom.style.filter="";
                            if (BombCard) SetStyle(BombCard, {
                                filter:'',
                            });
                        });
                        if(oS.SunNum<$P[self.dom.id].SunNum){
                            oS.SunNum=0;
                            toOver(2);
                        }else{
                            oS.SunNum-=$P[self.dom.id].SunNum;
                        }
                        for(let i of $Z){
                            i.getHit0(i,800);
                        }
                    });
                }
            }),
            CBullet:NewO({
                dx:0,
                dy:0,
                angle:0,
                speed:1,
                grazed:0,
                liveTime:0,
                _task_index:0,
                picAngle:0,
                task:[],
                Birth(data={}){            
                    /*
                      pic: 图片地址
                      rgb: rgb更改颜色差值
                      width: 图片宽度
                      height: 图片高度
                      x: x坐标
                      y: y坐标
                      (r: 碰撞半径)
                      (move: 移动函数)
                      (speed: 速度)
                      (angle: 角度)
                      (task: 数组[[存活时间,函数],...[存活时间,函数]](时间必须为顺序))
                    */
                    let self = this;
                    let selF = oMiniGames.oStg;
                    self.id = "B_"+Math.random();
                    self.x = data.x;
                    self.y = data.y;
                    self.width = data.width;
                    self.height = data.height;
                    data.speed&&(self.speed = data.speed);
                    data.angle&&(self.angle = data.angle);
                    data.r&&(self.r=data.r);
                    data.task&&(self.task = data.task);
                    self.FadeTime=data.FadeTime??(data.speed>4?15:30);
                    self.Trigger=new selF.Obj.CTrigger;
                    self.Trigger.Birth(self.x+self.width/2,self.y+self.height/2,data.r?data.r:Math.min(self.width-1,self.height-1));
                    if(data.angle=="hero"){
                        data.angle=["hero",0];
                    }
                    if(selF.hero&&data.angle instanceof Array && data.angle[0]=="hero"){
                        self.angle = oMiniGames.oStg.getAngle2(self.Trigger.x,self.Trigger.y,selF.hero.Trigger.x,selF.hero.Trigger.y)+data.angle[1];
                    }
                    if(self.angle===0||self.angle){
                        self.picAngle = Math.PI/2+self.angle*Math.DegToRad;
                    }
                    self.FinalDrawMode = !(selF.DrawMode===0||!data.rgb);
                    self.img = !self.FinalDrawMode?selF.getImg(data.pic):selF.getImg(data.pic,data.width,data.height,data.rgb);
                    selF.bullets[self.id]=self;
                    self._defSpd = [Math.cos(self.AngleToRad(self.angle)),Math.sin(self.AngleToRad(self.angle))];
                    self.move = function(){
                        self.dx=self._defSpd[0]*self.speed;
                        self.dy=self._defSpd[1]*self.speed;
                    };
                    if(data.move){
                        self.move=data.move;
                    }
                    return self;
                },
                AngleToRad(angle){
                    return angle*Math.PI/180;
                },
                update: function(){
                    let self = this,selF = oMiniGames.oStg;
                    self.move();
                    self.x+=self.dx;
                    self.y+=self.dy;
                    self.Trigger.x+=self.dx;
                    self.Trigger.y+=self.dy;
                    self.dx = self.dy = 0;
                    self.liveTime++;
                    if(self.task.length>self._task_index&&self.liveTime>=self.task[self._task_index][0]){
                        self.task[self._task_index++][1](self);
                    }
                    if(self.x>oS.W||self.x+self.width<0||self.y+self.height<-50||self.y>650){
                        delete selF.bullets[self.id];
                        return;
                    }
                    if(selF.hero){
                        if(!self.grazed&&selF.checkTrigger(self.Trigger,selF.hero.GrazeTrigger)){
                            if($User.LowPerformanceMode){
                                oS.SunNum+=1;
                            }else{
                                let sun = AppearSun(self.Trigger.x, self.Trigger.y, 1, 0,30-Math.random()*10);  //生产阳光
                                oSym.addTask(10,function(){
                                    ClickSun(sun.id);
                                });
                            }
                            self.grazed = true;
                            return;
                        }
                        if(selF.checkTrigger(self.Trigger,selF.hero.Trigger)){
                            selF.hero.Die();
                            delete selF.bullets[self.id];
                            return;
                        }
                    }
                },
                Die(){
                    delete oMiniGames.oStg.bullets[this.id];
                },
                paint:function(){
                    let self = this;
                    if(self.x!==NaN&&self.y!==NaN){
                        if(!$User.LowPerformanceMode&&self.liveTime<self.FadeTime){
                            oMiniGames.oStg.RotatePaint(self.img,self.x+self.width/2*(self.FadeTime-self.liveTime)/self.FadeTime,self.y+self.height/2*(self.FadeTime-self.liveTime)/self.FadeTime,self.width/self.FadeTime*self.liveTime,self.height/self.FadeTime*self.liveTime,self.picAngle,self.liveTime/self.FadeTime);
                        }else{
                            oMiniGames.oStg.RotatePaint(self.img,self.x,self.y,self.width,self.height,self.picAngle);
                        }
                    }
                },
            }),
        },
    },

    oZuma:{
        InterpSampleNum:10000,
        ALPHA:0,
        passedTime:0,
        colorCount:2,//多少种颜色
        Variables:{},
        canvas:null,
        distancesLenArr:null,
        distancePrefixSumArr:null,
        AddedBalls: 0,
        Init0(){
            let self = this;
            self.inited=true;
            for (let key in self) {
                if(key!="Variables"){
                    self.Variables[key]=self[key];
                }
            }
        },
        Init(ColorCount = 2, MaximumBalls = Infinity){
            let self = this;
            if(!self.inited){
                self.Init0();
            }else{
                for (let key in self) {
                    if(key!="Variables"){
                        self[key]=self.Variables[key];
                    }
                }
            }
            self.colorCount = ColorCount;
            self.Samples = [];
            self.Distances = [];
            self.BallHeads = [];//存入球头的listObj，不是ballObj
            self.BallTails = [];//球的尾部
            self.MaximumBalls = MaximumBalls;
            self.totalDistance = [];
            self.ballColorCount=[];//每种球的颜色数量
            self.OtherUpdates=new Set();//其他的需要每帧更新的对象
            self.canvas = NewEle("","canvas","position:absolute;left:"+oS.EDAllScrollLeft+"px;top:0;width:"+oS.W+"px;height:600px;z-index:1;",{
                width:oS.W,
                height:600
            },EDAll);
            self.speedConfigs={
                maxSpeed:16,
                maxGapBackwardSpeed:16,
                accelerationNormalMove:0.04,
                accelerationCollide:0.3,
                accelerationGapBackward:0.05,
                leastBorder:0.2,
                slowBorder:0.5,
                emergencyBorder:0.95,
            };
        },
        AddBallIntoList(obj,lastBall,nextBall=null,lane=0){
            let self = this;
            let wantToAdd;
            if(!lastBall){
                wantToAdd={
                    nextBall:nextBall,
                    lastBall:null,
                    ballObj:obj,
                    realPos:null,
                };
                if(nextBall){
                    //console.log(nextBall);
                    nextBall.lastBall = wantToAdd;
                }
                //console.log("change",wantToAdd)
                self.BallHeads[lane] = wantToAdd;
            }else{
                wantToAdd={
                    nextBall:nextBall||lastBall.nextBall,
                    lastBall:lastBall,
                    ballObj:obj,
                    realPos:null,
                };
                lastBall.nextBall = wantToAdd;
                if(wantToAdd.nextBall){
                    wantToAdd.nextBall.lastBall = wantToAdd;
                }
            }
            if(!wantToAdd.nextBall){
                self.BallTails[lane] = wantToAdd;
            }
            return wantToAdd;
        },
        DeleteABall(listObj){
            let self = this;
            if(listObj.lastBall){
                if(!listObj.nextBall){
                    self.BallTails[listObj.ballObj.lane] = listObj.lastBall;
                }
                listObj.lastBall.nextBall = listObj.nextBall;
            }
            if(listObj.nextBall){
                if(!listObj.lastBall){
                    self.BallHeads[listObj.ballObj.lane] = listObj.nextBall;
                }
                listObj.nextBall.lastBall = listObj.lastBall;
            }
            //console.log(oMiniGames.oZuma.ballColorCount);
            if (oMiniGames.oZuma.ballColorCount[listObj.ballObj.color] < -30) {
                if (self.AddedBalls>=self.MaximumBalls) {
                    toWin();
                } else {
                    oMiniGames.oZuma.ballColorCount[listObj.ballObj.color] = 0;
                }
            }
        },
        Update(){
            let self = this;
            let timer = new Date();
            let deltaTime = 0,curTime= timer;
            let ctx = self.canvas.getContext("2d");
            self.context = ctx;
            let tmpMaxSpeed = self.speedConfigs.maxSpeed,tmpAcc=self.speedConfigs.accelerationNormalMove;
            let nowPercentage = 2;
            let lanesNum = self.Distances.length;
            let distancesLenArr = self.distancesLenArr;
            let distancePrefixSumArr = self.distancePrefixSumArr;
            let isFlashingRed = false;
            function MainLoop(){
                curTime = new Date();
                deltaTime  = (curTime - timer)*oSym.NowSpeed/100;//除以100是为了统一oSym.addTask的帧
                timer = curTime;//计算经过时间，祖玛全体按时间运行，不卡顿
                if(oSym.Timer&&!document.hidden){
                    addHeadBalls();
                    drawBalls();
                    requestAnimationFrame(MainLoop);
                }else{
                    oSym.addTask(1,()=>{timer=new Date();MainLoop();});
                }
            };
            function drawBalls(){
                ctx.clearRect(0,0,oS.W,600);
                function SearchDistanceArea(totalDistance,from=-1,lane=0){
                    if(from<0){
                        console.log("searching for Distance Area Error");
                        from = 0;
                    }
                    for(let i = from;i<=distancesLenArr[lane];i++){
                        if(distancePrefixSumArr[lane][i]>=totalDistance&&(i===0||distancePrefixSumArr[lane][i-1]<=totalDistance)){
                            return i;
                        }
                    }
                    return -1;
                }
                for(let lane = 0;lane<lanesNum;lane++){
                    let currentBall = self.BallHeads[lane];//保存listObj
                    if(!currentBall){
                        continue;
                    }
                    let distanceArea = 0;
                    let ball = null;//保存ballObj
                    while(currentBall){
                        ball = currentBall.ballObj;
                        ball.Update(deltaTime);
                        let realPos = null;
                        if(ball.s<0){
                            realPos = self.Samples[lane][0];
                        }else{
                            if((distanceArea=SearchDistanceArea(ball.s,distanceArea,lane))===-1){
                                distanceArea=SearchDistanceArea(ball.s,distanceArea,lane);
                            }
                            if(distanceArea>=distancesLenArr[lane]){
                                realPos = self.Samples[lane][distancesLenArr[lane]];//samples永远比distances的长度大1
                                self.DeleteABall(currentBall);
                                currentBall=currentBall.nextBall;
                                toOver(2);
                                continue;
                            }else{
                                let i = distanceArea;
                                //console.log(i);
                                realPos = self.XYLerpUnClamped(self.Samples[lane][i],self.Samples[lane][i+1],(ball.s-((i-1)<0?0:distancePrefixSumArr[lane][i-1]))/self.Distances[lane][i]);
                                if(ball.insertOriPos){
                                    realPos = self.XYLerpUnClamped(realPos,ball.insertOriPos,ball.insertingTime/ball.defInsertTime);//如果正在插入则需要播放插入动画
                                }
                            }
                        }
                        currentBall.realPos = realPos;
                        ball.Paint(ctx,realPos,ball);
                        currentBall = currentBall.nextBall;
                    }
                    
                    if(self.BallTails[lane]){
                        let ball = self.BallTails[lane].ballObj;
                        //console.log(ball.s,self.totalDistance[lane],self.speedConfigs.leastBorder);
                        if(ball.s<self.totalDistance[lane]*self.speedConfigs.leastBorder){
                            nowPercentage=2;
                        }else if(ball.s>self.totalDistance[lane]*self.speedConfigs.emergencyBorder){
                            nowPercentage=0.2;
                        }else if(ball.s>self.totalDistance[lane]*self.speedConfigs.slowBorder){
                            nowPercentage=0.5;
                        }else{
                            nowPercentage=1;
                        }
                        self.speedConfigs.maxSpeed=tmpMaxSpeed*nowPercentage;
                        self.speedConfigs.accelerationNormalMove = (nowPercentage<1?1/Math.pow(nowPercentage,2):nowPercentage)*tmpAcc;
                        //console.log(nowPercentage,self.speedConfigs.maxSpeed,self.speedConfigs.accelerationNormalMove);
                    }
                    for(let i of self.OtherUpdates){
                        i.Update(deltaTime);
                    }
                }
            }
            function addHeadBalls(){
                for(let lane=0;lane<lanesNum;lane++){
                    let currentBall = self.BallHeads[lane];
                    while(currentBall&&currentBall.ballObj.s>=currentBall.ballObj.r*2&&currentBall.ballObj.velocity>0&&self.AddedBalls<self.MaximumBalls){
                        //console.log(currentBall.ballObj.s,currentBall.ballObj.r*2);
                        let ball = new self.Obj.Ball().Birth(Math.min(currentBall.ballObj.r,currentBall.ballObj.s-currentBall.ballObj.r*2),null,currentBall,Math.floor(Math.random()*self.colorCount),lane);
                        if(currentBall.ballObj.s>currentBall.ballObj.r*3){
                            currentBall.ballObj.connectingLast=false;
                        }
                        self.AddedBalls++;
                        //currentBall.lastBall.ballObj.velocity = currentBall.ballObj.velocity;
                        //currentBall.ballObj.velocity=0;
                        //currentBall.ballObj.connectingLast = true;
                        currentBall = currentBall.lastBall;
                    }
                }
            }
            MainLoop();
        },
        LineIntersect(line1st,line1ed,line2st,line2ed)
        {
            if(
               ( Math.max(line1st.x,line1ed.x)>=Math.min(line2st.x,line2ed.x)&&Math.min(line1st.x,line1ed.x)<=Math.max(line2st.x,line2ed.x) )&&  //判断x轴投影
               ( Math.max(line1st.y,line1ed.y)>=Math.min(line2st.y,line2ed.y)&&Math.min(line1st.y,line1ed.y)<=Math.max(line2st.y,line2ed.y) )    //判断y轴投影
            ){
                if(
                    ( (line2st.x-line1st.x)*(line1ed.y-line1st.y)-(line2st.y-line1st.y)*(line1ed.x-line1st.x) ) *          //判断B是否跨过A
                    ( (line2ed.x-line1st.x)*(line1ed.y-line1st.y)-(line2ed.y-line1st.y)*(line1ed.x-line1st.x) ) <=0 &&
                    ( (line1st.x-line2st.x)*(line2ed.y-line2st.y)-(line1st.y-line2st.y)*(line2ed.x-line2st.x) ) *          //判断A是否跨过B
                    ( (line1ed.x-line2st.x)*(line2ed.y-line2st.y)-(line1ed.y-line2st.y)*(line2ed.x-line2st.x) ) <=0
                ){
                    return true;
                }else{
                    return false;
                }
            }else{
                return false;
            }
        },
        SubVector(a,b){
            return {x:a.x-b.x,y:a.y-b.y};
        },
        AddVector(a,b){
            return {x:a.x+b.x,y:a.y+b.y};
        },
        MultiVector(a,t){
            return {x:a.x*t,y:a.y*t};
        },
        Cross(a,b){//叉乘
            return a.x*b.y - a.y*b.x;
        },
        GetCrossPoint(line1st,line1ed,line2st,line2ed){
            let base = this.SubVector(line2ed,line2st);
            let d1 = Math.abs(this.Cross(base, this.SubVector(line1st,line2st)));
            let d2 = Math.abs(this.Cross(base, this.SubVector(line1ed,line2st)));
            let t = d1 / (d1 + d2);
            return this.AddVector(line1st,this.MultiVector(this.SubVector(line1ed,line1st),t));
        },
        MakeSamples(pointsArr,lane=0){
            function testAngle(a,b){//两角度之差
                return Math.PI-Math.abs((a-b)%(2*Math.PI)-Math.PI);
            }
            let points = [];
            let distances = [];//从points[1]开始到上一个点的距离
            let totalDistance = 0;
            let pointsLen = 0;
            let lastAng = -114514;
            let SampleNum = this.InterpSampleNum;
            for(let i = 0;i<=SampleNum;i++){
                let rad=null;
                let pos = this.CSplineInterp(pointsArr,i/SampleNum,this.ALPHA);
                if(!(lastAng<-360||i===0||i===SampleNum||Math.abs(testAngle(lastAng,(rad = Math.atan2(pos.y-points[pointsLen-1].y,pos.x-points[pointsLen-1].x))))>=0.08)){
                    continue;
                }
                lastAng = rad;
                if(pointsLen>0){
                    distances.push(Math.hypot(points[pointsLen-1].x-pos.x,points[pointsLen-1].y-pos.y));
                    totalDistance+=distances[pointsLen-1];
                }
                points.push(pos);
                pointsLen++;
            }
            this.Samples[lane] = points;
            this.Distances[lane] = distances;
            this.totalDistance[lane] = totalDistance;
            let lanesNum = this.Distances.length;
            let distancesLenArr = [];
            let distancePrefixSumArr = [];
            for(let a = 0;a<lanesNum;a++){
                distancesLenArr[a] = this.Distances[a].length;
                distancePrefixSumArr[a] = [this.Distances[a][0]];//前缀和
                for(let i = 1;i<distancesLenArr[a];i++){
                    distancePrefixSumArr[a][i] = distancePrefixSumArr[a][i-1]+this.Distances[a][i];
                }
                distancePrefixSumArr[a][distancesLenArr[a]]=Infinity;
            }
            this.distancesLenArr = distancesLenArr;
            this.distancePrefixSumArr = distancePrefixSumArr;
        },
        GetKnotInterval(a, b, alpha=0.5){
            return Math.pow((a.x - b.x)**2+(a.y-b.y)**2, 0.5 * alpha);
        },
        CSplineInterp(pointsArr, t, alpha=0.5){
                t = Math.Clamp(t, 0.0, 2.0);
                let numSections = pointsArr.length - 3;
                let currPt = Math.min(Math.floor(t * numSections), numSections - 1);
                t = t * numSections - currPt;
                let p0 = pointsArr[currPt];
                let p1 = pointsArr[currPt + 1];
                let p2 = pointsArr[currPt + 2];
                let p3 = pointsArr[currPt + 3];

                let k0 = 0;
                let k1 = this.GetKnotInterval(p0, p1,alpha);
                let k2 = this.GetKnotInterval(p1, p2,alpha) + k1;
                let k3 = this.GetKnotInterval(p2, p3,alpha) + k2;

                // evaluate the point
                let u = Math.LerpUnclamped(k1, k2, t);
                let A1 = this.Remap(k0, k1, p0, p1, u);
                let A2 = this.Remap(k1, k2, p1, p2, u);
                let A3 = this.Remap(k2, k3, p2, p3, u);
                let B1 = this.Remap(k0, k2, A1, A2, u);
                let B2 = this.Remap(k1, k3, A2, A3, u);
                return this.Remap(k1, k2, B1, B2, u);
        },
        Remap(a, b, c, d, u){
            return {
                x:((b-u)*c.x+(u-a)*d.x)/(b-a),
                y:((b-u)*c.y+(u-a)*d.y)/(b-a)
            };
        },
        XYLerpUnClamped(a,b,t,setToA=false){
            if(setToA){
                a.x = a.x + (b.x - a.x) * t;
                a.y = a.y + (b.y - a.y) * t;
            }else{
                return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
            }
        },
        Obj:{
            Ball:NewO({
                r:20,
                showR:20,//显示的时候的图片半径
                velocity:0,
                connectingLast:false,
                color:0,
                listObj: null,
                insertingTime:0,
                defInsertTime:1,
                insertOriPos:null,
                onCollide:true,
                destroyed:false,
                comboTime:1,
                __tmp_destroy_time:1,
                __tmp_combo__:null,
                PicArr:(()=>{
                    let objArr = [];
                    ["images/Plants/PB00_2.webp","images/Plants/ShiitakeBullet.webp","images/Plants/PB-10_2.webp"].forEach((i)=>{
                        let k = new Image();
                        k.src=i;
                        objArr.push(k);
                    });
                    return objArr;
                })(),
                Birth(s,lastBall=null,nextBall=null,color=0,lane=0){
                    this.s = s; 
                    this.listObj = oMiniGames.oZuma.AddBallIntoList(this,lastBall,nextBall,lane);
                    this.lane = lane;
                    this.color = color;
                    if(!oMiniGames.oZuma.ballColorCount[this.color]){
                        oMiniGames.oZuma.ballColorCount[this.color]=0;
                    }
                    oMiniGames.oZuma.ballColorCount[this.color]++;
                    return this;
                },
                insertAnimation(){
                    this.insertingTime=this.defInsertTime;
                    return this;
                },
                insertAnimationUpdate(deltaFrame){
                    this.insertingTime-=deltaFrame;
                    this.insertingTime = Math.max(0,this.insertingTime);
                    this.r = Math.Lerp(20,0,this.insertingTime/this.defInsertTime);
                    if(this.insertingTime===0){
                        this.insertOriPos=null;
                        this.DiffuseDestroySameColor(this);
                    }
                },
                Paint(ctx,realPos,ball){
                    if(this.destroyed){
                        ctx.globalAlpha=0.5;
                    }else{
                        ctx.globalAlpha=1;
                    }
                    //oMiniGames.oZuma.context.fillStyle = ["red","green"][ball.color];
                    //oMiniGames.oZuma.context.fillRect(realPos.x-ball.showR,realPos.y-ball.showR,2*ball.showR,2*ball.showR);
                    ctx.drawImage(ball.PicArr[ball.color],realPos.x-ball.r,realPos.y-ball.r,2*ball.r,2*ball.r);
                },
                Update(deltaFrame){
                    if(this.insertingTime>0){
                        this.insertAnimationUpdate(deltaFrame);
                    }
                    this.Move(deltaFrame);
                    if(this.destroyed&&(this.__tmp_destroy_time-=deltaFrame)<=0){
                        this.Destroy();
                    }
                },
                Move(deltaFrame=1){
                    let self = this;
                    //console.log(self.listObj.lastBall);
                    if(!self.listObj.lastBall){//球头情况
                        let oldVelocity = self.velocity;
                        let accelerateFrame = 0;
                        if(self.velocity<0){
                            if(self.velocity+oMiniGames.oZuma.speedConfigs.accelerationCollide*deltaFrame>0){
                                accelerateFrame = Math.abs(self.velocity/oMiniGames.oZuma.speedConfigs.accelerationCollide);
                                self.velocity = 0;
                            }else{
                                self.velocity += oMiniGames.oZuma.speedConfigs.accelerationCollide*deltaFrame;
                            }
                        }else{
                            self.comboTime=1;
                            if(self.velocity>oMiniGames.oZuma.speedConfigs.maxSpeed){
                                if(self.velocity-oMiniGames.oZuma.speedConfigs.accelerationNormalMove*deltaFrame<oMiniGames.oZuma.speedConfigs.maxSpeed){
                                    accelerateFrame = (self.velocity-oMiniGames.oZuma.speedConfigs.maxSpeed)/oMiniGames.oZuma.speedConfigs.accelerationNormalMove;
                                    self.velocity = oMiniGames.oZuma.speedConfigs.maxSpeed;
                                }else{
                                    self.velocity -= oMiniGames.oZuma.speedConfigs.accelerationNormalMove*deltaFrame;
                                }
                            }else{
                                if(self.velocity+oMiniGames.oZuma.speedConfigs.accelerationNormalMove*deltaFrame>oMiniGames.oZuma.speedConfigs.maxSpeed){
                                    accelerateFrame = (oMiniGames.oZuma.speedConfigs.maxSpeed-self.velocity)/oMiniGames.oZuma.speedConfigs.accelerationNormalMove;
                                    self.velocity = oMiniGames.oZuma.speedConfigs.maxSpeed;
                                }else{
                                    self.velocity += oMiniGames.oZuma.speedConfigs.accelerationNormalMove*deltaFrame;
                                }
                            }
                        }
                        self.s+=(oldVelocity+self.velocity)/2*accelerateFrame+self.velocity*(deltaFrame-accelerateFrame);//取平均速度
                        self.s=Math.max(self.s,0);
                        if(self.listObj.nextBall&&self.s===0&&self.velocity<0){
                            oMiniGames.oZuma.DeleteABall(self.listObj);
                            if(self.listObj.nextBall){
                                self.listObj.nextBall.ballObj.velocity=self.velocity;
                                self.listObj.nextBall.ballObj.comboTime=self.comboTime;
                            }
                        }
                    }else{//不是球头
                        //console.log(self.listObj.lastBall.ballObj,self.r+self.listObj.lastBall.ballObj.r);
                        if(!self.connectingLast&&self.s-self.listObj.lastBall.ballObj.s<=self.r+self.listObj.lastBall.ballObj.r){
                            self.connectingLast = true;
                            //console.log(self.listObj.lastBall.ballObj,self.r+self.listObj.lastBall.ballObj.r);
                            //console.log("setToTrue");
                        }
                        if(self.connectingLast){
                            if(self.velocity!=0){
                                if(self.listObj?.lastBall?.lastBall){//并非倒数第二个球把自己的速度传给最后一个球
                                    self.DiffuseDestroySameColor(self);
                                }
                                self.speedConveyBack(self,self.velocity);
                            }
                            self.velocity=0;
                            //console.log(self.listObj.lastBall.ballObj.s,self.s,self.listObj.lastBall.ballObj,self);
                            self.s = self.listObj.lastBall.ballObj.s+self.listObj.lastBall.ballObj.r+self.r;
                            self.comboTime=1;
                        }else{
                            //console.log(244);
                            let oldVelocity = self.velocity;
                            let accelerateFrame = deltaFrame;
                            if(self.listObj.lastBall.ballObj.color===self.color){
                                if(self.velocity-oMiniGames.oZuma.speedConfigs.accelerationGapBackward*self.comboTime*deltaFrame<-oMiniGames.oZuma.speedConfigs.maxGapBackwardSpeed){
                                    accelerateFrame = Math.abs((-oMiniGames.oZuma.speedConfigs.maxGapBackwardSpeed-self.velocity)/(oMiniGames.oZuma.speedConfigs.accelerationGapBackward*self.comboTime));
                                    self.velocity = -oMiniGames.oZuma.speedConfigs.maxGapBackwardSpeed;
                                }else{
                                    self.velocity-=(oMiniGames.oZuma.speedConfigs.accelerationGapBackward*self.comboTime)*deltaFrame;
                                }
                            }else{
                                if(self.velocity<0){
                                    if(self.velocity+(oMiniGames.oZuma.speedConfigs.accelerationGapBackward*self.comboTime)*3*deltaFrame>0){
                                        accelerateFrame = Math.abs(-self.velocity)/((oMiniGames.oZuma.speedConfigs.accelerationGapBackward*self.comboTime)*3);
                                        self.velocity = 0;
                                    }else{
                                        self.velocity+=(oMiniGames.oZuma.speedConfigs.accelerationGapBackward*self.comboTime)*3*deltaFrame;
                                    }
                                }
                            }
                            self.s+=(oldVelocity+self.velocity)/2*accelerateFrame+self.velocity*(deltaFrame-accelerateFrame);//取平均速度
                        }
                    }
                },
                DiffuseDestroySameColor(self){
                    let ball = self;
                    let targeted = [self.listObj];
                    while(ball.connectingLast&&ball.listObj.lastBall&&ball.color===ball.listObj.lastBall.ballObj.color){
                        targeted.push(ball.listObj.lastBall);
                        ball=ball.listObj.lastBall.ballObj;
                        //oMiniGames.oZuma.DeleteABall(ball.listObj.lastBall.ballObj);
                    }
                    ball=self;
                    console.log(ball.listObj?.nextBall);
                    while(ball.listObj?.nextBall?.ballObj?.connectingLast&&ball.color===ball.listObj.nextBall.ballObj.color){
                        targeted.push(ball.listObj.nextBall);
                        ball=ball.listObj.nextBall.ballObj;
                        //oMiniGames.oZuma.DeleteABall(ball.listObj.lastBall.ballObj);
                    }
                    oAudioManager.playAudio('splat' + Math.floor(Math.random()*3 + 1));
                    if(targeted.length<3 || oS.isStartGame != 1){
                        self.comboTime=1;
                        return;
                    }
                    targeted.forEach((i)=>{
                        i.ballObj.beCollidedDestroyAnimation(i.ballObj);
                    });
                },
                speedConveyBack(self,speed){
                    let obj = self.listObj.lastBall;
                    while(obj&&obj.ballObj.connectingLast){
                        obj=obj.lastBall;
                    }
                    if (self.comboTime > 1) console.log("COMBO x" + self.comboTime);
                    if(obj){
                        if(obj.ballObj.velocity>1){
                            obj.ballObj.velocity = Math.sqrt(obj.ballObj.velocity);
                        }
                        obj.ballObj.velocity += speed*Math.pow(Math.Clamp(self.comboTime,1,4),1/3);
                    }
                },
                CheckCollide(colli){
                    let self = this;
                    if(!self.listObj.realPos||!self.onCollide){
                        return false;
                    }
                    return (colli.x-self.listObj.realPos.x)**2+(colli.y-self.listObj.realPos.y)**2<4*self.r*self.r;
                },
                beCollidedDestroyAnimation(self){
                    if(self.destroyed){
                        return;
                    }
                    oAudioManager.playAudio('match');
                    self.__tmp_combo__=self.comboTime;
                    self.destroyed=true;
                    self.onCollide=false;
                },
                Destroy(){
                    //因为是从前往后遍历，所以会依次传给下一个球
                    if(this.listObj?.nextBall){
                        this.listObj.nextBall.ballObj.connectingLast=false;
                        this.listObj.nextBall.ballObj.comboTime=Math.max(this.listObj.nextBall.ballObj.comboTime,this.__tmp_combo__+1);
                        if(this.listObj.nextBall.ballObj.__tmp_combo__){
                            this.listObj.nextBall.ballObj.__tmp_combo__ = Math.max(this.listObj.nextBall.ballObj.__tmp_combo__,this.__tmp_combo__);
                        }
                    }
                    oMiniGames.oZuma.DeleteABall(this.listObj);
                    oMiniGames.oZuma.ballColorCount[this.color]--;
                },
            }),
            BallShooted:NewO({
                speed:128,
                r:20,
                liveTime:0,
                chkIndex:0,//现在应该从第几个可能碰撞的点开始检测
                PicArr:(()=>{
                    let objArr = [];
                    ["images/Plants/PB00_2.webp","images/Plants/ShiitakeBullet.webp","images/Plants/PB-10_2.webp"].forEach((i)=>{
                        let k = new Image();
                        k.src=i;
                        objArr.push(k);
                    });
                    return objArr;
                })(),
                Birth(x,y,ang,color=0){
                    this.PicArr = oMiniGames.oZuma.Obj.Ball.prototype.PicArr;
                    this.oriX=this.x=x;
                    this.oriY=this.y=y;
                    this.color = color;
                    this.angle = ang;
                    this.tmp_cossin = [Math.cos(this.angle),Math.sin(this.angle)];
                    this.InfinityPoint = {x:this.oriX+this.tmp_cossin[0]*100000,y:this.oriY+this.tmp_cossin[1]*100000};
                    this.getCrossPoints();
                    oMiniGames.oZuma.OtherUpdates.add(this);
                    return this;
                },
                Paint(){
                    //oMiniGames.oZuma.context.fillStyle = ["red","green"][this.color];
                    //oMiniGames.oZuma.context.fillRect(this.x-this.r,this.y-this.r,2*this.r,2*this.r);
                    oMiniGames.oZuma.context.drawImage(this.PicArr[this.color],this.x-this.r,this.y-this.r,2*this.r,2*this.r);
                },
                getCrossPoints(){
                    let self = this;
                    let startPos = {x:self.oriX,y:self.oriY};
                    self.crossPoints = [];
                    self.checkTimes = [];
                    function twoInsect(a,b,vertical){
                        return oMiniGames.oZuma.LineIntersect(startPos,self.InfinityPoint,oMiniGames.oZuma.AddVector(a,vertical),oMiniGames.oZuma.SubVector(b,vertical))||oMiniGames.oZuma.LineIntersect(startPos,self.InfinityPoint,oMiniGames.oZuma.SubVector(a,vertical),oMiniGames.oZuma.AddVector(b,vertical));
                    }
                    for(let lane in oMiniGames.oZuma.Samples){
                        let realPoints=oMiniGames.oZuma.Samples[lane];
                        let len=realPoints.length;
                        let thisFakeP,nextFakeP;
                        for(let i = 0;i<len-1;i++){
                            thisFakeP = Object.assign({},realPoints[i]);
                            nextFakeP = Object.assign({},realPoints[i+1]);
                            let pointAng=Math.atan2(nextFakeP.y-thisFakeP.y,nextFakeP.x-thisFakeP.x);
                            let point_cos_sin=[Math.cos(pointAng),Math.sin(pointAng)];
                            thisFakeP.x-=point_cos_sin[0]*self.r*2;
                            thisFakeP.y-=point_cos_sin[1]*self.r*2;
                            nextFakeP.x+=point_cos_sin[0]*self.r*2;
                            nextFakeP.y+=point_cos_sin[1]*self.r*2;
                            let vertical = {x:-point_cos_sin[1]*self.r*1.42,y:point_cos_sin[0]*self.r*1.42};
                            if(twoInsect(thisFakeP,nextFakeP,vertical)){
                                //  arr 0 相交坐标， arr 1进入的时刻的路程和相交的时候在轨道时应该处于的的路程， arr 2在哪条轨道上相交， arr 3相交的夹角
                                let arr = [oMiniGames.oZuma.GetCrossPoint(startPos,self.InfinityPoint,thisFakeP,nextFakeP),null,lane,pointAng-self.angle];
                                arr[1] = [null,oMiniGames.oZuma.distancePrefixSumArr[lane][i]-Math.hypot(arr[0].x-realPoints[i+1].x,arr[0].y-realPoints[i+1].y)];//获取插入时的路程是多少
                                if(Math.abs(Math.abs((pointAng-self.angle)%Math.PI)-1.5707963267948966)<0.01){//这个神秘数字是pi/2,0.08是减弱判断精度，反正玩家看不出来。
                                    arr[1][0] = arr[1][1]-Math.sign(point_cos_sin[1]*self.tmp_cossin[1]+point_cos_sin[0]*self.tmp_cossin[0])*Math.abs(Math.tan(pointAng-self.angle))*2*self.r;//用点积来判断刚插入时路程的这个值应该更多还是更少，如果是锐角就说明插入时路程更少，钝角就说明更多
                                }else{
                                    arr[1][0]=arr[1][1];
                                }
                                arr[1][2] = (arr[1][1]-arr[1][0])+arr[1][1];
                                self.crossPoints.push(arr);
                            }
                        }
                    }
                    self.crossPoints.forEach(arr=>{
                        let i = arr[0];
                        let theDistance = Math.max(0.01,arr[3]%(Math.PI!=0?Math.abs(2*self.r/Math.sin(arr[3])):Infinity));
                        let distanceFromOri = Math.max(0,Math.hypot(i.x-self.oriX,i.y-self.oriY)-theDistance);
                        let theTime = distanceFromOri/self.speed;
                        let theLastTime = (distanceFromOri+2*theDistance)/self.speed;
                        self.checkTimes.push([theTime,theLastTime,arr[1],arr[2]]);//记得要把插入的路程位置和插入的是哪一列球传上
                    });
                    self.checkTimes.sort(function(a,b){return a[0]-b[0]});
                },
                Update(deltaFrame){
                    this.Move(deltaFrame);
                    this.Paint();
                    if(this.speed*this.liveTime>1000){
                        this.Destroy();
                    }
                },
                Move(deltaFrame){
                    let self = this;
                    let oldX=self.x,oldY=self.y;
                    self.liveTime+=deltaFrame;
                    self.x=self.oriX+self.tmp_cossin[0]*self.speed*self.liveTime;
                    self.y=self.oriY+self.tmp_cossin[1]*self.speed*self.liveTime;
                    let pos0={x:oldX,y:oldY},pos={x:self.x,y:self.y},posOri={x:self.oriX,y:self.oriY};
                    //let colliResSave = new Map();
                    let ckLen=self.checkTimes.length;
                    let nextTimeCheckIndex = self.chkIndex;
                    while(self.chkIndex<ckLen&&self.liveTime>=self.checkTimes[self.chkIndex][0]){
                        //获取根据射入之间后插值的路程
                        let nowLerpedDistance = Math.Lerp(self.checkTimes[self.chkIndex][2][0],self.checkTimes[self.chkIndex][2][2],(self.liveTime-self.checkTimes[self.chkIndex][0])/(self.checkTimes[self.chkIndex][1]-self.checkTimes[self.chkIndex][0]));
                        let listObj=oMiniGames.oZuma.BallHeads[self.checkTimes[self.chkIndex][3]];//获取要碰撞那行的球
                        while(listObj){                                   //第二个下标是插入的路程
                            if((!listObj.nextBall||listObj.nextBall.ballObj.s>=nowLerpedDistance)&&listObj.ballObj.s<=nowLerpedDistance){
                                if(listObj.ballObj.CheckCollide(pos)){
                                    self.insertFront(listObj);
                                    return;
                                }else if(listObj.nextBall&&listObj.nextBall.ballObj.CheckCollide(pos)){
                                    self.insertBack(listObj.nextBall);
                                    return;
                                }
                            }else if(!listObj.lastBall&&listObj.ballObj.s<nowLerpedDistance){
                                if(listObj.ballObj.CheckCollide(pos)){
                                    self.insertHead(listObj);
                                    return;
                                }
                            }
                            listObj = listObj.nextBall;
                        }
                        if(self.checkTimes>self.checkTimes[self.chkIndex][1]){
                            nextTimeCheckIndex=self.chkIndex+1;
                        }
                        self.chkIndex++;
                    }
                    self.chkIndex=nextTimeCheckIndex;
                    
                },
                insertHead(listObj){
                    console.log("head!");
                    let o = new oMiniGames.oZuma.Obj.Ball().Birth(listObj.ballObj.s-0.01,null,listObj,this.color,listObj.ballObj.lane).insertAnimation();
                    //listObj.ballObj.connectingLast = true;
                    o.insertOriPos = {x:this.x,y:this.y};
                    this.Destroy();
                },
                insertFront(listObj){
                    console.log("front!",listObj,listObj.ballObj.s);
                    let o = new oMiniGames.oZuma.Obj.Ball().Birth(listObj.ballObj.s+0.01,listObj,listObj.nextBall,this.color,listObj.ballObj.lane).insertAnimation();
                    o.insertOriPos = {x:this.x,y:this.y};
                    //o.connectingLast=true;
                    //listObj.nextBall.ballObj.connectingLast=true;
                    this.Destroy();
                },
                insertBack(listObj){
                    console.log("back!",listObj,listObj.ballObj.s);
                    let o = new oMiniGames.oZuma.Obj.Ball().Birth(listObj.ballObj.s-0.01,listObj.lastBall,listObj,this.color,listObj.ballObj.lane).insertAnimation();
                    o.insertOriPos = {x:this.x,y:this.y};
                    //listObj.ballObj.connectingLast=true;
                    this.Destroy();
                },
                Destroy(){
                    oMiniGames.oZuma.OtherUpdates.delete(this);
                }
            }),
            Shooter:NewO({
                nowBallColor:null,
                nextBallColor:null,
                ang:0,
                PicArr:(()=>{
                    let objArr = [];
                    ["images/Plants/PB00_2.webp","images/Plants/ShiitakeBullet.webp","images/Plants/PB-10_2.webp"].forEach((i)=>{
                        let k = new Image();
                        k.src=i;
                        objArr.push(k);
                    });
                    return objArr;
                })(),
                Birth(x,y){
                    this.x=x;
                    this.y=y;
                    this.setColor();
                    this.register();
                    this.Ele = NewEle(null, "div", `position:absolute;left:${x-100}px;top:${y-50}px;`, {}, EDAll);
                    this.EleShadow = NewEle(`ZumaShooter_Shadow`, 'div', `left:${130*0.5-48}px;top:${106-22}px;`, {className: 'Shadow'}, this.Ele);  //绘制植物影子
                    this.EleBody = NewImg(`ZumaShooter_Body`, "images/Plants/Shiitake/idle.webp", null, this.Ele);  
                    oMiniGames.oZuma.OtherUpdates.add(this);
                },
                Update(){
                    //oMiniGames.oZuma.context.fillStyle = ["red","green"][this.nowBallColor];
                    //oMiniGames.oZuma.context.fillRect(this.x-20,this.y-20,40,40);
                    //oMiniGames.oZuma.context.fillStyle = ["red","green"][this.nextBallColor];
                    //oMiniGames.oZuma.context.fillRect(this.x-10,this.y-10,20,20);
                    oMiniGames.oZuma.context.drawImage(this.PicArr[this.nowBallColor],this.x-20,this.y-20,40,40);
                    oMiniGames.oZuma.context.drawImage(this.PicArr[this.nextBallColor],this.x-60,this.y+30,30,30);
                },
                setColor(){
                    if(!this.nowBallColor){
                        this.nowBallColor = Math.floor(Math.random()*oMiniGames.oZuma.colorCount);
                    }
                    if(!this.nextBallColor){
                        this.nextBallColor = Math.floor(Math.random()*oMiniGames.oZuma.colorCount);
                    }
                },
                register(){
                    let self = this;
                    oMiniGames.oZuma.canvas.addEventListenerRecord("mousemove",(ev)=>{
                        self.CheckMove(ev);
                    });
                    oMiniGames.oZuma.canvas.addEventListenerRecord("mousedown",(ev)=>{
                        self.CheckMove(ev);
                        if(ev.button===0){
                            self.ShootBall();
                        }else{
                            self.swapBall();
                            ev.preventDefault();
                        }
                    });
                    oMiniGames.oZuma.canvas.addEventListenerRecord("contextmenu",(ev)=>{
                        ev.preventDefault();
                    });
                },
                swapBall(){
                    oAudioManager.playAudio('bottom');
                    this.nowBallColor^=this.nextBallColor;
                    this.nextBallColor^=this.nowBallColor;
                    this.nowBallColor^=this.nextBallColor;
                },
                CheckMove(evt){
                    //console.log(evt.offsetX,evt.offsetY);
                    this.ang = Math.atan2(evt.offsetY-this.y,evt.offsetX-this.x);
                },
                ShootBall(){
                    if (oS.isStartGame !== 1) return;
                    this.EleBody.src = "images/Plants/Shiitake/attack.webp";
                    oSym.addTask(20, () => {
                        oAudioManager.playAudio('shiitake');
                        new oMiniGames.oZuma.Obj.BallShooted().Birth(this.x,this.y,this.ang,this.nowBallColor);
                        this.nowBallColor = this.nextBallColor;
                        this.nextBallColor=null;
                        this.setColor();
                    });
                    oSym.addTask(100, () => {this.EleBody.src = "images/Plants/Shiitake/idle.webp";});
                }
            })
        }
    },
};
/*
        消消乐，调用如下: oMiniGames.PlantCollapse(UpgradeRules);
        UpgradeRules中对于每个植物Key所对应的Value，支持两种形式
            1. 植物对象（如oSunFlower）
            2. 统一卡片对象 {
                Type: "CRand" | "CAll" | "PRand" | "PAll" | "ASun", （C开头代表仅生成卡片，P开头代表优先种植，后生成卡片）
                Kind: [..植物列表..], Num: 数量，默认为1，如果是All则Num表示生成几次全部植物列表，如果是ASun则表示生成的阳光数量, 
            }
        对于特殊奖励，必须声明以下函数
            "DoubleRule": function (PName, NowArr, UpgradeRules, PNum, DecodeRule) { // 植物属性 当前奖励 升级规则 连续数量 解包函数
                应返回修改后的NowArr
            }
        对于开始合成前，可声明以下函数，当合成行为开始前调用
            "BeforeCollapse": () => {}
        对于生成的卡片，可声明以下函数，生成卡片时调用
            "CreateCard": () => {}
*/
(function(oMiniGames) {

    let UpgradeRules;

    /* 一些初始化定义、规则以及参数处理 */
    let GetPNum = (plant) => { // 计算本格植物横纵坐标连续的格子数量
        let dMap = oGd.$;
        let {
            R,
            C,
            PKind
        } = plant;
        let top = R;
        let left = C;
        let bottom = R;
        let right = C;
        let constructor = plant.constructor;
        let RArr = [],
            CArr = [],
            tmp; /* 获取四点坐标 */
        while ((tmp = dMap[(--top) + "_" + C + "_" + PKind])?.constructor === constructor && tmp.HP > 0) {
            RArr.push(tmp); // 向上
        }
        RArr.reverse();
        while ((tmp = dMap[R + "_" + (--left) + "_" + PKind])?.constructor === constructor && tmp.HP > 0) {
            CArr.push(tmp); // 向左
        }
        CArr.reverse();
        while ((tmp = dMap[(++bottom) + "_" + C + "_" + PKind])?.constructor === constructor && tmp.HP > 0) {
            RArr.push(tmp); // 向下
        }
        while ((tmp = dMap[R + "_" + (++right) + "_" + PKind])?.constructor === constructor && tmp.HP > 0) {
            CArr.push(tmp); // 向右
        }
        top++;
        bottom--;
        left++;
        right--;
        return {
            top,
            bottom,
            left,
            right,
            RArr,
            CArr
        };
    };
    let CreatePlant = (Arr, R, C) => { // 在本格生成植物/阳光/卡槽
        let MidX = GetX(C) + 45;
        let MidY = GetY(R) - 50;
        let SNum = 0;
        let ThrownCard = Arr.IsCard;
        let dCard;
        for (let O of Arr) { // 遍历每个值
            if (typeof O === 'number') { // 对阳光的处理
                while (O > 50 && SNum < 3) {
                    ++SNum;
                    AppearSun(MidX, MidY, 50, 0);
                    O -= 50;
                }
                O > 0 && (AppearSun(MidX, MidY, O, 0));
            } else {
                let [data] = GetAP(GetX(C), GetY(R), R, C);
                if (ThrownCard || !O.prototype.CanGrow(data, R, C)) {
                    dCard = ThrowACard(O, [MidX - 100, MidY - 30], false, {
                        countdown: 1500,
                        delta: 30
                    });
                    UpgradeRules.CreateCard && UpgradeRules.CreateCard(dCard);
                } else {
                    CustomSpecial(O, R, C);
                }
            }
        }
    };
    // 单个植物 Ele 移动到相应位置
    let MovePlant = (plant, X, Y, Time = 0.75, CallBack = () => {}) => {
        // 已经被销毁的植物不能动
        if (!$P[plant.id]) {
            return false;
        }
        const plantEle = plant.Ele;
        // 先把植物除了占位之外的信息从游戏中注销掉，但不删除植物的dom
        plant.Die("JNG_TICKET_SuperPower", false);
        plant.canEat = false;
        plant.isPlant = false;
        oGd.$[`${plant.R}_${plant.C}_${plant.PKind}`] = plant;
        // 播放动画，播完了再把植物的dom和位置信息销毁掉
        oEffects.Animate(plantEle, {
            left: X + "px",
            top: Y + "px"
        }, Time / oSym.NowSpeed, "ease-in-out", () => {
            ClearChild(plantEle);
            IsHttpEnvi && plant.RemoveDynamicPic(plant);
            delete oGd.$[`${plant.R}_${plant.C}_${plant.PKind}`];
        });
    };
    let DecodeRule = (Obj) => { // 对植物升级路线进行获取最终植物列表，处理“统一卡片对象”
        let Type = Obj.Type,
            Num = Obj.Num ?? 1,
            Kind = Obj.Kind,
            ret = [];
        switch (Type) {
            case "CRand":
                while (Num--) {
                    ret.push(Kind.random());
                }
                ret.IsCard = true;
                return ret;
            case "CAll":
                while (Num--) {
                    ret.push(...Kind);
                }
                ret.IsCard = true;
                return ret;
            case "PRand":
                while (Num--) {
                    ret.push(Kind.random());
                }
                return ret;
            case "PAll":
                while (Num--) {
                    ret.push(...Kind);
                }
                return ret;
            case "ASun":
                return [Obj.Num];
            default:
                return [Obj];
        }
    };
    let MoveCallBack = (PName, Num, R, C, Kind) => { // 升级相应植物
        let Rule = UpgradeRules[PName];
        let Arr = DecodeRule(Rule);
        let Double = UpgradeRules["DoubleRule"](PName, Arr, Rule, Num, DecodeRule);
        CreatePlant(Double, R, C);
    };
    let CtkMain = (plant) => {
        // 该植物没有升级路线，返回0
        if (!UpgradeRules[plant.EName]) {
            return 0;
        }
        let {
            R,
            C,
            PKind
        } = plant;
        let PData = GetPNum(plant);
        let RPlantNum = PData.bottom - PData.top + 1;
        let CPlantNum = PData.right - PData.left + 1;
        let PNum = RPlantNum + CPlantNum - 1;
        if (RPlantNum >= 3 || CPlantNum >= 3) {
            if (UpgradeRules.BeforeCollapse) {
                UpgradeRules.BeforeCollapse(PData);
            }
            if (RPlantNum >= 3) {
                for (let O of PData.RArr) {
                    MovePlant(O, plant.pixelLeft, plant.pixelTop, 0.75); // 移动竖排植物并删除
                }
            }
            if (CPlantNum >= 3) {
                for (let O of PData.CArr) {
                    MovePlant(O, plant.pixelLeft, plant.pixelTop, 0.75); // 移动横排植物并删除
                }
            }
            oSym.addTask(100, () => {
                plant.Die('JNG_TICKET_SuperPower');
                if (RPlantNum > 4 || CPlantNum > 4) {oAudioManager.playAudio("match_3");}
                else if (RPlantNum > 3 || CPlantNum > 3) {oAudioManager.playAudio("match_2");}
                else {oAudioManager.playAudio("match");}
                let rand = Math.random();
                let stars = NewImg(`stars_${rand}`, null, `left:${C*80+10}px;top:${R*100-70}px;transform:scale(1);z-index:1000;pointer-events:none`, EDPZ);
                stars.src = oDynamicPic.require('images/Plants/stars.webp',stars);
                oSym.addTask(100*oSym.NowSpeed, _=>{
                    ClearChild(stars);
                });
                MoveCallBack(plant.EName, PNum, R, C, PKind);
            });
        }
        return PNum;
    };

    function addPlant(ele) {
        let id = ele.id;
        let constructor = window[ele.dataset['jngConstructor']];
        if (!constructor) return;
        let self = $P[id];
        if (self && !self.Tools && self.isPlant) {
            CtkMain(self);
        }
    }
    const callback = (mutations) => {
        IsGaming(1) && mutations.forEach(MutationRecord => {
            MutationRecord.addedNodes.forEach(addPlant);
        });
    };


    oMiniGames.PlantCollapse = (customUpgradeRules = {}) => {
        UpgradeRules = customUpgradeRules;
        new MutationObserver(callback).observe(EDPZ, {
            childList: true,
            subtree: true
        });
        return {
            GetPNum,
            CreatePlant,
            MovePlant,
            DecodeRule,
            MoveCallBack,
            CtkMain
        }; // 返回函数供特殊调用            
    };


})(oMiniGames);
