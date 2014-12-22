$(function(){
	$("[data-src]").each(function() {
		var el = $(this);
		var req = $.get(el.attr("data-src"), function(){
			el.text(req.responseText);
			Prism.highlightAll();
		}, "text");
	});

	$(".panel-group").sortable({ handle: ".panel-heading" })

	$("#new_survey_button").click(function(e){
		e.preventDefault();
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
			return '<a class="list-group-item"> _blank <span class="badge">' + prompt_type + '</span></a>'
		})
	}
});
