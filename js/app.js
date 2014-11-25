$(function(){
	$("[data-src]").each(function() {
		var el = $(this);
		var req = $.get(el.attr("data-src"), function(){
			el.text(req.responseText);
			Prism.highlightAll();
		}, "text");
	});

	$(".panel-group").sortable({ handle: ".panel-heading" }).disableSelection();
	$(".list-group").sortable()
});
