//預載入
window.addEventListener("load", init);

//宣告
var t, p1, p2, canvas, ctx; //數值
var gmoney; //生成money
var army, bg, start_btn, solder_out1, solder_out2, solder_out3; //圖片
let BW = 1200, BH = 800; //地圖寬高
let x = 0, y = 120;
let reward = 10;//殺死一隻多少錢
let nowatt = 15;//殺傷力

let stage = 1;//第幾關 
let htmlstage = 3;
let tesend;//敵軍自動出兵時間
let esendcnt = 0;// 敵軍第幾波出兵

let MS = [];//我方成員
let ES = [];//敵方成員
let MX, MY, MW;//我方重心 MW是我方重量
let EX, EY, EW;//敵方重心 EW是敵方重量
let DX = -1, DY = -1;//Boss的移動目標
let msg;
let money;//目前的錢
let emoney = 9999; // 敵人目前的錢
let CTLY = 600; //座標比這裡大，就是控制選項
let isgo = 0;

let talkimg = new Image();
let dio = new Image();


function vol(sel) {
    var v = document.getElementById("audio").volume;

    if (sel == 1) v = v + 0.1;
    else if (sel == 2) v = v - 0.1;
    if (v < 0) v = 0;
    if (v > 1) v = 1;
    document.getElementById("audio").volume = v;
    document.getElementById("audioact").volume = v;
    document.getElementById("volume").innerHTML = "遊戲音量: " + document.getElementById("audio").volume.toFixed(1) * 100 + "%";
    console.log(v);
}


function init() {

    /* 關卡判定 */
    stage = parseInt(localStorage.getItem("stage"));
    if (isNaN(stage) || stage < 1) stage = 1;
    if (htmlstage > stage) {
        alert("你無權玩這一等級");
        sh(2);
    }
    for (var i = 1; i <= 4; i++) {
        if (i <= stage)
            document.getElementById('s' + i).disabled = false;
        else
            document.getElementById('s' + i).disabled = true;
    }
    //money = parseInt(localStorage.getItem("money"));
    //if (isNaN(money) || money < 100) money = 100;
    /* 關卡判定 */

    //宣告canvas及ctx
    canvas = document.getElementById('main');
    ctx = canvas.getContext('2d');
    msg = document.getElementById('msg');

    //擺放圖片
    bg = new Image();
    start_btn = new Image();
    solder_out1 = new Image();
    solder_out1.src = "img/solder_out1.png"
    solder_out2 = new Image();
    solder_out2.src = "img/solder_out2.png"
    solder_out3 = new Image();
    solder_out3.src = "img/solder_out3.png"
    dio.src = 'img/dio_dio.png';

    //load 背景
    bg.onload = function () {
        ctx.drawImage(bg, 0, 0);
        ctx.fillText("迪歐傳說", 420, 240);
        ctx.font = "bold 80px senif";
        ctx.fillStyle = "white";
        start_btn.src = "img/start_btn.png";
    };
    bg.src = "img/bgt.png";

    //load 按鈕
    start_btn.onload = function () {
        ctx.drawImage(start_btn, 500, 300, 200, 200);
        canvas.addEventListener("click", handleButtonClick, false);
    };

    start_btn.onerror = function () {
        console.log("reloading start_btn.")
        start_btn.src = "img/start_btn.png";
    };

};

//按鈕宣告物件
function handleButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();
    var start_x = event.pageX - canvas.offsetLeft;
    var start_y = event.pageY - canvas.offsetTop;
    if (isgo == 0 && start_x >= 500 && start_x <= 700 && start_y >= 300 && start_y <= 500) {
        canvas.removeEventListener("click", handleButtonClick, false);

        talkimg.src = 'img/bg_dark.png';
        talkimg.addEventListener("load", (e) => {
            talk(100, 200, '劇情3：我們成功打敗帝國軍了，迪歐跟他的部隊進攻帝國的首都，這是最後一戰了。究竟迪歐能不能成功進攻首都成功呢？(本關為首都，敵方步兵機率提升，因敵方步兵裝備精良，敵方步兵血量提升)', '遊玩方法及規則：用滑鼠點擊出兵鈕進行攻打，打爆敵方主堡即可獲勝，反之自己主堡爆了就失敗。');
            //setTimeout(ctx.drawImage(bg, 0, 0), 5000)
            setTimeout(go, 10000);
        });

        //go();
        document.getElementById("status").innerHTML = "遊戲開始";
        document.getElementById("audio").play();
        document.getElementById("audio").volume = 0.5;
        document.getElementById("audioact").volume = 0.5;
        document.getElementById("volume").innerHTML = "遊戲音量: " + document.getElementById("audio").volume.toFixed(1) * 100 + "%";
        isgo = 1;
    }
};

