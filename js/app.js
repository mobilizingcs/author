$.getJSON("logic.json", function(logic){

	//globals
	var oldpop;

	//survey sortable
	$(".panel-group").sortable({
		handle: ".panel-heading",
		update: writexml
	});

	//create new surveys
	$("#new_survey_button").click(function(e){
		e.preventDefault();
		this.blur();
		var el = $("#surveytemplate .survey_content").clone();
		var id = el.children(".panel-collapse").uniqueId()[0].id;
		el.find("h4.panel-title a").attr("href", "#" + id);
		el.find(".list-group").sortable({
			update: writexml
		});
		el.find(".dropdown-menu a").click(function(e){
			e.preventDefault();
			var prompt_type = $(this).data("type");
			add_prompt(prompt_type, el)
		});
		el.find(".delete_survey_button").click(function(e){
			e.preventDefault();
			el.hide('slow', function(){
				el.remove()
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
	});

	//create new prompt
	function add_prompt(prompt_type, el){
		el.find(".survey_prompt_list").append(function(){
			var a = $(Mustache.render(templates.promptlink, {
				prompt_type:prompt_type
			})).data("prompt_type", prompt_type);
			var content = popover_content(prompt_type, a);
			a.popover({
				html: true,
				//placement: "top",
				trigger: "click",
				title : prompt_type + " prompt",
				content: content
			}).click(function(e){
				e.preventDefault();
			}).on("show.bs.popover", function(){
				if(oldpop && oldpop != a){
					oldpop.popover("hide");
					oldpop = null;
				}
			}).hover(function(){
				if(oldpop != a){
					a.popover("show");
					oldpop = a;
				}
			}, function(){})
			return a;
		})
		writexml();
	}

	//initiate the prompt popover
	function popover_content(prompt_type, a){
		var templates = window.templates;
		var fields = logic.prompttypes[prompt_type];
		var el = $("#prompttemplate").children().clone();
		var form = el.find("form");

		// Other fields get dynamically
		$.each(fields, function(index, fieldname){
			var field = logic.fields[fieldname];
			var output = Mustache.render(templates[field.type], {
				field : fieldname,
				label : field.label || toTitleCase(fieldname),
				placeholder : field.placeholder || "Please enter " + fieldname.toLowerCase()
			});
			var input = form.append(output).find("input");

			//update view
			if(fieldname == "id"){
				var prompttext = a.find(".prompt_id_text");
				input.on("keyup", function(){
					var urn = urnify($(this).val())
					$(this).val(urn)
					prompttext.text(urn|| "[new]")
				})
			}
		});

		el.find(".delete_prompt_button").click(function(){
			a.popover('hide');
			a.remove();
		});

		el.find(".choice_values").tagit().on('afterTagAdded', writexml).on('afterTagRemoved', writexml);
		el.find("input,textarea").change(writexml).keyup(writexml);

		return el;
	}

	/* Convert Form to XML. Should rewrite this in proper MVC */
	function form2xml(){
		var xml = $("<root/>") 
		var campaign = $("<campaign/>").appendTo(xml);
		var surveys = $("<surveys/>").appendTo(campaign);

		$("#surveygroup .survey_form").each(function(){

			/* create node */
			var form = $(this);
			var survey = $("<survey/>").appendTo(surveys);

			/* survey fields */
			$("<id/>").text(form.find(".survey_id_field").val()).appendTo(survey);
			$("<title/>").text(form.find(".survey_title_field").val()).appendTo(survey);
			$("<description/>").text(form.find(".survey_description_field").val()).appendTo(survey);
			$("<submitText/>").text(form.find(".survey_submit_field").val()).appendTo(survey);
			$("<anytime/>").text(form.find(".survey_anytime_field").is(":checked")).appendTo(survey);

			/* find prompts */
			var contents = $("<contentList/>").appendTo(survey)
			form.find(".survey_prompt_list .prompt_link").each(function(){

				var prompt_link = $(this);
				var prompt_type = prompt_link.data("prompt_type");

				if(prompt_type == "message"){
					var prompt = $("<message/>").appendTo(contents)
				} else {
					var prompt = $("<prompt/>").appendTo(contents)
					$("<promptType>").text(prompt_link.data("prompt_type")).appendTo(prompt)
				}
			
				var popover = prompt_link.data("bs.popover").$tip;
				var fields = $(popover).find(".prompt_field")
				var properties = {};

				fields.each(function(){
					var field = $(this);
					var name = field.data("field")
					var value = getFieldValue(field)

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
						$("<"+name+"/>").text(value).appendTo(prompt)
					}

					//ohmage apparently has no default for this
					if(name == "skippable" && value == true){
						$("<skipLabel/>").text("Skip").appendTo(prompt)
					}
				})

				//append properties
				if(Object.keys(properties).length){
					var props = $("<properties>").appendTo(prompt)
					$.each(properties, function(key, val){
						var prop = $("<property>").appendTo(props)
						$("<key/>").text(key).appendTo(prop)
						$("<label/>").text(val).appendTo(prop)
					})
				}				
			})
		});
		return xml
	}

	//debug
	function writexml(){
		var xmltext = '<?xml version="1.0" encoding="UTF-8"?>\n' + form2xml().html()
		$("code").text(vkbeautify.xml(xmltext))
	}

	//init page
	writexml();

}).fail(function(){
	alert("Downloading logic.json failed.")
});

function getFieldValue(el){
	if(el.is("input[type=checkbox]")){
		return el.is(':checked')
	} else if(el.is("ol")){
		return "Not implemented yet..."
	}
	return el.val();
}

$(document).keydown(function(e){
	//escape button
	if(e.which == 27){
		$(".list-group-item").popover('hide');
	}
});

function toTitleCase(str){
	return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function urnify(str){
	return str.replace(/[^a-z0-9]/gi,'').substr(0, 20)
}