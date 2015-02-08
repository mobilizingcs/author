(function(global){
	global.templates = {
		"urn" : '<div class="form-group"><label>{{label}}</label><input class="form-control" placeholder="{{placeholder}}"></div>',
		"string" : '<div class="form-group"><label>{{label}}</label><input class="form-control" placeholder="{{placeholder}}"></div>',
		"bool" : '<div class="checkbox"><label><input type="checkbox">{{label}}</label></div>',
		"number" : '<div class="form-group"><label>{{label}}</label><input type="number" class="form-control" placeholder="{{placeholder}}"></div>',
		"keyval" : '<div class="form-group"><label>{{label}}</label><ol class="choice_values"></ol></div>',
		"promptlink" : '<a role="button" class="list-group-item prompt_link" href="#"> <span class="prompt_id_text">_blank</span> <span class="badge">{{prompt_type}}</span></a>'
	}
})(window);
