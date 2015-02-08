$(function(){

	var oldpop;
	$.getJSON("logic.json", function(logic){
		$("[data-src]").each(function() {
			var el = $(this);
			var req = $.get(el.attr("data-src"), function(){
				el.text(req.responseText);
				Prism.highlightAll();
			}, "text");
		});

		$(".panel-group").sortable({
			handle: ".panel-heading",
		}).droppable({
			connectToSortable: "#trash-can"
		});

		/* dont use this anymore */
		$("#trash-can").droppable({
			hoverClass: "trash-danger",
			drop: function ( event, ui) {
				var element = ui.draggable;
				$(this).append(element);
				$(ui.draggable).fadeOut(1000);
			}
		});

		$("#new_survey_button").click(function(e){
			e.preventDefault();
			this.blur();
			var el = $("#surveytemplate .survey_content").clone();
			var id = el.children(".panel-collapse").uniqueId()[0].id;
			el.find("h4.panel-title a").attr("href", "#" + id);
			el.find(".list-group").sortable();
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
				el.find("h4.panel-title a").text("Survey: " + $(this).val())
			})
		});

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
		}

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
						prompttext.text(input.val() || "[new]")
					})
				}
			});

			el.find(".delete_prompt_button").click(function(){
				a.popover('hide');
				a.remove();
			});

			el.find(".choice_values").tagit();
			return el;
		}

	}).fail(function(){
		alert("Downloading logic.json failed.")
	});
});

$(document).keydown(function(e){
	//escape button
	if(e.which == 27){
		$(".list-group-item").popover('hide');
	}
});

function toTitleCase(str){
	return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

/* Convert Form to XML. Should rewrite this in proper MVC */
function form2xml(){
	var surveys = $("#surveygroup .survey_form");
	surveys.each(function(){

		/* get form */
		var form = $(this);

		/* survey fields */
		var survey_id = form.find(".survey_id_field").val()
		var survey_title = form.find(".survey_title_field").val()
		var survey_description = form.find(".survey_description_field").val()
		var survey_submit = form.find(".survey_submit_field").val()
		var survey_anytime = form.find(".survey_anytime_field").val()

		/* find prompts */
		var survey_prompt_list = form.find(".survey_prompt_list .prompt_link")
		survey_prompt_list.each(function(){
			var prompt_link = $(this);
			var prompt_type = prompt_link.data("prompt_type")
			var popover = prompt_link.data("bs.popover").$tip;
			var fields = $(popover).find(".prompt_field")
			console.log("Prompt: " + prompt_type)
			fields.each(function(){
				var field = $(this);
				var name = field.data("field")
				var value = getFieldValue(field)
				console.log(name + " = " + value)
			})
		})
	});
}

function getFieldValue(el){
	if(el.is("input[type=checkbox]")){
		return el.is(':checked')
	} else if(el.is("ol")){
		return "Not implemented yet..."
	}
	return el.val();
}
