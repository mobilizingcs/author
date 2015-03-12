//initiate the client
var oh = Ohmage("/app", "surveytool")

//attach global callbacks
oh.callback("done", function(x, status, req){
	//for debugging only
	console.log(x);
})

//global error handler. In ohmage 200 means unauthenticated
oh.callback("error", function(msg, code, req){
	(code == 200) ? window.location.replace("/web/#login") : alert("Error!\n" + msg);
});

//main app
oh.user.whoami().done(function(username){
	
	//make sure we don't timeout
	oh.keepalive();

	//get available classes
	oh.user.info().done(function(x){
		$.each(x[username].classes, function(urn, name){
			$("#class_urn_field").append($("<option/>").val(urn).text(name));
		});
	})	

	//activate button
	$("#create_campaign_button").click(function(e){
		e.preventDefault();
		var campaign_name = $("#campaign_name_field").val() || alert("Invalid campaign name");
		var campaign_urn = $("#campaign_urn_field").val() || alert("Invalid campaign urn");
		var class_urn = $("#class_urn_field").val() || alert("Invalid class");

		oh.campaign.create({
			running_state : "stopped",
			privacy_state : "private",
			campaign_urn : campaign_urn,
			campaign_name : campaign_name,
			class_urn_list : class_urn,
			xml : writexml()
		}).done(function(){
			alert("success!")
		});
	});
});