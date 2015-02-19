$.getJSON("logic.json", function(logic){

	//globals
	var oldpop;

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
		el.find("h4.panel-title a").attr("href", "#" + id);
		el.find(".list-group").sortable({
			update: writexml,
			start: closepop
		});
		el.find(".dropdown-menu a").click(function(e){
			e.preventDefault();
			add_prompt($(this).data("type"), el.find(".survey_prompt_list"))
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
			var urn = urnify($(this).val())
			$(this).val(urn)
			el.find("h4.panel-title a").text("Survey: " + urn)
		})

		//update xml
		el.find("input,textarea").change(writexml).keyup(writexml);
		writexml();
		return el;
	}

	//create new prompt
	function add_prompt(prompt_type, prompt_list){
		return prompt_list.append(function(){
			var a = $(Mustache.render(templates.promptlink, {
				prompt_type : prompt_type,
				icon : logic.icons[prompt_type]
			})).data("prompt_type", prompt_type);
			a.popover({
				html: true,
				//placement: "top",
				//trigger: "hover",
				title : prompt_type + ' prompt', // <span class="close_popover_button pull-right glyphicon glyphicon-remove"></span>',
				content: popover_content(prompt_type, a)
			}).click(function(e){
				e.preventDefault();
			}).on("show.bs.popover", function(){
				if(oldpop != a){
					closepop();
				}
				oldpop = a;
			})
			return a;
		})
	}

	//initiate the prompt popover
	function popover_content(prompt_type, a){
		var templates = window.templates;
		var fields = logic.prompttypes[prompt_type];
		var el = $("#prompttemplate").children().clone();
		var form = el.find("form");
		var prompttext = a.find(".prompt_id_text");
		var id_field;
		var skippable_field;

		function updateText(){
			var skiptext = skippable_field.is(":checked") ? "  (skippable)" : "";
			prompttext.text((id_field.val() || "___") + skiptext)
		}


		// Other fields get dynamically
		$.each(fields, function(index, fieldname){
			var field = logic.fields[fieldname];
			var output = Mustache.render(templates[field.type], {
				field : fieldname,
				label : field.label || toTitleCase(fieldname),
				default : field.default,
				placeholder : field.placeholder || "Please enter " + fieldname.toLowerCase()
			});
			var input = form.append(output).find("input");

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
					$(this).val(urnify($(this).val()))
					updateText();
				})
			}

			//update view
			if(fieldname == "skippable"){
				skippable_field = input;
				input.on("change", function(){
					updateText();
				})
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

		el.find(".choice_values").tagit({
			allowSpaces : true,
			placeholderText : "Type and hit [ENTER]",
			afterTagAdded : writexml,
			afterTagRemoved : writexml
		})

		el.find("input,textarea").change(writexml).keyup(writexml);

		return el;
	}

	/* Convert Form to XML. Should rewrite this in proper MVC */
	function form2xml(){
		var xml = $("<root/>")
		var campaign = $("<campaign/>").appendTo(xml);

		/* Campaign info fields */
		parse("<campaignName/>").text($("#campaign_name_field").val()).appendTo(campaign);
		parse("<campaignUrn/>").text($("#campaign_urn_field").val()).appendTo(campaign);

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
					var value = field.is("input[type=checkbox]") ? field.is(':checked') : field.val();

					//do not add empty fields into the XML
					//if(value === "") return

					//some fields have to be put in the xml as 'properties'
					if(logic.fields[name].property){
						if(field.is("ol")){
							$.each(field.tagit("assignedTags"), function(i, val){
								//we start counting from 1 because that is how OL are displayed
								properties[i + 1] = val
							});
						} else {
							properties[name] = value;
						}
					} else {
						parse("<"+name+"/>").text(value).appendTo(prompt)
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

		//debug
		window.xml = xml;

		/* campaign fields  if set */
		$("#campaign_name_field").val(campaign.children("campaignName").val());
		$("#campaign_urn_field").val(campaign.children("campaignUrn").val());

		/* surveys */
		surveys.children('survey').each(function(){
			var survey = $(this);
			var contents = survey.children("contentList")
			var survey_el = new_survey();
			var survey_prompt_list = survey_el.find(".survey_prompt_list")
			survey_el.find(".survey_id_field").val(survey.children("id").text())
			survey_el.find(".survey_title_field").val(survey.children("title").text())
			survey_el.find(".survey_description_field").val(survey.children("description").text())
			survey_el.find(".survey_submit_field").val(survey.children("submitText").text())
			survey_el.find(".survey_anytime_field").val(survey.children("anytime").text() === "true")

			/* render individual prompts */
			contents.children().each(function(){

				/* can be either prompt or message */
				var prompt = $(this)
				var prompt_type = prompt.is("message") ? "message" : prompt.children("promptType").text()
				var prompt_el = add_prompt(prompt_type, survey_prompt_list);

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

	function toTitleCase(str){
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	//filters alphanumeric characters
	function urnify(str){
		return str.replace(/[^a-z0-9]/gi,'').substr(0, 20)
	}

	//start new survey
	$("#new_survey_button").click(function(e){
		e.preventDefault();
		this.blur();
		new_survey();
	});

	//download XML as file
	$("#download_xml_button").click(function(e){
		$(this).attr("download", "campaign.xml")
		$(this).attr("href", "data:application/xml," + encodeURIComponent(writexml()))
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

	//init page
	writexml();

}).fail(function(){
	alert("Downloading logic.json failed.")
});
