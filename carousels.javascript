////////////////////////////////////////////////////////////////////////
// CAROUSELS
// Adds carousels to the site, with varying feature sets

/**
 * How to use:
 *
 * HTML:
 * <div class="carousel-container" data-disabledrag data-disabledesktop data-disablemobile data-resetonresize data-disableoverscroll data-startslide="3" data-minimumslide="1" data-maximumslide="3">
 * 	<div class="carousel">
 * 		<div class="carousel-slider">
 * 			<div class="carousel-item"></div>
 * 			...
 * 		</div>
 * 	</div>
 * 	<div class="carousel-indicators">
 * 		<div class="carousel-indicator" data-slide-to="0"></div>
 * 	</div>
 *
 * 	// Optional, to get a scrollbar
 * 	<div class="scrollbar">
 * 		<div class="scrollbar-nub-container">
 * 			<div class="scrollbar-nub"></div>
 * 		</div>
 * 	</div>
 *
 * 	// Optional, to get prev/next buttons
 * 	<div class="carousel-prev"></div>
 *		<div class="carousel-next"></div>
 * </div>
 *
 * ATTRIBUTES
 * Attributes do not always have to take values, sometimes their presence provides their config.
 * data-disabledrag: Stops the carousel responding to touchmove and mouse drag
 * data-prejumptime: Amount of time to delay before jumping slides.  Applies the class .prejump.  Only works if data-disabledrag is present.
 * data-disablesmoothjump: Makes slides jump immediately, both using buttons and when snapping
 * data-disabledesktop: Doesn't set the carousel up on desktop
 * data-disablemobile: Doesn't set the carousel up on mobile
 * data-resetonresize: Watches for window resize and resets all carousels automatically
 * data-disableoverscroll: The Carousel won't allow overscroll at either side
 * data-minimumslide="2": The carousel's minimum slide.  If disableoverscroll is true, it won't scroll past this slide left.  Sets minimum slides for previous button. Useful if you create an overflow: visible carousel and want the left-most to stay out of the carousel container
 * data-maximumslide="4": The carousel's maximum slide.  If disableoverscroll is true, it won't scroll past this slide right.  Sets minimum slides for next button. Useful if you create an overflow: visible carousel and want the left-most to stay out of the carousel container
 * data-startslide="3": The carousel will start here
 *
 * STYLING
 * Style as you wish, but check that your styles work with the library.  Slides are always 100% width of the .carousel, though they can be padded for visual effect.
 *
 * ANIMATING
 * IntersectionObservers are applied to slides, so that they write carouselIntersectionRatioAttribute to the slide
 * at 0, 25, 50, 75 and 100 positions.  You can use this to have CSS apply styles to your slides as they move.
 * e.g. .carousel-item[data-intersectratio='50'] { opacity:0.5; }
 *
 * */

