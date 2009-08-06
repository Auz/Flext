/*
* Flext - A Mootools Based Flexible TextArea Class
* version 1.1 - for mootools 1.2
* by Graham McNicoll
* 
* Copyright 2008-2009 - Education.com
* License:	MIT-style license.
*
* Features:
*  - Grows text areas when needed
*  - Can set a max height to grow to
*  - Grows parents if they have a fixed height
*  - Ghost text replacement
*  - Text input emulation (enter can submit form, instead of new line)
*
* Usage:
*
*  include the source somewhere on your page. Textareas must have the class name: 'flext' 
*  for the class to watch them. Use additional class names to trigger features.
* 
*   'growme' -  grow the text area
*   'maxheight-[num]' - the max height to grow in pixels (replaces [num] )
*   'stopenter' - stop the enter key
*   'entersubmits' - submit the form when enter is pressed
*   'replaceghosttext' - tries to use the ghosted text features
*   'growparents' - grow the parent elements if needed
*
*  if replaceghosttext is on, then you need to add two more attributes to the textarea. 
*  'ghosttext' contains a copy of the original ghost text (needed for matching initial conditions),
*  and 'ghostclass' which contains a class name to remove when the ghosting is removed (which 
*  is used to remove ghosting color).
* 
* Examples: 
*
*  A simple growing text area: -
*
*    <textarea name='mytext' class='flext growme maxheight-200' ></textarea>
*
*   It will find this text area by the class name, 'flext', and the 'growme' 
*   class will tell it to grow until the max size, as given by the 'maxheight-[num]' 
*   class (integer, in pixels).
*
*  Textarea which will grow the parent elements (if needed) -
* 
*    <textarea name='mytext' class='flext growme growparents maxheight-200' ></textarea>
*
*   This is the same as above, except it will also grow any parent elements which 
*   have fixed heights when the textarea expands ('growparents').
*
*
* Adv. example:
* 
*  <textarea name='mytext' class='flext growme stopenter entersubmits replaceghosttext ghost-text growparents maxheight-60' ghosttext='enter something here' ghostclass='ghost-text'>
*    enter something here
* </textarea>
*
*   This example not only grows, but simulates a text input, in that 'enter' 
*   will not be passed to the textarea ('stopenter') instead it will submit 
*   the form ('entersubmits'). It also has ghosted text replacement and class 
*   changing. When this textarea receives focus, it will remove the default 
*   text (ghosttext property), and remove the class as specified by the 
*   ghostclass property. Use of these features as currently coded requires
*   non valid xhtml, so dont use it if you require valid markup. (its on my list to fix)
* 
*  You can also instantiate this class manually, by leaving off the 'flext' class from 
*  any textareas, and instantiate a new class usual with the first variable being the 
*  textarea element, and the second the options object.
*/