//物件導向宣告
function obj(x, y, speed, W, H, imgname, attactname, hp, tp, weight, side) {
    this.tp = tp;//0 兵 1 城堡 2 弓箭兵
    this.weight = weight; // 重量
    this.hp = hp;//體力
    this.fullhp = hp;//滿血體力
    this.pt = 0;//走路圖
    this.apt = 0;//打仗圖
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.side = side;//0 我方 1敵方
    this.W = W;
    this.H = H;
    this.img = [];
    this.aimg = [];
    this.battle = 0;//打仗與否
    this.buff = 0;//有沒有buff
    this.isboss = 0;
    this.attact = 7;
    this.prevx = x;
    this.prevy = y;
    this.att = [];//攻擊對手
    this.imgdata;
    if (tp == 2) this.attact = 10; //弓箭兵加強
    if (tp == 3) this.attact = 12; //騎兵

    msg.innerHTML = imgname.length + "";
    for (var i = 0; i < imgname.length; i++) {
        this.img[i] = new Image();
        this.img[i].src = "img/" + imgname[i];
    }
    for (var i = 0; i < attactname.length; i++) {
        this.aimg[i] = new Image();
        this.aimg[i].src = "img/" + attactname[i];
    }

    var speedx, speedy;

    this.go = function () {
        if (this.side == 0) {
            if (Math.abs(DY - this.y) + Math.abs(DX - this.x) < 10 && this.isboss == 1) {//移動到定點
                DX = -1; DY = -1;
            }
            if (DX >= 0 && DY >= 0 && this.isboss == 1) {
                NX = DX;
                NY = DY;
            }
            else {
                NX = (this.x * this.weight + EX * EW) / (this.weight + EW);
                NY = (this.y * this.weight + EY * EW) / (this.weight + EW);
            }
            speedx = (NX - this.x) / (Math.abs(NY - this.y) + Math.abs(NX - this.x) + 0.00000001) * speed;
            speedy = (NY - this.y) / (Math.abs(NY - this.y) + Math.abs(NX - this.x) + 0.00000001) * speed;
        }
        else {
            var NX = (this.x * this.weight + MX * MW) / (this.weight + MW);
            var NY = (this.y * this.weight + MY * MW) / (this.weight + MW);
            speedx = (NX - this.x) / (Math.abs(NY - this.y) + Math.abs(NX - this.x) + 0.00000001) * speed;
            speedy = (NY - this.y) / (Math.abs(NY - this.y) + Math.abs(NX - this.x) + 0.00000001) * speed;
        }
        if (this.side == 0) {//檢查要不要打仗
            //檢查要不要buff
            for (var i = 0; i < MS.length; i++) {
                if (i == 1) continue; //不要buff自己
                if (this.tp == 1) continue;
                if ((MS[i].x - this.x) * (MS[i].x - this.x) + (MS[i].y - this.y) * (MS[i].y - this.y) < 50 * 50)  //50點以內Buff
                    MS[i].buff = 1;
                else MS[i].buff = 0;
            }

            let nf = 0;
            for (var i = 0; i < ES.length; i++) {
                var DD = (this.W + ES[i].W) / 2;
                var batleDD2 = DD * DD;
                var LESS = 0;
                var dist2 = (ES[i].x - this.x) * (ES[i].x - this.x) + (ES[i].y - this.y) * (ES[i].y - this.y);//距離平方
                if (this.tp == 2)//弓箭兵
                {
                    DD = 150;//攻擊最遠距離
                    LESS = (this.W + ES[i].W) + 20;//攻擊最近距離
                }
                if (dist2 < DD * DD && dist2 >= LESS) {
                    nf = 1;
                    this.battle = 1;
                    if (dist2 < batleDD2) //夠接近對手才戰
                        ES[i].battle = 1;
                    this.att[this.att.length] = ES[i];
                    if (this.tp != 1 && this.apt == 1) //底下才是真正的打仗, apt==1 = 攻擊第2張圖
                    {
                        //計算受傷
                        if (this.buff == 1)
                            nowatt = this.attact + 10;
                        else
                            nowatt = this.attact;
                        ES[i].hp = ES[i].hp - nowatt;
                        ctx.font = "24px Arial";
                        ctx.fillStyle = "gray";
                        ctx.fillText("-" + nowatt, ES[i].x + 20, ES[i].y);

                        document.getElementById("audioact").src = `audio/dmg/${Math.floor((Math.random() * 3) + 1)}.mp3`
                        document.getElementById("audioact").play();//音效
                    }
                    if (ES[i].hp <= 0) {
                        if (i == 0) {
                            clearInterval(t);
                            alert("恭喜第三關過關！\n迪歐帶著軍隊取下了敵方的首級，即使亞納提斯王國已經戰勝了索默帝國，但迪歐也不敢鬆懈，帶領著軍隊返回王國，返回王國的迪歐，會發生甚麼事呢？(請點擊結局？按鈕繼續遊戲)");
                            /* 關卡遞增 */
                            if (stage > htmlstage) {
                                stage = stage;
                            } else {
                                stage++;
                                if (stage > 4) stage = 4;
                            }
                            localStorage.setItem("money", "" + money);
                            localStorage.setItem("stage", "" + stage);
                            /* 關卡遞增 */
                            document.getElementById("status").innerHTML = "勝利";
                            console.log("stage:" + stage);
                            console.log("htmlstage:" + htmlstage);
                            start_btn.onload = function () {
                                ctx.drawImage(bg, 0, 0);
                                ctx.drawImage(start_btn, 500, 300, 200, 200);
                                canvas.addEventListener("click", handleButtonClick, false);
                            }
                            isgo = 0;
                            bg.src = "img/bgt.png";
                            start_btn.src = "img/start_btn.png";
                            window.location.reload();
                        }
                        reward = 10;
                        if (ES[i].boss == 1) {
                            reward = 50;
                            document.getElementById("status").innerHTML = "殺死敵方首領:獲得" + reward + "元";
                        }
                        money = money + reward;
                        //draw money
                        ctx.font = "20px Arial";
                        ctx.fillStyle = "blue";
                        ctx.fillText("$" + reward, ES[i].x, ES[i].y);
                        document.getElementById("status").innerHTML = "殺死一隻兵:獲得" + reward + "元";
                        //document.getElementById("money").innerHTML = "coins:" + money;
                        //ctx.font = "48px serif";
                        //ctx.fillStyle="black";
                        //ctx.fillText( "coins:" + money,1000,700);
                        ES.splice(i, 1);
                        i = i - 1;
                    }
                }
            }
            if (nf == 0) this.battle = 0;
        }
        else {
            //檢查要不要buff
            for (var i = 0; i < ES.length; i++) {
                if (i == 1) continue;//不要buff自己
                if (this.tp == 1) continue;
                if ((ES[i].x - this.x) * (ES[i].x - this.x) + (ES[i].y - this.y) * (ES[i].y - this.y) < 50 * 50)  //50點以內Buff
                    ES[i].buff = 1;
                else ES[i].buff = 0;
            }
            let nf = 0;
            for (var i = 0; i < MS.length; i++) {
                var DD = (this.W + MS[i].W) / 2;
                var batleDD2 = DD * DD;
                var LESS = 0;
                var dist2 = (MS[i].x - this.x) * (MS[i].x - this.x) + (MS[i].y - this.y) * (MS[i].y - this.y);//距離平方
                if (this.tp == 2)//弓箭兵
                {
                    DD = 150;//攻擊最遠距離
                    LESS = (this.W + MS[i].W) + 20;//攻擊最近距離
                }
                if (dist2 < DD * DD && dist2 >= LESS) {
                    nf = 1;
                    this.battle = 1;
                    if (dist2 < batleDD2) //夠接近對手才戰
                        MS[i].battle = 1;
                    this.att[this.att.length] = MS[i];
                    if (this.tp != 1 && this.pt == 1) //底下才是真正的打仗 pt == 1 = 攻擊第2張圖
                    {
                        //計算受傷
                        if (this.buff == 1)
                            nowatt = this.attact + 10;
                        else
                            nowatt = this.attact;
                        MS[i].hp = MS[i].hp - nowatt;
                        ctx.font = "24px Arial";
                        ctx.fillStyle = "black";
                        ctx.fillText("-" + nowatt, MS[i].x + 20, MS[i].y);

                        document.getElementById("audioact").src = `audio/dmg/${Math.floor((Math.random() * 3) + 1)}.mp3`
                        document.getElementById("audioact").play();//音效
                    }
                    if (MS[i].hp <= 0) {
                        if (i == 0) {
                            clearInterval(t);
                            alert("Loss");
                            document.getElementById("status").innerHTML = "失敗";
                            start_btn.onload = function () {
                                ctx.drawImage(bg, 0, 0);
                                ctx.drawImage(start_btn, 500, 300, 200, 200);
                                canvas.addEventListener("click", handleButtonClick, false);
                            }
                            isgo = 0;
                            bg.src = "img/bgt.png";
                            start_btn.src = "img/start_btn.png";
                            window.location.reload();
                        }
                        emoney = emoney + 30;
                        if (MS[i].boss == 1) {
                            emoney = emoney + 70;
                        }
                        MS.splice(i, 1);
                        i = i - 1;
                    }
                }
            }
            if (nf == 0) this.battle = 0;
        }
        if (this.battle == 0) {
            this.prevx = this.x;
            this.prevy = this.y;
            this.att = [];
            this.x = this.x + speedx;
            this.y = this.y + speedy;
            if (this.x > BW) {
                this.x = BW;
            }
            if (this.x < 0) {
                this.x = 0;
            }
        }
    }
    this.draw = function (ctx) {
        if (this.battle == 1) {
            ctx.drawImage(this.aimg[this.apt], this.x - W / 2, this.y - H / 2, W, H);
            this.apt = (this.apt + 1) % this.aimg.length;
        }
        else {
            ctx.drawImage(this.img[this.pt], this.x - W / 2, this.y - H / 2, W, H);
            this.pt = (this.pt + 1) % this.img.length;
        }
        //血條
        ctx.fillStyle = "red";
        ctx.fillRect(this.x - W / 2, this.y - H / 2, parseInt(W * this.hp / this.fullhp), 2);
        if (this.tp == 2 && this.att.length > 0) {
            ctx.strokeStyle = "red";
            for (var ii = 0; ii < this.att.length; ii++) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.att[0].x, this.att[0].y);
                ctx.stroke();
            }
        }
    }
};

