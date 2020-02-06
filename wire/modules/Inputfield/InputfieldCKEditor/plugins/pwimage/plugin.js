(function() {
	
	CKEDITOR.plugins.add('pwimage', {
		
		requires: 'dialog',
		
		init: function(editor) {
			
			var pluginName = 'pwimage';
			
			// These are the allowed and required elements & attributes for images. 
			// It should clean all other classes but hidpi and three align classes that are generated by ProcessWire
			var allowed = 
				'img[alt,id,!src,title,width](align_left,align_center,align_right,hidpi,align-left,align-center,align-right);' + 
				'a[!href];' + 
				'figure{width}(align_left,align_center,align_right,hidpi,align-left,align-center,align-right);' + 
				'figcaption;';
			var required = 'img[alt,src]';
			
			// add pwimage command (opens the ProcessWire image selection iFrame)
			editor.addCommand(pluginName, {
				allowedContent: allowed,
				requiredContent: required,
				exec: loadIframeImagePicker
			}); 

			editor.ui.addButton('PWImage', {
				label: editor.lang.common.image,
				command: pluginName, 
				hidpi: true,
				icon: (CKEDITOR.env.hidpi ? this.path + 'images/hidpi/pwimage.png' : this.path + 'images/pwimage.png')
			}); 

			// On double click we execute the command (= we open the pw image selection iFrame defined above)
			editor.on( 'doubleclick', function( evt ) {
				var element = evt.data.element;
				if ( (element.is( 'img' ) ) && !element.data( 'cke-realelement' ) && !element.isReadOnly() ) {
					//var selection = editor.getSelection();
					//editor.lockSelection();
					//selection.lock();
					evt.cancel(); // prevent CKE's link dialog from showing up (if image is linked)
					editor.commands.pwimage.exec();
				}
			});
		
			// If the "menu" plugin is loaded, register the menu items.
			if ( editor.addMenuItems ) {
				editor.addMenuItems({
					image: {
						label: editor.lang.image.menu,
						command: 'pwimage',
						group: 'image'
					}
				});
			}
		
			// If the "contextmenu" plugin is loaded, register the listeners.
			if ( editor.contextMenu ) {
				editor.contextMenu.addListener( function( element, selection ) {
					if ( getSelectedImage( editor, element ) )
						return { image: CKEDITOR.TRISTATE_OFF };
				});
			}
		
		}
	}); 

	function getSelectedImage( editor, element ) {
		if ( !element ) {
			var sel = editor.getSelection();
			element = sel.getSelectedElement();
		}

		if ( element && element.is( 'img' ) && !element.data( 'cke-realelement' ) && !element.isReadOnly() )
			return element;
	}

	function loadIframeImagePicker(editor) {

		var $in = jQuery("#Inputfield_id"); 
		if($in.length) {
			var page_id = $in.val();
		} else {
			var page_id = jQuery("#" + editor.name).closest('.Inputfield').attr('data-pid');
		}
		var edit_page_id = page_id; 
		var file = '';
		var imgClass = '';
		var imgWidth = 0;
		var imgHeight = 0;
		var imgDescription = '';
		var imgLink = '';
		var hidpi = false;
		var selection = editor.getSelection();
		var se = selection.getSelectedElement();
		var node = selection.getStartElement();
		var $node = jQuery(node);
		var nodeParent = node.getParent();
		var nodeGrandparent = nodeParent.getParent();
		var src = $node.attr('src');
		var $linkWrapper = null; // if img is wrapped in link, this is it
		var $figureWrapper = null;
		var $figureCaption = null;
		var nodeParentName = nodeParent.$.nodeName.toUpperCase(); 
		var nodeGrandparentName = nodeGrandparent ? nodeGrandparent.$.nodeName.toUpperCase() : '';
	
		if(typeof ckeGetProcessWireConfig != "undefined") {
			// note: ckeGetProcessWireConfig not yet present in front-end editor
			var pwCkeSettings = ckeGetProcessWireConfig(editor);
			if(pwCkeSettings && pwCkeSettings['pwAssetPageID']) page_id = pwCkeSettings['pwAssetPageID'];
		}
	
		selection.lock();
		editor.lockSelection();
	
		if(nodeGrandparentName == 'FIGURE') {
			$figureWrapper = jQuery(nodeGrandparent.getOuterHtml());
			$figureCaption = $figureWrapper.find("figcaption");
			$figureWrapper.find('img').remove();
		} else if(nodeParentName == 'FIGURE') {
			$figureWrapper = jQuery(nodeParent.getOuterHtml());
			$figureCaption = $figureWrapper.find("figcaption");
			$figureWrapper.find('img').remove();
		}
		if(nodeParentName === 'A') {
			$linkWrapper = jQuery(nodeParent.getOuterHtml()); 
			$linkWrapper.find('img').remove();
		}
		
		if(src) {
			imgClass = $figureWrapper ? $figureWrapper.attr('class') : $node.attr('class');
			hidpi = imgClass && imgClass.indexOf('hidpi') > -1;
			imgWidth = $node.attr('width');
			imgHeight = $node.attr('height');
			imgDescription = $node.attr('alt');
			imgLink = nodeParentName === "A" ? nodeParent.$.href : '';
			
			var parts = src.split('/'); 
			file = parts.pop();
			parts = parts.reverse();
			page_id = ''; 
			// pull page_id out of img[src]
			for(var n = 0; n < parts.length; n++) {
				// accounts for either /1/2/3/ or /123/ format
				if(parts[n].match(/^\d+$/)) {
					page_id = parts[n] + page_id;
				} else if(page_id.length) {
					break;
				}
			}
			page_id = parseInt(page_id);
		}

		var modalUri = ProcessWire.config.urls.admin + 'page/image/';
		var queryString = '?id=' + page_id + '&edit_page_id=' + edit_page_id + '&modal=1';

		if(file.length) queryString += "&file=" + file; 
		if(imgWidth) queryString += "&width=" + imgWidth; 
		if(imgHeight) queryString += "&height=" + imgHeight; 
		if(imgClass && imgClass.length) queryString += "&class=" + encodeURIComponent(imgClass); 
		queryString += '&hidpi=' + (hidpi ? '1' : '0'); 
		if(imgDescription && imgDescription.length) {
			queryString += "&description=" + encodeURIComponent(imgDescription);
		}
		if($figureCaption) queryString += "&caption=1";
		if(imgLink && imgLink.length) queryString += "&link=" + encodeURIComponent(imgLink);
		queryString += ("&winwidth=" + (jQuery(window).width() - 30));

		// create iframe dialog box
		var modalSettings = {
			title: "<i class='fa fa-fw fa-folder-open'></i> " + ProcessWire.config.InputfieldCKEditor.pwimage.selectLabel, // "Select Image", 
			open: function() {
				if(jQuery(".cke_maximized").length > 0) {
					// the following is required when CKE is maximized to make sure dialog is on top of it
					jQuery('.ui-dialog').css('z-index', 9999);
					jQuery('.ui-widget-overlay').css('z-index', 9998);
				}
			}
		};
		
		var $iframe = pwModalWindow(modalUri + queryString, modalSettings, 'large');
		
		$iframe.load(function() {

			// when iframe loads, pull the contents into $i 
			var $i = $iframe.contents();
		
			if($i.find("#selected_image").length > 0) {
				// if there is a #selected_image element on the page...

				var buttons = [
					{ 
						html: "<i class='fa fa-camera'></i> " + ProcessWire.config.InputfieldCKEditor.pwimage.insertBtn, // "Insert This Image",
						click:  function() {

							function insertImage(src) {

								var $i = $iframe.contents();
								var $img = jQuery("#selected_image", $i); 
								var width = $img.attr('width');
								var height = $img.attr('height'); 
								var alt = jQuery("#selected_image_description", $i).val();
								var caption = jQuery("#selected_image_caption", $i).is(":checked") ? true : false;
								var hidpi = jQuery("#selected_image_hidpi", $i).is(":checked") ? true : false;
								var cls = $img.removeClass('ui-resizable No Alignment resizable_setup') 
									.removeClass('rotate90 rotate180 rotate270 rotate-90 rotate-180 rotate-270')
									.removeClass('flip_vertical flip_horizontal').attr('class');
								var $linkToLarger = jQuery('#selected_image_link', $i); 
								var link = $linkToLarger.is(":checked") ? $linkToLarger.val() : ''; // link to larger version
								var $insertHTML = jQuery("<img />").attr('src', src).attr('alt', alt); 

								if(hidpi) cls += (cls.length > 0 ? ' ' : '') + 'hidpi';
								
								// note: class is added to figureWrapper (rather than <img>) when this is a caption
								if(caption === false) $insertHTML.addClass(cls); 
								
								if(width > 0 && $img.attr('data-nosize') != '1') $insertHTML.attr('width', width);
								
								if($linkWrapper) {	
									// img was wrapped in an <a>...</a> and/or <figure>
									if(link && link.length > 0) {
										$linkWrapper.attr('href', link).attr('data-cke-saved-href', link); // populate existing link with new href
									} else if($linkToLarger.attr('data-was-checked') == 1) {
										// box was checked but no longer is
										$linkWrapper = null;
									}
									if($linkWrapper !== null) {
										$linkWrapper.append($insertHTML);
										$insertHTML = $linkWrapper;
									}
								} else if(link && link.length > 0) {
									var $a = jQuery("<a />").attr('href', link).append($insertHTML); 
									$insertHTML = $a; 
								}
								
								if(caption) {
									var $figure = jQuery("<figure />");
									//$figure.css('width', width + 'px');
									if(cls.length) $figure.addClass(cls);
									if(!$figureCaption) {
										$figureCaption = jQuery("<figcaption />"); 
										if(alt.length > 1) {
											$figureCaption.append(alt);
										} else {
											$figureCaption.append(ProcessWire.config.InputfieldCKEditor.pwimage.captionLabel); 
										}
									}
									if($figureCaption) $figure.append($figureCaption); 
									$figure.prepend($insertHTML); 
									$insertHTML = $figure; 
								}
						
								// select the entire element surrounding the image so that we replace it all
								if(nodeGrandparentName === 'FIGURE') {
									editor.unlockSelection();
									selection.unlock();
									selection.selectElement(nodeGrandparent);
								} else if(nodeParentName === "A" || nodeParentName == 'FIGURE') {
									editor.unlockSelection();
									selection.unlock();
									// @todo does not work in inline mode for some reason
									selection.selectElement(nodeParent);
								}
					
								var html = $insertHTML[0].outerHTML; 
								editor.insertHtml(html); 
								editor.fire('change');
								$iframe.dialog("close"); 
							}
							
							/*** INSERT BUTTON CLICKED *********************************/

							var $i = $iframe.contents();
							var $img = jQuery("#selected_image", $i); 

							$iframe.dialog("disable");
							$iframe.setTitle("<i class='fa fa-fw fa-spin fa-spinner'></i> " +
								ProcessWire.config.InputfieldCKEditor.pwimage.savingNote); // Saving Image
							$img.removeClass("resized"); 

							var width = $img.attr('width');
							if(!width) width = $img.width();
							var height = $img.attr('height'); 
							if(!height) height = $img.height();
							var file = $img.attr('src'); 
							var page_id = jQuery("#page_id", $i).val();
							var hidpi = jQuery("#selected_image_hidpi", $i).is(":checked") ? 1 : 0;
							var rotate = parseInt(jQuery("#selected_image_rotate", $i).val()); 
							file = file.substring(file.lastIndexOf('/')+1); 

							var resizeURL = modalUri + 'resize?id=' + page_id + 
								'&file=' + file + 
								'&width=' + width + 
								'&height=' + height + 
								'&hidpi=' + hidpi;
							
							if(rotate) resizeURL += '&rotate=' + rotate; 
							if($img.hasClass('flip_horizontal')) resizeURL += '&flip=h';
								else if($img.hasClass('flip_vertical')) resizeURL += '&flip=v';
							jQuery.get(resizeURL, function(data) {
								var $div = jQuery("<div></div>").html(data); 
								var src = $div.find('#selected_image').attr('src');
								insertImage(src); 
							}); 

						}
					}, {

						html: "<i class='fa fa-folder-open'></i> " + ProcessWire.config.InputfieldCKEditor.pwimage.selectBtn, // "Select Another Image", 
						'class': 'ui-priority-secondary',
						click: function() {
							var $i = $iframe.contents();
							var page_id = jQuery("#page_id", $i).val();
							$iframe.attr('src', modalUri + '?id=' + page_id + '&modal=1'); 
							$iframe.setButtons({}); 
						}
					}, {
						html: "<i class='fa fa-times-circle'></i> " + ProcessWire.config.InputfieldCKEditor.pwimage.cancelBtn, // "Cancel",
						'class': 'ui-priority-secondary',
						click: function() { $iframe.dialog("close"); }
					}
					
				];
				
				$iframe.setButtons(buttons); 
				$iframe.setTitle("<i class='fa fa-fw fa-picture-o'></i> " + $i.find('title').html());

			} else {
				var buttons = [];
				jQuery("button.pw-modal-button, button[type=submit]:visible", $i).each(function() {
					var $button = jQuery(this);
					var button = {
						html: $button.html(),
						click: function() {
							$button.click();
						}
					}
					buttons.push(button);
					if(!$button.hasClass('pw-modal-button-visible')) $button.hide();
				});
				var cancelButton = {
					html: "<i class='fa fa-times-circle'></i> " + ProcessWire.config.InputfieldCKEditor.pwimage.cancelBtn, // "Cancel",
					'class': "ui-priority-secondary", 
					click: function() { $iframe.dialog("close"); }
				};
				buttons.push(cancelButton);
				$iframe.setButtons(buttons);
			}
		});
	}
	
})();