var Flext = new Class({
	Implements: Options,
	options: {
		aniTime: 300, 					//int (ms) - grow animation time
		maxHeight: 0,					//int (pixels) - one way to set a max height, if you dont set it via the class.
		defaultMaxHeight: 1000,			//int (pixels) - if not otherwise set, this is the max height
		parentDepth: 6,				//int - how many levels up should to check the parent el's height.
		//trigger classes:
		growClass: 'growme',					//string (class name)- grow the text area
		enterStoppedClass: 'stopenter',			//string (class name)- stop the enter key
		enterSubmitsClass: 'entersubmits',			//string (class name)- submit the form when enter is pressed
		replaceGhostTextClass: 'replaceghosttext',	//string (class name)- tries to use the ghosted text features
		growParentsClass: 'growparents',			//string (class name)- grow the parent elements if needed
		//other attributes:
		ghostTextAttr: 'ghosttext',
		ghostClassAttr: 'ghostclass'
	},
	initialize: function(el, options) {
		this.setOptions(options);
		
		this.el = document.id(el); //the textarea element.
		
		//by default, we will do nothing to the text area unless it has the class...
		this.autoGrow = el.hasClass(this.options.growClass);
		this.stopEnter = el.hasClass(this.options.enterStoppedClass);
		this.enterSubmits = el.hasClass(this.options.enterSubmitsClass);
		this.useGhostText = el.hasClass(this.options.replaceGhostTextClass);
		this.growParents = el.hasClass(this.options.growParentsClass);
		
		//initialize, and add events:
		if(this.autoGrow) {
			this.resizer = new Fx.Tween(this.el, {duration: this.options.aniTime});
			this.getMaxSize();
			this.reachedMax = false;
			this.startSize = this.origSize = this.el.getSize().y;
			this.vertPadding = this.el.getStyle('padding-top').toInt()+this.el.getStyle('padding-bottom').toInt()+this.el.getStyle('border-top').toInt()+this.el.getStyle('border-bottom').toInt();
			this.el.setStyle('overflow', 'hidden');
			this.el.addEvents({
				'keyup': function(e) {
					this.checkSize(e);
				}.bind(this),
				'change': function(e) {
					this.checkSize(e);
				}.bind(this),
				'click': function(e) {
					this.checkSize(e);
				}.bind(this)
			});
		
			//get inital state:
			this.checkSize();
		}
		//watch this text area: keydown
		if(this.stopEnter) {
			this.el.addEvent('keydown', function(e) {
				if(e.key == 'enter') {
					e.stop();
					if(this.enterSubmits) {
						this.submitForm();
					}
				}
			}.bind(this));
		}
		//replace ghost text:
		if(this.useGhostText) {
			this.ghostText = this.el.get(this.options.ghostTextAttr);
			this.ghostClass = this.el.get(this.options.ghostClassAttr);
			if(this.ghostText) {
				//initial states: if populated with something else, remove the class:
				if(this.el.value != this.ghostText) {
					this.el.removeClass(this.ghostClass);
				}
				//add events to watch for ghosting:
				this.el.addEvents({
					//remove the ghosted text when the text area receives focus
					'focus': function(e) {
						if(this.el.value == this.ghostText) {
							this.el.set('value', '');
							if(this.ghostClass) {
								this.el.removeClass(this.ghostClass);
							}
						}
					}.bind(this),
					//put the ghost text back if blur'ed and its empty
					'blur': function(e) {
						if(this.el.value == '') {
							this.el.set('value', this.ghostText);
							if(this.ghostClass) {
								this.el.addClass(this.ghostClass);
							}
						}
					}.bind(this)
				});
			}
		}
		
	},
	getMaxSize: function() {
		this.maxSize = this.options.maxHeight;
		if(this.maxSize == 0) {
			var testmax = this.el.className.match(/maxheight-(\d*)/);
			if(testmax) {
				this.maxSize = testmax[1];
			}
			else {
				this.maxSize = this.options.defaultMaxHeight; //if one forgets to set a max height via options or class, use a reasonable number.
			}
		}
	},
	checkSize: function(e) {
		var theSize = this.el.getSize();
		var theScrollSize = this.el.getScrollSize();
		if(navigator.userAgent.toLowerCase().indexOf('chrome') > -1) { var checksize = (theScrollSize.y); }
		else var checksize = (theScrollSize.y+this.vertPadding);
		
		if(checksize > theSize.y) {
			//we are scrolling, so grow:
			this.resizeIt(theSize, theScrollSize);
		}
	},
	resizeIt: function(theSize, scrollSize) {
		var newSize = scrollSize.y;
		if((scrollSize.y+this.vertPadding) > this.maxSize && !this.reachedMax) {
			//we've reached the max size, grow to max size and make textarea scrollable again:
			newSize = this.maxSize;
			this.el.setStyle('overflow', '');
			this.resizer.start('height', newSize);
			if(this.growParents) {
				var increasedSize = newSize - this.startSize;
				this.resizeParents(this.el, 0, increasedSize);
			}
			//remember that we've reached the max size:
			this.reachedMax = true;
		}
		if(!this.reachedMax) {
			//grow the text area:
			var increasedSize = newSize - this.startSize;
			if(increasedSize < 0) increasedSize = 0;
			this.startSize = newSize;
			this.resizer.start('height', newSize);
			//resize parent objects if needed:
			if(this.growParents) {
				this.resizeParents(this.el, 0, increasedSize);
			}
		}
	}, 
	resizeParents: function(el, num, incSize) {
		if(num < this.options.parentDepth) {
			var newel = el.getParent();
			if(newel) {
				if(newel.style.height && newel.style.height != '' ) {
					if(newel.retrieve('flextAdjusted')) {
						var newheight = (newel.getStyle('height').toInt()+incSize);
					} else {
						newel.store('flextAdjusted', true); //when resizing parents, the first time we enlarge them we have to include vertical padding
						var newheight = (newel.getStyle('height').toInt()+incSize+this.vertPadding);
					}
					newel.setStyle('height', newheight);
				}
				return this.resizeParents(newel, (num+1), incSize);
			}
			return true;
		} else {
			return true;
		}
	},
	submitForm: function() {
		var thisForm = this.el.getParent('form');
		if(thisForm) {
			var formName = thisForm.get('name');
			document[formName].submit();
			
		}
	}
});


//watch the text areas:
window.addEvent('domready', function() {
	$$('textarea.flext').each(function(el, i) {
		new Flext(el); 
	});
});

