$(function(){
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
		});

		function add_prompt(prompt_type, el){
			el.find(".prompt_list").append(function(){
				var a = $($.parseHTML('<a role="button" class="list-group-item" href="#"> _blank <span class="badge">' + prompt_type + '</span></a>'))
				var pop =  a.popover({
					html: true,
					trigger: "hover",
					title : prompt_type + " prompt",
					content: popover_content(prompt_type, a)
				}).click(function(e){
					e.preventDefault();
				})
				return pop;
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
					label : field.label || toTitleCase(fieldname),
					placeholder : field.placeholder || "Please enter " + fieldname.toLowerCase()
				});
				form.append(output);
			});

			el.find(".delete_prompt_button").click(function(){
				a.popover('hide');
				a.remove();
			});

			el.find(".choice_values").tagit()
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

