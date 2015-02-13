(function(global){
	global.templates = {
		"urn" : '<div class="form-group"><label>{{label}}</label><input class="form-control prompt_field" data-field="{{field}}" placeholder="{{placeholder}}"></div>',
		"string" : '<div class="form-group"><label>{{label}}</label><input class="form-control prompt_field" data-field="{{field}}" placeholder="{{placeholder}}" value="{{default}}"></div>',
		"text" : '<div class="form-group"><label>{{label}}</label><textarea rows="2" class="form-control prompt_field" data-field="{{field}}" placeholder="{{placeholder}}">{{default}}</textarea></div>',
		"bool" : '<div class="checkbox"><label><input type="checkbox" class="prompt_field" data-field="{{field}}" {{default}}>{{label}}</label></div>',
		"number" : '<div class="form-group"><label>{{label}}</label><input type="number" value="{{default}}" class="form-control prompt_field" data-field="{{field}}" placeholder="{{placeholder}}"></div>',
		"keyval" : '<div class="form-group"><label>{{label}}</label><ol class="choice_values prompt_field" data-field="{{field}}"></ol></div>',
		"promptlink" : '<a role="button" class="list-group-item prompt_link" href="#"><span class="prompt-icon glyphicon glyphicon-{{icon}}"></span> <span> <span class="prompt_id_text"> ___ </span> <!-- <span class="badge">{{prompt_type}}</span> --> </span> <span class="remove_prompt_button pull-right glyphicon glyphicon-remove"></span></a>'
	}
})(window);