(function () {
	const carouselContainerSelector = '.carousel-container';
	const carouselSelector = '.carousel';
	const carouselSliderSelector = '.carousel-slider';
	const carouselItemSelector = '.carousel-item';
	const carouselItemIndexAttribute = 'data-carouselitem-index';
	const carouselItemIntersectingAttribute = 'data-intersecting';
	const carouselIntersectionRatioAttribute = 'data-intersectratio';
	const carouselIndicatorsContainerSelector = '.carousel-indicators';
	const carouselIndicatorSelector = 'li';
	const carouselIndicatorSlideToProperty = 'data-slide-to';
	const scrollbarContainerSelector = '.scrollbar';
	const scrollbarNubContainerSelector = '.scrollbar-nub-container';
	const prevButtonSelector = '.carousel-prev';
	const nextButtonSelector = '.carousel-next';
	const carouselIndexSelector = 'data-currentslide';
	const slideCountAttribute = 'data-totalslides';
	const carouselScrollingAttribute = 'data-carouselscrolling';

	const carouselReadyClass = 'carousel-ready';
	const activeClassName = 'active';
	const wrapClassname = 'wrapping';
	const wrapStartClassname = 'wrapping-start';
	const wrapEndClassname = 'wrapping-end';
	const isDraggableAttribute = 'data-disabledrag';
	const preJumpTimeAttribute = 'data-prejumptime';
	const preJumpClassname = 'prejump';
	const resetOnResizeAttribute = 'data-resetonresize';
	const disableSmoothJumpAttribute = 'data-disablesmoothjump';
	const disabledDesktopAttribute = 'data-disableddesktop';
	const disabledMobileAttribute = 'data-disabledmobile';
	const disableOverscrollAttribute = 'data-disableoverscroll';
	const minimumSlideAttribute = 'data-minimumslide';
	const maximumSlideAttribute = 'data-maximumslide';
	const startSlideAttribute = 'data-startslide';
	const mobileBreakpoint = 900;

	const windowResizeClassname = 'carousel-window-resize';
	const scrollLockClassName = 'carousel-scroll-lock';
	const acceptableXScrollBeforeDisable = 40;

	const pageResizeDebounceTime = 750;
	var resizeWatchdog;
	var resizableCarousels = [];

	createCarousels();

	/**
	 * Creates carousels for anything with the selector carouselContainerSelector
	 * */
	function createCarousels() {
		const carousels = document.querySelectorAll(carouselContainerSelector);
		Array.prototype.forEach.call(carousels, (carouselContainer) => {
			const carouselDisabledMobile = carouselContainer.getAttribute(disabledMobileAttribute) == 'true';
			const carouselDisabledDesktop = carouselContainer.getAttribute(disabledDesktopAttribute) == 'true';
			if (carouselDisabledMobile && window.innerWidth <= mobileBreakpoint) return;
			if (carouselDisabledDesktop && window.innerWidth > mobileBreakpoint) return;

			checkCapabilities(carouselContainer);
			setCarouselAndItemsWidth(carouselContainer);
			populateIndicators(carouselContainer);
			addScrollbars(carouselContainer);
			addArrowButtons(carouselContainer);
			createIntersectObservers(carouselContainer);

			carouselJumpTo(carouselContainer, carouselContainer.startSlide);
			markAsReady(carouselContainer);

			const carousel = carouselContainer.querySelector(carouselSelector);
			hlpr.addEventListenerMouseAndTouch(carousel, 'mousedown', carouselDown.bind(carousel), true);
			hlpr.registerPageMousemove(carouselPageMove.bind(carouselContainer));
			hlpr.registerPageMouseend(carouselLeave.bind(carousel), true);
		});

		watchPageResize();
	}

	/**
	 * Resets a carousel, such as in the event of a window resize
	 * */
	function resetAllCarousels() {
		const carousels = document.querySelectorAll(carouselContainerSelector);
		Array.prototype.forEach.call(carousels, (carouselContainer) => {
			resetCarousel(carouselContainer);
		});
	}

	/**
	 * Resets a carousel, such as in the event of a window resize
	 * @param {HTMLElement} carouselContainer
	 * */
	function resetCarousel(carouselContainer) {
		setCarouselAndItemsWidth(carouselContainer);
		checkCarouselPosition(carouselContainer);
		carouselJumpTo(carouselContainer, carouselContainer.minimumSlide);
	}

	/**
	 * Watches for the page to resize and resets resizeableCarousels
	 * */
	function watchPageResize() {
		window.addEventListener('resize', () => {
			document.body.classList.add(windowResizeClassname);
			clearTimeout(resizeWatchdog);
			resizeWatchdog = setTimeout(resetRegisteredCarouselsOnPageResize, pageResizeDebounceTime);
		});
	}

	/**
	 * Resets the size of registered carousels
	 * */
	function resetRegisteredCarouselsOnPageResize() {
		document.body.classList.remove(windowResizeClassname);
		resizableCarousels.forEach((carouselContainer) => resetCarousel(carouselContainer));
	}

	/**
	 * Action triggered by the down event
	 * @param {Event} e
	 * */
	function carouselDown(e) {
		e.stopPropagation();
		const carousel = this;
		const carouselSlider = carousel.querySelector(carouselSliderSelector);
		carousel.isDown = true;
		carousel.parentElement.classList.add(activeClassName);
		carousel.startX = hlpr.getEventPageX(e) - carousel.offsetLeft;
		carousel.scrollLeftValue = getCarouselScroll(carouselSlider);
	}

	/**
	 * Action triggered by the scrollbar nub being pressed
	 * @param {Event} e
	 * */
	function scrollbarNubDown(e) {
		e.preventDefault();
		e.stopImmediatePropagation();

		const scrollbarNubContainer = this;
		scrollbarNubContainer.isDown = true;
		scrollbarNubContainer.parentElement.parentElement.classList.add(activeClassName);
		scrollbarNubContainer.startX = hlpr.getEventPageX(e);
		scrollbarNubContainer.startLeft = parseInt(scrollbarNubContainer.style.left || 0);
	}

	/**
	 * Action triggered by the carousel being left (mouse) or mouse up
	 * */
	function carouselLeave() {
		const carousel = this;
		if (!carousel.isDown) return;
		carousel.isDown = false;
		carousel.parentElement.classList.remove(activeClassName);
		snapCarousel(carousel.parentElement);

		document.body.classList.remove(scrollLockClassName);
	}

	/**
	 * Action triggered by the scrollbar nub being left (mouse)
	 * */
	function scrollbarNubLeave() {
		const scrollbarNubContainer = this;
		if (!scrollbarNubContainer.isDown) return;
		scrollbarNubContainer.isDown = false;

		const carouselContainer = scrollbarNubContainer.tpfFindParentByClass(carouselContainerSelector.replace('.', ''));
		carouselContainer.classList.remove(activeClassName);
		snapCarousel(carouselContainer);
	}

	/**
	 * Action triggered by the carousel being moved (touch or mouse)
	 * @param {Event} e
	 * */
	function carouselPageMove(e) {
		e.stopPropagation();

		const carouselContainer = this;
		const carousel = carouselContainer.querySelector(carouselSelector);
		if (!carousel.isDown || !carouselContainer.isDraggable) return;

		const x = hlpr.getEventPageX(e) - carousel.offsetLeft;
		const SCROLL_SPEED = 2;
		const walk = (x - carousel.startX) * SCROLL_SPEED;
		setLeft(carouselContainer, carousel.scrollLeftValue - walk);
		carouselContainer.currentScrollX = getCarouselScroll(carousel.querySelector(carouselSliderSelector));

		if (e.type == 'touchmove' && Math.abs(walk) > acceptableXScrollBeforeDisable) {
			document.body.classList.add(scrollLockClassName);
		}

		scrollbarMoveWithCarousel(carouselContainer);
	}

	/**
	 * Action triggered by the scrollbar nub being moved (touch or mouse)
	 * @param {Event} e
	 * */
	function scrollbarNubMove(e) {
		const scrollbarNubContainer = this;
		if (!scrollbarNubContainer.isDown) return;

		e.stopImmediatePropagation();

		const walk = hlpr.getEventPageX(e) - scrollbarNubContainer.startX;
		const maxMove = scrollbarNubContainer.parentElement.offsetWidth - boxWidth(scrollbarNubContainer).width;
		let position = scrollbarNubContainer.startLeft + walk;
		position = Math.max(0, position);
		position = Math.min(maxMove, position);
		scrollbarNubContainer.style.left = `${position}px`;

		carouselMoveWithScrollbar(scrollbarNubContainer);
	}

	/**
	 * Show the next slide in the carousel
	 * @param {Event} e
	 * */
	function carouselNext(e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		const carouselContainer = this;
		const carousel = carouselContainer.querySelector(carouselSelector);
		const carouselWidth = carousel.offsetWidth;
		const currentIndex = carouselContainer.currentIndex;

		if (currentIndex + 1 <= carouselContainer.maximumSlide) {
			const slideLeft = carouselWidth * (currentIndex + 1);
			carouselScroll(carouselContainer, { left: slideLeft });
		} else {
			const slideLeft = carouselWidth * carouselContainer.minimumSlide;
			carouselContainer.classList.add(wrapClassname);
			carouselContainer.classList.add(wrapStartClassname);
			carouselScroll(carouselContainer, { left: slideLeft });
		}
	}

	/**
	 * Show the previous slide in the carousel
	 * @param {Event} e
	 * */
	function carouselPrev(e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		const carouselContainer = this;
		const carousel = carouselContainer.querySelector(carouselSelector);
		const currentIndex = carouselContainer.currentIndex;
		const carouselWidth = carousel.offsetWidth;

		if (currentIndex - 1 >= carouselContainer.minimumSlide) {
			const slideLeft = carouselWidth * (currentIndex - 1);
			carouselScroll(carouselContainer, { left: slideLeft });
		} else {
			const slideLeft = carouselWidth * carouselContainer.maximumSlide;
			carouselContainer.classList.add(wrapClassname);
			carouselContainer.classList.add(wrapEndClassname);
			carouselScroll(carouselContainer, { left: slideLeft });
		}
	}

	/**
	 * Go to a specific slide in the carousel
	 * @param {HTLElement} carouselContainer
	 * @param {Number} slideNumber
	 * */
	function carouselJumpTo(carouselContainer, slideNumber) {
		const carousel = carouselContainer.querySelector(carouselSelector);
		const carouselWidth = carousel.offsetWidth;
		const requestedItemLeft = carouselWidth * slideNumber;

		carouselScroll(carouselContainer, { left: requestedItemLeft });
	}

	/**
	 * Scrolls a carousel to a particular position, adding properties as necessary
	 * @param {HTMLElement} carouselContainer
	 * @param {ScrollBehavior} properties
	 * */
	function carouselScroll(carouselContainer, properties) {
		// Cancel if the scroll is no different
		if (carouselContainer.currentScrollX == properties.left) return;

		// Add a pre-jump hook if set
		let time = 0;
		if (typeof carouselContainer.preJumpTime == 'number' && carouselContainer.preJumpTime > 0) {
			carouselContainer.classList.add(preJumpClassname);
			time = carouselContainer.preJumpTime;
		}

		carouselContainer.currentScrollX = properties.left;
		setTimeout(finishCarouselScroll.bind(this, carouselContainer, properties), time);
	}

	/**
	 * Finishes, enacts the scrolls for a carousel
	 * @param {HTMLElement} carouselContainer
	 * @param {ScrollBehavior} properties
	 * */
	function finishCarouselScroll(carouselContainer, properties) {
		carouselWatchScroll(carouselContainer);
		setLeft(carouselContainer, properties.left);
		carouselContainer.classList.remove(preJumpClassname); // Only called if relevant
	}

	/**
	 * Check for carousel capabilities
	 * @param {HTMLElement} carouselContainer
	 * */
	function checkCapabilities(carouselContainer) {
		const carouselItems = carouselContainer.querySelectorAll(carouselItemSelector);

		carouselContainer.setAttribute(slideCountAttribute, carouselItems.length);

		if (carouselContainer.hasAttribute(isDraggableAttribute)) {
			carouselContainer.isDraggable = false;

			if (carouselContainer.hasAttribute(preJumpTimeAttribute)) {
				carouselContainer.preJumpTime = parseInt(carouselContainer.getAttribute(preJumpTimeAttribute));
			}
		} else {
			carouselContainer.isDraggable = true;
		}

		if (carouselContainer.hasAttribute(disableSmoothJumpAttribute)) carouselContainer.canSmoothJump = false;
		else carouselContainer.canSmoothJump = true;

		if (carouselContainer.hasAttribute(disableOverscrollAttribute)) carouselContainer.canOverscroll = false;
		else carouselContainer.canOverscroll = true;

		// Start Slide
		if (carouselContainer.hasAttribute(startSlideAttribute)) {
			carouselContainer.startSlide = carouselContainer.getAttribute(startSlideAttribute);
		} else carouselContainer.startSlide = 0;

		// Minimum Slide
		if (carouselContainer.hasAttribute(minimumSlideAttribute)) {
			carouselContainer.minimumSlide = parseInt(carouselContainer.getAttribute(minimumSlideAttribute));
		} else {
			carouselContainer.minimumSlide = 0;
		}

		// Maximum Slide
		if (carouselContainer.hasAttribute(maximumSlideAttribute)) {
			carouselContainer.maximumSlide = Math.min(
				carouselItems.length - 1,
				parseInt(carouselContainer.getAttribute(maximumSlideAttribute))
			);
		} else {
			carouselContainer.maximumSlide = carouselItems.length - 1;
		}

		// Watch for page resize
		if (carouselContainer.hasAttribute(resetOnResizeAttribute)) {
			carouselContainer.classList.add(windowResizeClassname);
			resizableCarousels.push(carouselContainer);
		}
	}

	/**
	 * Sets the width of carouselItems based on the number of items
	 * @param {HTMLElement} carouselContainer
	 * */
	function setCarouselAndItemsWidth(carouselContainer) {
		let carousel = carouselContainer.querySelector(carouselSelector);
		let carouselItems = carousel.querySelectorAll(carouselItemSelector);
		let width = carousel.offsetWidth;

		Array.prototype.forEach.call(carouselItems, (carouselItem, index) => {
			carouselItem.style.minWidth = width + 'px';
			carouselItem.setAttribute(carouselItemIndexAttribute, index);
		});
	}

	/**
	 * Takes a nub template and creates for all carousel items
	 * @param {HTMLElement} carouselContainer
	 * */
	function populateIndicators(carouselContainer) {
		let carouselItems = carouselContainer.querySelectorAll(carouselItemSelector);
		let nubContainer = carouselContainer.querySelector(carouselIndicatorsContainerSelector);

		if (nubContainer) {
			let nubTemplate = nubContainer.querySelector(carouselIndicatorSelector);
			nubContainer.removeChild(nubTemplate);
			for (let x = 0; x < carouselItems.length; x++) {
				let newNub = nubTemplate.cloneNode(true);
				newNub.setAttribute(carouselIndicatorSlideToProperty, x);
				if (x === 0) newNub.classList.add(activeClassName);
				hlpr.addEventListenerMouseAndTouch(newNub, 'click', carouselJumpTo.bind(this, carouselContainer, x));
				nubContainer.appendChild(newNub);
			}
		}
	}

	/**
	 * Sets the active indicator's class
	 * */
	function setIndicatorActive(carouselContainer, activeIndex) {
		let indicators = carouselContainer.querySelectorAll(carouselIndicatorSelector);
		Array.prototype.forEach.call(indicators, (indicator) => {
			if (indicator.getAttribute(carouselIndicatorSlideToProperty) == activeIndex)
				indicator.classList.add(activeClassName);
			else indicator.classList.remove(activeClassName);
		});
	}

	/**
	 * Adds scrollbars to a carousel if .scrollbar detected
	 * @param {HTMLElement} carousel
	 * */
	function addScrollbars(carouselContainer) {
		const carouselItemsLength = carouselContainer.querySelectorAll(carouselItemSelector).length;
		const scrollbarElement = carouselContainer.querySelector(scrollbarContainerSelector);
		if (scrollbarElement && carouselItemsLength > 1) {
			const scrollbarNubContainer = scrollbarElement.querySelector(scrollbarNubContainerSelector);

			// Listen
			hlpr.addEventListenerMouseAndTouch(
				scrollbarNubContainer,
				'mousedown',
				scrollbarNubDown.bind(scrollbarNubContainer),
				true
			);
			registerPageMousemove(scrollbarNubMove.bind(scrollbarNubContainer));
			registerPageMouseend(scrollbarNubLeave.bind(scrollbarNubContainer));

			// Resize
			const scrollWidth = carouselContainer.querySelector(carouselSelector).scrollWidth;
			if (scrollWidth > 1250) {
				scrollbarNubContainer.style.width = '20%';
			}
			if (scrollWidth > 1000) {
				scrollbarNubContainer.style.width = '40%';
			}
			if (scrollWidth > 800) {
				scrollbarNubContainer.style.width = '40%';
			}
		}
	}

	/**
	 * Adds arrow buttons to a carousel if .nav-arrows is detected
	 * @param {HTMLElement} carouselContainer
	 * */
	function addArrowButtons(carouselContainer) {
		const carouselItemsLength = carouselContainer.querySelectorAll(carouselItemSelector).length;

		const prevButton = carouselContainer.querySelector(prevButtonSelector);
		if (prevButton && carouselItemsLength > 1) {
			prevButton.setAttribute('title', 'Previous carousel item');
			hlpr.addEventListenerMouseAndTouch(prevButton, 'click', carouselPrev.bind(carouselContainer), true);
		}

		const nextButton = carouselContainer.querySelector(nextButtonSelector);
		if (nextButton && carouselItemsLength > 1) {
			nextButton.setAttribute('title', 'Next carousel item');
			hlpr.addEventListenerMouseAndTouch(nextButton, 'click', carouselNext.bind(carouselContainer), true);
		}
	}

	/**
	 * Moves the scrollbar with the carousel as it is dragged
	 * @param {HTMLElement} carouselContainer
	 * @param {String} nubPosition
	 * */
	function scrollbarMoveWithCarousel(carouselContainer, nubPosition) {
		const scroller = carouselContainer.querySelector(scrollbarContainerSelector);
		if (!scroller) return;

		const carousel = carouselContainer.querySelector(carouselSelector);
		const carouselSlider = carousel.querySelector(carouselSliderSelector);
		const scrollableWidth = carousel.scrollWidth;
		let percentageScrolled = getCarouselScroll(carouselSlider) / scrollableWidth;
		percentageScrolled = Math.max(0, percentageScrolled);
		percentageScrolled = Math.min(1, percentageScrolled);

		const scrollbarNubContainer = carouselContainer.querySelector(scrollbarNubContainerSelector);
		const scrollbarNubContainerWidth = boxWidth(scrollbarNubContainer).width;
		const nubScrollableWidth = scroller.offsetWidth - scrollbarNubContainerWidth;
		const left = nubScrollableWidth * percentageScrolled;
		if (nubPosition == 'start') {
			scrollbarNubContainer.style.left = `0px`;
		} else if (nubPosition == 'end') {
			scrollbarNubContainer.style.left = `${nubScrollableWidth}px`;
		} else {
			scrollbarNubContainer.style.left = `${left}px`;
		}
	}

	/**
	 * Moves the carousel with the scrollbar as it is dragged
	 * @param {HTMLElement} scrollbarNubContainer
	 * */
	function carouselMoveWithScrollbar(scrollbarNubContainer) {
		const carouselContainer = scrollbarNubContainer.tpfFindParentByClass(carouselContainerSelector.replace('.', ''));
		const carousel = carouselContainer.querySelector(carouselSelector);
		const carouselScrollableWidth = carousel.scrollWidth - carousel.parentElement.offsetWidth;
		const nubPercentage =
			parseInt(scrollbarNubContainer.style.left) /
			(scrollbarNubContainer.parentElement.offsetWidth - boxWidth(scrollbarNubContainer).width);

		carouselScroll(carouselContainer, { left: carouselScrollableWidth * nubPercentage });
	}

	/**
	 * Watches for scrolling and scrollend
	 * @param {HTMLElement} carouselContainer
	 * */
	function carouselWatchScroll(carouselContainer) {
		const pingEvery = 50;
		const carouselSlider = carouselContainer.querySelector(carouselSliderSelector);
		carouselContainer.scrollWatchdogScrollLeft = getCarouselScroll(carouselSlider);

		clearInterval(carouselContainer.scrollWatchdog);
		carouselContainer.scrollWatchdog = setInterval(() => {
			const carouselScrollLeft = getCarouselScroll(carouselSlider);
			if (carouselContainer.scrollWatchdogScrollLeft != carouselScrollLeft) {
				carouselContainer.setAttribute(carouselScrollingAttribute, 'true');
				carouselContainer.scrollWatchdogScrollLeft = carouselScrollLeft;
			} else {
				carouselContainer.setAttribute(carouselScrollingAttribute, 'false');
				clearInterval(carouselContainer.scrollWatchdog);
				checkCarouselPosition(carouselContainer);
			}
		}, pingEvery);
	}

	/**
	 * Find the closest slide to the viewport
	 * @param {HTMLElement} carouselContainer
	 * */
	function getClosestSlide(carouselContainer) {
		const carousel = carouselContainer.querySelector(carouselSelector);
		const carouselWidth = carousel.offsetWidth;
		const carouselBounds = carousel.getBoundingClientRect();
		const carouselItemChildren = carousel.querySelectorAll(carouselItemSelector);

		let closestValue = 10000;
		let closestSlideIndex = 0;
		let closestSlide = carouselItemChildren[0];
		let returnableLeft = 0;
		Array.prototype.forEach.call(carouselItemChildren, (item, index) => {
			const itemBounds = item.getBoundingClientRect();
			let comparisonValue = Math.abs(itemBounds.left - carouselBounds.left);
			if (comparisonValue <= closestValue) {
				closestSlideIndex = index;
				closestSlide = item;
				closestValue = comparisonValue;
				returnableLeft = carouselWidth * index;
			}
		});

		return { index: closestSlideIndex, slide: closestSlide, left: returnableLeft };
	}

	/**
	 * Snaps the carousel to the nearest slide, if needs be
	 * @param {HTMLElement} carouselContainer
	 * */
	function snapCarousel(carouselContainer) {
		let closestSlide = getClosestSlide(carouselContainer);
		carouselScroll(carouselContainer, { left: closestSlide.left });
	}

	/**
	 * Determines the position of the carousel, to snap
	 * @param {HTMLElement} carouselContainer
	 * */
	function checkCarouselPosition(carouselContainer) {
		const carousel = carouselContainer.querySelector(carouselSelector);
		const carouselItems = carouselContainer.querySelectorAll(carouselItemSelector);
		const carouselSlider = carouselContainer.querySelector(carouselSliderSelector);

		// Set the active slide
		let closestSlide = getClosestSlide(carouselContainer);
		setIndicatorActive(carouselContainer, closestSlide.index);
		carouselContainer.currentIndex = closestSlide.index;
		carouselContainer.setAttribute(carouselIndexSelector, closestSlide.index + 1);

		// Check position
		setTimeout(() => {
			const carouselScrollLeft = getCarouselScroll(carouselSlider);
			const carouselItemWidth = carousel.querySelector(carouselItemSelector).offsetWidth;

			carouselContainer.classList.remove('start');
			carouselContainer.classList.remove('end');
			carouselContainer.classList.remove(wrapClassname);
			carouselContainer.classList.remove(wrapStartClassname);
			carouselContainer.classList.remove(wrapEndClassname);

			var snapPoint = 'none';
			if (carouselScrollLeft < carouselItemWidth / 2) {
				carouselContainer.classList.add('start');
				snapPoint = 'start';
			} else if (carouselScrollLeft >= carouselItemWidth * (carouselItems.length - 1)) {
				carouselContainer.classList.add('end');
				snapPoint = 'end';
			}

			carouselContainer.currentScrollX = carouselScrollLeft;
			scrollbarMoveWithCarousel(carouselContainer, snapPoint);
		}, 350);
	}

	/**
	 * Sets the carousel ready
	 * @param {HTMLElement} carouselContainer
	 * */
	function markAsReady(carouselContainer) {
		carouselContainer.classList.add(carouselReadyClass);
	}

	/**
	 * Sets an intersect observer so we can animate more interestingly
	 * @param {HTMLElement} carousel
	 * @param {HTMLElement} carouselItem
	 * */
	function createIntersectObservers(carouselContainer) {
		const carousel = carouselContainer.querySelector(carouselSelector);
		const carouselItems = carouselContainer.querySelectorAll(carouselItemSelector);

		let options = {
			root: carousel,
			rootMargin: '-10px',
			threshold: [0, 0.25, 0.5, 0.75, 0.9],
		};

		Array.prototype.forEach.call(carouselItems, (carouselItem) => {
			carouselItem.isIntersecting = false;
			let observer = new IntersectionObserver((intersection) => {
				let intersectionInfo = intersection[0];
				if (intersectionInfo.isIntersecting && !carouselItem.isIntersecting) {
					carouselItem.isIntersecting = true;
					carouselItem.setAttribute(carouselItemIntersectingAttribute, true);
				} else if (!intersectionInfo.isIntersecting && carouselItem.isIntersecting) {
					carouselItem.isIntersecting = false;
					carouselItem.setAttribute(carouselItemIntersectingAttribute, false);
				}

				let ratio = intersectionInfo.intersectionRatio;
				if (ratio > 0.88) {
					carouselItem.setAttribute(carouselIntersectionRatioAttribute, 100);
				} else if (ratio > 0.75) {
					carouselItem.setAttribute(carouselIntersectionRatioAttribute, 75);
				} else if (ratio > 0.5) {
					carouselItem.setAttribute(carouselIntersectionRatioAttribute, 50);
				} else if (ratio > 0.25) {
					carouselItem.setAttribute(carouselIntersectionRatioAttribute, 25);
				} else {
					carouselItem.setAttribute(carouselIntersectionRatioAttribute, 0);
				}
			}, options);
			observer.observe(carouselItem);
		});
	}

	/**
	 * Sets the left / transform for a carousel
	 * @param {HTMLElement} carouselContainer
	 * @param {Number} left
	 * */
	function setLeft(carouselContainer, left) {
		const canOverscroll = carouselContainer.canOverscroll;
		const actuallyYouCanOverscrollThisMuch = 10;

		if (!canOverscroll) {
			const carousel = carouselContainer.querySelector(carouselSelector);
			const minimumSlideLeft = carouselContainer.minimumSlide * carousel.offsetWidth - actuallyYouCanOverscrollThisMuch;
			const maximumSlideLeft = carouselContainer.maximumSlide * carousel.offsetWidth + actuallyYouCanOverscrollThisMuch;
			left = Math.max(minimumSlideLeft, left);
			left = Math.min(maximumSlideLeft, left);
		}

		const slider = carouselContainer.querySelector(carouselSliderSelector);
		slider.style.transform = `translate3D(${-1 * left}px, 0, 0)`;
	}

	/**
	 * Gets the scroll / transform position of the carousel
	 * @param {HTMLElement} carouselSlider
	 * */
	function getCarouselScroll(carouselSlider) {
		const style = getComputedStyle(carouselSlider);
		var matrix = new WebKitCSSMatrix(style.transform);
		return -1 * matrix.m41;
	}

	/**
	 * Export
	 */
	window.crsl = {
		createCarousels: createCarousels,
		resetAllCarousels: resetAllCarousels,
	};
})();
