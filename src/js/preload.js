/**
*@description 资源预加载loading
*@name Preload
*@author shijiezou
*---------------------------------
*@default config
*
*var preload = new Preload({
*	sources: {
*		imgs: {
*			source: [
*				"./b2.jpg",
*				"./b1.jpg"
*			],
*			callback: function() {
*				//alert(1);
*			}
*		},
*		audio: {
*			source: [
*				"./a.mp3",
*				"./b.mp3"
*			],
*			callback: function() {
*				//alert(2);
*			}
*
*		},
*		connector: {
*			int1: {
*				url: 'http://localhost1/tcc/index.php?callback=read&city=上海市',
*				jsonp: true
*			},
*			int2: {
*				url: 'http://localhost/tcc/index.php?callback=read&city=深圳市',
*				jsonp: false,
*				callback: function(data){
*					console.log(data);
*				}
*			}
*
*		},
*		imgs2: {
*			source: [
*				"./b3.jpg",
*				"./b4.jpg",
*				"http://7xl041.com1.z0.glb.clouddn.com/OrthographicCamera.png",
*				"http://7xl041.com1.z0.glb.clouddn.com/audio.gif",
*			],
*			callback: function() {
*				//alert(3);
*			}
*		}
*	},
*	wrap: function(completedCount, total){
*		console.log(Math.floor((completedCount / total) * 100));
*	}
*});
*
**/
var Preload = function(opts) {

	"use strict";

	var sources = opts.sources || null,
		connector = opts.connector || null,				//接口数据		
		progress = opts.progress || function(){},		//进度条回调
		completedCount = 0,								//已加载资源总数
		total = 0,										//资源总数
		config,											//请求参数
		id = 0,											//自增ID
		flag = 0,										//标示梯队
		echelon = [],									//梯队加载资源
		echeloncb = [],									//梯队加载后的回调
		echetotal,										//梯队总数
		echelonlen = [],								//梯队长度
		allowType = ['jpg', 'png', 'gif'],				//允许加载的图片类型
		config = {
			xhr: null,
			timeOut: opts.loadingOverTime || 15,			//超时时间
			timeOutCB: opts.loadingOverTimeCB || function(){},	//超时回调
			id: 0,											//超时标示
			max: 3											//超时最高次数
		},
		head = document.getElementsByTagName("head")[0],

		//img标签预加载
		imgNode = [],
		imgNodePSrc = [];

	var init = function() {
		_initData(); //初始化资源参数
		if(connector != null){
			_getData();
		}

		_load(echelon[0], echeloncb[0], echelonlen);	//开始请求资源

	};

	var _createXHR = (function() {
		if (typeof XMLHttpRequest != "undefined") {
			return new XMLHttpRequest();
		} else if (typeof ActiveXObject != "undefined") {
			if (typeof arguments.callee.activeXString != "string") {
				var versions = ["MSXML2.XMLHttp.6.0", "MSXML2.XMLHttp.3.0",
						"MSXML2.XMLHttp"
					],
					i, len;
				for (i = 0, len = versions.length; i < len; i++) {
					try {
						new ActiveXObject(versions[i]);
						arguments.callee.activeXString = versions[i];
						break;
					} catch (ex) {
						//跳过
					}
				}
			}
			return new ActiveXObject(arguments.callee.activeXString);
		} else {
			throw new Error("No XHR object available.");
		}
	})();

	var _initData = function() {
		if(sources === null) return; 

		//梯队总数
		echetotal = Object.getOwnPropertyNames(sources).length;


		//处理梯队资源和回调
		for(var i in sources){

			for(var j = 0, len = sources[i].source.length; j < len; j++){
				echelon.push(sources[i].source[j]);
			}
			echelonlen.push(sources[i].source.length);


			echeloncb.push(typeof sources[i].callback == 'undefined' ? null : sources[i].callback);
		}


		//梯队回调标示位置
		for(var i = 1, len = echelonlen.length; i < len; i++){
			echelonlen[i] = echelonlen[i - 1] + echelonlen[i];
		}

		//资源总数
		total = echelon.length;

		//处理img标签的预加载
		imgNode = document.getElementsByTagName('img');			//获取img标签节点
		for(var i = 0, len = imgNode.length; i < len; i++){
			if(imgNode[i].attributes.pSrc){
				imgNodePSrc[i] = imgNode[i].attributes.pSrc.value;
			}
		}

	};

	//递归加载单个梯队的资源
	var _load = function(res, callback, length) {
		// createTimer(new Date());
		if(id >= length[flag]){
			if(echeloncb[flag] != null){
				echeloncb[flag]();
			}
			++flag;
		}

		if(flag >= echetotal) return;

		if(isImg(res)) {
			var img = new Image();
			// createTimer(new Date());

			var timer = setTimeout(function () {
	            config.timeOutCB();
	        },config.timeOut*1000);

			img.src = res;

			//加载成功后执行
			img.onload = function () {
				//加载成功后清理计时器
				clearTimeout(timer);
				progress(++completedCount, total);

				for(var i = 0, len = imgNodePSrc.length; i < len; i++){
					if(imgNodePSrc[i] == res){
						imgNode[i].src =  imgNodePSrc[i];
						break;
					}
				}

				_load(echelon[++id], callback, length);
			}

			//加载失败后执行
			img.onerror = function() {
				progress(++completedCount, total);
				_load(echelon[++id], callback, length);
			}
		}else{

			config.xhr = _createXHR;
			
			config.xhr.onreadystatechange = function() {
				if (config.xhr.readyState == 4){
					if((config.xhr.status >= 200 && config.xhr.status < 300) || config.xhr.status === 304){

						progress(++completedCount, total);
						_load(echelon[++id], callback, length);
					}
				}else if(config.xhr.status >= 400 && config.xhr.status < 500){
					progress(++completedCount, total);
					_load(echelon[++id], callback, length);
				}
			};

			config.xhr.open("GET", res, true);

			config.xhr.send(null);
		}
		
	};

	//获取接口数据
	var _getData = function(){
		for(var i in connector){
			if(connector[i].jsonp){
				asynGetData(connector[i].url);
			}else{
				syncGetData(connector[i].url, connector[i].callback)
			}
		}
	}

	//判断是否是图片
	var isImg = function(res) {
		var type = res.split('.').pop();
		for (var i = 0, len = allowType.length; i < len; i++) {
			if (type == allowType[i]) return true;
		}
		return false;
	};

	//同步获取数据
	var syncGetData = function(url, callback){
		config.xhr = _createXHR;
		config.xhr.onreadystatechange = function() {
			if (config.xhr.readyState == 4) {
				if ((config.xhr.status >= 200 && config.xhr.status < 300) || config.xhr.status === 304) {
					callback(config.xhr.responseText)
				}
			}
		}

		config.xhr.open("GET", url, true);

		config.xhr.send(null);
	}

	//异步获取数据
	var asynGetData = function(url){
		var script = document.createElement("script");
		script.src = url;
		head.appendChild(script);
	};

	//创建计时器
	var createTimer = function(time){
		setTimeout(function(){
			console.log((new Date() - time));
			console.log(config.timeOut);
			if(new Date() - time < config.timeOut * 1000){
				setTimeout(arguments.callee, 1000);
			}else{
				console.log('超时');
			}
		}, 50);
	};

	init();
};


if (typeof module == 'object') {
    module.exports = Preload;
} else {
    window.Preload = Preload;
}