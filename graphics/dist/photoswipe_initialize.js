/*
   from the bottom of https://photoswipe.com/documentation/getting-started.html
   ----------------------------------------------------------------------------------

How to build an array of slides from a list of links

Let's assume that you have a list of links/thumbnails that look like this (more info about markup of gallery):

<div class="my-gallery" itemscope itemtype="http://schema.org/ImageGallery">

    <figure itemprop="associatedMedia" itemscope itemtype="http://schema.org/ImageObject">
        <a href="large-image.jpg" itemprop="contentUrl" data-size="600x400">
            <img src="small-image.jpg" itemprop="thumbnail" alt="Image description" />
        </a>
        <figcaption itemprop="caption description">Image caption</figcaption>
    </figure>

    <figure itemprop="associatedMedia" itemscope itemtype="http://schema.org/ImageObject">
        <a href="large-image.jpg" itemprop="contentUrl" data-size="600x400">
            <img src="small-image.jpg" itemprop="thumbnail" alt="Image description" />
        </a>
        <figcaption itemprop="caption description">Image caption</figcaption>
    </figure>


</div>
... and you want click on the thumbnail to open PhotoSwipe with large image (like it's done on a demo page). All you need to do is:

1.) Bind click event to links/thumbnails.
2.) After user clicked on on thumbnail, find its index.
3.) Create an array of slide objects from DOM elements – loop through all links and retrieve href attribute (large image url), data-size attribute (its size), src of thumbnail, and contents of caption.

PhotoSwipe doesn't really care how will you do this. If you use frameworks like jQuery or MooTools, or if you don't need to support IE8, code can be simplified dramatically.

Here is pure Vanilla JS implementation with IE8 support:
*/
    (function() {

		var initPhotoSwipeFromDOM = function(gallerySelector) {

			// --------------------------------------------------------------------------------------------------------------------------
			// Function: Parse Thumbnail Elements
			// --------------------------------------------------------------------------------------------------------------------------
			var parseThumbnailElements = function(el) {
			    var thumbElements = el.childNodes,
			        numNodes = thumbElements.length,
			        items = [],
			        el,
			        childElements,
			        thumbnailEl,
			        size,
			        item;

			    for(var i = 0; i < numNodes; i++) {
			        el = thumbElements[i];

			        // include only element nodes 
			        if(el.nodeType !== 1 || el.localName != 'a')  // as modified by bjd to allow <br> and other things in between thumbnails (i.e. anchors ... i.e. 'a' tags)
			          continue;
			        
			        if(el.localName == 'a' && el.getAttribute("href").indexOf("/index.") > 0)  // as modified by bjd to skip title albums
			          	continue;

			        childElements = el.children;

			        size = el.getAttribute('data-size').split('x');

			        // create slide object
			        item = {
						src: el.getAttribute('href'),
						w: parseInt(size[0], 10),
						h: parseInt(size[1], 10),
						author: el.getAttribute('data-author'),
						title: el.getAttribute('data-title')   // bjd added for caption
			        };

			        item.el = el; // save link to element for getThumbBoundsFn

			        if(childElements.length > 0) {
			          item.msrc = childElements[0].getAttribute('src'); // thumbnail url
			          if(childElements.length > 1) {
			              item.title = childElements[1].innerHTML; // caption (contents of figure)
			          }
			        }


					var mediumSrc = el.getAttribute('data-med');
		          	if(mediumSrc) {
		            	size = el.getAttribute('data-med-size').split('x');
		            	// "medium-sized" image
		            	item.m = {
		              		src: mediumSrc,
		              		w: parseInt(size[0], 10),
		              		h: parseInt(size[1], 10)
		            	};
		          	}
		          	// original image
		          	item.o = {
		          		src: item.src, 
		          		w: item.w,
		          		h: item.h
		          	};

			        items.push(item);
			    }

			    return items;
			};

			// --------------------------------------------------------------------------------------------------------------------------
			// Function: find nearest parent element
			// --------------------------------------------------------------------------------------------------------------------------
			var closest = function closest(el, fn) {
			    return el && ( fn(el) ? el : closest(el.parentNode, fn) );
			};


			// --------------------------------------------------------------------------------------------------------------------------
			// Function: on Thumbnail click
			// --------------------------------------------------------------------------------------------------------------------------
			var onThumbnailsClick = function(e) {
			    e = e || window.event;
			    e.preventDefault ? e.preventDefault() : e.returnValue = false;

			    var eTarget = e.target || e.srcElement;

			    var clickedListItem = closest(eTarget, function(el) {
			        return el.tagName === 'A';
			    });

			    if(!clickedListItem) {
			        return;
			    }

			    var clickedGallery = clickedListItem.parentNode;

			    var childNodes = clickedListItem.parentNode.childNodes,
			        numChildNodes = childNodes.length,
			        nodeIndex = 0,
			        index;

				  var href;
				  var href_title;
			    for (var i = 0; i < numChildNodes; i++) {
			        if(childNodes[i].nodeType !== 1 ||  childNodes[i].localName != 'a')   // as modified by bjd to allow <br> in between thumbnails (i.e. anchors)
			            continue; 

					// as modified by bjd to skip title albums
					 href = childNodes[i].getAttribute("href"); 
					 href_title = href.indexOf("/index.") > 0; // is href a title page

			        if(childNodes[i] === clickedListItem) {
			            index = nodeIndex; 
			            break;
			        }

					if (!href_title) // don't increment the image index if a title album, as modified by bjd
			        	nodeIndex++;
			    }

				if (href_title) // as modified by bjd to allow title page albums to open instead of show image
					location.href = href;
				else if (index >= 0) 
			        openPhotoSwipe( index, clickedGallery );

			    return false;
			};

			// --------------------------------------------------------------------------------------------------------------------------
			// Function: Parse Hash (users can share link to each image... gid and pid are added to URL)
			// --------------------------------------------------------------------------------------------------------------------------
			var photoswipeParseHash = function() {
				var hash = window.location.hash.substring(1),
			    params = {};

			    if(hash.length < 5) { // pid=1
			        return params;
			    }

			    var vars = hash.split('&');
			    for (var i = 0; i < vars.length; i++) {
			        if(!vars[i]) {
			            continue;
			        }
			        var pair = vars[i].split('=');  
			        if(pair.length < 2) {
			            continue;
			        }           
			        params[pair[0]] = pair[1];
			    }

			    if(params.gid) {
			    	params.gid = parseInt(params.gid, 10);
			    }

			    return params;
			};

			// --------------------------------------------------------------------------------------------------------------------------
			// Function: open Photoswipe
			// --------------------------------------------------------------------------------------------------------------------------
			var openPhotoSwipe = function(index, galleryElement, disableAnimation, fromURL) {
			    var pswpElement = document.querySelectorAll('.pswp')[0],
			        gallery,
			        options,
			        items;

				items = parseThumbnailElements(galleryElement);

			    // define options (if needed)
			    options = {

			        galleryUID: galleryElement.getAttribute('data-pswp-uid'),

			        getThumbBoundsFn: function(index) {
			            // See Options->getThumbBoundsFn section of docs for more info
			            var thumbnail = items[index].el.children[0],
			                pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
			                rect = thumbnail.getBoundingClientRect(); 

			            return {x:rect.left, y:rect.top + pageYScroll, w:rect.width};
			        },

			        addCaptionHTMLFn: function(item, captionEl, isFake) {
						if(!item.title) {
							captionEl.children[0].innerText = '';
							return false;
						}
						// bjd, removed author from being displayed on images
						//captionEl.children[0].innerHTML = item.title +  '<br/><small>Photo: ' + item.author + '</small>';
						captionEl.children[0].innerHTML = item.title;
						return true;
			        }
					
			    };


			    if(fromURL) {
			    	if(options.galleryPIDs) {
			    		// parse real index when custom PIDs are used 
			    		// http://photoswipe.com/documentation/faq.html#custom-pid-in-url
			    		for(var j = 0; j < items.length; j++) {
			    			if(items[j].pid == index) {
			    				options.index = j;
			    				break;
			    			}
			    		}
				    } else {
				    	options.index = parseInt(index, 10) - 1;
				    }
			    } else {
			    	options.index = parseInt(index, 10);
			    }

			    // exit if index not found
			    if( isNaN(options.index) ) {
			    	return;
			    }



				var radios = document.getElementsByName('gallery-style');
				for (var i = 0, length = radios.length; i < length; i++) {
				    if (radios[i].checked) {
				        if(radios[i].id == 'radio-all-controls') {

				        } else if(radios[i].id == 'radio-minimal-black') {
				        	options.mainClass = 'pswp--minimal--dark';
					        options.barsSize = {top:0,bottom:0};
							options.captionEl = false;
							options.fullscreenEl = false;
							options.shareEl = false;
							options.bgOpacity = 0.85;
							options.tapToClose = true;
							options.tapToToggleControls = false;
				        }
				        break;
				    }
				}

			    if(disableAnimation) {
			        options.showAnimationDuration = 0;
			    }

				options.loop = false; // bjd added to keep from wrapping around to beginning when swiping
				if (!shareEnabled) // bjd added this as customer request, to be able to opt out of sharing in PPG form
					options.shareEl = false;

			    // Pass data to PhotoSwipe and initialize it
			    gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);

			    // see: http://photoswipe.com/documentation/responsive-images.html
				var realViewportWidth,
				    useLargeImages = false,
				    firstResize = true,
				    imageSrcWillChange;

				gallery.listen('beforeResize', function() {

					var dpiRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;
					dpiRatio = Math.min(dpiRatio, 2.5);
				    realViewportWidth = gallery.viewportSize.x * dpiRatio;


				    if(realViewportWidth >= 1200 || (!gallery.likelyTouchDevice && realViewportWidth > 800) || screen.width > 1200 ) {
				    	if(!useLargeImages) {
				    		useLargeImages = true;
				        	imageSrcWillChange = true;
				    	}
				        
				    } else {
				    	if(useLargeImages) {
				    		useLargeImages = false;
				        	imageSrcWillChange = true;
				    	}
				    }

				    if(imageSrcWillChange && !firstResize) {
				        gallery.invalidateCurrItems();
				    }

				    if(firstResize) {
				        firstResize = false;
				    }

				    imageSrcWillChange = false;

				});

				gallery.listen('gettingData', function(index, item) {
				    if( useLargeImages ) {
				        item.src = item.o.src;
				        item.w = item.o.w;
				        item.h = item.o.h;
				    } else {
				        item.src = item.m.src;
				        item.w = item.m.w;
				        item.h = item.m.h;
				    }
				});

			    gallery.init();
			};




			// --------------------------------------------------------------------------------------------------------------------------
			// main code
			// --------------------------------------------------------------------------------------------------------------------------
			
			// select all gallery elements
			var galleryElements = document.querySelectorAll( gallerySelector );
			for(var i = 0, l = galleryElements.length; i < l; i++) {
				galleryElements[i].setAttribute('data-pswp-uid', i+1);
				galleryElements[i].onclick = onThumbnailsClick;
			}

			// Parse URL and open gallery if it contains #&pid=3&gid=1
			var hashData = photoswipeParseHash();
			if(hashData.pid && hashData.gid) {
				openPhotoSwipe( hashData.pid,  galleryElements[ hashData.gid - 1 ], true, true );
			}
		};

		initPhotoSwipeFromDOM('.swipe-gallery');

	})();

