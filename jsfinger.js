;(function() {

	"use strict"

	var _this = this;

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
	 * 拓展对象
	 * @param  {object} target 目标对象
	 * @param  {object} source 合并源对象
	 * @return {object} 合并后的新对象
	 */
	_util.extend = function() {
		var params = arguments;
		var len = params.length;
		var result = {};

		if (!len) {
			return;
		}
		for (var i = len - 1; i >= 0; i--) {
			var target = arguments[i];
			var source = result;
			for (var property in target) {
				if (target.hasOwnProperty(property)) {
					//如果均为对象，则递归
					if (_isType(target[property], 'Object') && _isType(source[property], 'Object')) {
						arguments.callee(target[property], source[property]);
					}
					//如果source已存在property属性则继续
					if (source.hasOwnProperty(property)) {
						continue;
					} else {
						source[property] = target[property];
					}
				}
			}
		}
		return result;
	};

	_util.mobieToPC = {
		'touchstart': 'mousedown',
		'touchmove': 'mousemove',
		'touchend': 'mouseup',
		'touchcancel': 'mouseout'
	};

	_util.supportTouch = ('ontouchstart' in window);

	_util.getDirection = function(x1, y1, x2, y2) {
		var diffX = Math.abs(x2 - x1);
		var diffY = Math.abs(y2 - y1);
		var directionX = x1 < x2 ? 'right' : 'left';
		var directionY = y1 < y2 ? 'down' : 'up';
		var direction = diffX <= diffY ? directionY : directionX;
		return direction;
	};

	_util.getDistance = function(x1, y1, x2, y2) {
		var distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
		return distance;
	};

	var events = ['tap', 'doubleTap', 'hold', 'singleTap', 'swipe', 'swipeLeft', 'swipeRight', 'swipeDown', 'swipeUp', 'drag', 'zoom', 'zoomOut', 'zoomIn'];

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
		'hold': {
			timer: null,
			delay: 750
		},
		'swipe': {
			timer: null,
			delay: 300,
			distance: 20
		}
	};

	var touchs = {};

	var startTime = 0;

	var diffTime = 0;


	function JsFinger() {

	}

	JsFinger.prototype = {
		init: null,
		reset: null,
		bind: null,
		handleStart: null,
		handleMove: null,
		handleEnd: null
	};

	function reset() {
		touchs = {};
		gestures['touch']['timer'] = null;
		gestures['tap']['timer'] = null;
		gestures['doubletap']['timer'] = null;
		gestures['hold']['timer'] = null;
		gestures['swipe']['timer'] = null;
		startTime = 0;
		diffTime = 0;
	}

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

	function bindGesture(type, points) {
		gestures[type]['timer'] = setTimeout(function() {
			fire(touchs.el, events[type], points);
			touchs = {};
		}, gestures[type]['delay']);
	}

	function cancleGesture(type) {
		gestures[type]['timer'] && clearTimeout(gestures[type]['timer']);
		gestures[type]['timer'] = null;
	}

	//开始
	function handleStart(e) {
		e.preventDefault();
		gestures['touch']['timer'] && clearTimeout(gestures['touch']['timer']);
		touchs.startTime = new Date();

		touchs.detal = startTime - (touchs.holdTime || touchs.startTime);

		if (0 < touchs.detal && touchs.detal <= gesture['doubleTap']['delay']) {
			touchs.isDoubleTap = true;
		}

		var touch = e.touches[0];
		var target = touch.target;
		touchs.el = _util.getNodeType(target) == 1 ? target : target.parentNode;
		touchs.x1 = touch.pageX;
		touchs.y1 = touch.pageY;

		touchs.holdTime = touchs.startTime;

		bindGesture('hold', {
			x1: touchs.x1,
			y1: touchs.y1,
			x2: touchs.x1,
			y2: touchs.y1
		});
	}

	//移动
	function handleMove(e) {
		e.preventDefault();
		cancleGesture('hold');

		var touch = e.touches[0];
		touchs.x2 = touch.pageX;
		touchs.y2 = touch.pageY;

		fire(touchs.el, 'drag', {
			x1: touchs.x1,
			y1: touchs.y1,
			x2: touchs.x2,
			y2: touchs.y2
		});
	}

	//结束
	function handleEnd(e) {
		e.preventDefault();
		cancleGesture('hold');
		if (!'holdTime' in touchs) {
			return;
		}
		var touch = e.touches[0];
		touchs.endTime = new Date();
		touchs.diffTime = touchs.endTime - touchs.holdTime;
		touchs.distance = _util.getDistance(touchs.x1, touchs.y1, touchs.x2, touchs.y2);
		touchs.direction = _util.getDirection(touchs.x1, touchs.y1, touchs.x2, touchs.y2);

		//满足swipe的条件,时差和位移同时满足
		if (touchs.diffTime < gestures['swipe']['delay'] && touchs.distance < gestures['swipe']['distance']) {
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
			console.log(touchs.isDoubleTap);
			if (touchs.isDoubleTap) {
				fire(touchs.el, 'doubleTap', {
					x1: touchs.x1,
					y1: touchs.y1,
					x2: touchs.x2,
					y2: touchs.y2
				});
				touchs = {};
			} else {
				bindGesture('singleTap', {
					x1: touchs.x1,
					y1: touchs.y1,
					x2: touchs.x2,
					y2: touchs.y2
				});
			}
		}
	}

	document.documentElement.addEventListener('touchstart', handleStart, false);
	document.documentElement.addEventListener('touchmove', handleMove, false);
	document.documentElement.addEventListener('touchend', handleEnd, false);

})();
