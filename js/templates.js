(function(global){
	global.templates = {
		"urn" : '<div class="form-group"><label>{{label}}</label><input class="form-control" placeholder="{{placeholder}}"></div>',
		"string" : '<div class="form-group"><label>{{label}}</label><input class="form-control" placeholder="{{placeholder}}"></div>',
		"bool" : '<div class="checkbox"><label><input type="checkbox">{{label}}</label></div>',
		"number" : '<div class="form-group"><label>{{label}}</label><input type="number" class="form-control" placeholder="{{placeholder}}"></div>',
		"keyval" : '<div class="form-group"><label>{{label}}</label><ol class="choice_values"></ol></div>'
	}
})(window);
