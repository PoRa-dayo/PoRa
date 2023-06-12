"use strict";
//囧姨原版中写的一些关卡逻辑函数
//此处不用let！！！
var asyncInnerHTML=function(HTML, callBack, arg) {  //异步插入HTML函数，拼接大量HTML并且执行回调函数
	let temp = $n('template'),
         content = temp.content,
         frag = document.createDocumentFragment();
	temp.innerHTML=HTML;  //要加入的内容先放到这里
	(function fun(Num){
		Num-- ? (
			frag.appendChild(content.firstChild),
			setTimeout(_=>fun(Num), 0)
		) : callBack(frag, arg);
	})(content.childNodes.length);
};
var syncInnerHTML=function(HTML, callBack, arg) {  //同步插入HTML函数，拼接大量HTML并且执行回调函数
	let temp = $n('template'),
         content = temp.content,
         frag = document.createDocumentFragment();
	temp.innerHTML=HTML;  //要加入的内容先放到这里
	(function fun(Num){
		Num-- ? (
			frag.appendChild(content.firstChild),
			fun(Num)
		) : callBack(frag, arg);
	})(content.childNodes.length);
};
var WhichMouseButton = e=>$SEql(e.which, {
    1: 1,  //左键
    3: 2,  //右键
    "default": 1,
});
var DisplayZombie = function(left=50,top=150,width=201,height=444) {
    if (isNullish(oP.AZ)) return;
    let AZ = Array.from(oP.AZ);  //拷贝一份僵尸配置的原始数据
    //过滤所有不予以预览的僵尸并予以重排
    AZ = AZ.filter(data => data[0].prototype.CanDiaplay);
    for(let index = AZ.length-1;index>=0;index--){
        let z = AZ[index];
        for(let i = oP.ZombieCurrentWeight[z[0].prototype.EName]-1;i>0;i--){
            AZ.push(z);
        }
    }
    AZ.shuffle();
    //生成垂直坐标随机数
    let len = AZ.length;
    let randoms = [];
    while(len--) randoms.push(Math.floor(top + Math.random() * height));
    randoms.sort((a, b) => a - b);  //从小到大排序
    //生成html代码
    let htmls = [];
    AZ.forEach((zombie, index) => {
        const proto = zombie[0].prototype;
        htmls.push(proto.getDisplayHTML("", Math.floor(left + Math.random() * width) - proto.width * 0.5, randoms[index] - (proto.displayHeight ?? proto.height), 1, "block", "auto", proto.GetDTop, proto.PicArr[proto.StandGif]));
    });
    //渲染dom
    asyncInnerHTML(htmls.join(""), frag => $("dZombie").appendChild(frag));
};
var oSelectCardGUI = {
    Init() {
        this.wrapDom = $("dSelectCard");
        this.cardListDom = $("dPCard");
        this.render();
        this.initEventListeners();
        this.__needCheckList__ = new Set([0, 1]);
        return this;
    },
    render() {
        let html = '';
        oS.PName.forEach(plant => {
            let proto = plant.prototype;
            let EName = proto.EName;
            let cardType = oS.CardsType[EName] ?? "0";
            ArPCard.$[EName] = {
                Select: 0,
                PName: plant
            };
            html += `<div class="aCard" id="aCard_${EName}" data-jng-ename="${EName}"><img src="${proto.PicArr[0]}" class="CardType_${cardType}"><span class="cardSunNum">${proto.SunNum}</span></div>`;
        });
        this.cardListDom.innerHTML = html;
        return this;
    },
    initEventListeners() {
        const self = this;
        const fn = {
            mouseout(evt, EName) {
                SetHidden($('dTitle'));
            },
            mousemove(evt, EName) {
                self.viewCardTitle(window[EName], evt);
            },
            mousedown(evt, EName, ele) {
                const cardType = ele.childNodes[0].className;
                switch (cardType) {
                    //卡牌状态码0：正常卡牌，可以选择，可以撤销
                    case "CardType_0":
                        self.selectOneCard(EName);
                        break;
                        //卡牌状态码1：该卡牌禁止被选择
                    case "CardType_1":
                        oAudioManager.playAudio('UnlockLimit');
                        break;
                        //卡牌状态码2：该卡牌在选卡界面显示后强制选择，禁止被撤销
                    case "CardType_2":
                        oAudioManager.playAudio('UnlockLimit');
                        break;
                        //卡牌状态码3：该卡牌在当前关卡不推荐使用
                    case "CardType_3":
                    case "CardType_3Force": {
                        if (!ArPCard.$[EName].Select && cardType === "CardType_3Force") {
                            jngAlert.open({
                                'text': "携带当前植物将会提升难度，确认携带？",
                                'nextHandler': _ => {
                                    self.selectOneCard(EName);
                                    oAudioManager.playAudio("bottom");
                                },
                                'shade': 1,
                            });
                        } else {
                            self.selectOneCard(EName);
                        }
                        break;
                    }
                    //卡牌状态码4：推荐使用的正常卡牌，可以选择，可以撤销
                    case "CardType_4":
                        self.selectOneCard(EName);
                        break;
                }
            },
        };
        for (let key in fn) {
            this.cardListDom.addEventListener(key, (evt) => {
                const ele = evt.target;
                if (ele.className === "aCard") {
                    fn[key](evt, ele.dataset['jngEname'], ele);
                }
            });
        }
    },
    viewCardTitle(plant, event) { //选卡界面标签绘制
        let ele = $("dTitle");
        let proto = plant.prototype;
        let cardType = oS.CardsType[proto.EName];
        let str = `${proto.CName}<br>冷却时间:${proto.coolTime}秒<br>${proto.Tooltip}`;
        if (cardType) {
            let str2 = {
                1: "不可被选择",
                2: "不可撤销",
                3: "不推荐使用",
                "3Force": "不推荐使用",
                4: "推荐使用",
            } [cardType];
            str += `<br><span style="color:#F00">植物${str2}！</span>`;
        }
        ele.innerHTML = str;
        SetStyle(ele, {
            left: event.clientX - EDAlloffsetLeft + 385 - 3 + "px",
            top: event.clientY + 18 + "px",
            visibility: "visible",
        });
    },
    show(callback) {
        const self = this;
        const SelectCard = self.wrapDom;
        const CardList = $("dCardList");
        SetVisible(SelectCard, CardList);
        oEffects.Animate(SelectCard, {
            top: '0px'
        }, 0.225, 'cubic-bezier(0.0, 0.0, 0.2, 1)', _ => {
            SelectCard.style['pointer-events'] = 'auto';
            for (let ename in oS.CardsType) {
                switch (oS.CardsType[ename]) {
                    case 2:
                        self.selectOneCard(ename);
                        break;
                    case 4:
                        self.selectOneCard(ename);
                        break;
                }
            }
            callback && callback();
        }, 0.3);
        return this;
    },
    hide(callback) {
        const SelectCard = this.wrapDom;
        SelectCard.style['pointer-events'] = 'none';
        oEffects.Animate(SelectCard, {
            top: '600px'
        }, 0.195, 'cubic-bezier(0.4, 0.0, 1, 1)', () => {
            SetHidden(SelectCard);
            callback && callback();
        });
        return this;
    },
    /*
        selectOneCard用于控制卡牌的选择或取消
        如果canRemove设置为false，则当植物卡牌处于被选择状态时，调用SelectCard时不会被取消
    */
    selectOneCard(EName, canRemove = true, useAudio = true) {
        const CardDiv = $("aCard_" + EName);
        if (!CardDiv) {
            return;
        }
        const CardImg = CardDiv.childNodes[0];
        const CardType = CardImg.className;
        const CardObj = ArPCard.$[EName];
        //如果卡牌当前处于未选择状态，则执行选择操作
        if (!CardObj.Select) {
            useAudio && oAudioManager.playAudio('tap');
            //如果卡槽已经选满，则直接终止操作
            if (ArPCard.SelNum > 9) return;
            ++ArPCard.SelNum;
            CardObj.Select = 1;
            if (oS.StaticCard) {
                let src = CardImg.src;
                //创建dCard容器
                let dCard = NewEle("dCard" + EName, "div", "", {
                    onmousedown: () => oSelectCardGUI.selectOneCard(EName)
                }, $("dCardList"));
                //创建被选卡牌的图像
                NewImg("", src, "width:100px;height:120px", dCard);
                //创建被选卡牌阳光数值标签
                NewEle("", "span", "", {
                    className: "cardSunNum2",
                    innerText: CardObj.PName.prototype.SunNum
                }, dCard);
                if (oS.CanSelectCard) { //过渡特效
                    dCard.style.visibility = 'hidden';
                    let rect = CardDiv.getBoundingClientRect();
                    let transitionDiv = NewEle("", "div", `top:${rect.top}px;left:${rect.left - EDAll.getBoundingClientRect().left + 500}px;`, {
                        className: 'TransitionCard'
                    }, EDAll);
                    let img = NewImg("", src, `width:100%;position:absolute;`, transitionDiv, {});
                    let text = NewEle("", "span", "", {
                        className: "cardSunNum",
                        innerText: CardObj.PName.prototype.SunNum
                    }, transitionDiv);
                    let time = 0.3;
                    let fontSize = 16;
                    let deltaFontSize = 18 - fontSize;
                    oEffects.Animate(text, {
                        height: "28px",
                        bottom: GetStyle(text, 'bottom', true) + 2 + "px",
                        right: "9px",
                    }, time, 'ease-in');
                    for (let i = 0; i < time; i += 0.016) {
                        setTimeout(function() {
                            text.style.fontSize = (fontSize += deltaFontSize / (time / 0.016)) + "pt";
                        }, i * 1000);
                    }
                    oEffects.Animate(transitionDiv, {
                        clip: 'rect(auto, auto, 60px, auto)',
                        left: '500px',
                        top: `${dCard.getBoundingClientRect().top}px`,
                        width: '100px',
                        height: '60px',
                    }, time, 'ease-in', () => {
                        ClearChild(transitionDiv);
                        dCard.style.visibility = ''; //如果设置visit的话，在游戏开始后隐藏CardList会无效
                    });
                }
                CardImg.style.top = "-42px";
            }
        }
        //如果卡牌处于选择状态，则执行取消操作
        else if (canRemove) {
            oSelectCardGUI.removeOneCard(EName, useAudio);
        }
    },
    removeOneCard(EName, useAudio = true) {
        const CardDiv = $("aCard_" + EName);
        if (!CardDiv) return;
        const CardImg = CardDiv.childNodes[0];
        const CardType = CardImg.className;
        const CardObj = ArPCard.$[EName];
        const func = () => {
            useAudio && oAudioManager.playAudio('tap');
            CardObj.Select = 0;
            --ArPCard.SelNum;
            ClearChild($("dCard" + EName));
            CardImg.style.top = 0; //恢复选择栏的卡牌状态     
        };
        if (CardType === "CardType_2") {
            useAudio && oAudioManager.playAudio('UnlockLimit');
        } else if (CardType === "CardType_4") {
            jngAlert.open({
                'text': "这关如果不带该植物会有点难，确认继续？",
                'nextHandler': _ => {
                    func();
                    oAudioManager.playAudio("bottom");
                },
                'shade': 1,
            });
        } else {
            func();
        }
    },
    selectSeveralCards(cardArr) {
        cardArr.forEach(plant => {
            this.selectOneCard(plant.prototype.EName, false, false);
        });
    },
    resetSelectedCards() {
        for (let key in ArPCard.$) {
            ArPCard.$[key].Select && this.selectOneCard(key);
        }
        oAudioManager.playAudio("Close");
    },
    ReadyGO() {
        if (ArPCard.SelNum <= 0) {
            jngAlert.open({
                text: '请至少携带一株植物！',
                type: 0
            });
            return;
        }
        //checkCard用于检测特定植物卡牌在当前关卡中的状态
        //函数返回1：该关卡提供该卡牌，且玩家已选择该卡牌
        //函数返回2：该关卡提供该卡牌，且玩家未选择该卡牌
        //函数返回3：该关卡不提供该卡牌
        const checkCard = (ename) => ArPCard.$[ename] ? (ArPCard.$[ename].Select ? 1 : 2) : 3;
        if (this.__needCheckList__.has(0)) {
            if (ArPCard.SelNum < 2 && checkCard('oImitater') === 1) {
                jngAlert.open({
                    text: '您确定只 携带模仿者？这将不会有任何效果！',
                    nextHandler: _ => (this.__needCheckList__.delete(0), this.ReadyGO()),
                    canBtn1CloseWindow: false
                });
                return;
            }
        }
        if (this.__needCheckList__.has(1)) {
            let isAvailable = false;
            let isSelected = false;
            for (let card of ArPCard.$) {
                let {
                    EName,
                    CanSpawnSun
                } = card.PName.prototype;
                if (CanSpawnSun) {
                    oS.CardsType[EName] !== 1 && (isAvailable = true);
                    if (card.Select) {
                        isSelected = true;
                        break;
                    }
                }
            }
            if (isAvailable && !isSelected) {
                jngAlert.open({
                    text: '您确定不携带任何生产类植物进行游戏？',
                    nextHandler: _ => (this.__needCheckList__.delete(1), this.ReadyGO()),
                    canBtn1CloseWindow: false
                });
                return;
            }
        }
        jngAlert.close();
        oSelectCardGUI.hide(_ => oSym.addTask(20, oS.ScrollBack, [LetsGO]));
        oPropSelectGUI.hide();
        $("dCardList").childNodes.forEach((ele) => {
            ele.onmousedown = null;
        });
    },
};
var GetAP = (evtX, evtY, R, C) => {  //返回鼠标所在位置的植物数据组，和鼠标指向的植物
    let datas = oGd.$;
    let data = [];
    let pointPlant;
    for(let Z = 0; Z <= PKindUpperLimit; Z++) {
        let plant = datas[`${R}_${C}_${PKindTraverseOrder[Z]}`];
        data[PKindTraverseOrder[Z]]=plant;
        if(plant && evtX > plant.pixelLeft && evtX < plant.pixelRight && evtY > plant.pixelTop && evtY < plant.pixelBottom) {
            pointPlant = plant;
        }
    };
    return [data, pointPlant];
},
LetsGO = function() {  //oS.StartGame调用前的预备代码
    let CardList = $("dCardList");
    let Title = $("dTitle");
    SetVisible(CardList);
    //初始化所有玩家选择的植物卡牌
    $User._tmpARCARD[oS.Lvl] = [];
    CardList.childNodes.forEach((cardEle, index) => {
        let DID = cardEle.id;
        let PName = ArPCard.$[DID.substring(5)].PName;
        cardEle.onmousedown = event => {ChosePlant(event, index);event.stopPropagation();event.preventDefault();};
        cardEle.onmouseover = _ => {
            !IsMobile && SetVisible(Title);
            ViewPlantTitle(oS.MCID = index);
        };
        cardEle.onmouseout = _ => SetHidden(Title);
        cardEle.firstChild.style.top = "-60px";
        ArCard.push({
            DID,
            PName,  //构造函数
            CDReady: 0,
            SunReady: 0,
            NeedToMonitor:true,
        });
        $User._tmpARCARD[oS.Lvl].push(PName);
    });
    EBody.onmousedown = event => GroundOnmousedown(event);  //代理鼠标点击
    EBody.onmousemove = event => GroundOnmousemove(event);  //代理鼠标移动
    for(let R = 1; R <= oS.R; R++) CustomSpecial(oBrains, R, -2);  //放置大脑检测器
    oPropUseGUI.Init();     //载入道具
    (oS.StartGame || oS.DefaultStartGame)();
},
GroundOnmousedown = function(event) {
    let [evtX, evtY] = [$User.clientX, $User.clientY];
    let [[X, C], [Y, R]] = [ChosePlantX(evtX), ChosePlantY(evtY)];
    let data = GetAP(evtX, evtY, R, C);
    switch(oS.Chose) {
        case 1:
            WhichMouseButton(event) < 2 ? GrowPlant(data[0], X, Y, R, C) : CancelPlant();
            break;
        case -1 : 
            WhichMouseButton(event) < 2 ? ShovelPlant(data) : CancelShovel();
            break;
    }
},
GroundOnmousemove = function() {},  //鼠标移动代理，默认为空
GroundOnmousemove1 = (event, plant = ArCard[oS.ChoseCard].PName) => {  //选择了植物的鼠标移动
    let [evtX, evtY] = [$User.clientX, $User.clientY];
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
            left: X + proto.GetDX(proto) + "px",
            top: Y - proto.height + proto.GetDY(R, C, data) + "px",
        });
    } else {
        SetHidden(imgAlpha);
    }
},
GroundOnmousemove2 = function() {  //选择了铲子的鼠标移动
    let [evtX, evtY] = [$User.clientX, $User.clientY];
    let [[, C], [, R]] = [ChosePlantX(evtX), ChosePlantY(evtY)];
    let [,P] = GetAP(evtX, evtY, R, C);
    let ID = P ? P.id: '';  //现在鼠标所指植物id
    let MPID = oS.MPID;  //原先鼠标所指植物id
    if(MPID !== ID) {  //如果鼠标指向发生变化
        let oldPointedEle = $(MPID);
        let newPointedEle = $(ID);
        MPID && oldPointedEle && SetAlpha(oldPointedEle.childNodes[1], 1);  //恢复前一植物的透明度
        (oS.MPID = ID) && $P[ID].isPlant && $P[ID].canShovel && newPointedEle && SetAlpha(newPointedEle.childNodes[1], 0.6);  //改变后一植物的透明度
    }
    SetStyle($('tShovel'), {  //移动铲子
        left: evtX - 20 + 'px',
        top: evtY - 38 + 'px',
    });
},
ChoseShovel = function(event) {
    if(oS.Chose===1||$("MovePlant")){
        CancelPlant();
    }
    if(oS.Chose===-1){
        CancelShovel();
        return;
    }
	oAudioManager.playAudio('shovel');
	oS.Chose = -1;
    ClearChild($("tShovel"));
    SetHidden($('imgShovel'));
    // 铲子元素需要放在EDAll中，原因与MovePlant相同！
	NewImg('tShovel','images/interface/Shovel.png',`left:${$User.clientX - 20}px;top:${$User.clientY - 38}px;z-index:258;`, EDAll);
	GroundOnmousemove = GroundOnmousemove2;
    event.preventDefault();
    event.stopPropagation();
},
ShovelPlant = function(data) {
    oAudioManager.playAudio("plant2");
    let [plantsArg, pointedPlant] = data;
    if(pointedPlant && pointedPlant.isPlant && pointedPlant.canShovel) {  //鼠标有指向非障碍物的普通植物，且植物允许被铲除
        //如果指向的是普通植物，或者是没有搭载其他植物的植物容器，则允许铲除
        if(pointedPlant.PKind || !(plantsArg[1] || plantsArg[2])) {
            pointedPlant.Die('JNG_TICKET_ShovelPlant');
            oS.MPID = "";  //注销鼠标指向植物
        }
    }
    CancelShovel();
},
CancelShovel = function() {
    let MPID = oS.MPID;
    oS.Chose = 0;
    ClearChild($("tShovel"));
    SetVisible($("imgShovel"));
    MPID && $P[MPID] && SetAlpha($(MPID).childNodes[1], 1);  //如果是右键取消，还需要恢复原指向植物之透明度
    GroundOnmousemove = function() {};
},
ViewPlantTitle = function(index) {  //战斗界面植物标签绘制
    if(index === null) return; 
    let ele = $("dTitle");
    let card = ArCard[index];
    let plant = card.PName.prototype;
    let str = `${plant.CName}<br>冷却时间:${plant.coolTime}秒<br>${plant.Tooltip}`;
    !card.CDReady && (str += '<br><span style="color:#F00">植物正在冷却中...</span>');
    !card.SunReady && (str += '<br><span style="color:#F00">你的阳光不足!</span>');
    ele.innerHTML = str;
    SetStyle(ele, {
        top: Math.min(512, 60 * index),
        left: "215px",
    })
},
MonitorCard = function() {  //更新植物卡牌，在种植植物、冷却完成及搜集阳光后被调用
    if(oS.Chose < 1) {  //如果鼠标没有拖放植物
        ArCard.forEach(card => {
            if(!card.NeedToMonitor){
                return;
            }
            if(card.PName.prototype.SunNum > oS.SunNum) {  //如果当前阳光不足以种植卡牌
                card.SunReady = 0;
                $(card.DID).childNodes[0].style.top = "-60px";
                card.Readyed = false;
            } else {
                card.SunReady = 1;
                if(card.CDReady){
                    $(card.DID).childNodes[0].style.top = 0;
                    if(!card.Readyed){
                        let maskFather = $(`dCDFather${card.DID}`),mask = $(`dCDMask${card.DID}`);
                        SetStyle(mask,{backgroundColor:"white",opacity:"1"});
                        SetStyle(maskFather,{transition:"",height:"auto",opacity:"0.4"});
                        oEffects.fadeOut(maskFather, 0.5/oSym.NowSpeed);
                        card.Readyed=true;
                    }
                }  //若植物的阳光和冷却都满足，则显示正常卡牌
            }
        });
    } else {  //如果鼠标正在拖放植物，则只更新数据不更新dom
        ArCard.forEach(card => {
            if(!card.NeedToMonitor){
                return;
            }
            card.SunReady = Number(card.PName.prototype.SunNum < oS.SunNum);      
        });
    }
    //考虑到若玩家可能一直把鼠标放在某植物卡牌上，所以还要更新植物介绍牌
    oS.MCID && ViewPlantTitle(oS.MCID);
},
BeginCool = function() {  //开局首次冷却
    ArCard.forEach((card, index)=>{
        let proto = card.PName.prototype,
        coolTime = proto.coolTime,
        firstCoolTime = coolTime;
        //创建冷却框
        let maskFather = NewEle(`dCDFather${card.DID}`,"div","pointer-events:none;position:relative;",null,$(card.DID));
        let borderStr = "20px";
        if(/(oLSP|oLight)/.test(card.DID)){
            borderStr = "20px 0px";//特殊边框
        }
        let mask = NewEle(`dCDMask${card.DID}`,"div",`background-color:black;border-radius:${borderStr};position:relative;opacity:0;`,null,maskFather);
        if(proto.hasOwnProperty('firstCoolTime')) firstCoolTime = proto.firstCoolTime;  //如果有默认首次冷却的，取默认值
            else if(coolTime <= 7.5) firstCoolTime = 0;  //如果冷却时间小于等于5s,开局0冷却
            else if(coolTime >= 15 && coolTime <=25) firstCoolTime -= 5;  //如果冷却在15~25s之间，开局减去5s
        DoCoolTimer(index, firstCoolTime);  //注册计时器
    });
},
DoCoolTimer = function(index, coolTime) {  //卡片冷却计时器
    let card = ArCard[index];
    let ele = $(card.DID);
    let spanCD = NewEle(`dCD${index}`, "span", null, {className: 'spanCD'}, ele);   //创建倒计时span
    let maskFather = $(`dCDFather${card.DID}`),mask = $(`dCDMask${card.DID}`);
    card.Readyed = false;
    //重置冷却框样式
    if(localStorage.JNG_TR_COOLTEXT!=="1"){
        SetStyle(maskFather,{transition:"",height:"auto",opacity:"1"});
        SetStyle(mask,{backgroundColor:"black",opacity:"0.4"});
    }
    (function fun(currentCoolTime) {
        if(currentCoolTime > 0&&card.CDReady!=1) {
            if(localStorage.JNG_TR_COOLTEXT==="1"){
            spanCD.innerText = currentCoolTime;
            }else{
                $User.LowPerformanceMode?SetStyle(maskFather,{height:`${currentCoolTime/coolTime*100}%`}):SetStyle(maskFather,{transition:`height ${0.5/oSym.NowSpeed}s linear`,height:`${currentCoolTime/coolTime*100}%`});
            }
            //每隔0.5s字幕变化一次
            //作减法时仅保留一位小数
            oSym.addTask(50, fun, [(currentCoolTime - 0.5).toFixed(1)]);  
        } else {
            SetStyle(maskFather, {transition: `height ${0.5/oSym.NowSpeed}s linear`, height: 0});
            ClearChild(spanCD);
            card.CDReady = 1;  //标记冷却完成
            MonitorCard();
        }
    })(coolTime);
},
ChosePlant = function(evt, index) {
    index === -1 && (index = 9);    //按0键可以选取第10个植物
    if(index + 1 > ArCard.length) {
        return;
    }
    if(oS.Chose===-1){
        CancelShovel();
    }
    if(oS.Chose===1||$("MovePlant")){
        CancelPlant();
        return;
    }
    $("MovePlant") && ClearChild($("MovePlant"));
    let AC = ArCard[oS.ChoseCard = index];  //当前所选卡牌数据
    if (!AC.CDReady) {  //冷却不达标则无法种植
        oAudioManager.playAudio("buzzer");
        return;
    }
    if (!AC.SunReady) {  //阳光不达标则无法种植
        SunNumWarn();
        return;
    }
    oAudioManager.playAudio("seedlift");
    let evtX = evt.clientX - EDAlloffsetLeft,
          evtY = evt.clientY,
          Pro = AC.PName.prototype,
          len = ArCard.length,
          PicArr = Pro.PicArr;
          oS.Chose = 1;
    if(!oS.CardKind) {  //选择的是植物卡片
        /* 
            给FightScene设置-webkit-mask属性，会导致该容器形成独立叠层上下文。
            在独立叠层上下文中，元素设置的z-index只在其中有效，故会出现MovePlant元素被
            迷雾等图层遮盖，而修改z-index无效的情况。
            借鉴PvZ1中MovePlant元素=铲子元素>UI元素>迷雾>MovePlantAlpha>场景的顺序，
            现将MovePlant元素移动为EDAll的子元素, MovePlantAlpha保持不变！
        */
        let MovePlant = NewImg("MovePlant",  PicArr[Pro.StaticGif], `left:${evtX}px;top:${evtY + 20 - Pro.height}px;z-index:258;`,EDAll);
        SetStyle(MovePlant, Pro.ImgStyle);
        EditImg(MovePlant.cloneNode(false), "MovePlantAlpha", "", {  //克隆一份作为半透图
            visibility: "hidden",
            opacity: 0.4,
            zIndex: 30,
        }, FightingScene);
        EditCompositeStyle({
            ele: MovePlant,
            addFuncs: [["translateX", 115 - Pro.width / 2 + "px"]],
            option: 2,
        });
    } else {  //选择的是僵尸卡片
        NewImg("MovePlant", Pro.PicArr[Pro.StandGif], "left:" + (evtX - 0.5 * (Pro.beAttackedPointL + Pro.beAttackedPointR)) + "px;top:" + (evtY + 20 - Pro.height) + "px;z-index:258", FightingScene);
        NewImg("MovePlantAlpha", Pro.PicArr[Pro.StandGif], "visibility:hidden;opacity:0.4;z-index:30", FightingScene);
    }
    while (len--) {
        $(ArCard[len].DID).childNodes[0].style.top = "-60px";  //强制所有卡牌置灰
    }
    SetHidden($("dTitle"));
    GroundOnmousemove = GroundOnmousemove1;
},
GrowPlant = function(data, X, Y, R, C) {
    let index = oS.ChoseCard;
    let card = ArCard[index];
    let plant = card.PName;
    let proto = plant.prototype;
    let coolTime = proto.coolTime;
    if (proto.CanGrow(data, R, C)) {
        oAudioManager.playAudio(
            oGd.$GdType[R][C] === 2 ? "plant_water" : `plant${Math.floor(1+Math.random()*2)}`
        );
        new plant().Birth(X, Y, R, C, data);
        oS.SunNum -= proto.SunNum;  //更新阳光
        coolTime && (card.CDReady = 0, DoCoolTimer(index, coolTime));  //重置植物卡牌冷却
        // 显示泥土动画
        const effectElement = $("imgGrowSoil");
        effectElement.src = GrowSoilImg;
        SetStyle(effectElement, {
            left: X - 30 + "px",
            top: Y - 45 + "px",
            zIndex: 3 * R + 1,
            visibility: "visible",
        });
        oSym.addTask(100, SetHidden, [effectElement]);
        // 种完植物后需要取消掉选中植物的状态
        CancelPlant();
    } else if(IsMobile||R<1||C<1||C>9){
        CancelPlant();
    }
},
CancelPlant = function() {
    ClearChild($("MovePlant"), $("MovePlantAlpha"));
    oS.Chose = 0;  //标记为无植物无铲子
    MonitorCard();  //更新植物卡牌
    GroundOnmousemove = function() {};  //重置鼠标移动事件
},
SunNumWarn = function() {
    oAudioManager.playAudio("buzzer");
    oEffects.Animate(ESSunNum, 'SunNumWarn');
},
AutoProduceSun = function(num) {  //这是关卡自动掉落阳光的函数
    oS.DKind && AppearSun(GetX(Math.floor(1 + Math.random() * oS.C)), GetY(Math.floor(1 + Math.random() * oS.R)), num, 1);
    oSym.addTask(Math.floor(9 + Math.random() * 3) * 200, AutoProduceSun, [num]);
},
AppearSun = function(X, Y, N, isDrop,...options) {
    let [targetDeltaY=0,power=0,totalTime=64,XMove=24] = options;
    let height, top, id = "Sun" + Math.random(),
    cssText = `left:${X}px;`;
    let transformScale=Math.Clamp((N-7.5)/85*1.35+0.125,0.2,1.5);
    height = 39+(transformScale-0.8)*2;
    //阳光为自动落下还是抛物线跳出
    if(isDrop) {
        cssText += `transform: scale(${transformScale})`;  //阳光缩放大小
        top = 0;
        oSym.addTask(10, MoveDropSun, [id, Y]);  //此处异步！
    } else {
        cssText += `transform: scale(${transformScale/2})`;  //阳光缩放大小
        top = Y - height - 20;
    }
    ArSun[id] = {id: id, N: N, C: 1, left: X, top: top, drop: isDrop};
    let sunEle = NewEle(id, 'div', cssText, {onmouseover: _=>ClickSun(id), className: 'SunPic'}, EDAll);
    if(!isDrop){
        let maxH = 120-Math.min(30,10*Math.pow((transformScale-0.8),2))+power;
        let halfTime = totalTime/2;
        let vy = maxH/halfTime*2;
        let a = -vy/halfTime;
        let endX = Math.random()*XMove*2-XMove;
        let vx = endX/(halfTime*2);
        let k = 0.025;//阻尼系数
        let deltaTime = $User.LowPerformanceMode?4:2;
        X = X+height/2;
        cssText += `;top:${top}px`;
        let targetTop = top+targetDeltaY;
        let effected = false;
        (function fun(){
            if(ArSun[id] && ArSun[id].C) {
                if(!effected){
                    effected = true;
                    oEffects.Animate(sunEle,{
                        transform:`scale(${transformScale})`
                    },0.2*1/oSym.NowSpeed);
                }
                SetStyle(sunEle, {
                    left: (X = X + vx*deltaTime)+ "px",
                    top: (top = top - vy*deltaTime) + "px",
                });
                if(top<targetTop){
                    vy+=a*deltaTime;
                    if(vy<0){
                        vy-=k*vy*deltaTime;
                    }
                    oSym.addTask(deltaTime,fun);
                }else{
                    SetStyle(sunEle, {
                        left: X + "px",
                        top: targetTop + "px",
                    });
                }
            }
        })();
        oSym.addTask(800+(halfTime*2-36), DisappearSun, [id], 3);  //阳光消失
    }
    $User.AutoSun && oSym.addTask(100, ClickSun, [id]);  //如果用户开启了自动搜集则自动搜集
    return ArSun[id];
},
MoveDropSun = function(id, Y) {  //正常掉落阳光
    let sun = ArSun[id];
    if(sun && sun.C) {
        if(sun.top < Y - 53) {
            $(id).style.top = (sun.top += 3) + "px";
            oSym.addTask(5, MoveDropSun, [id, Y]);
        } else {
            oSym.addTask(800, DisappearSun, [id]);
        }
    }
},
DisappearSun = function(id) {
    const sun = ArSun[id], ele = $(id);
    sun && sun.C && (
        ele.onmouseover = null,
        oEffects.fadeOut(ele, undefined, _=>{
            delete ArSun[id];
            ClearChild(ele);
        })
    );
},
ClickSun = function(id) {
    let dom = $(id);
    if(!dom||dom.dataset.clicked){
        return;
    }
    dom.dataset.clicked="1";
    oAudioManager.playAudio("points");
    let sun = ArSun[id];
    sun && sun.C && (sun.C = 0, MoveClickSun(id));
},
//移动拾取的阳光到左上角
MoveClickSun = function(id) {
    let obj = ArSun[id], ele = $(id),
    currentX = obj.left, currentY = obj.top,
    targetX = 196, targetY = -39,
    distance = Math.sqrt((currentX-targetX)**2 + (currentY-targetY)**2),
    time=(distance/743)/oSym.NowSpeed;
    SetStyle($(id), {
        transition: `left ${time}s ease,top ${time}s ease,transform ${time}s cubic-bezier(1,1,0.5,0),opacity ${time}s cubic-bezier(0,0,0.2,1)`,
        left: targetX + "px", top: targetY + "px",
        transform : `scale(0.25)`, opacity : 0.75,
    })
    .addEventListener('transitionend', _=>ArSun[id] && (oS.SunNum += obj.N, MonitorCard(), delete ArSun[id], ClearChild(ele)));
},
AutoClickSun = function() {  //批量强制搜集场地上的阳光
    for(let key in ArSun) {
        ArSun[key].C && ClickSun(key);
    }
},
AutoClickCoins = function(){
    let doms = Array.from(document.getElementsByClassName("coins_collect"));
    for(let key in doms){
        doms[key].click();
    }
},
PrepareGrowPlants = function(fun,anim=true,text=[["准备...",60,"80px"],["放置...",40,"60px"],["植物！",100,"90px"]]) {
    $("dZombie").innerHTML = '';
    if(!anim){
        oS.isStartGame = 1;
        dispatchEvent(EVENT_STARTGAME);
        fun();
        oS.HaveFog && oS.HaveFog.Immediate !== false && oFog.moveLeft(_=>{});
        return;
    }
    let dom = NewEle("dReadySetPlant","div","left: 507.5px; top: 300px; transform: translateX(115px) translate(-50%, -50%);color:red;font-size:80px;opacity:0;",{
        innerText:text[0][0],
        className:"2px_shadow_with_shadow"
    }, EDAll);
    const callback = function(){
        let time = 0;
        oAudioManager.playAudio("readysetplant");
        for(let i = 0;i<text.length;i++){
            oSym.addTask(time,()=>{
                dom.innerText = text[i][0];
                dom.style.opacity = "";
                dom.style.fontSize =text[i][2];
                EditCompositeStyle({
                    ele: dom,
                    delFuncs: ['scale'],
                    addFuncs: [["scale", 0.95]],
                    option: 2,
                });
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
            oS.isStartGame = 1;
            dispatchEvent(EVENT_STARTGAME);
            fun();
        });
    };
    oS.HaveFog && oS.HaveFog.Immediate !== false  ? oFog.moveLeft(callback) : callback();
},
CustomSpecial = (constructor, R, C) => {
    return new constructor().Birth(GetX(C), GetY(R), R, C, []);
},
CustomBullet = (constructor,...arr) => {
    return new constructor().Birth(...arr);
},
CheckAutoSun = function(ele) {  //修改是否自动拾取阳光
    //注意：这里只是修改$User.AutoSun，真正实现拾取阳光的代码在AppearSun函数里
    var shifouKaiqi = ele.checked ? 1 : 0;
    shifouKaiqi != $User.AutoSun && ($User.AutoSun = localStorage['JNG_TR_AUTOSUN'] = shifouKaiqi, shifouKaiqi && AutoClickSun());
},
CheckSilence = function(ele) {  //修改是否静音
    (oS.Silence = ele.checked) ? oAudioManager.allResMuted() : oAudioManager.allResMutedCanceled();
},
CheckCursor = function(ele={"checked":localStorage.JNG_TR_BIGCURSOR}){//游戏鼠标设置 启动游戏时的设置在index.js里
    if(ele.checked){
        localStorage.JNG_TR_BIGCURSOR = "1";
        EBody.className = "bigCursor";
    }else{
        localStorage.JNG_TR_BIGCURSOR = "0";
        EBody.className = "";
    }
};
/* 游戏特殊地形相关 */
const oFog = {
    isAttacking:false,
    locked: false,
    init() {
        this.locked = false;
        this.isAttacking = false;
        return Object.assign(this, oS.HaveFog);
    },
    render() {
        let innerHTML = "";
        let imgY = 0;
        let MaxFogCId = 2 * this.leftBorder + 3;
        let date = new Date().getMonth()*100+new Date().getDate();
        function getFogPicture(){
            if(date===301){
                return `images/interface/fog_frog${Math.floor(Math.random() * 2)}.webp`;
            }
            return `images/interface/fog${Math.floor(Math.random() * 4)}.png`;
        }
        let createImg = (id, x, y) => `<img id='Fog${id}' class='${this.type} show' src='${getFogPicture()}' style='left:${x}px;top:${y}px;'>`;
        //从上至下，从左至右绘制迷雾
        for(let idY = 1; idY < oS.R+1; idY++) {
            for(let idX = 0, imgX = 0; idX <= MaxFogCId; idX++, imgX += 35) {
                innerHTML += createImg(idY + "_" + idX, imgX, imgY);
            }
            imgY += 540/oS.R;
        }
        let ele = NewEle("dFog", "div", null, {innerHTML}, EDAll);
        ele.className=this.type+"Div";
    },
    moveLeft(callback) {  //迷雾进入场地
        // 如果迷雾被锁定则无法进行任何形式的移动
        if (this.locked === true) {
            return;
        }
        this.hasLeftStage = false;
        oEffects.Animate($("dFog"), {left: GetX(oS.C - this.leftBorder) + 60 + 'px'}, 1, 'cubic-bezier(0.0, 0.0, 0.2, 1)', _ => {
            callback && callback();
            this.refreshTP();
            this.type === 'strongFog' && this.attackPlants();
        });
    },
    moveRight() {  //迷雾被三叶草退去
        let left, callback, wrap = $("dFog");
        // 如果迷雾被锁定则无法进行任何形式的移动
        if (this.locked === true) {
            return;
        }
        if(this.type === 'Fog') {
            left = '1290px';
            this.hasLeftStage = true;
            oSym.addTask(2500, this.moveLeft.bind(this));
        } else {
            if((this.leftBorder -= 3) > 0) {
                left = GetX(oS.C - this.leftBorder) + 100 + 'px';
                callback = this.refreshTP.bind(this);
            } else {
                left = '1290px';
                this.hasLeftStage = true;
                this.leftBorder = oS.HaveFog.leftBorder;
                oSym.addTask(1250, this.moveLeft.bind(this));
            }
        }
        for(let ele of wrap.children) {
            this.toggleState(ele, 'show');
        }
        oEffects.Animate($("dFog"), {left}, (this.type === 'Fog' ? 0.4 : 1)/oSym.NowSpeed, 'cubic-bezier(0.4, 0.0, 0.6, 1)', callback);
    },
    refreshTP() {  //迷雾位置变化后火炬树桩和路灯花重新进行去雾
        for(let id of oGd.$TrafficLights) {
            let light = $P[id];
            this.update(light.R, light.C, 0, 0, 0);
        }
        for(let id of oGd.$Torch) {
            let torch = $P[id];
            this.update(torch.R, torch.C, 0, 0, 0);
        }
        for(let id of oGd.$Plantern) {
            let plantern = $P[id];
            this.update(plantern.R, plantern.C, 1, 1, 0);
        }        
    },
	update(R, C, RNum, CNum, isShowFog) { //火炬路灯去雾或恢复, isShowFog为1表示聚拢0表示开雾
        let FogIDs = new Set();
        let fun = (R, C, RNum, CNum, _method = 'add') => {
            let MinC = Math.max(1, C - CNum);
            let MaxC = Math.min(9, C + CNum);
            let MaxFogC = 10 - this.leftBorder;
            if(MaxC < MaxFogC) return;
            if(MinC < MaxFogC) MinC = MaxFogC;
            let MinR = Math.max(1, R - RNum);
            let MaxR = Math.min(oS.R, R + RNum);
            let MaxFogCId = this.leftBorder*2 + 3;
            let minCId = Math.max(0, MaxFogCId - (9-MinC)*2 - 5);
            let maxCid = MaxC < 9 ? MaxFogCId - (9-MaxC)*2 - 3 : MaxFogCId;
            for(let tempR = MinR; tempR <= MaxR; tempR++) {
                for(let tempC = minCId; tempC <= maxCid; tempC++) {
                    FogIDs[_method](`Fog${tempR}_${tempC}`);
                }
            }
        };
        fun(R, C, RNum, CNum);
        if(isShowFog) { //如果是恢复，则重新激活一遍仍然存活的火炬路灯的去雾，以排除掉它们可能照亮的区域
            for(let id of oGd.$TrafficLights) {
                let light = $P[id];
                fun(light.R, light.C, 0, 0, 'delete');
            }
            for(let id of oGd.$Torch) {
                let torch = $P[id];
                fun(torch.R, torch.C, 0, 0, 'delete');
            }
            for(let id of oGd.$Plantern) {
                let plantern = $P[id];
                fun(plantern.R, plantern.C, 1, 1, 'delete');
            }
        }
        FogIDs.forEach(eleId => this.toggleState($(eleId), isShowFog ? 'show' : 'hide'));
	},
    toggleState(ele, newState) {  //切换雾单体元素的显示/隐藏状态
        ele.classList.remove(newState === 'show' ? 'hide' : 'show');
        ele.classList.add(newState);
    },
    attackPlants() {  //霾会对覆盖其中的植物造成伤害
        let dom = $("dFog");
        let self = this;
        if(self.isAttacking){
            return;
        }
        (function fun() {
            self.isAttacking = true;
            if(!oFog.hasLeftStage && dom === $("dFog")){
                for(let plant of $P) plant.C >= (10 - oFog.leftBorder) && plant.EName !== 'oPlantern' && plant.getHurt(null, 0, 5);
                oSym.addTask(100, fun);
            }else{
                self.isAttacking = false;
            }
        })();
    },
};
const oWaterPath = {
    points: null,
    defaultDepth: 30,
    init(depth) {
        depth = depth ?? this.defaultDepth;
        this.fullWaterImage = oS.InitWaterPath?.fullWaterImage ?? 
                (oS.DKind ? "images/interface/Mirage_FullWater.webp" : "images/interface/Mirage_FullWater_Night.webp");
        // 该集合用于记录所有水道格子的坐标
        this.points = new Set();
        // oS.InitWaterPath包括beforeDFS和afterDFS两个部分
        // beforeDFS在算法自动生成路径前调用，在该函数中只需标定水道的GdType即可，dfs算法会自动生成路径
        oS.InitWaterPath?.beforeDFS && oS.InitWaterPath.beforeDFS(oGd.$GdType, oGd.$WaterFlowDirection);
        // 统计所有的水道格子坐标，并初始化其他相关数组
        for (let r = 1; r <= oS.R; r++) {
            for (let c = 0; c <= oS.C + 1; c++) {
                if (oGd.$GdType[r][c] === 2) {
                    oGd.$WaterDepth[r][c] = depth;
                    oGd.$WaterFlowDirection[r][c] = "Static";
                    this.points.add([r, c]);
                } else {
                    oGd.$WaterDepth[r][c] = 0;
                    oGd.$WaterFlowDirection[r][c] = "NoWater";
                }
            }
        }
        // 自动生成水道路径
        if(oS.autoWaterFlowDirection){
            if(oS.autoWaterFlowDirection==="bfs"){
                oGd.$WaterFlowDirection = this.bfsCreateWaterFlowDirection(false,true,oS.InitWaterPath?.diyStartPoints??[]);
            }else{
                this.createWaterFlowDirection(oS.InitWaterPath?.diyStartPoints??[]);
            }
        }
        // afterDFS在算法自动生成路径后、渲染水道图像前调用，同时需要手工修改GdType、WaterFlowDirection，并添加points。
        // afterDFS仅用于极个别特殊情况下需要对dfs生成的路径进行修正。
        oS.InitWaterPath?.afterDFS && oS.InitWaterPath.afterDFS(oGd.$GdType, oGd.$WaterFlowDirection, this.points);
        // 绘制矩阵蒙版
        this.render();
        return this;
    },
    bfsCreateWaterFlowDirection(allRes = false,changeStatic=true,diyStartPoints=false){
        let startPoints = [];
        let directions = [[0,1],[0,-1],[1,0],[-1,0]];
        let englishName = ["Right","Left","Down","Up"];
        let directionByEngName = (function(){
            let json = {};
            for(let i =0;i<englishName.length;i++){
                json[englishName[i]] = directions[i];
            }
            return json;
        })();
        directionByEngName["NoWater"]=directionByEngName["Static"]=[0,0];
        let ground = [];
        let groundStep = [];
        let groundSearchIndex = [];
        let groundTurn = [];
        let checks = {//对应要检查哪个格子跟自己是否一样
            "Left":[0,1],
            "Right":[0,-1],
            "Up":[1,0],
            "Down":[-1,0]
        };
        for(let i =0;i<=oS.R+1;i++){
            ground[i]=[];
            groundStep[i] = [];
            groundTurn[i] = [];
            groundSearchIndex[i] = [];
            for(let j = 0;j<=oS.C+1;j++){
                if(oGd.$GdType?.[i]?.[j]===2){
                    ground[i][j]="Static";
                }else{
                    ground[i][j]="NoWater";
                }
                groundStep[i][j]=Infinity;
                groundSearchIndex[i][j] = -1;
                groundTurn[i][j] = Infinity;
            }
        }
        if(diyStartPoints===false){
            for(let i = 1;i<=oS.R;i++){
                if(oGd.$GdType[i][oS.C]===2){
                    startPoints.push({
                        R:i,
                        C:oS.C,
                        step:0,
                        searchIndex:i,
                        turns:0,
                        direction:-1
                    });
                }
            }
        }else{
            for(let i of diyStartPoints){
                startPoints.push({
                    R:i[0],
                    C:i[1],
                    step:0,
                    searchIndex:startPoints.length,
                    turns:0,
                    direction:-1
                });
            }
        }
        for(let i of startPoints){
            bfs(i);
        }
        //反过来搜索一遍，保证水的公平性
        {
            let rev=startPoints.reverse();
            for(let i of rev){
                bfs(i);
            }
        }
        function bfs(point){
            let queue = [];
            queue.push(point);
            groundStep[point.R][point.C] = point.step;
            groundSearchIndex[point.R][point.C]=point.searchIndex;
            groundTurn[point.R][point.C] = point.turns;
            while(queue.length>0){
                let node = queue[0];
                queue.shift();
                let flowStr = "";
                //判断流向并添加新位点
                for(let i = 0;i<directions.length;i++){
                    let newNode = {
                        R:node.R+directions[i][0],
                        C:node.C+directions[i][1],
                        step:node.step+1,
                        searchIndex:node.searchIndex,
                        direction:i,
                    };
                    newNode.turns = node.turns+(i!=node.direction?1:0);
                    //检查是否已经有更近的水流过了
                    //若出界                                                    或有更近的水流流过了
                    if(newNode.R<1||newNode.R>oS.R||newNode.C<1||newNode.C>oS.C||(groundStep[newNode.R][newNode.C]<newNode.step)){
                        continue;
                    }
                    if(oGd.$GdType[newNode.R][newNode.C]===2){
                        if(groundStep[newNode.R][newNode.C]===newNode.step&&groundTurn[newNode.R][newNode.C]<newNode.turns){
                            continue;
                        }
                        //在场地数组注册信息
                        groundStep[newNode.R][newNode.C] = newNode.step;
                        groundSearchIndex[newNode.R][newNode.C]=newNode.searchIndex;
                        groundTurn[newNode.R][newNode.C] = newNode.turns;
                        if((groundStep[newNode.R][newNode.C]>newNode.step)||groundSearchIndex[newNode.R][newNode.C]==newNode.searchIndex){//等于的时候两边水是公平的
                            if(flowStr.length>0){
                                flowStr+=" ";
                            }
                            flowStr+=englishName[i];
                        }
                        queue.push(newNode);
                    }
                }
                if(flowStr.length!==0){
                    ground[node.R][node.C]=flowStr;//更新当前格流向
                }else{
                    ground[node.R][node.C]="Static";
                }
            }
        }
        if(changeStatic){
            let reverseName = ["Left","Right","Up","Down"];
            for(let r = 1;r<=oS.R;r++){
                for(let c=1;c<=oS.C;c++){
                    replaceBlock(r,c);
                }
            }
            function replaceBlock(r,c){
                if(ground[r][c]==="Static"){
                    let flowStr = "";
                    //directions [右,左,下,上]
                    for(let i = 0;i<directions.length;i++){
                        let [dR,dC] = directions[i];
                        if(oGd.$GdType?.[r+dR]?.[c+dC]===2){
                            ground[r+dR][c+dC].split(" ").forEach((p)=>{
                                if((i<2&&/Left|Right/.test(p))||(i>1&&/Up|Down/.test(p))){
                                    let [checkR,checkC] = directionByEngName[p];
                                    if(/NoWater/.test(ground[r+checkR][c+checkC])){
                                        return;
                                    }
                                    if(flowStr.length>0){
                                        flowStr+=" ";
                                    }
                                    flowStr+=p;
                                }
                            });
                        }
                    }
                    let splited={};
                    flowStr.split(" ").forEach((p)=>{
                        splited[p]=true;
                    });
                    if(splited["Left"]&&splited["Right"]&&ground[r][c+1].includes("Left")&&ground[r][c-1].includes("Right")){
                        delete splited["Left"];
                        delete splited["Right"];
                    }
                    if(splited["Up"]&&splited["Down"]){
                        delete splited["Up"];
                        delete splited["Down"];
                    }
                    flowStr = "";
                    let needToRecheck = [];
                    for(let i in splited){
                        if(i.length<1){
                            continue;
                        }
                        if(flowStr.length>0){
                            flowStr+=" ";
                        }
                        flowStr+=i;
                        needToRecheck.push([r+directionByEngName[i][0],c+directionByEngName[i][1]]);
                    }
                    if(flowStr.length==0){
                        ground[r][c]="Left";
                    }else{
                        ground[r][c]=flowStr;
                        needToRecheck.forEach((p)=>{
                            replaceBlock(...p);
                        });
                    }
                }
            }
        }
        return allRes?[ground,groundStep,groundTurn]:ground;
    },
    createWaterFlowDirection(diyStartPoints = []) {
        let startPoints = [];
        let directions = {
            "Right": [0, 1],
            "Left": [0, -1],
            "Down": [1, 0],
            "Up": [-1, 0],
        };
        let GdType = oGd.$GdType;
        let PathDirection = oGd.$WaterFlowDirection;
        // 经与leobai友好协商，默认情况下规定处于场景最右侧的水道格子为水道入口
        if (diyStartPoints && diyStartPoints.length === 0) {
            for (let i = 1; i <= oS.R; i++) {
                if (oGd.$GdType[i][oS.C] === 2) {
                    startPoints.push([i, oS.C]);
                }
            }
        } else if (diyStartPoints) {
            startPoints.concat(diyStartPoints);
        }
        function dfs(curR, curC, vis) {
            let flag = false;
            let ans = [];
            vis.add(curR + "_" + curC);
            // 经与leobai友好协商，规定如下情况的格子为水道出口的唯一情况
            if (
                GdType[curR][curC - 1] !== 2 && GdType[curR - 1][curC] !== 2 && GdType[curR + 1][curC] !== 2
            ) {
                PathDirection[curR][curC] = "Left";
                return true;
            }
            for (let dir in directions) {
                let [dR, dC] = directions[dir];
                let [newR, newC] = [curR + dR, curC + dC];
                if (
                    Math.inRange(newR, 1, oS.R)
                    && Math.inRange(newC, 1, oS.C)
                    && GdType[newR][newC] === 2
                    && !vis.has(newR + "_" + newC)
                    && dfs(newR, newC, vis)
                ) {
                    flag = true;
                    !PathDirection[curR][curC].includes(dir) && ans.push(dir);
                }
            }
            if (flag && ans.length > 0) {
                if (PathDirection[curR][curC] !== "Static" && PathDirection[curR][curC].length > 0) {
                    PathDirection[curR][curC] += " ";
                } else {
                    PathDirection[curR][curC] = "";
                }
                PathDirection[curR][curC] += ans.join(" ");
            }
            return flag;
        }
        for (let [r, c] of startPoints) {
            let vis = new Set();
            dfs(r, c, vis);
        }
    },
    async render() {
        let self = this;
        let maskCanvas = NewEle('', "canvas", 'display:none;', {
            width: 1015,
            height: 600,
        }, IsDevEnvi ? FightingScene : null);
        let bgCanvas = NewEle("tGround_MaskImage", "canvas", null, {
            width: 1015,
            height: 600,
        }, FightingScene);
        let ctx_mask = maskCanvas.getContext("2d");
        let ctx_bg = bgCanvas.getContext("2d");
        let edgeImg = new Image();
        let bgImg = new Image();
        edgeImg.src = "images/Props/WaterPath/edgeMask.webp";
        bgImg.src = "images/Props/WaterPath/fullWater.webp";
        await oLoadRes.loadElement([edgeImg, bgImg]);
        // 画水的完整图片
        ctx_bg.drawImage(bgImg, 0, 0, 1015, 600);
        // 生成水道蒙版
        for (let [r, c] of self.points) {
            let [X, Y] = [GetX(c) + 115, GetY(r)];
            let [w, h] = [
                (GetX(oS.C) - GetX(1)) / (oS.C - 1) / 2,
                (GetY(r) - GetY(r - 1))
            ];
            let $Direction = oGd.$WaterFlowDirection;
            let dir = $Direction[r][c];
            let [lb, rb, tb, bb] = [true, true, true, true];
            let [right_bottom_angle, right_top_angle, left_bottom_angle, left_top_angle] = [false, false, false, false];
            //讨论左右走向的格子
            if (/Left|Right/.test(dir)) {
                //检测格子左右侧是否连通
                if (/Left/.test(dir)) {
                    /Left|Up|Down/.test($Direction[r]?.[c - 1]) && (lb = false);
                    /Left|Up|Down/.test($Direction[r]?.[c + 1]) && (rb = false);
                    /*
                        ←           或       ←
                        ↑                       ↓
                    */
                    if (/Up|Down/.test($Direction?.[r + 1]?.[c])) {
                        left_bottom_angle = true;
                    }
                    /*
                        ↑           或       ↓
                       ←                    ←
                    */
                    if (/Up|Down/.test($Direction?.[r - 1]?.[c])) {
                        left_top_angle = true;
                    }
                }
                if (/Right/.test(dir)) {
                    /Right|Up|Down/.test($Direction[r]?.[c - 1]) && (lb = false);
                    /Right|Up|Down/.test($Direction[r]?.[c + 1]) && (rb = false);
                    /*
                        →           或       →
                        ↑                       ↓
                    */
                    if (/Up|Down/.test($Direction?.[r + 1]?.[c])) {
                        right_bottom_angle = true;
                    }
                    /*
                        ↑           或       ↓
                        →                    →   
                    */
                    if (/Up|Down/.test($Direction?.[r - 1]?.[c])) {
                        right_top_angle = true;
                    }
                };
                //检测格子上侧是否连通
                /Down/.test($Direction?.[r - 1]?.[c]) && (tb = false);
                //检测格子下侧是否连通
                /Up/.test($Direction?.[r + 1]?.[c]) && (bb = false);
            }
            //讨论上下走向的格子
            if (/Up|Down/.test(dir)) {
                //检测格子左侧是否连通
                /Right/.test($Direction?.[r]?.[c - 1]) && (lb = false);
                //检测格子右侧是否连通
                /Left/.test($Direction?.[r]?.[c + 1]) && (rb = false);
                if (/Up/.test(dir)) {
                    /Up|Left|Right/.test($Direction?.[r - 1]?.[c]) && (tb = false);
                    /Up/.test($Direction?.[r + 1]?.[c]) && (bb = false);
                    /*
                          ↑←
                    */
                    if (/Left/.test($Direction?.[r]?.[c + 1])) {
                        right_top_angle = true;
                    }
                    /*
                          →↑
                    */
                    if (/Right/.test($Direction?.[r]?.[c - 1])) {
                        left_top_angle = true;
                    }
                }
                if (/Down/.test(dir)) {
                    /Down|Left|Right/.test($Direction?.[r + 1]?.[c]) && (bb = false);
                    /Down/.test($Direction?.[r - 1]?.[c]) && (tb = false);
                    /*
                          ↓←
                          注：←↓的情况不存在，不需要讨论
                    */
                    if (/Left/.test($Direction?.[r]?.[c + 1])) {
                        right_bottom_angle = true;
                    }
                    /*
                          →↓
                          注：↓→的情况不存在，不需要讨论
                    */
                    if (/Right/.test($Direction?.[r]?.[c - 1])) {
                        left_bottom_angle = true;
                    }
                }
            }
            // 应泠漪之要求，先增加对static格子的处理
            if (/Static/.test(dir)) {
                // 连通边界
                if ($Direction?.[r - 1]?.[c] !== 'NoWater' && r !== 1) tb = false;
                if ($Direction?.[r + 1]?.[c] !== 'NoWater' && r !== oS.R) bb = false;
                if ($Direction?.[r]?.[c - 1] !== 'NoWater') lb = false;
                if ($Direction?.[r]?.[c + 1] !== 'NoWater') rb = false;
                // 增加转角
                if (!lb && !tb) left_top_angle = true;
                if (!rb && !tb) right_top_angle = true;
                if (!lb && !bb) left_bottom_angle = true;
                if (!rb && !bb) right_bottom_angle = true;
            }
            //绘制蒙版
            ctx_mask.globalCompositeOperation = 'source-over';
            ctx_mask.fillRect(X - w, Y - h, w * 2, h);
            ctx_mask.globalCompositeOperation = 'destination-out';
            tb && ctx_mask.drawImage(edgeImg, 0, 0, 81, 90, X - w, Y - h - 8, w * 2, h);
            bb && ctx_mask.drawImage(edgeImg, 81, 0, 81, 90, X - w, Y - h + 10, w * 2, h);
            lb && ctx_mask.drawImage(edgeImg, 162, 0, 81, 90, X - w - 9, Y - h, w * 2, h);
            rb && ctx_mask.drawImage(edgeImg, 243, 0, 81, 90, X - w + 9, Y - h, w * 2, h);
            left_top_angle && ctx_mask.drawImage(edgeImg, 324, 0, 24, 24, X - w - 8, Y - h - 8, 24, 24);
            right_top_angle && ctx_mask.drawImage(edgeImg, 405 - 24, 0, 24, 24, X + w - 24 + 8, Y - h - 8, 24, 24);
            left_bottom_angle && ctx_mask.drawImage(edgeImg, 324, 90 - 24, 24, 24, X - w - 8, Y - 24 + 8, 24, 24);
            right_bottom_angle && ctx_mask.drawImage(edgeImg, 405 - 24, 90 - 24, 24, 24, X + w - 24 + 8, Y - 24 + 8, 24, 24);
        }
        // 把水道蒙版画到完整的水道图片上
        ctx_bg.globalCompositeOperation = 'destination-in';
        ctx_bg.drawImage(maskCanvas, 0, 0, 1015, 600);
    },
};
const changeDKind = async () => {
    let {
        background_day =  "images/interface/Mirage.webp",
        background_night = "images/interface/Mirage_Night.webp",
        background_sky = "images/interface/Mirage_Sky.webp",
    } = oS.changeDKindConfig;
    let oldKind = oS.DKind;
    let wrapElement = $("tGround");
    let oldBg = $("tGround_Image");
    let sky = $("tGround_Sky");
    let easing = "cubic-bezier(0.4, 0.0, 1, 1)";
    let newBg;
    sky.style.background = `url(${background_sky})`;
    // 更改oS.DKind
    oS.DKind ^= 1;
    // 白天变黑夜
    if (oldKind === 1) {
        newBg = NewEle("tGround_Image_New", "div", `opacity:0;background:url(${background_night});`, {
            className:"standardGround"
        }, wrapElement);
        oEffects.Animate(oldBg, {
            filter: "sepia(0.4) saturate(1.8) brightness(0.9)",
        }, 1.4/oSym.NowSpeed, easing);
        await oEffects.animatePromise(sky, {
            filter: "opacity(1)"
        }, {duration: 1.4/oSym.NowSpeed, easing});
        oEffects.Animate(sky, {
            filter: "opacity(0)",
        }, 1.547/oSym.NowSpeed, easing, null, 0.8/oSym.NowSpeed);
        await oEffects.animatePromise(newBg, {
            "opacity": "1",
            "filter":"none",
        }, { duration: 2.347/oSym.NowSpeed, easing });
        
        let title = $("sFlagMeterTitleF");
        //用RegExp方便外国人适配
        title.innerHTML = title.innerHTML.replace(new RegExp("天","g"),"夜");
    } 
    // 黑夜变白天
    else {
        newBg = NewEle("tGround_Image_New", "div", `opacity:0;filter:sepia(0.4) saturate(1.8) brightness(0.9);background:url(${background_day});`, {
            className:"standardGround",
        }, wrapElement);
        oEffects.Animate(oldBg, {
            filter: "sepia(0.4) saturate(1.8) brightness(0.9)",
        }, 2/oSym.NowSpeed, easing);
        oEffects.Animate(newBg, {
            "opacity": "1",
            "filter":"none",
        }, 2.147/oSym.NowSpeed, easing, null, 1.443/oSym.NowSpeed);
        await oEffects.animatePromise(sky, {
            filter: "opacity(1)",
        }, {duration: 2/oSym.NowSpeed, easing});
        await oEffects.animatePromise(sky, {
            filter: "opacity(0)",
        }, {duration: 1.6/oSym.NowSpeed, easing});
        let title = $("sFlagMeterTitleF");
        //用RegExp方便外国人适配
        title.innerHTML = title.innerHTML.replace(new RegExp("夜","g"),"天");
    }
    wrapElement.insertBefore(newBg, oldBg);
    ClearChild(oldBg);
    newBg.id = "tGround_Image";
};
/*
    出墓碑的关卡配置方法：
    oS.TombConfig = {
        // 普通植物墓碑的抽奖池，如果不设置则默认为AllPlantsArr
        rewardPlantsPool: <Array>,
        //  从抽奖池中抽取多少种植物，作为摧毁tomb_plant的奖励
        rewardPlantsSize: <Number>,
    };
    oP.FlagToMonitor = {
        // 批量随机生成指定数目的墓碑,
        <Number>: [oTombstone.appear, [<Number>]],
        // 批量使得墓碑消失（镜花水月黑夜变白天时使用）
        <Number>: [oTombstone.disappear]
    }
*/
const oTombstone = {
    tombCroods: null,
    tombConfigs: [{
        type: "tomb",
        get style() {
            return "background-position:" + [-123, -246, -492].random() + "px 0";
        },
        reward: null,
    }, {
        type: "tomb_plant",
        style: "background-position:-738px 0;",
        reward(R, C) {
            ThrowACard(this.__RewardPlants__.random(), [GetX(C) - 50, GetY(R) - 100], false, {
                delta:30,
                vy:-4,
            });
        },
    }, {
        type: "tomb_plant_buff",
        style: "background-position:-861px 0;",
        reward(R, C) {
            ThrowACard(AllPopularPlantsArr.random(), [GetX(C) - 50, GetY(R) - 100], false, {
                delta:30,
                vy:-4,
            });
        },
    }, {
        type: "tomb_sun",
        style: "background-position:-369px 0;",
        reward(R, C) {
            for(let i = -1;i<=1;i+=2){
                AppearSun(GetX(C) + 45, GetY(R) - 50, 50, false, 50 - Math.random()*10);
            }
        },
    }, {
        type: "tomb_sun_buff",
        style: "background-position:0 0;",
        reward(R, C) {
            for(let i = -1;i<=1;i++){
                AppearSun(GetX(C) + 45, GetY(R) - 50, 50, false, 50 - Math.random()*10);
            }
        }
    }, {
        type: "tomb_tool",
        style: "background-position:-615px 0;",
        reward(R, C) {
            ThrowACard(AllToolsArr.random(), [GetX(C) - 50, GetY(R) - 100], false, {
                delta:30,
                vy:-4,
            });
        },
    }],
    tombMap: null,
    Init() {
        if (isNullish(oS.TombConfig)) return;
        this.tombCroods = new Set();
        // 随机抽取若干种植物，供tomb_plant调用
        let {rewardPlantsPool, rewardPlantsSize: total} = oS.TombConfig;
        let rewardPlants = [];
        // 默认将AllPlantsArr作为抽奖池
        rewardPlantsPool = rewardPlantsPool ?? AllPlantsArr;
        for (let i = 0; i < Math.min(total, rewardPlantsPool.length); i++) {
            let plant = rewardPlantsPool.random();
            // 如果是高级墓碑才能产生的植物，或者已经被抽中的植物，则需要重新抽过
            if (AllPopularPlantsArr.includes(plant) || rewardPlants.includes(plant)) {
                i--;
            } else {
                rewardPlants.push(plant);
            }
        }
        // 将抽取的植物，和高级墓碑固定植物加到oS.LoadingPName中加载
        oS.LoadingPName.push(...rewardPlants, ...AllPopularPlantsArr, ...AllToolsArr);
        // 保存抽取结果
        this.__RewardPlants__ = rewardPlants;
        // 给tombConfigs打一张映射表，方便通过墓碑的type查到墓碑的config
        if (isNullish(this.tombMap)) {
            let map = this.tombMap = new Map();
            this.tombConfigs.forEach((config) => {
                map.set(config.type, config);
            });
        }
    },
    /*
    获取可能的格子
    格式：
    
    Type1
    {
        (可2选1)
        RangeR:[min,max],
        RangeC:[min,max]
    }
    
    Type2
    {
        (可2选1)
        AvailableR:[r1,r2,r3,r4...],
        AvailableC:[c1,c2,c3,c4...]
    }
    
    Type3
    [[r1,c1],[r2,c2],[r3,c3]...]
    */
    getPlaces(AvailablePlace = undefined) {
        let AvailableR = [];
        let AvailableC = [];
        if (AvailablePlace?.AvailableR || AvailablePlace?.AvailableC) {
            AvailableR = AvailablePlace?.AvailableR ?? Array.getRangedArray(1, oS.R);
            AvailableC = AvailablePlace?.AvailableC ?? Array.getRangedArray(1, oS.C);
            AvailablePlace = [];
        }
        if (AvailablePlace === undefined || AvailablePlace?.RangeR || AvailablePlace?.RangeC) {
            let RangeR = [1, oS.R],
                RangeC = [1, oS.C];
            RangeR = AvailablePlace?.RangeR ?? RangeR;
            RangeC = AvailablePlace?.RangeC ?? RangeC;
            AvailableR = Array.getRangedArray(...RangeR);
            AvailableC = Array.getRangedArray(...RangeC);
            AvailablePlace = [];
        }
        if (AvailablePlace.length === 0) {
            for (let r = AvailableR.length - 1; r >= 0; --r) {
                for (let c = AvailableC.length - 1; c >= 0; --c) {
                    AvailablePlace.push([AvailableR[r], AvailableC[c]]);
                }
            }
        }
        return AvailablePlace;
    },
    /*
        注：total表示的仅仅是批量生成墓碑的最大值，若场地剩余空间不足则实际生成的墓碑数会小于total
        AvailablePlace、AvailableType用于自定义生成墓碑的位置和种类
    */
    appear(total, AvailablePlace = undefined, AvailableType = []) {
        const self = oTombstone;
        if (AvailableType.length > 0) {
            for (let i = AvailableType.length - 1; i >= 0; --i) {
                AvailableType[i] = self.tombMap.get(AvailableType[i]);
            }
        } else {
            AvailableType = self.tombConfigs;
        }
        AvailablePlace = self.getPlaces(AvailablePlace);
        let len = AvailablePlace.length;
        while (total > 0 && len-- > 0) {
            let index = Math.floor(AvailablePlace.length * Math.random());
            let [R, C] = AvailablePlace[index];
            AvailablePlace.splice(index, 1);
            let config = AvailableType.random();
            if (self.appearSingle(R, C, config)) {
                total--;
            }
        }
    },
    /* 
        生成单个墓碑，如生成失败将返回false 。
        调用时既可直接传入墓碑的config对象，也可以传入墓碑对应的type字符串
    */
    appearSingle(R, C, tombConfig) {
        let self = oTombstone;
        let crood = R + "_" + C;
        // 墓碑不能从其他特殊地形的位置生成
        let check = false;
        for (let i = 0; i <= PKindUpperLimit && !check; i++) {
            let isPlant = oGd.$?.[`${R}_${C}_${i}`]?.isPlant;
            // 碰到非植物的障碍物，这里一定不能生成墓碑
            if (isPlant === false || isPlant === 0) {
                check = true;
            }
        }
        if (oGd.isLocked(R, C) || oGd.$GdType[R][C] === 2 || check) {
            return false;
        }
        // tombConfig是字符串的情况
        if (typeof tombConfig === "string") {
            tombConfig = self.tombMap.get(tombConfig);
        }
        // 杀死当前格的植物
        for (let kind = 0; kind <= PKindUpperLimit; kind++) {
            let plant = oGd.$[`${R}_${C}_${kind}`];
            plant && plant.Die("JNG_TICKET_Tombstone");
        }
        // 注册墓碑
        oGd.$Tombstones[crood] = tombConfig;
        oGd.$LockingGrid[crood] = true;
        self.tombCroods.add(crood);
        // 播放动画
        let {type, style} = tombConfig;
        let weight = 102;
        let height = 134;
        let element = NewEle(`Tomb_${crood}`, "div", `left:${GetX(C) - weight / 2 - 8}px;top:${GetY(R) - 25}px;z-index:${3 * R};clip:rect(0,auto,0,0);` + style, {
            className: "Tombstone",
        }, FightingScene);
        oAudioManager.playAudio("gravestone_rumble");
        element.dataset["jngTombType"] = type;
        oEffects.Animate(element, {
            top: GetY(R) - height + 12,
            clip: `rect(0,auto,${height}px,0)`
        }, 'slow', 'ease-out', (ele) => {
            ele.style.clip = `rect(0,auto,auto,0)`;
        });
        oEffects.ImgSpriter({
            ele: NewEle(`Dirt_${Math.random()}`, "div", `position:absolute;background:url(images/Zombies/dirt.png) no-repeat;z-index:${3*R + 2};left:${755 - (9 - C)*80}px;top:${100*(R-1) + 40}px;height:162px;width:126px;`, 0, EDPZ),
            styleProperty: 'X',
            changeValue: -126,
            frameNum: 22,
            callback: ele => oEffects.fadeOut(ele, 'slow', ClearChild),
        });
        return true;
    },
    disappear() {
        const self = oTombstone;
        if (!oGd.$Tombstones) return;
        for (let crood of self.tombCroods) {
            self.disappearSingle(crood);
        }
    },
    disappearSingle(R, C, useAnim = true) {
        let self = oTombstone;
        let crood =  R;
        if(oGd.isValidCrood(R)){
            let json = crood.match(/(?<R>\d+)_(?<C>\d+)/).groups;
            R = json.R;
            C = json.C;
        }else{
            crood = (R + "_" + C);
        }
        let element = $("Tomb_" + crood);
        let callback = () => {
            delete oGd.$Tombstones[crood];
            self.tombCroods.delete(crood);
            oGd.unlockGrid(R, C);
            ClearChild(element);
        };
        if (useAnim) {
            oEffects.Animate(element, {
                opacity: 0,
            }, 1/oSym.NowSpeed, 'ease-in');
            oSym.addTask(100,callback);
        } else {
            callback();
        }
    },
    destroy(R, C) {
        let self = oTombstone;
        let crood = R + "_" + C;
        let {reward} = oGd.$Tombstones[crood];
        reward && reward.call(self, R, C);
        delete oGd.$Tombstones[crood];
        oGd.unlockGrid(R, C);
        self.tombCroods.delete(crood);
        ClearChild($("Tomb_" + crood));
    },
    /*
        placesZombies默认从oS.ZName中随机抽取僵尸进行墓碑出怪
        调用时若传入一个自定义数组，则将从该数组中随机抽取僵尸出怪
            (请务必确保该数组内元素已出现于oS.ZName中！！！)
        调用时若传入某个僵尸的构造函数，则所有墓碑统一出该僵尸
    */
    placeZombies(arr = oS.ZName,AvailablePlace=undefined) {
        const self = oTombstone;
        const isArray = TypeOf(arr) === "Array";
        AvailablePlace = self.getPlaces(AvailablePlace);
        let CroodJson = {};
        for(let i =AvailablePlace.length-1;i>=0;--i){
            CroodJson[`${AvailablePlace[i][0]}_${AvailablePlace[i][1]}`]=true;
        }
        if(isArray){
            for(let i = arr.length-1;i>=0;--i){
                if(!arr[i].prototype.CanAppearFromTomb){
                    arr.splice(i,1);
                }
            }
        }
        if(!isArray||arr.length>0){
            for (let crood of self.tombCroods) {
                if(!CroodJson[crood]){
                    continue;
                }
                let zombie;
                let {R, C} = crood.match(/(?<R>\d+)_(?<C>\d+)/).groups;
                zombie = isArray?arr.random():arr;
                PlaceZombie(zombie, +R, +C);
            }
        }
    },
};
/* 自己加或改的另外一些函数 */
var ThrowACard = function(plant,pos,callback,config={}){//丢出一张免费的植物卡片
    oAudioManager.playAudio("throw");
    if(!pos instanceof Array){
        pos = [pos.x,pos.y];
    }
    pos[0]=Math.min(pos[0],900-130);
    let {vy = -6, ay = 0.4, vx = 2*(Math.random()-0.5), countdown = 1000,delta = 40} = config;
    const obj = plant;
    const proto = obj.prototype;
    if(!proto.PicArr[proto.CardGif]){//如果没有卡片就不掉落
        return;
    }
    const id = "BonusCard" + Math.random();
    const styles = `top:${pos[1]}px;left:${pos[0]+115}px;transform:scale(0);width:100px;height:120px;cursor:pointer;clip:rect(auto,auto,60px,auto);z-index:253;`;
    let card = {
        DID: id,
        PName: obj,
        hasAnim: false,
        PixelTop: pos[1],
        EndTop: pos[1]+delta,
        Ele: NewImg(id, proto.PicArr[proto.CardGif], styles, EDAll, {onmousedown: event => {ChosePlant(event, card);}}),
    };
    oEffects.Animate(card.Ele, {transform: 'scale(1)'}, 0.1/oSym.NowSpeed, 'linear'); 
    (function moveCard() {
        (function(){
            if(card.PixelTop <= card.EndTop) {
                card.Ele.style.top = (card.PixelTop += (vy+=ay)) + "px";
                card.Ele.style.left = (Number.parseFloat(card.Ele.style.left) + vx) + "px";
                return;
            }
            if(card.hasOwnProperty('countdown')) {
                if(oS?.ChoseCardObj?.DID !== card.DID) {
                    card.countdown -= 3;
                    card.countdown <= 300 && !card.hasAnim && (oEffects.Animate(card.Ele, 'CardBlink', 'slow', null, null, null, 'infinite'), card.hasAnim = true);
                    if(card.countdown <= 0) {
                        card.Ele.onmousedown = null;
                        oEffects.Animate(card.Ele, {transform: 'scale(0)'}, 0.1, 'linear', ClearChild); 
                    }
                }
            } else {
                card.countdown = countdown;
            }
        })();
        if(!card.countdown||card.countdown>=0){
            oSym.addTask(3, moveCard);
        }
    })();
    //重载选择植物方法
    function ChosePlant(evt, obj) {
        if(oS.Chose===-1){
            CancelShovel();
        }
        if((oS.Chose===1&&!oS.ChoseCardObj)){
            CancelPlant();
            return;
        }
        if(oS.ChoseCardObj) return;
        evt.stopPropagation();
        evt.preventDefault();
        ClearChild($("MovePlant"));
        oAudioManager.playAudio("seedlift");
        let card = oS.ChoseCardObj = obj;
        let evtX = evt.clientX - EDAlloffsetLeft;
        let evtY = evt.clientY;
        let pro = card.PName.prototype;
        oS.Chose = 1;
        card.hasAnim = false;
        card.Ele.style.cssText += 'animation-fill-mode:forwards;animation-iteration-count:0;';
        let MovePlant = NewImg("MovePlant", pro.PicArr[pro.StaticGif], `left:${evtX}px;top:${evtY + 20 - pro.height}px;z-index:258;`, EDAll);
        SetStyle(MovePlant, oS.ChoseCardObj.PName.prototype.ImgStyle);
        EditImg(MovePlant.cloneNode(false), "MovePlantAlpha", "", { //克隆一份作为半透图
            visibility: "hidden",
            opacity: 0.4,
            zIndex: 30,
        }, FightingScene);
        EditCompositeStyle({
            ele: MovePlant,
            addFuncs: [["translateX", 115 - pro.width / 2 + "px"]],
            option: 2,
        });
        SetAlpha(card.Ele, 0.5); //标记卡牌被选择
        card.Appeared=true;
        SetHidden($("dTitle"));
        GroundOnmousemove = function(event) {
            let plant = oS.ChoseCardObj.PName;
            let evtX = event.clientX - EDAlloffsetLeft;
            let evtY = event.clientY;
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
                    left: X + proto.GetDX(proto) + "px",
                    top: Y - proto.height + proto.GetDY(R, C, data) + "px",
                });
            } else {
                SetHidden(imgAlpha);
            }
        };
        let gp = GrowPlant,cp=CancelPlant,vt=ViewPlantTitle;//备份原函数
        GrowPlant = function(data, X, Y, R, C) {
            let card = oS.ChoseCardObj;
            let plant = card.PName;
            let proto = plant.prototype;
            let cardID = card.DID;
            if (proto.CanGrow(data, R, C)) {
                oAudioManager.playAudio(
                    oGd.$GdType[R][C] === 2 ? "plant_water" : `plant${Math.floor(1+Math.random()*2)}`
                );
                let p = new plant().Birth(X, Y, R, C, data);
                callback&&callback(p);//如有后续对植物的操作就操作
                const effectElement = $("imgGrowSoil");
                effectElement.src = GrowSoilImg;
                SetStyle(effectElement, {
                    left: X - 30 + "px",
                    top: Y - 45 + "px",
                    zIndex: 3 * R + 1,
                    visibility: "visible",
                });
                oSym.addTask(100, SetHidden, [effectElement]);
                delete oS.ChoseCardObj;
                oS.Chose = 0;
                GroundOnmousemove = () => {};
                ClearChild($("MovePlant"), $("MovePlantAlpha"), card.Ele);
                if(card.countdown){
                    card.countdown=-1;
                }
                if(!IsMobile){
                    CancelPlant();
                    reduction()
                }
            }
            if(IsMobile){
                CancelPlant();
                reduction()
            }
        };
        CancelPlant = function() {
            let card = oS.ChoseCardObj;
            oS.Chose = 0;
            delete oS.ChoseCardObj;
            ClearChild($("MovePlant"), $("MovePlantAlpha"));
            card && SetAlpha(card.Ele, 100, 1);
            GroundOnmousemove = () => {};
            reduction();
        };
        ViewPlantTitle = function() {};
        function reduction(){
            [GrowPlant,CancelPlant,ViewPlantTitle]=[gp,cp,vt];
        }
    }
    return card;
},
toWin = () => {
    AutoClickSun();
    AutoClickCoins();
    oS.isStartGame=2;//结束游戏的标识
    NewEle("DivA", "div", `position:absolute;width:900px;height:600px;background:#FFF;opacity:0;z-index:257;left:115px;pointer-events:${IsDevEnvi ? 'none' : 'auto'}`, 0, EDAll);
    dispatchEvent(EVENT_ENDGAME);
    let musicDom = null;
    [oS.LoadMusic,oS.StartGameMusic].forEach((i)=>{
        musicDom = oAudioManager.getDom(i);
        if(musicDom){
            return;
        }
    });
    if (musicDom) {
        oEffects.AudioFadeOut(musicDom, 0, 0.8/oSym.NowSpeed, () => {
            PauseGame();
            oP.FlagToEnd();
            oAudioManager.refreshTicket();
        });
    } else {
        PauseGame();
        oP.FlagToEnd(); 
        oAudioManager.refreshTicket();
    }
},
toOver = function(type) {
    dispatchEvent(EVENT_ENDGAME);
    oAudioManager.allResPaused();
    oAudioManager.playAudio("scream");
    oAudioManager.pauseMusic();
    SetNone($("dCardList"), $("dTop"));
    SetBlock($("shade"));
    let fn = _=>{
        if(oS.DynamicDifficulty){
            oP.operateDynamicDifficulty(-1);
        }
        CSpeed(1);
        SetNone($("shade"));
        $("shade").style.opacity = 0;
    };
    oEffects.fadeTo($("shade"), 0.375, 'cubic-bezier(0.4, 0.0, 1, 1)');
    oEffects.Animate(
        NewEle(`GameOver`, 'div', `background-position:0 -${(type-1)*439}px;`, null, EDAll),
        {transform: `scale(1)`}, 0.3, 'cubic-bezier(.4,0,.2,1)'
    );
    oEffects.Animate(
        NewEle(Math.random(), "div", "position:absolute;width:112px;height:46px;left:428px;top:646px;z-index:310;", {
            className: 'jngButton voidButton oneLineVoidButton',
            innerText:"重新开始",
            onclick() {
                fn();
                if(/Fanmade/.test(oS.Lvl)){
                    if(oS.OriginLvl){
                        SelectModal(oS.OriginLvl);
                    }else{
                        SelectModal("index", "Service");
                    }
                }else{
                    SelectModal(oS.Lvl);
                }
            },
        }, EDAll),
        {top: '520px'}, 0.225, 'cubic-bezier(0.4, 0.0, 0.6, 1)', null, 0.1
    );
    oEffects.Animate(
        NewEle(Math.random(), "div", "position:absolute;left:576px;top:646px;z-index:310;", {
            className: 'jngButton voidButton oneLineVoidButton',
            innerText:"退出关卡",
            onclick() {
                fn();
                Exitlevel();
            },
        }, EDAll),
        {top: '520px'}, 0.2, 'cubic-bezier(0.4, 0.0, 0.6, 1)', null, 0.15
    );
    oSym.Stop();
},
sunManager = function(){  //通用阳光计数器
    let sn =  0;
    Object.defineProperty(oS, 'SunNum', {
        configurable: false,
        get() {
            return sn;
        },
	    set(x) {
            if (typeof(x) === 'number') {
                x = Math.Clamp(x,0,9900);
                if(x===sn){
                    return;
                }
                if($User.LowPerformanceMode||x<sn){
                    sn = x;
                    ESSunNum.innerText = sn;
                }else{
                    sn = x;
                    let tmpsn = x;
                    let tmpNum = Number(ESSunNum.innerText);
                    let curNum = -1;
                    (function upd(t=0){
                        if(tmpsn !==sn||curNum===sn||ESSunNum.style.visibility==="hidden"){
                            return;
                        }
                        ESSunNum.innerText = curNum = Math.round(Math.Lerp(tmpNum,tmpsn,Math.sin(t/7*90*Math.DegToRad)));
                        oSym.addTask(3,upd,[t+1]);
                    })();
                }
                $P.length && MonitorCard();  //如果是关卡进行时，则要刷新卡牌状态                
            }else if(x===null){
                sn=null;
            }
        }
    });
}(),
local_Settings = function(){  //用户性能与localStorage同步
    let val = $User.LowPerformanceMode;
    let val2 = $User.Async_GIFS_Animate;
    Object.defineProperty($User, 'LowPerformanceMode', {
        get: _=>val,
        set : newVal=>{
            if(typeof newVal == 'string'){
                val = (newVal=="true")||(newVal=="1");
            }else{
                val = newVal;
            }
            localStorage.JNG_PVZTR_LOW_PERFORMANCE_MODE = val;
            return val;
        },
    });
    Object.defineProperty($User, 'Async_GIFS_Animate', {
        get: _=>val2,
        set : newVal=>{
            if(typeof newVal == 'string'){
                val2 = (newVal=="true")||(newVal=="1");
            }else{
                val2 = newVal;
            }
            localStorage.JNG_PVZTR_ASYNC_GIFS_ANIMATE = val2;
            return val2;
        },
    });
    if(localStorage.JNG_PVZTR_LOW_PERFORMANCE_MODE){
        $User.LowPerformanceMode = localStorage.JNG_PVZTR_LOW_PERFORMANCE_MODE;
    }else{
        if(IsMobile){
            $User.LowPerformanceMode = true;
        }else{
            try{
                $User.LowPerformanceMode = (UserPerformance.CPU+UserPerformance.MEM<8);
            }catch(err){
                console.log("Unable To Get System Performance");
            }
        }
    }
    if(localStorage.JNG_PVZTR_ASYNC_GIFS_ANIMATE){
        $User.Async_GIFS_Animate = localStorage.JNG_PVZTR_ASYNC_GIFS_ANIMATE;
    }
}(),
/* 货币系统 Start */
oCoinContent = {
    Init() {
        let storageVal = Number.parseInt(localStorage.JNG_TR_Coins);
        this.__ele__ = $("dCoinContent"),
        this.update(isNaN(storageVal) ? 0 : storageVal);
        this.canHide = true;
        Object.defineProperty($User, 'Coins', {
            get: _ => this.__value__,
            set : newVal => {
                this.update(newVal);
                this.canHide && this.hideWithDelay();
            },
        });
    },
    update(newVal) {
        this.__value__ = localStorage.JNG_TR_Coins = newVal;
        this.__updateTicket__ = Math.random() + '';
        $("dnumberMoneyOfUser").innerText = newVal.toLocaleString();        
    },
    show() {
        const ele = this.__ele__;
        if(GetStyle(ele, 'opacity') !== '1') {
            ele.style.transition = "";
            oEffects.Animate(ele, {opacity: 1}, 0.2);
        }
        return this;
    },
    hide() {
        oEffects.Animate(this.__ele__, {opacity: 0}, 0.3, "linear");
        return this;
    },
    hideWithDelay() {
        let tempTicket = this.__updateTicket__;
        oSym.addTask(200, _ => this.__updateTicket__ === tempTicket && this.hide());
        return this;
    },
},
oCoin = NewO({
    /* 抛出硬币方法 */
    throwIt(pos = {x: 300, y: 300}) {
        oAudioManager.playAudio(["throw","throw2"].random());
        const ele = this.ele
        /* 控制抛出动画 */
        ele.style.left = pos.x + 'px';
        ele.style.top = pos.y + 'px';
        ThrowADom(this.ele, { downline: 35 + 5 * Math.random() });
        /* 设置消失定时器 */
        oSym.addTask(1000, _ => {
            if(this.canDisappear) {
                ele.style['pointer-events'] = 'none';
                oEffects.fadeOut(ele, 0.5, ClearChild);
            }
        });
        return this;
    },
    /* 收集硬币方法 */
    collect() {
        const ele = this.ele;
        ele.style['pointer-events'] = 'none';
        this.canDisappear = false;
        oCoinContent.show();
        oEffects.Animate(ele, {
            left: '580px',
            top: '-20px',
        }, 0.4, 'ease-out', _ => {
            $User.Coins += this.value;
            setTimeout(_ => oEffects.fadeOut(ele, 0.2, ClearChild) , 1);  //防止浏览器合并DOM操作
        });
        return this;
    },
}, function(type = 'silver', value) {
    this.canDisappear = true,
    this.id = 'Coin_' + Math.random();
    this.type = type;
    this.value = value || $SEql(type, {
        'silver': 10,
        'gold': 100,
        'diamond': 1000,
        'default': 10,
    });
    let ele = NewImg(this.id, null, null, FightingScene, {
        width: 72,
        height: 72,
        className: "coins_collect",
        onmouseover: this.collect.bind(this),
    });
    ele.src = oDynamicPic.require(`images/Props/Coins/${type}.webp`, ele);
    this.ele = ele;
}),
/* 货币系统 End */
/* 道具系统 Start */
oPropSym = {
    get staticInforms() {
        return {
            'cherry_bomb': {
                cname: '樱桃炸弹',
                img: "images/Props/PropsIcon/cherry_bomb.webp",
                shopImg: "images/Plants/CherryBomb/0.gif",
                object: oCherryBomb,
                price: 300,
                css:"bottom:100px",
                coolTime: 5,  //冷却时间，单位秒
                description:"提供一个额外的炸弹帮你消灭僵尸.",
            },
            'light': {
                cname: '日光灯',
                img: "images/Props/PropsIcon/light.webp",
                shopImg: "images/Props/Light/p.gif",
                object: oLight,
                price: 150,
                coolTime: 30,
                description:"为你一次性产生大量阳光.",
            },
            'LSP': {
                cname: '液态保护膜',
                img: "images/Props/PropsIcon/protect.webp",
                shopImg: "images/Props/LSP/LSP.gif",
                object: oLSP,
                css:"bottom:100px",
                price: 200,
                coolTime: 18,
                description:"为你提供一个保护3*3植物的保护膜.",
            },
        }
    },
    Init() {
        this.readData();
        return this;
    },
    readData(){
        let staticItems = this.staticInforms;
        this.data = JSON.parse(localStorage.JNG_TR_PurchasedProps??"{}");
        let deleteKeys = [];
        for(let i in this.data){
            if(isNaN(Number(this.data[i]))||Number(this.data[i])<1||!staticItems[i]){
                deleteKeys.push(i);
            }
        }
        for(let i of deleteKeys){
            delete this.data[i];
        }
        this.saveStorage();
    },
    addProp(name, num = 1) {  //购入道具
        this.readData();
        if(this.data[name] === void 0) {
            this.data[name] = num;
        } else {
            this.data[name] += num;
        }
        this.saveStorage();
        return this;
    },
    ChosePlant(evt, obj,useFunc,cancelFunc=()=>{}) {
        obj = {PName: obj};
        let usePlant = false;
        if(oS.Chose===-1){
            CancelShovel();
        }
        if((oS.Chose===1&&!oS.ChoseCardObj)){
            CancelPlant();
            return;
        }
        if(oS.ChoseCardObj) return;
        evt.stopPropagation();evt.preventDefault();
        ClearChild($("MovePlant"));
        oAudioManager.playAudio("seedlift");
        let card = oS.ChoseCardObj = obj;
        let evtX = evt.clientX - EDAlloffsetLeft;
        let evtY = evt.clientY;
        let pro = card.PName.prototype;
        oS.Chose = 1;
        let MovePlant = NewImg("MovePlant", pro.PicArr[pro.StaticGif],
            `left:${evtX}px;top:${evtY + 20 - pro.height}px;z-index:258;`,
            EDAll);
        SetStyle(MovePlant, oS.ChoseCardObj.PName.prototype.ImgStyle);
        EditImg(MovePlant.cloneNode(false), "MovePlantAlpha", "", { //克隆一份作为半透图
            visibility: "hidden",
            opacity: 0.4,
            zIndex: 30,
        }, FightingScene);
        EditCompositeStyle({
            ele: MovePlant,
            addFuncs: [["translateX", 115 - pro.width / 2 + "px"]],
            option: 2,
        });
        SetHidden($("dTitle"));
        GroundOnmousemove = function(event) {
            let plant = oS.ChoseCardObj.PName;
            let evtX = event.clientX - EDAlloffsetLeft;
            let evtY = event.clientY;
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
                    left: X + proto.GetDX(proto) + "px",
                    top: Y - proto.height + proto.GetDY(R, C, data) + "px",
                });
            } else {
                SetHidden(imgAlpha);
            }
        };
        let gp = GrowPlant,cp=CancelPlant,vt=ViewPlantTitle;//备份原函数
        GrowPlant = function(data, X, Y, R, C) {
            let card = oS.ChoseCardObj;
            let plant = card.PName;
            let proto = plant.prototype;
            let cardID = card.DID;
            if (proto.CanGrow(data, R, C)) {
                oAudioManager.playAudio(
                    oGd.$GdType[R][C] === 2 ? "plant_water" : `plant${Math.floor(1+Math.random()*2)}`
                );
                let p = new plant().Birth(X, Y, R, C, data);
                const effectElement = $("imgGrowSoil");
                effectElement.src = GrowSoilImg;
                SetStyle(effectElement, {
                    left: X - 30 + "px",
                    top: Y - 45 + "px",
                    zIndex: 3 * R + 1,
                    visibility: "visible",
                });
                oSym.addTask(100, SetHidden, [effectElement]);
                delete oS.ChoseCardObj;
                oS.Chose = 0;
                GroundOnmousemove = () => {};
                ClearChild($("MovePlant"), $("MovePlantAlpha"));
                usePlant=true;
                if(!IsMobile){
                    CancelPlant();
                    reduction()
                }
            }
            if(IsMobile){
                CancelPlant();
                reduction()
            }
        };
        CancelPlant = function() {
            oS.Chose = 0;
            delete oS.ChoseCardObj;
            ClearChild($("MovePlant"), $("MovePlantAlpha"));
            GroundOnmousemove = () => {};
            usePlant?useFunc():cancelFunc();
            reduction();
            MonitorCard();
        };
        ViewPlantTitle = function() {};
        function reduction(){
            [GrowPlant,CancelPlant,ViewPlantTitle]=[gp,cp,vt];
        }
    },
    useProp(name, canRecorded,event,callback=()=>{}) {
        oAudioManager.playAudio("throw");
        let obj,funcs,self=this;
        self.readData();
        if(obj=self.staticInforms[name].object){
            self.ChosePlant(event,obj,()=>{
                if(canRecorded) {
                    (--self.data[name]<=0)&&(()=>{delete self.data[name];})();
                    self.saveStorage();            
                }
                callback(true);
            },()=>{callback(false);});
        }
        return self;
    },
    saveStorage() {  //更新本地缓存
        localStorage.JNG_TR_PurchasedProps = JSON.stringify(this.data);
        return this;
    },
    isPropUnlocked(name) {
        let unlocks = JSON.parse(localStorage.JNG_TR_PropsUnlock??"{}");
        return !!unlocks[name];
    }
},
oPropSelectGUI = {
    Init() {
        if(oPropSym.data.length <=0 || oS?.FixedProps.length > 0) return this;
        this.propsDom = $('dSelectProp');
        this.wrapDom = this.propsDom.querySelector('#dWrap');
        this.listDom = this.propsDom.querySelector('#dList');
        this.PropsJSON = oPropSym.data;
        this.PropsList = new Set(Object.keys(this.PropsJSON));
        this.PropsSelectedList = new Set();
        this.render();
        return this;
    },
    show() {
        if(oPropSym.data.length <=0 || oS?.FixedProps.length > 0) return this;
        oEffects.Animate(this.propsDom, {top: '515px'}, 0.225, 'cubic-bezier(0.0, 0.0, 0.2, 1)');
        return this;
    },
    hide() {
        if(oPropSym.data.length <=0 || oS?.FixedProps.length > 0) return this;
        SetHidden(this.listDom);
        oEffects.Animate(this.propsDom, {top: '585px'}, 0.195, 'cubic-bezier(0.4, 0.0, 1, 1)');
        return this;
    },
    render() {
        const { propsDom, wrapDom, PropsJSON } = this;
        const DOM_BottomBar = getBorderCanvasDom("images/Props/Shop/buttonSlot.png",10, 10, 199, 21);
        EditEle(DOM_BottomBar, null, null, propsDom, { id: 'dBottomBar' });        
        /* 为每个道具绘制元素 Start */
        let index = 0;
        let propNames = Object.keys(PropsJSON);
        while(index <= 1) {
            let ename = propNames[index] ?? 'addIcon';
            this.renderIcon(index, ename);
            index++;
        }
        /* 为每个道具绘制元素 End */
        wrapDom.style.width = index*92+"px";
        this.renderList();
        return this;
    },
    renderIcon(index, ename) {
        let id = `IconWrap_${index}`;
        let innerHTML = `<img class="dLatterIcon" src="images/Props/Shop/button.png">`;
        let iconWrap = this.wrapDom.querySelector('#' + id);
        if(!iconWrap) {
           iconWrap = NewEle(id, 'div', `left:${index*92}px;`, {className: 'IconWrap'}, this.wrapDom);
        } else {
            this.PropsSelectedList.delete(iconWrap.dataset['jngEname']);
        }
        if(ename === 'addIcon') {
            innerHTML += `<img class="dFrontIcon" src='images/Props/Shop/addIcon.png' height="77" width="77">`
        } else {
            innerHTML += `<img class="dFrontIcon" src='${oPropSym.staticInforms[ename].img}' height="77" width="77"><span class="dNumText">×${this.PropsJSON[ename]}</span>`;
            this.PropsSelectedList.add(ename);
        }
        iconWrap.dataset['jngEname'] = ename;
        iconWrap.innerHTML = innerHTML;
        iconWrap.querySelector('.dFrontIcon').onclick = this.clickPropIcon.bind(this, index);
        return this;
    },
    renderList() {
        for(let ename in this.PropsJSON) {
            NewImg('PropSelect_ListIcon_' + ename, oPropSym.staticInforms[ename].img, null, this.listDom, {
                className: 'ListIcon',
                onclick: this.clickListItem.bind(this, ename),
            });
        }
        NewImg('PropSelect_ListIcon_addIcon', 'images/Props/Shop/addIcon_small.png', null, this.listDom, {
            className: 'ListIcon',
            onclick: this.clickListItem.bind(this, 'addIcon'),
        });
        this.updateList();
        return this;
    },
    updateList() {
        this.PropsList.forEach(ename => {
            let ele = $('PropSelect_ListIcon_' + ename);
            this.PropsSelectedList.has(ename) ? SetNone(ele) : SetBlock(ele);
        });
        return this;
    },
    clickPropIcon(index) {
        const dom = this.listDom;
        const lefts = [-38, 52];
        this.index = index;
        if(GetStyle(dom, 'visibility') === 'hidden') {
            SetStyle(dom, {
                visibility: 'visible',
                left: lefts[index] + 'px',
            });
            this.wrapDom.querySelector(`#IconWrap_${index}`).dataset['jngEname'] === 'addIcon' ?
                SetNone($('PropSelect_ListIcon_addIcon')) : SetBlock($('PropSelect_ListIcon_addIcon'));
        } else {
            SetHidden(dom);
        }
        return this;
    },
    clickListItem(ename) {
        SetHidden(this.listDom);
        this.renderIcon(this.index, ename);
        this.updateList();
        return this;
    },
},
oPropUseGUI = {
    Init() {
        let list = oPropSelectGUI.PropsSelectedList;
        this.PropsJSON = {};
        //关卡文件中可以通过传入FixedProps='disabled'，以禁用道具
        //经与Leobai商讨后，主线关卡小游戏一律禁用道具
        if(oS?.FixedProps.length > 0 && oS?.FixedProps !== 'disabled') {
            this.PropsJSON = oS.FixedProps;
        } else if(list?.size > 0 && oS?.FixedProps !== 'disabled') {
            for(let ename of list) {
                this.PropsJSON[ename] = {num: oPropSym.data[ename], canRecorded: true};
            }
        } else if(oPropSym?.data.length > 0 && !list && oS?.FixedProps !== 'disabled') {
            let keys = Object.keys(oPropSym.data).splice(0,2);  //经与Leobai商讨后，每关最多两个道具
            for(let key of keys){
                this.PropsJSON[key] = {num: oPropSym.data[key], canRecorded: true};
            }
        } else {
            return;
        }
        this.PropKindNum = this.PropsJSON.length;
        this.propsDom = $('dPropsContent');
        this.wrapDom = this.propsDom.querySelector('#dWrap');
        this.upDom = $('dUP');
        this.render();
        SetBlock(this.propsDom);        
        oEffects.Animate(this.propsDom, {top: '600px'}, 0.225, 'cubic-bezier(0.0, 0.0, 0.2, 1)');
    },
    updateNums(){
        if(oS?.FixedProps.length > 0 && oS?.FixedProps !== 'disabled'){//如果是固定道具就不用读取存档
            return;
        }
        oPropSym.readData();
        let keys = Object.keys(this.PropsJSON).splice(0,2);  //经与Leobai商讨后，每关最多两个道具
        for(let key of keys){
            this.PropsJSON[key].num=oPropSym.data[key];
        }
    },
    /*  PropsJSON传入样例
        {
            'cherry_bomb': {
                num: 3,  //当前关卡提供数量，若传Infinity则为无次数限制
                canRecorded: true,  //是否使用玩家存档中购买的道具                
            },
            'light': {
                num: Infinity,
                canRecorded: false,                
            },
        }
    */
    render() {
        const { propsDom, wrapDom, PropKindNum, PropsJSON } = this;
        /* 绘制道具槽底部图标 */
        const DOM_BottomBar = getBorderCanvasDom("images/Props/Shop/buttonSlot.png",10, 10, PropKindNum*92 + 15, 21);
        EditEle(DOM_BottomBar, null, null, propsDom, {
            id: 'dBottomBar',
            onclick: this.show.bind(this),            
        });
        /* 绑定容器鼠标检测事件 */
        let isMouseOn = false;
        wrapDom.onmouseenter = () => (isMouseOn = true);
        wrapDom.onmouseleave = () => {
            oSym.addTask(500, () => !isMouseOn && this.hide());
            isMouseOn = false;
        };
        /* 为每个道具绘制元素 Start */
        let index = 0;
        let innerHTML = '';
        let self = this;
        for(let ename in PropsJSON) {
            let obj = PropsJSON[ename];
            let id = `IconWrap_${ename}`;
            let iconWrap = NewEle(id, 'div', `left:${index*92}px;`, {className: 'IconWrap'}, wrapDom);
            iconWrap.innerHTML = `<img class="dLatterIcon" src="images/Props/Shop/button.png"><canvas class="dCoolIcon" height="77" width="77"></canvas><img class="dFrontIcon" src='${oPropSym.staticInforms[ename].img}'><span class="dNumText">×${obj.num === Infinity ? '∞' : obj.num}</span>`;
            //前置图标（按钮）
            (obj.DOM_FrontIcon = iconWrap.querySelector('.dFrontIcon')).onclick = function(event){
                self.getPropCard.bind(self)(ename,event);
            };
            //冷却图标
            obj.DOM_CoolIcon = iconWrap.querySelector('.dCoolIcon');
            //剩余次数
            obj.DOM_NumText = iconWrap.querySelector('.dNumText');
            //更新序号
            index++;
        }
        /* 为每个道具绘制元素 End */
        wrapDom.style.width = index*92+"px";
        this.upDom.style.left = (index*92/2)+68-9+"px";
    },
    drawCoolTimeCircle(ctx, circle){
        ctx.clearRect(0,0,77,77);
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = circle.color;
        ctx.globalAlpha=0.7;
        ctx.lineWidth=circle.r;
        ctx.translate(circle.x,circle.y);
        ctx.scale(-1,1);
        ctx.translate(-circle.x,-circle.y);
        ctx.arc(circle.x, circle.y, circle.r/2, Math.PI*3/2, Math.PI*3/2+Math.PI*2*circle.percent,false);   
        ctx.stroke();
        ctx.restore();
    },
    beginCool(ename) {
        let coolTime = oPropSym.staticInforms[ename].coolTime * 100;
        let time = coolTime;
        let draw = this.drawCoolTimeCircle;
        let coolDomShow = this.PropsJSON[ename].DOM_CoolIcon;
        let ctx = coolDomShow.getContext("2d");
        SetStyle(coolDomShow, {
            display: 'block',
            opacity: 1,
        });
        (function loop() {
            time = Math.max(time-10, 0);
            if(time > 0){
                draw(ctx, {
                    x:38.5, y:38.5, r:33.5,
                    percent: time/coolTime,
                    color: "black",
                });
                oSym.addTask(10, loop);
            } else {
                draw(ctx,{
                    x:38.5, y:38.5, r:33.5,
                    percent: 1, 
                    color: "white",
                });
                oEffects.Animate(coolDomShow, { opacity:0 }, 0.5, 'linear', SetNone);
            }
        })();
    },
    getPropCard(ename,event) {
        this.updateNums();
        const obj = this.PropsJSON[ename];
        const coolDomShow = this.PropsJSON[ename].DOM_CoolIcon;
        const ctx = coolDomShow.getContext("2d");
        let oldCssText = coolDomShow.style.cssText;
        SetStyle(coolDomShow, { display: 'block', opacity: 1 });
        this.drawCoolTimeCircle(ctx, { x:38.5, y:38.5, r:33.5, percent: 1, color: "black" });
        oPropSym.useProp(ename, obj.canRecorded,event,(used)=>{
            if(used){
                obj.DOM_NumText.innerText = '×' + (obj.num === Infinity ? '∞' : --obj.num);
                if(obj.num > 0) {
                    this.beginCool(ename);
                }
            }else{
                coolDomShow.style.cssText = oldCssText;
            }
        });
    },
    show() {
        const upDom = this.upDom;
        if(GetStyle(upDom, 'opacity') !== "1") {
            return;
        }
        oEffects.Animate(upDom, { opacity:0.03 }, 0.2);
        oEffects.Animate(this.wrapDom, { 'top': "-70px", 'height': "70px", 'pointer-events':  'auto'}, 0.3, "ease-in-out", _=> {
            upDom.style.opacity = 0;
        });
    },
    hide() {
        const upDom = this.upDom;
        if(GetStyle(upDom, 'opacity') !== "0"){
            return;
        }
        oEffects.Animate(this.wrapDom, { top: 0, height: 0, 'pointer-events':  'none' }, 0.3, "ease-in-out", _=> {
            oEffects.Animate(upDom, {opacity:0.97}, 0.2, "linear", _=> {
                upDom.style.opacity = 1;
            });
        });
    },
},
/* 道具系统 End */
PlaySubtitle = (str, delay) => {
    let ele = $("ZimuRQ");
    if(str) {
        SetBlock(ele);
        $("Zimu").innerText = str;
    } else {
        SetNone(ele);
    };
    delay && oSym.addTask(delay, SetNone, [ele]);
},
ClickSpeed = function() {
    PauseGame();
    oAudioManager.playAudio("pause");
    ShowSpeed();
},
ShowSpeed = function() {
    jngTemplate.require('dSpeedContainer');
    oS.Lvl == 'Forest1' && (PlaySubtitle(), ClearChild($('PointerUD2')));
    SetNone($("Menu"));
    SetBlock($("dSpeedContainer"), $("shade"));
},
ShowCue = function(x, y, m, s) {
    var c = $("dCue");
    oAudioManager.playAudio("click3");
    SetBlock(c);
    //每次调用的时候需要传坐标参数，线索名称，线索说明
    c.style.left = (x + 'px');  
    c.style.top = (y + 'px');
    $("dCueName").innerHTML = m;
    $("dCueTooltip").innerHTML = s;
},
HiddenSpeed = function() {
    oAudioManager.playAudio("Close");
    SetNone($("dSpeedContainer"), $("shade"));
    oS.Lvl && ResetGame();
    oAudioManager.allResPauseCanceled()
},
CSpeed = function(newSpeed,audio=true) {
    if(audio){
        oAudioManager.playAudio("bottom");
    }
    jngTemplate.require('dSpeedContainer');
    if(newSpeed instanceof Array){
        $User.NowStep = oSym.NowStep = newSpeed[0];
        $User.TimeStep = oSym.TimeStep = newSpeed[1];
        $User.NowSpeed = oSym.NowSpeed = newSpeed[0]/newSpeed[1]*10;
        return;
    }
    //需要保证oSym.NowStep/oSym.TimeStep*10==newSpeed
    if(!$User.LowPerformanceMode){
        if(newSpeed>2){
            $User.NowStep = oSym.NowStep = 1.7;
            $User.TimeStep = oSym.TimeStep = 17/newSpeed;
        }else{
            $User.NowStep = oSym.NowStep = 1;
            $User.TimeStep = oSym.TimeStep = 10/newSpeed;
        }
    }else{
        if(newSpeed>2){
            $User.NowStep = oSym.NowStep = 2.2;
            $User.TimeStep = oSym.TimeStep = 22/newSpeed;
        }else if(newSpeed>1){
            $User.NowStep = oSym.NowStep = 1.7;
            $User.TimeStep = oSym.TimeStep = 17/newSpeed;
        }else{
            $User.NowStep = oSym.NowStep = 1;
            $User.TimeStep = oSym.TimeStep = 10/newSpeed;
        }
    }
    $User.NowSpeed = oSym.NowSpeed = newSpeed;
    SpeedMenuServices._set_ball_position();
},
ClickRules = function(a) {
    jngTemplate.require('rules');
    oAudioManager.playAudio("pause");
    SetBlock($("rules"), $("shade"));
    var d = $("rules");
    switch(a){
        case 'sy':
            d.style['background-position'] = "0 0";
            break;
        case 'jf':
            d.style['background-position'] = "-427px 0";
            break;
    }
},
CloseNewPlant = () => {
    oAudioManager.pauseMusic();
    SetHidden($("dNewPlant"));
    Exitlevel(oS.Lvl);
    oAudioManager.playAudio("Close");
},
CloseProp = () => {
    oAudioManager.pauseMusic();
    SetHidden($("dNewProp"));
    Exitlevel(oS.Lvl);
    oAudioManager.playAudio("Close");
},
Exitlevel = function(lvl = oS.Lvl, deep) {
    let num = Number(lvl.replace(/-\w+$/).replace(/[^0-9]/ig, ''));
    let output = Math.ceil(num/5);
    let isAdventure = true;
    let path = null;
    switch(true) {
        case (/Tutorial/).test(lvl):  //新手教学
            output = 'Forest_SelectionMap_1';
            break;
        case (/Forest/).test(lvl):  //森林
            output = 'Forest_SelectionMap_' + output;
            break;
        case (/Marsh/).test(lvl):  //沼泽
            output = 'Marsh_SelectionMap_' + output;
            break;
        case (/Polar/).test(lvl):  //极地
            output = 'Polar_SelectionMap_' + output;
            break;
        case (/Industry/).test(lvl):  //雾都
            output = 'Industry_SelectionMap_' + output;
            break;
        case (/Mirage/).test(lvl):  //镜水
            output = 'Mirage_SelectionMap_' + output;
            break;
        case (/Season_Sp\d/).test(lvl):  //春季副本
            output = 'Fuben_Spring_SelectionMap';
            path = 'SelectionMap';
            isAdventure = false;
            break;
        case (/Season_S\d/).test(lvl):  //夏季副本
            output = 'Fuben_Summer_SelectionMap';
            path = 'SelectionMap';
            isAdventure = false;
            break;
        case (/Season_A/).test(lvl):  //秋季副本
            output = 'Fuben_Autumn_SelectionMap';
            path = 'SelectionMap';
            isAdventure = false;
            break;
        case (/Season_W/).test(lvl):  //冬季副本
            output = 'Fuben_Winter_SelectionMap';
            path = 'SelectionMap';
            isAdventure = false;
            break;
        case (/Lab/).test(lvl):  //实验室
            output = 'lab';
            path = 'Service';
            isAdventure = false;
            break;
        case (/Act|test/).test(lvl):  //春节和每日挑战
            output = 'index';
            path = 'Service';
            isAdventure = false;
            break;
        case (/Everyday/).test(lvl):
            output = 'Room';
            path = 'AS_Room';
            isAdventure = false;
            break;
        case (/FanmadeWorld_Challenge/).test(lvl):
            output = 'Fuben_PlayerChallenge_SelectionMap';
            path = 'SelectionMap';
            isAdventure = false;
            break;
        case (/Fanmade|LevelLoader/).test(lvl):
            output = 'Room';
            path = 'AS_Room';
            isAdventure = false;
            break;
        default:
            console.error(`[PVZTR] Exitlevel数据异常：${lvl}`);
            return;
    }
    //开关为真则返回字符串，否则直接跳转
    if(deep) {
        return isAdventure ? output : `${path}/${output}.js`;
    }
    isAdventure ? oSelectionMap.refreshModal(output) : SelectModal(output, path);
},
NextLevel = function(lvl = oS.Lvl) {
    let num = Number(lvl.replace(/-\w+$/).replace(/[^0-9]/ig, ''));
    let Pages = oSelectionMap._WorldsList_;
    let LevelNum = oSelectionMap._MapLevelNum_;
    for (let i = Pages.length - 1; i >= 0; --i) {
        if (lvl.substring(0, Pages[i].length) === Pages[i]) {
            return num < LevelNum[Pages[i]][LevelNum[Pages[i]].length - 1] ? `${Pages[i]}${num+1}` : `${Pages[i+1]}1`;
        }
    }
},
GetWin = function(img, lvl, callback) {
    oAudioManager.pauseMusic();
    oAudioManager.playAudio("winmusic");
    oSym.Clear();
    SetStyle(img, {cursor: "default"}).onclick = null;
    oEffects.fadeIn($("DivA"), 6, _=>{
        /(Forest|Marsh|Polar|Industry)_SelectionMap_\d/.test(lvl) ? (oSelectionMap._CurrentPage_ = lvl, SelectModal('selectionmap', 'Service')) : SelectModal(lvl);
        callback && callback();
    }, [0, 100]);
},
//抛出物品
ThrowADom = (ele, config = {}) => {
    /* 处理数值并矫正超越边界的元素坐标 */
    let x = Number.parseFloat(ele.style.left);
    let y = Number.parseFloat(ele.style.top);
    let {
        width = ele.offsetWidth,
        height = ele.offsetHeight,
        downline = 50 + 5 * Math.random(),
        border = { minx:265, maxx:900, miny:0, maxy:600 },
        ease = 'cubic-bezier(.28,-2,0.95,1)',
        goingToCenter = false,
    } = config;
    border.maxx -= width;
    border.maxy -= height;
    let fixedX = Math.min( Math.max(border.minx + 50, x), border.maxx - 50 );
    let fixedY = Math.min( Math.max(border.miny + 50, y), border.maxy - 50 );
    x !== fixedX && (ele.style.left = fixedX + 'px');
    y !== fixedY && (ele.style.top = fixedY + 'px');
    /* 处理dom */
    let parentNode = ele.parentNode;
    let transform = ele.style.transform;
    let wrapEle = NewEle('ThrowADom_Wrap_' + Math.random(), 'div', ele.style.cssText, {
        className: 'ThrowADom_Wrap',
    }, parentNode);
    ele.style.left = 0;
    ele.style.top = 0;
    ele.style['pointer-events'] = 'none';
    wrapEle.append(ele);    //将元素移动到包装元素中
    /* 创建动画 */
    let targetX = fixedX + 70 * (Math.random() - 0.5);
    let targetY = Math.min( fixedY + downline, border.maxy );
    let relativeY = fixedY;
    let relativeDownline = targetY - Number.parseFloat(wrapEle.style.top);
    let duration = 0.05 * Math.random() + 0.55;
    if(goingToCenter){
        let targetPos = Vector2.MoveTowards(new Vector2(fixedX,fixedY),new Vector2((border.minx+border.maxx)/2,(border.miny+border.maxy/2)),130);
        targetX += targetPos.x-fixedX;
        relativeY += targetPos.y-fixedY;
        duration*=1.2;
    }
    oEffects.Animate(wrapEle, {
        transform: 'scale(1)',
    }, 0.1);
    oEffects.Animate(wrapEle, {
        left: targetX + 'px',
        top: relativeY +'px',
    }, duration);
    oEffects.Animate(ele, {top: relativeDownline + 'px'}, duration, ease, () => {
        parentNode.replaceChild(ele, wrapEle);    //将元素移动回原父元素中
        SetStyle(ele, {
            'top': targetY+relativeY-fixedY + 'px',
            'left': targetX + 'px',
            'width': width + 'px',
            'height': height + 'px',
            'pointer-events': 'auto',
        });
    });
},
//关卡结束弹出战利品
ShowWinItem = ele => {
    let width = ele.offsetWidth;
    let height = ele.offsetHeight;
    let scale = EditCompositeStyle({ele, targetFunc: 'scale'});
    if(scale !== '' && scale !=='1' && ele.tagName === 'IMG') {  //处理经过缩放的元素
        ele.onload = _ => {
            width = ele.offsetWidth;
            height = ele.offsetHeight;
            let realWidth = width*scale;
            let realHeight = height*scale;
            let left = oP.LastDeathPosition.x - realWidth/2;
            let top = oP.LastDeathPosition.y - realHeight/2;
            let canvas = NewEle('WinItem_' + Math.random(), 'canvas', `left:${left}px;top:${top}px;`, {
                width: realWidth,
                height: realHeight,
                className: 'WinItem',
            });
            canvas.getContext('2d').drawImage(ele, 0, 0, width, height, 0, 0, realWidth, realHeight);
            canvas.onclick = ele.onclick.bind(canvas);
            ele.parentNode.replaceChild(canvas, ele);
            ThrowADom(canvas, {
                width: realWidth,
                height: realHeight,
                goingToCenter:true
            });
        };
    } else {  //处理正常的元素
        let top = oP.LastDeathPosition.y - height/2;
        let left = oP.LastDeathPosition.x - width/2;
        SetStyle(ele, {
            top: top + "px",
            left: left + "px",
        }).classList.add('WinItem');
        ThrowADom(ele, {width, height,goingToCenter:true} );        
    }
},
//胜利的时候获取植物的图片dom
GetPlantCardDom = (plant, wrap = EDAll, cssText = '', properties) => {
    properties = properties || {
        onclick: function() {
            GetNewCard(this, plant, NextLevel());
        }
    };
    let src = plant;
    if (typeof plant !== "string") {
        src = plant.prototype.PicArr[plant.prototype.CardGif];
    }
    /* 外层div */
    let bigdom = NewEle('newPlantCard_wrap_' + Math.random() , "div", cssText, properties, wrap);
    bigdom.classList.add('NewPlantCard_Wrap');
    /* 植物图片 */
    NewImg('newPlantCard_img_' + Math.random() , src, null, bigdom, {
        className: 'NewPlantCard_Img',
    });
    /* 消耗阳光 */
    NewEle("newPlantCard_cardSunNum_" + Math.random(), "div", "", {
        className: "cardSunNum2",
        innerText: plant.prototype.SunNum
    }, bigdom);
    return bigdom;
},
GetNewCard = function(a, b, c) {
    oAudioManager.playAudio("winmusic");
    oSym.Clear();
    oEffects.Animate(a, {
        left: "525px",
        top: "131px",
        transform: 'scale(2)',
        cursor: 'default',   
    }, 5, 'ease-out').onclick = null;
    oEffects.fadeIn($("DivA"), 6, function() {
            jngTemplate.require('dNewPlant');
            oAudioManager.playMusic("plantsgarden");
            ClearChild(a);
            SetHidden(EDAll, $("dTop"));
            var f = b.prototype;
            if(!localStorage.JNG_TR_GotPlants){
                localStorage.JNG_TR_GotPlants="[]";
            }
            let tmp = JSON.parse(localStorage.JNG_TR_GotPlants);
            tmp.push(f.EName);
            localStorage.JNG_TR_GotPlants = JSON.stringify(tmp.unique());
            $("iNewPlantCard").src = f.PicArr[f.StaticGif];
            $("dNewPlantName").innerText = f.CName;
            $("dNewPlantTooltip").innerHTML = f.Tooltip;
            $("dNewPlantSunNum").innerHTML = f.SunNum;
            $("dNewPlantcoolTime").innerHTML = f.coolTime;
            $("dNewPlantStory").innerHTML = f.Story;
            $("btnNextLevel").onclick = function() {
                oAudioManager.pauseMusic();
                SelectModal(c);
                oAudioManager.playAudio("pause");
            };
            SetVisible($("dNewPlant"));
    });
},
GetNewProp = function(a, p, t, s, lvl, o, k) {
    oAudioManager.playAudio("winmusic");
    oSym.Clear();
    (SetStyle(a, {cursor: "default"})).onclick = null;
    oEffects.fadeIn($("DivA"), 6, function() {
            jngTemplate.require('dNewProp');
            oAudioManager.playMusic("plantsgarden");
            SetHidden(EDAll, $("dTop"));
            let NewProp = $("iNewProp");
            //重置上一次的内联样式
            NewProp.style.cssText = '';
            //通过正则判断是否是自定义路径（图像格式）
            NewProp.style.backgroundImage = (/\.\w+/.test(p) ? "url(" + p + ")" : "url(images/interface/" + p + ".png)");
            if(o && k) {
                NewProp.style.top = o;  //top设定o
                NewProp.style.left = k;  //left设定e                
            } else {
                NewProp.style.cssText += o;
            }
            $("dNewPropName").innerHTML = t;  //道具名t
            $("dNewPropTooltip").innerHTML = s;  //道具介绍s
            $("NextLevel").onclick = function() {
                oAudioManager.pauseMusic();
                SetHidden($("dNewProp"));
                /(Forest|Marsh|Polar|Industry|Mirage)_SelectionMap_\d/.test(lvl) ? (oSelectionMap._CurrentPage_ = lvl, SelectModal('selectionmap', 'Service')) : SelectModal(lvl);
                oAudioManager.playAudio("pause");
            };
            SetVisible($("dNewProp"));
    }, [0, 100]);
},
PlaceZombie = function(constructor, R, C, animation=true,sync=false) {//修改标记
    if(oS.isStartGame===2) {
        return;
    }
    const zombie  = new constructor();
    if(!Object.hasOwn(zombie.__proto__, 'ArHTML')) {
        zombie.Init(GetX(C), constructor.prototype, oGd.$ZF, oS.R + 1);
    }
    // 场外生成的僵尸动画会被强制关闭
    animation = C <= oS.C ? animation : false;
    if(animation) {
        oAudioManager.playAudio('dirt_rise');
        oEffects.ImgSpriter({
            ele: NewEle(`Dirt_${Math.random()}`, "div", `position:absolute;background:url(images/Zombies/dirt.png) no-repeat;z-index:${3*R + 2};left:${755 - (9 - C)*80}px;top:${100*(R-1) + 40}px;height:162px;width:126px;`, 0, EDPZ),
            styleProperty: 'X',
            changeValue: -126,
            frameNum: 22,
            callback: ele => oEffects.fadeOut(ele, 'slow', ClearChild),
        });
    }
    oP.AppearUP([zombie.CustomBirth(R, C, 0, 0)], [zombie], animation, sync);  //召唤僵尸
    return zombie;
},
hasPlants = function(basic = true, filterFn) {  //场上植物高级查询
    let arr = [];
    for(let plant of $P) {
        let basicResult  = basic ? (plant.EName !== 'oBrains' && plant.EName !== 'oLawnCleaner' && plant.EName !== 'oApple' && plant.isPlant) : true,  //基础查询
             filterResult = filterFn ? filterFn(plant) : true;  //开发自定义的过滤函数
         basicResult && filterResult && arr.push(plant); 
    }
    return arr;
},
//GetButtonDom
//江南自定义小游戏
oMiniGames = {
    /* 调用示例
    oMiniGames.ProtectPlants({
        'oApple': 1,
        'oSunFlower': 3,
    })
    */
    ProtectPlants(sheet,sheetPos=[],callStartGame=true) { //保卫植物关卡
        let recordIds = new Set();
        //事先扫描植物的id并记录
        for (let plant of $P) {
            sheet.hasOwnProperty(plant.EName) && recordIds.add(plant.id);
        }
        //自定义坐标表的采入
        for (let i in sheetPos){
            for(let pkind = 0, G = oGd.$; pkind <= PKindUpperLimit; pkind++) {
                let p;
                if(p=G[sheetPos[i][0]+"_"+sheetPos[i][1]+"_"+pkind]){
                    let tmp = p.Die;
                    p.Die = function(...sth){
                        tmp.bind(p)(...sth);
                        toOver(2);
                    };
                }
            }
        }
    
        function fun() {
            let tempSet = new Set(recordIds);
            for (let o of $P) {
                tempSet.has(o.id) && tempSet.delete(o.id);
            }
            if (tempSet.size > 0) {
                return toOver(2);
            }
            oSym.addTask(200, fun);
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
    numLimit: 某个植物最多限制多少张
    */
    ConveyorBelt(arrP = oS.PName, createTime = 600, moveTime = 3, priorityP = [], maxCard=10, numLimit = {}) {
        /* 一些初始化 */
        let bgDom = NewImg("imgKK", "images/interface/ConveyorBelt.webp", "left:-107px;top:0px;z-index:0; ", $(
            'dCardList'));
        oEffects.Animate(bgDom,{
            left:"0"
        },0.2/oSym.NowSpeed,"ease-out");
        oAudioManager.playMusic(oS.StartGameMusic);
        SetVisible($("tdShovel"), $("dFlagMeter"), $("dTop"));
        SetHidden($("dSunNum"));
        oS.InitLawnMover();
        oS.ControlFlagmeter && oFlagContent.init({ fullValue: oP.FlagNum-1, curValue: 0 });  //显示进度条
        /* 重写全局函数 */
        let objFun = {
            GetChoseCard(b) {
                if (oS.Chose) {
                    return;
                }
                var a = ArCard.length;
                while (a--) {
                    ArCard[a].DID == b && (oS.ChoseCard = a, a = 0)
                }
                return oS.ChoseCard
            },
            ChosePlant(evt, index = null) {
                if(oS.Chose===-1){
                    CancelShovel();
                }
                if(oS.Chose===1 || $("MovePlant")){
                    CancelPlant();
                    return;
                }
                if(index !== null) {
                    index === -1 && (index = 9);    //按0键可以选取第10个植物
                    if(index + 1 > ArCard.length || index < 0) {
                        return;
                    }
                    oS.ChoseCard = index;
                }
                oS.Chose = 1;
                $("MovePlant") && ClearChild($("MovePlant"));
                oAudioManager.playAudio("seedlift");
                let AC = ArCard[oS.ChoseCard],
                    evtX = evt.clientX - EDAlloffsetLeft,
                    evtY = evt.clientY,
                    pro = AC.PName.prototype;
                let MovePlant = NewImg("MovePlant", pro.PicArr[pro.StaticGif],
                    `left:${evtX}px;top:${evtY + 20 - pro.height}px;z-index:258;`,
                    EDAll);
                SetStyle(MovePlant, pro.ImgStyle);
                EditImg(MovePlant.cloneNode(false), "MovePlantAlpha", "", { //克隆一份作为半透图
                    visibility: "hidden",
                    opacity: 0.4,
                    zIndex: 30,
                }, FightingScene);
                EditCompositeStyle({
                    ele: MovePlant,
                    addFuncs: [["translateX", 115 - pro.width / 2 + "px"]],
                    option: 2,
                });
                SetAlpha($(AC.DID), 0.5); //标记卡牌被选择
                SetHidden($("dTitle"));
                GroundOnmousemove = GroundOnmousemove1;
            },
            CancelPlant() {
                ClearChild($("MovePlant"), $("MovePlantAlpha"));
                oS.Chose = 0;
                ArCard[oS.ChoseCard] && SetAlpha($(ArCard[oS.ChoseCard].DID), 100, 1);
                oS.ChoseCard = "";
                GroundOnmousemove = function () {}
            },
            GrowPlant(data, X, Y, R, C) {
                let index = oS.ChoseCard;
                let card = ArCard[index];
                let plant = card.PName;
                let proto = plant.prototype;
                let cardID = card.DID;
                if (proto.CanGrow(data, R, C)) {
                    oAudioManager.playAudio(
                        oGd.$GdType[R][C] === 2 ? "plant_water" : `plant${Math.floor(1+Math.random()*2)}`
                    );
                    new plant().Birth(X, Y, R, C, data);
                    const effectElement = $("imgGrowSoil");
                    effectElement.src = GrowSoilImg;
                    SetStyle(effectElement, {
                        left: X - 30 + "px",
                        top: Y - 45 + "px",
                        zIndex: 3 * R + 1,
                        visibility: "visible",
                    });
                    oSym.addTask(100, SetHidden, [effectElement]);
                    ArCard.splice(index, 1);
                    oS.ChoseCard = "";
                    oS.Chose = 0;
                    GroundOnmousemove = () => {}
                    ClearChild($("MovePlant"), $("MovePlantAlpha"), $(cardID));
                    if(!IsMobile){
                        CancelPlant();
                    }
                }
                if(IsMobile){
                    CancelPlant();
                }
            },
            ViewPlantTitle() {},
        };
        RewriteGlobalVariables(objFun);
        /* 传送带逻辑 */
        PrepareGrowPlants(() => {
            //处理优先植物队列
            let index = 0;
            const _priorityP = priorityP.map(o => o === 'random' ? arrP.random() : o);
            //生成植物卡牌
            (function createNewCard() {
                const len = ArCard.length;
                if (len < maxCard) { 
                    //一次性最多可以生成十张卡牌
                    //首先检查优先植物数组中有没有对应项，如果没有就用random随机生成
                    let availableJson = (()=>{
                        let tmp = {};
                        arrP.forEach((i)=>{
                            tmp[i.prototype.EName]=i;
                        });
                        return tmp;
                    })();
                    let json = {};
                    for(let i of $P){
                        if(!numLimit[i.EName]){continue;}
                        json[i.EName]=(json[i.EName]??0)+1;
                        if(json[i.EName]>=numLimit[i.EName]){
                            delete availableJson[i.EName];
                        }
                    }
                    for(let k=0;k<len;k++){
                        let i = ArCard[k].PName.prototype;
                        if(!numLimit[i.EName]){continue;}
                        json[i.EName]=(json[i.EName]??0)+1;
                        if(numLimit[i.EName]&&json[i.EName]>=numLimit[i.EName]){
                            delete availableJson[i.EName];
                        }
                    }
                    let obj = _priorityP[index] ? _priorityP[index] : availableJson[Object.keys(availableJson).random()];
                    if(obj){
                        let proto = obj.prototype;
                        let id = "dCard" + Math.random();
                        ArCard[len] = {
                            DID: id,
                            PName: obj,
                            PixelTop: 600, 
                        };
                        NewImg(id, proto.PicArr[proto.CardGif],
                            "top:600px;width:100px;height:120px;cursor:pointer;clip:rect(auto,auto,60px,auto)",
                            $("dCardList"), {
                            onmousedown: event => {
                                GetChoseCard(id);
                                ChosePlant(event);
                                event.stopPropagation();
                                event.preventDefault();
                            }
                        });
                    }
                    index++;
                }
                oSym.addTask(createTime, createNewCard);
            })();
            (function moveCard() {
                let len = ArCard.length;
                while (len--) {
                    let card = ArCard[len];
                    // 卡牌没有到达顶端
                    // 卡牌没有超过最顶端
                    if (card.PixelTop > 60 * len+5 && card.PixelTop >= 5) {
                        $(card.DID).style.top = 
                                (card.PixelTop = Math.max(7, 60 * len + 7, card.PixelTop - 1)) + "px";
                    }
                }
                oSym.addTask(moveTime, moveCard);
            })();
            oP.Monitor();
            oP.AddZombiesFlag();
            oS.ControlFlagmeter && oFlagContent.show();
        });
    },
    RainWithSeeds(arrP = oS.PName, createTime = 600, moveTime = 5, priorityP = [],countdownTime = 700, autoRainEffect = true,maxCard = 9) {
        /* 一些初始化 */
        oAudioManager.pauseMusic();
        oAudioManager.playMusic(oS.StartGameMusic);
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
                        left: X + proto.GetDX(proto) + "px",
                        top: Y - proto.height + proto.GetDY(R, C, data) + "px",
                    });
                } else {
                    SetHidden(imgAlpha);
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
                evt.stopPropagation();evt.preventDefault();
                ClearChild($("MovePlant"));
                oAudioManager.playAudio("seedlift");
                let card = oS.ChoseCardObj = obj;
                let evtX = evt.clientX - EDAlloffsetLeft;
                let evtY = evt.clientY;
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
                    zIndex: 30,
                }, FightingScene);
                EditCompositeStyle({
                    ele: MovePlant,
                    addFuncs: [["translateX", 115 - pro.width / 2 + "px"]],
                    option: 2,
                });
                SetAlpha(card.Ele, 0.5); //标记卡牌被选择
                card.Appeared=true;
                SetHidden($("dTitle"));
                GroundOnmousemove = GroundOnmousemove1;
            },
            GrowPlant(data, X, Y, R, C) {
                let card = oS.ChoseCardObj;
                let plant = card.PName;
                let proto = plant.prototype;
                let cardID = card.DID;
                if (proto.CanGrow(data, R, C)) {
                    oAudioManager.playAudio(
                        oGd.$GdType[R][C] === 2 ? "plant_water" : `plant${Math.floor(1+Math.random()*2)}`
                    );
                    new plant().Birth(X, Y, R, C, data);
                    const effectElement = $("imgGrowSoil");
                    effectElement.src = GrowSoilImg;
                    SetStyle(effectElement, {
                        left: X - 30 + "px",
                        top: Y - 45 + "px",
                        zIndex: 3 * R + 1,
                        visibility: "visible",
                    });
                    oSym.addTask(100, SetHidden, [effectElement]);
                    ArCard.splice(getChoseCardIndex(), 1);
                    delete oS.ChoseCardObj;
                    oS.Chose = 0;
                    GroundOnmousemove = () => {};
                    ClearChild($("MovePlant"), $("MovePlantAlpha"), card.Ele);
                    if(!IsMobile){
                        CancelPlant();
                    }
                }
                if(IsMobile){
                    CancelPlant();
                }
            },
            CancelPlant() {
                let card = oS.ChoseCardObj;
                oS.Chose = 0;
                delete oS.ChoseCardObj;
                ClearChild($("MovePlant"), $("MovePlantAlpha"));
                card && SetAlpha(card.Ele, 100, 1);
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
            const _priorityP = priorityP.map(o => o === 'random' ? arrP.random() : o);
            //生成植物卡牌
            (function createNewCard() {
                const len = ArCard.length;
                if (len < maxCard) {
                    if(_priorityP?.[index]==="null"){
                        index++;
                    }else{
                        const obj = _priorityP[index] ? _priorityP[index] : arrP.random();
                        const proto = obj.prototype;
                        const id = "dCard" + Math.random();
                        const styles = `top:-60px;left:${215+Math.random()*600}px;width:100px;height:120px;cursor:pointer;clip:rect(auto,auto,60px,auto);z-index:253;`;
                        const card = ArCard[len] = {
                            DID: id,
                            PName: obj,
                            hasAnim: false,
                            PixelTop: -60,
                            EndTop: 110 + Math.random()*440,
                            Ele: NewImg(id, proto.PicArr[proto.CardGif], styles, EDAll, {onmousedown: event => {ChosePlant(event, card);}}),
                        };
                        index++;
                    }
                }
                oSym.addTask(createTime, createNewCard);
            })();
            (function moveCard() {
                ArCard.forEach(card => {
                    if(card.PixelTop <= card.EndTop) {
                        card.Ele.style.top = (card.PixelTop += Math.max((75-card.PixelTop)/20,1)) + "px";
                        if(!card.Appeared){
                            card.Ele.style.opacity =  Math.min(card.PixelTop/60,1);
                            if(card.Ele.style.opacity==1){
                                card.Appeared = true;
                            }
                        }
                        return;
                    }
                    if(card.hasOwnProperty('countdown')) {
                        if(oS?.ChoseCardObj?.DID !== card.DID) {
                            card.countdown -= moveTime;
                            card.countdown <= 300 && !card.hasAnim && (oEffects.Animate(card.Ele, 'CardBlink', 'slow', null, null, null, 'infinite'), card.hasAnim = true);
                            if(card.countdown <= 0) {
                                card.Ele.onmousedown = null;
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
        let FlashMask = NewEle(`Flash_Mask${Math.random()}`, "div", "pointer-events:none;position:absolute;z-index:31;left:0px;width:1600px;height:600px;background:#000;opacity:0.4;", 0, EDAll);
        let flash_on = 1;
        let Mask = NewEle(`Mask${Math.random()}`, "div", "pointer-events:none;position:absolute;z-index:31;left:0px;width:1600px;height:600px;background:#000;opacity:0.5;", 0, EDAll);
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
        let RainAudio = oAudioManager.playAudio("rain",true);
        (() => {
            RainAudio.volume=0.5;
            oSym.addTask(1,function l(){
                if(!openThundering){
                    return;
                }
                if(RainAudio.currentTime>RainAudio.duration-0.4){
                    RainAudio.currentTime=0;
                }
                oSym.addTask(2,l);
            });            
        })();

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
            oS.isStartGame===1 ? thunderStart() : addEventListenerRecord('jng-event-startgame', thunderStart);
        });
        function Bright(type){
            oEffects.Animate(Mask,"bright_thunder"+type,thunderDelay/oSym.NowSpeed,"ease-out");
            if(type==2){
                let ThunderAudio = oAudioManager.playAudio("thunder");
                (() => {
                    ThunderAudio.volume=1;
                    oSym.addTask(thunderDelay*60,function(){
                        ThunderAudio = oAudioManager.playAudio("thunder");
                        ThunderAudio.volume=0.5;
                    });                    
                })();
            }else{
                let ThunderAudio = oAudioManager.playAudio("thunder");
                (() => {
                    ThunderAudio.volume=1;
                })();
            }
        }
        function closeFunction(){
            openThundering = false;
            Mask.style.transition="";FlashMask.style.opacity=0;
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
    LimitedTimeNoCool( time=Infinity, fun, timerBar = null ) {
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
            let dom = NewEle("","div","left: 450px; top: 300px; transform: translate(-50%, -50%);color:red;font-size:80px;opacity:0;", {
                innerText:text[0][0],
                id:"dReadySetPlant",
                className:"2px_shadow_with_shadow"
            },FightingScene);
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
                let str = `${plant.CName}<br>冷却时间:${plant.coolTime}秒<br>${plant.Tooltip}`;
                if(card.Forbidden){
                    str += '<br><span style="color:#F00">该植物暂不可种植！</span>'
                }else{
                    !card.CDReady && (str += '<br><span style="color:#F00">植物正在冷却中...</span>');
                    !card.SunReady && (str += '<br><span style="color:#F00">你的阳光不足!</span>');
                }
                ele.innerHTML = str;
                SetStyle(ele, {
                    top: 60 * index + "px",
                    left: "215px",
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
                        pointerEvents:"auto",
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
                            time--;  //刷新时间
                            let curValue = timerBar ? timerBar(time/oldTime) : (time/oldTime)**1.1;
                            if(curValue <= 1/3) {
                                oFlagContent.update({ MeterType: 'LeftBar RedBar', curValue, animConfig: {disabled: true} });
                            } else if (curValue <= 2/3) { 
                                oFlagContent.update({ MeterType: 'LeftBar BlueBar', curValue, animConfig: {disabled: true} });
                            } else {
                                oFlagContent.update({ curValue, animConfig: {disabled: true} });
                            }
                            if(time<0) {
                                FIGHT(true);
                            } else {
                                if(!clicked){
                                    oSym.addTask(1,loop);
                                }
                            }
                        });
                    }
                });
            });
        });
        function FIGHT(timeLimited=false) {
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
                for(let i in oP.FlagToSumNum.a2){
                    oP.FlagToSumNum.a2[i]*=2//大波僵尸进攻
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
        let objFun = {
            ChosePlant: (() => {
                let tempfunc = window.ChosePlant;
                return (evt, index) => {
                    if(index + 1 > ArCard.length) return;
                    index === -1 && (index = 9);
                    if(ArCard[index].Forbidden) return;     //在争分夺秒里被禁用则无法种植
                    tempfunc(evt, index);
                };
            })(),
            GrowPlant(data, X, Y, R, C){
                let index = oS.ChoseCard;
                let card = ArCard[index];
                let plant = card.PName;
                let proto = plant.prototype;
                let coolTime = proto.coolTime;
                if(proto.CanGrow(data, R, C)) {
                    oAudioManager.playAudio(
                        oGd.$GdType[R][C] === 2 ? "plant_water" : `plant${Math.floor(1+Math.random()*2)}`
                    );
                    new plant().Birth(X, Y, R, C, data);
                    oS.SunNum -= proto.SunNum;  //更新阳光
                    const effectElement = $("imgGrowSoil");
                    effectElement.src = GrowSoilImg;
                    SetStyle(effectElement, {
                        left: X - 30 + "px",
                        top: Y - 45 + "px",
                        zIndex: 3 * R + 1,
                        visibility: "visible",
                    });
                    oSym.addTask(100, SetHidden, [effectElement]);
                    if(!IsMobile){
                        CancelPlant();
                    }
                }
                if(IsMobile){
                    CancelPlant();
                }
            },
            MonitorCard: function (d) {
                var b = ArCard.length,c;
                if (oS.Chose < 1) {
                    while (b--) {
                        if(!(d = ArCard[b]).Forbidden){//没有在争分夺秒里被禁用的植物
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
    HeatWave() {
        PlaySubtitle("热浪！",700);
        var _ele = NewEle("effect" + Math.random(), "div", "pointer-events:none;position:absolute;z-index:257;width:1900px;height:600px;background:rgb(0,0,0);opacity:0;", 0, EDAll);
        oEffects.Animate(_ele, {
            background: "rgb(200,0,0)",
            opacity: 0.08
        }, 0.2, "ease-out", _ => {
            oSym.addTask(3600, _ => {
                oEffects.Animate(_ele, {
                    opacity: 0
                }, 0.4, "linear", ClearChild);
            });
        });
        for (let y = 1; y < 6; y++) {
            for (let x = 1; x < 10; x++) {
                CustomSpecial(oHeatFloor, y, x);
            }
        }
    },
    IceStorm(a, b, number = 0) {
        oAudioManager.playAudio('frostbite');
        //开始列 结束列 生成冰块数量
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
            //开始列 结束列 生成冰块数量
            for (let i = 0, len = (juli + 1) * 25; i < len; i++) {
                let h = (juli + 1) * (Math.random() * 10 + 5);
                h < 25 && (h = Math.random() * 15 + 25);
                let rand = Math.floor(Math.random()*type.length);
                let obj = NewImg(`oSnowEffect${Math.random()}`, type[rand],
                    `position: absolute;transform:translateX(900px);top:${Math.random()*(juli+0.5)*100+100*(Math.min(a,b))-20}px;z-index:25;height:${h}px;`
                );
                let wid = (sizeData[rand][0] * h / sizeData[rand][1]);
                obj.style.width = wid + "px";
                requestAnimationFrame(_ => {
                    EDPZ.append(obj);
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
    Frostbite(apartTime, hurt) {
        oAudioManager.playMusic(oS.StartGameMusic);
        SetVisible($("tdShovel"), $("dFlagMeter"), $("dTop"));
        oS.InitLawnMover();
        oS.ControlFlagmeter && oFlagContent.init({ fullValue: oP.FlagNum-1, curValue: 0 });  //显示进度条
        /* 低温损害start */
        function _Frostbite() { //定时降温
            oAudioManager.playAudio('frostbite');
            oEffects.Animate(
                NewEle(`Frostbite${Math.random()}`, "div",
                    "z-index: 20;position: absolute;width: 200px;height: 600px;left: -200px;background: -webkit-linear-gradient(left, rgba(16, 234, 194, 0) 0px, #00a1ff52 50%, rgba(255, 255, 255, 0) 100%);transform: skewX(-25deg);",
                    0, EDPZ), {
                    left: '1100px'
                }, 'slow', 'ease-in', ClearChild
            );
            hasPlants().forEach(plant => plant.getHurt && plant.getHurt(null, 0, hurt));
            oSym.addTask(apartTime, _Frostbite);
        };
        /* 低温损害end */
        PrepareGrowPlants(function () {
            oP.Monitor(oS.Monitor, oS.UserDefinedFlagFunc);
            BeginCool();
            _Frostbite();
            PlaySubtitle("注意冰风！它会减少植物的血量！");
            oSym.addTask(1200, function () {
                PlaySubtitle();
                oP.AddZombiesFlag();
                oS.ControlFlagmeter && oFlagContent.show();
            });
        })
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
                '5000': ['oLawnCleaner']
            },
        });
    */
    WinWithScore({scoreMax, specialZombiesList = [], specialPlantsList = [], zombieFunc, plantFunc, useZombieExtraScore = false, usePlantExtraScore = false}) {
        /* 初始化hook */
        zombieFunc = zombieFunc || ( z => Math.floor((z.HP + z.OrnHP)/13) );
        plantFunc = plantFunc || ( p => 50 );
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
            MeterType: 'LeftBar GreenBar',
            HeadType: 'NoneHead',
            canMoveHead: false,
            fullValue: scoreMax,
        }).show();
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
                if($score === scoreMax) {
                    delete oS.GameScore;
                    for(let v of $Z) v.ExplosionDie();
                    toWin();
                }
            },
            configurable: true,
        });
        /* 分数处理器 */
        function markScore(ele) {
            let id = ele.id;
            let constructor = window[ele.dataset['jngConstructor']];
            if(!constructor) return;
            let pt = constructor.prototype;
            let name = pt.EName;
            if(id.includes('Z_0.') && Number.parseFloat(ele.style.left) < oS.W) {
                let delta = 0;
                if(useZombieExtraScore && tempZHook.has(name)) {
                    delta += tempZHook.get(name) + zombieFunc(pt);
                } else {
                    delta += tempZHook.has(name) ? tempZHook.get(name) : zombieFunc(pt);
                }
                oS.GameScore+=delta;
                let dom=NewEle("",`a`,`position:absolute;color:#FFFF00;font-weight:bold;transform:scale(1);opacity:1;left:${Number.parseInt(ele.style.left)+constructor.prototype.beAttackedPointL+115+'px'};z-index:${ele.style.zIndex};pointer-events:none;top:${(Number.parseInt(ele.style.top)+40)+"px"};font-size:${Math.min(Math.max(delta/1000,1.5),4)}em;`,{
                    innerText:delta
                },EDAll);
                oEffects.Animate(dom,{
                    top:(Number.parseInt(ele.style.top)-50)+"px",
                    opacity:0,
                    transform:"scale(1.5)"
                },2,`ease-out`,ClearChild);
            } else if(id.includes('P_0.') && name !== 'oRifter') {
                if(usePlantExtraScore && tempPHook.has(name)) {
                    oS.GameScore += tempPHook.get(name) + plantFunc(pt);
                } else {
                    oS.GameScore += tempPHook.has(name) ? tempPHook.get(name) : plantFunc(pt);
                }
            }
        }
        /* 监听页面元素变化 */
        addEventListenerRecord('jng-event-startgame', () => {
            new MutationObserver(mutations => 
                IsGaming(1) && mutations.forEach(MutationRecord => 
                    MutationRecord.removedNodes.forEach(markScore)
                )
            ).observe(EDPZ, {childList: true});            
        });
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
            self.canvas = NewEle(id, 'canvas', "left:115px;width:900px;height:600px;", {height: 600*self.screenRatio, width: 900*self.screenRatio, className: 'BgParticle'}, EDAll);
            self.tmpCanvas = NewEle(id+"_tmp", 'canvas', "", {height: 600*self.screenRatio, width: 900*self.screenRatio});
            self.tmpCtx = self.tmpCanvas.getContext("2d",{willReadFrequently:true});
            if($User.LowPerformanceMode){
                self.drawInterval=2;
            }
            if(self.canvas.transferControlToOffscreen){
                self.offscreen = self.canvas.transferControlToOffscreen();
                self.ctx = self.offscreen.getContext("2d");
            }else{
                self.ctx = self.canvas.getContext("2d");
            }
            
            EBody.onkeydown=e=>{
                self.key[e.which]=true;
            };
            EBody.onkeyup=e=>{
                self.key[e.which]=false;
            };
            $("dFightingScene").addEventListener("touchstart", handleTouchEvent, false);
            $("dFightingScene").addEventListener("touchmove", handleTouchEvent, false);
            $("dFightingScene").addEventListener("touchend", handleTouchEvent, false);
            function handleTouchEvent(e){
                let finger = e.targetTouches[0];
                e.preventDefault();
                switch(e.type){
                    case "touchstart":
                        if(e.targetTouches.length==1){
                            self.key[1]=true;
                            self.mousePos=[finger.clientX,finger.clientY];
                            self.mouseMovePos=[finger.clientX,finger.clientY];
                        }
                        if(self.hero&&self.hero.CanDie&&e.targetTouches.length>1){
                            self.key[88]=true;
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
            if(!IsHttpEnvi&&/file:/.test(location.href)){
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
                        self.ctx.clearRect(0,0,900*self.screenRatio,600*self.screenRatio);
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
                return publicImg[img];
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
                    let spd = f.key[16]?2:4;
                    let dx = [-1,0,1,0];
                    let dy = [0,-1,0,1];
                    let delta = [0,0];
                    for(let i = 0;i<4;i++){
                        if(f.key[i+37]){
                            delta[0] += dx[i]*spd;
                            delta[1] += dy[i]*spd;
                        }
                    }
                    if(f.key[88]&&self.bomb){
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
                    f.key[88]=false;
                    if(oS.SunNum<(isNaN(self.bomb)?75:self.bomb)){
                        SunNumWarn();
                        return;
                    }
                    CustomSpecial(oDoomShroom,3,6);
                    oS.SunNum-=(isNaN(self.bomb)?75:self.bomb);
                    self.CanDie=false;
                    self.dom.style.filter="brightness(50%)";
                    oMiniGames.oStg.canvas.style.filter="brightness(120%)";
                    oSym.addTask(30,function(){
                        oMiniGames.oStg.bullets={};
                        oMiniGames.oStg.canvas.style.filter="";
                    });
                    oSym.addTask(300,function(){
                        self.CanDie=true;
                        self.dom.style.filter="";
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
                        oSym.addTask(30,function(){
                            oMiniGames.oStg.bullets={};
                            oMiniGames.oStg.canvas.style.filter="";
                        });
                        oSym.addTask(300,function(){
                            self.CanDie=true;
                            self.dom.style.filter="";
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
                    if(self.x>900||self.x+self.width<0||self.y+self.height<-50||self.y>650){
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
},
oEffects = {
    AudioFadeOut(audio, targetVolume = 0, duration = 1, callback) {
        if (typeof audio === 'string') {
            audio = oAudioManager.getDom(audio);
        }
        if(!audio||Math.abs(audio.volume-targetVolume)<0.02||audio.paused){
            endFade();
            return;
        }
        duration = duration * 1000;
        let curVolume = audio.volume;
        let curFrame = 0;
        let interval = setInterval(() => {
            audio.volume = Math.Lerp(curVolume,targetVolume,curFrame/duration);
            if (curFrame>=duration) {
                clearInterval(interval);
                endFade();
            }
            curFrame+=16;
        }, 16);
        function endFade(){
            audio.pause();
            audio.volume = targetVolume;
            callback && callback(audio);
        }
    },
    async AudioFadeIn(audio, targetVolume = 1, duration = 1, callback, type = "Audio") {
        if (typeof audio === 'string') {
            audio = await oAudioManager[ `play${type}`](audio, true, 0);
        }
        duration = duration * 1000;
        let curVolume = audio.volume;
        let curFrame = 0;
        let interval = setInterval(() => {
            audio.volume = Math.Lerp(curVolume,targetVolume,curFrame/duration);
            if (curFrame>=duration) {
                clearInterval(interval);
                callback && callback(audio);
            }
            curFrame+=16;
        }, 16);
    },
    Particle({style="",height=60,width=60,objects=[],canvasFunction,wrap=EDAll}){
        //准备工作
        const id = `BgParticle_${Math.random()}`;
        let canvas = NewEle(id, 'canvas', style, {height: height, width: width, className: 'BgParticle'}, wrap);
        let ctx = canvas.getContext("2d");
        function RotatePaint(pic,x,y,width=-1,height=-1,rotate=0,alpha=1){
            let dist = [x+width/2,y+height/2];
            ctx.save(); // 保存状态，以免影响其它物体
            ctx.globalAlpha = alpha;
            ctx.translate(dist[0], dist[1]); // 将画布偏移到物体中心
            ctx.rotate(rotate); // 旋转角度
            ctx.translate(-dist[0], -dist[1]);// 将画布偏移回来
            if(width>0){
                ctx.drawImage(pic,Math.round(x), Math.round(y), width, height);
            }else{
                ctx.drawImage(pic,Math.round(x), Math.round(y));
            }
            // 坐标参考还原
            ctx.restore();// 恢复状态
        }
        canvasFunction(canvas);
        for(let i=0;i<objects.length;i++){
            let pic = oDynamicPic.__BlobImgStorage__.get("TMP_Particle_"+objects[i].src);
            if(pic){
                objects[i].pic = pic;
            }else{
                objects[i].pic = new Image();
                objects[i].pic.src = objects[i].src;
                oDynamicPic.__BlobImgStorage__.set("TMP_Particle_"+objects[i].src,objects[i].pic);
            }
            objects[i].alpha = objects[i].alpha ?? 1;
            objects[i].rotate = objects[i].rotate ?? 0;
            objects[i].width = objects[i].width ?? -1;
        }
        requestAnimationFrame(function c(){
            if(objects.length<1){
                ClearChild(canvas);
                return;
            }
            if(!$(id)){
                return;
            }
            ctx.clearRect(0,0,width,height);
            for(let i=0;i<objects.length;i++){
                let obj = objects[i];
                RotatePaint(obj.pic,obj.x,obj.y,obj.width,obj.height,obj.rotate,obj.alpha);
                obj.move(obj);
            }
            requestAnimationFrame(c);
        });
    },
    BgParticle({url, style, k = 1, spd = Math.sqrt(2)*2.5, timeout = 5,move=null,size={width:36,height:37},other={}}) {  //场景粒子效果
        if($User.LowPerformanceMode){
            return false;
        }
        if(move===null){
            let rad = Math.atan2(1,k);
            let spdY = Math.sin(rad)*spd,
                spdX = Math.cos(rad)*spd;
            move = function(i){
                i.left+=spdX*oSym.NowSpeed;
                i.top+=spdY*oSym.NowSpeed;
            }
        }
        //准备工作
        const id = `BgParticle_${Math.random()}`;
        const canvas = NewEle(id, 'canvas', style, {height: 600, width: 1600, className: 'BgParticle'}, EDAll);
        let destroy = false;
        let offscreen,ctx;
        if(canvas.transferControlToOffscreen){
            offscreen = canvas.transferControlToOffscreen();
            ctx = offscreen.getContext('2d');
        }else{
            ctx = canvas.getContext("2d");
        }
        const image = new Image();
        image.src = url;
        //绘制粒子
        let particles = [];
        oSym.addTask(timeout, function fun() {
            let times=1/timeout;
            for(let i = 0;i<times;i++){
                let left = Math.random()*2400-600;
                let img = image.cloneNode();
                particles.push({
                    img, left, other,
                    top: -size.height-3,
                });
            }
            if(destroy){
                return;
            }
            document.hidden ? addEventListener('visibilitychange', _=>oSym.addTask(timeout, fun), {once: true}) : oSym.addTask(timeout, fun);
        });
        //绘制动画
        requestAnimationFrame(function fun() {
            ctx.clearRect(0, 0, 1600, 600);
            //console.log(particles);
            let len = particles.length;
            while(len--) {
                let json = particles[len];
                let {img, left, top} = json;
                if(json.top >= 600) {
                    particles.splice(len, 1);
                } else {
                    ctx.drawImage(img, Math.round(left), Math.round(top), size.width, size.height);
                    move(json);
                }
            }
            $(id) ? requestAnimationFrame(fun) : (destroy=true);
        });
        return canvas;
    },
    ScreenShake(n = 4) { //屏幕震动特效，n表示振动幅度（px）
        SetStyle(EDAll, {marginLeft: -450 + n + "px"});
        setTimeout(_=>{
            SetStyle(EDAll, {marginLeft: '-450px', top: -n + "px"});
            setTimeout(_=>SetStyle(EDAll, {top: 0}),20);
        },20);
    },
    /* ImgSpriter调用说明（请确保修改属性是css3所兼容的！）
    ele：需要生成动画的元素
    interval：可传入数字或null。若传入数字则激活oSym.addTask进行计时。
    styleProperty: 选填X或Y
    changeValue: 每帧坐标变化量
    frameNum：动画帧数
    callback: 动画完成后的回调函数
    data：预留给部分无法替换代码的老动画使用
    */
    ImgSpriter({ele, interval, styleProperty = 'X', changeValue, frameNum, callback = ClearChild, data}) {
        if(!ele) return;
        let api = interval ? f=>oSym.addTask(interval, f) : requestAnimationFrame;
        let cssDeclaration = ele.style;
        let property = `backgroundPosition${styleProperty}`;
        let index = 1;
        let pos = 0;
        let fun = () => {
            if(index <= frameNum) {
                data ? (cssDeclaration.backgroundPosition = data[index-1]) : (cssDeclaration[property] = `${pos}px`, pos += changeValue);
                index++;
                return api(fun);
            }
            callback && callback(ele);
        };
        fun();
        return ele;
    },
    /* Animate调用说明（请确保修改属性是css3所兼容的！）
    ele：需要生成动画的元素
    properties：需要生成动画的样式，必传。例如：{'width': '300px'}
    duration: 过渡时间（秒）（默认0.4s）。可传入字符串fast (0.2s)或slow (0.6s)。
    ease: 缓动函数，默认linear，即匀速运动
    callback: 动画完成后的回调函数
    delay: 动画延迟执行的时间（秒）（默认无延迟）
    */
    Animate(ele, properties, duration = 0.4, ease = 'linear', callback, delay = 0, iterationCount = 1) {
        let cssValues = {};
        let cssProperties = [];
        let cssList = ['-name', '-property', '-duration', '-delay', '-timing-function'];
        let effectType;
        typeof duration === 'string' && (duration = {
            fast: 0.2,
            slow: 0.6
        } [duration]);
        /* 生成css代码 */
        if (typeof properties === 'string') {
            cssValues['animation-name'] = properties;
            cssValues['animation-duration'] = duration + 's';
            cssValues['animation-delay'] = delay + 's';
            cssValues['animation-timing-function'] = ease;
            cssValues['animation-iteration-count'] = iterationCount;
            cssValues['animation-fill-mode'] = 'none';
            effectType = 'animation';
        } else {
            for (let index in properties) {
                //自定义样式
                cssValues[index] = properties[index];
                cssProperties.push(index); //记录需要为哪些样式调用动画
            }
            cssValues['transition-property'] = cssProperties.join(', ');
            let traverse = {
                "duration": [duration, "s, ", "s"],
                "delay": [delay, "s, ", "s"],
                "timing-function": [ease, ", ", ""]
            };
            for (let i in traverse) {
                if (typeof traverse[i][0] != 'object') {
                    cssValues['transition-' + i] = traverse[i][0] + traverse[i][2];
                } else {
                    cssValues['transition-' + i] = traverse[i][0].join(traverse[i][1]) + traverse[i][2];
                }
            }
            effectType = 'transition';
        }
        cssList = cssList.map(key => effectType + key);
        /* 设置动画完成监听 */
        ele.addEventListener(effectType + 'end', function _callback(event) {
            if (event.target !== event.currentTarget) return; //规避冒泡
            ele.removeEventListener(effectType + 'end', _callback); //避免多个属性同时改变时重复触发回调！
            for (let index of cssList) ele.style[index] = ''; //还原动画配置属性
            callback && callback(ele); //触发传入回调
        });
        /* 触发动画 */
        ele.clientLeft; //触发页面的回流，使得动画的样式设置上去时可以立即执行
        SetStyle(ele, cssValues);
        return ele;
    },
    animatePromise(ele, properties, {duration, easing, delay, iterationCount}) {
        return new Promise((resolve) => {
            oEffects.Animate(ele, properties, duration, easing, resolve, delay, iterationCount);
        });
    },
    //自定义淡入
    fadeTo: (ele, opacity, duration, callback)=>oEffects.Animate(ele, {opacity: opacity}, duration, undefined, callback),
    //从无到有淡入
    fadeIn: (ele, duration, callback)=>oEffects.fadeTo(ele, 1, duration, callback),
    //从有到无淡出
    fadeOut: (ele, duration, callback, delay)=>oEffects.fadeTo(ele, 0, duration, callback, delay),
    //文本特效s
    TextEffects:{
        ZombossEffect(dom,callback){
            if(!dom){
                let eff = NewEle("ZombossEffect","img","position:absolute;z-index:1301;left:166px;top:50px;pointer-events:none;",{
                    src:"images/Props/PolarPlots/ZombossTalk0.webp"
                },EDAll);
                setTimeout(function(){
                    eff.src="images/Props/PolarPlots/ZombossTalk1.webp";
                    dom = NewEle("","div","position: absolute; z-index: 1300; left: 0px; top: 205px; height: 115px; width: 900px; text-align: center; line-height: 115px; color: white; background: rgba(0, 0, 0, 0.6);font-size:24px;",{
                        
                    },EDAll);
                    callback(dom);
                },2533.3);
            }else if($("ZombossEffect")&&!$("ZombossEffect").dataset?.dying){
                $("ZombossEffect").src="images/Props/PolarPlots/ZombossTalk2.webp";
                ClearChild(dom);
                $("ZombossEffect").dataset.dying = true;
                setTimeout(function(){
                    ClearChild($("ZombossEffect"));
                    callback();
                },2533.3);
            }
        },
        ShakeText(json){
            let {
                text="",
                font_size=18,
                str=true,
                font_family="",
                time_range=0.2,
                width=470,
                customSize=defaultCustomSize,
                align_center=true,
                relative=false,
                paddingLeft=0,
                paddingTop=0,
            }=json;
            let arr = [];
            let t = text.split("");
            let left = 0;
            let top = 0;
            let special = {
                "　":1,
            };
            function defaultCustomSize(i){
                let size = -1;
                if(i>='A'&&i<='Z'){
                    if(i=='M'||i=='W'||i=='V'){
                        size=19/24;
                    }else{
                        size=13/18;
                    }
                }
                if(i>="a"&&i<='z'){
                    if(i=='m'||i=='w'){
                        size=5/9;
                    }else{
                        size=5/9;
                    }
                }
                return size;
            }
            let characters = [];
            function generate(relative,character,left,width,top,font_size,font_family,time_range){
                if(!relative){
                    return `<span style="position:absolute;left:${left}px;width:${width}px;top:${top}px;font-size:${font_size}px;font-family:${font_family};animation: shake_text_1px ${Math.random()*time_range+time_range/2}s linear ${Math.random()-1}s infinite;">${character}</span>`;
                }else{
                    return `<span style="position:relative;width:${width}px;font-size:${font_size}px;font-family:${font_family};animation: shake_text_1px2 ${Math.random()*time_range+time_range/2}s linear ${Math.random()-1}s infinite;">${character}</span>`;
                }
                //
            }
            //for(let i of t){
            for(let index = 0;index<t.length;index++){
                let i = t[index];
                let left_char = index>0?t[index-1]:"";
                let right_char = index<t.length-1?t[index+1]:"";
                let size = 0;
                //if(left_char&&right_char){
                    let tmp = NewEle("","span",`font-family:${font_family};font-size:${font_size}px;`,{innerText:left_char},EDAll);
                    let tmp2 = NewEle("","span",`font-family:${font_family};font-size:${font_size}px;`,{innerText:i},EDAll);
                    let tmp3 = NewEle("","span",`font-family:${font_family};font-size:${font_size}px;`,{innerText:right_char},EDAll);
                    size = tmp2.offsetWidth;//我怕会有连写的调整所以要用三个字符来规定中间那个字符应该多宽
                    ClearChild(tmp,tmp2,tmp3);
                    size= (special[i]?special[i]*font_size:size);
                let delta = -1;
                if(i=="\n"){
                    if(relative){
                        arr.push("<br/>");
                    }
                    delta=align_center?(width-left)/2:0;
                }
                if(left>=width-size||delta>=0){
                    delta = Math.max(delta,0);
                    for(let j = 0;j<characters.length;j++){
                        let str = generate(
                            relative,
                            characters[j].character,
                            characters[j].left+delta+paddingLeft,
                            characters[j].size,
                            top+paddingTop,
                            font_size,
                            font_family,
                            time_range
                        );
                        arr.push(str);
                    }
                    characters = [];
                    left = 0;
                    top+=font_size+10;
                }
                characters.push({
                    left:left,
                    character:i,
                    size:size
                });
                left+=size;
            }
            //最后居中处理
            {
                let delta = align_center?(width-left)/2:0;
                for(let j = 0;j<characters.length;j++){
                    let str = generate(
                        relative,
                        characters[j].character,
                        characters[j].left+delta+paddingLeft,
                        characters[j].size,
                        top+paddingTop,
                        font_size,
                        font_family,
                        time_range
                    );
                    arr.push(str);
                }
            };
            if(!str){
                return arr;
            }
            return [arr.join(""),left];
        }
    },
},
oFlagContent = {
    fullValue: null,
    curValue: null,
    fullWidth: 211.5,
    headWidth: 28,
    init({MeterType = 'RightBar GreenBar', HeadType = 'NormalHead', fullValue, curValue = 0, canMoveHead = true}) {
        this.__ContainerEle__ = $('dFlagMeterContent');
        this.__MeterEle__ = $('dFlagMeterBar');
        this.__HeadEle__ = $('dFlagHead');
        this.__MeterEle__.className = MeterType;
        this.__HeadEle__.className = HeadType;
        this.fullValue = fullValue;
        this.curValue = curValue;
        this.canMoveHead = canMoveHead;
        //this.fullValue=0时因为要出现动画，所以需要设定为0
        const val = (this.fullValue===0 ? 0 : curValue/fullValue)*this.fullWidth;
        this.__MeterEle__.style.width = val + 'px';
        canMoveHead && (this.__HeadEle__.style.right = val-this.headWidth/2 + 'px');
        return this;
    },
    update({MeterType, curValue, animConfig = {}}) {
        animConfig = Object.assign({
            disabled: false,
            duration: 0.3,
        }, animConfig);
        MeterType && (this.__MeterEle__.className = MeterType);
        if(curValue !== null && curValue !== void 0 && curValue <= this.fullValue) {
            //更改记录值
            this.curValue = curValue;
            //更新进度条                fullValue可能直接为0
            const val = (this.fullValue===0 ? 1 : curValue/this.fullValue)*this.fullWidth;
            const newWidth = val + 'px';
            const bar = this.__MeterEle__;
            if(animConfig.disabled !== true) {
                const {duration, ease, callback} =animConfig ;
                oEffects.Animate(bar, {
                    width: newWidth
                }, duration, ease, callback);
            } else {
                bar.style.width = newWidth;
            }
            this.canMoveHead && (this.__HeadEle__.style.right = val-this.headWidth/2 + 'px');            
        }
    },
    show() {
        this.__ContainerEle__.style.visibility = 'visible';
        return this;
    },
    hide() {
        this.__ContainerEle__.style.visibility = 'hidden';
        return this;
    },
};
const SkipLoading = () => {
    if (oS.Lvl === "selectionmap" ) {
        oSelectionMap.finishLoadPage();
    } else {
        oS.LoadReady(oS);                
    }
};
const willPlayDialogue=(type=-1)=>{
    if(false&&localStorage.JNG_DEV==="true"){
        return 0;
    }
    if(!$User.IS_PLOT_OPEN){
        return -1;
    }
                                                //这里加上通关前后的标志可以表明看的是通关对话或者通过前对话
    if(!sessionStorage["___PLAY_DIALOGUE___"+oS.Lvl+"_"+(type>=0?type:oS.isStartGame)]){
        sessionStorage["___PLAY_DIALOGUE___"+oS.Lvl+"_"+(type>=0?type:oS.isStartGame)]=1;
        return 0;
    }else{
        return -1;
    }
};
