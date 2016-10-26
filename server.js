
var AV = require('leanengine');

AV.init({
  appId: process.env.LEANCLOUD_APP_ID || 'qTWO8YFMSldMEj8Qk90yTtps-gzGzoHsz',
  appKey: process.env.LEANCLOUD_APP_KEY || 'jK7notkyzP4uBgYhaOgXNu89',
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY || 'WPJ2FwewmINwwfzkkUGGmSE1'
});

// 你可以使用 useMasterKey 在云引擎中开启 masterKey 权限，将会跳过 ACL 和其他权限限制。
AV.Cloud.useMasterKey();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var https = require('https');
var routes = require('./routes/index');
var users = require('./routes/users');
var PORT = process.env.LEANCLOUD_APP_PORT||8070;
var POLLING_INTERVAL = 5000;
var app = express();
var pollingTimer;
var pollingTimerArr = {};
var roomidarr = [];
var fs= require('fs');

app.use(AV.express());

//app.locals.title = '免费10档行情，免费level2行情软件';
app.locals.title = 'office';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);


var sendFirst = function(socket,roomid){

	//联网采集
	https.get("https://app.leverfun.com/timelyInfo/timelyOrderForm?stockCode=" + roomid, function(res) {
		var size = 0;
		var chunks = [];
	  res.on('data', function(chunk){
		  size += chunk.length;
		  chunks.push(chunk);
	  });
	  res.on('end', function(){
		  var data = Buffer.concat(chunks, size);
		  //console.log(data.toString())
			updateSockets(socket,roomid,{
			  content: data.toString()
			});
	  });
	}).on('error', function(e) {
	  console.log("Got error: " + e.message);
	});

	/*
	//非联网情况测试用
	fs.readFile(path.join(__dirname, roomid + '.json'),'utf-8', function (err, data) {
	  if (err) throw err;
	  //console.log(data);

		updateSockets(socket,roomid,{
		  content: data
		});
	});
	*/
};
//pollingLoop
var pollingLoop = function(socket,roomid) {
	var temptime = new Date();
	//console.log(roomid + " : " + roomUser[roomid].length + " ---- " + temptime);
	
	//联网采集
	https.get("https://app.leverfun.com/timelyInfo/timelyOrderForm?stockCode=" + roomid, function(res) {
		var size = 0;
		var chunks = [];
	  res.on('data', function(chunk){
		  size += chunk.length;
		  chunks.push(chunk);
	  });
	  res.on('end', function(){
		  var data = Buffer.concat(chunks, size);
		  //console.log(data.toString())
			updateSockets(socket,roomid,{
			  content: data.toString()
			});

		if (roomUser[roomid] && roomUser[roomid].length && (temptime.getHours() < 15 && temptime.getHours() > 6)) {
			pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL,socket,roomid);
			pollingTimerArr[roomid]=[pollingTimer];
		}
	  });
	}).on('error', function(e) {
	  console.log("Got error: " + e.message);
	});

	/*
	//非联网情况测试用
	fs.readFile(path.join(__dirname, roomid + '.json'),'utf-8', function (err, data) {
	  if (err) throw err;
	  //console.log(data);

		updateSockets(socket,roomid,{
		  content: data
		});
	
	  if (roomUser[roomid] && roomUser[roomid].length && (temptime.getHours() < 15 && temptime.getHours() > 6)) {
		// 7-15点提供实时服务
        pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL,socket,roomid);
		pollingTimerArr[roomid]=[pollingTimer];
      }
	});
	*/

	/*
	roomUser.forEach(function(room){
		console.log(room);
	})*/
};

function formattime(str){
	return	(str>9?'':'0') + str;
}
var updateSockets = function(socket,roomid,data) {
  // 加上最新的更新时间
  //tmptime = new Date(Date.now() + (8 * 60 * 60 * 1000));
  var tmptime = new Date();
  //tmptime.getHours() + ":" + tmptime.getHours();
  //data.time = time.getFullYear()+(time.getMonths()+1)+time.getDate()+(time.getHours()>9?'':'0')+time.getHours()+(time.getMinutes()>9?'':'0')+time.getMinutes()+(time.getSeconds()>9?'':'0')+time.getSeconds();
  data.time = formattime(tmptime.getMonth()) + "-" + formattime(tmptime.getDate()) + " " +
	  formattime(tmptime.getHours()) + ":" + formattime(tmptime.getMinutes()) + ":" + formattime(tmptime.getSeconds());

  data.roomid = roomid;
  // 推送最新的更新信息到所以连接到服务器的客户端
  socket.join(roomid);
  socket.to(roomid).emit('time',data);
  socket.emit('time',data);
  /*
  connectionsArray.forEach(function(tmpSocket) {
    tmpSocket.volatile.emit('notification', data);
  });
  */
};


// -- socket.io  start
var server = http.Server(app);
var io = require('socket.io').listen(server);
var roomUser = {};
io.on('connection', function (socket) {

    // 获取用户当前的url，从而截取出房间id
    var url = socket.request.headers.referer;
    var split_arr = url.split('/');
    var roomid = split_arr[split_arr.length-1] || 'index';
    var user = '';



    socket.on('join', function (username) {
         user = username;
        // 将用户归类到房间
        if (!roomUser[roomid]) {
            roomUser[roomid] = [];
        }
        roomUser[roomid].push(user);
        socket.join(roomid);
        socket.to(roomid).emit('sys', user + ' 加入了聊天室(' + roomUser[roomid].length + '人)');
        //socket.emit('sys',user + ' 加入了房间');
		//发给自己
        socket.emit('sys','欢迎加入股票(' + roomid + ')聊天室(' + roomUser[roomid].length + '人)');

		if (roomidarr.indexOf(roomid) == -1)
		{
			roomidarr.push(roomid);
			console.log(roomidarr + " --- " + (new Date()));
		}

		if (roomUser[roomid].length == 1)
		{
			pollingLoop(socket,roomid)
		}
		else{
			sendFirst(socket,roomid) ;
		}

    });

    // 监听来自客户端的消息
    socket.on('message', function (msg) {
        // 验证如果用户不在房间内则不给发送
        if (roomUser[roomid].indexOf(user)< 0) {  
          return false;
        }
        socket.to(roomid).emit('new message', msg,user);
        socket.emit('new message', msg,"我");
    });

    // 关闭
    socket.on('disconnect', function () {
        // 从房间名单中移除
        socket.leave(roomid, function (err) {
            if (err) {
                log.error(err);
            } else {
                var index = roomUser[roomid].indexOf(user);
                if (index !== -1) {
                    roomUser[roomid].splice(index, 1);
                    socket.to(roomid).emit('sys',user+'退出了房间');
					//appened
					if (roomUser[roomid].length==0)
					{
						//loop閉じる
						if (pollingTimerArr[roomid] && pollingTimerArr[roomid].length == 1)
						{
							clearTimeout(pollingTimerArr[roomid][0]);
						}
						
						var indexroomid = roomidarr.indexOf(roomid);
						roomidarr.splice(indexroomid,1);
						console.log(roomidarr + " --- " + (new Date()));
					}
                } 
            }
        });
    });
});
// -- socket.io end
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

if (!module.parent) {
    // This server is socket server
    server.listen(PORT);
    console.log('chatroom started up on port '+PORT);
}
module.exports = server;
