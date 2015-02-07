	/* BackBone Models */
	var Prompt = Backbone.Model.extend({
		defaults : {
			id : "",
			prompttype: null
		}
	});

	var PromptList = Backbone.Collection.extend({
		model: Prompt
	});

	var Survey = Backbone.Model.extend({
		defaults : {
			id : "",
			title : "",
			description : "",
			submit : "",
			anytime : false,
			prompts : new PromptList()
		}
	});

	var SurveyList = Backbone.Collection.extend({
		model: Survey
	})

	/* BackBone Views */
	var MessagePromptView = make_view("message");

	function make_view(prompt_type){
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




	}


	Backbone.View.extend({
		model : new Prompt(),
		fields : logic.prompttypes["message"],



		initialize : function(){
			this.render();
		},
		render : function() {
			this.$el.html(this.template(this.model.attributes));
		}
	});



	/*
	new StringField({
		label : "Message",
		placeholder : "Some message to the user..."
	})
	*/
