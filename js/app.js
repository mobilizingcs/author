$(function(){
	$('[data-toggle="tooltip"]').tooltip()
	if(location.hostname == "lausd.mobilizingcs.org"){
		$(".hidelausd").hide();
	}
});

$.getJSON("logic.json", function(logic){

	//globals
	var oldpop;
	var ohmage_user;
	var update_urn;
	var update_name;
	var oh = Ohmage("/app", "surveytool")

	//attach global callbacks
	oh.callback("done", function(x, status, req){
		//for debugging only
		//console.log(x);
	})

	//global error handler. In ohmage 200 means unauthenticated
	oh.callback("error", function(msg, code, req){
		(code == 200) ? window.location.replace("/#login") : alert("Error!\n" + msg);
	});

	//initiate ohmage client
	oh.user.whoami().done(function(username){
		ohmage_user = username;

		//make sure we don't timeout
		oh.keepalive();

		//init switches
		$("#campaign_running").bootstrapSwitch({size: "small", onColor: "success", offColor: "danger", onText:"running", offText:"stopped"})
		$("#campaign_privacy").bootstrapSwitch({size: "small", onColor: "success", offColor: "danger", onText:"allowed", offText:"disabled"})

		var urn = window.location.hash.replace(/^[#]/, "");
		if(urn.match(/^urn/)){
			oh.campaign.readall({
               campaign_urn_list: urn,
               output_format: "long"
            }).done(function(data){
				var campaign = data[urn];
            	update_urn = urn;
            	update_name = campaign.name
				xml2form(campaign.xml);

				console.log(campaign)
				$("#campaign_running").bootstrapSwitch("state", campaign.running_state == "running")
				$("#campaign_privacy").bootstrapSwitch("state", campaign.privacy_state == "shared")
				$("#campaign_description").val(campaign.description);
				$("#campaign_urn_field").val(urn);
				$("#campaign_name_field").val(campaign.name);
				$("#class_urn_field option").text(campaign.classes);
				$("#update_campaign_button").removeClass("hide");
            });
		} else {
			//get available classes
			oh.user.info().done(function(x){
				var classlist = {};
				$.each(x[username].classes, function(urn, name){
					classlist[name] = urn;
				});
				$.each(Object.keys(classlist).sort(), function(i, name){
					var urn = classlist[name];
					$("#class_urn_field").append($("<option/>").val(urn).text(name));
				})
			})

			//enable campaign info fields
			$("#create_campaign_button").removeClass("hide");
			$(".campaign_info_field").removeAttr("disabled");

			//don't allow editing campaign ID field
			$("#campaign_urn_field").attr("disabled", "disabled")
		}
	});

	//XML parser for mixed case tag names (HTML only supports lowercase tags)
	var parse = (function(parser, jQuery){
		return function(str) {
			return jQuery(parser.parseFromString(str, "text/xml").documentElement)
		}
	})(new DOMParser(), jQuery)

	//Close the latest popover
	function closepop(){
		if(oldpop){
			oldpop.popover('hide');
			oldpop = null;
		}
	}

	//hack
	window.closepop = closepop;

	//escape button
	$(document).keydown(function(e){
		if(e.which == 27){
			closepop();
		}
	});

	//survey sortable
	$(".panel-group").sortable({
		handle: ".panel-heading",
		update: writexml,
		start: closepop
	});

	//create new surveys
	function new_survey(){
		var el = $("#surveytemplate .survey_content").clone();
		var id = el.children(".panel-collapse").uniqueId()[0].id;
		var form = el.find("form");
		el.find("h4.panel-title a").attr("href", "#" + id);
		el.find(".list-group").sortable({
			update: writexml,
			start: closepop
		});
		el.find(".dropdown-menu a").click(function(e){
			e.preventDefault();
			form.validator('validate');
			add_prompt($(this).data("type"), el.find(".survey_prompt_list"), null)
			writexml();
		});
		el.find(".remove_survey_button").click(function(e){
			e.preventDefault();
			bootbox.confirm({
				title : "Delete Survey",
				message : "Do you want to remove this survey from the campaign?",
				callback : function(result){
					if(!result) return;
					el.hide(function(){
						el.remove()
						writexml();
					})
				}
			});
		});
		$("#surveygroup").append(el);
		$("#surveygroup").find(".collapse").collapse('hide');
		el.find(".collapse").collapse('show');

		//update view
		el.find(".survey_id_field").on("keyup", function(){
			var urn = idify($(this).val())
			$(this).val(urn)
			el.find("h4.panel-title a").text("Survey: " + urn)
		})

		el.find(".survey_title_field").on("keyup", function(){
			el.find(".survey_id_field").val(idify($(this).val().toLowerCase())).trigger("keyup")
		})

		//update xml
		el.find("input,textarea").change(writexml).keyup(writexml);
		writexml();

		//validator
		form.validator({delay:100});
		return el;
	}

	//create new prompt
	function add_prompt(prompt_type, prompt_list, values){

		var a = $(Mustache.render(templates.promptlink, {
			prompt_type : prompt_type,
			icon : logic.icons[prompt_type]
		})).data("prompt_type", prompt_type);

		var content = popover_content(prompt_type, a, values || {});
		var form = content.find("form.prompt_form");

		// create the
		a.popover({
			html: true,
			//placement: "top",
			//trigger: "hover",
			title :  prompt_type + ' prompt <span class="close_popover_button pull-right glyphicon glyphicon-remove" onclick="closepop()" />',
			content: content
		}).click(function(e){
			e.preventDefault();
		}).on("show.bs.popover", function(){
			if(oldpop != a){
				closepop();
			}
			oldpop = a;
		})

		prompt_list.append(a);
		function highlight(){
			if(form.has('.has-error').length){
				a.addClass("list-group-item-danger")
			} else {
				a.removeClass("list-group-item-danger")
			}
		}

		//force render of form
		a.popover("show").on("hide.bs.popover", function(){
			form.validator('validate');
			highlight();
		});

		//added from existing campaign
		if(values) a.popover("hide");
		form.validator().on("valid.bs.validator", highlight);
		return a;
	}

	//initiate the prompt popover
	function popover_content(prompt_type, a, values){
		var templates = window.templates;
		var fields = logic.prompttypes[prompt_type];
		var el = $("#prompttemplate").children().clone();
		var form = el.find("form");
		var prompttext = a.find(".prompt_id_text");
		var id_field;
		var label_field;
		var skippable_field;
		var taglist;

		function updateText(){
			var skiptext = skippable_field && skippable_field.is(":checked") ? "  (skippable)" : "";
			prompttext.text((id_field.val() || "___") + skiptext)
		}


		// Other fields get dynamically
		if(!fields){
			alert("Skipping unsupported prompt type: " + prompt_type)
			return;
		}

		$.each(fields, function(index, fieldname){
			var field = logic.fields[fieldname];
			var label = field.label || toTitleCase(fieldname);
			if(logic.fields[fieldname].optional) {
				label = label + " (optional)"
			}
			
			var output = Mustache.render(templates[field.type], {
				field : fieldname,
				label : label,
				default : values[fieldname] || field.default,
				placeholder : field.placeholder || "Please enter " + fieldname.toLowerCase(),
				required : logic.fields[fieldname].optional ? "" : "required"
			});
			var el = $(output);
			var input = el.appendTo(form).find("input");

			//enable tooltips
			if(field.tooltip){
				el.find("label").addClass("hoverable").tooltip({
					delay: { "show": 250, "hide": 100 },
					placement : "top",
					container: 'body',
					title : field.tooltip
				})
			}

			//force number fields to be numbers.
			if(field.type == "number"){
				input.on("blur", function(){
					$(this).val($(this).val());
				})
			}

			//update view
			if(fieldname == "id"){
				id_field = input;
				input.on("keyup", function(){
					$(this).val(idify($(this).val()))
					updateText();

					//copy id into label field (requested by Hongsuda)
					if(label_field){
						label_field.val($(this).val())
					}
				})
			}

			if(fieldname == "displayLabel"){
				label_field = input;
			}

			//update view
			if(fieldname == "skippable"){
				skippable_field = input;
				input.on("change", function(){
					updateText();
				})
			}		

			//hack to validate at least one option for single choice items
			if(field.type == "keyval"){

				function validateTagList(){
					var values = el.find(".choice_values").tagit("assignedTags");
					el.find("input").prop('required', values.length == 0);
					writexml();
				}

				taglist = el.find(".choice_values").tagit({
					allowSpaces : true,
					placeholderText : "Type and hit [ENTER]",
					afterTagAdded : validateTagList,
					afterTagRemoved : validateTagList
				});
				el.find("input").prop('required', true);
			}

		});

		a.find(".remove_prompt_button").click(function(e){
			e.preventDefault()
			e.stopPropagation();
			closepop();
			a.hide(function(){
				a.popover('destroy');
				a.remove();
				writexml();
			})
		});

		//prepopulate single choice
		var smallest_key = 1;
		$.each(values, function(key, label){
			var numkey = parseInt(key)
			if(key == numkey){
				if(numkey < smallest_key){
					smallest_key = numkey;
				}
				$(taglist).tagit("createTag", label)
			}
		})

		//hack for existing campaigns that do not start counting at 1
		if(smallest_key != 1){
			taglist.attr("start", smallest_key);
		}

		el.find("input,textarea").change(writexml).keyup(writexml);
		updateText();
		form.validator({delay:100});
		return el;
	}

	/* Convert Form to XML. Should rewrite this in proper MVC */
	function form2xml(){
		var xml = $("<root/>")
		var campaign = $("<campaign/>").appendTo(xml);

		/* Campaign info fields */
		//parse("<campaignName/>").text($("#campaign_name_field").val()).appendTo(campaign);
		//parse("<campaignUrn/>").text($("#campaign_urn_field").val()).appendTo(campaign);

		/* Append all surveys */
		var surveys = $("<surveys/>").appendTo(campaign);

		$("#surveygroup .survey_form").each(function(){

			/* create node */
			var form = $(this);
			var survey = parse("<survey/>").appendTo(surveys);

			/* survey fields */
			parse("<id/>").text(form.find(".survey_id_field").val()).appendTo(survey);
			parse("<title/>").text(form.find(".survey_title_field").val()).appendTo(survey);
			parse("<description/>").text(form.find(".survey_description_field").val()).appendTo(survey);
			parse("<submitText/>").text(form.find(".survey_submit_field").val()).appendTo(survey);
			parse("<anytime/>").text(form.find(".survey_anytime_field").is(":checked")).appendTo(survey);

			/* find prompts */
			var contents = parse("<contentList/>").appendTo(survey)
			form.find(".survey_prompt_list .prompt_link").each(function(){

				var prompt_link = $(this);
				var prompt_type = prompt_link.data("prompt_type");

				if(prompt_type == "message"){
					var prompt = parse("<message/>").appendTo(contents)
				} else {
					var prompt = $("<prompt/>").appendTo(contents)
					parse("<promptType/>").text(prompt_link.data("prompt_type")).appendTo(prompt)
				}

				var popover = prompt_link.data("bs.popover").$tip;
				var fields = $(popover).find(".prompt_field")
				var properties = {};

				fields.each(function(){
					var field = $(this);
					var name = field.data("field")
					var realname = logic.fields[name].name || name;
					var value = field.is("input[type=checkbox]") ? field.is(':checked') : field.val();

					//do not add empty default field into the XML
					if(logic.fields[name].optional && value === "") return;

					//optional value transformations
					if(logic.fields[name].transform){
						eval("var transform = " + logic.fields[name].transform);
						value = transform(value);
					}

					//some fields have to be put in the xml as 'properties'
					if(logic.fields[name].property){
						if(field.is("ol")){
							var offset = field.attr("start") ? parseFloat(field.attr("start")) : 1;
							$.each(field.tagit("assignedTags"), function(i, val){
								//we start counting from 1 because that is how OL are displayed
								properties[i + offset] = val
							});
						} else {
							properties[name] = value;
						}
					} else {
						parse("<"+realname+"/>").text(value).appendTo(prompt)
					}

					//ohmage apparently has no default for this
					if(name == "skippable" && value == true){
						parse("<skipLabel/>").text("Skip").appendTo(prompt)
					}
				})

				//append properties
				if(Object.keys(properties).length){
					var props = $("<properties/>").appendTo(prompt)
					$.each(properties, function(key, val){
						var prop = $("<property/>").appendTo(props)
						$("<key/>").text(key).appendTo(prop)
						$("<label/>").text(val).appendTo(prop)
					})
				}
			})
		});
		return xml
	}

	function xml2form(xmltext){
		var xml = $.parseXML(xmltext);
		var campaign = $("campaign", xml);
		var surveys = campaign.children("surveys");

		/* campaign fields  if set */
		//$("#campaign_name_field").val(campaign.children("campaignName").val());
		//$("#campaign_urn_field").val(campaign.children("campaignUrn").val());

		/* surveys */
		surveys.children('survey').each(function(){
			var survey = $(this);
			var contents = survey.children("contentList")
			var survey_el = new_survey();
			var survey_prompt_list = survey_el.find(".survey_prompt_list")
			survey_el.find(".survey_id_field").val(survey.children("id").text()).trigger("keyup")
			survey_el.find(".survey_title_field").val(survey.children("title").text())
			survey_el.find(".survey_description_field").val(survey.children("description").text())
			survey_el.find(".survey_submit_field").val(survey.children("submitText").text())
			survey_el.find(".survey_anytime_field")[0].checked = (survey.children("anytime").text() === "true")

			/* render individual prompts */
			contents.children().each(function(){

				/* can be either prompt or message */
				var prompt = $(this)
				var prompt_type = prompt.is("message") ? "message" : prompt.children("promptType").text()

				/* search for values in the xml */
				var values = {
					id : prompt.children("id").text(),
					displayLabel : prompt.children("displayLabel").text(),
					promptText : prompt.children("promptText").text(),
					messageText : prompt.children("messageText").text(),
					default : prompt.children("default").text(),
					condition : prompt.children("condition").text(),
					skippable : (prompt.children("skippable").text() === "true") ? "checked" : " " // watch out "" will get coerced to null
				}

				/* add special property values */
				prompt.find("properties property").each(function(){
					var key = $(this).children("key").text()
					var label = $(this).children("label").text()
					values[key] = label;

					//fix for e.g. wholeNumbers
					if(logic.fields[key] && logic.fields[key].type == "bool"){
						values[key] = (label === "true") ? "checked" : " ";
					}
				})

				/* create the gui element */
				add_prompt(prompt_type, survey_prompt_list, values)
			})
		})

		//force render
		writexml()
	}

	function writexml(){
		var xmltext = vkbeautify.xml('<?xml version="1.0" encoding="UTF-8"?>\n' + form2xml().html());
		$("code").text(xmltext)

		/* to enable syntax highlighting */
		if($("#syntax_highlight_button").is(":checked")){
			$('pre').each(function(i, block) {
				hljs.highlightBlock(block);
			});
		}

		return xmltext;
	}

	//debug
	window.writexml = writexml;

	function toTitleCase(str){
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	//filters alphanumeric characters
	function urnify(str){
		return str.replace(/[^a-z0-9:]/gi,'').substr(0, 20)
	}

	//filters alphanumeric and underscore
	function idify(str){
		return str.replace(/\s/g, "_").replace(/[^a-z0-9_]/gi,'').substr(0, 20)
	}

	function fixxml(input, name, urn){
        var xml = $.parseXML(input);
        var campaign = $("campaign", xml);
        campaign.children("campaignName").remove();
        campaign.children("campaignUrn").remove();
        campaign.prepend(parse("<campaignName/>").text(name))
        campaign.prepend(parse("<campaignUrn/>").text(urn))
        return (new XMLSerializer()).serializeToString(xml);
    }

	function update_campaign_urn(){
		var campaign_name = $("#campaign_name_field").val() || "noname";
		var class_urn = $("#class_urn_field").val().replace("urn:class:", "") || "noclass";
		var urn = "urn:campaign:" + class_urn + ":" + ohmage_user + ":" + campaign_name.toLowerCase();
		$("#campaign_urn_field").val(urn.replace(/[^a-z0-9:]/gi,''));
	}

	//start new survey
	$("#new_survey_button").click(function(e){
		e.preventDefault();
		this.blur();
		new_survey();
	});

	//download XML as file
	$("#download_xml_button").click(function(e){
		var xml = writexml();
		if(window.navigator && window.navigator.msSaveBlob){
			e.preventDefault();
			navigator.msSaveBlob( new Blob([xml], {type:'application/xml'}), "campaign.xml" )
		} else {
			//$(this).attr("download", "campaign.xml")
			$(this).attr("href", "data:application/xml," + encodeURIComponent(xml));
		}
	})

	//force a render
	$("#syntax_highlight_button").click(writexml)
	$(".campaign_info_field").on("keyup", writexml)

	//upload XML file
	$("#upload_xml_button").change(function(e){
		e.preventDefault()
		if(!this.files[0]){
			alert("no file selected")
			return;
		}
		if(!this.files[0].name.match(/[.]xml$/i)){
			alert("Filename does not end with .xml")
			return;
		}
		var filereader = new FileReader();
		filereader.onload = function(e){
			xml2form(e.target.result)
		}
		filereader.readAsText(this.files[0]);
	})

	//upload button
	$("#create_campaign_button").click(function(e){
		e.preventDefault();
		$(".campaign_form,.survey_form,.prompt_form").validator("validate");
		var campaign_name = $("#campaign_name_field").val();
		var campaign_urn = $("#campaign_urn_field").val();
		var class_urn = $("#class_urn_field").val();
        var running_state = $("#campaign_running")[0].checked ? "running" : "stopped";
        var privacy_state = $("#campaign_privacy")[0].checked ? "shared" : "private";
        var description = $("#campaign_description").val();

		oh.campaign.create({
			running_state : running_state,
			privacy_state : privacy_state,
			campaign_urn : campaign_urn,
			campaign_name : campaign_name,
			class_urn_list : class_urn,
			description : description,
			xml : writexml()
		}).done(function(){
			alert("Success! Campaign was created!")
			window.location.hash = campaign_urn;
			window.location.reload()
		});
	});

	$("#update_campaign_button").click(function(e){
        var running_state = $("#campaign_running")[0].checked ? "running" : "stopped";
        var privacy_state = $("#campaign_privacy")[0].checked ? "shared" : "private";
        var description = $("#campaign_description").val();

		e.preventDefault();
		oh.campaign.update({
			running_state : running_state,
			privacy_state : privacy_state,
			campaign_urn : update_urn,
			description : description,
			xml : fixxml(writexml(), update_name, update_urn)
		}).done(function(){
			alert("Success! Campaign was updated!")
			window.location.reload()
		});
	});

	//autogenerate urns
	$("#campaign_name_field").on("keyup", update_campaign_urn)
	$("#class_urn_field").on("change", update_campaign_urn)

	//strip spaces from urns
	$("#campaign_urn_field").on("keyup", function(){
		$(this).val($(this).val().replace(/[^a-z0-9:]/gi,''));
	})

	//init page
	writexml();

}).fail(function(){
	alert("Downloading logic.json failed.")
});
