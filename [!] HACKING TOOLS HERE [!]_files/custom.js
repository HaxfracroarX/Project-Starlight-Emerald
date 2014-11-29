if(typeof(Storage)!=="undefined") {
	if(localStorage.menu) {
		document.getElementById('menu').getElementsByTagName('ul')[0].innerHTML = localStorage.menu;
	}
}
$(document).ready(function() {
	var menu = $("#menu ul");
	var menu0 = menu.html();
	var mc = $("#menucontrol");
	$("a", menu).dblclick(function(e){
		e.preventDefault();
		$(this).remove();
	});
	$("button",mc).click(function(){
		$(this).fadeOut('fast',function(){
			$("div",mc).fadeIn('fast');
			$('body').addClass('menuediting');
			$('body a').click(function(e){
				e.preventDefault();
				var href = $(this).attr('href');
				var text = $(this).text();
				$("#menu ul").append('<li><a href="'+href+'">'+text+'</a>');
			})
			$("a",menu).unbind('click').click(function(e){
				e.preventDefault();
				if(confirm('¿Borrar?')) $(this).parent().remove();
			});
			
		});
	});
	$("div[title='Guardar']",mc).click(function(){
		$("div",mc).fadeOut('fast',function(){
			localStorage.setItem('menu',$("#menu ul").html());
			$("button",mc).fadeIn('fast');
			$('body a').unbind('click');
			$('body').removeClass('menuediting');
		});
	});
	$("div[title='Cancelar']",mc).click(function(){
		$("div",mc).fadeOut('fast',function(){
			$("#menu ul").html($(menu0));
			$("button",mc).fadeIn('fast');
			$('body a').unbind('click');
			$('body').removeClass('menuediting');
		});
	});
}); 