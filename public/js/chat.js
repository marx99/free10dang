$(function () {
    var username = (new Date()).getMilliseconds(); //  prompt('请输入昵称');
    //$('.name').html(username)
    var input = $('.inputMessage');
    // 默认链接到渲染页面的服务器
    var socket = io();
    function scrollToBottom () {
        //$('#chat-area').scrollTop($('#chat-area')[0].scrollHeight);
    };
    function getColor (proClose,newPrice) {
		if (newPrice==0)
		{
			return "gray";
		}
        if (proClose < newPrice)
        {
			return "red";
        }
		else if (proClose > newPrice)
		{
			return "green";
		}
		else{
			return "gray";
		}
    };
	
    function getSzSh (stockid) {
		if (stockid.charAt(0)=="6")
		{
			return "sh" + stockid;
		}
		else
		{
			return "sz" + stockid;
		}
    };

	var getnewsina = function(){
		//alert("http://image.sinajs.cn/newchart/min/n/" + getSzSh($('#hidstockno').val()) + ".gif?t=" + new Date());
		$("#imgstock").attr("src","http://image.sinajs.cn/newchart/min/n/" + getSzSh($('#hidstockno').val()) + ".gif?t=" + new Date());
		//$("#btntest").val(new Date());
	};

	//定时刷新最新图片
	setInterval(getnewsina,100000);
	
	$("#danmu").danmu({
		height: 300,  //弹幕区高度
		width: 540,   //弹幕区宽度
		zindex :100,   //弹幕区域z-index属性
		speed:20000,      //滚动弹幕的默认速度，这是数值值得是弹幕滚过每672像素所需要的时间（毫秒）
		sumTime:195535,   //弹幕流的总时间
		danmuLoop:false,   //是否循环播放弹幕
		defaultFontColor:"#FFFFFF",   //弹幕的默认颜色
		fontSizeSmall:16,     //小弹幕的字号大小
		FontSizeBig:24,       //大弹幕的字号大小
		opacity:"0.9",          //默认弹幕透明度
		topBottonDanmuTime:6000,   // 顶部底部弹幕持续时间（毫秒）
		SubtitleProtection:false,     //是否字幕保护
		positionOptimize:false,         //是否位置优化，位置优化是指像AB站那样弹幕主要漂浮于区域上半部分

		maxCountInScreen: 40,   //屏幕上的最大的显示弹幕数目,弹幕数量过多时,优先加载最新的。
		maxCountPerSec: 10      //每分秒钟最多的弹幕数目,弹幕数量过多时,优先加载最新的。
	});
	
	$('#danmu').danmu('danmuResume');

	$("#stockno").keydown(function (e) {
 			//$('.error').text(e.which);
       if (e.which === 13) {
			inputcheck($('#stockno').val());
		}
	});
	$("#btngo").click(function () {
		inputcheck($('#stockno').val());
	});
	//输入check
	function inputcheck(strvalue){
		//alert(strvalue);
		strvalue = $.trim(strvalue);
		
		if (strvalue.length != 6)
		{	
			$('.error').text("请输入6位数字股票代码。");
			return false;
		}
		var reg = /^[0-9]*$/g;
		if (!reg.test(strvalue)){
			$('.error').text("请输入6位数字股票代码。");
			return false;
		}

		if (!stocklist[strvalue])
		{
			$('.error').text("不支持的股票代码。");
			return false;
		}

		window.location.href='/' + strvalue;
	};

    socket.on('connect', function () {
        var name = username;//$('.name').text() ||'匿名';
        socket.emit('join',name);
    })
    socket.on('sys', function (msg) {
        //$('.messages').append('<p>'+user+'： '+msg+'</p>');
        // 滚动条滚动到底部
        //scrollToBottom();
    });
    socket.on('new message', function (msg,user) {
        //$('.messages').append('<p>'+user+'： '+msg+'</p>');
        // 滚动条滚动到底部
        //scrollToBottom();
		
	//发弹幕
	var color="green";
	var size="0";
	var position = "0";//滚动
	var time = $('#danmu').data("nowTime")+1;
	var text_obj='{ "text":"'+msg+'","color":"'+color+'","size":"'+size+'","position":"'+position+'","time":'+time+'}';

	var new_obj=eval('('+text_obj+')');
	$('#danmu').danmu("addDanmu",new_obj);
    });
    socket.on('time', function (data) {
        $('.time').text(data.time);
        $('.roomid').text(stocklist[data.roomid] + " (" + data.roomid + ")");
		var jsondata = jQuery.parseJSON(data.content);
	$("img").attr("src","http://image.sinajs.cn/newchart/min/n/" + getSzSh(data.roomid) + ".gif");
        $('#hidstockno').val(data.roomid);
        //$('.content').text("");
		//现价
        //$('.match').text(jsondata.data.match);
		//昨收
		var a = jsondata.data.preClose;
		//涨幅（差额）
		var a1 = (jsondata.data.match - a).toFixed(2);
		//涨幅（百分比）
		var a2 = (a1*100/a).toFixed(2) + "%";
		//文字颜色
		var fontcolor = "";
		if (a1<0)
		{
			fontcolor = "green";
		}else if (a1>0)
		{
			a1 = "+" + a1;
			a2 = "+" + a2;
			fontcolor = "red";
		}

		var match = "<font size='6' color = '" + fontcolor + "'>" + jsondata.data.match + "</font>";
		var zhangfu1 = "&nbsp;<font color = '" + fontcolor + "'>" + a1 + "</font>&nbsp;";
		var zhangfu2 = "&nbsp;<font color = '" + fontcolor + "'>" + a2 + "</font>";

		//现价
		$('.match').html(match + zhangfu1 + zhangfu2); //text(jsondata.data.match);

		var temphtml = "";
		var i ;
		for(i=0 ;i<=10;i++){
			if (jsondata.data.buyPankou.length>i)
			{
				var buynum = "<td width='40'><font color='black'>买" + num10[i+1] + "</font></td>";
				var buyprice = "<td width='50'><font color='" + getColor(a.toFixed(2),jsondata.data.buyPankou[i].price) + "'><b>" + jsondata.data.buyPankou[i].price + "</b></font></td>";
				var buyvolume = "<td width='50' align='right'>" + jsondata.data.buyPankou[i].volume + "&nbsp;</td>";
				var sellnum = "<td width='40'><font color='black'>卖" + num10[i+1] + "</font></td>";
				var sellprice = "<td width='50'><font color='" + getColor(a.toFixed(2),jsondata.data.sellPankou[i].price) + "'><b>" + jsondata.data.sellPankou[i].price + "</b></font></td>";
				var sellvolume = "<td width='50' align='right'>" + jsondata.data.sellPankou[i].volume + "&nbsp;</td>";

				temphtml += "<tr>" + sellnum + sellprice + sellvolume + buynum + buyprice + buyvolume + "</tr>" ;
				//$('.content').append('<p>'+jsondata.data.buyPankou[i].price+'</p>');
				//$('#datacontent').append('<p>'+jsondata.data.buyPankou[i].price+'</p>');
			}
		}
		$('#datacontent').text("");
		//$('#datacontent').append("<table border='0'><th width='40'>no</th><th width='50'>buy</th><th width='50'>valume</th><th width='40'>no</th><th width='50'>sell</th><th width='50'>valume</th>" + temphtml + "</table>");
		$('#datacontent').append("<table border='0'>" + temphtml + "</table>");
        //$('.time').value('<p>'+data.time+'</p>');
        // 滚动条滚动到底部
        //scrollToBottom();
    });
    input.on('keydown',function (e) {
        if (e.which === 13) {
            var message = $(this).val();
            if (!message) {
                return ;
            }
            socket.send(message);
            $(this).val('');
        }
    });
});