class boss extends obj {
    constructor(x, y, speed, W, H, imgname, attactname, hp, tp, weight, side, buff_size) {
        super(x, y, speed, W, H, imgname, attactname, hp, tp, weight, side);
        this.buff_size = buff_size;
        this.isboss = 1;
    }

}
//按鈕執行物件
function go() {
    bg.src = "img/stage3.png";
    money = 0;
    //document.getElementById("money").innerHTML = "coins:" + money;
    ctx.font = "48px serif";
    ctx.fillStyle = "black";
    ctx.fillText("coins: " + money, 1000, 700);
    //ctx.fillText("waves: " + esendcnt, 1000, 730);

    document.addEventListener("keydown", function (event) {
        var code = event.keyCode;
        if (code == 38) {
            DX = MS[1].x;
            DY = 0;
        }
        else if (code == 40) {
            DX = MS[1].x;
            DY = canvas.height;
        }
        else if (code == 37) {
            DX = 0;
            DY = MS[1].y;
        }
        else if (code == 39) {
            DX = MS[1].width;
            DY = MS[1].y;
        }
    });

    canvas.addEventListener("mousedown", function (event) {
        let ex = event.offsetX;
        let ey = event.offsetY;
        if (event.offsetY <= CTLY) {
            DX = event.offsetX;
            DY = event.offsetY;
        }
        //底下X,Y是我估計的，還要改一改
        else if (ex > 16 && ex < 250 && ey > 668 && ey < 800)//步兵
        {
            sends(1);
        }
        else if (ex > 270 && ex < 500 && ey > 668 && ey < 800)//騎兵
        {
            sends(2);
        }
        else if (ex > 520 && ex < 700 && ey > 668 && ey < 800)//弓兵
        {
            sends(3);
        }
    });

    MS[0] = new obj(145, 394, 0, 300, 380, ['base.png'], ['base.png'], 2000, 1, 10, 0);
    ES[0] = new obj(1060, 410, 0, 300, 380, ['enemybase.png'], ['enemybase.png'], 2000, 1, 10, 1);
    MS[1] = new boss(0, 400, 40, 120, 120, ['dio_walk1.png', 'dio_walk2.png'], ['dio_atk1.png', 'dio_atk2.png'], 1200, 0, 10, 0, 80);
    ES[1] = new boss(1200, 400, 40, 120, 120, ['eh_walk1.png', 'eh_walk2.png'], ['eh_atk1.png', 'eh_atk2.png'], 1500, 0, 10, 1, 80);
    //		    obj(x, y, speed, W, H, imgname, attactname, hp, tp, weight, side) 
    var xx = 0;
    for (var i = 2; i <= 3; i++) {
        if (i % 2 == 1) {
            xx = 2;
        } else {
            xx = 0;
        }

        if (xx == 2) {
            MS[i] = new obj(0, Math.floor((Math.random() * 247) + 283), 10, 90, 90, ['archer_r.png', 'archer_r.png'], ['archer_atk1_r.png', 'archer_atk2_r.png'],
                100, 2, 1, 0);
            ES[i] = new obj(1200, Math.floor((Math.random() * 247) + 283), 30, 90, 90,
                ['archer.png', 'archer.png'], ['archer_atk1.png', 'archer_atk2.png'], 100, 2, 1, 1);
        } else {
            MS[i] = new obj(0, Math.floor((Math.random() * 247) + 283), 30, 128, 124, [
                'solder_walk1_r.png', 'solder_walk2_r.png'
            ], ['solder_atk1_r.png', 'solder_atk2_r.png'], 150, 0, 1, 0);
            ES[i] = new obj(1200, Math.floor((Math.random() * 247) + 283), 30, 128, 124, [
                'e_solder_walk1.png', 'e_solder_walk2.png'
            ], ['e_solder_atk1.png', 'e_solder_atk2.png'], 150, 0, 1, 1);
        }
    }//for 
    //gmoney = setInterval(gainmoney, 150);
    t = setInterval(draw, 500);
    tesend = setInterval(function () {
        esends(1)
    }, 3000);


};

