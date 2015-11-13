/**
 * jsfinger.js  迷你手势库
 * @authors     laonon2012@gmail.com
 * @date        2014.7
 */
;(function() {

	"use strict"

	if (!document.addEventListener) {
		return;
	}

	//检测是否支持原生CustomEvent,否则自定义
	try {
		new CustomEvent('?')
	} catch (e) {
		/*!(C) Andrea Giammarchi -- WTFPL License*/
		this.CustomEvent = function(eventName, defaultInitDict) {

			// the infamous substitute
			function CustomEvent(type, eventInitDict) {
				var event = document.createEvent(eventName);
				if (type != null) {
					initCustomEvent.call(
						event,
						type, (eventInitDict || (
							// if falsy we can just use defaults
							eventInitDict = defaultInitDict
						)).bubbles,
						eventInitDict.cancelable,
						eventInitDict.detail
					);
				} else {
					// no need to put the expando property otherwise
					// since an event cannot be initialized twice
					// previous case is the most common one anyway
					// but if we end up here ... there it goes
					event.initCustomEvent = initCustomEvent;
				}
				return event;
			}

			// borrowed or attached at runtime
			function initCustomEvent(type, bubbles, cancelable, detail) {
				this['init' + eventName](type, bubbles, cancelable, detail);
				'detail' in this || (this.detail = detail);
			}

			// that's it
			return CustomEvent;
		}(
			// is this IE9 or IE10 ?
			// where CustomEvent is there
			// but not usable as construtor ?
			this.CustomEvent ?
			// use the CustomEvent interface in such case
			'CustomEvent' : 'Event',
			// otherwise the common compatible one
			{
				bubbles: false,
				cancelable: false,
				detail: null
			}
		);
	}

	var _util = {};

	_util.supportTouch = ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch;

	/* 检测对象类型
	 * @param: obj {JavaScript Object}
	 * @param: type {String} 以大写开头的 JS 类型名
	 * @return: {Boolean}
	 */
	_util.isType = function(obj, type) {
		return Object.prototype.toString.call(obj).slice(8, -1) === type;
	};

	/* 获取对象类型
	 * @param: obj {JavaScript Object}
	 * @return: {string} 返回值类型
	 */
	_util.getObjType = function(obj) {
		return Object.prototype.toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
	};

	/**
	 * 获取节点类型
	 * @param  {obj} node 待检测节点
	 * @return {number}   节点类型，1元素节点，2属性节点，3文本节点，8注释节点，9文档节点
	 */
	_util.getNodeType = function(node) {
		var type = node.nodeType;
		return type;
	};

	/**
	 * 触摸事件转化为鼠标事件
	 * @type {Object}
	 */
	_util.mobieToPC = {
		'touchstart': 'mousedown',
		'touchmove': 'mousemove',
		'touchend': 'mouseup',
		'touchcancel': 'mouseout'
	};

	/**
	 * 获取移动方向
	 * @param  {Number} x1 X坐标
	 * @param  {Number} y1 Y坐标
	 * @param  {Number} x2 X坐标
	 * @param  {Number} y2 Y坐标
	 */
	_util.getDirection = function(x1, y1, x2, y2) {
		var diffX = Math.abs(x2 - x1);
		var diffY = Math.abs(y2 - y1);
		var directionX = x1 < x2 ? 'Right' : 'Left';
		var directionY = y1 < y2 ? 'Down' : 'Up';
		var direction = diffX <= diffY ? directionY : directionX;
		return direction;
	};

	/**
	 * 获取移动距离
	 * @param  {Number} x1 X坐标
	 * @param  {Number} y1 Y坐标
	 * @param  {Number} x2 X坐标
	 * @param  {Number} y2 Y坐标
	 */
	_util.getDistance = function(x1, y1, x2, y2) {
		var distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
		return distance;
	};

	/**
	 * 获取鼠标当前位置
	 * @param  {object} e 当前事件对象
	 */
	_util.getMouseXY = function(e) {
		var x = 0,
			y = 0;
		if (e.pageX || e.pageY) {
			x = e.pageX;
			y = e.pageY;
		} else if (e.clientX || e.clientY) {
			x = e.clientX +
				document.documentElement.scrollLeft +
				document.body.scrollLeft;
			y = e.clientY +
				document.documentElement.scrollTop +
				document.body.scrollTop;
		}
		return {
			x: x,
			y: y
		};
	};

	var events = ['tap', 'doubleTap', 'longTap', 'singleTap', 'swipe', 'swipeLeft', 'swipeRight', 'swipeDown', 'swipeUp', 'drag', 'zoom', 'zoomOut', 'zoomIn'];

	var gestures = {
		'touch': {
			timer: null
		},
		'tap': {
			timer: null,
			delay: 200
		},
		'singleTap': {
			timer: null,
			delay: 300
		},
		'doubleTap': {
			timer: null,
			delay: 300
		},
		'longTap': {
			timer: null,
			delay: 750
		},
		'swipe': {
			timer: null,
			delay: 300,
			distance: 20
		}
	};

	var detal;
	var touchs = {};
	var myCount = 0;
	var holdTime;

	/**
	 * 重置
	 */
	function reset() {
		touchs = {};
		gestures['touch']['timer'] = null;
		gestures['tap']['timer'] = null;
		gestures['doubletap']['timer'] = null;
		gestures['longTap']['timer'] = null;
		gestures['swipe']['timer'] = null;
	}

	/**
	 * 触发事件
	 * @param  {Object} el     触发元素
	 * @param  {String} type   事件类型
	 * @param  {Object} points  触点
	 */
	function fire(el, type, points) {
		el && el.dispatchEvent && el.dispatchEvent(new CustomEvent(type, {
			detail: {
				touchEvent: type,
				touchPoints: points
			},
			bubbles: true,
			cancelable: false
		}));
	}

	/**
	 * 绑定手势
	 * @param  {String} type   手势类型
	 * @param  {Object} points 触点
	 */
	function bindGesture(type, points) {
		gestures[type]['timer'] = setTimeout(function() {
			fire(touchs.el, events[type], points);
			touchs = {};
		}, gestures[type]['delay']);
	}

	/**
	 * 取消手势
	 * @param  {String} type 手势类型
	 */
	function cancleGesture(type) {
		gestures[type]['timer'] && clearTimeout(gestures[type]['timer']);
		gestures[type]['timer'] = null;
	}

	/**
	 * 手势开始
	 * @param  {object} e 当前事件对象
	 */
	function handleStart(e) {
		e.preventDefault();
		gestures['touch']['timer'] && clearTimeout(gestures['touch']['timer']);
		touchs.startTime = new Date().getTime();
		detal = touchs.startTime - (holdTime || touchs.startTime);
		touchs.isDoubleTap = false;

		if (0 < detal && detal <= gestures['doubleTap']['delay']) {
			touchs.isDoubleTap = true;
		}

		//支持触屏
		if (_util.supportTouch) {
			var touch = e.touches[0];
			var target = touch.target;
			touchs.el = _util.getNodeType(target) == 1 ? target : target.parentNode;
			touchs.x1 = touch.pageX;
			touchs.y1 = touch.pageY;
		} else {
			var target = e.target;
			touchs.el = _util.getNodeType(target) == 1 ? target : target.parentNode;
			touchs.x1 = _util.getMouseXY(e).x;
			touchs.y1 = _util.getMouseXY(e).y;
		}

		holdTime = touchs.startTime;
		
		bindGesture('longTap', {
			x1: touchs.x1,
			y1: touchs.y1,
			x2: touchs.x1,
			y2: touchs.y1
		});
	}

	/**
	 * 手势移动
	 * @param  {object} e 当前事件对象
	 */
	function handleMove(e) {
		e.preventDefault();
		cancleGesture('longTap');

		//支持触屏
		if (_util.supportTouch) {
			var touch = e.touches[0];
			touchs.x2 = touch.pageX;
			touchs.y2 = touch.pageY;
		} else {
			var target = e.target;
			touchs.x2 = _util.getMouseXY(e).x;
			touchs.y2 = _util.getMouseXY(e).y;
		}

		fire(touchs.el, 'drag', {
			x1: touchs.x1,
			y1: touchs.y1,
			x2: touchs.x2,
			y2: touchs.y2
		});
	}

	/**
	 * 手势结束
	 * @param  {object} e 当前事件对象
	 */
	function handleEnd(e) {
		e.preventDefault();
		cancleGesture('longTap');
		if (!'holdTime' in touchs) {
			return;
		}
		var touch;
		//支持触屏
		if (_util.supportTouch) {
			touch = e.touches[0];
		} else {
			touch = e.target;
		}

		touchs.endTime = new Date().getTime();
		touchs.diffTime = touchs.endTime - holdTime;
		touchs.distance = _util.getDistance(touchs.x1, touchs.y1, touchs.x2, touchs.y2);
		touchs.direction = _util.getDirection(touchs.x1, touchs.y1, touchs.x2, touchs.y2);

		//满足swipe的条件,时差和位移同时满足
		if (touchs.diffTime < gestures['swipe']['delay'] && touchs.distance > gestures['swipe']['distance']) {
			fire(touchs.el, 'swipe', {
				x1: touchs.x1,
				y1: touchs.y1,
				x2: touchs.x2,
				y2: touchs.y2
			});
			fire(touchs.el, 'swipe' + touchs.direction, {
				x1: touchs.x1,
				y1: touchs.y1,
				x2: touchs.x2,
				y2: touchs.y2
			});
			touchs = {};

			//tap
		} else {
			fire(touchs.el, 'tap', {
				x1: touchs.x1,
				y1: touchs.y1,
				x2: touchs.x2,
				y2: touchs.y2
			});

			if (touchs.isDoubleTap) {
				fire(touchs.el, 'doubleTap', {
					x1: touchs.x1,
					y1: touchs.y1,
					x2: touchs.x2,
					y2: touchs.y2
				});
				touchs = {};
			} else {
				fire(touchs.el, 'singleTap', {
					x1: touchs.x1,
					y1: touchs.y1,
					x2: touchs.x2,
					y2: touchs.y2
				});
				touchs = {};
			}
		}
	}

	if (_util.supportTouch) {
		document.documentElement.addEventListener('touchstart', handleStart, false);
		document.documentElement.addEventListener('touchmove', handleMove, false);
		document.documentElement.addEventListener('touchend', handleEnd, false);
	} else {
		document.documentElement.addEventListener(_util.mobieToPC['touchstart'], handleStart, false);
		document.documentElement.addEventListener(_util.mobieToPC['touchmove'], handleMove, false);
		document.documentElement.addEventListener(_util.mobieToPC['touchend'], handleEnd, false);
	}
})();
