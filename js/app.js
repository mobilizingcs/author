$(function(){
	$("[data-src]").each(function() {
		var el = $(this);
		var req = $.get(el.attr("data-src"), function(){
			el.text(req.responseText);
			Prism.highlightAll();
		}, "text");
	});

	$(".panel-group,.list-group").sortable();
    $(".panel-group,.list-group").disableSelection();
});
