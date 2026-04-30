var interactiveIntervalId_ads_js = setInterval( function () {
	if ( ( document.readyState === "complete" ) || ( document.readyState === "interactive" ) )
	{
        clearInterval(interactiveIntervalId_ads_js);
        var d = document.createElement('div');
        d.id = 'WBFOPSQKVDEKKG';
        d.style.display = 'none';
        document.body.appendChild(d);
    }
}, 100 );

