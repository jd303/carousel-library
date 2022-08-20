////////////////////////////////////////////////////////////////////////
// HELPERS

(function () {
	const supportsTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints;
	const eventTranslater = {
		click: { mouse: 'click', touch: 'touchend' },
		mousedown: { mouse: 'mousedown', touch: 'touchstart' },
		mouseup: { mouse: 'mouseup', touch: 'touchend' },
		mousemove: { mouse: 'mousemove', touch: 'touchmove' },
		mouseenter: { mouse: 'mouseenter', touch: 'touchstart' },
		mouseleave: { mouse: 'mouseleave', touch: 'touchend' },
		change: { mouse: 'change', touch: 'change' },
	};

	/**
	 * Helper: Gets a box's width
	 * @param {HTMLElement} e
	 * */
	function boxWidth(element) {
		let computedStyle = getComputedStyle(element);

		let elementHeight = element.clientHeight;
		let elementWidth = element.clientWidth;
		elementHeight -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
		elementWidth -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);

		return { height: elementHeight, width: elementWidth };
	}

	// Apply both touch and mouse events, and let the handler preventDefault if needs be
	function addEventListenerMouseAndTouch(element, mouseEvent, callback, passive) {
		const eventNames = eventTranslater[mouseEvent];
		const options = passive ? { passive: true } : {};
		if (supportsTouch) {
			element.addEventListener(eventNames.touch, callback, options);
		}
		element.addEventListener(eventNames.mouse, callback, options);
	}

	function registerPageMouseend(callback, passive) {
		addEventListenerMouseAndTouch(document.body, 'mouseup', callback, passive);
		addEventListenerMouseAndTouch(document.body, 'mouseleave', callback, passive);
	}

	function registerPageMousemove(callback, passive) {
		addEventListenerMouseAndTouch(document.body, 'mousemove', callback, passive);
	}

	function getEventPageX(e) {
		return (e.touches && e.touches[0] && e.touches[0].pageX) || e.pageX;
	}

	Element.prototype.tpfFindParentByClass = function (classname) {
		let base = this;
		let parent = this.parentElement;

		if (!parent) return false;
		if (parent.classList.contains(classname)) return parent;
		return parent.tpfFindParentByClass(classname);
	};

	/**
	 * Used to solve a bug with iOS scroll-behavior.  Platform testing is poor practice, but Safari implements scroll-behavior with a bug, so we cannot use feature testing to solve.
	 * */
	function iOS() {
		return ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform);
	}

	/**
	 * Export
	 */
	window.hlpr = {
		boxWidth: boxWidth,
		addEventListenerMouseAndTouch: addEventListenerMouseAndTouch,
		registerPageMouseend: registerPageMouseend,
		registerPageMousemove: registerPageMousemove,
		getEventPageX: getEventPageX,
		iOS: iOS,
	};
})();