function talk(x, y, str, str2) {
    ctx.drawImage(talkimg, 0, 0);
    ctx.font = "bold 40px serif";
    ctx.fillStyle = "#ffffff"
    var len = str.length;
    while (len > 0) {
        var tt = str.substring(0, 25);
        str = str.substring(25);
        len = str.length;
        ctx.fillText(tt, 100, y, 1000);

        var tt2 = str2.substring(0, 25);
        str2 = str2.substring(25);
        len2 = str2.length;
        ctx.fillText(tt2, 100, y + 450, 1000);
        y = y + 50;
    }
}

function gainmoney() {
    
    if (money >= 300) {
        money = 300
    } else {
        money++;
    }
    //document.getElementById("money").innerHTML = "coins:" + money;
    ctx.font = "bold 40px 'Arial Black'";
    ctx.fillStyle = "black";
    ctx.fillText("Coins: " + money + "/300", 680, 750);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("步兵: $10 || 騎兵: $20 || 弓兵: $30", 10, 630);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000000";
    ctx.strokeText("步兵: $10 || 騎兵: $20 || 弓兵: $30",10, 630);
    ctx.fillStyle = "black";
    ctx.fillText(document.getElementById("status").innerHTML, 680, 660);
}

function sends(x) {
    let cost = [0, 10, 20, 30];//出兵的價格
    if (money < cost[x]) {
        document.getElementById("status").innerHTML = "金錢不足";
    } else {
        let num = MS.length;
        if (x == 3) //弓兵
        {
            MS[num] = new obj(0, Math.floor((Math.random() * 247) + 283), 10, 100, 100, ['archer_r.png', 'archer_r.png'], ['archer_atk1_r.png', 'archer_atk2_r.png'], 50, 2, 1, 0);
            document.getElementById("status").innerHTML = "出一隻弓兵:-$30";
        }
        else if (x == 2) { //騎兵
            MS[num] = new obj(0, Math.floor((Math.random() * 247) + 283), 30, 100, 100, ['rider_walk1_r.png', 'rider_walk2_r.png'], ['rider_atk1_r.png', 'rider_atk2_r.png'], 85, 3, 1, 0);
            document.getElementById("status").innerHTML = "出一隻騎兵:-$20";
        }
        else if (x == 1) { //步兵
            MS[num] = new obj(0, Math.floor((Math.random() * 247) + 283), 25, 128, 124, [
                'solder_walk1_r.png', 'solder_walk2_r.png'
            ], ['solder_atk1_r.png', 'solder_atk2_r.png'], 70, 0, 1, 0);
            document.getElementById("status").innerHTML = "出一隻步兵:-$10";
        }

        money = money - cost[x];
        //document.getElementById("status").innerHTML = "出兵成功，派出一個兵，剩下" + money + "元";
        
        //document.getElementById("money").innerHTML = "coins:" + money;
        //ctx.font = "48px serif";
        //ctx.fillStyle="black";
        //ctx.fillText( "coins:" + money,1000,700);
    }


}
function esends(x) {
    let cost = [0, 10, 20, 30]; // 出兵的價格
    let echance = Math.random();
    console.log(echance);
    if (emoney < cost[x])
        return
    let num = ES.length;
    console.log("num = " + num);
    if (echance <= 0.5) {
    ES[num] = new obj(1200, Math.floor((Math.random() * 247) + 283), 25, 128, 124, [
        'e_solder_walk1.png', 'e_solder_walk2.png'
    ], ['e_solder_atk1.png', 'e_solder_atk2.png'], 120, 0, 1);
    } else if (echance > 0.5 && echance <= 0.75) {
        ES[num] = new obj(1200, Math.floor((Math.random() * 247) + 283), 30, 100, 100, [
            'rider_walk1.png', 'rider_walk2.png'
        ], ['rider_atk1.png', 'rider_atk2.png'], 85, 0, 1);
    } else {
        ES[num] = new obj(1200, Math.floor((Math.random() * 247) + 283), 10, 100, 100, [
            'archer.png', 'archer.png'
        ], ['archer_atk1.png', 'archer_atk2.png'], 50, 0, 1);
    }
    emoney = emoney - cost[x];
    esendcnt++;
    //document.getElementById("status").innerHTML = "攻擊波數" + esendcnt;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////
//X軸, Y軸, 速度, 寬, 長, 走路圖/主堡圖, 攻擊圖/主堡空白, HP, tp(0=兵, 1=主堡,2=弓箭兵,3=騎兵), 重量, 陣營(0=我軍, 1=敵軍)//
///////////////////////////////////////////////////////////////////////////////////////////////////////

//物件導向移動物件
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);
    ctx.drawImage(solder_out1, 60, 670);
    ctx.drawImage(solder_out2, 255, 670);
    ctx.drawImage(solder_out3, 530, 670);
    ctx.drawImage(dio, 990, 610);
    gainmoney();
    EX = 0; EY = 0; MX = 0; MY = 0; EW = 0; MW = 0;
    for (var i = 0; i < MS.length; i = i + 1) {
        MX = MX + MS[i].x * MS[i].weight;
        MY = MY + MS[i].y * MS[i].weight;
        MW = MW + MS[i].weight;
    }
    MX = MX / MW;
    MY = MY / MW;
    for (var i = 0; i < ES.length; i = i + 1) {
        EX = EX + ES[i].x * ES[i].weight;
        EY = EY + ES[i].y * ES[i].weight;
        EW = EW + ES[i].weight;
    }
    EX = EX / EW;
    EY = EY / EW;
    for (var i = 0; i < ES.length; i = i + 1) {
        ES[i].go();
        ES[i].draw(ctx);

    }
    for (var i = 0; i < MS.length; i = i + 1) {
        MS[i].go();
        MS[i].draw(ctx);
    }
    /*/顯示系統重心，以後要刪除
    ctx.fillStyle = "rgb(255,0,0)";
    ctx.fillRect(EX, EY, 30, 30);
    ctx.fillStyle = "rgb(0,255,0)";
    ctx.fillRect(MX, MY, 30, 30);
    //////*/
};

