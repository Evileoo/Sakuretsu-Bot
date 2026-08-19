
async function translate(q, source, target) {


	let scdText= "";
	let middleTranslate = false;
	if(source != "en" && target != "en") {
		const mid = await fetch(`http://${process.env.LTHOST}:${process.env.LTPORT}/translate`, {
    	    method: "POST",
    	    body: JSON.stringify({
			    q,
			    source,
			    target: "en",
			    format: "html",
			    alternatives: 1,
			    api_key: ""
		    }), 
    	    headers: { "Content-Type": "application/json" }
    	});

		middleTranslate = true;
		const midJson = await mid.json();
		scdText = midJson.translatedText;
	} else {
		scdText = q;
	}



    const lt = await fetch(`http://${process.env.LTHOST}:${process.env.LTPORT}/translate`, {
        method: "POST",
        body: JSON.stringify({
		    q: scdText,
		    source: middleTranslate ? "en" : source,
		    target,
		    format: "html",
		    alternatives: 1,
		    api_key: ""
	    }), 
        headers: { "Content-Type": "application/json" }
    });

	const json = await lt.json();
    return json.translatedText;
}

export const lt = { translate }