function save() {
    var MSstr = JSON.stringify(MS);
    var ESstr = JSON.stringify(ES);
    localStorage.setItem("MS", MSstr);
    localStorage.setItem("ES", ESstr);
}
function load() {
    var MSstr = localStorage.getItem("MS");
    var ESstr = localStorage.getItem("ES");
    var SOBJ;
    if (MSstr !== null) SOBJ = JSON.parse(MSstr);
    else SOBJ = [];
    alert(SOBJ[0].x + "  " + SOBJ[0].y);
    MS[0] = new obj(SOBJ[0].x, SOBJ[0].y, SOBJ[0].speed, SOBJ[0].W, SOBJ[0].H, SOBJ[0].imgname, SOBJ[0].aimgname, SOBJ[0].hp, SOBJ[0].tp, SOBJ[0].weight, SOBJ[0].side);
    MS[0].battle = SOBJ[0].battle;
    MS[0].buff = SOBJ[0].buff;
    MS[0].isboss = SOBJ[0].isboss;
    MS[1] = new boss(SOBJ[1].x, SOBJ[1].y, SOBJ[1].speed, SOBJ[1].W, SOBJ[1].H, SOBJ[1].imgname, SOBJ[1].aimgname, SOBJ[1].hp, SOBJ[1].tp, SOBJ[1].weight, SOBJ[1].side);
    MS[1].battle = SOBJ[1].battle;
    MS[1].buff = SOBJ[1].buff;
    MS[1].isboss = SOBJ[1].isboss;
    for (var i = 2; i < SOBJ.length; i++) {
        MS[i] = new obj(SOBJ[i].x, SOBJ[i].y, SOBJ[i].speed, SOBJ[i].W, SOBJ[i].H, SOBJ[i].imgname, SOBJ[i].aimgname, SOBJ[i].hp, SOBJ[i].tp, SOBJ[i].weight, SOBJ[i].side);
        MS[i].battle = SOBJ[i].battle;
        MS[i].buff = SOBJ[i].buff;
        MS[i].isboss = SOBJ[i].isboss;
    }
    if (ESstr !== null) SOBJ = JSON.parse(ESstr);
    else SOBJ = [];
    ES[0] = new obj(SOBJ[0].x, SOBJ[0].y, SOBJ[0].speed, SOBJ[0].W, SOBJ[0].H, SOBJ[0].imgname, SOBJ[0].aimgname, SOBJ[0].hp, SOBJ[0].tp, SOBJ[0].weight, SOBJ[0].side);
    ES[0].battle = SOBJ[0].battle;
    ES[0].buff = SOBJ[0].buff;
    ES[0].isboss = SOBJ[0].isboss;
    ES[1] = new boss(SOBJ[1].x, SOBJ[1].y, SOBJ[1].speed, SOBJ[1].W, SOBJ[1].H, SOBJ[1].imgname, SOBJ[1].aimgname, SOBJ[1].hp, SOBJ[1].tp, SOBJ[1].weight, SOBJ[1].side);
    ES[1].battle = SOBJ[1].battle;
    ES[1].buff = SOBJ[1].buff;
    ES[1].isboss = SOBJ[1].isboss;
    for (var i = 2; i < SOBJ.length; i++) {
        ES[i] = new obj(SOBJ[i].x, SOBJ[i].y, SOBJ[i].speed, SOBJ[i].W, SOBJ[i].H, SOBJ[i].imgname, SOBJ[i].aimgname, SOBJ[i].hp, SOBJ[i].tp, SOBJ[i].weight, SOBJ[i].side);
        ES[i].battle = SOBJ[i].battle;
        ES[i].buff = SOBJ[i].buff;
        ES[i].isboss = SOBJ[i].isboss;
    }
}
function sh(x) {
    window.location.href = "stage" + x + ".html";
}
